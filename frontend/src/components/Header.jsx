import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        pathname === to
          ? 'text-white underline underline-offset-4'
          : 'text-forest-200 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="bg-forest-800 text-white shadow-md">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🦌</span>
          <div>
            <div className="font-bold text-lg leading-tight">Draw Odds</div>
            <div className="text-xs text-forest-300 leading-tight">Big Game Draw Calculator</div>
          </div>
        </Link>
        <nav className="flex gap-4">
          {navLink('/hunts', 'Hunts')}
          {navLink('/admin', 'Admin')}
        </nav>
      </div>
    </header>
  )
}
