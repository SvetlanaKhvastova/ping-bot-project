require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "bot.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'CLIENT'
  )`);

  const adminIds = process.env.ADMIN_CHAT_IDS?.split(",") || [];
  adminIds.forEach((adminId) => {
    if (adminId.trim()) {
      db.run(`INSERT OR IGNORE INTO users (telegram_id, role) VALUES (?, ?)`, [adminId.trim(), "ADMINISTRATOR"]);
    }
  });
});

module.exports = db;
