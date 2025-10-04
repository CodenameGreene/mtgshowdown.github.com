// =====================
// mainScreen.js
// =====================

// Use globally initialized Firebase
var auth = window.auth;
var db = window.db;

// =====================
// Format Dropdown
// =====================
function changeMenuLabel(label) {
  const btn = document.getElementById("menuButton");
  if (btn) btn.innerText = label + " ▾";
}
window.changeMenuLabel = changeMenuLabel;

function toggleDropdown() {
  const dropdown = document.getElementById("formatDropdown");
  if (dropdown) dropdown.classList.toggle("show");
}
window.toggleDropdown = toggleDropdown;

window.onclick = function(event) {
  if (!event.target.matches('#menuButton')) {
    const dropdown = document.getElementById("formatDropdown");
    if (dropdown && dropdown.classList.contains("show")) dropdown.classList.remove("show");
  }
}

// =====================
// Screen Navigation
// =====================
function showDeckBuilder() {
  document.getElementById("mainScreen").style.display = "none";
  document.getElementById("deckBuilder").style.display = "block";
}
window.showDeckBuilder = showDeckBuilder;

function returnToMain() {
  const main = document.getElementById("mainScreen");
  const deck = document.getElementById("deckBuilder");
  const play = document.getElementById("playScreen");
  if (main) main.style.display = "block";
  if (deck) deck.style.display = "none";
  if (play) play.style.display = "none";
}
window.returnToMain = returnToMain;

function goToPlayScreen() {
  checkDeckLegality().then(isLegal => {
    if (isLegal) {
      const main = document.getElementById("mainScreen");
      const deck = document.getElementById("deckBuilder");
       const play = document.getElementById("playScreen");
      document.getElementById("mainScreen").style.display = "none";
      document.getElementById("deckBuilder").style.display = "none";
      document.getElementById("playScreen").style.display = "block";
    } else {
      // Optional: focus deck builder so user can fix it
      showDeckBuilder();
    }
  });
}
window.goToPlayScreen = goToPlayScreen;

// =====================
// Auth
// =====================
function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      const status = document.getElementById("status");
      if (status) {
        status.style.color = "green";
        status.innerText = "Login successful!";
      }
      loadUserDecks();
      loadSavedDecks();
    })
    .catch(error => {
      const status = document.getElementById("status");
      if (status) {
        status.style.color = "red";
        status.innerText = error.message;
      }
    });
}
window.login = login;

function signup() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) return;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      const status = document.getElementById("status");
      if (status) {
        status.style.color = "green";
        status.innerText = "Account created!";
      }
      loadUserDecks();
      loadSavedDecks();
    })
    .catch(error => {
      const status = document.getElementById("status");
      if (status) {
        status.style.color = "red";
        status.innerText = error.message;
      }
    });
}
window.signup = signup;

function logout() {
  auth.signOut()
    .then(() => {
      const status = document.getElementById("status");
      if (status) status.innerText = "Logged out.";
      const deckSelect = document.getElementById("mainDeckSelect");
      if (deckSelect) deckSelect.innerHTML = `<option value="">-- Select Deck --</option>`;
    })
    .catch(error => {
      const status = document.getElementById("status");
      if (status) status.innerText = error.message;
    });
}
window.logout = logout;

// =====================
// Auth State Listener
// =====================
auth.onAuthStateChanged(user => {
  const loginContainer = document.querySelector(".container");
  const userInfoDiv = document.getElementById("userInfo");
  
  if (user) {
    if (loginContainer) loginContainer.style.display = "none";
    if (userInfoDiv) {
      userInfoDiv.innerHTML = `
        <p>Logged in as <strong>${user.email}</strong></p>
        <button class="small-button" onclick="logout()">Logout</button>
      `;
    }
    loadUserDecks();
    loadSavedDecks();
  } else {
    if (loginContainer) loginContainer.style.display = "block";
    if (userInfoDiv) userInfoDiv.innerHTML = "";
  }
});

// =====================
// Load user decks for main screen dropdown
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

// =====================
// Enable play button if a deck is selected
// =====================
function updatePlayButton() {
  const selected = document.getElementById("mainDeckSelect")?.value;
  const playBtn = document.getElementById("playButton");
  if (playBtn) playBtn.disabled = !selected;
}
window.updatePlayButton = updatePlayButton;

window.playDeck = goToPlayScreen;

