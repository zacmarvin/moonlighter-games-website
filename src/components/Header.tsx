import { useState } from 'react'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <a href="/">
            <span className="logo-text">Moonlighter Games</span>
          </a>
        </div>
        
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <ul className="nav-list">
            <li><a href="#about">About Us</a></li>
            <li><a href="#lawn-care-simulator">Lawn Care Simulator</a></li>
            <li><a href="#news">News</a></li>
            <li><a href="#contact">Contact Us</a></li>
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