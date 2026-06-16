# FocusFlow - API Integration Guide

This document explains how to connect the FocusFlow frontend to a NestJS REST API backend.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Integration Steps](#integration-steps)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Example: Tasks](#example-tasks)
7. [Authentication](#authentication)
8. [Error Handling](#error-handling)
9. [Testing](#testing)

---

## Overview

The FocusFlow frontend is completely **frontend-only** with mock data. All data is currently hardcoded in `src/services/mockData.ts`.

To connect to a backend:
1. Replace mock data imports with API calls
2. Add environment configuration for API URL
3. Implement authentication flow
4. Handle async loading & error states
5. Persist data on the backend

---

## Current Architecture

### Before (Mock)
```
LandingPage ──→ LoginPage ──→ Dashboard ──→ TaskManagement
                 (Mock)         (Mock)         (Mock)
                                ↓
                            mockData.ts (hardcoded tasks)
```

### After (With API)
```
LandingPage ──→ LoginPage ──→ Dashboard ──→ TaskManagement
                 (API)         (API)         (API)
                                ↓
                         NestJS Backend
                         PostgreSQL DB
```

---

## Integration Steps

### Step 1: Setup Environment Variables

Create `.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_ENV=development
```

Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL,
        changeOrigin: true,
      },
    },
  },
})
```

### Step 2: Create API Service

Create `src/services/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    if (!res.ok) throw new Error(res.statusText)
    const json: ApiResponse<T> = await res.json()
    return json.data
  },

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(res.statusText)
    const json: ApiResponse<T> = await res.json()
    return json.data
  },

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(res.statusText)
    const json: ApiResponse<T> = await res.json()
    return json.data
  },

  async delete(endpoint: string): Promise<void> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    if (!res.ok) throw new Error(res.statusText)
  }
}
```

### Step 3: Replace Mock Data with API Calls

#### Before (Dashboard.tsx):
```typescript
import { mockTasks } from '../services/mockData'

export default function Dashboard() {
  const todayTasks = mockTasks.filter(...)
}
```

#### After (Dashboard.tsx):
```typescript
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Task } from '../services/mockData'

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await api.get<Task[]>('/tasks')
        setTasks(data)
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  if (loading) return <div>Loading...</div>
  
  const todayTasks = tasks.filter(...)
}
```

---

## API Endpoints

### Authentication

#### POST `/auth/register`
Register a new user
```typescript
// Request
{
  name: "Huyền Trang",
  email: "huyenT@example.com",
  password: "password123"
}

