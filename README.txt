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

## Important

The site can publish without Stripe.
The checkout button will show a setup message until Stripe keys are added.

## Replace first

- your@email.com
- @tlwlfoundation
- Campaign info inside netlify/functions/get-campaigns.js
- Add real videos/photos/stories
- Have legal pages reviewed before taking public money
