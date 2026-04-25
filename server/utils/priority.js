const PROBLEM_WEIGHTS = {
  disaster: 5,
  medical: 4,
  food: 3,
  shelter: 3,
  water: 3,
  education: 1,
  other: 1,
}

function calculatePriority(people, urgency, problemType) {
  const weight = PROBLEM_WEIGHTS[problemType] ?? 1
  const score = (Number(people) * 2) + Number(urgency) + weight

  let level
  if (score >= 15) level = 'high'
  else if (score >= 8) level = 'medium'
  else level = 'low'

  return { score, level }
}

module.exports = { calculatePriority, PROBLEM_WEIGHTS }
