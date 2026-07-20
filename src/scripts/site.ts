import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const MOBILE_LAYOUT = "(max-width: 767px)";
const LOADER_KEY = "shafri-portfolio-loader-seen";

let pageCleanup: Array<() => void> = [];
let fullLoaderPromise: Promise<void> | null = null;
let routeTransition = false;
let pageInitialized = false;
let storySeek: ((section: string, behavior?: ScrollBehavior) => boolean) | null = null;

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
  const menuLinks = menu ? [...menu.querySelectorAll<HTMLAnchorElement>("a")] : [];
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
    menuLinks.forEach((link) => link.addEventListener("click", closeMobileMenu));
    pageCleanup.push(() => {
      toggle.removeEventListener("click", onToggle);
      document.removeEventListener("keydown", onKey);
      menuLinks.forEach((link) => link.removeEventListener("click", closeMobileMenu));
    });
  }

  const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav-section]")];
  if (!navLinks.length) return;

  const setActive = (id: string) => {
    navLinks.forEach((link) => {
      const active = link.dataset.navSection === id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const onStoryChange = (event: Event) => {
    const section = (event as CustomEvent<{ section?: string }>).detail?.section;
    if (section) setActive(section);
  };

  const onNavClick = (event: MouseEvent) => {
    const link = event.currentTarget as HTMLAnchorElement;
    const url = new URL(link.href, window.location.href);
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
    const targetPath = url.pathname.replace(/\/$/, "") || "/";
    const section = url.hash.slice(1);
    if (!section || currentPath !== targetPath || !storySeek?.(section, "smooth")) return;

    event.preventDefault();
    if (window.location.hash !== url.hash) window.history.pushState(null, "", url.hash);
    closeMobileMenu();
  };

  const onHistoryNavigation = () => {
    const section = window.location.hash.slice(1);
    if (section) storySeek?.(section, "auto");
  };

  navLinks.forEach((link) => link.addEventListener("click", onNavClick));
  document.addEventListener("story:change", onStoryChange);
  window.addEventListener("popstate", onHistoryNavigation);
  window.addEventListener("hashchange", onHistoryNavigation);
  pageCleanup.push(() => {
    navLinks.forEach((link) => link.removeEventListener("click", onNavClick));
    document.removeEventListener("story:change", onStoryChange);
    window.removeEventListener("popstate", onHistoryNavigation);
    window.removeEventListener("hashchange", onHistoryNavigation);
  });

  if (document.querySelector("[data-story-deck].is-active")) return;
  if (!sections.length) return;

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

function chunkElements(elements: HTMLElement[], size: number) {
  const groups: HTMLElement[][] = [];
  for (let index = 0; index < elements.length; index += size) {
    groups.push(elements.slice(index, index + size));
  }
  return groups;
}

function getStorySubframes(screen: HTMLElement, mobile: boolean) {
  if (mobile && screen.hasAttribute("data-story-project")) {
    return [...screen.querySelectorAll<HTMLElement>("[data-story-frame]")].map((element) => [element]);
  }

  const key = screen.dataset.storyKey;
  if (mobile && key === "publications") {
    return [...screen.querySelectorAll<HTMLElement>("[data-story-frame]")].map((element) => [element]);
  }
  if (key === "journey") {
    return chunkElements([...screen.querySelectorAll<HTMLElement>("[data-story-item]")], mobile ? 2 : 4);
  }
  if (mobile && (key === "tech-stack" || key === "scores")) {
    return [...screen.querySelectorAll<HTMLElement>("[data-story-item]")].map((element) => [element]);
  }
  if (mobile && key === "contact") {
    return [...screen.querySelectorAll<HTMLElement>("[data-story-frame]")].map((element) => [element]);
  }

  return [];
}

function getCompactFontSettings(element: HTMLElement) {
  const finalSettings = getComputedStyle(element).fontVariationSettings;
  const compactSettings = finalSettings.replace(/"wdth"\s+[-\d.]+/, '"wdth" 72');
  return { compactSettings, finalSettings };
}

function initStoryDeck() {
  const deck = document.querySelector<HTMLElement>("[data-story-deck]");
  const stage = deck?.querySelector<HTMLElement>("[data-story-stage]");
  const screens = stage ? [...stage.querySelectorAll<HTMLElement>(":scope > [data-story-screen]")] : [];
  if (!deck || !stage || screens.length < 2) return;

  const currentLabel = stage.querySelector<HTMLElement>("[data-story-current]");
  const totalLabel = stage.querySelector<HTMLElement>("[data-story-total]");
  const titleLabel = stage.querySelector<HTMLElement>("[data-story-label]");
  const progressBar = stage.querySelector<HTMLElement>("[data-story-progress]");
  const transitionRail = stage.querySelector<HTMLElement>("[data-story-transition-rail]");
  const transitionTrack = stage.querySelector<HTMLElement>("[data-story-transition-track]");
  const media = gsap.matchMedia();

  totalLabel && (totalLabel.textContent = String(screens.length).padStart(2, "0"));

  const resetAccessibility = () => {
    screens.forEach((screen) => {
      screen.inert = false;
      screen.removeAttribute("aria-hidden");
      screen.classList.remove("is-story-active", "has-story-subframes");
    });
  };

  media.add(
    { desktop: "(min-width: 768px)", mobile: MOBILE_LAYOUT, reduce: REDUCED_MOTION },
    (context) => {
      const mobile = Boolean(context.conditions?.mobile);
      const reduce = Boolean(context.conditions?.reduce);
      if (reduce) {
        deck.classList.remove("is-active");
        document.documentElement.classList.remove("story-deck-active");
        resetAccessibility();
        storySeek = null;
        return;
      }

      deck.classList.add("is-active");
      document.documentElement.classList.add("story-deck-active");

      const pageBeat = mobile ? 0.65 : 0.9;
      const subframeBeat = mobile ? 0.4 : 0.45;
      const master = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      const labels = new Map<string, number>();
      const groupLabels = new Map<string, number>();
      const thresholds: Array<{ time: number; index: number }> = [];
      const subframes = screens.map((screen) => getStorySubframes(screen, mobile));
      let cursor = 0;
      let subframeTransitions = 0;
      let activeIndex = -1;

      screens.forEach((screen, index) => {
        gsap.set(screen, {
          zIndex: index + 1,
          autoAlpha: index === 0 ? 1 : 0,
          visibility: index === 0 ? "visible" : "hidden",
          clipPath: index === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
          y: 0,
          scale: 1,
        });

        const groups = subframes[index];
        if (groups.length > 1) {
          screen.classList.add("has-story-subframes");
          subframeTransitions += groups.length - 1;
          groups.forEach((group, groupIndex) => {
            group.forEach((element, slot) => {
              gsap.set(element, {
                "--story-slot": slot,
                "--story-count": group.length,
                autoAlpha: groupIndex === 0 ? 1 : 0,
                visibility: groupIndex === 0 ? "visible" : "hidden",
                y: groupIndex === 0 ? 0 : 28,
              });
            });
          });
        }
      });

      if (transitionRail) gsap.set(transitionRail, { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" });

      screens.forEach((screen, index) => {
        const key = screen.dataset.storyKey ?? `screen-${index + 1}`;
        const group = screen.dataset.storyGroup ?? key;
        labels.set(key, cursor);
        if (!groupLabels.has(group)) groupLabels.set(group, cursor);
        master.addLabel(key, cursor);

        const groups = subframes[index];
        for (let groupIndex = 1; groupIndex < groups.length; groupIndex += 1) {
          const previous = groups[groupIndex - 1];
          const next = groups[groupIndex];
          master
            .set(next, { visibility: "visible" }, cursor)
            .to(previous, { autoAlpha: 0, y: -24, duration: subframeBeat }, cursor)
            .fromTo(
              next,
              { autoAlpha: 0, y: 28 },
              { autoAlpha: 1, y: 0, duration: subframeBeat, immediateRender: false },
              cursor
            )
            .set(previous, { visibility: "hidden" }, cursor + subframeBeat);
          cursor += subframeBeat;
        }

        const nextScreen = screens[index + 1];
        if (!nextScreen) return;

        const transitionStart = cursor;
        thresholds.push({ time: transitionStart + pageBeat / 2, index: index + 1 });
        const incomingType = nextScreen.querySelector<HTMLElement>("[data-kinetic]");
        const incomingImage = nextScreen.querySelector<HTMLElement>(
          ".project-image, .publication-image img, .case-image img"
        );

        master
          .set(nextScreen, { visibility: "visible", autoAlpha: 1 }, transitionStart)
          .to(
            screen,
            { y: "-8vh", scale: 0.975, opacity: 0.35, duration: pageBeat },
            transitionStart
          )
          .fromTo(
            nextScreen,
            { clipPath: "inset(100% 0% 0% 0%)", y: "12vh", scale: 1.015 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              y: 0,
              scale: 1,
              duration: pageBeat,
              immediateRender: false,
            },
            transitionStart
          );

        if (incomingType) {
          const { compactSettings, finalSettings } = getCompactFontSettings(incomingType);
          master.fromTo(
            incomingType,
            { fontVariationSettings: compactSettings },
            { fontVariationSettings: finalSettings, duration: pageBeat, immediateRender: false },
            transitionStart
          );
        }
        if (incomingImage) {
          master.fromTo(
            incomingImage,
            { scale: 1.045 },
            { scale: 1, duration: pageBeat, immediateRender: false },
            transitionStart
          );
        }
        if (transitionRail) {
          master
            .set(transitionRail, { autoAlpha: 1, scaleX: 0 }, transitionStart)
            .to(transitionRail, { scaleX: 1, duration: pageBeat * 0.72 }, transitionStart)
            .to(transitionRail, { autoAlpha: 0, duration: pageBeat * 0.28 }, transitionStart + pageBeat * 0.72)
            .set(transitionRail, { scaleX: 0 }, transitionStart + pageBeat);
        }
        if (transitionTrack) {
          master.fromTo(
            transitionTrack,
            { xPercent: -8 },
            { xPercent: 0, duration: pageBeat, immediateRender: false },
            transitionStart
          );
        }

        master.set(screen, { visibility: "hidden" }, transitionStart + pageBeat);
        cursor += pageBeat;
      });

      const setActiveScreen = (index: number) => {
        if (index === activeIndex) return;
        activeIndex = index;
        screens.forEach((screen, screenIndex) => {
          const active = screenIndex === index;
          screen.inert = !active;
          screen.setAttribute("aria-hidden", String(!active));
          screen.classList.toggle("is-story-active", active);
        });

        const screen = screens[index];
        const title = screen.dataset.storyTitle ?? `Screen ${index + 1}`;
        if (currentLabel) currentLabel.textContent = String(index + 1).padStart(2, "0");
        if (titleLabel) titleLabel.textContent = title.toUpperCase();
        document.dispatchEvent(new CustomEvent("story:change", {
          detail: {
            index,
            key: screen.dataset.storyKey,
            section: screen.dataset.storyGroup ?? screen.dataset.storyKey,
          },
        }));
      };

      const updateStoryState = () => {
        const time = master.time();
        let index = 0;
        thresholds.forEach((threshold) => {
          if (time >= threshold.time) index = threshold.index;
        });
        setActiveScreen(index);
        if (progressBar) {
          progressBar.style.transform = mobile
            ? `scaleX(${master.progress()})`
            : `scaleY(${master.progress()})`;
        }
      };

      setActiveScreen(0);
      if (progressBar) progressBar.style.transform = mobile ? "scaleX(0)" : "scaleY(0)";
      master.eventCallback("onUpdate", updateStoryState);

      const scrollDistance = () => {
        const pageDistance = (screens.length - 1) * window.innerHeight * (mobile ? 0.65 : 0.9);
        const frameDistance = subframeTransitions * window.innerHeight * (mobile ? 0.4 : 0.45);
        return Math.max(window.innerHeight, pageDistance + frameDistance);
      };

      const trigger = ScrollTrigger.create({
        trigger: stage,
        animation: master,
        start: () => `top ${mobile ? 58.4 : 0}px`,
        end: () => `+=${scrollDistance()}`,
        pin: stage,
        pinSpacing: true,
        scrub: mobile ? 0.12 : 0.25,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: updateStoryState,
        onRefresh: updateStoryState,
      });

      const seekLabels = new Map([...labels, ...groupLabels]);
      storySeek = (section, behavior = "smooth") => {
        const targetTime = seekLabels.get(section);
        const duration = master.duration();
        if (targetTime === undefined || duration <= 0) return false;
        const targetScroll = trigger.start + (targetTime / duration) * (trigger.end - trigger.start);
        window.scrollTo({ top: targetScroll, behavior });
        return true;
      };

      const initialHash = window.location.hash.slice(1);
      if (initialHash && seekLabels.has(initialHash)) {
        requestAnimationFrame(() => storySeek?.(initialHash, "auto"));
      }

      ScrollTrigger.refresh();

      return () => {
        trigger.kill();
        master.revert();
        storySeek = null;
        resetAccessibility();
        deck.classList.remove("is-active");
        document.documentElement.classList.remove("story-deck-active");
        if (progressBar) progressBar.style.removeProperty("transform");
      };
    }
  );

  pageCleanup.push(() => {
    media.revert();
    storySeek = null;
    resetAccessibility();
    deck.classList.remove("is-active");
    document.documentElement.classList.remove("story-deck-active");
  });
}

function initMotion() {
  const reduceMotion = window.matchMedia(REDUCED_MOTION).matches;
  const mobileLayout = window.matchMedia(MOBILE_LAYOUT).matches;
  const outsideActiveDeck = (element: HTMLElement) => !element.closest("[data-story-deck].is-active");

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

  [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(outsideActiveDeck).forEach((el) => {
    gsap.from(el, {
      y: mobileLayout ? 28 : 54,
      opacity: 0,
      duration: mobileLayout ? 0.72 : 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  [...document.querySelectorAll<HTMLElement>("[data-kinetic]")].filter(outsideActiveDeck).forEach((el) => {
    if (mobileLayout) {
      const finalSettings = getComputedStyle(el).fontVariationSettings;
      const compactSettings = finalSettings.replace(/"wdth"\s+[-\d.]+/, '"wdth" 72');
      gsap.fromTo(
        el,
        { fontVariationSettings: compactSettings, y: 18, opacity: 0.76 },
        {
          fontVariationSettings: finalSettings,
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          clearProps: "fontVariationSettings,transform,opacity",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }
      );
      return;
    }

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

  [...document.querySelectorAll<HTMLElement>("[data-image-reveal]")].filter(outsideActiveDeck).forEach((el) => {
    const image = el.matches("img") ? el : el.querySelector<HTMLElement>("img");
    if (!image) return;
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 86%", once: true },
    });
    timeline
      .from(el, {
        y: mobileLayout ? 20 : 30,
        duration: mobileLayout ? 0.72 : 0.9,
        ease: "expo.out",
        clearProps: "transform",
      })
      .from(image, {
        scale: mobileLayout ? 1.025 : 1.055,
        duration: mobileLayout ? 0.9 : 1.15,
        ease: "expo.out",
        clearProps: "transform",
      }, 0);
  });

  [...document.querySelectorAll<HTMLElement>("[data-parallax]")].filter(outsideActiveDeck).forEach((el) => {
    const distance = Number(el.dataset.parallax) || 8;
    gsap.to(el, {
      yPercent: distance,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  [...document.querySelectorAll<HTMLElement>("[data-count]")].filter(outsideActiveDeck).forEach((el) => {
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
  initStoryDeck();
  initNavigation();
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
