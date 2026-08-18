import { gsap } from "gsap";
import * as THREE from "three";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const QUALITY_KEY = "shafri-portfolio-render-quality";

const screenOrder = ["home", "projects", "profile", "records", "modules", "assessment", "recruitment"] as const;
type ScreenKey = (typeof screenOrder)[number];

const screenMeta: Record<ScreenKey, { hash: string; label: string; sceneIndex: number }> = {
  home: { hash: "hero", label: "Home / Selected operator", sceneIndex: 0 },
  projects: { hash: "projects", label: "Operations / Case studies", sceneIndex: 1 },
  profile: { hash: "journey", label: "Personnel / Operator file", sceneIndex: 2 },
  records: { hash: "publications", label: "Archive / Research records", sceneIndex: 3 },
  modules: { hash: "tech-stack", label: "Loadout / Capabilities", sceneIndex: 4 },
  assessment: { hash: "scores", label: "Evaluation / Assessment data", sceneIndex: 5 },
  recruitment: { hash: "contact", label: "Channel / Recruitment", sceneIndex: 6 },
};

const hashAliases: Record<string, ScreenKey> = {
  "": "home",
  home: "home",
  hero: "home",
  projects: "projects",
  "project-malaria": "projects",
  "project-visionserve": "projects",
  "project-sentiment": "projects",
  profile: "profile",
  journey: "profile",
  records: "records",
  publications: "records",
  modules: "modules",
  "tech-stack": "modules",
  assessment: "assessment",
  scores: "assessment",
  recruitment: "recruitment",
  contact: "recruitment",
};

type SceneController = {
  setMode: (screen: ScreenKey) => void;
  setQuality: (high: boolean) => void;
  destroy: () => void;
};

function screenFromHash() {
  return hashAliases[window.location.hash.slice(1)] ?? "home";
}

function buildIndustrialGrid() {
  const points: number[] = [];
  for (let x = -9; x <= 9; x += 0.75) points.push(x, -5, 0, x, 5, 0);
  for (let y = -5; y <= 5; y += 0.75) points.push(-9, y, 0, 9, y, 0);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x171816, transparent: true, opacity: 0.08 });
  return new THREE.LineSegments(geometry, material);
}

function createPanel(width: number, height: number, color: number, opacity = 1) {
  const geometry = new THREE.BoxGeometry(width, height, 0.06);
  const material = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Mesh(geometry, material);
}

