import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null

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
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  /** Lắng nghe thông báo realtime */
  onNotification(callback: (notification: any) => void) {
    if (!this.socket) return
    this.socket.off('notification') // Tránh trùng listener
    this.socket.on('notification', callback)
  }

  /** Hủy lắng nghe */
  offNotification() {
    this.socket?.off('notification')
  }
}

const socketService = new SocketService()
export default socketService
