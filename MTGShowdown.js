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
  document.getElementById("playScreen").style.display = "none";
}
function returnToMain() {
  document.getElementById("mainScreen").style.display = "block";
  document.getElementById("deckBuilder").style.display = "none";
  document.getElementById("playScreen").style.display = "none";
}
window.showDeckBuilder = showDeckBuilder;
window.returnToMain = returnToMain;
// =====================

// Deck selection (exposed for HTML onchange)

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
// Auth & deck saving/loading (unchanged logic, just wired up)
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

window.login = login; window.signup = signup; window.logout = logout;



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

// Card Search (uses Scryfall responses)

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

// Deck Legality (unchanged logic)

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

// Start Game: ensure type_lines & mana_cost present

async function ensureTypeLines(deck) {

  // deck is array of card objects; if missing scryfallId prefer fetch by name

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

          // prefer the normal image if available

          card.image = card.image || data.image_uris?.normal || card.image || "";

          // store id if available

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

  // Fisher-Yates - strong shuffle

  for (let i = array.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];

  }

  return array;

}



async function startGame() {

  if (!currentDeck.cards || getDeckSize() === 0) { alert("Your deck is empty!"); return; }

  let full = [];

  currentDeck.cards.forEach(c => {

    for (let i=0;i<(c.qty||0);i++) full.push({ ...c });

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

  if (!deckSelect || !deckSelect.value) { alert("Please select a deck from the main screen first!"); return; }

  const selectedDeckId = deckSelect.value;

  db.collection("decks").doc(selectedDeckId).get()

    .then(doc => {

      if (!doc.exists) return alert("Selected deck not found.");

      currentDeck = doc.data(); currentDeck.id = doc.id; if (!currentDeck.cards) currentDeck.cards = [];

      checkDeckLegality().then(isLegal => {

        if (isLegal) {

          document.getElementById("mainScreen").style.display = "none";

          document.getElementById("deckBuilder").style.display = "none";

          document.getElementById("playScreen").style.display = "block";

          startGame();

        }

      });

    }).catch(err => { console.error("Error loading deck:", err); alert("Failed to load deck!"); });

}

window.goToPlayScreen = goToPlayScreen;

window.playDeck = goToPlayScreen;



// =====================

// Mana parsing & helpers

function parseManaCost(manaCost) {

  // returns object {W:0,U:0,B:0,R:0,G:0,C:0}

  const mana = { W:0, U:0, B:0, R:0, G:0, C:0 };

  if (!manaCost) return mana;

  // match {X} tokens

  const tokens = manaCost.match(/\{([^}]+)\}/g) || [];

  for (let t of tokens) {

    const sym = t.replace(/[{}]/g, '').trim();

    // numeric generic like "3"

    if (/^\d+$/.test(sym)) {

      mana.C += Number(sym);

    } else {

      // consider only single-letter color symbols W U B R G

      const letter = sym[0].toUpperCase();

      if (["W","U","B","R","G"].includes(letter)) mana[letter]++;

      else mana.C++; // fallback: treat unknown as colorless

    }

  }

  return mana;

}



// When player clicks a land on battlefield, call this with its index

async function tapLandForManaByIndex(index) {

  const land = player.battlefield[index];

  if (!land || land.isTapped) return;



  land.isTapped = true;

  const pool = player.manaPool || { W:0, U:0, B:0, R:0, G:0, C:0 };



  // Try to fill in produced_mana if not already stored

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



  // If Scryfall data says what it produces

  if (Array.isArray(land.produced_mana) && land.produced_mana.length > 0) {

    if (land.produced_mana.length === 1) {

      const color = land.produced_mana[0];

      pool[color] = (pool[color] || 0) + 1;

      console.log(`${land.name} produced ${color} mana`);

    } else {

      // Multi-color land (e.g., shockland, triome)

      const choice = prompt(`Choose mana color for ${land.name}:\n${land.produced_mana.join(", ")}`);

      const selected = (land.produced_mana.includes(choice?.toUpperCase())) ? choice.toUpperCase() : land.produced_mana[0];

      pool[selected] = (pool[selected] || 0) + 1;

      console.log(`${land.name} produced ${selected} mana`);

    }

  } else {

    // fallback: basic or unknown land

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

function getCardSection(card) {

  if (!card.type_line) return "Other";

  const type = card.type_line;



  if (type.includes("Land")) return "Land";

  if (type.includes("Creature")) return "Creature";

  if (type.includes("Enchantment")) return "Enchantment";

  if (type.includes("Artifact")) return "Artifact";

  if (type.includes("Planeswalker")) return "Planeswalker";

  return "Other";

}

// Check if pool can pay required mana (colored amounts must match, generic can use anything)

function canPayMana(cost) {

  const pool = {...player.manaPool};

  // check colored requirements

  for (const col of ["W","U","B","R","G"]) {

    const need = cost[col] || 0;

    if (need > (pool[col] || 0)) return false;

    pool[col] -= need;

  }

  // generic / colorless (C) must be paid from any remaining mana

  const genericNeed = cost.C || 0;

  let available = pool.W + pool.U + pool.B + pool.R + pool.G + pool.C;

  return available >= genericNeed;

}



// pay mana from pool (assumes canPayMana returned true)

function payMana(cost) {

  for (const col of ["W","U","B","R","G"]) {

    const use = Math.min(player.manaPool[col] || 0, cost[col] || 0);

    player.manaPool[col] -= use;

  }

  // generic cost: consume any mana from colors first then C

  let generic = cost.C || 0;

  const order = ["W","U","B","R","G","C"];

  for (const sym of order) {

    while (generic > 0 && player.manaPool[sym] > 0) {

      player.manaPool[sym]--;

      generic--;

    }

  }

}



// Try to auto-tap untapped lands until canPayMana(cost) or no lands left

// Strategy: tap lands that produce needed colors first, then any land for generic

function autoTapLandsForCost(cost) {

  // if already payable, nothing to do

  if (canPayMana(cost)) return true;



  // prepare list of untapped lands with their color result

  const untapped = player.battlefield.map((c,i) => ({c,i}))

    .filter(x => isLand(x.c) && !x.c.isTapped);



  // Helper to tap single land of a desired color if available

  const tapOneOfColor = (colorChars) => {

    for (let i=0;i<untapped.length;i++) {

      const ent = untapped[i];

      const tl = (ent.c.type_line || "").toLowerCase();

      const producedColor = tl.includes("plains") ? "W"

                         : tl.includes("island") ? "U"

                         : tl.includes("swamp") ? "B"

                         : tl.includes("mountain") ? "R"

                         : tl.includes("forest") ? "G" : "C";

      if (colorChars.includes(producedColor)) {

        tapLandForManaByIndex(ent.i);

        // remove this entry so we don't tap same land twice

        untapped.splice(i,1);

        return true;

      }

    }

    return false;

  };

  function playLand(card) {

  const entersTapped = card.entersTapped || false; // set this manually or via Scryfall oracle text

  player.battlefield.push({ ...card, isTapped: entersTapped });

  player.hand.splice(player.hand.indexOf(card), 1);

  player.landsPlayed++;

  renderPlayScreen();

}



  // First satisfy colored requirements by tapping lands that produce those colors

  for (const col of ["W","U","B","R","G"]) {

    const need = (cost[col] || 0) - (player.manaPool[col] || 0);

    for (let t=0; t<need; t++) {

      const tapped = tapOneOfColor([col]);

      if (!tapped) break;

    }

  }



  // If still can't pay, tap any remaining lands (for generic)\

  cost = getCreatureCost(card);

  while (!canPayMana(cost) && untapped.length > 0) {

    // tap the first remaining

    const ent = untapped.shift();

    tapLandForManaByIndex(ent.i);

  }

payMana(cost);

}

function moveToGraveyard(card, from) {

  // from: "hand" | "battlefield"

  player.graveyard.push(card);

  if (from === "hand") player.hand = player.hand.filter(c => c !== card);

  else if (from === "battlefield") player.battlefield = player.battlefield.filter(c => c !== card);

  renderPlayScreen();

}



// =====================

// Card rules helpers

function isLand(card) {

  return !!(card && card.type_line && card.type_line.toLowerCase().includes("land"));

}

function isPermanent(card) {

  if (!card || !card.type_line) return false;

  const t = card.type_line.toLowerCase();

  return t.includes("creature") || t.includes("artifact") || t.includes("enchantment") || t.includes("planeswalker") || t.includes("land");

}



function getCardManaCostCount(card) {

  if (!card || !card.mana_cost) return 0;

  const matches = card.mana_cost.match(/\{[^}]+\}/g);

  return matches ? matches.length : 0;

}

function getCreatureCost(card) {

  let cost = parseManaCost(card.mana_cost);

  if (card.affinity) {

    // card.affinity = {type:"artifact"}

    const count = player.battlefield.filter(c => c.type_line.toLowerCase().includes(card.affinity.type)).length;

    cost.C = Math.max(0, cost.C - count); // reduce generic mana cost

  }

  return cost;

}



// =====================

// Play logic: play a card from hand

function playCard(index) {

  const card = player.hand[index];

  if (!card) return;

  console.log("Attempting to play:", card.name, "type_line:", card.type_line, "mana_cost:", card.mana_cost);



  if (isLand(card)) {

    if (player.landsPlayed >= 1) { alert("You already played a land this turn!"); return; }

    player.hand.splice(index,1);

    player.battlefield.push({...card, isTapped:false});

    player.landsPlayed++;

    renderPlayScreen();

    return;

  }



  if (!isPermanent(card)) {

    alert("Only permanents (creature, artifact, enchantment, planeswalker) can be played to the battlefield!");

    return;

  }



  const cost = parseManaCost(card.mana_cost || "");

  console.log("Parsed cost:", cost);



  // Try to auto-tap lands to generate mana (if needed)

  if (!canPayMana(cost)) {

    const tappedEnough = autoTapLandsForCost(cost);

    if (!tappedEnough) { alert("Not enough mana! Tap lands manually or add lands."); return; }

  }



  // pay

  payMana(cost);



  // move card

  player.hand.splice(index,1);

  player.battlefield.push({...card, isTapped:false});

  renderPlayScreen();

}

window.playCard = playCard;

function playInstant(index) {

  const card = player.hand[index];

  if (!card || !card.type_line.toLowerCase().includes("instant")) return;

  // For now, just trigger the effect placeholder

  alert(`${card.name} resolves!`);

  moveToGraveyard(card, "hand");

}



// tapCard for clicking land on battlefield (index)

function tapCard(index) {

  const card = player.battlefield[index];

  if (!card || !isLand(card) || card.isTapped) return;

  tapLandForManaByIndex(index);

}

window.tapCard = tapCard;

function tapCreatureForMana(index) {

  const creature = player.battlefield[index];

  if (!creature || !creature.type_line.toLowerCase().includes("creature")) return;

  if (creature.isTapped) return;



  creature.isTapped = true;

  const produced = creature.produced_mana || []; // array of mana symbols

  const pool = player.manaPool;

  produced.forEach(m => pool[m] = (pool[m] || 0) + 1);

  player.manaPool = pool;

  renderPlayScreen();

}



function endTurn() {

  // Untap all permanents

  player.battlefield.forEach(c => c.isTapped = false);

  // draw

  if (player.deck.length > 0) player.hand.push(player.deck.shift());

  player.landsPlayed = 0;

  // clear mana pool at EOT

  player.manaPool = { W:0, U:0, B:0, R:0, G:0, C:0 };

  player.turn++;

  renderPlayScreen();

}

window.endTurn = endTurn;



// =====================

// Render play screen (fixed)

function renderPlayScreen() {

  const handDiv = document.getElementById("hand");

  const battlefieldDiv = document.getElementById("battlefield");

  const opponentField = document.getElementById("opponentBattlefield");

  const manaDiv = document.getElementById("manaCount");

  const turnDiv = document.getElementById("turnCounter");



  if (!handDiv || !battlefieldDiv || !opponentField || !manaDiv || !turnDiv) return;



  // Clear everything

  handDiv.innerHTML = "";

  battlefieldDiv.innerHTML = "";

  opponentField.innerHTML = "";



  // ===== HAND =====

  player.hand.forEach((card, idx) => {

    const img = document.createElement("img");

    img.src = card.image || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;

    img.className = "card";

    img.style.cursor = "pointer";

    img.onclick = () => playCard(idx);

    img.onmouseenter = () => showCardPreview(card);

    img.onmouseleave = hideCardPreview;

    handDiv.appendChild(img);

  });



  // ===== PLAYER BATTLEFIELD =====

  const sections = {

    Land: [],

    Creature: [],

    Enchantment: [],

    Artifact: [],

    Planeswalker: [],

    Other: []

  };



  player.battlefield.forEach(card => {

    const sec = getCardSection(card);

    sections[sec].push(card);

  });



  Object.entries(sections).forEach(([title, cards]) => {

    if (cards.length === 0) return;



    const secDiv = document.createElement("div");

    secDiv.className = "battlefield-section";

    const label = document.createElement("div");

    label.className = "battlefield-label";

    label.innerText = title;

    secDiv.appendChild(label);



    const row = document.createElement("div");

    row.className = "battlefield-row";



    cards.forEach(card => {

      const img = document.createElement("img");

      img.src = card.image || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;

      img.className = "card battlefield-card";

      img.style.transform = card.isTapped ? "rotate(90deg)" : "rotate(0deg)";

      img.style.filter = card.isTapped ? "grayscale(70%)" : "none";



      img.onmouseenter = () => showCardPreview(card);

      img.onmouseleave = hideCardPreview;



      if (isLand(card)) {

        img.style.cursor = "pointer";

        img.onclick = () => tapLandForManaByIndex(player.battlefield.indexOf(card));

      }



      row.appendChild(img);

    });



    secDiv.appendChild(row);

    battlefieldDiv.appendChild(secDiv);

  });



  // ===== OPPONENT FIELD =====

  if (opponent && opponent.battlefield) {

    const oppSections = {

      Land: [],

      Creature: [],

      Enchantment: [],

      Artifact: [],

      Planeswalker: [],

      Other: []

    };



    opponent.battlefield.forEach(card => {

      const sec = getCardSection(card);

      oppSections[sec].push(card);

    });



    Object.entries(oppSections).forEach(([title, cards]) => {

      if (cards.length === 0) return;



      const secDiv = document.createElement("div");

      secDiv.className = "battlefield-section opponent-section";

      const label = document.createElement("div");

      label.className = "battlefield-label";

      label.innerText = title;

      secDiv.appendChild(label);



      const row = document.createElement("div");

      row.className = "battlefield-row";



      cards.forEach(card => {

        const img = document.createElement("img");

        img.src = card.image || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;

        img.className = "card battlefield-card opponent-card";

        img.onmouseenter = () => showCardPreview(card);

        img.onmouseleave = hideCardPreview;

        row.appendChild(img);

      });

      secDiv.appendChild(row);

      opponentField.appendChild(secDiv);

    });
    const graveyardDiv = document.getElementById("graveyard");
    graveyardDiv.innerHTML = "";
     player.graveyard.forEach(c => {
    const img = document.createElement("img");
     img.src = c.image;
    img.className = "card small-card";
    graveyardDiv.appendChild(img);
  }
  });
  // ===== MANA + TURN =====
  const pool = player.manaPool || { W:0, U:0, B:0, R:0, G:0, C:0 };
  manaDiv.innerText = `Mana: W:${pool.W} U:${pool.U} B:${pool.B} R:${pool.R} G:${pool.G} C:${pool.C}`;
  turnDiv.innerText = `Turn: ${player.turn}`;
  // ===== END TURN BUTTON =====
  let endTurnContainer = document.getElementById("endTurnContainer");
  if (!endTurnContainer) {
    endTurnContainer = document.createElement("div");
    endTurnContainer.id = "endTurnContainer";
    document.getElementById("playScreen").appendChild(endTurnContainer);

  }
  endTurnContainer.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "small-button end-turn-btn";
  btn.innerText = "End Turn";
  btn.onclick = endTurn;
  endTurnContainer.appendChild(btn);

}
// =====================

// Hover preview helpers

function showCardPreview(card) {
  const previewDiv = document.getElementById("hoverPreview");
  const previewImg = document.getElementById("hoverPreviewImg");
  if (!previewDiv || !previewImg || !card) return;
  const src = card.image || (card.name ? `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image` : "");
  if (!src) return;
  previewImg.src = src;
  previewDiv.style.display = "block";
 document.onmousemove = (e) => {
    previewDiv.style.left = (e.pageX + 20) + "px";
    previewDiv.style.top = (e.pageY + 20) + "px";
  };
}
function hideCardPreview() {
  const previewDiv = document.getElementById("hoverPreview");
 const previewImg = document.getElementById("hoverPreviewImg");
  if (!previewDiv || !previewImg) return;
  previewDiv.style.display = "none";
  previewImg.src = "";
  document.onmousemove = null;
}

window.showCardPreview = showCardPreview;

window.hideCardPreview = hideCardPreview;