function createScene(ui: HTMLElement, canvas: HTMLCanvasElement, reducedMotion: boolean): SceneController | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
  } catch {
    ui.classList.add("no-webgl");
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0, 10.5);

  const world = new THREE.Group();
  const architectural = new THREE.Group();
  const subject = new THREE.Group();
  const accents = new THREE.Group();
  scene.add(world);
  world.add(architectural, subject, accents);

  const grid = buildIndustrialGrid();
  grid.position.set(-1.8, 0, -2.2);
  grid.rotation.z = -0.04;
  architectural.add(grid);

  const yellowSlab = createPanel(3.2, 6.25, 0xfffa00);
  yellowSlab.position.set(0.15, -0.2, -0.72);
  yellowSlab.rotation.z = -0.055;
  subject.add(yellowSlab);

  const blackRail = createPanel(0.22, 5.1, 0x171816);
  blackRail.position.set(-2.18, -0.22, -0.5);
  blackRail.rotation.z = 0.045;
  subject.add(blackRail);

  const rearPlate = createPanel(5.25, 0.48, 0x171816, 0.94);
  rearPlate.position.set(-0.1, -2.88, -0.3);
  rearPlate.rotation.z = 0.018;
  subject.add(rearPlate);

  const leftPlate = createPanel(3.7, 1.25, 0xd6d6d1, 0.9);
  leftPlate.position.set(-4.4, 2.25, -1.1);
  leftPlate.rotation.z = 0.025;
  architectural.add(leftPlate);

  const rightPlate = createPanel(3.5, 0.2, 0x171816, 0.55);
  rightPlate.position.set(4.7, -2.35, -1.05);
  architectural.add(rightPlate);

  const shards: THREE.Mesh[] = [];
  const shardData = [
    [-3.2, -2.1, 0.62, 0.09, 0x171816],
    [-2.8, -2.45, 1.45, 0.045, 0xfffa00],
    [2.8, 2.4, 1.25, 0.055, 0x171816],
    [3.55, 2.05, 0.5, 0.12, 0xfffa00],
    [2.65, -2.55, 1.9, 0.035, 0x171816],
  ] as const;
  shardData.forEach(([x, y, width, height, color], index) => {
    const shard = createPanel(width, height, color, index === 1 ? 0.9 : 0.76);
    shard.position.set(x, y, -0.2 + index * 0.045);
    shard.rotation.z = index % 2 ? -0.16 : 0.11;
    accents.add(shard);
    shards.push(shard);
  });

  const particleCount = 74;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    particlePositions[index * 3] = (Math.random() - 0.5) * 15;
    particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 8;
    particlePositions[index * 3 + 2] = -1 + Math.random() * 2.8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({ color: 0x171816, size: 0.018, transparent: true, opacity: 0.25 });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  architectural.add(particles);

  let portrait: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  let portraitShadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  let scanRail: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  let portraitTexture: THREE.Texture | null = null;

  const portraitSource = canvas.dataset.portraitSrc;
  if (portraitSource) {
    new THREE.TextureLoader().load(
      portraitSource,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        portraitTexture = texture;

        const geometry = new THREE.PlaneGeometry(4.25, 6.38);
        const shadowMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          color: 0x171816,
          transparent: true,
          opacity: 0.16,
          alphaTest: 0.025,
          depthWrite: false,
        });
        portraitShadow = new THREE.Mesh(geometry, shadowMaterial);
        portraitShadow.position.set(0.2, -0.18, 0.3);
        portraitShadow.rotation.z = -0.012;
        subject.add(portraitShadow);

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.025,
          depthWrite: true,
        });
        portrait = new THREE.Mesh(geometry, material);
        portrait.position.set(0, 0.02, 0.82);
        subject.add(portrait);

        scanRail = createPanel(4.35, 0.035, 0xfffa00, 0.88);
        scanRail.position.set(0, 0, 1.04);
        subject.add(scanRail);
        ui.classList.add("has-webgl");
      },
      undefined,
      () => ui.classList.add("no-webgl"),
    );
  }

  const sceneTargets: Record<ScreenKey, { x: number; y: number; z: number; scale: number; opacity: number; worldX: number; worldRotation: number }> = {
    home: { x: -0.05, y: -0.15, z: 0, scale: 1, opacity: 1, worldX: 0, worldRotation: 0 },
    projects: { x: -3.25, y: -0.35, z: -0.3, scale: 0.78, opacity: 0.18, worldX: 0.55, worldRotation: -0.025 },
    profile: { x: 3.35, y: -0.4, z: -0.4, scale: 0.8, opacity: 0.15, worldX: -0.4, worldRotation: 0.025 },
    records: { x: -3.5, y: -0.5, z: -0.6, scale: 0.72, opacity: 0.1, worldX: 0.3, worldRotation: -0.018 },
    modules: { x: 3.5, y: -0.45, z: -0.5, scale: 0.75, opacity: 0.12, worldX: -0.3, worldRotation: 0.018 },
    assessment: { x: 0, y: -0.8, z: -1, scale: 0.9, opacity: 0.08, worldX: 0, worldRotation: 0 },
    recruitment: { x: -3.2, y: -0.5, z: -0.6, scale: 0.74, opacity: 0.08, worldX: 0.35, worldRotation: -0.018 },
  };

  let activeScreen: ScreenKey = "home";
  let highQuality = true;
  let running = !document.hidden;
  let frame = 0;
  let elapsed = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let width = 1;
  let height = 1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, highQuality ? 1.5 : 1));
  };

  const setQuality = (high: boolean) => {
    highQuality = high;
    particles.visible = high;
    if (scanRail) scanRail.visible = high;
    resize();
  };

  const setMode = (screen: ScreenKey) => {
    activeScreen = screen;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    targetPointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    targetPointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
  };

  const render = (time: number) => {
    if (!running) return;
    elapsed = time * 0.001;
    pointerX += (targetPointerX - pointerX) * 0.055;
    pointerY += (targetPointerY - pointerY) * 0.055;
    const compact = width < 960;
    const desired = sceneTargets[activeScreen];
    const compactHomeX = compact && activeScreen === "home" ? 0.7 : desired.x;
    const compactHomeY = compact && activeScreen === "home" ? 0.4 : desired.y;
    const compactScale = compact && activeScreen === "home" ? 0.83 : desired.scale;

    subject.position.x += (compactHomeX - subject.position.x) * 0.075;
    subject.position.y += (compactHomeY - subject.position.y) * 0.075;
    subject.position.z += (desired.z - subject.position.z) * 0.075;
    subject.scale.x += (compactScale - subject.scale.x) * 0.075;
    subject.scale.y += (compactScale - subject.scale.y) * 0.075;
    subject.scale.z += (compactScale - subject.scale.z) * 0.075;
    world.position.x += (desired.worldX - world.position.x) * 0.06;
    world.rotation.z += (desired.worldRotation - world.rotation.z) * 0.06;

    const idle = reducedMotion ? 0 : Math.sin(elapsed * 0.78) * 0.035;
    if (portrait) {
      portrait.position.y = 0.02 + idle;
      portrait.rotation.y = reducedMotion ? 0 : pointerX * 0.018;
      portrait.rotation.x = reducedMotion ? 0 : pointerY * 0.008;
      portrait.material.opacity += (desired.opacity - portrait.material.opacity) * 0.08;
    }
    if (portraitShadow) {
      portraitShadow.position.y = -0.18 + idle * 0.7;
      portraitShadow.material.opacity += (desired.opacity * 0.16 - portraitShadow.material.opacity) * 0.08;
    }
    yellowSlab.material.opacity += ((activeScreen === "home" ? 1 : 0.08) - yellowSlab.material.opacity) * 0.08;
    yellowSlab.material.transparent = yellowSlab.material.opacity < 0.999;
    blackRail.material.opacity += ((activeScreen === "home" ? 1 : 0.1) - blackRail.material.opacity) * 0.08;
    blackRail.material.transparent = blackRail.material.opacity < 0.999;

    if (scanRail) {
      scanRail.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.15) * 2.72;
      scanRail.material.opacity += ((activeScreen === "home" && highQuality ? 0.88 : 0) - scanRail.material.opacity) * 0.08;
    }

    if (!reducedMotion) {
      camera.position.x += (pointerX * 0.13 - camera.position.x) * 0.045;
      camera.position.y += (-pointerY * 0.08 - camera.position.y) * 0.045;
      shards.forEach((shard, index) => {
        shard.position.y += Math.sin(elapsed * (0.45 + index * 0.04) + index) * 0.00045;
      });
      particles.rotation.z = elapsed * 0.002;
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(render);
  };

  const onVisibility = () => {
    running = !document.hidden;
    if (running && !frame) frame = window.requestAnimationFrame(render);
    if (!running && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  frame = window.requestAnimationFrame(render);

  return {
    setMode,
    setQuality,
    destroy: () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      portraitTexture?.dispose();
      renderer.dispose();
      ui.classList.remove("has-webgl", "no-webgl");
    },
  };
}

