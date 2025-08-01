import React from 'react';
import './PressKit.css';

const PressKit: React.FC = () => {
  return (
    <div className="press-kit">
      <div className="container">
        <h1>Press Kit</h1>
        <p className="intro">
          Welcome to the Moonlighter Games Press Kit. Here you'll find all the resources you need
          for articles, reviews, and media coverage of our games.
        </p>
        
        <div className="download-section">
          <h2>Download Press Kit</h2>
          <p>
            Our complete press kit includes logos, screenshots, game descriptions, and company information.
          </p>
          <a 
            href="/press-kit/moonlighter-games-press-kit.zip" 
            className="download-button"
            download
          >
            Download Press Kit (ZIP)
          </a>
        </div>
        
        <div className="contents-section">
          <h2>What's Included</h2>
          <ul>
            <li>Company logos in various formats</li>
            <li>High-resolution game screenshots</li>
            <li>Game descriptions and fact sheets</li>
            <li>Company background and history</li>
            <li>Contact information</li>
          </ul>
        </div>
        
        <div className="contact-section">
          <h2>Media Contact</h2>
          <p>
            For press inquiries, interviews, or additional materials, please contact us at:
          </p>
          <p className="contact-email">
            <a href="mailto:press@moonlightergames.com">press@moonlightergames.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PressKit;