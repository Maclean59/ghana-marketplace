# MarketDay seller intake backend

This folder adds a Supabase-backed seller application flow. It includes a Postgres schema with row-level security, Supabase Auth sign-up/sign-in, a private document bucket, and an Edge Function that authenticates applicants, validates image type/size, uploads Ghana Card front/back and selfie to private storage, and creates a pending application. The browser never receives the service-role secret.

## Important scope and launch warning

This is a backend starter for seller applications only. It does **not** implement the full marketplace, seller/promoter dashboards, product CRUD, monthly billing, referral attribution, or Mobile Money commissions/payouts. Do not describe the overall store as production-ready. Identity documents are sensitive: before going live, review Ghana's applicable data protection obligations, publish a complete privacy notice and retention/deletion schedule, restrict and audit administrator access, plan backups/deletion and incident response, and consider a specialist identity-verification provider. Do not use real identity data until that review and deployment configuration are complete.

## Create and configure Supabase

1. Create a Supabase project in a region appropriate for your users/data and complete account security setup. Configure Auth email confirmation, password policy, rate limits, CAPTCHA/abuse controls, allowed redirect URLs, and the production site URL. Email confirmation is recommended.
2. In the SQL Editor, run `supabase/migrations/202611060001_seller_applications.sql` on a new project. Review SQL before applying it to any database with existing data.
3. Install the Supabase CLI and authenticate, then link your project and deploy the function:
   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_ID
   supabase secrets set ALLOWED_ORIGIN=https://YOUR_HOSTED_SITE.example
   supabase functions deploy apply-seller
   ```
   Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Never copy the service-role key into this repository, frontend, GitHub Pages, issue, or chat. `ALLOWED_ORIGIN` must exactly match the deployed site origin; for local development set the local origin deliberately.
4. Copy the project's URL and public anon/publishable key to `supabase-config.js`. Only the public anon/publishable key belongs in frontend code; database RLS is essential. The provided placeholder intentionally leaves the app unavailable until you configure a real project.
5. Publish the static site over HTTPS. This project currently has no GitHub Pages setting enabled; configure Pages or another static host, and set the matching Supabase Auth Site URL and redirect allowlist.
6. Create an admin Auth user, then assign `app_metadata.role = "admin"` through a trusted Supabase server/admin tool (never from browser-editable user metadata). Admins can read applications and private verification documents. Do not grant the role to applicants. Test with separate applicant, admin, and anonymous accounts.
7. Verify end-to-end in a non-production project using test data: signup/email confirmation, successful and failed submissions, oversized and spoofed file rejection, duplicate application rejection, applicant isolation, admin-only document access, and data deletion. Check Supabase logs and document that applications remain `pending` until an admin reviews them.

## Storage and access model

The `seller-verification` bucket is private and limited to JPG/PNG/WebP up to 5 MiB. The Edge Function verifies the caller's Supabase Auth session, checks content type and image signatures, generates opaque object paths, and uses the server-only service key for upload/database writes. There is intentionally no public/applicant storage read policy and no client write policy. Authenticated applicants can read only their own application row; admin access uses trusted `app_metadata`. Do not create public bucket URLs for these documents. If admins need to inspect documents, use authenticated admin tooling or short-lived signed URLs after authorization.

The form only asks for town/city and region, not exact home address or GPS. Its consent text is a technical placeholder, not a substitute for a lawyer-reviewed privacy notice/consent. Define deletion and review workflows before collecting actual Ghana Card/selfie data.

## Current pricing/payment plan is not active

The stated proposal is a free first month, then GH₵30/month for promoters, GH₵50/month for sellers with up to 10 listings/week, or GH₵100/month for 15–25 listings/week. Neither payment collection nor recurring subscriptions exist here. A Ghana-ready provider and merchant onboarding are required before integrating membership payments. Sellers' direct MoMo payments to promoters are also not tracked or protected by this starter; a future ledger, attribution, proof/confirmation, refunds and dispute rules are needed. Never store Mobile Money PINs or expose personal MoMo details in public source.
