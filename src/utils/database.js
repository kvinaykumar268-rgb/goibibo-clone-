const fs = require("fs");
const path = require("path");

const DATABASE_PATH = path.join(__dirname, "../../data/database.json");

function readDatabase() {
  const content = fs.readFileSync(DATABASE_PATH, "utf-8");
  const database = JSON.parse(content);
  return {
    users: Array.isArray(database.users) ? database.users : [],
    sessions: Array.isArray(database.sessions) ? database.sessions : [],
    bookings: Array.isArray(database.bookings) ? database.bookings : [],
  };
}

function writeDatabase(database) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { createId, readDatabase, writeDatabase };
