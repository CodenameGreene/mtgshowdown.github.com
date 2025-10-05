// =====================
// MTG Showdown JS
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
    landsPlayed: 0,
    turn: 1
};

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
window.mainScreenDeckChanged = mainScreenDeckChanged;
function updatePlayButton() {
    const selected = document.getElementById("mainDeckSelect").value;
    document.getElementById("playButton").disabled = !selected;
}
window.updatePlayButton = updatePlayButton;


function goToPlayScreen() {
    const deckSelect = document.getElementById("mainDeckSelect");
    if (!deckSelect || !deckSelect.value) {
        alert("Please select a deck from the main screen first!");
        return;
    }

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
            });
        })
        .catch(err => {
            console.error("Error loading deck:", err);
            alert("Failed to load deck!");
        });
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
// Load Decks
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
                option.textContent = `${data.name} (${data.format})`;
                deckSelect.appendChild(option);
            });
        });
}
window.loadUserDecks = loadUserDecks;

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
// Deck Builder
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
        db.collection("decks").doc(currentDeck.id).set({
            owner: user.uid,
            name,
            format,
            cards: currentDeck.cards
        }).then(() => {
            alert("Deck updated!");
            loadSavedDecks();
        });
    } else {
        db.collection("decks").add({
            owner: user.uid,
            name,
            format,
            cards: currentDeck.cards
        }).then(() => {
            alert("Deck saved!");
            loadSavedDecks();
        });
    }
}
window.saveDeck = saveDeck;

function loadSelectedDeck() {
    const deckId = document.getElementById("savedDecks").value;
    if (!deckId) return;

    db.collection("decks").doc(deckId).get()
        .then(doc => {
            if (!doc.exists) return alert("Deck not found.");

            currentDeck = doc.data();
            currentDeck.id = doc.id;
            if (!currentDeck.cards) currentDeck.cards = [];

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
        const nameSpan = li.querySelector(".card-name");

        // Hover preview
        nameSpan.addEventListener("mouseenter", () => showCardPreview(card));
        nameSpan.addEventListener("mouseleave", hideCardPreview);

        // Click to Scryfall
        nameSpan.addEventListener("click", () => card.scryfall && window.open(card.scryfall, "_blank"));

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

function getDeckSize() {
    return currentDeck.cards.reduce((total, card) => total + (card.qty || 0), 0);
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
            const nameSpan = cardDiv.querySelector(".card-name");

            nameSpan.addEventListener("mouseenter", () => showCardPreview({
                name: card.name,
                image: card.image_uris ? card.image_uris.normal : "",
            }));
            nameSpan.addEventListener("mouseleave", hideCardPreview);

            cardDiv.querySelector("button").addEventListener("click", () => {
                const existing = currentDeck.cards.find(c => c.name === card.name);
                if (existing) existing.qty += 1;
                else currentDeck.cards.push({
                    name: card.name,
                    qty: 1,
                    image: card.image_uris ? card.image_uris.normal : "",
                    scryfall: card.scryfall_uri,
                    type_line: card.type_line || "Unknown"
                });
                renderDeck();
            });

            resultsDiv.appendChild(cardDiv);
        });
    } catch (err) {
        console.error(err);
    }
}
window.searchCards = searchCards;

