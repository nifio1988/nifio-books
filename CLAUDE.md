# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

nifio-books is a static single-page website ("Biblioteca ufficiale di Nicola Fiore") that showcases an independent author's books, collections, a canvas mini-game, and (once configured) user accounts. It's plain HTML/CSS/JS with no build step, no package manager, and no bundler dependencies. Deployed via GitHub Pages (repo: `nifio1988/nifio-books`) — pushing to the default branch publishes the site directly. The one external dependency is Supabase (auth/DB/storage), called directly from the browser via its JS client loaded from a CDN — nothing runs server-side, so GitHub Pages compatibility is unaffected.

## Running locally

There is no build/dev server tooling. Serve the directory with any static file server, e.g.:

```
python -m http.server 8000
```

Then open `http://localhost:8000/index.html`. Opening `index.html` directly via `file://` will break the `fetch("books.json")` call in most browsers due to CORS restrictions on local file access — a local server is required.

There are no tests or linters configured in this repo.

## Architecture

No build step. `index.html` is markup only; `style.css` is all styling; `app.js` is the catalog/collections/game/nav behavior (classic script, `defer`); `auth.js` is the optional Supabase-backed account/profile behavior (ES module, loaded after `app.js`). Editorial/professional restyle (design system, semantic sections, accessible modals) landed 2026-08; if you find inline styles or embedded `<script>` creeping back into `index.html`, that's drift from this structure, not the intended state.

**Data flow:**
- `books.json` is the source of truth for the catalog and must not have its shape changed (fields: `title`, `category` array, `description`, `sinossi`, `amazon`, `cover`, optional `prossimamente` boolean). Currently 41 entries.
- Cover images referenced by `books.json` live in `images/` as flat files (jpg/png/jfif/jpeg, inconsistent naming — spaces, mixed case, underscores all appear). A few images in `images/` are unused leftovers not referenced by any book (e.g. `nicola-fiore.jpeg`, `american ghotic.png`, `gesu in mare.png`).
- `app.js` fetches `books.json` on load, renders the grid, builds category chips from the union of all `category` values, and renders the hardcoded `collections` array (curated series/"collane" — Collana di Merda, Visioni Fantastiche, Eroi in Divisa, Diari Self-Help). Each collection's `books` list matches against `title` in `books.json` by **exact string equality** — if you rename a book title in `books.json`, update the matching entry in the `collections` array in `app.js` or it silently drops out of its collection.

**Key pieces in `app.js`:**
- `openOverlay()` / `closeOverlay()` / `closeAllOverlays()` — shared modal machinery used by all 7 modals (book, collection, author, release, game, auth, profile — the last two live in `auth.js`). Scroll-lock uses a counter (`openOverlaysCount`) so it survives overlapping modals correctly; ESC and outside-click are wired generically via `initOverlays()` rather than per-modal. These two functions are also exposed as `window.NifioOverlay = { open, close }` specifically so `auth.js` can reuse them instead of re-implementing scroll-lock/ESC/outside-click — `app.js` must load *before* `auth.js` in `index.html` for this to exist in time (classic `defer` scripts and module scripts both execute in document order, so keep the `<script src="app.js" defer>` tag above the `<script type="module" src="auth.js">` tag).
- `renderGrid()` / `renderCategories()` / `applyFilters()` — search + category filtering (combined AND logic: category filter first, then text match on title or category).
- `renderCollections()` / `openCollectionModal()` — each collection card is built from real `books.json` matches; the modal is its own dedicated markup (`#collectionOverlay`), not a reuse of the book modal's DOM.
- `openBookModal()` — populates the book detail modal; hides the Amazon button when `amazon` is empty and the "Sinossi" label/paragraph when `sinossi` is empty, hides/shows the "Prossimamente" badge based on `prossimamente === true`.
- **NIFIO mini-game** (`buildBlocks`, `stepGame`, `drawScene`, `animLoop`, `startGame`/`stopGame`) — a real Breakout-style game in the `#animOverlay` modal: bricks spell "NIFIO", a paddle is mouse/touch/arrow-key controlled, ball-vs-brick and ball-vs-paddle use proper circle/rect collision (not center-distance approximation), score increments per brick, game-over when the ball passes the paddle, win when all bricks are cleared, both end states show an HTML overlay (`#gameEndOverlay`) with a working "Rigioca" button. Canvas sizing is DPR-aware (`resizeCanvas()` scales the backing store by `devicePixelRatio` and all game math happens in CSS-pixel "logical" coordinates, not raw canvas pixels). Starts/stops via the `animOverlay`'s custom `overlay:open`/`overlay:close` events (fired by `openOverlay`/`closeOverlay`); a window resize while playing fully resets the round rather than trying to remap brick/ball positions.
- `updateCountdown()` — countdown to a hardcoded release date constant (`RELEASE_TARGET`, currently 2026-07-24). When the target has passed, it swaps the 4 digit tiles for a `#countdownExpired` message instead of showing zeros/negatives — don't "fix" this by assuming the tiles should always render.
- WhatsApp Click-to-Chat: `WHATSAPP_NUMBER`/`WHATSAPP_MESSAGE` build a `wa.me` link once at boot and apply it to every `.js-whatsapp-link` element (author modal CTA + footer link) — single source of truth, don't hardcode the URL in HTML.
- Header/nav (`hamburger`, `navMobile`, scroll-shadow toggle) and the `IntersectionObserver`-based `.reveal` fade-ins are presentation-only, independent of the catalog logic above.

