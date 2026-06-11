# TLWL Visual Dynamic Netlify Website

This version supports the TLWL for-profit social impact and crowdfunding model:
- Uses "Donate to TLWL" / "Support TLWL" / "Contribute to this story" language
- Keeps the premium warm "world of stories" homepage design
- Adds a dedicated Watch Stories page at stories.html for all public stories
- Keeps the homepage story preview cards: Community Spotlight, Personal Journey, and Where the Support Went
- Adds Supabase-backed story, campaign, report, and media planning
- Adds Cloudinary Upload Widget hooks for direct video/photo/document uploads
- Keeps Netlify Forms as fallback for text submissions, not large video files
- Keeps Stripe checkout inactive until explicitly enabled
- Keeps for-profit platform legal disclaimers

## How to deploy

Best for basic site:
1. Upload this folder to GitHub or drag the site folder into Netlify.
2. Make sure index.html is at the root level.
3. The site can publish without Supabase, Cloudinary, or Stripe.

Best for platform features:
1. Connect GitHub to Netlify.
2. Create a Supabase project.
3. Run supabase/schema.sql in the Supabase SQL editor.
4. Add environment variables in Netlify.

## Environment variables

Supabase:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Cloudinary uploads:
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_UPLOAD_PRESET
- CLOUDINARY_FOLDER
- CLOUDINARY_MAX_FILE_SIZE

Stripe, only when ready:
- SITE_URL
- ENABLE_STRIPE_CHECKOUT=true
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET later for contribution reconciliation

Keep private keys out of frontend code.

## Important

Stripe checkout stays inactive until ENABLE_STRIPE_CHECKOUT=true and STRIPE_SECRET_KEY are added.
Campaign contributions are separate from TLWL support payments.
Campaigns may accept contributions when required information is complete and trust/safety checks allow it.
Payouts to recipients should not be released until recipient/payment verification is complete.
Reports do not automatically remove a campaign, but serious or repeated reports can pause contributions and mark a campaign for review.
Contributions and TLWL support payments are not tax-deductible charitable donations unless specifically stated otherwise.

## Replace first

- your@email.com
- @tlwlfoundation
- Add real videos/photos/stories
- Configure Supabase before expecting live public stories
- Configure Cloudinary before direct uploads
- Have legal pages reviewed before accepting public money