// Response
{
  data: {
    id: "user-123",
    name: "Huyền Trang",
    email: "huyenT@example.com",
    token: "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST `/auth/login`
Login existing user
```typescript
// Request
{
  email: "huyenT@example.com",
  password: "password123"
}

// Response
{
  data: {
    id: "user-123",
    name: "Huyền Trang",
    token: "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### GET `/auth/me`
Get current user
```typescript
// Response
{
  data: {
    id: "user-123",
    name: "Huyền Trang",
    email: "huyenT@example.com"
  }
}
```

#### POST `/auth/logout`
Logout (frontend clears token)

---

### Tasks

#### GET `/tasks`
List all tasks for current user
```typescript
// Query params
?status=all|todo|in-progress|completed|delayed
?project=project-name
?priority=high|medium|low
?search=keyword
?sort=created|due-date|priority

// Response
{
  data: [
    {
      id: "task-1",
      title: "Viết chương 2",
      description: "...",
      status: "in-progress",
      priority: "high",
      dueDate: "2024-06-15",
      estimatedTime: 480,
      project: "Luận văn",
      tags: ["writing"],
      subtasks: [
        { id: "sub-1", title: "Find sources", completed: true },
        { id: "sub-2", title: "Write draft", completed: false }
      ]
    }
  ]
}
```

#### POST `/tasks`
Create a new task
```typescript
// Request
{
  title: "Viết chương 2",
  description: "Complete chapter 2 of thesis",
  priority: "high",
  dueDate: "2024-06-15",
  estimatedTime: 480,
  project: "Luận văn",
  tags: ["writing"]
}

// Response
{
  data: {
    id: "task-1",
    title: "Viết chương 2",
    ...
  }
}
```

#### PUT `/tasks/:id`
Update a task
```typescript
// Request
{
  title: "Updated title",
  status: "completed",
  ...
}

// Response
{
  data: { id: "task-1", ... }
}
```

#### DELETE `/tasks/:id`
Delete a task
```typescript
// Response
{ message: "Task deleted" }
```

#### PATCH `/tasks/:id/status`
Update task status
```typescript
// Request
{ status: "completed" }

// Response
{ data: { id: "task-1", status: "completed" } }
```

---

### Focus Sessions

#### GET `/focus-sessions`
List all focus sessions
```typescript
// Query params
?taskId=task-id
?from=2024-05-28
?to=2024-05-29

// Response
{
  data: [
    {
      id: "session-1",
      taskId: "task-1",
      duration: 25,
      focusLevel: 5,
      distractions: [],
      startTime: "2024-05-28T09:00:00Z",
      endTime: "2024-05-28T09:25:00Z"
    }
  ]
}
```

#### POST `/focus-sessions`
Record a new focus session
```typescript
// Request
{
  taskId: "task-1",
  duration: 25,
  focusLevel: 5,
  distractions: ["email", "notification"]
}

// Response
{
  data: {
    id: "session-1",
    ...
  }
}
```

---

### User Preferences

#### GET `/user/settings`
Get user settings
```typescript
{
  data: {
    workStartTime: "08:00",
    workEndTime: "22:00",
    workDays: ["Monday", "Tuesday", ...],
    pomodoroSettings: {
      focusTime: 25,
      shortBreak: 5,
      longBreak: 15
    },
    notificationsEnabled: true
  }
}
```

#### PUT `/user/settings`
Update user settings
```typescript
// Request
{
  workStartTime: "09:00",
  workEndTime: "23:00",
  pomodoroSettings: {
    focusTime: 30
  }
}

// Response
{ data: { ... } }
```

---

### Analytics

#### GET `/analytics/stats`
Get productivity statistics
```typescript
// Query params
?from=2024-05-22&to=2024-05-28

// Response
{
  data: {
    completionRate: 68,
    totalTasksCompleted: 12,
    totalTasksDelayed: 2,
    totalFocusTime: 2850,
    streakDays: 5,
    dailyStats: [
      { date: "2024-05-22", completed: 3, total: 5 }
    ]
  }
}
```

#### GET `/analytics/productivity`
Get detailed productivity data
```typescript
{
  data: {
    daily: [
      { date: "2024-05-28", focusTime: 75, tasksCompleted: 1 }
    ],
    hourly: [
      { hour: "09:00", tasks: 3, focus: true }
    ]
  }
}
```

---

### AI Planner

#### POST `/ai-planner/generate`
Generate AI-powered plan
```typescript
// Request
{
  goal: "Viết chương 2 báo cáo",
  deadline: "2024-06-15",
  estimatedTime: 4,
  difficulty: "hard",
  energyLevel: "high"
}

// Response
{
  data: {
    plan: [
      {
        date: "2024-05-28",
        startTime: "09:00",
        endTime: "11:00",
        task: "Find sources"
      }
    ],
    breakdown: ["Task 1", "Task 2"],
    priorityScore: 8.5,
    warnings: ["Task is difficult - break into smaller subtasks"]
  }
}
```

---

## Data Models

### Task
```typescript
interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'completed' | 'delayed'
  priority: 'high' | 'medium' | 'low'
  dueDate: string // ISO date
  estimatedTime: number // minutes
  project: string
  tags: string[]
  subtasks: Subtask[]
  createdAt: string
  updatedAt: string
}

interface Subtask {
  id: string
  title: string
  completed: boolean
}
```

### FocusSession
```typescript
interface FocusSession {
  id: string
  userId: string
  taskId: string
  duration: number // minutes
  focusLevel: number // 1-5
  distractions: string[]
  notes: string
  startTime: string // ISO datetime
  endTime: string // ISO datetime
  createdAt: string
}
```

### User
```typescript
interface User {
  id: string
  name: string
  email: string
  avatar?: string
  workStartTime: string // "08:00"
  workEndTime: string // "22:00"
  workDays: string[] // ["Monday", "Tuesday", ...]
  pomodoroSettings: {
    focusTime: number
    shortBreak: number
    longBreak: number
  }
  createdAt: string
  updatedAt: string
}
```

---

## Example: Tasks

### Fetch Tasks
```typescript
import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Task } from '../types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const data = await api.get<Task[]>('/tasks')
        setTasks(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  return { tasks, loading, error }
}
```

### Create Task
```typescript
const handleCreateTask = async (formData: {
  title: string
  priority: string
  dueDate: string
}) => {
  try {
    const newTask = await api.post<Task>('/tasks', formData)
    setTasks([...tasks, newTask])
    setShowModal(false)
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}
```

### Update Task
```typescript
const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
  try {
    const updated = await api.put<Task>(`/tasks/${taskId}`, updates)
    setTasks(tasks.map(t => t.id === taskId ? updated : t))
  } catch (error) {
    console.error('Failed to update task:', error)
  }
}
```

### Delete Task
```typescript
const handleDeleteTask = async (taskId: string) => {
  try {
    await api.delete(`/tasks/${taskId}`)
    setTasks(tasks.filter(t => t.id !== taskId))
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}
```

---

## Authentication

### Login Implementation

```typescript
// src/App.tsx
import { useState, useEffect } from 'react'
import { api } from './services/api'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await api.get('/auth/me')
          setIsAuthenticated(true)
        } catch {
          localStorage.removeItem('token')
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await api.post<{ token: string }>('/auth/login', {
        email,
        password
      })
      localStorage.setItem('token', response.token)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <Routes>
      {isAuthenticated ? (
        <Route path="/dashboard" element={<Dashboard />} />
      ) : (
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      )}
    </Routes>
  )
}
```

---

## Error Handling

```typescript
export const api = {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...options.headers
        }
      })

      if (res.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('token')
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || res.statusText)
      }

      return res.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }
}
```

---

## Testing

### Test API Integration
```typescript
import { describe, it, expect, vi } from 'vitest'
import { api } from './api'

