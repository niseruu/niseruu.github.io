import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const MOBILE_LAYOUT = "(max-width: 959px)";
const LOADER_KEY = "shafri-portfolio-loader-seen";

let pageCleanup: Array<() => void> = [];
let fullLoaderPromise: Promise<void> | null = null;
let routeTransition = false;
let pageInitialized = false;
let storySeek: ((section: string, behavior?: ScrollBehavior) => boolean) | null = null;
let playHeroIntro: (() => void) | null = null;
let loaderExitToken = 0;

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
  loaderExitToken += 1;
  loader.classList.add("is-resetting");
  loader.classList.remove("is-leaving", "is-hidden");
  void loader.offsetWidth;
  loader.classList.remove("is-resetting");
  loader.classList.toggle("is-route", mode === "route");
  loader.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-loading");
  setLoaderProgress(mode === "route" ? 28 : 0);
}

function hideLoader() {
  const loader = getLoader();
  if (!loader) return Promise.resolve();
  const token = ++loaderExitToken;
  setLoaderProgress(100);
  return new Promise<void>((resolve) => {
    let finished = false;
    let fallback = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      loader.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
      if (token === loaderExitToken) {
        loader.classList.add("is-hidden");
        loader.classList.remove("is-leaving", "is-route");
        loader.setAttribute("aria-hidden", "true");
        document.body.classList.remove("is-loading");
      }
      resolve();
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === loader && event.propertyName === "transform") finish();
    };
    loader.addEventListener("transitionend", onTransitionEnd);
    fallback = window.setTimeout(finish, 820);
    loader.classList.add("is-leaving");
  });
}

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const decode = () => {
      if (typeof image.decode === "function") image.decode().catch(() => undefined).then(() => resolve());
      else resolve();
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      decode();
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
    if (image.complete) finish();
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

function initEndfieldFlow() {
  const flow = document.querySelector<HTMLElement>("[data-endfield-flow]");
  const scenes = flow ? [...flow.querySelectorAll<HTMLElement>("[data-flow-scene]")] : [];
  if (!flow || !scenes.length) return;

  const progress = flow.querySelector<HTMLElement>("[data-flow-progress]");
  const announcer = flow.querySelector<HTMLElement>("[data-flow-announcer]");
  const reduceMotion = window.matchMedia(REDUCED_MOTION).matches;
  const context = gsap.context(() => undefined, flow);

  const resolveTarget = (section: string) => {
    const exact = document.getElementById(section);
    if (exact) return exact;
    return scenes.find((scene) => scene.dataset.flowChapter === section) ?? null;
  };

  storySeek = (section, behavior = "smooth") => {
    const target = resolveTarget(section);
    if (!target) return false;
    target.scrollIntoView({ behavior, block: "start" });
    return true;
  };

  if (reduceMotion) {
    pageCleanup.push(() => {
      context.revert();
      storySeek = null;
    });
    return;
  }

  flow.classList.add("is-enhanced");

  context.add(() => {
    if (progress) {
      gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
      gsap.to(progress, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: flow, start: "top top", end: "bottom bottom", scrub: 0.12 },
      });
    }

    const setActiveScene = (index: number) => {
      const scene = scenes[index];
      if (!scene) return;
      scenes.forEach((item, itemIndex) => item.classList.toggle("is-flow-current", itemIndex === index));
      const section = scene.dataset.flowChapter ?? scene.id;
      document.dispatchEvent(new CustomEvent("story:change", {
        detail: { index, key: section, section },
      }));
      if (announcer) {
        announcer.textContent = `${scene.dataset.flowLabel ?? section}, chapter ${index + 1} of ${scenes.length}`;
      }
    };

    scenes.forEach((scene, index) => {
      ScrollTrigger.create({
        trigger: scene,
        start: "top 52%",
        end: "bottom 52%",
        onEnter: () => setActiveScene(index),
        onEnterBack: () => setActiveScene(index),
      });
    });

    const hero = scenes[0];
    if (hero) {
      const titleLines = hero.querySelectorAll<HTMLElement>(".hero-title-line > span");
      const subject = hero.querySelector<HTMLElement>(".hero-image-frame");
      const yellowField = hero.querySelector<HTMLElement>(".hero-image-yellow");
      const metadata = hero.querySelector<HTMLElement>(".hero-topline");
      const stats = hero.querySelector<HTMLElement>(".hero-role");
      const actions = hero.querySelector<HTMLElement>(".hero-actions");
      const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });

      gsap.set(metadata, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(titleLines, { xPercent: (index) => index === 0 ? -104 : 104 });
      gsap.set(yellowField, { scaleY: 0, transformOrigin: "bottom center" });
      gsap.set(subject, { clipPath: "inset(0 48% 0 48%)" });
      gsap.set(stats, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(actions, { clipPath: "inset(0 0 100% 0)" });

      intro
        .to(yellowField, { scaleY: 1, duration: 0.7 }, 0.06)
        .to(subject, { clipPath: "inset(0 0% 0 0%)", duration: 0.72 }, 0.08)
        .to(titleLines, { xPercent: 0, duration: 0.72, stagger: 0.06 }, 0.14)
        .to(metadata, { clipPath: "inset(0 0% 0 0)", duration: 0.42 }, 0.24)
        .to(stats, { clipPath: "inset(0 0% 0 0)", duration: 0.46 }, 0.42)
        .to(actions, { clipPath: "inset(0 0 0% 0)", duration: 0.46 }, 0.5);

      playHeroIntro = () => intro.play(0);
    }

    const projectsScene = flow.querySelector<HTMLElement>('[data-flow-chapter="projects"]');
    if (projectsScene) {
      const heading = projectsScene.querySelector<HTMLElement>(".section-heading");
      const roster = projectsScene.querySelector<HTMLElement>(".project-record-strip");
      const records = [...projectsScene.querySelectorAll<HTMLElement>("[data-flow-record]")];
      const recordLinks = [...projectsScene.querySelectorAll<HTMLElement>("[data-project-jump]")];

      if (heading) {
        const title = heading.querySelector<HTMLElement>("[data-flow-title]");
        const finalWidth = title ? getComputedStyle(title).fontVariationSettings : '"wdth" 110, "wght" 820';
        const compactWidth = finalWidth.replace(/"wdth"\s+[-\d.]+/, '"wdth" 64');
        const chapterIntro = gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: projectsScene, start: "top 74%", once: true },
        })
          .fromTo(heading.querySelector(".section-heading-meta"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.32 }, 0)
          .fromTo(title, { clipPath: "inset(0 100% 0 0)", fontVariationSettings: compactWidth }, { clipPath: "inset(0 0% 0 0)", fontVariationSettings: finalWidth, duration: 0.62 }, 0.06)
          .fromTo(heading.querySelector(".section-description"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.4 }, 0.2);

        if (roster) {
          chapterIntro
            .fromTo(roster, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.34 }, 0.28)
            .fromTo(recordLinks, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.3, stagger: 0.055 }, 0.36);
        }
      }

      records.forEach((record, index) => {
        const mediaPanel = record.querySelector<HTMLElement>(".project-media");
        const image = record.querySelector<HTMLElement>(".project-image");
        const dataPanel = record.querySelector<HTMLElement>(".project-copy");
        const title = record.querySelector<HTMLElement>("[data-flow-title]");
        const metrics = record.querySelectorAll<HTMLElement>("[data-flow-metric]");
        const reverse = index % 2 === 1;
        const aperture = reverse
          ? "polygon(100% 0, 100% 0, 100% 100%, 86% 100%)"
          : "polygon(0 0, 14% 0, 0 100%, 0 100%)";
        const finalClip = "polygon(0 0, calc(100% - 2.2rem) 0, 100% 2.2rem, 100% 100%, 0 100%)";
        const finalWidth = title ? getComputedStyle(title).fontVariationSettings : '"wdth" 92, "wght" 820';
        const compactWidth = finalWidth.replace(/"wdth"\s+[-\d.]+/, '"wdth" 62');

        gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: record, start: "top 76%", once: true },
        })
          .fromTo(mediaPanel, { clipPath: aperture }, { clipPath: finalClip, duration: 0.88 }, 0)
          .fromTo(image, { xPercent: reverse ? 5 : -5, scale: 1.045 }, { xPercent: 0, scale: 1, duration: 0.92 }, 0.03)
          .fromTo(dataPanel, { clipPath: reverse ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)" }, { clipPath: "inset(0 0% 0 0%)", duration: 0.62 }, 0.14)
          .fromTo(title, { fontVariationSettings: compactWidth }, { fontVariationSettings: finalWidth, duration: 0.5 }, 0.24)
          .fromTo(metrics, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.36, stagger: 0.055 }, 0.32);

        ScrollTrigger.create({
          trigger: record,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (!self.isActive) return;
            recordLinks.forEach((link, linkIndex) => link.classList.toggle("is-active", linkIndex === index));
          },
        });
      });
    }

    const journeyScene = flow.querySelector<HTMLElement>('[data-flow-chapter="journey"]');
    if (journeyScene) {
      const heading = journeyScene.querySelector<HTMLElement>(".section-heading");
      const title = journeyScene.querySelector<HTMLElement>("[data-flow-title]");
      const chronology = journeyScene.querySelector<HTMLElement>("[data-journey-chronology]");
      const axis = journeyScene.querySelector<HTMLElement>("[data-journey-axis]");
      const entries = [...journeyScene.querySelectorAll<HTMLElement>("[data-journey-entry]")];

      if (heading) {
        const finalWidth = title ? getComputedStyle(title).fontVariationSettings : '"wdth" 110, "wght" 820';
        const compactWidth = finalWidth.replace(/"wdth"\s+[-\d.]+/, '"wdth" 68');
        gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: journeyScene, start: "top 74%", once: true },
        })
          .fromTo(heading.querySelector(".section-heading-meta"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.32 }, 0)
          .fromTo(title, { clipPath: "inset(0 100% 0 0)", fontVariationSettings: compactWidth }, { clipPath: "inset(0 0% 0 0)", fontVariationSettings: finalWidth, duration: 0.64 }, 0.06)
          .fromTo(heading.querySelector(".section-description"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.4 }, 0.2)
          .fromTo(journeyScene.querySelector(".journey-direction"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.42 }, 0.3);
      }

      if (chronology && axis) {
        gsap.fromTo(axis, { scaleY: 0, transformOrigin: "top center" }, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: chronology, start: "top 72%", end: "bottom 68%", scrub: 0.16 },
        });
      }

      entries.forEach((entry) => {
        const connector = entry.querySelector<HTMLElement>(".journey-connector");
        const node = entry.querySelector<HTMLElement>(".journey-node");
        const meta = entry.querySelector<HTMLElement>(".journey-meta");
        const content = entry.querySelector<HTMLElement>(".journey-content");
        gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: entry, start: "top 82%", once: true },
        })
          .fromTo(connector, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.34 }, 0)
          .fromTo(node, { scale: 0, rotate: 0 }, { scale: 1, rotate: 45, duration: 0.38 }, 0.08)
          .fromTo(meta, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.4 }, 0.14)
          .fromTo(content, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.54 }, 0.2);
      });
    }

    const stackScene = flow.querySelector<HTMLElement>('[data-flow-chapter="tech-stack"]');
    if (stackScene) {
      const heading = stackScene.querySelector<HTMLElement>(".section-heading");
      const title = stackScene.querySelector<HTMLElement>("[data-flow-title]");
      const matrixHead = stackScene.querySelector<HTMLElement>("[data-stack-head]");
      const modules = [...stackScene.querySelectorAll<HTMLElement>("[data-stack-module]")];

      if (heading) {
        const finalWidth = title ? getComputedStyle(title).fontVariationSettings : '"wdth" 110, "wght" 820';
        const compactWidth = finalWidth.replace(/"wdth"\s+[-\d.]+/, '"wdth" 68');
        gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: stackScene, start: "top 74%", once: true },
        })
          .fromTo(heading.querySelector(".section-heading-meta"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.32 }, 0)
          .fromTo(title, { clipPath: "inset(0 100% 0 0)", fontVariationSettings: compactWidth }, { clipPath: "inset(0 0% 0 0)", fontVariationSettings: finalWidth, duration: 0.64 }, 0.06)
          .fromTo(heading.querySelector(".section-description"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.4 }, 0.2)
          .fromTo(matrixHead, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.46 }, 0.3);
      }

      modules.forEach((module) => {
        const rule = module.querySelector<HTMLElement>("[data-stack-rule]");
        const header = module.querySelector<HTMLElement>("header");
        const items = module.querySelectorAll<HTMLElement>("[data-stack-item]");
        gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: module, start: "top 84%", once: true },
        })
          .fromTo(rule, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.44 }, 0)
          .fromTo(header, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.42 }, 0.08)
          .fromTo(items, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.34, stagger: 0.045 }, 0.16);
      });
    }

    scenes.slice(2).filter((scene) => !["timeline", "matrix"].includes(scene.dataset.flowTransition ?? "")).forEach((scene) => {
      const variant = scene.dataset.flowTransition;
      const title = scene.querySelector<HTMLElement>("[data-flow-title]");
      const finalWidth = title ? getComputedStyle(title).fontVariationSettings : '"wdth" 110, "wght" 820';
      const compactWidth = finalWidth.replace(/"wdth"\s+[-\d.]+/, '"wdth" 66');
      const headingMeta = scene.querySelector<HTMLElement>(".section-heading-meta, .contact-header");
      const panels = [...scene.querySelectorAll<HTMLElement>("[data-flow-panel]")];
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: scene, start: "top 84%", end: "top 24%", scrub: 0.2 },
      });

      if (headingMeta) {
        timeline.fromTo(headingMeta, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.42 }, 0);
      }
      if (title) {
        timeline.fromTo(title, { fontVariationSettings: compactWidth }, { fontVariationSettings: finalWidth, duration: 0.8 }, 0.05);
      }

      if (variant === "ledger") {
        panels.forEach((panel, index) => {
          timeline.fromTo(
            panel,
            { clipPath: index % 2 === 0 ? "polygon(0 0, 8% 0, 0 100%, 0 100%)" : "polygon(92% 0, 100% 0, 100% 100%, 100% 100%)" },
            { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", duration: 0.72 },
            0.18 + index * 0.08
          );
        });
      } else if (variant === "diagnostic") {
        panels.forEach((panel, index) => {
          timeline.fromTo(
            panel,
            { clipPath: index % 2 === 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)" },
            { clipPath: "inset(0% 0 0% 0)", duration: 0.68 },
            0.12 + index * 0.08
          );
        });
        scene.querySelectorAll<HTMLElement>("[data-count]").forEach((element) => {
          const target = Number(element.dataset.count);
          if (Number.isNaN(target)) return;
          const counter = { value: 0 };
          ScrollTrigger.create({
            trigger: element,
            start: "top 82%",
            once: true,
            onEnter: () => gsap.to(counter, {
              value: target,
              duration: 1.15,
              ease: "power3.out",
              onUpdate: () => { element.textContent = Math.round(counter.value).toString(); },
            }),
          });
        });
      } else if (variant === "terminal") {
        panels.forEach((panel, index) => {
          timeline.fromTo(
            panel,
            { clipPath: index === 0 ? "inset(0 100% 0 0)" : "inset(100% 0 0 0)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.72 },
            0.12 + index * 0.12
          );
        });
      }
    });

    ScrollTrigger.refresh();
  });

  pageCleanup.push(() => {
    context.revert();
    flow.classList.remove("is-enhanced");
    storySeek = null;
    playHeroIntro = null;
  });
}

