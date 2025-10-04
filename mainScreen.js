// =====================
// mainScreen.js
// =====================
const auth = window.auth;
const db = window.db;

// =====================
// Format Dropdown
// =====================
function changeMenuLabel(label) {
  document.getElementById("menuButton").innerText = label + " ▾";
}
window.changeMenuLabel = changeMenuLabel;

function toggleDropdown() {
  document.getElementById("formatDropdown").classList.toggle("show");
}
window.toggleDropdown = toggleDropdown;

window.onclick = function(event) {
  if (!event.target.matches('#menuButton')) {
    const dropdown = document.getElementById("formatDropdown");
    if (dropdown.classList.contains("show")) dropdown.classList.remove("show");
  }
}

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

// =====================
// Auth
// =====================
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("status").style.color = "green";
      document.getElementById("status").innerText = "Login successful!";
      loadUserDecks();
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
    })
    .catch(error => {
      document.getElementById("status").innerText = error.message;
    });
}

auth.onAuthStateChanged(user => {
  const loginContainer = document.querySelector(".container");
  const userInfoDiv = document.getElementById("userInfo");

  if (user) {
    loginContainer.style.display = "none";
    userInfoDiv.innerHTML = `
      <p>Logged in as <strong>${user.email}</strong></p>
      <button class="small-button" onclick="logout()">Logout</button>
    `;
    loadUserDecks();
  } else {
    loginContainer.style.display = "block";
    userInfoDiv.innerHTML = "";
  }
});

window.login = login;
window.signup = signup;
window.logout = logout;

// =====================
// Load user decks for main screen dropdown
// =====================
function loadUserDecks() {
  const deckSelect = document.getElementById("mainDeckSelect");
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
  const selected = document.getElementById("mainDeckSelect").value;
  document.getElementById("playButton").disabled = !selected;
}
window.updatePlayButton = updatePlayButton;

window.playDeck = function() {
  goToPlayScreen();
};
