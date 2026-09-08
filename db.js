const sqlite3 =require("sqlite3").verbose();

const db = new sqlite3.Database("./pokemon.db");

db.run(`
  CREATE TABLE IF NOT EXISTS pokemon_team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    image TEXT
  )
`);

module.exports = db;