-- MarketDay Supabase starter schema.
-- Run in the Supabase SQL Editor for a NEW project. Review before applying to an existing database.
create extension if not exists pgcrypto;

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  store_name text not null check (char_length(store_name) between 2 and 100),
  region text not null check (region in ('Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra','North East','Northern','Oti','Savannah','Upper East','Upper West','Volta','Western','Western North')),
  town text not null check (char_length(town) between 2 and 100),
  ghana_card_front_path text not null,
  ghana_card_back_path text not null,
  selfie_path text not null,
  status text not null default 'pending' check (status in ('pending','in_review','approved','rejected')),
  consented_at timestamptz not null,
  consent_version text not null default 'seller-verification-v1',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_applications_status_created_idx on public.seller_applications(status, created_at desc);

create or replace function public.marketday_is_admin()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

alter table public.seller_applications enable row level security;
revoke all on public.seller_applications from anon, authenticated;
grant select on public.seller_applications to authenticated;

drop policy if exists "Applicant reads own application" on public.seller_applications;
create policy "Applicant reads own application" on public.seller_applications
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "MarketDay admins review applications" on public.seller_applications;
create policy "MarketDay admins review applications" on public.seller_applications
  for all to authenticated using (public.marketday_is_admin()) with check (public.marketday_is_admin());

-- Private identity documents. No public or applicant SELECT policy: applicants and visitors
-- cannot retrieve documents after upload. Admin identity is assigned only in trusted app_metadata.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-verification', 'seller-verification', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "MarketDay admins view verification documents" on storage.objects;
create policy "MarketDay admins view verification documents" on storage.objects
  for select to authenticated using (bucket_id = 'seller-verification' and public.marketday_is_admin());

-- No client INSERT/UPDATE/DELETE policy is intentionally created. The authenticated Edge
-- Function uses a server-only service role after validating the caller and every upload.
