const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json()); // Pour parser les requêtes JSON

// --- Configuration de la base de données SQLite ---
// Sur Vercel, on doit utiliser /tmp pour l'écriture, sinon data/ en local
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
const DB_PATH = isProd
  ? "/tmp/transactions.db"
  : path.join(__dirname, "..", "data", "transactions.db");

// En local, on crée le dossier data si besoin
if (!isProd) {
  const DB_DIR = path.join(__dirname, "..", "data");
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

let db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(
      "Erreur lors de l'ouverture de la base de données",
      err.message
    );
  } else {
    console.log("Connecté à la base de données SQLite.");
    db.run(
      `
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL, -- 'depot' ou 'retrait'
                amount INTEGER NOT NULL,
                description TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `,
      (err) => {
        if (err) {
          console.error("Erreur lors de la création de la table", err.message);
        } else {
          console.log("Table transactions prête.");
        }
      }
    );
  }
});

// --- Routes API ---

// Route pour obtenir le solde actuel
app.get("/api/balance", (req, res) => {
  db.get(
    "SELECT SUM(CASE WHEN type = 'depot' THEN amount ELSE 0 END) AS total_depot, \
                   SUM(CASE WHEN type = 'retrait' THEN amount ELSE 0 END) AS total_retrait \
           FROM transactions",
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const totalDepot = row.total_depot || 0;
      const totalRetrait = row.total_retrait || 0;
      const balance = totalDepot - totalRetrait;
      res.json({ balance });
    }
  );
});

// Route pour obtenir toutes les transactions
app.get("/api/transactions", (req, res) => {
  db.all("SELECT * FROM transactions ORDER BY timestamp DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Route pour ajouter une transaction
app.post("/api/add_transaction", (req, res) => {
  const { type, amount, description = "" } = req.body;

  if (!type || !amount) {
    return res.status(400).json({ message: "Type et montant sont requis." });
  }
  if (type !== "depot" && type !== "retrait") {
    return res
      .status(400)
      .json({
        message:
          'Type de transaction invalide. Doit être "depot" ou "retrait".',
      });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ message: "Montant invalide." });
  }

  db.run(
    "INSERT INTO transactions (type, amount, description) VALUES (?, ?, ?)",
    [type, amount, description],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res
        .status(201)
        .json({ message: "Transaction ajoutée avec succès", id: this.lastID });
    }
  );
});

// Exporter l'application pour Vercel
module.exports = app;
