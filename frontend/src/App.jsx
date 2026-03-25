import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import HuntList from './pages/HuntList'
import HuntDetail from './pages/HuntDetail'
import Admin from './pages/Admin'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hunts" element={<HuntList />} />
          <Route path="/hunts/:id" element={<HuntDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <footer className="text-center text-xs text-stone-400 py-4 border-t border-stone-200">
        Draw Odds — Data sourced from state wildlife agencies. Always verify with official sources.
      </footer>
    </div>
  )
}
