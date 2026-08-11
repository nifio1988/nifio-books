/* ============================================================
   NIFIO BOOKS — application script
   ============================================================ */

const RELEASE_TARGET = new Date("2026-07-24T00:00:00").getTime();

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

/* ---------------- animazione NIFIO ---------------- */

const animOverlay = document.getElementById("animOverlay");
const animCanvas = document.getElementById("animCanvas");
const animCtx = animCanvas.getContext("2d");

let animFrameId = null;
let animResizeHandler = null;
let blocks = [];
const ball = { x: 0, y: 0, vx: 6, vy: 5, r: 8 };

const LETTER_PATTERNS = {
  N: ["10001", "11001", "10101", "10011", "10001"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  F: ["11111", "10000", "11110", "10000", "10000"],
  O: ["01110", "10001", "10001", "10001", "01110"]
};

function buildBlocks() {
  blocks = [];

  const letters = ["N", "I", "F", "I", "O"];
  const size = Math.max(4, Math.min(8, animCanvas.width / 90));
  const letterWidth = size * 6;
  const totalWidth = letterWidth * letters.length;
  const startX = animCanvas.width / 2 - totalWidth / 2;
  const startY = animCanvas.height / 2 - (size * 5) / 2;

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

function resetBall() {
  ball.x = animCanvas.width * 0.25;
  ball.y = animCanvas.height * 0.25;
  ball.vx = Math.max(4, animCanvas.width / 90);
  ball.vy = Math.max(4, animCanvas.height / 110);
  ball.r = Math.max(6, animCanvas.width / 90);
}

function resizeAnimCanvas() {
  const frame = animCanvas.parentElement;
  animCanvas.width = frame.clientWidth;
  animCanvas.height = frame.clientHeight;
  buildBlocks();
  ball.x = Math.min(ball.x, animCanvas.width - ball.r);
  ball.y = Math.min(ball.y, animCanvas.height - ball.r);
}

function stepBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r < 0 || ball.x + ball.r > animCanvas.width) ball.vx *= -1;
  if (ball.y - ball.r < 0 || ball.y + ball.r > animCanvas.height) ball.vy *= -1;

  blocks.forEach((b) => {
    if (b.hit) return;
    const dx = ball.x - (b.x + b.size / 2);
    const dy = ball.y - (b.y + b.size / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ball.r + b.size / 2) {
      b.hit = true;
      ball.vx *= -1;
      ball.vy *= -1;
    }
  });
}

function drawScene() {
  animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);

  blocks.forEach((b) => {
    animCtx.fillStyle = b.hit ? "#ff9d2e" : "#f5f4f2";
    animCtx.fillRect(b.x, b.y, b.size, b.size);
  });

  animCtx.beginPath();
  animCtx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  animCtx.fillStyle = "#ffffff";
  animCtx.shadowColor = "#ff9d2e";
  animCtx.shadowBlur = 12;
  animCtx.fill();
  animCtx.shadowBlur = 0;
}

function animLoop() {
  stepBall();
  drawScene();
  animFrameId = requestAnimationFrame(animLoop);
}

function startAnimation() {
  resizeAnimCanvas();
  resetBall();
  cancelAnimationFrame(animFrameId);
  animLoop();

  animResizeHandler = () => resizeAnimCanvas();
  window.addEventListener("resize", animResizeHandler);
}

function stopAnimation() {
  cancelAnimationFrame(animFrameId);
  animFrameId = null;
  if (animResizeHandler) {
    window.removeEventListener("resize", animResizeHandler);
    animResizeHandler = null;
  }
}

document.querySelectorAll(".js-open-anim").forEach((btn) => {
  btn.addEventListener("click", () => openOverlay(animOverlay, btn));
});

animOverlay.addEventListener("overlay:open", startAnimation);
animOverlay.addEventListener("overlay:close", stopAnimation);

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
