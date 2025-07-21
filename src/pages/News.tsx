import { useState } from 'react'
import { newsPosts } from '../data/newsData'
import './News.css'

const News = () => {
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'devlog' | 'patch' | 'announcement'>('all')

  const filteredPosts = filter === 'all' 
    ? newsPosts 
    : newsPosts.filter(post => post.type === filter)

  const selectedPostData = selectedPost 
    ? newsPosts.find(post => post.id === selectedPost)
    : null

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'devlog': return 'type-devlog'
      case 'patch': return 'type-patch'
      case 'announcement': return 'type-announcement'
      default: return ''
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const renderContent = (content: string) => {
    // Simple markdown-like rendering with link support
    const renderLine = (text: string) => {
      // Handle links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = linkRegex.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index))
        }
        // Add the link
        parts.push(
          <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" style={{color: '#589253', textDecoration: 'underline'}}>
            {match[1]}
          </a>
        )
        lastIndex = match.index + match[0].length
      }
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
      }

      // Handle bold text
      if (parts.length === 0) {
        const boldRegex = /\*\*([^*]+)\*\*/g
        const boldParts = []
        lastIndex = 0
        while ((match = boldRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            boldParts.push(text.slice(lastIndex, match.index))
          }
          boldParts.push(<strong key={match.index}>{match[1]}</strong>)
          lastIndex = match.index + match[0].length
        }
        if (lastIndex < text.length) {
          boldParts.push(text.slice(lastIndex))
        }
        return boldParts.length > 0 ? boldParts : text
      }

      return parts.length > 0 ? parts : text
    }

    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index}>{line.substring(2)}</h1>
        } else if (line.startsWith('## ')) {
          return <h2 key={index}>{line.substring(3)}</h2>
        } else if (line.startsWith('### ')) {
          return <h3 key={index}>{line.substring(4)}</h3>
        } else if (line.startsWith('- ')) {
          return <li key={index}>{renderLine(line.substring(2))}</li>
        } else if (line.trim() === '') {
          return <br key={index} />
        } else {
          return <p key={index}>{renderLine(line)}</p>
        }
      })
  }

  return (
    <div className="news-page">
      <section className="news-hero">
        <div className="news-hero-content">
          <h1>News & Updates</h1>
          <p>Stay up to date with the latest from Lawn Care Simulator</p>
        </div>
      </section>

      <section className="news-content">
        <div className="news-container">
          <div className="news-filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Posts
            </button>
            <button 
              className={`filter-btn ${filter === 'devlog' ? 'active' : ''}`}
              onClick={() => setFilter('devlog')}
            >
              Devlogs
            </button>
            <button 
              className={`filter-btn ${filter === 'patch' ? 'active' : ''}`}
              onClick={() => setFilter('patch')}
            >
              Patch Notes
            </button>
            <button 
              className={`filter-btn ${filter === 'announcement' ? 'active' : ''}`}
              onClick={() => setFilter('announcement')}
            >
              Announcements
            </button>
          </div>

          {!selectedPost ? (
            <div className="news-grid">
              {filteredPosts.map(post => (
                <article 
                  key={post.id} 
                  className="news-card"
                  onClick={() => setSelectedPost(post.id)}
                >
                  <div className={`news-type ${getTypeColor(post.type)}`}>
                    {post.type}
                  </div>
                  <h2>{post.title}</h2>
                  <div className="news-meta">
                    <span className="news-date">{formatDate(post.date)}</span>
                    <span className="news-author">by {post.author}</span>
                  </div>
                  <p className="news-excerpt">{post.excerpt}</p>
                  <button className="read-more">Read More →</button>
                </article>
              ))}
            </div>
          ) : (
            <article className="news-full">
              <button 
                className="back-button"
                onClick={() => setSelectedPost(null)}
              >
                ← Back to News
              </button>
              <div className={`news-type ${getTypeColor(selectedPostData!.type)}`}>
                {selectedPostData!.type}
              </div>
              <h1>{selectedPostData!.title}</h1>
              <div className="news-meta">
                <span className="news-date">{formatDate(selectedPostData!.date)}</span>
                <span className="news-author">by {selectedPostData!.author}</span>
              </div>
              <div className="news-body">
                {renderContent(selectedPostData!.content)}
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}

export default News