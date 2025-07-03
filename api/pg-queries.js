// Fonctions pour requêtes PostgreSQL pour la gestion des transactions
const { query } = require("..");

// Créer la table si elle n'existe pas
async function createTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type VARCHAR(10) NOT NULL, -- 'depot' ou 'retrait'
      amount INTEGER NOT NULL,
      description TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Obtenir le solde actuel
async function getBalance() {
  const res = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'depot' THEN amount ELSE 0 END),0) AS total_depot,
      COALESCE(SUM(CASE WHEN type = 'retrait' THEN amount ELSE 0 END),0) AS total_retrait
    FROM transactions
  `);
  const row = res.rows[0];
  return { balance: row.total_depot - row.total_retrait };
}

// Obtenir toutes les transactions
async function getTransactions() {
  const res = await query("SELECT * FROM transactions ORDER BY timestamp DESC");
  return res.rows;
}

// Ajouter une transaction
async function addTransaction({ type, amount, description }) {
  const res = await query(
    "INSERT INTO transactions (type, amount, description) VALUES ($1, $2, $3) RETURNING id",
    [type, amount, description || ""]
  );
  return res.rows[0];
}

module.exports = {
  createTable,
  getBalance,
  getTransactions,
  addTransaction,
};
