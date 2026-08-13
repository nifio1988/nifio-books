/* ============================================================
   NIFIO-GAMES — hub triggers + NIFIO-BOOKS MEMORY
   ============================================================

   This file owns the NIFIO-GAMES hub modal (the trigger buttons that used
   to open NIFIO-BRICKS directly now open this hub instead) and the new
   NIFIO-BOOKS MEMORY game. It reuses window.NifioOverlay (exposed by
   app.js) for modal open/close/scroll-lock/ESC/outside-click instead of
   reimplementing any of that — same pattern auth.js already uses.

   The Memory deck is never hardcoded: it's built at runtime from
   books.json's real cover -> title pairs (deduped by cover, since two
   editions of GIOVINAZZO share one cover image), so every card the player
   sees always matches a real book in the catalog. */

const PAIRS_PER_GAME = 8;
const MISMATCH_DELAY = 900;

const gamesOverlay = document.getElementById("gamesOverlay");
// Not "animOverlay" — app.js already declares that name at the top level,
// and since both files are classic (non-module) scripts, they share one
// global lexical scope. Redeclaring it here throws a SyntaxError that
// silently aborts this entire script before any listener gets attached.
const bricksOverlay = document.getElementById("animOverlay");
const memoryOverlay = document.getElementById("memoryOverlay");
const memoryBoard = document.getElementById("memoryBoard");
const memoryPairsEl = document.getElementById("memoryPairs");
const memoryMovesEl = document.getElementById("memoryMoves");
const memoryEndOverlay = document.getElementById("memoryEndOverlay");
const memoryEndMoves = document.getElementById("memoryEndMoves");
const memoryRestartBtn = document.getElementById("memoryRestartBtn");

let coverPool = null;
let coverPoolPromise = null;

let flipped = [];
let matchedCount = 0;
let totalPairs = 0;
let moves = 0;
let boardLocked = false;
let pendingTimeoutId = null;

/* ---------------- deck data (books.json -> cover/title pool) ---------------- */

function loadCoverPool() {
  if (coverPoolPromise) return coverPoolPromise;

  coverPoolPromise = fetch("books.json")
    .then((r) => r.json())
    .then((data) => {
      const byCover = new Map();
      data.forEach((book) => {
        if (book.cover && book.title && !byCover.has(book.cover)) {
          byCover.set(book.cover, book.title);
        }
      });
      coverPool = Array.from(byCover, ([cover, title]) => ({ cover, title }));
      return coverPool;
    });

  return coverPoolPromise;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRoundBooks(pool) {
  const count = Math.min(PAIRS_PER_GAME, pool.length);
  return shuffle(pool.slice()).slice(0, count);
}

/* ---------------- card element ---------------- */

function buildCardElement(book) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "memory-card";
  card.setAttribute("aria-label", "Carta coperta");
  card.setAttribute("aria-pressed", "false");
  card._book = book;

  const inner = document.createElement("span");
  inner.className = "memory-card-inner";

  const back = document.createElement("span");
  back.className = "memory-card-face memory-card-back";
  back.setAttribute("aria-hidden", "true");
  const logo = document.createElement("span");
  logo.className = "memory-card-logo";
  logo.textContent = "NIFIO";
  back.appendChild(logo);

  const front = document.createElement("span");
  front.className = "memory-card-face memory-card-front";

  const coverWrap = document.createElement("span");
  coverWrap.className = "memory-card-cover";
  const img = document.createElement("img");
  img.className = "memory-card-img";
  img.src = book.cover;
  img.alt = "";
  img.loading = "lazy";
  coverWrap.appendChild(img);

  const titleEl = document.createElement("span");
  titleEl.className = "memory-card-title";
  titleEl.textContent = book.title;

  front.appendChild(coverWrap);
  front.appendChild(titleEl);

  inner.appendChild(back);
  inner.appendChild(front);
  card.appendChild(inner);

  return card;
}

/* ---------------- game state ---------------- */

function updateHud() {
  memoryPairsEl.textContent = `COPPIE: ${matchedCount} / ${totalPairs}`;
  memoryMovesEl.textContent = `MOSSE: ${moves}`;
}

