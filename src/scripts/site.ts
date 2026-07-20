import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { dossierPages } from "../data/dossierPages";

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

  if (document.querySelector("[data-operator-deck].is-active")) return;
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

function initOperatorDeck() {
  const deck = document.querySelector<HTMLElement>("[data-operator-deck]");
  const stage = deck?.querySelector<HTMLElement>("[data-operator-stage]");
  const pages = stage ? [...stage.querySelectorAll<HTMLElement>("[data-dossier-page]")] : [];
  const handoff = stage?.querySelector<HTMLElement>("[data-operator-handoff]");
  if (!deck || !stage || !handoff || pages.length !== dossierPages.length) return;

  const currentLabel = stage.querySelector<HTMLElement>("[data-dossier-current]");
  const codeLabel = stage.querySelector<HTMLElement>("[data-dossier-code]");
  const announcer = stage.querySelector<HTMLElement>("[data-dossier-announcer]");
  const previousButton = stage.querySelector<HTMLButtonElement>("[data-dossier-prev]");
  const nextButton = stage.querySelector<HTMLButtonElement>("[data-dossier-next]");
  const targetButtons = [...stage.querySelectorAll<HTMLButtonElement>("[data-dossier-target]")];
  const pageMarks = [...stage.querySelectorAll<HTMLButtonElement>(".operator-page-track [data-dossier-target]")];
  const chapterButtons = [...stage.querySelectorAll<HTMLButtonElement>(".operator-chapters [data-dossier-target]")];
  const fromLabel = handoff.querySelector<HTMLElement>("[data-handoff-from]");
  const toLabel = handoff.querySelector<HTMLElement>("[data-handoff-to]");
  const shutters = [...handoff.querySelectorAll<HTMLElement>(".operator-shutter")];
  const spine = handoff.querySelector<HTMLElement>(".operator-handoff-spine");
  const handoffRules = [...handoff.querySelectorAll<HTMLElement>(".operator-handoff-rule")];
  const pageIndex = new Map(pages.map((page, index) => [page.dataset.dossierId ?? "", index]));
  const hashIndex = new Map<string, number>();
  const media = gsap.matchMedia();

  pages.forEach((page, index) => {
    const hash = page.dataset.dossierHash;
    const id = page.dataset.dossierId;
    const section = page.dataset.dossierSection;
    if (hash) hashIndex.set(hash, index);
    if (id) hashIndex.set(id, index);
    if (section && !hashIndex.has(section)) hashIndex.set(section, index);
  });

  const resetPages = () => {
    pages.forEach((page) => {
      page.inert = false;
      page.removeAttribute("aria-hidden");
      page.classList.remove("is-dossier-active", "is-dossier-incoming", "is-dossier-outgoing");
      page.style.removeProperty("visibility");
      page.style.removeProperty("z-index");
      page.style.removeProperty("clip-path");
      page.style.removeProperty("background-color");
      page.style.removeProperty("background-image");
      page.querySelectorAll<HTMLElement>("[data-dossier-zone], [data-dossier-display]").forEach((element) => {
        element.removeAttribute("style");
      });
    });
  };

  media.add("(prefers-reduced-motion: no-preference)", () => {
    const initialHash = window.location.hash.slice(1);
    let activeIndex = hashIndex.get(initialHash) ?? 0;
    let transitioning = false;
    let transition: gsap.core.Timeline | null = null;
    let wheelAmount = 0;
    let wheelDirection = 0;
    let lastWheelAt = 0;
    let wheelNeedsQuiet = false;
    let wheelReset = 0;
    let ownershipTimer = 0;
    let queuedHistoryTarget: number | null = null;
    let touchStart: { x: number; y: number; interactive: boolean } | null = null;

    deck.classList.add("is-active");
    document.documentElement.classList.add("operator-deck-active");

    const updateInterface = (index: number, announce = true) => {
      activeIndex = index;
      pages.forEach((page, pageNumber) => {
        const active = pageNumber === index;
        page.inert = !active;
        page.setAttribute("aria-hidden", String(!active));
        page.classList.toggle("is-dossier-active", active);
        page.classList.remove("is-dossier-incoming", "is-dossier-outgoing");
        gsap.set(page, { visibility: active ? "visible" : "hidden", zIndex: active ? 2 : 1, clearProps: "clipPath,transform" });
      });

      const record = dossierPages[index];
      if (currentLabel) currentLabel.textContent = String(index + 1).padStart(2, "0");
      if (codeLabel) codeLabel.textContent = record.code;
      if (announcer && announce) announcer.textContent = `Page ${index + 1} of ${pages.length}: ${record.title}`;
      pageMarks.forEach((mark, markIndex) => {
        const active = markIndex === index;
        mark.classList.toggle("is-active", active);
        if (active) mark.setAttribute("aria-current", "step");
        else mark.removeAttribute("aria-current");
      });
      chapterButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.dossierTarget === record.id || pageIndex.get(button.dataset.dossierTarget ?? "") === hashIndex.get(record.section));
      });
      if (previousButton) previousButton.disabled = index === 0;
      if (nextButton) nextButton.disabled = index === pages.length - 1;
      document.dispatchEvent(new CustomEvent("story:change", {
        detail: { index, key: record.id, section: record.section },
      }));
    };

    const writeHash = (index: number, mode: "push" | "replace" | "none") => {
      if (mode === "none") return;
      const nextHash = `#${dossierPages[index].hash}`;
      if (window.location.hash === nextHash) return;
      if (mode === "push") window.history.pushState(null, "", nextHash);
      else window.history.replaceState(null, "", nextHash);
    };

    const goTo = (
      targetIndex: number,
      options: { history?: "push" | "replace" | "none"; animate?: boolean } = {}
    ) => {
      const boundedIndex = Math.max(0, Math.min(pages.length - 1, targetIndex));
      if (boundedIndex === activeIndex || transitioning) return boundedIndex === activeIndex;

      const outgoing = pages[activeIndex];
      const incoming = pages[boundedIndex];
      const outgoingZones = [...outgoing.querySelectorAll<HTMLElement>("[data-dossier-zone]")];
      const incomingZones = [...incoming.querySelectorAll<HTMLElement>("[data-dossier-zone]")];
      const outgoingTitle = outgoing.querySelector<HTMLElement>("[data-dossier-display]");
      const incomingTitle = incoming.querySelector<HTMLElement>("[data-dossier-display]");
      const direction = boundedIndex > activeIndex ? 1 : -1;
      const outgoingIndex = activeIndex;
      const outgoingRecord = dossierPages[outgoingIndex];
      const incomingRecord = dossierPages[boundedIndex];
      const internalTransition = outgoingRecord.section === incomingRecord.section;
      const duration = internalTransition ? 0.46 : Math.abs(boundedIndex - activeIndex) > 1 ? 0.56 : 0.68;
      const moveOut = direction > 0 ? "-9vw" : "9vw";
      const moveIn = direction > 0 ? "7vw" : "-7vw";
      const outgoingClip = direction > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
      const incomingClip = direction > 0
        ? "polygon(100% 0%, 100% 0%, 92% 100%, 92% 100%)"
        : "polygon(0% 0%, 0% 0%, 8% 100%, 8% 100%)";
      const fullClip = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
      const fullInset = "inset(0% 0% 0% 0%)";
      const hadFocus = outgoing.contains(document.activeElement);

      writeHash(boundedIndex, options.history ?? "replace");
      if (options.animate === false) {
        updateInterface(boundedIndex);
        return true;
      }

      transitioning = true;
      deck.classList.add("is-transitioning");
      deck.dataset.direction = direction > 0 ? "forward" : "backward";
      deck.dataset.transition = internalTransition ? outgoingRecord.section : "chapter";
      outgoing.classList.add("is-dossier-outgoing");
      incoming.classList.add("is-dossier-incoming");
      incoming.inert = true;
      incoming.setAttribute("aria-hidden", "true");
      gsap.set(outgoing, { visibility: "visible", zIndex: 2, clipPath: fullClip });
      gsap.set(incoming, {
        visibility: "visible",
        zIndex: 3,
        clipPath: internalTransition ? fullInset : incomingClip,
      });

      if (internalTransition) {
        gsap.set(handoff, { visibility: "hidden" });
        gsap.set([outgoing, incoming], { backgroundColor: "transparent", backgroundImage: "none" });
      } else {
        gsap.set(handoff, { visibility: "visible" });
        if (fromLabel) fromLabel.textContent = String(outgoingIndex + 1).padStart(2, "0");
        if (toLabel) toLabel.textContent = String(boundedIndex + 1).padStart(2, "0");
        const leading = direction > 0 ? -125 : 125;
        gsap.set(shutters, { xPercent: leading });
        gsap.set(handoffRules, { scaleX: 0, transformOrigin: direction > 0 ? "left center" : "right center" });
        if (spine) gsap.set(spine, { x: direction > 0 ? -120 : window.innerWidth + 120 });
        gsap.set(incomingZones, { x: moveIn, clipPath: incomingClip });
      }

      transition = gsap.timeline({
        defaults: { ease: "power4.inOut" },
        onComplete: () => {
          gsap.set(handoff, { visibility: "hidden" });
          const cleanupTargets = [outgoing, incoming].flatMap((page) => [
            ...page.querySelectorAll<HTMLElement>(
              "[data-dossier-zone], [data-dossier-display], .operator-journey-pair li, .operator-capability-grid article, .operator-project-image, .operator-form-shell"
            ),
          ]);
          gsap.set(cleanupTargets, { clearProps: "transform,clipPath,fontVariationSettings" });
          gsap.set([outgoing, incoming], { clearProps: "backgroundColor,backgroundImage" });
          if (outgoingTitle) gsap.set(outgoingTitle, { clearProps: "fontVariationSettings" });
          if (incomingTitle) gsap.set(incomingTitle, { clearProps: "fontVariationSettings" });
          updateInterface(boundedIndex);
          transitioning = false;
          wheelNeedsQuiet = true;
          transition = null;
          deck.classList.remove("is-transitioning");
          delete deck.dataset.direction;
          delete deck.dataset.transition;
          if (hadFocus) {
            const focusTarget = incoming.querySelector<HTMLElement>("h1, h2, a, button");
            if (focusTarget?.matches("h1, h2")) focusTarget.tabIndex = -1;
            focusTarget?.focus({ preventScroll: true });
          }
          const queuedTarget = queuedHistoryTarget;
          queuedHistoryTarget = null;
          if (queuedTarget !== null && queuedTarget !== boundedIndex) {
            window.setTimeout(() => goTo(queuedTarget, { history: "none" }), 0);
          }
        },
      });

      if (internalTransition) {
        const section = outgoingRecord.section;
        const outgoingParts = section === "journey"
          ? [...outgoing.querySelectorAll<HTMLElement>(".operator-page-head, .operator-section-title, .operator-journey-pair li")]
          : section === "tech-stack"
            ? [...outgoing.querySelectorAll<HTMLElement>(".operator-page-head, .operator-section-title, .operator-capability-grid article")]
            : outgoingZones;
        const incomingParts = section === "journey"
          ? [...incoming.querySelectorAll<HTMLElement>(".operator-page-head, .operator-section-title, .operator-journey-pair li")]
          : section === "tech-stack"
            ? [...incoming.querySelectorAll<HTMLElement>(".operator-page-head, .operator-section-title, .operator-capability-grid article")]
            : incomingZones;
        const vertical = section === "journey";
        const partDistance = direction * (section === "projects" ? 42 : section === "contact" ? 30 : 24);
        const pageStartClip = vertical
          ? direction > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)"
          : direction > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
        const pageEndClip = vertical
          ? direction > 0 ? "inset(0% 0% 100% 0%)" : "inset(100% 0% 0% 0%)"
          : direction > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";

        gsap.set(incomingParts, vertical
          ? { y: partDistance, clipPath: pageStartClip }
          : { x: partDistance, clipPath: pageStartClip });
        transition
          .to(outgoingParts, {
            ...(vertical ? { y: -partDistance } : { x: -partDistance }),
            clipPath: pageEndClip,
            duration: duration * 0.62,
            stagger: 0.018,
            ease: "expo.inOut",
          }, 0)
          .fromTo(
            incomingParts,
            vertical
              ? { y: partDistance, clipPath: pageStartClip }
              : { x: partDistance, clipPath: pageStartClip },
            {
              ...(vertical ? { y: 0 } : { x: 0 }),
              clipPath: fullInset,
              duration: duration * 0.64,
              stagger: 0.018,
              ease: "expo.out",
              immediateRender: false,
            },
            duration * 0.18
          )
          .fromTo(
            incomingTitle,
            { fontVariationSettings: '"wdth" 92, "wght" 850' },
            { fontVariationSettings: '"wdth" 116, "wght" 850', duration: duration * 0.5, ease: "power3.out", immediateRender: false },
            duration * 0.22
          );
        if (section === "projects") {
          transition.fromTo(
            incoming.querySelector<HTMLElement>(".operator-project-image"),
            { xPercent: direction * 6 },
            { xPercent: 0, duration: duration * 0.66, ease: "expo.out", immediateRender: false },
            duration * 0.18
          );
        }
        if (section === "contact") {
          transition.fromTo(
            incoming.querySelector<HTMLElement>(".operator-form-shell"),
            { clipPath: pageStartClip },
            { clipPath: fullInset, duration: duration * 0.6, ease: "expo.inOut", immediateRender: false },
            duration * 0.2
          );
        }
      } else {
        const trailing = direction > 0 ? 125 : -125;
        transition
          .to(handoffRules, { scaleX: 1, duration: duration * 0.24, stagger: 0.035 }, 0)
          .to(shutters, { xPercent: trailing, duration: duration * 0.82, stagger: 0.035 }, 0.02)
          .to(spine, { x: direction > 0 ? window.innerWidth + 120 : -120, duration, ease: "expo.inOut" }, 0)
          .to(outgoingZones, { x: moveOut, clipPath: outgoingClip, duration: duration * 0.54, stagger: 0.018 }, 0.03)
          .to(outgoingTitle, { fontVariationSettings: '"wdth" 55, "wght" 850', duration: duration * 0.38 }, 0)
          .to(incoming, { clipPath: fullClip, duration: duration * 0.6 }, duration * 0.27)
          .to(incomingZones, { x: 0, clipPath: fullClip, duration: duration * 0.5, stagger: 0.018 }, duration * 0.34)
          .fromTo(
            incomingTitle,
            { fontVariationSettings: '"wdth" 58, "wght" 850' },
            { fontVariationSettings: '"wdth" 132, "wght" 850', duration: duration * 0.44, immediateRender: false },
            duration * 0.35
          )
          .to(handoffRules, { scaleX: 0, duration: duration * 0.2, stagger: 0.025 }, duration * 0.7);
      }

      window.clearTimeout(ownershipTimer);
      ownershipTimer = window.setTimeout(() => {
        outgoing.inert = true;
        outgoing.setAttribute("aria-hidden", "true");
        incoming.inert = false;
        incoming.setAttribute("aria-hidden", "false");
      }, duration * 500);
      return true;
    };

    const goRelative = (direction: 1 | -1, history: "push" | "replace" = "replace") => {
      return goTo(activeIndex + direction, { history });
    };

    const resolveTarget = (value: string) => pageIndex.get(value) ?? hashIndex.get(value);
    const onTargetClick = (event: Event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const target = resolveTarget(button.dataset.dossierTarget ?? "");
      if (target !== undefined) goTo(target, { history: "push" });
    };
    const onPrevious = () => goRelative(-1, "push");
    const onNext = () => goRelative(1, "push");

    const onWheel = (event: WheelEvent) => {
      if (document.body.classList.contains("menu-open")) return;
      if ((event.target as Element | null)?.closest("[data-page-interactive]")) return;
      event.preventDefault();
      const now = performance.now();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = event.deltaY * unit;
      const direction = Math.sign(delta);
      if (!direction) return;

      if (transitioning) {
        lastWheelAt = now;
        wheelAmount = 0;
        return;
      }
      if (wheelNeedsQuiet) {
        if (now - lastWheelAt < 135) {
          lastWheelAt = now;
          wheelAmount = 0;
          return;
        }
        wheelNeedsQuiet = false;
      }
      lastWheelAt = now;
      if (direction !== wheelDirection) wheelAmount = 0;
      wheelDirection = direction;
      wheelAmount += Math.abs(delta);
      window.clearTimeout(wheelReset);
      wheelReset = window.setTimeout(() => { wheelAmount = 0; }, 220);
      if (wheelAmount < 46) return;
      wheelAmount = 0;
      goRelative(direction > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        interactive: Boolean((event.target as Element | null)?.closest("[data-page-interactive]")),
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchStart && !touchStart.interactive) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!touchStart || touchStart.interactive || transitioning) {
        touchStart = null;
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dy) < 56 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      goRelative(dy < 0 ? 1 : -1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (document.body.classList.contains("menu-open")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable='true'], [data-page-interactive]")) return;
      let targetIndex: number | null = null;
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key) || (event.key === " " && !event.shiftKey)) targetIndex = activeIndex + 1;
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey)) targetIndex = activeIndex - 1;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = pages.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      goTo(targetIndex, { history: "replace" });
    };

    targetButtons.forEach((button) => button.addEventListener("click", onTargetClick));
    previousButton?.addEventListener("click", onPrevious);
    nextButton?.addEventListener("click", onNext);
    window.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    pages.forEach((page, index) => gsap.set(page, { visibility: index === activeIndex ? "visible" : "hidden" }));
    updateInterface(activeIndex, false);
    storySeek = (section) => {
      const target = resolveTarget(section);
      if (target === undefined) return false;
      if (transitioning) {
        queuedHistoryTarget = target;
        return true;
      }
      return goTo(target, { history: "none" });
    };

    return () => {
      transition?.kill();
      window.clearTimeout(wheelReset);
      window.clearTimeout(ownershipTimer);
      targetButtons.forEach((button) => button.removeEventListener("click", onTargetClick));
      previousButton?.removeEventListener("click", onPrevious);
      nextButton?.removeEventListener("click", onNext);
      window.removeEventListener("wheel", onWheel);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keydown", onKeyDown);
      storySeek = null;
      resetPages();
      deck.classList.remove("is-active", "is-transitioning");
      document.documentElement.classList.remove("operator-deck-active");
      handoff.removeAttribute("style");
    };
  });

  pageCleanup.push(() => {
    media.revert();
    storySeek = null;
    resetPages();
    deck.classList.remove("is-active", "is-transitioning");
    document.documentElement.classList.remove("operator-deck-active");
  });
}

function initMotion() {
  const reduceMotion = window.matchMedia(REDUCED_MOTION).matches;
  const mobileLayout = window.matchMedia(MOBILE_LAYOUT).matches;
  const outsideActiveDeck = (element: HTMLElement) => !element.closest("[data-operator-deck].is-active");

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
  initOperatorDeck();
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
