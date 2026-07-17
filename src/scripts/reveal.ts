import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SCRUB_PRESETS: Record<string, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
  left: { from: { x: -160, rotateY: -26, scale: 0.88 }, to: { x: 0, rotateY: 0, scale: 1 } },
  right: { from: { x: 160, rotateY: 26, scale: 0.88 }, to: { x: 0, rotateY: 0, scale: 1 } },
  rotate: { from: { y: 120, rotateX: 18, scale: 0.88 }, to: { y: 0, rotateX: 0, scale: 1 } },
  "photo-left": { from: { x: -240, rotate: -16, scale: 0.82 }, to: { x: 0, rotate: -3, scale: 1 } },
  "photo-right": { from: { x: 240, rotate: 16, scale: 0.82 }, to: { x: 0, rotate: 3, scale: 1 } },
};

function initReveals() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll<HTMLElement>("[data-reveal]");

  if (reduceMotion) {
    revealEls.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  if (revealEls.length) {
    gsap.set(revealEls, { opacity: 0, y: 64, scale: 0.92, filter: "blur(6px)" });
    ScrollTrigger.batch(revealEls, {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.12,
        }),
    });
  }

  const scrubEls = document.querySelectorAll<HTMLElement>("[data-scrub]");
  if (reduceMotion) {
    scrubEls.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  } else {
    scrubEls.forEach((el) => {
      const preset = SCRUB_PRESETS[el.dataset.scrub ?? ""] ?? SCRUB_PRESETS.rotate;
      gsap.set(el, { ...preset.from, opacity: 0, transformPerspective: 900 });
      gsap.to(el, {
        ...preset.to,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 95%",
          end: "top 40%",
          scrub: 0.6,
        },
      });
    });
  }

  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const strength = Number(el.dataset.parallax) || 40;
    gsap.to(el, {
      yPercent: strength,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (Number.isNaN(target)) return;
    const counter = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(counter.value).toString();
          },
        });
      },
    });
  });
}

function bootstrap() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  initReveals();
  ScrollTrigger.refresh();
}

document.addEventListener("astro:page-load", bootstrap);
