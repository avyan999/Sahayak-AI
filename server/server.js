const express = require('express')
const cors = require('cors')
const http = require('http')
const WebSocket = require('ws')
const path = require('path')

const app = express()
const server = http.createServer(app)

// ── WebSocket Server ────────────────────────────
const wss = new WebSocket.Server({ server })

function broadcast(data) {
  const msg = JSON.stringify(data)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  })
}

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected. Total:', wss.clients.size)
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Sahayak AI live feed' }))
  ws.on('close', () => console.log('🔌 Client disconnected. Total:', wss.clients.size))
})

// ── Middleware ──────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Routes ──────────────────────────────────────
const authRoutes = require('./routes/auth')
const casesModule = require('./routes/cases')
const volunteersModule = require('./routes/volunteers')

// Pass broadcast function to routes
casesModule.setBroadcast(broadcast)
volunteersModule.setBroadcast(broadcast)

app.use('/api/auth', authRoutes)
app.use('/api', casesModule.router)
app.use('/api', volunteersModule.router)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), clients: wss.clients.size })
})

// ── Start ──────────────────────────────────────
const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║    Sahayak AI Backend               ║
  ║    Running on http://localhost:${PORT}  ║
  ║    WebSocket on ws://localhost:${PORT}  ║
  ╚══════════════════════════════════════╝
  `)
})
