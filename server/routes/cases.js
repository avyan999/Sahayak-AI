const express = require('express')
const db = require('../db')
const { authMiddleware } = require('../middleware/auth')
const { calculatePriority } = require('../utils/priority')

const router = express.Router()
let broadcast = null
const setBroadcast = (fn) => { broadcast = fn }

// POST /api/report – Create new case
router.post('/report', authMiddleware, (req, res) => {
  const { location, lat, lng, problem_type, people_affected, urgency, description, image_url } = req.body
  if (!location || !problem_type) return res.status(400).json({ error: 'Location and problem type required' })

  const { score, level } = calculatePriority(people_affected || 1, urgency || 3, problem_type)

  const result = db.prepare(`
    INSERT INTO cases (location,lat,lng,problem_type,people_affected,urgency,description,image_url,priority,priority_score,reported_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    location, lat || null, lng || null, problem_type,
    Number(people_affected) || 1, Number(urgency) || 3,
    description || '', image_url || '', level, score, req.user.id
  )

  const newCase = db.prepare(`
    SELECT c.*, u.name as reporter_name
    FROM cases c LEFT JOIN users u ON c.reported_by = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid)

  // Real-time broadcast
  if (broadcast) broadcast({ type: 'new_case', case: newCase })

  res.json(newCase)
})

// GET /api/cases – Fetch all cases with optional filters
router.get('/cases', authMiddleware, (req, res) => {
  const { priority, status, location } = req.query
  let query = `
    SELECT c.*,
      u.name as reporter_name,
      vol.name as assigned_volunteer_name
    FROM cases c
    LEFT JOIN users u ON c.reported_by = u.id
    LEFT JOIN users vol ON c.assigned_volunteer = vol.id
  `
  const conditions = []
  const params = []

  if (priority) { conditions.push('c.priority = ?'); params.push(priority) }
  if (status) { conditions.push('c.status = ?'); params.push(status) }
  if (location) { conditions.push('c.location LIKE ?'); params.push(`%${location}%`) }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY c.priority_score DESC, c.created_at DESC'

  const cases = db.prepare(query).all(...params)
  res.json(cases)
})

// POST /api/complete – Mark task as completed
router.post('/complete', authMiddleware, (req, res) => {
  const { case_id } = req.body
  if (!case_id) return res.status(400).json({ error: 'case_id required' })

  db.prepare('UPDATE cases SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run('completed', case_id)
  db.prepare('UPDATE assignments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE case_id=?').run('completed', case_id)

  const updated = db.prepare(`
    SELECT c.*, vol.name as assigned_volunteer_name FROM cases c
    LEFT JOIN users vol ON c.assigned_volunteer = vol.id WHERE c.id = ?
  `).get(case_id)

  if (broadcast) broadcast({ type: 'case_update', case: updated })
  res.json({ success: true, case: updated })
})

// GET /api/stats
router.get('/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM cases').get().c
  const pending = db.prepare("SELECT COUNT(*) as c FROM cases WHERE status='pending'").get().c
  const inprogress = db.prepare("SELECT COUNT(*) as c FROM cases WHERE status='in_progress'").get().c
  const completed = db.prepare("SELECT COUNT(*) as c FROM cases WHERE status='completed'").get().c
  res.json({ total, pending, inprogress, completed })
})

module.exports = { router, setBroadcast }
