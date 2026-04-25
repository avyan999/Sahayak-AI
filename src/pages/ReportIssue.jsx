import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import './ReportIssue.css'

const PROBLEM_TYPES = [
  { value: 'food', label: '🍽️ Food Shortage', weight: 3 },
  { value: 'medical', label: '🚑 Medical Emergency', weight: 4 },
  { value: 'disaster', label: '🌊 Disaster Relief', weight: 5 },
  { value: 'shelter', label: '🏠 Shelter Needed', weight: 3 },
  { value: 'water', label: '💧 Water Supply', weight: 3 },
  { value: 'education', label: '📚 Education', weight: 1 },
  { value: 'other', label: '📌 Other', weight: 1 },
]

const PROBLEM_WEIGHTS = { disaster: 5, medical: 4, food: 3, shelter: 3, water: 3, education: 1, other: 1 }

function calcPriority(people, urgency, type) {
  const score = (people * 2) + Number(urgency) + (PROBLEM_WEIGHTS[type] || 1)
  if (score >= 15) return { score, level: 'high' }
  if (score >= 8) return { score, level: 'medium' }
  return { score, level: 'low' }
}

export default function ReportIssue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    location: '',
    lat: '',
    lng: '',
    problem_type: 'food',
    people_affected: 10,
    urgency: 3,
    description: '',
    image_url: '',
  })

  const preview = calcPriority(Number(form.people_affected) || 0, form.urgency, form.problem_type)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const getLocation = () => {
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        // Reverse geocode using nominatim (free)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          const loc = data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          setForm(f => ({ ...f, location: loc, lat: String(lat), lng: String(lng) }))
        } catch {
          setForm(f => ({ ...f, location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat: String(lat), lng: String(lng) }))
        }
        setGeoLoading(false)
      },
      () => setGeoLoading(false)
    )
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target.result)
      setForm(f => ({ ...f, image_url: ev.target.result.substring(0, 200) }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const caseData = {
        ...form,
        priorityScore: preview.score,
        priority: preview.level,
        status: 'pending',
        createdBy: user?.uid || 'anonymous',
        createdAt: serverTimestamp(),
      }
      
      await addDoc(collection(db, 'cases'), caseData)
      
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      console.error(err)
      alert('Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="page-wrapper">
      <div className="success-screen">
        <div className="success-icon animate-float">✅</div>
        <h2>Report Submitted!</h2>
        <p className="text-secondary">Your case has been logged with <strong style={{ color: `var(--priority-${preview.level})` }}>{preview.level.toUpperCase()}</strong> priority (Score: {preview.score})</p>
        <p className="text-muted" style={{ marginTop: 8, fontSize: '0.875rem' }}>Redirecting to dashboard…</p>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="page-content" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">📝 Report an Issue</h1>
            <p className="page-subtitle">Document community needs for immediate action</p>
          </div>
          {/* Live priority preview */}
          <div className={`priority-preview badge-${preview.level}`} style={{ padding: '12px 20px', borderRadius: 'var(--radius-lg)' }}>
            <div className="preview-score-label">Live Priority</div>
            <div className="preview-score-val">
              {preview.level === 'high' ? '🔴' : preview.level === 'medium' ? '🟡' : '🟢'} {preview.level.toUpperCase()}
            </div>
            <div className="preview-score-num">Score: {preview.score}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="report-grid">
            {/* Location */}
            <div className="report-card glass-card">
              <h3 className="report-section-title">📍 Location</h3>
              <div className="form-group">
                <label className="form-label">Location Name / Address</label>
                <div className="location-row">
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    placeholder="e.g. Dharavi, Mumbai"
                    value={form.location}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="btn btn-secondary btn-sm geo-btn" onClick={getLocation} disabled={geoLoading}>
                    {geoLoading ? <span className="spinner" /> : '📡 Auto'}
                  </button>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Latitude (optional)</label>
                  <input type="text" name="lat" className="form-input" placeholder="e.g. 19.0760" value={form.lat} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude (optional)</label>
                  <input type="text" name="lng" className="form-input" placeholder="e.g. 72.8777" value={form.lng} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Problem Details */}
            <div className="report-card glass-card">
              <h3 className="report-section-title">⚠️ Problem Details</h3>
              <div className="form-group">
                <label className="form-label">Problem Type</label>
                <div className="problem-types-grid">
                  {PROBLEM_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      type="button"
                      className={`problem-type-btn ${form.problem_type === pt.value ? 'selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, problem_type: pt.value }))}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">People Affected</label>
                  <input
                    type="number"
                    name="people_affected"
                    className="form-input"
                    min="1"
                    value={form.people_affected}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency Level: <strong style={{ color: 'var(--accent-primary)' }}>{form.urgency}/5</strong></label>
                  <input
                    type="range"
                    name="urgency"
                    className="urgency-slider"
                    min="1"
                    max="5"
                    value={form.urgency}
                    onChange={handleChange}
                  />
                  <div className="urgency-labels">
                    <span>Low</span><span>Medium</span><span>Critical</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description + Image */}
            <div className="report-card glass-card">
              <h3 className="report-section-title">📄 Additional Details</h3>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  placeholder="Describe the situation in detail…"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Upload Image (optional)</label>
                <div className="image-upload-area" onClick={() => document.getElementById('imgInput').click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="image-preview" />
                  ) : (
                    <>
                      <div className="upload-icon">📷</div>
                      <div className="upload-text">Click to upload image</div>
                      <div className="upload-hint">PNG, JPG up to 5MB</div>
                    </>
                  )}
                </div>
                <input id="imgInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
              </div>
            </div>
          </div>

          {/* Priority breakdown */}
          <div className={`priority-breakdown glass-card badge-${preview.level}`}>
            <div className="breakdown-title">📊 Priority Calculation</div>
            <div className="breakdown-items">
              <div className="breakdown-item">
                <span>People × 2</span>
                <span className="breakdown-val">+{Number(form.people_affected || 0) * 2}</span>
              </div>
              <div className="breakdown-item">
                <span>Urgency</span>
                <span className="breakdown-val">+{form.urgency}</span>
              </div>
              <div className="breakdown-item">
                <span>Problem Weight ({form.problem_type})</span>
                <span className="breakdown-val">+{PROBLEM_WEIGHTS[form.problem_type] || 1}</span>
              </div>
              <div className="breakdown-divider" />
              <div className="breakdown-item total">
                <span>Total Score → <strong>{preview.level.toUpperCase()}</strong></span>
                <span className="breakdown-total">{preview.score}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : '🚀 Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


