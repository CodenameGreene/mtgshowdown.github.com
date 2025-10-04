// =====================
// Combined MTG Showdown JS
// =====================

// Firebase already initialized in index.html
const auth = window.auth;
const db = window.db;

// =====================
// Global State
// =====================
let currentDeck = { name: "", format: "", cards: [] };

// =====================
// Format Dropdown
// =====================
function changeMenuLabel(label) {
  document.getElementById("menuButton").innerText = label + " ▾";
}
function toggleDropdown() {
  document.getElementById("formatDropdown").classList.toggle("show");
}
window.changeMenuLabel = changeMenuLabel;
window.toggleDropdown = toggleDropdown;

window.onclick = function(event) {
  if (!event.target.matches('#menuButton')) {
    const dropdown = document.getElementById("formatDropdown");
    if (dropdown.classList.contains("show")) dropdown.classList.remove("show");
  }
};

// =====================
// Screen Navigation
// =====================
function showDeckBuilder() {
  document.getElementById("mainScreen").style.display = "none";
  document.getElementById("deckBuilder").style.display = "block";
}

function returnToMain() {
  document.getElementById("mainScreen").style.display = "block";
  document.getElementById("deckBuilder").style.display = "none";
  document.getElementById("playScreen").style.display = "none";
}

function goToPlayScreen() {
  const deckSelect = document.getElementById("mainDeckSelect");
  if (!deckSelect || !deckSelect.value) {
    alert("Please select a deck from the main screen first!");
    return;
  }

  // Update currentDeck from selected deck
  const selectedDeckId = deckSelect.value;
  db.collection("decks").doc(selectedDeckId).get()
    .then(doc => {
      if (!doc.exists) return alert("Selected deck not found.");

      currentDeck = doc.data();
      currentDeck.id = doc.id;
      if (!currentDeck.cards) currentDeck.cards = [];
  checkDeckLegality().then(isLegal => {
    if (isLegal) {
      document.getElementById("mainScreen").style.display = "none";
      document.getElementById("deckBuilder").style.display = "none";
      document.getElementById("playScreen").style.display = "block";
      startGame();
    }
  }); // <-- close the .then() properly
}
window.showDeckBuilder = showDeckBuilder;
window.returnToMain = returnToMain;
window.goToPlayScreen = goToPlayScreen;
window.playDeck = goToPlayScreen;

// =====================
// Auth Functions
// =====================
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("status").style.color = "green";
      document.getElementById("status").innerText = "Login successful!";
      loadUserDecks();
      loadSavedDecks();
    })
    .catch(error => {
      document.getElementById("status").style.color = "red";
      document.getElementById("status").innerText = error.message;
    });
}

function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("status").style.color = "green";
      document.getElementById("status").innerText = "Account created!";
      loadUserDecks();
      loadSavedDecks();
    })
    .catch(error => {
      document.getElementById("status").style.color = "red";
      document.getElementById("status").innerText = error.message;
    });
}

function logout() {
  auth.signOut()
    .then(() => {
      document.getElementById("status").innerText = "Logged out.";
      document.getElementById("mainDeckSelect").innerHTML = `<option value="">-- Select Deck --</option>`;
      document.getElementById("savedDecks").innerHTML = `<option value="">-- Select Deck --</option>`;
    })
    .catch(error => {
      document.getElementById("status").innerText = error.message;
    });
}

auth.onAuthStateChanged(user => {
  const loginContainer = document.querySelector(".container");
  const userInfoDiv = document.getElementById("userInfo");

  if (!loginContainer || !userInfoDiv) return;

  if (user) {
    loginContainer.style.display = "none";
    userInfoDiv.innerHTML = `
      <p>Logged in as <strong>${user.email}</strong></p>
      <button class="small-button" onclick="logout()">Logout</button>
    `;
    loadUserDecks();
    loadSavedDecks();
  } else {
    loginContainer.style.display = "block";
    userInfoDiv.innerHTML = "";
  }
});

window.login = login;
window.signup = signup;
window.logout = logout;

