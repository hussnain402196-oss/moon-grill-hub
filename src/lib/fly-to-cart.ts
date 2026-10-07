/**
 * "Fly to cart" effect: a copy of the dish photo shrinks along a curved path
 * into the cart icon. Triggered from addToCart using the last tapped element,
 * so every add button gets the effect without per-button wiring.
 */
let lastTap: { el: Element; at: number } | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target instanceof Element) lastTap = { el: e.target, at: Date.now() };
    },
    { capture: true, passive: true },
  );
}

function findImage(from: Element): HTMLImageElement | null {
  let node: Element | null = from;
  for (let i = 0; node && i < 8; i++, node = node.parentElement) {
    const imgs = Array.from(node.querySelectorAll("img")).filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 40 && r.height > 40 && img.currentSrc;
    });
    if (imgs.length) return imgs[0] as HTMLImageElement;
  }
  return null;
}

function findTarget(): DOMRect | null {
  for (const el of Array.from(document.querySelectorAll("[data-cart-target]"))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

export function flyFromLastTap() {
  if (typeof window === "undefined" || !lastTap || Date.now() - lastTap.at > 1500) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const btn = lastTap.el.closest("button");
  if (btn) gooeyAdded(btn as HTMLElement, reduce);
  if (reduce) { lastTap = null; return; }
  const img = findImage(lastTap.el);
  lastTap = null;
  if (!img) return;
  const from = img.getBoundingClientRect();
  const src = img.currentSrc;

  // Cart icon may mount on the first add — wait two frames for it.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const to = findTarget();
      const endX = to ? to.left + to.width / 2 : 40;
      const endY = to ? to.top + to.height / 2 : window.innerHeight - 40;
      const size = Math.min(from.width, from.height, 220);
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;

      const ghost = document.createElement("img");
      ghost.src = src;
      ghost.alt = "";
      ghost.setAttribute("aria-hidden", "true");
      ghost.className = "fly-to-cart";
      Object.assign(ghost.style, {
        width: `${size}px`,
        height: `${size}px`,
        left: `${startX - size / 2}px`,
        top: `${startY - size / 2}px`,
      });
      document.body.appendChild(ghost);

      const dx = endX - startX;
      const dy = endY - startY;
      const lift = Math.min(160, Math.abs(dy) * 0.35 + 60);
      const anim = ghost.animate(
        [
          { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${dx * 0.35}px, ${dy * 0.35 - lift}px) scale(0.7) rotate(-12deg)`,
            opacity: 1,
            offset: 0.35,
          },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${24 / size}) rotate(20deg)`,
            opacity: 0.6,
          },
        ],
        { duration: 850, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" },
      );
      anim.onfinish = () => {
        ghost.remove();
        document.querySelectorAll("[data-cart-target]").forEach((el) => {
          el.animate(
            [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
            { duration: 360, easing: "ease-out" },
          );
        });
      };
    }),
  );
}

const noise = (n = 1) => n / 2 - Math.random() * n;

/** Gooey burst + "Added" pill on the tapped add button (from the gooey example). */
function gooeyAdded(btn: HTMLElement, reduce: boolean) {
  if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
  btn.querySelector(".atc-added")?.remove();
  const pill = document.createElement("span");
  pill.className = "atc-added";
  pill.setAttribute("aria-hidden", "true");
  pill.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Added';
  btn.appendChild(pill);
  window.setTimeout(() => pill.classList.add("out"), 2300);
  window.setTimeout(() => pill.remove(), 2700);
  if (reduce) return;

  if (!document.getElementById("atc-goo-filter")) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0";
    svg.innerHTML =
      '<filter id="atc-goo-filter" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter>';
    document.body.appendChild(svg);
  }
  const r = btn.getBoundingClientRect();
  const fx = document.createElement("span");
  fx.className = "atc-goo";
  fx.setAttribute("aria-hidden", "true");
  Object.assign(fx.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(fx);
  const count = 15;
  for (let i = 0; i < count; i++) {
    const a = ((360 + noise(8)) / count) * i * (Math.PI / 180);
    const d0 = Math.max(r.width, r.height) / 2 + 28, d1 = 10 + noise(7);
    const t = 1200 + noise(600);
    fx.style.setProperty("--time", "1500ms");
    const rot = noise(10);
    const p = document.createElement("span");
    p.className = "atc-particle";
    p.style.cssText = `--sx:${d0 * Math.cos(a)}px;--sy:${d0 * Math.sin(a)}px;--ex:${d1 * Math.cos(a)}px;--ey:${d1 * Math.sin(a)}px;--time:${t}ms;--scale:${1 + noise(0.2)};--rotate:${(rot > 0 ? rot + 5 : rot - 5) * 10}deg`;
    p.appendChild(document.createElement("i"));
    fx.appendChild(p);
  }
  requestAnimationFrame(() => fx.classList.add("active"));
  window.setTimeout(() => fx.classList.add("out"), 2300);
  window.setTimeout(() => fx.remove(), 2700);
}
