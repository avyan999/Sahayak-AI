import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { collection, query, onSnapshot, where, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import './VolunteerPanel.css'

const PROBLEM_ICONS = {
  food: '🍽️', medical: '🚑', disaster: '🌊', shelter: '🏠',
  water: '💧', education: '📚', other: '📌',
}

export default function VolunteerPanel() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user?.uid) return
    const q = query(collection(db, 'cases'), where('assignedTo', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setAssignments(casesData)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  const handleAction = async (assignmentId, action) => {
    setActionLoading(prev => ({ ...prev, [assignmentId]: action }))
    try {
      const caseRef = doc(db, 'cases', assignmentId)
      if (action === 'accept') {
        await updateDoc(caseRef, { status: 'in_progress' })
      } else if (action === 'reject') {
        await updateDoc(caseRef, { status: 'pending', assignedTo: null, assignedVolunteerName: null })
      } else if (action === 'complete') {
        await updateDoc(caseRef, { status: 'completed' })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(prev => ({ ...prev, [assignmentId]: null }))
    }
  }

  // Derive assignment status from case status for backwards compatibility with UI
  const getStatus = (c) => {
    if (c.status === 'completed') return 'completed'
    if (c.status === 'in_progress') return 'accepted' // using accepted to mean active
    return 'pending' // if assigned but not in progress (although currently assign sets to in_progress immediately, we'll treat in_progress as active)
  }

  const filtered = assignments.filter(a => {
    if (filter === 'all') return true
    return getStatus(a) === filter
  })

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => getStatus(a) === 'pending').length,
    active: assignments.filter(a => getStatus(a) === 'accepted').length,
    completed: assignments.filter(a => getStatus(a) === 'completed').length,
  }

  if (loading) return (
    <div className="page-wrapper loading-screen">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">✅ My Assigned Tasks</h1>
            <p className="page-subtitle">Manage your volunteer assignments and track impact</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid stagger" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Assigned', value: stats.total, icon: '📋', color: 'var(--accent-primary)' },
            { label: 'Active Tasks', value: stats.active, icon: '⚡', color: 'var(--accent-secondary)' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: 'var(--priority-low)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="filters-bar" style={{ marginBottom: 20 }}>
          {['all', 'accepted', 'completed'].map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Tasks' : f === 'accepted' ? 'Active Tasks' : 'Completed'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <h3>{filter === 'all' ? 'No tasks assigned yet' : `No ${filter} tasks`}</h3>
            <p className="text-muted">Check back when an admin assigns cases to you.</p>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-8">
                        <span>{PROBLEM_ICONS[a.problem_type] || '📌'}</span>
                        <span style={{ fontWeight: 500 }}>{a.problem_type?.charAt(0).toUpperCase() + a.problem_type?.slice(1)}</span>
                      </div>
                    </td>
                    <td>{a.location}</td>
                    <td><span className={`badge badge-${a.priority}`}>{a.priority}</span></td>
                    <td>
                      <span className={`badge ${
                        getStatus(a) === 'completed' ? 'badge-completed' :
                        getStatus(a) === 'accepted' ? 'badge-inprogress' :
                        getStatus(a) === 'rejected' ? 'badge-high' : 'badge-pending'
                      }`}>
                        {getStatus(a) === 'accepted' ? 'active' : getStatus(a)}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        {getStatus(a) === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleAction(a.id, 'accept')}
                              disabled={!!actionLoading[a.id]}
                            >
                              {actionLoading[a.id] === 'accept' ? <span className="spinner" /> : '✅ Accept'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleAction(a.id, 'reject')}
                              disabled={!!actionLoading[a.id]}
                            >
                              {actionLoading[a.id] === 'reject' ? <span className="spinner" /> : '❌ Reject'}
                            </button>
                          </>
                        )}
                        {getStatus(a) === 'accepted' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAction(a.id, 'complete')}
                            disabled={!!actionLoading[a.id]}
                          >
                            {actionLoading[a.id] === 'complete' ? <span className="spinner" /> : '🏁 Complete'}
                          </button>
                        )}
                        {getStatus(a) === 'completed' && <span className="text-xs" style={{ color: 'var(--priority-low)' }}>🎉 Done</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