describe('API Service', () => {
  it('should fetch tasks', async () => {
    vi.mock('fetch')
    const mockTasks = [{ id: '1', title: 'Test' }]
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockTasks })
    })

    const tasks = await api.get('/tasks')
    expect(tasks).toEqual(mockTasks)
  })

  it('should handle auth errors', async () => {
    fetch.mockResolvedValue({
      status: 401,
      ok: false,
      json: () => Promise.resolve({ message: 'Unauthorized' })
    })

    await expect(api.get('/tasks')).rejects.toThrow()
  })
})
```

---

## Deployment Checklist

- [ ] NestJS backend deployed and accessible
- [ ] CORS configured for frontend domain
- [ ] Environment variables set in `.env.local`
- [ ] API endpoints tested with Postman/Insomnia
- [ ] Authentication flow verified
- [ ] Error handling implemented
- [ ] Loading states added to components
- [ ] Logout functionality working
- [ ] Token refresh implemented (if using JWT)
- [ ] Sensitive data not logged to console

---

## Quick Start: Full Integration

1. **Setup backend** (NestJS)
   ```bash
   npm install @nestjs/common @nestjs/core
   ```

2. **Create API service** in frontend
   - Copy `api.ts` template above

3. **Update Dashboard.tsx**
   - Replace `mockTasks` with `api.get('/tasks')`
   - Add loading/error states

4. **Update LoginPage.tsx**
   - Connect to `/auth/login` endpoint
   - Store token in localStorage

5. **Test endpoints**
   - Use Postman to verify backend
   - Check responses match data models

6. **Deploy**
   - Vite build for frontend
   - Docker for NestJS backend
   - Environment variables set

---

For more details on NestJS setup, see the [NestJS Documentation](https://docs.nestjs.com/).
