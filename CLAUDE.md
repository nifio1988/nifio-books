# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

nifio-books is a static single-page website ("Biblioteca ufficiale di Nicola Fiore") that catalogs and showcases an author's books. It's plain HTML/CSS/JS with no build step, no package manager, and no dependencies. Deployed via GitHub Pages (repo: `nifio1988/nifio-books`) — pushing to the default branch publishes the site directly.

## Running locally

There is no build/dev server tooling. Serve the directory with any static file server, e.g.:

```
python -m http.server 8000
```

Then open `http://localhost:8000/index.html`. Opening `index.html` directly via `file://` will break the `fetch("books.json")` call in most browsers due to CORS restrictions on local file access — a local server is required.

There are no tests or linters configured in this repo.

## Architecture

Three live files, no build step: `index.html` (markup only), `style.css` (all styling), `app.js` (all behavior). `index.html` links both with `<link rel="stylesheet" href="style.css">` and `<script src="app.js" defer>` — there is no inline `<style>`/`<script>` in the page. Editorial/professional restyle (design system, semantic sections, accessible modals) landed 2026-08; if you find inline styles or embedded `<script>` creeping back into `index.html`, that's drift from this structure, not the intended state.

**Data flow:**
- `books.json` is the source of truth for the catalog and must not have its shape changed (fields: `title`, `category` array, `description`, `sinossi`, `amazon`, `cover`, optional `prossimamente` boolean). Currently 41 entries.
- Cover images referenced by `books.json` live in `images/` as flat files (jpg/png/jfif/jpeg, inconsistent naming — spaces, mixed case, underscores all appear). A few images in `images/` are unused leftovers not referenced by any book (e.g. `nicola-fiore.jpeg`, `american ghotic.png`, `gesu in mare.png`).
- `app.js` fetches `books.json` on load, renders the grid, builds category chips from the union of all `category` values, and renders the hardcoded `collections` array (curated series/"collane" — Collana di Merda, Visioni Fantastiche, Eroi in Divisa, Diari Self-Help). Each collection's `books` list matches against `title` in `books.json` by **exact string equality** — if you rename a book title in `books.json`, update the matching entry in the `collections` array in `app.js` or it silently drops out of its collection.

**Key pieces in `app.js`:**
- `openOverlay()` / `closeOverlay()` / `closeAllOverlays()` — shared modal machinery used by all 5 modals (book, collection, author, release, animation). Scroll-lock uses a counter (`openOverlaysCount`) so it survives overlapping modals correctly; ESC and outside-click are wired generically via `initOverlays()` rather than per-modal.
- `renderGrid()` / `renderCategories()` / `applyFilters()` — search + category filtering (combined AND logic: category filter first, then text match on title or category).
- `renderCollections()` / `openCollectionModal()` — each collection card is built from real `books.json` matches; the modal is its own dedicated markup (`#collectionOverlay`), not a reuse of the book modal's DOM.
- `openBookModal()` — populates the book detail modal; hides the Amazon button when `amazon` is empty and the "Sinossi" label/paragraph when `sinossi` is empty, hides/shows the "Prossimamente" badge based on `prossimamente === true`.
- Canvas animation (`buildBlocks`, `stepBall`, `drawScene`, `animLoop`, `startAnimation`/`stopAnimation`) — bouncing-ball collision animation spelling "NIFIO" in blocks. Starts/stops via the `animOverlay`'s custom `overlay:open`/`overlay:close` events (fired by `openOverlay`/`closeOverlay`), and re-measures the canvas on window resize while open.
- `updateCountdown()` — countdown to a hardcoded release date constant (`RELEASE_TARGET`, currently 2026-07-24). When the target has passed, it swaps the 4 digit tiles for a `#countdownExpired` message instead of showing zeros/negatives — don't "fix" this by assuming the tiles should always render.
- Header/nav (`hamburger`, `navMobile`, scroll-shadow toggle) and the `IntersectionObserver`-based `.reveal` fade-ins are presentation-only, independent of the catalog logic above.

No build/minification step — files are served as-is, so edits take effect immediately on deploy.
