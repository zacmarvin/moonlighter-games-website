# Firebase Functions Deployment Instructions

The functions haven't been deployed yet, which is why you're getting a 404 error. Here are several ways to deploy them:

## Method 1: Use Command Prompt (Recommended)
1. Open Command Prompt (not Git Bash)
2. Navigate to your project:
   ```
   cd "C:\Users\zacha\Documents\Moonlighter Games Website"
   ```
3. Deploy functions:
   ```
   npx firebase deploy --only functions
   ```

## Method 2: Use the Batch File
1. Double-click the `deploy-functions.bat` file I created
2. It will run the deployment and show you the progress

## Method 3: Deploy from Firebase Console
1. Go to https://console.firebase.google.com/project/moonlightergameswebsite/functions
2. Click "Get started" if you haven't initialized Functions
3. Follow the setup wizard

## Method 4: Enable Required APIs First
Sometimes you need to enable APIs manually:

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select your project: moonlightergameswebsite
3. Enable these APIs:
   - Cloud Functions API
   - Cloud Build API
   - Artifact Registry API

Then try deploying again.

## Method 5: Deploy Individual Functions
Try deploying one function at a time:
```
npx firebase deploy --only functions:sendContactEmail
npx firebase deploy --only functions:subscribeToMailchimp
npx firebase deploy --only functions:subscribeNewsletter
npx firebase deploy --only functions:getNewsletterSubscribers
```

## Troubleshooting

### If you get permission errors:
1. Make sure you're logged in: `firebase login`
2. Check your project: `firebase use`

### If you get "billing account required":
Firebase Functions require a billing account (but have a generous free tier):
1. Go to Firebase Console → Project Settings → Usage and billing
2. Upgrade to Blaze plan (pay-as-you-go)
3. You won't be charged unless you exceed the free tier limits

### Free Tier Limits (per month):
- 125,000 function invocations
- 40,000 GB-seconds
- 40,000 CPU-seconds
- No charge for your expected usage

## After Successful Deployment
You should see output like:
```
✔ functions[sendContactEmail]: Successful create operation.
✔ functions[subscribeToMailchimp]: Successful create operation.
```

And your functions will be live at:
- https://us-central1-moonlightergameswebsite.cloudfunctions.net/sendContactEmail
- https://us-central1-moonlightergameswebsite.cloudfunctions.net/subscribeToMailchimp