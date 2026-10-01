const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('DB Error:', err.message);
  else console.log('Connected to SQLite database.');
});

// Create tables and seed data
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    status TEXT,
    gender TEXT,
    class TEXT,
    parent TEXT,
    date_created DATE DEFAULT CURRENT_DATE
  )`);

  // Default admin user
  db.run(`INSERT OR IGNORE INTO users (id, email, password, role) 
          VALUES (1, 'admin@school.com', 'admin123', 'Admin')`);

  // Seed sample students matching slides
  db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare(`INSERT INTO students (name, status, gender, class, parent) VALUES (?, ?, ?, ?, ?)`);
      stmt.run("Esther Ali", "Active", "Female", "Grade 9", "Ali Hassan");
      stmt.run("Rahul Sharma", "Active", "Male", "Grade 10", "Suresh Sharma");
      stmt.run("Kavya Patel", "Pending", "Female", "Grade 8", "Rajesh Patel");
      stmt.finalize();
    }
  });
});

// REST Endpoints
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err || !user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    res.json({ success: true, user: { email: user.email, role: user.role } });
  });
});

app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/students', (req, res) => {
  const { name, status, gender, className, parent } = req.body;
  db.run(`INSERT INTO students (name, status, gender, class, parent) VALUES (?, ?, ?, ?, ?)`,
    [name, status || 'Active', gender, className, parent],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, status, gender, class: className, parent });
    }
  );
});

app.delete('/api/students/:id', (req, res) => {
  db.run(`DELETE FROM students WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));