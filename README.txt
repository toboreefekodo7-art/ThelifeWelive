# TLWL Visual Dynamic Netlify Website

This version updates the site based on your requests:
- Replaced "tip" language with "Donate to TLWL" / "Support TLWL"
- Added a stronger Stories & Videos section
- Added a featured video area
- Added a story/video library layout
- Made the design more visually appealing and premium
- Kept Netlify Forms
- Kept Stripe-ready backend starter functions
- Kept for-profit platform legal pages

## How to deploy

Best for basic site:
1. Unzip this folder.
2. Drag the unzipped folder into Netlify.
3. Make sure index.html is at the root level.

Best for backend Stripe functions:
1. Upload this folder to GitHub.
2. Connect GitHub to Netlify.
3. Add environment variables:
   - STRIPE_SECRET_KEY
   - SITE_URL
   - ENABLE_STRIPE_CHECKOUT=true

## Important

The site can publish without Stripe.
The checkout button will show a setup message until Stripe keys are added and ENABLE_STRIPE_CHECKOUT is set to true.
Stories and videos can be updated in app.js by editing featuredStory and storyItems.

## Replace first

- your@email.com
- @tlwlfoundation
- Campaign info inside netlify/functions/get-campaigns.js
- Story/video info inside app.js
- Add real videos/photos/stories
- Have legal pages reviewed before taking public money
