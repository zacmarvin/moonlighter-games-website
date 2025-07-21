# Mailchimp Setup Instructions

This guide will help you set up Mailchimp for your newsletter signup form.

## 1. Create Mailchimp Account
1. Go to https://mailchimp.com and create a free account
2. Free plan supports up to 2,000 contacts and 10,000 emails/month

## 2. Create an Audience (Mailing List)
1. Go to Audience → All contacts
2. Click "Create Audience" if you don't have one
3. Fill in your details:
   - Audience name: "Moonlighter Games Newsletter"
   - Default From email: info@moonlightergames.com
   - Default From name: Moonlighter Games

## 3. Get Your API Key
1. Click on your profile icon → Account & billing
2. Go to Extras → API keys
3. Click "Create A Key"
4. Copy the API key (looks like: `abcd1234567890abcd1234567890-us21`)
5. Note the server prefix (the part after the dash, e.g., `us21`)

## 4. Get Your List ID
1. Go to Audience → All contacts
2. Click on Settings → Audience name and defaults
3. Find your Audience ID (looks like: `a1b2c3d4e5`)

## 5. Configure Firebase Functions
Run these commands in your project directory:

```bash
firebase functions:config:set mailchimp.api_key="YOUR_API_KEY"
firebase functions:config:set mailchimp.server_prefix="YOUR_SERVER_PREFIX"
firebase functions:config:set mailchimp.list_id="YOUR_LIST_ID"
```

Example:
```bash
firebase functions:config:set mailchimp.api_key="abcd1234567890abcd1234567890-us21"
firebase functions:config:set mailchimp.server_prefix="us21"
firebase functions:config:set mailchimp.list_id="a1b2c3d4e5"
```

## 6. Deploy Functions
```bash
firebase deploy --only functions
```

## 7. Test the Newsletter Signup
1. Go to your website's Contact page
2. Enter a test email in the newsletter form
3. Check Mailchimp Audience → All contacts to see if it was added

## Managing Your Subscribers in Mailchimp

### View Subscribers
1. Go to Audience → All contacts
2. You'll see all subscribers with signup date, tags, etc.

### Export Subscribers
1. Go to Audience → All contacts
2. Click "Export Audience"
3. Choose your export settings

### Create Email Campaigns
1. Go to Campaigns → Create campaign
2. Choose "Email" → "Regular"
3. Select your Moonlighter Games Newsletter audience
4. Design your email and send!

### Set Up Welcome Email (Automation)
1. Go to Automations → Create
2. Choose "Welcome new subscribers"
3. Select your audience
4. Design your welcome email
5. Activate the automation

## Features Available in Free Plan
- Up to 2,000 contacts
- 10,000 emails per month
- Basic templates
- Signup forms
- Basic automations
- Mobile app access

## Troubleshooting

### "Member Exists" Error
This means the email is already subscribed. This is handled gracefully in the code.

### API Key Not Working
- Make sure you copied the entire key including the server prefix
- Check that the server prefix matches your account (e.g., us21, us14, etc.)

### Function Logs
Check Firebase Functions logs for debugging:
```bash
firebase functions:log
```

## Custom Fields (Optional)
You can add custom fields to collect more information:
1. Go to Audience → Settings → Audience fields
2. Add fields like "Favorite Game", "Platform", etc.
3. Update the Firebase function to include these fields

## GDPR Compliance
Mailchimp automatically handles:
- Double opt-in (if enabled in settings)
- Unsubscribe links in all emails
- Data storage compliance

Make sure to:
1. Add a privacy policy link near your signup form
2. Mention that subscribers can unsubscribe anytime
3. Be clear about what content they'll receive