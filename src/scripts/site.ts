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

type MotionTimeline = ReturnType<typeof gsap.timeline>;

const FULL_CLIP = "inset(0% 0% 0% 0%)";
const LEFT_CLIP = "inset(0 100% 0 0)";
const RIGHT_CLIP = "inset(0 0 0 100%)";

function fontSettingsFor(element: HTMLElement | null, fallback: string) {
  if (!element) return fallback;
  const settings = getComputedStyle(element).fontVariationSettings;
  return settings && settings !== "normal" ? settings : fallback;
}

function withFontWidth(settings: string, width: number) {
  return /"wdth"\s+[-\d.]+/.test(settings)
    ? settings.replace(/"wdth"\s+[-\d.]+/, `"wdth" ${width}`)
    : `"wdth" ${width}, ${settings}`;
}

function addSectionHeadingDeployment(timeline: MotionTimeline, scope: ParentNode, at = 0) {
  const heading = scope.querySelector<HTMLElement>(".section-heading");
  if (!heading) return timeline;

  const index = heading.querySelector<HTMLElement>(".section-index");
  const eyebrow = heading.querySelector<HTMLElement>(".section-eyebrow");
  const rule = heading.querySelector<HTMLElement>(".section-signal");
  const title = heading.querySelector<HTMLElement>("[data-flow-title]");
  const description = heading.querySelector<HTMLElement>(".section-description");
  const finalWidth = fontSettingsFor(title, '"wdth" 110, "wght" 820');
  const compactWidth = withFontWidth(finalWidth, 66);

  if (index) {
    timeline.fromTo(
      index,
      { clipPath: LEFT_CLIP },
      { clipPath: FULL_CLIP, duration: 0.2, clearProps: "clipPath" },
      at,
    );
  }
  if (rule) {
    timeline.fromTo(
      rule,
      { scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, duration: 0.44, clearProps: "transform" },
      at + 0.03,
    );
  }
  if (eyebrow) {
    timeline.fromTo(
      eyebrow,
      { clipPath: LEFT_CLIP },
      { clipPath: FULL_CLIP, duration: 0.32, clearProps: "clipPath" },
      at + 0.07,
    );
  }
  if (title) {
    timeline.fromTo(
      title,
      { clipPath: LEFT_CLIP, fontVariationSettings: compactWidth },
      {
        clipPath: FULL_CLIP,
        fontVariationSettings: finalWidth,
        duration: 0.64,
        clearProps: "clipPath,fontVariationSettings",
      },
      at + 0.1,
    );
  }
  if (description) {
    timeline.fromTo(
      description,
      { clipPath: "inset(0 0 100% 0)" },
      { clipPath: FULL_CLIP, duration: 0.4, clearProps: "clipPath" },
      at + 0.24,
    );
  }

  return timeline;
}

