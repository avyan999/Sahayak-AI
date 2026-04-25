const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')
const { JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role, skills, location, lat, lng } = req.body
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are required' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const hashed = bcrypt.hashSync(password, 10)
  const result = db.prepare(
    'INSERT INTO users (name,email,password,role,skills,location,lat,lng) VALUES (?,?,?,?,?,?,?,?)'
  ).run(name, email, hashed, role, skills?.join(',') || '', location || '', lat || null, lng || null)

  const user = { id: result.lastInsertRowid, name, email, role, skills: skills?.join(','), location }
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
  res.json({ user, token })
})

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = bcrypt.compareSync(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, skills: user.skills, location: user.location }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  res.json({ user: payload, token })
})

module.exports = router
