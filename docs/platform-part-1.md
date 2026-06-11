# TLWL Platform Foundation

The Life We Live Foundation is a for-profit social impact and crowdfunding platform. Contributions and TLWL support payments are not tax-deductible charitable donations unless specifically stated otherwise.

## Current Platform Model

TLWL now follows a trust-and-safety flow closer to a crowdfunding platform:

- A user can submit a story or support request with required information and consent.
- Direct video/photo/document upload hooks use Cloudinary Upload Widget, not Netlify Forms.
- A complete story can become public after basic required checks.
- A complete support request can create a public story and campaign that is accepting contributions.
- Reports do not automatically remove content.
- Serious or repeated reports can mark a campaign as under review and pause contributions.
- Payout release is separate from contribution acceptance.
- Recipient/payment verification is required before campaign funds should be released.
- If payout verification is not completed in the required window, the campaign can be marked for refund review.
- Stripe remains inactive unless `ENABLE_STRIPE_CHECKOUT=true` and Stripe environment variables are configured.

## Public Stories Library

The dedicated stories library lives at `stories.html`.

It is designed to show:
- all public stories
- video thumbnail or video preview
- story title
- category
- short description
- campaign/support status
- button to watch/read the full story
- button to contribute when the related campaign is accepting contributions

The homepage keeps only a featured preview and the three editable story cards:
- Community Spotlight
- Personal Journey
- Where the Support Went

## Recommended Status Fields

Campaign visibility and safety should stay separate:

- `status`: public-facing lifecycle such as `draft`, `submitted`, `public`, `accepting_contributions`, `closed`, `removed`, `refund_review`
- `campaign_status`: display/lifecycle helper for campaigns
- `review_status`: `clear`, `reported`, `under_review`, `contributions_paused`, `refund_review`
- `payout_status`: `not_started`, `payout_pending_verification`, `payout_verified`, `payout_failed`
- `accepting_contributions`: boolean checkout gate
- `contributions_paused`: boolean safety gate

## Required Environment Variables

Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Cloudinary:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_UPLOAD_PRESET`
- `CLOUDINARY_FOLDER`
- `CLOUDINARY_MAX_FILE_SIZE`

Stripe, only when ready:
- `SITE_URL`
- `ENABLE_STRIPE_CHECKOUT`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Do not expose Supabase service role keys, Stripe secret keys, or Cloudinary API secrets in frontend code.

## Campaign Safety Rules

- Do not require manual approval for every contribution.
- Do not make reporting visually dominant.
- A single standard report should not automatically remove a campaign.
- Serious report reasons or multiple reports can pause contributions.
- Under-review campaigns should show "Under Review" and disable contribution actions.
- Payouts should not release until recipient/payment setup is verified.
- TLWL support payments stay separate from campaign contributions.

## Still Future Work

- Admin dashboard for reviewing reports, campaigns, payout verification, and refund review.
- Stripe webhook contribution reconciliation.
- Signed Cloudinary uploads if TLWL needs stricter upload control.
- Full payout workflow and payment provider recipient verification.
