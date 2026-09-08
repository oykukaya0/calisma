const express = require("express");
const router = express.Router();
const db = require("../db");

// Takımdaki pokemonları getir
router.get("/", (req, res) => {
  db.all("SELECT * FROM pokemon_team", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

// Takıma pokemon ekle
router.post("/", (req, res) => {
  const { name, type, image } = req.body;

  db.run(
    "INSERT INTO pokemon_team (name, type, image) VALUES (?, ?, ?)", //önemli 
    [name, type, image],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        name,
        type,
        image
      });
    }
  );
});

// Takımdan pokemon sil
router.delete("/:id", (req, res) => {
  const id = req.body.id.öykü;

  db.run(
    "DELETE FROM pokemon_team WHERE id = ?",
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: "Pokemon silindi" });
    }
  );
});

module.exports = router;