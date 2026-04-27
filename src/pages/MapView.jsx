import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { formDb } from '../formFirebase'
import { DUMMY_REALTIME_CASES } from '../utils/dummyData'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

const PROBLEM_ICONS = {
  food: '🍽️', medical: '🚑', disaster: '🌊', shelter: '🏠',
  water: '💧', education: '📚', other: '📌',
}

// Fallback locations for cases without lat/lng (India coords)
const INDIA_CITIES = [
  { lat: 19.076, lng: 72.877 }, // Mumbai
  { lat: 28.613, lng: 77.209 }, // Delhi
  { lat: 12.971, lng: 77.594 }, // Bangalore
  { lat: 22.572, lng: 88.363 }, // Kolkata
  { lat: 17.385, lng: 78.486 }, // Hyderabad
  { lat: 13.083, lng: 80.270 }, // Chennai
  { lat: 23.022, lng: 72.571 }, // Ahmedabad
  { lat: 18.520, lng: 73.856 }, // Pune
]

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 8, { animate: true })
  }, [center, map])
  return null
}

export default function MapView() {
  const [cases, setCases] = useState([])
  const [realtimeCases, setRealtimeCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedCase, setSelectedCase] = useState(null)
  const [mapCenter, setMapCenter] = useState([20.593, 78.962]) // India center

  useEffect(() => {
    // 1. Firestore Cases
    const q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
    const unsubFirestore = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        source: doc.data().source || 'web'
      }))
      setCases(data)
    })

    // 2. Realtime Database Cases
    const issueRef = ref(formDb, 'issue')
    const unsubRealtime = onValue(issueRef, (snapshot) => {
      const data = snapshot.val()
      const list = data ? Object.entries(data).map(([id, val]) => ({
        id,
        ...val,
        source: (val.source || 'form').toLowerCase(),
        priority: (val.priority || 'medium').toLowerCase(),
        status: (val.status || 'pending').toLowerCase()
      })) : [];
      setRealtimeCases([...list, ...DUMMY_REALTIME_CASES])
      setLoading(false)
    }, (err) => {
      console.error("Map RTDB Error:", err);
      setRealtimeCases(DUMMY_REALTIME_CASES)
      setLoading(false)
    })

    return () => {
      unsubFirestore()
      unsubRealtime()
    }
  }, [])

  const allCases = [...cases, ...realtimeCases]

  const filtered = filter === 'all' ? allCases : allCases.filter(c => (c.priority || '').toLowerCase() === filter)

  // Assign fallback coordinates to cases without lat/lng
  const casesWithCoords = filtered.map((c, i) => ({
    ...c,
    _lat: c.lat ? parseFloat(c.lat) : INDIA_CITIES[i % INDIA_CITIES.length].lat + (Math.random() - 0.5) * 2,
    _lng: c.lng ? parseFloat(c.lng) : INDIA_CITIES[i % INDIA_CITIES.length].lng + (Math.random() - 0.5) * 2,
  }))

  const stats = {
    total: allCases.length,
    high: allCases.filter(c => (c.priority || '').toLowerCase() === 'high').length,
    medium: allCases.filter(c => (c.priority || '').toLowerCase() === 'medium').length,
    low: allCases.filter(c => (c.priority || '').toLowerCase() === 'low').length,
  }

  return (
    <div className="map-page page-wrapper">
      {/* Sidebar */}
      <div className="map-sidebar">
        <div className="map-sidebar-header">
          <h2 className="map-title">🗺️ Case Map</h2>
          <p className="text-sm text-muted">Real-time field overview</p>
        </div>

        {/* Stats */}
        <div className="map-stats">
          <div className="map-stat"><span className="ms-dot high" />High <strong>{stats.high}</strong></div>
          <div className="map-stat"><span className="ms-dot medium" />Medium <strong>{stats.medium}</strong></div>
          <div className="map-stat"><span className="ms-dot low" />Low <strong>{stats.low}</strong></div>
        </div>

        {/* Filters */}
        <div className="map-filters">
          {['all', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '🌐 All' : f === 'high' ? '🔴 High' : f === 'medium' ? '🟡 Medium' : '🟢 Low'}
            </button>
          ))}
        </div>

        {/* Case list */}
        <div className="map-case-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div>
          ) : casesWithCoords.length === 0 ? (
            <div className="text-muted text-sm" style={{ padding: 16 }}>No cases to display.</div>
          ) : (
            casesWithCoords.map(c => (
              <div
                key={c.id}
                className={`map-case-item ${selectedCase?.id === c.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedCase(c)
                  setMapCenter([c._lat, c._lng])
                }}
              >
                <div className="mci-top">
                  <span>{PROBLEM_ICONS[c.problem_type]} {c.problem_type}</span>
                  <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                </div>
                <div className="mci-loc">📍 {c.location}</div>
                <div className="mci-meta">
                  <span>👥 {c.people_affected || 0}</span> · 
                  <span>⚡ {c.urgency || 3}/5</span> · 
                  <span className="source-label">{c.source === 'whatsapp' ? '💬' : c.source === 'form' ? '📝' : '🌐'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map */}
      <div className="map-container-wrapper">
        {loading ? (
          <div className="map-loading">
            <div className="spinner" />
            <p>Loading map data…</p>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            className="leaflet-map"
          >
            <MapUpdater center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {casesWithCoords.map(c => (
              <CircleMarker
                key={c.id}
                center={[c._lat, c._lng]}
                radius={Math.max(8, Math.min(30, (c.people_affected || 1) / 5))}
                pathOptions={{
                  color: PRIORITY_COLORS[(c.priority || 'medium').toLowerCase()] || PRIORITY_COLORS.medium,
                  fillColor: PRIORITY_COLORS[(c.priority || 'medium').toLowerCase()] || PRIORITY_COLORS.medium,
                  fillOpacity: 0.7,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedCase(c)
                    setMapCenter([c._lat, c._lng])
                  }
                }}
              >
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <div className="popup-header">
                      <span>{PROBLEM_ICONS[c.problem_type] || '📌'}</span>
                      <strong>{c.problem_type?.charAt(0).toUpperCase() + c.problem_type?.slice(1)}</strong>
                      <span className={`badge badge-${(c.priority || 'medium').toLowerCase()}`}>{c.priority}</span>
                    </div>
                    <div className="popup-row">📍 {c.location}</div>
                    <div className="popup-row">👥 {c.people_affected || 0} people affected</div>
                    <div className="popup-row">⚡ Urgency: {c.urgency || 3}/5</div>
                    <div className="popup-row">📊 Score: {c.priorityScore || 0}</div>
                    <div className="popup-row">🌐 Source: {c.source === 'whatsapp' ? 'WhatsApp Bot' : c.source === 'form' ? 'Google Form' : 'Web Platform'}</div>
                    {c.description && <div className="popup-desc">{c.description}</div>}
                    <div className={`popup-status badge-${(c.status || 'pending').toLowerCase() === 'in_progress' ? 'inprogress' : (c.status || 'pending').toLowerCase()}`}
                      style={{ marginTop: 8, padding: '4px 10px', borderRadius: 'var(--radius-full)', display: 'inline-block', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(c.status || 'pending').toLowerCase() === 'in_progress' ? '⚡ In Progress' : (c.status || 'pending').toLowerCase() === 'completed' ? '✅ Completed' : '⏳ Pending'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Priority Legend</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }} />High Priority</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }} />Medium Priority</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#22c55e' }} />Low Priority</div>
          <div className="legend-note">Circle size = people affected</div>
        </div>
      </div>
    </div>
  )
}

