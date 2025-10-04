// =====================
// deckBuilder.js
// =====================

// Use global Firebase instances
var auth = window.auth;
var db = window.db;

// Current deck
var currentDeck = { name: "", format: "", cards: [] };

// =====================
// Save deck
// =====================
function saveDeck() {
  const name = document.getElementById("deckNameInput")?.value.trim();
  const format = document.getElementById("deckFormatSelect")?.value;
  if (!name || !format) {
    alert("Enter deck name and select format.");
    return;
  }

  currentDeck.name = name;
  currentDeck.format = format;

  const user = auth.currentUser;
  if (!user) return alert("Not logged in.");

  db.collection("decks").add({
    owner: user.uid,
    name: name,
    format: format,
    cards: currentDeck.cards
  }).then(() => {
    alert("Deck saved!");
    loadSavedDecks();
  });
}
window.saveDeck = saveDeck;

// =====================
// Load saved decks
// =====================
function loadSavedDecks() {
  const user = auth.currentUser;
  if (!user) return;

  const select = document.getElementById("savedDecks");
  if (!select) return;
  select.innerHTML = `<option value="">-- Select Deck --</option>`;

  db.collection("decks").where("owner", "==", user.uid).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = data.name;
        select.appendChild(option);
      });
    });
}
window.loadSavedDecks = loadSavedDecks;

// =====================
// Load a selected deck
// =====================
function loadSelectedDeck() {
  const deckId = document.getElementById("savedDecks")?.value;
  if (!deckId) return;

  db.collection("decks").doc(deckId).get()
    .then(doc => {
      if (!doc.exists) return alert("Deck not found.");
      currentDeck = doc.data();
      currentDeck.id = doc.id;
      if (!currentDeck.cards) currentDeck.cards = [];
      renderDeck();
    });
}
window.loadSelectedDeck = loadSelectedDeck;

// =====================
// Render deck list
// =====================
function renderDeck() {
  const list = document.getElementById("deckList");
  if (!list) return;
  list.innerHTML = "";

  currentDeck.cards.forEach((card, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="card-name" style="cursor:pointer; text-decoration:underline;">${card.name}</span>
      <button onclick="modifyCard(${index}, -1)">-</button>
      <span>${card.qty}</span>
      <button onclick="modifyCard(${index}, 1)">+</button>
    `;

    // Hover preview
    const cardNameSpan = li.querySelector

