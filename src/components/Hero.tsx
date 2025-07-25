import { Link } from 'react-router-dom'
import './Hero.css'

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-overlay"></div>
      </div>
      <div className="hero-content">
        <h1 className="hero-title">Lawn Care Simulator</h1>
        <p className="hero-subtitle">The Ultimate Lawn Maintenance Experience</p>
        <p className="hero-description">
          Experience the satisfaction of perfect lawn care in our upcoming indie game. 
          Mow, trim, and maintain beautiful lawns in stunning detail.
        </p>
        <div className="hero-buttons">
          <Link to="/lawn-care-simulator" className="btn btn-primary">Learn More</Link>
          <Link to="/news" className="btn btn-secondary">Latest News</Link>
        </div>
      </div>
    </section>
  )
}

export default Hero