// =====================
// Firebase references
// =====================
var auth = window.auth;
var db = window.db;

// Current deck in memory
let currentDeck = { name: "", format: "", cards: [] };

// =====================
// Deck Builder Functions
// =====================
function saveDeck() {
  const name = document.getElementById("deckNameInput").value.trim();
  const format = document.getElementById("deckFormatSelect").value;

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

function loadSavedDecks() {
  const user = auth.currentUser;
  if (!user) return;
  const select = document.getElementById("savedDecks");
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

function loadSelectedDeck() {
  const deckId = document.getElementById("savedDecks").value;
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

function renderDeck() {
  const list = document.getElementById("deckList");
  list.innerHTML = "";

  currentDeck.cards.forEach((card, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="card-name" style="cursor:pointer; text-decoration:underline;">${card.name}</span>
      <button onclick="modifyCard(${index}, -1)">-</button>
      <span>${card.qty}</span>
      <button onclick="modifyCard(${index}, 1)">+</button>
    `;

    const cardNameSpan = li.querySelector(".card-name");

    // Hover preview
    cardNameSpan.addEventListener("mouseenter", () => {
      const hover = document.getElementById("hoverPreview");
      document.getElementById("hoverPreviewImg").src = card.image || "";
      hover.style.display = "block";
    });
    cardNameSpan.addEventListener("mouseleave", () => {
      document.getElementById("hoverPreview").style.display = "none";
    });

    // Click to Scryfall
    cardNameSpan.addEventListener("click", () => {
      if (card.scryfall) window.open(card.scryfall, "_blank");
    });

    list.appendChild(li);
  });
}
window.renderDeck = renderDeck;

function modifyCard(index, delta) {
  currentDeck.cards[index].qty += delta;
  if (currentDeck.cards[index].qty <= 0) {
    currentDeck.cards.splice(index, 1);
  }
  renderDeck();
}
window.modifyCard = modifyCard;

// =====================
// Card Search
// =====================
async function searchCards() {
  const query = document.getElementById("cardSearchInput").value.trim();
  const typeFilter = document.getElementById("cardTypeFilter").value;

  if (!query) return;

  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
  if (typeFilter) url += `+type:${encodeURIComponent(typeFilter)}`;

  const res = await fetch(url);
  const data = await res.json();
  const resultsDiv = document.getElementById("cardSearchResults");
  resultsDiv.innerHTML = "";

  if (!data.data) return;

  data.data.forEach(card => {
    const div = document.createElement("div");
    div.classList.add("search-card");
    div.style.cursor = "pointer";
    div.innerText = card.name;
    
    div.addEventListener("click", () => {
      const existing = currentDeck.cards.find(c => c.name === card.name);
      if (existing) {
        existing.qty++;
      } else {
        currentDeck.cards.push({
          name: card.name,
          qty: 1,
          image: card.image_uris?.normal || "",
          scryfall: card.scryfall_uri
        });
      }
      renderDeck();
    });

    resultsDiv.appendChild(div);
  });
}
window.searchCards = searchCards;
