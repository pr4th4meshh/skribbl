import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TanstackProvider } from '@/providers/tanstack'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Room } from '@/pages/Room'
import { Leaderboard } from '@/pages/Leaderboard'

export default function App() {
  return (
    <TanstackProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </BrowserRouter>
    </TanstackProvider>
  )
}
