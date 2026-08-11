/* ============================================================
   NIFIO BOOKS — application script
   ============================================================ */

const RELEASE_TARGET = new Date("2026-07-24T00:00:00").getTime();

const WHATSAPP_NUMBER = "393490077537";
const WHATSAPP_MESSAGE = "Ciao Nicola, ho visitato NIFIO BOOKS e vorrei avere maggiori informazioni sui tuoi libri.";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

document.querySelectorAll(".js-whatsapp-link").forEach((el) => {
  el.href = WHATSAPP_HREF;
});

const collections = [
  {
    name: "COLLANA DI MERDA",
    description: "Una serie ironica sul mondo del lavoro e le sue dinamiche tossiche.",
    image: "images/collana-merda.jfif",
    books: [
      "LAVORO DI MERDA",
      "VITA DI MERDA: Manuale di resistenza quotidiana",
      "SETTIMANA DI MERDA: Manuale della gestione della disperazione",
      "CAPO DI MERDA: Manuale dell'Ammutinamento",
      "FERIE DI MERDA: Manuale di Diritto alla Disconnessione",
      "COLLEGA DI MERDA: Manuale Anti-Omicidio",
      "NATALE DI MERDA: Manuale di Sopravvivenza all'Avvento",
      "AZIENDA DI MERDA"
    ]
  },
  {
    name: "VISIONI FANTASTICHE",
    description: "Libri da colorare per adulti su mondi fantastici e immaginari.",
    tagline: "Libri da colorare per adulti",
    image: "images/collana-fantastiche.jfif",
    books: [
      "AEROPLANI FANTASTICI E DOVE TROVARLI",
      "ARCHITETTURE FANTASTICHE E DOVE TROVARLE",
      "IMBARCAZIONI FANTASTICHE E DOVE TROVARLE",
      "ROBOT FANTASTICI E DOVE TROVARLI"
    ]
  },
  {
    name: "EROI IN DIVISA",
    description: "Storie dedicate alle forze armate e ai corpi dello Stato.",
    image: "images/collana-eroi.jfif",
    books: [
      "VIRGO FIDELIS: La Storia dell'Arma dei Carabinieri",
      "FUOCO E CORAGGIO: La Storia dei Vigili del Fuoco in Italia",
      "VELOCITÀ E ONORE: La Storia dell’Aeronautica Militare Italiana"
    ]
  },
  {
    name: "DIARI SELF-HELP",
    description: "Una serie di diari guidati per crescita personale, benessere emotivo e miglioramento delle abitudini quotidiane.",
    image: "images/collana-diari-selfhelp.jfif",
    books: [
      "DIARIO DELLA MOTIVAZIONE",
      "DIARIO DELLE EMOZIONI",
      "DIARIO DELLE ABITUDINI",
      "DIARIO DEL TEMPO",
      "DIARIO DEL SONNO",
      "DIARIO ANTI-ANSIA",
      "DIARIO DELLA PRODUTTIVITÀ",
      "DIARIO DELL'AUTOSTIMA",
      "DIARIO DELLA GRATITUDINE"
    ]
  }
];

let books = [];
let activeCategory = "Tutti";

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const categoriesDiv = document.getElementById("categories");
const collectionsGrid = document.getElementById("collectionsGrid");
const authorCollections = document.getElementById("authorCollections");

/* ---------------- overlay / modal management ---------------- */

let openOverlaysCount = 0;
let lastFocusedEl = null;

function openOverlay(overlay, triggerEl) {
  if (overlay.classList.contains("is-open")) return;

  lastFocusedEl = triggerEl || document.activeElement;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");

  if (openOverlaysCount === 0) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  openOverlaysCount++;

  const closeBtn = overlay.querySelector(".modal-close");
  if (closeBtn) closeBtn.focus({ preventScroll: true });

  overlay.dispatchEvent(new CustomEvent("overlay:open"));
}

function closeOverlay(overlay) {
  if (!overlay.classList.contains("is-open")) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

  openOverlaysCount = Math.max(0, openOverlaysCount - 1);
  if (openOverlaysCount === 0) {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  overlay.dispatchEvent(new CustomEvent("overlay:close"));

  if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
    lastFocusedEl.focus({ preventScroll: true });
  }
}

function closeAllOverlays() {
  document.querySelectorAll(".overlay.is-open").forEach(closeOverlay);
}

function initOverlays() {
  document.querySelectorAll(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay(overlay);
    });

    const closeBtn = overlay.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeOverlay(overlay));
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllOverlays();
  });
}

