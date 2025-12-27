/**
 * Lumina Energy Card
 * Custom Home Assistant card for energy flow visualization
 * Version: 1.1.26-1
 * Tested with Home Assistant 2025.12+
 */
const BATTERY_GEOMETRY = { X: 260, Y_BASE: 350, WIDTH: 55, MAX_HEIGHT: 84 };
const TEXT_POSITIONS = {
  solar: { x: 177, y: 320, rotate: -16, skewX: -20, skewY: 0 },
  battery: { x: 245, y: 375, rotate: -25, skewX: -25, skewY: 5 },
  home: { x: 460, y: 245, rotate: -20, skewX: -20, skewY: 3 },
  grid: { x: 580, y: 90, rotate: -8, skewX: -10, skewY: 0 }
};

const buildTextTransform = ({ x, y, rotate, skewX, skewY }) =>
  `translate(${x}, ${y}) rotate(${rotate}) skewX(${skewX}) skewY(${skewY}) translate(-${x}, -${y})`;

const TEXT_TRANSFORMS = {
  solar: buildTextTransform(TEXT_POSITIONS.solar),
  battery: buildTextTransform(TEXT_POSITIONS.battery),
  home: buildTextTransform(TEXT_POSITIONS.home),
  grid: buildTextTransform(TEXT_POSITIONS.grid)
};

const FLOW_PATHS = {
  pv1: 'M 250 237 L 282 230 L 420 280',
  pv2: 'M 200 205 L 282 238 L 420 288',
  bat: 'M 423 310 L 325 350',
  load: 'M 471 303 L 550 273 L 380 220',
  grid: 'M 470 280 L 575 240 L 575 223',
  grid_house: 'M 475 205 L 575 245 L 575 223',
  house_inv: 'M 475 210 L 575 250 L 470 280',
  car1: 'M 475 329 L 490 335 L 600 285',
  car2: 'M 475 341 L 490 347 L 600 310'
};

