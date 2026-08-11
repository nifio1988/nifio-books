/* ============================================================
   NIFIO BOOKS — "onda NIFIO" easter egg

   Independent component: reads only elements it explicitly looks
   up (#pageWrap, #nifioWaveBand, #nifioDisplacement, .js-nifio-wave
   triggers) and never touches catalog/game/auth state. Safe no-op
   if any of those elements are missing.
   ============================================================ */

(function () {
  "use strict";

  const WAVE_DURATION_MS = 3000;
  const LIGHT_FEEDBACK_MS = 450;

  const pageWrap = document.getElementById("pageWrap");
  const waveBand = document.getElementById("nifioWaveBand");
  const displacementEl = document.getElementById("nifioDisplacement");
  const triggers = document.querySelectorAll(".js-nifio-wave");
  const navMobile = document.getElementById("navMobile");
  const hamburger = document.getElementById("hamburger");

  if (!pageWrap || !waveBand || !displacementEl || triggers.length === 0) return;

  let waveActive = false;
  let waveRafId = null;
  let audioCtx = null;
  let noiseBuffer = null;

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function isCoarsePointer() {
    return Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ---------------- trigger ---------------- */

  function triggerNifioWave() {
    if (waveActive) return; // ignore further taps/clicks until the current wave finishes
    waveActive = true;

    closeMobileNavIfOpen();
    playWaveSound();

    if (prefersReducedMotion()) {
      runLightFeedback();
      return;
    }

    runWaveAnimation();
  }

  function closeMobileNavIfOpen() {
    // #pageWrap gets `filter` during the wave, which changes the containing
    // block of its position:fixed descendants — .nav-mobile is one of them.
    // Closing it defensively avoids any visible glitch during the 3s window.
    if (!navMobile || !navMobile.classList.contains("is-open")) return;
    navMobile.classList.remove("is-open");
    if (hamburger) hamburger.setAttribute("aria-expanded", "false");
  }

  triggers.forEach((el) => {
    el.addEventListener("click", triggerNifioWave);
  });

  /* ---------------- animation ---------------- */

  function waveScaleAt(elapsedMs, totalMs, peak) {
    const t = elapsedMs / totalMs;

    if (t < 0.23) {
      // 0 - ~0.7s: rise in
      return peak * easeInOutCubic(t / 0.23);
    }
    if (t < 0.73) {
      // ~0.7 - ~2.2s: sustained, with a gentle secondary undulation
      const local = (t - 0.23) / 0.5;
      return peak * (0.85 + 0.15 * Math.sin(local * Math.PI * 2.4));
    }
    // ~2.2 - 3s: fade out
    const local = (t - 0.73) / 0.27;
    return peak * (1 - easeInOutCubic(Math.min(local, 1)));
  }

  function runWaveAnimation() {
    const peakScale = isCoarsePointer() ? 42 : 70;
    const startTime = performance.now();

    pageWrap.classList.add("is-waving");
    waveBand.classList.add("is-active");

    function frame(now) {
      const elapsed = now - startTime;

      if (elapsed >= WAVE_DURATION_MS) {
        finishWaveAnimation();
        return;
      }

      displacementEl.setAttribute("scale", waveScaleAt(elapsed, WAVE_DURATION_MS, peakScale).toFixed(2));
      waveRafId = requestAnimationFrame(frame);
    }

    waveRafId = requestAnimationFrame(frame);
  }

  function runLightFeedback() {
    triggers.forEach((el) => el.classList.add("nifio-pulse"));
    setTimeout(() => {
      triggers.forEach((el) => el.classList.remove("nifio-pulse"));
      waveActive = false;
    }, LIGHT_FEEDBACK_MS);
  }

  /* ---------------- audio ---------------- */

  function getAudioContext() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function getNoiseBuffer(ctx) {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 3);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
    return noiseBuffer;
  }

  function playWaveSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const duration = 2.6;
      const now = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.9;
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.linearRampToValueAtTime(1100, now + duration * 0.45);
      filter.frequency.linearRampToValueAtTime(260, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.6);
      gain.gain.setValueAtTime(0.22, now + duration * 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      source.stop(now + duration + 0.05);
    } catch (err) {
      // Audio is a nice-to-have; never let it break the visual animation.
    }
  }

  /* ---------------- cleanup ---------------- */

  function finishWaveAnimation() {
    if (waveRafId !== null) {
      cancelAnimationFrame(waveRafId);
      waveRafId = null;
    }
    pageWrap.classList.remove("is-waving");
    waveBand.classList.remove("is-active");
    displacementEl.setAttribute("scale", "0");
    waveActive = false;
  }

  window.triggerNifioWave = triggerNifioWave;
})();
