/* =========================================================================
   FOR YOU 🌸 — v3 interactive experience
   Sections:
   0. Preloader
   1. Setup & small helpers
   2. Envelope gate (start experience)
   3. Typewriter (smooth, per-letter) + floating love quotes + custom message
   4. Day / night cycle (sky, sun, moon, stars, fireflies, shooting stars)
   5. Canvas particle system (petals/snow, sparkles, hearts, butterflies)
   6. Pointer interaction (bloom on click, petals on move, lean, bouquet)
   7. Hidden notes on the big tree flowers
   8. Settings panel (music / calm mode / winter mode) + music engine
   9. Main render loop
   ========================================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------------- 1 -- */
  const $ = (sel) => document.querySelector(sel);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* storage unavailable, fail silently */
      }
    },
  };

  const DEFAULT_MESSAGE = "For You ❤️";
  const HIDDEN_NOTES = [
    "Every petal here bloomed just for you.",
    "You make ordinary days feel like this garden.",
    "Some things grow slowly. Some, like this, grew all at once.",
    "I made this so you'd have a little garden of your own.",
  ];
  const LOVE_QUOTES = [
    "You are my favorite kind of weather.",
    "Home isn't a place, it's a person.",
    "Every flower here whispers your name.",
    "Some gardens grow in the heart instead of the ground.",
    "I'd plant a thousand of these for one of your smiles.",
  ];

  let bodyReady = false;
  let calmMode = store.get("fy_calm", false);
  let winterMode = store.get("fy_winter", false);
  let currentMessage = store.get("fy_message", DEFAULT_MESSAGE);

  document.body.classList.toggle("calm-mode", calmMode);
  document.body.classList.toggle("season-winter", winterMode);

  /* ---------------------------------------------------------------- 0 -- */
  const preloader = $("#preloader");
  const minPreloadTime = 900;
  const preloadStart = performance.now();
  function hidePreloader() {
    const elapsed = performance.now() - preloadStart;
    const wait = Math.max(0, minPreloadTime - elapsed);
    setTimeout(() => preloader.classList.add("is-hidden"), wait);
  }

  /* ---------------------------------------------------------------- 2 -- */
  const envelopeScreen = $("#envelope-screen");

  function openEnvelope() {
    if (bodyReady) return;
    envelopeScreen.classList.add("is-opening");
    setTimeout(() => {
      envelopeScreen.classList.add("is-open");
      envelopeScreen.setAttribute("aria-hidden", "true");
      document.body.classList.remove("container"); // un-pause all CSS animations
      bodyReady = true;
      startTypewriter(currentMessage);
      startQuoteCycle();
      startFireflySeed();
    }, 650);
  }
  envelopeScreen.addEventListener("click", openEnvelope);
  envelopeScreen.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      openEnvelope();
    }
  });
  envelopeScreen.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      openEnvelope();
    },
    { passive: false }
  );

  /* ---------------------------------------------------------------- 3 -- */
  const messagePanel = $("#message-panel");
  const typewriterEl = $("#typewriter");
  let typeToken = 0;

  function startTypewriter(text) {
    const myToken = ++typeToken;
    typewriterEl.classList.remove("is-complete");
    typewriterEl.innerHTML = "";
    const chars = Array.from(text);
    let i = 0;
    let delayAccum = 0;

    chars.forEach((ch) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      typewriterEl.appendChild(span);
    });

    const spans = typewriterEl.querySelectorAll(".char");

    (function tick() {
      if (myToken !== typeToken) return; // superseded by a newer message
      if (i < spans.length) {
        const jitter = rand(55, 105);
        spans[i].style.animationDelay = "0s";
        spans[i].style.opacity = "0"; // ensure re-trigger of animation
        requestAnimationFrame(() => {
          spans[i].getBoundingClientRect(); // reflow to restart animation cleanly
          spans[i].style.opacity = "";
        });
        i++;
        setTimeout(tick, jitter);
      } else {
        setTimeout(() => {
          if (myToken === typeToken) typewriterEl.classList.add("is-complete");
        }, 400);
      }
    })();
  }

  function startQuoteCycle() {
    const panel = $("#quote-panel");
    let idx = 0;
    function showNext() {
      panel.classList.remove("is-visible");
      setTimeout(() => {
        panel.textContent = "\u201C" + LOVE_QUOTES[idx % LOVE_QUOTES.length] + "\u201D";
        idx++;
        panel.classList.add("is-visible");
      }, 800);
    }
    setTimeout(showNext, 4000);
    setInterval(showNext, 11000);
  }

  // custom message editing --------------------------------------------------
  const editBtn = $("#message-edit-btn");
  const editForm = $("#message-edit-form");
  const editInput = $("#message-edit-input");

  editBtn.addEventListener("click", () => {
    editForm.hidden = !editForm.hidden;
    if (!editForm.hidden) {
      editInput.value = currentMessage;
      editInput.focus();
      editInput.select();
    }
  });
  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = editInput.value.trim();
    if (val) {
      currentMessage = val;
      store.set("fy_message", currentMessage);
      if (bodyReady) startTypewriter(currentMessage);
    }
    editForm.hidden = true;
  });

  /* ---------------------------------------------------------------- 4 -- */
  const DAY_CYCLE_MS = 120000;
  const cycleStart = Date.now() - DAY_CYCLE_MS * 0.55;
  const daySky = $("#day-sky");

  function getPhase() {
    return ((Date.now() - cycleStart) % DAY_CYCLE_MS) / DAY_CYCLE_MS;
  }
  function daylightAmount(phase) {
    return (1 + Math.cos((phase - 0.5) * Math.PI * 2)) / 2;
  }

  let currentDaylight = 0;
  let currentNightAmt = 1;

  function updateDayNight() {
    const phase = getPhase();
    const daylight = daylightAmount(phase);
    currentDaylight = daylight;
    currentNightAmt = 1 - daylight;
    daySky.style.opacity = clamp(daylight * 0.95, 0, 0.95).toFixed(2);
    document.body.classList.toggle("is-night", currentNightAmt > 0.55);
  }

  function startFireflySeed() {
    const count = calmMode ? 8 : 14;
    for (let i = 0; i < count; i++) fireflies.push(makeFirefly());
  }

  // shooting stars -----------------------------------------------------------
  const shootingStars = [];
  let nextShootAt = rand(4000, 9000);
  let shootTimer = 0;
  function maybeSpawnShootingStar(dtMs) {
    if (currentNightAmt < 0.5 || calmMode) return;
    shootTimer += dtMs;
    if (shootTimer > nextShootAt) {
      shootTimer = 0;
      nextShootAt = rand(5000, 13000);
      const startX = rand(W * 0.1, W * 0.9);
      const startY = rand(H * 0.05, H * 0.28);
      const angle = rand(Math.PI * 0.15, Math.PI * 0.3);
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * rand(9, 13),
        vy: Math.sin(angle) * rand(9, 13),
        life: 1,
      });
    }
  }
  function drawShootingStars(dt) {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= dt * 1.1;
      if (s.life <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = clamp(s.life, 0, 1) * currentNightAmt;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- 5 -- */
  const canvas = $("#fx-canvas");
  const ctx = canvas.getContext("2d");
  let W = 0,
    H = 0,
    DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
  }
  resize();

  // stars ------------------------------------------------------------
  const stars = Array.from({ length: 90 }, () => ({
    x: rand(0, 1),
    y: rand(0, 0.7),
    r: rand(0.4, 1.6),
    tw: rand(0, Math.PI * 2),
    speed: rand(0.5, 2),
  }));

  // fireflies ----------------------------------------------------------
  const fireflies = [];
  function makeFirefly() {
    return {
      x: rand(0, W),
      y: rand(H * 0.5, H * 0.95),
      baseY: rand(H * 0.5, H * 0.95),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.3, 0.8),
      r: rand(1.2, 2.4),
    };
  }

  // drifting petals / snow ------------------------------------------------
  const petals = [];
  function spawnPetal(x, y) {
    if (calmMode && petals.length > 40) return;
    petals.push({
      x: x ?? rand(0, W),
      y: y ?? -10,
      vx: rand(-0.4, 0.4),
      vy: winterMode ? rand(0.5, 1.0) : rand(0.4, 1.1),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.03, 0.03),
      size: winterMode ? rand(2.5, 5.5) : rand(4, 9),
      hue: winterMode ? rand(195, 210) : rand(325, 345),
      sat: winterMode ? 15 : 85,
      light: winterMode ? 92 : 78,
      life: 1,
    });
  }

  // sparkles -------------------------------------------------------------
  const sparkles = [];
  function spawnSparkleBurst(x, y, count = 10) {
    const n = calmMode ? Math.ceil(count * 0.5) : count;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(0.6, 2.2);
      sparkles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, size: rand(1.5, 3.5) });
    }
  }

  // floating hearts --------------------------------------------------------
  const hearts = [];
  function spawnHeart(x, y) {
    hearts.push({ x, y, vy: rand(-1.3, -0.8), vx: rand(-0.3, 0.3), life: 1, size: rand(10, 18) });
  }

  // butterflies -------------------------------------------------------------
  const butterflies = [];
  function spawnButterfly() {
    const fromLeft = Math.random() < 0.5;
    butterflies.push({
      x: fromLeft ? -20 : W + 20,
      y: rand(H * 0.15, H * 0.55),
      vx: (fromLeft ? 1 : -1) * rand(0.6, 1.1),
      t: 0,
      wing: 0,
      freq: rand(0.02, 0.04),
      hue: rand(20, 320),
    });
  }
  setInterval(() => {
    if (bodyReady && !winterMode && !calmMode && currentDaylight > 0.3 && butterflies.length < 3 && Math.random() < 0.6) {
      spawnButterfly();
    }
  }, 6000);

  function drawStars(dt) {
    if (currentNightAmt < 0.05) return;
    ctx.save();
    ctx.globalAlpha = currentNightAmt;
    for (const s of stars) {
      s.tw += dt * s.speed;
      const twinkle = 0.5 + 0.5 * Math.sin(s.tw);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${(0.4 + 0.6 * twinkle).toFixed(2)})`;
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSunMoon() {
    const phase = getPhase();
    const arc = clamp((phase - 0.15) / 0.7, 0, 1);
    const nightArc = clamp((((phase + 0.5) % 1) - 0.15) / 0.7, 0, 1);

    const drawBody = (arcT, visible, fill, glow) => {
      if (visible <= 0.02) return;
      const x = lerp(W * 0.08, W * 0.92, arcT);
      const y = H * 0.62 - Math.sin(arcT * Math.PI) * H * 0.42;
      ctx.save();
      ctx.globalAlpha = visible;
      ctx.beginPath();
      ctx.fillStyle = glow;
      ctx.filter = "blur(6px)";
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = "none";
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawBody(arc, currentDaylight, "#fff6d2", "rgba(255,220,120,0.5)");
    drawBody(nightArc, currentNightAmt, "#eef3ff", "rgba(180,200,255,0.35)");
  }

  function drawFireflies(dt) {
    if (currentNightAmt < 0.2 || winterMode) return;
    ctx.save();
    ctx.globalAlpha = currentNightAmt;
    for (const f of fireflies) {
      f.phase += dt * f.speed;
      f.x += Math.sin(f.phase * 0.7) * 0.4;
      f.y = f.baseY + Math.sin(f.phase) * 14;
      if (f.x < -10) f.x = W + 10;
      if (f.x > W + 10) f.x = -10;
      const glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(f.phase * 2));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 244, 170, ${glow.toFixed(2)})`;
      ctx.shadowColor = "rgba(255,240,150,0.9)";
      ctx.shadowBlur = 8;
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPetals(dt) {
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.x += p.vx + Math.sin(p.y * 0.02) * 0.3;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= dt * 0.06;
      if (p.y > H + 20 || p.life <= 0) {
        petals.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`;
      ctx.beginPath();
      if (winterMode) {
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      } else {
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSparkles(dt) {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.02;
      s.life -= dt * 1.4;
      if (s.life <= 0) {
        sparkles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = clamp(s.life, 0, 1);
      ctx.fillStyle = "#fff6c8";
      ctx.shadowColor = "#ffe98a";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHeart(x, y, size) {
    ctx.beginPath();
    const top = size * 0.3;
    ctx.moveTo(x, y + top);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + top);
    ctx.bezierCurveTo(x - size / 2, y + (size + top) / 2, x, y + (size + top) / 1.3, x, y + size);
    ctx.bezierCurveTo(x, y + (size + top) / 1.3, x + size / 2, y + (size + top) / 2, x + size / 2, y + top);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + top);
    ctx.fill();
  }

  function drawHearts(dt) {
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.x += h.vx;
      h.y += h.vy;
      h.life -= dt * 0.5;
      if (h.life <= 0) {
        hearts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = clamp(h.life, 0, 1);
      ctx.fillStyle = "#ff5c8a";
      ctx.shadowColor = "rgba(255,90,140,0.7)";
      ctx.shadowBlur = 8;
      drawHeart(h.x, h.y, h.size);
      ctx.restore();
    }
  }

  function drawButterflies(dt) {
    for (let i = butterflies.length - 1; i >= 0; i--) {
      const b = butterflies[i];
      b.t += dt;
      b.wing += dt * 10;
      b.x += b.vx;
      b.y += Math.sin(b.t * b.freq * 60) * 0.6;
      if (b.x < -30 || b.x > W + 30) {
        butterflies.splice(i, 1);
        continue;
      }
      const flap = Math.abs(Math.sin(b.wing));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = clamp(currentDaylight + 0.2, 0.2, 1);
      ctx.fillStyle = `hsl(${b.hue}, 70%, 72%)`;
      ctx.beginPath();
      ctx.ellipse(-4, 0, 6 * flap + 2, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, 0, 6 * flap + 2, 9, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- 6 -- */
  const sceneEl = $("#scene");
  let leanDeg = 0;

  function paintClickRipple(x, y) {
    const r = document.createElement("div");
    r.className = "click-ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 850);
  }

  const grownFlowerHues = [335, 320, 350, 300, 12];
  const winterFlowerHues = [200, 210, 190, 230];
  const MAX_GROWN = 45;
  const grownList = [];

  function growFlower(x, y, opts = {}) {
    const el = document.createElement("div");
    el.className = "grown-flower";
    const scale = opts.scale || rand(0.7, 1.25);
    el.style.left = x + "px";
    el.style.top = y + "px";
    const palette = winterMode ? winterFlowerHues : grownFlowerHues;
    el.style.setProperty("--petal-color", `hsl(${palette[Math.floor(rand(0, palette.length))]}, ${winterMode ? 60 : 78}%, ${winterMode ? 82 : 68}%)`);
    el.style.width = 6 * scale + "vmin";
    el.style.height = 6 * scale + "vmin";
    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
      const p = document.createElement("div");
      p.className = "grown-flower__petal";
      p.style.transform = `rotate(${(360 / petalCount) * i}deg)`;
      el.appendChild(p);
    }
    const center = document.createElement("div");
    center.className = "grown-flower__center";
    el.appendChild(center);
    document.body.appendChild(el);
    grownList.push(el);
    if (grownList.length > MAX_GROWN) {
      const old = grownList.shift();
      old.classList.add("is-fading");
      setTimeout(() => old.remove(), 1500);
    }
    spawnSparkleBurst(x, y, 12);
  }

  function handleBloomAt(x, y) {
    growFlower(x, y);
    paintClickRipple(x, y);
  }

  function handleBouquetAt(x, y) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dx = Math.cos(angle) * rand(14, 30);
      const dy = Math.sin(angle) * rand(10, 22);
      setTimeout(() => growFlower(x + dx, y + dy, { scale: rand(0.6, 1.1) }), i * 60);
    }
    for (let i = 0; i < 8; i++) {
      setTimeout(() => spawnHeart(x + rand(-20, 20), y + rand(-10, 10)), i * 90);
    }
    paintClickRipple(x, y);
  }

  let lastMoveSpawn = 0;
  let lastPointerDown = { t: 0, x: 0, y: 0 };

  window.addEventListener(
    "pointermove",
    (e) => {
      const centerX = window.innerWidth / 2;
      leanDeg = clamp(((e.clientX - centerX) / centerX) * 4, -4, 4);

      const now = performance.now();
      if (now - lastMoveSpawn > (calmMode ? 130 : 60)) {
        lastMoveSpawn = now;
        if (Math.random() < 0.7) spawnPetal(e.clientX + rand(-10, 10), e.clientY + rand(-10, 10));
      }
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#music-toggle, #settings-toggle, #settings-panel, #envelope-screen, #hidden-note, #message-panel, #ui-controls")) return;

    const now = performance.now();
    const dx = e.clientX - lastPointerDown.x;
    const dy = e.clientY - lastPointerDown.y;
    const isDouble = now - lastPointerDown.t < 350 && Math.hypot(dx, dy) < 40;
    lastPointerDown = { t: now, x: e.clientX, y: e.clientY };

    if (isDouble) {
      handleBouquetAt(e.clientX, e.clientY);
    } else {
      handleBloomAt(e.clientX, e.clientY);
    }
  });

  /* ---------------------------------------------------------------- 7 -- */
  function initHiddenNotes() {
    const flowers = document.querySelectorAll(".flower");
    const note = $("#hidden-note");
    let noteTimeout;
    flowers.forEach((fl, i) => {
      fl.style.pointerEvents = "auto";
      fl.style.cursor = "pointer";
      fl.setAttribute("tabindex", "0");
      fl.setAttribute("role", "button");
      fl.setAttribute("aria-label", "Reveal a hidden note");
      const reveal = (e) => {
        e.stopPropagation();
        const rect = fl.getBoundingClientRect();
        note.textContent = HIDDEN_NOTES[i % HIDDEN_NOTES.length];
        note.style.left = rect.left + rect.width / 2 + "px";
        note.style.top = rect.top + "px";
        note.classList.add("is-visible");
        spawnHeart(rect.left + rect.width / 2, rect.top);
        clearTimeout(noteTimeout);
        noteTimeout = setTimeout(() => note.classList.remove("is-visible"), 3200);
      };
      fl.addEventListener("click", reveal);
      fl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") reveal(e);
      });
    });
  }

  /* ---------------------------------------------------------------- 8 -- */
  let audioCtx = null;
  let musicNodes = null;
  let musicPlaying = false;
  const musicBtn = $("#music-toggle");

  function startMusic() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain();
    master.gain.value = 0.0001;
    master.connect(audioCtx.destination);
    master.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 2);

    const notes = [196.0, 246.94, 293.66, 392.0];
    const oscs = notes.map((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = audioCtx.createGain();
      g.gain.value = 0.5 / notes.length;
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.08 + i * 0.02;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.15 / notes.length;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
      return { osc, lfo };
    });

    musicNodes = { master, oscs };
    musicPlaying = true;
    musicBtn.classList.add("is-playing");
    musicBtn.setAttribute("aria-pressed", "true");
    musicBtn.textContent = "🔊";
  }

  function stopMusic() {
    if (!musicNodes) return;
    const { master, oscs } = musicNodes;
    master.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    setTimeout(() => {
      oscs.forEach(({ osc, lfo }) => {
        try {
          osc.stop();
          lfo.stop();
        } catch (err) {
          /* already stopped */
        }
      });
    }, 1300);
    musicNodes = null;
    musicPlaying = false;
    musicBtn.classList.remove("is-playing");
    musicBtn.setAttribute("aria-pressed", "false");
    musicBtn.textContent = "🎵";
  }

  musicBtn.addEventListener("click", () => {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    musicPlaying ? stopMusic() : startMusic();
  });

  // settings panel -----------------------------------------------------------
  const settingsToggle = $("#settings-toggle");
  const settingsPanel = $("#settings-panel");
  const settingWinter = $("#setting-winter");
  const settingCalm = $("#setting-calm");
  settingWinter.checked = winterMode;
  settingCalm.checked = calmMode;

  function openSettings() {
    settingsPanel.hidden = false;
    requestAnimationFrame(() => settingsPanel.classList.add("is-visible"));
    settingsToggle.classList.add("is-open");
    settingsToggle.setAttribute("aria-expanded", "true");
  }
  function closeSettings() {
    settingsPanel.classList.remove("is-visible");
    settingsToggle.classList.remove("is-open");
    settingsToggle.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      if (!settingsPanel.classList.contains("is-visible")) settingsPanel.hidden = true;
    }, 250);
  }
  settingsToggle.addEventListener("click", () => {
    settingsPanel.hidden ? openSettings() : closeSettings();
  });
  document.addEventListener("click", (e) => {
    if (!settingsPanel.hidden && !e.target.closest("#settings-panel, #settings-toggle")) closeSettings();
  });

  settingWinter.addEventListener("change", () => {
    winterMode = settingWinter.checked;
    store.set("fy_winter", winterMode);
    document.body.classList.toggle("season-winter", winterMode);
  });
  settingCalm.addEventListener("change", () => {
    calmMode = settingCalm.checked;
    store.set("fy_calm", calmMode);
    document.body.classList.toggle("calm-mode", calmMode);
  });

  /* ---------------------------------------------------------------- 9 -- */
  let lastT = performance.now();
  let lastDayNightUpdate = 0;
  let breathePhase = 0;

  function frame(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    const dtMs = t - lastT;
    lastT = t;

    if (t - lastDayNightUpdate > 400) {
      updateDayNight();
      lastDayNightUpdate = t;
    }

    ctx.clearRect(0, 0, W, H);
    drawStars(dt);
    drawSunMoon();
    maybeSpawnShootingStar(dtMs);
    drawShootingStars(dt);
    drawFireflies(dt);
    if (Math.random() < (calmMode ? 0.01 : 0.02) && currentDaylight < 0.7) spawnPetal();
    drawPetals(dt);
    drawSparkles(dt);
    drawHearts(dt);
    if (!winterMode) drawButterflies(dt);

    if (bodyReady && !calmMode) {
      breathePhase += dt * 0.12;
      const breathe = 1 + Math.sin(breathePhase) * 0.02;
      sceneEl.style.transform = `scale(${breathe.toFixed(4)}) rotate(${leanDeg.toFixed(2)}deg)`;
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("load", () => {
    initHiddenNotes();
    hidePreloader();
    requestAnimationFrame(frame);
  });
})();
