# TLWL Part 1 Platform Foundation

The Life We Live Foundation is a for-profit social impact and crowdfunding platform. Contributions and TLWL support payments are not tax-deductible charitable donations unless specifically stated otherwise.

## What Part 1 Adds

- Supabase-ready database schema for submissions, stories, campaigns, updates, contributions, reports, media assets, support requests, and profiles/admin roles.
- Netlify Functions for story/support submissions, reporting, public story lookup, public campaign lookup, and campaign lists.
- A stronger Stripe safety guard so campaign contributions cannot open unless a campaign is verified, published, and not paused or under review.
- Frontend form wiring that can save to Supabase when configured, while preserving Netlify Forms as a fallback.

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`
- `ENABLE_STORY_AUTO_APPROVAL` optional, use `true` only after basic checks and policies are ready.
- `ENABLE_STRIPE_CHECKOUT` optional, must be `true` before Stripe Checkout can run.
- `STRIPE_SECRET_KEY` required only when enabling Stripe Checkout.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` in frontend code.

## Moderation Statuses

Story-only submissions:
- `submitted`
- `auto_approved`
- `published`
- `flagged`
- `removed`

Support/campaign submissions:
- `submitted`
- `needs_verification`
- `verified`
- `campaign_ready`
- `published`
- `closed`
- `flagged`

Report status:
- `no_reports`
- `reported`
- `under_review`
- `paused`
- `cleared`
- `removed`
- `refunded_if_needed`

## Campaign Safety Rules

- Story-only submissions may be reviewed faster.
- Financial support, scholarship, emergency assistance, and nominations require verification.
- A campaign contribution cannot proceed through Stripe unless the campaign is verified, published, not paused, and not under review.
- TLWL support payments are stored separately from campaign contribution amounts.
- A single report should not automatically remove content, but reports can mark the item for review.

## What Still Belongs To Part 2

- Cloudinary Upload Widget for direct video uploads.
- Photo/supporting document upload UI.
- Richer story library design changes.
- Admin dashboard UI.
- Stripe webhook contribution reconciliation.
