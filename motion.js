// Decorative motion only. Content stays readable without this file and under reduced motion.
(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const BOOT_KEY = "tanomato.booted";
  const VEIL_KEY = "tanomato.veil";
  const session = {
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* Storage may be disabled. */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch { /* Storage may be disabled. */ } },
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const COLORS = ["var(--yellow)", "var(--pink)", "var(--mint)", "var(--blue)", "var(--purple)"];

  if (reduce) {
    root.classList.remove("is-booting", "is-arriving");
    return;
  }
  root.classList.add("motion");

  // Entrance effects wait until the opening or page wipe has uncovered the page.
  let started = false;
  const queue = [];
  const onStart = (fn) => (started ? fn() : queue.push(fn));
  const start = () => {
    if (started) return;
    started = true;
    queue.splice(0).forEach((fn) => fn());
  };
  const covered = root.classList.contains("is-booting") || root.classList.contains("is-arriving");

  /* ---------- Page wipe ---------- */
  const veil = d.createElement("div");
  veil.className = "tm-veil";
  veil.setAttribute("aria-hidden", "true");
  veil.innerHTML = "<i></i><i></i><i></i>";
  d.body.append(veil);
  const resetVeil = () => {
    veil.className = "tm-veil is-reset";
    void veil.offsetWidth;
    veil.className = "tm-veil";
  };
  // The yellow sheet leaves last, so reset only after it has finished.
  veil.firstChild.addEventListener("transitionend", () => {
    if (veil.classList.contains("is-leaving")) resetVeil();
  });

  if (root.classList.contains("is-arriving")) {
    session.del(VEIL_KEY);
    veil.classList.add("is-covered");
    root.classList.remove("is-arriving");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veil.classList.replace("is-covered", "is-leaving");
      setTimeout(start, 280);
    }));
  } else if (root.classList.contains("is-booting")) {
    boot();
  } else {
    start();
  }

  function boot() {
    session.set(BOOT_KEY, "1");
    const loader = d.createElement("div");
    loader.className = "tm-loader";
    loader.setAttribute("aria-hidden", "true");
    const word = d.createElement("p");
    word.className = "tm-loader__word";
    [..."TANOMATO."].forEach((ch, i) => {
      const s = d.createElement("span");
      s.textContent = ch;
      if (ch === ".") {
        s.className = "tm-loader__dot";
      } else {
        s.style.setProperty("--i", i);
        s.style.setProperty("--x", `${rand(-45, 45)}vw`);
        s.style.setProperty("--y", `${rand(-40, 40)}vh`);
        s.style.setProperty("--r", `${rand(-300, 300)}deg`);
      }
      word.append(s);
    });
    const tag = d.createElement("p");
    tag.className = "tm-loader__tag";
    tag.textContent = "頼むを、まとめる。";
    const bar = d.createElement("div");
    bar.className = "tm-loader__bar";
    bar.innerHTML = "<i></i>";
    loader.append(word, tag, bar);
    d.body.append(loader);
    root.classList.remove("is-booting");
    const finish = () => {
      if (loader.classList.contains("is-done")) return;
      loader.classList.add("is-done");
      setTimeout(start, 220);
      setTimeout(() => loader.remove(), 900);
    };
    loader.addEventListener("click", finish);
    addEventListener("keydown", finish, { once: true });
    setTimeout(finish, 1750);
  }

  // Only pages in the same folder share this script, so samples and proposals navigate normally.
  const baseDir = location.pathname.replace(/[^/]*$/, "");
  d.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname.replace(/[^/]*$/, "") !== baseDir || !/(\.html|\/)$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    session.set(VEIL_KEY, String(Date.now()));
    veil.className = "tm-veil is-covering";
    setTimeout(() => { location.href = url.href; }, 640);
  });
  addEventListener("pageshow", (e) => {
    if (e.persisted) resetVeil();
  });

  /* ---------- Headline letters ---------- */
  function splitHeadline(el) {
    const original = el.innerHTML;
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          const frag = d.createDocumentFragment();
          [...n.textContent].forEach((ch) => {
            if (!ch.trim()) { frag.append(ch); return; }
            const s = d.createElement("span");
            s.className = "tm-ch";
            s.textContent = ch;
            s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--i", i++);
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE && n.tagName !== "BR") {
          walk(n);
        }
      });
    };
    walk(el);
    el.classList.add("tm-chars", "is-waiting");
    onStart(() => {
      el.classList.remove("is-waiting");
      // Restore the original markup so underlines and line breaking return to normal.
      setTimeout(() => {
        el.innerHTML = original;
        el.removeAttribute("aria-label");
        el.classList.remove("tm-chars");
      }, 850 + i * 32);
    });
  }
  d.querySelectorAll(".studio-hero h1, .page-head h1").forEach(splitHeadline);

  /* ---------- Scroll reveal ---------- */
  const REVEAL = [
    ".page-head > :not(h1)", ".section-heading", ".audience-card", ".work-grid > *", ".service-grid > *",
    ".steps > li", ".approach-points > *", ".metric-strip > div", ".editorial > div > *",
    ".compare-teaser > *", ".guide-teaser > *", ".principles-grid > *", ".info-cards > *",
    ".support-card", ".case-intro > *", ".case-points > *", ".related-links > *", ".three-columns > *",
    ".legal-section", ".release-note", ".preparation-item", ".closing .wrap > *", ".content-list > *",
    ".process-list > *", ".work-list > *", ".audience-help",
  ].join(",");
  const CARDS = ".service-card, .audience-card, .work-grid > a, .support-card, .principle-card, .info-cards > *";
  const found = new Set(d.querySelectorAll(REVEAL));
  // Let children animate instead of their container.
  const targets = [...found].filter((el) => ![...found].some((o) => o !== el && el.contains(o)));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      onStart(() => {
        en.target.classList.add("is-in");
        en.target.querySelector(".tm-mark")?.classList.add("is-on");
      });
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -3% 0px" });
  const siblings = new Map();
  targets.forEach((el) => {
    // Without a cover, leave anything already on screen alone to avoid a flash.
    if (!covered && el.getBoundingClientRect().top < innerHeight) return;
    const n = siblings.get(el.parentElement) || 0;
    siblings.set(el.parentElement, n + 1);
    el.style.setProperty("--i", Math.min(n, 5));
    if (el.matches(CARDS)) el.style.setProperty("--tilt", `${rand(-4, 4).toFixed(1)}deg`);
    el.classList.add("tm-reveal");
    el.addEventListener("transitionend", function done(e) {
      if (e.target !== el || e.propertyName !== "translate" || !el.classList.contains("is-in")) return;
      el.removeEventListener("transitionend", done);
      el.classList.remove("tm-reveal", "is-in");
      el.style.removeProperty("--i");
      el.style.removeProperty("--tilt");
    });
    io.observe(el);
  });

  // Marker sweep under section titles on light backgrounds.
  d.querySelectorAll(".section-heading h2").forEach((h) => {
    if (h.closest(".ink, .closing")) return;
    const mark = d.createElement("span");
    mark.className = "tm-mark";
    mark.append(...h.childNodes);
    h.append(mark);
    const holder = h.closest(".tm-reveal");
    if (!holder) onStart(() => setTimeout(() => mark.classList.add("is-on"), 300));
  });

  /* ---------- Count up ---------- */
  const counters = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      counters.unobserve(en.target);
      const { node, head, to, tail } = en.target._count;
      onStart(() => {
        const t0 = performance.now();
        const tick = (now) => {
          const p = clamp((now - t0) / 1300);
          const v = Math.round(to * (1 - Math.pow(1 - p, 4)));
          node.textContent = head + v.toLocaleString("ja-JP") + tail;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });
  }, { threshold: 0.4 });
  d.querySelectorAll(".metric-strip b, .big-price, .support-price").forEach((el) => {
    const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const m = node && node.textContent.match(/^(\s*)([\d,]+)([\s\S]*)$/);
    if (!m) return;
    el._count = { node, head: m[1], to: Number(m[2].replace(/,/g, "")), tail: m[3] };
    node.textContent = m[1] + "0" + m[3];
    counters.observe(el);
  });

  /* ---------- Statement letters ---------- */
  const lights = [...d.querySelectorAll("p.large")].map((p) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          const frag = d.createDocumentFragment();
          [...n.textContent].forEach((ch) => {
            const s = d.createElement("span");
            s.className = "tm-lc";
            s.textContent = ch;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          walk(n);
        }
      });
    };
    walk(p);
    return { p, chars: [...p.querySelectorAll(".tm-lc")] };
  });

  /* ---------- Ticker ---------- */
  const ticker = d.querySelector(".color-ticker > div");
  let marquee = null;
  if (ticker) {
    const sep = () => {
      const i = d.createElement("i");
      i.textContent = "●";
      i.setAttribute("aria-hidden", "true");
      return i;
    };
    const clones = [...ticker.children].map((c) => {
      const copy = c.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      return copy;
    });
    ticker.append(sep(), ...clones, sep());
    marquee = ticker.getAnimations()[0] || null;
    // Start deep into the loop so scrolling up can run it backwards.
    if (marquee) marquee.currentTime = 32000 * 500;
  }

  /* ---------- Scroll: progress, header, letters, ticker speed ---------- */
  const progress = d.createElement("div");
  progress.className = "tm-progress";
  progress.setAttribute("aria-hidden", "true");
  d.body.append(progress);
  const header = d.querySelector(".site-header");
  const nav = d.querySelector("#navigation");
  let lastY = scrollY;
  let speed = 1;
  let ticking = false;
  let easing = false;
  const easeTicker = () => {
    speed += (1 - speed) * 0.06;
    if (marquee) marquee.playbackRate = speed;
    if (Math.abs(speed - 1) > 0.02) requestAnimationFrame(easeTicker);
    else { easing = false; if (marquee) marquee.playbackRate = 1; }
  };
  const update = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;
    const max = d.documentElement.scrollHeight - vh;
    progress.style.setProperty("--p", max > 0 ? clamp(y / max) : 0);
    if (header) {
      const keep = nav?.classList.contains("open") || header.contains(d.activeElement);
      header.classList.toggle("tm-hidden", !keep && y > lastY && y > 320);
    }
    const atEnd = y >= max - 2;
    lights.forEach(({ p, chars }) => {
      const r = p.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const ratio = atEnd ? 1 : clamp((vh * 0.88 - r.top) / (r.height + vh * 0.35));
      const n = Math.floor(ratio * chars.length);
      chars.forEach((c, i) => c.classList.toggle("on", i < n));
    });
    if (marquee) {
      const dy = y - lastY;
      speed = clamp(1 + dy / 6, -6, 8);
      if (Math.abs(speed) < 1 && dy < 0) speed = -1;
      marquee.playbackRate = speed;
      if (!easing) { easing = true; requestAnimationFrame(easeTicker); }
    }
    lastY = y;
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", update);
  update();

  /* ---------- Hero pieces and confetti ---------- */
  const hero = d.querySelector(".studio-hero");
  if (hero) {
    const layer = d.createElement("div");
    layer.className = "tm-pieces";
    layer.setAttribute("aria-hidden", "true");
    // On phones the text spans the full width, so keep the pieces peeking in from the edges.
    const narrow = innerWidth < 700;
    const spots = narrow
      ? [[97, 9], [98, 50], [0, 80], [62, 99]]
      : [[1, 2], [44, 3], [53, 90], [95, 58], [22, 95], [86, 4], [47, 50]];
    const shapes = ["is-circle", "is-square", "is-pill", "is-ring", "is-circle", "is-square", "is-ring"];
    spots.forEach(([x, y], i) => {
      const p = d.createElement("i");
      const size = narrow ? rand(12, 20) : rand(14, 32);
      p.className = `tm-piece ${shapes[i]}`;
      p.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;--s:${size}px;--c:${COLORS[i % COLORS.length]};--depth:${rand(10, 34).toFixed(0)};--fd:${rand(3.5, 7).toFixed(1)}s;--fr:${rand(-70, 70).toFixed(0)}deg`;
      layer.append(p);
    });
    hero.append(layer);
    if (fine) {
      addEventListener("pointermove", (e) => {
        const px = (e.clientX / innerWidth - 0.5).toFixed(3);
        const py = (e.clientY / innerHeight - 0.5).toFixed(3);
        layer.style.setProperty("--px", px);
        layer.style.setProperty("--py", py);
      }, { passive: true });
    }
    hero.addEventListener("click", (e) => {
      if (e.target.closest("a, button, input, label") || !getSelection().isCollapsed) return;
      for (let k = 0; k < 14; k++) {
        const bit = d.createElement("i");
        bit.className = "tm-burst";
        bit.setAttribute("aria-hidden", "true");
        bit.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;background:${pick(COLORS)};border-radius:${Math.random() < 0.5 ? "50%" : "3px"}`;
        d.body.append(bit);
        const ang = rand(0, Math.PI * 2);
        const dist = rand(60, 160);
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist;
        bit.animate([
          { transform: "translate(0,0) rotate(0deg) scale(.4)", opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) rotate(${rand(-200, 200)}deg) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx * 1.2}px,${dy + 140}px) rotate(${rand(-400, 400)}deg) scale(.8)`, opacity: 0 },
        ], { duration: rand(800, 1200), easing: "cubic-bezier(.22,1,.36,1)" }).finished.then(() => bit.remove());
      }
    });
  }

  if (!fine) return;

  /* ---------- Cards lean, buttons follow ---------- */
  d.querySelectorAll(`${CARDS}, .showcase-main, .showcase-small`).forEach((el) => {
    el.classList.add("tm-tilt");
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--tr", `${(((e.clientX - r.left) / r.width - 0.5) * 3).toFixed(2)}deg`);
    });
    el.addEventListener("pointerleave", () => el.style.removeProperty("--tr"));
  });
  d.querySelectorAll(".button, .nav-cta").forEach((el) => {
    el.classList.add("tm-magnet");
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    el.addEventListener("pointerleave", () => { el.style.translate = ""; });
  });

  /* ---------- Cursor ---------- */
  const ring = d.createElement("div");
  ring.className = "tm-cursor";
  const dot = d.createElement("div");
  dot.className = "tm-cursor-dot";
  [ring, dot].forEach((el) => el.setAttribute("aria-hidden", "true"));
  d.body.append(ring, dot);
  root.classList.add("has-cursor");
  let mx = -100, my = -100, rx = mx, ry = my, moving = false;
  const follow = () => {
    rx += (mx - rx) * 0.2;
    ry += (my - ry) * 0.2;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) requestAnimationFrame(follow);
    else moving = false;
  };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    ring.classList.add("is-visible");
    if (!moving) { moving = true; requestAnimationFrame(follow); }
  }, { passive: true });
  d.addEventListener("pointerover", (e) => {
    const t = e.target;
    const card = t.closest(".work-grid > a, .showcase-main, .showcase-small, .service-card, .audience-card");
    const link = !card && t.closest("a, button, summary, label, [role=button]");
    const field = t.closest("input, textarea, select");
    ring.classList.toggle("is-card", !!card);
    ring.classList.toggle("is-link", !!link);
    ring.classList.toggle("is-dark", !card && !!t.closest(".ink, .closing, .metric-strip"));
    ring.classList.toggle("is-field", !!field);
    dot.classList.toggle("is-field", !!field);
    ring.textContent = card ? "見る" : "";
  });
  d.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) ring.classList.remove("is-visible");
  });
  addEventListener("pointerdown", () => ring.classList.add("is-press"));
  addEventListener("pointerup", () => ring.classList.remove("is-press"));
})();
