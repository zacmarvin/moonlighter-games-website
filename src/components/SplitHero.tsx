import { Link } from 'react-router-dom'
import './SplitHero.css'

const SplitHero = () => {
  return (
    <div className="split-hero">
      {/* Lawn Care Simulator Section */}
      <section className="hero-section game-section">
        <div className="hero-background">
          <video 
            src="/lcs-trailer.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <h1>Lawn Care Simulator</h1>
          <p className="hero-tagline">The Ultimate Lawn Maintenance Experience</p>
          <p className="hero-description">
            Find zen in the art of lawn care. Mow, trim, and transform yards into 
            masterpieces in this relaxing simulation game.
          </p>
          <div className="hero-buttons">
            <Link to="/lawn-care-simulator" className="btn btn-primary">Learn More</Link>
            <a 
              href="https://store.steampowered.com/app/3859750/Lawn_Care_Simulator/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary"
            >
              Wishlist on Steam
            </a>
          </div>
        </div>
      </section>

      {/* Moonlighter Games Section */}
      <section className="hero-section moonlighter-section">
        <div className="hero-background">
          <img src="/moonlightergamesbackdrop.jpg" alt="Moonlighter Games" />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <img src="/moonlighter-logo.png" alt="Moonlighter Games" className="studio-logo" />
          <h1>Moonlighter Games</h1>
          <p className="hero-description">
            Dedicated to creating memorable gaming experiences that resonate with players worldwide. 
            We believe in sustainable game development and pure passion for great games.
          </p>
          <Link to="/about" className="btn btn-primary">Learn About Us</Link>
        </div>
      </section>
    </div>
  )
}

export default SplitHero