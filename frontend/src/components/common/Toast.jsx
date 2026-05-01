import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import useStore from '../../store/useStore';
import './Toast.css';

function Toast() {
  const { notifications, removeNotification } = useStore();

  useEffect(() => {
    const timers = notifications
      .filter((notification) => notification.duration)
      .map((notification) =>
        setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration)
      );

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [notifications, removeNotification]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} color="var(--color-verdigris-pale)" />;
      case 'error':
        return <AlertCircle size={18} color="var(--color-sinoper)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--color-indian-yellow)" />;
      default:
        return <Info size={18} color="var(--color-massicot)" />;
    }
  };

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast toast-${notification.type || 'info'}`}
        >
          <div className="toast-icon">{getIcon(notification.type)}</div>
          <div className="toast-content">
            {notification.title && (
              <div className="toast-title">{notification.title}</div>
            )}
            <div className="toast-message">{notification.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="error-banner">
      {message}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            marginLeft: '12px',
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
          }}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default Toast;