// Shared with auth.js (loaded as a separate module) so login/profile
// modals reuse the same scroll-lock/ESC/outside-click behavior instead
// of duplicating it.
window.NifioOverlay = { open: openOverlay, close: closeOverlay };

/* ---------------- libreria: fetch, render, filter ---------------- */

function init() {
  fetch("books.json")
    .then((r) => r.json())
    .then((data) => {
      books = data;
      renderGrid(books);
      renderCategories();
      renderCollections();
      renderAuthorCollections();
    })
    .catch(() => {
      grid.innerHTML = '<div class="empty-state"><strong>Catalogo non disponibile</strong><p>Riprova più tardi.</p></div>';
    });
}

function renderGrid(list) {
  grid.innerHTML = "";

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>Nessun libro trovato</strong><p>Prova con un'altra parola chiave o categoria.</p>";
    grid.appendChild(empty);
    return;
  }

  list.forEach((book) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.setAttribute("aria-label", `Apri la scheda di ${book.title}`);

    const comingBadge = book.prossimamente === true ? '<span class="badge badge-coming">Prossimamente</span>' : "";
    const tags = (book.category || []).map((c) => `<span class="tag">${c}</span>`).join("");

    card.innerHTML = `
      <div class="card-cover">
        ${comingBadge}
        <img src="${book.cover}" alt="Copertina di ${book.title}" loading="lazy">
      </div>
      <div class="card-body">
        <h3 class="card-title">${book.title}</h3>
        <div class="card-tags">${tags}</div>
      </div>
    `;

    card.addEventListener("click", () => openBookModal(book, card));

    grid.appendChild(card);
  });
}

function renderCategories() {
  const categories = ["Tutti", ...new Set(books.flatMap((b) => b.category || []))];

  categoriesDiv.innerHTML = "";

  categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-btn";
    if (category === activeCategory) btn.classList.add("active");
    btn.setAttribute("aria-pressed", category === activeCategory ? "true" : "false");
    btn.textContent = category;

    btn.addEventListener("click", () => {
      activeCategory = category;
      applyFilters();
      renderCategories();
    });

    categoriesDiv.appendChild(btn);
  });
}

function applyFilters() {
  const text = search.value.trim().toLowerCase();

  let filtered = books;

  if (activeCategory !== "Tutti") {
    filtered = filtered.filter((book) => (book.category || []).includes(activeCategory));
  }

  if (text) {
    filtered = filtered.filter(
      (book) =>
        book.title.toLowerCase().includes(text) ||
        (book.category || []).some((c) => c.toLowerCase().includes(text))
    );
  }

  renderGrid(filtered);
}

search.addEventListener("input", applyFilters);

/* ---------------- modal libro ---------------- */

const bookOverlay = document.getElementById("bookOverlay");
const mCover = document.getElementById("mCover");
const mTags = document.getElementById("mTags");
const mComing = document.getElementById("mComing");
const mTitle = document.getElementById("mTitle");
const mDesc = document.getElementById("mDesc");
const mSinossiLabel = document.getElementById("mSinossiLabel");
const mSinossi = document.getElementById("mSinossi");
const mLink = document.getElementById("mLink");

function openBookModal(book, triggerEl) {
  mCover.src = book.cover;
  mCover.alt = `Copertina di ${book.title}`;
  mTitle.textContent = book.title;
  mDesc.textContent = book.description || "";

  mTags.innerHTML = (book.category || []).map((c) => `<span class="tag">${c}</span>`).join("");

  mComing.classList.toggle("is-hidden", book.prossimamente !== true);

  const hasSinossi = Boolean(book.sinossi && book.sinossi.trim() !== "");
  mSinossiLabel.classList.toggle("is-hidden", !hasSinossi);
  mSinossi.classList.toggle("is-hidden", !hasSinossi);
  mSinossi.textContent = hasSinossi ? book.sinossi : "";

  const hasAmazon = Boolean(book.amazon && book.amazon.trim() !== "");
  mLink.classList.toggle("is-hidden", !hasAmazon);
  if (hasAmazon) {
    mLink.href = book.amazon;
  } else {
    mLink.removeAttribute("href");
  }

  openOverlay(bookOverlay, triggerEl);
}

/* ---------------- collane ---------------- */