## Authentication, profile & avatar upload (`auth.js` + Supabase)

This is a **static site with no server**, so real auth/DB/storage is delegated to [Supabase](https://supabase.com) — the browser talks to it directly via `supabase-js` loaded from a CDN (`https://esm.sh/@supabase/supabase-js@2`), no build step required. Chosen over Firebase/Auth0 because one service covers auth+Postgres+storage under a single Row Level Security model (see the SQL below) instead of stitching two services together.

**This feature is inert until configured.** `supabase-config.js` ships with placeholder `SUPABASE_URL`/`SUPABASE_ANON_KEY` values; `auth.js` detects the placeholders on load and hides every auth-related nav element (`.js-nav-guest`, `.js-nav-user`) without creating a Supabase client or making any network call — the rest of the site is unaffected either way. To activate it:
1. Create a free Supabase project.
2. Run `supabase/schema.sql` once in that project's SQL Editor — it creates the `profiles` table + RLS policies, a trigger that auto-provisions a profile row on signup, and the `avatars` storage bucket + its own RLS policies.
3. In Authentication → URL Configuration, add the site's real GitHub Pages URL to the redirect allow-list (otherwise password-reset emails link back to the wrong place).
4. Copy the Project URL and the **anon/public** key (Project Settings → API) into `supabase-config.js`. These two values are meant to be public/committed — they grant nothing by themselves, every table/bucket is locked down by RLS until a policy explicitly allows an operation. The **service_role** key must never be added anywhere in this project (it bypasses RLS and has no legitimate use in a static frontend).

**Security model**: `profiles` RLS only allows a row's owner (`auth.uid() = id`) to `select`/`update` it — no one can read another user's profile. The `avatars` bucket is public-read (so plain `<img src>` works) but `insert`/`update`/`delete` are restricted by RLS to paths under the caller's own `auth.uid()` folder (`avatars/{uid}/...`), enforced via `storage.foldername(name)`. This is real server-side enforcement, not a client-side check — the frontend UI hiding the upload button for logged-out users is a UX nicety on top of, not instead of, the RLS policy.

**Avatar upload pipeline** (in `auth.js`): validate size (≤5MB) and MIME type client-side, then always re-encode the file through an off-screen `<canvas>` (center-cropped square, resized to 512px, exported as `image/webp`) before upload — this doubles as real validation, since a non-image file simply fails to decode onto the canvas rather than being uploaded as-is. Upload target is a fixed path per user (`avatars/{uid}/avatar.webp`) with `upsert: true`, so re-uploading replaces the previous image automatically; "remove image" calls `storage.remove()` and clears `profiles.avatar_url`.

`localStorage` note: supabase-js persists the session (a signed JWT) in `localStorage` by default. That is standard session persistence — every request still gets revalidated server-side via RLS — and is not the "fake client-only auth" pattern that was explicitly ruled out when this feature was designed.

No build/minification step — files are served as-is, so edits take effect immediately on deploy.
