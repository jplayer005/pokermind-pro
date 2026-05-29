import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import PreflopTrainer from '@/pages/PreflopTrainer'
import PostflopTrainer from '@/pages/PostflopTrainer'
import HandReplayer from '@/pages/HandReplayer'
import Calculators from '@/pages/Calculators'
import Study from '@/pages/Study'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="preflop" element={<PreflopTrainer />} />
          <Route path="postflop" element={<PostflopTrainer />} />
          <Route path="replayer" element={<HandReplayer />} />
          <Route path="calculators" element={<Calculators />} />
          <Route path="study" element={<Study />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
