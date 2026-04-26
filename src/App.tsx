import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Register } from './pages/Register'
import { Translate } from './pages/Translate'
import { Wordbook } from './pages/Wordbook'
import { Settings } from './pages/Settings'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/translate" element={<Translate />} />
        <Route path="/wordbook" element={<Wordbook />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
