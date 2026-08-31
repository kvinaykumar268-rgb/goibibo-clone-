const fs = require("fs");
const path = require("path");

const SEED_DATABASE_PATH = path.join(__dirname, "../../data/database.json");
const TMP_DATABASE_PATH = path.join("/tmp", "database.json");

let memoryDatabase = null;

function getWritableDatabasePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return TMP_DATABASE_PATH;
  }
  return SEED_DATABASE_PATH;
}

function readDatabase() {
  const targetPath = getWritableDatabasePath();

  try {
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf-8");
      const database = JSON.parse(content);
      return {
        users: Array.isArray(database.users) ? database.users : [],
        sessions: Array.isArray(database.sessions) ? database.sessions : [],
        bookings: Array.isArray(database.bookings) ? database.bookings : [],
      };
    }
  } catch (err) {
    // fallback
  }

  if (memoryDatabase) {
    return memoryDatabase;
  }

  try {
    if (fs.existsSync(SEED_DATABASE_PATH)) {
      const content = fs.readFileSync(SEED_DATABASE_PATH, "utf-8");
      const database = JSON.parse(content);
      memoryDatabase = {
        users: Array.isArray(database.users) ? database.users : [],
        sessions: Array.isArray(database.sessions) ? database.sessions : [],
        bookings: Array.isArray(database.bookings) ? database.bookings : [],
      };
      return memoryDatabase;
    }
  } catch (err) {
    // fallback
  }

  memoryDatabase = { users: [], sessions: [], bookings: [] };
  return memoryDatabase;
}

function writeDatabase(database) {
  memoryDatabase = database;
  try {
    const targetPath = getWritableDatabasePath();
    fs.writeFileSync(targetPath, JSON.stringify(database, null, 2));
  } catch (error) {
    console.warn("Could not write to disk, using in-memory state:", error.message);
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { createId, readDatabase, writeDatabase };

