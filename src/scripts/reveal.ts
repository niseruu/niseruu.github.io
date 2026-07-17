import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
    gsap.set(revealEls, { opacity: 0, y: 46 });
    ScrollTrigger.batch(revealEls, {
      start: "top 85%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
        }),
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
