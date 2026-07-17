import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const LOADER_KEY = "shafri-portfolio-loader-seen";
const SCROLL_FOCUS_SELECTOR = [
  ".hero-section",
  ".portfolio-section",
  ".project-feature",
  ".contact-section",
  ".archive-hero",
  ".archive-section",
  ".case-hero",
  ".case-image",
  ".case-body",
  ".next-case",
].join(",");

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

function initScrollResistance() {
  if (window.matchMedia(REDUCED_MOTION).matches) return;

  const targets = [...document.querySelectorAll<HTMLElement>(SCROLL_FOCUS_SELECTOR)];
  if (!targets.length) return;

  const releasedTargets = new Set<HTMLElement>();
  let gateTarget: HTMLElement | null = null;
  let gateStartedAt = 0;
  let wheelPressure = 0;
  let touchTarget: HTMLElement | null = null;
  let touchStartY = 0;

  const topInset = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

  const clearExitedTargets = () => {
    releasedTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) releasedTargets.delete(target);
    });
  };

  const getFocusedTarget = () => {
    const inset = topInset();
    const availableHeight = Math.max(1, window.innerHeight - inset);
    const candidates = targets
      .map((target) => {
        const rect = target.getBoundingClientRect();
        const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, inset));
        return { target, height: rect.height, visible };
      })
      .filter(({ height, visible }) => height >= availableHeight * 0.72 && visible >= availableHeight * 0.78)
      .sort((a, b) => a.height - b.height);

    return candidates[0]?.target ?? null;
  };

  const canScrollNestedElement = (origin: EventTarget | null, delta: number) => {
    let element = origin instanceof Element ? origin : null;
    while (element && element !== document.body) {
      const style = getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) {
        const canMoveDown = delta > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1;
        const canMoveUp = delta < 0 && element.scrollTop > 1;
        if (canMoveDown || canMoveUp) return true;
      }
      element = element.parentElement;
    }
    return false;
  };

  const resetWheelGate = (target: HTMLElement | null) => {
    gateTarget = target;
    gateStartedAt = performance.now();
    wheelPressure = 0;
  };

  const onWheel = (event: WheelEvent) => {
    if (
      event.ctrlKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
      document.body.classList.contains("is-loading") ||
      document.body.classList.contains("menu-open") ||
      canScrollNestedElement(event.target, event.deltaY)
    ) return;

    clearExitedTargets();
    const target = getFocusedTarget();
    if (!target || releasedTargets.has(target)) {
      if (gateTarget !== target) resetWheelGate(target);
      return;
    }

    if (gateTarget !== target) resetWheelGate(target);

    const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;
    wheelPressure += Math.min(Math.abs(event.deltaY * deltaScale), 120);

    const heldLongEnough = performance.now() - gateStartedAt >= 340;
    if (heldLongEnough && wheelPressure >= 180) {
      releasedTargets.add(target);
      resetWheelGate(null);
      return;
    }

    event.preventDefault();
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || document.body.classList.contains("menu-open")) return;
    clearExitedTargets();
    const target = getFocusedTarget();
    touchTarget = target && !releasedTargets.has(target) ? target : null;
    touchStartY = event.touches[0].clientY;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!touchTarget || event.touches.length !== 1) return;
    const distance = Math.abs(event.touches[0].clientY - touchStartY);
    event.preventDefault();
    if (distance >= 72) {
      releasedTargets.add(touchTarget);
      touchTarget = null;
    }
  };

  const onTouchEnd = () => {
    touchTarget = null;
  };

  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });

  pageCleanup.push(() => {
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
  });
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
  initScrollResistance();
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