// =====================
// Deck Legality
// =====================
async function checkDeckLegality() {
    const format = document.getElementById("menuButton").innerText.replace(' ▾', '');
    const deckSize = getDeckSize();

    if (!format) {
        alert("Select a format on the main screen.");
        document.getElementById("playButton").disabled = true;
        return false;
    }

    if (format === "Booster Draft") {
        document.getElementById("playButton").disabled = false;
        return true;
    }

    if ((format === "Commander" && deckSize !== 100) || (format !== "Commander" && deckSize < 60)) {
        const required = format === "Commander" ? 100 : 60;
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
        } catch {
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

// =====================
// Start Game
// =====================
async function ensureTypeLines(deck) {
    for (let card of deck) {
        if (!card.type_line && card.scryfallId) {
            try {
                const res = await fetch(`https://api.scryfall.com/cards/${card.scryfallId}`);
                const data = await res.json();
                card.type_line = data.type_line || "Unknown";
            } catch {
                card.type_line = "Unknown";
            }
        } else if (!card.type_line) {
            card.type_line = "Unknown";
        }
    }
    return deck;
}

async function startGame() {
    if (!currentDeck.cards || getDeckSize() === 0) {
        alert("Your deck is empty!");
        return;
    }

    let fullDeck = [];
    currentDeck.cards.forEach(c => {
        for (let i = 0; i < c.qty; i++) fullDeck.push({ ...c });
    });

    fullDeck = await ensureTypeLines(fullDeck);
    fullDeck.sort(() => Math.random() - 0.5);

    player.deck = fullDeck;
    player.hand = player.deck.splice(0, 7);
    player.battlefield = [];
    player.landsPlayed = 0;
    player.turn = 1;

    renderPlayScreen();
}

// =====================
// Helpers
// =====================
function isLand(card) {
    return card.type_line && card.type_line.toLowerCase().includes("land");
}

function isPermanent(card) {
    if (!card.type_line) return false;
    const type = card.type_line.toLowerCase();
    return type.includes("creature") || type.includes("artifact") || type.includes("enchantment") || type.includes("planeswalker") || type.includes("land");
}

function getCardManaCost(card) {
    if (!card.mana_cost) return 0;
    const matches = card.mana_cost.match(/\{[^}]+\}/g);
    return matches ? matches.length : 0;
}

// =====================
// Play Logic
// =====================
function playCard(index) {
    const card = player.hand[index];
    if (!card) return;

    if (isLand(card)) {
        if (player.landsPlayed >= 1) {
            alert("You already played a land this turn!");
            return;
        }
        player.hand.splice(index, 1);
        player.battlefield.push({ ...card, isTapped: false });
        player.landsPlayed++;
        renderPlayScreen();
        return;
    }

    if (!isPermanent(card)) {
        alert("Only permanents (creature, artifact, enchantment, planeswalker) can be played!");
        return;
    }

    const cost = getCardManaCost(card);
    const untappedLands = player.battlefield.filter(c => isLand(c) && !c.isTapped);
    if (untappedLands.length < cost) {
        alert("Not enough mana! Tap more lands first.");
        return;
    }

    for (let i = 0; i < cost; i++) untappedLands[i].isTapped = true;
    player.hand.splice(index, 1);
    player.battlefield.push({ ...card, isTapped: false });
    renderPlayScreen();
}

function tapCard(index) {
    const card = player.battlefield[index];
    if (!card || !isLand(card) || card.isTapped) return;
    card.isTapped = true;
    renderPlayScreen();
}

function endTurn() {
    player.battlefield.forEach(card => card.isTapped = false);
    if (player.deck.length > 0) player.hand.push(player.deck.shift());
    player.landsPlayed = 0;
    player.turn++;
    renderPlayScreen();
}

// =====================
// Play Screen Rendering
// =====================
function renderPlayScreen() {
    const handDiv = document.getElementById("hand");
    const battlefieldDiv = document.getElementById("battlefield");
    const manaDiv = document.getElementById("manaCount");
    const turnDiv = document.getElementById("turnCounter");
    const endTurnContainer = document.getElementById("endTurnContainer");

    if (!handDiv || !battlefieldDiv || !manaDiv || !turnDiv) return;

    handDiv.innerHTML = "";
    battlefieldDiv.innerHTML = "";

    // Render hand
    player.hand.forEach((card, index) => {
        const img = document.createElement("img");
        img.src = card.image || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;
        img.classList.add("card");
        img.style.cursor = "pointer";
        img.onclick = () => playCard(index);
        img.onmouseenter = () => showCardPreview(card);
        img.onmouseleave = hideCardPreview;
        handDiv.appendChild(img);
    });

    // Render battlefield
    player.battlefield.forEach((card, index) => {
        const img = document.createElement("img");
        img.src = card.image || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;
        img.classList.add("card", "battlefield-card");
        img.style.cursor = isLand(card) ? "pointer" : "default";
        img.style.transform = card.isTapped ? "rotate(90deg)" : "rotate(0deg)";
        img.style.filter = card.isTapped ? "grayscale(70%)" : "none";
        img.onclick = () => { if (isLand(card)) tapCard(index); };
        img.onmouseenter = () => showCardPreview(card);
        img.onmouseleave = hideCardPreview;
        battlefieldDiv.appendChild(img);
    });

    // Update mana and turn
    const untappedLands = player.battlefield.filter(c => isLand(c) && !c.isTapped).length;
    manaDiv.innerText = `Mana: ${untappedLands}`;
    turnDiv.innerText = `Turn: ${player.turn}`;

    // End Turn button
    if (endTurnContainer) {
        endTurnContainer.innerHTML = "";
        const btn = document.createElement("button");
        btn.innerText = "End Turn";
        btn.classList.add("end-turn-btn");
        btn.onclick = endTurn;
        endTurnContainer.appendChild(btn);
    }
}

// =====================
// Card Hover Preview
// =====================
function showCardPreview(card) {
    const previewDiv = document.getElementById("hoverPreview");
    const previewImg = document.getElementById("hoverPreviewImg");
    if (!previewDiv || !previewImg || !card) return;

    const imgSrc = card.image || (card.name ? `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image` : "");
    if (!imgSrc) return;

    previewImg.src = imgSrc;
    previewDiv.style.display = "block";

    document.onmousemove = (e) => {
        previewDiv.style.left = e.pageX + 20 + "px";
        previewDiv.style.top = e.pageY + 20 + "px";
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
