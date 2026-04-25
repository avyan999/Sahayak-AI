const express = require('express')
const db = require('../db')
const { authMiddleware } = require('../middleware/auth')
const { matchVolunteers } = require('../utils/matching')

const router = express.Router()
let broadcast = null
const setBroadcast = (fn) => { broadcast = fn }

// GET /api/volunteers
router.get('/volunteers', authMiddleware, (req, res) => {
  const volunteers = db.prepare(
    "SELECT id,name,email,skills,location,lat,lng FROM users WHERE role='volunteer'"
  ).all()
  res.json(volunteers)
})

// POST /api/assign – Assign volunteer to case
router.post('/assign', authMiddleware, (req, res) => {
  let { case_id, volunteer_id } = req.body
  if (!case_id || !volunteer_id) return res.status(400).json({ error: 'case_id and volunteer_id required' })
  case_id = parseInt(case_id, 10)
  volunteer_id = parseInt(volunteer_id, 10)

  // Deactivate existing pending/accepted assignments for this case
  db.prepare("UPDATE assignments SET status='rejected' WHERE case_id=? AND status IN ('pending','accepted')").run(case_id)

  // Create new assignment
  const result = db.prepare(
    'INSERT INTO assignments (case_id, volunteer_id, status) VALUES (?,?,?)'
  ).run(case_id, volunteer_id, 'pending')

  // Update case status and assigned_volunteer
  db.prepare("UPDATE cases SET assigned_volunteer=?, status='in_progress', updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(volunteer_id, case_id)

  const assignment = db.prepare(`
    SELECT a.*, c.location, c.problem_type, c.priority, c.people_affected, c.urgency, c.description,
           u.name as volunteer_name
    FROM assignments a
    JOIN cases c ON a.case_id = c.id
    JOIN users u ON a.volunteer_id = u.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid)

  if (broadcast) broadcast({ type: 'assignment_update', assignment })
  res.json({ success: true, assignment })
})

// POST /api/accept – Volunteer accepts assignment
router.post('/accept', authMiddleware, (req, res) => {
  const { assignment_id } = req.body
  db.prepare("UPDATE assignments SET status='accepted', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(assignment_id)
  if (broadcast) broadcast({ type: 'assignment_update', assignment_id })
  res.json({ success: true })
})

// POST /api/reject – Volunteer rejects assignment
router.post('/reject', authMiddleware, (req, res) => {
  const { assignment_id } = req.body
  db.prepare("UPDATE assignments SET status='rejected', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(assignment_id)
  // Revert case to pending
  const a = db.prepare('SELECT case_id FROM assignments WHERE id=?').get(assignment_id)
  if (a) db.prepare("UPDATE cases SET status='pending', assigned_volunteer=NULL WHERE id=?").run(a.case_id)
  if (broadcast) broadcast({ type: 'assignment_update', assignment_id })
  res.json({ success: true })
})

// POST /api/assignment/complete (assignment) – Volunteer marks complete
router.post('/assignment/complete', authMiddleware, (req, res) => {
  const { assignment_id, case_id } = req.body
  if (assignment_id) {
    db.prepare("UPDATE assignments SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(assignment_id)
    const a = db.prepare('SELECT case_id FROM assignments WHERE id=?').get(assignment_id)
    if (a) db.prepare("UPDATE cases SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(a.case_id)
  }
  if (case_id) {
    db.prepare("UPDATE cases SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(case_id)
    db.prepare("UPDATE assignments SET status='completed' WHERE case_id=?").run(case_id)
  }
  if (broadcast) broadcast({ type: 'case_update' })
  res.json({ success: true })
})

// GET /api/assignments/:userId
router.get('/assignments/:userId', authMiddleware, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.id, a.status as assignment_status, a.assigned_at, a.updated_at,
           c.id as case_id, c.location, c.problem_type, c.priority, c.priority_score,
           c.people_affected, c.urgency, c.description, c.status as case_status
    FROM assignments a
    JOIN cases c ON a.case_id = c.id
    WHERE a.volunteer_id = ?
    ORDER BY
      CASE a.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
      a.assigned_at DESC
  `).all(req.params.userId)
  res.json(assignments)
})

// GET /api/match/:caseId – Get best matched volunteers
router.get('/match/:caseId', authMiddleware, (req, res) => {
  const caseData = db.prepare('SELECT * FROM cases WHERE id=?').get(req.params.caseId)
  if (!caseData) return res.status(404).json({ error: 'Case not found' })
  const volunteers = db.prepare("SELECT * FROM users WHERE role='volunteer'").all()
  const ranked = matchVolunteers(caseData, volunteers)
  res.json(ranked)
})

module.exports = { router, setBroadcast }
