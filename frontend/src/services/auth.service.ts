/**
 * authService — Quản lý xác thực người dùng.
 *
 * Hiện tại dùng NestJS REST API thực.
 * Để chuyển sang mock: thay thế nội dung các hàm bên dưới bằng dữ liệu giả.
 */
import api from './api'
import type { AuthResponse, User } from '../types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  displayName?: string
  workStartTime?: string
  workEndTime?: string
  workDays?: number[]
  mainGoal?: string
}

const authService = {
  /** Đăng nhập — trả về user + tokens */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload)
    return data
  },

  /** Đăng ký tài khoản mới */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload)
    return data
  },

  /** Lấy thông tin user hiện tại (dùng access token trong header) */
  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  /** Đăng xuất — revoke refresh token phía server */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken })
      } catch {
        // Nếu server lỗi, vẫn xoá localStorage phía client
      }
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },

  /** Lưu tokens và user vào localStorage sau khi đăng nhập thành công */
  saveSession(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('refreshToken', response.refreshToken)
    localStorage.setItem('user', JSON.stringify(response.user))
  },

  /** Kiểm tra người dùng đã đăng nhập hay chưa (dựa trên accessToken) */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken')
  },

  /** Lấy user từ localStorage (không gọi API) */
  getStoredUser(): User | null {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },
}

export default authService
