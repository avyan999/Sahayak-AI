import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, where } from 'firebase/firestore'
import { db } from '../firebase'
import './Dashboard.css'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const PROBLEM_ICONS = {
  food: '🍽️', medical: '🚑', disaster: '🌊', shelter: '🏠',
  water: '💧', education: '📚', other: '📌',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, inprogress: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ priority: 'all', status: 'all', search: '' })
  const [selectedCase, setSelectedCase] = useState(null)
  const [newCaseIds, setNewCaseIds] = useState(new Set())

  useEffect(() => {
    const q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Detect new cases
      if (!loading) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const id = change.doc.id
            setNewCaseIds(prev => new Set([...prev, id]))
            setTimeout(() => {
              setNewCaseIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }, 8000)
          }
        })
      }

      // Calculate stats
      const newStats = { total: casesData.length, pending: 0, inprogress: 0, completed: 0 }
      casesData.forEach(c => {
        if (c.status === 'pending') newStats.pending++
        if (c.status === 'in_progress') newStats.inprogress++
        if (c.status === 'completed') newStats.completed++
      })
      
      setStats(newStats)
      setCases(casesData)
      setLoading(false)
    }, (err) => {
      console.error(err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const filtered = cases
    .filter(c => {
      if (filter.priority !== 'all' && c.priority !== filter.priority) return false
      if (filter.status !== 'all') {
        const normalizedStatus = c.status === 'in_progress' ? 'inprogress' : c.status
        if (normalizedStatus !== filter.status) return false
      }
      if (filter.search && !c.location?.toLowerCase().includes(filter.search.toLowerCase()) &&
          !c.problem_type?.toLowerCase().includes(filter.search.toLowerCase()) &&
          !c.description?.toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))

  const STAT_CARDS = [
    { label: 'Total Cases', value: stats.total, icon: '📋', color: 'var(--accent-primary)' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: 'var(--priority-medium)' },
    { label: 'In Progress', value: stats.inprogress, icon: '⚡', color: 'var(--accent-secondary)' },
    { label: 'Completed', value: stats.completed, icon: '✅', color: 'var(--priority-low)' },
  ]

  if (loading) return (
    <div className="page-wrapper loading-screen">
      <div className="spinner" />
      <p className="text-muted">Loading dashboard…</p>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {user?.role === 'admin' ? '⚙️ Admin Dashboard' :
               user?.role === 'volunteer' ? '🙋 Volunteer Dashboard' : '📋 Field Dashboard'}
            </h1>
            <p className="page-subtitle">Welcome back, {user?.name} · Real-time case tracking</p>
          </div>
          <div className="flex gap-12">
            <Link to="/map" className="btn btn-secondary">🗺️ Map View</Link>
            {(user?.role === 'fieldworker' || user?.role === 'admin') &&
              <Link to="/report" className="btn btn-primary">+ Report Issue</Link>}
          </div>
        </div>

        <div className="stats-grid stagger" style={{ marginBottom: 32 }}>
          {STAT_CARDS.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="filters-bar" style={{ marginBottom: 20 }}>
          <input
            className="form-input"
            style={{ width: 240, padding: '8px 14px' }}
            placeholder="🔍 Search location, type…"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
          <div className="flex gap-8">
            {['all', 'high', 'medium', 'low'].map(p => (
              <button key={p} className={`filter-chip ${filter.priority === p ? 'active' : ''}`}
                onClick={() => setFilter(f => ({ ...f, priority: p }))}>
                {p === 'all' ? 'All Priorities' : p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Medium' : '🟢 Low'}
              </button>
            ))}
          </div>
          <div className="flex gap-8">
            {['all', 'pending', 'inprogress', 'completed'].map(s => (
              <button key={s} className={`filter-chip ${filter.status === s ? 'active' : ''}`}
                onClick={() => setFilter(f => ({ ...f, status: s }))}>
                {s === 'all' ? 'All Status' : s === 'pending' ? 'Pending' : s === 'inprogress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        <div className="cases-header">
          <h2 className="section-heading">Cases ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No cases found</h3>
            <p className="text-muted">Try adjusting your filters or report a new issue.</p>
          </div>
        ) : (
          <div className="table-wrapper stagger">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    style={{ cursor: 'pointer', backgroundColor: newCaseIds.has(c.id) ? 'rgba(26, 115, 232, 0.05)' : '' }}
                  >
                    <td>
                      <div className="flex items-center gap-8">
                        <span>{PROBLEM_ICONS[c.problem_type] || '📌'}</span>
                        <span style={{ fontWeight: 500 }}>{c.problem_type?.charAt(0).toUpperCase() + c.problem_type?.slice(1)}</span>
                        {newCaseIds.has(c.id) && <span className="badge" style={{ background: '#1a73e8', color: 'white', padding: '2px 6px', fontSize: '0.65rem', border: 'none' }}>NEW</span>}
                      </div>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>
                        {c.status === 'in_progress' ? 'In Progress' : c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedCase && (
          <CaseModal case={selectedCase} onClose={() => setSelectedCase(null)} user={user} />
        )}
      </div>
    </div>
  )
}

function CaseModal({ case: c, onClose, user }) {
  const [volunteers, setVolunteers] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [selectedVol, setSelectedVol] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchVols = async () => {
        const q = query(collection(db, 'users'), where('role', '==', 'volunteer'))
        const snap = await getDocs(q)
        setVolunteers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      fetchVols()
    }
  }, [user])

  const assign = async () => {
    if (!selectedVol) return
    setActionLoading(true)
    try {
      const vol = volunteers.find(v => v.id === selectedVol)
      await updateDoc(doc(db, 'cases', c.id), {
        status: 'in_progress',
        assignedTo: selectedVol,
        assignedVolunteerName: vol?.name || 'Unknown'
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const markComplete = async () => {
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'cases', c.id), {
        status: 'completed'
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Case Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="flex gap-8" style={{ marginBottom: 16 }}>
          <span className={`badge badge-${c.priority}`}>{c.priority} priority</span>
          <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>
            {c.status === 'in_progress' ? 'In Progress' : c.status}
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Score: {c.priorityScore}
          </span>
        </div>

        <div className="modal-detail-grid">
          <div className="detail-item"><span className="detail-label">Type</span><span className="detail-val">{PROBLEM_ICONS[c.problem_type]} {c.problem_type}</span></div>
          <div className="detail-item"><span className="detail-label">Location</span><span className="detail-val">📍 {c.location}</span></div>
          <div className="detail-item"><span className="detail-label">Affected</span><span className="detail-val">👥 {c.people_affected} people</span></div>
          <div className="detail-item"><span className="detail-label">Urgency</span><span className="detail-val">⚡ {c.urgency}/5</span></div>
          {c.assignedVolunteerName && <div className="detail-item"><span className="detail-label">Volunteer</span><span className="detail-val">🙋 {c.assignedVolunteerName}</span></div>}
          <div className="detail-item"><span className="detail-label">Reported</span><span className="detail-val">{c.createdAt ? new Date(c.createdAt.toMillis()).toLocaleString() : ''}</span></div>
        </div>

        {c.description && (
          <div style={{ marginTop: 16 }}>
            <div className="detail-label" style={{ marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{c.description}</p>
          </div>
        )}

        {/* Admin actions */}
        {user?.role === 'admin' && c.status !== 'completed' && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assigning ? (
              <div className="flex gap-12">
                <select className="form-select" value={selectedVol} onChange={e => setSelectedVol(e.target.value)}>
                  <option value="">Select volunteer…</option>
                  {volunteers.map(v => <option key={v.id} value={v.id}>{v.name} – {v.location}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={assign} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner" /> : 'Assign'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setAssigning(false)}>Cancel</button>
              </div>
            ) : (
              <div className="flex gap-12">
                <button className="btn btn-primary btn-sm" onClick={() => setAssigning(true)}>🙋 Assign Volunteer</button>
                <button className="btn btn-success btn-sm" onClick={markComplete} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner" /> : '✅ Mark Complete'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
