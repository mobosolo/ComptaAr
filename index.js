const express = require("express");
const { Pool } = require("pg"); // Importe le client PostgreSQL
require("dotenv").config(); // Charge les variables d'environnement
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Pour parser les requêtes JSON
app.use(express.static(path.join(__dirname, "public")));

// --- Configuration de la base de données PostgreSQL ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // L'URL de connexion viendra de Render/dotenv
  ssl: {
    rejectUnauthorized: false, // Important pour Render en prod, peut être true en dev local si tu as un cert
  },
});

// Teste la connexion à la base de données au démarrage
pool.on("connect", () => {
  console.log("Connecté à la base de données PostgreSQL.");
});
pool.on("error", (err) => {
  console.error("Erreur de connexion à la base de données:", err);
});

// Création de la table si elle n'existe pas
async function createTable() {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL, -- 'depot' ou 'retrait'
                amount INTEGER NOT NULL,
                description TEXT,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
    console.log("Table transactions prête ou déjà existante.");
  } catch (err) {
    console.error("Erreur lors de la création de la table:", err);
  }
}

createTable(); // Appelle cette fonction au démarrage du serveur

// --- Servir les fichiers statiques (Frontend) ---
// Render s'occupera de servir le dossier public directement via sa configuration
// Donc, cette ligne n'est pas nécessaire pour le déploiement sur Render.
// Elle est utile UNIQUEMENT si tu lances le serveur seul en local sans une config Render statique.
// Pour la simplicté, on la retire car Render gérera le static-serve.

// Si tu veux tester en local AVANT de déployer :

// --- Routes API ---

// Route pour obtenir le solde actuel
app.get("/api/balance", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT
                SUM(CASE WHEN type = 'depot' THEN amount ELSE 0 END) AS total_depot,
                SUM(CASE WHEN type = 'retrait' THEN amount ELSE 0 END) AS total_retrait
            FROM transactions;
        `);
    const row = result.rows[0];
    const totalDepot = row.total_depot || 0;
    const totalRetrait = row.total_retrait || 0;
    const balance = totalDepot - totalRetrait;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour obtenir toutes les transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions ORDER BY timestamp DESC;"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour ajouter une transaction
app.post("/api/add_transaction", async (req, res) => {
  const { type, amount, description = "" } = req.body;

  if (!type || !amount) {
    return res.status(400).json({ message: "Type et montant sont requis." });
  }
  if (type !== "depot" && type !== "retrait") {
    return res.status(400).json({
      message: 'Type de transaction invalide. Doit être "depot" ou "retrait".',
    });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ message: "Montant invalide." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO transactions (type, amount, description) VALUES ($1, $2, $3) RETURNING id;",
      [type, amount, description]
    );
    res.status(201).json({
      message: "Transaction ajoutée avec succès",
      id: result.rows[0].id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour supprimer une transaction
app.delete("/api/transactions/:id", async (req, res) => {
  const transactionId = req.params.id;

  try {
    const result = await pool.query("DELETE FROM transactions WHERE id = $1;", [
      transactionId,
    ]);
    if (result.rowCount === 0) {
      res.status(404).json({ message: "Transaction non trouvée." });
    } else {
      res.status(200).json({ message: "Transaction supprimée avec succès." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
