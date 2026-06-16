import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import TaskManagement from './pages/TaskManagement'
import Calendar from './pages/Calendar'
import FocusTimer from './pages/FocusTimer'
import AIPlanner from './pages/AIPlanner'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage onLoginClick={() => setIsAuthenticated(true)} />} />
        <Route path="/login" element={<LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardLayout><Dashboard /></DashboardLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/tasks"
          element={isAuthenticated ? <DashboardLayout><TaskManagement /></DashboardLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/calendar"
          element={isAuthenticated ? <DashboardLayout><Calendar /></DashboardLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/focus"
          element={isAuthenticated ? <DashboardLayout><FocusTimer /></DashboardLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/ai-planner"
          element={isAuthenticated ? <DashboardLayout><AIPlanner /></DashboardLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/analytics"
          element={isAuthenticated ? <DashboardLayout><Analytics /></DashboardLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <DashboardLayout><Settings onLogout={() => setIsAuthenticated(false)} /></DashboardLayout> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  )
}
