import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import './Navbar.css'

const NAV_LINKS = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/admin', label: 'Admin Panel', icon: '⚙️' },
    { to: '/map', label: 'Map View', icon: '🗺️' },
    { to: '/report', label: 'Report Issue', icon: '📝' },
  ],
  fieldworker: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/report', label: 'Report Issue', icon: '📝' },
    { to: '/map', label: 'Map View', icon: '🗺️' },
  ],
  volunteer: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/volunteer', label: 'My Tasks', icon: '✅' },
    { to: '/map', label: 'Map View', icon: '🗺️' },
  ],
}

const ROLE_COLORS = {
  admin: '#ef4444',
  fieldworker: '#f59e0b',
  volunteer: '#22c55e',
}

const ROLE_LABELS = {
  admin: 'Admin',
  fieldworker: 'Field Worker',
  volunteer: 'Volunteer',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const links = user ? (NAV_LINKS[user.role] || []) : []

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} className="navbar-logo">
          <span className="logo-icon">🤝</span>
          <span className="logo-text">Sahayak <span style={{ color: 'var(--accent-primary)' }}>AI</span></span>
        </Link>

        {/* Desktop Links */}
        {user && (
          <ul className="navbar-links">
            {links.map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Right side */}
        <div className="navbar-right">
          {user ? (
            <>
              <div className="user-pill">
                <span className="user-avatar" style={{ background: ROLE_COLORS[user.role] + '33', color: ROLE_COLORS[user.role] }}>
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role" style={{ color: ROLE_COLORS[user.role] }}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}

          {/* Mobile hamburger */}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={menuOpen ? 'open' : ''} />
            <span className={menuOpen ? 'open' : ''} />
            <span className={menuOpen ? 'open' : ''} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="mobile-menu">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-nav-link ${location.pathname === link.to ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}
