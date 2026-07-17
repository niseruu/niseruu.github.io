function initCursorGlow() {
  const glow = document.getElementById("cursor-glow");
  if (!glow) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (reduceMotion || isCoarsePointer) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let raf = 0;

  const apply = () => {
    glow.style.setProperty("--x", `${x}px`);
    glow.style.setProperty("--y", `${y}px`);
    raf = 0;
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      x = event.clientX;
      y = event.clientY;
      glow.classList.add("active");
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", () => glow.classList.remove("active"));
}

document.addEventListener("astro:page-load", initCursorGlow);
