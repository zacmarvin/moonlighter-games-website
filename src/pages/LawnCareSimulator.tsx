import { useState } from 'react'
import './LawnCareSimulator.css'

const LawnCareSimulator = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  
  const screenshots = [
    { id: 1, src: '/Screenshot1.png', alt: 'Lawn Care Simulator gameplay screenshot 1' },
    { id: 2, src: '/Screenshot2.png', alt: 'Lawn Care Simulator gameplay screenshot 2' },
    { id: 3, src: '/Screenshot3.png', alt: 'Lawn Care Simulator gameplay screenshot 3' },
    { id: 4, src: '/Screenshot4.png', alt: 'Lawn Care Simulator gameplay screenshot 4' },
    { id: 5, src: '/Screenshot5.png', alt: 'Lawn Care Simulator gameplay screenshot 5' },
    { id: 6, src: '/Screenshot6.png', alt: 'Lawn Care Simulator gameplay screenshot 6' },
    { id: 7, src: '/Screenshot7.png', alt: 'Lawn Care Simulator gameplay screenshot 7' },
    { id: 8, src: '/Screenshot8.png', alt: 'Lawn Care Simulator gameplay screenshot 8' },
    { id: 9, src: '/Screenshot9.png', alt: 'Lawn Care Simulator gameplay screenshot 9' },
  ]

  return (
    <div className="lawn-care-simulator-page">
      <section className="game-hero">
        <div className="game-hero-background"></div>
        <div className="game-hero-content">
          <h1>Lawn Care Simulator</h1>
          <h2>Take Back the Yard in Lawntrepreneurs!</h2>
          <p className="game-tagline">
            Grab your mower and bring unruly lawns under control. From overgrown backyards to massive estates, 
            cut through the chaos one blade at a time. Satisfyingly slice, edge, and clean your way to perfectly 
            manicured greens — all in a day's mow.
          </p>
        </div>
      </section>

      <section className="game-description">
        <div className="game-container">
          <div className="description-content">
            <h3>Mow Your Way to Relaxation</h3>
            <p>
              Mow away your stress with the soothing hum of a well-oiled engine. Fire up your mower and trim 
              every blade of grass in sight. Build your own lawn care empire and unlock new tools, upgrades, 
              and equipment – all with the simple satisfaction of cutting grass to a pristine finish.
            </p>
            <p>
              Relax and unwind in this satisfying lawn mower simulator. Whether you're hedging for perfection 
              or tackling wild overgrowth, no lawn is too daunting with your growing arsenal of mowers, 
              trimmers, hedgers, leaf blowers and more. From backyard patches to sprawling estates, every job 
              is a chance to leave your mark and keep the grass greener on your side.
            </p>
            <p>
              Absorb the peaceful pace and rhythmic satisfaction of mowing. Craft satisfying but subtle stripes, 
              shape elaborate patterns, or just clean up overgrown chaos. Your mowers are your brushes; the turf 
              is your canvas. So sit back, relax, and let the clippings fly.
            </p>
          </div>
        </div>
      </section>

      <section className="game-features">
        <div className="game-container">
          <h3>Key Features</h3>
          <div className="features-grid">
            <div className="feature-card">
              <h4>Satisfying Gameplay</h4>
              <p>Experience the zen-like satisfaction of transforming chaotic lawns into pristine landscapes</p>
            </div>
            <div className="feature-card">
              <h4>Build Your Empire</h4>
              <p>Start small and grow your lawn care business with new tools and equipment</p>
            </div>
            <div className="feature-card">
              <h4>Variety of Tools</h4>
              <p>Mowers, trimmers, hedgers, leaf blowers and more to tackle any job</p>
            </div>
            <div className="feature-card">
              <h4>Creative Freedom</h4>
              <p>Create patterns, stripes, and designs - the lawn is your canvas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="screenshots">
        <div className="game-container">
          <h3>Screenshots</h3>
          <div className="screenshot-gallery">
            {screenshots.map((screenshot) => (
              <div 
                key={screenshot.id} 
                className="screenshot-item"
                onClick={() => setSelectedImage(screenshot.id)}
              >
                <img src={screenshot.src} alt={screenshot.alt} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content">
            <img 
              src={screenshots.find(s => s.id === selectedImage)?.src} 
              alt={screenshots.find(s => s.id === selectedImage)?.alt}
            />
            <button className="lightbox-close" onClick={() => setSelectedImage(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LawnCareSimulator