const SOUND_PREFERENCE_KEY = "shafri-portfolio-ui-sound";
const MASTER_LEVEL = 0.42;
const HOVER_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  '[role="button"]',
  ".stack-item",
  ".project-feature",
  ".publication-card",
  ".journey-list li",
].join(",");
const PRESS_SELECTOR = 'a,button,input,textarea,select,[role="button"]';

type ToneOptions = {
  frequency: number;
  endFrequency: number;
  duration: number;
  volume: number;
  type: OscillatorType;
  delay?: number;
};

class UISoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private soundEnabled = true;

  constructor() {
    try {
      this.soundEnabled = window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "muted";
    } catch {
      this.soundEnabled = true;
    }
  }

  get enabled() {
    return this.soundEnabled;
  }

  get ready() {
    return this.soundEnabled && this.context?.state === "running";
  }

  setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? "enabled" : "muted");
    } catch {
      // The preference is optional when storage is unavailable.
    }

    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(enabled ? MASTER_LEVEL : 0.0001, now, 0.012);
    }
  }

  async unlock() {
    if (!this.soundEnabled) return false;
    if (!this.context) this.createContext();
    if (!this.context) return false;

    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch {
        return false;
      }
    }
    return this.context.state === "running";
  }

  suspend() {
    if (this.context?.state === "running") void this.context.suspend();
  }

  hover() {
    this.tone({
      frequency: 820,
      endFrequency: 1160,
      duration: 0.045,
      volume: 0.027,
      type: "triangle",
    });
  }

  press() {
    this.tone({
      frequency: 190,
      endFrequency: 108,
      duration: 0.075,
      volume: 0.055,
      type: "square",
    });
    this.noise(0.038, 0.018, 1550);
  }

  scroll(direction: number) {
    this.tone({
      frequency: direction > 0 ? 510 : 360,
      endFrequency: direction > 0 ? 360 : 510,
      duration: 0.038,
      volume: 0.019,
      type: "sine",
    });
    this.noise(0.022, 0.008, 2100);
  }

  section(index: number) {
    const root = 168 + (index % 7) * 18;
    this.tone({
      frequency: root,
      endFrequency: root * 0.78,
      duration: 0.13,
      volume: 0.047,
      type: "triangle",
    });
    this.tone({
      frequency: root * 2.15,
      endFrequency: root * 2.8,
      duration: 0.09,
      volume: 0.026,
      type: "sine",
      delay: 0.045,
    });
    this.noise(0.05, 0.011, 1250);
  }

  enabledCue() {
    this.tone({
      frequency: 420,
      endFrequency: 680,
      duration: 0.09,
      volume: 0.04,
      type: "triangle",
    });
    this.tone({
      frequency: 680,
      endFrequency: 940,
      duration: 0.08,
      volume: 0.027,
      type: "sine",
      delay: 0.065,
    });
  }

  private createContext() {
    const Context = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;

    this.context = new Context();
    this.master = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.master.gain.value = this.soundEnabled ? MASTER_LEVEL : 0.0001;
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.16;
    this.master.connect(this.compressor);
    this.compressor.connect(this.context.destination);
  }

  private tone(options: ToneOptions) {
    const context = this.context;
    const master = this.master;
    if (!this.soundEnabled || context?.state !== "running" || !master) return;

    const start = context.currentTime + (options.delay ?? 0);
    const end = start + options.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  private noise(duration: number, volume: number, highpass: number) {
    const context = this.context;
    const master = this.master;
    if (!this.soundEnabled || context?.state !== "running" || !master) return;

    if (!this.noiseBuffer) {
      const samples = Math.max(1, Math.floor(context.sampleRate * 0.08));
      this.noiseBuffer = context.createBuffer(1, samples, context.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples; index += 1) channel[index] = Math.random() * 2 - 1;
    }

    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + duration + 0.01);
  }
}

let sharedEngine: UISoundEngine | null = null;

