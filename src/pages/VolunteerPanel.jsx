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
            <div key={s.label} className="stat-card glass-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-number" style={{ color: s.color, WebkitTextFillColor: s.color }}>{s.value}</div>
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
          <div className="empty-state glass-card">
            <div className="empty-icon">🎉</div>
            <h3>{filter === 'all' ? 'No tasks assigned yet' : `No ${filter} tasks`}</h3>
            <p className="text-muted">Check back when an admin assigns cases to you.</p>
          </div>
        ) : (
          <div className="vol-tasks-grid stagger">
            {filtered.map(a => (
              <div key={a.id} className={`task-card glass-card task-${getStatus(a)}`}>
                <div className="task-card-top">
                  <div className="task-icon">{PROBLEM_ICONS[a.problem_type] || '📌'}</div>
                  <div className="flex gap-8">
                    <span className={`badge badge-${a.priority}`}>{a.priority}</span>
                    <span className={`badge ${
                      getStatus(a) === 'completed' ? 'badge-completed' :
                      getStatus(a) === 'accepted' ? 'badge-inprogress' :
                      getStatus(a) === 'rejected' ? 'badge-high' : 'badge-pending'
                    }`}>
                      {getStatus(a) === 'accepted' ? 'active' : getStatus(a)}
                    </span>
                  </div>
                </div>

                <h3 className="task-title">
                  {a.problem_type?.charAt(0).toUpperCase() + a.problem_type?.slice(1)} Issue
                </h3>
                <p className="task-desc">{a.description || 'No description.'}</p>

                <div className="task-meta">
                  <span>📍 {a.location}</span>
                  <span>👥 {a.people_affected} people</span>
                  <span>⚡ {a.urgency}/5 urgency</span>
                </div>

                <div className="task-assigned-date">
                  Assigned: {a.createdAt ? new Date(a.createdAt.toMillis()).toLocaleDateString() : ''}
                </div>

                {/* Action buttons */}
                {getStatus(a) === 'pending' && (
                  <div className="task-actions">
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
                  </div>
                )}

                {getStatus(a) === 'accepted' && (
                  <div className="task-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAction(a.id, 'complete')}
                      disabled={!!actionLoading[a.id]}
                    >
                      {actionLoading[a.id] === 'complete' ? <span className="spinner" /> : '🏁 Mark Complete'}
                    </button>
                  </div>
                )}

                {getStatus(a) === 'completed' && (
                  <div className="task-completed-banner">
                    🎉 Task completed! Great work.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