// =====================
// Load decks for main screen
// =====================
function loadUserDecks() {
  const deckSelect = document.getElementById("mainDeckSelect");
  if (!deckSelect) return;
  deckSelect.innerHTML = `<option value="">-- Select Deck --</option>`;
  
  const user = auth.currentUser;
  if (!user) return;

  db.collection("decks").where("owner", "==", user.uid).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = data.name + " (" + data.format + ")";
        deckSelect.appendChild(option);
      });
    });
}
window.loadUserDecks = loadUserDecks;

function updatePlayButton() {
  const selected = document.getElementById("mainDeckSelect").value;
  document.getElementById("playButton").disabled = !selected;
}
window.updatePlayButton = updatePlayButton;

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

  if (currentDeck.id) {
    // Update existing deck
    db.collection("decks").doc(currentDeck.id).set({
      owner: user.uid,
      name: name,
      format: format,
      cards: currentDeck.cards
    }).then(() => {
      alert("Deck updated!");
      loadSavedDecks();
    });
  } else {
    // Add new deck
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
}
window.saveDeck = saveDeck;



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
function loadSelectedDeck() {
  const deckId = document.getElementById("savedDecks").value;
  if (!deckId) return;

  db.collection("decks").doc(deckId).get()
    .then(doc => {
      if (!doc.exists) return alert("Deck not found.");

      currentDeck = doc.data();
      currentDeck.id = doc.id;
      if (!currentDeck.cards) currentDeck.cards = [];

      // Fill deck name and format inputs
      document.getElementById("deckNameInput").value = currentDeck.name;
      document.getElementById("deckFormatSelect").value = currentDeck.format;

      renderDeck();
    });
}
window.loadSelectedDeck = loadSelectedDeck;

function renderDeck() {
  const list = document.getElementById("deckList");
  if (!list) return;
  list.innerHTML = "";

  currentDeck.cards.forEach((card, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="card-name" style="cursor:pointer; text-decoration:underline;">${card.name}</span>
      <button class="small-button" onclick="modifyCard(${index}, -1)">-</button>
      <span>${card.qty}</span>
      <button class="small-button" onclick="modifyCard(${index}, 1)">+</button>
    `;

    // Hover preview
    li.querySelector(".card-name").addEventListener("mouseenter", () => {
      const hover = document.getElementById("hoverPreview");
      document.getElementById("hoverPreviewImg").src = card.image || "";
      hover.style.display = "block";
    });
    li.querySelector(".card-name").addEventListener("mouseleave", () => {
      document.getElementById("hoverPreview").style.display = "none";
    });

    // Click to Scryfall
    li.querySelector(".card-name").addEventListener("click", () => {
      if (card.scryfall) window.open(card.scryfall, "_blank");
    });

    list.appendChild(li);
  });
}
window.renderDeck = renderDeck;
function getDeckSize() {
  return currentDeck.cards.reduce((total, card) => total + (card.qty || 0), 0);
}
async function checkDeckLegality() {
  const formatLabel = document.getElementById("menuButton").innerText.replace(' ▾', '');
  const format = formatLabel;
  const deckSize = getDeckSize();

  if (!format) {
    alert("Select a format on the main screen.");
    document.getElementById("playButton").disabled = true;
    return false;
  }

  // Booster Draft can play without a deck
  if (format === "Booster Draft") {
    document.getElementById("playButton").disabled = false;
    return true;
  }

  // Commander must have 100 cards, others at least 60
  if ((format === "Commander" && deckSize !== 100) || 
      (format !== "Commander" && deckSize < 60)) {
    let required = format === "Commander" ? 100 : 60;
    alert(`Deck must have ${required} cards. Currently: ${deckSize}`);
    document.getElementById("playButton").disabled = true;
    return false;
  }

  const illegalCards = [];

  for (let card of currentDeck.cards) {
    if (!card.scryfallId) continue;
    try {
      const res = await fetch(`https://api.scryfall.com/cards/${card.scryfallId}`);
      const data = await res.json();
      if (!data.legalities || data.legalities[format.toLowerCase()] !== "legal") {
        illegalCards.push(card.name);
      }
    } catch (e) {
      illegalCards.push(`${card.name} (error checking legality)`);
    }
  }

  if (illegalCards.length > 0) {
    alert(`Deck is NOT legal for ${format}.\nIllegal cards:\n${illegalCards.join("\n")}`);
    document.getElementById("playButton").disabled = true;
    return false;
  }

  document.getElementById("playButton").disabled = false;
  return true;
}
window.checkDeckLegality = checkDeckLegality;

