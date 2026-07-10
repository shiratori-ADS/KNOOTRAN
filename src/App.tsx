import { Navigate, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Translate } from './pages/Translate'
import { Wordbook } from './pages/Wordbook'
import { Notes } from './pages/Notes'
import { Settings } from './pages/Settings'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/wordbook" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/translate" element={<Translate />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/wordbook" element={<Wordbook />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}