function clearPendingTimeout() {
  if (pendingTimeoutId) {
    window.clearTimeout(pendingTimeoutId);
    pendingTimeoutId = null;
  }
}

function resetBoard(pool) {
  clearPendingTimeout();
  flipped = [];
  matchedCount = 0;
  moves = 0;
  boardLocked = false;
  memoryEndOverlay.classList.add("is-hidden");

  const roundBooks = pickRoundBooks(pool);
  totalPairs = roundBooks.length;

  const deck = [];
  roundBooks.forEach((book) => {
    deck.push(book, book);
  });
  shuffle(deck);

  memoryBoard.innerHTML = "";
  deck.forEach((book) => {
    memoryBoard.appendChild(buildCardElement(book));
  });

  updateHud();
}

function showLoadError() {
  memoryBoard.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = "modal-lead";
  msg.textContent = "Impossibile caricare i libri per il Memory. Riprova più tardi.";
  memoryBoard.appendChild(msg);
}

function setCardFlipped(card, isFlipped) {
  card.classList.toggle("is-flipped", isFlipped);
  card.setAttribute("aria-pressed", String(isFlipped));
  card.setAttribute("aria-label", isFlipped ? `Carta scoperta: ${card._book.title}` : "Carta coperta");
}

function showWin() {
  memoryEndMoves.textContent = `Completato in ${moves} mosse.`;
  memoryEndOverlay.classList.remove("is-hidden");
  memoryRestartBtn.focus({ preventScroll: true });
}

function onCardActivate(card) {
  if (boardLocked) return;
  if (card.classList.contains("is-flipped") || card.classList.contains("is-matched")) return;
  if (flipped.length >= 2) return;

  setCardFlipped(card, true);
  flipped.push(card);

  if (flipped.length < 2) return;

  moves++;
  updateHud();

  const [a, b] = flipped;
  if (a._book.cover === b._book.cover) {
    a.classList.add("is-matched", "is-match-correct");
    b.classList.add("is-matched", "is-match-correct");
    a.setAttribute("aria-label", `Coppia trovata: ${a._book.title}`);
    b.setAttribute("aria-label", `Coppia trovata: ${b._book.title}`);
    matchedCount++;
    updateHud();
    flipped = [];

    if (matchedCount === totalPairs) {
      showWin();
    }
  } else {
    boardLocked = true;
    a.classList.add("is-match-wrong");
    b.classList.add("is-match-wrong");

    pendingTimeoutId = window.setTimeout(() => {
      setCardFlipped(a, false);
      setCardFlipped(b, false);
      a.classList.remove("is-match-wrong");
      b.classList.remove("is-match-wrong");
      flipped = [];
      boardLocked = false;
      pendingTimeoutId = null;
    }, MISMATCH_DELAY);
  }
}

memoryBoard.addEventListener("click", (e) => {
  const card = e.target.closest(".memory-card");
  if (card) onCardActivate(card);
});

memoryRestartBtn.addEventListener("click", () => {
  if (coverPool) resetBoard(coverPool);
});

function startMemoryGame() {
  loadCoverPool()
    .then((pool) => resetBoard(pool))
    .catch(showLoadError);
}

function stopMemoryGame() {
  clearPendingTimeout();
  flipped = [];
  boardLocked = false;
}

memoryOverlay.addEventListener("overlay:open", startMemoryGame);
memoryOverlay.addEventListener("overlay:close", stopMemoryGame);

/* ---------------- NIFIO-GAMES hub triggers ---------------- */

document.querySelectorAll(".js-open-games").forEach((btn) => {
  btn.addEventListener("click", () => window.NifioOverlay.open(gamesOverlay, btn));
});

document.querySelectorAll(".js-open-bricks").forEach((btn) => {
  btn.addEventListener("click", () => {
    window.NifioOverlay.close(gamesOverlay);
    window.NifioOverlay.open(bricksOverlay, btn);
  });
});

document.querySelectorAll(".js-open-memory").forEach((btn) => {
  btn.addEventListener("click", () => {
    window.NifioOverlay.close(gamesOverlay);
    window.NifioOverlay.open(memoryOverlay, btn);
  });
});
