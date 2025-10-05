// MTGShowdown.js (fixed & cleaned)
// =====================

// Firebase already initialized in index.html
const auth = window.auth;
const db = window.db;

// =====================
// Global State
// =====================
let currentDeck = { name: "", format: "", cards: [] };

let player = {
  deck: [],
  hand: [],
  battlefield: [],
  graveyard: [],
  landsPlayed: 0,
  turn: 1,
  manaPool: { W:0, U:0, B:0, R:0, G:0, C:0 }
};

let opponent = {
  deck: [],
  hand: [],
  battlefield: [],
  graveyard: [],
  landsPlayed: 0,
  turn: 1,
  manaPool: { W:0, U:0, B:0, R:0, G:0, C:0 }
};

// =====================
// Utilities
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

window.showDeckBuilder = showDeckBuilder;
window.returnToMain = returnToMain;

// =====================
// Deck selection
// =====================
function mainScreenDeckChanged() {
  const deckId = document.getElementById("mainDeckSelect").value;
  if (!deckId) {
    currentDeck = { name: "", format: "", cards: [] };
    updatePlayButton();
    return;
  }
  db.collection("decks").doc(deckId).get().then(doc => {
    if (!doc.exists) return alert("Deck not found.");
    currentDeck = doc.data();
    currentDeck.id = doc.id;
    if (!currentDeck.cards) currentDeck.cards = [];
    document.getElementById("deckNameInput").value = currentDeck.name || "";
    document.getElementById("deckFormatSelect").value = currentDeck.format || "";
    renderDeck();
    updatePlayButton();
  }).catch(console.error);
}
window.mainScreenDeckChanged = mainScreenDeckChanged;

function updatePlayButton() {
  const selected = document.getElementById("mainDeckSelect").value;
  const btn = document.getElementById("playButton");
  if (btn) btn.disabled = !selected;
}
window.updatePlayButton = updatePlayButton;

// =====================
// Auth & deck saving/loading
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
    }).catch(error => {
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
    }).catch(error => {
      document.getElementById("status").style.color = "red";
      document.getElementById("status").innerText = error.message;
    });
}

function logout() {
  auth.signOut().then(() => {
    document.getElementById("status").innerText = "Logged out.";
    const sel1 = document.getElementById("mainDeckSelect");
    const sel2 = document.getElementById("savedDecks");
    if (sel1) sel1.innerHTML = `<option value="">-- Select Deck --</option>`;
    if (sel2) sel2.innerHTML = `<option value="">-- Select Deck --</option>`;
  }).catch(err => {
    document.getElementById("status").innerText = err.message;
  });
}

