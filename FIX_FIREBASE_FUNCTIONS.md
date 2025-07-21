# Fix Firebase Functions Deployment

The "Precondition failed" error usually means you need to upgrade to the Blaze plan.

## Solution 1: Upgrade to Blaze Plan (Recommended)

1. Go to Firebase Console: https://console.firebase.google.com/project/moonlightergameswebsite
2. Click the "Upgrade" button (usually in the bottom left)
3. Select "Blaze - Pay as you go"
4. Add a billing account (you won't be charged unless you exceed free limits)

### Free Tier Limits (Monthly):
- 125,000 function invocations
- 40,000 GB-seconds
- 40,000 CPU-seconds
- 5 GB outbound networking

Your contact forms would need thousands of submissions per day to exceed these limits.

After upgrading, run:
```bash
npx firebase deploy --only functions
```

## Solution 2: Use Formspree (No Firebase Functions Needed)

If you prefer not to add billing, use Formspree:

1. Go to https://formspree.io and create a free account
2. Create two forms:
   - One for contact messages
   - One for newsletter signups
3. Get your form IDs (they look like: `xyzabcde`)
4. Update `ContactFormspree.tsx` with your form IDs
5. Replace the Contact component to use Formspree

### Formspree Integration with Mailchimp:
1. In Formspree, go to your newsletter form
2. Click "Integrations"
3. Connect Mailchimp
4. Select your list (b5efd0d9d5)
5. Map the email field

This way, newsletter signups go directly to Mailchimp through Formspree.

## Solution 3: Check Firebase Project Settings

Sometimes the error is due to project configuration:

1. Run: `firebase use --add`
2. Select your project
3. Give it an alias like "production"
4. Try deploying again

## Solution 4: Initialize Functions Properly

Try re-initializing functions:
```bash
firebase init functions
```
- Choose "Use an existing project"
- Select moonlightergameswebsite
- Choose JavaScript
- Don't overwrite existing files

## Current Status:
- ✅ Functions code is ready
- ✅ Mailchimp is configured
- ✅ SendGrid will work once domain verified
- ❌ Functions need to be deployed

The easiest solution is to upgrade to Blaze plan - you won't be charged for your usage level, and it enables all Firebase features.