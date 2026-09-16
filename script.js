/* =========================================================
   DonutSMP — script.js
   ========================================================= */

/* =========================================================
   0. SESSION FLAG — read once so multiple blocks can use it
   ========================================================= */
const CAME_FROM_NAV = sessionStorage.getItem("dnav") === "1";
if (CAME_FROM_NAV) sessionStorage.removeItem("dnav");


/* =========================================================
   HELPER — fetch through CORS proxies with fallback
   ========================================================= */
async function proxyFetch(url) {
  const wrappers = [
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://thingproxy.freeboard.io/fetch/" + u,
  ];

  for (const wrap of wrappers) {
    try {
      const res = await fetch(wrap(url));
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data === "object") return data;
    } catch {}
  }

  // Last resort: direct fetch
  try {
    const res = await fetch(url);
    return await res.json();
  } catch {
    return null;
  }
}


/* =========================================================
   1. BLOG "SHOW MORE / LESS" TOGGLE
   ========================================================= */
const PREVIEW_WORDS = 10;

document.querySelectorAll(".blog-card").forEach((card) => {
  const excerpt = card.querySelector(".blog-excerpt");
  const toggle = card.querySelector(".blog-toggle");
  if (!excerpt || !toggle) return;

  const fullText = excerpt.textContent.replace(/\s+/g, " ").trim();
  const words = fullText.split(" ");

  if (words.length <= PREVIEW_WORDS) {
    toggle.hidden = true;
    excerpt.textContent = fullText;
    return;
  }

  const previewText = words.slice(0, PREVIEW_WORDS).join(" ") + "…";

  excerpt.textContent = previewText;
  excerpt.classList.add("is-collapsed");

  toggle.addEventListener("click", () => {
    const collapsed = excerpt.classList.toggle("is-collapsed");

    if (collapsed) {
      excerpt.textContent = previewText;
      toggle.textContent = "Show more";
      toggle.setAttribute("aria-expanded", "false");
    } else {
      excerpt.textContent = fullText;
      toggle.textContent = "Show less";
      toggle.setAttribute("aria-expanded", "true");
    }
  });
});


/* =========================================================
   2. BLOG CAROUSEL (wheel)
   ========================================================= */
(function initCarousel() {
  const wheel = document.querySelector(".blog-wheel");
  if (!wheel) return;

  const cards = [...wheel.querySelectorAll(".blog-card")];
  const dots = [...document.querySelectorAll(".carousel-dot")];
  const prevBtn = document.querySelector(".carousel-prev");
  const nextBtn = document.querySelector(".carousel-next");

  const total = cards.length;
  if (!total) return;
  let current = 0;

  function applyPositions() {
    cards.forEach((card, i) => {
      const offset = (i - current + total) % total;
      let position;
      if (offset === 0) position = "front";
      else if (offset === 1) position = "next";
      else position = "prev";

      card.dataset.position = position;
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
    });
  }

  function goTo(index) {
    current = (index + total) % total;
    applyPositions();
  }

  nextBtn?.addEventListener("click", () => goTo(current + 1));
  prevBtn?.addEventListener("click", () => goTo(current - 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

  applyPositions();
})();


/* =========================================================
   3. COPY-TO-CLIPBOARD
   ========================================================= */
document.querySelectorAll(".copyable").forEach((el) => {
  el.addEventListener("click", async () => {
    const value = el.dataset.copy;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      el.classList.add("copied");
      setTimeout(() => el.classList.remove("copied"), 1200);
    } catch {
      /* silent fail */
    }
  });
});


/* =========================================================
   4. LIVE PLAYER COUNT — mcstatus.io via CORS proxy
   ========================================================= */
(function initPlayerCount() {
  const el = document.getElementById("playerCount");
  const dot = document.getElementById("statusDot");
  if (!el) return;

  const API = "https://api.mcstatus.io/v2/status/java/donutsmp.net";

  async function loadPlayerCount() {
    const data = await proxyFetch(API);

    if (!data || !data.online) {
      el.textContent = "Offline";
      dot?.classList.remove("online");
      return;
    }

    const online = data.players?.online ?? 0;
    const max = data.players?.max ?? 0;

    el.textContent = max
      ? online.toLocaleString() + " / " + max.toLocaleString()
      : online.toLocaleString();

    dot?.classList.add("online");
  }

  loadPlayerCount();
  setInterval(loadPlayerCount, 60000);
})();


/* =========================================================
   5. TELEPORT SOUND on page load (nav arrivals only)
   ========================================================= */
(function initTeleportSound() {
  if (CAME_FROM_NAV) {
    const sound = new Audio("Teleport1.ogg");
    sound.preload = "auto";
    sound.volume = 0.5;
    sound.play().catch(() => {});
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (link.target === "_blank") return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      sessionStorage.setItem("dnav", "1");
    });
  });
})();


/* =========================================================
   6. MINECRAFT-STYLE EXPLOSION on click (interactive only) + sound
   ========================================================= */