function renderCollections() {
  collectionsGrid.innerHTML = "";

  collections.forEach((col) => {
    const matched = col.books.map((title) => books.find((b) => b.title === title)).filter(Boolean);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "collection-card";
    card.setAttribute("aria-label", `Scopri la collana ${col.name}`);

    card.innerHTML = `
      <div class="collection-media">
        <img src="${col.image}" alt="Copertina della collana ${col.name}" loading="lazy">
      </div>
      <div class="collection-body">
        <h3 class="collection-name">${col.name}</h3>
        <p class="collection-desc">${col.tagline ? `<strong>${col.tagline}.</strong> ` : ""}${col.description}</p>
        <div class="collection-meta">
          <span class="collection-count">${matched.length} titoli</span>
          <span class="collection-cta">Scopri la collana →</span>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openCollectionModal(col, matched, card));

    collectionsGrid.appendChild(card);
  });
}

const collectionOverlay = document.getElementById("collectionOverlay");
const colMedia = document.getElementById("colMedia");
const colName = document.getElementById("colName");
const colDesc = document.getElementById("colDesc");
const colList = document.getElementById("colList");

function openCollectionModal(col, matchedBooks, triggerEl) {
  colMedia.src = col.image;
  colMedia.alt = `Copertina della collana ${col.name}`;
  colName.textContent = col.name;
  colDesc.textContent = (col.tagline ? `${col.tagline}. ` : "") + col.description;

  colList.innerHTML = matchedBooks
    .map((book) => {
      const amazonBtn =
        book.amazon && book.amazon.trim() !== ""
          ? `<a class="btn btn-primary collection-book-amazon" href="${book.amazon}" target="_blank" rel="noopener noreferrer">Amazon</a>`
          : "";
      return `
        <li class="collection-book-row">
          <span class="collection-book-title">${book.title}</span>
          ${amazonBtn}
        </li>
      `;
    })
    .join("");

  openOverlay(collectionOverlay, triggerEl);
}

function renderAuthorCollections() {
  if (!authorCollections) return;
  authorCollections.innerHTML = collections.map((c) => `<span class="tag">${c.name}</span>`).join("");
}

/* ---------------- modal autore ---------------- */

const authorOverlay = document.getElementById("authorOverlay");

document.querySelectorAll(".js-open-author").forEach((btn) => {
  btn.addEventListener("click", () => openOverlay(authorOverlay, btn));
});

/* ---------------- modal libri in uscita ---------------- */

const releaseOverlay = document.getElementById("releaseOverlay");
const countdownGrid = document.getElementById("countdown");
const countdownExpired = document.getElementById("countdownExpired");
const elDays = document.getElementById("days");
const elHours = document.getElementById("hours");
const elMinutes = document.getElementById("minutes");
const elSeconds = document.getElementById("seconds");

function updateCountdown() {
  const now = Date.now();
  const diff = RELEASE_TARGET - now;

  if (diff <= 0) {
    countdownGrid.classList.add("is-hidden");
    countdownExpired.classList.remove("is-hidden");
    return;
  }

  countdownGrid.classList.remove("is-hidden");
  countdownExpired.classList.add("is-hidden");

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  elDays.textContent = String(days).padStart(2, "0");
  elHours.textContent = String(hours).padStart(2, "0");
  elMinutes.textContent = String(minutes).padStart(2, "0");
  elSeconds.textContent = String(seconds).padStart(2, "0");
}

setInterval(updateCountdown, 1000);
updateCountdown();

window.addEventListener("load", () => {
  openOverlay(releaseOverlay);
});

/* ---------------- gioco NIFIO ---------------- */

const animOverlay = document.getElementById("animOverlay");
const animFrame = document.querySelector(".animation-frame");
const animCanvas = document.getElementById("animCanvas");
const animCtx = animCanvas.getContext("2d");
const gameScoreEl = document.getElementById("gameScore");
const gameEndOverlay = document.getElementById("gameEndOverlay");
const gameEndTitle = document.getElementById("gameEndTitle");
const gameEndScore = document.getElementById("gameEndScore");
const gameRestartBtn = document.getElementById("gameRestartBtn");

const LETTER_PATTERNS = {
  N: ["10001", "11001", "10101", "10011", "10001"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  F: ["11111", "10000", "11110", "10000", "10000"],
  O: ["01110", "10001", "10001", "10001", "01110"]
};

let logicalWidth = 0;
let logicalHeight = 0;
let blocks = [];
let score = 0;
let gameState = "playing"; // "playing" | "over" | "win"
let animFrameId = null;

let animResizeHandler = null;
let pointerMoveHandler = null;
let touchMoveHandler = null;
let keyDownHandler = null;
let keyUpHandler = null;
const keyState = { left: false, right: false };

const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8 };
const paddle = { x: 0, y: 0, width: 90, height: 12 };

function buildBlocks() {
  blocks = [];

  const letters = ["N", "I", "F", "I", "O"];
  const size = Math.max(4, Math.min(9, logicalWidth / 90));
  const letterWidth = size * 6;
  const totalWidth = letterWidth * letters.length;
  const startX = logicalWidth / 2 - totalWidth / 2;
  const startY = logicalHeight * 0.14;

  letters.forEach((letter, li) => {
    LETTER_PATTERNS[letter].forEach((row, y) => {
      row.split("").forEach((cell, x) => {
        if (cell === "1") {
          blocks.push({
            x: startX + li * letterWidth + x * size,
            y: startY + y * size,
            size,
            hit: false
          });
        }
      });
    });
  });
}

function resetPaddle() {
  paddle.width = Math.max(70, logicalWidth * 0.2);
  paddle.height = 12;
  paddle.x = logicalWidth / 2 - paddle.width / 2;
  paddle.y = logicalHeight - 28;
}

function resetBall() {
  const speed = Math.max(4.5, logicalWidth / 85);
  ball.r = Math.max(7, logicalWidth / 95);
  ball.x = logicalWidth / 2;
  ball.y = logicalHeight * 0.55;
  ball.vx = speed * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = speed;
}

function updateScore() {
  gameScoreEl.textContent = `Punteggio: ${score}`;
}

function resetGame() {
  score = 0;
  gameState = "playing";
  gameEndOverlay.classList.add("is-hidden");
  updateScore();
  buildBlocks();
  resetPaddle();
  resetBall();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = animFrame.getBoundingClientRect();
  logicalWidth = rect.width;
  logicalHeight = rect.height;

  animCanvas.width = Math.round(logicalWidth * dpr);
  animCanvas.height = Math.round(logicalHeight * dpr);
  animCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function movePaddleTo(clientX) {
  const rect = animFrame.getBoundingClientRect();
  const x = clientX - rect.left;
  paddle.x = Math.min(Math.max(x - paddle.width / 2, 0), logicalWidth - paddle.width);
}

function circleRectCollision(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.size));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.size));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function circlePaddleCollision() {
  const closestX = Math.max(paddle.x, Math.min(ball.x, paddle.x + paddle.width));
  const closestY = Math.max(paddle.y, Math.min(ball.y, paddle.y + paddle.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy < ball.r * ball.r;
}

function endGame(won) {
  gameState = won ? "win" : "over";
  gameEndTitle.textContent = won ? "Hai vinto!" : "Game Over";
  gameEndScore.textContent = `Punteggio finale: ${score}`;
  gameEndOverlay.classList.remove("is-hidden");
  gameRestartBtn.focus({ preventScroll: true });
}

function stepGame() {
  if (keyState.left) paddle.x -= 7;
  if (keyState.right) paddle.x += 7;
  paddle.x = Math.min(Math.max(paddle.x, 0), logicalWidth - paddle.width);

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx *= -1;
  } else if (ball.x + ball.r > logicalWidth) {
    ball.x = logicalWidth - ball.r;
    ball.vx *= -1;
  }

  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }

  if (ball.y + ball.r > logicalHeight) {
    endGame(false);
    return;
  }

  if (ball.vy > 0 && circlePaddleCollision()) {
    ball.y = paddle.y - ball.r;
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const speed = Math.max(Math.abs(ball.vy), Math.abs(ball.vx));
    ball.vx = hitPos * speed;
    ball.vy = -Math.abs(ball.vy);
  }

  blocks.forEach((b) => {
    if (b.hit) return;
    if (circleRectCollision(ball, b)) {
      b.hit = true;
      score += 10;
      updateScore();

      const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.size - (ball.x - ball.r));
      const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.size - (ball.y - ball.r));
      if (overlapX < overlapY) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
    }
  });

  if (blocks.length > 0 && blocks.every((b) => b.hit)) {
    endGame(true);
  }
}

function drawScene() {
  animCtx.clearRect(0, 0, logicalWidth, logicalHeight);

  blocks.forEach((b) => {
    animCtx.fillStyle = b.hit ? "#ff9d2e" : "#f5f4f2";
    animCtx.fillRect(b.x, b.y, b.size, b.size);
  });

  const r = 6;
  animCtx.beginPath();
  animCtx.moveTo(paddle.x + r, paddle.y);
  animCtx.arcTo(paddle.x + paddle.width, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height, r);
  animCtx.arcTo(paddle.x + paddle.width, paddle.y + paddle.height, paddle.x, paddle.y + paddle.height, r);
  animCtx.arcTo(paddle.x, paddle.y + paddle.height, paddle.x, paddle.y, r);
  animCtx.arcTo(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y, r);
  animCtx.closePath();
  animCtx.fillStyle = "#ff9d2e";
  animCtx.fill();

  animCtx.beginPath();
  animCtx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  animCtx.fillStyle = "#ffffff";
  animCtx.shadowColor = "#ff9d2e";
  animCtx.shadowBlur = 12;
  animCtx.fill();
  animCtx.shadowBlur = 0;
}

function animLoop() {
  if (gameState === "playing") {
    stepGame();
  }
  drawScene();
  if (gameState === "playing") {
    animFrameId = requestAnimationFrame(animLoop);
  }
}

function startGame() {
  resizeCanvas();
  resetGame();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animLoop();

  animResizeHandler = () => {
    resizeCanvas();
    resetGame();
  };
  window.addEventListener("resize", animResizeHandler);

  pointerMoveHandler = (e) => movePaddleTo(e.clientX);
  animFrame.addEventListener("mousemove", pointerMoveHandler);

  touchMoveHandler = (e) => {
    if (e.touches[0]) movePaddleTo(e.touches[0].clientX);
    e.preventDefault();
  };
  animFrame.addEventListener("touchstart", touchMoveHandler, { passive: false });
  animFrame.addEventListener("touchmove", touchMoveHandler, { passive: false });

  keyDownHandler = (e) => {
    if (e.key === "ArrowLeft") keyState.left = true;
    if (e.key === "ArrowRight") keyState.right = true;
  };
  keyUpHandler = (e) => {
    if (e.key === "ArrowLeft") keyState.left = false;
    if (e.key === "ArrowRight") keyState.right = false;
  };
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("keyup", keyUpHandler);
}

function stopGame() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;

  if (animResizeHandler) {
    window.removeEventListener("resize", animResizeHandler);
    animResizeHandler = null;
  }
  if (pointerMoveHandler) {
    animFrame.removeEventListener("mousemove", pointerMoveHandler);
    pointerMoveHandler = null;
  }
  if (touchMoveHandler) {
    animFrame.removeEventListener("touchstart", touchMoveHandler);
    animFrame.removeEventListener("touchmove", touchMoveHandler);
    touchMoveHandler = null;
  }
  if (keyDownHandler) {
    document.removeEventListener("keydown", keyDownHandler);
    keyDownHandler = null;
  }
  if (keyUpHandler) {
    document.removeEventListener("keyup", keyUpHandler);
    keyUpHandler = null;
  }
  keyState.left = false;
  keyState.right = false;
}

gameRestartBtn.addEventListener("click", () => {
  resetGame();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animLoop();
});

document.querySelectorAll(".js-open-anim").forEach((btn) => {
  btn.addEventListener("click", () => openOverlay(animOverlay, btn));
});

animOverlay.addEventListener("overlay:open", startGame);
animOverlay.addEventListener("overlay:close", stopGame);

/* ---------------- header & mobile nav ---------------- */

const header = document.getElementById("siteHeader");
const hamburger = document.getElementById("hamburger");
const navMobile = document.getElementById("navMobile");

function setNavOpen(isOpen) {
  hamburger.setAttribute("aria-expanded", String(isOpen));
  navMobile.classList.toggle("is-open", isOpen);
}

hamburger.addEventListener("click", () => {
  setNavOpen(hamburger.getAttribute("aria-expanded") !== "true");
});

navMobile.querySelectorAll("a, button").forEach((el) => {
  el.addEventListener("click", () => setNavOpen(false));
});

document.addEventListener("click", (e) => {
  if (!navMobile.classList.contains("is-open")) return;
  if (navMobile.contains(e.target) || hamburger.contains(e.target)) return;
  setNavOpen(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setNavOpen(false);
});

let scrollTicking = false;
window.addEventListener("scroll", () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    header.classList.toggle("is-scrolled", window.scrollY > 4);
    scrollTicking = false;
  });
});

/* ---------------- scroll reveal ---------------- */

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

/* ---------------- footer year ---------------- */

const footerYear = document.getElementById("footerYear");
if (footerYear) footerYear.textContent = new Date().getFullYear();

/* ---------------- boot ---------------- */

initOverlays();
init();
