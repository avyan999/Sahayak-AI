import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const DEMO_CREDS = [
  { role: 'admin', label: '🛡️ Admin', email: 'admin@sahayak.org', password: 'admin123', color: '#ef4444' },
  { role: 'volunteer', label: '🙋 Volunteer', email: 'vol1@sahayak.org', password: 'vol123', color: '#22c55e' },
  { role: 'fieldworker', label: '📋 Field Worker', email: 'field1@sahayak.org', password: 'field123', color: '#f59e0b' },
]

const SKILLS_OPTIONS = ['Food Distribution', 'Medical Aid', 'Disaster Relief', 'Shelter Setup', 'Water Supply', 'Counseling', 'Logistics', 'Education']

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'volunteer',
    skills: [],
    location: '',
  })

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const toggleSkill = (skill) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill]
    }))
  }

  const fillDemo = (cred) => {
    setForm(f => ({ ...f, email: cred.email, password: cred.password }))
    setIsRegister(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isRegister) {
        await register(form.email, form.password, {
          name: form.name,
          role: form.role,
          skills: form.role === 'volunteer' ? form.skills : [],
          location: form.location
        })
      } else {
        await login(form.email, form.password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-container animate-fade-in-up">
        {/* Left side */}
        <div className="login-left">
          <Link to="/" className="navbar-logo" style={{ marginBottom: 32 }}>
            <span className="logo-icon">🤝</span>
            <span className="logo-text">Sahayak <span style={{ color: 'var(--accent-primary)' }}>AI</span></span>
          </Link>
          <h1 className="login-headline">
            Coordinate Aid.<br />
            <span style={{ color: 'var(--accent-primary)' }}>Save Lives.</span>
          </h1>
          <p className="login-tagline">
            The smart resource allocation platform for NGOs and social impact organizations.
          </p>

          {/* Demo credentials */}
          <div className="demo-creds-section">
            <div className="demo-label">⚡ Quick Demo Login</div>
            <div className="demo-cards">
              {DEMO_CREDS.map(c => (
                <button
                  key={c.role}
                  className="demo-card"
                  onClick={() => fillDemo(c)}
                  style={{ borderColor: c.color + '44' }}
                >
                  <div className="demo-role" style={{ color: c.color }}>{c.label}</div>
                  <div className="demo-email">{c.email}</div>
                  <div className="demo-pass">{c.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="login-right">
          <div className="login-form-card">
            {/* Toggle tabs */}
            <div className="form-tabs">
              <button
                className={`form-tab ${!isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(false); setError('') }}
              >
                Sign In
              </button>
              <button
                className={`form-tab ${isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(true); setError('') }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {isRegister && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {isRegister && (
                <>
                  <div className="form-group">
                    <label className="form-label">Your Role</label>
                    <select name="role" className="form-select" value={form.role} onChange={handleChange}>
                      <option value="volunteer">Volunteer</option>
                      <option value="fieldworker">Field Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location / City</label>
                    <input
                      type="text"
                      name="location"
                      className="form-input"
                      placeholder="e.g. Mumbai"
                      value={form.location}
                      onChange={handleChange}
                    />
                  </div>

                  {form.role === 'volunteer' && (
                    <div className="form-group">
                      <label className="form-label">Skills (select all that apply)</label>
                      <div className="skills-grid">
                        {SKILLS_OPTIONS.map(skill => (
                          <button
                            key={skill}
                            type="button"
                            className={`skill-chip ${form.skills.includes(skill) ? 'selected' : ''}`}
                            onClick={() => toggleSkill(skill)}
                          >
                            {form.skills.includes(skill) ? '✓ ' : ''}{skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="error-msg">
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '14px' }} disabled={loading}>
                {loading ? <span className="spinner" /> : (isRegister ? '🚀 Create Account' : '→ Sign In')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
