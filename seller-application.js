const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const form = document.querySelector('#seller-application-form');
const accountStatus = document.querySelector('#account-status');
const formStatus = document.querySelector('#seller-form-status');
const submitButton = document.querySelector('#seller-submit');
const modeButtons = [...document.querySelectorAll('.mode-button')];
let accountMode = 'signup';
let supabaseClient;
let busy = false;

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle('status-error', isError);
}

function getClient() {
  if (!window.MARKETDAY_SUPABASE_URL || !window.MARKETDAY_SUPABASE_ANON_KEY || window.MARKETDAY_SUPABASE_URL.includes('YOUR_PROJECT')) {
    throw new Error('Backend is not configured yet. Follow the Supabase setup guide before collecting real applications.');
  }
  if (!supabaseClient) {
    if (!window.supabase?.createClient) throw new Error('The secure account service did not load. Check your connection and retry.');
    supabaseClient = window.supabase.createClient(window.MARKETDAY_SUPABASE_URL, window.MARKETDAY_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return supabaseClient;
}

modeButtons.forEach((button) => button.addEventListener('click', () => {
  accountMode = button.dataset.mode;
  modeButtons.forEach((item) => item.classList.toggle('active', item === button));
  document.querySelector('#account-password').autocomplete = accountMode === 'signup' ? 'new-password' : 'current-password';
  setStatus(accountStatus, '');
}));

for (const input of document.querySelectorAll('.upload-field input[type="file"]')) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    const label = document.querySelector(`[data-file-status="${input.id}"]`);
    if (!file) { label.textContent = 'Choose an image'; return; }
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
      input.value = '';
      label.textContent = 'Invalid file — use JPG, PNG, WebP up to 5 MB';
      setStatus(formStatus, 'Choose valid image files up to 5 MB each.', true);
      return;
    }
    label.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setStatus(formStatus, '');
  });
}

async function getAuthenticatedSession(client) {
  const email = document.querySelector('#account-email').value.trim();
  const password = document.querySelector('#account-password').value;
  if (!email || password.length < 10) throw new Error('Enter your email and a password of at least 10 characters.');
  const result = accountMode === 'signup'
    ? await client.auth.signUp({ email, password })
    : await client.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  if (!result.data.session) {
    throw new Error('Check your email to confirm your account, then return, choose “Sign in,” and submit the application. Your form details were not saved.');
  }
  return result.data.session;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  busy = true;
  submitButton.disabled = true;
  setStatus(formStatus, 'Preparing secure submission…');
  try {
    const client = getClient();
    const session = await getAuthenticatedSession(client);
    const payload = new FormData(form);
    payload.delete('consent');
    payload.set('consent', 'true');
    const response = await fetch(`${window.MARKETDAY_SUPABASE_URL}/functions/v1/apply-seller`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: window.MARKETDAY_SUPABASE_ANON_KEY },
      body: payload,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Application submission failed. Try again later.');
    form.reset();
    for (const label of document.querySelectorAll('[data-file-status]')) label.textContent = 'Choose an image';
    setStatus(formStatus, 'Your application was submitted securely for review. We will contact you by email.');
  } catch (error) {
    setStatus(formStatus, error.message || 'Could not submit the application. Please try again.', true);
  } finally {
    busy = false;
    submitButton.disabled = false;
  }
});