auth.onAuthStateChanged(user => {
  const loginContainer = document.querySelector(".container");
  const userInfoDiv = document.getElementById("userInfo");
  if (!loginContainer || !userInfoDiv) return;
  if (user) {
    loginContainer.style.display = "none";
    userInfoDiv.innerHTML = `<p>Logged in as <strong>${user.email}</strong></p>
      <button class="small-button" onclick="logout()">Logout</button>`;
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

function loadUserDecks() {
  const deckSelect = document.getElementById("mainDeckSelect");
  if (!deckSelect) return;
  deckSelect.innerHTML = `<option value="">-- Select Deck --</option>`;
  const user = auth.currentUser;
  if (!user) return;
  db.collection("decks").where("owner", "==", user.uid).get().then(snapshot => {
    snapshot.forEach(doc => {
      const d = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = `${d.name} (${d.format})`;
      deckSelect.appendChild(option);
    });
  }).catch(console.error);
}
window.loadUserDecks = loadUserDecks;

function loadSavedDecks() {
  const user = auth.currentUser;
  if (!user) return;
  const select = document.getElementById("savedDecks");
  if (!select) return;
  select.innerHTML = `<option value="">-- Select Deck --</option>`;
  db.collection("decks").where("owner", "==", user.uid).get().then(snapshot => {
    snapshot.forEach(doc => {
      const d = doc.data();
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = d.name;
      select.appendChild(opt);
    });
  }).catch(console.error);
}
window.loadSavedDecks = loadSavedDecks;

function saveDeck() {
  const name = document.getElementById("deckNameInput").value.trim();
  const format = document.getElementById("deckFormatSelect").value;
  if (!name || !format) { alert("Enter deck name and select format."); return; }
  currentDeck.name = name; currentDeck.format = format;
  const user = auth.currentUser; if (!user) return alert("Not logged in.");
  if (currentDeck.id) {
    db.collection("decks").doc(currentDeck.id).set({ owner:user.uid, name, format, cards: currentDeck.cards })
      .then(()=>{ alert("Deck updated!"); loadSavedDecks(); }).catch(console.error);
  } else {
    db.collection("decks").add({ owner:user.uid, name, format, cards: currentDeck.cards })
      .then(()=>{ alert("Deck saved!"); loadSavedDecks(); }).catch(console.error);
  }
}
window.saveDeck = saveDeck;

function loadSelectedDeck() {
  const id = document.getElementById("savedDecks").value;
  if (!id) return;
  db.collection("decks").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Deck not found.");
    currentDeck = doc.data(); currentDeck.id = doc.id; if (!currentDeck.cards) currentDeck.cards = [];
    document.getElementById("deckNameInput").value = currentDeck.name || "";
    document.getElementById("deckFormatSelect").value = currentDeck.format || "";
    renderDeck();
  }).catch(console.error);
}
window.loadSelectedDeck = loadSelectedDeck;

// =====================
// Deck rendering & modification
// =====================
function renderDeck() {
  const list = document.getElementById("deckList");
  if (!list) return;
  list.innerHTML = "";
  currentDeck.cards.forEach((card, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="card-name" style="cursor:pointer; text-decoration:underline;">${card.name}</span>
      <button class="small-button" onclick="modifyCard(${index}, -1)">-</button>
      <span>${card.qty}</span>
      <button class="small-button" onclick="modifyCard(${index}, 1)">+</button>`;
    const nameSpan = li.querySelector(".card-name");
    nameSpan.addEventListener("mouseenter", ()=> showCardPreview(card));
    nameSpan.addEventListener("mouseleave", hideCardPreview);
    nameSpan.addEventListener("click", ()=> card.scryfall && window.open(card.scryfall, "_blank"));
    list.appendChild(li);
  });
}
window.renderDeck = renderDeck;

function modifyCard(index, delta) {
  currentDeck.cards[index].qty += delta;
  if (currentDeck.cards[index].qty <= 0) currentDeck.cards.splice(index,1);
  renderDeck();
}
window.modifyCard = modifyCard;

function getDeckSize() {
  return currentDeck.cards.reduce((t,c)=> t + (c.qty||0), 0);
}
// =====================
// Card Search (Scryfall API)
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
    if (!data.data || data.data.length === 0) { resultsDiv.innerText = "No cards found."; return; }

    data.data.forEach(card => {
      const cardDiv = document.createElement("div");
      cardDiv.classList.add("search-card");
      cardDiv.innerHTML = `<span class="card-name" style="cursor:pointer; text-decoration:underline;">${card.name}</span>
        <button>Add</button>`;
      const nameSpan = cardDiv.querySelector(".card-name");
      nameSpan.addEventListener("mouseenter", ()=> showCardPreview({
        name: card.name,
        image: card.image_uris ? card.image_uris.normal : ""
      }));
      nameSpan.addEventListener("mouseleave", hideCardPreview);
      cardDiv.querySelector("button").addEventListener("click", ()=> {
        const existing = currentDeck.cards.find(c=> c.name === card.name);
        if (existing) existing.qty++;
        else currentDeck.cards.push({
          name: card.name,
          qty: 1,
          image: card.image_uris ? card.image_uris.normal : "",
          scryfall: card.scryfall_uri,
          scryfallId: card.id,
          type_line: card.type_line || "Unknown",
          mana_cost: card.mana_cost || ""
        });
        renderDeck();
      });
      resultsDiv.appendChild(cardDiv);
    });
  } catch (err) { console.error(err); }
}
window.searchCards = searchCards;

// =====================
// Deck Legality
// =====================
async function checkDeckLegality() {
  const format = document.getElementById("menuButton").innerText.replace(' ▾','');
  const deckSize = getDeckSize();
  if (!format) { alert("Select a format on the main screen."); document.getElementById("playButton").disabled = true; return false; }
  if (format === "Booster Draft") { document.getElementById("playButton").disabled = false; return true; }
  if ((format === "Commander" && deckSize !== 100) || (format !== "Commander" && deckSize < 60)) {
    const req = format === "Commander" ? 100 : 60;
    alert(`Deck must have ${req} cards. Currently: ${deckSize}`);
    document.getElementById("playButton").disabled = true;
    return false;
  }
  const illegal = [];
  for (let c of currentDeck.cards) {
    if (!c.scryfallId) continue;
    try {
      const res = await fetch(`https://api.scryfall.com/cards/${c.scryfallId}`);
      const data = await res.json();
      if (!data.legalities || data.legalities[format.toLowerCase()] !== "legal") illegal.push(c.name);
    } catch (e) { illegal.push(`${c.name} (error checking legality)`); }
  }
  if (illegal.length) { alert(`Deck NOT legal for ${format}.\nIllegal: ${illegal.join("\n")}`); document.getElementById("playButton").disabled = true; return false; }
  document.getElementById("playButton").disabled = false; return true;
}
window.checkDeckLegality = checkDeckLegality;

// =====================
// Start Game
// =====================
async function ensureTypeLines(deck) {
  for (let card of deck) {
    if ((!card.type_line || card.type_line === "Unknown") || card.mana_cost === undefined) {
      try {
        let data = null;
        if (card.scryfallId) {
          const r = await fetch(`https://api.scryfall.com/cards/${card.scryfallId}`);
          data = await r.json();
        } else if (card.name) {
          const r = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`);
          data = await r.json();
        }
        if (data) {
          card.type_line = data.type_line || card.type_line || "Unknown";
          card.mana_cost = card.mana_cost || data.mana_cost || "";
          card.image = card.image || data.image_uris?.normal || card.image || "";
          card.scryfallId = card.scryfallId || data.id;
        } else {
          card.type_line = card.type_line || "Unknown";
          card.mana_cost = card.mana_cost || "";
        }
      } catch (e) {
        console.warn("ensureTypeLines fetch failed for", card.name, e);
        card.type_line = card.type_line || "Unknown";
        card.mana_cost = card.mana_cost || "";
      }
    }
  }
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
async function startGame() {
  if (!currentDeck.cards || getDeckSize() === 0) { alert("Your deck is empty!"); return; }

  // Ensure play screen is visible
  document.getElementById("mainScreen").style.display = "none";
  document.getElementById("deckBuilder").style.display = "none";
  document.getElementById("playScreen").style.display = "block";

  let full = [];
  currentDeck.cards.forEach(c => {
    for (let i = 0; i < (c.qty||0); i++) full.push({ ...c });
  });
  full = await ensureTypeLines(full);
  full = shuffle(full);
  player.deck = full;
  player.hand = player.deck.splice(0,7);
  player.battlefield = [];
  player.landsPlayed = 0;
  player.turn = 1;
  player.manaPool = { W:0, U:0, B:0, R:0, G:0, C:0 };
  renderPlayScreen();
}
window.startGame = startGame;

function goToPlayScreen() {
  const deckSelect = document.getElementById("mainDeckSelect");
  if (!deckSelect || !deckSelect.value) { alert("Please select a deck first!"); return; }
  const selectedDeckId = deckSelect.value;
  db.collection("decks").doc(selectedDeckId).get()
    .then(doc => {
      if (!doc.exists) return alert("Deck not found.");
      currentDeck = doc.data(); currentDeck.id = doc.id; if (!currentDeck.cards) currentDeck.cards = [];
      checkDeckLegality().then(isLegal => {
        if (isLegal) {
          document.getElementById("mainScreen").style.display = "none";
          document.getElementById("deckBuilder").style.display = "none";
          document.getElementById("playScreen").style.display = "block";
          startGame();
        }
      });
    }).catch(err => { console.error(err); alert("Failed to load deck!"); });
}
window.goToPlayScreen = goToPlayScreen;
window.playDeck = goToPlayScreen;

// =====================
// Mana parsing & helpers
// =====================
function parseManaCost(manaCost) {
  const mana = { W:0, U:0, B:0, R:0, G:0, C:0 };
  if (!manaCost) return mana;
  const tokens = manaCost.match(/\{([^}]+)\}/g) || [];
  for (let t of tokens) {
    const sym = t.replace(/[{}]/g, '').trim();
    if (/^\d+$/.test(sym)) mana.C += Number(sym);
    else {
      const letter = sym[0].toUpperCase();
      if (["W","U","B","R","G"].includes(letter)) mana[letter]++;
      else mana.C++;
    }
  }
  return mana;
}

async function tapLandForManaByIndex(index) {
  const land = player.battlefield[index];
  if (!land || land.isTapped) return;
  land.isTapped = true;
  const pool = player.manaPool;

  if (!land.produced_mana) {
    try {
      const data = await fetch(`https://api.scryfall.com/cards/${land.scryfallId || `named?exact=${encodeURIComponent(land.name)}`}`)
        .then(r => r.json());
      land.produced_mana = data.produced_mana || [];
    } catch (err) {
      console.warn("Failed to fetch produced_mana for", land.name, err);
      land.produced_mana = [];
    }
  }

  if (Array.isArray(land.produced_mana) && land.produced_mana.length > 0) {
    const color = land.produced_mana.length === 1 
      ? land.produced_mana[0]
      : prompt(`Choose mana color for ${land.name}:\n${land.produced_mana.join(", ")}`) || land.produced_mana[0];
    pool[color] = (pool[color] || 0) + 1;
  } else {
    const tl = (land.type_line || "").toLowerCase();
    if (tl.includes("plains")) pool.W++;
    else if (tl.includes("island")) pool.U++;
    else if (tl.includes("swamp")) pool.B++;
    else if (tl.includes("mountain")) pool.R++;
    else if (tl.includes("forest")) pool.G++;
    else pool.C++;
  }

  player.manaPool = pool;
  renderPlayScreen();
}

// =====================
// Card type & mana helpers
// =====================
function getCardSection(card) {
  if (!card.type_line) return "Other";
  const t = card.type_line;
  if (t.includes("Land")) return "Land";
  if (t.includes("Creature")) return "Creature";
  if (t.includes("Enchantment")) return "Enchantment";
  if (t.includes("Artifact")) return "Artifact";
  if (t.includes("Planeswalker")) return "Planeswalker";
  return "Other";
}

function canPayMana(cost) {
  const pool = {...player.manaPool};
  for (const col of ["W","U","B","R","G"]) {
    if ((cost[col]||0) > (pool[col]||0)) return false;
    pool[col] -= cost[col]||0;
  }
  let generic = cost.C||0;
  let available = pool.W+pool.U+pool.B+pool.R+pool.G+pool.C;
  return available >= generic;
}

function payMana(cost) {
  for (const col of ["W","U","B","R","G"]) {
    const use = Math.min(player.manaPool[col] || 0, cost[col] || 0);
    player.manaPool[col] -= use;
  }
  let generic = cost.C || 0;
  const order = ["W","U","B","R","G","C"];
  for (const sym of order) {
    while (generic > 0 && player.manaPool[sym] > 0) {
      player.manaPool[sym]--;
      generic--;
    }
  }
  renderPlayScreen();
}

// =====================
// Card preview
// =====================
function showCardPreview(card) {
  const div = document.getElementById("cardPreview");
  if (!div) return;
  div.style.display = "block";
  if (card.image) div.innerHTML = `<img src="${card.image}" style="width:200px;">`;
  else div.innerText = card.name;
}

function hideCardPreview() {
  const div = document.getElementById("cardPreview");
  if (!div) return;
  div.style.display = "none";
}
window.showCardPreview = showCardPreview;
window.hideCardPreview = hideCardPreview;

// =====================
// Play screen rendering
// =====================
function renderPlayScreen() {
  const handDiv = document.getElementById("handArea");
  const bfDiv = document.getElementById("battlefieldArea");
  const graveDiv = document.getElementById("graveyard");

  if (!handDiv || !bfDiv || !graveDiv) return;

  // --- Hand ---
  handDiv.innerHTML = "";
  player.hand.forEach((c, i) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    if (c.image) {
      const img = document.createElement("img");
      img.src = c.image;
      img.style.width = "100px";  // hand card size
      img.style.cursor = "pointer";

      // Show preview on hover
      img.addEventListener("mouseenter", () => showCardPreview(c));
      img.addEventListener("mouseleave", hideCardPreview);

      cardDiv.appendChild(img);
    } else {
      cardDiv.innerText = c.name;
    }

    handDiv.appendChild(cardDiv);
  });

  // --- Battlefield ---
  bfDiv.innerHTML = "";
  player.battlefield.forEach((c, i) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    if (c.image) {
      const img = document.createElement("img");
      img.src = c.image;
      img.style.width = "120px";  // battlefield card size
      img.style.cursor = "pointer";
      if (c.isTapped) img.style.opacity = 0.6;

      // Preview hover
      img.addEventListener("mouseenter", () => showCardPreview(c));
      img.addEventListener("mouseleave", hideCardPreview);

      cardDiv.appendChild(img);
    } else {
      cardDiv.innerText = c.name + (c.isTapped ? " (T)" : "");
    }

    if (getCardSection(c) === "Land" && !c.isTapped) {
      cardDiv.onclick = () => tapLandForManaByIndex(i);
    }

    bfDiv.appendChild(cardDiv);
  });

  // --- Graveyard ---
  graveDiv.innerHTML = "";
  player.graveyard.forEach(c => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    if (c.image) {
      const img = document.createElement("img");
      img.src = c.image;
      img.style.width = "80px";  // smaller graveyard
      img.style.cursor = "pointer";
      img.addEventListener("mouseenter", () => showCardPreview(c));
      img.addEventListener("mouseleave", hideCardPreview);
      cardDiv.appendChild(img);
    } else {
      cardDiv.innerText = c.name;
    }
    graveDiv.appendChild(cardDiv);
  });

  // --- Mana pool & turn ---
  const poolDiv = document.getElementById("manaPool");
  if (poolDiv) poolDiv.innerText = `Mana Pool: ${Object.entries(player.manaPool).map(([k,v])=> v>0?`${k}:${v}`:"").filter(Boolean).join(", ")}`;
  const turnDiv = document.getElementById("turnCounter");
  if (turnDiv) turnDiv.innerText = `Turn: ${player.turn}`;
}

  // --- Mana pool ---
  const poolDiv = document.getElementById("manaPool");
  if (poolDiv) poolDiv.innerText = `Mana Pool: ${Object.entries(player.manaPool).map(([k,v])=> v>0?`${k}:${v}`:"").filter(Boolean).join(", ")}`;

  // --- Turn counter ---
  const turnDiv = document.getElementById("turnCounter");
  if (turnDiv) turnDiv.innerText = `Turn: ${player.turn}`;
}

window.renderPlayScreen = renderPlayScreen;

// =====================
// Auto-tap lands for mana (for simple spells)
// =====================
function autoTapLandsForCost(cost) {
  let needed = {...cost};
  player.battlefield.forEach((c,i)=>{
    if (getCardSection(c)!=="Land" || c.isTapped) return;
    for (const col of c.produced_mana||["W","U","B","R","G"]) {
      if (needed[col]>0) {
        c.isTapped = true;
        player.manaPool[col] = (player.manaPool[col]||0)+1;
        needed[col]--;
        break;
      }
    }
  });
  renderPlayScreen();
}
window.autoTapLandsForCost = autoTapLandsForCost;
function endTurn(){
  player.battlefield.forEach(c => c.isTapped = false);
  if (player.deck.length > 0) player.hand.push(player.deck.shift());
  player.landsPlayed = 0;
  player.manaPool = { W:0, U:0, B:0, R:0, G:0, C:0 };
  player.turn++;
  renderPlayScreen();
  } 
window.endTurn = endTurn;
