import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = `ws://${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setMessages(prev => [data, ...prev].slice(0, 50))
      } catch {}
    }

    ws.onclose = () => {
      setIsConnected(false)
      // Auto-reconnect after 3 seconds
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [])

  const subscribe = (callback) => {
    // Return unsubscribe fn
    const handler = (e) => {
      try { callback(JSON.parse(e.data)) } catch {}
    }
    wsRef.current?.addEventListener('message', handler)
    return () => wsRef.current?.removeEventListener('message', handler)
  }

  return (
    <WebSocketContext.Provider value={{ messages, isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => useContext(WebSocketContext)
