# SendGrid Setup Instructions

To make the contact form and newsletter signup functional, you need to set up SendGrid:

## 1. Create SendGrid Account
1. Go to https://sendgrid.com and create a free account
2. Verify your email address

## 2. Set up Sender Authentication
1. In SendGrid dashboard, go to Settings → Sender Authentication
2. Choose "Single Sender Verification" (easier for getting started)
3. Add and verify the email address: noreply@moonlightergames.com
   - You'll need access to this email to verify it
   - Or use a different email you have access to

## 3. Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Give it a name like "Moonlighter Games Website"
4. Select "Full Access" for permissions
5. Copy the API key (you'll only see it once!)

## 4. Set API Key in Firebase
Run this command in your project directory:
```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
```

## 5. Deploy Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 6. Enable Firestore Database
1. Go to Firebase Console: https://console.firebase.google.com/project/moonlightergameswebsite
2. Click on "Firestore Database" in the left menu
3. Click "Create database"
4. Choose "Start in production mode"
5. Select your preferred location (us-central1 is fine)

## 7. Test the Forms
1. Try submitting the contact form
2. Try subscribing to the newsletter
3. Check your SendGrid dashboard for email activity

## Accessing Newsletter Subscribers

To view your newsletter subscribers:

1. **In Firebase Console:**
   - Go to Firestore Database
   - Look for the "newsletter_subscribers" collection
   - You'll see all subscriber emails there

2. **Via API (for exporting):**
   - Use the `getNewsletterSubscribers` function
   - Make a GET request to: `https://us-central1-moonlightergameswebsite.cloudfunctions.net/getNewsletterSubscribers`
   - Include header: `Authorization: Bearer YOUR_SECRET_TOKEN`
   - Replace YOUR_SECRET_TOKEN in functions/index.js with a secure token

## Troubleshooting

- If emails aren't sending, check Firebase Functions logs:
  ```bash
  firebase functions:log
  ```

- Make sure your SendGrid sender email is verified
- Check that the API key is set correctly in Firebase config

## Email Customization

To customize the emails being sent, edit the email templates in `functions/index.js`.