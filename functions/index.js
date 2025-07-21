const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const mailchimp = require('@mailchimp/mailchimp_marketing');

// Initialize Firebase Admin
admin.initializeApp();

// For v2 functions, we'll use environment variables instead of config
// You'll need to set these in .env.local or Firebase console
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize Mailchimp
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY || 'f8d23d464c3f21c057473820b7edc2e4-us3';
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX || 'us3';
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID || 'b5efd0d9d5';

if (MAILCHIMP_API_KEY && MAILCHIMP_SERVER_PREFIX) {
  mailchimp.setConfig({
    apiKey: MAILCHIMP_API_KEY,
    server: MAILCHIMP_SERVER_PREFIX
  });
}

// Contact form email function
exports.sendContactEmail = onRequest({ 
  cors: ['https://moonlightergames.com', 'https://www.moonlightergames.com', 'https://moonlightergameswebsite.web.app', 'https://moonlightergameswebsite.firebaseapp.com', 'http://localhost:5173', 'http://localhost:3000']
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { name, email, subject, message } = req.body;

  // Validate input
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Email to Moonlighter Games
  const msgToCompany = {
    to: 'info@moonlightergames.com',
    from: 'noreply@moonlightergames.com', // You'll need to verify this sender in SendGrid
    subject: `Contact Form: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
  };

  // Auto-reply to user
  const msgToUser = {
    to: email,
    from: 'noreply@moonlightergames.com', // You'll need to verify this sender in SendGrid
    subject: 'Thank you for contacting Moonlighter Games',
    text: `Hi ${name},\n\nThank you for reaching out to us! We've received your message and will get back to you as soon as possible.\n\nBest regards,\nMoonlighter Games Team`,
    html: `
      <h3>Hi ${name},</h3>
      <p>Thank you for reaching out to us! We've received your message and will get back to you as soon as possible.</p>
      <p>Best regards,<br>Moonlighter Games Team</p>
    `,
  };

  try {
    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Send both emails
    await sgMail.send(msgToCompany);
    await sgMail.send(msgToUser);
    
    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

// Newsletter signup function
exports.subscribeNewsletter = onRequest({ 
  cors: ['https://moonlightergames.com', 'https://www.moonlightergames.com', 'https://moonlightergameswebsite.web.app', 'https://moonlightergameswebsite.firebaseapp.com', 'http://localhost:5173', 'http://localhost:3000']
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { email } = req.body;

  // Validate email
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    // Store email in Firestore
    const subscribersRef = admin.firestore().collection('newsletter_subscribers');
    
    // Check if email already exists
    const existingSubscriber = await subscribersRef.where('email', '==', email).get();
    
    if (!existingSubscriber.empty) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }

    // Add new subscriber
    await subscribersRef.add({
      email: email,
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true
    });

    // Send welcome email
    if (SENDGRID_API_KEY) {
      const welcomeMsg = {
        to: email,
        from: 'noreply@moonlightergames.com', // You'll need to verify this sender in SendGrid
        subject: 'Welcome to Moonlighter Games Newsletter!',
        text: `Thank you for subscribing to our newsletter! You'll be the first to know about updates, new features, and exclusive content for Lawn Care Simulator.\n\nBest regards,\nMoonlighter Games Team`,
        html: `
          <h3>Welcome to Moonlighter Games Newsletter!</h3>
          <p>Thank you for subscribing! You'll be the first to know about:</p>
          <ul>
            <li>Game updates and new features</li>
            <li>Exclusive development insights</li>
            <li>Special announcements and offers</li>
            <li>Community events</li>
          </ul>
          <p>Best regards,<br>Moonlighter Games Team</p>
        `,
      };

      try {
        await sgMail.send(welcomeMsg);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the subscription if email fails
      }
    }

    return res.status(200).json({ success: true, message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Function to get all newsletter subscribers (protected - for admin use)
exports.getNewsletterSubscribers = onRequest({ 
  cors: ['https://moonlightergames.com', 'https://www.moonlightergames.com', 'https://moonlightergameswebsite.web.app', 'https://moonlightergameswebsite.firebaseapp.com', 'http://localhost:5173', 'http://localhost:3000']
}, async (req, res) => {
  // TODO: Add authentication check here
  // For now, you can add a simple secret token check
  const token = req.headers.authorization;
  if (token !== 'Bearer YOUR_SECRET_TOKEN') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const subscribersRef = admin.firestore().collection('newsletter_subscribers');
    const snapshot = await subscribersRef.where('active', '==', true).get();
    
    const subscribers = [];
    snapshot.forEach(doc => {
      subscribers.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return res.status(200).json({ subscribers, count: subscribers.length });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// Mailchimp Newsletter signup function
exports.subscribeToMailchimp = onRequest({ 
  cors: ['https://moonlightergames.com', 'https://www.moonlightergames.com', 'https://moonlightergameswebsite.web.app', 'https://moonlightergameswebsite.firebaseapp.com', 'http://localhost:5173', 'http://localhost:3000']
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { email } = req.body;

  // Validate email
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Check if Mailchimp is configured
  if (!MAILCHIMP_API_KEY || !MAILCHIMP_SERVER_PREFIX || !MAILCHIMP_LIST_ID) {
    console.error('Mailchimp not configured');
    return res.status(500).json({ error: 'Newsletter service not configured' });
  }

  try {
    // Add subscriber to Mailchimp list
    const response = await mailchimp.lists.addListMember(MAILCHIMP_LIST_ID, {
      email_address: email,
      status: 'subscribed',
      tags: ['Website Signup', 'Lawn Care Simulator'],
      merge_fields: {
        SOURCE: 'Website'
      }
    });

    console.log('Successfully added to Mailchimp:', response.id);
    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter' 
    });

  } catch (error) {
    console.error('Mailchimp error:', error);
    
    // Handle specific Mailchimp errors
    if (error.response?.body?.title === 'Member Exists') {
      return res.status(400).json({ 
        error: 'This email is already subscribed to our newsletter' 
      });
    }

    if (error.response?.body?.detail) {
      return res.status(400).json({ 
        error: error.response.body.detail 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to subscribe. Please try again later.' 
    });
  }
});