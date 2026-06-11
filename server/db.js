const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Connects to a local spital.db file in the server directory
const dbPromise = open({
  filename: path.join(__dirname, 'spital.db'),
  driver: sqlite3.Database
}).then(async (db) => {
  // Enable foreign keys support in SQLite
  await db.run('PRAGMA foreign_keys = ON');
  return db;
});

module.exports = {
  // General query helper to execute statements and match the { rows } response signature
  query: async (text, params = []) => {
    const db = await dbPromise;
    const trimmedText = text.trim().toLowerCase();
    
    if (trimmedText.startsWith('select')) {
      const rows = await db.all(text, params);
      return { rows };
    } else {
      const result = await db.run(text, params);
      // For INSERT RETURNING, SQLite.all or SQLite.get must be used to get return values.
      // If the query contains RETURNING, we should fetch using db.all to get the returning rows.
      if (trimmedText.includes('returning')) {
        const rows = await db.all(text, params);
        return { rows };
      }
      return {
        rows: [],
        lastID: result.lastID,
        changes: result.changes
      };
    }
  },
  getDb: () => dbPromise,
};
