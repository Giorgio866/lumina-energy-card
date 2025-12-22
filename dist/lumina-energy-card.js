/**
 * Lumina Energy Card
 * Custom Home Assistant card for energy flow visualization
 * Version: 1.1.24
 * Tested with Home Assistant 2025.12+
 */
const BATTERY_GEOMETRY = { X: 260, Y_BASE: 350, WIDTH: 55, MAX_HEIGHT: 84 };
const TEXT_POSITIONS = {
  solar: { x: 177, y: 320, rotate: -16, skewX: -20, skewY: 0 },
  battery: { x: 245, y: 375, rotate: -25, skewX: -25, skewY: 5 },
  home: { x: 460, y: 245, rotate: -20, skewX: -20, skewY: 3 },
  grid: { x: 580, y: 90, rotate: -8, skewX: -10, skewY: 0 },
  car: { x: 590, y: 305, rotate: 16, skewX: 20, skewY: 0 }
};

const buildTextTransform = ({ x, y, rotate, skewX, skewY }) =>
  `translate(${x}, ${y}) rotate(${rotate}) skewX(${skewX}) skewY(${skewY}) translate(-${x}, -${y})`;

const TEXT_TRANSFORMS = {
  solar: buildTextTransform(TEXT_POSITIONS.solar),
  battery: buildTextTransform(TEXT_POSITIONS.battery),
  home: buildTextTransform(TEXT_POSITIONS.home),
  grid: buildTextTransform(TEXT_POSITIONS.grid),
  car: buildTextTransform(TEXT_POSITIONS.car)
};

const FLOW_PATHS = {
  pv1: 'M 250 237 L 282 230 L 420 280',
  pv2: 'M 200 205 L 282 238 L 420 288',
  bat: 'M 423 310 L 325 350',
  load: 'M 471 303 L 550 273 L 380 220',
  grid: 'M 470 280 L 575 240 L 575 223',
  car: 'M 475 329 L 490 335 L 600 285'
};

const BATTERY_TRANSFORM = `translate(${BATTERY_GEOMETRY.X}, ${BATTERY_GEOMETRY.Y_BASE}) rotate(-6) skewX(-4) skewY(30) translate(-${BATTERY_GEOMETRY.X}, -${BATTERY_GEOMETRY.Y_BASE})`;
const BATTERY_OFFSET_BASE = BATTERY_GEOMETRY.Y_BASE - BATTERY_GEOMETRY.MAX_HEIGHT;

const TXT_STYLE = 'font-weight:bold; font-family: sans-serif; text-anchor:middle; text-shadow: 0 0 5px black;';
const FLOW_ARROW_COUNT = 5;
const MAX_PV_STRINGS = 6;
const MAX_PV_LINES = MAX_PV_STRINGS + 1;
const PV_LINE_SPACING = 14;
const FLOW_STYLE_DEFAULT = 'dashes';
const FLOW_STYLE_PATTERNS = {
  dashes: { dasharray: '18 12', cycle: 32 },
  dots: { dasharray: '1 16', cycle: 22 },
  arrows: { dasharray: null, cycle: 1 }
};

const FLOW_BASE_LOOP_RATE = 0.0025;
const FLOW_MIN_GLOW_SCALE = 0.2;
const DEFAULT_GRID_ACTIVITY_THRESHOLD = 100;

const buildArrowGroupSvg = (key, flowState) => {
  const color = flowState && (flowState.glowColor || flowState.stroke) ? (flowState.glowColor || flowState.stroke) : '#00FFFF';
  const activeOpacity = flowState && flowState.active ? 1 : 0;
  const segments = Array.from({ length: FLOW_ARROW_COUNT }, (_, index) =>
    `<polygon data-arrow-shape="${key}" data-arrow-index="${index}" points="-12,-5 0,0 -12,5" fill="${color}" />`
  ).join('');
  return `<g class="flow-arrow" data-arrow-key="${key}" style="opacity:${activeOpacity};">${segments}</g>`;
};

class LuminaEnergyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._lastRender = 0;
    this._forceRender = false;
    this._rootInitialized = false;
    this._domRefs = null;
    this._prevViewState = null;
    this._flowTweens = new Map();
    this._gsap = null;
    this._gsapLoading = null;
    this._flowPathLengths = new Map();
    this._animationSpeedFactor = 1;
    this._animationStyle = FLOW_STYLE_DEFAULT;
    this._defaults = (typeof LuminaEnergyCard.getStubConfig === 'function')
      ? { ...LuminaEnergyCard.getStubConfig() }
      : {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    const defaults = this._defaults || {};
    this.config = { ...defaults, ...config };
    this._forceRender = true;
    this._prevViewState = null;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) {
      return;
    }
    if (this._isEditorActive()) {
      if (this._forceRender) {
        this.render();
      }
      this._forceRender = false;
      return;
    }
    const now = Date.now();
    const configuredInterval = Number(this.config.update_interval);
    const intervalSeconds = Number.isFinite(configuredInterval) ? configuredInterval : 30;
    const clampedSeconds = Math.min(Math.max(intervalSeconds, 0), 60);
    const intervalMs = clampedSeconds > 0 ? clampedSeconds * 1000 : 0;
    if (this._forceRender || !this._lastRender || intervalMs === 0 || now - this._lastRender >= intervalMs) {
      this.render();
      this._forceRender = false;
    }
  }

  static async getConfigElement() {
    return document.createElement('lumina-energy-card-editor');
  }

  static getStubConfig() {
    return {
      language: 'en',
      card_title: 'LUMINA ENERGY',
      background_image: '/local/community/lumina-energy-card/lumina_background.jpg',
      header_font_size: 16,
      daily_label_font_size: 12,
      daily_value_font_size: 20,
      pv_font_size: 16,
      battery_soc_font_size: 20,
      battery_power_font_size: 14,
      load_font_size: 15,
      grid_font_size: 15,
      car_power_font_size: 15,
      car_soc_font_size: 12,
      animation_speed_factor: 1,
      animation_style: 'dashes',
      sensor_pv_total: '',
      sensor_pv1: '',
      sensor_daily: '',
      sensor_bat1_soc: '',
      sensor_bat1_power: '',
      sensor_home_load: '',
      sensor_grid_power: '',
      sensor_grid_import: '',
      sensor_grid_export: '',
      grid_activity_threshold: DEFAULT_GRID_ACTIVITY_THRESHOLD,
      grid_threshold_warning: null,
      grid_warning_color: '',
      grid_threshold_critical: null,
      grid_critical_color: '',
      show_pv_strings: false,
      display_unit: 'kW',
      update_interval: 30
    };
  }

  _isEditorActive() {
    return Boolean(this.closest('hui-card-preview'));
  }

  disconnectedCallback() {
    if (typeof super.disconnectedCallback === 'function') {
      super.disconnectedCallback();
    }
    this._teardownFlowAnimations();
    this._domRefs = null;
    this._prevViewState = null;
    this._rootInitialized = false;
  }

  _applyFlowAnimationTargets(flowDurations, flowStates) {
    if (!this._domRefs || !this._domRefs.flows) {
      return;
    }

    const execute = () => {
      const flowElements = this._domRefs.flows;
      const seenKeys = new Set();

      Object.entries(flowDurations || {}).forEach(([flowKey, seconds]) => {
        const element = flowElements[flowKey];
        if (!element) {
          return;
        }
        seenKeys.add(flowKey);
        const state = flowStates && flowStates[flowKey] ? flowStates[flowKey] : undefined;
        this._syncFlowAnimation(flowKey, element, seconds, state);
      });

      this._flowTweens.forEach((entry, key) => {
        if (!seenKeys.has(key)) {
          this._killFlowEntry(entry);
          this._flowTweens.delete(key);
        }
      });
    };

    if (!flowDurations || Object.keys(flowDurations).length === 0) {
      execute();
      return;
    }

    this._ensureGsap()
      .then(() => execute())
      .catch((error) => {
        console.warn('Lumina Energy Card: Unable to load GSAP', error);
        execute();
      });
  }

  _ensureGsap() {
    if (this._gsap) {
      return Promise.resolve(this._gsap);
    }
    if (this._gsapLoading) {
      return this._gsapLoading;
    }

    const moduleCandidates = [
      'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js?module',
      'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js'
    ];
    const scriptCandidates = [
      'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'
    ];

    const resolveCandidate = (module) => {
      const candidate = module && (module.gsap || module.default || module);
      if (candidate && typeof candidate.to === 'function') {
        this._gsap = candidate;
        return this._gsap;
      }
      if (typeof window !== 'undefined' && window.gsap && typeof window.gsap.to === 'function') {
        this._gsap = window.gsap;
        return this._gsap;
      }
      throw new Error('Lumina Energy Card: GSAP module missing expected exports');
    };

    const ensureGlobalGsap = () => {
      if (typeof window !== 'undefined' && window.gsap && typeof window.gsap.to === 'function') {
        this._gsap = window.gsap;
        return this._gsap;
      }
      throw new Error('Lumina Energy Card: GSAP global not available after script load');
    };

    const attemptModuleLoad = (index) => {
      if (index >= moduleCandidates.length) {
        return Promise.reject(new Error('Lumina Energy Card: module imports exhausted'));
      }
      return import(moduleCandidates[index])
        .then(resolveCandidate)
        .catch((error) => {
          console.warn('Lumina Energy Card: GSAP module load failed', moduleCandidates[index], error);
          return attemptModuleLoad(index + 1);
        });
    };

    const loadScript = (url) => {
      if (typeof document === 'undefined') {
        return Promise.reject(new Error('Lumina Energy Card: document not available for GSAP script load'));
      }

      const existing = document.querySelector(`script[data-lumina-gsap="${url}"]`);
      if (existing && existing.dataset.loaded === 'true') {
        try {
          return Promise.resolve(ensureGlobalGsap());
        } catch (err) {
          return Promise.reject(err);
        }
      }
      if (existing) {
        return new Promise((resolve, reject) => {
          existing.addEventListener('load', () => {
            try {
              resolve(ensureGlobalGsap());
            } catch (err) {
              reject(err);
            }
          }, { once: true });
          existing.addEventListener('error', (event) => reject(event?.error || new Error(`Lumina Energy Card: failed to load GSAP script ${url}`)), { once: true });
        });
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.luminaGsap = url;
        script.addEventListener('load', () => {
          script.dataset.loaded = 'true';
          try {
            resolve(ensureGlobalGsap());
          } catch (err) {
            reject(err);
          }
        }, { once: true });
        script.addEventListener('error', (event) => {
          script.dataset.loaded = 'error';
          reject(event?.error || new Error(`Lumina Energy Card: failed to load GSAP script ${url}`));
        }, { once: true });
        document.head.appendChild(script);
      });
    };

    const attemptScriptLoad = (index) => {
      if (index >= scriptCandidates.length) {
        return Promise.reject(new Error('Lumina Energy Card: script fallbacks exhausted'));
      }
      return loadScript(scriptCandidates[index])
        .catch((error) => {
          console.warn('Lumina Energy Card: GSAP script load failed', scriptCandidates[index], error);
          return attemptScriptLoad(index + 1);
        });
    };

    this._gsapLoading = attemptScriptLoad(0)
      .catch((scriptError) => {
        console.warn('Lumina Energy Card: GSAP script load failed, attempting module import', scriptError);
        return attemptModuleLoad(0);
      })
      .catch((error) => {
        this._gsapLoading = null;
        throw error;
      });

    return this._gsapLoading;
  }

  _syncFlowAnimation(flowKey, element, seconds, flowState) {
    if (!element) {
      return;
    }

    const animationStyle = this._animationStyle || FLOW_STYLE_DEFAULT;
    const pattern = FLOW_STYLE_PATTERNS[animationStyle] || FLOW_STYLE_PATTERNS[FLOW_STYLE_DEFAULT];
    const useArrows = animationStyle === 'arrows';
    const arrowGroup = useArrows && this._domRefs && this._domRefs.arrows ? this._domRefs.arrows[flowKey] : null;
    const arrowShapes = useArrows && this._domRefs && this._domRefs.arrowShapes ? this._domRefs.arrowShapes[flowKey] : null;
    const dashReferenceCycle = FLOW_STYLE_PATTERNS.dashes && Number.isFinite(FLOW_STYLE_PATTERNS.dashes.cycle)
      ? FLOW_STYLE_PATTERNS.dashes.cycle
      : 32;
    const pathLength = useArrows ? this._getFlowPathLength(flowKey) : 0;
    let resolvedPathLength = pathLength;
    if (!Number.isFinite(resolvedPathLength) || resolvedPathLength <= 0) {
      resolvedPathLength = this._getFlowPathLength(flowKey);
    }
    const strokeColor = flowState && (flowState.glowColor || flowState.stroke) ? (flowState.glowColor || flowState.stroke) : '#00FFFF';
    let speedFactor = Number(this._animationSpeedFactor);
    if (!Number.isFinite(speedFactor)) {
      speedFactor = 1;
    }
    const speedMagnitude = Math.abs(speedFactor);
    const directionSign = speedFactor < 0 ? -1 : 1;
    const baseLoopRate = this._computeFlowLoopRate(speedMagnitude);
    let loopRate = baseLoopRate;
    if (useArrows) {
      if (Number.isFinite(resolvedPathLength) && resolvedPathLength > 0) {
        loopRate = baseLoopRate * (dashReferenceCycle / resolvedPathLength);
      } else {
        loopRate = baseLoopRate * 0.25;
      }
    }
    const baseDirection = flowState && typeof flowState.direction === 'number' && flowState.direction !== 0 ? Math.sign(flowState.direction) : 1;
    const effectiveDirection = baseDirection * directionSign;
    const isActive = seconds > 0;
    let entry = this._flowTweens.get(flowKey);

    if (entry && entry.mode !== animationStyle) {
      this._killFlowEntry(entry);
      this._flowTweens.delete(flowKey);
      entry = null;
    }

    const ensurePattern = () => {
      element.setAttribute('data-flow-style', animationStyle);
      if (useArrows) {
        element.removeAttribute('stroke-dasharray');
        element.style.strokeDashoffset = '';
      } else if (pattern && pattern.dasharray) {
        element.setAttribute('stroke-dasharray', pattern.dasharray);
        if (!element.style.strokeDashoffset) {
          element.style.strokeDashoffset = '0';
        }
      }
    };
    ensurePattern();

    if (useArrows && arrowShapes && arrowShapes.length) {
      arrowShapes.forEach((shape) => {
        if (shape.getAttribute('fill') !== strokeColor) {
          shape.setAttribute('fill', strokeColor);
        }
      });
    }

    const hideArrows = () => {
      if (arrowGroup) {
        arrowGroup.style.opacity = '0';
      }
      if (useArrows && arrowShapes && arrowShapes.length) {
        arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
      }
    };

    if (!this._gsap) {
      if (entry) {
        this._killFlowEntry(entry);
        this._flowTweens.delete(flowKey);
      }
      this._setFlowGlow(element, strokeColor, isActive ? 0.8 : 0.25);
      if (!useArrows) {
        element.style.strokeDashoffset = '0';
      }
      hideArrows();
      return;
    }

    if (!entry || entry.element !== element || entry.arrowElement !== arrowGroup) {
      if (entry) {
        this._killFlowEntry(entry);
      }

      const glowState = { value: isActive ? 0.8 : 0.25 };
      const motionState = { phase: Math.random() };
      const directionState = { value: effectiveDirection };
      const newEntry = {
        flowKey,
        element,
        glowState,
        color: strokeColor,
        tween: null,
        arrowElement: arrowGroup,
        arrowShapes: useArrows && arrowShapes ? arrowShapes : [],
        directionState,
        directionTween: null,
        motionState,
        tickerCallback: null,
        pathLength: resolvedPathLength,
        direction: effectiveDirection,
        mode: animationStyle,
        dashCycle: pattern && pattern.cycle ? pattern.cycle : 24,
        speedMagnitude,
        loopRate,
        active: isActive
      };

      newEntry.tickerCallback = this._createFlowTicker(newEntry);
      if (newEntry.tickerCallback) {
        this._gsap.ticker.add(newEntry.tickerCallback);
      }

      this._setFlowGlow(element, strokeColor, glowState.value);
      if (useArrows && arrowGroup) {
        const arrowVisible = isActive && loopRate > 0;
        arrowGroup.style.opacity = arrowVisible ? '1' : '0';
        this._setFlowGlow(arrowGroup, strokeColor, glowState.value);
        if (!arrowVisible && newEntry.arrowShapes && newEntry.arrowShapes.length) {
          newEntry.arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
        }
      } else if (arrowGroup) {
        arrowGroup.style.opacity = '0';
      }

      this._updateFlowMotion(newEntry);

      const glowTween = this._gsap.to(glowState, {
        value: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        duration: 1,
        onUpdate: () => {
          this._setFlowGlow(newEntry.element, newEntry.color, glowState.value);
          if (useArrows && newEntry.arrowElement) {
            this._setFlowGlow(newEntry.arrowElement, newEntry.color, glowState.value);
          }
        }
      });
      newEntry.tween = glowTween;

      this._flowTweens.set(flowKey, newEntry);
      entry = newEntry;
    } else {
      entry.mode = animationStyle;
      entry.arrowShapes = useArrows && arrowShapes ? arrowShapes : [];
      entry.arrowElement = arrowGroup;
      entry.pathLength = resolvedPathLength;
      entry.dashCycle = pattern && pattern.cycle ? pattern.cycle : entry.dashCycle;
      entry.speedMagnitude = speedMagnitude;
      entry.loopRate = loopRate;
      entry.direction = effectiveDirection;
      entry.active = isActive;
      if (!entry.motionState) {
        entry.motionState = { phase: Math.random() };
      }
      if (!entry.directionState) {
        entry.directionState = { value: effectiveDirection };
      }
      if (!entry.tickerCallback) {
        entry.tickerCallback = this._createFlowTicker(entry);
        if (entry.tickerCallback) {
          this._gsap.ticker.add(entry.tickerCallback);
        }
      }
      if (entry.directionTween) {
        entry.directionTween.kill();
        entry.directionTween = null;
      }
      if (entry.directionState.value !== effectiveDirection) {
        entry.directionTween = this._gsap.to(entry.directionState, {
          value: effectiveDirection,
          duration: 0.4,
          ease: 'sine.inOut',
          onUpdate: () => this._updateFlowMotion(entry),
          onComplete: () => { entry.directionTween = null; }
        });
      }
      if (useArrows && arrowGroup) {
        const arrowVisible = isActive && loopRate > 0;
        arrowGroup.style.opacity = arrowVisible ? '1' : '0';
        if (!arrowVisible && entry.arrowShapes && entry.arrowShapes.length) {
          entry.arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
        }
      }
      this._updateFlowMotion(entry);
    }

    entry.color = strokeColor;

    if (!entry.directionState) {
      entry.directionState = { value: effectiveDirection };
    }

    if (!isActive) {
      entry.active = false;
      entry.speedMagnitude = 0;
      entry.loopRate = 0;
      this._setFlowGlow(element, strokeColor, 0.25);
      if (entry.directionTween) {
        entry.directionTween.kill();
        entry.directionTween = null;
      }
      entry.directionTween = this._gsap.to(entry.directionState, {
        value: 0,
        duration: 0.3,
        ease: 'sine.inOut',
        onUpdate: () => this._updateFlowMotion(entry),
        onComplete: () => { entry.directionTween = null; }
      });
      if (!useArrows) {
        element.style.strokeDashoffset = '0';
      }
      hideArrows();
      if (entry.tween) {
        entry.tween.pause();
      }
      return;
    }

    entry.active = true;
    entry.speedMagnitude = speedMagnitude;
    entry.loopRate = loopRate;
    if (useArrows) {
      if (loopRate === 0) {
        hideArrows();
      } else if (arrowGroup) {
        arrowGroup.style.opacity = '1';
      }
    }
    this._updateFlowMotion(entry);

    if (entry.tween) {
      if (speedMagnitude === 0 || loopRate === 0) {
        entry.tween.pause();
      } else {
        entry.tween.timeScale(Math.max(speedMagnitude, FLOW_MIN_GLOW_SCALE));
        entry.tween.play();
      }
    }
  }

  _setFlowGlow(element, color, intensity) {
    if (!element) {
      return;
    }
    const clamped = Math.min(Math.max(Number(intensity) || 0, 0), 1);
    const inner = this._colorWithAlpha(color, 0.35 + 0.45 * clamped);
    const outer = this._colorWithAlpha(color, 0.2 + 0.3 * clamped);
    element.style.filter = `drop-shadow(0 0 12px ${inner}) drop-shadow(0 0 18px ${outer})`;
  }

  _colorWithAlpha(color, alpha) {
    if (!color) {
      return `rgba(0, 255, 255, ${alpha})`;
    }
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const fullHex = hex.length === 3
        ? hex.split('').map((c) => c + c).join('')
        : hex.padEnd(6, '0');
      const r = parseInt(fullHex.slice(0, 2), 16);
      const g = parseInt(fullHex.slice(2, 4), 16);
      const b = parseInt(fullHex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const match = color.match(/rgba?\(([^)]+)\)/i);
    if (match) {
      const parts = match[1].split(',').map((part) => part.trim());
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  _computeFlowLoopRate(magnitude) {
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      return 0;
    }
    return magnitude * FLOW_BASE_LOOP_RATE;
  }

  _killFlowEntry(entry) {
    if (!entry) {
      return;
    }
    if (entry.tween) {
      entry.tween.kill();
    }
    if (entry.directionTween) {
      entry.directionTween.kill();
    }
    if (entry.tickerCallback && this._gsap && this._gsap.ticker) {
      this._gsap.ticker.remove(entry.tickerCallback);
    }
    if (entry.motionState) {
      entry.motionState.phase = 0;
    }
    if (entry.element && entry.mode && entry.mode !== 'arrows') {
      entry.element.style.strokeDashoffset = '0';
    }
    if (entry.arrowElement) {
      entry.arrowElement.style.opacity = '0';
      entry.arrowElement.removeAttribute('transform');
    }
    if (entry.arrowShapes && entry.arrowShapes.length) {
      entry.arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
    }
    entry.speedMagnitude = 0;
    entry.loopRate = 0;
  }

  _getFlowPathLength(flowKey) {
    if (this._flowPathLengths && this._flowPathLengths.has(flowKey)) {
      return this._flowPathLengths.get(flowKey);
    }
    const paths = this._domRefs && this._domRefs.flows ? this._domRefs.flows : null;
    const element = paths ? paths[flowKey] : null;
    if (!element || typeof element.getTotalLength !== 'function') {
      return 0;
    }
    const length = element.getTotalLength();
    if (!this._flowPathLengths) {
      this._flowPathLengths = new Map();
    }
    this._flowPathLengths.set(flowKey, length);
    return length;
  }

  _positionArrow(entry, progress, shape) {
    if (!entry || !shape || !entry.element || typeof entry.element.getPointAtLength !== 'function') {
      return;
    }
    const length = entry.pathLength || this._getFlowPathLength(entry.flowKey);
    if (!Number.isFinite(length) || length <= 0) {
      return;
    }
    const normalized = ((progress % 1) + 1) % 1;
    const distance = normalized * length;
    const point = entry.element.getPointAtLength(distance);
    const ahead = entry.element.getPointAtLength(Math.min(distance + 2, length));
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
    shape.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${angle})`);
  }

  _updateFlowMotion(entry) {
    if (!entry || !entry.element) {
      return;
    }
    const motionState = entry.motionState;
    if (!motionState) {
      return;
    }
    const phase = Number(motionState.phase) || 0;
    if (entry.mode === 'arrows' && entry.arrowShapes && entry.arrowShapes.length) {
      const count = entry.arrowShapes.length;
      const normalized = ((phase % 1) + 1) % 1;
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 1);
      const directionSign = directionValue >= 0 ? 1 : -1;
      entry.arrowShapes.forEach((shape, index) => {
        const offset = directionSign >= 0
          ? normalized + index / count
          : normalized - index / count;
        this._positionArrow(entry, offset, shape);
      });
    } else if (entry.mode !== 'arrows') {
      const cycle = entry.dashCycle || 24;
      const offset = -phase * cycle;
      entry.element.style.strokeDashoffset = `${offset}`;
    }
  }

  _createFlowTicker(entry) {
    if (!this._gsap || !this._gsap.ticker) {
      return null;
    }
    return (time, deltaTime) => {
      if (!entry || !entry.active) {
        return;
      }
      const loopRate = entry.loopRate || 0;
      if (loopRate === 0) {
        return;
      }
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 0);
      if (directionValue === 0) {
        return;
      }
      const delta = deltaTime * loopRate * directionValue;
      if (!Number.isFinite(delta) || delta === 0) {
        return;
      }
      if (!entry.motionState) {
        entry.motionState = { phase: 0 };
      }
      entry.motionState.phase = (Number(entry.motionState.phase) || 0) + delta;
      if (!Number.isFinite(entry.motionState.phase)) {
        entry.motionState.phase = 0;
      } else if (entry.motionState.phase > 1000 || entry.motionState.phase < -1000) {
        entry.motionState.phase = entry.motionState.phase % 1;
      }
      this._updateFlowMotion(entry);
    };
  }

  _teardownFlowAnimations() {
    if (!this._flowTweens) {
      return;
    }
    this._flowTweens.forEach((entry) => {
      this._killFlowEntry(entry);
    });
    this._flowTweens.clear();
  }

  _normalizeAnimationStyle(style) {
    const normalized = typeof style === 'string' ? style.trim().toLowerCase() : '';
    if (normalized && Object.prototype.hasOwnProperty.call(FLOW_STYLE_PATTERNS, normalized)) {
      return normalized;
    }
    return FLOW_STYLE_DEFAULT;
  }

  getStateSafe(entity_id) {
    if (!entity_id || !this._hass.states[entity_id] || 
        this._hass.states[entity_id].state === 'unavailable' || 
        this._hass.states[entity_id].state === 'unknown') {
      return 0;
    }
    
    let value = parseFloat(this._hass.states[entity_id].state);
    const unit = this._hass.states[entity_id].attributes.unit_of_measurement;
    
    if (unit && (unit.toLowerCase() === 'kw' || unit.toLowerCase() === 'kwh')) {
      value = value * 1000;
    }
    
    return value;
  }

  formatPower(watts, use_kw) {
    if (use_kw) {
      return (watts / 1000).toFixed(2) + ' kW';
    }
    return Math.round(watts) + ' W';
  }

  render() {
    if (!this._hass || !this.config) return;

    const config = this.config;
    this._lastRender = Date.now();
    
    // Get PV sensors
    const pvStringIds = [
      config.sensor_pv1, config.sensor_pv2, config.sensor_pv3,
      config.sensor_pv4, config.sensor_pv5, config.sensor_pv6
    ].filter((sensorId) => sensorId && sensorId !== '');

    const pvStringValues = pvStringIds.map((sensorId) => this.getStateSafe(sensorId));
    const pvTotalFromStrings = pvStringValues.reduce((acc, value) => acc + value, 0);
    const total_pv_w = config.sensor_pv_total
      ? this.getStateSafe(config.sensor_pv_total)
      : pvTotalFromStrings;
    const showPvStrings = Boolean(config.show_pv_strings);

    // Get battery configs
    const bat_configs = [
      { soc: config.sensor_bat1_soc, pow: config.sensor_bat1_power },
      { soc: config.sensor_bat2_soc, pow: config.sensor_bat2_power },
      { soc: config.sensor_bat3_soc, pow: config.sensor_bat3_power },
      { soc: config.sensor_bat4_soc, pow: config.sensor_bat4_power }
    ].filter(b => b.soc && b.soc !== '');

    // Calculate battery totals
    let total_bat_w = 0;
    let total_soc = 0;
    let active_bat_count = 0;
    
    bat_configs.forEach(b => {
      if (this._hass.states[b.soc] && this._hass.states[b.soc].state !== 'unavailable') {
        total_soc += this.getStateSafe(b.soc);
        total_bat_w += this.getStateSafe(b.pow);
        active_bat_count++;
      }
    });
    
    const avg_soc = active_bat_count > 0 ? Math.round(total_soc / active_bat_count) : 0;

    // Get other sensors
    const toNumber = (value) => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    let gridNet = 0;
    let gridImport = 0;
    let gridExport = 0;
    let gridDirection = 1;
    let gridMagnitude = 0;
    let gridActive = false;
    const hasCombinedGrid = Boolean(config.sensor_grid_power);

    const display_unit = config.display_unit || 'W';
    const use_kw = display_unit.toUpperCase() === 'KW';
    const gridActivityThreshold = (() => {
      const raw = config.grid_activity_threshold;
      if (raw === undefined || raw === null || raw === '') {
        return DEFAULT_GRID_ACTIVITY_THRESHOLD;
      }
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        return DEFAULT_GRID_ACTIVITY_THRESHOLD;
      }
      return Math.min(Math.max(num, 0), 100000);
    })();

    if (hasCombinedGrid) {
      const grid_raw = this.getStateSafe(config.sensor_grid_power);
      const gridAdjusted = config.invert_grid ? (grid_raw * -1) : grid_raw;
      const thresholdedNet = Math.abs(gridAdjusted) < gridActivityThreshold ? 0 : gridAdjusted;
      gridNet = thresholdedNet;
      gridMagnitude = Math.abs(gridNet);
      if (!Number.isFinite(gridMagnitude)) {
        gridMagnitude = 0;
      }
      gridDirection = gridNet > 0 ? 1 : (gridNet < 0 ? -1 : 1);
      gridActive = gridActivityThreshold === 0
        ? gridMagnitude > 0
        : gridMagnitude >= gridActivityThreshold;
    } else {
      if (config.sensor_grid_import) {
        gridImport = this.getStateSafe(config.sensor_grid_import);
        if (Math.abs(gridImport) < gridActivityThreshold) {
          gridImport = 0;
        }
      }
      if (config.sensor_grid_export) {
        gridExport = this.getStateSafe(config.sensor_grid_export);
        if (Math.abs(gridExport) < gridActivityThreshold) {
          gridExport = 0;
        }
      }
      gridNet = gridImport - gridExport;
      if (config.invert_grid) {
        gridNet *= -1;
        const temp = gridImport;
        gridImport = gridExport;
        gridExport = temp;
      }
      if (Math.abs(gridNet) < gridActivityThreshold) {
        gridNet = 0;
      }
      gridMagnitude = Math.abs(gridNet);
      if (!Number.isFinite(gridMagnitude)) {
        gridMagnitude = 0;
      }
      const preferredDirection = gridImport >= gridExport ? 1 : -1;
      gridDirection = gridNet > 0 ? 1 : (gridNet < 0 ? -1 : preferredDirection);
      gridActive = gridActivityThreshold === 0
        ? gridMagnitude > 0
        : gridMagnitude >= gridActivityThreshold;
    }

    const thresholdMultiplier = use_kw ? 1000 : 1;
    const gridWarningThresholdRaw = toNumber(config.grid_threshold_warning);
    const gridCriticalThresholdRaw = toNumber(config.grid_threshold_critical);
    const gridWarningThreshold = gridWarningThresholdRaw !== null ? gridWarningThresholdRaw * thresholdMultiplier : null;
    const gridCriticalThreshold = gridCriticalThresholdRaw !== null ? gridCriticalThresholdRaw * thresholdMultiplier : null;
    const gridWarningColor = typeof config.grid_warning_color === 'string' && config.grid_warning_color ? config.grid_warning_color : null;
    const gridCriticalColor = typeof config.grid_critical_color === 'string' && config.grid_critical_color ? config.grid_critical_color : null;
    const gridDirectionSign = gridDirection >= 0 ? 1 : -1;
    const load = this.getStateSafe(config.sensor_home_load);
    const daily_raw = this.getStateSafe(config.sensor_daily);
    const total_daily_kwh = (daily_raw / 1000).toFixed(1);

    // EV Car
    const car_w = config.sensor_car_power ? this.getStateSafe(config.sensor_car_power) : 0;
    const car_soc = config.sensor_car_soc ? this.getStateSafe(config.sensor_car_soc) : null;
    const showCarInfo = Boolean(config.show_car_soc);

    // Display settings
    const bg_img = config.background_image || '/local/community/lumina-energy-card/lumina_background.jpg';
    const title_text = config.card_title || 'LUMINA ENERGY';

    const clampValue = (value, min, max, fallback) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return fallback;
      }
      return Math.min(Math.max(num, min), max);
    };

    const header_font_size = clampValue(config.header_font_size, 12, 32, 16);
    const daily_label_font_size = clampValue(config.daily_label_font_size, 8, 24, 12);
    const daily_value_font_size = clampValue(config.daily_value_font_size, 12, 32, 20);
    const pv_font_size = clampValue(config.pv_font_size, 12, 28, 16);
    const battery_soc_font_size = clampValue(config.battery_soc_font_size, 12, 32, 20);
    const battery_power_font_size = clampValue(config.battery_power_font_size, 10, 28, 14);
    const load_font_size = clampValue(config.load_font_size, 10, 28, 15);
    const grid_font_size = clampValue(config.grid_font_size, 10, 28, 15);
    const car_power_font_size = clampValue(config.car_power_font_size, 10, 28, 15);
    const car_soc_font_size = clampValue(config.car_soc_font_size, 8, 24, 12);
    const animation_speed_factor = clampValue(config.animation_speed_factor, -3, 3, 1);
    this._animationSpeedFactor = animation_speed_factor;
    const animation_style = this._normalizeAnimationStyle(config.animation_style);
    this._animationStyle = animation_style;

    // Language
    const lang = config.language || 'en';
    const dict_daily = { it: 'PRODUZIONE OGGI', en: 'DAILY YIELD', de: 'TAGESERTRAG' };
    const dict_pv_tot = { it: 'PV TOT', en: 'PV TOT', de: 'PV GES' };
    const label_daily = dict_daily[lang] || dict_daily['en'];
    const label_pv_tot = dict_pv_tot[lang] || dict_pv_tot['en'];

    // 3D coordinates
    const current_h = (avg_soc / 100) * BATTERY_GEOMETRY.MAX_HEIGHT;

    const C_CYAN = '#00FFFF';
    const C_BLUE = '#0088FF';
    const C_WHITE = '#FFFFFF';
    const C_RED = '#FF3333';
    const bat_col = (total_bat_w >= 0) ? C_CYAN : C_WHITE;
    const batteryDirectionSign = total_bat_w >= 0 ? 1 : -1;
    const base_grid_color = gridDirectionSign >= 0 ? C_RED : C_CYAN;
    const effectiveGridColor = (() => {
      const magnitude = gridMagnitude;
      if (gridCriticalColor && gridCriticalThreshold !== null && magnitude >= gridCriticalThreshold) {
        return gridCriticalColor;
      }
      if (gridWarningColor && gridWarningThreshold !== null && magnitude >= gridWarningThreshold) {
        return gridWarningColor;
      }
      return base_grid_color;
    })();
    const gridAnimationDirection = -gridDirectionSign;
    const liquid_fill = (avg_soc < 25) ? 'rgba(255, 50, 50, 0.85)' : 'rgba(0, 255, 255, 0.85)';
    const show_double_flow = (pvStringValues.length >= 2 && total_pv_w > 10);
    const pvLinesRaw = [];
    if (showPvStrings) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`, fill: C_CYAN });
      pvStringValues.forEach((value, index) => {
        pvLinesRaw.push({ key: `pv-string-${index + 1}`, text: `S${index + 1}: ${this.formatPower(value, use_kw)}`, fill: C_BLUE });
      });
    } else if (pvStringValues.length === 2) {
      pvLinesRaw.push({ key: 'pv-string-1', text: `S1: ${this.formatPower(pvStringValues[0], use_kw)}`, fill: C_CYAN });
      pvLinesRaw.push({ key: 'pv-string-2', text: `S2: ${this.formatPower(pvStringValues[1], use_kw)}`, fill: C_BLUE });
    } else if (pvStringValues.length > 2) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`, fill: C_CYAN });
    } else {
      pvLinesRaw.push({ key: 'pv-total', text: this.formatPower(total_pv_w, use_kw), fill: C_CYAN });
    }

    const lineCount = Math.min(pvLinesRaw.length, MAX_PV_LINES);
    const baseY = TEXT_POSITIONS.solar.y - ((lineCount > 0 ? lineCount - 1 : 0) * PV_LINE_SPACING) / 2;
    const pvLines = Array.from({ length: MAX_PV_LINES }, (_, index) => {
      if (index < lineCount) {
        const line = pvLinesRaw[index];
        return { ...line, y: baseY + index * PV_LINE_SPACING, visible: true };
      }
      return {
        key: `pv-placeholder-${index}`,
        text: '',
        fill: C_CYAN,
        y: baseY + index * PV_LINE_SPACING,
        visible: false
      };
    });

    const flows = {
      pv1: { stroke: C_CYAN, glowColor: C_CYAN, active: total_pv_w > 10 },
      pv2: { stroke: C_BLUE, glowColor: C_BLUE, active: show_double_flow },
      bat: { stroke: bat_col, glowColor: bat_col, active: Math.abs(total_bat_w) > 10, direction: batteryDirectionSign },
      load: { stroke: C_CYAN, glowColor: C_CYAN, active: load > 10, direction: 1 },
      grid: { stroke: effectiveGridColor, glowColor: effectiveGridColor, active: gridActive, direction: gridAnimationDirection },
      car: { stroke: C_CYAN, glowColor: C_CYAN, active: Math.abs(car_w) > 10, direction: 1 }
    };

    flows.pv1.direction = 1;
    flows.pv2.direction = 1;

    const flowDurations = Object.fromEntries(
      Object.entries(flows).map(([key, state]) => [key, state.active ? 1 : 0])
    );

    const viewState = {
      backgroundImage: bg_img,
      animationStyle: animation_style,
      title: { text: title_text, fontSize: header_font_size },
      daily: { label: label_daily, value: `${total_daily_kwh} kWh`, labelSize: daily_label_font_size, valueSize: daily_value_font_size },
      pv: { fontSize: pv_font_size, lines: pvLines },
      battery: { levelOffset: BATTERY_GEOMETRY.MAX_HEIGHT - current_h, fill: liquid_fill },
      batterySoc: { text: `${Math.floor(avg_soc)}%`, fontSize: battery_soc_font_size, fill: C_WHITE },
      batteryPower: { text: this.formatPower(Math.abs(total_bat_w), use_kw), fontSize: battery_power_font_size, fill: bat_col },
      load: { text: this.formatPower(load, use_kw), fontSize: load_font_size, fill: C_WHITE },
      grid: { text: this.formatPower(Math.abs(gridNet), use_kw), fontSize: grid_font_size, fill: effectiveGridColor },
      carPower: {
        text: showCarInfo ? this.formatPower(car_w, use_kw) : '',
        fontSize: car_power_font_size,
        fill: C_WHITE,
        visible: showCarInfo
      },
      carSoc: {
        visible: Boolean(showCarInfo && car_soc !== null),
        text: (showCarInfo && car_soc !== null) ? `${Math.round(car_soc)}%` : '',
        fontSize: car_soc_font_size,
        fill: config.car_pct_color || '#00FFFF'
      },
      flows,
      flowDurations
    };

    this._ensureTemplate(viewState);
    if (!this._domRefs) {
      this._cacheDomReferences();
    }
    this._updateView(viewState);
    this._applyFlowAnimationTargets(viewState.flowDurations, viewState.flows);
    this._prevViewState = this._snapshotViewState(viewState);
    this._forceRender = false;
  }

  _ensureTemplate(viewState) {
    if (this._rootInitialized) {
      return;
    }
    this.shadowRoot.innerHTML = this._buildTemplate(viewState);
    this._rootInitialized = true;
    this._cacheDomReferences();
  }

  _buildTemplate(viewState) {
    const batX = BATTERY_GEOMETRY.X;
    const batteryPath = `M ${batX - 20} 5 Q ${batX} 0 ${batX + 20} 5 T ${batX + 60} 5 T ${batX + 100} 5 T ${batX + 140} 5 V 150 H ${batX - 20} Z`;
    const carSocDisplay = viewState.carSoc.visible ? 'inline' : 'none';
    const pvLineElements = viewState.pv.lines.map((line, index) => {
      const display = line.visible ? 'inline' : 'none';
      return `<text data-role="pv-line-${index}" x="${TEXT_POSITIONS.solar.x}" y="${line.y}" transform="${TEXT_TRANSFORMS.solar}" fill="${line.fill}" font-size="${viewState.pv.fontSize}" style="${TXT_STYLE}; display:${display};">${line.text}</text>`;
    }).join('');

    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        :host { display: block; aspect-ratio: 16/9; }
        ha-card { height: 100%; overflow: hidden; background: transparent; border: none; box-shadow: none; }
        .track-path { stroke: #555555; stroke-width: 2px; fill: none; opacity: 0; }
        .flow-path { stroke-linecap: round; stroke-width: 3px; fill: none; opacity: 0; transition: opacity 0.35s ease; filter: none; }
        .flow-arrow { pointer-events: none; opacity: 0; transition: opacity 0.35s ease; }
        @keyframes pulse-cyan { 0% { filter: drop-shadow(0 0 2px #00FFFF); opacity: 0.9; } 50% { filter: drop-shadow(0 0 10px #00FFFF); opacity: 1; } 100% { filter: drop-shadow(0 0 2px #00FFFF); opacity: 0.9; } }
        .alive-box { animation: pulse-cyan 3s infinite ease-in-out; stroke: #00FFFF; stroke-width: 2px; fill: rgba(0, 20, 40, 0.7); }
        .alive-text { animation: pulse-cyan 3s infinite ease-in-out; fill: #00FFFF; text-shadow: 0 0 5px #00FFFF; }
        @keyframes wave-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-80px); } }
        .liquid-shape { animation: wave-slide 2s linear infinite; }
        .title-text { fill: #00FFFF; font-weight: 900; font-family: 'Orbitron', sans-serif; text-anchor: middle; letter-spacing: 3px; text-transform: uppercase; }
      </style>
      <ha-card>
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 100%; height: 100%;">
          <defs>
            <clipPath id="battery-clip"><rect x="${BATTERY_GEOMETRY.X}" y="${BATTERY_GEOMETRY.Y_BASE - BATTERY_GEOMETRY.MAX_HEIGHT}" width="${BATTERY_GEOMETRY.WIDTH}" height="${BATTERY_GEOMETRY.MAX_HEIGHT}" rx="2" /></clipPath>
          </defs>

          <image data-role="background-image" href="${viewState.backgroundImage}" xlink:href="${viewState.backgroundImage}" x="0" y="0" width="800" height="450" preserveAspectRatio="none" />

          <rect x="290" y="10" width="220" height="32" rx="6" ry="6" fill="rgba(0, 20, 40, 0.85)" stroke="#00FFFF" stroke-width="1.5"/>
          <text data-role="title-text" x="400" y="32" class="title-text" font-size="${viewState.title.fontSize}">${viewState.title.text}</text>

          <g transform="translate(600, 370)">
            <rect x="0" y="0" width="180" height="60" rx="10" ry="10" class="alive-box" />
            <text data-role="daily-label" x="90" y="23" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.labelSize}px; font-weight:normal; letter-spacing: 1px;">${viewState.daily.label}</text>
            <text data-role="daily-value" x="90" y="50" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.valueSize}px; font-weight:bold;">${viewState.daily.value}</text>
          </g>

          <g transform="${BATTERY_TRANSFORM}">
            <g clip-path="url(#battery-clip)">
              <g data-role="battery-liquid-group" style="transition: transform 1s ease-in-out;" transform="translate(0, ${viewState.battery.levelOffset})">
                <g transform="translate(0, ${BATTERY_OFFSET_BASE})">
                  <path data-role="battery-liquid-shape" class="liquid-shape" fill="${viewState.battery.fill}" d="${batteryPath}" />
                </g>
              </g>
            </g>
          </g>

          <path class="track-path" d="${FLOW_PATHS.pv1}" />
          <path class="flow-path" data-flow-key="pv1" d="${FLOW_PATHS.pv1}" stroke="${viewState.flows.pv1.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('pv1', viewState.flows.pv1)}
          <path class="track-path" d="${FLOW_PATHS.pv2}" />
          <path class="flow-path" data-flow-key="pv2" d="${FLOW_PATHS.pv2}" stroke="${viewState.flows.pv2.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('pv2', viewState.flows.pv2)}
          <path class="track-path" d="${FLOW_PATHS.bat}" />
          <path class="flow-path" data-flow-key="bat" d="${FLOW_PATHS.bat}" stroke="${viewState.flows.bat.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('bat', viewState.flows.bat)}
          <path class="track-path" d="${FLOW_PATHS.load}" />
          <path class="flow-path" data-flow-key="load" d="${FLOW_PATHS.load}" stroke="${viewState.flows.load.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('load', viewState.flows.load)}
          <path class="track-path" d="${FLOW_PATHS.grid}" />
          <path class="flow-path" data-flow-key="grid" d="${FLOW_PATHS.grid}" stroke="${viewState.flows.grid.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('grid', viewState.flows.grid)}
          <path class="track-path" d="${FLOW_PATHS.car}" />
          <path class="flow-path" data-flow-key="car" d="${FLOW_PATHS.car}" stroke="${viewState.flows.car.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('car', viewState.flows.car)}

          ${pvLineElements}

          <text data-role="battery-soc" x="${TEXT_POSITIONS.battery.x}" y="${TEXT_POSITIONS.battery.y}" transform="${TEXT_TRANSFORMS.battery}" fill="${viewState.batterySoc.fill}" font-size="${viewState.batterySoc.fontSize}" style="${TXT_STYLE}">${viewState.batterySoc.text}</text>
          <text data-role="battery-power" x="${TEXT_POSITIONS.battery.x}" y="${TEXT_POSITIONS.battery.y + 20}" transform="${TEXT_TRANSFORMS.battery}" fill="${viewState.batteryPower.fill}" font-size="${viewState.batteryPower.fontSize}" style="${TXT_STYLE}">${viewState.batteryPower.text}</text>

          <text data-role="load-power" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}">${viewState.load.text}</text>
          <text data-role="grid-power" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}">${viewState.grid.text}</text>

          <text data-role="car-power" x="${TEXT_POSITIONS.car.x}" y="${TEXT_POSITIONS.car.y}" transform="${TEXT_TRANSFORMS.car}" fill="${viewState.carPower.fill}" font-size="${viewState.carPower.fontSize}" style="${TXT_STYLE}">${viewState.carPower.text}</text>
          <text data-role="car-soc" x="${TEXT_POSITIONS.car.x}" y="${TEXT_POSITIONS.car.y + 15}" transform="${TEXT_TRANSFORMS.car}" fill="${viewState.carSoc.fill}" font-size="${viewState.carSoc.fontSize}" style="${TXT_STYLE}; display:${carSocDisplay};">${viewState.carSoc.text}</text>
        </svg>
      </ha-card>
    `;
  }

  _cacheDomReferences() {
    if (!this.shadowRoot) {
      return;
    }
    const root = this.shadowRoot;
    if (this._flowPathLengths) {
      this._flowPathLengths.clear();
    }
    this._domRefs = {
      background: root.querySelector('[data-role="background-image"]'),
      title: root.querySelector('[data-role="title-text"]'),
      dailyLabel: root.querySelector('[data-role="daily-label"]'),
      dailyValue: root.querySelector('[data-role="daily-value"]'),
      batteryLiquidGroup: root.querySelector('[data-role="battery-liquid-group"]'),
      batteryLiquidShape: root.querySelector('[data-role="battery-liquid-shape"]'),
      pvLines: Array.from({ length: MAX_PV_LINES }, (_, index) => root.querySelector(`[data-role="pv-line-${index}"]`)),
      batterySoc: root.querySelector('[data-role="battery-soc"]'),
      batteryPower: root.querySelector('[data-role="battery-power"]'),
      loadText: root.querySelector('[data-role="load-power"]'),
      gridText: root.querySelector('[data-role="grid-power"]'),
      carPower: root.querySelector('[data-role="car-power"]'),
      carSoc: root.querySelector('[data-role="car-soc"]'),
      flows: {
        pv1: root.querySelector('[data-flow-key="pv1"]'),
        pv2: root.querySelector('[data-flow-key="pv2"]'),
        bat: root.querySelector('[data-flow-key="bat"]'),
        load: root.querySelector('[data-flow-key="load"]'),
        grid: root.querySelector('[data-flow-key="grid"]'),
        car: root.querySelector('[data-flow-key="car"]')
      },
      arrows: {
        pv1: root.querySelector('[data-arrow-key="pv1"]'),
        pv2: root.querySelector('[data-arrow-key="pv2"]'),
        bat: root.querySelector('[data-arrow-key="bat"]'),
        load: root.querySelector('[data-arrow-key="load"]'),
        grid: root.querySelector('[data-arrow-key="grid"]'),
        car: root.querySelector('[data-arrow-key="car"]')
      },
      arrowShapes: {
        pv1: Array.from(root.querySelectorAll('[data-arrow-shape="pv1"]')),
        pv2: Array.from(root.querySelectorAll('[data-arrow-shape="pv2"]')),
        bat: Array.from(root.querySelectorAll('[data-arrow-shape="bat"]')),
        load: Array.from(root.querySelectorAll('[data-arrow-shape="load"]')),
        grid: Array.from(root.querySelectorAll('[data-arrow-shape="grid"]')),
        car: Array.from(root.querySelectorAll('[data-arrow-shape="car"]'))
      }
    };

    if (this._domRefs && this._domRefs.flows) {
      Object.entries(this._domRefs.flows).forEach(([key, path]) => {
        if (path && typeof path.getTotalLength === 'function') {
          try {
            this._flowPathLengths.set(key, path.getTotalLength());
          } catch (err) {
            console.warn('Lumina Energy Card: unable to compute path length', key, err);
          }
        }
      });
    }
  }

  _updateView(viewState) {
    if (!this._domRefs) {
      this._cacheDomReferences();
    }
    const refs = this._domRefs;
    if (!refs) {
      return;
    }

    const prev = this._prevViewState || {};
    const animationStyle = viewState.animationStyle || FLOW_STYLE_DEFAULT;
    const useArrowsGlobally = animationStyle === 'arrows';
    const styleChanged = prev.animationStyle !== viewState.animationStyle;

    if (refs.background && prev.backgroundImage !== viewState.backgroundImage) {
      refs.background.setAttribute('href', viewState.backgroundImage);
      refs.background.setAttribute('xlink:href', viewState.backgroundImage);
    }

    if (refs.title) {
      if (!prev.title || prev.title.text !== viewState.title.text) {
        refs.title.textContent = viewState.title.text;
      }
      if (!prev.title || prev.title.fontSize !== viewState.title.fontSize) {
        refs.title.setAttribute('font-size', viewState.title.fontSize);
      }
    }

    if (refs.dailyLabel) {
      if (!prev.daily || prev.daily.label !== viewState.daily.label) {
        refs.dailyLabel.textContent = viewState.daily.label;
      }
      const desired = `${viewState.daily.labelSize}px`;
      if (refs.dailyLabel.style.fontSize !== desired) {
        refs.dailyLabel.style.fontSize = desired;
      }
    }

    if (refs.dailyValue) {
      if (!prev.daily || prev.daily.value !== viewState.daily.value) {
        refs.dailyValue.textContent = viewState.daily.value;
      }
      const desired = `${viewState.daily.valueSize}px`;
      if (refs.dailyValue.style.fontSize !== desired) {
        refs.dailyValue.style.fontSize = desired;
      }
    }

    if (refs.batteryLiquidGroup) {
      const transform = `translate(0, ${viewState.battery.levelOffset})`;
      if (refs.batteryLiquidGroup.getAttribute('transform') !== transform) {
        refs.batteryLiquidGroup.setAttribute('transform', transform);
      }
    }

    if (refs.batteryLiquidShape && (!prev.battery || prev.battery.fill !== viewState.battery.fill)) {
      refs.batteryLiquidShape.setAttribute('fill', viewState.battery.fill);
    }

    if (refs.pvLines && refs.pvLines.length) {
      viewState.pv.lines.forEach((line, index) => {
        const node = refs.pvLines[index];
        if (!node) {
          return;
        }
        const prevLine = prev.pv && prev.pv.lines ? prev.pv.lines[index] : undefined;
        if (!prevLine || prevLine.text !== line.text) {
          node.textContent = line.text;
        }
        if (!prevLine || prevLine.fill !== line.fill) {
          node.setAttribute('fill', line.fill);
        }
        if (!prev.pv || prev.pv.fontSize !== viewState.pv.fontSize) {
          node.setAttribute('font-size', viewState.pv.fontSize);
        }
        if (!prevLine || prevLine.y !== line.y) {
          node.setAttribute('y', line.y);
        }
        const display = line.visible ? 'inline' : 'none';
        if (node.style.display !== display) {
          node.style.display = display;
        }
      });
    }

    if (refs.batterySoc) {
      if (!prev.batterySoc || prev.batterySoc.text !== viewState.batterySoc.text) {
        refs.batterySoc.textContent = viewState.batterySoc.text;
      }
      if (!prev.batterySoc || prev.batterySoc.fill !== viewState.batterySoc.fill) {
        refs.batterySoc.setAttribute('fill', viewState.batterySoc.fill);
      }
      if (!prev.batterySoc || prev.batterySoc.fontSize !== viewState.batterySoc.fontSize) {
        refs.batterySoc.setAttribute('font-size', viewState.batterySoc.fontSize);
      }
    }

    if (refs.batteryPower) {
      if (!prev.batteryPower || prev.batteryPower.text !== viewState.batteryPower.text) {
        refs.batteryPower.textContent = viewState.batteryPower.text;
      }
      if (!prev.batteryPower || prev.batteryPower.fill !== viewState.batteryPower.fill) {
        refs.batteryPower.setAttribute('fill', viewState.batteryPower.fill);
      }
      if (!prev.batteryPower || prev.batteryPower.fontSize !== viewState.batteryPower.fontSize) {
        refs.batteryPower.setAttribute('font-size', viewState.batteryPower.fontSize);
      }
    }

    if (refs.loadText) {
      if (!prev.load || prev.load.text !== viewState.load.text) {
        refs.loadText.textContent = viewState.load.text;
      }
      if (!prev.load || prev.load.fill !== viewState.load.fill) {
        refs.loadText.setAttribute('fill', viewState.load.fill);
      }
      if (!prev.load || prev.load.fontSize !== viewState.load.fontSize) {
        refs.loadText.setAttribute('font-size', viewState.load.fontSize);
      }
    }

    if (refs.gridText) {
      if (!prev.grid || prev.grid.text !== viewState.grid.text) {
        refs.gridText.textContent = viewState.grid.text;
      }
      if (!prev.grid || prev.grid.fill !== viewState.grid.fill) {
        refs.gridText.setAttribute('fill', viewState.grid.fill);
      }
      if (!prev.grid || prev.grid.fontSize !== viewState.grid.fontSize) {
        refs.gridText.setAttribute('font-size', viewState.grid.fontSize);
      }
    }

    if (refs.carPower) {
      const powerDisplay = viewState.carPower.visible ? 'inline' : 'none';
      if (refs.carPower.style.display !== powerDisplay) {
        refs.carPower.style.display = powerDisplay;
      }
      if (viewState.carPower.visible) {
        if (!prev.carPower || prev.carPower.text !== viewState.carPower.text) {
          refs.carPower.textContent = viewState.carPower.text;
        }
        if (!prev.carPower || prev.carPower.fill !== viewState.carPower.fill) {
          refs.carPower.setAttribute('fill', viewState.carPower.fill);
        }
        if (!prev.carPower || prev.carPower.fontSize !== viewState.carPower.fontSize) {
          refs.carPower.setAttribute('font-size', viewState.carPower.fontSize);
        }
      }
    }

    if (refs.carSoc) {
      const display = viewState.carSoc.visible ? 'inline' : 'none';
      if (refs.carSoc.style.display !== display) {
        refs.carSoc.style.display = display;
      }
      if (viewState.carSoc.visible) {
        if (!prev.carSoc || prev.carSoc.text !== viewState.carSoc.text) {
          refs.carSoc.textContent = viewState.carSoc.text;
        }
        if (!prev.carSoc || prev.carSoc.fill !== viewState.carSoc.fill) {
          refs.carSoc.setAttribute('fill', viewState.carSoc.fill);
        }
        if (!prev.carSoc || prev.carSoc.fontSize !== viewState.carSoc.fontSize) {
          refs.carSoc.setAttribute('font-size', viewState.carSoc.fontSize);
        }
      }
    }

    const prevFlows = prev.flows || {};
    Object.entries(viewState.flows).forEach(([key, flowState]) => {
      const element = refs.flows ? refs.flows[key] : null;
      const arrowGroup = useArrowsGlobally && refs.arrows ? refs.arrows[key] : null;
      const arrowShapes = useArrowsGlobally && refs.arrowShapes ? refs.arrowShapes[key] : null;
      if (!element) {
        return;
      }
      const prevFlow = prevFlows[key] || {};
      if (prevFlow.stroke !== flowState.stroke) {
        element.setAttribute('stroke', flowState.stroke);
      }
      if (useArrowsGlobally && arrowShapes && arrowShapes.length && (prevFlow.stroke !== flowState.stroke || prevFlow.glowColor !== flowState.glowColor)) {
        arrowShapes.forEach((shape) => {
          shape.setAttribute('fill', flowState.glowColor || flowState.stroke);
        });
      }
      const pathOpacity = flowState.active ? '1' : '0';
      if (element.style.opacity !== pathOpacity) {
        element.style.opacity = pathOpacity;
      }
      if (!this._flowTweens.get(key)) {
        this._setFlowGlow(element, flowState.glowColor || flowState.stroke, flowState.active ? 0.8 : 0.25);
        if (useArrowsGlobally && arrowGroup) {
          const arrowOpacity = flowState.active ? '1' : '0';
          if (arrowGroup.style.opacity !== arrowOpacity) {
            arrowGroup.style.opacity = arrowOpacity;
          }
          if (!flowState.active && arrowShapes && arrowShapes.length) {
            arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
          }
        }
      } else if (useArrowsGlobally && arrowGroup) {
        const arrowOpacity = flowState.active ? '1' : '0';
        if (arrowGroup.style.opacity !== arrowOpacity) {
          arrowGroup.style.opacity = arrowOpacity;
        }
        if (!flowState.active && arrowShapes && arrowShapes.length) {
          arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
        }
      }

      if (!useArrowsGlobally && refs.arrows && refs.arrows[key] && (styleChanged || refs.arrows[key].style.opacity !== '0')) {
        refs.arrows[key].style.opacity = '0';
        if (refs.arrowShapes && refs.arrowShapes[key]) {
          refs.arrowShapes[key].forEach((shape) => shape.removeAttribute('transform'));
        }
      }
    });
  }

  _snapshotViewState(viewState) {
    return {
      backgroundImage: viewState.backgroundImage,
      animationStyle: viewState.animationStyle,
      title: { ...viewState.title },
      daily: { ...viewState.daily },
      pv: {
        fontSize: viewState.pv.fontSize,
        lines: viewState.pv.lines.map((line) => ({ ...line }))
      },
      battery: { ...viewState.battery },
      batterySoc: { ...viewState.batterySoc },
      batteryPower: { ...viewState.batteryPower },
      load: { ...viewState.load },
      grid: { ...viewState.grid },
      carPower: { ...viewState.carPower },
      carSoc: { ...viewState.carSoc },
      flows: Object.fromEntries(Object.entries(viewState.flows).map(([key, value]) => [key, { ...value }]))
    };
  }

  static get version() {
    return '1.1.24';
  }
}

