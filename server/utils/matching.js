function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const SKILL_MATCH = {
  medical: ['Medical Aid', 'Counseling'],
  food: ['Food Distribution', 'Logistics'],
  disaster: ['Disaster Relief', 'Logistics', 'Shelter Setup'],
  shelter: ['Shelter Setup', 'Logistics'],
  water: ['Water Supply', 'Logistics'],
  education: ['Education', 'Counseling'],
  other: [],
}

function matchVolunteers(caseData, volunteers) {
  return volunteers.map(v => {
    const skills = (v.skills || '').split(',').map(s => s.trim())
    const requiredSkills = SKILL_MATCH[caseData.problem_type] || []
    const skillScore = requiredSkills.some(s => skills.includes(s)) ? 20 : 0

    let proximityScore = 0
    if (caseData.lat && caseData.lng && v.lat && v.lng) {
      const dist = haversineDistance(caseData.lat, caseData.lng, v.lat, v.lng)
      if (dist < 10) proximityScore = 30
      else if (dist < 50) proximityScore = 20
      else if (dist < 200) proximityScore = 10
    }

    return { ...v, matchScore: skillScore + proximityScore }
  }).sort((a, b) => b.matchScore - a.matchScore)
}

module.exports = { matchVolunteers, haversineDistance }
