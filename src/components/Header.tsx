import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <img src="/moonlighter-logo.png" alt="Moonlighter Games" className="logo-image" />
          </Link>
        </div>
        
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <ul className="nav-list">
            <li><Link to="/about" onClick={closeMenu}>About Us</Link></li>
            <li><Link to="/lawn-care-simulator" onClick={closeMenu}>Lawn Care Simulator</Link></li>
            <li><Link to="/news" onClick={closeMenu}>News</Link></li>
            <li><Link to="/contact" onClick={closeMenu}>Contact Us</Link></li>
          </ul>
        </nav>
        
        <button className="menu-toggle" onClick={toggleMenu}>
          <span className="menu-icon"></span>
          <span className="menu-icon"></span>
          <span className="menu-icon"></span>
        </button>
      </div>
    </header>
  )
}

export default Header