if (!customElements.get('lumina-energy-card')) {
  customElements.define('lumina-energy-card', LuminaEnergyCard);
}

class LuminaEnergyCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._defaults = (typeof LuminaEnergyCard !== 'undefined' && typeof LuminaEnergyCard.getStubConfig === 'function')
      ? { ...LuminaEnergyCard.getStubConfig() }
      : {};
    this._strings = this._buildStrings();
    this._sectionOpenState = {};
    if (window.loadCardHelpers) {
      window.loadCardHelpers();
    }
  }

  _buildStrings() {
    return {
      en: {
        sections: {
          general: { title: 'General Settings', helper: 'Card metadata, background, language, and update cadence.' },
          entities: { title: 'Entity Selection', helper: 'Choose the PV, battery, grid, load, and EV entities used by the card.' },
          colors: { title: 'Color & Thresholds', helper: 'Configure grid thresholds and accent colours for flows and EV display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Card Title', helper: 'Title displayed at the top of the card.' },
          background_image: { label: 'Background Image Path', helper: 'Path to the background image (e.g., /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Language', helper: 'Choose the editor language.' },
          display_unit: { label: 'Display Unit', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Update Interval', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          animation_speed_factor: { label: 'Animation Speed Factor', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Animation Style', helper: 'Choose the flow animation motif (dashes, dots, or arrows).' },
          sensor_pv_total: { label: 'PV Total Sensor', helper: 'Optional aggregate production sensor displayed as the combined line.' },
          sensor_pv1: { label: 'PV Sensor 1 (Required)', helper: 'Primary solar production sensor.' },
          sensor_pv2: { label: 'PV Sensor 2' },
          sensor_pv3: { label: 'PV Sensor 3' },
          sensor_pv4: { label: 'PV Sensor 4' },
          sensor_pv5: { label: 'PV Sensor 5' },
          sensor_pv6: { label: 'PV Sensor 6' },
          show_pv_strings: { label: 'Show Individual PV Strings', helper: 'Toggle to display the total plus each PV string on separate lines.' },
          sensor_daily: { label: 'Daily Production Sensor', helper: 'Sensor reporting daily production totals.' },
          sensor_bat1_soc: { label: 'Battery 1 SOC' },
          sensor_bat1_power: { label: 'Battery 1 Power' },
          sensor_bat2_soc: { label: 'Battery 2 SOC' },
          sensor_bat2_power: { label: 'Battery 2 Power' },
          sensor_bat3_soc: { label: 'Battery 3 SOC' },
          sensor_bat3_power: { label: 'Battery 3 Power' },
          sensor_bat4_soc: { label: 'Battery 4 SOC' },
          sensor_bat4_power: { label: 'Battery 4 Power' },
          sensor_home_load: { label: 'Home Load/Consumption', helper: 'Total household consumption sensor.' },
          sensor_grid_power: { label: 'Grid Power', helper: 'Positive/negative grid flow sensor.' },
          sensor_grid_import: { label: 'Grid Import Sensor', helper: 'Optional entity reporting grid import (positive) power.' },
          sensor_grid_export: { label: 'Grid Export Sensor', helper: 'Optional entity reporting grid export (positive) power.' },
          grid_activity_threshold: { label: 'Grid Animation Threshold (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_threshold_warning: { label: 'Grid Warning Threshold', helper: 'Change grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Grid Warning Color', helper: 'Hex or CSS color applied at the warning threshold.' },
          grid_threshold_critical: { label: 'Grid Critical Threshold', helper: 'Change grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Grid Critical Color', helper: 'Hex or CSS color applied at the critical threshold.' },
          invert_grid: { label: 'Invert Grid Values', helper: 'Enable if import/export polarity is reversed.' },
          sensor_car_power: { label: 'Car Power Sensor' },
          sensor_car_soc: { label: 'Car SOC Sensor' },
          show_car_soc: { label: 'Show Electric Vehicle' },
          car_pct_color: { label: 'Car SOC Color', helper: 'Hex color for EV SOC text (e.g., #00FFFF).' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Default 16' },
          daily_label_font_size: { label: 'Daily Label Font Size (px)', helper: 'Default 12' },
          daily_value_font_size: { label: 'Daily Value Font Size (px)', helper: 'Default 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Default 16' },
          battery_soc_font_size: { label: 'Battery SOC Font Size (px)', helper: 'Default 20' },
          battery_power_font_size: { label: 'Battery Power Font Size (px)', helper: 'Default 14' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Default 15' },
          grid_font_size: { label: 'Grid Font Size (px)', helper: 'Default 15' },
          car_power_font_size: { label: 'Car Power Font Size (px)', helper: 'Default 15' },
          car_soc_font_size: { label: 'Car SOC Font Size (px)', helper: 'Default 12' }
        },
        options: {
          languages: [
            { value: 'en', label: 'English' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Deutsch' }
          ],
          display_units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Dashes (default)' },
            { value: 'dots', label: 'Dots' },
            { value: 'arrows', label: 'Arrows' }
          ]
        }
      },
      it: {
        sections: {
          general: { title: 'Impostazioni generali', helper: 'Titolo scheda, sfondo, lingua e frequenza di aggiornamento.' },
          entities: { title: 'Selezione entita', helper: 'Scegli le entita PV, batteria, rete, carico ed EV utilizzate dalla scheda.' },
          colors: { title: 'Colori e soglie', helper: 'Configura soglie della rete e colori di accento per i flussi.' },
          typography: { title: 'Tipografia', helper: 'Regola le dimensioni dei caratteri utilizzate nella scheda.' },
          about: { title: 'Informazioni', helper: 'Crediti, versione e link utili.' }
        },
        fields: {
          card_title: { label: 'Titolo scheda', helper: 'Titolo mostrato nella parte superiore della scheda.' },
          background_image: { label: 'Percorso immagine di sfondo', helper: 'Percorso dell immagine di sfondo (es. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Lingua', helper: 'Seleziona la lingua dell editor.' },
          display_unit: { label: 'Unita di visualizzazione', helper: 'Unita usata per i valori di potenza.' },
          update_interval: { label: 'Intervallo di aggiornamento', helper: 'Frequenza di aggiornamento della scheda (0 disattiva il limite).' },
          animation_speed_factor: { label: 'Fattore velocita animazioni', helper: 'Regola il moltiplicatore (-3x a 3x). Usa 0 per mettere in pausa; valori negativi invertono il flusso.' },
          animation_style: { label: 'Stile animazione', helper: 'Scegli il motivo dei flussi (tratteggi, punti o frecce).' },
          sensor_pv_total: { label: 'Sensore PV totale', helper: 'Sensore aggregato opzionale mostrato come linea combinata.' },
          sensor_pv1: { label: 'Sensore PV 1 (obbligatorio)', helper: 'Sensore principale di produzione solare.' },
          sensor_pv2: { label: 'Sensore PV 2' },
          sensor_pv3: { label: 'Sensore PV 3' },
          sensor_pv4: { label: 'Sensore PV 4' },
          sensor_pv5: { label: 'Sensore PV 5' },
          sensor_pv6: { label: 'Sensore PV 6' },
          show_pv_strings: { label: 'Mostra stringhe PV', helper: 'Attiva per mostrare la linea totale piu ogni stringa PV separata.' },
          sensor_daily: { label: 'Sensore produzione giornaliera', helper: 'Sensore che riporta la produzione giornaliera.' },
          sensor_bat1_soc: { label: 'Batteria 1 SOC' },
          sensor_bat1_power: { label: 'Batteria 1 potenza' },
          sensor_bat2_soc: { label: 'Batteria 2 SOC' },
          sensor_bat2_power: { label: 'Batteria 2 potenza' },
          sensor_bat3_soc: { label: 'Batteria 3 SOC' },
          sensor_bat3_power: { label: 'Batteria 3 potenza' },
          sensor_bat4_soc: { label: 'Batteria 4 SOC' },
          sensor_bat4_power: { label: 'Batteria 4 potenza' },
          sensor_home_load: { label: 'Carico casa/consumo', helper: 'Sensore del consumo totale dell abitazione.' },
          sensor_grid_power: { label: 'Potenza rete', helper: 'Sensore flusso rete positivo/negativo.' },
          sensor_grid_import: { label: 'Sensore import rete', helper: 'Entita opzionale che riporta la potenza di import.' },
          sensor_grid_export: { label: 'Sensore export rete', helper: 'Entita opzionale che riporta la potenza di export.' },
          grid_activity_threshold: { label: 'Soglia animazione rete (W)', helper: 'Ignora i flussi rete con magnitudine inferiore a questo valore prima di animarli.' },
          grid_threshold_warning: { label: 'Soglia avviso rete', helper: 'Cambia colore quando la magnitudine raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid_warning_color: { label: 'Colore avviso rete', helper: 'Colore applicato alla soglia di avviso.' },
          grid_threshold_critical: { label: 'Soglia critica rete', helper: 'Cambia colore quando la magnitudine raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid_critical_color: { label: 'Colore critico rete', helper: 'Colore applicato alla soglia critica.' },
          invert_grid: { label: 'Inverti valori rete', helper: 'Attiva se l import/export ha polarita invertita.' },
          sensor_car_power: { label: 'Sensore potenza auto' },
          sensor_car_soc: { label: 'Sensore SOC auto' },
          show_car_soc: { label: 'Mostra veicolo elettrico' },
          car_pct_color: { label: 'Colore SOC auto', helper: 'Colore esadecimale per il testo SOC EV (es. #00FFFF).' },
          header_font_size: { label: 'Dimensione titolo (px)', helper: 'Predefinita 16' },
          daily_label_font_size: { label: 'Dimensione etichetta giornaliera (px)', helper: 'Predefinita 12' },
          daily_value_font_size: { label: 'Dimensione valore giornaliero (px)', helper: 'Predefinita 20' },
          pv_font_size: { label: 'Dimensione testo PV (px)', helper: 'Predefinita 16' },
          battery_soc_font_size: { label: 'Dimensione SOC batteria (px)', helper: 'Predefinita 20' },
          battery_power_font_size: { label: 'Dimensione potenza batteria (px)', helper: 'Predefinita 14' },
          load_font_size: { label: 'Dimensione carico (px)', helper: 'Predefinita 15' },
          grid_font_size: { label: 'Dimensione rete (px)', helper: 'Predefinita 15' },
          car_power_font_size: { label: 'Dimensione potenza auto (px)', helper: 'Predefinita 15' },
          car_soc_font_size: { label: 'Dimensione SOC auto (px)', helper: 'Predefinita 12' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Inglese' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Tedesco' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Tratteggi (predefinito)' },
            { value: 'dots', label: 'Punti' },
            { value: 'arrows', label: 'Frecce' }
          ]
        }
      },
      de: {
        sections: {
          general: { title: 'Allgemeine Einstellungen', helper: 'Kartentitel, Hintergrund, Sprache und Aktualisierungsintervall.' },
          entities: { title: 'Entitaetenauswahl', helper: 'PV-, Batterie-, Netz-, Verbrauchs- und optionale EV-Entitaeten waehlen.' },
          colors: { title: 'Farben & Schwellwerte', helper: 'Grenzwerte und Farben fuer Netz- und EV-Anzeige einstellen.' },
          typography: { title: 'Typografie', helper: 'Schriftgroessen der Karte feinjustieren.' },
          about: { title: 'Info', helper: 'Credits, Version und nuetzliche Links.' }
        },
        fields: {
          card_title: { label: 'Kartentitel', helper: 'Titel oben auf der Karte.' },
          background_image: { label: 'Pfad zum Hintergrundbild', helper: 'Pfad zum Hintergrundbild (z. B. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Sprache', helper: 'Editor-Sprache waehlen.' },
          display_unit: { label: 'Anzeigeeinheit', helper: 'Einheit fuer Leistungswerte.' },
          update_interval: { label: 'Aktualisierungsintervall', helper: 'Aktualisierungsfrequenz der Karte (0 deaktiviert das Limit).' },
          animation_speed_factor: { label: 'Animationsgeschwindigkeit', helper: 'Animationsfaktor zwischen -3x und 3x. 0 pausiert, negative Werte kehren den Fluss um.' },
          animation_style: { label: 'Animationsstil', helper: 'Motiv der Flussanimation waehlen (Striche, Punkte oder Pfeile).' },
          sensor_pv_total: { label: 'PV Gesamt Sensor', helper: 'Optionaler aggregierter Sensor fuer die kombinierte Linie.' },
          sensor_pv1: { label: 'PV Sensor 1 (Pflicht)', helper: 'Primaerer Solarsensor.' },
          sensor_pv2: { label: 'PV Sensor 2' },
          sensor_pv3: { label: 'PV Sensor 3' },
          sensor_pv4: { label: 'PV Sensor 4' },
          sensor_pv5: { label: 'PV Sensor 5' },
          sensor_pv6: { label: 'PV Sensor 6' },
          show_pv_strings: { label: 'PV Strings einzeln anzeigen', helper: 'Gesamte Linie plus jede PV-String-Zeile separat einblenden.' },
          sensor_daily: { label: 'Tagesproduktion Sensor', helper: 'Sensor fuer taegliche Produktionssumme.' },
          sensor_bat1_soc: { label: 'Batterie 1 SOC' },
          sensor_bat1_power: { label: 'Batterie 1 Leistung' },
          sensor_bat2_soc: { label: 'Batterie 2 SOC' },
          sensor_bat2_power: { label: 'Batterie 2 Leistung' },
          sensor_bat3_soc: { label: 'Batterie 3 SOC' },
          sensor_bat3_power: { label: 'Batterie 3 Leistung' },
          sensor_bat4_soc: { label: 'Batterie 4 SOC' },
          sensor_bat4_power: { label: 'Batterie 4 Leistung' },
          sensor_home_load: { label: 'Hausverbrauch', helper: 'Sensor fuer Gesamtverbrauch des Haushalts.' },
          sensor_grid_power: { label: 'Netzleistung', helper: 'Sensor fuer positiven/negativen Netzfluss.' },
          sensor_grid_import: { label: 'Netzimport Sensor', helper: 'Optionale Entitaet fuer positiven Netzimport.' },
          sensor_grid_export: { label: 'Netzexport Sensor', helper: 'Optionale Entitaet fuer positiven Netzexport.' },
          grid_activity_threshold: { label: 'Netz Animationsschwelle (W)', helper: 'Ignoriere Netzfluesse mit geringerer Absolutleistung, bevor animiert wird.' },
          grid_threshold_warning: { label: 'Netz Warnschwelle', helper: 'Farbe wechseln, wenn diese Magnitude erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid_warning_color: { label: 'Netz Warnfarbe', helper: 'Farbe bei Erreichen der Warnschwelle.' },
          grid_threshold_critical: { label: 'Netz Kritische Schwelle', helper: 'Farbe wechseln, wenn diese Magnitude erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid_critical_color: { label: 'Netz Kritische Farbe', helper: 'Farbe bei Erreichen der kritischen Schwelle.' },
          invert_grid: { label: 'Netzwerte invertieren', helper: 'Aktivieren, wenn Import/Export vertauscht ist.' },
          sensor_car_power: { label: 'Fahrzeugleistung Sensor' },
          sensor_car_soc: { label: 'Fahrzeug SOC Sensor' },
          show_car_soc: { label: 'Elektrofahrzeug anzeigen' },
          car_pct_color: { label: 'Farbe fuer SOC', helper: 'Hex Farbe fuer EV SOC Text (z. B. #00FFFF).' },
          header_font_size: { label: 'Schriftgroesse Titel (px)', helper: 'Standard 16' },
          daily_label_font_size: { label: 'Schriftgroesse Tageslabel (px)', helper: 'Standard 12' },
          daily_value_font_size: { label: 'Schriftgroesse Tageswert (px)', helper: 'Standard 20' },
          pv_font_size: { label: 'Schriftgroesse PV Text (px)', helper: 'Standard 16' },
          battery_soc_font_size: { label: 'Schriftgroesse Batterie SOC (px)', helper: 'Standard 20' },
          battery_power_font_size: { label: 'Schriftgroesse Batterie Leistung (px)', helper: 'Standard 14' },
          load_font_size: { label: 'Schriftgroesse Last (px)', helper: 'Standard 15' },
          grid_font_size: { label: 'Schriftgroesse Netz (px)', helper: 'Standard 15' },
          car_power_font_size: { label: 'Schriftgroesse Fahrzeugleistung (px)', helper: 'Standard 15' },
          car_soc_font_size: { label: 'Schriftgroesse Fahrzeug SOC (px)', helper: 'Standard 12' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Englisch' },
            { value: 'it', label: 'Italienisch' },
            { value: 'de', label: 'Deutsch' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Striche (Standard)' },
            { value: 'dots', label: 'Punkte' },
            { value: 'arrows', label: 'Pfeile' }
          ]
        }
      }
    };
  }

  _currentLanguage() {
    const candidate = (this._config && this._config.language) || this._defaults.language || 'en';
    if (candidate && this._strings[candidate]) {
      return candidate;
    }
    return 'en';
  }

  _getLocaleStrings() {
    const lang = this._currentLanguage();
    return this._strings[lang] || this._strings.en;
  }

  _createOptionDefs(localeStrings) {
    return {
      language: localeStrings.options.languages,
      display_unit: localeStrings.options.display_units,
      animation_style: localeStrings.options.animation_styles
    };
  }

  _createSchemaDefs(localeStrings, optionDefs) {
    const entitySelector = { entity: { domain: ['sensor', 'input_number'] } };
    const fields = localeStrings.fields;
    const define = (entries) => entries.map((entry) => {
      const result = { ...entry };
      if (entry.name && this._defaults[entry.name] !== undefined && result.default === undefined) {
        result.default = this._defaults[entry.name];
      }
      return result;
    });

    return {
      general: define([
        { name: 'card_title', label: fields.card_title.label, helper: fields.card_title.helper, selector: { text: {} } },
        { name: 'background_image', label: fields.background_image.label, helper: fields.background_image.helper, selector: { text: {} } },
        { name: 'language', label: fields.language.label, helper: fields.language.helper, selector: { select: { options: optionDefs.language } } },
        { name: 'display_unit', label: fields.display_unit.label, helper: fields.display_unit.helper, selector: { select: { options: optionDefs.display_unit } } },
        { name: 'update_interval', label: fields.update_interval.label, helper: fields.update_interval.helper, selector: { number: { min: 0, max: 60, step: 5, mode: 'slider', unit_of_measurement: 's' } } },
        { name: 'animation_speed_factor', label: fields.animation_speed_factor.label, helper: fields.animation_speed_factor.helper, selector: { number: { min: -3, max: 3, step: 0.25, mode: 'slider', unit_of_measurement: 'x' } } },
        { name: 'animation_style', label: fields.animation_style.label, helper: fields.animation_style.helper, selector: { select: { options: optionDefs.animation_style } } }
      ]),
      entities: define([
        { name: 'sensor_pv_total', label: fields.sensor_pv_total.label, helper: fields.sensor_pv_total.helper, selector: entitySelector },
        { name: 'sensor_pv1', label: fields.sensor_pv1.label, helper: fields.sensor_pv1.helper, selector: entitySelector },
        { name: 'sensor_pv2', label: fields.sensor_pv2.label, helper: fields.sensor_pv2.helper, selector: entitySelector },
        { name: 'sensor_pv3', label: fields.sensor_pv3.label, helper: fields.sensor_pv3.helper, selector: entitySelector },
        { name: 'sensor_pv4', label: fields.sensor_pv4.label, helper: fields.sensor_pv4.helper, selector: entitySelector },
        { name: 'sensor_pv5', label: fields.sensor_pv5.label, helper: fields.sensor_pv5.helper, selector: entitySelector },
        { name: 'sensor_pv6', label: fields.sensor_pv6.label, helper: fields.sensor_pv6.helper, selector: entitySelector },
        { name: 'show_pv_strings', label: fields.show_pv_strings.label, helper: fields.show_pv_strings.helper, selector: { boolean: {} } },
        { name: 'sensor_daily', label: fields.sensor_daily.label, helper: fields.sensor_daily.helper, selector: entitySelector },
        { name: 'sensor_bat1_soc', label: fields.sensor_bat1_soc.label, helper: fields.sensor_bat1_soc.helper, selector: entitySelector },
        { name: 'sensor_bat1_power', label: fields.sensor_bat1_power.label, helper: fields.sensor_bat1_power.helper, selector: entitySelector },
        { name: 'sensor_bat2_soc', label: fields.sensor_bat2_soc.label, helper: fields.sensor_bat2_soc.helper, selector: entitySelector },
        { name: 'sensor_bat2_power', label: fields.sensor_bat2_power.label, helper: fields.sensor_bat2_power.helper, selector: entitySelector },
        { name: 'sensor_bat3_soc', label: fields.sensor_bat3_soc.label, helper: fields.sensor_bat3_soc.helper, selector: entitySelector },
        { name: 'sensor_bat3_power', label: fields.sensor_bat3_power.label, helper: fields.sensor_bat3_power.helper, selector: entitySelector },
        { name: 'sensor_bat4_soc', label: fields.sensor_bat4_soc.label, helper: fields.sensor_bat4_soc.helper, selector: entitySelector },
        { name: 'sensor_bat4_power', label: fields.sensor_bat4_power.label, helper: fields.sensor_bat4_power.helper, selector: entitySelector },
        { name: 'sensor_home_load', label: fields.sensor_home_load.label, helper: fields.sensor_home_load.helper, selector: entitySelector },
        { name: 'sensor_grid_power', label: fields.sensor_grid_power.label, helper: fields.sensor_grid_power.helper, selector: entitySelector },
        { name: 'sensor_grid_import', label: fields.sensor_grid_import.label, helper: fields.sensor_grid_import.helper, selector: entitySelector },
        { name: 'sensor_grid_export', label: fields.sensor_grid_export.label, helper: fields.sensor_grid_export.helper, selector: entitySelector },
        { name: 'invert_grid', label: fields.invert_grid.label, helper: fields.invert_grid.helper, selector: { boolean: {} }, default: false },
        { name: 'sensor_car_power', label: fields.sensor_car_power.label, helper: fields.sensor_car_power.helper, selector: entitySelector },
        { name: 'sensor_car_soc', label: fields.sensor_car_soc.label, helper: fields.sensor_car_soc.helper, selector: entitySelector },
        { name: 'show_car_soc', label: fields.show_car_soc.label, helper: fields.show_car_soc.helper, selector: { boolean: {} }, default: false }
      ]),
      colors: define([
        { name: 'grid_activity_threshold', label: fields.grid_activity_threshold.label, helper: fields.grid_activity_threshold.helper, selector: { number: { min: 0, max: 100000, step: 10 } }, default: DEFAULT_GRID_ACTIVITY_THRESHOLD },
        { name: 'grid_threshold_warning', label: fields.grid_threshold_warning.label, helper: fields.grid_threshold_warning.helper, selector: { number: { min: 0, max: 100000, step: 50 } }, default: null },
        { name: 'grid_warning_color', label: fields.grid_warning_color.label, helper: fields.grid_warning_color.helper, selector: { color: {} } },
        { name: 'grid_threshold_critical', label: fields.grid_threshold_critical.label, helper: fields.grid_threshold_critical.helper, selector: { number: { min: 0, max: 100000, step: 50 } }, default: null },
        { name: 'grid_critical_color', label: fields.grid_critical_color.label, helper: fields.grid_critical_color.helper, selector: { color: {} } },
        { name: 'car_pct_color', label: fields.car_pct_color.label, helper: fields.car_pct_color.helper, selector: { color: {} }, default: '#00FFFF' }
      ]),
      typography: define([
        { name: 'header_font_size', label: fields.header_font_size.label, helper: fields.header_font_size.helper, selector: { text: {} } },
        { name: 'daily_label_font_size', label: fields.daily_label_font_size.label, helper: fields.daily_label_font_size.helper, selector: { text: {} } },
        { name: 'daily_value_font_size', label: fields.daily_value_font_size.label, helper: fields.daily_value_font_size.helper, selector: { text: {} } },
        { name: 'pv_font_size', label: fields.pv_font_size.label, helper: fields.pv_font_size.helper, selector: { text: {} } },
        { name: 'battery_soc_font_size', label: fields.battery_soc_font_size.label, helper: fields.battery_soc_font_size.helper, selector: { text: {} } },
        { name: 'battery_power_font_size', label: fields.battery_power_font_size.label, helper: fields.battery_power_font_size.helper, selector: { text: {} } },
        { name: 'load_font_size', label: fields.load_font_size.label, helper: fields.load_font_size.helper, selector: { text: {} } },
        { name: 'grid_font_size', label: fields.grid_font_size.label, helper: fields.grid_font_size.helper, selector: { text: {} } },
        { name: 'car_power_font_size', label: fields.car_power_font_size.label, helper: fields.car_power_font_size.helper, selector: { text: {} } },
        { name: 'car_soc_font_size', label: fields.car_soc_font_size.label, helper: fields.car_soc_font_size.helper, selector: { text: {} } }
      ])
    };
  }

  _createSectionDefs(localeStrings, schemaDefs) {
    const sections = localeStrings.sections;
    return [
      { id: 'entities', title: sections.entities.title, helper: sections.entities.helper, schema: schemaDefs.entities, defaultOpen: true },
      { id: 'colors', title: sections.colors.title, helper: sections.colors.helper, schema: schemaDefs.colors, defaultOpen: false },
      { id: 'typography', title: sections.typography.title, helper: sections.typography.helper, schema: schemaDefs.typography, defaultOpen: false },
      { id: 'general', title: sections.general.title, helper: sections.general.helper, schema: schemaDefs.general, defaultOpen: false },
      { id: 'about', title: sections.about.title, helper: sections.about.helper, schema: null, defaultOpen: false, renderContent: () => this._createAboutContent() }
    ];
  }

  _configWithDefaults() {
    return { ...this._defaults, ...this._config };
  }

  setConfig(config) {
    this._config = { ...config };
    this._rendered = false;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config || this._rendered) {
      return;
    }
    this.render();
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  _createSection(sectionDef) {
    const { id, title, helper, schema, defaultOpen, renderContent } = sectionDef;
    const section = document.createElement('details');
    section.className = 'section';
    const storedState = id && Object.prototype.hasOwnProperty.call(this._sectionOpenState, id)
      ? this._sectionOpenState[id]
      : undefined;
    section.open = storedState !== undefined ? storedState : Boolean(defaultOpen);
    if (id) {
      section.dataset.sectionId = id;
    }

    const summary = document.createElement('summary');
    summary.className = 'section-summary';
    summary.textContent = title;
    section.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'section-content';

    if (helper) {
      const helperEl = document.createElement('div');
      helperEl.className = 'section-helper';
      helperEl.textContent = helper;
      content.appendChild(helperEl);
    }

    if (Array.isArray(schema) && schema.length > 0) {
      content.appendChild(this._createForm(schema));
    } else if (typeof renderContent === 'function') {
      const custom = renderContent();
      if (custom) {
        content.appendChild(custom);
      }
    }
    section.appendChild(content);
    section.addEventListener('toggle', () => {
      if (id) {
        this._sectionOpenState = { ...this._sectionOpenState, [id]: section.open };
      }
    });
    return section;
  }

  _createAboutContent() {
    const container = document.createElement('div');
    container.className = 'about-content';

    const title = document.createElement('div');
    title.className = 'about-title';
    title.textContent = 'Lumina Energy Card';
    container.appendChild(title);

    const version = document.createElement('div');
    version.className = 'about-version';
    version.textContent = `Version ${typeof LuminaEnergyCard !== 'undefined' && LuminaEnergyCard.version ? LuminaEnergyCard.version : 'Unknown'}`;
    container.appendChild(version);

    const links = document.createElement('div');
    links.className = 'about-links';

    const repoLabel = document.createElement('span');
    repoLabel.className = 'about-label';
    repoLabel.textContent = 'Repository:';
    links.appendChild(repoLabel);

    const repoLink = document.createElement('a');
    repoLink.href = 'https://github.com/ratava/lumina-energy-card';
    repoLink.target = '_blank';
    repoLink.rel = 'noopener noreferrer';
    repoLink.textContent = 'Repository';
    links.appendChild(repoLink);

    const devs = document.createElement('div');
    devs.className = 'about-developers';

    const devLabel = document.createElement('span');
    devLabel.className = 'about-label';
    devLabel.textContent = 'Developers:';
    devs.appendChild(devLabel);

    const saliernLink = document.createElement('a');
    saliernLink.href = 'https://github.com/Giorgio866';
    saliernLink.target = '_blank';
    saliernLink.rel = 'noopener noreferrer';
    saliernLink.textContent = 'Saliern Giorgio';

    const brentLink = document.createElement('a');
    brentLink.href = 'https://github.com/ratava';
    brentLink.target = '_blank';
    brentLink.rel = 'noopener noreferrer';
    brentLink.textContent = 'Brent Wesley';

    devs.appendChild(saliernLink);
    const separator = document.createElement('span');
    separator.textContent = '-';
    separator.className = 'about-separator';
    devs.appendChild(separator);
    devs.appendChild(brentLink);

    container.appendChild(links);
    container.appendChild(devs);

    return container;
  }

  _createForm(schema) {
    const form = document.createElement('ha-form');
    form.hass = this._hass;
    form.data = this._configWithDefaults();
    form.schema = schema;
    form.computeLabel = (field) => field.label || field.name;
    form.computeHelper = (field) => field.helper;
    form.addEventListener('value-changed', (ev) => {
      if (ev.target !== form) {
        return;
      }
      this._onFormValueChanged(ev, schema);
    });
    return form;
  }

  _onFormValueChanged(ev, schema) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const value = ev.detail ? ev.detail.value : undefined;
    if (!value || typeof value !== 'object') {
      return;
    }

    const newConfig = { ...this._config };
    schema.forEach((field) => {
      if (!field.name) {
        return;
      }
      const fieldValue = value[field.name];
      const defaultVal = field.default !== undefined ? field.default : this._defaults[field.name];
      if (
        fieldValue === '' ||
        fieldValue === null ||
        fieldValue === undefined ||
        (defaultVal !== undefined && fieldValue === defaultVal)
      ) {
        delete newConfig[field.name];
      } else {
        newConfig[field.name] = fieldValue;
      }
    });

    this._config = newConfig;
    this.configChanged(newConfig);
    this._rendered = false;
    this.render();
  }

  _buildConfigContent() {
    const container = document.createElement('div');
    container.className = 'card-config';

    const localeStrings = this._getLocaleStrings();
    const optionDefs = this._createOptionDefs(localeStrings);
    const schemaDefs = this._createSchemaDefs(localeStrings, optionDefs);
    const sections = this._createSectionDefs(localeStrings, schemaDefs);

    sections.forEach((section) => {
      container.appendChild(this._createSection(section));
    });

    return container;
  }

  render() {
    if (!this._hass || !this._config) {
      return;
    }

    this.shadowRoot.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }
      details.section {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        overflow: hidden;
      }
      details.section:not(:first-of-type) {
        margin-top: 4px;
      }
      .section-summary {
        font-weight: bold;
        font-size: 1.05em;
        padding: 12px 16px;
        color: var(--primary-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        list-style: none;
      }
      .section-summary::-webkit-details-marker {
        display: none;
      }
      .section-summary::after {
        content: '>';
        font-size: 0.9em;
        transform: rotate(90deg);
        transition: transform 0.2s ease;
      }
      details.section[open] .section-summary::after {
        transform: rotate(270deg);
      }
      .section-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 0 16px 16px;
      }
      .section-helper {
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
      ha-form {
        width: 100%;
      }
      .about-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.95em;
      }
      .about-title {
        font-weight: 600;
        font-size: 1.05em;
      }
      .about-version {
        color: var(--secondary-text-color);
      }
      .about-links,
      .about-developers {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .about-label {
        font-weight: 500;
      }
      .about-separator {
        font-weight: 400;
      }
      .about-links a,
      .about-developers a {
        color: var(--primary-color);
        text-decoration: none;
      }
      .about-links a:hover,
      .about-developers a:hover {
        text-decoration: underline;
      }
    `;

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this._buildConfigContent());
    this._rendered = true;
  }
}

if (!customElements.get('lumina-energy-card-editor')) {
  customElements.define('lumina-energy-card-editor', LuminaEnergyCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'lumina-energy-card',
  name: 'Lumina Energy Card',
  description: 'Advanced energy flow visualization card with support for multiple PV strings and batteries',
  preview: true,
  documentationURL: 'https://github.com/ratava/lumina-energy-card'
});

console.info(
  `%c LUMINA ENERGY CARD %c v${LuminaEnergyCard.version} `,
  'color: white; background: #00FFFF; font-weight: 700;',
  'color: #00FFFF; background: black; font-weight: 700;'
);