function modifyCard(index, delta) {
  currentDeck.cards[index].qty += delta;
  if (currentDeck.cards[index].qty <= 0) currentDeck.cards.splice(index, 1);
  renderDeck();
}
window.modifyCard = modifyCard;

function mainScreenDeckChanged() {
  const deckId = document.getElementById("mainDeckSelect").value;
  if (!deckId) {
    currentDeck = { name: "", format: "", cards: [] }; // empty
    updatePlayButton();
    return;
  }

  db.collection("decks").doc(deckId).get().then(doc => {
    if (!doc.exists) return alert("Deck not found.");

    currentDeck = doc.data();
    currentDeck.id = doc.id;
    if (!currentDeck.cards) currentDeck.cards = [];

    // Optionally update deck builder inputs too
    document.getElementById("deckNameInput").value = currentDeck.name;
    document.getElementById("deckFormatSelect").value = currentDeck.format;

    renderDeck();
    updatePlayButton();
  });
}

// =====================
// Card Search
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
      resultsDiv.innerText = "No cards found.";
      return;
    }

    data.data.forEach(card => {
      const cardDiv = document.createElement("div");
      cardDiv.classList.add("search-card");
      cardDiv.innerHTML = `
        <span class="card-name" style="cursor:pointer; text-decoration:underline;">${card.name}</span>
        <button>Add</button>
      `;

      // Hover image
      cardDiv.querySelector(".card-name").addEventListener("mouseenter", () => {
        const hover = document.getElementById("hoverPreview");
        document.getElementById("hoverPreviewImg").src = card.image_uris ? card.image_uris.normal : "";
        hover.style.display = "block";
      });
      cardDiv.querySelector(".card-name").addEventListener("mouseleave", () => {
        document.getElementById("hoverPreview").style.display = "none";
      });

      // Add card to deck
      cardDiv.querySelector("button").addEventListener("click", () => {
        const existing = currentDeck.cards.find(c => c.name === card.name);
        if (existing) {
          existing.qty += 1;
        } else {
          currentDeck.cards.push({
            name: card.name,
            qty: 1,
            image: card.image_uris ? card.image_uris.normal : "",
            scryfall: card.scryfall_uri
          });
        }
        renderDeck();
      });

      resultsDiv.appendChild(cardDiv);
    });
  } catch (err) {
    console.error(err);
  }
}
window.searchCards = searchCards;
//play logic
let playerHand = [];
let battlefield = [];

function startGame() {
  if (!currentDeck.cards || getDeckSize() === 0) {
    alert("Your deck is empty!");
    return;
  }

  // Flatten deck: create array with each card repeated by qty
  let fullDeck = [];
  currentDeck.cards.forEach(c => {
    for (let i = 0; i < c.qty; i++) {
      fullDeck.push({ ...c });
    }
  });

  // Shuffle deck
  fullDeck.sort(() => Math.random() - 0.5);

  // Draw 7 cards
  playerHand = fullDeck.splice(0, 7);
  battlefield = []; // empty battlefield

  renderPlayScreen();
}

function renderPlayScreen() {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";
  playerHand.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.textContent = card.name;
    cardDiv.onclick = () => playCard(index);
    handDiv.appendChild(cardDiv);
  });

  const battlefieldDiv = document.getElementById("battlefield");
  battlefieldDiv.innerHTML = "";
  battlefield.forEach(card => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card", "battlefield-card");
    cardDiv.textContent = card.name;
    battlefieldDiv.appendChild(cardDiv);
  });

  // Update format info
  document.getElementById("playFormat").innerText = currentDeck.format || "Unknown";
}

function playCard(index) {
  const card = playerHand.splice(index, 1)[0];
  battlefield.push(card);
  renderPlayScreen();
}

function endTurn() {
  alert("Turn ended!");
  // You can add more turn logic here later
}