export function initGameInterface() {
  const ui = document.querySelector<HTMLElement>("[data-game-ui]");
  const canvas = ui?.querySelector<HTMLCanvasElement>("[data-game-canvas]");
  if (!ui || !canvas) return () => undefined;

  const reducedMotion = window.matchMedia(REDUCED_MOTION).matches;
  const screens = new Map<ScreenKey, HTMLElement>();
  ui.querySelectorAll<HTMLElement>("[data-game-screen]").forEach((screen) => {
    const key = screen.dataset.gameScreen as ScreenKey;
    if (screenOrder.includes(key)) screens.set(key, screen);
  });

  const targetButtons = [...ui.querySelectorAll<HTMLElement>("[data-game-target]")];
  const projectButtons = [...ui.querySelectorAll<HTMLButtonElement>("[data-project-select]")];
  const projectRecords = [...ui.querySelectorAll<HTMLElement>("[data-project-record]")];
  const announcer = ui.querySelector<HTMLElement>("[data-game-announcer]");
  const qualityButton = ui.querySelector<HTMLButtonElement>("[data-game-quality]");
  const qualityLabel = ui.querySelector<HTMLElement>("[data-game-quality-label]");
  const clock = ui.querySelector<HTMLTimeElement>("[data-game-clock]");

  if (reducedMotion) {
    const seek = (screen: ScreenKey, addHistory: boolean) => {
      const id = screenMeta[screen].hash;
      document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
      if (addHistory) window.history.pushState({ screen }, "", `#${id}`);
      if (announcer) announcer.textContent = screenMeta[screen].label;
    };
    const onReducedTarget = (event: Event) => {
      const screen = (event.currentTarget as HTMLElement).dataset.gameTarget as ScreenKey;
      if (screenOrder.includes(screen)) seek(screen, true);
    };
    const onReducedHistory = () => seek(screenFromHash(), false);
    ui.classList.add("is-reduced-flow");
    targetButtons.forEach((button) => button.addEventListener("click", onReducedTarget));
    window.addEventListener("popstate", onReducedHistory);
    return () => {
      targetButtons.forEach((button) => button.removeEventListener("click", onReducedTarget));
      window.removeEventListener("popstate", onReducedHistory);
      ui.classList.remove("is-reduced-flow");
    };
  }

  const scene = createScene(ui, canvas, reducedMotion);
  let activeScreen = screenFromHash();
  let activeProject = 0;
  let transitioning = false;
  let highQuality = window.localStorage.getItem(QUALITY_KEY) !== "low";

  const updateClock = () => {
    if (!clock) return;
    const value = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
    clock.textContent = value;
    clock.dateTime = new Date().toISOString();
  };

  const updateQuality = () => {
    qualityButton?.setAttribute("aria-pressed", String(highQuality));
    if (qualityLabel) qualityLabel.textContent = highQuality ? "HIGH" : "LOW";
    scene?.setQuality(highQuality);
  };

  const syncNavigation = (screen: ScreenKey) => {
    targetButtons.forEach((target) => {
      const active = target.dataset.gameTarget === screen;
      target.classList.toggle("is-active", active);
      if (active) target.setAttribute("aria-current", "page");
      else target.removeAttribute("aria-current");
    });
  };

  const finalizeScreenState = (screen: ScreenKey) => {
    screens.forEach((element, key) => {
      const active = key === screen;
      element.classList.toggle("is-active", active);
      element.toggleAttribute("inert", !active);
      element.setAttribute("aria-hidden", String(!active));
      element.style.removeProperty("z-index");
    });
    ui.dataset.activeScreen = screen;
    syncNavigation(screen);
    scene?.setMode(screen);
    if (announcer) announcer.textContent = screenMeta[screen].label;
    document.dispatchEvent(new CustomEvent("story:change", {
      detail: { index: screenMeta[screen].sceneIndex, key: screen, section: screenMeta[screen].hash },
    }));
  };

  const setScreen = (next: ScreenKey, historyMode: "push" | "replace" | "none" = "push") => {
    if (!screens.has(next) || next === activeScreen || transitioning) return;
    const outgoing = screens.get(activeScreen);
    const incoming = screens.get(next);
    if (!outgoing || !incoming) return;

    const oldIndex = screenOrder.indexOf(activeScreen);
    const newIndex = screenOrder.indexOf(next);
    const forward = newIndex >= oldIndex;
    const outgoingOwnedFocus = outgoing.contains(document.activeElement);
    activeScreen = next;

    if (historyMode !== "none") {
      const hash = `#${screenMeta[next].hash}`;
      if (historyMode === "push") window.history.pushState({ screen: next }, "", hash);
      else window.history.replaceState({ screen: next }, "", hash);
    }

    if (reducedMotion) {
      finalizeScreenState(next);
      if (outgoingOwnedFocus) incoming.querySelector<HTMLElement>(".game-screen-header")?.focus({ preventScroll: true });
      return;
    }

    transitioning = true;
    incoming.classList.add("is-active");
    incoming.removeAttribute("inert");
    incoming.setAttribute("aria-hidden", "false");
    incoming.style.zIndex = "3";
    outgoing.style.zIndex = "2";
    const incomingClip = forward ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
    const outgoingClip = forward ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";

    gsap.timeline({
      defaults: { overwrite: true },
      onComplete: () => {
        finalizeScreenState(next);
        gsap.set([outgoing, incoming], { clearProps: "clipPath,transform" });
        transitioning = false;
        if (outgoingOwnedFocus) incoming.querySelector<HTMLElement>(".game-screen-header")?.focus({ preventScroll: true });
      },
    })
      .set(incoming, { clipPath: incomingClip, x: forward ? 18 : -18 })
      .to(outgoing, { clipPath: outgoingClip, x: forward ? -14 : 14, duration: 0.26, ease: "power2.in" }, 0)
      .to(incoming, { clipPath: "inset(0 0 0 0)", x: 0, duration: 0.46, ease: "power4.out" }, 0.14);

    syncNavigation(next);
    scene?.setMode(next);
  };

  const selectProject = (index: number) => {
    if (index === activeProject || !projectRecords[index]) return;
    const outgoing = projectRecords[activeProject];
    const incoming = projectRecords[index];
    const forward = index > activeProject;
    activeProject = index;
    projectButtons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    if (reducedMotion) {
      projectRecords.forEach((record, recordIndex) => record.classList.toggle("is-selected", recordIndex === index));
      return;
    }

    incoming.classList.add("is-selected");
    incoming.style.zIndex = "2";
    outgoing.style.zIndex = "1";
    gsap.timeline({
      onComplete: () => {
        outgoing.classList.remove("is-selected");
        outgoing.style.removeProperty("z-index");
        incoming.style.removeProperty("z-index");
        gsap.set([outgoing, incoming], { clearProps: "clipPath,transform" });
      },
    })
      .set(incoming, { clipPath: forward ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)", y: forward ? 12 : -12 })
      .to(outgoing, { clipPath: forward ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)", duration: 0.22, ease: "power2.in" })
      .to(incoming, { clipPath: "inset(0 0 0 0)", y: 0, duration: 0.4, ease: "power4.out" }, 0.1);
  };

  const onTargetClick = (event: Event) => {
    const target = event.currentTarget as HTMLElement;
    const next = target.dataset.gameTarget as ScreenKey;
    if (screenOrder.includes(next)) setScreen(next);
  };

  const onProjectClick = (event: Event) => {
    const index = Number((event.currentTarget as HTMLElement).dataset.projectSelect);
    if (!Number.isNaN(index)) selectProject(index);
  };

  const onHistory = () => {
    const next = screenFromHash();
    if (next !== activeScreen) setScreen(next, "none");
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.matches("input,textarea,select,[contenteditable='true']")) return;
    if (event.key === "Escape" && activeScreen !== "home") {
      event.preventDefault();
      setScreen("home");
    }
  };

  const onQuality = () => {
    highQuality = !highQuality;
    window.localStorage.setItem(QUALITY_KEY, highQuality ? "high" : "low");
    updateQuality();
  };

  ui.classList.add("is-ready");
  document.body.classList.add("game-ui-active");
  finalizeScreenState(activeScreen);
  if (!window.location.hash) window.history.replaceState({ screen: activeScreen }, "", `#${screenMeta[activeScreen].hash}`);
  projectButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === 0)));
  updateClock();
  updateQuality();

  const clockTimer = window.setInterval(updateClock, 1000);
  targetButtons.forEach((button) => button.addEventListener("click", onTargetClick));
  projectButtons.forEach((button) => button.addEventListener("click", onProjectClick));
  qualityButton?.addEventListener("click", onQuality);
  window.addEventListener("popstate", onHistory);
  window.addEventListener("hashchange", onHistory);
  document.addEventListener("keydown", onKeyDown);

  return () => {
    window.clearInterval(clockTimer);
    targetButtons.forEach((button) => button.removeEventListener("click", onTargetClick));
    projectButtons.forEach((button) => button.removeEventListener("click", onProjectClick));
    qualityButton?.removeEventListener("click", onQuality);
    window.removeEventListener("popstate", onHistory);
    window.removeEventListener("hashchange", onHistory);
    document.removeEventListener("keydown", onKeyDown);
    gsap.killTweensOf([...screens.values(), ...projectRecords]);
    scene?.destroy();
    ui.classList.remove("is-ready");
    document.body.classList.remove("game-ui-active");
  };
}
