import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where } from 'firebase/firestore'
import { ref, onValue, update } from 'firebase/database'
import { db } from '../firebase'
import { formDb } from '../formFirebase'
import { DUMMY_REALTIME_CASES } from '../utils/dummyData'
import './AdminPanel.css'
import './Dashboard.css' // Reuse tab styles

const PROBLEM_ICONS = {
  food: '🍽️', medical: '🚑', disaster: '🌊', shelter: '🏠',
  water: '💧', education: '📚', other: '📌',
}

export default function AdminPanel() {
  const { user } = useAuth()
  const [cases, setCases] = useState([])
  const [realtimeCases, setRealtimeCases] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, inprogress: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ priority: 'all', status: 'all', search: '' })
  const [assignModal, setAssignModal] = useState(null)
  const [selectedVol, setSelectedVol] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [sort, setSort] = useState({ col: 'priority', dir: 'asc' })
  const [activeTab, setActiveTab] = useState('web')

  useEffect(() => {
    // 1. Firestore Cases
    const qCases = query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
    const unsubCases = onSnapshot(qCases, (snapshot) => {
      const casesData = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        source: d.data().source || 'web',
        _dbInstance: 'firestore'
      }))
      setCases(casesData)
    })

    // 2. Realtime Database Cases
    const issueRef = ref(formDb, 'issue')
    const unsubRealtime = onValue(issueRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]) => ({
        id,
        ...val,
        _dbInstance: 'form',
        source: (val.source || 'form').toLowerCase(),
        status: (val.status || 'pending').toLowerCase(),
        priority: (val.priority || 'medium').toLowerCase()
      })) : [];
      setRealtimeCases([...list, ...DUMMY_REALTIME_CASES])
    }, (err) => {
      console.error("Admin RTDB Error:", err);
      setRealtimeCases(DUMMY_REALTIME_CASES)
    })

    const qVols = query(collection(db, 'users'), where('role', '==', 'volunteer'))
    const unsubVols = onSnapshot(qVols, (snapshot) => {
      setVolunteers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return () => { 
      unsubCases(); 
      unsubRealtime();
      unsubVols(); 
    }
  }, [])

  useEffect(() => {
    const allCases = [...cases, ...realtimeCases]
    const newStats = { total: allCases.length, pending: 0, inprogress: 0, completed: 0 }
    allCases.forEach(c => {
      const status = (c.status || '').toLowerCase()
      const normalizedStatus = status === 'in_progress' ? 'inprogress' : status
      if (normalizedStatus === 'pending') newStats.pending++
      if (normalizedStatus === 'inprogress') newStats.inprogress++
      if (normalizedStatus === 'completed') newStats.completed++
    })
    setStats(newStats)
  }, [cases, realtimeCases])

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

  const allCases = [...cases, ...realtimeCases]

  const filtered = allCases
    .filter(c => {
      const cPriority = (c.priority || '').toLowerCase()
      const cStatus = (c.status || '').toLowerCase()
      const normalizedStatus = cStatus === 'in_progress' ? 'inprogress' : cStatus

      if (filter.priority !== 'all' && cPriority !== filter.priority) return false
      if (filter.status !== 'all' && normalizedStatus !== filter.status) return false
      const q = filter.search.toLowerCase()
      if (q && !c.location?.toLowerCase().includes(q) && !c.problem_type?.toLowerCase().includes(q)) return false
      return true
    })
    .sort((a, b) => {
      if (sort.col === 'priority') {
        const diff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
        return sort.dir === 'asc' ? diff : -diff
      }
      if (sort.col === 'people') {
        const diff = (a.people_affected || 0) - (b.people_affected || 0)
        return sort.dir === 'asc' ? diff : -diff
      }
      if (sort.col === 'score') {
        return sort.dir === 'asc' ? (a.priorityScore || 0) - (b.priorityScore || 0) : (b.priorityScore || 0) - (a.priorityScore || 0)
      }
      return 0
    })

  const webCases = filtered.filter(c => (c.source || 'web') === 'web')
  const formCases = filtered.filter(c => c.source === 'form')
  const whatsappCases = filtered.filter(c => c.source === 'whatsapp')

  const handleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  const assign = async () => {
    if (!selectedVol || !assignModal) return
    setActionLoading(true)
    try {
      const vol = volunteers.find(v => v.id === selectedVol)
      const data = {
        status: 'in_progress',
        assignedTo: selectedVol,
        assignedVolunteerName: vol?.name || 'Unknown'
      }

      if (assignModal._dbInstance === 'form') {
        await update(ref(formDb, `issue/${assignModal.id}`), data)
      } else {
        await updateDoc(doc(db, 'cases', assignModal.id), data)
      }
      
      setAssignModal(null)
      setSelectedVol('')
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const markComplete = async (c) => {
    try {
      const data = { status: 'completed' }
      if (c._dbInstance === 'form') {
        await update(ref(formDb, `issue/${c.id}`), data)
      } else {
        await updateDoc(doc(db, 'cases', c.id), data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="page-wrapper loading-screen"><div className="spinner" /></div>

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">⚙️ Admin Panel</h1>
            <p className="page-subtitle">Full system oversight — manage all cases and volunteers</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid stagger" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Cases', value: stats.total, icon: '📋', color: 'var(--accent-primary)' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: 'var(--priority-medium)' },
            { label: 'In Progress', value: stats.inprogress, icon: '⚡', color: 'var(--accent-secondary)' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: 'var(--priority-low)' },
            { label: 'Active Volunteers', value: volunteers.length, icon: '🙋', color: '#a855f7' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Volunteers section */}
        <div className="admin-section" style={{ marginBottom: 24 }}>
          <h2 className="admin-section-title">🙋 Volunteer Roster</h2>
          <div className="vol-roster">
            {volunteers.map(v => (
              <div key={v.id} className="vol-chip">
                <span className="vol-chip-avatar">{v.name?.charAt(0) || '?'}</span>
                <div>
                  <div className="vol-chip-name">{v.name}</div>
                  <div className="vol-chip-loc">{v.location}</div>
                  {v.skills && <div className="vol-chip-skills">{Array.isArray(v.skills) ? v.skills.join(', ') : v.skills}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            style={{ width: 220, padding: '8px 14px' }}
            placeholder="🔍 Search…"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
          {['all', 'high', 'medium', 'low'].map(p => (
            <button key={p} className={`filter-chip ${filter.priority === p ? 'active' : ''}`}
              onClick={() => setFilter(f => ({ ...f, priority: p }))}>
              {p === 'all' ? 'All' : p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Med' : '🟢 Low'}
            </button>
          ))}
          {['all', 'pending', 'inprogress', 'completed'].map(s => (
            <button key={s} className={`filter-chip ${filter.status === s ? 'active' : ''}`}
              onClick={() => setFilter(f => ({ ...f, status: s }))}>
              {s === 'all' ? 'All Status' : s === 'pending' ? 'Pending' : s === 'inprogress' ? 'Active' : 'Done'}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="source-tabs">
          <button className={`tab-btn ${activeTab === 'web' ? 'active' : ''}`} onClick={() => setActiveTab('web')}>
            🌐 Web Issues <span className="tab-count">{webCases.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>
            📝 Google Form <span className="tab-count">{formCases.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            💬 WhatsApp Bot <span className="tab-count">{whatsappCases.length}</span>
          </button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Location</th>
                <th className="sortable" onClick={() => handleSort('priority')}>
                  Priority {sort.col === 'priority' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th className="sortable" onClick={() => handleSort('people')}>
                  Affected {sort.col === 'people' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th className="sortable" onClick={() => handleSort('score')}>
                  Score {sort.col === 'score' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>Status</th>
                <th>Volunteer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'web' ? webCases : activeTab === 'form' ? formCases : whatsappCases).map(c => (
                <tr key={c.id}>
                  <td>
                    <span>{PROBLEM_ICONS[c.problem_type] || '📌'} {c.problem_type}</span>
                  </td>
                  <td>📍 {c.location}</td>
                  <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                  <td>👥 {c.people_affected || 0}</td>
                  <td>
                    <span className="score-chip">{c.priorityScore || 0}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>
                      {c.status === 'in_progress' ? 'Active' : c.status}
                    </span>
                  </td>
                  <td>
                    {c.assignedVolunteerName
                      ? <span className="vol-assigned">{c.assignedVolunteerName}</span>
                      : <span className="text-muted text-xs">—</span>
                    }
                  </td>
                  <td>
                    <div className="flex gap-8">
                      {c.status !== 'completed' && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setAssignModal(c); setSelectedVol('') }}>
                            👤 Assign
                          </button>
                          <button className="btn btn-success btn-sm" onClick={() => markComplete(c)}>
                            ✅
                          </button>
                        </>
                      )}
                      {c.status === 'completed' && <span className="text-xs" style={{ color: 'var(--priority-low)' }}>✅ Done</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(activeTab === 'web' ? webCases : activeTab === 'form' ? formCases : whatsappCases).length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No cases match filters.</div>
          )}
        </div>

        {/* Assign Modal */}
        {assignModal && (
          <div className="modal-overlay" onClick={() => setAssignModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🙋 Assign Volunteer</h3>
                <button className="modal-close" onClick={() => setAssignModal(null)}>×</button>
              </div>
              <p className="text-secondary" style={{ marginBottom: 20 }}>
                Assigning to: <strong>{PROBLEM_ICONS[assignModal.problem_type]} {assignModal.problem_type}</strong> case at <strong>{assignModal.location}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Select Volunteer</label>
                <select className="form-select" value={selectedVol} onChange={e => setSelectedVol(e.target.value)}>
                  <option value="">Choose a volunteer…</option>
                  {volunteers.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.location} {v.skills ? `(${Array.isArray(v.skills) ? v.skills.join(', ') : v.skills})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-12" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={assign} disabled={!selectedVol || actionLoading}>
                  {actionLoading ? <span className="spinner" /> : '✅ Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
