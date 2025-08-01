import { useState } from 'react'
import './Contact.css'

const Contact = () => {
  // Formspree endpoint for contact form
  const FORMSPREE_CONTACT_ID = 'xrblevkq' // Your Formspree contact form ID
  
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [contactStatus, setContactStatus] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState('')
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false)

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    })
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingContact(true)
    setContactStatus('')

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_CONTACT_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject,
          message: contactForm.message,
          _subject: `Contact Form: ${contactForm.subject}`, // This sets the email subject
          _replyto: contactForm.email // This sets the reply-to address
        })
      })

      const data = await response.json()

      if (response.ok) {
        setContactStatus('Thank you for your message! We\'ll get back to you soon.')
        setContactForm({ name: '', email: '', subject: '', message: '' })
        setTimeout(() => setContactStatus(''), 5000)
      } else {
        if (data.errors) {
          const errorMessages = data.errors.map((error: any) => error.message).join(', ')
          setContactStatus(`Error: ${errorMessages}`)
        } else {
          setContactStatus('Failed to send message. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error sending contact form:', error)
      setContactStatus('Failed to send message. Please try again later.')
    } finally {
      setIsSubmittingContact(false)
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingNewsletter(true)
    setNewsletterStatus('')

    try {
      const response = await fetch('https://us-central1-moonlightergameswebsite.cloudfunctions.net/subscribeToMailchimp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail })
      })

      const data = await response.json()

      if (response.ok) {
        setNewsletterStatus('Thank you for subscribing! Check your email for confirmation.')
        setNewsletterEmail('')
        setTimeout(() => setNewsletterStatus(''), 5000)
      } else {
        setNewsletterStatus(data.error || 'Failed to subscribe. Please try again.')
      }
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      setNewsletterStatus('Failed to subscribe. Please try again later.')
    } finally {
      setIsSubmittingNewsletter(false)
    }
  }

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <div className="contact-hero-content">
          <h1>Contact Us</h1>
          <p>Get in touch with Moonlighter Games</p>
        </div>
      </div>

      <div className="contact-container">
        <div className="contact-content">
          <div className="contact-info">
            <h2>Let's Connect</h2>
            <p>Have questions about Lawn Care Simulator or want to share feedback? We'd love to hear from you!</p>
            
            <div className="contact-details">
              <div className="contact-item">
                <h3>Email</h3>
                <p><a href="mailto:info@moonlightergames.com">info@moonlightergames.com</a></p>
              </div>
              
              <div className="contact-item">
                <h3>Join Our Community</h3>
                <p>Connect with other players on our <a href="https://discord.gg/N4nGqR8swj" target="_blank" rel="noopener noreferrer">Discord server</a></p>
              </div>
              
              <div className="contact-item">
                <h3>Follow Us</h3>
                <div className="social-links-inline">
                  <a href="https://www.tiktok.com/@lawncaresimulator" target="_blank" rel="noopener noreferrer">TikTok</a>
                  <a href="https://www.youtube.com/@MoonlighterGames" target="_blank" rel="noopener noreferrer">YouTube</a>
                  <a href="https://store.steampowered.com/app/3859750/Lawn_Care_Simulator/" target="_blank" rel="noopener noreferrer">Steam</a>
                </div>
              </div>
            </div>
          </div>

          <div className="forms-section">
            <div className="contact-form-container">
              <h2>Send Us a Message</h2>
              <form onSubmit={handleContactSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={contactForm.message}
                    onChange={handleContactChange}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSubmittingContact}>
                  {isSubmittingContact ? 'Sending...' : 'Send Message'}
                </button>
                
                {contactStatus && <p className={`form-status ${contactStatus.includes('Failed') ? 'error' : 'success'}`}>{contactStatus}</p>}
              </form>
            </div>

            <div className="newsletter-container">
              <h2>Join Our Mailing List</h2>
              <p>Be the first to know about updates, new features, and exclusive content!</p>
              
              <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
                <div className="form-group">
                  <label htmlFor="newsletter-email">Email Address</label>
                  <input
                    type="email"
                    id="newsletter-email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={isSubmittingNewsletter}>
                  {isSubmittingNewsletter ? 'Subscribing...' : 'Subscribe'}
                </button>
                
                {newsletterStatus && <p className={`form-status ${newsletterStatus.includes('Failed') || newsletterStatus.includes('already') ? 'error' : 'success'}`}>{newsletterStatus}</p>}
              </form>

              <div className="newsletter-benefits">
                <h3>What You'll Get:</h3>
                <ul>
                  <li>Early access to new features</li>
                  <li>Exclusive development insights</li>
                  <li>Special announcements and offers</li>
                  <li>Community event invitations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact