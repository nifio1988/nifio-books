/* ============================================================
   NIFIO BOOKS — authentication & profile module

   Loaded as a separate ES module from index.html, independent of
   app.js (catalog/collections/game/whatsapp). If Supabase hasn't
   been configured yet (see supabase-config.js) this module hides
   every auth-related UI element and does nothing else — the rest
   of the site is never affected by this file.

   Session persistence uses supabase-js's built-in localStorage
   handling: what's stored there is a signed JWT issued by Supabase
   that every request revalidates server-side via Row Level
   Security. That is standard session persistence, not a
   client-only fake-auth scheme.
   ============================================================ */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_SIZE = 512;

const isConfigured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes("YOUR_") &&
  !SUPABASE_ANON_KEY.includes("YOUR_");

const navGuestBtns = document.querySelectorAll(".js-nav-guest");
const navUserBtns = document.querySelectorAll(".js-nav-user");
const navAvatarImgs = document.querySelectorAll(".js-nav-avatar-img");
const navAvatarFallbacks = document.querySelectorAll(".js-nav-avatar-fallback");
const navNames = document.querySelectorAll(".js-nav-name");

function hideAuthUI() {
  navGuestBtns.forEach((btn) => btn.classList.add("is-hidden"));
  navUserBtns.forEach((btn) => btn.classList.add("is-hidden"));
}

if (!isConfigured) {
  hideAuthUI();
} else {
  initAuth();
}

