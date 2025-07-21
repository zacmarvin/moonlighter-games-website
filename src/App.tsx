import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import NotificationManager from './components/NotificationManager'
import Home from './pages/Home'
import About from './pages/About'
import LawnCareSimulator from './pages/LawnCareSimulator'
import News from './pages/News'
import Contact from './pages/Contact'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/lawn-care-simulator" element={<LawnCareSimulator />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
        <Footer />
        <NotificationManager />
      </div>
    </Router>
  )
}

export default App
