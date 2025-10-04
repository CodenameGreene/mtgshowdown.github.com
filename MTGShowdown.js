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
  document.getElementById("mainScreen").style.display = "none";
  document.getElementById("deckBuilder").style.display = "none";
  document.getElementById("playScreen").style.display = "block";
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

  if (!name || !format) return alert("Enter deck name and select format.");

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
      <button onclick="modifyCard(${index}, -1)">-</button>
      <span>${card.qty}</span>
      <button onclick="modifyCard(${index}, 1)">+</button>
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

function modifyCard(index, delta) {
  currentDeck.cards[index].qty += delta;
  if (currentDeck.cards[index].qty <= 0) currentDeck.cards.splice(index, 1);
  renderDeck();
}
window.modifyCard = modifyCard;

// =====================
// Card Search
// =====================
async function searchCards() {
  const query = document.getElementById("cardSearchInput").value.trim();