(function initExplosion() {
  const explosionSound = new Audio("Explosion1.ogg");
  explosionSound.preload = "auto";
  explosionSound.volume = 0.6;

  const CLICKABLE_SELECTOR = [
    "a",
    "button",
    "[role='button']",
    "input",
    "textarea",
    "select",
    "label",
    ".copyable",
    ".copy-trigger",
    ".carousel-arrow",
    ".carousel-dot",
    ".blog-toggle",
    ".rule summary"
  ].join(",");

  function spawnExplosion(x, y) {
    const wrap = document.createElement("div");
    wrap.className = "mc-boom";
    wrap.style.left = x + "px";
    wrap.style.top = y + "px";

    const PUFFS = 16;
    for (let i = 0; i < PUFFS; i++) {
      const angle = (360 / PUFFS) * i + Math.random() * 30;
      const dist = 25 + Math.random() * 65;
      const rad = (angle * Math.PI) / 180;

      const puff = document.createElement("span");
      puff.className = "mc-puff";
      puff.style.setProperty("--dx", Math.cos(rad) * dist + "px");
      puff.style.setProperty("--dy", Math.sin(rad) * dist + "px");
      puff.style.setProperty("--size", (10 + Math.random() * 26) + "px");
      puff.style.setProperty("--delay", (Math.random() * 40) + "ms");
      puff.style.setProperty("--rot", (Math.random() * 360) + "deg");
      puff.dataset.tone = Math.random() > 0.5 ? "light" : "dark";
      wrap.appendChild(puff);
    }

    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 900);
  }

  function playSound() {
    const s = explosionSound.cloneNode();
    s.volume = explosionSound.volume;
    s.play().catch(() => {});
  }

  document.addEventListener("click", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".nav-link")) return;

    const target = e.target.closest(CLICKABLE_SELECTOR);
    if (!target) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    spawnExplosion(e.clientX, e.clientY);
    playSound();
  });
})();


/* =========================================================
   7. PAGE LOAD — purple particle vignette pop, sway, fall, fade
   Only on nav arrivals. Slow, smooth ashes-style drift.
   ========================================================= */
(function initSparkles() {
  if (!CAME_FROM_NAV) return;

  const SHADES = [
    "#7c3aed",
    "#8b5cf6",
    "#a06fff",
    "#c084fc",
    "#d8b4fe",
    "#e9d5ff"
  ];

  const COUNT = 34;

  function spawnSparkles() {
    for (let i = 0; i < COUNT; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";

      const scale = 0.8 + Math.random() * 3.0;
      const color = SHADES[Math.floor(Math.random() * SHADES.length)];

      const angle = Math.random() * Math.PI * 2;
      const radius = 32 + Math.random() * 25;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;

      const duration = 6 + Math.random() * 5;
      const delay = Math.random() * 0.2;

      s.style.left = x + "vw";
      s.style.top = y + "vh";
      s.style.color = color;
      s.style.width = (scale * 10) + "px";
      s.style.height = (scale * 10) + "px";
      s.style.filter = `drop-shadow(0 0 ${scale * 3}px ${color})`;
      s.style.animationDuration = duration + "s";
      s.style.animationDelay = delay + "s";
      s.style.animationTimingFunction = "cubic-bezier(0.45, 0.05, 0.55, 0.95)";

      document.body.appendChild(s);
      setTimeout(() => s.remove(), (duration + delay) * 1000 + 200);
    }
  }

  if (document.readyState === "complete") {
    setTimeout(spawnSparkles, 60);
  } else {
    window.addEventListener("load", () => setTimeout(spawnSparkles, 60));
  }
})();


/* =========================================================
   8. DISCORD WIDGET — Donut SMP via CORS proxy
   ========================================================= */
(function initDiscordWidget() {
  const el = document.getElementById("discordWidget");
  if (!el) return;

  const INVITE = "https://discord.com/invite/donutsmp";
  const API = "https://discord.com/api/v9/invites/donutsmp?with_counts=true";

  async function loadDiscord() {
    const data = await proxyFetch(API);

    if (!data || !data.guild) {
      el.innerHTML = `
        <div class="discord-card discord-error">
          <div class="discord-top">
            <div class="discord-icon">
              <img src="donut.webp" alt="" class="discord-icon-img">
            </div>
            <div class="discord-info">
              <div class="discord-name">Donut SMP Community</div>
            </div>
          </div>
          <a href="${INVITE}" class="discord-join" target="_blank" rel="noopener noreferrer">
            Join the Discord →
          </a>
        </div>
      `;
      return;
    }

    const online = data.approximate_presence_count ?? 0;
    const total = data.approximate_member_count ?? 0;
    const name = data.guild.name || "Donut SMP";

    el.innerHTML = `
      <div class="discord-card">
        <div class="discord-top">
          <div class="discord-icon">
            <img src="donut.webp" alt="" class="discord-icon-img">
          </div>
          <div class="discord-info">
            <div class="discord-name">${name}</div>
            <div class="discord-count">
              <span class="discord-dot"></span>
              ${online.toLocaleString()} online • ${total.toLocaleString()} members
            </div>
          </div>
        </div>
        <a href="${INVITE}" class="discord-join" target="_blank" rel="noopener noreferrer">
          Join the Discord →
        </a>
      </div>
    `;
  }

  loadDiscord();
  setInterval(loadDiscord, 60000);
})();