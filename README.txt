# TLWL Visual Dynamic Netlify Website

This version updates the site based on your requests:
- Uses "Donate to TLWL" / "Support TLWL" language
- Added a stronger Stories & Videos section
- Added a featured video area
- Added a story/video library layout
- Made the design more visually appealing and premium
- Kept Netlify Forms
- Kept Stripe-ready backend starter functions
- Kept for-profit platform legal pages
- Added Part 1 platform foundation files for Supabase submissions, reports, public story/campaign pages, and safer campaign checkout rules

## How to deploy

Best for basic site:
1. Unzip this folder.
2. Drag the unzipped folder into Netlify.
3. Make sure index.html is at the root level.

Best for backend Stripe functions:
1. Upload this folder to GitHub.
2. Connect GitHub to Netlify.
3. Add environment variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - STRIPE_SECRET_KEY
   - SITE_URL
   - ENABLE_STRIPE_CHECKOUT=true

Supabase setup:
1. Create a Supabase project.
2. Run supabase/schema.sql in the Supabase SQL editor.
3. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Netlify environment variables.
4. Keep the service role key private. Never put it in frontend code.

## Important

The site can publish without Stripe.
The checkout button will show a setup message until Stripe keys are added and ENABLE_STRIPE_CHECKOUT is set to true.
Campaign contributions require Supabase verification before checkout can open. TLWL support payments remain separate from campaign contributions.
Stories and videos can be updated in app.js by editing featuredStory and storyItems.
Part 2 will add direct Cloudinary video uploads and richer upload handling.

## Replace first

- your@email.com
- @tlwlfoundation
- Campaign info inside netlify/functions/get-campaigns.js
- Story/video info inside app.js
- Add real videos/photos/stories
- Have legal pages reviewed before taking public money
