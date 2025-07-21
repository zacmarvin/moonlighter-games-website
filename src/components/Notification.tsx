import { useEffect, useState } from 'react'
import './Notification.css'

interface NotificationProps {
  message: string
  action?: {
    text: string
    url: string
  }
  delay?: number
  duration?: number
}

const Notification: React.FC<NotificationProps> = ({ 
  message, 
  action, 
  delay = 0, 
  duration = 8000 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    const hideTimer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 300)
    }, delay + duration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [delay, duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className={`notification ${isExiting ? 'notification-exit' : ''}`}>
      <div className="notification-content">
        <p>{message}</p>
        {action && (
          <a href={action.url} target="_blank" rel="noopener noreferrer" className="notification-action">
            {action.text}
          </a>
        )}
      </div>
      <button className="notification-close" onClick={handleClose}>×</button>
    </div>
  )
}

export default Notification