function createSectionEntrance(scene: HTMLElement, start = "top 76%") {
  const timeline = gsap.timeline({
    defaults: { ease: "power4.out" },
    scrollTrigger: { trigger: scene, start, once: true },
  });
  return addSectionHeadingDeployment(timeline, scene);
}

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
  const telemetryCode = flow.querySelector<HTMLElement>("[data-flow-telemetry-code]");
  const telemetryLabel = flow.querySelector<HTMLElement>("[data-flow-telemetry-label]");
  const telemetryCount = flow.querySelector<HTMLElement>("[data-flow-telemetry-count]");
  const reduceMotion = window.matchMedia(REDUCED_MOTION).matches;
  const mobileLayout = window.matchMedia(MOBILE_LAYOUT).matches;
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

  const setActiveScene = (index: number) => {
    const scene = scenes[index];
    if (!scene) return;
    scenes.forEach((item, itemIndex) => item.classList.toggle("is-flow-current", itemIndex === index));
    const section = scene.dataset.flowChapter ?? scene.id;
    const label = scene.dataset.flowLabel ?? section;
    if (telemetryCode) telemetryCode.textContent = scene.dataset.flowCode ?? "--";
    if (telemetryLabel) telemetryLabel.textContent = label;
    if (telemetryCount) {
      telemetryCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
    }
    document.dispatchEvent(new CustomEvent("story:change", {
      detail: { index, key: section, section },
    }));
    if (announcer) announcer.textContent = `${label}, chapter ${index + 1} of ${scenes.length}`;
  };

  if (reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = scenes.indexOf(visible.target as HTMLElement);
        if (index >= 0) setActiveScene(index);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.35] },
    );
    scenes.forEach((scene) => observer.observe(scene));
    pageCleanup.push(() => {
      observer.disconnect();
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
      const titleLines = [...hero.querySelectorAll<HTMLElement>(".hero-title-line > span")];
      const subject = hero.querySelector<HTMLElement>(".hero-image-frame");
      const yellowField = hero.querySelector<HTMLElement>(".hero-image-yellow");
      const metadata = hero.querySelector<HTMLElement>(".hero-topline");
      const stats = hero.querySelector<HTMLElement>(".hero-role");
      const actions = hero.querySelector<HTMLElement>(".hero-actions");
      const instruments = [...hero.querySelectorAll<HTMLElement>(".hero-instrument")];
      const subjectLabel = hero.querySelector<HTMLElement>(".hero-image-label");
      const titleWidths = titleLines.map((line) => fontSettingsFor(line, '"wdth" 128, "wght" 900'));
      const compactTitleWidths = titleWidths.map((settings) => withFontWidth(settings, 72));
      const intro = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });

      if (metadata) gsap.set(metadata, { clipPath: LEFT_CLIP, willChange: "clip-path" });
      if (titleLines.length) {
        gsap.set(titleLines, {
          clipPath: (index) => index === 0 ? LEFT_CLIP : RIGHT_CLIP,
          fontVariationSettings: (index: number) => compactTitleWidths[index],
          willChange: "clip-path,font-variation-settings",
        });
      }
      if (yellowField) {
        gsap.set(yellowField, { scaleY: 0, transformOrigin: "bottom center", willChange: "transform" });
      }
      if (subject) gsap.set(subject, { clipPath: "inset(0 48% 0 48%)", willChange: "clip-path" });
      if (stats) gsap.set(stats, { clipPath: LEFT_CLIP, willChange: "clip-path" });
      if (actions) gsap.set(actions, { clipPath: "inset(0 0 100% 0)", willChange: "clip-path" });
      if (instruments.length) gsap.set(instruments, { clipPath: LEFT_CLIP, willChange: "clip-path" });
      if (subjectLabel) gsap.set(subjectLabel, { clipPath: RIGHT_CLIP, willChange: "clip-path" });

      if (metadata) intro.to(metadata, { clipPath: FULL_CLIP, duration: 0.36 }, 0.02);
      if (yellowField) intro.to(yellowField, { scaleY: 1, duration: 0.62 }, 0.04);
      if (titleLines.length) {
        intro.to(titleLines, {
          clipPath: FULL_CLIP,
          fontVariationSettings: (index: number) => titleWidths[index],
          duration: 0.68,
          stagger: 0.055,
        }, 0.1);
      }
      if (subject) intro.to(subject, { clipPath: FULL_CLIP, duration: 0.7 }, 0.16);
      if (stats) intro.to(stats, { clipPath: FULL_CLIP, duration: 0.42 }, 0.38);
      if (actions) intro.to(actions, { clipPath: FULL_CLIP, duration: 0.42 }, 0.48);
      if (instruments.length) intro.to(instruments, { clipPath: FULL_CLIP, duration: 0.32, stagger: 0.05 }, 0.34);
      if (subjectLabel) intro.to(subjectLabel, { clipPath: FULL_CLIP, duration: 0.3 }, 0.46);
      if (metadata) intro.set(metadata, { clearProps: "clipPath,willChange" });
      if (titleLines.length) intro.set(titleLines, { clearProps: "clipPath,fontVariationSettings,willChange" }, "<");
      if (yellowField) intro.set(yellowField, { clearProps: "transform,willChange" }, "<");
      if (subject) intro.set(subject, { clearProps: "clipPath,willChange" }, "<");
      if (stats) intro.set(stats, { clearProps: "clipPath,willChange" }, "<");
      if (actions) intro.set(actions, { clearProps: "clipPath,willChange" }, "<");
      if (instruments.length) intro.set(instruments, { clearProps: "clipPath,willChange" }, "<");
      if (subjectLabel) intro.set(subjectLabel, { clearProps: "clipPath,willChange" }, "<");

      intro.eventCallback("onComplete", () => {
        hero.classList.add("is-idle-ready");
      });

      playHeroIntro = () => intro.play(0);
    }

    const projectsScene = flow.querySelector<HTMLElement>('[data-flow-chapter="projects"]');
    if (projectsScene) {
      const heading = projectsScene.querySelector<HTMLElement>(".section-heading");
      const roster = projectsScene.querySelector<HTMLElement>(".project-record-strip");
      const records = [...projectsScene.querySelectorAll<HTMLElement>("[data-flow-record]")];
      const recordLinks = [...projectsScene.querySelectorAll<HTMLElement>("[data-project-jump]")];
      const archiveAction = projectsScene.querySelector<HTMLElement>(".section-end-action");

      if (heading) {
        const chapterIntro = createSectionEntrance(projectsScene, "top 74%");

        if (roster) {
          chapterIntro
            .fromTo(roster, { clipPath: "inset(0 0 100% 0)" }, { clipPath: FULL_CLIP, duration: 0.34, clearProps: "clipPath" }, 0.28)
            .fromTo(recordLinks, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.3, stagger: 0.055, clearProps: "clipPath" }, 0.36);
        }
      }

      records.forEach((record, index) => {
        const mediaPanel = record.querySelector<HTMLElement>(".project-media");
        const image = record.querySelector<HTMLElement>(".project-image");
        const dataPanel = record.querySelector<HTMLElement>(".project-copy");
        const title = record.querySelector<HTMLElement>("[data-flow-title]");
        const metrics = record.querySelectorAll<HTMLElement>("[data-flow-metric]");
        const reverse = index % 2 === 1;
        const aperture = mobileLayout
          ? (reverse ? "inset(0 0 0 88%)" : "inset(0 88% 0 0)")
          : (reverse
              ? "polygon(100% 0, 100% 0, 100% 100%, 86% 100%)"
              : "polygon(0 0, 14% 0, 0 100%, 0 100%)");
        const finalClip = "polygon(0 0, calc(100% - 2.2rem) 0, 100% 2.2rem, 100% 100%, 0 100%)";
        const finalWidth = fontSettingsFor(title, '"wdth" 92, "wght" 820');
        const compactWidth = withFontWidth(finalWidth, 62);

        const recordIntro = gsap.timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: { trigger: record, start: "top 76%", once: true },
        });
        if (mediaPanel) {
          recordIntro.fromTo(
            mediaPanel,
            { clipPath: aperture },
            {
              clipPath: mobileLayout ? FULL_CLIP : finalClip,
              duration: mobileLayout ? 0.66 : 0.82,
              clearProps: "clipPath",
            },
            0,
          );
        }
        if (image) {
          recordIntro.fromTo(
            image,
            { xPercent: reverse ? (mobileLayout ? 2 : 4) : (mobileLayout ? -2 : -4), scale: mobileLayout ? 1.02 : 1.04 },
            { xPercent: 0, scale: 1, duration: mobileLayout ? 0.7 : 0.88, clearProps: "transform" },
            0.03,
          );
        }
        if (dataPanel) {
          recordIntro.fromTo(
            dataPanel,
            { clipPath: reverse ? LEFT_CLIP : RIGHT_CLIP },
            { clipPath: FULL_CLIP, duration: 0.58, clearProps: "clipPath" },
            0.14,
          );
        }
        if (title) {
          recordIntro.fromTo(
            title,
            { fontVariationSettings: compactWidth },
            { fontVariationSettings: finalWidth, duration: 0.5, clearProps: "fontVariationSettings" },
            0.24,
          );
        }
        if (metrics.length) {
          recordIntro.fromTo(
            metrics,
            { clipPath: LEFT_CLIP },
            { clipPath: FULL_CLIP, duration: 0.36, stagger: 0.05, clearProps: "clipPath" },
            0.32,
          );
        }

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

      if (archiveAction) {
        gsap.fromTo(
          archiveAction,
          { clipPath: LEFT_CLIP },
          {
            clipPath: FULL_CLIP,
            duration: 0.55,
            ease: "power4.out",
            clearProps: "clipPath",
            scrollTrigger: { trigger: archiveAction, start: "top 88%", once: true },
          },
        );
      }
    }

    const publicationsScene = flow.querySelector<HTMLElement>('[data-flow-chapter="publications"]');
    if (publicationsScene) {
      const toolbar = publicationsScene.querySelector<HTMLElement>("[data-publication-toolbar]");
      const archiveHead = publicationsScene.querySelector<HTMLElement>("[data-publication-archive-head]");
      const records = [...publicationsScene.querySelectorAll<HTMLElement>("[data-publication-primary], [data-publication-record]")];
      const publicationIntro = createSectionEntrance(publicationsScene);

      if (toolbar) {
        publicationIntro.fromTo(
          toolbar,
          { clipPath: LEFT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.4, clearProps: "clipPath" },
          0.28,
        );
      }
      if (archiveHead) {
        publicationIntro.fromTo(
          archiveHead,
          { clipPath: RIGHT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.4, clearProps: "clipPath" },
          0.3,
        );
      }

      records.forEach((record, index) => {
        const media = record.querySelector<HTMLElement>("[data-publication-media], [data-publication-viewport], .publication-image");
        const image = media?.querySelector<HTMLElement>("img") ?? null;
        const meta = record.querySelector<HTMLElement>("[data-publication-meta], .publication-meta");
        const title = record.querySelector<HTMLElement>("[data-publication-title], h3");
        const copy = record.querySelector<HTMLElement>("[data-publication-copy] > p, :scope > p, [data-publication-copy]");
        const action = record.querySelector<HTMLElement>("[data-publication-action], .inline-link");
        const reverse = index % 2 === 1;
        const at = 0.32 + index * 0.12;
        const finalWidth = fontSettingsFor(title, '"wdth" 105, "wght" 790');

        if (media) {
          publicationIntro.fromTo(
            media,
            { clipPath: reverse ? RIGHT_CLIP : LEFT_CLIP },
            { clipPath: FULL_CLIP, duration: 0.66, clearProps: "clipPath" },
            at,
          );
        }
        if (image) {
          publicationIntro.fromTo(
            image,
            { xPercent: reverse ? 2 : -2, scale: 1.025 },
            { xPercent: 0, scale: 1, duration: 0.76, clearProps: "transform" },
            at + 0.03,
          );
        }
        if (meta) {
          publicationIntro.fromTo(
            meta,
            { clipPath: reverse ? RIGHT_CLIP : LEFT_CLIP },
            { clipPath: FULL_CLIP, duration: 0.34, clearProps: "clipPath" },
            at + 0.2,
          );
        }
        if (title) {
          publicationIntro.fromTo(
            title,
            { clipPath: reverse ? RIGHT_CLIP : LEFT_CLIP, fontVariationSettings: withFontWidth(finalWidth, 72) },
            {
              clipPath: FULL_CLIP,
              fontVariationSettings: finalWidth,
              duration: 0.5,
              clearProps: "clipPath,fontVariationSettings",
            },
            at + 0.24,
          );
        }
        if (copy) {
          publicationIntro.fromTo(
            copy,
            { clipPath: reverse ? RIGHT_CLIP : LEFT_CLIP },
            { clipPath: FULL_CLIP, duration: 0.42, clearProps: "clipPath" },
            at + 0.3,
          );
        }
        if (action) {
          publicationIntro.fromTo(
            action,
            { clipPath: reverse ? RIGHT_CLIP : LEFT_CLIP },
            { clipPath: FULL_CLIP, duration: 0.34, clearProps: "clipPath" },
            at + 0.38,
          );
        }
      });
    }

    const journeyScene = flow.querySelector<HTMLElement>('[data-flow-chapter="journey"]');
    if (journeyScene) {
      const chronology = journeyScene.querySelector<HTMLElement>("[data-journey-chronology]");
      const axis = journeyScene.querySelector<HTMLElement>("[data-journey-axis]");
      const direction = journeyScene.querySelector<HTMLElement>(".journey-direction");
      const toolbar = journeyScene.querySelector<HTMLElement>("[data-journey-toolbar]");
      const entries = [...journeyScene.querySelectorAll<HTMLElement>("[data-journey-entry]")];

      const journeyIntro = createSectionEntrance(journeyScene, "top 74%");
      if (direction) {
        journeyIntro.fromTo(
          direction,
          { clipPath: LEFT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.42, clearProps: "clipPath" },
          0.3,
        );
      }
      if (toolbar) {
        journeyIntro.fromTo(
          toolbar,
          { clipPath: LEFT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.42, clearProps: "clipPath" },
          0.34,
        );
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
        const entryIntro = gsap.timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: { trigger: entry, start: "top 82%", once: true },
        });
        if (connector) {
          entryIntro.fromTo(
            connector,
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.34, clearProps: "transform" },
            0,
          );
        }
        if (node) {
          entryIntro.fromTo(
            node,
            { scale: 0, rotate: 0 },
            { scale: 1, rotate: 45, duration: 0.38, clearProps: "transform" },
            0.08,
          );
        }
        if (meta) {
          entryIntro.fromTo(meta, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.4, clearProps: "clipPath" }, 0.14);
        }
        if (content) {
          entryIntro.fromTo(content, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.54, clearProps: "clipPath" }, 0.2);
        }
      });
    }

    const stackScene = flow.querySelector<HTMLElement>('[data-flow-chapter="tech-stack"]');
    if (stackScene) {
      const matrixHead = stackScene.querySelector<HTMLElement>("[data-stack-head]");
      const modules = [...stackScene.querySelectorAll<HTMLElement>("[data-stack-module]")];

      const stackIntro = createSectionEntrance(stackScene, "top 74%");
      if (matrixHead) {
        const headRule = matrixHead.querySelector<HTMLElement>("i");
        stackIntro.fromTo(
          matrixHead,
          { clipPath: LEFT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.46, clearProps: "clipPath" },
          0.3,
        );
        if (headRule) {
          stackIntro.fromTo(
            headRule,
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.4, clearProps: "transform" },
            0.32,
          );
        }
      }

      modules.forEach((module) => {
        const rule = module.querySelector<HTMLElement>("[data-stack-rule]");
        const header = module.querySelector<HTMLElement>("header");
        const items = [...module.querySelectorAll<HTMLElement>("[data-stack-item]")];
        const moduleIntro = gsap.timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: { trigger: module, start: "top 84%", once: true },
        });
        if (rule) {
          moduleIntro.fromTo(
            rule,
            { scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.44, clearProps: "transform" },
            0,
          );
        }
        if (header) {
          moduleIntro.fromTo(header, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.42, clearProps: "clipPath" }, 0.08);
        }
        if (items.length) {
          moduleIntro.fromTo(
            items,
            { clipPath: LEFT_CLIP },
            {
              clipPath: FULL_CLIP,
              duration: 0.34,
              stagger: mobileLayout ? 0.025 : 0.04,
              clearProps: "clipPath",
            },
            0.16,
          );
        }
      });
    }

    const scoresScene = flow.querySelector<HTMLElement>('[data-flow-chapter="scores"]');
    if (scoresScene) {
      const toolbar = scoresScene.querySelector<HTMLElement>("[data-score-toolbar], [data-scores-toolbar]");
      const grid = scoresScene.querySelector<HTMLElement>("[data-score-grid], [data-scores-grid]");
      const cards = [...scoresScene.querySelectorAll<HTMLElement>("[data-score-card], [data-score-record]")];
      const scoresIntro = createSectionEntrance(scoresScene);

      if (toolbar) {
        scoresIntro.fromTo(toolbar, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.38, clearProps: "clipPath" }, 0.26);
      }
      if (grid) {
        scoresIntro.fromTo(
          grid,
          { clipPath: "inset(0 0 99.5% 0)" },
          { clipPath: FULL_CLIP, duration: 0.6, clearProps: "clipPath" },
          0.28,
        );
      }

      cards.forEach((card, index) => {
        const top = card.querySelector<HTMLElement>("[data-score-top], .score-card-top");
        const value = card.querySelector<HTMLElement>("[data-score-value], [data-count]");
        const bottom = card.querySelector<HTMLElement>("[data-score-bottom], .score-card-bottom");
        const at = 0.34 + index * 0.08;
        const sideClip = index % 2 === 0 ? LEFT_CLIP : RIGHT_CLIP;

        scoresIntro.fromTo(
          card,
          { clipPath: sideClip },
          { clipPath: FULL_CLIP, duration: 0.54, clearProps: "clipPath" },
          at,
        );
        if (top) {
          scoresIntro.fromTo(top, { clipPath: sideClip }, { clipPath: FULL_CLIP, duration: 0.3, clearProps: "clipPath" }, at + 0.12);
        }
        if (bottom) {
          scoresIntro.fromTo(bottom, { clipPath: sideClip }, { clipPath: FULL_CLIP, duration: 0.36, clearProps: "clipPath" }, at + 0.2);
        }
        if (value) {
          const target = Number(value.dataset.count);
          if (!Number.isNaN(target)) {
            const counter = { value: 0 };
            scoresIntro.to(counter, {
              value: target,
              duration: 0.76,
              ease: "power3.out",
              onStart: () => { value.textContent = "0"; },
              onUpdate: () => { value.textContent = Math.round(counter.value).toString(); },
              onComplete: () => { value.textContent = Math.round(target).toString(); },
            }, at + 0.14);
          }
        }
      });
    }

    const contactScene = flow.querySelector<HTMLElement>('[data-flow-chapter="contact"]');
    if (contactScene) {
      const header = contactScene.querySelector<HTMLElement>(".contact-header");
      const channelRule = contactScene.querySelector<HTMLElement>(".contact-channel-rule");
      const title = contactScene.querySelector<HTMLElement>("[data-flow-title]");
      const kicker = contactScene.querySelector<HTMLElement>(".contact-kicker");
      const copy = contactScene.querySelector<HTMLElement>(".contact-intro > p:not(.contact-kicker)");
      const email = contactScene.querySelector<HTMLElement>(".contact-email");
      const socials = [...contactScene.querySelectorAll<HTMLElement>(".contact-socials a")];
      const formShell = contactScene.querySelector<HTMLElement>(".contact-form-shell");
      const formLabels = [...contactScene.querySelectorAll<HTMLElement>(".industrial-form label")];
      const finalWidth = fontSettingsFor(title, '"wdth" 92, "wght" 850');
      const contactIntro = gsap.timeline({
        defaults: { ease: "power4.out" },
        scrollTrigger: { trigger: contactScene, start: "top 76%", once: true },
      });

      if (channelRule) {
        contactIntro.fromTo(
          channelRule,
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.44, clearProps: "transform" },
          0,
        );
      }
      if (header) {
        contactIntro.fromTo(header, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.38, clearProps: "clipPath" }, 0.03);
      }
      if (title) {
        contactIntro.fromTo(
          title,
          { clipPath: LEFT_CLIP, fontVariationSettings: withFontWidth(finalWidth, 62) },
          {
            clipPath: FULL_CLIP,
            fontVariationSettings: finalWidth,
            duration: 0.66,
            clearProps: "clipPath,fontVariationSettings",
          },
          0.1,
        );
      }
      if (kicker) {
        contactIntro.fromTo(kicker, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.3, clearProps: "clipPath" }, 0.14);
      }
      if (copy) {
        contactIntro.fromTo(copy, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.38, clearProps: "clipPath" }, 0.28);
      }
      if (email) {
        contactIntro.fromTo(email, { clipPath: LEFT_CLIP }, { clipPath: FULL_CLIP, duration: 0.38, clearProps: "clipPath" }, 0.34);
      }
      if (socials.length) {
        contactIntro.fromTo(
          socials,
          { clipPath: LEFT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.3, stagger: 0.05, clearProps: "clipPath" },
          0.4,
        );
      }
      if (formShell) {
        contactIntro.fromTo(
          formShell,
          { clipPath: RIGHT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.62, clearProps: "clipPath" },
          0.18,
        );
      }
      if (formLabels.length) {
        contactIntro.fromTo(
          formLabels,
          { clipPath: LEFT_CLIP },
          { clipPath: FULL_CLIP, duration: 0.32, stagger: 0.045, clearProps: "clipPath" },
          0.42,
        );
      }
    }
  });

  pageCleanup.push(() => {
    context.revert();
    flow.classList.remove("is-enhanced");
    flow.querySelector<HTMLElement>(".hero-section")?.classList.remove("is-idle-ready", "is-idle-visible");
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

  const motionRoot = document.querySelector<HTMLElement>("main") ?? document.body;
  const context = gsap.context(() => {
    const heroItems = [...document.querySelectorAll<HTMLElement>("[data-hero-reveal]")]
      .filter(outsideEnhancedFlow);
    if (heroItems.length) {
      const heroIntro = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });
      heroIntro.fromTo(
        heroItems,
        { clipPath: LEFT_CLIP },
        { clipPath: FULL_CLIP, duration: 0.62, stagger: 0.055, clearProps: "clipPath" },
      );
      playHeroIntro = () => heroIntro.play(0);
    }

    [...document.querySelectorAll<HTMLElement>("[data-reveal]")]
      .filter(outsideEnhancedFlow)
      .forEach((element, index) => {
        gsap.fromTo(
          element,
          { clipPath: index % 2 === 0 ? LEFT_CLIP : RIGHT_CLIP },
          {
            clipPath: FULL_CLIP,
            duration: mobileLayout ? 0.56 : 0.68,
            ease: "power4.out",
            clearProps: "clipPath",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          },
        );
      });

    [...document.querySelectorAll<HTMLElement>("[data-kinetic]")]
      .filter(outsideEnhancedFlow)
      .forEach((element) => {
        const finalSettings = fontSettingsFor(element, '"wdth" 110, "wght" 800');
        const compactSettings = withFontWidth(finalSettings, mobileLayout ? 72 : 66);
        gsap.fromTo(
          element,
          { clipPath: LEFT_CLIP, fontVariationSettings: compactSettings },
          {
            clipPath: FULL_CLIP,
            fontVariationSettings: finalSettings,
            duration: mobileLayout ? 0.64 : 0.76,
            ease: "power4.out",
            clearProps: "clipPath,fontVariationSettings",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          },
        );
      });

    [...document.querySelectorAll<HTMLElement>("[data-image-reveal]")]
      .filter(outsideEnhancedFlow)
      .forEach((element, index) => {
        const image = element.matches("img") ? element : element.querySelector<HTMLElement>("img");
        if (!image) return;
        const aperture = index % 2 === 0 ? "inset(0 48% 0 48%)" : "inset(48% 0 48% 0)";
        const timeline = gsap.timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: { trigger: element, start: "top 86%", once: true },
        });
        timeline
          .fromTo(
            element,
            { clipPath: aperture },
            { clipPath: FULL_CLIP, duration: mobileLayout ? 0.62 : 0.74, clearProps: "clipPath" },
          )
          .fromTo(
            image,
            { scale: mobileLayout ? 1.02 : 1.035 },
            { scale: 1, duration: mobileLayout ? 0.7 : 0.86, clearProps: "transform" },
            0,
          );
      });

    [...document.querySelectorAll<HTMLElement>("[data-count]")]
      .filter(outsideEnhancedFlow)
      .forEach((element) => {
        const target = Number(element.dataset.count);
        if (Number.isNaN(target)) return;
        const counter = { value: 0 };
        ScrollTrigger.create({
          trigger: element,
          start: "top 88%",
          once: true,
          onEnter: () => {
            element.textContent = "0";
            gsap.to(counter, {
              value: target,
              duration: 0.85,
              ease: "power3.out",
              onUpdate: () => { element.textContent = Math.round(counter.value).toString(); },
              onComplete: () => { element.textContent = Math.round(target).toString(); },
            });
          },
        });
      });
  }, motionRoot);

  pageCleanup.push(() => context.revert());
}

function initAmbientMotion() {
  if (window.matchMedia(REDUCED_MOTION).matches) return;
  const bands = [...document.querySelectorAll<HTMLElement>(".kinetic-marquee, .stack-ticker")];
  const hero = document.querySelector<HTMLElement>(".hero-section");
  if (!bands.length && !hero) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === hero) {
        entry.target.classList.toggle("is-idle-visible", entry.isIntersecting);
        return;
      }
      entry.target.classList.toggle("is-in-view", entry.isIntersecting);
    });
  }, { rootMargin: "15% 0px", threshold: 0 });
  bands.forEach((band) => observer.observe(band));
  if (hero) observer.observe(hero);
  pageCleanup.push(() => observer.disconnect());
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
  initAmbientMotion();
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
