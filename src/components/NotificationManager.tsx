import Notification from './Notification'
import './NotificationManager.css'

const NotificationManager = () => {
  return (
    <div className="notification-manager">
      <Notification 
        message="Lawn Care Simulator is coming soon! Add it to your Steam wishlist to get notified on release."
        action={{
          text: "Wishlist Now",
          url: "https://store.steampowered.com/app/3859750/Lawn_Care_Simulator/"
        }}
        delay={2000}
        duration={10000}
      />
      <Notification 
        message="Join our Discord community for updates, sneak peeks, and to chat with the developers!"
        action={{
          text: "Join Discord",
          url: "https://discord.gg/N4nGqR8swj"
        }}
        delay={13000}  // 2s delay + 10s duration + 1s buffer
        duration={10000}
      />
    </div>
  )
}

export default NotificationManager