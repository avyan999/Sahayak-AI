import { Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import './Landing.css'

const STATS = [
  { label: 'Cases Resolved', value: 1240, icon: '✅', suffix: '+' },
  { label: 'Volunteers Active', value: 380, icon: '🙋', suffix: '+' },
  { label: 'Communities Served', value: 62, icon: '🏘️', suffix: '' },
  { label: 'NGOs Onboarded', value: 28, icon: '🤝', suffix: '' },
]

const FEATURES = [
  {
    icon: '🎯',
    title: 'Smart Priority Detection',
    desc: 'Rule-based scoring engine auto-classifies every case as High, Medium or Low priority so urgent needs are never missed.',
    color: '#ef4444',
  },
  {
    icon: '🗺️',
    title: 'Real-time Map View',
    desc: 'Color-coded pins on an interactive map give field workers and admins instant situational awareness across all locations.',
    color: '#0ea5e9',
  },
  {
    icon: '⚡',
    title: 'Instant Volunteer Matching',
    desc: 'Proximity and skill-based matching connects the right volunteer to each case in seconds, not hours.',
    color: '#10b981',
  },
  {
    icon: '📊',
    title: 'Impact Analytics',
    desc: 'Track cases submitted, resolved, and pending with live dashboard metrics so you can measure real social impact.',
    color: '#f59e0b',
  },
  {
    icon: '🔔',
    title: 'Live Notifications',
    desc: 'WebSocket-powered real-time alerts ensure no high-priority case sits unnoticed while the dashboard is open.',
    color: '#a855f7',
  },
  {
    icon: '📱',
    title: 'Mobile-First Design',
    desc: 'Field workers can submit reports from anywhere on any device — even in low-connectivity areas.',
    color: '#ec4899',
  },
]

const ROLES = [
  {
    icon: '🛡️',
    role: 'NGO Admin',
    desc: 'Full oversight — view all cases, assign volunteers, manage priorities, and track impact metrics.',
    color: '#ef4444',
    cred: { email: 'admin@sahayak.org', pass: 'admin123' },
  },
  {
    icon: '🙋',
    role: 'Volunteer',
    desc: 'Accept or reject assigned tasks, mark them complete, and see your contribution to the community.',
    color: '#22c55e',
    cred: { email: 'vol1@sahayak.org', pass: 'vol123' },
  },
  {
    icon: '📋',
    role: 'Field Worker',
    desc: 'Submit on-ground reports with location, photos, and urgency details directly from the field.',
    color: '#f59e0b',
    cred: { email: 'field1@sahayak.org', pass: 'field123' },
  },
]

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

function StatCard({ stat, animate }) {
  const count = useCountUp(stat.value, 1800, animate)
  return (
    <div className="landing-stat-card">
      <div className="landing-stat-icon">{stat.icon}</div>
      <div className="landing-stat-number">
        {animate ? count.toLocaleString() : 0}{stat.suffix}
      </div>
      <div className="landing-stat-label">{stat.label}</div>
    </div>
  )
}

export default function Landing() {
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content animate-fade-in-up">
          <div className="hero-badge">🚀 Built for Social Impact</div>
          <h1 className="hero-title">
            Coordinating Aid<br />
            <span style={{ color: 'var(--accent-primary)' }}>Intelligently & Instantly</span>
          </h1>
          <p className="hero-subtitle">
            Sahayak AI centralizes scattered community data, auto-prioritizes urgent needs,
            and matches the right volunteer to every task in real-time — so your NGO can
            save more lives with less chaos.
          </p>
          <div className="hero-cta-row">
            <Link to="/login" className="btn btn-primary btn-lg">
              Get Started Free →
            </Link>
            <Link to="/map" className="btn btn-secondary btn-lg">
              🗺️ View Live Map
            </Link>
          </div>
          <div className="hero-problem-strip">
            <span className="problem-tag">❌ Paper Reports</span>
            <span className="arrow">→</span>
            <span className="problem-tag">❌ WhatsApp Groups</span>
            <span className="arrow">→</span>
            <span className="problem-tag solved">✅ Sahayak AI</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section" ref={statsRef}>
        <div className="container">
          <div className="section-label">📈 IMPACT SO FAR</div>
          <h2 className="section-title">Real Numbers, Real Impact</h2>
          <div className="landing-stats-grid stagger">
            {STATS.map(s => <StatCard key={s.label} stat={s} animate={statsVisible} />)}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="section-label">🧠 CAPABILITIES</div>
          <h2 className="section-title">Everything your NGO needs</h2>
          <p className="section-subtitle">
            One platform. Three roles. Zero chaos.
          </p>
          <div className="features-grid stagger">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon-wrap" style={{ background: f.color + '22', color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="roles-section">
        <div className="container">
          <div className="section-label">👥 USER ROLES</div>
          <h2 className="section-title">Built for every stakeholder</h2>
          <div className="roles-grid stagger">
            {ROLES.map(r => (
              <div key={r.role} className="role-card">
                <div className="role-icon" style={{ background: r.color + '22', color: r.color }}>
                  {r.icon}
                </div>
                <h3 className="role-title">{r.role}</h3>
                <p className="role-desc">{r.desc}</p>
                <div className="role-cred-box">
                  <div className="cred-label">Demo credentials</div>
                  <div className="cred-row"><span>📧</span> {r.cred.email}</div>
                  <div className="cred-row"><span>🔑</span> {r.cred.pass}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Priority Logic */}
      <section className="logic-section">
        <div className="container">
          <div className="logic-card">
            <div className="logic-content" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
              <div className="section-label">⚡ PRIORITY ENGINE</div>
              <h2 className="section-title">Smart scoring, not guesswork</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                Every submitted case is instantly scored using a transparent rule-based formula:
              </p>
              <div className="formula-box">
                <code>priority_score = (people_score × 0.4) + (urgency × 0.4) + (problem_weight × 0.2)</code>
              </div>
              <div className="priority-levels" style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginTop: 24 }}>
                <div className="p-level">
                  <span className="badge badge-high" style={{ marginBottom: 8, display: 'inline-block' }}>🔴 High</span>
                  <div className="text-sm text-secondary">Score ≥ 4.0</div>
                </div>
                <div className="p-level">
                  <span className="badge badge-medium" style={{ marginBottom: 8, display: 'inline-block' }}>🟡 Medium</span>
                  <div className="text-sm text-secondary">Score 2.5–3.9</div>
                </div>
                <div className="p-level">
                  <span className="badge badge-low" style={{ marginBottom: 8, display: 'inline-block' }}>🟢 Low</span>
                  <div className="text-sm text-secondary">Score &lt; 2.5</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to transform your NGO's operations?</h2>
            <p>Join hundreds of field workers and volunteers already using Sahayak AI</p>
            <div className="hero-cta-row" style={{ justifyContent: 'center', marginTop: 32 }}>
              <Link to="/login" className="btn btn-primary btn-lg">
                🚀 Start for Free
              </Link>
              <Link to="/map" className="btn btn-secondary btn-lg">
                🗺️ Explore Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-inner">
            <div className="navbar-logo">
              <span className="logo-icon">🤝</span>
              <span className="logo-text">Sahayak <span style={{ color: 'var(--accent-primary)' }}>AI</span></span>
            </div>
            <p className="footer-tagline">Smart Resource Allocation for NGOs</p>
            <p className="footer-copy">© 2024 Sahayak AI. Built with ❤️ for social impact.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
