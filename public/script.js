document.addEventListener("DOMContentLoaded", () => {
  const amountInput = document.getElementById("amount");
  const convertedAmountSpan = document.getElementById("convertedAmount");
  const addDepotBtn = document.getElementById("addDepot");
  const addRetraitBtn = document.getElementById("addRetrait");
  const descriptionInput = document.getElementById("description");
  const currentBalanceSpan = document.getElementById("currentBalance");
  const transactionHistoryBody = document.getElementById("transactionHistory");

  // --- Configuration pour la conversion des montants ---
  // À Lomé, si votre ami tape '500', il veut probablement dire 500.000 FCFA.
  const CONVERSION_FACTOR = 1000; // Multipliez par 1000 (ex: 500 -> 500 * 1000 = 500000)

  // Fonction pour formater un nombre en FCFA
  function formatFCFA(amount) {
    if (typeof amount !== "number") return "0 FCFA";
    return amount.toLocaleString("fr-FR") + " FCFA";
  }

  // Fonction de conversion et d'affichage du montant saisi par l'utilisateur
  function updateConvertedAmount() {
    const value = parseInt(amountInput.value);
    if (isNaN(value) || value <= 0) {
      convertedAmountSpan.textContent = "";
      addDepotBtn.disabled = true; // Désactive les boutons si le montant est invalide
      addRetraitBtn.disabled = true;
    } else {
      const converted = value * CONVERSION_FACTOR;
      convertedAmountSpan.textContent = `Ce sera: ${formatFCFA(converted)}`;
      addDepotBtn.disabled = false; // Active les boutons si le montant est valide
      addRetraitBtn.disabled = false;
    }
  }

  amountInput.addEventListener("input", updateConvertedAmount);
  updateConvertedAmount(); // Appel initial pour désactiver les boutons au chargement si le champ est vide

  // --- Fonctions pour interagir avec l'API Backend ---

  // Récupère et affiche le solde actuel
  async function fetchBalance() {
    try {
      const response = await fetch("/api/balance"); // Appel à l'API relative
      const data = await response.json();
      currentBalanceSpan.textContent = formatFCFA(data.balance);
    } catch (error) {
      console.error("Erreur lors du chargement du solde:", error);
      currentBalanceSpan.textContent = "Erreur de chargement";
    }
  }

  // Récupère et affiche l'historique des transactions
  async function fetchTransactions() {
    try {
      const response = await fetch("/api/transactions"); // Appel à l'API relative
      const transactions = await response.json();
      transactionHistoryBody.innerHTML = ""; // Vider avant de recharger l'historique

      transactions.forEach((t) => {
        const row = transactionHistoryBody.insertRow();
        // Formater la date/heure pour une meilleure lisibilité
        const date = new Date(t.timestamp).toLocaleString("fr-FR", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        row.insertCell().textContent = date;
        const typeCell = row.insertCell();
        typeCell.textContent = t.type === "depot" ? "Dépôt" : "Retrait";
        // Ajouter une classe pour colorer le type de transaction
        typeCell.classList.add(
          t.type === "depot"
            ? "transaction-type-depot"
            : "transaction-type-retrait"
        );
        row.insertCell().textContent = formatFCFA(t.amount);
        row.insertCell().textContent = t.description || "-"; // Afficher '-' si pas de description

        // --- Cellule et bouton de suppression ---
        const actionCell = row.insertCell();
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Supprimer";
        deleteButton.classList.add("delete-btn");
        deleteButton.dataset.id = t.id; // Stocke l'ID de la transaction dans un attribut de données

        // Ajoute un écouteur d'événement au bouton
        deleteButton.addEventListener("click", async (event) => {
          const transactionId = event.target.dataset.id; // Récupère l'ID
          // Demande confirmation avant de supprimer
          if (
            confirm(
              `Êtes-vous sûr de vouloir supprimer cette transaction (ID: ${transactionId}) ?`
            )
          ) {
            await deleteTransaction(transactionId);
          }
        });
        actionCell.appendChild(deleteButton);
      });
    } catch (error) {
      console.error("Erreur lors du chargement des transactions:", error);
      transactionHistoryBody.innerHTML =
        '<tr><td colspan="5">Erreur de chargement de l\'historique.</td></tr>'; // 5 colonnes maintenant
    }
  }

  // Ajoute une nouvelle transaction (dépôt ou retrait)
  async function addTransaction(type) {
    const rawAmount = parseInt(amountInput.value);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      alert("Veuillez entrer un montant valide et positif.");
      return;
    }

    const actualAmount = rawAmount * CONVERSION_FACTOR; // Applique le facteur de conversion
    const description = descriptionInput.value.trim();

    try {
      const response = await fetch("/api/add_transaction", {
        // Appel à l'API relative
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
        // Réinitialiser les champs après l'ajout réussi
        amountInput.value = "";
        descriptionInput.value = "";
        updateConvertedAmount(); // Met à jour l'affichage de la conversion et désactive les boutons
        fetchBalance(); // Actualise le solde
        fetchTransactions(); // Actualise l'historique
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

  // --- Fonction pour supprimer une transaction ---
  async function deleteTransaction(id) {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        // Appel à l'API relative avec l'ID
        method: "DELETE",
      });

      if (response.ok) {
        alert("Transaction supprimée avec succès !");
        fetchBalance(); // Met à jour le solde
        fetchTransactions(); // Met à jour l'historique
      } else {
        const errorData = await response.json();
        alert(`Erreur lors de la suppression: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur réseau lors de la suppression:", error);
      alert(
        "Une erreur est survenue lors de la communication avec le serveur."
      );
    }
  }

  // Écouteurs d'événements pour les boutons de dépôt et de retrait
  addDepotBtn.addEventListener("click", () => addTransaction("depot"));
  addRetraitBtn.addEventListener("click", () => addTransaction("retrait"));

  // Charger les données (solde et historique) au démarrage de l'application
  fetchBalance();
  fetchTransactions();
});
