import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private listeners = new Set<(notification: any) => void>()

  connect(token: string) {
    if (this.socket?.connected) return

    // Kết nối tới namespace /ws trên backend
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    this.socket = io(`${backendUrl}/ws`, {
      auth: { token },
      transports: ['websocket'],
    })

    this.socket.on('connect', () => {
      console.log('Socket.IO connected to backend namespace /ws')
    })

    this.socket.on('disconnect', () => {
      console.log('Socket.IO disconnected')
    })

    this.socket.on('notification', (data) => {
      this.listeners.forEach((cb) => {
        try {
          cb(data)
        } catch (err) {
          console.error('Error invoking socket notification listener:', err)
        }
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  /** Lắng nghe thông báo realtime */
  onNotification(callback: (notification: any) => void) {
    this.listeners.add(callback)
  }

  /** Hủy lắng nghe */
  offNotification(callback?: (notification: any) => void) {
    if (callback) {
      this.listeners.delete(callback)
    } else {
      this.listeners.clear()
    }
  }
}

const socketService = new SocketService()
export default socketService
