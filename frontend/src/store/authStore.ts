import { create } from 'zustand'
import type { User } from '../types'
import authService from '../services/auth.service'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setError: (error: string | null) => void
  logout: () => Promise<void>
  initFromStorage: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  //Cập nhật user cả store Zustand và localStorage
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    else {
      localStorage.removeItem('user');
    }
    set({ user: user, isAuthenticated: !!user, error: null });

  },


  setError: (error) => set({ error }),

  logout: async () => {
    set({ isLoading: true })
    await authService.logout()
    set({ user: null, isAuthenticated: false, isLoading: false, error: null })
  },

  /** Khởi tạo state từ localStorage khi app load */
  initFromStorage: () => {
    const user = authService.getStoredUser()
    const isAuthenticated = authService.isAuthenticated()
    set({ user, isAuthenticated })
  },
}))

export default useAuthStore
