/* =========================================================================
   FOR YOU 🌸 — v2 interactive experience
   Sections:
   1. Setup & small helpers
   2. Envelope gate (start experience)
   3. Typewriter + floating love quotes
   4. Day / night cycle (sky, sun, moon, stars, fireflies)
   5. Canvas particle system (petals, sparkles, hearts, butterflies)
   6. Pointer interaction (bloom on click, petals on move, lean, bouquet)
   7. Hidden notes on the big tree flowers
   8. Ripple effect
   9. Ambient music toggle (WebAudio, no external files needed)
   10. Main render loop
   ========================================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------------- 1 -- */
  const $ = (sel) => document.querySelector(sel);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const PERSONAL_MESSAGE = "For You ❤️";
  const HIDDEN_NOTES = [
    "Every petal here bloomed just for you.",
    "You make ordinary days feel like this garden.",
    "Some things grow slowly. Some, like this, grew all at once.",
    "I made this so you'd have a little garden of your own.",
  ];
  const LOVE_QUOTES = [
    "“You are my favorite kind of weather.”",
    "“Home isn't a place, it's a person.”",
    "“Every flower here whispers your name.”",
    "“Some gardens grow in the heart instead of the ground.”",
    "“I'd plant a thousand of these for one of your smiles.”",
  ];

  let bodyReady = false; // becomes true once envelope opens

  /* ---------------------------------------------------------------- 2 -- */
  const envelopeScreen = $("#envelope-screen");

  function openEnvelope() {
    if (bodyReady) return;
    envelopeScreen.classList.add("is-opening");
    setTimeout(() => {
      envelopeScreen.classList.add("is-open");
      document.body.classList.remove("container"); // un-pause all CSS animations
      bodyReady = true;
      startTypewriter();
      startQuoteCycle();
      startFireflySeed();
    }, 650);
  }
  envelopeScreen.addEventListener("click", openEnvelope);
  envelopeScreen.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      openEnvelope();
    },
    { passive: false }
  );

  /* ---------------------------------------------------------------- 3 -- */
  function startTypewriter() {
    const el = $("#typewriter");
    const panel = $("#message-panel");
    panel.classList.add("is-visible");
    let i = 0;
    const speed = 110;
    (function tick() {
      if (i <= PERSONAL_MESSAGE.length) {
        el.textContent = PERSONAL_MESSAGE.slice(0, i);
        i++;
        setTimeout(tick, speed);
      }
    })();
  }

  function startQuoteCycle() {
    const panel = $("#quote-panel");
    let idx = 0;
    function showNext() {
      panel.classList.remove("is-visible");
      setTimeout(() => {
        panel.textContent = LOVE_QUOTES[idx % LOVE_QUOTES.length];
        idx++;
        panel.classList.add("is-visible");
      }, 800);
    }
    setTimeout(showNext, 4000);
    setInterval(showNext, 11000);
  }

  /* ---------------------------------------------------------------- 4 -- */
  const DAY_CYCLE_MS = 120000; // one full day/night loop, tuned for a demo
  const cycleStart = Date.now() - DAY_CYCLE_MS * 0.55; // start mid-afternoon-ish
  const daySky = $("#day-sky");

  function getPhase() {
    return ((Date.now() - cycleStart) % DAY_CYCLE_MS) / DAY_CYCLE_MS; // 0..1
  }
  function daylightAmount(phase) {
    return (1 + Math.cos((phase - 0.5) * Math.PI * 2)) / 2; // 1 at noon, 0 at midnight
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
    for (let i = 0; i < 14; i++) fireflies.push(makeFirefly());
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

  // drifting petals ------------------------------------------------------
  const petals = [];
  function spawnPetal(x, y) {
    petals.push({
      x: x ?? rand(0, W),
      y: y ?? -10,
      vx: rand(-0.4, 0.4),
      vy: rand(0.4, 1.1),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.03, 0.03),
      size: rand(4, 9),
      hue: rand(325, 345),
      life: 1,
    });
  }

  // sparkles -------------------------------------------------------------
  const sparkles = [];
  function spawnSparkleBurst(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(0.6, 2.2);
      sparkles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        size: rand(1.5, 3.5),
      });
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
      amp: rand(20, 50),
      freq: rand(0.02, 0.04),
      hue: rand(20, 320),
    });
  }
  setInterval(() => {
    if (bodyReady && currentDaylight > 0.3 && butterflies.length < 3 && Math.random() < 0.6) {
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
    if (currentNightAmt < 0.2) return;
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
      ctx.fillStyle = `hsl(${p.hue}, 85%, 78%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
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
  let pointerX = window.innerWidth / 2;
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
  const MAX_GROWN = 45;
  const grownList = [];

  function growFlower(x, y, opts = {}) {
    const el = document.createElement("div");
    el.className = "grown-flower";
    const scale = opts.scale || rand(0.7, 1.25);
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.setProperty(
      "--petal-color",
      `hsl(${grownFlowerHues[Math.floor(rand(0, grownFlowerHues.length))]}, 78%, 68%)`
    );
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

  window.addEventListener("pointermove", (e) => {
    pointerX = e.clientX;
    const centerX = window.innerWidth / 2;
    leanDeg = clamp(((pointerX - centerX) / centerX) * 4, -4, 4);

    const now = performance.now();
    if (now - lastMoveSpawn > 60) {
      lastMoveSpawn = now;
      if (Math.random() < 0.7) spawnPetal(e.clientX + rand(-10, 10), e.clientY + rand(-10, 10));
    }
  });

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#music-toggle, #envelope-screen, #hidden-note")) return;

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
      fl.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = fl.getBoundingClientRect();
        note.textContent = HIDDEN_NOTES[i % HIDDEN_NOTES.length];
        note.style.left = rect.left + rect.width / 2 + "px";
        note.style.top = rect.top + "px";
        note.classList.add("is-visible");
        spawnHeart(rect.left + rect.width / 2, rect.top);
        clearTimeout(noteTimeout);
        noteTimeout = setTimeout(() => note.classList.remove("is-visible"), 3200);
      });
    });
  }

  /* ---------------------------------------------------------------- 9 -- */
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

    const notes = [196.0, 246.94, 293.66, 392.0]; // soft chord: G3 B3 D4 G4
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
    musicBtn.textContent = "🎵";
  }

  musicBtn.addEventListener("click", () => {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    musicPlaying ? stopMusic() : startMusic();
  });

  /* ---------------------------------------------------------------- 10 - */
  let lastT = performance.now();
  let lastDayNightUpdate = 0;
  let breathePhase = 0;

  function frame(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    if (t - lastDayNightUpdate > 400) {
      updateDayNight();
      lastDayNightUpdate = t;
    }

    ctx.clearRect(0, 0, W, H);
    drawStars(dt);
    drawSunMoon();
    drawFireflies(dt);
    if (Math.random() < 0.02 && currentDaylight < 0.7) spawnPetal();
    drawPetals(dt);
    drawSparkles(dt);
    drawHearts(dt);
    drawButterflies(dt);

    if (bodyReady) {
      breathePhase += dt * 0.12;
      const breathe = 1 + Math.sin(breathePhase) * 0.02;
      sceneEl.style.transform = `scale(${breathe.toFixed(4)}) rotate(${leanDeg.toFixed(2)}deg)`;
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("load", () => {
    initHiddenNotes();
    requestAnimationFrame(frame);
  });
})();
