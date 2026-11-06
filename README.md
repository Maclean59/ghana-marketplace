# MarketDay — Ghana Marketplace

A colorful storefront prototype for a Ghana-based marketplace connecting independent sellers, shoppers, and promoters.

## Current status

The repository contains a static storefront and a **Supabase seller-application backend starter**. The seller intake flow supports account creation/sign-in, general business location, and a pending application with private Ghana Card front/back and selfie uploads through an authenticated Edge Function. See [BACKEND-SETUP.md](BACKEND-SETUP.md) for deployment steps.

The backend is not live until you create/configure a Supabase project, run the migration, set the frontend public project configuration, deploy the Edge Function with a restricted allowed origin, secure Auth/admin access, and deploy the site over HTTPS. No credentials were provided, so the committed configuration is deliberately a placeholder.

## Sensitive data notice

Ghana Card images and selfies are sensitive identity documents. Do not submit real documents until you complete Ghana-specific privacy/legal review, publish an accurate privacy notice and retention/deletion schedule, secure and test administrator access, and set up incident response and backups. Never commit secrets, service-role keys, or real identity documents to GitHub. Documents use private object storage; no public document URLs are created.

## Still not implemented

This is not yet a full marketplace. There is no production seller/promoter dashboard, listing management, checkout, order/referral tracking, recurring membership billing, Mobile Money collection to the owner, or commission/payout system. The proposed GH₵30 promoter and GH₵50/GH₵100 seller plans are not charged. Payment provider onboarding and supported Ghana settlement/payout flows must be confirmed before implementation.

See `BACKEND-SETUP.md` for Supabase configuration and test checklist.
