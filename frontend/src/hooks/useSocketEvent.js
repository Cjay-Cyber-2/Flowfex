import { useEffect } from 'react';
import socketClient from '../services/socketClient';

/**
 * React hook for subscribing to a Socket.io event.
 * Automatically cleans up the subscription on unmount.
 *
 * @param {string} namespace - 'orchestration' | 'session' | 'control'
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @param {Array} [deps] - Additional dependencies for the effect
 */
export default function useSocketEvent(namespace, event, callback, deps = []) {
  useEffect(() => {
    if (!socketClient.isConnected) return;
    const unsubscribe = socketClient.subscribe(namespace, event, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, event, socketClient.isConnected, ...deps]);
}