const SVG_DIMENSIONS = { width: 800, height: 450 };
const DEBUG_GRID_SPACING = 25;
const DEBUG_GRID_MAJOR_SPACING = 100;
const DEBUG_GRID_MINOR_COLOR = 'rgba(255, 255, 255, 0.25)';
const DEBUG_GRID_MAJOR_COLOR = 'rgba(255, 255, 255, 0.45)';
const DEBUG_GRID_TEXT_COLOR = 'rgba(255, 255, 255, 0.65)';
const DEBUG_GRID_CONTENT = (() => {
  const parts = [];
  for (let x = 0; x <= SVG_DIMENSIONS.width; x += DEBUG_GRID_SPACING) {
    const isMajor = x % DEBUG_GRID_MAJOR_SPACING === 0;
    const stroke = isMajor ? DEBUG_GRID_MAJOR_COLOR : DEBUG_GRID_MINOR_COLOR;
    const strokeWidth = isMajor ? 1.5 : 0.75;
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${SVG_DIMENSIONS.height}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
    if (isMajor) {
      parts.push(`<text x="${x + 4}" y="12" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="10" text-anchor="start">X${x}</text>`);
    }
  }
  for (let y = 0; y <= SVG_DIMENSIONS.height; y += DEBUG_GRID_SPACING) {
    const isMajor = y % DEBUG_GRID_MAJOR_SPACING === 0;
    const stroke = isMajor ? DEBUG_GRID_MAJOR_COLOR : DEBUG_GRID_MINOR_COLOR;
    const strokeWidth = isMajor ? 1.5 : 0.75;
    parts.push(`<line x1="0" y1="${y}" x2="${SVG_DIMENSIONS.width}" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
    if (isMajor) {
      parts.push(`<text x="4" y="${y - 4}" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="10" text-anchor="start">Y${y}</text>`);
    }
  }
  parts.push(`<text x="${SVG_DIMENSIONS.width - 160}" y="${SVG_DIMENSIONS.height - 8}" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="11" text-anchor="start">Z axis points toward the viewer</text>`);
  return parts.join('');
})();

// Enable/disable debug grid overlay for development (set true to show grid)
const DEBUG_GRID_ENABLED = false;

const CAR_TEXT_BASE = { x: 590, rotate: 16, skewX: 20, skewY: 0 };
const CAR_LAYOUTS = {
  single: {
    car1: { x: 590, labelY: 282, powerY: 300, socY: 316, path: 'M 475 329 L 490 335 L 600 285' },
    car2: { x: 590, labelY: 318, powerY: 336, socY: 352, path: 'M 475 341 L 490 347 L 600 310' }
  },
  dual: {
    car1: { x: 580, labelY: 272, powerY: 290, socY: 306, path: 'M 475 329 L 490 335 L 600 285' },
    car2: { x: 639, labelY: 291, powerY: 308, socY: 323, path: 'M 464 320 L 570 357 L 650 310' }
  }
};

const buildCarTextTransforms = (entry) => {
  const base = { ...CAR_TEXT_BASE };
  if (typeof entry.x === 'number') {
    base.x = entry.x;
  }
  return {
    label: buildTextTransform({ ...base, y: entry.labelY }),
    power: buildTextTransform({ ...base, y: entry.powerY }),
    soc: buildTextTransform({ ...base, y: entry.socY })
  };
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
const DEFAULT_BATTERY_FILL_HIGH_COLOR = '#00ffff';
const DEFAULT_BATTERY_FILL_LOW_COLOR = '#ff0000';
const DEFAULT_BATTERY_LOW_THRESHOLD = 25;

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
    this._eventListenerAttached = false;
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
      card_title: '',
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
      car2_power_font_size: 15,
      car2_soc_font_size: 12,
        car_name_font_size: 15, // Schriftgroesse Fahrzeugname (px)
        car2_name_font_size: 15, // Schriftgroesse Fahrzeugname 2 (px)
      animation_speed_factor: 1,
      animation_style: 'dashes',
      grid_flow_mode: 'grid_to_inverter',
            sensor_pv_total: '',
          sensor_pv_total_secondary: '',
      sensor_pv1: '',
      sensor_daily: '',
      sensor_daily_array2: '',
      sensor_bat1_soc: '',
      sensor_bat1_power: '',
      sensor_home_load: '',
      sensor_home_load_secondary: '',
      sensor_grid_power: '',
      sensor_grid_import: '',
      sensor_grid_export: '',
      sensor_car2_power: '',
      sensor_car2_soc: '',
      pv_primary_color: '#0080ff',
      pv_tot_color: '#00FFFF',
      pv_secondary_color: '#80ffff',
      pv_string1_color: '#80ffff',
      pv_string2_color: '#80ffff',
      pv_string3_color: '#80ffff',
      pv_string4_color: '#80ffff',
      pv_string5_color: '#80ffff',
      pv_string6_color: '#80ffff',
      load_flow_color: '#0080ff',
      house_total_color: '#00FFFF',
      inv1_color: '#0080ff',
      inv2_color: '#80ffff',
      load_threshold_warning: null,
      load_warning_color: '#ff8000',
      load_threshold_critical: null,
      load_critical_color: '#ff0000',
      battery_charge_color: '#00FFFF',
      battery_discharge_color: '#FFFFFF',
      grid_import_color: '#FF3333',
      grid_export_color: '#00ff00',
      car_flow_color: '#00FFFF',
      car1_color: '#FFFFFF',
      car2_color: '#FFFFFF',
      car1_name_color: '#FFFFFF',
      car2_name_color: '#FFFFFF',
      car2_pct_color: '',
      show_car2: false,
      invert_battery: false,
      battery_fill_high_color: DEFAULT_BATTERY_FILL_HIGH_COLOR,
      battery_fill_low_color: DEFAULT_BATTERY_FILL_LOW_COLOR,
      battery_fill_low_threshold: DEFAULT_BATTERY_LOW_THRESHOLD,
      grid_activity_threshold: DEFAULT_GRID_ACTIVITY_THRESHOLD,
      grid_threshold_warning: null,
      grid_warning_color: '#ff8000',
      grid_threshold_critical: null,
      grid_critical_color: '#ff0000',
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
    this._eventListenerAttached = false;
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
    const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
      ? entry.directionState.value
      : (entry.direction || 1);
    const flip = directionValue < 0 ? 180 : 0;
    shape.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${angle + flip})`);
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

  getEntityName(entity_id) {
    if (!entity_id || !this._hass.states[entity_id]) {
      return entity_id || 'Unknown';
    }
    return this._hass.states[entity_id].attributes.friendly_name || entity_id;
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

    const pvArray2Ids = [
      config.sensor_pv_array2_1, config.sensor_pv_array2_2, config.sensor_pv_array2_3,
      config.sensor_pv_array2_4, config.sensor_pv_array2_5, config.sensor_pv_array2_6
    ].filter((sensorId) => sensorId && sensorId !== '');
    const pvArray2Values = pvArray2Ids.map((sensorId) => this.getStateSafe(sensorId));
    const pvArray2TotalFromStrings = pvArray2Values.reduce((acc, value) => acc + value, 0);

    const pv_primary_w = config.sensor_pv_total ? this.getStateSafe(config.sensor_pv_total) : pvTotalFromStrings;
    const pv_secondary_w = config.sensor_pv_total_secondary ? this.getStateSafe(config.sensor_pv_total_secondary) : pvArray2TotalFromStrings;
    const total_pv_w = pv_primary_w + pv_secondary_w;
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
    let gridImportDaily = 0;
    let gridExportDaily = 0;
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
      if (config.sensor_grid_import_daily) {
        const raw = this.getStateSafe(config.sensor_grid_import_daily);
        gridImportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      }
      if (config.sensor_grid_export_daily) {
        const raw = this.getStateSafe(config.sensor_grid_export_daily);
        gridExportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
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
    const loadWarningThresholdRaw = toNumber(config.load_threshold_warning);
    const loadCriticalThresholdRaw = toNumber(config.load_threshold_critical);
    const loadWarningThreshold = loadWarningThresholdRaw !== null ? loadWarningThresholdRaw * thresholdMultiplier : null;
    const loadCriticalThreshold = loadCriticalThresholdRaw !== null ? loadCriticalThresholdRaw * thresholdMultiplier : null;
    const loadWarningColor = typeof config.load_warning_color === 'string' && config.load_warning_color ? config.load_warning_color : null;
    const loadCriticalColor = typeof config.load_critical_color === 'string' && config.load_critical_color ? config.load_critical_color : null;
    const gridDirectionSign = gridDirection >= 0 ? 1 : -1;
    const belowGridActivityThreshold = gridActivityThreshold > 0 && !gridActive;
    const load = this.getStateSafe(config.sensor_home_load);
    const loadSecondary = config.sensor_home_load_secondary ? this.getStateSafe(config.sensor_home_load_secondary) : 0;
    const houseTotalLoad = (Number.isFinite(load) ? load : 0) + (Number.isFinite(loadSecondary) ? loadSecondary : 0);
    const loadValue = Number.isFinite(load) ? load : 0;
    const daily1 = config.sensor_daily ? this.getStateSafe(config.sensor_daily) : 0;
    const daily2 = config.sensor_daily_array2 ? this.getStateSafe(config.sensor_daily_array2) : 0;
    const total_daily_kwh = ((daily1 + daily2) / 1000).toFixed(1);

    // EV Cars
    const showCar1 = Boolean(config.show_car_soc);
    const showCar2Toggle = Boolean(config.show_car2);
    const car2EntitiesConfigured = Boolean(config.sensor_car2_power || config.sensor_car2_soc);
    const showCar2 = showCar2Toggle && car2EntitiesConfigured;
    const showDebugGrid = DEBUG_GRID_ENABLED;
    const resolveLabel = (value, fallback) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
      return fallback;
    };
    const car1Label = resolveLabel(config.car1_label, 'CAR 1');
    const car2Label = resolveLabel(config.car2_label, 'CAR 2');
    const car1PowerValue = showCar1 && config.sensor_car_power ? this.getStateSafe(config.sensor_car_power) : 0;
    const car1SocValue = showCar1 && config.sensor_car_soc ? this.getStateSafe(config.sensor_car_soc) : null;
    const car2PowerValue = showCar2 && config.sensor_car2_power ? this.getStateSafe(config.sensor_car2_power) : 0;
    const car2SocValue = showCar2 && config.sensor_car2_soc ? this.getStateSafe(config.sensor_car2_soc) : null;
    const carLayoutKey = showCar2 ? 'dual' : 'single';
    const carLayout = CAR_LAYOUTS[carLayoutKey];
    const car1Transforms = buildCarTextTransforms(carLayout.car1);
    const car2Transforms = buildCarTextTransforms(carLayout.car2);

    // PV Popup
    const popupPvValues = [
      config.sensor_popup_pv_1 ? this.getStateSafe(config.sensor_popup_pv_1) : null,
      config.sensor_popup_pv_2 ? this.getStateSafe(config.sensor_popup_pv_2) : null,
      config.sensor_popup_pv_3 ? this.getStateSafe(config.sensor_popup_pv_3) : null,
      config.sensor_popup_pv_4 ? this.getStateSafe(config.sensor_popup_pv_4) : null,
      config.sensor_popup_pv_5 ? this.getStateSafe(config.sensor_popup_pv_5) : null,
      config.sensor_popup_pv_6 ? this.getStateSafe(config.sensor_popup_pv_6) : null
    ];

    // PV Popup names
    const popupPvNames = [
      config.sensor_popup_pv_1_name && config.sensor_popup_pv_1_name.trim() ? config.sensor_popup_pv_1_name.trim() : this.getEntityName(config.sensor_popup_pv_1),
      config.sensor_popup_pv_2_name && config.sensor_popup_pv_2_name.trim() ? config.sensor_popup_pv_2_name.trim() : this.getEntityName(config.sensor_popup_pv_2),
      config.sensor_popup_pv_3_name && config.sensor_popup_pv_3_name.trim() ? config.sensor_popup_pv_3_name.trim() : this.getEntityName(config.sensor_popup_pv_3),
      config.sensor_popup_pv_4_name && config.sensor_popup_pv_4_name.trim() ? config.sensor_popup_pv_4_name.trim() : this.getEntityName(config.sensor_popup_pv_4),
      config.sensor_popup_pv_5_name && config.sensor_popup_pv_5_name.trim() ? config.sensor_popup_pv_5_name.trim() : this.getEntityName(config.sensor_popup_pv_5),
      config.sensor_popup_pv_6_name && config.sensor_popup_pv_6_name.trim() ? config.sensor_popup_pv_6_name.trim() : this.getEntityName(config.sensor_popup_pv_6)
    ];

    // House Popup
    const popupHouseValues = [
      config.sensor_popup_house_1 ? this.getStateSafe(config.sensor_popup_house_1) : null,
      config.sensor_popup_house_2 ? this.getStateSafe(config.sensor_popup_house_2) : null,
      config.sensor_popup_house_3 ? this.getStateSafe(config.sensor_popup_house_3) : null,
      config.sensor_popup_house_4 ? this.getStateSafe(config.sensor_popup_house_4) : null,
      config.sensor_popup_house_5 ? this.getStateSafe(config.sensor_popup_house_5) : null,
      config.sensor_popup_house_6 ? this.getStateSafe(config.sensor_popup_house_6) : null
    ];

    // House Popup names
    const popupHouseNames = [
      config.sensor_popup_house_1_name && config.sensor_popup_house_1_name.trim() ? config.sensor_popup_house_1_name.trim() : this.getEntityName(config.sensor_popup_house_1),
      config.sensor_popup_house_2_name && config.sensor_popup_house_2_name.trim() ? config.sensor_popup_house_2_name.trim() : this.getEntityName(config.sensor_popup_house_2),
      config.sensor_popup_house_3_name && config.sensor_popup_house_3_name.trim() ? config.sensor_popup_house_3_name.trim() : this.getEntityName(config.sensor_popup_house_3),
      config.sensor_popup_house_4_name && config.sensor_popup_house_4_name.trim() ? config.sensor_popup_house_4_name.trim() : this.getEntityName(config.sensor_popup_house_4),
      config.sensor_popup_house_5_name && config.sensor_popup_house_5_name.trim() ? config.sensor_popup_house_5_name.trim() : this.getEntityName(config.sensor_popup_house_5),
      config.sensor_popup_house_6_name && config.sensor_popup_house_6_name.trim() ? config.sensor_popup_house_6_name.trim() : this.getEntityName(config.sensor_popup_house_6)
    ];

    // Display settings
    const bg_img = config.background_image || '/local/community/lumina-energy-card/lumina_background.jpg';
    const title_text = (typeof config.card_title === 'string' && config.card_title.trim()) ? config.card_title.trim() : null;

    const resolveColor = (value, fallback) => {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
      return fallback;
    };

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
    const car2_power_font_size = clampValue(config.car2_power_font_size !== undefined ? config.car2_power_font_size : config.car_power_font_size, 10, 28, car_power_font_size);
    const car2_soc_font_size = clampValue(config.car2_soc_font_size !== undefined ? config.car2_soc_font_size : config.car_soc_font_size, 8, 24, car_soc_font_size);
    const car_name_font_size = clampValue(config.car_name_font_size !== undefined ? config.car_name_font_size : config.car_power_font_size, 8, 28, car_power_font_size);
    const car2_name_font_size = clampValue(config.car2_name_font_size !== undefined ? config.car2_name_font_size : (config.car2_power_font_size !== undefined ? config.car2_power_font_size : config.car_power_font_size), 8, 28, car2_power_font_size);
    const animation_speed_factor = clampValue(config.animation_speed_factor, -3, 3, 1);
    this._animationSpeedFactor = animation_speed_factor;
    const animation_style = this._normalizeAnimationStyle(config.animation_style);
    this._animationStyle = animation_style;

    // Language
    const lang = config.language || 'en';
    // Prefer locale strings (external or built-in) when available
    let label_daily = null;
    let label_pv_tot = null;
    let label_importing = null;
    let label_exporting = null;
    try {
      const localeStrings = (typeof this._getLocaleStrings === 'function') ? this._getLocaleStrings() : null;
      if (localeStrings && localeStrings.view) {
        label_daily = localeStrings.view.daily || null;
        label_pv_tot = localeStrings.view.pv_tot || null;
        label_importing = localeStrings.view.importing || null;
        label_exporting = localeStrings.view.exporting || null;
      }
    } catch (e) {
      // ignore
    }
    // Fallback to small built-in dictionaries if locales don't provide values
    if (!label_daily) {
      const dict_daily = { it: 'PRODUZIONE OGGI', en: 'DAILY YIELD', de: 'TAGESERTRAG' };
      label_daily = dict_daily[lang] || dict_daily['en'];
    }
    if (!label_pv_tot) {
      const dict_pv_tot = { it: 'PV TOTALE', en: 'PV TOTAL', de: 'PV GESAMT' };
      label_pv_tot = dict_pv_tot[lang] || dict_pv_tot['en'];
    }
    if (!label_importing) {
      const dict_importing = { it: 'IMPORTAZIONE', en: 'IMPORTING', de: 'IMPORTIEREN', fr: 'IMPORTATION', nl: 'IMPORTEREN' };
      label_importing = dict_importing[lang] || dict_importing['en'];
    }
    if (!label_exporting) {
      const dict_exporting = { it: 'ESPORTAZIONE', en: 'EXPORTING', de: 'EXPORTIEREN', fr: 'EXPORTATION', nl: 'EXPORTEREN' };
      label_exporting = dict_exporting[lang] || dict_exporting['en'];
    }

    // 3D coordinates
    const current_h = (avg_soc / 100) * BATTERY_GEOMETRY.MAX_HEIGHT;

    const C_CYAN = '#00FFFF';
    const C_BLUE = '#0088FF';
    const C_WHITE = '#FFFFFF';
    const C_RED = '#FF3333';
    const pvPrimaryColor = resolveColor(config.pv_primary_color, C_CYAN);
    const pvTotColor = resolveColor(config.pv_tot_color, pvPrimaryColor);
    const pvSecondaryColor = resolveColor(config.pv_secondary_color, C_BLUE);
    const pvStringColorKeys = [
      'pv_string1_color',
      'pv_string2_color',
      'pv_string3_color',
      'pv_string4_color',
      'pv_string5_color',
      'pv_string6_color'
    ];
    const getPvStringColor = (index) => {
      const key = pvStringColorKeys[index];
      if (!key) {
        return pvPrimaryColor;
      }
      return resolveColor(config[key], pvPrimaryColor);
    };
    const loadFlowColor = resolveColor(config.load_flow_color, C_CYAN);
    const batteryChargeColor = resolveColor(config.battery_charge_color, C_CYAN);
    const batteryDischargeColor = resolveColor(config.battery_discharge_color, C_WHITE);
    const gridImportColor = resolveColor(config.grid_import_color, C_RED);
    const gridExportColor = resolveColor(config.grid_export_color, C_CYAN);
    const carFlowColor = resolveColor(config.car_flow_color, C_CYAN);
    const batteryFillHighColor = resolveColor(config.battery_fill_high_color, DEFAULT_BATTERY_FILL_HIGH_COLOR);
    const batteryFillLowColor = resolveColor(config.battery_fill_low_color, DEFAULT_BATTERY_FILL_LOW_COLOR);
    const batteryLowThreshold = (() => {
      const raw = toNumber(config.battery_fill_low_threshold);
      if (raw === null) {
        return DEFAULT_BATTERY_LOW_THRESHOLD;
      }
      return Math.min(Math.max(raw, 0), 100);
    })();
    const loadMagnitude = Math.abs(loadValue);
    const effectiveLoadFlowColor = (() => {
      if (loadCriticalColor && loadCriticalThreshold !== null && loadMagnitude >= loadCriticalThreshold) {
        return loadCriticalColor;
      }
      if (loadWarningColor && loadWarningThreshold !== null && loadMagnitude >= loadWarningThreshold) {
        return loadWarningColor;
      }
      return loadFlowColor;
    })();
    const effectiveLoadTextColor = (() => {
      if (loadCriticalColor && loadCriticalThreshold !== null && loadMagnitude >= loadCriticalThreshold) {
        return loadCriticalColor;
      }
      if (loadWarningColor && loadWarningThreshold !== null && loadMagnitude >= loadWarningThreshold) {
        return loadWarningColor;
      }
      return C_WHITE;
    })();
    const invertBattery = Boolean(config.invert_battery);
    const isBatPositive = total_bat_w >= 0;
    const bat_col = isBatPositive
      ? (invertBattery ? batteryDischargeColor : batteryChargeColor)
      : (invertBattery ? batteryChargeColor : batteryDischargeColor);
    let batteryDirectionSign = isBatPositive ? 1 : -1;
    if (invertBattery) batteryDirectionSign *= -1;
    const base_grid_color = belowGridActivityThreshold
      ? gridExportColor
      : (gridDirectionSign >= 0 ? gridImportColor : gridExportColor);
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
    const liquid_fill = (avg_soc <= batteryLowThreshold) ? batteryFillLowColor : batteryFillHighColor;
    const show_double_flow = (pv_primary_w > 10 && pv_secondary_w > 10);
    const pvLinesRaw = [];
    // If Array 2 is producing, show totals only: PV TOTAL, Array 1 total, Array 2 total
    if (pv_secondary_w > 10) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`, fill: pvTotColor });
      pvLinesRaw.push({ key: 'pv-primary-total', text: `Array 1: ${this.formatPower(pv_primary_w, use_kw)}`, fill: pvPrimaryColor });
      pvLinesRaw.push({ key: 'pv-secondary-total', text: `Array 2: ${this.formatPower(pv_secondary_w, use_kw)}`, fill: pvSecondaryColor });
    } else if (showPvStrings) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`, fill: pvTotColor });
      pvStringValues.forEach((value, index) => {
        const lineColor = getPvStringColor(index);
        pvLinesRaw.push({ key: `pv-string-${index + 1}`, text: `S${index + 1}: ${this.formatPower(value, use_kw)}`, fill: lineColor });
      });
    } else if (pvStringValues.length === 2) {
      pvLinesRaw.push({ key: 'pv-string-1', text: `S1: ${this.formatPower(pvStringValues[0], use_kw)}`, fill: getPvStringColor(0) });
      pvLinesRaw.push({ key: 'pv-string-2', text: `S2: ${this.formatPower(pvStringValues[1], use_kw)}`, fill: getPvStringColor(1) });
    } else if (pvStringValues.length > 2) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`, fill: pvTotColor });
    } else {
      pvLinesRaw.push({ key: 'pv-total', text: this.formatPower(total_pv_w, use_kw), fill: pvTotColor });
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

    // Build optional grid daily lines (import/export cumulative values)
    const gridLinesRaw = [];
    if (config.sensor_grid_import_daily && Number.isFinite(gridImportDaily)) {
      gridLinesRaw.push({ key: 'grid-import-daily', text: `IMP DAY: ${(gridImportDaily / 1000).toFixed(2)} kWh`, fill: gridImportColor });
    }
    if (config.sensor_grid_export_daily && Number.isFinite(gridExportDaily)) {
      gridLinesRaw.push({ key: 'grid-export-daily', text: `EXP DAY: ${(gridExportDaily / 1000).toFixed(2)} kWh`, fill: gridExportColor });
    }
    const gridLineCount = Math.min(gridLinesRaw.length, 2);
    const gridBaseY = TEXT_POSITIONS.grid.y + 18;
    const gridLines = Array.from({ length: 2 }, (_, index) => {
      if (index < gridLineCount) {
        const line = gridLinesRaw[index];
        return { ...line, y: gridBaseY + index * (grid_font_size + 4), visible: true };
      }
      return { key: `grid-placeholder-${index}`, text: '', fill: effectiveGridColor, y: gridBaseY + index * (grid_font_size + 4), visible: false };
    });

    // Build load display lines when Array 2 is active (include per-line colours)
    const houseFill = resolveColor(config.house_total_color, C_CYAN);
    const inv1Fill = resolveColor(config.inv1_color, pvPrimaryColor);
    const inv2Fill = resolveColor(config.inv2_color, pvSecondaryColor);
    const loadLines = (pv_secondary_w > 10) ? [
      { key: 'house-total', text: `HOUSE TOT: ${this.formatPower(houseTotalLoad, use_kw)}`, fill: houseFill },
      { key: 'inv1-total', text: `INV 1: ${this.formatPower(loadValue, use_kw)}`, fill: inv1Fill },
      { key: 'inv2-total', text: `INV 2: ${this.formatPower(loadSecondary, use_kw)}`, fill: inv2Fill }
    ] : null;

    const loadY = (pv_secondary_w > 10) ? (TEXT_POSITIONS.home.y - 28) : TEXT_POSITIONS.home.y;

    const gridFlowMode = config.grid_flow_mode || 'grid_to_inverter';
    const gridActiveForGrid = gridFlowMode === 'grid_to_inverter' ? gridActive : false;
    const gridActiveForHouse = gridFlowMode === 'grid_to_house_inverter' ? gridActive : false;

    const flows = {
      pv1: { stroke: pvPrimaryColor, glowColor: pvPrimaryColor, active: pv_primary_w > 10 },
      pv2: { stroke: pvSecondaryColor, glowColor: pvSecondaryColor, active: pv_secondary_w > 10 },
      bat: { stroke: bat_col, glowColor: bat_col, active: Math.abs(total_bat_w) > 10, direction: batteryDirectionSign },
      load: { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: loadMagnitude > 10, direction: 1 },
      grid: { stroke: effectiveGridColor, glowColor: effectiveGridColor, active: gridActiveForGrid, direction: gridAnimationDirection },
      grid_house: { stroke: effectiveGridColor, glowColor: effectiveGridColor, active: gridActiveForHouse, direction: gridAnimationDirection },
      house_inv: { stroke: effectiveGridColor, glowColor: effectiveGridColor, active: gridActiveForHouse, direction: -gridAnimationDirection },
      car1: { stroke: carFlowColor, glowColor: carFlowColor, active: showCar1 && Math.abs(car1PowerValue) > 10, direction: 1 },
      car2: { stroke: carFlowColor, glowColor: carFlowColor, active: showCar2 && Math.abs(car2PowerValue) > 10, direction: 1 }
    };

    flows.pv1.direction = 1;
    flows.pv2.direction = 1;
    flows.car1.direction = 1;
    flows.car2.direction = 1;

    const flowDurations = Object.fromEntries(
      Object.entries(flows).map(([key, state]) => [key, state.active ? 1 : 0])
    );

    const flowPaths = {
      pv1: FLOW_PATHS.pv1,
      pv2: FLOW_PATHS.pv2,
      bat: FLOW_PATHS.bat,
      load: FLOW_PATHS.load,
      grid: FLOW_PATHS.grid,
      grid_house: FLOW_PATHS.grid_house,
      house_inv: FLOW_PATHS.house_inv,
      car1: carLayout.car1.path,
      car2: carLayout.car2.path
    };

    const car1Color = resolveColor(config.car1_color, C_WHITE);
    const car2Color = resolveColor(config.car2_color, C_WHITE);
    const car1NameColor = resolveColor(config.car1_name_color, car1Color);
    const car2NameColor = resolveColor(config.car2_name_color, car2Color);
    const car1SocColor = resolveColor(config.car_pct_color, '#00FFFF');
    const car2SocColor = resolveColor(config.car2_pct_color, car1SocColor);
    const buildCarView = (visible, label, powerValue, socValue, transforms, positions, nameFontSize, powerFontSize, socFontSize, textColor, nameColor, socColor) => {
      const textX = (typeof positions.x === 'number') ? positions.x : CAR_TEXT_BASE.x;
      return {
        visible,
        label: {
          text: visible ? label : '',
          fontSize: nameFontSize,
          fill: nameColor,
          x: textX,
          y: positions.labelY,
          transform: transforms.label
        },
        power: {
          text: visible ? this.formatPower(powerValue, use_kw) : '',
          fontSize: powerFontSize,
          fill: textColor,
          x: textX,
          y: positions.powerY,
          transform: transforms.power
        },
        soc: {
          visible: visible && socValue !== null,
          text: (visible && socValue !== null) ? `${Math.round(socValue)}%` : '',
          fontSize: socFontSize,
          fill: socColor,
          x: textX,
          y: positions.socY,
          transform: transforms.soc
        }
      };
    };
    const car1View = buildCarView(showCar1, car1Label, car1PowerValue, car1SocValue, car1Transforms, carLayout.car1, car_name_font_size, car_power_font_size, car_soc_font_size, car1Color, car1NameColor, car1SocColor);
    const car2View = buildCarView(showCar2, car2Label, car2PowerValue, car2SocValue, car2Transforms, carLayout.car2, car2_name_font_size, car2_power_font_size, car2_soc_font_size, car2Color, car2NameColor, car2SocColor);

    const viewState = {
      backgroundImage: bg_img,
      animationStyle: animation_style,
      title: { text: title_text, fontSize: header_font_size },
      daily: { label: label_daily, value: `${total_daily_kwh} kWh`, labelSize: daily_label_font_size, valueSize: daily_value_font_size },
      pv: { fontSize: pv_font_size, lines: pvLines },
      battery: { levelOffset: BATTERY_GEOMETRY.MAX_HEIGHT - current_h, fill: liquid_fill },
      batterySoc: { text: `${Math.floor(avg_soc)}%`, fontSize: battery_soc_font_size, fill: C_WHITE },
      batteryPower: { text: this.formatPower(Math.abs(total_bat_w), use_kw), fontSize: battery_power_font_size, fill: bat_col },
      load: (loadLines && loadLines.length) ? { lines: loadLines, y: loadY, fontSize: load_font_size, fill: effectiveLoadTextColor } : { text: this.formatPower(loadValue, use_kw), fontSize: load_font_size, fill: effectiveLoadTextColor },
      grid: { text: gridNet > 0 ? `${label_importing} ${this.formatPower(Math.abs(gridNet), use_kw)}` : gridNet < 0 ? `${label_exporting} ${this.formatPower(Math.abs(gridNet), use_kw)}` : this.formatPower(Math.abs(gridNet), use_kw), fontSize: grid_font_size, fill: effectiveGridColor, lines: gridLines },
      car1: car1View,
      car2: car2View,
      popup: { 
        lines: popupPvValues.map((v, i) => v !== null ? `${popupPvNames[i]}: ${this.formatPower(v, use_kw)}` : ''),
        hasContent: popupPvValues.some(v => v !== null)
      },
      flows,
      flowDurations,
      flowPaths,
      showDebugGrid
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
    const car1Display = viewState.car1.visible ? 'inline' : 'none';
    const car1SocDisplay = viewState.car1.soc.visible ? 'inline' : 'none';
    const car2Display = viewState.car2.visible ? 'inline' : 'none';
    const car2SocDisplay = viewState.car2.soc.visible ? 'inline' : 'none';
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
        .debug-grid line { pointer-events: none; }
        .debug-grid text { pointer-events: none; font-family: sans-serif; }
        @keyframes pulse-cyan { 0% { filter: drop-shadow(0 0 2px #00FFFF); opacity: 0.9; } 50% { filter: drop-shadow(0 0 10px #00FFFF); opacity: 1; } 100% { filter: drop-shadow(0 0 2px #00FFFF); opacity: 0.9; } }
        .alive-box { animation: pulse-cyan 3s infinite ease-in-out; stroke: #00FFFF; stroke-width: 2px; fill: #001428; }
        .alive-text { animation: pulse-cyan 3s infinite ease-in-out; fill: #00FFFF; text-shadow: 0 0 5px #00FFFF; }
        @keyframes wave-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-80px); } }
        .liquid-shape { animation: wave-slide 2s linear infinite; }
        .title-text { fill: #00FFFF; font-weight: 900; font-family: 'Orbitron', sans-serif; text-anchor: middle; letter-spacing: 3px; text-transform: uppercase; }
        /* Editor helpers */
        .editor-divider { border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0 10px 0; }
        /* Visual header for Array 2: use a dedicated class so no styles are inherited */
        .array2-header { display: block; }
        .array2-visual-header {
          font-weight: bold !important;
          font-size: 1.05em !important;
          padding: 12px 16px !important;
          color: var(--primary-color) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          cursor: default !important;
          list-style: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        .array2-visual-header + .field-helper { margin: 0 0 12px 16px; color: var(--secondary-text-color); font-size: 0.9em; }
        /* Ensure no disclosure marker/caret appears on the visual header */
        .array2-visual-header::after,
        .array2-visual-header::marker,
        .array2-visual-header::-webkit-details-marker { content: '' !important; display: none !important; }
      </style>
      <ha-card>
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 100%; height: 100%;">
          <defs>
            <clipPath id="battery-clip"><rect x="${BATTERY_GEOMETRY.X}" y="${BATTERY_GEOMETRY.Y_BASE - BATTERY_GEOMETRY.MAX_HEIGHT}" width="${BATTERY_GEOMETRY.WIDTH}" height="${BATTERY_GEOMETRY.MAX_HEIGHT}" rx="2" /></clipPath>
          </defs>

          <image data-role="background-image" href="${viewState.backgroundImage}" xlink:href="${viewState.backgroundImage}" x="0" y="0" width="800" height="450" preserveAspectRatio="none" />
          <g data-role="debug-grid" class="debug-grid" style="display:none;">
            ${DEBUG_GRID_CONTENT}
          </g>

          ${viewState.title && viewState.title.text ? `
          <rect x="290" y="10" width="220" height="32" rx="6" ry="6" fill="rgba(0, 20, 40, 0.85)" stroke="#00FFFF" stroke-width="1.5"/>
          <text data-role="title-text" x="400" y="32" class="title-text" font-size="${viewState.title.fontSize}">${viewState.title.text}</text>
          ` : ''}

          <g data-role="daily-yield-group" transform="translate(600, 370)" style="cursor:pointer;">
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

          <path class="track-path" d="${viewState.flowPaths.pv1}" />
          <path class="flow-path" data-flow-key="pv1" d="${viewState.flowPaths.pv1}" stroke="${viewState.flows.pv1.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('pv1', viewState.flows.pv1)}
          <path class="track-path" d="${viewState.flowPaths.pv2}" />
          <path class="flow-path" data-flow-key="pv2" d="${viewState.flowPaths.pv2}" stroke="${viewState.flows.pv2.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('pv2', viewState.flows.pv2)}
          <path class="track-path" d="${viewState.flowPaths.bat}" />
          <path class="flow-path" data-flow-key="bat" d="${viewState.flowPaths.bat}" stroke="${viewState.flows.bat.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('bat', viewState.flows.bat)}
          <path class="track-path" d="${viewState.flowPaths.load}" />
          <path class="flow-path" data-flow-key="load" d="${viewState.flowPaths.load}" stroke="${viewState.flows.load.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('load', viewState.flows.load)}
          <path class="track-path" d="${viewState.flowPaths.grid}" />
          <path class="flow-path" data-flow-key="grid" d="${viewState.flowPaths.grid}" stroke="${viewState.flows.grid.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('grid', viewState.flows.grid)}
          <path class="track-path" d="${viewState.flowPaths.grid_house}" />
          <path class="flow-path" data-flow-key="grid_house" d="${viewState.flowPaths.grid_house}" stroke="${viewState.flows.grid_house.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('grid_house', viewState.flows.grid_house)}
          <path class="track-path" d="${viewState.flowPaths.house_inv}" />
          <path class="flow-path" data-flow-key="house_inv" d="${viewState.flowPaths.house_inv}" stroke="${viewState.flows.house_inv.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('house_inv', viewState.flows.house_inv)}
          <path class="track-path" d="${viewState.flowPaths.car1}" />
          <path class="flow-path" data-flow-key="car1" d="${viewState.flowPaths.car1}" stroke="${viewState.flows.car1.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('car1', viewState.flows.car1)}
          <path class="track-path" d="${viewState.flowPaths.car2}" />
          <path class="flow-path" data-flow-key="car2" d="${viewState.flowPaths.car2}" stroke="${viewState.flows.car2.stroke}" style="opacity:0;" />
          ${buildArrowGroupSvg('car2', viewState.flows.car2)}

          ${pvLineElements}

          <text data-role="battery-soc" x="${TEXT_POSITIONS.battery.x}" y="${TEXT_POSITIONS.battery.y}" transform="${TEXT_TRANSFORMS.battery}" fill="${viewState.batterySoc.fill}" font-size="${viewState.batterySoc.fontSize}" style="${TXT_STYLE}">${viewState.batterySoc.text}</text>
          <text data-role="battery-power" x="${TEXT_POSITIONS.battery.x}" y="${TEXT_POSITIONS.battery.y + 20}" transform="${TEXT_TRANSFORMS.battery}" fill="${viewState.batteryPower.fill}" font-size="${viewState.batteryPower.fontSize}" style="${TXT_STYLE}">${viewState.batteryPower.text}</text>

          <text data-role="load-power" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}">${viewState.load.text || ''}</text>
          <text data-role="load-line-0" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[0] && viewState.load.lines[0].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="load-line-1" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[1] && viewState.load.lines[1].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="load-line-2" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[2] && viewState.load.lines[2].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="grid-power" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}">${viewState.grid.text}</text>

          <text data-role="grid-line-0" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${(viewState.grid.lines && viewState.grid.lines[0] && viewState.grid.lines[0].fill) || viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="grid-line-1" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${(viewState.grid.lines && viewState.grid.lines[1] && viewState.grid.lines[1].fill) || viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}; display:none;"></text>

          <text data-role="car1-label" x="${viewState.car1.label.x}" y="${viewState.car1.label.y}" transform="${viewState.car1.label.transform}" fill="${viewState.car1.label.fill}" font-size="${viewState.car1.label.fontSize}" style="${TXT_STYLE}; display:${car1Display};">${viewState.car1.label.text}</text>
          <text data-role="car1-power" x="${viewState.car1.power.x}" y="${viewState.car1.power.y}" transform="${viewState.car1.power.transform}" fill="${viewState.car1.power.fill}" font-size="${viewState.car1.power.fontSize}" style="${TXT_STYLE}; display:${car1Display};">${viewState.car1.power.text}</text>
          <text data-role="car1-soc" x="${viewState.car1.soc.x}" y="${viewState.car1.soc.y}" transform="${viewState.car1.soc.transform}" fill="${viewState.car1.soc.fill}" font-size="${viewState.car1.soc.fontSize}" style="${TXT_STYLE}; display:${car1SocDisplay};">${viewState.car1.soc.text}</text>

          <text data-role="car2-label" x="${viewState.car2.label.x}" y="${viewState.car2.label.y}" transform="${viewState.car2.label.transform}" fill="${viewState.car2.label.fill}" font-size="${viewState.car2.label.fontSize}" style="${TXT_STYLE}; display:${car2Display};">${viewState.car2.label.text}</text>
          <text data-role="car2-power" x="${viewState.car2.power.x}" y="${viewState.car2.power.y}" transform="${viewState.car2.power.transform}" fill="${viewState.car2.power.fill}" font-size="${viewState.car2.power.fontSize}" style="${TXT_STYLE}; display:${car2Display};">${viewState.car2.power.text}</text>
          <text data-role="car2-soc" x="${viewState.car2.soc.x}" y="${viewState.car2.soc.y}" transform="${viewState.car2.soc.transform}" fill="${viewState.car2.soc.fill}" font-size="${viewState.car2.soc.fontSize}" style="${TXT_STYLE}; display:${car2SocDisplay};">${viewState.car2.soc.text}</text>

          <g data-role="pv-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="pv-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <polygon data-role="pv-clickable-area" points="75,205 200,195 275,245 145,275 75,205" fill="transparent" style="cursor:pointer;" />

          <g data-role="battery-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="battery-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <polygon data-role="battery-clickable-area" points="325,400 350,375 350,275 275,250 250,250 250,350 325,400" fill="transparent" style="cursor:pointer;" />

          <polygon data-role="house-clickable-area" points="300,200 300,150 350,100 450,75 500,150 500,200 395,250" fill="transparent" style="cursor:pointer;" />

          <g data-role="house-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="house-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

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
      debugGrid: root.querySelector('[data-role="debug-grid"]'),
      title: root.querySelector('[data-role="title-text"]'),
      dailyYieldGroup: root.querySelector('[data-role="daily-yield-group"]'),
      dailyLabel: root.querySelector('[data-role="daily-label"]'),
      dailyValue: root.querySelector('[data-role="daily-value"]'),
      batteryLiquidGroup: root.querySelector('[data-role="battery-liquid-group"]'),
      batteryLiquidShape: root.querySelector('[data-role="battery-liquid-shape"]'),
      pvLines: Array.from({ length: MAX_PV_LINES }, (_, index) => root.querySelector(`[data-role="pv-line-${index}"]`)),
      batterySoc: root.querySelector('[data-role="battery-soc"]'),
      batteryPower: root.querySelector('[data-role="battery-power"]'),
      loadText: root.querySelector('[data-role="load-power"]'),
      loadLines: Array.from({ length: 3 }, (_, index) => root.querySelector(`[data-role="load-line-${index}"]`)),
      gridText: root.querySelector('[data-role="grid-power"]'),
      gridLines: Array.from({ length: 2 }, (_, index) => root.querySelector(`[data-role="grid-line-${index}"]`)),
      car1Label: root.querySelector('[data-role="car1-label"]'),
      car1Power: root.querySelector('[data-role="car1-power"]'),
      car1Soc: root.querySelector('[data-role="car1-soc"]'),
      car2Label: root.querySelector('[data-role="car2-label"]'),
      car2Power: root.querySelector('[data-role="car2-power"]'),
      car2Soc: root.querySelector('[data-role="car2-soc"]'),
      pvPopup: root.querySelector('[data-role="pv-popup"]'),
      pvPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="pv-popup-line-${index}"]`)),
      pvClickableArea: root.querySelector('[data-role="pv-clickable-area"]'),
      batteryPopup: root.querySelector('[data-role="battery-popup"]'),
      batteryPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="battery-popup-line-${index}"]`)),
      housePopup: root.querySelector('[data-role="house-popup"]'),
      housePopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="house-popup-line-${index}"]`)),
      houseClickableArea: root.querySelector('[data-role="house-clickable-area"]'),
      batteryClickableArea: root.querySelector('[data-role="battery-clickable-area"]'),

      flows: {
        pv1: root.querySelector('[data-flow-key="pv1"]'),
        pv2: root.querySelector('[data-flow-key="pv2"]'),
        bat: root.querySelector('[data-flow-key="bat"]'),
        load: root.querySelector('[data-flow-key="load"]'),
        grid: root.querySelector('[data-flow-key="grid"]'),
        grid_house: root.querySelector('[data-flow-key="grid_house"]'),
        house_inv: root.querySelector('[data-flow-key="house_inv"]'),
        car1: root.querySelector('[data-flow-key="car1"]'),
        car2: root.querySelector('[data-flow-key="car2"]')
      },
      arrows: {
        pv1: root.querySelector('[data-arrow-key="pv1"]'),
        pv2: root.querySelector('[data-arrow-key="pv2"]'),
        bat: root.querySelector('[data-arrow-key="bat"]'),
        load: root.querySelector('[data-arrow-key="load"]'),
        grid: root.querySelector('[data-arrow-key="grid"]'),
        grid_house: root.querySelector('[data-arrow-key="grid_house"]'),
        house_inv: root.querySelector('[data-arrow-key="house_inv"]'),
        car1: root.querySelector('[data-arrow-key="car1"]'),
        car2: root.querySelector('[data-arrow-key="car2"]')
      },
      arrowShapes: {
        pv1: Array.from(root.querySelectorAll('[data-arrow-shape="pv1"]')),
        pv2: Array.from(root.querySelectorAll('[data-arrow-shape="pv2"]')),
        bat: Array.from(root.querySelectorAll('[data-arrow-shape="bat"]')),
        load: Array.from(root.querySelectorAll('[data-arrow-shape="load"]')),
        grid: Array.from(root.querySelectorAll('[data-arrow-shape="grid"]')),
        grid_house: Array.from(root.querySelectorAll('[data-arrow-shape="grid_house"]')),
        house_inv: Array.from(root.querySelectorAll('[data-arrow-shape="house_inv"]')),
        car1: Array.from(root.querySelectorAll('[data-arrow-shape="car1"]')),
        car2: Array.from(root.querySelectorAll('[data-arrow-shape="car2"]'))
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

  _togglePvPopup() {
    if (!this._domRefs || !this._domRefs.pvPopup) return;
    
    // Check if popup has any content by checking if any PV entities are configured
    const config = this._config || this.config || {};
    const hasContent = config.sensor_popup_pv_1 || config.sensor_popup_pv_2 || 
                      config.sensor_popup_pv_3 || config.sensor_popup_pv_4 || 
                      config.sensor_popup_pv_5 || config.sensor_popup_pv_6;
    if (!hasContent) return;
    
    const popup = this._domRefs.pvPopup;
    const isVisible = popup.style.display !== 'none';
    if (isVisible) {
      this._hidePvPopup();
    } else {
      this._closeOtherPopups('pv');
      this._showPvPopup();
    }
  }

  async _showPvPopup() {
    if (!this._domRefs || !this._domRefs.pvPopup) return;
    const popup = this._domRefs.pvPopup;
    
    // Calculate popup content
    const config = this._config || this.config || {};
    const use_kw = config.display_unit === 'kW';
    
    const popupPvValues = [
      config.sensor_popup_pv_1 ? this.getStateSafe(config.sensor_popup_pv_1) : null,
      config.sensor_popup_pv_2 ? this.getStateSafe(config.sensor_popup_pv_2) : null,
      config.sensor_popup_pv_3 ? this.getStateSafe(config.sensor_popup_pv_3) : null,
      config.sensor_popup_pv_4 ? this.getStateSafe(config.sensor_popup_pv_4) : null,
      config.sensor_popup_pv_5 ? this.getStateSafe(config.sensor_popup_pv_5) : null,
      config.sensor_popup_pv_6 ? this.getStateSafe(config.sensor_popup_pv_6) : null
    ];

    const popupPvNames = [
      config.sensor_popup_pv_1_name && config.sensor_popup_pv_1_name.trim() ? config.sensor_popup_pv_1_name.trim() : this.getEntityName(config.sensor_popup_pv_1),
      config.sensor_popup_pv_2_name && config.sensor_popup_pv_2_name.trim() ? config.sensor_popup_pv_2_name.trim() : this.getEntityName(config.sensor_popup_pv_2),
      config.sensor_popup_pv_3_name && config.sensor_popup_pv_3_name.trim() ? config.sensor_popup_pv_3_name.trim() : this.getEntityName(config.sensor_popup_pv_3),
      config.sensor_popup_pv_4_name && config.sensor_popup_pv_4_name.trim() ? config.sensor_popup_pv_4_name.trim() : this.getEntityName(config.sensor_popup_pv_4),
      config.sensor_popup_pv_5_name && config.sensor_popup_pv_5_name.trim() ? config.sensor_popup_pv_5_name.trim() : this.getEntityName(config.sensor_popup_pv_5),
      config.sensor_popup_pv_6_name && config.sensor_popup_pv_6_name.trim() ? config.sensor_popup_pv_6_name.trim() : this.getEntityName(config.sensor_popup_pv_6)
    ];

    const lines = popupPvValues.map((v, i) => v !== null ? `${popupPvNames[i]}: ${this.formatPower(v, use_kw)}` : '').filter(line => line);
    if (!lines.length) return;
    
    // Calculate popup dimensions based on content
    const maxLineLength = Math.max(...lines.map(line => line.length));
    
    // Find the maximum font size used in the popup for width calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_pv_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // More accurate width calculation: account for font size and variable character widths
    // Average character width is roughly 0.6 * font-size for most fonts
    const estimatedCharWidth = maxFontSize * 0.6;
    const popupWidth = Math.max(200, Math.min(500, maxLineLength * estimatedCharWidth + 40)); // Reduced padding for tighter fit
    const popupHeight = 25 + lines.length * 15; // Reduced height since header removed
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically
    
    // Update popup rectangle
    const rect = popup.querySelector('rect');
    if (rect) {
      rect.setAttribute('x', popupX);
      rect.setAttribute('y', popupY);
      rect.setAttribute('width', popupWidth);
      rect.setAttribute('height', popupHeight);
    }
    
    // Update text positions
    const titleText = popup.querySelector('text');
    if (titleText) {
      titleText.setAttribute('x', popupX + popupWidth / 2);
      titleText.setAttribute('y', popupY + 20);
    }
    
    // Update line positions and styling
    const lineElements = this._domRefs.pvPopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + 25 + index * 15);
        element.textContent = line;
        element.style.display = 'inline';
        
        // Apply font size
        const fontSizeKey = `sensor_popup_pv_${index + 1}_font_size`;
        const fontSize = config[fontSizeKey] || 16;
        element.setAttribute('font-size', fontSize);
        
        // Apply color
        const colorKey = `sensor_popup_pv_${index + 1}_color`;
        const color = config[colorKey] || '#80ffff';
        element.setAttribute('fill', color);
      }
    });
    
    // Hide unused lines
    for (let i = lines.length; i < lineElements.length; i++) {
      const element = lineElements[i];
      if (element) {
        element.style.display = 'none';
      }
    }
    
    popup.style.display = 'inline';
    this._activePopup = 'pv';
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.fromTo(popup, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }
  }

  async _hidePvPopup() {
    if (!this._domRefs || !this._domRefs.pvPopup) return;
    const popup = this._domRefs.pvPopup;
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.to(popup, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in', onComplete: () => {
        popup.style.display = 'none';
        if (this._activePopup === 'pv') this._activePopup = null;
      }});
    } else {
      popup.style.display = 'none';
      if (this._activePopup === 'pv') this._activePopup = null;
    }
  }

  _toggleBatteryPopup() {
    if (!this._domRefs || !this._domRefs.batteryPopup) return;

    const config = this._config || this.config || {};
    const hasContent = config.sensor_popup_bat_1 || config.sensor_popup_bat_2 ||
                      config.sensor_popup_bat_3 || config.sensor_popup_bat_4 ||
                      config.sensor_popup_bat_5 || config.sensor_popup_bat_6;
    if (!hasContent) return;

    const popup = this._domRefs.batteryPopup;
    const isVisible = popup.style.display !== 'none';
    if (isVisible) {
      this._hideBatteryPopup();
    } else {
      this._closeOtherPopups('battery');
      this._showBatteryPopup();
    }
  }

  async _showBatteryPopup() {
    if (!this._domRefs || !this._domRefs.batteryPopup) return;
    const popup = this._domRefs.batteryPopup;

    const config = this._config || this.config || {};
    const use_kw = config.display_unit === 'kW';
    const popupBatValues = [
      config.sensor_popup_bat_1 ? this.getStateSafe(config.sensor_popup_bat_1) : null,
      config.sensor_popup_bat_2 ? this.getStateSafe(config.sensor_popup_bat_2) : null,
      config.sensor_popup_bat_3 ? this.getStateSafe(config.sensor_popup_bat_3) : null,
      config.sensor_popup_bat_4 ? this.getStateSafe(config.sensor_popup_bat_4) : null,
      config.sensor_popup_bat_5 ? this.getStateSafe(config.sensor_popup_bat_5) : null,
      config.sensor_popup_bat_6 ? this.getStateSafe(config.sensor_popup_bat_6) : null
    ];

    const popupBatNames = [
      config.sensor_popup_bat_1_name && config.sensor_popup_bat_1_name.trim() ? config.sensor_popup_bat_1_name.trim() : this.getEntityName(config.sensor_popup_bat_1),
      config.sensor_popup_bat_2_name && config.sensor_popup_bat_2_name.trim() ? config.sensor_popup_bat_2_name.trim() : this.getEntityName(config.sensor_popup_bat_2),
      config.sensor_popup_bat_3_name && config.sensor_popup_bat_3_name.trim() ? config.sensor_popup_bat_3_name.trim() : this.getEntityName(config.sensor_popup_bat_3),
      config.sensor_popup_bat_4_name && config.sensor_popup_bat_4_name.trim() ? config.sensor_popup_bat_4_name.trim() : this.getEntityName(config.sensor_popup_bat_4),
      config.sensor_popup_bat_5_name && config.sensor_popup_bat_5_name.trim() ? config.sensor_popup_bat_5_name.trim() : this.getEntityName(config.sensor_popup_bat_5),
      config.sensor_popup_bat_6_name && config.sensor_popup_bat_6_name.trim() ? config.sensor_popup_bat_6_name.trim() : this.getEntityName(config.sensor_popup_bat_6)
    ];

    const lines = popupBatValues.map((v, i) => v !== null ? `${popupBatNames[i]}: ${this.formatPower(v, use_kw)}` : '').filter(line => line);
    if (!lines.length) return;

    const maxLineLength = Math.max(...lines.map(line => line.length));
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_bat_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    const estimatedCharWidth = maxFontSize * 0.6;
    // Use a 40px margin on each side (80px total) to match design requirement
    const popupWidth = Math.max(200, Math.min(700, maxLineLength * estimatedCharWidth + 80));
    const popupHeight = 25 + lines.length * 15;
    const popupX = (800 - popupWidth) / 2;
    const popupY = (450 - popupHeight) / 2;

    const rect = popup.querySelector('rect');
    if (rect) {
      rect.setAttribute('x', popupX);
      rect.setAttribute('y', popupY);
      rect.setAttribute('width', popupWidth);
      rect.setAttribute('height', popupHeight);
      // Ensure popup background is opaque and shows glowing border
      rect.setAttribute('fill', '#001428');
      rect.setAttribute('stroke', '#00FFFF');
      rect.setAttribute('stroke-width', '2');
    }

    const lineElements = this._domRefs.batteryPopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + 25 + index * 15);
        element.textContent = line;
        element.style.display = 'inline';
        const fontSizeKey = `sensor_popup_bat_${index + 1}_font_size`;
        const fontSize = config[fontSizeKey] || 16;
        element.setAttribute('font-size', fontSize);
        const colorKey = `sensor_popup_bat_${index + 1}_color`;
        const color = config[colorKey] || '#80ffff';
        element.setAttribute('fill', color);
      }
    });

    for (let i = lines.length; i < lineElements.length; i++) {
      const element = lineElements[i];
      if (element) {
        element.style.display = 'none';
      }
    }

    popup.style.display = 'inline';
    this._activePopup = 'battery';
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.fromTo(popup, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }
  }

  async _hideBatteryPopup() {
    if (!this._domRefs || !this._domRefs.batteryPopup) return;
    const popup = this._domRefs.batteryPopup;
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.to(popup, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in', onComplete: () => {
        popup.style.display = 'none';
        if (this._activePopup === 'battery') this._activePopup = null;
      }});
    } else {
      popup.style.display = 'none';
      if (this._activePopup === 'battery') this._activePopup = null;
    }
  }

  _toggleHousePopup() {
    if (!this._domRefs || !this._domRefs.housePopup) return;
    
    // Check if popup has any content by checking if any house entities are configured
    const config = this._config || this.config || {};
    if (!config) return;
    const hasContent = (config.sensor_popup_house_1 && config.sensor_popup_house_1.trim()) || 
                      (config.sensor_popup_house_2 && config.sensor_popup_house_2.trim()) || 
                      (config.sensor_popup_house_3 && config.sensor_popup_house_3.trim()) || 
                      (config.sensor_popup_house_4 && config.sensor_popup_house_4.trim()) || 
                      (config.sensor_popup_house_5 && config.sensor_popup_house_5.trim()) || 
                      (config.sensor_popup_house_6 && config.sensor_popup_house_6.trim());
    if (!hasContent) return;
    
    const popup = this._domRefs.housePopup;
    const isVisible = popup.style.display !== 'none';
    if (isVisible) {
      this._hideHousePopup();
    } else {
      this._closeOtherPopups('house');
      this._showHousePopup();
    }
  }

  async _showHousePopup() {
    if (!this._domRefs || !this._domRefs.housePopup) return;
    const popup = this._domRefs.housePopup;
    
    // Get house popup data
    const config = this._config || this.config || {};
    if (!config) return;
    const popupHouseValues = [
      config.sensor_popup_house_1 ? this.getStateSafe(config.sensor_popup_house_1) : null,
      config.sensor_popup_house_2 ? this.getStateSafe(config.sensor_popup_house_2) : null,
      config.sensor_popup_house_3 ? this.getStateSafe(config.sensor_popup_house_3) : null,
      config.sensor_popup_house_4 ? this.getStateSafe(config.sensor_popup_house_4) : null,
      config.sensor_popup_house_5 ? this.getStateSafe(config.sensor_popup_house_5) : null,
      config.sensor_popup_house_6 ? this.getStateSafe(config.sensor_popup_house_6) : null
    ];
    
    const popupHouseNames = [
      config.sensor_popup_house_1_name && config.sensor_popup_house_1_name.trim() ? config.sensor_popup_house_1_name.trim() : this.getEntityName(config.sensor_popup_house_1),
      config.sensor_popup_house_2_name && config.sensor_popup_house_2_name.trim() ? config.sensor_popup_house_2_name.trim() : this.getEntityName(config.sensor_popup_house_2),
      config.sensor_popup_house_3_name && config.sensor_popup_house_3_name.trim() ? config.sensor_popup_house_3_name.trim() : this.getEntityName(config.sensor_popup_house_3),
      config.sensor_popup_house_4_name && config.sensor_popup_house_4_name.trim() ? config.sensor_popup_house_4_name.trim() : this.getEntityName(config.sensor_popup_house_4),
      config.sensor_popup_house_5_name && config.sensor_popup_house_5_name.trim() ? config.sensor_popup_house_5_name.trim() : this.getEntityName(config.sensor_popup_house_5),
      config.sensor_popup_house_6_name && config.sensor_popup_house_6_name.trim() ? config.sensor_popup_house_6_name.trim() : this.getEntityName(config.sensor_popup_house_6)
    ];
    
    const use_kw = config.display_unit === 'kW';
    const lines = popupHouseValues.map((v, i) => v !== null ? `${popupHouseNames[i]}: ${this.formatPower(v, use_kw)}` : '').filter(line => line);
    if (!lines.length) return;
    
    // Calculate popup dimensions based on content
    const maxLineLength = Math.max(...lines.map(line => line.length));
    
    // Find the maximum font size used in the popup for width calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_house_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // More accurate width calculation: account for font size and variable character widths
    // Average character width is roughly 0.6 * font-size for most fonts
    const estimatedCharWidth = maxFontSize * 0.6;
    const popupWidth = Math.max(200, Math.min(500, maxLineLength * estimatedCharWidth + 40)); // Reduced padding for tighter fit
    const popupHeight = 25 + lines.length * 15; // Reduced height since header removed
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically
    
    // Update popup rectangle
    const rect = popup.querySelector('rect');
    if (rect) {
      rect.setAttribute('x', popupX);
      rect.setAttribute('y', popupY);
      rect.setAttribute('width', popupWidth);
      rect.setAttribute('height', popupHeight);
    }
    
    // Update text positions
    const lineElements = this._domRefs.housePopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element && line) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + 25 + index * 15);
        element.textContent = line;
        element.style.display = 'inline';
        
        // Apply font size
        const fontSizeKey = `sensor_popup_house_${index + 1}_font_size`;
        const fontSize = config[fontSizeKey] || 16;
        element.setAttribute('font-size', fontSize);
        
        // Apply color
        const colorKey = `sensor_popup_house_${index + 1}_color`;
        const color = config[colorKey] || '#80ffff';
        element.setAttribute('fill', color);
      } else if (element) {
        element.style.display = 'none';
      }
    });
    
    // Hide unused lines
    for (let i = lines.length; i < lineElements.length; i++) {
      const element = lineElements[i];
      if (element) {
        element.style.display = 'none';
      }
    }
    
    popup.style.display = 'inline';
    this._activePopup = 'house';
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.fromTo(popup, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }
  }

  async _hideHousePopup() {
    if (!this._domRefs || !this._domRefs.housePopup) return;
    const popup = this._domRefs.housePopup;
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.to(popup, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in', onComplete: () => {
        popup.style.display = 'none';
        if (this._activePopup === 'house') this._activePopup = null;
      }});
    } else {
      popup.style.display = 'none';
      if (this._activePopup === 'house') this._activePopup = null;
    }
  }

  _closeOtherPopups(except) {
    if (except !== 'pv') this._hidePvPopup();
    if (except !== 'battery') this._hideBatteryPopup();
    if (except !== 'house') this._hideHousePopup();
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

    if (refs.debugGrid) {
      const desired = viewState.showDebugGrid ? 'inline' : 'none';
      if (refs.debugGrid.style.display !== desired) {
        refs.debugGrid.style.display = desired;
      }
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
      const lines = viewState.load && viewState.load.lines && viewState.load.lines.length ? viewState.load.lines : null;
      if (lines) {
        // Multi-line mode: update individual load-line nodes
        if (refs.loadLines && refs.loadLines.length) {
          const baseY = viewState.load.y || TEXT_POSITIONS.home.y;
          const lineSpacing = viewState.load.fontSize + 4;
          lines.forEach((l, idx) => {
            const node = refs.loadLines[idx];
            if (!node) return;
            if (!prev.load || !prev.load.lines || (prev.load.lines[idx] || {}).text !== l.text) {
              node.textContent = l.text;
            }
            if (!prev.load || !prev.load.lines || (prev.load.lines[idx] || {}).fill !== l.fill) {
              node.setAttribute('fill', l.fill || viewState.load.fill);
            }
            if (!prev.load || prev.load.fontSize !== viewState.load.fontSize) {
              node.setAttribute('font-size', viewState.load.fontSize);
            }
            const desiredY = baseY + idx * lineSpacing;
            if (!prev.load || prev.load.y !== desiredY) {
              node.setAttribute('y', desiredY);
            }
            if (node.style.display !== 'inline') node.style.display = 'inline';
          });
          // hide unused lines
          for (let i = lines.length; i < refs.loadLines.length; i++) {
            const node = refs.loadLines[i];
            if (node && node.style.display !== 'none') node.style.display = 'none';
          }
        }
        // hide single-line element
        if (refs.loadText.style.display !== 'none') refs.loadText.style.display = 'none';
      } else {
        // Single-line mode
        if (!prev.load || prev.load.text !== viewState.load.text) {
          refs.loadText.textContent = viewState.load.text || '';
        }
        // restore default y if previously modified
        if (!prev.load || prev.load.y !== undefined) {
          refs.loadText.setAttribute('y', TEXT_POSITIONS.home.y);
        }
        if (refs.loadLines && refs.loadLines.length) {
          refs.loadLines.forEach((node) => { if (node && node.style.display !== 'none') node.style.display = 'none'; });
        }
        if (refs.loadText.style.display !== 'inline') refs.loadText.style.display = 'inline';
      }
      if (!prev.load || prev.load.fill !== viewState.load.fill) {
        refs.loadText.setAttribute('fill', viewState.load.fill);
      }
      if (!prev.load || prev.load.fontSize !== viewState.load.fontSize) {
        refs.loadText.setAttribute('font-size', viewState.load.fontSize);
      }
    }

    if (refs.gridText) {
      const lines = viewState.grid && viewState.grid.lines && viewState.grid.lines.length ? viewState.grid.lines : null;
      if (lines) {
        // Show daily totals above the current grid power
        if (refs.gridLines && refs.gridLines.length) {
          const baseY = TEXT_POSITIONS.grid.y - 40; // Position daily lines 40px above main grid text
          const lineSpacing = viewState.grid.fontSize + 4;
          lines.forEach((l, idx) => {
            const node = refs.gridLines[idx];
            if (!node) return;
            const prevLine = prev.grid && prev.grid.lines ? (prev.grid.lines[idx] || {}) : undefined;
            if (!prev.grid || !prev.grid.lines || prevLine.text !== l.text) {
              node.textContent = l.text;
            }
            if (!prev.grid || !prev.grid.lines || prevLine.fill !== l.fill) {
              node.setAttribute('fill', l.fill || viewState.grid.fill);
            }
            if (!prev.grid || prev.grid.fontSize !== viewState.grid.fontSize) {
              node.setAttribute('font-size', viewState.grid.fontSize);
            }
            const desiredY = baseY + idx * lineSpacing;
            if (!prev.grid || prev.grid.y !== desiredY) {
              node.setAttribute('y', desiredY);
            }
            if (node.style.display !== 'inline') node.style.display = 'inline';
          });
          for (let i = lines.length; i < refs.gridLines.length; i++) {
            const node = refs.gridLines[i];
            if (node && node.style.display !== 'none') node.style.display = 'none';
          }
        }
        // Always show the main grid text below the daily totals
        if (!prev.grid || prev.grid.text !== viewState.grid.text) {
          refs.gridText.textContent = viewState.grid.text || '';
        }
        if (!prev.grid || prev.grid.y !== undefined) {
          refs.gridText.setAttribute('y', TEXT_POSITIONS.grid.y);
        }
        if (refs.gridText.style.display !== 'inline') refs.gridText.style.display = 'inline';
      } else {
        // No daily totals, just show main grid text
        if (!prev.grid || prev.grid.text !== viewState.grid.text) {
          refs.gridText.textContent = viewState.grid.text || '';
        }
        if (!prev.grid || prev.grid.y !== undefined) {
          refs.gridText.setAttribute('y', TEXT_POSITIONS.grid.y);
        }
        if (refs.gridLines && refs.gridLines.length) {
          refs.gridLines.forEach((node) => { if (node && node.style.display !== 'none') node.style.display = 'none'; });
        }
        if (refs.gridText.style.display !== 'inline') refs.gridText.style.display = 'inline';
      }
      if (!prev.grid || prev.grid.fill !== viewState.grid.fill) {
        refs.gridText.setAttribute('fill', viewState.grid.fill);
      }
      if (!prev.grid || prev.grid.fontSize !== viewState.grid.fontSize) {
        refs.gridText.setAttribute('font-size', viewState.grid.fontSize);
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

    const syncCarText = (node, viewEntry, prevEntry, displayFlag) => {
      if (!node || !viewEntry) {
        return;
      }
      const desiredDisplay = displayFlag ? 'inline' : 'none';
      if (node.style.display !== desiredDisplay) {
        node.style.display = desiredDisplay;
      }
      if (!displayFlag) {
        return;
      }
      if (!prevEntry || prevEntry.text !== viewEntry.text) {
        node.textContent = viewEntry.text;
      }
      if (!prevEntry || prevEntry.fill !== viewEntry.fill) {
        node.setAttribute('fill', viewEntry.fill);
      }
      if (!prevEntry || prevEntry.fontSize !== viewEntry.fontSize) {
        node.setAttribute('font-size', viewEntry.fontSize);
      }
      if (!prevEntry || prevEntry.x !== viewEntry.x) {
        node.setAttribute('x', viewEntry.x);
      }
      if (!prevEntry || prevEntry.y !== viewEntry.y) {
        node.setAttribute('y', viewEntry.y);
      }
      if (!prevEntry || prevEntry.transform !== viewEntry.transform) {
        node.setAttribute('transform', viewEntry.transform);
      }
    };

    const syncCarSection = (key) => {
      const carView = viewState[key];
      if (!carView) {
        return;
      }
      const prevCar = prev[key] || {};
      syncCarText(refs[`${key}Label`], carView.label, prevCar.label, carView.visible);
      syncCarText(refs[`${key}Power`], carView.power, prevCar.power, carView.visible);
      syncCarText(refs[`${key}Soc`], carView.soc, prevCar.soc, carView.soc.visible);
    };

    syncCarSection('car1');
    syncCarSection('car2');

    // PV popup lines are updated in _showPvPopup when needed

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

    if (refs.flows && viewState.flowPaths) {
      Object.entries(viewState.flowPaths).forEach(([key, dValue]) => {
        const path = refs.flows[key];
        if (!path || typeof dValue !== 'string') {
          return;
        }
        if (path.getAttribute('d') !== dValue) {
          path.setAttribute('d', dValue);
          if (this._flowPathLengths && this._flowPathLengths.has(key)) {
            this._flowPathLengths.delete(key);
          }
        }
      });
    }

    // Re-attach event listeners after DOM updates
    this._cacheDomReferences(); // Re-cache refs in case DOM was updated
    this._attachEventListeners();
  }

  _attachEventListeners() {
    if (!this.shadowRoot || !this._domRefs) return;

    // Remove existing listeners to avoid duplicates
    if (this._eventListenerAttached) return;
    this._eventListenerAttached = true;

    // Attach click listener to daily yield group
    if (this._domRefs.dailyYieldGroup) {
      this._domRefs.dailyYieldGroup.addEventListener('click', () => {
        this._togglePvPopup();
      });
    }

    // Attach click listener to house clickable area for house popup
    if (this._domRefs.houseClickableArea) {
      this._domRefs.houseClickableArea.addEventListener('click', () => {
        this._toggleHousePopup();
      });
    }

    // Attach click listener to PV clickable area for PV popup
    if (this._domRefs.pvClickableArea) {
      this._domRefs.pvClickableArea.addEventListener('click', () => {
        console.debug('Lumina Energy Card: PV clickable area clicked');
        this._togglePvPopup();
      });
    }

    // Attach click listener to battery clickable area for battery popup
    if (this._domRefs.batteryClickableArea) {
      this._domRefs.batteryClickableArea.addEventListener('click', () => {
        console.debug('Lumina Energy Card: battery clickable area clicked');
        this._toggleBatteryPopup();
      });
    }

    // Attach click listener to popup for closing
    if (this._domRefs.pvPopup) {
      this._domRefs.pvPopup.addEventListener('click', () => {
        this._hidePvPopup();
      });
    }

    // Attach click listener to battery popup for closing
    if (this._domRefs.batteryPopup) {
      this._domRefs.batteryPopup.addEventListener('click', () => {
        console.debug('Lumina Energy Card: battery popup clicked');
        this._hideBatteryPopup();
      });
    }

    // Attach click listener to house popup for closing
    if (this._domRefs.housePopup) {
      this._domRefs.housePopup.addEventListener('click', () => {
        this._hideHousePopup();
      });
    }
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
      car1: viewState.car1 ? {
        visible: viewState.car1.visible,
        label: { ...viewState.car1.label },
        power: { ...viewState.car1.power },
        soc: { ...viewState.car1.soc }
      } : undefined,
      car2: viewState.car2 ? {
        visible: viewState.car2.visible,
        label: { ...viewState.car2.label },
        power: { ...viewState.car2.power },
        soc: { ...viewState.car2.soc }
      } : undefined,
      flows: Object.fromEntries(Object.entries(viewState.flows).map(([key, value]) => [key, { ...value }])),
      flowPaths: { ...viewState.flowPaths },
      showDebugGrid: Boolean(viewState.showDebugGrid)
    };
  }

  static get version() {
    return '1.1.26-1';
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
  }

  _buildStrings() {
    return {
      en: {
        sections: {
          general: { title: 'General Settings', helper: 'Card metadata, background, language, and update cadence.' },
          array1: { title: 'Array 1', helper: 'Choose the PV, battery, grid, load, and EV entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          battery: { title: 'Battery', helper: 'Configure battery entities.' },
          grid: { title: 'Grid', helper: 'Configure grid entities.' },
          car: { title: 'Car', helper: 'Configure EV entities.' },
          pvPopup: { title: 'PV Popup', helper: 'Configure entities for the PV popup display.' },
          housePopup: { title: 'House Popup', helper: 'Configure entities for the house popup display.' },
          batteryPopup: { title: 'Battery Popup', helper: 'Configure battery popup display.' },
          colors: { title: 'Color & Thresholds', helper: 'Configure grid thresholds and accent colours for flows and EV display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Card Title', helper: 'Title displayed at the top of the card. Leave blank to disable.' },
          background_image: { label: 'Background Image Path', helper: 'Path to the background image (e.g., /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Language', helper: 'Choose the editor language.' },
          display_unit: { label: 'Display Unit', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Update Interval', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          animation_speed_factor: { label: 'Animation Speed Factor', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Animation Style', helper: 'Choose the flow animation motif (dashes, dots, or arrows).' },
          grid_flow_mode: { label: 'Grid Flow', helper: 'Choose how grid flows are displayed.' },
          
          sensor_pv_total: { label: 'PV Total Sensor', helper: 'Optional aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'PV Total Sensor (Inverter 2)', helper: 'Optional second inverter total; added to the PV total when provided.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Primary solar production sensor.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          solar_array2_title: { label: 'Array 2 (Optional)' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor.' },
          solar_array2_activation_helper: { label: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          show_pv_strings: { label: 'Show Individual PV Strings', helper: 'Toggle to display the total plus each PV string on separate lines.' },
          sensor_daily: { label: 'Daily Production Sensor (Required)', helper: 'Sensor reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Daily Production Sensor (Array 2)', helper: 'Sensor reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Battery 1 SOC' },
          sensor_bat1_power: { label: 'Battery 1 Power' },
          sensor_bat2_soc: { label: 'Battery 2 SOC' },
          sensor_bat2_power: { label: 'Battery 2 Power' },
          sensor_bat3_soc: { label: 'Battery 3 SOC' },
          sensor_bat3_power: { label: 'Battery 3 Power' },
          sensor_bat4_soc: { label: 'Battery 4 SOC' },
          sensor_bat4_power: { label: 'Battery 4 Power' },
          sensor_home_load: { label: 'Home Load/Consumption (Required)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Inverter 2)', helper: 'Optional house load sensor for the second inverter.' },
          sensor_grid_power: { label: 'Grid Power', helper: 'Positive/negative grid flow sensor. Specify either this sensor or both Grid Import Sensor and Grid Export Sensor.' },
          sensor_grid_import: { label: 'Grid Import Sensor', helper: 'Optional entity reporting grid import (positive) power.' },
          sensor_grid_export: { label: 'Grid Export Sensor', helper: 'Optional entity reporting grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Daily Grid Import Sensor', helper: 'Optional entity reporting cumulative grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Daily Grid Export Sensor', helper: 'Optional entity reporting cumulative grid export for the current day.' },
          show_daily_grid: { label: 'Show Daily Grid Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          pv_tot_color: { label: 'PV Total Color', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Color', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Color', helper: 'Colour used for the secondary PV animation line when available.' },
          pv_string1_color: { label: 'PV String 1 Color', helper: 'Override for S1 in the PV list. Leave blank to inherit the PV total color.' },
          pv_string2_color: { label: 'PV String 2 Color', helper: 'Override for S2 in the PV list. Leave blank to inherit the PV total color.' },
          pv_string3_color: { label: 'PV String 3 Color', helper: 'Override for S3 in the PV list. Leave blank to inherit the PV total color.' },
          pv_string4_color: { label: 'PV String 4 Color', helper: 'Override for S4 in the PV list. Leave blank to inherit the PV total color.' },
          pv_string5_color: { label: 'PV String 5 Color', helper: 'Override for S5 in the PV list. Leave blank to inherit the PV total color.' },
          pv_string6_color: { label: 'PV String 6 Color', helper: 'Override for S6 in the PV list. Leave blank to inherit the PV total color.' },
          load_flow_color: { label: 'Load Flow Color', helper: 'Colour applied to the home load animation line.' },
          house_total_color: { label: 'House Total Color', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'INV 1 Color', helper: 'Colour applied to the INV 1 text/flow.' },
          inv2_color: { label: 'INV 2 Color', helper: 'Colour applied to the INV 2 text/flow.' },
          load_threshold_warning: { label: 'Load Warning Threshold', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Color', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Threshold', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Color', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_charge_color: { label: 'Battery Charge Flow Color', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Battery Discharge Flow Color', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Grid Import Flow Color', helper: 'Base colour before thresholds when importing from the grid.' },
          grid_export_color: { label: 'Grid Export Flow Color', helper: 'Base colour before thresholds when exporting to the grid.' },
          car_flow_color: { label: 'EV Flow Color', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Battery Fill (Normal) Color', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Battery Fill (Low) Color', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Battery Low Fill Threshold (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          grid_activity_threshold: { label: 'Grid Animation Threshold (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_threshold_warning: { label: 'Grid Warning Threshold', helper: 'Change grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Grid Warning Color', helper: 'Hex or CSS color applied at the warning threshold.' },
          grid_threshold_critical: { label: 'Grid Critical Threshold', helper: 'Change grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Grid Critical Color', helper: 'Hex or CSS color applied at the critical threshold.' },
          invert_grid: { label: 'Invert Grid Values', helper: 'Enable if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Battery Values', helper: 'Enable if charge/discharge polarity is reversed.' },
          sensor_car_power: { label: 'Car 1 Power Sensor' },
          sensor_car_soc: { label: 'Car 1 SOC Sensor' },
          car_soc: { label: 'Car SOC', helper: 'Sensor for EV battery SOC.' },
          car_range: { label: 'Car Range', helper: 'Sensor for EV range.' },
          car_efficiency: { label: 'Car Efficiency', helper: 'Sensor for EV efficiency.' },
          car_charger_power: { label: 'Car Charger Power', helper: 'Sensor for EV charger power.' },
          car1_label: { label: 'Car 1 Label', helper: 'Text displayed next to the first EV values.' },
          sensor_car2_power: { label: 'Car 2 Power Sensor' },
          car2_power: { label: 'Car 2 Power', helper: 'Sensor for EV 2 charge/discharge power.' },
          sensor_car2_soc: { label: 'Car 2 SOC Sensor' },
          car2_soc: { label: 'Car 2 SOC', helper: 'Sensor for EV 2 battery SOC.' },
          car2_range: { label: 'Car 2 Range', helper: 'Sensor for EV 2 range.' },
          car2_efficiency: { label: 'Car 2 Efficiency', helper: 'Sensor for EV 2 efficiency.' },
          car2_charger_power: { label: 'Car 2 Charger Power', helper: 'Sensor for EV 2 charger power.' },
          car2_label: { label: 'Car 2 Label', helper: 'Text displayed next to the second EV values.' },
          show_car_soc: { label: 'Show Car 1', helper: 'Toggle to render the first EV metrics.' },
          show_car2: { label: 'Show Car 2', helper: 'Enable to render the second EV metrics when sensors are provided.' },
          car_pct_color: { label: 'Car SOC Color', helper: 'Hex color for EV SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Car 2 SOC Color', helper: 'Hex color for second EV SOC text (falls back to Car SOC Color).' },
          car1_name_color: { label: 'Car 1 Name Color', helper: 'Color applied to the Car 1 name label.' },
          car2_name_color: { label: 'Car 2 Name Color', helper: 'Color applied to the Car 2 name label.' },
          car1_color: { label: 'Car 1 Color', helper: 'Color applied to Car 1 power value.' },
          car2_color: { label: 'Car 2 Color', helper: 'Color applied to Car 2 power value.' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Default 16' },
          daily_label_font_size: { label: 'Daily Label Font Size (px)', helper: 'Default 12' },
          daily_value_font_size: { label: 'Daily Value Font Size (px)', helper: 'Default 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Default 16' },
          battery_soc_font_size: { label: 'Battery SOC Font Size (px)', helper: 'Default 20' },
          battery_power_font_size: { label: 'Battery Power Font Size (px)', helper: 'Default 16' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Default 15' },
          grid_font_size: { label: 'Grid Font Size (px)', helper: 'Default 15' },
          car_power_font_size: { label: 'Car Power Font Size (px)', helper: 'Default 15' },
          car2_power_font_size: { label: 'Car 2 Power Font Size (px)', helper: 'Default 15' },
          car_name_font_size: { label: 'Car Name Font Size (px)', helper: 'Default 15' },
          car2_name_font_size: { label: 'Car 2 Name Font Size (px)', helper: 'Default 15' },
          car_soc_font_size: { label: 'Car SOC Font Size (px)', helper: 'Default 12' },
          car2_soc_font_size: { label: 'Car 2 SOC Font Size (px)', helper: 'Default 12' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entity for PV popup line 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entity for PV popup line 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entity for PV popup line 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entity for PV popup line 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entity for PV popup line 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entity for PV popup line 6.' },
          sensor_popup_pv_1_name: { label: 'PV Popup 1 Name', helper: 'Optional custom name for PV popup line 1. Leave blank to use entity name.' },
          sensor_popup_pv_2_name: { label: 'PV Popup 2 Name', helper: 'Optional custom name for PV popup line 2. Leave blank to use entity name.' },
          sensor_popup_pv_3_name: { label: 'PV Popup 3 Name', helper: 'Optional custom name for PV popup line 3. Leave blank to use entity name.' },
          sensor_popup_pv_4_name: { label: 'PV Popup 4 Name', helper: 'Optional custom name for PV popup line 4. Leave blank to use entity name.' },
          sensor_popup_pv_5_name: { label: 'PV Popup 5 Name', helper: 'Optional custom name for PV popup line 5. Leave blank to use entity name.' },
          sensor_popup_pv_6_name: { label: 'PV Popup 6 Name', helper: 'Optional custom name for PV popup line 6. Leave blank to use entity name.' },
          sensor_popup_pv_1_color: { label: 'PV Popup 1 Color', helper: 'Color for PV popup line 1 text.' },
          sensor_popup_pv_2_color: { label: 'PV Popup 2 Color', helper: 'Color for PV popup line 2 text.' },
          sensor_popup_pv_3_color: { label: 'PV Popup 3 Color', helper: 'Color for PV popup line 3 text.' },
          sensor_popup_pv_4_color: { label: 'PV Popup 4 Color', helper: 'Color for PV popup line 4 text.' },
          sensor_popup_pv_5_color: { label: 'PV Popup 5 Color', helper: 'Color for PV popup line 5 text.' },
          sensor_popup_pv_6_color: { label: 'PV Popup 6 Color', helper: 'Color for PV popup line 6 text.' },
          sensor_popup_pv_1_font_size: { label: 'PV Popup 1 Font Size (px)', helper: 'Font size for PV popup line 1. Default 16' },
          sensor_popup_pv_2_font_size: { label: 'PV Popup 2 Font Size (px)', helper: 'Font size for PV popup line 2. Default 16' },
          sensor_popup_pv_3_font_size: { label: 'PV Popup 3 Font Size (px)', helper: 'Font size for PV popup line 3. Default 16' },
          sensor_popup_pv_4_font_size: { label: 'PV Popup 4 Font Size (px)', helper: 'Font size for PV popup line 4. Default 16' },
          sensor_popup_pv_5_font_size: { label: 'PV Popup 5 Font Size (px)', helper: 'Font size for PV popup line 5. Default 16' },
          sensor_popup_pv_6_font_size: { label: 'PV Popup 6 Font Size (px)', helper: 'Font size for PV popup line 6. Default 16' },
          sensor_popup_house_1: { label: 'House Popup 1', helper: 'Entity for house popup line 1.' },
          sensor_popup_house_1_name: { label: 'House Popup 1 Name', helper: 'Optional custom name for house popup line 1. Leave blank to use entity name.' },
          sensor_popup_house_1_color: { label: 'House Popup 1 Color', helper: 'Color for house popup line 1 text.' },
          sensor_popup_house_1_font_size: { label: 'House Popup 1 Font Size (px)', helper: 'Font size for house popup line 1. Default 16' },
          sensor_popup_house_2: { label: 'House Popup 2', helper: 'Entity for house popup line 2.' },
          sensor_popup_house_2_name: { label: 'House Popup 2 Name', helper: 'Optional custom name for house popup line 2. Leave blank to use entity name.' },
          sensor_popup_house_2_color: { label: 'House Popup 2 Color', helper: 'Color for house popup line 2 text.' },
          sensor_popup_house_2_font_size: { label: 'House Popup 2 Font Size (px)', helper: 'Font size for house popup line 2. Default 16' },
          sensor_popup_house_3: { label: 'House Popup 3', helper: 'Entity for house popup line 3.' },
          sensor_popup_house_3_name: { label: 'House Popup 3 Name', helper: 'Optional custom name for house popup line 3. Leave blank to use entity name.' },
          sensor_popup_house_3_color: { label: 'House Popup 3 Color', helper: 'Color for house popup line 3 text.' },
          sensor_popup_house_3_font_size: { label: 'House Popup 3 Font Size (px)', helper: 'Font size for house popup line 3. Default 16' },
          sensor_popup_house_4: { label: 'House Popup 4', helper: 'Entity for house popup line 4.' },
          sensor_popup_house_4_name: { label: 'House Popup 4 Name', helper: 'Optional custom name for house popup line 4. Leave blank to use entity name.' },
          sensor_popup_house_4_color: { label: 'House Popup 4 Color', helper: 'Color for house popup line 4 text.' },
          sensor_popup_house_4_font_size: { label: 'House Popup 4 Font Size (px)', helper: 'Font size for house popup line 4. Default 16' },
          sensor_popup_house_5: { label: 'House Popup 5', helper: 'Entity for house popup line 5.' },
          sensor_popup_house_5_name: { label: 'House Popup 5 Name', helper: 'Optional custom name for house popup line 5. Leave blank to use entity name.' },
          sensor_popup_house_5_color: { label: 'House Popup 5 Color', helper: 'Color for house popup line 5 text.' },
          sensor_popup_house_5_font_size: { label: 'House Popup 5 Font Size (px)', helper: 'Font size for house popup line 5. Default 16' },
          sensor_popup_house_6: { label: 'House Popup 6', helper: 'Entity for house popup line 6.' },
          sensor_popup_house_6_name: { label: 'House Popup 6 Name', helper: 'Optional custom name for house popup line 6. Leave blank to use entity name.' },
          sensor_popup_house_6_color: { label: 'House Popup 6 Color', helper: 'Color for house popup line 6 text.' },
          sensor_popup_house_6_font_size: { label: 'House Popup 6 Font Size (px)', helper: 'Font size for house popup line 6. Default 16' }
        },
        options: {
          languages: [
            { value: 'en', label: 'English' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Deutsch' },
            { value: 'fr', label: 'Français' },
            { value: 'nl', label: 'Nederlands' }
          ],
          display_units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Dashes (default)' },
            { value: 'dots', label: 'Dots' },
            { value: 'arrows', label: 'Arrows' }
          ],
          grid_flow_modes: [
            { value: 'grid_to_inverter', label: 'Grid to Inverter' },
            { value: 'grid_to_house_inverter', label: 'Grid to House - Inverter' }
          ]
        }
      ,
      view: {
        daily: 'DAILY YIELD',
        pv_tot: 'PV TOTAL',
        car1: 'CAR 1',
        car2: 'CAR 2',
        importing: 'IMPORTING',
        exporting: 'EXPORTING'
      }
      },
      it: {
        sections: {
          general: { title: 'Impostazioni generali', helper: 'Titolo scheda, sfondo, lingua e frequenza di aggiornamento.' },
          array1: { title: 'Array 1', helper: 'Configura le entita dell Array PV 1.' },
          array2: { title: 'Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          battery: { title: 'Batteria', helper: 'Configura le entita della batteria.' },
          grid: { title: 'Rete', helper: 'Configura le entita della rete.' },
          car: { title: 'Auto', helper: 'Configura le entita EV.' },
          entities: { title: 'Selezione entita', helper: 'Scegli le entita PV, batteria, rete, carico ed EV utilizzate dalla scheda. Come minimo deve essere specificato il sensore PV totale oppure gli array di stringhe PV.' },
          pvPopup: { title: 'PV Popup', helper: 'Configura le entita per la visualizzazione del popup PV.' },
          housePopup: { title: 'House Popup', helper: 'Configura le entita per la visualizzazione del popup casa.' },
          batteryPopup: { title: 'Popup Batteria', helper: 'Configura il popup della batteria.' },
          colors: { title: 'Colori e soglie', helper: 'Configura soglie della rete e colori di accento per i flussi.' },
          typography: { title: 'Tipografia', helper: 'Regola le dimensioni dei caratteri utilizzate nella scheda.' },
          about: { title: 'Informazioni', helper: 'Crediti, versione e link utili.' }
        },
        fields: {
          card_title: { label: 'Titolo scheda', helper: 'Titolo mostrato nella parte superiore della scheda. Lasciare vuoto per disabilitare.' },
          background_image: { label: 'Percorso immagine di sfondo', helper: 'Percorso dell immagine di sfondo (es. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Lingua', helper: 'Seleziona la lingua dell editor.' },
          display_unit: { label: 'Unita di visualizzazione', helper: 'Unita usata per i valori di potenza.' },
          update_interval: { label: 'Intervallo di aggiornamento', helper: 'Frequenza di aggiornamento della scheda (0 disattiva il limite).' },
          animation_speed_factor: { label: 'Fattore velocita animazioni', helper: 'Regola il moltiplicatore (-3x a 3x). Usa 0 per mettere in pausa; valori negativi invertono il flusso.' },
          animation_style: { label: 'Stile animazione', helper: 'Scegli il motivo dei flussi (tratteggi, punti o frecce).' },
          grid_flow_mode: { label: 'Flusso di rete', helper: 'Scegli come visualizzare i flussi di rete.' },
          
          sensor_pv_total: { label: 'Sensore PV totale', helper: 'Sensore aggregato opzionale mostrato come linea combinata.' },
          sensor_pv_total_secondary: { label: 'Sensore PV totale (Inverter 2)', helper: 'Secondo sensore inverter opzionale; viene sommato al totale PV.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Sensore principale di produzione solare.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          solar_array2_title: { label: 'Array 2 (Opzionale)' },
          show_pv_strings: { label: 'Mostra stringhe PV', helper: 'Attiva per mostrare la linea totale piu ogni stringa PV separata.' },
          sensor_daily: { label: 'Sensore produzione giornaliera (Obbligatorio)', helper: 'Sensore che riporta la produzione giornaliera. Come minimo deve essere specificato il sensore PV totale oppure gli array di stringhe PV.' },
          sensor_daily_array2: { label: 'Sensore produzione giornaliera (Array 2)', helper: 'Sensore che riporta la produzione giornaliera per l Array 2.' },
          sensor_bat1_soc: { label: 'Batteria 1 SOC' },
          sensor_bat1_power: { label: 'Batteria 1 potenza' },
          sensor_bat2_soc: { label: 'Batteria 2 SOC' },
          sensor_bat2_power: { label: 'Batteria 2 potenza' },
          sensor_bat3_soc: { label: 'Batteria 3 SOC' },
          sensor_bat3_power: { label: 'Batteria 3 potenza' },
          sensor_bat4_soc: { label: 'Batteria 4 SOC' },
          sensor_bat4_power: { label: 'Batteria 4 potenza' },
          sensor_home_load: { label: 'Carico casa/consumo (Obbligatorio)', helper: 'Sensore del consumo totale dell abitazione.' },
          sensor_home_load_secondary: { label: 'Carico casa (Inverter 2)', helper: 'Sensore opzionale del carico domestico per il secondo inverter.' },
          sensor_grid_power: { label: 'Potenza rete', helper: 'Sensore flusso rete positivo/negativo. Specificare o questo sensore o entrambi il Sensore import rete e il Sensore export rete.' },
          sensor_grid_import: { label: 'Sensore import rete', helper: 'Entita opzionale che riporta la potenza di import.' },
          sensor_grid_export: { label: 'Sensore export rete', helper: 'Entita opzionale che riporta la potenza di export.' },
          sensor_grid_import_daily: { label: 'Sensore import rete giornaliero', helper: 'Entita opzionale che riporta l import cumulativo della rete per il giorno corrente.' },
          sensor_grid_export_daily: { label: 'Sensore export rete giornaliero', helper: 'Entita opzionale che riporta l export cumulativo della rete per il giorno corrente.' },
          show_daily_grid: { label: 'Mostra valori rete giornalieri', helper: 'Mostra i totali import/export giornalieri sotto il flusso rete corrente quando abilitato.' },
          pv_primary_color: { label: 'Colore flusso FV 1', helper: 'Colore utilizzato per l animazione FV principale.' },
          pv_tot_color: { label: 'Colore PV TOTALE', helper: 'Colore applicato alla riga PV TOTALE.' },
          pv_secondary_color: { label: 'Colore flusso FV 2', helper: 'Colore utilizzato per la seconda linea FV quando presente.' },
          pv_string1_color: { label: 'Colore stringa FV 1', helper: 'Sovrascrive il colore di S1. Lascia vuoto per usare il colore totale FV.' },
          pv_string2_color: { label: 'Colore stringa FV 2', helper: 'Sovrascrive il colore di S2. Lascia vuoto per usare il colore totale FV.' },
          pv_string3_color: { label: 'Colore stringa FV 3', helper: 'Sovrascrive il colore di S3. Lascia vuoto per usare il colore totale FV.' },
          pv_string4_color: { label: 'Colore stringa FV 4', helper: 'Sovrascrive il colore di S4. Lascia vuoto per usare il colore totale FV.' },
          pv_string5_color: { label: 'Colore stringa FV 5', helper: 'Sovrascrive il colore di S5. Lascia vuoto per usare il colore totale FV.' },
          pv_string6_color: { label: 'Colore stringa FV 6', helper: 'Sovrascrive il colore di S6. Lascia vuoto per usare il colore totale FV.' },
          load_flow_color: { label: 'Colore flusso carico', helper: 'Colore applicato all animazione del carico della casa.' },
          house_total_color: { label: 'Colore HOUSE TOT', helper: 'Colore applicato al testo/flusso HOUSE TOT.' },
          inv1_color: { label: 'Colore INV 1', helper: 'Colore applicato al testo/flusso INV 1.' },
          inv2_color: { label: 'Colore INV 2', helper: 'Colore applicato al testo/flusso INV 2.' },
          load_threshold_warning: { label: 'Soglia avviso carico', helper: 'Cambia colore quando il carico raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          load_warning_color: { label: 'Colore avviso carico', helper: 'Colore applicato alla soglia di avviso del carico.' },
          load_threshold_critical: { label: 'Soglia critica carico', helper: 'Cambia colore quando il carico raggiunge questa soglia critica. Usa l unita di visualizzazione selezionata.' },
          load_critical_color: { label: 'Colore critico carico', helper: 'Colore applicato alla soglia critica del carico.' },
          battery_charge_color: { label: 'Colore flusso carica batteria', helper: 'Colore quando l energia entra nella batteria.' },
          battery_discharge_color: { label: 'Colore flusso scarica batteria', helper: 'Colore quando l energia esce dalla batteria.' },
          grid_import_color: { label: 'Colore import da rete', helper: 'Colore base (prima delle soglie) quando si importa dalla rete.' },
          grid_export_color: { label: 'Colore export verso rete', helper: 'Colore base (prima delle soglie) quando si esporta verso la rete.' },
          car_flow_color: { label: 'Colore flusso EV', helper: 'Colore applicato all animazione del veicolo elettrico.' },
          battery_fill_high_color: { label: 'Colore riempimento batteria (normale)', helper: 'Colore del liquido batteria quando la SOC supera la soglia bassa.' },
          battery_fill_low_color: { label: 'Colore riempimento batteria (basso)', helper: 'Colore del liquido batteria quando la SOC è uguale o inferiore alla soglia bassa.' },
          battery_fill_low_threshold: { label: 'Soglia SOC bassa batteria (%)', helper: 'Usa il colore di riempimento basso quando la SOC è uguale o inferiore a questa percentuale.' },
          grid_activity_threshold: { label: 'Soglia animazione rete (W)', helper: 'Ignora i flussi rete con magnitudine inferiore a questo valore prima di animarli.' },
          grid_threshold_warning: { label: 'Soglia avviso rete', helper: 'Cambia colore quando la magnitudine raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid_warning_color: { label: 'Colore avviso rete', helper: 'Colore applicato alla soglia di avviso.' },
          grid_threshold_critical: { label: 'Soglia critica rete', helper: 'Cambia colore quando la magnitudine raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid_critical_color: { label: 'Colore critico rete', helper: 'Colore applicato alla soglia critica.' },
            invert_grid: { label: 'Inverti valori rete', helper: 'Attiva se l import/export ha polarita invertita.' },
            invert_battery: { label: 'Inverti valori batteria', helper: 'Abilita se la polarita carica/scarica e invertita.' },
          sensor_car_power: { label: 'Sensore potenza auto 1' },
          sensor_car_soc: { label: 'Sensore SOC auto 1' },
          car_soc: { label: 'SOC Auto', helper: 'Sensore per SOC batteria EV.' },
          car_range: { label: 'Autonomia Auto', helper: 'Sensore per autonomia EV.' },
          car_efficiency: { label: 'Efficienza Auto', helper: 'Sensore per efficienza EV.' },
          car_charger_power: { label: 'Potenza Caricabatterie Auto', helper: 'Sensore per potenza caricabatterie EV.' },
          car1_label: { label: 'Etichetta Auto 1', helper: 'Testo mostrato vicino ai valori della prima EV.' },
          sensor_car2_power: { label: 'Sensore potenza auto 2' },
          car2_power: { label: 'Potenza Auto 2', helper: 'Sensore per potenza carica/scarica EV 2.' },
          sensor_car2_soc: { label: 'Sensore SOC auto 2' },
          car2_soc: { label: 'SOC Auto 2', helper: 'Sensore per SOC batteria EV 2.' },
          car2_range: { label: 'Autonomia Auto 2', helper: 'Sensore per autonomia EV 2.' },
          car2_efficiency: { label: 'Efficienza Auto 2', helper: 'Sensore per efficienza EV 2.' },
          car2_charger_power: { label: 'Potenza Caricabatterie Auto 2', helper: 'Sensore per potenza caricabatterie EV 2.' },
          car2_label: { label: 'Etichetta Auto 2', helper: 'Testo mostrato vicino ai valori della seconda EV.' },
          show_car_soc: { label: 'Mostra veicolo elettrico 1', helper: 'Attiva per visualizzare i dati della prima EV.' },
          show_car2: { label: 'Mostra veicolo elettrico 2', helper: 'Attiva e fornisci i sensori per visualizzare la seconda EV.' },
          car_pct_color: { label: 'Colore SOC auto', helper: 'Colore esadecimale per il testo SOC EV (es. #00FFFF).' },
          car2_pct_color: { label: 'Colore SOC Auto 2', helper: 'Colore esadecimale per il testo SOC della seconda EV (usa Car SOC se vuoto).' },
          car1_name_color: { label: 'Colore nome Auto 1', helper: 'Colore applicato all etichetta del nome Auto 1.' },
          car2_name_color: { label: 'Colore nome Auto 2', helper: 'Colore applicato all etichetta del nome Auto 2.' },
          car1_color: { label: 'Colore Auto 1', helper: 'Colore applicato al valore potenza Auto 1.' },
          car2_color: { label: 'Colore Auto 2', helper: 'Colore applicato al valore potenza Auto 2.' },
          header_font_size: { label: 'Dimensione titolo (px)', helper: 'Predefinita 16' },
          daily_label_font_size: { label: 'Dimensione etichetta giornaliera (px)', helper: 'Predefinita 12' },
          daily_value_font_size: { label: 'Dimensione valore giornaliero (px)', helper: 'Predefinita 20' },
          pv_font_size: { label: 'Dimensione testo PV (px)', helper: 'Predefinita 16' },
          battery_soc_font_size: { label: 'Dimensione SOC batteria (px)', helper: 'Predefinita 20' },
          battery_power_font_size: { label: 'Dimensione potenza batteria (px)', helper: 'Predefinita 16' },
          load_font_size: { label: 'Dimensione carico (px)', helper: 'Predefinita 15' },
          grid_font_size: { label: 'Dimensione rete (px)', helper: 'Predefinita 15' },
          car_power_font_size: { label: 'Dimensione potenza auto (px)', helper: 'Predefinita 15' },
          car2_power_font_size: { label: 'Dimensione potenza Auto 2 (px)', helper: 'Predefinita 15' },
          car_name_font_size: { label: 'Dimensione nome auto (px)', helper: 'Predefinita come la dimensione potenza auto' },
          car2_name_font_size: { label: 'Dimensione nome Auto 2 (px)', helper: 'Predefinita come la dimensione potenza Auto 2' },
          car_soc_font_size: { label: 'Dimensione SOC auto (px)', helper: 'Predefinita 12' },
          car2_soc_font_size: { label: 'Dimensione SOC Auto 2 (px)', helper: 'Predefinita 12' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entita per la riga 1 del popup PV.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entita per la riga 2 del popup PV.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entita per la riga 3 del popup PV.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entita per la riga 4 del popup PV.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entita per la riga 5 del popup PV.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entita per la riga 6 del popup PV.' },
          sensor_popup_pv_1_name: { label: 'Nome PV Popup 1', helper: 'Nome personalizzato opzionale per la riga 1 del popup PV. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_pv_2_name: { label: 'Nome PV Popup 2', helper: 'Nome personalizzato opzionale per la riga 2 del popup PV. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_pv_3_name: { label: 'Nome PV Popup 3', helper: 'Nome personalizzato opzionale per la riga 3 del popup PV. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_pv_4_name: { label: 'Nome PV Popup 4', helper: 'Nome personalizzato opzionale per la riga 4 del popup PV. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_pv_5_name: { label: 'Nome PV Popup 5', helper: 'Nome personalizzato opzionale per la riga 5 del popup PV. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_pv_6_name: { label: 'Nome PV Popup 6', helper: 'Nome personalizzato opzionale per la riga 6 del popup PV. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_pv_1_color: { label: 'Colore PV Popup 1', helper: 'Colore per il testo della riga 1 del popup PV.' },
          sensor_popup_pv_2_color: { label: 'Colore PV Popup 2', helper: 'Colore per il testo della riga 2 del popup PV.' },
          sensor_popup_pv_3_color: { label: 'Colore PV Popup 3', helper: 'Colore per il testo della riga 3 del popup PV.' },
          sensor_popup_pv_4_color: { label: 'Colore PV Popup 4', helper: 'Colore per il testo della riga 4 del popup PV.' },
          sensor_popup_pv_5_color: { label: 'Colore PV Popup 5', helper: 'Colore per il testo della riga 5 del popup PV.' },
          sensor_popup_pv_6_color: { label: 'Colore PV Popup 6', helper: 'Colore per il testo della riga 6 del popup PV.' },
          sensor_popup_pv_1_font_size: { label: 'Dimensione carattere PV Popup 1 (px)', helper: 'Dimensione carattere per la riga 1 del popup PV. Predefinita 16' },
          sensor_popup_pv_2_font_size: { label: 'Dimensione carattere PV Popup 2 (px)', helper: 'Dimensione carattere per la riga 2 del popup PV. Predefinita 16' },
          sensor_popup_pv_3_font_size: { label: 'Dimensione carattere PV Popup 3 (px)', helper: 'Dimensione carattere per la riga 3 del popup PV. Predefinita 16' },
          sensor_popup_pv_4_font_size: { label: 'Dimensione carattere PV Popup 4 (px)', helper: 'Dimensione carattere per la riga 4 del popup PV. Predefinita 16' },
          sensor_popup_pv_5_font_size: { label: 'Dimensione carattere PV Popup 5 (px)', helper: 'Dimensione carattere per la riga 5 del popup PV. Predefinita 16' },
          sensor_popup_pv_6_font_size: { label: 'Dimensione carattere PV Popup 6 (px)', helper: 'Dimensione carattere per la riga 6 del popup PV. Predefinita 16' },
          sensor_popup_house_1: { label: 'House Popup 1', helper: 'Entita per la riga 1 del popup casa.' },
          sensor_popup_house_1_name: { label: 'Nome House Popup 1', helper: 'Nome personalizzato opzionale per la riga 1 del popup casa. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_house_1_color: { label: 'Colore House Popup 1', helper: 'Colore per il testo della riga 1 del popup casa.' },
          sensor_popup_house_1_font_size: { label: 'Dimensione carattere House Popup 1 (px)', helper: 'Dimensione carattere per la riga 1 del popup casa. Predefinita 16' },
          sensor_popup_house_2: { label: 'House Popup 2', helper: 'Entita per la riga 2 del popup casa.' },
          sensor_popup_house_2_name: { label: 'Nome House Popup 2', helper: 'Nome personalizzato opzionale per la riga 2 del popup casa. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_house_2_color: { label: 'Colore House Popup 2', helper: 'Colore per il testo della riga 2 del popup casa.' },
          sensor_popup_house_2_font_size: { label: 'Dimensione carattere House Popup 2 (px)', helper: 'Dimensione carattere per la riga 2 del popup casa. Predefinita 16' },
          sensor_popup_house_3: { label: 'House Popup 3', helper: 'Entita per la riga 3 del popup casa.' },
          sensor_popup_house_3_name: { label: 'Nome House Popup 3', helper: 'Nome personalizzato opzionale per la riga 3 del popup casa. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_house_3_color: { label: 'Colore House Popup 3', helper: 'Colore per il testo della riga 3 del popup casa.' },
          sensor_popup_house_3_font_size: { label: 'Dimensione carattere House Popup 3 (px)', helper: 'Dimensione carattere per la riga 3 del popup casa. Predefinita 16' },
          sensor_popup_house_4: { label: 'House Popup 4', helper: 'Entita per la riga 4 del popup casa.' },
          sensor_popup_house_4_name: { label: 'Nome House Popup 4', helper: 'Nome personalizzato opzionale per la riga 4 del popup casa. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_house_4_color: { label: 'Colore House Popup 4', helper: 'Colore per il testo della riga 4 del popup casa.' },
          sensor_popup_house_4_font_size: { label: 'Dimensione carattere House Popup 4 (px)', helper: 'Dimensione carattere per la riga 4 del popup casa. Predefinita 16' },
          sensor_popup_house_5: { label: 'House Popup 5', helper: 'Entita per la riga 5 del popup casa.' },
          sensor_popup_house_5_name: { label: 'Nome House Popup 5', helper: 'Nome personalizzato opzionale per la riga 5 del popup casa. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_house_5_color: { label: 'Colore House Popup 5', helper: 'Colore per il testo della riga 5 del popup casa.' },
          sensor_popup_house_5_font_size: { label: 'Dimensione carattere House Popup 5 (px)', helper: 'Dimensione carattere per la riga 5 del popup casa. Predefinita 16' },
          sensor_popup_house_6: { label: 'House Popup 6', helper: 'Entita per la riga 6 del popup casa.' },
          sensor_popup_house_6_name: { label: 'Nome House Popup 6', helper: 'Nome personalizzato opzionale per la riga 6 del popup casa. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_house_6_color: { label: 'Colore House Popup 6', helper: 'Colore per il testo della riga 6 del popup casa.' },
          sensor_popup_house_6_font_size: { label: 'Dimensione carattere House Popup 6 (px)', helper: 'Dimensione carattere per la riga 6 del popup casa. Predefinita 16' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Inglese' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Tedesco' },
            { value: 'fr', label: 'Francese' },
            { value: 'nl', label: 'Olandese' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Tratteggi (predefinito)' },
            { value: 'dots', label: 'Punti' },
            { value: 'arrows', label: 'Frecce' }
          ],
          grid_flow_modes: [
            { value: 'grid_to_inverter', label: 'Rete a Inverter' },
            { value: 'grid_to_house_inverter', label: 'Rete a Casa - Inverter' }
          ]
        }
      ,
      view: {
        daily: 'PRODUZIONE OGGI',
        pv_tot: 'PV TOTALE',
        car1: 'AUTO 1',
        car2: 'AUTO 2',
        importing: 'IMPORTAZIONE',
        exporting: 'ESPORTAZIONE'
      }
      },
      de: {
        sections: {
          general: { title: 'Allgemeine Einstellungen', helper: 'Kartentitel, Hintergrund, Sprache und Aktualisierungsintervall.' },
          array1: { title: 'Array 1', helper: 'PV Array 1 Entitaeten konfigurieren.' },
          array2: { title: 'Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          battery: { title: 'Batterie', helper: 'Batterie-Entitaeten konfigurieren.' },
          grid: { title: 'Netz', helper: 'Netz-Entitaeten konfigurieren.' },
          car: { title: 'Auto', helper: 'EV-Entitaeten konfigurieren.' },
          entities: { title: 'Entitaetenauswahl', helper: 'PV-, Batterie-, Netz-, Verbrauchs- und optionale EV-Entitaeten waehlen. Entweder der PV-Gesamt-Sensor oder Ihre PV-String-Arrays muessen mindestens angegeben werden.' },
          pvPopup: { title: 'PV Popup', helper: 'Entitaeten fuer die PV-Popup-Anzeige konfigurieren.' },
          housePopup: { title: 'House Popup', helper: 'Entitaeten fuer die House-Popup-Anzeige konfigurieren.' },
          batteryPopup: { title: 'Batterie-Popup', helper: 'Konfigurieren Sie die Batterie-Popup-Anzeige.' },
          colors: { title: 'Farben & Schwellwerte', helper: 'Grenzwerte und Farben fuer Netz- und EV-Anzeige einstellen.' },
          typography: { title: 'Typografie', helper: 'Schriftgroessen der Karte feinjustieren.' },
          about: { title: 'Info', helper: 'Credits, Version und nuetzliche Links.' }
        },
        fields: {
          card_title: { label: 'Kartentitel', helper: 'Titel oben auf der Karte. Leer lassen, um zu deaktivieren.' },
          background_image: { label: 'Pfad zum Hintergrundbild', helper: 'Pfad zum Hintergrundbild (z. B. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Sprache', helper: 'Editor-Sprache waehlen.' },
          display_unit: { label: 'Anzeigeeinheit', helper: 'Einheit fuer Leistungswerte.' },
          update_interval: { label: 'Aktualisierungsintervall', helper: 'Aktualisierungsfrequenz der Karte (0 deaktiviert das Limit).' },
          animation_speed_factor: { label: 'Animationsgeschwindigkeit', helper: 'Animationsfaktor zwischen -3x und 3x. 0 pausiert, negative Werte kehren den Fluss um.' },
          animation_style: { label: 'Animationsstil', helper: 'Motiv der Flussanimation waehlen (Striche, Punkte oder Pfeile).' },
          grid_flow_mode: { label: 'Netzfluss', helper: 'Waehlen, wie Netzfluesse angezeigt werden.' },
          
          sensor_pv_total: { label: 'PV Gesamt Sensor', helper: 'Optionaler aggregierter Sensor fuer die kombinierte Linie.' },
          sensor_pv_total_secondary: { label: 'PV Gesamt Sensor (WR 2)', helper: 'Optionaler zweiter Wechselrichter; wird mit dem PV-Gesamtwert addiert.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Primaerer Solarsensor.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          solar_array2_title: { label: 'Array 2 (Optional)' },
          show_pv_strings: { label: 'PV Strings einzeln anzeigen', helper: 'Gesamte Linie plus jede PV-String-Zeile separat einblenden.' },
          sensor_daily: { label: 'Tagesproduktion Sensor (Erforderlich)', helper: 'Sensor fuer taegliche Produktionssumme. Entweder der PV-Gesamt-Sensor oder Ihre PV-String-Arrays muessen mindestens angegeben werden.' },
          sensor_daily_array2: { label: 'Tagesproduktion Sensor (Array 2)', helper: 'Sensor fuer die taegliche Produktionssumme von Array 2.' },
          sensor_bat1_soc: { label: 'Batterie 1 SOC' },
          sensor_bat1_power: { label: 'Batterie 1 Leistung' },
          sensor_bat2_soc: { label: 'Batterie 2 SOC' },
          sensor_bat2_power: { label: 'Batterie 2 Leistung' },
          sensor_bat3_soc: { label: 'Batterie 3 SOC' },
          sensor_bat3_power: { label: 'Batterie 3 Leistung' },
          sensor_bat4_soc: { label: 'Batterie 4 SOC' },
          sensor_bat4_power: { label: 'Batterie 4 Leistung' },
          sensor_home_load: { label: 'Hausverbrauch (Erforderlich)', helper: 'Sensor fuer Gesamtverbrauch des Haushalts.' },
          sensor_home_load_secondary: { label: 'Hausverbrauch (WR 2)', helper: 'Optionale Hauslast-Entitaet fuer den zweiten Wechselrichter.' },
          sensor_grid_power: { label: 'Netzleistung', helper: 'Sensor fuer positiven/negativen Netzfluss. Geben Sie entweder diesen Sensor an oder sowohl den Netzimport-Sensor als auch den Netzexport-Sensor.' },
          sensor_grid_import: { label: 'Netzimport Sensor', helper: 'Optionale Entitaet fuer positiven Netzimport.' },
          sensor_grid_export: { label: 'Netzexport Sensor', helper: 'Optionale Entitaet fuer positiven Netzexport.' },
          sensor_grid_import_daily: { label: 'Tages-Netzimport Sensor', helper: 'Optionale Entitaet, die den kumulierten Netzimport fuer den aktuellen Tag meldet.' },
          sensor_grid_export_daily: { label: 'Tages-Netzexport Sensor', helper: 'Optionale Entitaet, die den kumulierten Netzexport fuer den aktuellen Tag meldet.' },
          show_daily_grid: { label: 'Tages-Netzwerte anzeigen', helper: 'Zeigt die taeglichen Import-/Exporttotalen unter dem aktuellen Netzfluss an, wenn aktiviert.' },
          pv_primary_color: { label: 'PV 1 Flussfarbe', helper: 'Farbe fuer die primaere PV-Animationslinie.' },
          pv_tot_color: { label: 'PV Gesamt Farbe', helper: 'Farbe fuer die PV Gesamt Zeile.' },
          pv_secondary_color: { label: 'PV 2 Flussfarbe', helper: 'Farbe fuer die zweite PV-Linie (falls vorhanden).' },
          pv_string1_color: { label: 'PV String 1 Farbe', helper: 'Ueberschreibt die Farbe fuer S1. Leer lassen um die PV-Gesamtfarbe zu nutzen.' },
          pv_string2_color: { label: 'PV String 2 Farbe', helper: 'Ueberschreibt die Farbe fuer S2. Leer lassen um die PV-Gesamtfarbe zu nutzen.' },
          pv_string3_color: { label: 'PV String 3 Farbe', helper: 'Ueberschreibt die Farbe fuer S3. Leer lassen um die PV-Gesamtfarbe zu nutzen.' },
          pv_string4_color: { label: 'PV String 4 Farbe', helper: 'Ueberschreibt die Farbe fuer S4. Leer lassen um die PV-Gesamtfarbe zu nutzen.' },
          pv_string5_color: { label: 'PV String 5 Farbe', helper: 'Ueberschreibt die Farbe fuer S5. Leer lassen um die PV-Gesamtfarbe zu nutzen.' },
          pv_string6_color: { label: 'PV String 6 Farbe', helper: 'Ueberschreibt die Farbe fuer S6. Leer lassen um die PV-Gesamtfarbe zu nutzen.' },
          load_flow_color: { label: 'Lastflussfarbe', helper: 'Farbe fuer die Hausverbrauch-Animationslinie.' },
          house_total_color: { label: 'House Total Farbe', helper: 'Farbe fuer HOUSE TOT Text/Fluss.' },
          inv1_color: { label: 'INV 1 Farbe', helper: 'Farbe fuer INV 1 Text/Fluss.' },
          inv2_color: { label: 'INV 2 Farbe', helper: 'Farbe fuer INV 2 Text/Fluss.' },
          load_threshold_warning: { label: 'Last Warnschwelle', helper: 'Farbe wechseln, wenn der Verbrauch diese Magnitude erreicht. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          load_warning_color: { label: 'Last Warnfarbe', helper: 'Farbe bei Erreichen der Warnschwelle des Hausverbrauchs.' },
          load_threshold_critical: { label: 'Last Kritische Schwelle', helper: 'Farbe wechseln, wenn der Verbrauch diese kritische Magnitude erreicht. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          load_critical_color: { label: 'Last Kritische Farbe', helper: 'Farbe bei Erreichen der kritischen Hausverbrauchsschwelle.' },
          battery_charge_color: { label: 'Batterie Ladeflussfarbe', helper: 'Farbe wenn Energie in die Batterie fliesst.' },
          battery_discharge_color: { label: 'Batterie Entladeflussfarbe', helper: 'Farbe wenn Energie aus der Batterie fliesst.' },
          grid_import_color: { label: 'Netzimport Flussfarbe', helper: 'Basisfarbe (vor Schwellwerten) beim Netzimport.' },
          grid_export_color: { label: 'Netzexport Flussfarbe', helper: 'Basisfarbe (vor Schwellwerten) beim Netzexport.' },
          car_flow_color: { label: 'EV Flussfarbe', helper: 'Farbe fuer die EV-Animationslinie.' },
          battery_fill_high_color: { label: 'Batterie Fuellfarbe (normal)', helper: 'Fluessigkeitsfarbe wenn die Batterie-SOC ueber dem niedrigen Schwellwert liegt.' },
          battery_fill_low_color: { label: 'Batterie Fuellfarbe (niedrig)', helper: 'Fluessigkeitsfarbe wenn die Batterie-SOC dem niedrigen Schwellwert entspricht oder darunter liegt.' },
          battery_fill_low_threshold: { label: 'Niedriger SOC-Schwellenwert (%)', helper: 'Verwende die niedrige Fuellfarbe, wenn die Batterie-SOC diesen Prozentsatz erreicht oder unterschreitet.' },
          grid_activity_threshold: { label: 'Netz Animationsschwelle (W)', helper: 'Ignoriere Netzfluesse mit geringerer Absolutleistung, bevor animiert wird.' },
          grid_threshold_warning: { label: 'Netz Warnschwelle', helper: 'Farbe wechseln, wenn diese Magnitude erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid_warning_color: { label: 'Netz Warnfarbe', helper: 'Farbe bei Erreichen der Warnschwelle.' },
          grid_threshold_critical: { label: 'Netz Kritische Schwelle', helper: 'Farbe wechseln, wenn diese Magnitude erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid_critical_color: { label: 'Netz Kritische Farbe', helper: 'Farbe bei Erreichen der kritischen Schwelle.' },
          invert_grid: { label: 'Netzwerte invertieren', helper: 'Aktivieren, wenn Import/Export vertauscht ist.' },
          invert_battery: { label: 'Batterie-Werte invertieren', helper: 'Aktivieren, wenn Lade-/Entlade-Polarität vertauscht ist.' },
          sensor_car_power: { label: 'Fahrzeugleistung Sensor 1' },
          sensor_car_soc: { label: 'Fahrzeug SOC Sensor 1' },
          car_soc: { label: 'Fahrzeug SOC', helper: 'Sensor für EV-Batterie SOC.' },
          car_range: { label: 'Fahrzeug Reichweite', helper: 'Sensor für EV-Reichweite.' },
          car_efficiency: { label: 'Fahrzeug Effizienz', helper: 'Sensor für EV-Effizienz.' },
          car_charger_power: { label: 'Fahrzeug Ladegerät Leistung', helper: 'Sensor für EV-Ladegerät Leistung.' },
          car1_label: { label: 'Bezeichnung Fahrzeug 1', helper: 'Text neben den Werten des ersten EV.' },
          sensor_car2_power: { label: 'Fahrzeugleistung Sensor 2' },
          sensor_car2_soc: { label: 'Fahrzeug SOC Sensor 2' },
          car2_soc: { label: 'Fahrzeug 2 SOC', helper: 'Sensor für EV 2-Batterie SOC.' },
          car2_range: { label: 'Fahrzeug 2 Reichweite', helper: 'Sensor für EV 2-Reichweite.' },
          car2_efficiency: { label: 'Fahrzeug 2 Effizienz', helper: 'Sensor für EV 2-Effizienz.' },
          car2_charger_power: { label: 'Fahrzeug 2 Ladegerät Leistung', helper: 'Sensor für EV 2-Ladegerät Leistung.' },
          car2_power: { label: 'Fahrzeug 2 Leistung', helper: 'Sensor für EV 2-Lade-/Entladeleistung.' },
          car2_label: { label: 'Bezeichnung Fahrzeug 2', helper: 'Text neben den Werten des zweiten EV.' },
          show_car_soc: { label: 'Elektrofahrzeug 1 anzeigen', helper: 'Aktivieren, um die Werte des ersten Fahrzeugs anzuzeigen.' },
          show_car2: { label: 'Elektrofahrzeug 2 anzeigen', helper: 'Aktivieren und Sensoren zuweisen, um das zweite Fahrzeug zu zeigen.' },
          car_pct_color: { label: 'Farbe fuer SOC', helper: 'Hex Farbe fuer EV SOC Text (z. B. #00FFFF).' },
          car2_pct_color: { label: 'Farbe SOC Auto 2', helper: 'Hex Farbe fuer SOC Text des zweiten Fahrzeugs (faellt auf Car SOC zurueck).' },
          car1_name_color: { label: 'Farbe Name Auto 1', helper: 'Farbe fuer die Bezeichnung von Fahrzeug 1.' },
          car2_name_color: { label: 'Farbe Name Auto 2', helper: 'Farbe fuer die Bezeichnung von Fahrzeug 2.' },
          car1_color: { label: 'Farbe Auto 1', helper: 'Farbe fuer die Leistungsanzeige von Fahrzeug 1.' },
          car2_color: { label: 'Farbe Auto 2', helper: 'Farbe fuer die Leistungsanzeige von Fahrzeug 2.' },
          header_font_size: { label: 'Schriftgroesse Titel (px)', helper: 'Standard 16' },
          daily_label_font_size: { label: 'Schriftgroesse Tageslabel (px)', helper: 'Standard 12' },
          daily_value_font_size: { label: 'Schriftgroesse Tageswert (px)', helper: 'Standard 20' },
          pv_font_size: { label: 'Schriftgroesse PV Text (px)', helper: 'Standard 16' },
          battery_soc_font_size: { label: 'Schriftgroesse Batterie SOC (px)', helper: 'Standard 20' },
          battery_power_font_size: { label: 'Schriftgroesse Batterie Leistung (px)', helper: 'Standard 16' },
          load_font_size: { label: 'Schriftgroesse Last (px)', helper: 'Standard 15' },
          grid_font_size: { label: 'Schriftgroesse Netz (px)', helper: 'Standard 15' },
          car_power_font_size: { label: 'Schriftgroesse Fahrzeugleistung (px)', helper: 'Standard 15' },
          car_soc_font_size: { label: 'Schriftgroesse Fahrzeug SOC (px)', helper: 'Standard 12' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entitaet fuer PV Popup Zeile 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entitaet fuer PV Popup Zeile 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entitaet fuer PV Popup Zeile 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entitaet fuer PV Popup Zeile 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entitaet fuer PV Popup Zeile 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entitaet fuer PV Popup Zeile 6.' },
          sensor_popup_pv_1_name: { label: 'Name PV Popup 1', helper: 'Optionaler benutzerdefinierter Name fuer PV Popup Zeile 1. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_pv_2_name: { label: 'Name PV Popup 2', helper: 'Optionaler benutzerdefinierter Name fuer PV Popup Zeile 2. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_pv_3_name: { label: 'Name PV Popup 3', helper: 'Optionaler benutzerdefinierter Name fuer PV Popup Zeile 3. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_pv_4_name: { label: 'Name PV Popup 4', helper: 'Optionaler benutzerdefinierter Name fuer PV Popup Zeile 4. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_pv_5_name: { label: 'Name PV Popup 5', helper: 'Optionaler benutzerdefinierter Name fuer PV Popup Zeile 5. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_pv_6_name: { label: 'Name PV Popup 6', helper: 'Optionaler benutzerdefinierter Name fuer PV Popup Zeile 6. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_pv_1_color: { label: 'Farbe PV Popup 1', helper: 'Farbe fuer PV Popup Zeile 1 Text.' },
          sensor_popup_pv_2_color: { label: 'Farbe PV Popup 2', helper: 'Farbe fuer PV Popup Zeile 2 Text.' },
          sensor_popup_pv_3_color: { label: 'Farbe PV Popup 3', helper: 'Farbe fuer PV Popup Zeile 3 Text.' },
          sensor_popup_pv_4_color: { label: 'Farbe PV Popup 4', helper: 'Farbe fuer PV Popup Zeile 4 Text.' },
          sensor_popup_pv_5_color: { label: 'Farbe PV Popup 5', helper: 'Farbe fuer PV Popup Zeile 5 Text.' },
          sensor_popup_pv_6_color: { label: 'Farbe PV Popup 6', helper: 'Farbe fuer PV Popup Zeile 6 Text.' },
          sensor_popup_pv_1_font_size: { label: 'Schriftgroesse PV Popup 1 (px)', helper: 'Schriftgroesse fuer PV Popup Zeile 1. Standard 16' },
          sensor_popup_pv_2_font_size: { label: 'Schriftgroesse PV Popup 2 (px)', helper: 'Schriftgroesse fuer PV Popup Zeile 2. Standard 16' },
          sensor_popup_pv_3_font_size: { label: 'Schriftgroesse PV Popup 3 (px)', helper: 'Schriftgroesse fuer PV Popup Zeile 3. Standard 16' },
          sensor_popup_pv_4_font_size: { label: 'Schriftgroesse PV Popup 4 (px)', helper: 'Schriftgroesse fuer PV Popup Zeile 4. Standard 16' },
          sensor_popup_pv_5_font_size: { label: 'Schriftgroesse PV Popup 5 (px)', helper: 'Schriftgroesse fuer PV Popup Zeile 5. Standard 16' },
          sensor_popup_pv_6_font_size: { label: 'Schriftgroesse PV Popup 6 (px)', helper: 'Schriftgroesse fuer PV Popup Zeile 6. Standard 16' },
          sensor_popup_house_1: { label: 'House Popup 1', helper: 'Entitaet fuer House Popup Zeile 1.' },
          sensor_popup_house_1_name: { label: 'Name House Popup 1', helper: 'Optionaler benutzerdefinierter Name fuer House Popup Zeile 1. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_house_1_color: { label: 'Farbe House Popup 1', helper: 'Farbe fuer House Popup Zeile 1 Text.' },
          sensor_popup_house_1_font_size: { label: 'Schriftgroesse House Popup 1 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 1. Standard 16' },
          sensor_popup_house_2: { label: 'House Popup 2', helper: 'Entitaet fuer House Popup Zeile 2.' },
          sensor_popup_house_2_name: { label: 'Name House Popup 2', helper: 'Optionaler benutzerdefinierter Name fuer House Popup Zeile 2. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_house_2_color: { label: 'Farbe House Popup 2', helper: 'Farbe fuer House Popup Zeile 2 Text.' },
          sensor_popup_house_2_font_size: { label: 'Schriftgroesse House Popup 2 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 2. Standard 16' },
          sensor_popup_house_3: { label: 'House Popup 3', helper: 'Entitaet fuer House Popup Zeile 3.' },
          sensor_popup_house_3_name: { label: 'Name House Popup 3', helper: 'Optionaler benutzerdefinierter Name fuer House Popup Zeile 3. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_house_3_color: { label: 'Farbe House Popup 3', helper: 'Farbe fuer House Popup Zeile 3 Text.' },
          sensor_popup_house_3_font_size: { label: 'Schriftgroesse House Popup 3 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 3. Standard 16' },
          sensor_popup_house_4: { label: 'House Popup 4', helper: 'Entitaet fuer House Popup Zeile 4.' },
          sensor_popup_house_4_name: { label: 'Name House Popup 4', helper: 'Optionaler benutzerdefinierter Name fuer House Popup Zeile 4. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_house_4_color: { label: 'Farbe House Popup 4', helper: 'Farbe fuer House Popup Zeile 4 Text.' },
          sensor_popup_house_4_font_size: { label: 'Schriftgroesse House Popup 4 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 4. Standard 16' },
          sensor_popup_house_5: { label: 'House Popup 5', helper: 'Entitaet fuer House Popup Zeile 5.' },
          sensor_popup_house_5_name: { label: 'Name House Popup 5', helper: 'Optionaler benutzerdefinierter Name fuer House Popup Zeile 5. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_house_5_color: { label: 'Farbe House Popup 5', helper: 'Farbe fuer House Popup Zeile 5 Text.' },
          sensor_popup_house_5_font_size: { label: 'Schriftgroesse House Popup 5 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 5. Standard 16' },
          sensor_popup_house_6: { label: 'House Popup 6', helper: 'Entitaet fuer House Popup Zeile 6.' },
          sensor_popup_house_6_name: { label: 'Name House Popup 6', helper: 'Optionaler benutzerdefinierter Name fuer House Popup Zeile 6. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_house_6_color: { label: 'Farbe House Popup 6', helper: 'Farbe fuer House Popup Zeile 6 Text.' },
          sensor_popup_house_6_font_size: { label: 'Schriftgroesse House Popup 6 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 6. Standard 16' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Englisch' },
            { value: 'it', label: 'Italienisch' },
            { value: 'de', label: 'Deutsch' },
            { value: 'fr', label: 'Französisch' },
            { value: 'nl', label: 'Niederländisch' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Striche (Standard)' },
            { value: 'dots', label: 'Punkte' },
            { value: 'arrows', label: 'Pfeile' }
          ],
          grid_flow_modes: [
            { value: 'grid_to_inverter', label: 'Netz zu Wechselrichter' },
            { value: 'grid_to_house_inverter', label: 'Netz zu Haus - Wechselrichter' }
          ]
        }
      ,
      view: {
        daily: 'TAGESERTRAG',
        pv_tot: 'PV GESAMT',
        car1: 'FAHRZEUG 1',
        car2: 'FAHRZEUG 2',
        importing: 'IMPORTIEREN',
        exporting: 'EXPORTIEREN'
      }
      },
      fr: {
        sections: {
          general: { title: 'Paramètres généraux', helper: 'Métadonnées de la carte, arrière-plan, langue et fréquence de mise à jour.' },
          array1: { title: 'Array 1', helper: 'Configurer les entités de l Array PV 1.' },
          array2: { title: 'Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          battery: { title: 'Batterie', helper: 'Configurer les entités de la batterie.' },
          grid: { title: 'Réseau', helper: 'Configurer les entités du réseau.' },
          car: { title: 'Voiture', helper: 'Configurer les entités EV.' },
          entities: { title: 'Sélection d entités', helper: 'Choisissez les entités PV, batterie, réseau, charge et EV utilisées par la carte. Soit le capteur PV total, soit vos tableaux de chaînes PV doivent être spécifiés au minimum.' },
          pvPopup: { title: 'Popup PV', helper: 'Configurer les entités pour l\'affichage du popup PV.' },
          housePopup: { title: 'Popup Maison', helper: 'Configurer les entités pour l\'affichage du popup maison.' },
          batteryPopup: { title: 'Popup Batterie', helper: 'Configurer l\'affichage du popup batterie.' },
          colors: { title: 'Couleurs & Seuils', helper: 'Configurez les seuils réseau et les couleurs d accent pour les flux et l affichage EV.' },
          typography: { title: 'Typographie', helper: 'Ajustez les tailles de police utilisées dans la carte.' },
          about: { title: 'À propos', helper: 'Crédits, version et liens utiles.' }
        },
        fields: {
          card_title: { label: 'Titre de la carte', helper: 'Titre affiché en haut de la carte. Laisser vide pour désactiver.' },
          background_image: { label: 'Chemin image d arrière-plan', helper: 'Chemin vers l image d arrière-plan (ex. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Langue', helper: 'Choisissez la langue de l éditeur.' },
          display_unit: { label: 'Unité d affichage', helper: 'Unité utilisée pour formater les valeurs de puissance.' },
          update_interval: { label: 'Intervalle de mise à jour', helper: 'Fréquence de rafraîchissement des mises à jour de la carte (0 désactive le throttling).' },
          animation_speed_factor: { label: 'Facteur de vitesse d animation', helper: 'Ajuste le multiplicateur de vitesse d animation (-3x à 3x). Mettre 0 pour pause; les négatifs inversent la direction.' },
          animation_style: { label: 'Style d animation', helper: 'Choisissez le motif d animation des flux (tirets, points, flèches).' },
          grid_flow_mode: { label: 'Flux réseau', helper: 'Choisissez comment afficher les flux réseau.' },
          sensor_pv_total: { label: 'Capteur PV total', helper: 'Capteur de production agrégé optionnel affiché comme ligne combinée.' },
          sensor_pv_total_secondary: { label: 'Capteur PV total (Inverseur 2)', helper: 'Second capteur d onduleur optionnel; ajouté au total PV s il est fourni.' },
          sensor_pv1: { label: 'Chaîne PV 1 (Array 1)', helper: 'Capteur principal de production solaire.' },
          sensor_pv2: { label: 'Chaîne PV 2 (Array 1)' },
          sensor_pv3: { label: 'Chaîne PV 3 (Array 1)' },
          sensor_pv4: { label: 'Chaîne PV 4 (Array 1)' },
          sensor_pv5: { label: 'Chaîne PV 5 (Array 1)' },
          sensor_pv6: { label: 'Chaîne PV 6 (Array 1)' },
          solar_array2_title: { label: 'Array 2 (Optionnel)' },
          sensor_pv_array2_1: { label: 'Chaîne PV 1 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_2: { label: 'Chaîne PV 2 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_3: { label: 'Chaîne PV 3 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_4: { label: 'Chaîne PV 4 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_5: { label: 'Chaîne PV 5 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_6: { label: 'Chaîne PV 6 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          solar_array2_activation_helper: { label: 'Si le capteur PV total (Inverseur 2) est défini ou si les valeurs des chaînes PV sont fournies, Array 2 sera activé et le second onduleur sera pris en charge. Vous devez également activer le capteur de production quotidienne (Array 2) et la charge domestique (Inverseur 2).' },
          show_pv_strings: { label: 'Afficher les chaînes PV individuelles', helper: 'Activez pour afficher la ligne totale plus chaque chaîne PV sur des lignes séparées.' },
          sensor_daily: { label: 'Capteur production quotidienne (Requis)', helper: 'Capteur indiquant les totaux de production journaliers. Soit le capteur PV total, soit vos tableaux de chaînes PV doivent être spécifiés au minimum.' },
          sensor_daily_array2: { label: 'Capteur production quotidienne (Array 2)', helper: 'Capteur pour les totaux de production journaliers de l Array 2.' },
          sensor_bat1_soc: { label: 'SOC Batterie 1' },
          sensor_bat1_power: { label: 'Puissance Batterie 1' },
          sensor_bat2_soc: { label: 'SOC Batterie 2' },
          sensor_bat2_power: { label: 'Puissance Batterie 2' },
          sensor_bat3_soc: { label: 'SOC Batterie 3' },
          sensor_bat3_power: { label: 'Puissance Batterie 3' },
          sensor_bat4_soc: { label: 'SOC Batterie 4' },
          sensor_bat4_power: { label: 'Puissance Batterie 4' },
          sensor_home_load: { label: 'Charge domestique/consommation (Requis)', helper: 'Capteur de consommation totale du foyer.' },
          sensor_home_load_secondary: { label: 'Charge domestique (Inverseur 2)', helper: 'Capteur de charge domestique optionnel pour le second onduleur.' },
          sensor_grid_power: { label: 'Puissance réseau', helper: 'Capteur de flux réseau positif/négatif. Spécifiez soit ce capteur soit les capteurs Import/Export réseau.' },
          sensor_grid_import: { label: 'Capteur import réseau', helper: 'Entité optionnelle rapportant l import réseau (valeurs positives).' },
          sensor_grid_export: { label: 'Capteur export réseau', helper: 'Entité optionnelle rapportant l export réseau (valeurs positives).' },
          sensor_grid_import_daily: { label: 'Capteur import réseau journalier', helper: 'Entité optionnelle rapportant l import cumulatif réseau pour la journée en cours.' },
          sensor_grid_export_daily: { label: 'Capteur export réseau journalier', helper: 'Entité optionnelle rapportant l export cumulatif réseau pour la journée en cours.' },
          show_daily_grid: { label: 'Afficher les valeurs réseau journalières', helper: 'Affiche les totaux import/export journaliers sous le flux réseau actuel lorsqu activé.' },
          pv_tot_color: { label: 'Couleur PV totale', helper: 'Couleur appliquée à la ligne/texte PV TOTAL.' },
          pv_primary_color: { label: 'Couleur flux PV 1', helper: 'Couleur utilisée pour la ligne d animation PV primaire.' },
          pv_secondary_color: { label: 'Couleur flux PV 2', helper: 'Couleur utilisée pour la ligne d animation PV secondaire si disponible.' },
          pv_string1_color: { label: 'Couleur Chaîne PV 1', helper: 'Remplace la couleur pour S1 dans la liste PV. Laisser vide pour hériter de la couleur PV totale.' },
          pv_string2_color: { label: 'Couleur Chaîne PV 2', helper: 'Remplace la couleur pour S2 dans la liste PV. Laisser vide pour hériter de la couleur PV totale.' },
          pv_string3_color: { label: 'Couleur Chaîne PV 3', helper: 'Remplace la couleur pour S3 dans la liste PV. Laisser vide pour hériter de la couleur PV totale.' },
          pv_string4_color: { label: 'Couleur Chaîne PV 4', helper: 'Remplace la couleur pour S4 dans la liste PV. Laisser vide pour hériter de la couleur PV totale.' },
          pv_string5_color: { label: 'Couleur Chaîne PV 5', helper: 'Remplace la couleur pour S5 dans la liste PV. Laisser vide pour hériter de la couleur PV totale.' },
          pv_string6_color: { label: 'Couleur Chaîne PV 6', helper: 'Remplace la couleur pour S6 dans la liste PV. Laisser vide pour hériter de la couleur PV totale.' },
          load_flow_color: { label: 'Couleur flux charge', helper: 'Couleur appliquée à la ligne d animation de la charge domestique.' },
          house_total_color: { label: 'Couleur HOUSE TOT', helper: 'Couleur appliquée au texte/flux HOUSE TOT.' },
          inv1_color: { label: 'Couleur INV 1', helper: 'Couleur appliquée au texte/flux INV 1.' },
          inv2_color: { label: 'Couleur INV 2', helper: 'Couleur appliquée au texte/flux INV 2.' },
          load_threshold_warning: { label: 'Seuil avertissement charge', helper: 'Changer la couleur du chargeur lorsque la magnitude atteint ou dépasse cette valeur. Utilise l unité d affichage sélectionnée.' },
          load_warning_color: { label: 'Couleur avertissement charge', helper: 'Couleur hex ou CSS appliquée au seuil d avertissement de charge.' },
          load_threshold_critical: { label: 'Seuil critique charge', helper: 'Changer la couleur lorsque la magnitude atteint ou dépasse cette valeur. Utilise l unité d affichage sélectionnée.' },
          load_critical_color: { label: 'Couleur critique charge', helper: 'Couleur hex ou CSS appliquée au seuil critique de charge.' },
          battery_charge_color: { label: 'Couleur flux charge batterie', helper: 'Couleur utilisée lorsque l énergie entre dans la batterie.' },
          battery_discharge_color: { label: 'Couleur flux décharge batterie', helper: 'Couleur utilisée lorsque l énergie sort de la batterie.' },
          battery_fill_high_color: { label: 'Couleur remplissage batterie (normale)', helper: 'Couleur du liquide lorsque le SOC de la batterie est au-dessus du seuil bas.' },
          battery_fill_low_color: { label: 'Couleur remplissage batterie (faible)', helper: 'Couleur du liquide lorsque le SOC est égal ou inférieur au seuil bas.' },
          battery_fill_low_threshold: { label: 'Seuil remplissage batterie bas (%)', helper: 'Utiliser la couleur basse lorsque le SOC est égal ou inférieur à ce pourcentage.' },
          grid_activity_threshold: { label: 'Seuil animation réseau (W)', helper: 'Ignorer les flux réseau dont la valeur absolue est inférieure à cette puissance avant d animer.' },
          grid_threshold_warning: { label: 'Seuil avertissement réseau', helper: 'Changer la couleur réseau lorsque la magnitude atteint cette valeur. Utilise l unité d affichage sélectionnée.' },
          grid_warning_color: { label: 'Couleur avertissement réseau', helper: 'Couleur hex appliquée au seuil d avertissement.' },
          grid_threshold_critical: { label: 'Seuil critique réseau', helper: 'Changer la couleur réseau lorsque la magnitude atteint cette valeur. Utilise l unité d affichage sélectionnée.' },
          grid_critical_color: { label: 'Couleur critique réseau', helper: 'Couleur appliquée au seuil critique.' },
          invert_grid: { label: 'Inverser valeurs réseau', helper: 'Activer si la polarité import/export est inversée.' },
          invert_battery: { label: 'Inverser valeurs batterie', helper: 'Activer si la polarité charge/décharge est inversée.' },
          sensor_car_power: { label: 'Capteur puissance Véhicule 1' },
          sensor_car_soc: { label: 'Capteur SOC Véhicule 1' },
          car_soc: { label: 'SOC Véhicule', helper: 'Capteur pour SOC batterie EV.' },
          car_range: { label: 'Autonomie Véhicule', helper: 'Capteur pour autonomie EV.' },
          car_efficiency: { label: 'Efficacité Véhicule', helper: 'Capteur pour efficacité EV.' },
          car_charger_power: { label: 'Puissance Chargeur Véhicule', helper: 'Capteur pour puissance chargeur EV.' },
          car1_label: { label: 'Libellé Véhicule 1', helper: 'Texte affiché à côté des valeurs du premier EV.' },
          sensor_car2_power: { label: 'Capteur puissance Véhicule 2' },
          sensor_car2_soc: { label: 'Capteur SOC Véhicule 2' },
          car2_soc: { label: 'SOC Véhicule 2', helper: 'Capteur pour SOC batterie EV 2.' },
          car2_range: { label: 'Autonomie Véhicule 2', helper: 'Capteur pour autonomie EV 2.' },
          car2_efficiency: { label: 'Efficacité Véhicule 2', helper: 'Capteur pour efficacité EV 2.' },
          car2_charger_power: { label: 'Puissance Chargeur Véhicule 2', helper: 'Capteur pour puissance chargeur EV 2.' },
          car2_power: { label: 'Puissance Véhicule 2', helper: 'Capteur pour puissance charge/décharge EV 2.' },
          car2_label: { label: 'Libellé Véhicule 2', helper: 'Texte affiché à côté des valeurs du second EV.' },
          show_car_soc: { label: 'Afficher Véhicule 1', helper: 'Activer pour afficher les métriques du premier véhicule.' },
          show_car2: { label: 'Afficher Véhicule 2', helper: 'Activer pour afficher les métriques du second véhicule lorsque les capteurs sont fournis.' },
          car_pct_color: { label: 'Couleur SOC Véhicule', helper: 'Couleur hex pour le texte SOC EV (ex. #00FFFF).' },
          car2_pct_color: { label: 'Couleur SOC Véhicule 2', helper: 'Couleur hex pour le SOC du second EV (retourne sur Car SOC si vide).' },
          car1_name_color: { label: 'Couleur nom Véhicule 1', helper: 'Couleur appliquée au libellé du nom du Véhicule 1.' },
          car2_name_color: { label: 'Couleur nom Véhicule 2', helper: 'Couleur appliquée au libellé du nom du Véhicule 2.' },
          car1_color: { label: 'Couleur Véhicule 1', helper: 'Couleur appliquée à la valeur de puissance du Véhicule 1.' },
          car2_color: { label: 'Couleur Véhicule 2', helper: 'Couleur appliquée à la valeur de puissance du Véhicule 2.' },
          header_font_size: { label: 'Taille police en-tête (px)', helper: 'Par défaut 16' },
          daily_label_font_size: { label: 'Taille étiquette quotidienne (px)', helper: 'Par défaut 12' },
          daily_value_font_size: { label: 'Taille valeur quotidienne (px)', helper: 'Par défaut 20' },
          pv_font_size: { label: 'Taille police PV (px)', helper: 'Par défaut 16' },
          battery_soc_font_size: { label: 'Taille SOC batterie (px)', helper: 'Par défaut 20' },
          battery_power_font_size: { label: 'Taille puissance batterie (px)', helper: 'Par défaut 16' },
          load_font_size: { label: 'Taille police charge (px)', helper: 'Par défaut 15' },
          grid_font_size: { label: 'Taille police réseau (px)', helper: 'Par défaut 15' },
          car_power_font_size: { label: 'Taille puissance véhicule (px)', helper: 'Par défaut 15' },
          car2_power_font_size: { label: 'Taille puissance Véhicule 2 (px)', helper: 'Par défaut 15' },
          car_name_font_size: { label: 'Taille nom Véhicule (px)', helper: 'Par défaut 15' },
          car2_name_font_size: { label: 'Taille nom Véhicule 2 (px)', helper: 'Par défaut 15' },
          car_soc_font_size: { label: 'Taille SOC véhicule (px)', helper: 'Par défaut 12' },
          car2_soc_font_size: { label: 'Taille SOC Véhicule 2 (px)', helper: 'Par défaut 12' },
          sensor_popup_pv_1: { label: 'Popup PV 1', helper: 'Entité pour la ligne 1 du popup PV.' },
          sensor_popup_pv_2: { label: 'Popup PV 2', helper: 'Entité pour la ligne 2 du popup PV.' },
          sensor_popup_pv_3: { label: 'Popup PV 3', helper: 'Entité pour la ligne 3 du popup PV.' },
          sensor_popup_pv_4: { label: 'Popup PV 4', helper: 'Entité pour la ligne 4 du popup PV.' },
          sensor_popup_pv_5: { label: 'Popup PV 5', helper: 'Entité pour la ligne 5 du popup PV.' },
          sensor_popup_pv_6: { label: 'Popup PV 6', helper: 'Entité pour la ligne 6 du popup PV.' },
          sensor_popup_pv_1_name: { label: 'Nom Popup PV 1', helper: 'Nom personnalisé optionnel pour la ligne 1 du popup PV. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_pv_2_name: { label: 'Nom Popup PV 2', helper: 'Nom personnalisé optionnel pour la ligne 2 du popup PV. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_pv_3_name: { label: 'Nom Popup PV 3', helper: 'Nom personnalisé optionnel pour la ligne 3 du popup PV. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_pv_4_name: { label: 'Nom Popup PV 4', helper: 'Nom personnalisé optionnel pour la ligne 4 du popup PV. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_pv_5_name: { label: 'Nom Popup PV 5', helper: 'Nom personnalisé optionnel pour la ligne 5 du popup PV. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_pv_6_name: { label: 'Nom Popup PV 6', helper: 'Nom personnalisé optionnel pour la ligne 6 du popup PV. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_pv_1_color: { label: 'Couleur Popup PV 1', helper: 'Couleur pour le texte de la ligne 1 du popup PV.' },
          sensor_popup_pv_2_color: { label: 'Couleur Popup PV 2', helper: 'Couleur pour le texte de la ligne 2 du popup PV.' },
          sensor_popup_pv_3_color: { label: 'Couleur Popup PV 3', helper: 'Couleur pour le texte de la ligne 3 du popup PV.' },
          sensor_popup_pv_4_color: { label: 'Couleur Popup PV 4', helper: 'Couleur pour le texte de la ligne 4 du popup PV.' },
          sensor_popup_pv_5_color: { label: 'Couleur Popup PV 5', helper: 'Couleur pour le texte de la ligne 5 du popup PV.' },
          sensor_popup_pv_6_color: { label: 'Couleur Popup PV 6', helper: 'Couleur pour le texte de la ligne 6 du popup PV.' },
          sensor_popup_pv_1_font_size: { label: 'Taille police Popup PV 1 (px)', helper: 'Taille de police pour la ligne 1 du popup PV. Par défaut 16' },
          sensor_popup_pv_2_font_size: { label: 'Taille police Popup PV 2 (px)', helper: 'Taille de police pour la ligne 2 du popup PV. Par défaut 16' },
          sensor_popup_pv_3_font_size: { label: 'Taille police Popup PV 3 (px)', helper: 'Taille de police pour la ligne 3 du popup PV. Par défaut 16' },
          sensor_popup_pv_4_font_size: { label: 'Taille police Popup PV 4 (px)', helper: 'Taille de police pour la ligne 4 du popup PV. Par défaut 16' },
                    sensor_popup_pv_5_font_size: { label: 'Taille police Popup PV 5 (px)', helper: 'Taille de police pour la ligne 5 du popup PV. Par défaut 16' },
          sensor_popup_pv_6_font_size: { label: 'Taille police Popup PV 6 (px)', helper: 'Taille de police pour la ligne 6 du popup PV. Par défaut 16' },
          sensor_popup_house_1: { label: 'Popup Maison 1', helper: 'Entité pour la ligne 1 du popup maison.' },
          sensor_popup_house_1_name: { label: 'Nom Popup Maison 1', helper: 'Nom personnalisé optionnel pour la ligne 1 du popup maison. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_house_1_color: { label: 'Couleur Popup Maison 1', helper: 'Couleur pour le texte de la ligne 1 du popup maison.' },
          sensor_popup_house_1_font_size: { label: 'Taille police Popup Maison 1 (px)', helper: 'Taille de police pour la ligne 1 du popup maison. Par défaut 16' },
          sensor_popup_house_2: { label: 'Popup Maison 2', helper: 'Entité pour la ligne 2 du popup maison.' },
          sensor_popup_house_2_name: { label: 'Nom Popup Maison 2', helper: 'Nom personnalisé optionnel pour la ligne 2 du popup maison. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_house_2_color: { label: 'Couleur Popup Maison 2', helper: 'Couleur pour le texte de la ligne 2 du popup maison.' },
          sensor_popup_house_2_font_size: { label: 'Taille police Popup Maison 2 (px)', helper: 'Taille de police pour la ligne 2 du popup maison. Par défaut 16' },
          sensor_popup_house_3: { label: 'Popup Maison 3', helper: 'Entité pour la ligne 3 du popup maison.' },
          sensor_popup_house_3_name: { label: 'Nom Popup Maison 3', helper: 'Nom personnalisé optionnel pour la ligne 3 du popup maison. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_house_3_color: { label: 'Couleur Popup Maison 3', helper: 'Couleur pour le texte de la ligne 3 du popup maison.' },
          sensor_popup_house_3_font_size: { label: 'Taille police Popup Maison 3 (px)', helper: 'Taille de police pour la ligne 3 du popup maison. Par défaut 16' },
          sensor_popup_house_4: { label: 'Popup Maison 4', helper: 'Entité pour la ligne 4 du popup maison.' },
          sensor_popup_house_4_name: { label: 'Nom Popup Maison 4', helper: 'Nom personnalisé optionnel pour la ligne 4 du popup maison. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_house_4_color: { label: 'Couleur Popup Maison 4', helper: 'Couleur pour le texte de la ligne 4 du popup maison.' },
          sensor_popup_house_4_font_size: { label: 'Taille police Popup Maison 4 (px)', helper: 'Taille de police pour la ligne 4 du popup maison. Par défaut 16' },
          sensor_popup_house_5: { label: 'Popup Maison 5', helper: 'Entité pour la ligne 5 du popup maison.' },
          sensor_popup_house_5_name: { label: 'Nom Popup Maison 5', helper: 'Nom personnalisé optionnel pour la ligne 5 du popup maison. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_house_5_color: { label: 'Couleur Popup Maison 5', helper: 'Couleur pour le texte de la ligne 5 du popup maison.' },
          sensor_popup_house_5_font_size: { label: 'Taille police Popup Maison 5 (px)', helper: 'Taille de police pour la ligne 5 du popup maison. Par défaut 16' },
          sensor_popup_house_6: { label: 'Popup Maison 6', helper: 'Entité pour la ligne 6 du popup maison.' },
          sensor_popup_house_6_name: { label: 'Nom Popup Maison 6', helper: 'Nom personnalisé optionnel pour la ligne 6 du popup maison. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_house_6_color: { label: 'Couleur Popup Maison 6', helper: 'Couleur pour le texte de la ligne 6 du popup maison.' },
          sensor_popup_house_6_font_size: { label: 'Taille police Popup Maison 6 (px)', helper: 'Taille de police pour la ligne 6 du popup maison. Par défaut 16' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Anglais' },
            { value: 'it', label: 'Italien' },
            { value: 'de', label: 'Allemand' },
            { value: 'fr', label: 'Français' },
            { value: 'nl', label: 'Néerlandais' }
          ],
          display_units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Tirets (par défaut)' },
            { value: 'dots', label: 'Points' },
            { value: 'arrows', label: 'Flèches' }
          ],
          grid_flow_modes: [
            { value: 'grid_to_inverter', label: 'Réseau vers Onduleur' },
            { value: 'grid_to_house_inverter', label: 'Réseau vers Maison - Onduleur' }
          ]
        }
      ,
      view: {
        daily: 'PRODUCTION DU JOUR',
        pv_tot: 'PV TOTAL',
        car1: 'VÉHICULE 1',
        car2: 'VÉHICULE 2',
        importing: 'IMPORTATION',
        exporting: 'EXPORTATION'
      }
      },
      nl: {
        sections: {
          general: { title: 'Algemene instellingen', helper: 'Metadata van de kaart, achtergrond, taal en update frequentie.' },
          array1: { title: 'Array 1', helper: 'Configureer PV Array 1 entiteiten.' },
          array2: { title: 'Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          battery: { title: 'Batterij', helper: 'Configureer batterij entiteiten.' },
          grid: { title: 'Grid', helper: 'Configureer grid entiteiten.' },
          car: { title: 'Auto', helper: 'Configureer EV entiteiten.' },
          entities: { title: 'Entiteit selectie', helper: 'Kies de PV, batterij, grid, load en EV entiteiten gebruikt door de kaart. Of de totale PV sensor, of uw PV string arrays moeten minimaal worden gespecificeerd.' },
          pvPopup: { title: 'PV Popup', helper: 'Configureer entiteiten voor de PV popup weergave.' },
          housePopup: { title: 'House Popup', helper: 'Configureer entiteiten voor de House popup weergave.' },
          batteryPopup: { title: 'Batterij-popup', helper: 'Configureer de batterij popup weergave.' },
          colors: { title: 'Kleuren & Drempels', helper: 'Configureer netwerkdrempels en accentkleuren voor stromen en EV-weergave.' },
          typography: { title: 'Typografie', helper: 'Pas de lettergrootte aan gebruikt in de kaart.' },
          about: { title: 'Over', helper: 'Credits, versie en nuttige links.' }
        },
        fields: {
          card_title: { label: 'Kaart titel', helper: 'Titel weergegeven bovenaan de kaart. Leeg laten om uit te schakelen.' },
          background_image: { label: 'Achtergrond afbeelding pad', helper: 'Pad naar achtergrond afbeelding (bijv. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Taal', helper: 'Kies de taal van de editor.' },
          display_unit: { label: 'Weergave eenheid', helper: 'Eenheid gebruikt om kracht waarden te formatteren.' },
          update_interval: { label: 'Update interval', helper: 'Frequentie van kaart updates verversen (0 schakelt throttling uit).' },
          animation_speed_factor: { label: 'Animatie snelheid factor', helper: 'Pas de animatie snelheid multiplier aan (-3x tot 3x). Stel in op 0 voor pauze; negatieven keren richting om.' },
          animation_style: { label: 'Animatie stijl', helper: 'Kies het patroon voor flow animaties (strepen, stippen, pijlen).' },
          grid_flow_mode: { label: 'Netstroom', helper: 'Kies hoe netstromen worden weergegeven.' },
          sensor_pv_total: { label: 'Totale PV sensor', helper: 'Optionele geaggregeerde productie sensor weergegeven als gecombineerde lijn.' },
          sensor_pv_total_secondary: { label: 'Totale PV sensor (Inverter 2)', helper: 'Tweede optionele inverter sensor; toegevoegd aan totale PV indien opgegeven.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Primaire zonne productie sensor.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          solar_array2_title: { label: 'Array 2 (Optioneel)' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          solar_array2_activation_helper: { label: 'Als de totale PV sensor (Inverter 2) is gedefinieerd of als PV string waarden zijn opgegeven, zal Array 2 worden geactiveerd en de tweede inverter ondersteund. U moet ook de dagelijkse productie sensor (Array 2) en huisbelasting (Inverter 2) activeren.' },
          show_pv_strings: { label: 'Toon individuele PV strings', helper: 'Inschakelen om de totale lijn plus elke PV string op aparte lijnen weer te geven.' },
          sensor_daily: { label: 'Dagelijkse productie sensor (Vereist)', helper: 'Sensor die dagelijkse productie totalen aangeeft. Of de totale PV sensor, of uw PV string arrays moeten minimaal worden gespecificeerd.' },
          sensor_daily_array2: { label: 'Dagelijkse productie sensor (Array 2)', helper: 'Sensor voor dagelijkse productie totalen van Array 2.' },
          sensor_bat1_soc: { label: 'Batterij 1 SOC' },
          sensor_bat1_power: { label: 'Batterij 1 vermogen' },
          sensor_bat2_soc: { label: 'Batterij 2 SOC' },
          sensor_bat2_power: { label: 'Batterij 2 vermogen' },
          sensor_bat3_soc: { label: 'Batterij 3 SOC' },
          sensor_bat3_power: { label: 'Batterij 3 vermogen' },
          sensor_bat4_soc: { label: 'Batterij 4 SOC' },
          sensor_bat4_power: { label: 'Batterij 4 vermogen' },
          sensor_home_load: { label: 'Huisbelasting/verbruik (Vereist)', helper: 'Sensor voor totale huisverbruik.' },
          sensor_home_load_secondary: { label: 'Huisbelasting (Inverter 2)', helper: 'Optionele huisbelasting sensor voor de tweede inverter.' },
          sensor_grid_power: { label: 'Grid vermogen', helper: 'Sensor voor grid flow positief/negatief. Specificeer of deze sensor of de Grid Import/Export sensoren.' },
          sensor_grid_import: { label: 'Grid import sensor', helper: 'Optionele entiteit die grid import rapporteert (positieve waarden).' },
          sensor_grid_export: { label: 'Grid export sensor', helper: 'Optionele entiteit die grid export rapporteert (positieve waarden).' },
          sensor_grid_import_daily: { label: 'Dagelijkse grid import sensor', helper: 'Optionele entiteit die cumulatieve grid import voor de huidige dag rapporteert.' },
          sensor_grid_export_daily: { label: 'Dagelijkse grid export sensor', helper: 'Optionele entiteit die cumulatieve grid export voor de huidige dag rapporteert.' },
          show_daily_grid: { label: 'Toon dagelijkse grid waarden', helper: 'Toon de dagelijkse import/export totalen onder de huidige grid flow wanneer ingeschakeld.' },
          pv_tot_color: { label: 'Totale PV kleur', helper: 'Kleur toegepast op de PV TOTAL lijn/tekst.' },
          pv_primary_color: { label: 'PV Flow 1 kleur', helper: 'Kleur gebruikt voor de primaire PV animatie lijn.' },
          pv_secondary_color: { label: 'PV Flow 2 kleur', helper: 'Kleur gebruikt voor de secundaire PV animatie lijn indien beschikbaar.' },
          pv_string1_color: { label: 'PV String 1 kleur', helper: 'Vervang kleur voor S1 in PV lijst. Leeg laten om te erven van totale PV kleur.' },
          pv_string2_color: { label: 'PV String 2 kleur', helper: 'Vervang kleur voor S2 in PV lijst. Leeg laten om te erven van totale PV kleur.' },
          pv_string3_color: { label: 'PV String 3 kleur', helper: 'Vervang kleur voor S3 in PV lijst. Leeg laten om te erven van totale PV kleur.' },
          pv_string4_color: { label: 'PV String 4 kleur', helper: 'Vervang kleur voor S4 in PV lijst. Leeg laten om te erven van totale PV kleur.' },
          pv_string5_color: { label: 'PV String 5 kleur', helper: 'Vervang kleur voor S5 in PV lijst. Leeg laten om te erven van totale PV kleur.' },
          pv_string6_color: { label: 'PV String 6 kleur', helper: 'Vervang kleur voor S6 in PV lijst. Leeg laten om te erven van totale PV kleur.' },
          load_flow_color: { label: 'Belasting flow kleur', helper: 'Kleur toegepast op de huisbelasting animatie lijn.' },
          house_total_color: { label: 'HOUSE TOT kleur', helper: 'Kleur toegepast op HOUSE TOT tekst/flow.' },
          inv1_color: { label: 'INV 1 kleur', helper: 'Kleur toegepast op INV 1 tekst/flow.' },
          inv2_color: { label: 'INV 2 kleur', helper: 'Kleur toegepast op INV 2 tekst/flow.' },
          load_threshold_warning: { label: 'Belasting waarschuwingsdrempel', helper: 'Verander kleur van lader wanneer magnitude deze waarde bereikt of overschrijdt. Gebruikt geselecteerde weergave eenheid.' },
          load_warning_color: { label: 'Belasting waarschuwingskleur', helper: 'Hex of CSS kleur toegepast op belasting waarschuwingsdrempel.' },
          load_threshold_critical: { label: 'Belasting kritieke drempel', helper: 'Verander kleur wanneer magnitude deze waarde bereikt of overschrijdt. Gebruikt geselecteerde weergave eenheid.' },
          load_critical_color: { label: 'Belasting kritieke kleur', helper: 'Hex of CSS kleur toegepast op kritieke belasting drempel.' },
          battery_charge_color: { label: 'Batterij laad flow kleur', helper: 'Kleur gebruikt wanneer energie de batterij ingaat.' },
          battery_discharge_color: { label: 'Batterij ontlaad flow kleur', helper: 'Kleur gebruikt wanneer energie de batterij verlaat.' },
          battery_fill_high_color: { label: 'Batterij vulling kleur (normaal)', helper: 'Kleur van vloeistof wanneer batterij SOC boven lage drempel is.' },
          battery_fill_low_color: { label: 'Batterij vulling kleur (laag)', helper: 'Kleur van vloeistof wanneer SOC gelijk aan of lager dan lage drempel.' },
          battery_fill_low_threshold: { label: 'Lage batterij vulling drempel (%)', helper: 'Gebruik lage kleur wanneer SOC gelijk aan of lager dan dit percentage.' },
          grid_activity_threshold: { label: 'Grid animatie drempel (W)', helper: 'Negeer grid flows waarvan absolute waarde lager is dan deze kracht voordat animeren.' },
          grid_threshold_warning: { label: 'Grid waarschuwingsdrempel', helper: 'Verander grid kleur wanneer magnitude deze waarde bereikt. Gebruikt geselecteerde weergave eenheid.' },
          grid_warning_color: { label: 'Grid waarschuwingskleur', helper: 'Hex kleur toegepast op waarschuwingsdrempel.' },
          grid_threshold_critical: { label: 'Grid kritieke drempel', helper: 'Verander grid kleur wanneer magnitude deze waarde bereikt. Gebruikt geselecteerde weergave eenheid.' },
          grid_critical_color: { label: 'Grid kritieke kleur', helper: 'Kleur toegepast op kritieke drempel.' },
          invert_grid: { label: 'Grid waarden omkeren', helper: 'Inschakelen als import/export polariteit omgekeerd is.' },
          invert_battery: { label: 'Batterij waarden omkeren', helper: 'Inschakelen als laad/ontlaad polariteit omgekeerd is.' },
          sensor_car_power: { label: 'Voertuig 1 vermogen sensor' },
          sensor_car_soc: { label: 'Voertuig 1 SOC sensor' },
          car_soc: { label: 'Voertuig SOC', helper: 'Sensor voor EV batterij SOC.' },
          car_range: { label: 'Voertuig bereik', helper: 'Sensor voor EV bereik.' },
          car_efficiency: { label: 'Voertuig efficiëntie', helper: 'Sensor voor EV efficiëntie.' },
          car_charger_power: { label: 'Voertuig lader vermogen', helper: 'Sensor voor EV lader vermogen.' },
          car1_label: { label: 'Voertuig 1 label', helper: 'Tekst weergegeven naast de waarden van de eerste EV.' },
          sensor_car2_power: { label: 'Voertuig 2 vermogen sensor' },
          sensor_car2_soc: { label: 'Voertuig 2 SOC sensor' },
          car2_soc: { label: 'Voertuig 2 SOC', helper: 'Sensor voor EV 2 batterij SOC.' },
          car2_range: { label: 'Voertuig 2 bereik', helper: 'Sensor voor EV 2 bereik.' },
          car2_efficiency: { label: 'Voertuig 2 efficiëntie', helper: 'Sensor voor EV 2 efficiëntie.' },
          car2_charger_power: { label: 'Voertuig 2 lader vermogen', helper: 'Sensor voor EV 2 lader vermogen.' },
          car2_power: { label: 'Voertuig 2 vermogen', helper: 'Sensor voor EV 2 laad/ontlaad vermogen.' },
          car2_label: { label: 'Voertuig 2 label', helper: 'Tekst weergegeven naast de waarden van de tweede EV.' },
          show_car_soc: { label: 'Toon Voertuig 1', helper: 'Inschakelen om metrics van het eerste voertuig weer te geven.' },
          show_car2: { label: 'Toon Voertuig 2', helper: 'Inschakelen om metrics van het tweede voertuig weer te geven wanneer sensoren zijn opgegeven.' },
          car_pct_color: { label: 'Voertuig SOC kleur', helper: 'Hex kleur voor EV SOC tekst (bijv. #00FFFF).' },
          car2_pct_color: { label: 'Voertuig 2 SOC kleur', helper: 'Hex kleur voor tweede EV SOC (valt terug op Voertuig SOC indien leeg).' },
          car1_name_color: { label: 'Voertuig 1 naam kleur', helper: 'Kleur toegepast op Voertuig 1 naam label.' },
          car2_name_color: { label: 'Voertuig 2 naam kleur', helper: 'Kleur toegepast op Voertuig 2 naam label.' },
          car1_color: { label: 'Voertuig 1 kleur', helper: 'Kleur toegepast op Voertuig 1 vermogen waarde.' },
          car2_color: { label: 'Voertuig 2 kleur', helper: 'Kleur toegepast op Voertuig 2 vermogen waarde.' },
          header_font_size: { label: 'Header lettergrootte (px)', helper: 'Standaard 16' },
          daily_label_font_size: { label: 'Dagelijks label lettergrootte (px)', helper: 'Standaard 12' },
          daily_value_font_size: { label: 'Dagelijks waarde lettergrootte (px)', helper: 'Standaard 20' },
          pv_font_size: { label: 'PV lettergrootte (px)', helper: 'Standaard 16' },
          battery_soc_font_size: { label: 'Batterij SOC lettergrootte (px)', helper: 'Standaard 20' },
          battery_power_font_size: { label: 'Batterij vermogen lettergrootte (px)', helper: 'Standaard 16' },
          load_font_size: { label: 'Belasting lettergrootte (px)', helper: 'Standaard 15' },
          grid_font_size: { label: 'Grid lettergrootte (px)', helper: 'Standaard 15' },
          car_power_font_size: { label: 'Voertuig vermogen lettergrootte (px)', helper: 'Standaard 15' },
          car2_power_font_size: { label: 'Voertuig 2 vermogen lettergrootte (px)', helper: 'Standaard 15' },
          car_name_font_size: { label: 'Voertuig naam lettergrootte (px)', helper: 'Standaard 15' },
          car2_name_font_size: { label: 'Voertuig 2 naam lettergrootte (px)', helper: 'Standaard 15' },
          car_soc_font_size: { label: 'Voertuig SOC lettergrootte (px)', helper: 'Standaard 12' },
          car2_soc_font_size: { label: 'Voertuig 2 SOC lettergrootte (px)', helper: 'Standaard 12' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entiteit voor PV popup lijn 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entiteit voor PV popup lijn 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entiteit voor PV popup lijn 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entiteit voor PV popup lijn 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entiteit voor PV popup lijn 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entiteit voor PV popup lijn 6.' },
          sensor_popup_pv_1_name: { label: 'Naam PV Popup 1', helper: 'Optionele aangepaste naam voor PV popup lijn 1. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_pv_2_name: { label: 'Naam PV Popup 2', helper: 'Optionele aangepaste naam voor PV popup lijn 2. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_pv_3_name: { label: 'Naam PV Popup 3', helper: 'Optionele aangepaste naam voor PV popup lijn 3. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_pv_4_name: { label: 'Naam PV Popup 4', helper: 'Optionele aangepaste naam voor PV popup lijn 4. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_pv_5_name: { label: 'Naam PV Popup 5', helper: 'Optionele aangepaste naam voor PV popup lijn 5. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_pv_6_name: { label: 'Naam PV Popup 6', helper: 'Optionele aangepaste naam voor PV popup lijn 6. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_pv_1_color: { label: 'Kleur PV Popup 1', helper: 'Kleur voor PV popup lijn 1 tekst.' },
          sensor_popup_pv_2_color: { label: 'Kleur PV Popup 2', helper: 'Kleur voor PV popup lijn 2 tekst.' },
          sensor_popup_pv_3_color: { label: 'Kleur PV Popup 3', helper: 'Kleur voor PV popup lijn 3 tekst.' },
          sensor_popup_pv_4_color: { label: 'Kleur PV Popup 4', helper: 'Kleur voor PV popup lijn 4 tekst.' },
          sensor_popup_pv_5_color: { label: 'Kleur PV Popup 5', helper: 'Kleur voor PV popup lijn 5 tekst.' },
          sensor_popup_pv_6_color: { label: 'Kleur PV Popup 6', helper: 'Kleur voor PV popup lijn 6 tekst.' },
          sensor_popup_pv_1_font_size: { label: 'Lettergrootte PV Popup 1 (px)', helper: 'Lettergrootte voor PV popup lijn 1. Standaard 16' },
          sensor_popup_pv_2_font_size: { label: 'Lettergrootte PV Popup 2 (px)', helper: 'Lettergrootte voor PV popup lijn 2. Standaard 16' },
          sensor_popup_pv_3_font_size: { label: 'Lettergrootte PV Popup 3 (px)', helper: 'Lettergrootte voor PV popup lijn 3. Standaard 16' },
          sensor_popup_pv_4_font_size: { label: 'Lettergrootte PV Popup 4 (px)', helper: 'Lettergrootte voor PV popup lijn 4. Standaard 16' },
          sensor_popup_pv_5_font_size: { label: 'Lettergrootte PV Popup 5 (px)', helper: 'Lettergrootte voor PV popup lijn 5. Standaard 16' },
          sensor_popup_pv_6_font_size: { label: 'Lettergrootte PV Popup 6 (px)', helper: 'Lettergrootte voor PV popup lijn 6. Standaard 16' },
          sensor_popup_house_1: { label: 'House Popup 1', helper: 'Entiteit voor house popup lijn 1.' },
          sensor_popup_house_1_name: { label: 'Naam House Popup 1', helper: 'Optionele aangepaste naam voor house popup lijn 1. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_house_1_color: { label: 'Kleur House Popup 1', helper: 'Kleur voor house popup lijn 1 tekst.' },
          sensor_popup_house_1_font_size: { label: 'Lettergrootte House Popup 1 (px)', helper: 'Lettergrootte voor house popup lijn 1. Standaard 16' },
          sensor_popup_house_2: { label: 'House Popup 2', helper: 'Entiteit voor house popup lijn 2.' },
          sensor_popup_house_2_name: { label: 'Naam House Popup 2', helper: 'Optionele aangepaste naam voor house popup lijn 2. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_house_2_color: { label: 'Kleur House Popup 2', helper: 'Kleur voor house popup lijn 2 tekst.' },
          sensor_popup_house_2_font_size: { label: 'Lettergrootte House Popup 2 (px)', helper: 'Lettergrootte voor house popup lijn 2. Standaard 16' },
          sensor_popup_house_3: { label: 'House Popup 3', helper: 'Entiteit voor house popup lijn 3.' },
          sensor_popup_house_3_name: { label: 'Naam House Popup 3', helper: 'Optionele aangepaste naam voor house popup lijn 3. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_house_3_color: { label: 'Kleur House Popup 3', helper: 'Kleur voor house popup lijn 3 tekst.' },
          sensor_popup_house_3_font_size: { label: 'Lettergrootte House Popup 3 (px)', helper: 'Lettergrootte voor house popup lijn 3. Standaard 16' },
          sensor_popup_house_4: { label: 'House Popup 4', helper: 'Entiteit voor house popup lijn 4.' },
          sensor_popup_house_4_name: { label: 'Naam House Popup 4', helper: 'Optionele aangepaste naam voor house popup lijn 4. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_house_4_color: { label: 'Kleur House Popup 4', helper: 'Kleur voor house popup lijn 4 tekst.' },
          sensor_popup_house_4_font_size: { label: 'Lettergrootte House Popup 4 (px)', helper: 'Lettergrootte voor house popup lijn 4. Standaard 16' },
          sensor_popup_house_5: { label: 'House Popup 5', helper: 'Entiteit voor house popup lijn 5.' },
          sensor_popup_house_5_name: { label: 'Naam House Popup 5', helper: 'Optionele aangepaste naam voor house popup lijn 5. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_house_5_color: { label: 'Kleur House Popup 5', helper: 'Kleur voor house popup lijn 5 tekst.' },
          sensor_popup_house_5_font_size: { label: 'Lettergrootte House Popup 5 (px)', helper: 'Lettergrootte voor house popup lijn 5. Standaard 16' },
          sensor_popup_house_6: { label: 'House Popup 6', helper: 'Entiteit voor house popup lijn 6.' },
          sensor_popup_house_6_name: { label: 'Naam House Popup 6', helper: 'Optionele aangepaste naam voor house popup lijn 6. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_house_6_color: { label: 'Kleur House Popup 6', helper: 'Kleur voor house popup lijn 6 tekst.' },
          sensor_popup_house_6_font_size: { label: 'Lettergrootte House Popup 6 (px)', helper: 'Lettergrootte voor house popup lijn 6. Standaard 16' }
        },
        options: {
          languages: [
            { value: 'en', label: 'English' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Deutsch' },
            { value: 'fr', label: 'Français' },
            { value: 'nl', label: 'Nederlands' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Strepen (standaard)' },
            { value: 'dots', label: 'Stippen' },
            { value: 'arrows', label: 'Pijlen' }
          ],
          grid_flow_modes: [
            { value: 'grid_to_inverter', label: 'Net naar Omvormer' },
            { value: 'grid_to_house_inverter', label: 'Net naar Huis - Omvormer' }
          ]
        },
        view: {
          daily: 'DAGOPBRENGST',
          pv_tot: 'PV TOTAAL',
          car1: 'AUTO 1',
          car2: 'AUTO 2',
          importing: 'IMPORTEREN',
          exporting: 'EXPORTEREN'
        }
      },
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
    const base = this._strings.en || {};
    const selected = this._strings[lang] || {};
    // Merge top-level sections, fields, and options so missing entries fall back to English
    const merged = {
      sections: { ...(base.sections || {}), ...(selected.sections || {}) },
      fields: { ...(base.fields || {}), ...(selected.fields || {}) },
      options: { ...(base.options || {}), ...(selected.options || {}) }
    };
    return merged;
  }

  _createOptionDefs(localeStrings) {
    return {
      language: this._getAvailableLanguageOptions(localeStrings),
      display_unit: localeStrings.options.display_units,
      animation_style: localeStrings.options.animation_styles,
      grid_flow_mode: localeStrings.options.grid_flow_modes
    };
  }

  _getAvailableLanguageOptions(localeStrings) {
    const displayLang = this._currentLanguage();
    const keys = this._strings ? Object.keys(this._strings) : [];
    const codes = Array.from(new Set(keys)).filter(k => typeof k === 'string' && k.length === 2);

    const options = codes.map((lang) => {
      let label = null;
      // Fallback to built-in options block if available
      if (localeStrings && localeStrings.options && Array.isArray(localeStrings.options.languages)) {
        label = (localeStrings.options.languages.find((o) => o.value === lang) || {}).label;
      }
      return { value: lang, label: label || lang };
    });
    // Ensure English is always present and first
    const hasEn = options.find(o => o.value === 'en');
    if (!hasEn) options.unshift({ value: 'en', label: 'English' });
    else options.sort((a, b) => (a.value === 'en' ? -1 : (b.value === 'en' ? 1 : a.value.localeCompare(b.value))));
    return options;
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
    const configWithDefaults = this._configWithDefaults();
    const displayUnitValue = (configWithDefaults.display_unit || 'kW').toUpperCase();
    const buildThresholdSelector = () => (
      displayUnitValue === 'KW'
        ? { number: { min: 0, max: 100, step: 0.05, unit_of_measurement: 'kW' } }
        : { number: { min: 0, max: 100000, step: 50, unit_of_measurement: 'W' } }
    );

    return {
      general: define([
        { name: 'card_title', label: fields.card_title.label, helper: fields.card_title.helper, selector: { text: { mode: 'blur' } } },
        { name: 'background_image', label: fields.background_image.label, helper: fields.background_image.helper, selector: { text: { mode: 'blur' } } },
        { name: 'language', label: fields.language.label, helper: fields.language.helper, selector: { select: { options: optionDefs.language } } },
        { name: 'display_unit', label: fields.display_unit.label, helper: fields.display_unit.helper, selector: { select: { options: optionDefs.display_unit } } },
        { name: 'update_interval', label: fields.update_interval.label, helper: fields.update_interval.helper, selector: { number: { min: 0, max: 60, step: 5, mode: 'slider', unit_of_measurement: 's' } } },
        { name: 'animation_speed_factor', label: fields.animation_speed_factor.label, helper: fields.animation_speed_factor.helper, selector: { number: { min: -3, max: 3, step: 0.25, mode: 'slider', unit_of_measurement: 'x' } } },
        { name: 'animation_style', label: fields.animation_style.label, helper: fields.animation_style.helper, selector: { select: { options: optionDefs.animation_style } } },
        
      ]),
      array1: define([
        { name: 'sensor_pv_total', label: fields.sensor_pv_total.label, helper: fields.sensor_pv_total.helper, selector: entitySelector },
        { name: 'sensor_pv1', label: fields.sensor_pv1.label, helper: fields.sensor_pv1.helper, selector: entitySelector },
        { name: 'sensor_pv2', label: fields.sensor_pv2.label, helper: fields.sensor_pv2.helper, selector: entitySelector },
        { name: 'sensor_pv3', label: fields.sensor_pv3.label, helper: fields.sensor_pv3.helper, selector: entitySelector },
        { name: 'sensor_pv4', label: fields.sensor_pv4.label, helper: fields.sensor_pv4.helper, selector: entitySelector },
        { name: 'sensor_pv5', label: fields.sensor_pv5.label, helper: fields.sensor_pv5.helper, selector: entitySelector },
        { name: 'sensor_pv6', label: fields.sensor_pv6.label, helper: fields.sensor_pv6.helper, selector: entitySelector },
        { name: 'sensor_daily', label: fields.sensor_daily.label, helper: fields.sensor_daily.helper, selector: entitySelector },
        { name: 'show_pv_strings', label: fields.show_pv_strings.label, helper: fields.show_pv_strings.helper, selector: { boolean: {} } },
        { name: 'sensor_home_load', label: fields.sensor_home_load.label, helper: fields.sensor_home_load.helper, selector: entitySelector },
        
      ]),
      array2: define([
        { name: 'solar_array2_title', label: fields.solar_array2_title.label, helper: fields.solar_array2_title.helper, selector: { text: { mode: 'blur' } } },
        { name: 'sensor_pv_total_secondary', label: fields.sensor_pv_total_secondary.label, helper: fields.sensor_pv_total_secondary.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_1', label: fields.sensor_pv_array2_1.label, helper: fields.sensor_pv_array2_1.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_2', label: fields.sensor_pv_array2_2.label, helper: fields.sensor_pv_array2_2.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_3', label: fields.sensor_pv_array2_3.label, helper: fields.sensor_pv_array2_3.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_4', label: fields.sensor_pv_array2_4.label, helper: fields.sensor_pv_array2_4.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_5', label: fields.sensor_pv_array2_5.label, helper: fields.sensor_pv_array2_5.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_6', label: fields.sensor_pv_array2_6.label, helper: fields.sensor_pv_array2_6.helper, selector: entitySelector },
        { name: 'solar_array2_activation_helper', label: fields.solar_array2_activation_helper.label, helper: fields.solar_array2_activation_helper.helper, selector: { text: { mode: 'blur' } } },
        { name: 'sensor_daily_array2', label: fields.sensor_daily_array2.label, helper: fields.sensor_daily_array2.helper, selector: entitySelector },
        { name: 'sensor_home_load_secondary', label: fields.sensor_home_load_secondary.label, helper: fields.sensor_home_load_secondary.helper, selector: entitySelector },
        
      ]),
      battery: define([
        { name: 'sensor_bat1_soc', label: fields.sensor_bat1_soc.label, helper: fields.sensor_bat1_soc.helper, selector: entitySelector },
        { name: 'sensor_bat1_power', label: fields.sensor_bat1_power.label, helper: fields.sensor_bat1_power.helper, selector: entitySelector },
        { name: 'sensor_bat2_soc', label: fields.sensor_bat2_soc.label, helper: fields.sensor_bat2_soc.helper, selector: entitySelector },
        { name: 'sensor_bat2_power', label: fields.sensor_bat2_power.label, helper: fields.sensor_bat2_power.helper, selector: entitySelector },
        { name: 'sensor_bat3_soc', label: fields.sensor_bat3_soc.label, helper: fields.sensor_bat3_soc.helper, selector: entitySelector },
        { name: 'sensor_bat3_power', label: fields.sensor_bat3_power.label, helper: fields.sensor_bat3_power.helper, selector: entitySelector },
        { name: 'sensor_bat4_soc', label: fields.sensor_bat4_soc.label, helper: fields.sensor_bat4_soc.helper, selector: entitySelector },
        { name: 'sensor_bat4_power', label: fields.sensor_bat4_power.label, helper: fields.sensor_bat4_power.helper, selector: entitySelector },
        { name: 'invert_battery', label: fields.invert_battery.label, helper: fields.invert_battery.helper, selector: { boolean: {} } },
        
      ]),
      grid: define([
        { name: 'sensor_grid_power', label: fields.sensor_grid_power.label, helper: fields.sensor_grid_power.helper, selector: entitySelector },
        { name: 'sensor_grid_import', label: fields.sensor_grid_import.label, helper: fields.sensor_grid_import.helper, selector: entitySelector },
        { name: 'sensor_grid_export', label: fields.sensor_grid_export.label, helper: fields.sensor_grid_export.helper, selector: entitySelector },
        { name: 'invert_grid', label: fields.invert_grid.label, helper: fields.invert_grid.helper, selector: { boolean: {} } },
        { name: 'sensor_grid_import_daily', label: fields.sensor_grid_import_daily.label, helper: fields.sensor_grid_import_daily.helper, selector: entitySelector },
        { name: 'sensor_grid_export_daily', label: fields.sensor_grid_export_daily.label, helper: fields.sensor_grid_export_daily.helper, selector: entitySelector },
        { name: 'show_daily_grid', label: fields.show_daily_grid.label, helper: fields.show_daily_grid.helper, selector: { boolean: {} } },
        { name: 'grid_flow_mode', label: fields.grid_flow_mode.label, helper: fields.grid_flow_mode.helper, selector: { select: { options: optionDefs.grid_flow_mode } } },
        
      ]),
      car: define([
        { name: 'sensor_car_power', label: fields.sensor_car_power.label, helper: fields.sensor_car_power.helper, selector: entitySelector },
        { name: 'car_soc', label: fields.car_soc.label, helper: fields.car_soc.helper, selector: entitySelector },
        { name: 'car_charger_power', label: fields.car_charger_power.label, helper: fields.car_charger_power.helper, selector: entitySelector },
        { name: 'car2_power', label: fields.car2_power.label, helper: fields.car2_power.helper, selector: entitySelector },
        { name: 'car2_soc', label: fields.car2_soc.label, helper: fields.car2_soc.helper, selector: entitySelector },
        { name: 'car2_charger_power', label: fields.car2_charger_power.label, helper: fields.car2_charger_power.helper, selector: entitySelector },
        
      ]),
      entities: define([
        
      ]),
      colors: define([
        { name: 'pv_tot_color', label: fields.pv_tot_color.label, helper: fields.pv_tot_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
        { name: 'pv_primary_color', label: fields.pv_primary_color.label, helper: fields.pv_primary_color.helper, selector: { color_picker: {} } },
        { name: 'pv_secondary_color', label: fields.pv_secondary_color.label, helper: fields.pv_secondary_color.helper, selector: { color_picker: {} } },
        { name: 'pv_string1_color', label: fields.pv_string1_color.label, helper: fields.pv_string1_color.helper, selector: { color_picker: {} } },
        { name: 'pv_string2_color', label: fields.pv_string2_color.label, helper: fields.pv_string2_color.helper, selector: { color_picker: {} } },
        { name: 'pv_string3_color', label: fields.pv_string3_color.label, helper: fields.pv_string3_color.helper, selector: { color_picker: {} } },
        { name: 'pv_string4_color', label: fields.pv_string4_color.label, helper: fields.pv_string4_color.helper, selector: { color_picker: {} } },
        { name: 'pv_string5_color', label: fields.pv_string5_color.label, helper: fields.pv_string5_color.helper, selector: { color_picker: {} } },
        { name: 'pv_string6_color', label: fields.pv_string6_color.label, helper: fields.pv_string6_color.helper, selector: { color_picker: {} } },
        { name: 'load_flow_color', label: fields.load_flow_color.label, helper: fields.load_flow_color.helper, selector: { color_picker: {} } },
        { name: 'house_total_color', label: fields.house_total_color.label, helper: fields.house_total_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
        { name: 'inv1_color', label: fields.inv1_color.label, helper: fields.inv1_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
        { name: 'inv2_color', label: fields.inv2_color.label, helper: fields.inv2_color.helper, selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'load_threshold_warning', label: fields.load_threshold_warning.label, helper: fields.load_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
        { name: 'load_warning_color', label: fields.load_warning_color.label, helper: fields.load_warning_color.helper, selector: { color_picker: {} } },
        { name: 'load_threshold_critical', label: fields.load_threshold_critical.label, helper: fields.load_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
        { name: 'load_critical_color', label: fields.load_critical_color.label, helper: fields.load_critical_color.helper, selector: { color_picker: {} } },
        { name: 'battery_charge_color', label: fields.battery_charge_color.label, helper: fields.battery_charge_color.helper, selector: { color_picker: {} } },
        { name: 'battery_discharge_color', label: fields.battery_discharge_color.label, helper: fields.battery_discharge_color.helper, selector: { color_picker: {} } },
        { name: 'grid_import_color', label: fields.grid_import_color.label, helper: fields.grid_import_color.helper, selector: { color_picker: {} } },
        { name: 'grid_export_color', label: fields.grid_export_color.label, helper: fields.grid_export_color.helper, selector: { color_picker: {} } },
        { name: 'car_flow_color', label: fields.car_flow_color.label, helper: fields.car_flow_color.helper, selector: { color_picker: {} } },
        { name: 'battery_fill_high_color', label: fields.battery_fill_high_color.label, helper: fields.battery_fill_high_color.helper, selector: { color_picker: {} } },
        { name: 'battery_fill_low_color', label: fields.battery_fill_low_color.label, helper: fields.battery_fill_low_color.helper, selector: { color_picker: {} } },
        { name: 'battery_fill_low_threshold', label: fields.battery_fill_low_threshold.label, helper: fields.battery_fill_low_threshold.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } }, default: DEFAULT_BATTERY_LOW_THRESHOLD },
        { name: 'grid_activity_threshold', label: fields.grid_activity_threshold.label, helper: fields.grid_activity_threshold.helper, selector: { number: { min: 0, max: 100000, step: 10 } }, default: DEFAULT_GRID_ACTIVITY_THRESHOLD },
        { name: 'grid_threshold_warning', label: fields.grid_threshold_warning.label, helper: fields.grid_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
        { name: 'grid_warning_color', label: fields.grid_warning_color.label, helper: fields.grid_warning_color.helper, selector: { color_picker: {} } },
        { name: 'grid_threshold_critical', label: fields.grid_threshold_critical.label, helper: fields.grid_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
        { name: 'grid_critical_color', label: fields.grid_critical_color.label, helper: fields.grid_critical_color.helper, selector: { color_picker: {} } },
        { name: 'car_pct_color', label: fields.car_pct_color.label, helper: fields.car_pct_color.helper, selector: { color_picker: {} }, default: '#00FFFF' }
        ,{ name: 'car2_pct_color', label: fields.car2_pct_color.label, helper: fields.car2_pct_color.helper, selector: { color_picker: {} }, default: '' }
        ,{ name: 'car1_name_color', label: fields.car1_name_color.label, helper: fields.car1_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' }
        ,{ name: 'car2_name_color', label: fields.car2_name_color.label, helper: fields.car2_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' }
        ,{ name: 'car1_color', label: fields.car1_color.label, helper: fields.car1_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' }
        ,{ name: 'car2_color', label: fields.car2_color.label, helper: fields.car2_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' }
        ,{ name: 'sensor_popup_pv_1_color', label: (fields.sensor_popup_pv_1_color && fields.sensor_popup_pv_1_color.label) || '', helper: (fields.sensor_popup_pv_1_color && fields.sensor_popup_pv_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_pv_2_color', label: (fields.sensor_popup_pv_2_color && fields.sensor_popup_pv_2_color.label) || '', helper: (fields.sensor_popup_pv_2_color && fields.sensor_popup_pv_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_pv_3_color', label: (fields.sensor_popup_pv_3_color && fields.sensor_popup_pv_3_color.label) || '', helper: (fields.sensor_popup_pv_3_color && fields.sensor_popup_pv_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_pv_4_color', label: (fields.sensor_popup_pv_4_color && fields.sensor_popup_pv_4_color.label) || '', helper: (fields.sensor_popup_pv_4_color && fields.sensor_popup_pv_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_pv_5_color', label: (fields.sensor_popup_pv_5_color && fields.sensor_popup_pv_5_color.label) || '', helper: (fields.sensor_popup_pv_5_color && fields.sensor_popup_pv_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_pv_6_color', label: (fields.sensor_popup_pv_6_color && fields.sensor_popup_pv_6_color.label) || '', helper: (fields.sensor_popup_pv_6_color && fields.sensor_popup_pv_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_house_1_color', label: (fields.sensor_popup_house_1_color && fields.sensor_popup_house_1_color.label) || '', helper: (fields.sensor_popup_house_1_color && fields.sensor_popup_house_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_house_2_color', label: (fields.sensor_popup_house_2_color && fields.sensor_popup_house_2_color.label) || '', helper: (fields.sensor_popup_house_2_color && fields.sensor_popup_house_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_house_3_color', label: (fields.sensor_popup_house_3_color && fields.sensor_popup_house_3_color.label) || '', helper: (fields.sensor_popup_house_3_color && fields.sensor_popup_house_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_house_4_color', label: (fields.sensor_popup_house_4_color && fields.sensor_popup_house_4_color.label) || '', helper: (fields.sensor_popup_house_4_color && fields.sensor_popup_house_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_house_5_color', label: (fields.sensor_popup_house_5_color && fields.sensor_popup_house_5_color.label) || '', helper: (fields.sensor_popup_house_5_color && fields.sensor_popup_house_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_house_6_color', label: (fields.sensor_popup_house_6_color && fields.sensor_popup_house_6_color.label) || '', helper: (fields.sensor_popup_house_6_color && fields.sensor_popup_house_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_bat_1_color', label: (fields.sensor_popup_bat_1_color && fields.sensor_popup_bat_1_color.label) || '', helper: (fields.sensor_popup_bat_1_color && fields.sensor_popup_bat_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_bat_2_color', label: (fields.sensor_popup_bat_2_color && fields.sensor_popup_bat_2_color.label) || '', helper: (fields.sensor_popup_bat_2_color && fields.sensor_popup_bat_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_bat_3_color', label: (fields.sensor_popup_bat_3_color && fields.sensor_popup_bat_3_color.label) || '', helper: (fields.sensor_popup_bat_3_color && fields.sensor_popup_bat_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_bat_4_color', label: (fields.sensor_popup_bat_4_color && fields.sensor_popup_bat_4_color.label) || '', helper: (fields.sensor_popup_bat_4_color && fields.sensor_popup_bat_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_bat_5_color', label: (fields.sensor_popup_bat_5_color && fields.sensor_popup_bat_5_color.label) || '', helper: (fields.sensor_popup_bat_5_color && fields.sensor_popup_bat_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
        ,{ name: 'sensor_popup_bat_6_color', label: (fields.sensor_popup_bat_6_color && fields.sensor_popup_bat_6_color.label) || '', helper: (fields.sensor_popup_bat_6_color && fields.sensor_popup_bat_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' }
      ]),
      typography: define([
        { name: 'header_font_size', label: fields.header_font_size.label, helper: fields.header_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'daily_label_font_size', label: fields.daily_label_font_size.label, helper: fields.daily_label_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'daily_value_font_size', label: fields.daily_value_font_size.label, helper: fields.daily_value_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'pv_font_size', label: fields.pv_font_size.label, helper: fields.pv_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'battery_soc_font_size', label: fields.battery_soc_font_size.label, helper: fields.battery_soc_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'battery_power_font_size', label: fields.battery_power_font_size.label, helper: fields.battery_power_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'load_font_size', label: fields.load_font_size.label, helper: fields.load_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'grid_font_size', label: fields.grid_font_size.label, helper: fields.grid_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'car_power_font_size', label: fields.car_power_font_size.label, helper: fields.car_power_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'car2_power_font_size', label: (fields.car2_power_font_size && fields.car2_power_font_size.label) || '', helper: (fields.car2_power_font_size && fields.car2_power_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car_name_font_size', label: (fields.car_name_font_size && fields.car_name_font_size.label) || '', helper: (fields.car_name_font_size && fields.car_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car2_name_font_size', label: (fields.car2_name_font_size && fields.car2_name_font_size.label) || '', helper: (fields.car2_name_font_size && fields.car2_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car_soc_font_size', label: (fields.car_soc_font_size && fields.car_soc_font_size.label) || '', helper: (fields.car_soc_font_size && fields.car_soc_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car2_soc_font_size', label: (fields.car2_soc_font_size && fields.car2_soc_font_size.label) || '', helper: (fields.car2_soc_font_size && fields.car2_soc_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_1_font_size', label: (fields.sensor_popup_pv_1_font_size && fields.sensor_popup_pv_1_font_size.label) || '', helper: (fields.sensor_popup_pv_1_font_size && fields.sensor_popup_pv_1_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_2_font_size', label: (fields.sensor_popup_pv_2_font_size && fields.sensor_popup_pv_2_font_size.label) || '', helper: (fields.sensor_popup_pv_2_font_size && fields.sensor_popup_pv_2_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_3_font_size', label: (fields.sensor_popup_pv_3_font_size && fields.sensor_popup_pv_3_font_size.label) || '', helper: (fields.sensor_popup_pv_3_font_size && fields.sensor_popup_pv_3_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_4_font_size', label: (fields.sensor_popup_pv_4_font_size && fields.sensor_popup_pv_4_font_size.label) || '', helper: (fields.sensor_popup_pv_4_font_size && fields.sensor_popup_pv_4_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_5_font_size', label: (fields.sensor_popup_pv_5_font_size && fields.sensor_popup_pv_5_font_size.label) || '', helper: (fields.sensor_popup_pv_5_font_size && fields.sensor_popup_pv_5_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_6_font_size', label: (fields.sensor_popup_pv_6_font_size && fields.sensor_popup_pv_6_font_size.label) || '', helper: (fields.sensor_popup_pv_6_font_size && fields.sensor_popup_pv_6_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_1_font_size', label: (fields.sensor_popup_house_1_font_size && fields.sensor_popup_house_1_font_size.label) || '', helper: (fields.sensor_popup_house_1_font_size && fields.sensor_popup_house_1_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_2_font_size', label: (fields.sensor_popup_house_2_font_size && fields.sensor_popup_house_2_font_size.label) || '', helper: (fields.sensor_popup_house_2_font_size && fields.sensor_popup_house_2_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_3_font_size', label: (fields.sensor_popup_house_3_font_size && fields.sensor_popup_house_3_font_size.label) || '', helper: (fields.sensor_popup_house_3_font_size && fields.sensor_popup_house_3_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_4_font_size', label: (fields.sensor_popup_house_4_font_size && fields.sensor_popup_house_4_font_size.label) || '', helper: (fields.sensor_popup_house_4_font_size && fields.sensor_popup_house_4_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_5_font_size', label: (fields.sensor_popup_house_5_font_size && fields.sensor_popup_house_5_font_size.label) || '', helper: (fields.sensor_popup_house_5_font_size && fields.sensor_popup_house_5_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_6_font_size', label: (fields.sensor_popup_house_6_font_size && fields.sensor_popup_house_6_font_size.label) || '', helper: (fields.sensor_popup_house_6_font_size && fields.sensor_popup_house_6_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_bat_1_font_size', label: (fields.sensor_popup_bat_1_font_size && fields.sensor_popup_bat_1_font_size.label) || '', helper: (fields.sensor_popup_bat_1_font_size && fields.sensor_popup_bat_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_2_font_size', label: (fields.sensor_popup_bat_2_font_size && fields.sensor_popup_bat_2_font_size.label) || '', helper: (fields.sensor_popup_bat_2_font_size && fields.sensor_popup_bat_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_3_font_size', label: (fields.sensor_popup_bat_3_font_size && fields.sensor_popup_bat_3_font_size.label) || '', helper: (fields.sensor_popup_bat_3_font_size && fields.sensor_popup_bat_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_4_font_size', label: (fields.sensor_popup_bat_4_font_size && fields.sensor_popup_bat_4_font_size.label) || '', helper: (fields.sensor_popup_bat_4_font_size && fields.sensor_popup_bat_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_5_font_size', label: (fields.sensor_popup_bat_5_font_size && fields.sensor_popup_bat_5_font_size.label) || '', helper: (fields.sensor_popup_bat_5_font_size && fields.sensor_popup_bat_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_6_font_size', label: (fields.sensor_popup_bat_6_font_size && fields.sensor_popup_bat_6_font_size.label) || '', helper: (fields.sensor_popup_bat_6_font_size && fields.sensor_popup_bat_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' }
      ]),
      pvPopup: define([
        { name: 'sensor_popup_pv_1', label: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.label) || '', helper: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.helper) || '', selector: entitySelector },
        { name: 'sensor_popup_pv_1_name', label: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.label) || '', helper: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_2', label: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.label) || '', helper: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.helper) || '', selector: entitySelector },
        { name: 'sensor_popup_pv_2_name', label: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.label) || '', helper: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_3', label: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.label) || '', helper: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.helper) || '', selector: entitySelector },
        { name: 'sensor_popup_pv_3_name', label: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.label) || '', helper: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_4', label: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.label) || '', helper: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.helper) || '', selector: entitySelector },
        { name: 'sensor_popup_pv_4_name', label: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.label) || '', helper: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_5', label: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.label) || '', helper: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.helper) || '', selector: entitySelector },
        { name: 'sensor_popup_pv_5_name', label: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.label) || '', helper: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_6', label: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.label) || '', helper: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.helper) || '', selector: entitySelector },
        { name: 'sensor_popup_pv_6_name', label: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.label) || '', helper: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.helper) || '', selector: { text: {} } }
      ]),
      batteryPopup: define([
        { name: 'sensor_popup_bat_1', label: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.label) || '', helper: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_bat_1_name', label: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.label) || '', helper: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_2', label: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.label) || '', helper: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_bat_2_name', label: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.label) || '', helper: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_3', label: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.label) || '', helper: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_bat_3_name', label: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.label) || '', helper: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_4', label: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.label) || '', helper: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_bat_4_name', label: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.label) || '', helper: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_5', label: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.label) || '', helper: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_bat_5_name', label: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.label) || '', helper: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_6', label: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.label) || '', helper: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_bat_6_name', label: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.label) || '', helper: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.helper) || '', selector: { text: {} } }
      ]),
      housePopup: define([
        { name: 'sensor_popup_house_1', label: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.label) || '', helper: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_house_1_name', label: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.label) || '', helper: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_2', label: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.label) || '', helper: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_house_2_name', label: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.label) || '', helper: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_3', label: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.label) || '', helper: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_house_3_name', label: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.label) || '', helper: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_4', label: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.label) || '', helper: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_house_4_name', label: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.label) || '', helper: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_5', label: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.label) || '', helper: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_house_5_name', label: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.label) || '', helper: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_6', label: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.label) || '', helper: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.helper) || '', selector: { entity: {} } },
        { name: 'sensor_popup_house_6_name', label: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.label) || '', helper: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.helper) || '', selector: { text: {} } }
      ])
    };
  }

  _createSectionDefs(localeStrings, schemaDefs) {
    const sections = localeStrings.sections;
    return [
      { id: 'array1', title: sections.array1.title, helper: sections.array1.helper, schema: schemaDefs.array1, defaultOpen: false },
      { id: 'array2', title: sections.array2.title, helper: sections.array2.helper, renderContent: () => {
        const wrapper = document.createElement('div');
        wrapper.appendChild(this._createForm(schemaDefs.array2));
        return wrapper;
      }, defaultOpen: false },
      { id: 'battery', title: sections.battery.title, helper: sections.battery.helper, schema: schemaDefs.battery, defaultOpen: false },
      { id: 'grid', title: sections.grid.title, helper: sections.grid.helper, schema: schemaDefs.grid, defaultOpen: false },
      { id: 'car', title: sections.car.title, helper: sections.car.helper, schema: schemaDefs.car, defaultOpen: false },
      { id: 'pvPopup', title: sections.pvPopup.title, helper: sections.pvPopup.helper, schema: schemaDefs.pvPopup, defaultOpen: false },
      { id: 'batteryPopup', title: sections.batteryPopup.title, helper: sections.batteryPopup.helper, schema: schemaDefs.batteryPopup, defaultOpen: false },
      { id: 'housePopup', title: sections.housePopup.title, helper: sections.housePopup.helper, schema: schemaDefs.housePopup, defaultOpen: false },
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

  _debouncedConfigChanged(newConfig, immediate = false) {
    if (immediate) {
      if (this._configChangeTimer) {
        clearTimeout(this._configChangeTimer);
        this._configChangeTimer = null;
      }
      this.configChanged(newConfig);
      return;
    }
    if (this._configChangeTimer) {
      clearTimeout(this._configChangeTimer);
    }
    const delay = 800;
    this._configChangeTimer = setTimeout(() => {
      this._configChangeTimer = null;
      this.configChanged(this._config);
    }, delay);
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
    const hasColorFields = schema.some(field => field.selector && field.selector.color_picker);
    // Force custom rendering when language is present so we can use a native dropdown
    const hasLanguageField = schema.some(field => field.name === 'language');
    
    if (hasColorFields || hasLanguageField) {
      return this._createCustomForm(schema);
    }
    
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
    // Apply config immediately when any inner input loses focus
    form.addEventListener('focusout', (ev) => {
      // Ensure the event originated from inside this form
      if (!form.contains(ev.target)) return;
      this._debouncedConfigChanged(this._config, true);
    });
    return form;
  }

  _createCustomForm(schema) {
    const container = document.createElement('div');
    container.className = 'custom-form';
    const data = this._configWithDefaults();

    schema.forEach(field => {
      if (field.selector && field.selector.color_picker) {
        container.appendChild(this._createColorPickerField(field, data[field.name] || field.default || ''));
      } else {
        container.appendChild(this._createStandardField(field, data[field.name] || field.default));
      }
    });

    return container;
  }

  _createColorPickerField(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-field-wrapper';

    const label = document.createElement('label');
    label.className = 'color-field-label';
    label.textContent = field.label || field.name;
    wrapper.appendChild(label);

    if (field.helper) {
      const helper = document.createElement('div');
      helper.className = 'color-field-helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'color-input-wrapper';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'color-text-input';
    textInput.value = value || '';
    textInput.placeholder = '#RRGGBB or CSS color';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-picker-input';
    colorInput.value = this._normalizeColorForPicker(value);

    textInput.addEventListener('input', (e) => {
      const color = e.target.value;
      const normalized = this._normalizeColorForPicker(color);
      if (normalized) {
        colorInput.value = normalized;
      }
      this._updateFieldValue(field.name, color);
    });

    // Apply config immediately when color inputs lose focus
    textInput.addEventListener('blur', () => {
      this._debouncedConfigChanged(this._config, true);
    });

    colorInput.addEventListener('input', (e) => {
      textInput.value = e.target.value;
      this._updateFieldValue(field.name, e.target.value);
    });

    colorInput.addEventListener('blur', () => {
      this._debouncedConfigChanged(this._config, true);
    });

    inputWrapper.appendChild(colorInput);
    inputWrapper.appendChild(textInput);
    wrapper.appendChild(inputWrapper);

    return wrapper;
  }

  _createStandardField(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'standard-field-wrapper';

    const label = document.createElement('label');
    label.textContent = field.label || field.name;
    wrapper.appendChild(label);

    if (field.helper) {
      const helper = document.createElement('div');
      helper.className = 'field-helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    const form = document.createElement('ha-form');
    form.hass = this._hass;
    form.data = { [field.name]: value };
    form.schema = [field];
    form.computeLabel = () => '';
    form.computeHelper = () => '';
    form.addEventListener('value-changed', (ev) => {
      if (ev.target !== form) {
        return;
      }
      const newValue = ev.detail.value[field.name];
      this._updateFieldValue(field.name, newValue);
    });
    // When an inner input loses focus, apply the config immediately
    form.addEventListener('focusout', (ev) => {
      if (!form.contains(ev.target)) return;
      this._debouncedConfigChanged(this._config, true);
    });

    // Render the language field as a native dropdown to support very long lists
    if (field.name === 'language') {
      const select = document.createElement('select');
      select.style.padding = '8px';
      select.style.border = '1px solid var(--divider-color)';
      select.style.borderRadius = '4px';
      select.style.background = 'var(--card-background-color)';
      select.style.color = 'var(--primary-text-color)';
      const localeStrings = this._getLocaleStrings();
      const opts = this._getAvailableLanguageOptions(localeStrings);
      opts.forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label || o.value;
        select.appendChild(opt);
      });
      select.value = value || (this._defaults && this._defaults.language) || 'en';
      select.addEventListener('change', (e) => {
        this._updateFieldValue(field.name, e.target.value);
        this._debouncedConfigChanged(this._config, true);
      });
      select.addEventListener('blur', () => this._debouncedConfigChanged(this._config, true));
      wrapper.appendChild(select);
    } else {
      wrapper.appendChild(form);
    }
    return wrapper;
  }

  _normalizeColorForPicker(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) {
      const hex = color.length === 7 ? color : '#000000';
      return hex;
    }
    const tempDiv = document.createElement('div');
    tempDiv.style.color = color;
    document.body.appendChild(tempDiv);
    const computed = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    const match = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#000000';
  }

  _updateFieldValue(fieldName, value) {
    if (!this._config) {
      this._config = {};
    }
    const newConfig = { ...this._config, [fieldName]: value };
    this._config = newConfig;
    this._debouncedConfigChanged(newConfig, false);
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

    const prevDisplayUnit = (this._config && this._config.display_unit ? this._config.display_unit : this._defaults.display_unit || 'kW').toUpperCase();
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

    const nextDisplayUnit = (newConfig.display_unit || prevDisplayUnit).toUpperCase();
    if (nextDisplayUnit !== prevDisplayUnit) {
      this._convertThresholdValues(newConfig, prevDisplayUnit, nextDisplayUnit);
    }

    this._config = newConfig;
    this._debouncedConfigChanged(newConfig, nextDisplayUnit !== prevDisplayUnit);
    // Only re-render the editor when the display unit changed because that
    // affects selector definitions (W vs kW). Re-rendering on every input
    // causes the active input to be recreated and loses focus while typing.
    if (nextDisplayUnit !== prevDisplayUnit) {
      this._rendered = false;
      this.render();
    }
  }

  _convertThresholdValues(config, fromUnit, toUnit) {
    const normalizeUnit = (unit) => (unit || 'kW').toUpperCase();
    const sourceUnit = normalizeUnit(fromUnit);
    const targetUnit = normalizeUnit(toUnit);
    if (sourceUnit === targetUnit) {
      return;
    }

    let factor = null;
    if (sourceUnit === 'W' && targetUnit === 'KW') {
      factor = 1 / 1000;
    } else if (sourceUnit === 'KW' && targetUnit === 'W') {
      factor = 1000;
    }
    if (factor === null) {
      return;
    }

    const fieldsToConvert = ['load_threshold_warning', 'load_threshold_critical', 'grid_threshold_warning', 'grid_threshold_critical'];
    fieldsToConvert.forEach((name) => {
      const hasOwn = Object.prototype.hasOwnProperty.call(config, name);
      const currentValue = hasOwn ? config[name] : (this._config ? this._config[name] : undefined);
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        if (hasOwn) {
          config[name] = currentValue;
        }
        return;
      }
      const numeric = Number(currentValue);
      if (!Number.isFinite(numeric)) {
        return;
      }
      const converted = numeric * factor;
      const precision = factor < 1 ? 3 : 0;
      const rounded = precision > 0 ? Number(converted.toFixed(precision)) : Math.round(converted);
      config[name] = rounded;
    });
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
      .custom-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .color-field-wrapper,
      .standard-field-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .color-field-label {
        font-weight: 500;
        font-size: 0.95em;
        color: var(--primary-text-color);
      }
      .color-field-helper,
      .field-helper {
        font-size: 0.85em;
        color: var(--secondary-text-color);
      }
      .color-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .color-picker-input {
        width: 48px;
        height: 32px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        cursor: pointer;
        padding: 2px;
      }
      .color-text-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 0.95em;
      }
      .color-text-input:focus {
        outline: none;
        border-color: var(--primary-color);
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
