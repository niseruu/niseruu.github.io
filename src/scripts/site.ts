import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const LOADER_KEY = "shafri-portfolio-loader-seen";
const SCROLL_FOCUS_SELECTOR = ".hero-section";

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

function setLoaderStatus(loaded: number, total: number) {
  const status = getLoader()?.querySelector<HTMLElement>("[data-loader-status]");
  if (!status) return;
  status.textContent = total > 0
    ? `LOADING IMAGES ${Math.min(loaded, total)} / ${total}`
    : "LOADING INTERFACE";
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

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    const decode = () => {
      if (typeof image.decode === "function") image.decode().catch(() => undefined).then(() => resolve());
      else resolve();
    };

    if (image.complete) {
      decode();
      return;
    }

    const finish = () => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      decode();
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

function trackPageAssets(start: number, end: number) {
  const images = [...document.querySelectorAll<HTMLImageElement>("main [data-loader-image]")];
  const progress = { value: start };
  let loaded = 0;
  let active = true;

  setLoaderProgress(start);
  setLoaderStatus(loaded, images.length);

  const updateProgress = () => {
    if (!active) return;
    loaded += 1;
    setLoaderStatus(loaded, images.length);
    const target = images.length > 0 ? start + (loaded / images.length) * (end - start) : end;
    gsap.to(progress, {
      value: target,
      duration: 0.24,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => setLoaderProgress(progress.value),
    });
  };

  const imageTasks = images.map((image) => waitForImage(image).then(updateProgress));
  const fontsReady = (document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (!images.length && active) {
      progress.value = end;
      setLoaderProgress(end);
    }
  });

  return {
    ready: Promise.allSettled([fontsReady, ...imageTasks]),
    stop: () => {
      active = false;
      gsap.killTweensOf(progress);
    },
  };
}

async function waitForPageAssets(options: { minimum: number; maximum: number; start: number; end: number }) {
  const startedAt = performance.now();
  const tracker = trackPageAssets(options.start, options.end);
  const hardCap = new Promise<void>((resolve) => window.setTimeout(resolve, options.maximum));
  await Promise.race([tracker.ready, hardCap]);
  const remaining = Math.max(0, options.minimum - (performance.now() - startedAt));
  if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));
  tracker.stop();
  setLoaderProgress(100);
  const status = getLoader()?.querySelector<HTMLElement>("[data-loader-status]");
  if (status) status.textContent = "ASSETS READY";
}

function runFullLoader() {
  if (fullLoaderPromise) return fullLoaderPromise;
  fullLoaderPromise = (async () => {
    const seen = sessionStorage.getItem(LOADER_KEY) === "1";
    showLoader(seen ? "route" : "full");
    await waitForPageAssets({
      minimum: seen ? 400 : 1200,
      maximum: 3000,
      start: seen ? 28 : 4,
      end: 94,
    });
    sessionStorage.setItem(LOADER_KEY, "1");
    hideLoader();
    await new Promise((resolve) => window.setTimeout(resolve, seen ? 540 : 650));
  })();
  return fullLoaderPromise;
}

function runRouteLoader() {
  return waitForPageAssets({ minimum: 400, maximum: 3000, start: 28, end: 94 });
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
    const image = el.matches("img") ? el : el.querySelector<HTMLElement>("img");
    if (!image) return;
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 86%", once: true },
    });
    timeline
      .from(el, {
        y: 30,
        duration: 0.9,
        ease: "expo.out",
        clearProps: "transform",
      })
      .from(image, {
        scale: 1.055,
        duration: 1.15,
        ease: "expo.out",
        clearProps: "transform",
      }, 0);
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
  const completingRoute = routeTransition;
  if (completingRoute) await runRouteLoader();
  initNavigation();
  initScrollResistance();
  initMotion();
  if (completingRoute) {
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
