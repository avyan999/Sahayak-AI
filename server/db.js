const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'sahayak.db')
const db = new Database(DB_PATH)

// Enable WAL mode for performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Create Tables ──────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','volunteer','fieldworker')),
    skills TEXT,
    location TEXT,
    lat REAL,
    lng REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    problem_type TEXT NOT NULL,
    people_affected INTEGER DEFAULT 1,
    urgency INTEGER DEFAULT 3,
    description TEXT,
    image_url TEXT,
    priority TEXT DEFAULT 'low',
    priority_score REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    reported_by INTEGER,
    assigned_volunteer INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (assigned_volunteer) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','completed')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (volunteer_id) REFERENCES users(id)
  );
`)

// ── Seed Data ──────────────────────────────────
function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c
  if (count > 0) return // Already seeded

  const hash = (pw) => bcrypt.hashSync(pw, 10)

  // Users
  const insertUser = db.prepare('INSERT INTO users (name,email,password,role,skills,location,lat,lng) VALUES (?,?,?,?,?,?,?,?)')

  const users = [
    ['Admin Rajan',  'admin@sahayak.org',  hash('admin123'), 'admin',       null,                           'Mumbai',         19.076, 72.877],
    ['Priya Sharma', 'vol1@sahayak.org',   hash('vol123'),   'volunteer',   'Medical Aid,Food Distribution','Mumbai',         19.040, 72.856],
    ['Arjun Mehta',  'vol2@sahayak.org',   hash('vol123'),   'volunteer',   'Disaster Relief,Shelter Setup','Delhi',          28.613, 77.209],
    ['Kavita Nair',  'vol3@sahayak.org',   hash('vol123'),   'volunteer',   'Water Supply,Logistics',       'Bangalore',      12.971, 77.594],
    ['Rahul Gupta',  'field1@sahayak.org', hash('field123'), 'fieldworker', null,                           'Dharavi, Mumbai',19.042, 72.854],
    ['Sunita Devi',  'field2@sahayak.org', hash('field123'), 'fieldworker', null,                           'Delhi',          28.620, 77.215],
  ]
  users.forEach(u => insertUser.run(...u))

  // Cases — seed with proper priority scores
  const insertCase = db.prepare(`
    INSERT INTO cases (location,lat,lng,problem_type,people_affected,urgency,description,priority,priority_score,status,reported_by,assigned_volunteer)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `)

  const casesData = [
    // [location, lat, lng, type, people, urgency, desc, priority, score, status, reported_by, assigned_volunteer]
    ['Dharavi, Mumbai',        19.042, 72.854, 'medical',   120, 5, 'Severe outbreak of waterborne disease. Multiple patients need immediate medical attention.',  'high',   249, 'in_progress', 5, 2],
    ['Kurla East, Mumbai',     19.070, 72.879, 'food',       45, 4, 'Flood displaced families have no food supply for 2 days.',                                   'high',    97, 'pending',     5, null],
    ['Andheri West, Mumbai',   19.136, 72.826, 'shelter',    30, 3, 'Collapsed building. Families need temporary shelter urgently.',                               'medium',  66, 'pending',     5, null],
    ['Yamuna Flood Plains, Delhi',28.660,77.228,'disaster', 200, 5, 'Flash flood. Over 200 people stranded. Need boats and rescue teams.',                        'high',   410, 'in_progress', 6, 3],
    ['Begur, Bangalore',       12.866, 77.647, 'water',      15, 2, 'Water supply contaminated in 3 apartments. Children at risk.',                               'low',     35, 'completed',   5, 4],
    ['Bandra Slums, Mumbai',   19.054, 72.839, 'education',  50, 2, 'Flood damaged school. 50 children without study material.',                                  'low',    103, 'pending',     6, null],
  ]
  casesData.forEach(c => insertCase.run(...c))

  // Assignments
  db.prepare('INSERT INTO assignments (case_id,volunteer_id,status) VALUES (?,?,?)').run(1, 2, 'accepted')
  db.prepare('INSERT INTO assignments (case_id,volunteer_id,status) VALUES (?,?,?)').run(4, 3, 'accepted')
  db.prepare('INSERT INTO assignments (case_id,volunteer_id,status) VALUES (?,?,?)').run(5, 4, 'completed')

  console.log('✅ Database seeded with demo data')
}

try {
  seed()
} catch (e) {
  console.log('Seed note:', e.message)
}

module.exports = db
