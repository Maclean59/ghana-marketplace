import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', { ext: 'jpg', signature: [0xff, 0xd8, 0xff] }],
  ['image/png', { ext: 'png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  ['image/webp', { ext: 'webp', signature: [0x52, 0x49, 0x46, 0x46] }],
]);

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
  });
}

function validImage(file: File) {
  const typeInfo = ALLOWED.get(file.type);
  if (!typeInfo || file.size < typeInfo.signature.length || file.size > MAX_FILE_BYTES) return false;
  return true;
}

async function hasExpectedSignature(file: File) {
  const expected = ALLOWED.get(file.type)!;
  const bytes = new Uint8Array(await file.slice(0, expected.signature.length).arrayBuffer());
  if (!expected.signature.every((byte, index) => bytes[index] === byte)) return false;
  if (file.type === 'image/webp') {
    const webp = new Uint8Array(await file.slice(8, 12).arrayBuffer());
    return String.fromCharCode(...webp) === 'WEBP';
  }
  return true;
}

function cleanText(value: FormDataEntryValue | null, max: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, '');
}

Deno.serve(async (request: Request) => {
  const origin = Deno.env.get('ALLOWED_ORIGIN') ?? 'null';
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  if (request.headers.get('origin') && request.headers.get('origin') !== origin) return json({ error: 'Origin not allowed.' }, 403, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Server is not configured.' }, 500, origin);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in is required.' }, 401, origin);
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: 'Your session is invalid or expired. Sign in again.' }, 401, origin);

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: 'Expected a multipart form.' }, 400, origin); }
  const fullName = cleanText(form.get('fullName'), 120);
  const storeName = cleanText(form.get('storeName'), 100);
  const region = (form.get('region') ?? '').toString().trim();
  const town = (form.get('town') ?? '').toString().trim().replace(/\s+/g, ' ');
  const regions = new Set(['Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra','North East','Northern','Oti','Savannah','Upper East','Upper West','Volta','Western','Western North']);
  const front = form.get('ghanaCardFront');
  const back = form.get('ghanaCardBack');
  const selfie = form.get('selfie');
  if (fullName.length < 2 || fullName.length > 120 || storeName.length < 2 || storeName.length > 100 || town.length < 2 || town.length > 100 || !regions.has(region)) return json({ error: 'Check the required name, store, region, and town fields.' }, 400, origin);
  if (form.get('consent') !== 'true') return json({ error: 'Consent is required to submit verification documents.' }, 400, origin);
  if (!(front instanceof File) || !(back instanceof File) || !(selfie instanceof File) || !validImage(front) || !validImage(back) || !validImage(selfie)) return json({ error: 'Upload three JPG, PNG, or WebP image files, each no larger than 5 MB.' }, 400, origin);
  for (const file of [front, back, selfie]) if (!await hasExpectedSignature(file)) return json({ error: 'An uploaded file does not match its claimed image type.' }, 400, origin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing, error: existingError } = await admin.from('seller_applications').select('id').eq('user_id', user.id).maybeSingle();
  if (existingError) return json({ error: 'Could not check application status.' }, 500, origin);
  if (existing) return json({ error: 'An application already exists for this account. Contact MarketDay if you need to update it.' }, 409, origin);

  const files = [front, back, selfie];
  const labels = ['ghana-card-front', 'ghana-card-back', 'selfie'];
  const paths: string[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const ext = ALLOWED.get(file.type)!.ext;
    const path = `${user.id}/${crypto.randomUUID()}-${labels[index]}.${ext}`;
    const { error } = await admin.storage.from('seller-verification').upload(path, file, { contentType: file.type, cacheControl: '0', upsert: false });
    if (error) {
      if (paths.length) await admin.storage.from('seller-verification').remove(paths);
      return json({ error: 'Secure document upload failed. No application was submitted.' }, 500, origin);
    }
    paths.push(path);
  }

  const { error: insertError } = await admin.from('seller_applications').insert({
    user_id: user.id, full_name: fullName, store_name: storeName, region, town,
    ghana_card_front_path: paths[0], ghana_card_back_path: paths[1], selfie_path: paths[2],
    consented_at: new Date().toISOString(), consent_version: 'seller-verification-v1',
  });
  if (insertError) {
    await admin.storage.from('seller-verification').remove(paths);
    if (insertError.code === '23505') return json({ error: 'An application already exists for this account.' }, 409, origin);
    return json({ error: 'Could not save your application. Uploaded files were removed; please try again.' }, 500, origin);
  }
  return json({ ok: true, status: 'pending' }, 201, origin);
});
