/**
 * Lumina Energy Card
 * Custom Home Assistant card for energy flow visualization
 * Version: 1.1.14-test
 * Tested with Home Assistant 2025.12+
 */

class LuminaEnergyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._lastRender = 0;
    this._forceRender = false;
    this._flowAnimationState = new Map();
    this._hasRendered = false;
    this._domRefs = null;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this.config = config;
    this._forceRender = true;
    this._hasRendered = false;
    this._domRefs = null;
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

  getCardSize() {
    return 5;
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
      sensor_pv1: '',
      sensor_daily: '',
      sensor_bat1_soc: '',
      sensor_bat1_power: '',
      sensor_home_load: '',
      sensor_grid_power: '',
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
    if (this._flowAnimationState) {
      this._flowAnimationState.forEach((state) => {
        if (state && state.raf) {
          cancelAnimationFrame(state.raf);
        }
      });
      this._flowAnimationState.clear();
    }
    this._hasRendered = false;
    this._domRefs = null;
  }

  _applyFlowAnimationTargets(flowDurations) {
    if (!this.shadowRoot) {
      return;
    }
    if (!this._flowAnimationState) {
      this._flowAnimationState = new Map();
    }

    const seenKeys = new Set();
    Object.entries(flowDurations).forEach(([flowKey, seconds]) => {
      const elements = this.shadowRoot.querySelectorAll(`[data-flow-key="${flowKey}"]`);
      if (!elements || elements.length === 0) {
        return;
      }
      seenKeys.add(flowKey);
      elements.forEach((element) => {
        this._tweenFlowAnimation(flowKey, seconds, element);
      });
    });

    const keysToRemove = [];
    this._flowAnimationState.forEach((state, key) => {
      if (!seenKeys.has(key)) {
        if (state && state.raf) {
          cancelAnimationFrame(state.raf);
        }
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((key) => this._flowAnimationState.delete(key));
  }

  _flowEasingGain() {
    const rawFactor = Number(this.config && this.config.animation_speed_factor);
    const clampedFactor = Number.isFinite(rawFactor) ? Math.min(Math.max(rawFactor, 0.25), 4) : 1;
    const gain = 0.1 + (clampedFactor - 0.25) * 0.066;
    return Math.min(Math.max(gain, 0.08), 0.35);
  }

  _tweenFlowAnimation(flowKey, targetSeconds, element) {
    if (!this._flowAnimationState) {
      this._flowAnimationState = new Map();
    }

    let state = this._flowAnimationState.get(flowKey);
    const easingGain = this._flowEasingGain();
    const normalizedTarget = Number.isFinite(targetSeconds) ? Math.max(targetSeconds, 0) : 0;

    if (!state) {
      state = {
        current: normalizedTarget,
        target: normalizedTarget,
        element,
        raf: null,
        gain: easingGain
      };
      element.style.animationDuration = `${normalizedTarget}s`;
      this._flowAnimationState.set(flowKey, state);
      return;
    }

    state.element = element;
    state.target = normalizedTarget;
    state.gain = easingGain;

    if (!Number.isFinite(state.current)) {
      state.current = normalizedTarget;
    }

    // Ensure the element reflects the current duration immediately.
    element.style.animationDuration = `${Math.max(state.current, 0)}s`;

    if (normalizedTarget <= 0) {
      element.style.animationDuration = '0s';
      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = null;
      }
      state.current = 0;
      return;
    }

    if (state.raf) {
      return;
    }

    const step = () => {
      if (!state.element || !state.element.isConnected) {
        state.raf = null;
        return;
      }
      const diff = state.target - state.current;
      if (Math.abs(diff) <= 0.01) {
        state.current = state.target;
        state.element.style.animationDuration = `${state.current}s`;
        state.raf = null;
        return;
      }
      const gain = state.gain || 0.15;
      state.current += diff * gain;
      state.element.style.animationDuration = `${Math.max(state.current, 0.001)}s`;
      state.raf = requestAnimationFrame(step);
    };

    state.raf = requestAnimationFrame(step);
  }

  _cacheDomReferences() {
    if (!this.shadowRoot) {
      return;
    }
    this._domRefs = {
      background: this.shadowRoot.querySelector('[data-role="background-image"]'),
      title: this.shadowRoot.querySelector('[data-role="title-text"]'),
      dailyLabel: this.shadowRoot.querySelector('[data-role="daily-label"]'),
      dailyValue: this.shadowRoot.querySelector('[data-role="daily-value"]'),
      batteryLiquidGroup: this.shadowRoot.querySelector('[data-role="battery-liquid-group"]'),
      batteryLiquidShape: this.shadowRoot.querySelector('[data-role="battery-liquid-shape"]'),
      pvLineA: this.shadowRoot.querySelector('[data-role="pv-line-a"]'),
      pvLineB: this.shadowRoot.querySelector('[data-role="pv-line-b"]'),
      batterySocText: this.shadowRoot.querySelector('[data-role="battery-soc"]'),
      batteryPowerText: this.shadowRoot.querySelector('[data-role="battery-power"]'),
      loadText: this.shadowRoot.querySelector('[data-role="load-power"]'),
      gridText: this.shadowRoot.querySelector('[data-role="grid-power"]'),
      carPowerText: this.shadowRoot.querySelector('[data-role="car-power"]'),
      carSocText: this.shadowRoot.querySelector('[data-role="car-soc"]'),
      flows: {
        pv1: this.shadowRoot.querySelector('[data-flow-key="pv1"]'),
        pv2: this.shadowRoot.querySelector('[data-flow-key="pv2"]'),
        bat: this.shadowRoot.querySelector('[data-flow-key="bat"]'),
        load: this.shadowRoot.querySelector('[data-flow-key="load"]'),
        grid: this.shadowRoot.querySelector('[data-flow-key="grid"]'),
        car: this.shadowRoot.querySelector('[data-flow-key="car"]')
      }
    };
  }

  _updateView(viewState) {
    if (!this._domRefs) {
      return;
    }

    const {
      background,
      title,
      dailyLabel,
      dailyValue,
      batteryLiquidGroup,
      batteryLiquidShape,
      pvLineA,
      pvLineB,
      batterySocText,
      batteryPowerText,
      loadText,
      gridText,
      carPowerText,
      carSocText,
      flows
    } = this._domRefs;

    if (background) {
      background.setAttribute('href', viewState.backgroundImage);
      background.setAttribute('xlink:href', viewState.backgroundImage);
    }

    if (title) {
      title.textContent = viewState.title.text;
      title.setAttribute('font-size', viewState.title.fontSize);
    }

    if (dailyLabel) {
      dailyLabel.textContent = viewState.daily.label;
      dailyLabel.style.fontSize = `${viewState.daily.labelSize}px`;
    }

    if (dailyValue) {
      dailyValue.textContent = viewState.daily.value;
      dailyValue.style.fontSize = `${viewState.daily.valueSize}px`;
    }

    if (batteryLiquidGroup) {
      batteryLiquidGroup.setAttribute('transform', `translate(0, ${viewState.battery.liquidOffset})`);
    }

    if (batteryLiquidShape) {
      batteryLiquidShape.setAttribute('fill', viewState.battery.liquidFill);
    }

    if (pvLineA) {
      pvLineA.textContent = viewState.pv.lineA.text;
      pvLineA.setAttribute('fill', viewState.pv.lineA.fill);
      pvLineA.setAttribute('font-size', viewState.pv.fontSize);
      pvLineA.setAttribute('y', viewState.pv.lineA.y);
      pvLineA.style.display = viewState.pv.lineA.visible ? '' : 'none';
    }

    if (pvLineB) {
      pvLineB.textContent = viewState.pv.lineB.text;
      pvLineB.setAttribute('fill', viewState.pv.lineB.fill);
      pvLineB.setAttribute('font-size', viewState.pv.fontSize);
      pvLineB.setAttribute('y', viewState.pv.lineB.y);
      pvLineB.style.display = viewState.pv.lineB.visible ? '' : 'none';
    }

    if (batterySocText) {
      batterySocText.textContent = viewState.batterySoc.text;
      batterySocText.setAttribute('font-size', viewState.batterySoc.fontSize);
      batterySocText.setAttribute('fill', viewState.batterySoc.fill);
    }

    if (batteryPowerText) {
      batteryPowerText.textContent = viewState.batteryPower.text;
      batteryPowerText.setAttribute('font-size', viewState.batteryPower.fontSize);
      batteryPowerText.setAttribute('fill', viewState.batteryPower.fill);
    }

    if (loadText) {
      loadText.textContent = viewState.load.text;
      loadText.setAttribute('font-size', viewState.load.fontSize);
      loadText.setAttribute('fill', viewState.load.fill);
    }

    if (gridText) {
      gridText.textContent = viewState.grid.text;
      gridText.setAttribute('font-size', viewState.grid.fontSize);
      gridText.setAttribute('fill', viewState.grid.fill);
    }

    if (carPowerText) {
      carPowerText.textContent = viewState.carPower.text;
      carPowerText.setAttribute('font-size', viewState.carPower.fontSize);
      carPowerText.setAttribute('fill', viewState.carPower.fill);
    }

    if (carSocText) {
      carSocText.textContent = viewState.carSoc.text;
      carSocText.setAttribute('font-size', viewState.carSoc.fontSize);
      carSocText.setAttribute('fill', viewState.carSoc.fill);
      carSocText.style.display = viewState.carSoc.visible ? '' : 'none';
    }

    if (flows) {
      Object.entries(viewState.flows).forEach(([key, flowState]) => {
        const el = flows[key];
        if (!el) {
          return;
        }
        const baseClass = 'flow-path';
        const className = flowState.className ? `${baseClass} ${flowState.className}` : baseClass;
        el.setAttribute('class', className);
        if (flowState.stroke) {
          el.setAttribute('stroke', flowState.stroke);
          const glowColor = flowState.glowColor || flowState.stroke;
          if (glowColor) {
            el.style.setProperty('--flow-glow-color', glowColor);
          } else {
            el.style.removeProperty('--flow-glow-color');
          }
        } else {
          el.removeAttribute('stroke');
          el.style.removeProperty('--flow-glow-color');
        }
      });
    }
  }

  _buildTemplate(viewState, templateCtx) {
    const {
      TxtStyle,
      BAT_X,
      BAT_Y_BASE,
      BAT_W,
      BAT_MAX_H,
      T_SOLAR_X,
      T_SOLAR_Y,
      T_BAT_X,
      T_BAT_Y,
      T_HOME_X,
      T_HOME_Y,
      T_GRID_X,
      T_GRID_Y,
      T_CAR_X,
      T_CAR_Y,
      bat_transform,
      trans_solar,
      trans_bat,
      trans_home,
      trans_grid,
      trans_car,
      PATH_PV1,
      PATH_PV2,
      PATH_BAT_INV,
      PATH_LOAD,
      PATH_GRID,
      PATH_CAR
    } = templateCtx;

    const pvLineBStyle = viewState.pv.lineB.visible ? '' : 'display: none;';
    const carSocStyle = viewState.carSoc.visible ? '' : 'display: none;';

    return `
      <style>
        :host {
          display: block;
          aspect-ratio: 16/9;
        }
        ha-card {
          height: 100%;
          overflow: hidden;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .track-path { stroke: #555555; stroke-width: 2px; fill: none; opacity: 0; }
        .flow-path {
          stroke-linecap: round;
          stroke-width: 3px;
          fill: none;
          opacity: 0;
          transition: opacity 0.5s ease;
          filter:
            drop-shadow(0 0 12px var(--flow-glow-color, rgba(0, 255, 255, 0.85)))
            drop-shadow(0 0 18px var(--flow-glow-color, rgba(0, 255, 255, 0.6)));
        }
        @keyframes pulse-cyan { 0% { filter: drop-shadow(0 0 2px #00FFFF); opacity: 0.9; } 50% { filter: drop-shadow(0 0 10px #00FFFF); opacity: 1; } 100% { filter: drop-shadow(0 0 2px #00FFFF); opacity: 0.9; } }
        .alive-box { animation: pulse-cyan 3s infinite ease-in-out; stroke: #00FFFF; stroke-width: 2px; fill: rgba(0, 20, 40, 0.7); }
        .alive-text { animation: pulse-cyan 3s infinite ease-in-out; fill: #00FFFF; text-shadow: 0 0 5px #00FFFF; }
        @keyframes wave-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-80px); } }
        .liquid-shape { animation: wave-slide 2s linear infinite; }
        .flow-pv1 { opacity: 1; }
        .flow-pv2 { opacity: 1; }
        .flow-generic { opacity: 1; }
        .flow-reverse { opacity: 1; }
        .flow-grid-import { opacity: 1; }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        .title-text { animation: pulse-cyan 2.5s infinite ease-in-out; fill: #00FFFF; font-weight: 900; font-family: 'Orbitron', sans-serif; text-anchor: middle; letter-spacing: 3px; text-transform: uppercase; }
      </style>
      <ha-card>
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 100%; height: 100%;">
          <defs>
            <clipPath id="battery-clip"><rect x="${BAT_X}" y="${BAT_Y_BASE - BAT_MAX_H}" width="${BAT_W}" height="${BAT_MAX_H}" rx="2" /></clipPath>
          </defs>

          <image data-role="background-image" href="${viewState.backgroundImage}" xlink:href="${viewState.backgroundImage}" x="0" y="0" width="800" height="450" preserveAspectRatio="none" />

          <rect x="290" y="10" width="220" height="32" rx="6" ry="6" fill="rgba(0, 20, 40, 0.85)" stroke="#00FFFF" stroke-width="1.5"/>
          <text data-role="title-text" x="400" y="32" class="title-text" font-size="${viewState.title.fontSize}">${viewState.title.text}</text>

          <g transform="translate(600, 370)">
            <rect x="0" y="0" width="180" height="60" rx="10" ry="10" class="alive-box" />
            <text data-role="daily-label" x="90" y="23" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.labelSize}px; font-weight:normal; letter-spacing: 1px;">${viewState.daily.label}</text>
            <text data-role="daily-value" x="90" y="50" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.valueSize}px; font-weight:bold;">${viewState.daily.value}</text>
          </g>

          <g transform="${bat_transform}">
            <g clip-path="url(#battery-clip)">
              <g data-role="battery-liquid-group" style="transition: transform 1s ease-in-out;" transform="translate(0, ${viewState.battery.liquidOffset})">
                <g transform="translate(0, ${BAT_Y_BASE - BAT_MAX_H})">
                  <path data-role="battery-liquid-shape" class="liquid-shape" fill="${viewState.battery.liquidFill}" d="M ${BAT_X - 20} 5 Q ${BAT_X} 0 ${BAT_X + 20} 5 T ${BAT_X + 60} 5 T ${BAT_X + 100} 5 T ${BAT_X + 140} 5 V 150 H ${BAT_X - 20} Z" />
                </g>
              </g>
            </g>
          </g>

          <path class="track-path" d="${PATH_PV1}" />
          <path class="flow-path ${viewState.flows.pv1.className}" data-flow-key="pv1" d="${PATH_PV1}" stroke="${viewState.flows.pv1.stroke}" />
          <path class="track-path" d="${PATH_PV2}" />
          <path class="flow-path ${viewState.flows.pv2.className}" data-flow-key="pv2" d="${PATH_PV2}" stroke="${viewState.flows.pv2.stroke}" />

          <path class="track-path" d="${PATH_BAT_INV}" /><path class="flow-path ${viewState.flows.bat.className}" data-flow-key="bat" d="${PATH_BAT_INV}" stroke="${viewState.flows.bat.stroke}" />
          <path class="track-path" d="${PATH_LOAD}" /><path class="flow-path ${viewState.flows.load.className}" data-flow-key="load" d="${PATH_LOAD}" stroke="${viewState.flows.load.stroke}" />
          <path class="track-path" d="${PATH_GRID}" /><path class="flow-path ${viewState.flows.grid.className}" data-flow-key="grid" d="${PATH_GRID}" stroke="${viewState.flows.grid.stroke}" />
          <path class="track-path" d="${PATH_CAR}" /><path class="flow-path ${viewState.flows.car.className}" data-flow-key="car" d="${PATH_CAR}" stroke="${viewState.flows.car.stroke}" />

          <text data-role="pv-line-a" x="${T_SOLAR_X}" y="${viewState.pv.lineA.y}" transform="${trans_solar}" fill="${viewState.pv.lineA.fill}" font-size="${viewState.pv.fontSize}" style="${TxtStyle}">${viewState.pv.lineA.text}</text>
          <text data-role="pv-line-b" x="${T_SOLAR_X}" y="${viewState.pv.lineB.y}" transform="${trans_solar}" fill="${viewState.pv.lineB.fill}" font-size="${viewState.pv.fontSize}" style="${TxtStyle}; ${pvLineBStyle}">${viewState.pv.lineB.text}</text>

          <text data-role="battery-soc" x="${T_BAT_X}" y="${T_BAT_Y}" transform="${trans_bat}" fill="${viewState.batterySoc.fill}" font-size="${viewState.batterySoc.fontSize}" style="${TxtStyle}">${viewState.batterySoc.text}</text>
          <text data-role="battery-power" x="${T_BAT_X}" y="${T_BAT_Y + 20}" transform="${trans_bat}" fill="${viewState.batteryPower.fill}" font-size="${viewState.batteryPower.fontSize}" style="${TxtStyle}">${viewState.batteryPower.text}</text>

          <text data-role="load-power" x="${T_HOME_X}" y="${T_HOME_Y}" transform="${trans_home}" fill="${viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TxtStyle}">${viewState.load.text}</text>
          <text data-role="grid-power" x="${T_GRID_X}" y="${T_GRID_Y}" transform="${trans_grid}" fill="${viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TxtStyle}">${viewState.grid.text}</text>

          <text data-role="car-power" x="${T_CAR_X}" y="${T_CAR_Y}" transform="${trans_car}" fill="${viewState.carPower.fill}" font-size="${viewState.carPower.fontSize}" style="${TxtStyle}">${viewState.carPower.text}</text>
          <text data-role="car-soc" x="${T_CAR_X}" y="${T_CAR_Y + 15}" transform="${trans_car}" fill="${viewState.carSoc.fill}" font-size="${viewState.carSoc.fontSize}" style="${TxtStyle}; ${carSocStyle}">${viewState.carSoc.text}</text>
        </svg>
      </ha-card>
    `;
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
    const pv_sensors = [
      config.sensor_pv1, config.sensor_pv2, config.sensor_pv3,
      config.sensor_pv4, config.sensor_pv5, config.sensor_pv6
    ].filter(s => s && s !== '');

    // Calculate PV totals
    let total_pv_w = 0;
    let pv1_val = 0, pv2_val = 0;
    pv_sensors.forEach((sensor, i) => {
      const val = this.getStateSafe(sensor);
      total_pv_w += val;
      if (i === 0) pv1_val = val;
      if (i === 1) pv2_val = val;
    });

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
    const grid_raw = this.getStateSafe(config.sensor_grid_power);
    const grid = config.invert_grid ? (grid_raw * -1) : grid_raw;
    const load = this.getStateSafe(config.sensor_home_load);
    const daily_raw = this.getStateSafe(config.sensor_daily);
    const total_daily_kwh = (daily_raw / 1000).toFixed(1);

    // EV Car
    const car_w = config.sensor_car_power ? this.getStateSafe(config.sensor_car_power) : 0;
    const car_soc = config.sensor_car_soc ? this.getStateSafe(config.sensor_car_soc) : null;

    // Display settings
    const bg_img = config.background_image || '/local/community/lumina-energy-card/lumina_background.jpg';
    const display_unit = config.display_unit || 'W';
    const use_kw = display_unit.toUpperCase() === 'KW';
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
    const animation_speed_factor = clampValue(config.animation_speed_factor, 0.25, 4, 1);

    // Language
    const lang = config.language || 'en';
    const dict_daily = { it: 'PRODUZIONE OGGI', en: 'DAILY YIELD', de: 'TAGESERTRAG' };
    const dict_pv_tot = { it: 'PV TOT', en: 'PV TOT', de: 'PV GES' };
    const label_daily = dict_daily[lang] || dict_daily['en'];
    const label_pv_tot = dict_pv_tot[lang] || dict_pv_tot['en'];

    // 3D coordinates
    const BAT_X = 260, BAT_Y_BASE = 350, BAT_W = 55, BAT_MAX_H = 84;
    const current_h = (avg_soc / 100) * BAT_MAX_H;
    const bat_transform = `translate(${BAT_X}, ${BAT_Y_BASE}) rotate(-6) skewX(-4) skewY(30) translate(-${BAT_X}, -${BAT_Y_BASE})`;

    // Text positions
    const T_SOLAR_X = 177, T_SOLAR_Y = 320;
    const T_BAT_X = 245, T_BAT_Y = 375;
    const T_HOME_X = 460, T_HOME_Y = 245;
    const T_GRID_X = 580, T_GRID_Y = 90;
    const T_CAR_X = 590, T_CAR_Y = 305;

    const getTxtTrans = (x, y, r, sx, sy) => 
      `translate(${x}, ${y}) rotate(${r}) skewX(${sx}) skewY(${sy}) translate(-${x}, -${y})`;

    const trans_solar = getTxtTrans(T_SOLAR_X, T_SOLAR_Y, -16, -20, 0);
    const trans_bat = getTxtTrans(T_BAT_X, T_BAT_Y, -25, -25, 5);
    const trans_home = getTxtTrans(T_HOME_X, T_HOME_Y, -20, -20, 3);
    const trans_grid = getTxtTrans(T_GRID_X, T_GRID_Y, -8, -10, 0);
    const trans_car = getTxtTrans(T_CAR_X, T_CAR_Y, 16, 20, 0);

    // Animation durations
    const getDur = (watts) => {
      const w = Math.abs(watts);
      if (w < 10) return '0s';
      const base = 30.0 - (Math.min(w / 6000, 1) * 29.5);
      const scaled = base / animation_speed_factor;
      return scaled.toFixed(2) + 's';
    };

    const dur_pv1 = getDur(total_pv_w);
    const dur_pv2 = getDur(total_pv_w);
    const show_double_flow = (pv_sensors.length >= 2 && total_pv_w > 10);
    const dur_bat = getDur(total_bat_w);
    const dur_load = getDur(load);
    const dur_grid = getDur(grid);
    const dur_car = getDur(car_w);
    const toSeconds = (durationStr) => {
      const parsed = Number.parseFloat(durationStr);
      return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
    };
    const flowDurations = {
      pv1: toSeconds(dur_pv1),
      pv2: toSeconds(dur_pv2),
      bat: toSeconds(dur_bat),
      load: toSeconds(dur_load),
      grid: toSeconds(dur_grid),
      car: toSeconds(dur_car)
    };

    // Colors and classes
    const C_CYAN = '#00FFFF', C_BLUE = '#0088FF', C_WHITE = '#FFFFFF', C_RED = '#FF3333';
    const pv1_class = (total_pv_w > 10) ? 'flow-pv1' : '';
    const pv2_class = show_double_flow ? 'flow-pv2' : '';
    const load_class = (load > 10) ? 'flow-generic' : '';
    const car_class = (car_w > 10) ? 'flow-generic' : '';
    const bat_class = (total_bat_w > 10) ? 'flow-generic' : (total_bat_w < -10) ? 'flow-reverse' : '';
    const bat_col = (total_bat_w >= 0) ? C_CYAN : C_WHITE;
    const grid_class = (grid > 10) ? 'flow-grid-import' : (grid < -10) ? 'flow-generic' : '';
    const grid_col = (grid > 10) ? C_RED : C_CYAN;
    const liquid_fill = (avg_soc < 25) ? 'rgba(255, 50, 50, 0.85)' : 'rgba(0, 255, 255, 0.85)';

    // SVG paths
    const PATH_PV1 = 'M 250 237 L 282 230 L 420 280';
    const PATH_PV2 = 'M 200 205 L 282 238 L 420 288';
    const PATH_BAT_INV = 'M 423 310 L 325 350';
    const PATH_LOAD = 'M 471 303 L 550 273 L 380 220';
    const PATH_GRID = 'M 470 280 L 575 240 L 575 223';
    const PATH_CAR = 'M 475 329 L 490 335 L 600 285';

    const TxtStyle = 'font-weight:bold; font-family: sans-serif; text-anchor:middle; text-shadow: 0 0 5px black;';
    const pvLineA = {
      text: this.formatPower(total_pv_w, use_kw),
      fill: C_CYAN,
      y: T_SOLAR_Y,
      visible: true
    };
    const pvLineB = {
      text: '',
      fill: C_BLUE,
      y: T_SOLAR_Y + 10,
      visible: false
    };

    if (pv_sensors.length === 2) {
      pvLineA.text = `S1: ${this.formatPower(pv1_val, use_kw)}`;
      pvLineA.y = T_SOLAR_Y - 10;
      pvLineB.text = `S2: ${this.formatPower(pv2_val, use_kw)}`;
      pvLineB.y = T_SOLAR_Y + 10;
      pvLineB.visible = true;
      pvLineB.fill = C_BLUE;
    } else if (pv_sensors.length > 2) {
      pvLineA.text = `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`;
      pvLineA.y = T_SOLAR_Y;
      pvLineB.visible = false;
    } else {
      pvLineA.text = this.formatPower(total_pv_w, use_kw);
      pvLineA.y = T_SOLAR_Y;
      pvLineB.visible = false;
    }

    const flowStates = {
      pv1: { className: pv1_class, stroke: C_CYAN },
      pv2: { className: pv2_class, stroke: C_BLUE },
      bat: { className: bat_class, stroke: bat_col },
      load: { className: load_class, stroke: C_CYAN },
      grid: { className: grid_class, stroke: grid_col },
      car: { className: car_class, stroke: C_CYAN }
    };

    const carSocVisible = Boolean(config.show_car_soc && car_soc !== null);
    const carSocText = carSocVisible ? `${Math.round(car_soc)}%` : '';
    const carSocColor = config.car_pct_color || '#00FFFF';

    const viewState = {
      backgroundImage: bg_img,
      title: { text: title_text, fontSize: header_font_size },
      daily: { label: label_daily, value: `${total_daily_kwh} kWh`, labelSize: daily_label_font_size, valueSize: daily_value_font_size },
      pv: { fontSize: pv_font_size, lineA: pvLineA, lineB: pvLineB },
      battery: { liquidOffset: BAT_MAX_H - current_h, liquidFill: liquid_fill },
      batterySoc: { text: `${Math.floor(avg_soc)}%`, fontSize: battery_soc_font_size, fill: C_WHITE },
      batteryPower: { text: this.formatPower(Math.abs(total_bat_w), use_kw), fontSize: battery_power_font_size, fill: bat_col },
      load: { text: this.formatPower(load, use_kw), fontSize: load_font_size, fill: C_WHITE },
      grid: { text: this.formatPower(Math.abs(grid), use_kw), fontSize: grid_font_size, fill: grid_col },
      carPower: { text: this.formatPower(car_w, use_kw), fontSize: car_power_font_size, fill: C_WHITE },
      carSoc: { visible: carSocVisible, text: carSocText, fontSize: car_soc_font_size, fill: carSocColor },
      flows: flowStates
    };

    const templateCtx = {
      TxtStyle,
      BAT_X,
      BAT_Y_BASE,
      BAT_W,
      BAT_MAX_H,
      T_SOLAR_X,
      T_SOLAR_Y,
      T_BAT_X,
      T_BAT_Y,
      T_HOME_X,
      T_HOME_Y,
      T_GRID_X,
      T_GRID_Y,
      T_CAR_X,
      T_CAR_Y,
      bat_transform,
      trans_solar,
      trans_bat,
      trans_home,
      trans_grid,
      trans_car,
      PATH_PV1,
      PATH_PV2,
      PATH_BAT_INV,
      PATH_LOAD,
      PATH_GRID,
      PATH_CAR
    };

    const needsTemplate = this._forceRender || !this._hasRendered;
    if (needsTemplate) {
      this.shadowRoot.innerHTML = this._buildTemplate(viewState, templateCtx);
      this._cacheDomReferences();
      this._hasRendered = true;
    } else if (!this._domRefs) {
      this._cacheDomReferences();
    }

    this._updateView(viewState);
    this._applyFlowAnimationTargets(flowDurations);
    this._forceRender = false;
  }

  static get version() {
    return '1.1.14-test';
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
    if (window.loadCardHelpers) {
      window.loadCardHelpers();
    }
  }

  _buildStrings() {
    return {
      en: {
        sections: {
          general: { title: 'Configuration', helper: 'General card settings.' },
          refresh: { title: 'Refresh Interval', helper: 'Control the polling cadence for card updates.' },
          pv: { title: 'PV (Solar) Sensors', helper: 'Configure up to six PV or input_number entities.' },
          battery: { title: 'Battery Sensors', helper: 'Provide SOC and power sensors for each battery.' },
          flows: { title: 'Flow Colours', helper: 'Configure thresholds and colours for each energy flow.' },
          other: { title: 'Other Sensors', helper: 'Home load, grid, and inversion options.' },
          ev: { title: 'EV Sensors', helper: 'Optional EV metrics and SOC display.' },
          typography: { title: 'Typography', helper: 'Fine-tune font sizing for individual labels.' }
        },
        groups: {
          entities: { title: 'Entity Configuration', helper: 'Configure sensors, general settings, and EV inputs.' },
          colors: { title: 'Colour Configuration', helper: 'Adjust thresholds, flow colours, and accents.' },
          typography: { title: 'Typography', helper: 'Fine-tune font sizing for the card.' }
        },
        fields: {
          card_title: { label: 'Card Title', helper: 'Title displayed at the top of the card.' },
          background_image: { label: 'Background Image Path', helper: 'Path to the background image (e.g., /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Language', helper: 'Choose the editor language.' },
          display_unit: { label: 'Display Unit', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Update Interval', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          animation_speed_factor: { label: 'Animation Speed Multiplier', helper: 'Scales the flow animation speed (1 = default).' },
          pv_total_threshold: { label: 'PV Threshold (W)', helper: 'Switch PV colour when total production crosses this value.' },
          pv_total_color_low: { label: 'PV Colour (Below)', helper: 'Colour when PV total is below the threshold.' },
          pv_total_color_high: { label: 'PV Colour (Above)', helper: 'Colour when PV total exceeds the threshold.' },
          home_import_threshold: { label: 'Home Import Threshold (W)', helper: 'Switch home flow colour when load exceeds this value.' },
          home_import_color_low: { label: 'Home Colour (Below)', helper: 'Colour when home import is below the threshold.' },
          home_import_color_high: { label: 'Home Colour (Above)', helper: 'Colour when home import exceeds the threshold.' },
          grid_import_threshold: { label: 'Grid Threshold (W)', helper: 'Switch grid colour when absolute grid power crosses this value.' },
          grid_color_low: { label: 'Grid Colour (Below)', helper: 'Colour when grid power magnitude is below the threshold.' },
          grid_color_high: { label: 'Grid Colour (Above)', helper: 'Colour when grid power magnitude exceeds the threshold.' },
          battery_import_color: { label: 'Battery Import Colour', helper: 'Colour when the battery is charging (importing).' },
          battery_export_color: { label: 'Battery Export Colour', helper: 'Colour when the battery is discharging (exporting).' },
          car_import_color: { label: 'Car Import Colour', helper: 'Colour when the EV is charging from the system.' },
          car_export_color: { label: 'Car Export Colour', helper: 'Colour when the EV is supplying power back.' },
          sensor_pv1: { label: 'PV Sensor 1 (Required)', helper: 'Primary solar production sensor.' },
          sensor_pv2: { label: 'PV Sensor 2' },
          sensor_pv3: { label: 'PV Sensor 3' },
          sensor_pv4: { label: 'PV Sensor 4' },
          sensor_pv5: { label: 'PV Sensor 5' },
          sensor_pv6: { label: 'PV Sensor 6' },
          sensor_daily: { label: 'Daily Production Sensor', helper: 'Sensor reporting daily production totals.' },
          sensor_bat1_soc: { label: 'Battery 1 SOC' },
          sensor_bat1_power: { label: 'Battery 1 Power', helper: 'Net sensor (positive = discharge, negative = charge). When set, the per-direction fields are ignored.' },
          sensor_bat1_charge: { label: 'Battery 1 Charging', helper: 'Optional charge-only sensor (positive while charging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat1_discharge: { label: 'Battery 1 Discharging', helper: 'Optional discharge-only sensor (positive while discharging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat2_soc: { label: 'Battery 2 SOC' },
          sensor_bat2_power: { label: 'Battery 2 Power', helper: 'Net sensor (positive = discharge, negative = charge). When set, the per-direction fields are ignored.' },
          sensor_bat2_charge: { label: 'Battery 2 Charging', helper: 'Optional charge-only sensor (positive while charging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat2_discharge: { label: 'Battery 2 Discharging', helper: 'Optional discharge-only sensor (positive while discharging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat3_soc: { label: 'Battery 3 SOC' },
          sensor_bat3_power: { label: 'Battery 3 Power', helper: 'Net sensor (positive = discharge, negative = charge). When set, the per-direction fields are ignored.' },
          sensor_bat3_charge: { label: 'Battery 3 Charging', helper: 'Optional charge-only sensor (positive while charging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat3_discharge: { label: 'Battery 3 Discharging', helper: 'Optional discharge-only sensor (positive while discharging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat4_soc: { label: 'Battery 4 SOC' },
          sensor_bat4_power: { label: 'Battery 4 Power', helper: 'Net sensor (positive = discharge, negative = charge). When set, the per-direction fields are ignored.' },
          sensor_bat4_charge: { label: 'Battery 4 Charging', helper: 'Optional charge-only sensor (positive while charging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_bat4_discharge: { label: 'Battery 4 Discharging', helper: 'Optional discharge-only sensor (positive while discharging). The card auto-combines charging/discharging values unless a net power sensor is supplied.' },
          sensor_home_load: { label: 'Home Load/Consumption', helper: 'Total household consumption sensor.' },
          sensor_grid_power: { label: 'Grid Power', helper: 'Positive/negative grid flow sensor.' },
          invert_grid: { label: 'Invert Grid Values', helper: 'Enable if import/export polarity is reversed.' },
          sensor_car_power: { label: 'Car Power Sensor' },
          sensor_car_soc: { label: 'Car SOC Sensor' },
          show_car_soc: { label: 'Show Car SOC' },
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
          ]
        }
      },
      it: {
        sections: {
          general: { title: 'Configurazione', helper: 'Impostazioni generali della scheda.' },
          refresh: { title: 'Aggiornamento', helper: 'Controlla l intervallo di polling della scheda.' },
          pv: { title: 'Sensori FV (solare)', helper: 'Configura fino a sei entita PV o input_number.' },
          battery: { title: 'Sensori batteria', helper: 'Fornisci i sensori SOC e potenza per ogni batteria.' },
          flows: { title: 'Colori dei flussi', helper: 'Imposta soglie e colori per i diversi flussi energetici.' },
          other: { title: 'Altri sensori', helper: 'Carico casa, rete e opzioni di inversione.' },
          ev: { title: 'Sensori EV', helper: 'Metriche EV opzionali e visualizzazione SOC.' },
          typography: { title: 'Tipografia', helper: 'Regola le dimensioni dei font per ogni etichetta.' }
        },
        groups: {
          entities: { title: 'Configurazione entita', helper: 'Imposta sensori, opzioni generali ed ingressi EV.' },
          colors: { title: 'Configurazione colori', helper: 'Regola soglie, colori dei flussi e accenti.' },
          typography: { title: 'Tipografia', helper: 'Affina le dimensioni dei font della scheda.' }
        },
        fields: {
          card_title: { label: 'Titolo scheda', helper: 'Titolo mostrato nella parte superiore della scheda.' },
          background_image: { label: 'Percorso immagine di sfondo', helper: 'Percorso dell immagine di sfondo (es. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Lingua', helper: 'Seleziona la lingua dell editor.' },
          display_unit: { label: 'Unita di visualizzazione', helper: 'Unita usata per i valori di potenza.' },
          update_interval: { label: 'Intervallo di aggiornamento', helper: 'Frequenza di aggiornamento della scheda (0 disattiva il limite).' },
          animation_speed_factor: { label: 'Moltiplicatore velocita animazione', helper: 'Regola la velocita dell animazione dei flussi (1 = predefinita).' },
          pv_total_threshold: { label: 'Soglia PV (W)', helper: 'Cambia colore PV quando la produzione supera questa soglia.' },
          pv_total_color_low: { label: 'Colore PV (sotto)', helper: 'Colore quando la produzione PV e sotto soglia.' },
          pv_total_color_high: { label: 'Colore PV (sopra)', helper: 'Colore quando la produzione PV supera la soglia.' },
          home_import_threshold: { label: 'Soglia carico casa (W)', helper: 'Cambia colore del flusso casa al superare questa soglia.' },
          home_import_color_low: { label: 'Colore casa (sotto)', helper: 'Colore quando il carico casa e sotto soglia.' },
          home_import_color_high: { label: 'Colore casa (sopra)', helper: 'Colore quando il carico casa e sopra soglia.' },
          grid_import_threshold: { label: 'Soglia rete (W)', helper: 'Cambia colore rete quando la potenza assoluta supera questa soglia.' },
          grid_color_low: { label: 'Colore rete (sotto)', helper: 'Colore quando la potenza rete e sotto soglia.' },
          grid_color_high: { label: 'Colore rete (sopra)', helper: 'Colore quando la potenza rete supera la soglia.' },
          battery_import_color: { label: 'Colore import batteria', helper: 'Colore quando la batteria si carica (import).' },
          battery_export_color: { label: 'Colore export batteria', helper: 'Colore quando la batteria eroga energia (export).' },
          car_import_color: { label: 'Colore import auto', helper: 'Colore quando l auto si carica dal sistema.' },
          car_export_color: { label: 'Colore export auto', helper: 'Colore quando l auto restituisce energia.' },
          sensor_pv1: { label: 'Sensore PV 1 (obbligatorio)', helper: 'Sensore principale di produzione solare.' },
          sensor_pv2: { label: 'Sensore PV 2' },
          sensor_pv3: { label: 'Sensore PV 3' },
          sensor_pv4: { label: 'Sensore PV 4' },
          sensor_pv5: { label: 'Sensore PV 5' },
          sensor_pv6: { label: 'Sensore PV 6' },
          sensor_daily: { label: 'Sensore produzione giornaliera', helper: 'Sensore che riporta la produzione giornaliera.' },
          sensor_bat1_soc: { label: 'Batteria 1 SOC' },
          sensor_bat1_power: { label: 'Batteria 1 potenza', helper: 'Sensore netto (positivo = scarica, negativo = carica). Se compilato, i sensori separati vengono ignorati.' },
          sensor_bat1_charge: { label: 'Batteria 1 carica', helper: 'Sensore opzionale solo carica (valore positivo durante la carica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat1_discharge: { label: 'Batteria 1 scarica', helper: 'Sensore opzionale solo scarica (valore positivo durante la scarica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat2_soc: { label: 'Batteria 2 SOC' },
          sensor_bat2_power: { label: 'Batteria 2 potenza', helper: 'Sensore netto (positivo = scarica, negativo = carica). Se compilato, i sensori separati vengono ignorati.' },
          sensor_bat2_charge: { label: 'Batteria 2 carica', helper: 'Sensore opzionale solo carica (valore positivo durante la carica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat2_discharge: { label: 'Batteria 2 scarica', helper: 'Sensore opzionale solo scarica (valore positivo durante la scarica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat3_soc: { label: 'Batteria 3 SOC' },
          sensor_bat3_power: { label: 'Batteria 3 potenza', helper: 'Sensore netto (positivo = scarica, negativo = carica). Se compilato, i sensori separati vengono ignorati.' },
          sensor_bat3_charge: { label: 'Batteria 3 carica', helper: 'Sensore opzionale solo carica (valore positivo durante la carica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat3_discharge: { label: 'Batteria 3 scarica', helper: 'Sensore opzionale solo scarica (valore positivo durante la scarica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat4_soc: { label: 'Batteria 4 SOC' },
          sensor_bat4_power: { label: 'Batteria 4 potenza', helper: 'Sensore netto (positivo = scarica, negativo = carica). Se compilato, i sensori separati vengono ignorati.' },
          sensor_bat4_charge: { label: 'Batteria 4 carica', helper: 'Sensore opzionale solo carica (valore positivo durante la carica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_bat4_discharge: { label: 'Batteria 4 scarica', helper: 'Sensore opzionale solo scarica (valore positivo durante la scarica). La scheda combina automaticamente carica/scarica quando non e presente un sensore netto.' },
          sensor_home_load: { label: 'Carico casa/consumo', helper: 'Sensore del consumo totale dell abitazione.' },
          sensor_grid_power: { label: 'Potenza rete', helper: 'Sensore flusso rete positivo/negativo.' },
          invert_grid: { label: 'Inverti valori rete', helper: 'Attiva se l import/export ha polarita invertita.' },
          sensor_car_power: { label: 'Sensore potenza auto' },
          sensor_car_soc: { label: 'Sensore SOC auto' },
          show_car_soc: { label: 'Mostra SOC auto' },
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
            { value: 'en', label: 'English' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Deutsch' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ]
        }
      },
      de: {
        sections: {
          general: { title: 'Konfiguration', helper: 'Allgemeine Karteneinstellungen.' },
          refresh: { title: 'Aktualisierung', helper: 'Steuert das Aktualisierungsintervall der Karte.' },
          pv: { title: 'PV (Solar) Sensoren', helper: 'Konfiguriere bis zu sechs PV- oder input_number-Entitaeten.' },
          battery: { title: 'Batteriesensoren', helper: 'Stelle SOC- und Leistungssensoren fuer jede Batterie bereit.' },
          flows: { title: 'Flussfarben', helper: 'Lege Schwellwerte und Farben fuer die Energiefluesse fest.' },
          other: { title: 'Weitere Sensoren', helper: 'Hauslast, Netz und Invertierungsoptionen.' },
          ev: { title: 'EV-Sensoren', helper: 'Optionale EV-Metriken und SOC-Anzeige.' },
          typography: { title: 'Typografie', helper: 'Passe die Schriftgroessen einzelner Labels an.' }
        },
        groups: {
          entities: { title: 'Entitaetskonfiguration', helper: 'Sensoren, Grundeinstellungen und EV-Inputs anpassen.' },
          colors: { title: 'Farbkonfiguration', helper: 'Schwellenwerte, Flussfarben und Akzente einstellen.' },
          typography: { title: 'Typografie', helper: 'Schriftgroessen der Karte feinjustieren.' }
        },
        fields: {
          card_title: { label: 'Kartentitel', helper: 'Titel oben auf der Karte.' },
          background_image: { label: 'Pfad zum Hintergrundbild', helper: 'Pfad zum Hintergrundbild (z. B. /local/community/lumina-energy-card/lumina_background.jpg).' },
          language: { label: 'Sprache', helper: 'Editor-Sprache waehlen.' },
          display_unit: { label: 'Anzeigeeinheit', helper: 'Einheit fuer Leistungswerte.' },
          update_interval: { label: 'Aktualisierungsintervall', helper: 'Aktualisierungsfrequenz der Karte (0 deaktiviert das Limit).' },
          animation_speed_factor: { label: 'Animationsgeschwindigkeit', helper: 'Skaliert die Flussanimation (1 = Standard).' },
          pv_total_threshold: { label: 'PV Schwelle (W)', helper: 'Wechselt die PV-Farbe, wenn die Gesamtleistung diese Schwelle ueberschreitet.' },
          pv_total_color_low: { label: 'PV Farbe (darunter)', helper: 'Farbe, wenn die PV-Leistung unter der Schwelle liegt.' },
          pv_total_color_high: { label: 'PV Farbe (darueber)', helper: 'Farbe, wenn die PV-Leistung die Schwelle uebersteigt.' },
          home_import_threshold: { label: 'Haushalt Schwelle (W)', helper: 'Wechselt die Hausfluss-Farbe, wenn der Verbrauch diese Schwelle ueberschreitet.' },
          home_import_color_low: { label: 'Hausfarbe (darunter)', helper: 'Farbe, wenn der Hausverbrauch unter der Schwelle liegt.' },
          home_import_color_high: { label: 'Hausfarbe (darueber)', helper: 'Farbe, wenn der Hausverbrauch die Schwelle ueberschreitet.' },
          grid_import_threshold: { label: 'Netz Schwelle (W)', helper: 'Wechselt die Netzfarbe, wenn die absolute Netzleistung diese Schwelle ueberschreitet.' },
          grid_color_low: { label: 'Netzfarbe (darunter)', helper: 'Farbe, wenn die Netzleistung unter der Schwelle liegt.' },
          grid_color_high: { label: 'Netzfarbe (darueber)', helper: 'Farbe, wenn die Netzleistung die Schwelle ueberschreitet.' },
          battery_import_color: { label: 'Batterie Importfarbe', helper: 'Farbe, wenn die Batterie laedt (Import).' },
          battery_export_color: { label: 'Batterie Exportfarbe', helper: 'Farbe, wenn die Batterie entlaedt (Export).' },
          car_import_color: { label: 'Auto Importfarbe', helper: 'Farbe, wenn das EV laedt.' },
          car_export_color: { label: 'Auto Exportfarbe', helper: 'Farbe, wenn das EV Energie abgibt.' },
          sensor_pv1: { label: 'PV Sensor 1 (Pflicht)', helper: 'Primaerer Solarsensor.' },
          sensor_pv2: { label: 'PV Sensor 2' },
          sensor_pv3: { label: 'PV Sensor 3' },
          sensor_pv4: { label: 'PV Sensor 4' },
          sensor_pv5: { label: 'PV Sensor 5' },
          sensor_pv6: { label: 'PV Sensor 6' },
          sensor_daily: { label: 'Tagesproduktion Sensor', helper: 'Sensor fuer taegliche Produktionssumme.' },
          sensor_bat1_soc: { label: 'Batterie 1 SOC' },
          sensor_bat1_power: { label: 'Batterie 1 Leistung', helper: 'Nettosensor (positiv = entladen, negativ = laden). Bei Angabe werden die getrennten Felder ignoriert.' },
          sensor_bat1_charge: { label: 'Batterie 1 Laden', helper: 'Optionaler Ladesensor (positiv beim Laden). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat1_discharge: { label: 'Batterie 1 Entladen', helper: 'Optionaler Entladesensor (positiv beim Entladen). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat2_soc: { label: 'Batterie 2 SOC' },
          sensor_bat2_power: { label: 'Batterie 2 Leistung', helper: 'Nettosensor (positiv = entladen, negativ = laden). Bei Angabe werden die getrennten Felder ignoriert.' },
          sensor_bat2_charge: { label: 'Batterie 2 Laden', helper: 'Optionaler Ladesensor (positiv beim Laden). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat2_discharge: { label: 'Batterie 2 Entladen', helper: 'Optionaler Entladesensor (positiv beim Entladen). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat3_soc: { label: 'Batterie 3 SOC' },
          sensor_bat3_power: { label: 'Batterie 3 Leistung', helper: 'Nettosensor (positiv = entladen, negativ = laden). Bei Angabe werden die getrennten Felder ignoriert.' },
          sensor_bat3_charge: { label: 'Batterie 3 Laden', helper: 'Optionaler Ladesensor (positiv beim Laden). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat3_discharge: { label: 'Batterie 3 Entladen', helper: 'Optionaler Entladesensor (positiv beim Entladen). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat4_soc: { label: 'Batterie 4 SOC' },
          sensor_bat4_power: { label: 'Batterie 4 Leistung', helper: 'Nettosensor (positiv = entladen, negativ = laden). Bei Angabe werden die getrennten Felder ignoriert.' },
          sensor_bat4_charge: { label: 'Batterie 4 Laden', helper: 'Optionaler Ladesensor (positiv beim Laden). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_bat4_discharge: { label: 'Batterie 4 Entladen', helper: 'Optionaler Entladesensor (positiv beim Entladen). Die Karte kombiniert Lade-/Entladesensoren automatisch, sofern kein Nettosensor vorliegt.' },
          sensor_home_load: { label: 'Hausverbrauch', helper: 'Sensor fuer Gesamtverbrauch des Haushalts.' },
          sensor_grid_power: { label: 'Netzleistung', helper: 'Sensor fuer positiven/negativen Netzfluss.' },
          invert_grid: { label: 'Netzwerte invertieren', helper: 'Aktivieren, wenn Import/Export vertauscht ist.' },
          sensor_car_power: { label: 'Fahrzeugleistung Sensor' },
          sensor_car_soc: { label: 'Fahrzeug SOC Sensor' },
          show_car_soc: { label: 'Fahrzeug SOC anzeigen' },
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
      display_unit: localeStrings.options.display_units
    };
  }

  _createSchemaDefs(localeStrings, optionDefs) {
    const entitySelector = { entity: { domain: ['sensor', 'input_number'] } };
    const numberSlider = (min, max, step, unit) => ({ number: { min, max, step, mode: 'slider', unit_of_measurement: unit } });
    const fields = localeStrings.fields;
    const define = (entries) => entries.map((entry) => {
      const result = { ...entry };
      if (entry.name && this._defaults[entry.name] !== undefined && result.default === undefined) {
        result.default = this._defaults[entry.name];
      }
      return result;
    });

    const batteryEntries = [];
    for (let index = 1; index <= 4; index += 1) {
      batteryEntries.push(
        { name: `sensor_bat${index}_soc`, label: fields[`sensor_bat${index}_soc`].label, helper: fields[`sensor_bat${index}_soc`].helper, selector: entitySelector },
        { name: `sensor_bat${index}_power`, label: fields[`sensor_bat${index}_power`].label, helper: fields[`sensor_bat${index}_power`].helper, selector: entitySelector },
        { name: `sensor_bat${index}_charge`, label: fields[`sensor_bat${index}_charge`].label, helper: fields[`sensor_bat${index}_charge`].helper, selector: entitySelector },
        { name: `sensor_bat${index}_discharge`, label: fields[`sensor_bat${index}_discharge`].label, helper: fields[`sensor_bat${index}_discharge`].helper, selector: entitySelector }
      );
    }

    return {
      general: define([
        { name: 'card_title', label: fields.card_title.label, helper: fields.card_title.helper, selector: { text: {} } },
        { name: 'background_image', label: fields.background_image.label, helper: fields.background_image.helper, selector: { text: {} } },
        { name: 'language', label: fields.language.label, helper: fields.language.helper, selector: { select: { options: optionDefs.language } } },
        { name: 'display_unit', label: fields.display_unit.label, helper: fields.display_unit.helper, selector: { select: { options: optionDefs.display_unit } } }
      ]),
      refresh: define([
        { name: 'update_interval', label: fields.update_interval.label, helper: fields.update_interval.helper, selector: numberSlider(0, 60, 5, 's') },
        { name: 'animation_speed_factor', label: fields.animation_speed_factor.label, helper: fields.animation_speed_factor.helper, selector: numberSlider(0.25, 4, 0.25, 'x') }
      ]),
      pv: define([
        { name: 'sensor_pv1', label: fields.sensor_pv1.label, helper: fields.sensor_pv1.helper, selector: entitySelector },
        { name: 'sensor_pv2', label: fields.sensor_pv2.label, helper: fields.sensor_pv2.helper, selector: entitySelector },
        { name: 'sensor_pv3', label: fields.sensor_pv3.label, helper: fields.sensor_pv3.helper, selector: entitySelector },
        { name: 'sensor_pv4', label: fields.sensor_pv4.label, helper: fields.sensor_pv4.helper, selector: entitySelector },
        { name: 'sensor_pv5', label: fields.sensor_pv5.label, helper: fields.sensor_pv5.helper, selector: entitySelector },
        { name: 'sensor_pv6', label: fields.sensor_pv6.label, helper: fields.sensor_pv6.helper, selector: entitySelector },
        { name: 'sensor_daily', label: fields.sensor_daily.label, helper: fields.sensor_daily.helper, selector: entitySelector }
      ]),
      battery: define(batteryEntries),
      other: define([
        { name: 'sensor_home_load', label: fields.sensor_home_load.label, helper: fields.sensor_home_load.helper, selector: entitySelector },
        { name: 'sensor_grid_power', label: fields.sensor_grid_power.label, helper: fields.sensor_grid_power.helper, selector: entitySelector },
        { name: 'invert_grid', label: fields.invert_grid.label, helper: fields.invert_grid.helper, selector: { boolean: {} }, default: false }
      ]),
      ev: define([
        { name: 'sensor_car_power', label: fields.sensor_car_power.label, helper: fields.sensor_car_power.helper, selector: entitySelector },
        { name: 'sensor_car_soc', label: fields.sensor_car_soc.label, helper: fields.sensor_car_soc.helper, selector: entitySelector },
        { name: 'show_car_soc', label: fields.show_car_soc.label, helper: fields.show_car_soc.helper, selector: { boolean: {} }, default: false }
      ]),
      flows: define([
        { name: 'pv_total_threshold', label: fields.pv_total_threshold.label, helper: fields.pv_total_threshold.helper, selector: { number: {} } },
        { name: 'pv_total_color_low', label: fields.pv_total_color_low.label, helper: fields.pv_total_color_low.helper, selector: { text: {} } },
        { name: 'pv_total_color_high', label: fields.pv_total_color_high.label, helper: fields.pv_total_color_high.helper, selector: { text: {} } },
        { name: 'home_import_threshold', label: fields.home_import_threshold.label, helper: fields.home_import_threshold.helper, selector: { number: {} } },
        { name: 'home_import_color_low', label: fields.home_import_color_low.label, helper: fields.home_import_color_low.helper, selector: { text: {} } },
        { name: 'home_import_color_high', label: fields.home_import_color_high.label, helper: fields.home_import_color_high.helper, selector: { text: {} } },
        { name: 'grid_import_threshold', label: fields.grid_import_threshold.label, helper: fields.grid_import_threshold.helper, selector: { number: {} } },
        { name: 'grid_color_low', label: fields.grid_color_low.label, helper: fields.grid_color_low.helper, selector: { text: {} } },
        { name: 'grid_color_high', label: fields.grid_color_high.label, helper: fields.grid_color_high.helper, selector: { text: {} } },
        { name: 'battery_import_color', label: fields.battery_import_color.label, helper: fields.battery_import_color.helper, selector: { text: {} } },
        { name: 'battery_export_color', label: fields.battery_export_color.label, helper: fields.battery_export_color.helper, selector: { text: {} } },
        { name: 'car_import_color', label: fields.car_import_color.label, helper: fields.car_import_color.helper, selector: { text: {} } },
        { name: 'car_export_color', label: fields.car_export_color.label, helper: fields.car_export_color.helper, selector: { text: {} } },
        { name: 'car_pct_color', label: fields.car_pct_color.label, helper: fields.car_pct_color.helper, selector: { text: {} }, default: '#00FFFF' }
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

  _createGroupDefs(localeStrings, schemaDefs) {
    const sections = localeStrings.sections;
    const groups = localeStrings.groups;
    return [
      {
        title: groups.entities.title,
        helper: groups.entities.helper,
        open: true,
        sections: [
          { title: sections.general.title, helper: sections.general.helper, schema: schemaDefs.general },
          { title: sections.refresh.title, helper: sections.refresh.helper, schema: schemaDefs.refresh },
          { title: sections.pv.title, helper: sections.pv.helper, schema: schemaDefs.pv },
          { title: sections.battery.title, helper: sections.battery.helper, schema: schemaDefs.battery },
          { title: sections.other.title, helper: sections.other.helper, schema: schemaDefs.other },
          { title: sections.ev.title, helper: sections.ev.helper, schema: schemaDefs.ev }
        ]
      },
      {
        title: groups.colors.title,
        helper: groups.colors.helper,
        open: false,
        sections: [
          { title: sections.flows.title, helper: sections.flows.helper, schema: schemaDefs.flows }
        ]
      },
      {
        title: groups.typography.title,
        helper: groups.typography.helper,
        open: false,
        sections: [
          { title: sections.typography.title, helper: sections.typography.helper, schema: schemaDefs.typography }
        ]
      }
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

  _createGroup(group) {
    const panel = document.createElement('details');
    panel.className = 'group-panel';
    if (group.open !== false) {
      panel.open = true;
    }

    const summary = document.createElement('summary');
    summary.className = 'group-summary';
    summary.textContent = group.title;
    panel.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'group-body';

    if (group.helper) {
      const helper = document.createElement('div');
      helper.className = 'group-helper';
      helper.textContent = group.helper;
      body.appendChild(helper);
    }

    group.sections.forEach((section) => {
      body.appendChild(this._createSection(section.title, section.helper, section.schema));
    });

    panel.appendChild(body);
    return panel;
  }

  _createSection(title, helper, schema) {
    const section = document.createElement('div');
    section.className = 'section';

    const heading = document.createElement('div');
    heading.className = 'section-title';
    heading.textContent = title;
    section.appendChild(heading);

    if (helper) {
      const helperEl = document.createElement('div');
      helperEl.className = 'section-helper';
      helperEl.textContent = helper;
      section.appendChild(helperEl);
    }

    section.appendChild(this._createForm(schema));
    return section;
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
    const groups = this._createGroupDefs(localeStrings, schemaDefs);

    const versionBadge = document.createElement('div');
    versionBadge.className = 'version-badge';
    versionBadge.textContent = `Lumina Energy Card v${LuminaEnergyCard.version}`;
    container.appendChild(versionBadge);

    groups.forEach((group) => {
      container.appendChild(this._createGroup(group));
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
        gap: 16px;
        padding: 16px;
      }
      .version-badge {
        align-self: flex-start;
        font-size: 0.55em;
        font-weight: 600;
        letter-spacing: 0.4px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(0, 255, 255, 0.12);
        color: var(--primary-color);
        border: 1px solid rgba(0, 255, 255, 0.3);
        text-transform: uppercase;
      }
      .group-panel {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
      }
      .group-summary {
        font-weight: 600;
        font-size: 1.05em;
        padding: 12px 16px;
        cursor: pointer;
      }
      .group-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 0 16px 16px;
      }
      .group-helper {
        font-size: 0.9em;
        color: var(--secondary-text-color);
        margin-bottom: 8px;
      }
      .section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .section-title {
        font-weight: 600;
        font-size: 1.05em;
        margin: 8px 0 4px;
        color: var(--primary-color);
      }
      .group-body .section:first-of-type .section-title {
        margin-top: 0;
      }
      .section-helper {
        font-size: 0.9em;
        color: var(--secondary-text-color);
        margin-bottom: 8px;
      }
      ha-form {
        width: 100%;
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