async function initAuth() {
  let createClient;
  try {
    ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
  } catch (err) {
    console.warn("NIFIO auth: impossibile caricare Supabase.", err);
    hideAuthUI();
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const authOverlay = document.getElementById("authOverlay");
  const authTabs = document.querySelectorAll(".auth-tab");
  const authNameField = document.getElementById("authNameField");
  const authForm = document.getElementById("authForm");
  const authName = document.getElementById("authName");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authSubmit = document.getElementById("authSubmit");
  const authForgotBtn = document.getElementById("authForgotBtn");
  const authMessage = document.getElementById("authMessage");

  const profileOverlay = document.getElementById("profileOverlay");
  const profileAvatarImg = document.getElementById("profileAvatarImg");
  const profileAvatarInitials = document.getElementById("profileAvatarInitials");
  const avatarFileInput = document.getElementById("avatarFileInput");
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");
  const removeAvatarBtn = document.getElementById("removeAvatarBtn");
  const avatarMessage = document.getElementById("avatarMessage");
  const profileForm = document.getElementById("profileForm");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileMessage = document.getElementById("profileMessage");
  const logoutBtn = document.getElementById("logoutBtn");

  let authMode = "login";
  let currentUser = null;
  let currentProfile = null;

  function setMessage(el, text, isError) {
    el.textContent = text;
    el.classList.toggle("is-hidden", !text);
    el.classList.toggle("form-message-error", Boolean(isError));
  }

  function getInitials(name, email) {
    const source = (name && name.trim()) || (email ? email.split("@")[0] : "");
    return source.slice(0, 2).toUpperCase() || "?";
  }

  function avatarPublicUrl(path) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  function renderAuthState() {
    const isLoggedIn = Boolean(currentUser);

    navGuestBtns.forEach((btn) => btn.classList.toggle("is-hidden", isLoggedIn));
    navUserBtns.forEach((btn) => btn.classList.toggle("is-hidden", !isLoggedIn));

    if (!isLoggedIn) return;

    const displayName = currentProfile && currentProfile.display_name;
    const avatarPath = currentProfile && currentProfile.avatar_url;
    const initials = getInitials(displayName, currentUser.email);

    navNames.forEach((el) => {
      el.textContent = displayName || currentUser.email.split("@")[0];
    });

    navAvatarFallbacks.forEach((el) => {
      el.textContent = initials;
    });
    navAvatarImgs.forEach((img) => {
      if (avatarPath) {
        img.src = avatarPublicUrl(avatarPath);
        img.classList.remove("is-hidden");
      } else {
        img.classList.add("is-hidden");
        img.removeAttribute("src");
      }
    });

    profileAvatarInitials.textContent = initials;
    if (avatarPath) {
      profileAvatarImg.src = avatarPublicUrl(avatarPath);
      profileAvatarImg.classList.remove("is-hidden");
      profileAvatarInitials.classList.add("is-hidden");
      removeAvatarBtn.classList.remove("is-hidden");
    } else {
      profileAvatarImg.classList.add("is-hidden");
      profileAvatarInitials.classList.remove("is-hidden");
      removeAvatarBtn.classList.add("is-hidden");
    }

    profileName.value = displayName || "";
    profileEmail.textContent = currentUser.email;
  }

  async function refreshProfile() {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", currentUser.id)
      .single();

    if (!error && data) currentProfile = data;
    renderAuthState();
  }

  function setAuthMode(mode) {
    authMode = mode;
    authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
    authNameField.classList.toggle("is-hidden", mode !== "register");
    authSubmit.textContent = mode === "register" ? "Crea account" : "Accedi";
    setMessage(authMessage, "", false);
  }

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    setMessage(authMessage, "", false);
    authSubmit.disabled = true;

    try {
      if (authMode === "register") {
        const displayName = authName.value.trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || undefined } }
        });
        if (error) throw error;
        setMessage(authMessage, "Registrazione completata: controlla la tua email per confermare l'account.", false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        authForm.reset();
      }
    } catch (err) {
      setMessage(authMessage, err.message || "Si è verificato un errore. Riprova.", true);
    } finally {
      authSubmit.disabled = false;
    }
  });

  authForgotBtn.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    if (!email) {
      setMessage(authMessage, "Inserisci la tua email per ricevere il link di recupero.", true);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    setMessage(
      authMessage,
      error ? "Non è stato possibile inviare l'email di recupero." : "Email di recupero inviata, controlla la posta.",
      Boolean(error)
    );
  });

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("File non valido"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function resizeImageToWebp(file, size) {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const scale = Math.max(size / img.width, size / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const dx = (size - drawWidth) / 2;
    const dy = (size - drawHeight) / 2;

    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    URL.revokeObjectURL(img.src);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Impossibile elaborare l'immagine"))),
        "image/webp",
        0.85
      );
    });
  }

  async function handleAvatarFile(file) {
    setMessage(avatarMessage, "", false);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage(avatarMessage, "Formato non supportato. Usa JPG, PNG o WEBP.", true);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage(avatarMessage, "Il file supera i 5MB consentiti.", true);
      return;
    }

    try {
      setMessage(avatarMessage, "Caricamento in corso...", false);
      const blob = await resizeImageToWebp(file, AVATAR_SIZE);
      const path = `${currentUser.id}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: path, updated_at: new Date().toISOString() })
        .eq("id", currentUser.id);
      if (dbError) throw dbError;

      await refreshProfile();
      setMessage(avatarMessage, "Immagine profilo aggiornata.", false);
    } catch (err) {
      setMessage(avatarMessage, "Errore durante il caricamento. Riprova.", true);
    }
  }

  changeAvatarBtn.addEventListener("click", () => avatarFileInput.click());

  avatarFileInput.addEventListener("change", () => {
    const file = avatarFileInput.files[0];
    avatarFileInput.value = "";
    if (file) handleAvatarFile(file);
  });

  removeAvatarBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    setMessage(avatarMessage, "", false);
    const path = `${currentUser.id}/avatar.webp`;
    await supabase.storage.from("avatars").remove([path]);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", currentUser.id);
    await refreshProfile();
    setMessage(avatarMessage, "Immagine rimossa.", false);
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const displayName = profileName.value.trim();

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", currentUser.id);

    setMessage(profileMessage, error ? "Errore nel salvataggio." : "Nome aggiornato.", Boolean(error));
    if (!error) await refreshProfile();
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.NifioOverlay.close(profileOverlay);
  });

  navGuestBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setAuthMode("login");
      authForm.reset();
      setMessage(authMessage, "", false);
      window.NifioOverlay.open(authOverlay, btn);
    });
  });

  navUserBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setMessage(profileMessage, "", false);
      setMessage(avatarMessage, "", false);
      window.NifioOverlay.open(profileOverlay, btn);
    });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;

    if (currentUser) {
      window.NifioOverlay.close(authOverlay);
      refreshProfile();
    } else {
      currentProfile = null;
      renderAuthState();
    }
  });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  currentUser = session ? session.user : null;
  if (currentUser) {
    await refreshProfile();
  } else {
    renderAuthState();
  }
}
