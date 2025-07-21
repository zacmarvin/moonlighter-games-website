# Formspree Setup Instructions

Formspree is a simple form backend that forwards form submissions to your email. No server or Firebase Functions needed!

## Step 1: Create Formspree Account

1. Go to https://formspree.io
2. Sign up for a free account (50 submissions/month)
3. Verify your email

## Step 2: Create Your Forms

### Contact Form:
1. Click "New Form"
2. Name it: "Moonlighter Games Contact"
3. Set email destination: info@moonlightergames.com
4. Copy the form ID (looks like: `xyzabcde`)

### Newsletter Form:
1. Click "New Form" again
2. Name it: "Moonlighter Games Newsletter"
3. Set email destination: info@moonlightergames.com
4. Copy the form ID

## Step 3: Update Your Code

1. Open `src/pages/Contact.tsx`
2. Replace the form IDs at the top:
```javascript
const FORMSPREE_CONTACT_ID = 'your-contact-form-id-here'
const FORMSPREE_NEWSLETTER_ID = 'your-newsletter-form-id-here'
```

## Step 4: Deploy

```bash
npm run build
npx firebase deploy --only hosting
```

## Step 5: Configure Formspree (Optional but Recommended)

### Enable reCAPTCHA:
1. In Formspree dashboard, go to your form
2. Settings → Spam Filtering
3. Enable reCAPTCHA

### Email Notifications:
1. Settings → Email Notifications
2. Customize the email template
3. Add CC recipients if needed

### Integrations:
1. Go to Integrations tab
2. Connect to:
   - **Mailchimp**: Automatically add newsletter signups to your list
   - **Google Sheets**: Keep a backup of all submissions
   - **Slack**: Get instant notifications

## Step 6: Connect to Mailchimp (For Newsletter)

1. In Formspree, go to your Newsletter form
2. Click "Integrations"
3. Select "Mailchimp"
4. Authorize with your Mailchimp account
5. Select your list (ID: b5efd0d9d5)
6. Map fields:
   - Form field "email" → Mailchimp field "Email Address"

## What You Get:

### Contact Form:
- Emails sent to info@moonlightergames.com
- Subject line: "Contact Form: [their subject]"
- Reply-to set to sender's email
- Full message details in a nice format

### Newsletter:
- Email notification for each signup
- Automatic addition to Mailchimp (if integrated)
- Spam protection
- Export options

## Viewing Submissions:

1. **Email**: All submissions sent to your email
2. **Formspree Dashboard**: 
   - Login to Formspree
   - Click on your form
   - See all submissions
   - Export as CSV
3. **Mailchimp**: Newsletter signups appear in your audience

## Upgrading (If Needed):

Free tier: 50 submissions/month
Paid tiers available if you need more

## Testing:

1. Go to your website
2. Submit a test contact form
3. Check your email
4. Submit a test newsletter signup
5. Check Mailchimp audience

That's it! No servers, no functions, just simple form handling.