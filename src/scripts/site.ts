import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const LOADER_KEY = "shafri-portfolio-loader-seen";

let pageCleanup: Array<() => void> = [];
let fullLoaderPromise: Promise<void> | null = null;
let routeTransition = false;
let pageInitialized = false;

function getLoader() {
  return document.getElementById("site-loader");
}

function setLoaderProgress(value: number) {
  const loader = getLoader();
  if (!loader) return;
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  const text = loader.querySelector<HTMLElement>("[data-loader-value]");
  const bar = loader.querySelector<HTMLElement>("[data-loader-bar]");
  if (text) text.textContent = safeValue.toString().padStart(2, "0");
  if (bar) bar.style.transform = `scaleX(${safeValue / 100})`;
}

function showLoader(mode: "full" | "route") {
  const loader = getLoader();
  if (!loader) return;
  loader.classList.remove("is-leaving", "is-hidden");
  loader.classList.toggle("is-route", mode === "route");
  loader.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-loading");
  setLoaderProgress(mode === "route" ? 28 : 0);
}

function hideLoader() {
  const loader = getLoader();
  if (!loader) return;
  setLoaderProgress(100);
  loader.classList.add("is-leaving");
  window.setTimeout(() => {
    loader.classList.add("is-hidden");
    loader.classList.remove("is-leaving", "is-route");
    loader.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-loading");
  }, 720);
}

function waitForHero() {
  const image = document.querySelector<HTMLImageElement>("[data-loader-hero]");
  if (!image || image.complete) return Promise.resolve();
  return image.decode?.().catch(() => undefined) ?? Promise.resolve();
}

function runFullLoader() {
  if (fullLoaderPromise) return fullLoaderPromise;
  fullLoaderPromise = new Promise<void>((resolve) => {
    const seen = sessionStorage.getItem(LOADER_KEY) === "1";
    if (seen) {
      const loader = getLoader();
      loader?.classList.add("is-hidden");
      document.body.classList.remove("is-loading");
      resolve();
      return;
    }

    showLoader("full");
    const startedAt = performance.now();
    const progress = { value: 0 };
    const tween = gsap.to(progress, {
      value: 88,
      duration: 1.25,
      ease: "power2.out",
      onUpdate: () => setLoaderProgress(progress.value),
    });

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const assetsReady = Promise.allSettled([fontsReady, waitForHero()]);
    const hardCap = new Promise((done) => window.setTimeout(done, 3000));

    Promise.race([assetsReady, hardCap]).then(() => {
      const remaining = Math.max(0, 1200 - (performance.now() - startedAt));
      window.setTimeout(() => {
        tween.kill();
        gsap.to(progress, {
          value: 100,
          duration: 0.22,
          ease: "power2.inOut",
          onUpdate: () => setLoaderProgress(progress.value),
          onComplete: () => {
            sessionStorage.setItem(LOADER_KEY, "1");
            hideLoader();
            window.setTimeout(resolve, 650);
          },
        });
      }, remaining);
    });
  });
  return fullLoaderPromise;
}

function closeMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const toggle = document.getElementById("menu-toggle");
  if (!menu || !toggle) return;
  menu.dataset.open = "false";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  document.body.classList.remove("menu-open");
}

function initNavigation() {
  const menu = document.getElementById("mobile-menu");
  const toggle = document.getElementById("menu-toggle");
  if (menu && toggle) {
    const onToggle = () => {
      const open = menu.dataset.open !== "true";
      menu.dataset.open = String(open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      document.body.classList.toggle("menu-open", open);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    toggle.addEventListener("click", onToggle);
    document.addEventListener("keydown", onKey);
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileMenu));
    pageCleanup.push(() => {
      toggle.removeEventListener("click", onToggle);
      document.removeEventListener("keydown", onKey);
    });
  }

  const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
  const navLinks = [...document.querySelectorAll<HTMLElement>("[data-nav-section]")];
  if (!sections.length || !navLinks.length) return;

  const setActive = (id: string) => {
    navLinks.forEach((link) => {
      const active = link.dataset.navSection === id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActive(visible.target.id);
    },
    { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.35] }
  );
  sections.forEach((section) => observer.observe(section));
  pageCleanup.push(() => observer.disconnect());
}

function initMotion() {
  const reduceMotion = window.matchMedia(REDUCED_MOTION).matches;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

  if (reduceMotion) {
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      el.textContent = el.dataset.count ?? el.textContent;
    });
    return;
  }

  const heroItems = document.querySelectorAll<HTMLElement>("[data-hero-reveal]");
  if (heroItems.length) {
    gsap.from(heroItems, {
      yPercent: 115,
      opacity: 0,
      duration: 1.05,
      ease: "expo.out",
      stagger: 0.09,
      delay: fullLoaderPromise ? 0.05 : 0.2,
    });
  }

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 54,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-kinetic]").forEach((el) => {
    gsap.fromTo(
      el,
      { fontVariationSettings: '"wdth" 68, "wght" 800' },
      {
        fontVariationSettings: '"wdth" 135, "wght" 800',
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 },
      }
    );
  });

  document.querySelectorAll<HTMLElement>("[data-image-reveal]").forEach((el) => {
    gsap.from(el, {
      clipPath: "inset(0 100% 0 0)",
      scale: 1.08,
      duration: 1.15,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 86%", once: true },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const distance = Number(el.dataset.parallax) || 8;
    gsap.to(el, {
      yPercent: distance,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (Number.isNaN(target)) return;
    const counter = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: target,
          duration: 1.4,
          ease: "power3.out",
          onUpdate: () => { el.textContent = Math.round(counter.value).toString(); },
        });
      },
    });
  });

  ScrollTrigger.refresh();
}

function teardownPage() {
  pageCleanup.forEach((cleanup) => cleanup());
  pageCleanup = [];
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  closeMobileMenu();
}

async function bootstrap() {
  if (pageInitialized) return;
  pageInitialized = true;
  await runFullLoader();
  initNavigation();
  initMotion();
  if (routeTransition) {
    routeTransition = false;
    window.setTimeout(hideLoader, 120);
  }
}

document.addEventListener("astro:before-preparation", () => {
  teardownPage();
  pageInitialized = false;
  routeTransition = true;
  showLoader("route");
});
document.addEventListener("astro:page-load", bootstrap);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