function getClosestTarget(event: Event, selector: string) {
  return event.target instanceof Element
    ? event.target.closest(selector) as HTMLElement | null
    : null;
}

export function initUISound() {
  const engine = sharedEngine ?? (sharedEngine = new UISoundEngine());
  const toggles = [...document.querySelectorAll<HTMLButtonElement>("[data-sound-toggle]")];
  const compactLayout = window.matchMedia("(max-width: 959px)");
  let lastPointerWasKeyboard = false;
  let lastHoverTarget: HTMLElement | null = null;
  let lastHoverAt = 0;
  let lastScrollY = window.scrollY;
  let scrollDistance = 0;
  let lastScrollAt = 0;
  let lastSectionAt = 0;
  let scrollFrame = 0;

  const updateToggles = () => {
    toggles.forEach((toggle) => {
      const enabled = engine.enabled;
      const label = toggle.querySelector<HTMLElement>("[data-sound-toggle-label]");
      toggle.dataset.soundEnabled = String(enabled);
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.setAttribute("aria-label", enabled ? "Mute interface sounds" : "Enable interface sounds");
      toggle.title = enabled ? "Mute interface sounds" : "Enable interface sounds";
      if (label) label.textContent = enabled ? "SFX ON" : "SFX OFF";
    });
  };

  const onToggle = () => {
    const enabled = !engine.enabled;
    engine.setEnabled(enabled);
    updateToggles();
    if (enabled) void engine.unlock().then((ready) => { if (ready) engine.enabledCue(); });
  };

  const onPointerDown = (event: PointerEvent) => {
    lastPointerWasKeyboard = false;
    const target = getClosestTarget(event, PRESS_SELECTOR);
    void engine.unlock().then((ready) => {
      if (ready && target && !target.matches(":disabled") && !target.closest("[data-sound-toggle]")) {
        engine.press();
      }
    });
  };

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.buttons !== 0 || !engine.ready) return;
    const target = getClosestTarget(event, HOVER_SELECTOR);
    if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
    const now = performance.now();
    if (target === lastHoverTarget && now - lastHoverAt < 180) return;
    lastHoverTarget = target;
    lastHoverAt = now;
    engine.hover();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    lastPointerWasKeyboard = true;
    if (event.repeat) return;
    const target = getClosestTarget(event, PRESS_SELECTOR);
    const activates = event.key === "Enter"
      || (event.key === " " && target?.matches('a,button,[role="button"]'));
    void engine.unlock().then((ready) => {
      if (ready && activates && target && !target.closest("[data-sound-toggle]")) engine.press();
    });
  };

  const onFocusIn = (event: FocusEvent) => {
    if (!lastPointerWasKeyboard || !engine.ready || !getClosestTarget(event, HOVER_SELECTOR)) return;
    engine.hover();
  };

  const onWheel = () => {
    if (!engine.ready) void engine.unlock();
  };

  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      lastScrollY = currentY;
      if (!delta || !engine.ready) return;

      scrollDistance += Math.abs(delta);
      const now = performance.now();
      const threshold = compactLayout.matches ? 130 : 210;
      if (scrollDistance >= threshold && now - lastScrollAt >= 135 && now - lastSectionAt >= 190) {
        engine.scroll(Math.sign(delta));
        scrollDistance %= threshold;
        lastScrollAt = now;
      }
    });
  };

  const onSectionChange = (event: Event) => {
    if (!engine.ready) return;
    const index = Number((event as CustomEvent<{ index?: number }>).detail?.index ?? 0);
    lastSectionAt = performance.now();
    scrollDistance = 0;
    engine.section(index);
  };

  const onVisibilityChange = () => {
    if (document.hidden) engine.suspend();
  };

  toggles.forEach((toggle) => toggle.addEventListener("click", onToggle));
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointerover", onPointerOver);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("story:change", onSectionChange);
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  updateToggles();

  return () => {
    toggles.forEach((toggle) => toggle.removeEventListener("click", onToggle));
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("story:change", onSectionChange);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  };
}
