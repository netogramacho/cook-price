import { useAppStore } from '../store/useAppStore'

export function NotificationContainer() {
  const notifications = useAppStore(s => s.notifications)

  return (
    <div id="notification-container">
      {notifications.map(n => (
        <div key={n.id} className={`notification notification-${n.type}`}>
          {n.message}
        </div>
      ))}
    </div>
  )
}
