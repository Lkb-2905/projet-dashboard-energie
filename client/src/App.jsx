import { useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'

const STORAGE_KEY = 'energy-auth'

const getStoredAuth = () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function App() {
  const [auth, setAuth] = useState(() => getStoredAuth())

  const user = useMemo(() => auth?.user ?? null, [auth])
  const token = useMemo(() => auth?.token ?? null, [auth])

  const handleLogin = (payload) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setAuth(payload)
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          auth ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          auth ? (
            <Dashboard user={user} token={token} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
