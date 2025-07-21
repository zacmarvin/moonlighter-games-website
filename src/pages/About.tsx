import './About.css'

const About = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>Hi, we're Moonlighter Games!</h1>
          <p className="about-subtitle">
            We're an indie game studio that believes in crafting unique experiences with passion and creativity.
          </p>
        </div>
      </section>

      <section className="about-story">
        <div className="about-container">
          <div className="story-content">
            <h2>Our Journey</h2>
            <p>
              Founded by a small team of passionate developers, Moonlighter Games is dedicated to creating 
              memorable gaming experiences that resonate with players worldwide. Our first title, 
              Lawn Care Simulator, represents our commitment to finding joy in the everyday and 
              transforming simple activities into engaging gameplay.
            </p>
            <p>
              We believe in sustainable game development, putting our team first, and creating games 
              that we ourselves would love to play. No crunch, no compromise on quality – just 
              pure passion for great games.
            </p>
          </div>
        </div>
      </section>

      <section className="about-values">
        <div className="about-container">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>Player-First Design</h3>
              <p>
                Every decision we make starts with one question: Will this make the game more 
                enjoyable for our players?
              </p>
            </div>
            <div className="value-card">
              <h3>Creative Innovation</h3>
              <p>
                We're not afraid to explore unconventional ideas and turn them into engaging 
                gameplay experiences.
              </p>
            </div>
            <div className="value-card">
              <h3>Team Well-being</h3>
              <p>
                Happy developers make better games. We prioritize work-life balance and 
                sustainable development practices.
              </p>
            </div>
            <div className="value-card">
              <h3>Community Driven</h3>
              <p>
                We listen to our players and involve our community in the development process 
                through regular updates and feedback sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-team">
        <div className="about-container">
          <h2>Meet the Team</h2>
          <p className="team-intro">
            We're a diverse group of developers, artists, and dreamers united by our love for games. 
            From veterans of the industry to fresh talent bringing new perspectives, everyone at 
            Moonlighter Games contributes to our unique creative vision.
          </p>
          <div className="team-highlight">
            <p className="team-size">Current Team Size: Growing!</p>
            <p className="team-location">Location: Remote-First Global Team</p>
          </div>
        </div>
      </section>

      <section className="about-future">
        <div className="about-container">
          <h2>What's Next?</h2>
          <p>
            While Lawn Care Simulator is our current focus, we're already dreaming up new ways to 
            surprise and delight players. Stay tuned for updates on our journey and upcoming projects!
          </p>
          <div className="cta-section">
            <a href="#contact" className="btn btn-primary">Get in Touch</a>
            <a href="#news" className="btn btn-secondary">Follow Our Journey</a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About