function initMotion() {
  const reduceMotion = window.matchMedia(REDUCED_MOTION).matches;
  const mobileLayout = window.matchMedia(MOBILE_LAYOUT).matches;
  const outsideEnhancedFlow = (element: HTMLElement) => (
    !element.closest("[data-endfield-flow].is-enhanced")
  );

  if (reduceMotion) {
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      el.textContent = el.dataset.count ?? el.textContent;
    });
    return;
  }

  const heroItems = [...document.querySelectorAll<HTMLElement>("[data-hero-reveal]")]
    .filter(outsideEnhancedFlow);
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

  [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(outsideEnhancedFlow).forEach((el) => {
    gsap.from(el, {
      y: mobileLayout ? 28 : 54,
      opacity: 0,
      duration: mobileLayout ? 0.72 : 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  [...document.querySelectorAll<HTMLElement>("[data-kinetic]")].filter(outsideEnhancedFlow).forEach((el) => {
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

  [...document.querySelectorAll<HTMLElement>("[data-image-reveal]")].filter(outsideEnhancedFlow).forEach((el) => {
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

  [...document.querySelectorAll<HTMLElement>("[data-parallax]")].filter(outsideEnhancedFlow).forEach((el) => {
    const distance = Number(el.dataset.parallax) || 8;
    gsap.to(el, {
      yPercent: distance,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  [...document.querySelectorAll<HTMLElement>("[data-count]")].filter(outsideEnhancedFlow).forEach((el) => {
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
  playHeroIntro = null;
}

async function bootstrap() {
  if (pageInitialized) return;
  pageInitialized = true;
  await runFullLoader();
  const completingRoute = routeTransition;
  if (completingRoute) await runRouteLoader();
  initEndfieldFlow();
  initNavigation();
  initMotion();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const loaderExit = hideLoader();
  playHeroIntro?.();
  await loaderExit;
  routeTransition = false;
  ScrollTrigger.refresh();
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
