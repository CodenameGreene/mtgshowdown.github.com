/ =====================
// deckBuilder.js
// =====================

// Use the already initialized Firebase services
const auth = window.auth;
const db = window.db;

// Current deck object
let currentDeck = {
  id: null,
  name: "",
  format: "",
  cards: [] // Each card: {name, qty, image, scryfall}
};

// =====================
// Deck Builder Navigation
// =====================
function goBack() {
  document.getElementById("deckBuilder").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
}
window.goBack = goBack;

// =====================
// Save Deck
// =====================
function saveDeck() {
  const name = document.getElementById("deckNameInput").value.trim();
  const format = document.getElementById("deckFormatSelect").value;

  if (!name || !format) {
    alert("Enter a deck name and select a format.");
    return;
  }

  const user = auth.currentUser;
  if (!user) return alert("Not logged in.");

  currentDeck.name = name;
  currentDeck.format = format;

  const deckData = {
    owner: user.uid,
    name: name,
    format: format,
    cards: currentDeck.cards
  };

  if (currentDeck.id) {
    // Update existing deck
    db.collection("decks").doc(currentDeck.id).set(deckData)
      .then(() => { alert("Deck updated!"); loadSavedDecks(); });
  } else {
    // New deck
    db.collection("decks").add(deckData)
      .then(docRef => {
        currentDeck.id = docRef.id;
        alert("Deck saved!");
        loadSavedDecks();
      });
  }
}
window.saveDeck = saveDeck;

// =====================
// Load saved decks
// =====================
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
        option.textContent = data.name + " (" + data.format + ")";
        select.appendChild(option);
      });
    });
}
window.loadSavedDecks = loadSavedDecks;

// =====================
// Load selected deck
// =====================
function loadSelectedDeck() {
  const deckId = document.getElementById("savedDecks").value;
  if (!deckId) return;

  db.collection("decks").doc(deckId).get()
    .then(doc => {
      if (!doc.exists) return alert("Deck not found.");
      const data = doc.data();
      currentDeck = {
        id: doc.id,
        name: data.name,
        format: data.format,
        cards: data.cards || []
      };
      document.getElementById("deckNameInput").value = currentDeck.name;
      document.getElementById("deckFormatSelect").value = currentDeck.format;
      renderDeck();
    });
}
window.loadSelectedDeck = loadSelectedDeck;

// =====================
// Render Deck
// =====================
function renderDeck() {
  const list = document.getElementById("deckList");
  list.innerHTML = "";

  currentDeck.cards.forEach((card, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="card-name" style="cursor:pointer;text-decoration:underline;">${card.name}</span>
      <button class="small-button" onclick="modifyCard(${index}, -1)">-</button>
      <span>${card.qty}</span>
      <button class="small-button" onclick="modifyCard(${index}, 1)">+</button>
    `;

    // Hover preview
    const nameSpan = li.querySelector(".card-name");
    nameSpan.addEventListener("mouseenter", () => {
      const hover = document.getElementById("hoverPreview");
      document.getElementById("hoverPreviewImg").src = card.image || "";
      hover.style.display = "block";
    });
    nameSpan.addEventListener("mouseleave", () => {
      document.getElementById("hoverPreview").style.display = "none";
    });

    // Click to Scryfall
    nameSpan.addEventListener("click", () => {
      if (card.scryfall) window.open(card.scryfall, "_blank");
    });

    list.appendChild(li);
  });
}
window.renderDeck = renderDeck;

// =====================
// Modify card quantity
// =====================
function modifyCard(index, delta) {
  currentDeck.cards[index].qty += delta;
  if (currentDeck.cards[index].qty <= 0) {
    currentDeck.cards.splice(index, 1);
  }
  renderDeck();
}
window.modifyCard = modifyCard;

// =====================
// Card Search with Type Filter
// =====================
async function searchCards() {
  const query = document.getElementById("cardSearchInput").value.trim();
  const typeFilter = document.getElementById("cardTypeFilter").value;

  if (!query) return;

  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
  if (typeFilter) url += `+type:${encodeURIComponent(typeFilter)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const resultsDiv = document.getElementById("cardSearchResults");
    resultsDiv.innerHTML = "";

    if (!data.data || data.data.length === 0) {
      resultsDiv.textContent = "No cards found.";
      return;
    }

    data.data.forEach(card => {
      const div = document.createElement("div");
      div.className = "search-card";
      div.innerHTML = `
        <span class="search-card-name" style="cursor:pointer;">${card.name}</span>
        <button class="small-button">Add</button>
      `;

      // Add button
      div.querySelector("button").addEventListener("click", () => {
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
  } catch (err) {
    console.error("Error fetching cards:", err);
  }
}
window.searchCards = searchCards;

// =====================
// Load decks on login
// =====================
auth.onAuthStateChanged(user => {
  if (user) loadSavedDecks();
});
