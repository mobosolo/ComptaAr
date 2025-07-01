document.addEventListener("DOMContentLoaded", () => {
  const amountInput = document.getElementById("amount");
  const convertedAmountSpan = document.getElementById("convertedAmount");
  const addDepotBtn = document.getElementById("addDepot");
  const addRetraitBtn = document.getElementById("addRetrait");
  const descriptionInput = document.getElementById("description");
  const currentBalanceSpan = document.getElementById("currentBalance");
  const transactionHistoryBody = document.getElementById("transactionHistory");

  // --- Configuration pour la conversion des montants ---
  const CONVERSION_FACTOR = 1000; // Multipliez par 1000 pour passer de "unité" à "mille"

  // Fonction pour formater un nombre en FCFA
  function formatFCFA(amount) {
    if (typeof amount !== "number") return "0 FCFA";
    return amount.toLocaleString("fr-FR") + " FCFA";
  }

  // Fonction de conversion et d'affichage
  function updateConvertedAmount() {
    const value = parseInt(amountInput.value);
    if (isNaN(value) || value <= 0) {
      convertedAmountSpan.textContent = "";
      addDepotBtn.disabled = true;
      addRetraitBtn.disabled = true;
    } else {
      const converted = value * CONVERSION_FACTOR;
      convertedAmountSpan.textContent = `Ce sera: ${formatFCFA(converted)}`;
      addDepotBtn.disabled = false;
      addRetraitBtn.disabled = false;
    }
  }

  amountInput.addEventListener("input", updateConvertedAmount);
  updateConvertedAmount(); // Appel initial pour désactiver les boutons si le champ est vide

  // --- Fonctions de chargement des données ---
  async function fetchBalance() {
    try {
      // L'API est sous /api/balance
      const response = await fetch("/api/balance");
      const data = await response.json();
      currentBalanceSpan.textContent = formatFCFA(data.balance);
    } catch (error) {
      console.error("Erreur lors du chargement du solde:", error);
      currentBalanceSpan.textContent = "Erreur de chargement";
    }
  }

  async function fetchTransactions() {
    try {
      // L'API est sous /api/transactions
      const response = await fetch("/api/transactions");
      const transactions = await response.json();
      transactionHistoryBody.innerHTML = ""; // Vider avant de recharger

      transactions.forEach((t) => {
        const row = transactionHistoryBody.insertRow();
        const date = new Date(t.timestamp).toLocaleString("fr-FR", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        row.insertCell().textContent = date;
        const typeCell = row.insertCell();
        typeCell.textContent = t.type === "depot" ? "Dépôt" : "Retrait";
        typeCell.classList.add(
          t.type === "depot"
            ? "transaction-type-depot"
            : "transaction-type-retrait"
        );
        row.insertCell().textContent = formatFCFA(t.amount);
        row.insertCell().textContent = t.description || "-";
      });
    } catch (error) {
      console.error("Erreur lors du chargement des transactions:", error);
      transactionHistoryBody.innerHTML =
        '<tr><td colspan="4">Erreur de chargement de l\'historique.</td></tr>';
    }
  }

  // --- Fonctions d'ajout de transaction ---
  async function addTransaction(type) {
    const rawAmount = parseInt(amountInput.value);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      alert("Veuillez entrer un montant valide.");
      return;
    }

    const actualAmount = rawAmount * CONVERSION_FACTOR; // Conversion réelle
    const description = descriptionInput.value.trim();

    try {
      // L'API est sous /api/add_transaction
      const response = await fetch("/api/add_transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: type,
          amount: actualAmount,
          description: description,
        }),
      });

      if (response.ok) {
        alert(`Transaction de ${type} ajoutée avec succès !`);
        amountInput.value = ""; // Réinitialiser le champ montant
        descriptionInput.value = ""; // Réinitialiser le champ description
        updateConvertedAmount(); // Mettre à jour l'affichage de la conversion et désactiver les boutons
        fetchBalance(); // Mettre à jour le solde
        fetchTransactions(); // Mettre à jour l'historique
      } else {
        const errorData = await response.json();
        alert(`Erreur lors de l'ajout de la transaction: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur réseau lors de l'ajout:", error);
      alert(
        "Une erreur est survenue lors de la communication avec le serveur."
      );
    }
  }

  addDepotBtn.addEventListener("click", () => addTransaction("depot"));
  addRetraitBtn.addEventListener("click", () => addTransaction("retrait"));

  // Charger les données au démarrage
  fetchBalance();
  fetchTransactions();
});
