/**
 * Lumina Energy Card
 * Custom Home Assistant card for energy flow visualization
 * Version: 2.0.1b3
 * Tested with Home Assistant 2025.12+
 */
const BATTERY_GEOMETRY = { X: 260, Y_BASE: 350, WIDTH: 55, MAX_HEIGHT: 84 };
const TEXT_POSITIONS = {
  solar: { x: 170, y: 310, rotate: -16, skewX: -20, skewY: 0 },
  battery: { x: 245, y: 375, rotate: -25, skewX: -25, skewY: 5 },
  home: { x: 460, y: 245, rotate: 0, skewX: 0, skewY: 0 },
  grid: { x: 580, y: 90, rotate: -8, skewX: -10, skewY: 0 },
  heatPump: { x: 315, y: 225, rotate: -20, skewX: -20, skewY: 33 }
};

const buildTextTransform = ({ x, y, rotate, skewX, skewY }) =>
  `translate(${x}, ${y}) rotate(${rotate}) skewX(${skewX}) skewY(${skewY}) translate(-${x}, -${y})`;

const TEXT_TRANSFORMS = {
  solar: buildTextTransform(TEXT_POSITIONS.solar),
  battery: buildTextTransform(TEXT_POSITIONS.battery),
  home: buildTextTransform(TEXT_POSITIONS.home),
  grid: buildTextTransform(TEXT_POSITIONS.grid),
  heatPump: buildTextTransform(TEXT_POSITIONS.heatPump)
};

const SVG_DIMENSIONS = { width: 800, height: 450 };
const DEBUG_GRID_SPACING = 25;
const DEBUG_GRID_MAJOR_SPACING = 100;
const DEBUG_GRID_MINOR_COLOR = 'rgba(255, 255, 255, 0.25)';
const DEBUG_GRID_MAJOR_COLOR = 'rgba(51, 5, 5, 0.45)';
const DEBUG_GRID_TEXT_COLOR = 'rgba(255, 255, 255, 0.65)';
const DEBUG_GRID_CONTENT = (() => {
  const segments = [];
  const { width, height } = SVG_DIMENSIONS;
  const buildLine = (x1, y1, x2, y2, major) => {
    const color = major ? DEBUG_GRID_MAJOR_COLOR : DEBUG_GRID_MINOR_COLOR;
    const strokeWidth = major ? 1.2 : 0.4;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`;
  };
  const addVerticalLabels = (x) => {
    const topAttrs = `x="${x}" y="10" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="9" text-anchor="middle" dominant-baseline="hanging"`;
    const bottomAttrs = `x="${x}" y="${height - 4}" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="9" text-anchor="middle" dominant-baseline="auto"`;
    segments.push(`<text ${topAttrs}>${x}</text>`);
    segments.push(`<text ${bottomAttrs}>${x}</text>`);
  };
  const addHorizontalLabels = (y) => {
    const leftAttrs = `x="6" y="${y}" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="9" text-anchor="start" dominant-baseline="middle"`;
    const rightAttrs = `x="${width - 6}" y="${y}" fill="${DEBUG_GRID_TEXT_COLOR}" font-size="9" text-anchor="end" dominant-baseline="middle"`;
    segments.push(`<text ${leftAttrs}>${y}</text>`);
    segments.push(`<text ${rightAttrs}>${y}</text>`);
  };

  for (let x = 0; x <= width; x += DEBUG_GRID_SPACING) {
    const isMajor = x % DEBUG_GRID_MAJOR_SPACING === 0;
    segments.push(buildLine(x, 0, x, height, isMajor));
    if (isMajor) {
      addVerticalLabels(x);
    }
  }

  for (let y = 0; y <= height; y += DEBUG_GRID_SPACING) {
    const isMajor = y % DEBUG_GRID_MAJOR_SPACING === 0;
    segments.push(buildLine(0, y, width, y, isMajor));
    if (isMajor) {
      addHorizontalLabels(y);
    }
  }

  return segments.join('\n');
})();

// Enable/disable debug grid overlay for development (set true to show grid)
const DEBUG_GRID_ENABLED = false;

// Layer visibility toggles for development/testing (set true to force show layers)
const DEBUG_LAYER_NOSOLAR_ENABLED = false;
const DEBUG_LAYER_1ARRAY_ENABLED = false;
const DEBUG_LAYER_2ARRAY_ENABLED = false;
const HEADLIGHT_DEBUG_LOGGING_ENABLED = false;
const HEADLIGHT_FILTERS_ENABLED = true;
const HEADLIGHT_BLUR_RADIUS_PX = 12;
const HEADLIGHT_SVG_FILTER_ID = 'lumina-headlight-glow';
const HEADLIGHT_SVG_FILTER_URL = `url(#${HEADLIGHT_SVG_FILTER_ID})`;
const HEADLIGHT_SVG_FILTER_STD_DEV = Math.max(0.1, HEADLIGHT_BLUR_RADIUS_PX);

// Polyfill CSS.escape for older browsers / HA webviews.
// (Used by existing filter/clip-path code and the odometer feature.)
(() => {
  try {
    const root = (typeof window !== 'undefined') ? window : globalThis;
    if (!root) {
      return;
    }
    if (root.CSS && typeof root.CSS.escape === 'function') {
      return;
    }
    const cssNamespace = root.CSS || (root.CSS = {});
    cssNamespace.escape = (value) => {
      const raw = String(value ?? '');
      let escaped = '';
      for (let i = 0; i < raw.length; i += 1) {
        const char = raw.charAt(i);
        if (/^[a-zA-Z0-9_\-]$/.test(char)) {
          escaped += char;
        } else {
          escaped += `\\${char}`;
        }
      }
      return escaped;
    };
  } catch (e) {
    // ignore
  }
})();

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
const FLOW_ARROW_COUNT = 10;

const LEGACY_CAR_VISIBILITY_KEYS = ['show_car', 'show_car2', 'show_car_2', 'show_car_soc', 'show_car_soc2'];
const stripLegacyCarVisibility = (config) => {
  if (!config || typeof config !== 'object') {
    return config;
  }
  let sanitized = null;
  LEGACY_CAR_VISIBILITY_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      if (!sanitized) {
        sanitized = { ...config };
      }
      delete sanitized[key];
    }
  });
  return sanitized || config;
};

const getConfiguredCarCount = (config) => {
  const hasCar1 = Boolean(config && (config.sensor_car_power || config.sensor_car_soc));
  const hasCar2 = Boolean(config && (config.sensor_car2_power || config.sensor_car2_soc));
  return (hasCar1 ? 1 : 0) + (hasCar2 ? 1 : 0);
};

// SVG Layer Visibility Configuration
// Maps configuration options to SVG elements that should be shown/hidden
const SVG_LAYER_CONFIG = [
  // Base layer - always visible
  {
    layerName: 'Base',
    svgSelector: '[data-layer="Base"]',
    condition: () => true  // Always visible
  },

  // Day/Night background layers (optional)
  // Day backgrounds (car-count aware)
  {
    layerName: 'BackgroundDayNoCar',
    svgSelector: '[data-role="daynocar"]',
    condition: (config) => !Boolean(config.night_mode) && getConfiguredCarCount(config) === 0
  },
  {
    layerName: 'BackgroundDay1Car',
    svgSelector: '[data-role="day1car"]',
    condition: (config) => !Boolean(config.night_mode) && getConfiguredCarCount(config) === 1
  },
  {
    layerName: 'BackgroundDay2Car',
    svgSelector: '[data-role="day2car"]',
    condition: (config) => !Boolean(config.night_mode) && getConfiguredCarCount(config) >= 2
  },
  {
    layerName: 'BackgroundDayLegacy',
    svgSelector: '[data-role="background-day"]',
    condition: (config, svgElement) => {
      if (Boolean(config.night_mode)) return false;
      // Only show legacy background-day if the new day backgrounds don't exist in the SVG.
      const hasNewDayBackground = Boolean(
        svgElement && svgElement.querySelector('[data-role="daynocar"], [data-role="day1car"], [data-role="day2car"]')
      );
      return !hasNewDayBackground;
    }
  },
  {
    layerName: 'BackgroundNightNoCar',
    svgSelector: '[data-role="nightnocar"]',
    condition: (config) => Boolean(config.night_mode) && getConfiguredCarCount(config) === 0
  },
  {
    layerName: 'BackgroundNight1Car',
    svgSelector: '[data-role="night1car"]',
    condition: (config) => Boolean(config.night_mode) && getConfiguredCarCount(config) === 1
  },
  {
    layerName: 'BackgroundNight2Car',
    svgSelector: '[data-role="night2car"]',
    condition: (config) => Boolean(config.night_mode) && getConfiguredCarCount(config) >= 2
  },
  {
    layerName: 'BackgroundNightLegacy',
    svgSelector: '[data-role="background-night"]',
    condition: (config, svgElement) => {
      if (!Boolean(config.night_mode)) return false;
      // Only show legacy background-night if the new night backgrounds don't exist in the SVG.
      const hasNewNightBackground = Boolean(
        svgElement && svgElement.querySelector('[data-role="nightnocar"], [data-role="night1car"], [data-role="night2car"]')
      );
      return !hasNewNightBackground;
    }
  },

  // NoSolar layer - shown when no PV settings configured (grid power only)
  {
    layerName: 'NoSolar',
    svgSelector: '[data-layer="NoSolar"]',
    condition: (config) => {
      // Array 1 is valid if any PV strings are configured OR total sensor is set
      const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                                config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasArray1Total = config.sensor_pv_total;

      // Array 2 is valid if any Array 2 PV strings are configured OR secondary total sensor is set
      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;

      const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return !hasArray1 && !hasArray2;  // Show when no PV arrays configured
    }
  },

  // Inverter image/icon - shown whenever solar exists (hide for NoSolar)
  {
    layerName: 'Inverter',
    svgSelector: '[data-role="inverter"]',
    condition: (config) => {
      const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                                config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasArray1Total = config.sensor_pv_total;

      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;

      const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return hasArray1 || hasArray2;  // Show inverter when any PV array exists
    }
  },

  // 1Array layer - shown when Array 1 has valid configuration but Array 2 does not
  {
    layerName: '1Array',
    svgSelector: '[data-layer="1Array"]',
    condition: (config) => {
      // Array 1 is valid if any PV strings are configured OR total sensor is set
      const hasPVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                          config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasTotalSensor = config.sensor_pv_total;
      const hasArray1 = Boolean(hasPVStrings || hasTotalSensor);

      // Array 2 is valid if any Array 2 PV strings are configured OR secondary total sensor is set
      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return hasArray1 && !hasArray2;  // Show when Array 1 is configured but Array 2 is not
    }
  },

  // 2Array layer - shown when both Array 1 and Array 2 have valid configuration
  {
    layerName: '2Array',
    svgSelector: '[data-layer="2Array"]',
    condition: (config) => {
      // Array 1 is valid if any PV strings are configured OR total sensor is set
      const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                                config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasArray1Total = config.sensor_pv_total;

      // Array 2 is valid if any Array 2 PV strings are configured OR secondary total sensor is set
      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;

      const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return hasArray1 && hasArray2;  // Show when both arrays are configured
    }
  },

  // Individual elements within layers - show/hide based on specific entity configuration

  // Battery elements - show when battery sensors are configured
  {
    configKey: 'battery_system',
    svgSelector: '[data-role="battery-soc"], [data-role="battery-power"], [data-role="battery-fill"]',
    condition: (config) => config.sensor_bat1_soc || config.sensor_bat2_soc || config.sensor_bat3_soc || config.sensor_bat4_soc
  },

  // Heat pump object - show when heat pump consumption entity is configured
  {
    configKey: 'heatpump',
    svgSelector: '[data-role="heatpump"]',
    condition: (config) => Boolean(config.sensor_heat_pump_consumption)
  },

  // Car 1 elements - show when car sensors are configured
  {
    configKey: 'car1',
    svgSelector: '[data-role="car1"]',
    condition: (config) => Boolean(config.sensor_car_power || config.sensor_car_soc)
  },

  // Car 2 elements - show when car2 sensors are configured
  {
    configKey: 'car2',
    svgSelector: '[data-role="car2"]',
    condition: (config) => Boolean(config.sensor_car2_power || config.sensor_car2_soc)
  },

  // Daily yield - show when daily sensor is configured
  {
    configKey: 'daily_yield',
    svgSelector: '[data-role="daily-yield"]',
    condition: (config) => Boolean(config.sensor_daily)
  },

  // Grid daily values - show when daily grid sensors are configured
  {
    configKey: 'grid_daily',
    svgSelector: '[data-role="grid-daily"], [data-role="grid-daily-import"], [data-role="grid-daily-export"], [data-role^="grid-line-"]',
    condition: (config) => Boolean(config.show_daily_grid)
  },

  // Windmill generator - show when windmill total sensor is configured
  {
    layerName: 'Windmill',
    svgSelector: '[data-role="windmill"], g[inkscape\\:label="windmill"], g[inkscape\\:label="Windmill"], #layer3',
    condition: (config) => Boolean(config.sensor_windmill_total)
  }
];

// Function to apply SVG layer visibility based on configuration
function applySvgLayerVisibility(svgElement, config) {
  // console.log('=== SVG Layer Visibility Report ===');

  SVG_LAYER_CONFIG.forEach(layer => {
    let shouldShow = layer.condition ? layer.condition(config, svgElement) : Boolean(config[layer.configKey]);

    // Override with debug toggles if enabled
    if (layer.layerName === 'NoSolar' && DEBUG_LAYER_NOSOLAR_ENABLED) {
      shouldShow = true;
      // console.log(`🔧 DEBUG: Forcing NoSolar layer to show`);
    } else if (layer.layerName === '1Array' && DEBUG_LAYER_1ARRAY_ENABLED) {
      shouldShow = true;
      // console.log(`🔧 DEBUG: Forcing 1Array layer to show`);
    } else if (layer.layerName === '2Array' && DEBUG_LAYER_2ARRAY_ENABLED) {
      shouldShow = true;
      // console.log(`🔧 DEBUG: Forcing 2Array layer to show`);
    }

    // console.log(`${shouldShow ? '✅' : '❌'} Layer "${layer.layerName}" (${layer.svgSelector}): ${shouldShow ? 'VISIBLE' : 'HIDDEN'}`);

    const elements = svgElement.querySelectorAll(layer.svgSelector);

    elements.forEach((element, index) => {
      const wasVisible = element.style.display !== 'none';
      const willBeVisible = shouldShow;

      if (shouldShow) {
        element.style.display = element.dataset.originalDisplay || '';
        // Remove display:none if it was set
        if (element.style.display === 'none') {
          element.style.display = '';
        }
      } else {
        // Store original display value before hiding
        if (!element.dataset.originalDisplay) {
          const computedStyle = window.getComputedStyle(element);
          element.dataset.originalDisplay = computedStyle.display;
        }
        element.style.display = 'none';
      }

      const elementType = element.tagName.toLowerCase();
      const dataRole = element.getAttribute('data-role') || 'no-role';
      const dataLayer = element.getAttribute('data-layer') || 'no-layer';

      // console.log(`   ${index + 1}. <${elementType}> [data-role="${dataRole}"] [data-layer="${dataLayer}"]: ${wasVisible ? 'was visible' : 'was hidden'} → ${willBeVisible ? 'now visible' : 'now hidden'}`);
    });
  });

  // console.log('=== End Layer Visibility Report ===');

  // Log all SVG groups and their visibility status
  // console.log('=== All SVG Groups Status ===');
  const allGroups = svgElement.querySelectorAll('g');
  allGroups.forEach((group, index) => {
    const dataLayer = group.getAttribute('data-layer') || 'no-layer';
    const dataRole = group.getAttribute('data-role') || 'no-role';
    const display = group.style.display || window.getComputedStyle(group).display;
    const isVisible = display !== 'none';

    // console.log(`${index + 1}. <g> [data-layer="${dataLayer}"] [data-role="${dataRole}"]: ${isVisible ? 'VISIBLE' : 'HIDDEN'} (${display})`);
  });
  // console.log('=== End All SVG Groups Status ===');

  // Log all elements with data-role attributes
  // console.log('=== All Data-Role Elements Status ===');
  const allDataRoleElements = svgElement.querySelectorAll('[data-role]');
  allDataRoleElements.forEach((element, index) => {
    const dataRole = element.getAttribute('data-role');
    const tagName = element.tagName.toLowerCase();
    const display = element.style.display || window.getComputedStyle(element).display;
    const isVisible = display !== 'none';

    // console.log(`${index + 1}. <${tagName}> [data-role="${dataRole}"]: ${isVisible ? 'VISIBLE' : 'HIDDEN'} (${display})`);
  });
  // console.log('=== End All Data-Role Elements Status ===');

  // Configuration summary
  // console.log('=== Configuration Summary ===');
  const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                            config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
  const hasArray1Total = config.sensor_pv_total;
  const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);

  const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                            config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
  const hasArray2Total = config.sensor_pv_total_secondary;
  const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

  // console.log(`Array 1 configured: ${hasArray1} (PV strings: ${!!hasArray1PVStrings}, Total sensor: ${!!hasArray1Total})`);
  // console.log(`Array 2 configured: ${hasArray2} (PV strings: ${!!hasArray2PVStrings}, Total sensor: ${!!hasArray2Total})`);
  // console.log(`Expected active layers: Base (always) + ${hasArray1 && hasArray2 ? '2Array' : hasArray1 ? '1Array' : 'NoSolar'}`);
  // console.log('=== End Configuration Summary ===');
}
const MAX_PV_LINES = 7;
const PV_LINE_SPACING = 14;
const FLOW_STYLE_DEFAULT = 'dashes';
const FLOW_STYLE_PATTERNS = {
  dashes: { dasharray: '10 10', cycle: 20 },
  dashes_glow: { dasharray: '10 10', cycle: 20 },
  // fluid_flow uses a dash pattern for a moving "highlight" overlay.
  // Use a real "window + gap" so the pulse is visible.
  // We'll add a second, phase-shifted window inside the mask to reduce perceived gaps.
  // The cycle matches dasharray sum for predictable motion.
  // NOTE: This is used by the mask. We create two phase-shifted windows.
  // The gaps must be large enough that blur doesn't fill them in, otherwise
  // the mask becomes nearly solid and motion is hard/impossible to perceive.
  fluid_flow: { dasharray: '30 80', cycle: 130 },
  dots: { dasharray: '2 18', cycle: 20 },
  arrows: { dasharray: null, cycle: 1 }
};

const FLOW_BASE_LOOP_RATE = 0.0025;
const FLOW_MIN_GLOW_SCALE = 0.2;
const DEFAULT_GRID_ACTIVITY_THRESHOLD = 100;
const DEFAULT_BATTERY_FILL_HIGH_COLOR = '#00ffff';
const DEFAULT_BATTERY_FILL_LOW_COLOR = '#ff0000';
const DEFAULT_BATTERY_LOW_THRESHOLD = 25;

// SVG text binding: place <text> elements in the background SVG with matching data-role values.
// JS will only populate text / visibility (positioning stays in the SVG).
//
// Supported roles (initial migration set):
// - title-text                <- viewState.title.text
// - daily-label               <- viewState.daily.label
// - daily-value               <- viewState.daily.value
// - pv-line-0..pv-line-(N)     <- viewState.pv.lines[i].text (also sets fill + font-size)
// - pv1-total                  <- viewState.pv1Total.text (Array 1 total output)
// - pv2-total                  <- viewState.pv2Total.text (Array 2 total output)
// - pv-total                    <- viewState.pvTotal.text (Array 1 + Array 2 combined total)
// - battery1                   <- viewState.battery1.text (Battery 1 power)
// - battery2                   <- viewState.battery2.text (Battery 2 power)
// - battery3                   <- viewState.battery3.text (Battery 3 power)
// - battery1-soc               <- viewState.battery1Soc.text
// - battery1-power             <- viewState.battery1Power.text
// - battery2-soc               <- viewState.battery2Soc.text
// - battery2-power             <- viewState.battery2Power.text
// - battery3-soc               <- viewState.battery3Soc.text
// - battery3-power             <- viewState.battery3Power.text
// - battery4-soc               <- viewState.battery4Soc.text
// - battery4-power             <- viewState.battery4Power.text
// - battery-soc               <- viewState.batterySoc.text
// - battery-power             <- viewState.batteryPower.text
// - load-power OR load-line-0..2
// - grid-power OR grid-line-0..1
// - heat-pump-power            <- viewState.heatPump.text (visible when viewState.heatPump.visible)
// - washing-machine-power       <- viewState.washingMachine.text (visible when viewState.washingMachine.visible)
// - dryer-power                 <- viewState.dryer.text (visible when viewState.dryer.visible)
// - refrigerator-power          <- viewState.refrigerator.text (visible when viewState.refrigerator.visible)
// - car1-label OR car1-name / car1-power / car1-soc
// - car2-label OR car2-name / car2-power / car2-soc

const buildArrowGroupSvg = (key, flowState) => {
  const color = flowState && (flowState.glowColor || flowState.stroke) ? (flowState.glowColor || flowState.stroke) : '#00FFFF';
  const activeOpacity = flowState && flowState.active ? 1 : 0;
  const segments = Array.from({ length: FLOW_ARROW_COUNT }, (_, index) =>
    `<polygon data-arrow-shape="${key}" data-arrow-index="${index}" points="-8,-3 0,0 -8,3" fill="${color}" />`
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
    this._fluidFlowRafs = new Map();
    this._debugFluidFlow = false;
    this._fluidFlowDebugStopLog = new Map();
    this._fluidFlowDebugColors = new Map();
    this._gsap = null;
    this._gsapLoading = null;
    this._flowPathLengths = new Map();
    this._animationSpeedFactor = 1;
    this._animationStyle = FLOW_STYLE_DEFAULT;
    this._dashGlowIntensity = 1;
    this._fluidFlowOuterGlowEnabled = false;
    this._rotationSpeedFactor = 1;
    this._rotateEntries = new Map();
    this._rotateAnimRaf = null;
    this._rotateAnimLastTs = null;
    this._headlightAnimations = new Map();
    this._lastSunState = null;
    this._lastEffectiveNightMode = null;
    this._defaults = (typeof LuminaEnergyCard.getStubConfig === 'function')
      ? { ...LuminaEnergyCard.getStubConfig() }
      : {};
    this._debugCoordsActive = false;
    this._handleDebugPointerMove = this._handleDebugPointerMove.bind(this);
    this._handleDebugPointerLeave = this._handleDebugPointerLeave.bind(this);
    this._handleEchoAliveClickBound = this._handleEchoAliveClick.bind(this);
    this._echoAliveClickTimeout = null;

    // Event handler bindings (must be stable so we can detach/reattach across renders)
    this._handlePopupSvgClickBound = this._handlePopupSvgClick.bind(this);
    this._handlePopupBackdropClickBound = (event) => {
      try {
        if (event && event.target === this._domRefs.popupBackdrop) {
          this._closePopupOverlay();
        }
      } catch (e) {
        // ignore
      }
    };
    this._handlePopupOverlayClickBound = (event) => {
      try {
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        this._closePopupOverlay();
      } catch (e) {
        // ignore
      }
    };
    this._listenersAttachedTo = {
      svgRoot: null,
      popupBackdrop: null,
      popupOverlay: null,
      debugSvgRoot: null,
      echoAliveContainer: null
    };
  }

  _ensureGoogleFont(fontFamily) {
    try {
      if (typeof document === 'undefined' || !document.head) {
        return;
      }

      const raw = (fontFamily === null || fontFamily === undefined) ? '' : String(fontFamily);
      if (!raw.trim()) {
        return;
      }

      // Use the first font in a CSS font-family list.
      const primary = raw.split(',')[0].trim();
      const unquoted = primary.replace(/^['\"]|['\"]$/g, '').trim();
      if (!unquoted) {
        return;
      }

      // Skip generic/system families.
      const generic = new Set([
        'serif',
        'sans-serif',
        'monospace',
        'cursive',
        'fantasy',
        'system-ui',
        'ui-serif',
        'ui-sans-serif',
        'ui-monospace',
        'ui-rounded',
        'emoji',
        'math',
        'fangsong'
      ]);
      if (generic.has(unquoted.toLowerCase())) {
        return;
      }

      // Best-effort Google Fonts CSS2 API. Avoid hardcoding weights so "any" font works.
      const familyParam = encodeURIComponent(unquoted).replace(/%20/g, '+');
      const href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

      // Make a stable key for dedupe.
      const key = unquoted.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!key) {
        return;
      }

      const selector = `link[data-lumina-font="${key}"]`;
      const existing = document.head.querySelector(selector);
      if (existing) {
        return;
      }

      const link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', href);
      link.dataset.luminaFont = key;
      document.head.appendChild(link);
    } catch (e) {
      // ignore
    }
  }

  _migrateBackgroundFilenames(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }
    const next = { ...config };

    const replaceFilename = (value, from, to) => {
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return value;
      }
      if (trimmed === from) {
        return to;
      }
      const suffix = `/${from}`;
      if (trimmed.endsWith(suffix)) {
        return trimmed.slice(0, -from.length) + to;
      }
      if (trimmed.includes(from)) {
        return trimmed.replace(from, to);
      }
      return value;
    };

    // Day/night backgrounds
    next.background_day = replaceFilename(next.background_day, 'lumina-new-day.svg', 'lumina-modern-day.svg');
    next.background_night = replaceFilename(next.background_night, 'lumina-new-night.svg', 'lumina-modern-night.svg');

    // Legacy single background key (kept for backward compatibility)
    next.background_image = replaceFilename(next.background_image, 'lumina-new-day.svg', 'lumina-modern-day.svg');
    next.background_image = replaceFilename(next.background_image, 'lumina-new-night.svg', 'lumina-modern-night.svg');

    return next;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    const defaults = this._defaults || {};
    const migrated = this._migrateBackgroundFilenames(config);
    const sanitized = stripLegacyCarVisibility(migrated);
    this.config = { ...defaults, ...sanitized };
    this._forceRender = true;
    this._prevViewState = null;

  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) {
      return;
    }
    if (this._isEditorActive()) {
      this._forceRender = false;
      return;
    }

    // Auto day/night mode should react immediately to sun.sun changes.
    // Home Assistant calls the `hass` setter on state changes, but this card
    // intentionally throttles full renders via update_interval.
    // When the sun flips above/below horizon, re-apply layer visibility right away.
    const mode = this.config && typeof this.config.day_night_mode === 'string'
      ? this.config.day_night_mode.trim().toLowerCase()
      : '';
    if (mode === 'auto') {
      const sunState = this._hass && this._hass.states && this._hass.states['sun.sun']
        ? this._hass.states['sun.sun'].state
        : null;
      if (sunState && sunState !== this._lastSunState) {
        this._lastSunState = sunState;

        // If the effective day/night flips, trigger a render so animation style can switch immediately.
        try {
          const prevNight = this._lastEffectiveNightMode;
          const nextNight = this._computeEffectiveNightMode(this.config);
          this._lastEffectiveNightMode = nextNight;
          if (prevNight !== null && nextNight !== prevNight) {
            this._forceRender = true;
          }
        } catch (e) {
          // ignore
        }

        // Best-effort: update the already-loaded background SVG layers without a full render.
        if (!this._domRefs) {
          this._cacheDomReferences();
        }
        const refs = this._domRefs;
        if (refs && refs.backgroundSvg && refs.backgroundSvg.children && refs.backgroundSvg.children.length > 0) {
          applySvgLayerVisibility(refs.backgroundSvg, this._layerConfigWithEffectiveNight(this.config));
        } else if (this.shadowRoot) {
          const svgElement = this.shadowRoot.querySelector('svg');
          if (svgElement) {
            applySvgLayerVisibility(svgElement, this._layerConfigWithEffectiveNight(this.config));
          }
        }
      }
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
      title_text_color: '#00FFFF',
      title_bg_color: '#0080ff',
      font_family: 'B612',
      odometer_font_family: 'B612 Mono',
      background_image: '/local/community/lumina-energy-card/lumina-modern-day.svg',
      background_day: '/local/community/lumina-energy-card/lumina-modern-day.svg',
      background_night: '/local/community/lumina-energy-card/lumina-modern-night.svg',
      day_night_mode: 'auto',
      night_mode: false,
      header_font_size: 16,
      daily_label_font_size: 12,
      daily_value_font_size: 20,
      pv_font_size: 12,
      battery_soc_font_size: 8,
      battery_power_font_size: 8,
      load_font_size: 8,
      inv1_power_font_size: 8,
      inv2_power_font_size: 8,
      heat_pump_font_size: 8,
      pool_font_size: 8,
      washing_machine_font_size: 8,
      dryer_font_size: 8,
      refrigerator_font_size: 8,
      grid_font_size: 8,
      grid_daily_font_size: '8',
      grid_current_odometer: false,
      grid_current_odometer_duration: 350,
      car_power_font_size: 10,
      car_soc_font_size: 10,
      car2_power_font_size: 10,
      car2_soc_font_size: 10,
      car_name_font_size: 10, // Schriftgroesse Fahrzeugname (px)
      car2_name_font_size: 10, // Schriftgroesse Fahrzeugname 2 (px)
      car1_label: '',
      car2_label: '',
      car_headlight_flash: true,
      animation_speed_factor: 1,
      animation_style: 'dashes',
      night_animation_style: 'dashes',
      dashes_glow_intensity: 1,
      flow_stroke_width: 2,
      fluid_flow_stroke_width: 3,
      fluid_flow_outer_glow: false,
      sensor_pv_total: '',
      sensor_pv_total_secondary: '',
      sensor_windmill_total: '',
      sensor_windmill_daily: '',
      sensor_daily: '',
      sensor_daily_array2: '',
      sensor_bat1_soc: '',
      sensor_bat1_power: '',
      sensor_bat1_charge_power: '',
      sensor_bat1_discharge_power: '',
      sensor_bat2_soc: '',
      sensor_bat2_power: '',
      sensor_bat2_charge_power: '',
      sensor_bat2_discharge_power: '',
      sensor_bat3_soc: '',
      sensor_bat3_power: '',
      sensor_bat3_charge_power: '',
      sensor_bat3_discharge_power: '',
      sensor_bat4_soc: '',
      sensor_bat4_power: '',
      sensor_bat4_charge_power: '',
      sensor_bat4_discharge_power: '',
      sensor_home_load: '',
      sensor_home_load_secondary: '',
      sensor_heat_pump_consumption: '',
      heat_pump_label: 'Heat Pump',
      sensor_pool_consumption: '',
      sensor_washing_machine_consumption: '',
      sensor_dryer_consumption: '',
      sensor_refrigerator_consumption: '',
      sensor_grid_power: '',
      sensor_grid_import: '',
      sensor_grid_export: '',
      sensor_grid_import_daily: '',
      sensor_grid_export_daily: '',
      sensor_grid2_power: '',
      sensor_grid2_import: '',
      sensor_grid2_export: '',
      sensor_grid2_import_daily: '',
      sensor_grid2_export_daily: '',
      sensor_car_power: '',
      sensor_car_soc: '',
      sensor_car2_power: '',
      sensor_car2_soc: '',
      pv_primary_color: '#0080ff',
      pv_tot_color: '#00FFFF',
      pv_secondary_color: '#80ffff',
      load_flow_color: '#0080ff',
      load_text_color: '#FFFFFF',
      house_total_color: '#00FFFF',
      inv1_color: '#0080ff',
      inv2_color: '#80ffff',
      load_threshold_warning: null,
      load_warning_color: '#ff8000',
      load_threshold_critical: null,
      load_critical_color: '#ff0000',
      battery_soc_color: '#FFFFFF',
      battery_charge_color: '#00FFFF',
      battery_discharge_color: '#FFFFFF',
      grid_import_color: '#FF3333',
      grid_export_color: '#00ff00',
      grid2_import_color: '#FF3333',
      grid2_export_color: '#00ff00',
      car_flow_color: '#00FFFF',
      car1_color: '#00FFFF',
      car2_color: '#00FFFF',
      car1_name_color: '#00FFFF',
      car2_name_color: '#00FFFF',
      car2_pct_color: '#00FFFF',
      car_pct_color: '#00FFFF',
      heat_pump_flow_color: '#FFA500',
      heat_pump_text_color: '#FFA500',
      pool_flow_color: '#0080ff',
      pool_text_color: '#00FFFF',
      washing_machine_text_color: '#00FFFF',
      dryer_text_color: '#00FFFF',
      refrigerator_text_color: '#00FFFF',
      windmill_flow_color: '#00FFFF',
      windmill_text_color: '#00FFFF',
      invert_battery: false,
      windmill_power_font_size: 16,
      battery_fill_high_color: DEFAULT_BATTERY_FILL_HIGH_COLOR,
      battery_fill_low_color: DEFAULT_BATTERY_FILL_LOW_COLOR,
      battery_fill_low_threshold: DEFAULT_BATTERY_LOW_THRESHOLD,
      battery_fill_opacity: 0.6,
      grid_activity_threshold: DEFAULT_GRID_ACTIVITY_THRESHOLD,
      grid_threshold_warning: null,
      grid_warning_color: '#ff8000',
      grid_threshold_critical: null,
      grid_critical_color: '#ff0000',
      grid2_threshold_warning: null,
      grid2_warning_color: '#ff8000',
      grid2_threshold_critical: null,
      grid2_critical_color: '#ff0000',
      show_daily_grid: true,
      show_grid_flow_label: true,
      display_unit: 'kW',
      update_interval: 5,
      invert_grid: false,
      enable_echo_alive: false,

      // Popup entities (PV, House, Battery, Grid, Inverter)
      sensor_popup_pv_1: '',
      sensor_popup_pv_1_name: '',
      sensor_popup_pv_1_color: '',
      sensor_popup_pv_1_font_size: '',
      sensor_popup_pv_2: '',
      sensor_popup_pv_2_name: '',
      sensor_popup_pv_2_color: '',
      sensor_popup_pv_2_font_size: '',
      sensor_popup_pv_3: '',
      sensor_popup_pv_3_name: '',
      sensor_popup_pv_3_color: '',
      sensor_popup_pv_3_font_size: '',
      sensor_popup_pv_4: '',
      sensor_popup_pv_4_name: '',
      sensor_popup_pv_4_color: '',
      sensor_popup_pv_4_font_size: '',
      sensor_popup_pv_5: '',
      sensor_popup_pv_5_name: '',
      sensor_popup_pv_5_color: '',
      sensor_popup_pv_5_font_size: '',
      sensor_popup_pv_6: '',
      sensor_popup_pv_6_name: '',
      sensor_popup_pv_6_color: '',
      sensor_popup_pv_6_font_size: '',

      sensor_popup_house_1: '',
      sensor_popup_house_1_name: '',
      sensor_popup_house_1_color: '',
      sensor_popup_house_1_font_size: '',
      sensor_popup_house_2: '',
      sensor_popup_house_2_name: '',
      sensor_popup_house_2_color: '',
      sensor_popup_house_2_font_size: '',
      sensor_popup_house_3: '',
      sensor_popup_house_3_name: '',
      sensor_popup_house_3_color: '',
      sensor_popup_house_3_font_size: '',
      sensor_popup_house_4: '',
      sensor_popup_house_4_name: '',
      sensor_popup_house_4_color: '',
      sensor_popup_house_4_font_size: '',
      sensor_popup_house_5: '',
      sensor_popup_house_5_name: '',
      sensor_popup_house_5_color: '',
      sensor_popup_house_5_font_size: '',
      sensor_popup_house_6: '',
      sensor_popup_house_6_name: '',
      sensor_popup_house_6_color: '',
      sensor_popup_house_6_font_size: '',

      sensor_popup_bat_1: '',
      sensor_popup_bat_1_name: '',
      sensor_popup_bat_1_color: '',
      sensor_popup_bat_1_font_size: '',
      sensor_popup_bat_2: '',
      sensor_popup_bat_2_name: '',
      sensor_popup_bat_2_color: '',
      sensor_popup_bat_2_font_size: '',
      sensor_popup_bat_3: '',
      sensor_popup_bat_3_name: '',
      sensor_popup_bat_3_color: '',
      sensor_popup_bat_3_font_size: '',
      sensor_popup_bat_4: '',
      sensor_popup_bat_4_name: '',
      sensor_popup_bat_4_color: '',
      sensor_popup_bat_4_font_size: '',
      sensor_popup_bat_5: '',
      sensor_popup_bat_5_name: '',
      sensor_popup_bat_5_color: '',
      sensor_popup_bat_5_font_size: '',
      sensor_popup_bat_6: '',
      sensor_popup_bat_6_name: '',
      sensor_popup_bat_6_color: '',
      sensor_popup_bat_6_font_size: '',

      sensor_popup_grid_1: '',
      sensor_popup_grid_1_name: '',
      sensor_popup_grid_1_color: '',
      sensor_popup_grid_1_font_size: '',
      sensor_popup_grid_2: '',
      sensor_popup_grid_2_name: '',
      sensor_popup_grid_2_color: '',
      sensor_popup_grid_2_font_size: '',
      sensor_popup_grid_3: '',
      sensor_popup_grid_3_name: '',
      sensor_popup_grid_3_color: '',
      sensor_popup_grid_3_font_size: '',
      sensor_popup_grid_4: '',
      sensor_popup_grid_4_name: '',
      sensor_popup_grid_4_color: '',
      sensor_popup_grid_4_font_size: '',
      sensor_popup_grid_5: '',
      sensor_popup_grid_5_name: '',
      sensor_popup_grid_5_color: '',
      sensor_popup_grid_5_font_size: '',
      sensor_popup_grid_6: '',
      sensor_popup_grid_6_name: '',
      sensor_popup_grid_6_color: '',
      sensor_popup_grid_6_font_size: '',

      sensor_popup_inverter_1: '',
      sensor_popup_inverter_1_name: '',
      sensor_popup_inverter_1_color: '',
      sensor_popup_inverter_1_font_size: '',
      sensor_popup_inverter_2: '',
      sensor_popup_inverter_2_name: '',
      sensor_popup_inverter_2_color: '',
      sensor_popup_inverter_2_font_size: '',
      sensor_popup_inverter_3: '',
      sensor_popup_inverter_3_name: '',
      sensor_popup_inverter_3_color: '',
      sensor_popup_inverter_3_font_size: '',
      sensor_popup_inverter_4: '',
      sensor_popup_inverter_4_name: '',
      sensor_popup_inverter_4_color: '',
      sensor_popup_inverter_4_font_size: '',
      sensor_popup_inverter_5: '',
      sensor_popup_inverter_5_name: '',
      sensor_popup_inverter_5_color: '',
      sensor_popup_inverter_5_font_size: '',
      sensor_popup_inverter_6: '',
      sensor_popup_inverter_6_name: '',
      sensor_popup_inverter_6_color: '',
      sensor_popup_inverter_6_font_size: ''
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
    this._teardownRotateAnimations();
    this._teardownAllHeadlightAnimations();
    if (this._echoAliveClickTimeout) {
      try {
        clearTimeout(this._echoAliveClickTimeout);
      } catch (e) {
        // ignore
      }
      this._echoAliveClickTimeout = null;
    }
    this._domRefs = null;
    this._prevViewState = null;
    this._eventListenerAttached = false;
    this._rootInitialized = false;
  }

  _teardownRotateAnimations() {
    if (this._rotateAnimRaf) {
      try {
        cancelAnimationFrame(this._rotateAnimRaf);
      } catch (e) {
        // ignore
      }
    }
    this._rotateAnimRaf = null;
    this._rotateAnimLastTs = null;
    if (this._rotateEntries) {
      this._rotateEntries.clear();
    }
  }

  _computeRotateCenter(element) {
    if (!element) {
      return { cx: 0, cy: 0 };
    }
    const cxAttr = element.getAttribute('data-rotate-cx');
    const cyAttr = element.getAttribute('data-rotate-cy');
    const cx = cxAttr !== null ? Number(cxAttr) : NaN;
    const cy = cyAttr !== null ? Number(cyAttr) : NaN;
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      return { cx, cy };
    }
    try {
      if (typeof element.getBBox === 'function') {
        const box = element.getBBox();
        const boxCx = box.x + box.width / 2;
        const boxCy = box.y + box.height / 2;
        if (Number.isFinite(boxCx) && Number.isFinite(boxCy)) {
          return { cx: boxCx, cy: boxCy };
        }
      }
    } catch (e) {
      // getBBox can throw if element isn't renderable yet
    }
    return { cx: 0, cy: 0 };
  }

  _parseRotateSpeedDps(element) {
    if (!element) {
      return 0;
    }
    const dpsAttr = element.getAttribute('data-rotate-dps');
    const rpmAttr = element.getAttribute('data-rotate-rpm');
    const speedAttr = element.getAttribute('data-rotate-speed');
    const dps = dpsAttr !== null ? Number(dpsAttr) : NaN;
    if (Number.isFinite(dps)) {
      return dps;
    }
    const rpm = rpmAttr !== null ? Number(rpmAttr) : NaN;
    if (Number.isFinite(rpm)) {
      return rpm * 6;
    }
    const speed = speedAttr !== null ? Number(speedAttr) : NaN;
    if (Number.isFinite(speed)) {
      return speed;
    }
    // Default: 10 RPM
    return 60;
  }

  _parseRotateDirection(element) {
    if (!element) {
      return 1;
    }
    const dirAttr = element.getAttribute('data-rotate-direction') || element.getAttribute('data-rotate-dir');
    if (dirAttr === null || dirAttr === undefined) {
      return 1;
    }
    const raw = String(dirAttr).trim().toLowerCase();
    if (raw === 'ccw' || raw === '-1' || raw === 'reverse') {
      return -1;
    }
    if (raw === 'cw' || raw === '1' || raw === 'forward') {
      return 1;
    }
    const num = Number(raw);
    if (Number.isFinite(num) && num !== 0) {
      return num < 0 ? -1 : 1;
    }
    return 1;
  }

  _applyRotateAnimations() {
    if (!this._domRefs || !this._domRefs.rotateElements || this._domRefs.rotateElements.length === 0) {
      if (this._rotateAnimRaf) {
        this._teardownRotateAnimations();
      }
      return;
    }

    // Prune stale entries (SVG got re-rendered)
    this._rotateEntries.forEach((entry, element) => {
      if (!element || !element.isConnected) {
        this._rotateEntries.delete(element);
      }
    });

    this._domRefs.rotateElements.forEach((element) => {
      if (!element || !element.isConnected) {
        return;
      }
      if (!this._rotateEntries.has(element)) {
        const baseTransform = element.getAttribute('data-lumina-base-transform') !== null
          ? (element.getAttribute('data-lumina-base-transform') || '')
          : (element.getAttribute('transform') || '');
        if (element.getAttribute('data-lumina-base-transform') === null) {
          element.setAttribute('data-lumina-base-transform', baseTransform);
        }
        const initialAngle = (() => {
          const raw = element.getAttribute('data-rotate-angle');
          const num = raw !== null ? Number(raw) : 0;
          return Number.isFinite(num) ? num : 0;
        })();
        const center = this._computeRotateCenter(element);
        this._rotateEntries.set(element, {
          element,
          baseTransform,
          angle: initialAngle,
          direction: this._parseRotateDirection(element),
          baseDps: this._parseRotateSpeedDps(element),
          center
        });
      }
    });

    if (this._rotateAnimRaf) {
      return;
    }

    this._rotateAnimLastTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    const tick = (ts) => {
      this._rotateAnimRaf = requestAnimationFrame(tick);

      const now = (typeof ts === 'number' && Number.isFinite(ts))
        ? ts
        : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
      const last = (typeof this._rotateAnimLastTs === 'number' && Number.isFinite(this._rotateAnimLastTs))
        ? this._rotateAnimLastTs
        : now;
      let dt = (now - last) / 1000;
      if (!Number.isFinite(dt) || dt <= 0) {
        dt = 0;
      }
      // Clamp to avoid huge jumps when the tab is backgrounded.
      if (dt > 0.25) {
        dt = 0.25;
      }
      this._rotateAnimLastTs = now;

      if (!this._rotateEntries || this._rotateEntries.size === 0) {
        return;
      }

      let speedFactor = Number(this._rotationSpeedFactor);
      if (!Number.isFinite(speedFactor)) {
        speedFactor = 1;
      }
      if (speedFactor === 0) {
        return;
      }

      this._rotateEntries.forEach((entry, element) => {
        if (!entry || !element || !element.isConnected) {
          this._rotateEntries.delete(element);
          return;
        }
        // Skip if element is not visible
        try {
          const display = element.style.display || (typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(element).display : '');
          if (display === 'none') {
            return;
          }
        } catch (e) {
          // ignore
        }

        // Skip rotation when explicitly disabled.
        try {
          const disabled = element.getAttribute('data-lumina-rotate-disabled');
          if (disabled === '1' || disabled === 'true') {
            return;
          }
        } catch (e) {
          // ignore
        }

        const baseTransform = entry.baseTransform || '';
        const dir = entry.direction || 1;
        const baseDps = Number(entry.baseDps) || 0;
        if (!Number.isFinite(baseDps) || baseDps === 0) {
          return;
        }

        // If a sensor is provided, scale rotation with its magnitude.
        let dps = baseDps;
        const entityId = element.getAttribute('data-rotate-entity');
        if (entityId && typeof entityId === 'string' && entityId.trim()) {
          const maxValueAttr = element.getAttribute('data-rotate-max-value');
          const maxRpmAttr = element.getAttribute('data-rotate-max-rpm');
          const maxValue = maxValueAttr !== null ? Number(maxValueAttr) : NaN;
          const maxRpm = maxRpmAttr !== null ? Number(maxRpmAttr) : NaN;
          const safeMaxValue = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1000;
          const safeMaxRpm = Number.isFinite(maxRpm) && maxRpm > 0 ? maxRpm : 30;
          const value = Math.abs(this.getStateSafe(entityId));
          const ratio = Math.min(Math.max(value / safeMaxValue, 0), 1);
          dps = ratio * safeMaxRpm * 6;
        }

        const cx = entry.center && Number.isFinite(entry.center.cx) ? entry.center.cx : 0;
        const cy = entry.center && Number.isFinite(entry.center.cy) ? entry.center.cy : 0;
        // If center wasn't known at init (0,0), try again once it becomes measurable.
        if (cx === 0 && cy === 0) {
          const recomputed = this._computeRotateCenter(element);
          entry.center = recomputed;
        }

        const effectiveDps = dps * speedFactor * dir;
        if (!Number.isFinite(effectiveDps) || effectiveDps === 0) {
          return;
        }
        entry.angle = (Number(entry.angle) || 0) + effectiveDps * dt;
        if (!Number.isFinite(entry.angle)) {
          entry.angle = 0;
        }
        // Keep angle bounded
        entry.angle = ((entry.angle % 360) + 360) % 360;

        const base = baseTransform ? `${baseTransform} ` : '';
        const centerNow = entry.center || { cx: 0, cy: 0 };
        const rotateCx = Number.isFinite(centerNow.cx) ? centerNow.cx : 0;
        const rotateCy = Number.isFinite(centerNow.cy) ? centerNow.cy : 0;
        element.setAttribute('transform', `${base}rotate(${entry.angle} ${rotateCx} ${rotateCy})`);
      });
    };

    this._rotateAnimRaf = requestAnimationFrame(tick);
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

  _updateHeadlightFlash(viewState) {
    const flashState = viewState && viewState.headlightFlash;
    if (!flashState || !flashState.enabled || !this._domRefs) {
      this._teardownAllHeadlightAnimations();
      return;
    }

    const targets = [
      ['car1', flashState.car1],
      ['car2', flashState.car2]
    ];

    targets.forEach(([key, carState]) => {
      const shouldFlash = Boolean(carState && carState.visible && carState.charging);
      if (!shouldFlash) {
        this._teardownHeadlightFlash(key);
        return;
      }
      const nodes = this._getHeadlightElements(key);
      if (!nodes.length) {
        this._teardownHeadlightFlash(key);
        return;
      }
      this._activateHeadlightFlash(key, nodes);
    });
  }

  _getHeadlightElements(carKey) {
    if (!this._domRefs || !this._domRefs.headlights) {
      return [];
    }
    const bucket = this._domRefs.headlights[carKey];
    if (!bucket || !bucket.length) {
      return [];
    }
    return bucket.filter((node) => node && node.isConnected);
  }

  _activateHeadlightFlash(carKey, nodes) {
    if (!nodes || !nodes.length) {
      return;
    }
    if (!this._headlightAnimations) {
      this._headlightAnimations = new Map();
    }

    const existing = this._headlightAnimations.get(carKey);
    const nodesChanged = !existing || !this._areSameHeadlightNodes(existing.nodes, nodes);

    if (existing && !nodesChanged && existing.timeline) {
      this._logHeadlightDebug(`${carKey} headlights resume`, { nodeCount: nodes.length });
      existing.timeline.play();
      return;
    }
    if (existing && !nodesChanged) {
      return;
    }

    if (existing) {
      this._teardownHeadlightFlash(carKey);
    }

    const entry = { nodes: nodes.slice(), timeline: null };
    this._headlightAnimations.set(carKey, entry);
    this._logHeadlightDebug(`${carKey} headlights activate`, { nodeCount: nodes.length });

    this._ensureGsap()
      .then((gsap) => {
        const current = this._headlightAnimations.get(carKey);
        if (!gsap || !current || current !== entry) {
          return;
        }
        const useHeadlightFilters = Boolean(HEADLIGHT_FILTERS_ENABLED);
        current.nodes.forEach((node) => this._prepareHeadlightNode(node, useHeadlightFilters));
        const initialStyles = { opacity: 0 };
        if (useHeadlightFilters) {
          initialStyles.filter = '';
          initialStyles.mixBlendMode = 'screen';
        } else {
          initialStyles.filter = '';
          initialStyles.mixBlendMode = '';
        }
        gsap.set(current.nodes, initialStyles);
        const timeline = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } });
        const brightenStep = {
          duration: 0.5,
          opacity: 1
        };
        timeline.to(current.nodes, brightenStep);
        const peakHoldStep = {
          duration: 0.5
        };
        timeline.to({}, peakHoldStep);
        const dimStep = {
          duration: 0.5,
          opacity: 0
        };
        timeline.to(current.nodes, dimStep);
        const idleStep = {
          duration: 0.5
        };
        timeline.to({}, idleStep);
        current.timeline = timeline;
        this._logHeadlightDebug(`${carKey} headlights timeline started`, { nodeCount: current.nodes.length });
      })
      .catch((error) => {
        console.warn('Lumina Energy Card: Unable to animate headlights', error);
        this._teardownHeadlightFlash(carKey);
      });
  }

  _prepareHeadlightNode(node, useFilters = false) {
    if (!node || !node.style) {
      return;
    }
    this._moveHeadlightNodeToOverlay(node);
    if (node.dataset && node.dataset.luminaHeadlightOpacity === undefined) {
      node.dataset.luminaHeadlightOpacity = node.style.opacity || '';
    }
    if (node.dataset && node.dataset.luminaHeadlightFilter === undefined) {
      node.dataset.luminaHeadlightFilter = node.style.filter || '';
    }
    if (node.dataset && node.dataset.luminaHeadlightFilterAttr === undefined) {
      node.dataset.luminaHeadlightFilterAttr = node.getAttribute('filter') || '';
    }
    if (node.dataset && node.dataset.luminaHeadlightBlend === undefined) {
      node.dataset.luminaHeadlightBlend = node.style.mixBlendMode || '';
    }
    if (node.dataset && node.dataset.luminaHeadlightPointer === undefined) {
      node.dataset.luminaHeadlightPointer = node.style.pointerEvents || '';
    }
    if (node.dataset && node.dataset.luminaHeadlightWillChange === undefined) {
      node.dataset.luminaHeadlightWillChange = node.style.willChange || '';
    }
    node.style.pointerEvents = 'none';
    node.style.filter = '';
    node.style.willChange = 'opacity';
    if (useFilters) {
      try {
        node.setAttribute('filter', HEADLIGHT_SVG_FILTER_URL);
      } catch (e) {
        // ignore filter assignment errors
      }
    } else {
      try {
        node.removeAttribute('filter');
      } catch (e) {
        // ignore removal errors
      }
    }
  }

  _resetHeadlightNode(node) {
    if (!node || !node.style) {
      return;
    }
    if (node.dataset && node.dataset.luminaHeadlightOpacity !== undefined) {
      node.style.opacity = node.dataset.luminaHeadlightOpacity || '';
      delete node.dataset.luminaHeadlightOpacity;
    } else if (node.style.opacity) {
      node.style.opacity = '';
    }
    if (node.dataset && node.dataset.luminaHeadlightFilter !== undefined) {
      node.style.filter = node.dataset.luminaHeadlightFilter || '';
      delete node.dataset.luminaHeadlightFilter;
    } else if (node.style.filter) {
      node.style.filter = '';
    }
    if (node.dataset && node.dataset.luminaHeadlightFilterAttr !== undefined) {
      const prevAttr = node.dataset.luminaHeadlightFilterAttr;
      if (prevAttr) {
        node.setAttribute('filter', prevAttr);
      } else {
        node.removeAttribute('filter');
      }
      delete node.dataset.luminaHeadlightFilterAttr;
    } else {
      node.removeAttribute('filter');
    }
    if (node.dataset && node.dataset.luminaHeadlightBlend !== undefined) {
      node.style.mixBlendMode = node.dataset.luminaHeadlightBlend || '';
      delete node.dataset.luminaHeadlightBlend;
    } else if (node.style.mixBlendMode) {
      node.style.mixBlendMode = '';
    }
    if (node.dataset && node.dataset.luminaHeadlightPointer !== undefined) {
      node.style.pointerEvents = node.dataset.luminaHeadlightPointer || '';
      delete node.dataset.luminaHeadlightPointer;
    } else if (node.style.pointerEvents) {
      node.style.pointerEvents = '';
    }
    if (node.dataset && node.dataset.luminaHeadlightWillChange !== undefined) {
      node.style.willChange = node.dataset.luminaHeadlightWillChange || '';
      delete node.dataset.luminaHeadlightWillChange;
    } else if (node.style.willChange) {
      node.style.willChange = '';
    }
    if (this._headlightOrigins && this._headlightOrigins.has(node)) {
      const origin = this._headlightOrigins.get(node);
      try {
        if (origin && origin.parent && origin.parent.isConnected) {
          origin.parent.insertBefore(node, origin.nextSibling || null);
        }
      } catch (e) {
        // ignore reparent errors
      }
      this._headlightOrigins.delete(node);
    }
  }

  _moveHeadlightNodeToOverlay(node) {
    if (!node || !node.ownerSVGElement) {
      return;
    }
    const overlay = this._ensureHeadlightOverlay(node.ownerSVGElement);
    if (!overlay || node.parentElement === overlay) {
      return;
    }
    if (!this._headlightOrigins) {
      this._headlightOrigins = new Map();
    }
    if (!this._headlightOrigins.has(node)) {
      this._headlightOrigins.set(node, { parent: node.parentElement, nextSibling: node.nextSibling });
    }
    try {
      overlay.appendChild(node);
    } catch (e) {
      // ignore append issues
    }
  }

  _ensureHeadlightOverlay(svgElement) {
    if (!svgElement || typeof document === 'undefined') {
      return null;
    }
    const existing = svgElement.__luminaHeadlightOverlay;
    if (existing && existing.isConnected) {
      return existing;
    }
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('data-role', 'car-headlight-overlay');
    overlay.style.pointerEvents = 'none';
    overlay.style.mixBlendMode = 'screen';
    try {
      svgElement.appendChild(overlay);
    } catch (e) {
      return null;
    }
    svgElement.__luminaHeadlightOverlay = overlay;
    return overlay;
  }

  _teardownHeadlightFlash(carKey) {
    if (!this._headlightAnimations || !this._headlightAnimations.size) {
      return;
    }
    const entry = this._headlightAnimations.get(carKey);
    if (!entry) {
      return;
    }
    this._logHeadlightDebug(`${carKey} headlights teardown`, { nodeCount: entry.nodes ? entry.nodes.length : 0 });
    if (entry.timeline && typeof entry.timeline.kill === 'function') {
      entry.timeline.kill();
    }
    if (entry.nodes && entry.nodes.length) {
      entry.nodes.forEach((node) => this._resetHeadlightNode(node));
    }
    this._headlightAnimations.delete(carKey);
  }

  _teardownAllHeadlightAnimations() {
    if (!this._headlightAnimations || !this._headlightAnimations.size) {
      return;
    }
    Array.from(this._headlightAnimations.keys()).forEach((key) => this._teardownHeadlightFlash(key));
  }

  _areSameHeadlightNodes(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  _logHeadlightDebug(message, payload) {
    if (!HEADLIGHT_DEBUG_LOGGING_ENABLED) {
      return;
    }
    if (typeof console === 'undefined' || !console || typeof console.debug !== 'function') {
      return;
    }
    try {
      console.debug(`[Lumina][headlights] ${message}`, payload);
    } catch (e) {
      // ignore logging errors
    }
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
    // fluid_flow is visually more "sensitive" than dashed styles because the mask window
    // reads as continuous motion; scale it down so speed=1 matches the old ~0.25 feel.
    const fluidFlowSpeedScale = animationStyle === 'fluid_flow' ? 0.25 : 1;
    const baseLoopRate = this._computeFlowLoopRate(speedMagnitude * fluidFlowSpeedScale);
    let loopRate = baseLoopRate;
    if (useArrows) {
      if (Number.isFinite(resolvedPathLength) && resolvedPathLength > 0) {
        loopRate = baseLoopRate * (dashReferenceCycle / resolvedPathLength);
      } else {
        loopRate = baseLoopRate * 0.25;
      }
    }
    const baseDirection = flowState && typeof flowState.direction === 'number' && flowState.direction !== 0 ? Math.sign(flowState.direction) : 1;
    const elementDirectionMultiplier = (() => {
      // Optional SVG override:
      // - data-flow-dir="reverse" | "invert" | "-1"
      // - data-flow-direction="reverse" | ...
      // - data-flow-reverse="true"
      try {
        const raw = (
          (typeof element.getAttribute === 'function' ? element.getAttribute('data-flow-dir') : null)
          || (typeof element.getAttribute === 'function' ? element.getAttribute('data-flow-direction') : null)
          || (typeof element.getAttribute === 'function' ? element.getAttribute('data-flow-reverse') : null)
          || ''
        );
        const v = String(raw).trim().toLowerCase();
        if (!v) {
          return 1;
        }
        if (v === 'reverse' || v === 'invert' || v === 'true' || v === 'yes' || v === 'on' || v === '-1' || v === 'ccw') {
          return -1;
        }
        if (v === 'forward' || v === 'false' || v === 'no' || v === 'off' || v === '1' || v === 'cw') {
          return 1;
        }
        const n = Number(v);
        if (Number.isFinite(n) && n !== 0) {
          return n < 0 ? -1 : 1;
        }
      } catch (e) {
        // ignore
      }
      return 1;
    })();
    const effectiveDirection = baseDirection * elementDirectionMultiplier * directionSign;
    const isActive = seconds > 0;
    const isConfigStyled = (() => {
      try {
        const raw = element.getAttribute && element.getAttribute('data-style');
        return typeof raw === 'string' && raw.trim().toLowerCase() === 'config';
      } catch (e) {
        return false;
      }
    })();
    const shouldShow = isActive || isConfigStyled;
    const configuredFlowStrokeWidthPx = (() => {
      const v = Number(this._flowStrokeWidthPx);
      return Number.isFinite(v) ? v : null;
    })();
    const intrinsicFlowStrokeWidthPx = (() => {
      // Prefer the flow element's own stroke width (SVG attribute/CSS) so fluid_flow
      // respects per-flow widths unless a global override is set.
      try {
        const target = element && element.tagName === 'g'
          ? element.querySelector('path')
          : element;
        if (!target) {
          return null;
        }
        // Presentation attribute
        const attr = (typeof target.getAttribute === 'function') ? target.getAttribute('stroke-width') : null;
        const attrNum = attr !== null && attr !== undefined && String(attr).trim() !== '' ? Number(attr) : NaN;
        if (Number.isFinite(attrNum) && attrNum > 0) {
          return attrNum;
        }
        // Computed style
        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
          const cs = window.getComputedStyle(target);
          const sw = cs && cs.strokeWidth ? String(cs.strokeWidth) : '';
          const parsed = sw ? parseFloat(sw) : NaN;
          if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
          }
        }
      } catch (e) {
        // ignore
      }
      return null;
    })();
    const fluidBaseWidthPx = (() => {
      const v = Number(this._fluidFlowStrokeWidthPx);
      if (Number.isFinite(v)) return v;
      if (configuredFlowStrokeWidthPx !== null) return configuredFlowStrokeWidthPx;
      if (intrinsicFlowStrokeWidthPx !== null) return intrinsicFlowStrokeWidthPx;
      return 5;
    })();
    const fluidWidths = {
      base: fluidBaseWidthPx,
      outer: fluidBaseWidthPx - 4,
      mid: fluidBaseWidthPx,
      inner: Math.max(0.5, fluidBaseWidthPx - 2),
      mask: fluidBaseWidthPx + 3
    };
    let entry = this._flowTweens.get(flowKey);

    if (entry && entry.mode !== animationStyle) {
      this._killFlowEntry(entry);
      this._flowTweens.delete(flowKey);
      entry = null;
    }

    const ensurePattern = () => {
      element.setAttribute('data-flow-style', animationStyle);
      const targets = element.tagName === 'g' ? element.querySelectorAll('path') : [element];
      const isFluid = animationStyle === 'fluid_flow';
      const fluidBaseColor = strokeColor;

      if (isFluid && this._debugFluidFlow) {
        try {
          const last = this._fluidFlowDebugColors ? this._fluidFlowDebugColors.get(flowKey) : undefined;
          if (last !== strokeColor) {
            this._fluidFlowDebugColors.set(flowKey, strokeColor);
            console.debug('Lumina Energy Card: fluid_flow color', {
              flowKey,
              strokeColor,
              flowState: flowState ? { stroke: flowState.stroke, glowColor: flowState.glowColor, active: flowState.active } : null
            });
          }
        } catch (e) {
          // ignore
        }
      }
      if (!isFluid) {
        this._removeFluidFlowOverlay(flowKey, element);
        this._removeFluidFlowMask(flowKey, element);
      }
      const overlay = isFluid ? this._ensureFluidFlowOverlay(flowKey, element) : null;
      const maskInfo = (isFluid && pattern && pattern.dasharray)
        ? this._ensureFluidFlowMask(flowKey, element, pattern.dasharray, fluidWidths.mask)
        : (isFluid ? this._ensureFluidFlowMask(flowKey, element, '12 18', fluidWidths.mask) : null);

      targets.forEach(target => {
        // Smooth corners and ends on polyline-like path segments
        target.style.strokeLinecap = 'round';
        target.style.strokeLinejoin = 'round';
        if (useArrows) {
          target.style.strokeDasharray = '';
          target.style.strokeDashoffset = '';
          target.style.strokeOpacity = '';
          if (!isFluid && configuredFlowStrokeWidthPx !== null) {
            target.style.strokeWidth = `${configuredFlowStrokeWidthPx}px`;
          }
        } else if (pattern && pattern.dasharray) {
          if (isFluid) {
            // Base "bed" (matches example's rgba(0,255,255,0.15)).
            target.style.strokeDasharray = '';
            target.style.strokeDashoffset = '';
            target.style.strokeOpacity = '0.15';
            target.style.strokeWidth = `${fluidWidths.base}px`;
          } else {
            target.style.strokeDasharray = pattern.dasharray;
            if (!target.style.strokeDashoffset) {
              target.style.strokeDashoffset = '0';
            }
            target.style.strokeOpacity = '';
            if (configuredFlowStrokeWidthPx !== null) {
              target.style.strokeWidth = `${configuredFlowStrokeWidthPx}px`;
            } else {
              target.style.strokeWidth = '';
            }
          }

          // Inkscape often uses marker-start/mid/end arrowheads which render as triangles.
          // When we're animating dashes/dots, those markers are unwanted, so strip them.
          target.removeAttribute('marker-start');
          target.removeAttribute('marker-mid');
          target.removeAttribute('marker-end');
          target.style.markerStart = '';
          target.style.markerMid = '';
          target.style.markerEnd = '';
        }
        target.style.stroke = isFluid ? fluidBaseColor : strokeColor;
      });

      if (overlay && overlay.group && overlay.paths && overlay.paths.length) {
        overlay.group.setAttribute('data-flow-style', animationStyle);
        if (maskInfo && maskInfo.maskId) {
          overlay.group.setAttribute('mask', `url(#${maskInfo.maskId})`);
        } else {
          overlay.group.removeAttribute('mask');
        }
        overlay.group.style.opacity = isActive ? '1' : '0';
        overlay.paths.forEach((path) => {
          if (!path || !path.style) {
            return;
          }
          path.style.strokeLinecap = 'round';
          path.style.strokeLinejoin = 'round';
          const layer = (typeof path.getAttribute === 'function') ? (path.getAttribute('data-fluid-layer') || '') : '';
          // "Blue → white → blue" should be the pulse itself (not a separate white dash).
          // We get that by masking 3 stacked strokes with a blurred mask window:
          // - cyan haze
          // - cyan core
          // - white core
          // The mask's blur provides the ease-in/ease-out.

          if (layer === 'outer') {
            path.style.strokeWidth = `${fluidWidths.outer}px`;
            path.style.stroke = fluidBaseColor;
            path.style.strokeOpacity = this._fluidFlowOuterGlowEnabled ? '0.4' : '0';
          } else if (layer === 'mid') {
            path.style.strokeWidth = `${fluidWidths.mid}px`;
            path.style.stroke = fluidBaseColor;
            path.style.strokeOpacity = '1';
          } else {
            path.style.strokeWidth = `${fluidWidths.inner}px`;
            path.style.stroke = '#ffffff';
            path.style.strokeOpacity = '1';
          }
          path.style.fill = 'none';
          // The mask provides the moving pulse window and its easing.
          // Keep all overlay strokes solid; the blurred mask blends them into a cyan→white→cyan pulse.
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
          path.removeAttribute('data-fluid-white-shift');
          path.removeAttribute('data-fluid-period');
          path.removeAttribute('marker-start');
          path.removeAttribute('marker-mid');
          path.removeAttribute('marker-end');
          path.style.markerStart = '';
          path.style.markerMid = '';
          path.style.markerEnd = '';
        });
      }
    };
    ensurePattern();

    if (element.tagName === 'g') {
      const paths = element.querySelectorAll('path');
      paths.forEach(path => path.style.opacity = shouldShow ? '1' : '0');
    } else {
      element.style.opacity = shouldShow ? '1' : '0';
    }

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

    // fluid_flow uses a dedicated rAF animator (mask dashoffset) so it keeps moving
    // even when GSAP isn't available or can't tick elements in <mask>/<defs> reliably.
    if (animationStyle !== 'fluid_flow') {
      this._stopFluidFlowRaf(flowKey);
    }

    if (!this._gsap) {
      if (entry) {
        this._killFlowEntry(entry);
        this._flowTweens.delete(flowKey);
      }
      this._setFlowGlow(element, strokeColor, isActive ? 0.8 : 0.25);
      if (animationStyle === 'fluid_flow') {
        const overlay = this._ensureFluidFlowOverlay(flowKey, element);
        const maskInfo = this._ensureFluidFlowMask(flowKey, element, pattern && pattern.dasharray ? pattern.dasharray : '12 18', fluidWidths.mask);
        if (overlay && overlay.group && maskInfo && maskInfo.maskId) {
          overlay.group.setAttribute('mask', `url(#${maskInfo.maskId})`);
        }
        if (overlay && overlay.group) {
          overlay.group.setAttribute('data-flow-style', animationStyle);
          overlay.group.style.opacity = isActive ? '1' : '0';
          this._setFlowGlow(overlay.group, strokeColor, isActive ? 0.8 : 0.25);
        }
        if (overlay && overlay.paths && overlay.paths.length) {
          overlay.paths.forEach((path) => {
            if (path && path.style) {
              path.style.strokeDashoffset = '0';
              path.style.opacity = isActive ? '1' : '0';
            }
          });
        }

        // Drive the mask motion ourselves.
        this._setFluidFlowRaf(flowKey, {
          active: isActive,
          maskPaths: maskInfo && maskInfo.paths ? maskInfo.paths : [],
          maskId: maskInfo && maskInfo.maskId ? maskInfo.maskId : null,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate,
          direction: effectiveDirection
        });
      }
      if (!useArrows) {
        if (element.tagName === 'g') {
          const paths = element.querySelectorAll('path');
          paths.forEach(path => path.style.strokeDashoffset = '0');
        } else {
          element.style.strokeDashoffset = '0';
        }
      }
      hideArrows();
      return;
    }

    if (!entry || entry.element !== element || entry.arrowElement !== arrowGroup) {
      if (entry) {
        this._killFlowEntry(entry);
      }

      const glowState = { value: isActive ? 0.8 : 0.25 };
      const motionState = { phase: Math.random(), distance: 0 };
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
        overlayGroup: null,
        overlayPaths: [],
        maskId: null,
        maskPaths: [],
        dashCycle: pattern && pattern.cycle ? pattern.cycle : 24,
        speedMagnitude,
        loopRate,
        arrowSpeedPx: baseLoopRate * dashReferenceCycle,
        active: isActive
      };

      if (animationStyle === 'fluid_flow') {
        const overlay = this._ensureFluidFlowOverlay(flowKey, element);
        newEntry.overlayGroup = overlay.group;
        newEntry.overlayPaths = overlay.paths;
        if (newEntry.overlayGroup) {
          newEntry.overlayGroup.style.opacity = isActive ? '1' : '0';
        }
        const maskInfo = this._ensureFluidFlowMask(flowKey, element, pattern && pattern.dasharray ? pattern.dasharray : '12 18', fluidWidths.mask);
        newEntry.maskId = maskInfo.maskId;
        newEntry.maskPaths = maskInfo.paths;

        this._setFluidFlowRaf(flowKey, {
          active: isActive,
          maskPaths: newEntry.maskPaths,
          maskId: newEntry.maskId,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate,
          direction: effectiveDirection
        });
      }

      newEntry.tickerCallback = this._createFlowTicker(newEntry);
      if (newEntry.tickerCallback) {
        this._gsap.ticker.add(newEntry.tickerCallback);
      }

      this._setFlowGlow(element, strokeColor, glowState.value);
      if (animationStyle === 'fluid_flow' && newEntry.overlayGroup) {
        this._setFlowGlow(newEntry.overlayGroup, strokeColor, glowState.value);
      }
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
          if (newEntry.mode === 'fluid_flow' && newEntry.overlayGroup) {
            this._setFlowGlow(newEntry.overlayGroup, newEntry.color, glowState.value);
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
      entry.arrowSpeedPx = baseLoopRate * dashReferenceCycle;
      entry.direction = effectiveDirection;
      entry.active = isActive;
      if (animationStyle === 'fluid_flow') {
        const overlay = this._ensureFluidFlowOverlay(flowKey, element);
        entry.overlayGroup = overlay.group;
        entry.overlayPaths = overlay.paths;
        if (entry.overlayGroup) {
          entry.overlayGroup.style.opacity = isActive ? '1' : '0';
        }
        const maskInfo = this._ensureFluidFlowMask(flowKey, element, pattern && pattern.dasharray ? pattern.dasharray : '12 18', fluidWidths.mask);
        entry.maskId = maskInfo.maskId;
        entry.maskPaths = maskInfo.paths;
        if (entry.overlayGroup && entry.maskId) {
          entry.overlayGroup.setAttribute('mask', `url(#${entry.maskId})`);
        }

        this._setFluidFlowRaf(flowKey, {
          active: isActive,
          maskPaths: entry.maskPaths,
          maskId: entry.maskId,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate,
          direction: effectiveDirection
        });
      } else if (entry.overlayGroup || (entry.overlayPaths && entry.overlayPaths.length)) {
        this._removeFluidFlowOverlay(flowKey, element);
        this._removeFluidFlowMask(flowKey, element);
        entry.overlayGroup = null;
        entry.overlayPaths = [];
        entry.maskId = null;
        entry.maskPaths = [];
      }
      if (!entry.motionState) {
        entry.motionState = { phase: Math.random(), distance: 0 };
      }
      if (typeof entry.motionState.distance !== 'number' || !Number.isFinite(entry.motionState.distance)) {
        entry.motionState.distance = 0;
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
        entry.directionState.value = effectiveDirection;
        this._updateFlowMotion(entry);
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
      if (entry.mode === 'fluid_flow') {
        this._setFluidFlowRaf(flowKey, {
          active: false,
          maskPaths: entry.maskPaths,
          maskId: entry.maskId,
          cycle: (pattern && Number.isFinite(Number(pattern.cycle))) ? Number(pattern.cycle) : 30,
          loopRate: 0,
          direction: effectiveDirection
        });
      }
      this._setFlowGlow(element, strokeColor, 0.25);
      if (entry.mode === 'fluid_flow' && entry.overlayGroup) {
        entry.overlayGroup.style.opacity = '0';
        this._setFlowGlow(entry.overlayGroup, strokeColor, 0.25);
        if (entry.overlayPaths && entry.overlayPaths.length) {
          entry.overlayPaths.forEach((path) => {
            if (path && path.style) {
              path.style.strokeDashoffset = '0';
              path.style.opacity = '0';
            }
          });
        }
      }
      if (entry.directionTween) {
        entry.directionTween.kill();
        entry.directionTween = null;
      }
      if (!useArrows) {
        if (element.tagName === 'g') {
          const paths = element.querySelectorAll('path');
          paths.forEach(path => path.style.strokeDashoffset = '0');
          paths.forEach(path => path.style.opacity = isActive ? '1' : '0');
        } else {
          element.style.strokeDashoffset = '0';
          element.style.opacity = isActive ? '1' : '0';
        }
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
    entry.arrowSpeedPx = baseLoopRate * dashReferenceCycle;
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
    const style = typeof element.getAttribute === 'function' ? (element.getAttribute('data-flow-style') || '') : '';
    // Glow is intentionally limited to a small set of styles.
    // (This makes "dashes" truly "no glow".)
    // Note: fluid_flow has its own layered pulse; disable outer glow for it.
    const allowFluidFlowGlow = style === 'fluid_flow' && Boolean(this._fluidFlowOuterGlowEnabled);
    if (style !== 'dashes_glow' && !allowFluidFlowGlow) {
      if (element.style) {
        element.style.filter = '';
      }
      if (typeof element.removeAttribute === 'function') {
        element.removeAttribute('filter');
      }
      if (element.tagName === 'g') {
        const paths = element.querySelectorAll('path');
        paths.forEach((path) => {
          if (path && path.style) {
            path.style.filter = '';
          }
          if (path && typeof path.removeAttribute === 'function') {
            path.removeAttribute('filter');
          }
        });
      }
      return;
    }

    let userFactor = Number(this._dashGlowIntensity);
    if (!Number.isFinite(userFactor)) {
      userFactor = 1;
    }
    userFactor = Math.min(Math.max(userFactor, 0), 3);
    if (userFactor <= 0) {
      if (element.style) {
        element.style.filter = '';
      }
      if (typeof element.removeAttribute === 'function') {
        element.removeAttribute('filter');
      }
      if (element.tagName === 'g') {
        const paths = element.querySelectorAll('path');
        paths.forEach((path) => {
          if (path && path.style) {
            path.style.filter = '';
          }
          if (path && typeof path.removeAttribute === 'function') {
            path.removeAttribute('filter');
          }
        });
      }
      return;
    }

    // Perceptual tuning: too much blur can look "weaker" because it spreads light.
    // So we scale opacity more aggressively and blur more gently.
    // Keep glow "tight": vary blur only slightly with intensity.
    const blurBoost = 0.85 + 0.15 * userFactor;  // 0->0.85, 1->1.00, 3->1.30
    const opacityBoost = 0.6 + 0.7 * userFactor; // 0->0.6, 1->1.3, 3->2.7
    const clamped = Math.min(Math.max(Number(intensity) || 0, 0), 1);

    const key = typeof element.getAttribute === 'function'
      ? (element.getAttribute('data-flow-key') || element.getAttribute('data-arrow-key') || element.getAttribute('data-arrow-shape') || 'flow')
      : 'flow';

    // Prefer a real SVG filter for SVG elements. CSS drop-shadow on SVG can be unsupported
    // in some environments, and a non-supported CSS filter value can effectively suppress
    // any presentation-attribute filter.
    const svgRoot = element.ownerSVGElement || (element.tagName && element.tagName.toLowerCase && element.tagName.toLowerCase() === 'svg' ? element : null);

    const applyToTargets = (targets, applyFn) => {
      if (!targets) return;
      if (targets instanceof Array) {
        targets.forEach((t) => t && applyFn(t));
        return;
      }
      applyFn(targets);
    };

    if (svgRoot && typeof svgRoot.querySelector === 'function') {
      const defs = (() => {
        let d = svgRoot.querySelector('defs');
        if (!d) {
          d = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svgRoot.insertBefore(d, svgRoot.firstChild);
        }
        return d;
      })();

      const safeKey = String(key).replace(/[^a-z0-9_-]/gi, '_');
      const filterId = `lumina-glow-${safeKey}`;
      let filterEl = defs.querySelector(`#${CSS.escape(filterId)}`);
      if (!filterEl) {
        filterEl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filterEl.setAttribute('id', filterId);
        // Expand filter region to avoid clipping of glow.
        filterEl.setAttribute('x', '-50%');
        filterEl.setAttribute('y', '-50%');
        filterEl.setAttribute('width', '200%');
        filterEl.setAttribute('height', '200%');
        filterEl.setAttribute('color-interpolation-filters', 'sRGB');

        const innerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        innerShadow.setAttribute('dx', '0');
        innerShadow.setAttribute('dy', '0');
        innerShadow.setAttribute('result', 'inner');

        const outerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        outerShadow.setAttribute('dx', '0');
        outerShadow.setAttribute('dy', '0');
        outerShadow.setAttribute('result', 'outer');

        filterEl.appendChild(innerShadow);
        filterEl.appendChild(outerShadow);
        defs.appendChild(filterEl);
      }

      const drops = Array.from(filterEl.querySelectorAll('feDropShadow'));
      const innerDrop = drops[0] || null;
      const outerDrop = drops[1] || null;

      const innerOpacity = Math.min((0.35 + 0.45 * clamped) * opacityBoost, 1);
      const outerOpacity = Math.min((0.2 + 0.35 * clamped) * opacityBoost, 1);
      // Tighter base radii so the glow doesn't spread as far.
      const innerStd = (1.4 + 2.6 * clamped) * blurBoost;
      const outerStd = (2.2 + 4.2 * clamped) * blurBoost;

      if (innerDrop) {
        innerDrop.setAttribute('stdDeviation', `${innerStd}`);
        innerDrop.setAttribute('flood-color', `${color || '#00FFFF'}`);
        innerDrop.setAttribute('flood-opacity', `${innerOpacity}`);
      }
      if (outerDrop) {
        outerDrop.setAttribute('stdDeviation', `${outerStd}`);
        outerDrop.setAttribute('flood-color', `${color || '#00FFFF'}`);
        outerDrop.setAttribute('flood-opacity', `${outerOpacity}`);
      }

      const applySvgFilter = (target) => {
        if (!target || typeof target.setAttribute !== 'function') return;
        // Clear CSS filter to avoid overriding the SVG filter.
        if (target.style) {
          target.style.filter = '';
        }
        target.setAttribute('filter', `url(#${filterId})`);
      };

      applySvgFilter(element);
      if (element.tagName === 'g') {
        applyToTargets(Array.from(element.querySelectorAll('path')), applySvgFilter);
      }
      return;
    }

    // Non-SVG fallback: CSS drop-shadow.
    const inner = this._colorWithAlpha(color, 0.35 + 0.45 * clamped);
    const outer = this._colorWithAlpha(color, 0.2 + 0.3 * clamped);
    const innerBlur = 10 * blurBoost;
    const outerBlur = 16 * blurBoost;
    const filterValue = `drop-shadow(0 0 ${innerBlur}px ${inner}) drop-shadow(0 0 ${outerBlur}px ${outer})`;
    if (element.style) {
      element.style.filter = filterValue;
    }
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
    try {
      this._stopFluidFlowRaf(entry.flowKey);
    } catch (e) {
      // ignore
    }
    if (entry.mode === 'fluid_flow') {
      try {
        this._removeFluidFlowMask(entry.flowKey, entry.element);
      } catch (e) {
        // ignore
      }
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
    if (entry.overlayPaths && entry.overlayPaths.length) {
      entry.overlayPaths.forEach((path) => {
        if (path && path.style) {
          path.style.strokeDashoffset = '0';
          path.style.opacity = '0';
        }
      });
    }
    if (entry.overlayGroup) {
      try {
        entry.overlayGroup.style.opacity = '0';
      } catch (e) {
        // ignore
      }
      try {
        if (typeof entry.overlayGroup.remove === 'function') {
          entry.overlayGroup.remove();
        } else if (entry.overlayGroup.parentNode) {
          entry.overlayGroup.parentNode.removeChild(entry.overlayGroup);
        }
      } catch (e) {
        // ignore
      }
    }
    if (entry.element && entry.mode && entry.mode !== 'arrows') {
      if (entry.element.tagName === 'g') {
        const paths = entry.element.querySelectorAll('path');
        paths.forEach(path => path.style.strokeDashoffset = '0');
        paths.forEach(path => path.style.opacity = '0');
        paths.forEach(path => path.style.strokeOpacity = '');
      } else {
        entry.element.style.strokeDashoffset = '0';
        entry.element.style.opacity = '0';
        entry.element.style.strokeOpacity = '';
      }
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
    if (!element) {
      return 0;
    }
    let length = 0;
    const geometry = this._getFlowGeometryPaths(element);
    if (geometry && geometry.length) {
      geometry.forEach((path) => {
        try {
          length += path.getTotalLength();
        } catch (err) {
          // ignore
        }
      });
    }
    if (!this._flowPathLengths) {
      this._flowPathLengths = new Map();
    }
    this._flowPathLengths.set(flowKey, length);
    return length;
  }

  _positionArrowOnPath(pathElement, distance, shape, directionSign) {
    if (!pathElement || !shape || typeof pathElement.getPointAtLength !== 'function' || typeof pathElement.getTotalLength !== 'function') {
      return;
    }
    const length = pathElement.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) {
      return;
    }
    const wrapped = ((Number(distance) % length) + length) % length;
    const point = pathElement.getPointAtLength(wrapped);
    const ahead = pathElement.getPointAtLength(Math.min(wrapped + 2, length));
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
    const flip = directionSign < 0 ? 180 : 0;
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
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 1);
      const directionSign = directionValue >= 0 ? 1 : -1;

      const baseDistance = entry.motionState && Number.isFinite(entry.motionState.distance)
        ? entry.motionState.distance
        : 0;

      const geometry = this._getFlowGeometryPaths(entry.element);
      if (!geometry || geometry.length === 0) {
        return;
      }

      // Group arrow polygons by track index so multi-path flows get arrows on each path
      const shapesByTrack = new Map();
      entry.arrowShapes.forEach((shape) => {
        const attr = shape.getAttribute('data-arrow-track');
        const trackIndex = attr ? Number(attr) : 0;
        const safeIndex = Number.isFinite(trackIndex) ? trackIndex : 0;
        if (!shapesByTrack.has(safeIndex)) {
          shapesByTrack.set(safeIndex, []);
        }
        shapesByTrack.get(safeIndex).push(shape);
      });

      geometry.forEach((path, trackIndex) => {
        const shapes = shapesByTrack.get(trackIndex) || [];
        const count = shapes.length || 0;
        if (!count) {
          return;
        }
        let pathLength = 0;
        try {
          pathLength = path.getTotalLength();
        } catch (err) {
          pathLength = 0;
        }
        if (!Number.isFinite(pathLength) || pathLength <= 0) {
          return;
        }
        shapes.forEach((shape, index) => {
          const spacing = pathLength / count;
          const distance = directionSign >= 0
            ? baseDistance + index * spacing
            : baseDistance - index * spacing;
          this._positionArrowOnPath(path, distance, shape, directionSign);
        });
      });
    } else if (entry.mode !== 'arrows') {
      const cycle = entry.dashCycle || 24;
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 1);
      // NOTE: directionValue is already applied when advancing phase in the ticker.
      // Applying it again here cancels out direction reversal.
      const offset = -phase * cycle;
      if (entry.mode === 'fluid_flow') {
        const maskTargets = entry.maskPaths && entry.maskPaths.length ? entry.maskPaths : [];
        if (maskTargets.length) {
          maskTargets.forEach((path) => {
            if (path && path.style) {
              const shiftRaw = (typeof path.getAttribute === 'function') ? path.getAttribute('data-fluid-mask-shift') : null;
              const shift = shiftRaw !== null && shiftRaw !== undefined ? Number(shiftRaw) : 0;
              const applied = Number.isFinite(shift) ? (offset + shift * cycle) : offset;
              path.style.strokeDashoffset = `${applied}`;
            }
          });
        } else if (entry.overlayPaths && entry.overlayPaths.length) {
          // Fallback for older entries created before mask support.
          entry.overlayPaths.forEach((path) => {
            if (path && path.style) {
              path.style.strokeDashoffset = `${offset}`;
            }
          });
        }
      } else if (entry.element.tagName === 'g') {
        const paths = entry.element.querySelectorAll('path');
        paths.forEach(path => path.style.strokeDashoffset = `${offset}`);
      } else {
        entry.element.style.strokeDashoffset = `${offset}`;
      }
    }
  }

  _createFlowTicker(entry) {
    if (!this._gsap || !this._gsap.ticker) {
      return null;
    }
    // fluid_flow is animated via a dedicated rAF loop.
    if (entry && entry.mode === 'fluid_flow') {
      return null;
    }
    return (time, deltaTime) => {
      if (!entry || !entry.active) {
        return;
      }
      const directionValue = entry.directionState && Number.isFinite(entry.directionState.value)
        ? entry.directionState.value
        : (entry.direction || 0);
      if (directionValue === 0) {
        return;
      }
      if (!entry.motionState) {
        entry.motionState = { phase: 0, distance: 0 };
      }

      if (entry.mode === 'arrows') {
        const speedPx = Number(entry.arrowSpeedPx) || 0;
        const delta = deltaTime * speedPx * (directionValue >= 0 ? 1 : -1);
        if (!Number.isFinite(delta) || delta === 0) {
          return;
        }
        entry.motionState.distance = (Number(entry.motionState.distance) || 0) + delta;
        if (!Number.isFinite(entry.motionState.distance)) {
          entry.motionState.distance = 0;
        }
      } else {
        const loopRate = entry.loopRate || 0;
        if (loopRate === 0) {
          return;
        }
        const delta = deltaTime * loopRate * directionValue;
        if (!Number.isFinite(delta) || delta === 0) {
          return;
        }
        entry.motionState.phase = (Number(entry.motionState.phase) || 0) + delta;
        if (!Number.isFinite(entry.motionState.phase)) {
          entry.motionState.phase = 0;
        }
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
    if (this._fluidFlowRafs && this._fluidFlowRafs.size) {
      Array.from(this._fluidFlowRafs.keys()).forEach((key) => {
        try {
          this._stopFluidFlowRaf(key);
        } catch (e) {
          // ignore
        }
      });
      this._fluidFlowRafs.clear();
    }
  }

  _stopFluidFlowRaf(flowKey) {
    if (!flowKey || !this._fluidFlowRafs) {
      return;
    }
    const key = String(flowKey);
    const state = this._fluidFlowRafs.get(key);
    if (!state) {
      return;
    }
    if (state.rafId) {
      try {
        cancelAnimationFrame(state.rafId);
      } catch (e) {
        // ignore
      }
    }

    if (this._debugFluidFlow) {
      try {
        console.debug('[lumina][fluid_flow] rAF stop', {
          flowKey: key,
          maskId: state.maskId || null,
          maskPaths: (state.maskPaths && state.maskPaths.length) ? state.maskPaths.length : 0
        });
      } catch (e) {
        // ignore
      }
    }
    this._fluidFlowRafs.delete(key);
  }

  _setFluidFlowRaf(flowKey, opts) {
    if (!flowKey) {
      return;
    }
    if (!this._fluidFlowRafs) {
      this._fluidFlowRafs = new Map();
    }
    const key = String(flowKey);
    const active = Boolean(opts && opts.active);
    const maskPaths = (opts && opts.maskPaths && Array.isArray(opts.maskPaths)) ? opts.maskPaths : [];
    const cycle = (opts && Number.isFinite(Number(opts.cycle))) ? Number(opts.cycle) : 30;
    const loopRate = (opts && Number.isFinite(Number(opts.loopRate))) ? Number(opts.loopRate) : 0;
    const direction = (opts && Number.isFinite(Number(opts.direction))) ? Number(opts.direction) : 0;
    const maskId = (opts && typeof opts.maskId === 'string' && opts.maskId) ? opts.maskId : null;

    if (!active || !maskPaths.length || loopRate === 0 || direction === 0) {
      if (this._debugFluidFlow) {
        try {
          const now = Date.now();
          const prev = this._fluidFlowDebugStopLog ? this._fluidFlowDebugStopLog.get(key) : null;
          const shouldLog = !prev || !prev.t || (now - prev.t) > 2000;
          if (shouldLog) {
            if (this._fluidFlowDebugStopLog) {
              this._fluidFlowDebugStopLog.set(key, { t: now });
            }
            console.debug('[lumina][fluid_flow] rAF not starting (conditions)', {
              flowKey: key,
              active,
              maskId,
              maskPaths: maskPaths.length,
              loopRate,
              direction
            });
          }
        } catch (e) {
          // ignore
        }
      }
      this._stopFluidFlowRaf(key);
      return;
    }

    let state = this._fluidFlowRafs.get(key);
    if (!state) {
      state = {
        rafId: null,
        lastTs: null,
        phase: Math.random(),
        maskPaths: [],
        cycle,
        loopRate,
        direction,
        maskId,
        didLogStart: false,
        didLogFirstTick: false
      };
      this._fluidFlowRafs.set(key, state);
    }

    state.maskPaths = maskPaths;
    state.cycle = cycle;
    state.loopRate = loopRate;
    state.direction = direction;
    state.maskId = maskId;

    // Clear any throttled stop log once we are actually running.
    try {
      if (this._fluidFlowDebugStopLog) {
        this._fluidFlowDebugStopLog.delete(key);
      }
    } catch (e) {
      // ignore
    }

    if (this._debugFluidFlow && !state.didLogStart) {
      state.didLogStart = true;
      try {
        console.debug('[lumina][fluid_flow] rAF start', {
          flowKey: key,
          gsapPresent: Boolean(this._gsap),
          maskId: state.maskId,
          maskPaths: state.maskPaths.length,
          cycle: state.cycle,
          loopRate: state.loopRate,
          direction: state.direction
        });
      } catch (e) {
        // ignore
      }
    }

    const tick = (ts) => {
      const s = this._fluidFlowRafs.get(key);
      if (!s) {
        return;
      }
      if (s.lastTs === null || s.lastTs === undefined) {
        s.lastTs = ts;
      }
      const deltaMs = Number(ts) - Number(s.lastTs);
      s.lastTs = ts;
      if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
        s.rafId = requestAnimationFrame(tick);
        return;
      }

      // Keep units consistent with the existing FLOW_BASE_LOOP_RATE (expects ms deltas).
      s.phase = (Number(s.phase) || 0) + (deltaMs * s.loopRate * (s.direction >= 0 ? 1 : -1));
      if (!Number.isFinite(s.phase)) {
        s.phase = 0;
      }
      const offset = -(s.phase * s.cycle);

      const targets = s.maskPaths || [];
      targets.forEach((path) => {
        if (!path || !path.style) {
          return;
        }
        const shiftRaw = (typeof path.getAttribute === 'function') ? path.getAttribute('data-fluid-mask-shift') : null;
        const shift = shiftRaw !== null && shiftRaw !== undefined ? Number(shiftRaw) : 0;
        const applied = Number.isFinite(shift) ? (offset + shift * s.cycle) : offset;
        path.style.strokeDashoffset = `${applied}`;
      });

      if (this._debugFluidFlow && !s.didLogFirstTick) {
        s.didLogFirstTick = true;
        try {
          const sample = targets && targets.length ? targets[0].style.strokeDashoffset : null;
          console.debug('[lumina][fluid_flow] rAF first tick', {
            flowKey: key,
            deltaMs,
            sampleDashoffset: sample
          });
        } catch (e) {
          // ignore
        }
      }

      s.rafId = requestAnimationFrame(tick);
    };

    if (!state.rafId) {
      state.lastTs = null;
      state.rafId = requestAnimationFrame(tick);
    }
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

    const stateString = this._hass.states[entity_id].state;
    let value = parseFloat(stateString);
    const attributes = this._hass.states[entity_id].attributes || {};
    const unitCandidates = [attributes.unit_of_measurement, attributes.native_unit_of_measurement];
    let unit = '';
    for (let i = 0; i < unitCandidates.length; i += 1) {
      if (typeof unitCandidates[i] === 'string' && unitCandidates[i].trim()) {
        unit = unitCandidates[i].trim().toLowerCase();
        break;
      }
    }

    // Some template sensors omit unit metadata but keep the suffix in the state text.
    if (!unit && typeof stateString === 'string') {
      const suffix = stateString.trim().toLowerCase();
      if (suffix.endsWith('kw')) {
        unit = 'kw';
      } else if (suffix.endsWith('kwh')) {
        unit = 'kwh';
      }
    }

    if (unit === 'kw' || unit === 'kwh') {
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

  formatEnergy(wattHours, use_kw) {
    const value = Number.isFinite(wattHours) ? wattHours : 0;
    if (use_kw) {
      return (value / 1000).toFixed(2) + ' kWh';
    }
    return Math.round(value) + ' Wh';
  }

  formatPopupValue(_unused, sensorId) {
    if (!sensorId || !this._hass || !this._hass.states) {
      return '';
    }
    const resolvedId = typeof sensorId === 'string' ? sensorId.trim() : sensorId;
    if (!resolvedId || !this._hass.states[resolvedId]) {
      return '';
    }
    const entity = this._hass.states[resolvedId];
    const rawState = entity && entity.state !== undefined && entity.state !== null
      ? entity.state.toString().trim()
      : '';
    if (!rawState) {
      return '';
    }
    const lowerState = rawState.toLowerCase();
    if (lowerState === 'unknown' || lowerState === 'unavailable') {
      return rawState;
    }
    const unit = (entity.attributes && typeof entity.attributes.unit_of_measurement === 'string')
      ? entity.attributes.unit_of_measurement.trim()
      : '';
    return unit ? `${rawState} ${unit}` : rawState;
  }

  _computeEffectiveNightMode(config) {
    const rawMode = config && typeof config.day_night_mode === 'string'
      ? config.day_night_mode.trim().toLowerCase()
      : '';
    if (rawMode === 'day') {
      return false;
    }
    if (rawMode === 'night') {
      return true;
    }
    if (rawMode === 'auto') {
      const sun = this._hass && this._hass.states ? this._hass.states['sun.sun'] : null;
      const sunState = sun && typeof sun.state === 'string' ? sun.state : '';
      if (sunState === 'below_horizon') {
        return true;
      }
      if (sunState === 'above_horizon') {
        return false;
      }
      return false;
    }
    // Legacy fallback: existing configs that only have boolean night_mode.
    return Boolean(config && config.night_mode);
  }

  _layerConfigWithEffectiveNight(config) {
    const base = config || {};
    const night = this._computeEffectiveNightMode(base);
    return { ...base, night_mode: night };
  }

  render() {
    if (!this._hass || !this.config) return;

    const config = this._layerConfigWithEffectiveNight(this.config);
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
    const heatPumpSensorId = typeof config.sensor_heat_pump_consumption === 'string'
      ? config.sensor_heat_pump_consumption.trim()
      : (config.sensor_heat_pump_consumption || null);
    const hasHeatPumpSensor = Boolean(heatPumpSensorId);
    const heat_pump_w = hasHeatPumpSensor ? this.getStateSafe(heatPumpSensorId) : 0;

    const poolSensorId = typeof config.sensor_pool_consumption === 'string'
      ? config.sensor_pool_consumption.trim()
      : (config.sensor_pool_consumption || null);
    const hasPoolSensor = Boolean(poolSensorId);
    const pool_w = hasPoolSensor ? this.getStateSafe(poolSensorId) : 0;

    const washingMachineSensorId = typeof config.sensor_washing_machine_consumption === 'string'
      ? config.sensor_washing_machine_consumption.trim()
      : (config.sensor_washing_machine_consumption || null);
    const hasWashingMachineSensor = Boolean(washingMachineSensorId);
    const washing_machine_w = hasWashingMachineSensor ? this.getStateSafe(washingMachineSensorId) : 0;

    const dryerSensorId = typeof config.sensor_dryer_consumption === 'string'
      ? config.sensor_dryer_consumption.trim()
      : (config.sensor_dryer_consumption || null);
    const hasDryerSensor = Boolean(dryerSensorId);
    const dryer_w = hasDryerSensor ? this.getStateSafe(dryerSensorId) : 0;

    const refrigeratorSensorId = typeof config.sensor_refrigerator_consumption === 'string'
      ? config.sensor_refrigerator_consumption.trim()
      : (config.sensor_refrigerator_consumption || null);
    const hasRefrigeratorSensor = Boolean(refrigeratorSensorId);
    const refrigerator_w = hasRefrigeratorSensor ? this.getStateSafe(refrigeratorSensorId) : 0;

    const resolveEntityId = (value) => (typeof value === 'string' ? value.trim() : '');
    const isEntityAvailable = (entityId) => {
      if (!entityId || !this._hass || !this._hass.states || !this._hass.states[entityId]) {
        return false;
      }
      const state = this._hass.states[entityId].state;
      return state !== 'unavailable' && state !== 'unknown';
    };
    // Prefer combined battery power sensors, but derive net power from charge/discharge entities when needed.
    const computeBatteryPowerReading = (powerEntityId, chargeEntityId, dischargeEntityId) => {
      const combinedId = resolveEntityId(powerEntityId);
      const chargeId = resolveEntityId(chargeEntityId);
      const dischargeId = resolveEntityId(dischargeEntityId);
      const configured = Boolean(combinedId || chargeId || dischargeId);
      const chargeAvailable = Boolean(chargeId && isEntityAvailable(chargeId));
      const dischargeAvailable = Boolean(dischargeId && isEntityAvailable(dischargeId));

      // Prefer explicit charge/discharge sensors when either is available for more accurate per-battery data.
      if (chargeAvailable || dischargeAvailable) {
        const chargeValue = chargeAvailable ? this.getStateSafe(chargeId) : 0;
        const dischargeValue = dischargeAvailable ? this.getStateSafe(dischargeId) : 0;
        const safeCharge = Number.isFinite(chargeValue) ? chargeValue : 0;
        const safeDischarge = Number.isFinite(dischargeValue) ? dischargeValue : 0;
        const chargeActive = safeCharge !== 0;
        const dischargeActive = safeDischarge !== 0;
        const derivedValue = chargeActive
          ? safeCharge  // Positive => charging, negative => discharging per upstream semantics
          : (dischargeActive
            ? (safeDischarge > 0 ? -safeDischarge : safeDischarge)
            : 0);
        return {
          configured,
          hasValue: true,
          value: derivedValue,
          combinedId,
          chargeId,
          dischargeId,
          chargeAvailable,
          dischargeAvailable,
          source: 'charge_discharge',
          chargeSample: safeCharge,
          dischargeSample: safeDischarge
        };
      }

      if (combinedId && isEntityAvailable(combinedId)) {
        const combinedValue = this.getStateSafe(combinedId);
        const safeValue = Number.isFinite(combinedValue) ? combinedValue : 0;
        return {
          configured,
          hasValue: true,
          value: safeValue,
          combinedId,
          chargeId,
          dischargeId,
          chargeAvailable: false,
          dischargeAvailable: false,
          source: 'combined',
          combinedSample: safeValue
        };
      }

      return {
        configured,
        hasValue: false,
        value: 0,
        combinedId,
        chargeId,
        dischargeId,
        chargeAvailable: false,
        dischargeAvailable: false,
        source: 'unavailable'
      };
    };

    const batteryPowerReadings = [
      computeBatteryPowerReading(config.sensor_bat1_power, config.sensor_bat1_charge_power, config.sensor_bat1_discharge_power),
      computeBatteryPowerReading(config.sensor_bat2_power, config.sensor_bat2_charge_power, config.sensor_bat2_discharge_power),
      computeBatteryPowerReading(config.sensor_bat3_power, config.sensor_bat3_charge_power, config.sensor_bat3_discharge_power),
      computeBatteryPowerReading(config.sensor_bat4_power, config.sensor_bat4_charge_power, config.sensor_bat4_discharge_power)
    ];

    // Get battery configs
    const bat_configs = [
      { soc: config.sensor_bat1_soc, readingIndex: 0 },
      { soc: config.sensor_bat2_soc, readingIndex: 1 },
      { soc: config.sensor_bat3_soc, readingIndex: 2 },
      { soc: config.sensor_bat4_soc, readingIndex: 3 }
    ].filter((b) => b.soc && b.soc !== '');

    // Calculate battery totals
    let total_bat_w = 0;
    let total_soc = 0;
    let activeSocCount = 0;
    
    bat_configs.forEach((b) => {
      const socId = resolveEntityId(b.soc);
      if (socId && isEntityAvailable(socId)) {
        total_soc += this.getStateSafe(socId);
        activeSocCount++;
      }
    });
    
    batteryPowerReadings.forEach((reading) => {
      if (reading && reading.hasValue) {
        total_bat_w += reading.value;
      }
    });

    const avg_soc = activeSocCount > 0 ? Math.round(total_soc / activeSocCount) : 0;

    // Get other sensors
    const toNumber = (value) => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    // Grid can be driven by one or two inverters.
    // Inverter 1 uses the existing sensor_grid_* keys.
    // Inverter 2 uses sensor_grid2_*.
    let gridNet = 0;
    let gridMagnitude = 0;
    let gridDirection = 1;
    let gridActive = false;
    let gridImportDaily = 0;
    let gridExportDaily = 0;

    let grid1Net = 0;
    let grid1Import = 0;
    let grid1Export = 0;
    let grid1ImportDaily = 0;
    let grid1ExportDaily = 0;
    let grid1Direction = 1;
    let grid1Magnitude = 0;
    let grid1Active = false;
    const hasCombinedGrid1 = Boolean(config.sensor_grid_power);

    let grid2Net = 0;
    let grid2Import = 0;
    let grid2Export = 0;
    let grid2ImportDaily = 0;
    let grid2ExportDaily = 0;
    let grid2Direction = 1;
    let grid2Magnitude = 0;
    let grid2Active = false;
    const hasCombinedGrid2 = Boolean(config.sensor_grid2_power);
    const hasAnyGrid2 = Boolean(config.sensor_grid2_power || config.sensor_grid2_import || config.sensor_grid2_export);

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

    if (config.sensor_grid_import_daily) {
      const raw = this.getStateSafe(config.sensor_grid_import_daily);
      grid1ImportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    if (config.sensor_grid_export_daily) {
      const raw = this.getStateSafe(config.sensor_grid_export_daily);
      grid1ExportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    if (config.sensor_grid2_import_daily) {
      const raw = this.getStateSafe(config.sensor_grid2_import_daily);
      grid2ImportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    if (config.sensor_grid2_export_daily) {
      const raw = this.getStateSafe(config.sensor_grid2_export_daily);
      grid2ExportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }

    // Inverter 1 grid
    if (hasCombinedGrid1) {
      const grid_raw = this.getStateSafe(config.sensor_grid_power);
      const gridAdjusted = config.invert_grid ? (grid_raw * -1) : grid_raw;
      const thresholdedNet = Math.abs(gridAdjusted) < gridActivityThreshold ? 0 : gridAdjusted;
      grid1Net = thresholdedNet;
      grid1Magnitude = Math.abs(grid1Net);
      if (!Number.isFinite(grid1Magnitude)) {
        grid1Magnitude = 0;
      }
      grid1Direction = grid1Net > 0 ? 1 : (grid1Net < 0 ? -1 : 1);
      grid1Active = gridActivityThreshold === 0
        ? grid1Magnitude > 0
        : grid1Magnitude >= gridActivityThreshold;
    } else {
      if (config.sensor_grid_import) {
        grid1Import = this.getStateSafe(config.sensor_grid_import);
        if (Math.abs(grid1Import) < gridActivityThreshold) {
          grid1Import = 0;
        }
      }
      if (config.sensor_grid_export) {
        grid1Export = this.getStateSafe(config.sensor_grid_export);
        if (Math.abs(grid1Export) < gridActivityThreshold) {
          grid1Export = 0;
        }
      }
      grid1Net = grid1Import - grid1Export;
      if (config.invert_grid) {
        grid1Net *= -1;
        const temp = grid1Import;
        grid1Import = grid1Export;
        grid1Export = temp;
      }
      if (Math.abs(grid1Net) < gridActivityThreshold) {
        grid1Net = 0;
      }
      grid1Magnitude = Math.abs(grid1Net);
      if (!Number.isFinite(grid1Magnitude)) {
        grid1Magnitude = 0;
      }
      const preferredDirection = grid1Import >= grid1Export ? 1 : -1;
      grid1Direction = grid1Net > 0 ? 1 : (grid1Net < 0 ? -1 : preferredDirection);
      grid1Active = gridActivityThreshold === 0
        ? grid1Magnitude > 0
        : grid1Magnitude >= gridActivityThreshold;
    }

    // Inverter 2 grid (optional)
    if (hasAnyGrid2) {
      if (hasCombinedGrid2) {
        const grid_raw = this.getStateSafe(config.sensor_grid2_power);
        const gridAdjusted = config.invert_grid ? (grid_raw * -1) : grid_raw;
        const thresholdedNet = Math.abs(gridAdjusted) < gridActivityThreshold ? 0 : gridAdjusted;
        grid2Net = thresholdedNet;
        grid2Magnitude = Math.abs(grid2Net);
        if (!Number.isFinite(grid2Magnitude)) {
          grid2Magnitude = 0;
        }
        grid2Direction = grid2Net > 0 ? 1 : (grid2Net < 0 ? -1 : 1);
        grid2Active = gridActivityThreshold === 0
          ? grid2Magnitude > 0
          : grid2Magnitude >= gridActivityThreshold;
      } else {
        if (config.sensor_grid2_import) {
          grid2Import = this.getStateSafe(config.sensor_grid2_import);
          if (Math.abs(grid2Import) < gridActivityThreshold) {
            grid2Import = 0;
          }
        }
        if (config.sensor_grid2_export) {
          grid2Export = this.getStateSafe(config.sensor_grid2_export);
          if (Math.abs(grid2Export) < gridActivityThreshold) {
            grid2Export = 0;
          }
        }
        grid2Net = grid2Import - grid2Export;
        if (config.invert_grid) {
          grid2Net *= -1;
          const temp = grid2Import;
          grid2Import = grid2Export;
          grid2Export = temp;
        }
        if (Math.abs(grid2Net) < gridActivityThreshold) {
          grid2Net = 0;
        }
        grid2Magnitude = Math.abs(grid2Net);
        if (!Number.isFinite(grid2Magnitude)) {
          grid2Magnitude = 0;
        }
        const preferredDirection = grid2Import >= grid2Export ? 1 : -1;
        grid2Direction = grid2Net > 0 ? 1 : (grid2Net < 0 ? -1 : preferredDirection);
        grid2Active = gridActivityThreshold === 0
          ? grid2Magnitude > 0
          : grid2Magnitude >= gridActivityThreshold;
      }
    }

    // Totals for the existing grid display
    gridNet = grid1Net + grid2Net;
    if (Math.abs(gridNet) < gridActivityThreshold) {
      gridNet = 0;
    }
    gridMagnitude = Math.abs(gridNet);
    if (!Number.isFinite(gridMagnitude)) {
      gridMagnitude = 0;
    }
    const fallbackDirection = (grid1Magnitude >= grid2Magnitude) ? grid1Direction : grid2Direction;
    gridDirection = gridNet > 0 ? 1 : (gridNet < 0 ? -1 : (fallbackDirection || 1));
    gridActive = gridActivityThreshold === 0
      ? gridMagnitude > 0
      : gridMagnitude >= gridActivityThreshold;
    gridImportDaily = grid1ImportDaily + grid2ImportDaily;
    gridExportDaily = grid1ExportDaily + grid2ExportDaily;

    const thresholdMultiplier = use_kw ? 1000 : 1;
    const gridWarningThresholdRaw = toNumber(config.grid_threshold_warning);
    const gridCriticalThresholdRaw = toNumber(config.grid_threshold_critical);
    const gridWarningThreshold = gridWarningThresholdRaw !== null ? gridWarningThresholdRaw * thresholdMultiplier : null;
    const gridCriticalThreshold = gridCriticalThresholdRaw !== null ? gridCriticalThresholdRaw * thresholdMultiplier : null;
    const gridWarningColor = typeof config.grid_warning_color === 'string' && config.grid_warning_color ? config.grid_warning_color : null;
    const gridCriticalColor = typeof config.grid_critical_color === 'string' && config.grid_critical_color ? config.grid_critical_color : null;

    const grid2WarningThresholdRaw = toNumber(config.grid2_threshold_warning);
    const grid2CriticalThresholdRaw = toNumber(config.grid2_threshold_critical);
    const grid2WarningThreshold = grid2WarningThresholdRaw !== null ? grid2WarningThresholdRaw * thresholdMultiplier : null;
    const grid2CriticalThreshold = grid2CriticalThresholdRaw !== null ? grid2CriticalThresholdRaw * thresholdMultiplier : null;
    const grid2WarningColor = typeof config.grid2_warning_color === 'string' && config.grid2_warning_color ? config.grid2_warning_color : null;
    const grid2CriticalColor = typeof config.grid2_critical_color === 'string' && config.grid2_critical_color ? config.grid2_critical_color : null;
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
    const resolveCarEntityId = (primary, legacy) => {
      if (typeof primary === 'string') {
        const trimmed = primary.trim();
        if (trimmed) {
          return trimmed;
        }
      }
      if (typeof legacy === 'string') {
        const trimmed = legacy.trim();
        if (trimmed) {
          return trimmed;
        }
      }
      return '';
    };
    const car1PowerSensorId = resolveCarEntityId(config.sensor_car_power, config.car_power);
    const car1SocSensorId = resolveCarEntityId(config.sensor_car_soc, config.car_soc);
    const car2PowerSensorId = resolveCarEntityId(config.sensor_car2_power, config.car2_power);
    const car2SocSensorId = resolveCarEntityId(config.sensor_car2_soc, config.car2_soc);
    const car1EntitiesConfigured = Boolean(car1PowerSensorId || car1SocSensorId);
    const car2EntitiesConfigured = Boolean(car2PowerSensorId || car2SocSensorId);
    const showCar1 = car1EntitiesConfigured;
    const showCar2 = car2EntitiesConfigured;
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
    const car1PowerValue = showCar1 && car1PowerSensorId ? this.getStateSafe(car1PowerSensorId) : 0;
    const car1SocValue = showCar1 && car1SocSensorId ? this.getStateSafe(car1SocSensorId) : null;
    const car2PowerValue = showCar2 && car2PowerSensorId ? this.getStateSafe(car2PowerSensorId) : 0;
    const car2SocValue = showCar2 && car2SocSensorId ? this.getStateSafe(car2SocSensorId) : null;
    const carLayoutKey = showCar2 ? 'dual' : 'single';
    const carLayout = CAR_LAYOUTS[carLayoutKey];
    const car1Transforms = buildCarTextTransforms(carLayout.car1);
    const car2Transforms = buildCarTextTransforms(carLayout.car2);

    // PV Popup
    const popupPvSensorIds = [
      config.sensor_popup_pv_1,
      config.sensor_popup_pv_2,
      config.sensor_popup_pv_3,
      config.sensor_popup_pv_4,
      config.sensor_popup_pv_5,
      config.sensor_popup_pv_6
    ];
    const popupPvValues = popupPvSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));

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
    const popupHouseSensorIds = [
      config.sensor_popup_house_1,
      config.sensor_popup_house_2,
      config.sensor_popup_house_3,
      config.sensor_popup_house_4,
      config.sensor_popup_house_5,
      config.sensor_popup_house_6
    ];
    const popupHouseValues = popupHouseSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));

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
    const selectBackgroundPath = () => {
      const legacy = (typeof config.background_image === 'string' && config.background_image.trim())
        ? config.background_image.trim()
        : '';
      const day = (typeof config.background_day === 'string' && config.background_day.trim())
        ? config.background_day.trim()
        : '';
      const night = (typeof config.background_night === 'string' && config.background_night.trim())
        ? config.background_night.trim()
        : '';
      const chosen = config.night_mode ? night : day;
      return chosen || legacy || '/local/community/lumina-energy-card/lumina.svg';
    };
    const bg_img = selectBackgroundPath();
    const title_text = (typeof config.card_title === 'string' && config.card_title.trim()) ? config.card_title.trim() : null;
    const title_text_color = (typeof config.title_text_color === 'string' && config.title_text_color.trim()) ? config.title_text_color.trim() : '';
    const title_bg_color = (typeof config.title_bg_color === 'string' && config.title_bg_color.trim()) ? config.title_bg_color.trim() : '';
    const font_family = (typeof config.font_family === 'string' && config.font_family.trim()) ? config.font_family.trim() : 'sans-serif';
    const odometer_font_family = (typeof config.odometer_font_family === 'string' && config.odometer_font_family.trim())
      ? config.odometer_font_family.trim()
      : font_family;
    // Best-effort: load the configured font(s) from Google Fonts (external is fine).
    this._ensureGoogleFont(font_family);
    if (odometer_font_family && odometer_font_family !== font_family) {
      this._ensureGoogleFont(odometer_font_family);
    }

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

    const header_font_size = clampValue(config.header_font_size, 4, 32, 16);
    const daily_label_font_size = clampValue(config.daily_label_font_size, 4, 24, 12);
    const daily_value_font_size = clampValue(config.daily_value_font_size, 4, 32, 20);
    const pv_font_size = clampValue(config.pv_font_size, 4, 28, 16);
    const windmill_power_font_size = clampValue(config.windmill_power_font_size, 4, 28, 16);
    const battery_soc_font_size = clampValue(config.battery_soc_font_size, 4, 32, 20);
    const battery_power_font_size = clampValue(config.battery_power_font_size, 4, 28, 14);
    const load_font_size = clampValue(config.load_font_size, 4, 28, 15);
    const inv1_power_font_size = clampValue(
      config.inv1_power_font_size !== undefined ? config.inv1_power_font_size : config.load_font_size,
      4,
      28,
      load_font_size
    );
    const inv2_power_font_size = clampValue(
      config.inv2_power_font_size !== undefined ? config.inv2_power_font_size : config.load_font_size,
      4,
      28,
      load_font_size
    );
    const heat_pump_font_size = clampValue(config.heat_pump_font_size, 4, 28, 16);
    const pool_font_size = clampValue(
      config.pool_font_size !== undefined ? config.pool_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const washing_machine_font_size = clampValue(
      config.washing_machine_font_size !== undefined ? config.washing_machine_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const dryer_font_size = clampValue(
      config.dryer_font_size !== undefined ? config.dryer_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const refrigerator_font_size = clampValue(
      config.refrigerator_font_size !== undefined ? config.refrigerator_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const grid_font_size = clampValue(config.grid_font_size, 4, 28, 15);
    const grid_daily_font_size = clampValue(config.grid_daily_font_size, 4, 28, grid_font_size);
    const grid_current_odometer = config.grid_current_odometer === true;
    const grid_current_odometer_duration = clampValue(config.grid_current_odometer_duration, 50, 2000, 350);
    const car_power_font_size = clampValue(config.car_power_font_size, 4, 28, 15);
    const car_soc_font_size = clampValue(config.car_soc_font_size, 4, 24, 12);
    const car2_power_font_size = clampValue(config.car2_power_font_size !== undefined ? config.car2_power_font_size : config.car_power_font_size, 4, 28, car_power_font_size);
    const car2_soc_font_size = clampValue(config.car2_soc_font_size !== undefined ? config.car2_soc_font_size : config.car_soc_font_size, 4, 24, car_soc_font_size);
    const car_name_font_size = clampValue(config.car_name_font_size !== undefined ? config.car_name_font_size : config.car_power_font_size, 4, 28, car_power_font_size);
    const car2_name_font_size = clampValue(config.car2_name_font_size !== undefined ? config.car2_name_font_size : (config.car2_power_font_size !== undefined ? config.car2_power_font_size : config.car_power_font_size), 4, 28, car2_power_font_size);
    const animation_speed_factor = clampValue(config.animation_speed_factor, -3, 3, 1);
    this._animationSpeedFactor = animation_speed_factor;
    this._rotationSpeedFactor = animation_speed_factor;
    const dayAnimationStyle = this._normalizeAnimationStyle(config.animation_style);
    const nightAnimationStyle = (() => {
      const raw = (typeof config.night_animation_style === 'string') ? config.night_animation_style.trim() : '';
      if (!raw) return dayAnimationStyle;
      return this._normalizeAnimationStyle(raw);
    })();
    const animation_style = Boolean(config.night_mode) ? nightAnimationStyle : dayAnimationStyle;
    this._animationStyle = animation_style;

    // Debugging: logs fluid_flow mask + animator lifecycle into the browser console.
    // Enable with YAML: debug_fluid_flow: true
    this._debugFluidFlow = Boolean(config.debug_fluid_flow);

    // Flow stroke width overrides (no SVG editing required).
    // - flow_stroke_width: applies to non-fluid flow styles (dashes/dots/etc)
    // - fluid_flow_stroke_width: base width for animation_style: fluid_flow
    //   (overlay + mask widths are derived from this base).
    const flow_stroke_width = (() => {
      const raw = toNumber(config.flow_stroke_width);
      if (raw === null) return null;
      const v = Number(raw);
      if (!Number.isFinite(v)) return null;
      return Math.min(Math.max(v, 0.5), 30);
    })();
    const fluid_flow_stroke_width = (() => {
      const raw = toNumber(config.fluid_flow_stroke_width);
      if (raw === null) return null;
      const v = Number(raw);
      if (!Number.isFinite(v)) return null;
      return Math.min(Math.max(v, 0.5), 30);
    })();
    this._flowStrokeWidthPx = flow_stroke_width;
    this._fluidFlowStrokeWidthPx = fluid_flow_stroke_width;

    // Controls the extra glow strength when animation_style is dashes_glow.
    // 0 disables glow even if dashes_glow is selected.
    const dashes_glow_intensity = clampValue(config.dashes_glow_intensity, 0, 3, 1);
    this._dashGlowIntensity = dashes_glow_intensity;

    // Controls the extra outer haze/glow layer for animation_style: fluid_flow.
    this._fluidFlowOuterGlowEnabled = Boolean(config.fluid_flow_outer_glow);

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
    const loadFlowColor = resolveColor(config.load_flow_color, C_CYAN);
    const loadTextBaseColor = resolveColor(config.load_text_color, C_WHITE);
    const batterySocTextColor = resolveColor(config.battery_soc_color, C_WHITE);
    const batteryChargeColor = resolveColor(config.battery_charge_color, C_CYAN);
    const batteryDischargeColor = resolveColor(config.battery_discharge_color, C_WHITE);
    const gridImportColor = resolveColor(config.grid_import_color, C_RED);
    const gridExportColor = resolveColor(config.grid_export_color, C_CYAN);
    const grid2ImportColor = resolveColor(config.grid2_import_color, gridImportColor);
    const grid2ExportColor = resolveColor(config.grid2_export_color, gridExportColor);
    const carFlowColor = resolveColor(config.car_flow_color, C_CYAN);
    const heatPumpFlowColor = resolveColor(config.heat_pump_flow_color, '#FFA500');
    const heatPumpTextColor = resolveColor(config.heat_pump_text_color, '#FFA500');
    const windmillFlowColor = resolveColor(config.windmill_flow_color, C_CYAN);
    const windmillTextColor = resolveColor(config.windmill_text_color, C_WHITE);
    const batteryFillHighColor = resolveColor(config.battery_fill_high_color, DEFAULT_BATTERY_FILL_HIGH_COLOR);
    const batteryFillLowColor = resolveColor(config.battery_fill_low_color, DEFAULT_BATTERY_FILL_LOW_COLOR);
    const batteryLowThreshold = (() => {
      const raw = toNumber(config.battery_fill_low_threshold);
      if (raw === null) {
        return DEFAULT_BATTERY_LOW_THRESHOLD;
      }
      return Math.min(Math.max(raw, 0), 100);
    })();
    const batteryFillOpacity = (() => {
      const raw = toNumber(config.battery_fill_opacity);
      if (raw === null) {
        return 1;
      }
      return Math.min(Math.max(raw, 0), 1);
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
      return loadTextBaseColor;
    })();

    const poolFlowColor = resolveColor(config.pool_flow_color, effectiveLoadFlowColor);
    const poolTextColor = resolveColor(config.pool_text_color, effectiveLoadTextColor);
    const washingMachineTextColor = resolveColor(config.washing_machine_text_color, effectiveLoadTextColor);
    const dryerTextColor = resolveColor(config.dryer_text_color, effectiveLoadTextColor);
    const refrigeratorTextColor = resolveColor(config.refrigerator_text_color, effectiveLoadTextColor);
    const invertBattery = Boolean(config.invert_battery);
    const isBatPositive = total_bat_w >= 0;
    const bat_col = isBatPositive
      ? (invertBattery ? batteryDischargeColor : batteryChargeColor)
      : (invertBattery ? batteryChargeColor : batteryDischargeColor);
    let batteryDirectionSign = isBatPositive ? 1 : -1;
    if (invertBattery) batteryDirectionSign *= -1;

    // Windmill
    const windmillTotalId = (typeof config.sensor_windmill_total === 'string') ? config.sensor_windmill_total.trim() : '';
    const windmillTotalAvailable = Boolean(windmillTotalId) && isEntityAvailable(windmillTotalId);
    const windmillTotalRaw = windmillTotalAvailable ? this.getStateSafe(windmillTotalId) : 0;
    const windmillTotalW = Number.isFinite(windmillTotalRaw) ? windmillTotalRaw : 0;
    const windmillSpin = windmillTotalAvailable && windmillTotalW > 0;
    const windmillFlowActive = windmillTotalAvailable && windmillTotalW > 10;

    const bat1SocId = resolveEntityId(config.sensor_bat1_soc);
    const bat2SocId = resolveEntityId(config.sensor_bat2_soc);
    const bat3SocId = resolveEntityId(config.sensor_bat3_soc);
    const bat4SocId = resolveEntityId(config.sensor_bat4_soc);

    const hasBat1SocValue = Boolean(bat1SocId) && isEntityAvailable(bat1SocId);
    const hasBat2SocValue = Boolean(bat2SocId) && isEntityAvailable(bat2SocId);
    const hasBat3SocValue = Boolean(bat3SocId) && isEntityAvailable(bat3SocId);
    const hasBat4SocValue = Boolean(bat4SocId) && isEntityAvailable(bat4SocId);

    const bat1SocValue = hasBat1SocValue ? this.getStateSafe(bat1SocId) : null;
    const bat2SocValue = hasBat2SocValue ? this.getStateSafe(bat2SocId) : null;
    const bat3SocValue = hasBat3SocValue ? this.getStateSafe(bat3SocId) : null;
    const bat4SocValue = hasBat4SocValue ? this.getStateSafe(bat4SocId) : null;

    const battery1Fill = (() => {
      const soc = (bat1SocValue !== null) ? Number(bat1SocValue) : NaN;
      if (!Number.isFinite(soc)) {
        return { visible: false, level: 0, fill: batteryFillHighColor, opacity: batteryFillOpacity };
      }
      const clampedSoc = Math.min(Math.max(soc, 0), 100);
      const fill = clampedSoc <= batteryLowThreshold ? batteryFillLowColor : batteryFillHighColor;
      return {
        visible: hasBat1SocValue,
        level: clampedSoc / 100,
        fill,
        opacity: batteryFillOpacity
      };
    })();

    const battery2Fill = (() => {
      const soc = (bat2SocValue !== null) ? Number(bat2SocValue) : NaN;
      if (!Number.isFinite(soc)) {
        return { visible: false, level: 0, fill: batteryFillHighColor, opacity: batteryFillOpacity };
      }
      const clampedSoc = Math.min(Math.max(soc, 0), 100);
      const fill = clampedSoc <= batteryLowThreshold ? batteryFillLowColor : batteryFillHighColor;
      return {
        visible: hasBat2SocValue,
        level: clampedSoc / 100,
        fill,
        opacity: batteryFillOpacity
      };
    })();

    const [bat1PowerReading, bat2PowerReading, bat3PowerReading, bat4PowerReading] = batteryPowerReadings;

    const hasBat1PowerSensor = Boolean(bat1PowerReading && bat1PowerReading.configured);
    const hasBat2PowerSensor = Boolean(bat2PowerReading && bat2PowerReading.configured);
    const hasBat3PowerSensor = Boolean(bat3PowerReading && bat3PowerReading.configured);
    const hasBat4PowerSensor = Boolean(bat4PowerReading && bat4PowerReading.configured);

    const hasBat1PowerValue = Boolean(bat1PowerReading && bat1PowerReading.hasValue);
    const hasBat2PowerValue = Boolean(bat2PowerReading && bat2PowerReading.hasValue);
    const hasBat3PowerValue = Boolean(bat3PowerReading && bat3PowerReading.hasValue);
    const hasBat4PowerValue = Boolean(bat4PowerReading && bat4PowerReading.hasValue);

    const invertBat1 = Boolean(config.invert_bat1);
    const invertBat2 = Boolean(config.invert_bat2);
    const invertBat3 = Boolean(config.invert_bat3);

    // Apply inversion as a sign multiplier so downstream logic can rely on signed power.
    const baseBatSign = invertBattery ? -1 : 1;
    const bat1Sign = baseBatSign * (invertBat1 ? -1 : 1);
    const bat2Sign = baseBatSign * (invertBat2 ? -1 : 1);
    const bat3Sign = baseBatSign * (invertBat3 ? -1 : 1);
    const bat4Sign = baseBatSign;

    const bat1PowerW = hasBat1PowerValue ? (bat1Sign * bat1PowerReading.value) : 0;
    const bat2PowerW = hasBat2PowerValue ? (bat2Sign * bat2PowerReading.value) : 0;
    const bat3PowerW = hasBat3PowerValue ? (bat3Sign * bat3PowerReading.value) : 0;
    const bat4PowerW = hasBat4PowerValue ? (bat4Sign * bat4PowerReading.value) : 0;

    const resolveBatteryFlowState = (powerW) => {
      const isPositive = Number(powerW) >= 0;
      const stroke = isPositive ? batteryChargeColor : batteryDischargeColor;
      const direction = isPositive ? 1 : -1;
      return { stroke, glowColor: stroke, direction };
    };

    const bat1Flow = resolveBatteryFlowState(bat1PowerW);
    const bat2Flow = resolveBatteryFlowState(bat2PowerW);
    const bat3Flow = resolveBatteryFlowState(bat3PowerW);
    const bat4Flow = resolveBatteryFlowState(bat4PowerW);
    const computeEffectiveGridColor = (directionSign, magnitude, importColor, exportColor, warningThreshold, criticalThreshold, warningColor, criticalColor) => {
      const baseColor = (directionSign >= 0 ? importColor : exportColor);
      // Export is always the base export color; thresholds apply only for import.
      if (directionSign < 0) {
        return exportColor;
      }
      if (criticalColor && criticalThreshold !== null && magnitude >= criticalThreshold) {
        return criticalColor;
      }
      if (warningColor && warningThreshold !== null && magnitude >= warningThreshold) {
        return warningColor;
      }
      return baseColor;
    };

    const effectiveGridColor = computeEffectiveGridColor(
      gridDirectionSign,
      gridMagnitude,
      gridImportColor,
      gridExportColor,
      gridWarningThreshold,
      gridCriticalThreshold,
      gridWarningColor,
      gridCriticalColor
    );
    const effectiveGrid1Color = computeEffectiveGridColor(
      grid1Direction,
      grid1Magnitude,
      gridImportColor,
      gridExportColor,
      gridWarningThreshold,
      gridCriticalThreshold,
      gridWarningColor,
      gridCriticalColor
    );
    const effectiveGrid2Color = computeEffectiveGridColor(
      grid2Direction,
      grid2Magnitude,
      grid2ImportColor,
      grid2ExportColor,
      grid2WarningThreshold,
      grid2CriticalThreshold,
      grid2WarningColor,
      grid2CriticalColor
    );
    const gridAnimationDirection = -gridDirectionSign;
    const gridImportExportDirection = -gridDirectionSign;
    const gridHouseDirection = gridDirectionSign;
    const inverter1ImportExportDirection = -grid1Direction;
    const inverter2ImportExportDirection = -grid2Direction;
    const liquid_fill = (avg_soc <= batteryLowThreshold) ? batteryFillLowColor : batteryFillHighColor;
    const show_double_flow = (pv_primary_w > 10 && pv_secondary_w > 10);
    const pvLinesRaw = [];
    // If Array 2 is producing, show totals only: PV TOTAL, Array 1 total, Array 2 total
    if (pv_secondary_w > 10) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.formatPower(total_pv_w, use_kw)}`, fill: pvTotColor });
      pvLinesRaw.push({ key: 'pv-primary-total', text: `Array 1: ${this.formatPower(pv_primary_w, use_kw)}`, fill: pvPrimaryColor });
      pvLinesRaw.push({ key: 'pv-secondary-total', text: `Array 2: ${this.formatPower(pv_secondary_w, use_kw)}`, fill: pvSecondaryColor });
    } else if (pvStringValues.length > 1) {
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

    const showDailyGrid = Boolean(config.show_daily_grid);
    const hasGridDailyImport = Boolean(
      (config.sensor_grid_import_daily && Number.isFinite(grid1ImportDaily))
      || (config.sensor_grid2_import_daily && Number.isFinite(grid2ImportDaily))
    );
    const hasGridDailyExport = Boolean(
      (config.sensor_grid_export_daily && Number.isFinite(grid1ExportDaily))
      || (config.sensor_grid2_export_daily && Number.isFinite(grid2ExportDaily))
    );
    const gridDailyImportVisible = showDailyGrid && hasGridDailyImport;
    const gridDailyExportVisible = showDailyGrid && hasGridDailyExport;

    // Build optional grid daily lines (import/export cumulative values)
    // Back-compat for SVGs that define grid-line-0 / grid-line-1.
    let gridLines = [];
    if (showDailyGrid) {
      const gridLinesRaw = [];
      if (hasGridDailyImport && Number.isFinite(gridImportDaily)) {
        gridLinesRaw.push({ key: 'grid-import-daily', text: this.formatEnergy(gridImportDaily, use_kw), fill: gridImportColor });
      }
      if (hasGridDailyExport && Number.isFinite(gridExportDaily)) {
        gridLinesRaw.push({ key: 'grid-export-daily', text: this.formatEnergy(gridExportDaily, use_kw), fill: gridExportColor });
      }
      const gridLineCount = Math.min(gridLinesRaw.length, 2);
      if (gridLineCount > 0) {
        const gridBaseY = TEXT_POSITIONS.grid.y + 18;
        gridLines = gridLinesRaw.slice(0, gridLineCount).map((line, index) => ({
          ...line,
          fontSize: grid_daily_font_size,
          y: gridBaseY + index * (grid_daily_font_size + 4),
          visible: true
        }));
      }
    }

    // Build load display lines when Inverter 2 home load is configured.
    // This is purely a UI/layout toggle and should not depend on PV production being > 0.
    const houseFill = resolveColor(config.house_total_color, C_CYAN);
    const inv1Fill = resolveColor(config.inv1_color, pvPrimaryColor);
    const inv2Fill = resolveColor(config.inv2_color, pvSecondaryColor);
    const hasSecondaryLoadSensor = Boolean(typeof config.sensor_home_load_secondary === 'string' && config.sensor_home_load_secondary.trim());
    const loadLines = hasSecondaryLoadSensor ? [
      { key: 'house-total', text: `HOUSE TOT: ${this.formatPower(houseTotalLoad, use_kw)}`, fill: houseFill, visible: true },
      { key: 'inv1-total', text: `${this.formatPower(loadValue, use_kw)}`, fill: inv1Fill, fontSize: inv1_power_font_size, visible: true },
      { key: 'inv2-total', text: `${this.formatPower(loadSecondary, use_kw)}`, fill: inv2Fill, fontSize: inv2_power_font_size, visible: true }
    ] : null;
      //here
      
    const loadY = hasSecondaryLoadSensor ? (TEXT_POSITIONS.home.y - 28) : TEXT_POSITIONS.home.y;

    const pvTotalId = resolveEntityId(config.sensor_pv_total);
    const pvTotal2Id = resolveEntityId(config.sensor_pv_total_secondary);
    const hasValidArray1Production = Boolean(pvTotalId && isEntityAvailable(pvTotalId))
      || (Array.isArray(pvStringIds) && pvStringIds.some((sensorId) => {
        const id = resolveEntityId(sensorId);
        return Boolean(id && isEntityAvailable(id));
      }));
    const hasValidArray2Production = Boolean(pvTotal2Id && isEntityAvailable(pvTotal2Id))
      || (Array.isArray(pvArray2Ids) && pvArray2Ids.some((sensorId) => {
        const id = resolveEntityId(sensorId);
        return Boolean(id && isEntityAvailable(id));
      }));
    const hasPrimarySolar = Boolean(hasValidArray1Production || hasValidArray2Production);
    const useHouseGridPath = !hasPrimarySolar;
    const pvUiPreviouslyEnabled = this._pvUiEnabled !== undefined ? this._pvUiEnabled : true;
    const pvUiEnabled = hasPrimarySolar;
    if (pvUiPreviouslyEnabled && !pvUiEnabled) {
      this._hidePvPopup();
    }
    this._pvUiEnabled = pvUiEnabled;
    const gridActiveForGrid = !useHouseGridPath && gridActive;
    const gridActiveForHouse = useHouseGridPath && gridActive;
    const inverterGridFlowsEnabled = !useHouseGridPath;

    const car1Direction = car1PowerValue > 0 ? 1 : (car1PowerValue < 0 ? -1 : 1);
    const car2Direction = car2PowerValue > 0 ? 1 : (car2PowerValue < 0 ? -1 : 1);
    const CAR_CHARGING_THRESHOLD_W = 10;
    const car1Charging = showCar1 && car1PowerValue > CAR_CHARGING_THRESHOLD_W;
    const car2Charging = showCar2 && car2PowerValue > CAR_CHARGING_THRESHOLD_W;

    this._logHeadlightDebug('power snapshot', {
      car1PowerW: car1PowerValue,
      car2PowerW: car2PowerValue,
      car1Charging,
      car2Charging
    });

    const flows = {
      pv1: { stroke: pvPrimaryColor, glowColor: pvPrimaryColor, active: pv_primary_w > 0 && !(pv_secondary_w > 0) },
      pv2: { stroke: pvSecondaryColor, glowColor: pvSecondaryColor, active: pv_secondary_w > 0 },
      windmill: { stroke: windmillFlowColor, glowColor: windmillFlowColor, active: windmillFlowActive, direction: 1 },
      bat: { stroke: bat_col, glowColor: bat_col, active: Math.abs(total_bat_w) > 10, direction: batteryDirectionSign },
      battery1: { stroke: bat1Flow.stroke, glowColor: bat1Flow.glowColor, active: Boolean(hasBat1PowerSensor) && Math.abs(bat1PowerW) > 10, direction: bat1Flow.direction },
      battery2: { stroke: bat2Flow.stroke, glowColor: bat2Flow.glowColor, active: Boolean(hasBat2PowerSensor) && Math.abs(bat2PowerW) > 10, direction: bat2Flow.direction },
      battery3: { stroke: bat3Flow.stroke, glowColor: bat3Flow.glowColor, active: Boolean(hasBat3PowerSensor) && Math.abs(bat3PowerW) > 10, direction: bat3Flow.direction },
      'inverter1-battery1': { stroke: bat1Flow.stroke, glowColor: bat1Flow.glowColor, active: Boolean(hasBat1PowerSensor) && Math.abs(bat1PowerW) > 10, direction: bat1Flow.direction },
      'inverter2-battery2': { stroke: bat2Flow.stroke, glowColor: bat2Flow.glowColor, active: Boolean(hasBat2PowerSensor) && Math.abs(bat2PowerW) > 10, direction: bat2Flow.direction },
      load: { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: loadMagnitude > 10, direction: 1 },
      'house-load': { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: loadMagnitude > 10, direction: 1 },
      grid: { stroke: effectiveGridColor, glowColor: effectiveGridColor, active: gridActiveForGrid, direction: gridAnimationDirection },
      // House-only grid flow when no PV entities exist. Uses load thresholds/colors.
      grid_house: { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: gridActiveForHouse && loadMagnitude > 10, direction: gridHouseDirection },
      'grid-house': { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: gridActiveForHouse && loadMagnitude > 10, direction: gridHouseDirection },

      // New optional alias flow key used by some SVGs.
      // Mirrors grid-house when running in grid-only mode, otherwise mirrors inverter1-grid.
      'gird-feed': inverterGridFlowsEnabled
        ? { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: gridHouseDirection }
        : { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: gridActiveForHouse && loadMagnitude > 10, direction: gridHouseDirection },

      // New per-inverter bidirectional grid flows.
      'inverter1-import-export': { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: inverter1ImportExportDirection },
      'inverter2-import-export': { stroke: effectiveGrid2Color, glowColor: effectiveGrid2Color, active: inverterGridFlowsEnabled && grid2Active, direction: inverter2ImportExportDirection },
      // Alias keys used by some SVGs.
      'inverter1-grid': { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: inverter1ImportExportDirection },
      'inverter2-grid': { stroke: effectiveGrid2Color, glowColor: effectiveGrid2Color, active: inverterGridFlowsEnabled && grid2Active, direction: inverter2ImportExportDirection },
      // Back-compat for older SVGs.
      'grid-import-export': { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: inverter1ImportExportDirection },
      car1: { stroke: carFlowColor, glowColor: carFlowColor, active: showCar1 && Math.abs(car1PowerValue) > 10, direction: car1Direction },
      car2: { stroke: carFlowColor, glowColor: carFlowColor, active: showCar2 && Math.abs(car2PowerValue) > 10, direction: car2Direction },
      heatPump: { stroke: heatPumpFlowColor, glowColor: heatPumpFlowColor, active: hasHeatPumpSensor && heat_pump_w > 10, direction: 1 },
      pool: { stroke: poolFlowColor, glowColor: poolFlowColor, active: hasPoolSensor && Math.abs(pool_w) > 10, direction: 1 }
    };

    flows.pv1.direction = 1;
    flows.pv2.direction = 1;
    flows.windmill.direction = 1;
    flows.heatPump.direction = 1;
    flows.pool.direction = 1;

    const flowDurations = Object.fromEntries(
      Object.entries(flows).map(([key, state]) => [key, state.active ? 1 : 0])
    );

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
    const headlightFlashState = {
      enabled: Boolean(config.car_headlight_flash),
      car1: { visible: showCar1, charging: car1Charging },
      car2: { visible: showCar2, charging: car2Charging }
    };
    const showGridFlowLabel = config.show_grid_flow_label !== false;
    const gridValueText = this.formatPower(Math.abs(gridNet), use_kw);
    const gridCurrentValueText = gridValueText;
    const gridText = (() => {
      if (!showGridFlowLabel) {
        return gridValueText;
      }
      if (gridNet > 0) {
        return `${label_importing} ${gridValueText}`;
      }
      if (gridNet < 0) {
        return `${label_exporting} ${gridValueText}`;
      }
      return gridValueText;
    })();

    const hasAnyBatteryEntityDefined = [
      config.sensor_bat1_soc, config.sensor_bat1_power,
      config.sensor_bat2_soc, config.sensor_bat2_power,
      config.sensor_bat3_soc, config.sensor_bat3_power,
      config.sensor_bat4_soc, config.sensor_bat4_power
    ].some((v) => typeof v === 'string' && v.trim());
    const hasAnyBatteryPowerDefined = batteryPowerReadings.some((reading) => Boolean(reading && reading.configured));

    const viewState = {
      language: lang,
      backgroundImage: bg_img,
      fontFamily: font_family,
      odometerFontFamily: odometer_font_family,
      animationStyle: animation_style,
      title: { text: title_text, fontSize: header_font_size, fill: title_text_color },
      titleBg: { fill: title_bg_color },
      daily: { label: label_daily, value: `${total_daily_kwh} kWh`, labelSize: daily_label_font_size, valueSize: daily_value_font_size, visible: pvUiEnabled },
      pvDaily: {
        text: `${total_daily_kwh} kWh`,
        fontSize: daily_value_font_size,
        fill: title_text_color,
        bgFill: title_bg_color,
        visible: pvUiEnabled && Boolean(config.sensor_daily || config.sensor_daily_array2)
      },
      pv: { fontSize: pv_font_size, lines: pvLines },
      pv1Total: { text: this.formatPower(pv_primary_w, use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: pvUiEnabled },
      pv2Total: { text: this.formatPower(pv_secondary_w, use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: pv_secondary_w > 10 },
      pvTotal: { text: this.formatPower(total_pv_w, use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: pvUiEnabled },
      windmillPower: { text: windmillTotalAvailable ? this.formatPower(windmillTotalW, use_kw) : '', fontSize: windmill_power_font_size, fill: windmillTextColor, visible: Boolean(windmillTotalId) },
      battery: { levelOffset: BATTERY_GEOMETRY.MAX_HEIGHT - current_h, fill: liquid_fill, visible: activeSocCount > 0, opacity: batteryFillOpacity },
      battery1Fill,
      battery2Fill,
      batterySoc: {
        text: (hasAnyBatteryEntityDefined && activeSocCount > 0) ? `${Math.floor(avg_soc)}%` : '',
        fontSize: battery_soc_font_size,
        fill: batterySocTextColor,
        visible: Boolean(hasAnyBatteryEntityDefined)
      },
      batteryPower: {
        text: (hasAnyBatteryEntityDefined && hasAnyBatteryPowerDefined) ? this.formatPower(Math.abs(total_bat_w), use_kw) : '',
        fontSize: battery_power_font_size,
        fill: bat_col,
        visible: Boolean(hasAnyBatteryEntityDefined)
      },
      battery1: { text: hasBat1PowerValue ? this.formatPower(Math.abs(bat1PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat1Flow.stroke, visible: Boolean(hasBat1PowerSensor) },
      battery2: { text: hasBat2PowerValue ? this.formatPower(Math.abs(bat2PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat2Flow.stroke, visible: Boolean(hasBat2PowerSensor) },
      battery3: { text: hasBat3PowerValue ? this.formatPower(Math.abs(bat3PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat3Flow.stroke, visible: Boolean(hasBat3PowerSensor) },

      // Per-battery SVG placeholders
      battery1Soc: { text: (bat1SocValue !== null) ? `${Math.round(bat1SocValue)}%` : '', fontSize: battery_soc_font_size, fill: batterySocTextColor, visible: Boolean(bat1SocId) },
      battery1Power: { text: hasBat1PowerValue ? this.formatPower(Math.abs(bat1PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat1Flow.stroke, visible: Boolean(hasBat1PowerSensor) },
      battery2Soc: { text: (bat2SocValue !== null) ? `${Math.round(bat2SocValue)}%` : '', fontSize: battery_soc_font_size, fill: batterySocTextColor, visible: Boolean(bat2SocId) },
      battery2Power: { text: hasBat2PowerValue ? this.formatPower(Math.abs(bat2PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat2Flow.stroke, visible: Boolean(hasBat2PowerSensor) },
      battery3Soc: { text: (bat3SocValue !== null) ? `${Math.round(bat3SocValue)}%` : '', fontSize: battery_soc_font_size, fill: batterySocTextColor, visible: Boolean(bat3SocId) },
      battery3Power: { text: hasBat3PowerValue ? this.formatPower(Math.abs(bat3PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat3Flow.stroke, visible: Boolean(hasBat3PowerSensor) },
      battery4Soc: { text: (bat4SocValue !== null) ? `${Math.round(bat4SocValue)}%` : '', fontSize: battery_soc_font_size, fill: batterySocTextColor, visible: Boolean(bat4SocId) },
      battery4Power: { text: hasBat4PowerValue ? this.formatPower(Math.abs(bat4PowerW), use_kw) : '', fontSize: battery_power_font_size, fill: bat4Flow.stroke, visible: Boolean(hasBat4PowerSensor) },
      load: (loadLines && loadLines.length) ? { lines: loadLines, y: loadY, fontSize: load_font_size, fill: effectiveLoadTextColor } : { text: this.formatPower(loadValue, use_kw), fontSize: load_font_size, fill: effectiveLoadTextColor },
      houseLoad: { text: this.formatPower(loadValue, use_kw), fontSize: load_font_size, fill: effectiveLoadFlowColor, visible: true, odometer: grid_current_odometer, odometerDuration: grid_current_odometer_duration },
      grid: { text: gridText, fontSize: grid_font_size, fill: effectiveGridColor, lines: gridLines },
      gridCurrentPower: { text: gridCurrentValueText, fontSize: grid_font_size, fill: effectiveGridColor, odometer: grid_current_odometer, odometerDuration: grid_current_odometer_duration },
      gridDailyImport: {
        text: gridDailyImportVisible ? this.formatEnergy(gridImportDaily, use_kw) : '',
        fontSize: grid_daily_font_size,
        fill: gridImportColor,
        visible: gridDailyImportVisible,
        odometer: grid_current_odometer,
        odometerDuration: grid_current_odometer_duration
      },
      gridDailyExport: {
        text: gridDailyExportVisible ? this.formatEnergy(gridExportDaily, use_kw) : '',
        fontSize: grid_daily_font_size,
        fill: gridExportColor,
        visible: gridDailyExportVisible,
        odometer: grid_current_odometer,
        odometerDuration: grid_current_odometer_duration
      },
      heatPump: {
        text: hasHeatPumpSensor ? this.formatPower(heat_pump_w, use_kw) : '',
        fontSize: heat_pump_font_size,
        fill: heatPumpTextColor,
        visible: hasHeatPumpSensor
      },
      pool: {
        text: hasPoolSensor ? this.formatPower(pool_w, use_kw) : '',
        fontSize: pool_font_size,
        fill: poolTextColor,
        visible: hasPoolSensor
      },
      washingMachine: {
        text: hasWashingMachineSensor ? this.formatPower(washing_machine_w, use_kw) : '',
        fontSize: washing_machine_font_size,
        fill: washingMachineTextColor,
        visible: hasWashingMachineSensor
      },
      dryer: {
        text: hasDryerSensor ? this.formatPower(dryer_w, use_kw) : '',
        fontSize: dryer_font_size,
        fill: dryerTextColor,
        visible: hasDryerSensor
      },
      refrigerator: {
        text: hasRefrigeratorSensor ? this.formatPower(refrigerator_w, use_kw) : '',
        fontSize: refrigerator_font_size,
        fill: refrigeratorTextColor,
        visible: hasRefrigeratorSensor
      },
      car1: car1View,
      car2: car2View,
      popup: {
        lines: popupPvValues.map((valueText, i) => (valueText ? `${popupPvNames[i]}: ${valueText}` : '')),
        hasContent: popupPvValues.some((valueText) => Boolean(valueText))
      },
      pvUiEnabled,
      showDailyGrid,
      flows,
      flowDurations,
      windmillSpin,
      headlightFlash: headlightFlashState,
      showDebugGrid
    };

    this._ensureTemplate(viewState);
    if (!this._domRefs) {
      this._cacheDomReferences();
    }
    this._updateView(viewState);
    this._applyFlowAnimationTargets(viewState.flowDurations, viewState.flows);
    this._applyRotateAnimations();
    this._prevViewState = this._snapshotViewState(viewState);
    this._forceRender = false;
  }

  }

  _ensureTemplate(viewState) {
    if (this._rootInitialized) {
      return;
    }
    // Ensure external font is requested (Google Fonts). Uses config.font_family primary name.
    this._ensureGoogleFont(this.config && this.config.font_family);
    this.shadowRoot.innerHTML = this._buildTemplate(viewState);
    this._rootInitialized = true;
    this._cacheDomReferences();

    // Apply SVG layer visibility based on configuration
    const svgElement = this.shadowRoot.querySelector('svg');
    if (svgElement) {
      applySvgLayerVisibility(svgElement, this._layerConfigWithEffectiveNight(this.config));
    }
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
    const dailyDisplay = viewState.daily && viewState.daily.visible ? 'inline' : 'none';
    const dailyCursor = viewState.daily && viewState.daily.visible ? 'pointer' : 'default';
    const enableEchoAlive = Boolean(this.config && this.config.enable_echo_alive);
    const echoAliveIframe = enableEchoAlive ? `
        <div class="echo-alive-container" data-role="echo-alive-container">
          <iframe
            class="echo-alive-iframe"
            src="https://Giorgio866.github.io/Alive-echo/?v=6"
            title="Echo Alive"
            data-role="echo-alive-iframe">
          </iframe>
        </div>
      ` : '';

    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        :host { display: block; }
        ha-card { position: relative; height: 100%; overflow: hidden; background: transparent; border: none; box-shadow: none; }
        .track-path { stroke: #555555; stroke-width: 2px; fill: none; opacity: 0; }
        .flow-path { stroke-linecap: round; stroke-width: 3px; fill: none; opacity: 0; transition: opacity 0.35s ease; filter: none; }
        .flow-arrow { pointer-events: none; opacity: 0; transition: opacity 0.35s ease; }
        .debug-grid line { pointer-events: none; }
        .debug-grid text { pointer-events: none; font-family: sans-serif; }
        @keyframes pulse-cyan { 0% { filter: drop-shadow(0 0 2px #00FFFF); } 50% { filter: drop-shadow(0 0 10px #00FFFF); } 100% { filter: drop-shadow(0 0 2px #00FFFF); } }
        @keyframes lumina-fluid-flow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -30; } }
        .alive-box { animation: pulse-cyan 3s infinite ease-in-out; stroke: #00FFFF; stroke-width: 2px; fill: #001428; }
        .alive-text { fill: #00FFFF; }
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
        .debug-coordinates {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 6px 10px;
          background: rgba(0, 20, 40, 0.85);
          border: 1px solid #00FFFF;
          border-radius: 4px;
          font-family: 'Orbitron', sans-serif;
          font-size: 12px;
          letter-spacing: 1px;
          color: #00FFFF;
          pointer-events: none;
          text-transform: uppercase;
          display: none;
        }

        .title-overlay {
          position: absolute;
          left: 0;
          top: 0;
          display: none;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          border-radius: 5px;
          box-shadow: inset 0 0 6px currentColor, 0 0 2px currentColor, 0 0 8px currentColor;
          text-shadow: 0 0 6px currentColor;
        }

        .popup-backdrop {
          position: absolute;
          inset: 0;
          display: none;
          pointer-events: auto;
          background: transparent;
        }

        .popup-overlay {
          position: absolute;
          left: 0;
          top: 0;
          display: none;
          box-sizing: border-box;
          background: #001428;
          border: 2px solid #00FFFF;
          border-radius: 10px;
          box-shadow: inset 0 0 8px #00FFFF, 0 0 3px #00FFFF, 0 0 9px #00FFFF;
          cursor: pointer;
        }

        .popup-lines {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .popup-line {
          font-family: sans-serif;
          white-space: nowrap;
          line-height: 1.25;
        }
        /* Echo Alive iframe styles - Small transparent hotspot bottom-left */
        .echo-alive-container {
          position: absolute;
          bottom: 8px;
          left: 8px;
          width: 10px;
          height: 10px;
          z-index: 9999;
          pointer-events: auto;
          border-radius: 2px;
          background: rgba(0, 255, 255, 0.3);
          border: none;
          box-shadow: none;
          transition: all 0.2s ease, opacity 0.3s ease;
          overflow: hidden;
        }
        .echo-alive-container:hover {
          background: rgba(0, 255, 255, 0.5);
        }
        .echo-alive-container.clicked {
          background: rgba(0, 255, 255, 1) !important;
          box-shadow: 0 0 8px rgba(0, 255, 255, 1) !important;
          transform: scale(1.5);
          animation: echoAlivePulse 0.5s ease;
        }
        @keyframes echoAlivePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.8); }
          100% { transform: scale(1.5); }
        }
        .echo-alive-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          pointer-events: auto;
          opacity: 1;
        }
        .echo-alive-container ha-icon-button,
        .echo-alive-container button,
        .echo-alive-container .icon-button,
        .echo-alive-container [class*="icon-button"],
        .echo-alive-container [class*="button"],
        .echo-alive-container [role="button"],
        .echo-alive-container * {
          display: none !important;
          visibility: hidden !important;
        }
      </style>
      <ha-card>
        <svg viewBox="0 0 800 450" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 100%; height: 100%;">
          <defs>
            <clipPath id="battery-clip"><rect x="${BATTERY_GEOMETRY.X}" y="${BATTERY_GEOMETRY.Y_BASE - BATTERY_GEOMETRY.MAX_HEIGHT}" width="${BATTERY_GEOMETRY.WIDTH}" height="${BATTERY_GEOMETRY.MAX_HEIGHT}" rx="2" /></clipPath>
            <filter id="${HEADLIGHT_SVG_FILTER_ID}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="${HEADLIGHT_SVG_FILTER_STD_DEV}" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g data-role="background-svg"></g>
          <g data-role="debug-grid" class="debug-grid" style="display:none;">
            ${DEBUG_GRID_CONTENT}
          </g>

          <!--
          ${viewState.title && viewState.title.text ? `
          <rect x="290" y="10" width="220" height="32" rx="6" ry="6" fill="rgba(0, 20, 40, 0.85)" stroke="#00FFFF" stroke-width="1.5"/>
          <text data-role="title-text" x="400" y="32" class="title-text" font-size="${viewState.title.fontSize}">${viewState.title.text}</text>
          ` : ''}
          -->

          <!--
          <g data-role="daily-yield-group" transform="translate(600, 370)" style="cursor:${dailyCursor}; display:${dailyDisplay};">
            <rect x="0" y="0" width="180" height="60" rx="10" ry="10" class="alive-box" />
            <text data-role="daily-label" x="90" y="23" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.labelSize}px; font-weight:normal; letter-spacing: 1px;">${viewState.daily.label}</text>
            <text data-role="daily-value" x="90" y="50" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.valueSize}px; font-weight:bold;">${viewState.daily.value}</text>
          </g>
          -->

          <!-- Old battery fill - commented out for SVG transition -->
          <!--
          <g transform="${BATTERY_TRANSFORM}">
            <g clip-path="url(#battery-clip)">
              <g data-role="battery-liquid-group" style="transition: transform 1s ease-in-out;" transform="translate(0, ${viewState.battery.levelOffset})">
                <g transform="translate(0, ${BATTERY_OFFSET_BASE})">
                  <path data-role="battery-liquid-shape" class="liquid-shape" fill="${viewState.battery.fill}" d="${batteryPath}" />
                </g>
              </g>
            </g>
          </g>
          -->


          <!-- Old PV power and string values - commented out for SVG transition -->
          <!-- ${pvLineElements} -->

          <!-- Old battery SOC and power text - commented out for SVG transition -->
          <!--
          <text data-role="battery-soc" x="${TEXT_POSITIONS.battery.x}" y="${TEXT_POSITIONS.battery.y}" transform="${TEXT_TRANSFORMS.battery}" fill="${viewState.batterySoc.fill}" font-size="${viewState.batterySoc.fontSize}" style="${TXT_STYLE}">${viewState.batterySoc.text}</text>
          <text data-role="battery-power" x="${TEXT_POSITIONS.battery.x}" y="${TEXT_POSITIONS.battery.y + 20}" transform="${TEXT_TRANSFORMS.battery}" fill="${viewState.batteryPower.fill}" font-size="${viewState.batteryPower.fontSize}" style="${TXT_STYLE}">${viewState.batteryPower.text}</text>
          -->

          <!-- Old house consumption - commented out for SVG transition -->
          <!--
          <text data-role="load-power" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}">${viewState.load.text || ''}</text>
          <text data-role="load-line-0" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[0] && viewState.load.lines[0].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="load-line-1" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[1] && viewState.load.lines[1].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="load-line-2" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[2] && viewState.load.lines[2].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          -->
          <!--
          <text data-role="heat-pump-power" x="${TEXT_POSITIONS.heatPump.x}" y="${TEXT_POSITIONS.heatPump.y}" transform="${TEXT_TRANSFORMS.heatPump}" fill="${viewState.heatPump.fill}" font-size="${viewState.heatPump.fontSize}" style="${TXT_STYLE}; display:${viewState.heatPump.visible ? 'inline' : 'none'};">${viewState.heatPump.text}</text>
          <text data-role="grid-power" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}">${viewState.grid.text}</text>

          <text data-role="grid-line-0" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${(viewState.grid.lines && viewState.grid.lines[0] && viewState.grid.lines[0].fill) || viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="grid-line-1" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${(viewState.grid.lines && viewState.grid.lines[1] && viewState.grid.lines[1].fill) || viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}; display:none;"></text>

          <text data-role="car1-label" x="${viewState.car1.label.x}" y="${viewState.car1.label.y}" transform="${viewState.car1.label.transform}" fill="${viewState.car1.label.fill}" font-size="${viewState.car1.label.fontSize}" style="${TXT_STYLE}; display:${car1Display};">${viewState.car1.label.text}</text>
          <text data-role="car1-power" x="${viewState.car1.power.x}" y="${viewState.car1.power.y}" transform="${viewState.car1.power.transform}" fill="${viewState.car1.power.fill}" font-size="${viewState.car1.power.fontSize}" style="${TXT_STYLE}; display:${car1Display};">${viewState.car1.power.text}</text>
          <text data-role="car1-soc" x="${viewState.car1.soc.x}" y="${viewState.car1.soc.y}" transform="${viewState.car1.soc.transform}" fill="${viewState.car1.soc.fill}" font-size="${viewState.car1.soc.fontSize}" style="${TXT_STYLE}; display:${car1SocDisplay};">${viewState.car1.soc.text}</text>

          <text data-role="car2-label" x="${viewState.car2.label.x}" y="${viewState.car2.label.y}" transform="${viewState.car2.label.transform}" fill="${viewState.car2.label.fill}" font-size="${viewState.car2.label.fontSize}" style="${TXT_STYLE}; display:${car2Display};">${viewState.car2.label.text}</text>
          <text data-role="car2-power" x="${viewState.car2.power.x}" y="${viewState.car2.power.y}" transform="${viewState.car2.power.transform}" fill="${viewState.car2.power.fill}" font-size="${viewState.car2.power.fontSize}" style="${TXT_STYLE}; display:${car2Display};">${viewState.car2.power.text}</text>
          <text data-role="car2-soc" x="${viewState.car2.soc.x}" y="${viewState.car2.soc.y}" transform="${viewState.car2.soc.transform}" fill="${viewState.car2.soc.fill}" font-size="${viewState.car2.soc.fontSize}" style="${TXT_STYLE}; display:${car2SocDisplay};">${viewState.car2.soc.text}</text>
          -->

          <g data-role="pv-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="pv-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="battery-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="battery-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="house-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="house-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="grid-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="grid-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="inverter-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="inverter-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

        </svg>
        <div class="title-overlay" data-role="title-overlay"></div>
        <div class="title-overlay" data-role="pv-daily-overlay"></div>
        <div class="popup-backdrop" data-role="popup-backdrop">
          <div class="popup-overlay" data-role="popup-overlay">
            <div class="popup-lines" data-role="popup-lines"></div>
          </div>
        </div>
        <div class="debug-coordinates" data-role="debug-coordinates">X: ---, Y: ---</div>
        ${echoAliveIframe}
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
      card: root.querySelector('ha-card'),
      svgRoot: root.querySelector('svg'),
      backgroundSvg: root.querySelector('[data-role="background-svg"]'),
      debugGrid: root.querySelector('[data-role="debug-grid"]'),
      debugCoords: root.querySelector('[data-role="debug-coordinates"]'),
      titleOverlay: root.querySelector('[data-role="title-overlay"]'),
      pvDailyOverlay: root.querySelector('[data-role="pv-daily-overlay"]'),
      popupBackdrop: root.querySelector('[data-role="popup-backdrop"]'),
      popupOverlay: root.querySelector('[data-role="popup-overlay"]'),
      popupLines: root.querySelector('[data-role="popup-lines"]'),
      title: root.querySelector('[data-role="title-text"]'),
      dailyYieldGroup: root.querySelector('[data-role="daily-yield-group"]'),
      dailyLabel: root.querySelector('[data-role="daily-label"]'),
      dailyValue: root.querySelector('[data-role="daily-value"]'),
      batteryLiquidGroup: root.querySelector('[data-role="battery-liquid-group"]'),
      batteryLiquidShape: root.querySelector('[data-role="battery-liquid-shape"]'),
      battery1FillLevel: root.querySelector('[data-role="battery1-fill-level"]'),
      battery2FillLevel: root.querySelector('[data-role="battery2-fill-level"]'),
      batteryFillLevel: root.querySelector('[data-role="battery-fill-level"]'),
      pvLines: Array.from({ length: MAX_PV_LINES }, (_, index) => root.querySelector(`[data-role="pv-line-${index}"]`)),
      batterySoc: root.querySelector('[data-role="battery-soc"]'),
      batteryPower: root.querySelector('[data-role="battery-power"]'),
      loadText: root.querySelector('[data-role="load-power"]'),
      loadLines: Array.from({ length: 3 }, (_, index) => root.querySelector(`[data-role="load-line-${index}"]`)),
      gridText: root.querySelector('[data-role="grid-power"]'),
      gridLines: Array.from({ length: 2 }, (_, index) => root.querySelector(`[data-role="grid-line-${index}"]`)),
      heatPumpText: root.querySelector('[data-role="heat-pump-power"]'),
      car1Label: root.querySelector('[data-role="car1-label"]'),
      car1Power: root.querySelector('[data-role="car1-power"]'),
      car1Soc: root.querySelector('[data-role="car1-soc"]'),
      car2Label: root.querySelector('[data-role="car2-label"]'),
      car2Power: root.querySelector('[data-role="car2-power"]'),
      car2Soc: root.querySelector('[data-role="car2-soc"]'),
      pvPopup: root.querySelector('[data-role="pv-popup"]'),
      pvPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="pv-popup-line-${index}"]`)),
      batteryPopup: root.querySelector('[data-role="battery-popup"]'),
      batteryPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="battery-popup-line-${index}"]`)),
      housePopup: root.querySelector('[data-role="house-popup"]'),
      housePopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="house-popup-line-${index}"]`)),
      gridPopup: root.querySelector('[data-role="grid-popup"]'),
      gridPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="grid-popup-line-${index}"]`)),
      inverterPopup: root.querySelector('[data-role="inverter-popup"]'),
      inverterPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="inverter-popup-line-${index}"]`)),
      echoAliveContainer: root.querySelector('[data-role="echo-alive-container"]'),

      windmillBlades: root.querySelector('[data-key-rotate="windmill-blades"]'),

      flows: {
        pv1: root.querySelector('[data-flow-key="pv1"]'),
        pv2: root.querySelector('[data-flow-key="pv2"]'),
        windmill: root.querySelector('[data-flow-key="windmill"]'),
        bat: root.querySelector('[data-flow-key="bat"]'),
        battery1: root.querySelector('[data-flow-key="battery1"]'),
        battery2: root.querySelector('[data-flow-key="battery2"]'),
        battery3: root.querySelector('[data-flow-key="battery3"]'),
        'inverter1-battery1': root.querySelector('[data-flow-key="inverter1-battery1"]'),
        'inverter2-battery2': root.querySelector('[data-flow-key="inverter2-battery2"]'),
        load: root.querySelector('[data-flow-key="load"]'),
        'house-load': root.querySelector('[data-flow-key="house-load"]'),
        grid: root.querySelector('[data-flow-key="grid"]'),
        grid_house: root.querySelector('[data-flow-key="grid_house"]'),
        'grid-house': root.querySelector('[data-flow-key="grid-house"]'),
        'gird-feed': root.querySelector('[data-flow-key="gird-feed"]') || root.querySelector('[data-flow-key="grid-feed"]'),
        'inverter1-import-export': root.querySelector('[data-flow-key="inverter1-import-export"]') || root.querySelector('[data-flow-key="grid-import-export"]'),
        'inverter1-grid': root.querySelector('[data-flow-key="inverter1-grid"]') || root.querySelector('[data-flow-key="inverter1-import-export"]') || root.querySelector('[data-flow-key="grid-import-export"]'),
        'inverter2-import-export': root.querySelector('[data-flow-key="inverter2-import-export"]'),
        'inverter2-grid': root.querySelector('[data-flow-key="inverter2-grid"]') || root.querySelector('[data-flow-key="inverter2-import-export"]'),
        'grid-import-export': root.querySelector('[data-flow-key="grid-import-export"]') || root.querySelector('[data-flow-key="inverter1-import-export"]'),
        car1: root.querySelector('[data-flow-key="car1"]'),
        car2: root.querySelector('[data-flow-key="car2"]'),
        heatPump: root.querySelector('[data-flow-key="heatPump"]'),
        pool: root.querySelector('[data-flow-key="pool"]')
      },
      rotateElements: []
    };

    // Cache any SVG elements marked for rotation.
    try {
      const svg = this._domRefs && this._domRefs.svgRoot ? this._domRefs.svgRoot : root.querySelector('svg');
      if (svg) {
        this._domRefs.rotateElements = Array.from(svg.querySelectorAll('[data-key-rotate]'));
      }
    } catch (e) {
      this._domRefs.rotateElements = [];
    }

    // Ensure arrow groups exist inside the loaded SVG so the "arrows" animation style can work
    if (this._domRefs && this._domRefs.flows) {
      this._ensureArrowGroups(this._domRefs.flows);
    }

    // Cache arrow groups/shapes after ensuring they exist
    this._domRefs.arrows = {
      pv1: root.querySelector('[data-arrow-key="pv1"]'),
      pv2: root.querySelector('[data-arrow-key="pv2"]'),
      bat: root.querySelector('[data-arrow-key="bat"]'),
      battery1: root.querySelector('[data-arrow-key="battery1"]'),
      battery2: root.querySelector('[data-arrow-key="battery2"]'),
      battery3: root.querySelector('[data-arrow-key="battery3"]'),
      'inverter1-battery1': root.querySelector('[data-arrow-key="inverter1-battery1"]'),
      'inverter2-battery2': root.querySelector('[data-arrow-key="inverter2-battery2"]'),
      load: root.querySelector('[data-arrow-key="load"]'),
      'house-load': root.querySelector('[data-arrow-key="house-load"]'),
      grid: root.querySelector('[data-arrow-key="grid"]'),
      grid_house: root.querySelector('[data-arrow-key="grid_house"]'),
      'grid-house': root.querySelector('[data-arrow-key="grid-house"]'),
      'gird-feed': root.querySelector('[data-arrow-key="gird-feed"]') || root.querySelector('[data-arrow-key="grid-feed"]'),
      'inverter1-import-export': root.querySelector('[data-arrow-key="inverter1-import-export"]') || root.querySelector('[data-arrow-key="grid-import-export"]'),
      'inverter1-grid': root.querySelector('[data-arrow-key="inverter1-grid"]') || root.querySelector('[data-arrow-key="inverter1-import-export"]') || root.querySelector('[data-arrow-key="grid-import-export"]'),
      'inverter2-import-export': root.querySelector('[data-arrow-key="inverter2-import-export"]'),
      'inverter2-grid': root.querySelector('[data-arrow-key="inverter2-grid"]') || root.querySelector('[data-arrow-key="inverter2-import-export"]'),
      'grid-import-export': root.querySelector('[data-arrow-key="grid-import-export"]') || root.querySelector('[data-arrow-key="inverter1-import-export"]'),
      car1: root.querySelector('[data-arrow-key="car1"]'),
      car2: root.querySelector('[data-arrow-key="car2"]'),
      heatPump: root.querySelector('[data-arrow-key="heatPump"]')
    };
    this._domRefs.arrowShapes = {
      pv1: Array.from(root.querySelectorAll('[data-arrow-shape="pv1"]')),
      pv2: Array.from(root.querySelectorAll('[data-arrow-shape="pv2"]')),
      bat: Array.from(root.querySelectorAll('[data-arrow-shape="bat"]')),
      battery1: Array.from(root.querySelectorAll('[data-arrow-shape="battery1"]')),
      battery2: Array.from(root.querySelectorAll('[data-arrow-shape="battery2"]')),
      battery3: Array.from(root.querySelectorAll('[data-arrow-shape="battery3"]')),
      'inverter1-battery1': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-battery1"]')),
      'inverter2-battery2': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-battery2"]')),
      load: Array.from(root.querySelectorAll('[data-arrow-shape="load"]')),
      'house-load': Array.from(root.querySelectorAll('[data-arrow-shape="house-load"]')),
      grid: Array.from(root.querySelectorAll('[data-arrow-shape="grid"]')),
      grid_house: Array.from(root.querySelectorAll('[data-arrow-shape="grid_house"]')),
      'grid-house': Array.from(root.querySelectorAll('[data-arrow-shape="grid-house"]')),
      'gird-feed': Array.from(root.querySelectorAll('[data-arrow-shape="gird-feed"], [data-arrow-shape="grid-feed"]')),
      'inverter1-import-export': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-import-export"], [data-arrow-shape="grid-import-export"]')),
      'inverter1-grid': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-grid"], [data-arrow-shape="inverter1-import-export"], [data-arrow-shape="grid-import-export"]')),
      'inverter2-import-export': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-import-export"]')),
      'inverter2-grid': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-grid"], [data-arrow-shape="inverter2-import-export"]')),
      'grid-import-export': Array.from(root.querySelectorAll('[data-arrow-shape="grid-import-export"], [data-arrow-shape="inverter1-import-export"]')),
      car1: Array.from(root.querySelectorAll('[data-arrow-shape="car1"]')),
      car2: Array.from(root.querySelectorAll('[data-arrow-shape="car2"]')),
      heatPump: Array.from(root.querySelectorAll('[data-arrow-shape="heatPump"]'))
    };
    this._domRefs.headlights = {
      car1: Array.from(root.querySelectorAll('[data-feature~="car1-headlights"]')),
      car2: Array.from(root.querySelectorAll('[data-feature~="car2-headlights"]'))
    };

    this._logHeadlightDebug('cached headlight nodes', {
      car1Count: (this._domRefs.headlights.car1 || []).length,
      car2Count: (this._domRefs.headlights.car2 || []).length
    });

    if (this._domRefs && this._domRefs.flows) {
      Object.entries(this._domRefs.flows).forEach(([key, element]) => {
        const geometry = this._getFlowGeometryPaths(element);
        if (!geometry || geometry.length === 0) {
          return;
        }
        try {
          // For multi-path flows, store the total length (used for rough normalization)
          const total = geometry.reduce((acc, path) => {
            if (path && typeof path.getTotalLength === 'function') {
              return acc + path.getTotalLength();
            }
            return acc;
          }, 0);
          this._flowPathLengths.set(key, total);
        } catch (err) {
          console.warn('Lumina Energy Card: unable to compute path length', key, err);
        }
      });
    }

    // Log SVG structure for debugging
    this._logSvgStructure();
  }

  _getFlowGeometryPaths(element) {
    if (!element) {
      return [];
    }
    if (typeof element.getTotalLength === 'function') {
      return [element];
    }
    if (element.tagName === 'g') {
      return Array.from(element.querySelectorAll('path')).filter((p) => typeof p.getTotalLength === 'function');
    }
    return [];
  }

  _ensureFluidFlowOverlay(flowKey, element) {
    if (!flowKey || !element) {
      return { group: null, paths: [] };
    }
    const ns = 'http://www.w3.org/2000/svg';
    const container = element.tagName === 'g' ? element : element.parentNode;
    if (!container || typeof container.querySelector !== 'function') {
      return { group: null, paths: [] };
    }

    const key = String(flowKey);
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    let group = null;
    try {
      group = container.querySelector(`[data-fluid-flow-overlay="${escapeFn(key)}"]`);
    } catch (e) {
      group = container.querySelector(`[data-fluid-flow-overlay="${key}"]`);
    }

    if (!group) {
      group = document.createElementNS(ns, 'g');
      group.setAttribute('data-fluid-flow-overlay', key);
      group.style.pointerEvents = 'none';
      group.style.opacity = '0';

      const geometry = this._getFlowGeometryPaths(element);
      geometry.forEach((path, index) => {
        try {
          const makeClone = (layer) => {
            const clone = path.cloneNode(true);
            clone.removeAttribute('id');
            clone.removeAttribute('class');
            clone.removeAttribute('data-flow-key');
            clone.removeAttribute('data-arrow-key');
            clone.removeAttribute('data-arrow-shape');
            clone.setAttribute('data-fluid-path', String(index));
            clone.setAttribute('data-fluid-layer', layer);
            clone.setAttribute('fill', 'none');
            return clone;
          };

          // 3-layer highlight (cyan haze + cyan core + white heart)
          group.appendChild(makeClone('outer'));
          group.appendChild(makeClone('mid'));
          group.appendChild(makeClone('inner'));
        } catch (err) {
          // ignore
        }
      });

      container.appendChild(group);
    }

    return { group, paths: Array.from(group.querySelectorAll('path')) };
  }

  _removeFluidFlowOverlay(flowKey, element) {
    if (!flowKey || !element) {
      return;
    }
    const container = element.tagName === 'g' ? element : element.parentNode;
    if (!container || typeof container.querySelector !== 'function') {
      return;
    }
    const key = String(flowKey);
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    let group = null;
    try {
      group = container.querySelector(`[data-fluid-flow-overlay="${escapeFn(key)}"]`);
    } catch (e) {
      group = container.querySelector(`[data-fluid-flow-overlay="${key}"]`);
    }
    if (group && typeof group.remove === 'function') {
      group.remove();
    } else if (group && group.parentNode) {
      group.parentNode.removeChild(group);
    }
  }

  _ensureFluidFlowMask(flowKey, element, dasharray, maskStrokeWidthPx) {
    if (!flowKey || !element) {
      return { maskId: null, paths: [] };
    }
    const svgRoot = element.ownerSVGElement || null;
    if (!svgRoot || typeof svgRoot.querySelector !== 'function') {
      if (this._debugFluidFlow) {
        try {
          console.warn('[lumina][fluid_flow] No ownerSVGElement for mask', { flowKey });
        } catch (e) {
          // ignore
        }
      }
      return { maskId: null, paths: [] };
    }
    const ns = 'http://www.w3.org/2000/svg';
    const key = String(flowKey).replace(/[^a-z0-9_-]/gi, '_');
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    const defs = (() => {
      let d = svgRoot.querySelector('defs');
      if (!d) {
        d = document.createElementNS(ns, 'defs');
        svgRoot.insertBefore(d, svgRoot.firstChild);
      }
      return d;
    })();

    const filterId = `lumina-fluid-mask-blur-${key}`;
    let filterEl = null;
    try {
      filterEl = defs.querySelector(`#${escapeFn(filterId)}`);
    } catch (e) {
      filterEl = defs.querySelector(`#${filterId}`);
    }
    if (!filterEl) {
      filterEl = document.createElementNS(ns, 'filter');
      filterEl.setAttribute('id', filterId);
      filterEl.setAttribute('x', '-50%');
      filterEl.setAttribute('y', '-50%');
      filterEl.setAttribute('width', '200%');
      filterEl.setAttribute('height', '200%');
      filterEl.setAttribute('color-interpolation-filters', 'sRGB');
      const blur = document.createElementNS(ns, 'feGaussianBlur');
      // Soft edges for the pulse ("ease in/out").
      blur.setAttribute('stdDeviation', '8');
      filterEl.appendChild(blur);
      defs.appendChild(filterEl);
    }

    const maskId = `lumina-fluid-mask-${key}`;
    let maskEl = null;
    try {
      maskEl = defs.querySelector(`#${escapeFn(maskId)}`);
    } catch (e) {
      maskEl = defs.querySelector(`#${maskId}`);
    }

    const resolvedDash = dasharray || '12 18';
    const resolvedWidth = Number.isFinite(Number(maskStrokeWidthPx)) ? Number(maskStrokeWidthPx) : 8;

    // If the mask exists from an older version (single window), rebuild it to add a
    // second phase-shifted window which makes the pulse feel continuous.
    try {
      if (maskEl) {
        const geometry = this._getFlowGeometryPaths(element);
        const desired = (geometry && geometry.length) ? geometry.length * 2 : 0;
        const existing = maskEl.querySelectorAll('[data-fluid-mask-path]');
        if (desired && existing && existing.length && existing.length < desired) {
          if (typeof maskEl.remove === 'function') {
            maskEl.remove();
          } else if (maskEl.parentNode) {
            maskEl.parentNode.removeChild(maskEl);
          }
          maskEl = null;
        }
      }
    } catch (e) {
      // ignore
    }
    if (!maskEl) {
      maskEl = document.createElementNS(ns, 'mask');
      maskEl.setAttribute('id', maskId);
      maskEl.setAttribute('maskUnits', 'userSpaceOnUse');
      maskEl.setAttribute('maskContentUnits', 'userSpaceOnUse');

      const g = document.createElementNS(ns, 'g');
      g.setAttribute('data-fluid-mask-group', key);
      g.setAttribute('filter', `url(#${filterId})`);

      const geometry = this._getFlowGeometryPaths(element);
      geometry.forEach((path, index) => {
        try {
          const makeClone = (shift) => {
            const clone = path.cloneNode(true);
            clone.removeAttribute('id');
            clone.removeAttribute('class');
            clone.removeAttribute('data-flow-key');
            clone.removeAttribute('data-arrow-key');
            clone.removeAttribute('data-arrow-shape');
            clone.setAttribute('data-fluid-mask-path', String(index));
            clone.setAttribute('data-fluid-mask-shift', String(shift));
            clone.setAttribute('fill', 'none');
            clone.style.stroke = '#ffffff';
            clone.style.strokeOpacity = '1';
            clone.style.strokeWidth = `${resolvedWidth}px`;
            clone.style.strokeLinecap = 'round';
            clone.style.strokeLinejoin = 'round';
            clone.style.strokeDasharray = resolvedDash;
            clone.style.strokeDashoffset = '0';
            return clone;
          };

          // Two windows, half-cycle apart.
          g.appendChild(makeClone(0));
          g.appendChild(makeClone(0.5));
        } catch (err) {
          // ignore
        }
      });

      maskEl.appendChild(g);
      defs.appendChild(maskEl);

      if (this._debugFluidFlow) {
        try {
          const createdCount = maskEl.querySelectorAll('[data-fluid-mask-path]').length;
          console.debug('[lumina][fluid_flow] Created mask', {
            flowKey,
            maskId,
            filterId,
            dasharray: resolvedDash,
            maskStrokeWidthPx: resolvedWidth,
            maskPaths: createdCount
          });
        } catch (e) {
          // ignore
        }
      }
    }

    const maskPaths = Array.from(maskEl.querySelectorAll('[data-fluid-mask-path]'));
    // Keep dasharray + width in sync if config changes (mask may already exist).
    maskPaths.forEach((p) => {
      try {
        p.style.strokeDasharray = resolvedDash;
        p.style.strokeWidth = `${resolvedWidth}px`;
      } catch (e) {
        // ignore
      }
    });

    if (this._debugFluidFlow) {
      try {
        console.debug('[lumina][fluid_flow] Mask ready', {
          flowKey,
          maskId,
          dasharray: resolvedDash,
          maskStrokeWidthPx: resolvedWidth,
          maskPaths: maskPaths.length
        });
      } catch (e) {
        // ignore
      }
    }
    return { maskId, paths: maskPaths };
  }

  _removeFluidFlowMask(flowKey, element) {
    if (!flowKey || !element) {
      return;
    }
    const svgRoot = element.ownerSVGElement || null;
    if (!svgRoot || typeof svgRoot.querySelector !== 'function') {
      return;
    }
    const defs = svgRoot.querySelector('defs');
    if (!defs) {
      return;
    }
    const key = String(flowKey).replace(/[^a-z0-9_-]/gi, '_');
    const escapeFn = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (v) => v;
    const maskId = `lumina-fluid-mask-${key}`;
    let maskEl = null;
    try {
      maskEl = defs.querySelector(`#${escapeFn(maskId)}`);
    } catch (e) {
      maskEl = defs.querySelector(`#${maskId}`);
    }
    if (maskEl && typeof maskEl.remove === 'function') {
      maskEl.remove();
    } else if (maskEl && maskEl.parentNode) {
      maskEl.parentNode.removeChild(maskEl);
    }
    const filterId = `lumina-fluid-mask-blur-${key}`;
    let filterEl = null;
    try {
      filterEl = defs.querySelector(`#${escapeFn(filterId)}`);
    } catch (e) {
      filterEl = defs.querySelector(`#${filterId}`);
    }
    if (filterEl && typeof filterEl.remove === 'function') {
      filterEl.remove();
    } else if (filterEl && filterEl.parentNode) {
      filterEl.parentNode.removeChild(filterEl);
    }
  }

  _ensureArrowGroups(flows) {
    if (!this.shadowRoot || !flows) {
      return;
    }
    const svgRoot = this.shadowRoot.querySelector('svg');
    if (!svgRoot) {
      return;
    }
    const ns = 'http://www.w3.org/2000/svg';

    Object.entries(flows).forEach(([flowKey, element]) => {
      if (!element) {
        return;
      }

      const container = element.tagName === 'g' ? element : element.parentNode;
      if (!container || typeof container.querySelector !== 'function') {
        return;
      }

      // If already present, do nothing
      if (container.querySelector(`[data-arrow-key="${flowKey}"]`)) {
        return;
      }

      const paths = this._getFlowGeometryPaths(element);
      if (!paths || paths.length === 0) {
        return;
      }

      const arrowGroup = document.createElementNS(ns, 'g');
      arrowGroup.setAttribute('class', 'flow-arrow');
      arrowGroup.setAttribute('data-arrow-key', flowKey);
      arrowGroup.style.opacity = '0';

      paths.forEach((path, trackIndex) => {
        for (let i = 0; i < FLOW_ARROW_COUNT; i++) {
          const poly = document.createElementNS(ns, 'polygon');
          poly.setAttribute('data-arrow-shape', flowKey);
          poly.setAttribute('data-arrow-index', String(i));
          poly.setAttribute('data-arrow-track', String(trackIndex));
          poly.setAttribute('points', '-8,-3 0,0 -8,3');
          poly.setAttribute('fill', '#00FFFF');
          arrowGroup.appendChild(poly);
        }
      });

      container.appendChild(arrowGroup);
    });
  }

  _logSvgStructure() {
    if (!this._domRefs || !this._domRefs.svgRoot) {
      return;
    }

    const svg = this._domRefs.svgRoot;
    // console.log('=== SVG Structure Analysis ===');

    // Log all groups with data attributes
    // console.log('📁 SVG Groups (<g> elements):');
    const groups = svg.querySelectorAll('g');
    groups.forEach((group, index) => {
      const dataLayer = group.getAttribute('data-layer') || 'none';
      const dataRole = group.getAttribute('data-role') || 'none';
      const id = group.getAttribute('id') || 'none';
      const className = group.getAttribute('class') || 'none';
      // console.log(`  ${index + 1}. <g> id="${id}" class="${className}" data-layer="${dataLayer}" data-role="${dataRole}"`);
    });

    // Log all elements with data-layer attributes
    // console.log('🏷️  Data Layer Elements:');
    const layerElements = svg.querySelectorAll('[data-layer]');
    layerElements.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const dataLayer = element.getAttribute('data-layer');
      const dataRole = element.getAttribute('data-role') || 'none';
      // console.log(`  ${index + 1}. <${tagName}> data-layer="${dataLayer}" data-role="${dataRole}"`);
    });

    // Log all elements with data-role attributes
    // console.log('🎭 Data Role Elements:');
    const roleElements = svg.querySelectorAll('[data-role]');
    roleElements.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const dataRole = element.getAttribute('data-role');
      const dataLayer = element.getAttribute('data-layer') || 'none';
      // console.log(`  ${index + 1}. <${tagName}> data-role="${dataRole}" data-layer="${dataLayer}"`);
    });

    // Log all elements with data-flow-key attributes
    // console.log('🌊 Flow Elements:');
    const flowElements = svg.querySelectorAll('[data-flow-key]');
    flowElements.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const flowKey = element.getAttribute('data-flow-key');
      // console.log(`  ${index + 1}. <${tagName}> data-flow-key="${flowKey}"`);
    });

    // Log all elements with data-arrow-shape attributes
    // console.log('➡️  Arrow Shape Elements:');
    const arrowElements = svg.querySelectorAll('[data-arrow-shape]');
    arrowElements.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase();
      const arrowShape = element.getAttribute('data-arrow-shape');
      // console.log(`  ${index + 1}. <${tagName}> data-arrow-shape="${arrowShape}"`);
    });

    // Log all SVG shapes (rect, circle, polygon, path)
    // console.log('🎨 SVG Shapes:');
    const shapes = svg.querySelectorAll('rect, circle, polygon, path, ellipse, line');
    shapes.forEach((shape, index) => {
      const tagName = shape.tagName.toLowerCase();
      const dataRole = shape.getAttribute('data-role') || 'none';
      const dataLayer = shape.getAttribute('data-layer') || 'none';
      const id = shape.getAttribute('id') || 'none';
      // console.log(`  ${index + 1}. <${tagName}> id="${id}" data-role="${dataRole}" data-layer="${dataLayer}"`);
    });

    // Log all text elements
    // console.log('📝 Text Elements:');
    const textElements = svg.querySelectorAll('text, tspan');
    textElements.forEach((text, index) => {
      const tagName = text.tagName.toLowerCase();
      const dataRole = text.getAttribute('data-role') || 'none';
      const dataLayer = text.getAttribute('data-layer') || 'none';
      // console.log(`  ${index + 1}. <${tagName}> data-role="${dataRole}" data-layer="${dataLayer}"`);
    });

    // console.log('=== End SVG Structure Analysis ===');

    // Log layer configuration for reference
    // console.log('=== Layer Configuration Reference ===');
    SVG_LAYER_CONFIG.forEach((layer, index) => {
      // console.log(`${index + 1}. "${layer.layerName}" → ${layer.svgSelector} (${layer.condition ? 'conditional' : 'config-based'})`);
    });
    // console.log('=== End Layer Configuration Reference ===');
  }

  _togglePvPopup() {
    if (!this._domRefs || !this._domRefs.pvPopup) return;
    if (this._pvUiEnabled === false) return;
    
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
    
    const popupPvSensorIds = [
      config.sensor_popup_pv_1,
      config.sensor_popup_pv_2,
      config.sensor_popup_pv_3,
      config.sensor_popup_pv_4,
      config.sensor_popup_pv_5,
      config.sensor_popup_pv_6
    ];
    const popupPvValues = popupPvSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));

    const popupPvNames = [
      config.sensor_popup_pv_1_name && config.sensor_popup_pv_1_name.trim() ? config.sensor_popup_pv_1_name.trim() : this.getEntityName(config.sensor_popup_pv_1),
      config.sensor_popup_pv_2_name && config.sensor_popup_pv_2_name.trim() ? config.sensor_popup_pv_2_name.trim() : this.getEntityName(config.sensor_popup_pv_2),
      config.sensor_popup_pv_3_name && config.sensor_popup_pv_3_name.trim() ? config.sensor_popup_pv_3_name.trim() : this.getEntityName(config.sensor_popup_pv_3),
      config.sensor_popup_pv_4_name && config.sensor_popup_pv_4_name.trim() ? config.sensor_popup_pv_4_name.trim() : this.getEntityName(config.sensor_popup_pv_4),
      config.sensor_popup_pv_5_name && config.sensor_popup_pv_5_name.trim() ? config.sensor_popup_pv_5_name.trim() : this.getEntityName(config.sensor_popup_pv_5),
      config.sensor_popup_pv_6_name && config.sensor_popup_pv_6_name.trim() ? config.sensor_popup_pv_6_name.trim() : this.getEntityName(config.sensor_popup_pv_6)
    ];

    const lines = popupPvValues
      .map((valueText, i) => (valueText ? `${popupPvNames[i]}: ${valueText}` : ''))
      .filter((line) => line);
    if (!lines.length) return;
    
    // Calculate popup dimensions based on content
    // Find the maximum font size used in the popup for width and height calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_pv_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // Calculate line height based on font size (font-size + 1px padding for readability)
    const lineHeight = maxFontSize + 1;
    
    // Measure actual text width for accurate sizing
    let maxTextWidth = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${maxFontSize}px Arial, sans-serif`;
    
    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width;
      maxTextWidth = Math.max(maxTextWidth, textWidth);
    });
    
    const contentWidth = Math.max(200, Math.min(500, maxTextWidth));
    const popupWidth = contentWidth + 40; // 40px padding as requested
    
    // Calculate height based on content: top padding + lines + bottom padding
    const topPadding = 20;
    const bottomPadding = 20;
    const contentHeight = lines.length * lineHeight;
    const popupHeight = topPadding + contentHeight + bottomPadding;
    
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically
    
    // Update popup rectangle
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
    
    // Update text positions and styling
    const lineElements = this._domRefs.pvPopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + topPadding + (index * lineHeight) + (lineHeight / 2));
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
    const popupBatSensorIds = [
      config.sensor_popup_bat_1,
      config.sensor_popup_bat_2,
      config.sensor_popup_bat_3,
      config.sensor_popup_bat_4,
      config.sensor_popup_bat_5,
      config.sensor_popup_bat_6
    ];
    const popupBatValues = popupBatSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));

    const popupBatNames = [
      config.sensor_popup_bat_1_name && config.sensor_popup_bat_1_name.trim() ? config.sensor_popup_bat_1_name.trim() : this.getEntityName(config.sensor_popup_bat_1),
      config.sensor_popup_bat_2_name && config.sensor_popup_bat_2_name.trim() ? config.sensor_popup_bat_2_name.trim() : this.getEntityName(config.sensor_popup_bat_2),
      config.sensor_popup_bat_3_name && config.sensor_popup_bat_3_name.trim() ? config.sensor_popup_bat_3_name.trim() : this.getEntityName(config.sensor_popup_bat_3),
      config.sensor_popup_bat_4_name && config.sensor_popup_bat_4_name.trim() ? config.sensor_popup_bat_4_name.trim() : this.getEntityName(config.sensor_popup_bat_4),
      config.sensor_popup_bat_5_name && config.sensor_popup_bat_5_name.trim() ? config.sensor_popup_bat_5_name.trim() : this.getEntityName(config.sensor_popup_bat_5),
      config.sensor_popup_bat_6_name && config.sensor_popup_bat_6_name.trim() ? config.sensor_popup_bat_6_name.trim() : this.getEntityName(config.sensor_popup_bat_6)
    ];

    const lines = popupBatValues
      .map((valueText, i) => (valueText ? `${popupBatNames[i]}: ${valueText}` : ''))
      .filter((line) => line);
    if (!lines.length) return;

    // Calculate popup dimensions based on content
    // Find the maximum font size used in the popup for width and height calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_bat_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // Calculate line height based on font size (font-size + 1px padding for readability)
    const lineHeight = maxFontSize + 1;
    
    // Measure actual text width for accurate sizing
    let maxTextWidth = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${maxFontSize}px Arial, sans-serif`;
    
    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width;
      maxTextWidth = Math.max(maxTextWidth, textWidth);
    });
    
    const contentWidth = Math.max(200, Math.min(500, maxTextWidth));
    const popupWidth = contentWidth + 40; // 40px padding as requested
    
    // Calculate height based on content: top padding + lines + bottom padding
    const topPadding = 20;
    const bottomPadding = 20;
    const contentHeight = lines.length * lineHeight;
    const popupHeight = topPadding + contentHeight + bottomPadding;
    
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically

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

    // Update text positions and styling
    const lineElements = this._domRefs.batteryPopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + topPadding + (index * lineHeight) + (lineHeight / 2));
        element.textContent = line;
        element.style.display = 'inline';
        
        // Apply font size
        const fontSizeKey = `sensor_popup_bat_${index + 1}_font_size`;
        const fontSize = config[fontSizeKey] || 16;
        element.setAttribute('font-size', fontSize);
        
        // Apply color
        const colorKey = `sensor_popup_bat_${index + 1}_color`;
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
    const popupHouseSensorIds = [
      config.sensor_popup_house_1,
      config.sensor_popup_house_2,
      config.sensor_popup_house_3,
      config.sensor_popup_house_4,
      config.sensor_popup_house_5,
      config.sensor_popup_house_6
    ];
    const popupHouseValues = popupHouseSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));
    
    const popupHouseNames = [
      config.sensor_popup_house_1_name && config.sensor_popup_house_1_name.trim() ? config.sensor_popup_house_1_name.trim() : this.getEntityName(config.sensor_popup_house_1),
      config.sensor_popup_house_2_name && config.sensor_popup_house_2_name.trim() ? config.sensor_popup_house_2_name.trim() : this.getEntityName(config.sensor_popup_house_2),
      config.sensor_popup_house_3_name && config.sensor_popup_house_3_name.trim() ? config.sensor_popup_house_3_name.trim() : this.getEntityName(config.sensor_popup_house_3),
      config.sensor_popup_house_4_name && config.sensor_popup_house_4_name.trim() ? config.sensor_popup_house_4_name.trim() : this.getEntityName(config.sensor_popup_house_4),
      config.sensor_popup_house_5_name && config.sensor_popup_house_5_name.trim() ? config.sensor_popup_house_5_name.trim() : this.getEntityName(config.sensor_popup_house_5),
      config.sensor_popup_house_6_name && config.sensor_popup_house_6_name.trim() ? config.sensor_popup_house_6_name.trim() : this.getEntityName(config.sensor_popup_house_6)
    ];
    
    const lines = popupHouseValues
      .map((valueText, i) => (valueText ? `${popupHouseNames[i]}: ${valueText}` : ''))
      .filter((line) => line);
    if (!lines.length) return;
    
    // Calculate popup dimensions based on content
    // Find the maximum font size used in the popup for width and height calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_house_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // Calculate line height based on font size (font-size + 1px padding for readability)
    const lineHeight = maxFontSize + 1;
    
    // Measure actual text width for accurate sizing
    let maxTextWidth = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${maxFontSize}px Arial, sans-serif`;
    
    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width;
      maxTextWidth = Math.max(maxTextWidth, textWidth);
    });
    
    const contentWidth = Math.max(200, Math.min(500, maxTextWidth));
    const popupWidth = contentWidth + 40; // 40px padding as requested
    
    // Calculate height based on content: top padding + lines + bottom padding
    const topPadding = 20;
    const bottomPadding = 20;
    const contentHeight = lines.length * lineHeight;
    const popupHeight = topPadding + contentHeight + bottomPadding;
    
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically
    
    // Update popup rectangle
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
    
    // Update text positions and styling
    const lineElements = this._domRefs.housePopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element && line) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + topPadding + (index * lineHeight) + (lineHeight / 2));
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

  _toggleGridPopup() {
    if (!this._domRefs || !this._domRefs.gridPopup) return;
    
    // Check if popup has any content by checking if any grid entities are configured
    const config = this._config || this.config || {};
    if (!config) return;
    const hasContent = (config.sensor_popup_grid_1 && config.sensor_popup_grid_1.trim()) || 
                      (config.sensor_popup_grid_2 && config.sensor_popup_grid_2.trim()) || 
                      (config.sensor_popup_grid_3 && config.sensor_popup_grid_3.trim()) || 
                      (config.sensor_popup_grid_4 && config.sensor_popup_grid_4.trim()) || 
                      (config.sensor_popup_grid_5 && config.sensor_popup_grid_5.trim()) || 
                      (config.sensor_popup_grid_6 && config.sensor_popup_grid_6.trim());
    if (!hasContent) return;
    
    const popup = this._domRefs.gridPopup;
    const isVisible = popup.style.display !== 'none';
    if (isVisible) {
      this._hideGridPopup();
    } else {
      this._closeOtherPopups('grid');
      this._showGridPopup();
    }
  }

  async _showGridPopup() {
    if (!this._domRefs || !this._domRefs.gridPopup) return;
    const popup = this._domRefs.gridPopup;
    
    // Calculate popup content
    const config = this._config || this.config || {};
    
    const popupGridSensorIds = [
      config.sensor_popup_grid_1,
      config.sensor_popup_grid_2,
      config.sensor_popup_grid_3,
      config.sensor_popup_grid_4,
      config.sensor_popup_grid_5,
      config.sensor_popup_grid_6
    ];
    const popupGridValues = popupGridSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));

    const popupGridNames = [
      config.sensor_popup_grid_1_name && config.sensor_popup_grid_1_name.trim() ? config.sensor_popup_grid_1_name.trim() : this.getEntityName(config.sensor_popup_grid_1),
      config.sensor_popup_grid_2_name && config.sensor_popup_grid_2_name.trim() ? config.sensor_popup_grid_2_name.trim() : this.getEntityName(config.sensor_popup_grid_2),
      config.sensor_popup_grid_3_name && config.sensor_popup_grid_3_name.trim() ? config.sensor_popup_grid_3_name.trim() : this.getEntityName(config.sensor_popup_grid_3),
      config.sensor_popup_grid_4_name && config.sensor_popup_grid_4_name.trim() ? config.sensor_popup_grid_4_name.trim() : this.getEntityName(config.sensor_popup_grid_4),
      config.sensor_popup_grid_5_name && config.sensor_popup_grid_5_name.trim() ? config.sensor_popup_grid_5_name.trim() : this.getEntityName(config.sensor_popup_grid_5),
      config.sensor_popup_grid_6_name && config.sensor_popup_grid_6_name.trim() ? config.sensor_popup_grid_6_name.trim() : this.getEntityName(config.sensor_popup_grid_6)
    ];

    const lines = popupGridValues
      .map((valueText, i) => (valueText ? `${popupGridNames[i]}: ${valueText}` : ''))
      .filter((line) => line);
    if (!lines.length) return;
    
    // Calculate popup dimensions based on content
    // Find the maximum font size used in the popup for width and height calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_grid_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // Calculate line height based on font size (font-size + 1px padding for readability)
    const lineHeight = maxFontSize + 1;
    
    // Measure actual text width for accurate sizing
    let maxTextWidth = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${maxFontSize}px Arial, sans-serif`;
    
    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width;
      maxTextWidth = Math.max(maxTextWidth, textWidth);
    });
    
    const contentWidth = Math.max(200, Math.min(500, maxTextWidth));
    const popupWidth = contentWidth + 40; // 40px padding as requested
    
    // Calculate height based on content: top padding + lines + bottom padding
    const topPadding = 20;
    const bottomPadding = 20;
    const contentHeight = lines.length * lineHeight;
    const popupHeight = topPadding + contentHeight + bottomPadding;
    
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically
    
    // Update popup rectangle
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
    
    // Update text positions and styling
    const lineElements = this._domRefs.gridPopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + topPadding + (index * lineHeight) + (lineHeight / 2));
        element.textContent = line;
        element.style.display = 'inline';
        
        // Apply font size
        const fontSizeKey = `sensor_popup_grid_${index + 1}_font_size`;
        const fontSize = config[fontSizeKey] || 16;
        element.setAttribute('font-size', fontSize);
        
        // Apply color
        const colorKey = `sensor_popup_grid_${index + 1}_color`;
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
    this._activePopup = 'grid';
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.fromTo(popup, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }
  }

  async _hideGridPopup() {
    if (!this._domRefs || !this._domRefs.gridPopup) return;
    const popup = this._domRefs.gridPopup;
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.to(popup, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in', onComplete: () => {
        popup.style.display = 'none';
        if (this._activePopup === 'grid') this._activePopup = null;
      }});
    } else {
      popup.style.display = 'none';
      if (this._activePopup === 'grid') this._activePopup = null;
    }
  }

  _toggleInverterPopup() {
    if (!this._domRefs || !this._domRefs.inverterPopup) return;
    
    // Check if popup has any content by checking if any inverter entities are configured
    const config = this._config || this.config || {};
    if (!config) return;
    const hasContent = (config.sensor_popup_inverter_1 && config.sensor_popup_inverter_1.trim()) || 
                      (config.sensor_popup_inverter_2 && config.sensor_popup_inverter_2.trim()) || 
                      (config.sensor_popup_inverter_3 && config.sensor_popup_inverter_3.trim()) || 
                      (config.sensor_popup_inverter_4 && config.sensor_popup_inverter_4.trim()) || 
                      (config.sensor_popup_inverter_5 && config.sensor_popup_inverter_5.trim()) || 
                      (config.sensor_popup_inverter_6 && config.sensor_popup_inverter_6.trim());
    if (!hasContent) return;
    
    const popup = this._domRefs.inverterPopup;
    const isVisible = popup.style.display !== 'none';
    if (isVisible) {
      this._hideInverterPopup();
    } else {
      this._closeOtherPopups('inverter');
      this._showInverterPopup();
    }
  }

  async _showInverterPopup() {
    if (!this._domRefs || !this._domRefs.inverterPopup) return;
    const popup = this._domRefs.inverterPopup;
    
    // Calculate popup content
    const config = this._config || this.config || {};
    
    const popupInverterSensorIds = [
      config.sensor_popup_inverter_1,
      config.sensor_popup_inverter_2,
      config.sensor_popup_inverter_3,
      config.sensor_popup_inverter_4,
      config.sensor_popup_inverter_5,
      config.sensor_popup_inverter_6
    ];
    const popupInverterValues = popupInverterSensorIds.map((sensorId) => this.formatPopupValue(null, sensorId));

    const popupInverterNames = [
      config.sensor_popup_inverter_1_name && config.sensor_popup_inverter_1_name.trim() ? config.sensor_popup_inverter_1_name.trim() : this.getEntityName(config.sensor_popup_inverter_1),
      config.sensor_popup_inverter_2_name && config.sensor_popup_inverter_2_name.trim() ? config.sensor_popup_inverter_2_name.trim() : this.getEntityName(config.sensor_popup_inverter_2),
      config.sensor_popup_inverter_3_name && config.sensor_popup_inverter_3_name.trim() ? config.sensor_popup_inverter_3_name.trim() : this.getEntityName(config.sensor_popup_inverter_3),
      config.sensor_popup_inverter_4_name && config.sensor_popup_inverter_4_name.trim() ? config.sensor_popup_inverter_4_name.trim() : this.getEntityName(config.sensor_popup_inverter_4),
      config.sensor_popup_inverter_5_name && config.sensor_popup_inverter_5_name.trim() ? config.sensor_popup_inverter_5_name.trim() : this.getEntityName(config.sensor_popup_inverter_5),
      config.sensor_popup_inverter_6_name && config.sensor_popup_inverter_6_name.trim() ? config.sensor_popup_inverter_6_name.trim() : this.getEntityName(config.sensor_popup_inverter_6)
    ];

    const lines = popupInverterValues
      .map((valueText, i) => (valueText ? `${popupInverterNames[i]}: ${valueText}` : ''))
      .filter((line) => line);
    if (!lines.length) return;
    
    // Calculate popup dimensions based on content
    // Find the maximum font size used in the popup for width and height calculation
    const maxFontSize = Math.max(...lines.map((_, index) => {
      const fontSizeKey = `sensor_popup_inverter_${index + 1}_font_size`;
      return config[fontSizeKey] || 16;
    }));
    
    // Calculate line height based on font size (font-size + 1px padding for readability)
    const lineHeight = maxFontSize + 1;
    
    // Measure actual text width for accurate sizing
    let maxTextWidth = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${maxFontSize}px Arial, sans-serif`;
    
    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width;
      maxTextWidth = Math.max(maxTextWidth, textWidth);
    });
    
    const contentWidth = Math.max(200, Math.min(500, maxTextWidth));
    const popupWidth = contentWidth + 40; // 40px padding as requested
    
    // Calculate height based on content: top padding + lines + bottom padding
    const topPadding = 20;
    const bottomPadding = 20;
    const contentHeight = lines.length * lineHeight;
    const popupHeight = topPadding + contentHeight + bottomPadding;
    
    const popupX = (800 - popupWidth) / 2; // Center horizontally
    const popupY = (450 - popupHeight) / 2; // Center vertically
    
    // Update popup rectangle
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
    
    // Update text positions and styling
    const lineElements = this._domRefs.inverterPopupLines || [];
    lines.forEach((line, index) => {
      const element = lineElements[index];
      if (element) {
        element.setAttribute('x', popupX + popupWidth / 2);
        element.setAttribute('y', popupY + topPadding + (index * lineHeight) + (lineHeight / 2));
        element.textContent = line;
        element.style.display = 'inline';
        
        // Apply font size
        const fontSizeKey = `sensor_popup_inverter_${index + 1}_font_size`;
        const fontSize = config[fontSizeKey] || 16;
        element.setAttribute('font-size', fontSize);
        
        // Apply color
        const colorKey = `sensor_popup_inverter_${index + 1}_color`;
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
    this._activePopup = 'inverter';
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.fromTo(popup, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }
  }

  async _hideInverterPopup() {
    if (!this._domRefs || !this._domRefs.inverterPopup) return;
    const popup = this._domRefs.inverterPopup;
    const gsap = await this._ensureGsap();
    if (gsap) {
      gsap.to(popup, { opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in', onComplete: () => {
        popup.style.display = 'none';
        if (this._activePopup === 'inverter') this._activePopup = null;
      }});
    } else {
      popup.style.display = 'none';
      if (this._activePopup === 'inverter') this._activePopup = null;
    }
  }

  _closeOtherPopups(except) {
    if (except !== 'pv') this._hidePvPopup();
    if (except !== 'battery') this._hideBatteryPopup();
    if (except !== 'house') this._hideHousePopup();
    if (except !== 'grid') this._hideGridPopup();
    if (except !== 'inverter') this._hideInverterPopup();
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

    if (refs.backgroundSvg && prev.backgroundImage !== viewState.backgroundImage) {
      // Fetch and insert SVG content for dynamic layer control
      const resolveBackgroundUrl = (rawUrl) => {
        const value = (rawUrl === null || rawUrl === undefined) ? '' : String(rawUrl).trim();
        if (!value) return value;
        if (/^https?:\/\//i.test(value)) return value;
        const path = value.startsWith('/') ? value : `/${value}`;
        try {
          if (this._hass && typeof this._hass.hassUrl === 'function') {
            return this._hass.hassUrl(path);
          }
        } catch (e) {
          // ignore
        }
        return path;
      };

      const backgroundUrl = resolveBackgroundUrl(viewState.backgroundImage);
      fetch(backgroundUrl)
        .then(response => {
          if (!response || !response.ok) {
            const status = response ? `${response.status} ${response.statusText}` : 'No response';
            throw new Error(`HTTP error loading background SVG: ${status}`);
          }
          return response.text();
        })
        .then(svgText => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;
          // Clear existing content
          refs.backgroundSvg.innerHTML = '';
          // Import the entire <svg> element so its viewBox/preserveAspectRatio are preserved.
          // Appending only children discards the background SVG root sizing and often breaks scaling.
          const importedSvg = document.importNode(svgElement, true);
          try {
            if (importedSvg && importedSvg.tagName && importedSvg.tagName.toLowerCase() === 'svg') {
              importedSvg.setAttribute('x', '0');
              importedSvg.setAttribute('y', '0');
              importedSvg.setAttribute('width', '100%');
              importedSvg.setAttribute('height', '100%');
              // Stretch the background to the available viewport.
              // This preserves all internal relative positioning (paths/text stay aligned)
              // while allowing non-uniform scaling when the display aspect ratio differs.
              importedSvg.setAttribute('preserveAspectRatio', 'none');
              // Avoid fixed pixel sizing from the source file taking precedence.
              importedSvg.style.width = '100%';
              importedSvg.style.height = '100%';
              importedSvg.style.display = 'block';

              // Support relative <image> references (e.g. href="nightnocar.webp") so the
              // SVG can be edited in Inkscape while still loading correctly in Home Assistant.
              // When the background SVG is inlined into the dashboard DOM, relative URLs would
              // otherwise resolve against the dashboard URL, not the original SVG file URL.
              try {
                const XLINK_NS = 'http://www.w3.org/1999/xlink';
                const baseUrl = new URL(backgroundUrl, window.location.href);
                const getHref = (el) => (
                  el.getAttribute('href') ||
                  el.getAttribute('xlink:href') ||
                  el.getAttributeNS(XLINK_NS, 'href')
                );
                const hasScheme = (value) => /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
                const isRelativeRef = (value) => (
                  typeof value === 'string' &&
                  value.length > 0 &&
                  !value.startsWith('/') &&
                  !value.startsWith('#') &&
                  !hasScheme(value)
                );

                const images = importedSvg.querySelectorAll('image');
                images.forEach((img) => {
                  const href = getHref(img);
                  if (!isRelativeRef(href)) return;
                  const resolved = new URL(href, baseUrl).toString();

                  if (img.getAttribute('href') !== null) {
                    img.setAttribute('href', resolved);
                  }
                  const xlinkAttr = img.getAttribute('xlink:href');
                  const xlinkNsAttr = img.getAttributeNS(XLINK_NS, 'href');
                  if (xlinkAttr !== null || xlinkNsAttr !== null) {
                    img.setAttributeNS(XLINK_NS, 'href', resolved);
                  }
                });
              } catch (e) {
                // ignore
              }

              // Performance note: if the background SVG contains multiple car-count variants
              // (daynocar/day1car/day2car and nightnocar/night1car/night2car), keep only the
              // active one. This enables using external image URLs while guaranteeing only
              // one background image gets requested/decoded.
              try {
                const effectiveConfig = this._layerConfigWithEffectiveNight(this.config);
                const carCount = (typeof getConfiguredCarCount === 'function') ? getConfiguredCarCount(effectiveConfig) : 0;
                const isNight = Boolean(effectiveConfig && effectiveConfig.night_mode);
                const desiredRole = (() => {
                  if (isNight) {
                    if (carCount <= 0) return 'nightnocar';
                    if (carCount === 1) return 'night1car';
                    return 'night2car';
                  }
                  if (carCount <= 0) return 'daynocar';
                  if (carCount === 1) return 'day1car';
                  return 'day2car';
                })();

                const candidateRoles = ['daynocar', 'day1car', 'day2car', 'nightnocar', 'night1car', 'night2car'];
                candidateRoles.forEach((role) => {
                  if (role === desiredRole) return;
                  const nodes = importedSvg.querySelectorAll(`[data-role="${role}"]`);
                  nodes.forEach((node) => {
                    if (node && node.parentNode) {
                      node.parentNode.removeChild(node);
                    }
                  });
                });
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            // ignore
          }
          refs.backgroundSvg.appendChild(importedSvg);
          // Apply layer visibility after loading
          applySvgLayerVisibility(refs.backgroundSvg, this._layerConfigWithEffectiveNight(this.config));

          // Populate any SVG-embedded text placeholders once the SVG is present.
          this._applySvgTextBindings(viewState);
          // Refresh DOM caches so feature references (like headlights) resolve immediately.
          this._cacheDomReferences();
          this._updateHeadlightFlash(viewState);
        })
        .catch(error => {
          console.error('Failed to load background SVG:', backgroundUrl, error);
        });
    }

    if (refs.debugGrid) {
      const desired = viewState.showDebugGrid ? 'inline' : 'none';
      if (refs.debugGrid.style.display !== desired) {
        refs.debugGrid.style.display = desired;
      }
    }

    if (refs.debugCoords) {
      if (viewState.showDebugGrid) {
        if (refs.debugCoords.style.display !== 'block') {
          refs.debugCoords.style.display = 'block';
        }
        if (!this._debugCoordsActive) {
          this._setDebugCoordinateText(null, null);
        }
      } else {
        if (refs.debugCoords.style.display !== 'none') {
          refs.debugCoords.style.display = 'none';
        }
        this._setDebugCoordinateText(null, null);
      }
    }

    if (refs.dailyYieldGroup) {
      const visible = viewState.daily && viewState.daily.visible;
      const display = visible ? 'inline' : 'none';
      if (refs.dailyYieldGroup.style.display !== display) {
        refs.dailyYieldGroup.style.display = display;
      }
      const cursor = visible ? 'pointer' : 'default';
      if (refs.dailyYieldGroup.style.cursor !== cursor) {
        refs.dailyYieldGroup.style.cursor = cursor;
      }
    }

    const batteryFillCandidates = [
      refs.battery1FillLevel,
      refs.battery2FillLevel,
      refs.batteryFillLevel
    ].filter(Boolean);
    if (refs.backgroundSvg) {
      try {
        const extra = Array.from(refs.backgroundSvg.querySelectorAll('[data-role="battery1-fill-level"],[data-role="battery2-fill-level"],[data-role="battery-fill-level"]'));
        extra.forEach((el) => {
          if (el && !batteryFillCandidates.includes(el)) {
            batteryFillCandidates.push(el);
          }
        });
      } catch (e) {
        // ignore
      }
    }
    const hasBatteryFillLevel = batteryFillCandidates.length > 0;
    if (hasBatteryFillLevel) {
      const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
      const ensurePerElementRafMap = () => {
        if (!this._batteryFillAnimRafs) {
          this._batteryFillAnimRafs = new WeakMap();
        }
        return this._batteryFillAnimRafs;
      };

      const getBatteryFillState = (role) => {
        if (role === 'battery1-fill-level') {
          return viewState && viewState.battery1Fill ? viewState.battery1Fill : null;
        }
        if (role === 'battery2-fill-level') {
          return viewState && viewState.battery2Fill ? viewState.battery2Fill : null;
        }
        const levelOffset = (viewState && viewState.battery && Number.isFinite(Number(viewState.battery.levelOffset)))
          ? Number(viewState.battery.levelOffset)
          : 0;
        const maxH = BATTERY_GEOMETRY.MAX_HEIGHT || 1;
        const scaleY = clamp01(1 - (levelOffset / maxH));
        const fill = (viewState && viewState.battery && typeof viewState.battery.fill === 'string') ? viewState.battery.fill : '';
        const opacity = (viewState && viewState.battery && Number.isFinite(Number(viewState.battery.opacity)))
          ? clamp01(Number(viewState.battery.opacity))
          : 1;
        const visible = Boolean(viewState && viewState.battery && viewState.battery.visible);
        return { visible, level: scaleY, fill, opacity };
      };

      batteryFillCandidates.forEach((batteryFillLevelEl) => {
        const role = batteryFillLevelEl.getAttribute('data-role') || '';
        const state = getBatteryFillState(role);
        const visible = Boolean(state && state.visible);
        const display = visible ? 'inline' : 'none';
        if (batteryFillLevelEl.style.display !== display) {
          batteryFillLevelEl.style.display = display;
        }
        if (!visible) {
          return;
        }

        const level = (state && Number.isFinite(Number(state.level))) ? clamp01(Number(state.level)) : 0;
        const fill = (state && typeof state.fill === 'string') ? state.fill : '';
        const opacity = (state && Number.isFinite(Number(state.opacity))) ? clamp01(Number(state.opacity)) : 1;

        const el = batteryFillLevelEl;
        if (el.style.transition) {
          el.style.transition = '';
        }
        const nextOpacity = String(opacity);
        if (el.style.opacity !== nextOpacity) {
          el.style.opacity = nextOpacity;
        }

        const target = clamp01(level);
        const tag = (el.tagName || '').toLowerCase();
        const isRect = tag === 'rect';

        if (!isRect) {
          // NOTE: Some Inkscape-exported paths include transform matrices.
          // Using objectBoundingBox clipping can yield skewed/mirrored fill boundaries.
          // userSpaceOnUse + getBBox keeps the clip aligned to the SVG's coordinate space.
          const SVG_NS = 'http://www.w3.org/2000/svg';
          const ensureClipPolygon = () => {
            const svg = el.ownerSVGElement || refs.svgRoot;
            if (!svg) {
              return null;
            }
            let defs = svg.querySelector('defs[data-role="lumina-defs"]');
            if (!defs) {
              defs = svg.querySelector('defs');
            }
            if (!defs) {
              defs = document.createElementNS(SVG_NS, 'defs');
              defs.setAttribute('data-role', 'lumina-defs');
              svg.insertBefore(defs, svg.firstChild);
            } else if (!defs.getAttribute('data-role')) {
              defs.setAttribute('data-role', 'lumina-defs');
            }

            if (!el.dataset) {
              return null;
            }
            if (!el.dataset.fillClipId) {
              el.dataset.fillClipId = `lumina-batfill-${Math.random().toString(36).slice(2, 9)}`;
            }
            const clipId = el.dataset.fillClipId;
            let clipPath = defs.querySelector(`#${CSS.escape(clipId)}`);
            if (!clipPath) {
              clipPath = document.createElementNS(SVG_NS, 'clipPath');
              clipPath.setAttribute('id', clipId);
              clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
              const poly = document.createElementNS(SVG_NS, 'polygon');
              poly.setAttribute('points', '0,0 0,0 0,0 0,0');
              clipPath.appendChild(poly);
              defs.appendChild(clipPath);
            }
            let poly = clipPath.querySelector('polygon');
            if (!poly) {
              // Migrate older rect-based clip to polygon-based.
              try {
                while (clipPath.firstChild) {
                  clipPath.removeChild(clipPath.firstChild);
                }
              } catch (e) {
                // ignore
              }
              poly = document.createElementNS(SVG_NS, 'polygon');
              poly.setAttribute('points', '0,0 0,0 0,0 0,0');
              clipPath.appendChild(poly);
            }
            return poly || null;
          };

          const applyLevel = (level01) => {
            const lvl = clamp01(level01);
            if (el.style.transform) el.style.transform = '';
            if (el.style.transformOrigin) el.style.transformOrigin = '';
            if (el.style.transformBox) el.style.transformBox = '';

            const poly = ensureClipPolygon();
            if (!poly || !el.dataset || !el.dataset.fillClipId) {
              return;
            }

            let bbox = null;
            try {
              bbox = (typeof el.getBBox === 'function') ? el.getBBox() : null;
            } catch (e) {
              bbox = null;
            }
            if (!bbox || !Number.isFinite(bbox.x) || !Number.isFinite(bbox.y) || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) {
              return;
            }

            const computeTopEdgeLine = () => {
              // Returns { m, b } for y = m*x + b, approximating the *top edge* of the shape.
              // Cached per bbox signature to avoid expensive sampling every frame.
              const sig = `${bbox.x.toFixed(2)},${bbox.y.toFixed(2)},${bbox.width.toFixed(2)},${bbox.height.toFixed(2)}`;
              if (el.dataset.fillTopSig === sig
                && Number.isFinite(Number(el.dataset.fillTopM))
                && Number.isFinite(Number(el.dataset.fillTopB))) {
                return { m: Number(el.dataset.fillTopM), b: Number(el.dataset.fillTopB) };
              }

              let m = 0;
              let b = bbox.y;
              const tagName = (el.tagName || '').toLowerCase();

              const updateFromPoints = (pts) => {
                if (!Array.isArray(pts) || pts.length < 2) {
                  return;
                }
                // Prefer sampling the *top* at the left and right ends of the shape.
                // Using a minY band can fail on strongly slanted tops (only a single corner
                // is at minY, so the band misses the far end and the slope becomes wrong).
                const finitePts = pts.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
                if (finitePts.length < 2) {
                  return;
                }

                let minX = Infinity;
                let maxX = -Infinity;
                for (let i = 0; i < finitePts.length; i++) {
                  const x = finitePts[i].x;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                }
                if (!Number.isFinite(minX) || !Number.isFinite(maxX) || Math.abs(maxX - minX) < 1e-6) {
                  return;
                }

                const xBand = Math.max(1, (maxX - minX) * 0.12);
                const leftStrip = finitePts.filter((p) => p.x <= (minX + xBand));
                const rightStrip = finitePts.filter((p) => p.x >= (maxX - xBand));

                const pickMinY = (arr) => {
                  if (!arr.length) return null;
                  let best = arr[0];
                  for (let i = 1; i < arr.length; i++) {
                    if (arr[i].y < best.y) best = arr[i];
                  }
                  return best;
                };

                const leftTop = pickMinY(leftStrip);
                const rightTop = pickMinY(rightStrip);
                if (leftTop && rightTop && Math.abs(rightTop.x - leftTop.x) >= 1e-6) {
                  m = (rightTop.y - leftTop.y) / (rightTop.x - leftTop.x);
                  b = leftTop.y - (m * leftTop.x);
                  return;
                }

                // Fallback: minY band (works fine for flatter tops).
                let minY = Infinity;
                for (let i = 0; i < finitePts.length; i++) {
                  if (finitePts[i].y < minY) minY = finitePts[i].y;
                }
                if (!Number.isFinite(minY)) {
                  return;
                }
                const band = Math.max(1, bbox.height * 0.05);
                const topPts = finitePts.filter((p) => p.y <= (minY + band));
                if (topPts.length < 2) {
                  return;
                }
                let minXPt = topPts[0];
                let maxXPt = topPts[0];
                for (let i = 1; i < topPts.length; i++) {
                  const p = topPts[i];
                  if (p.x < minXPt.x) minXPt = p;
                  if (p.x > maxXPt.x) maxXPt = p;
                }
                const dx = maxXPt.x - minXPt.x;
                if (Math.abs(dx) < 1e-6) {
                  m = 0;
                  b = minXPt.y;
                  return;
                }
                m = (maxXPt.y - minXPt.y) / dx;
                b = minXPt.y - (m * minXPt.x);
              };

              if (tagName === 'path' && typeof el.getTotalLength === 'function' && typeof el.getPointAtLength === 'function') {
                try {
                  const len = el.getTotalLength();
                  if (Number.isFinite(len) && len > 0) {
                    const samples = 160;
                    const pts = [];
                    for (let i = 0; i < samples; i++) {
                      const p = el.getPointAtLength((i / (samples - 1)) * len);
                      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                        pts.push({ x: p.x, y: p.y });
                      }
                    }
                    updateFromPoints(pts);
                  }
                } catch (e) {
                  // ignore
                }
              } else if ((tagName === 'polygon' || tagName === 'polyline') && typeof el.getAttribute === 'function') {
                try {
                  const raw = el.getAttribute('points') || '';
                  const parts = raw.trim().split(/\s+/);
                  const pts = parts.map((pair) => {
                    const xy = pair.split(',');
                    return { x: Number.parseFloat(xy[0]), y: Number.parseFloat(xy[1]) };
                  }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
                  updateFromPoints(pts);
                } catch (e) {
                  // ignore
                }
              }

              el.dataset.fillTopSig = sig;
              el.dataset.fillTopM = String(m);
              el.dataset.fillTopB = String(b);
              return { m, b };
            };

            const { m, b } = computeTopEdgeLine();
            // Move the edge down as lvl decreases (lvl=1 => offset 0 at top edge).
            const offset = (1 - lvl) * bbox.height;
            const pad = Math.max(10, bbox.width * 2, bbox.height * 2);
            const left = bbox.x - pad;
            const right = bbox.x + bbox.width + pad;
            const yLeft = (m * left) + b + offset;
            const yRight = (m * right) + b + offset;
            const bottom = bbox.y + bbox.height + pad;
            poly.setAttribute('points', `${left},${yLeft} ${right},${yRight} ${right},${bottom} ${left},${bottom}`);
            el.setAttribute('clip-path', `url(#${el.dataset.fillClipId})`);
            el.dataset.fillLevel = String(lvl);
          };

          const prevLevel = (el.dataset && el.dataset.fillLevel && Number.isFinite(Number(el.dataset.fillLevel)))
            ? clamp01(Number(el.dataset.fillLevel))
            : target;

          if (Math.abs(target - prevLevel) < 0.001) {
            applyLevel(target);
          } else {
            const rafMap = ensurePerElementRafMap();
            const existing = rafMap.get(el);
            if (existing) {
              cancelAnimationFrame(existing);
              rafMap.delete(el);
            }
            const start = performance.now();
            const duration = 800;
            const from = prevLevel;
            const to = target;
            const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
            const tick = () => {
              const now = performance.now();
              const t = Math.min(Math.max((now - start) / duration, 0), 1);
              const v = from + (to - from) * easeInOutQuad(t);
              applyLevel(v);
              if (t < 1) {
                rafMap.set(el, requestAnimationFrame(tick));
              } else {
                rafMap.delete(el);
                applyLevel(to);
              }
            };
            rafMap.set(el, requestAnimationFrame(tick));
          }
        } else {
          if (el.style.transform) {
            el.style.transform = '';
          }
          if (el.style.transformOrigin) {
            el.style.transformOrigin = '';
          }
          if (el.style.transformBox) {
            el.style.transformBox = '';
          }

        const baseBox = (() => {
          const cachedY = el.dataset && el.dataset.baseY ? Number(el.dataset.baseY) : NaN;
          const cachedH = el.dataset && el.dataset.baseH ? Number(el.dataset.baseH) : NaN;
          if (Number.isFinite(cachedY) && Number.isFinite(cachedH) && cachedH > 0) {
            return { y: cachedY, h: cachedH };
          }

          const rawY = el.getAttribute('y');
          const rawH = el.getAttribute('height');
          const parsedY = rawY !== null ? Number.parseFloat(rawY) : NaN;
          const parsedH = rawH !== null ? Number.parseFloat(rawH) : NaN;
          if (Number.isFinite(parsedY) && Number.isFinite(parsedH) && parsedH > 0) {
            if (el.dataset) {
              el.dataset.baseY = String(parsedY);
              el.dataset.baseH = String(parsedH);
            }
            return { y: parsedY, h: parsedH };
          }

          // Fallback: some exported SVGs omit numeric y/height attributes.
          // Use getBBox() as the authoritative baseline.
          if (typeof el.getBBox === 'function') {
            try {
              const bbox = el.getBBox();
              if (bbox && Number.isFinite(bbox.y) && Number.isFinite(bbox.height) && bbox.height > 0) {
                if (el.dataset) {
                  el.dataset.baseY = String(bbox.y);
                  el.dataset.baseH = String(bbox.height);
                }
                return { y: bbox.y, h: bbox.height };
              }
            } catch (e) {
              // ignore
            }
          }
          return { y: 0, h: 0 };
        })();

        const applyLevel = (level01) => {
          const level = clamp01(level01);
          const h = baseBox.h * level;
          const y = baseBox.y + (baseBox.h - h);
          el.setAttribute('height', String(h));
          el.setAttribute('y', String(y));
          if (el.dataset) {
            el.dataset.fillLevel = String(level);
          }
        };

        const prevLevel = (el.dataset && el.dataset.fillLevel && Number.isFinite(Number(el.dataset.fillLevel)))
          ? clamp01(Number(el.dataset.fillLevel))
          : target;

        if (baseBox.h > 0) {
          if (Math.abs(target - prevLevel) < 0.001) {
            applyLevel(target);
          } else {
            if (this._batteryFillAnimRaf) {
              cancelAnimationFrame(this._batteryFillAnimRaf);
              this._batteryFillAnimRaf = null;
            }
            const start = performance.now();
            const duration = 800;
            const from = prevLevel;
            const to = target;
            const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
            const tick = () => {
              const now = performance.now();
              const t = Math.min(Math.max((now - start) / duration, 0), 1);
              const v = from + (to - from) * easeInOutQuad(t);
              applyLevel(v);
              if (t < 1) {
                this._batteryFillAnimRaf = requestAnimationFrame(tick);
              } else {
                this._batteryFillAnimRaf = null;
                applyLevel(to);
              }
            };
            this._batteryFillAnimRaf = requestAnimationFrame(tick);
          }
        }
        }
        if (fill) {
          if (el.getAttribute('fill') !== fill) {
            el.setAttribute('fill', fill);
          }
          if (el.style.fill !== fill) {
            el.style.fill = fill;
          }
          if (el.getAttribute('stroke') !== 'none') {
            el.setAttribute('stroke', 'none');
          }
        }
      });

      // When the new fill-level rect exists, hide the legacy wave-based liquid elements.
      if (refs.batteryLiquidGroup && refs.batteryLiquidGroup.style.display !== 'none') {
        refs.batteryLiquidGroup.style.display = 'none';
      }
      if (refs.batteryLiquidShape && refs.batteryLiquidShape.style.display !== 'none') {
        refs.batteryLiquidShape.style.display = 'none';
      }
    } else {
      // Legacy battery fill path (wave): translate group + update liquid colour.
      if (refs.batteryLiquidGroup) {
        const transform = `translate(0, ${viewState.battery.levelOffset})`;
        if (refs.batteryLiquidGroup.getAttribute('transform') !== transform) {
          refs.batteryLiquidGroup.setAttribute('transform', transform);
        }
      }

      if (refs.batteryLiquidShape && (!prev.battery || prev.battery.fill !== viewState.battery.fill)) {
        refs.batteryLiquidShape.setAttribute('fill', viewState.battery.fill);
      }
    }

    // Force-hide legacy SVG popups (single HTML overlay is used instead)
    const legacyPopups = [refs.pvPopup, refs.batteryPopup, refs.housePopup, refs.gridPopup, refs.inverterPopup].filter(Boolean);
    legacyPopups.forEach((popup) => {
      if (popup && popup.style && popup.style.display !== 'none') {
        popup.style.display = 'none';
      }
    });

    // If PV UI becomes disabled while PV popup is open, close it.
    if (!viewState.pvUiEnabled && this._activePopup === 'pv') {
      this._closePopupOverlay();
    }

    // Keep popup positioned on every view update while visible
    if (this._activePopup) {
      this._syncPopupOverlayToAnchor();
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

    // Safety: if we are not in arrow mode, force-hide ANY arrow groups/shapes.
    // This protects against leftover arrow polygons when switching styles.
    if (!useArrowsGlobally && refs.svgRoot) {
      const arrowGroups = refs.svgRoot.querySelectorAll('[data-arrow-key], .flow-arrow');
      arrowGroups.forEach((group) => {
        if (group && group.style && group.style.opacity !== '0') {
          group.style.opacity = '0';
        }
      });
      const arrowShapesAll = refs.svgRoot.querySelectorAll('[data-arrow-shape]');
      arrowShapesAll.forEach((shape) => shape.removeAttribute('transform'));
    }

    // Apply layer visibility if background is already loaded
    if (refs.backgroundSvg && refs.backgroundSvg.children.length > 0) {
      applySvgLayerVisibility(refs.backgroundSvg, this._layerConfigWithEffectiveNight(this.config));
    }

    // Windmill blades: rotate only when windmill total is positive.
    try {
      const blades = refs.windmillBlades || (refs.backgroundSvg ? refs.backgroundSvg.querySelector('[data-key-rotate="windmill-blades"]') : null);
      if (blades) {
        const shouldSpin = Boolean(viewState && viewState.windmillSpin);
        if (shouldSpin) {
          if (blades.getAttribute('data-lumina-rotate-disabled') !== null) {
            blades.removeAttribute('data-lumina-rotate-disabled');
          }
        } else {
          if (blades.getAttribute('data-lumina-rotate-disabled') !== '1') {
            blades.setAttribute('data-lumina-rotate-disabled', '1');
          }
        }
      }
    } catch (e) {
      // ignore
    }

    this._updateHeadlightFlash(viewState);

    // Populate SVG-embedded text placeholders (safe no-op if none exist).
    this._applySvgTextBindings(viewState);

    // Re-attach event listeners after DOM updates
    this._cacheDomReferences(); // Re-cache refs in case DOM was updated
    this._attachEventListeners();
  }

  _applySvgTextBindings(viewState) {
    if (!this._domRefs || !this._domRefs.backgroundSvg) {
      return;
    }
    const svgRoot = this._domRefs.backgroundSvg;
    if (!svgRoot || !svgRoot.children || svgRoot.children.length === 0) {
      return;
    }

    const globalFontFamily = (viewState && typeof viewState.fontFamily === 'string' && viewState.fontFamily.trim())
      ? viewState.fontFamily.trim()
      : null;

    const odometerFontFamily = (viewState && typeof viewState.odometerFontFamily === 'string' && viewState.odometerFontFamily.trim())
      ? viewState.odometerFontFamily.trim()
      : (globalFontFamily || null);


    const hasFeatureToken = (el, token) => {
      try {
        if (!el || typeof el.getAttribute !== 'function') return false;
        const raw = (el.getAttribute('data-feature') || '').trim();
        if (!raw) return false;
        const tokens = raw.split(/\s+/g);
        return tokens.includes(token);
      } catch (e) {
        return false;
      }
    };
    if (globalFontFamily) {
      if (svgRoot.getAttribute('font-family') !== globalFontFamily) {
        svgRoot.setAttribute('font-family', globalFontFamily);
      }
      if (svgRoot.style && svgRoot.style.fontFamily !== globalFontFamily) {
        svgRoot.style.fontFamily = globalFontFamily;
      }
    }

    const shouldApplyConfiguredTextStyle = (node, options = {}) => {
      // Configuration styling always wins (fill/font-size from viewState/config override SVG).
      return true;
    };

    const isConfigStyledTextNode = (node) => {
      try {
        const host = getVisibilityTarget(node);
        const raw = (host && typeof host.getAttribute === 'function') ? host.getAttribute('data-style') : null;
        return typeof raw === 'string' && raw.trim().toLowerCase() === 'config';
      } catch (e) {
        return false;
      }
    };

    const getVisibilityTarget = (node) => {
      if (!node || typeof node.closest !== 'function') {
        return node;
      }
      const textHost = node.closest('text');
      return textHost || node;
    };

    // Per-digit odometer animation support (initially used for grid-current-power).
    const SVG_NS = 'http://www.w3.org/2000/svg';
    if (!this._odometerStates) {
      this._odometerStates = new WeakMap();
    }

    const ensureDefs = (svg) => {
      if (!svg) return null;
      let defs = svg.querySelector('defs[data-role="lumina-defs"]');
      if (!defs) defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        defs.setAttribute('data-role', 'lumina-defs');
        svg.insertBefore(defs, svg.firstChild);
      } else if (!defs.getAttribute('data-role')) {
        defs.setAttribute('data-role', 'lumina-defs');
      }
      return defs;
    };

    const getNumberAttr = (node, attr) => {
      const raw = node && typeof node.getAttribute === 'function' ? node.getAttribute(attr) : null;
      const v = raw ? parseFloat(raw) : NaN;
      return Number.isFinite(v) ? v : NaN;
    };

    const parseOdometerParts = (text) => {
      const s = (text === null || text === undefined) ? '' : String(text);
      const firstDigitIndex = s.search(/[0-9]/);
      if (firstDigitIndex < 0) return { ok: false, prefix: s, core: '', suffix: '' };
      let lastDigitIndex = -1;
      for (let i = s.length - 1; i >= 0; i--) {
        if (/[0-9]/.test(s[i])) {
          lastDigitIndex = i;
          break;
        }
      }
      if (lastDigitIndex < firstDigitIndex) return { ok: false, prefix: s, core: '', suffix: '' };
      const prefix = s.slice(0, firstDigitIndex);
      const core = s.slice(firstDigitIndex, lastDigitIndex + 1);
      const suffix = s.slice(lastDigitIndex + 1);
      const ok = /^[0-9.\-]+$/.test(core);
      return { ok, prefix, core, suffix };
    };

    const resolveOdometerStyle = (textNode, options = {}) => {
      const fontSize = (typeof options.fontSize === 'number' && Number.isFinite(options.fontSize))
        ? options.fontSize
        : (Number.isFinite(getNumberAttr(textNode, 'font-size')) ? getNumberAttr(textNode, 'font-size') : 14);
      const fill = (typeof options.fill === 'string' && options.fill)
        ? options.fill
        : (textNode && textNode.getAttribute ? (textNode.getAttribute('fill') || '') : '');
      const fontFamily = (typeof options.fontFamily === 'string' && options.fontFamily)
        ? options.fontFamily
        : (textNode && textNode.getAttribute ? (textNode.getAttribute('font-family') || '') : (globalFontFamily || ''));

      // text-anchor is often set via inline style on the SVG <text> (especially in the night SVG).
      // Prefer explicit attribute, then inline style, then computed style.
      let textAnchor = 'start';
      try {
        const attrAnchor = textNode && textNode.getAttribute ? textNode.getAttribute('text-anchor') : null;
        if (typeof attrAnchor === 'string' && attrAnchor.trim()) {
          textAnchor = attrAnchor.trim();
        } else if (textNode && textNode.style) {
          const styleAnchor = textNode.style.textAnchor || (typeof textNode.style.getPropertyValue === 'function' ? textNode.style.getPropertyValue('text-anchor') : '');
          if (typeof styleAnchor === 'string' && styleAnchor.trim()) {
            textAnchor = styleAnchor.trim();
          }
        }
        if (textAnchor === 'start') {
          const rawStyle = textNode && textNode.getAttribute ? textNode.getAttribute('style') : null;
          if (typeof rawStyle === 'string' && rawStyle) {
            const m = rawStyle.match(/(?:^|;)\s*text-anchor\s*:\s*([^;]+)/i);
            if (m && m[1]) {
              textAnchor = String(m[1]).trim();
            }
          }
        }
        if (textAnchor === 'start' && typeof getComputedStyle === 'function' && textNode) {
          const cs = getComputedStyle(textNode);
          if (cs && typeof cs.textAnchor === 'string' && cs.textAnchor.trim()) {
            textAnchor = cs.textAnchor.trim();
          }
        }
      } catch (e) {
        textAnchor = 'start';
      }
      textAnchor = String(textAnchor || 'start').toLowerCase();
      if (textAnchor !== 'middle' && textAnchor !== 'end') textAnchor = 'start';
      return { fontSize, fill, fontFamily, textAnchor };
    };

    const ensureMeasureText = (svg, style) => {
      if (!svg) return null;
      let measure = svg.querySelector('text[data-role="lumina-odometer-measure"]');
      if (!measure) {
        measure = document.createElementNS(SVG_NS, 'text');
        measure.setAttribute('data-role', 'lumina-odometer-measure');
        // Keep the measuring node inside the viewport. Some WebViews return 0 width
        // for off-viewport text even with getComputedTextLength/getBBox.
        measure.setAttribute('x', '0');
        measure.setAttribute('y', '0');
        measure.setAttribute('opacity', '0');
        measure.style.opacity = '0';
        measure.style.pointerEvents = 'none';
        measure.setAttribute('text-anchor', 'start');
        svg.appendChild(measure);
      }
      if (style) {
        if (style.fontFamily) {
          measure.setAttribute('font-family', style.fontFamily);
          measure.style.fontFamily = style.fontFamily;
        }
        if (Number.isFinite(style.fontSize)) {
          measure.setAttribute('font-size', String(style.fontSize));
          measure.style.fontSize = `${style.fontSize}px`;
        }
        if (style.fill) {
          measure.setAttribute('fill', style.fill);
          measure.style.fill = style.fill;
        }
        measure.style.fontVariantNumeric = 'tabular-nums';
      }
      return measure;
    };

    const measureWidth = (svg, style, text) => {
      const measure = ensureMeasureText(svg, style);
      if (!measure) return 0;
      measure.textContent = (text === null || text === undefined) ? '' : String(text);
      try {
        if (typeof measure.getComputedTextLength === 'function') {
          const w = measure.getComputedTextLength();
          if (Number.isFinite(w) && w > 0) return w;
        }
      } catch (e) {
        // ignore
      }
      try {
        if (typeof measure.getBBox === 'function') {
          const box = measure.getBBox();
          const w = box && typeof box.width === 'number' ? box.width : 0;
          return Number.isFinite(w) ? w : 0;
        }
      } catch (e) {
        // ignore
      }

      // Last resort: create a temporary measuring text node at (0,0).
      // Some environments return 0 for a reused hidden node.
      try {
        if (svg && typeof svg.appendChild === 'function') {
          const tmp = document.createElementNS(SVG_NS, 'text');
          tmp.setAttribute('x', '0');
          tmp.setAttribute('y', '0');
          tmp.setAttribute('opacity', '0');
          tmp.style.opacity = '0';
          tmp.style.pointerEvents = 'none';
          tmp.setAttribute('text-anchor', 'start');
          if (style && style.fontFamily) {
            tmp.setAttribute('font-family', style.fontFamily);
            tmp.style.fontFamily = style.fontFamily;
          }
          if (style && Number.isFinite(style.fontSize)) {
            tmp.setAttribute('font-size', String(style.fontSize));
            tmp.style.fontSize = `${style.fontSize}px`;
          }
          if (style && style.fill) {
            tmp.setAttribute('fill', style.fill);
            tmp.style.fill = style.fill;
          }
          tmp.style.fontVariantNumeric = 'tabular-nums';
          tmp.textContent = (text === null || text === undefined) ? '' : String(text);
          svg.appendChild(tmp);
          let w = 0;
          try {
            if (typeof tmp.getComputedTextLength === 'function') {
              w = tmp.getComputedTextLength();
            }
          } catch (e) {
            // ignore
          }
          if (!(Number.isFinite(w) && w > 0)) {
            try {
              if (typeof tmp.getBBox === 'function') {
                const box = tmp.getBBox();
                w = box && typeof box.width === 'number' ? box.width : 0;
              }
            } catch (e) {
              // ignore
            }
          }
          try {
            if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
          } catch (e) {
            // ignore
          }
          return Number.isFinite(w) ? w : 0;
        }
      } catch (e) {
        // ignore
      }
      return 0;
    };

    const teardownOdometer = (textNode) => {
      if (!textNode) return;
      const state = this._odometerStates.get(textNode);
      if (state && state.group && state.group.parentNode) {
        try {
          state.group.parentNode.removeChild(state.group);
        } catch (e) {
          // ignore
        }
      }
      if (state && Array.isArray(state.hiddenNodes) && state.hiddenNodes.length) {
        state.hiddenNodes.forEach((n) => {
          try {
            if (n && n.style && n.style.display === 'none') {
              n.style.display = '';
            }
          } catch (e) {
            // ignore
          }
        });
        state.hiddenNodes = [];
      }
      try {
        if (textNode.style && textNode.style.display === 'none') {
          textNode.style.display = '';
        }
      } catch (e) {
        // ignore
      }
      this._odometerStates.delete(textNode);
    };

    const ensureOdometerState = (textNode) => {
      if (!textNode || !textNode.ownerSVGElement) return null;
      let state = this._odometerStates.get(textNode);
      if (state && state.group && state.group.isConnected) {
        try {
          state.hostTransform = (textNode.getAttribute && textNode.getAttribute('transform')) ? (textNode.getAttribute('transform') || '') : '';
        } catch (e) {
          state.hostTransform = '';
        }
        return state;
      }
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('data-role', 'lumina-odometer');
      group.setAttribute('aria-hidden', 'true');
      group.style.pointerEvents = 'none';
      try {
        const feature = textNode.getAttribute && textNode.getAttribute('data-feature');
        if (feature) group.setAttribute('data-feature', feature);
        const dataStyle = textNode.getAttribute && textNode.getAttribute('data-style');
        if (dataStyle) group.setAttribute('data-style', dataStyle);
      } catch (e) {
        // ignore
      }
      if (textNode.parentNode) {
        textNode.parentNode.insertBefore(group, textNode.nextSibling);
      }
      state = { group, builtKey: '', slots: [], lineHeight: 0, hiddenNodes: [], hostTransform: '' };
      try {
        state.hostTransform = (textNode.getAttribute && textNode.getAttribute('transform')) ? (textNode.getAttribute('transform') || '') : '';
      } catch (e) {
        state.hostTransform = '';
      }
      this._odometerStates.set(textNode, state);
      return state;
    };

    const buildOdometer = (textNode, parts, style, options = {}) => {
      const state = ensureOdometerState(textNode);
      if (!state) return null;
      const group = state.group;
      while (group.firstChild) group.removeChild(group.firstChild);
      state.slots = [];
      state.prefixNode = null;
      state.suffixNode = null;
      state.prefixWUsed = 0;
      state.lastPrefixDelta = 0;
      state.baseX = NaN;
      state.baseY = NaN;
      state.anchor = style && style.textAnchor ? style.textAnchor : 'start';

      const svg = textNode.ownerSVGElement;
      const x = getNumberAttr(textNode, 'x');
      const y = getNumberAttr(textNode, 'y');
      const rawHostTransform = (state.hostTransform || '').trim();
      if (Number.isFinite(x) && Number.isFinite(y)) {
        state.baseX = x;
        state.baseY = y;
        // Match SVG semantics: x/y are applied first, then the element's transform.
        // In SVG transform lists, the rightmost transform is applied first, so we put
        // the host transform first, then the x/y translate.
        const t = [rawHostTransform, `translate(${x},${y})`].filter(Boolean).join(' ');
        if (t) {
          group.setAttribute('transform', t);
        } else {
          group.removeAttribute('transform');
        }
      } else {
        if (rawHostTransform) {
          group.setAttribute('transform', rawHostTransform);
        } else {
          group.removeAttribute('transform');
        }
      }

      if (!textNode.dataset.odometerId) {
        textNode.dataset.odometerId = `lumina-odo-${Math.random().toString(36).slice(2, 9)}`;
      }
      const odoId = textNode.dataset.odometerId;

      const has3dEdge = (() => {
        try {
          return !hasFeatureToken(textNode, 'noborder');
        } catch (e) {
          return false;
        }
      })();

      const edgeStrokeWidth = has3dEdge ? Math.min(2.4, Math.max(0.8, style.fontSize * 0.12)) : 0;

      const prefixW = parts.prefix ? measureWidth(svg, style, parts.prefix) : 0;
      const suffixW = parts.suffix ? measureWidth(svg, style, parts.suffix) : 0;
      const digitWidths = Array.from({ length: 10 }, (_, i) => measureWidth(svg, style, String(i)));
      // Add a small pad to avoid occasional right-edge clipping in some SVG renderers/webviews.
      const digitPad = Math.max(1, style.fontSize * 0.12);
      const digitW = (Math.max(...digitWidths, 0) || Math.max(1, style.fontSize * 0.6)) + digitPad;
      // Punctuation often extends beyond its advance width; pad to avoid overlaps like "2.39".
      const punctPad = Math.max(1, style.fontSize * 0.14);
      const dotW = Math.max(measureWidth(svg, style, '.'), Math.max(1, digitW * 0.35)) + punctPad;
      const minusW = Math.max(measureWidth(svg, style, '-'), Math.max(1, digitW * 0.6)) + punctPad;

      const coreChars = parts.core.split('');
      const coreWidths = coreChars.map((ch) => {
        if (ch >= '0' && ch <= '9') return digitW;
        if (ch === '.') return dotW;
        if (ch === '-') return minusW;
        return digitW;
      });
      const coreW = coreWidths.reduce((a, b) => a + b, 0);
      const totalW = prefixW + coreW + suffixW;

      let startX = 0;
      if (style.textAnchor === 'middle') startX = -totalW / 2;
      else if (style.textAnchor === 'end') startX = -totalW;

      const applyTextStyle = (el) => {
        el.setAttribute('text-anchor', 'start');
        // Some SVGs authored in editors include CSS `text-align:center`.
        // While SVG alignment should be driven by `text-anchor`, a few WebViews
        // behave better if we explicitly set `text-align` too.
        try {
          if (el.style) {
            el.style.textAlign = 'left';
            if (typeof el.style.setProperty === 'function') {
              el.style.setProperty('text-align', 'left');
            }
          }
        } catch (e) {
          // ignore
        }
        if (style.fontFamily) {
          el.setAttribute('font-family', style.fontFamily);
          el.style.fontFamily = style.fontFamily;
        }
        el.setAttribute('font-size', String(style.fontSize));
        el.style.fontSize = `${style.fontSize}px`;
        if (style.fill) {
          el.setAttribute('fill', style.fill);
          el.style.fill = style.fill;
        }
        el.style.fontVariantNumeric = 'tabular-nums';

        // Keep parity with the card's outline effect.
        // (The global applyFixedExtrusionByFeature only styles the original SVG text nodes,
        // so we replicate it for odometer-generated nodes. Use data-feature="noborder" to opt out.)
        if (has3dEdge) {
          const strokeColor = '#000';
          const strokeOpacity = 1;
          const strokeWidth = edgeStrokeWidth;
          el.setAttribute('paint-order', 'stroke fill');
          el.setAttribute('stroke', strokeColor);
          el.setAttribute('stroke-opacity', String(strokeOpacity));
          el.setAttribute('stroke-width', String(strokeWidth));
          el.setAttribute('stroke-linejoin', 'round');
          el.setAttribute('stroke-miterlimit', '2');
          el.style.paintOrder = 'stroke fill';
          el.style.stroke = strokeColor;
          el.style.strokeOpacity = String(strokeOpacity);
          el.style.strokeWidth = String(strokeWidth);
          el.style.strokeLinejoin = 'round';
          el.style.strokeMiterlimit = '2';
        }
      };

      if (parts.prefix) {
        const t = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t);
        t.setAttribute('x', String(startX));
        t.setAttribute('y', '0');
        t.textContent = parts.prefix;
        group.appendChild(t);
        state.prefixNode = t;
        state.prefixWUsed = prefixW;
      }

      let cursorX = startX + prefixW;
      // Clip viewport for rolling digits.
      // Use the actual rendered glyph bbox (with stroke if enabled) to avoid webview quirks
      // where heuristic clip windows can look vertically offset or bleed into adjacent lines.
      let clipY = -(style.fontSize * 1.15);
      let clipH = style.fontSize * 1.5;
      let baselineY = -clipY;
      let lineHeight = Math.max(1, style.fontSize * 1.2);
      try {
        const tmp = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(tmp);
        tmp.setAttribute('x', '0');
        tmp.setAttribute('y', '0');
        tmp.setAttribute('opacity', '0');
        tmp.style.opacity = '0';
        tmp.style.pointerEvents = 'none';
        tmp.textContent = '0';
        svg.appendChild(tmp);
        const b = (typeof tmp.getBBox === 'function') ? tmp.getBBox() : null;
        try {
          if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
        } catch (e) {
          // ignore
        }
        if (b && Number.isFinite(b.y) && Number.isFinite(b.height) && b.height > 0.5) {
          const pad = Math.max(1, edgeStrokeWidth * 1.8);
          clipY = b.y - pad;
          clipH = b.height + pad * 2;
          baselineY = -clipY;
          // Ensure the second line is fully out of view before animation completes.
          lineHeight = Math.max(clipH, style.fontSize * 1.2);
        }
      } catch (e) {
        // ignore
      }
      state.lineHeight = lineHeight;
      coreChars.forEach((ch, i) => {
        const slotW = coreWidths[i] || digitW;
        // Use a nested <svg> viewport to clip the rolling digit.
        // This is robust even when parent groups have transforms.
        const slotViewport = document.createElementNS(SVG_NS, 'svg');
        slotViewport.setAttribute('x', String(cursorX));
        slotViewport.setAttribute('y', String(clipY));
        slotViewport.setAttribute('width', String(slotW));
        slotViewport.setAttribute('height', String(clipH));
        slotViewport.setAttribute('viewBox', `0 0 ${slotW} ${clipH}`);
        slotViewport.setAttribute('overflow', 'hidden');
        slotViewport.style.overflow = 'hidden';

        const inner = document.createElementNS(SVG_NS, 'g');
        inner.setAttribute('transform', 'translate(0,0)');

        const t1 = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t1);
        t1.setAttribute('x', '0');
        t1.setAttribute('y', String(baselineY));
        t1.textContent = ch;

        const t2 = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t2);
        t2.setAttribute('x', '0');
        t2.setAttribute('y', String(baselineY + lineHeight));
        t2.textContent = ch;

        inner.appendChild(t1);
        inner.appendChild(t2);
        slotViewport.appendChild(inner);
        group.appendChild(slotViewport);
        state.slots.push({ viewport: slotViewport, baseX: cursorX, inner, primary: t1, secondary: t2 });
        cursorX += slotW;
      });

      if (parts.suffix) {
        const t = document.createElementNS(SVG_NS, 'text');
        applyTextStyle(t);
        const suffixX = startX + prefixW + coreW;
        t.setAttribute('x', String(suffixX));
        t.setAttribute('y', '0');
        t.textContent = parts.suffix;
        group.appendChild(t);
        state.suffixNode = t;
        state.suffixBaseX = suffixX;
      }

      const duration = (typeof options.odometerDuration === 'number' && Number.isFinite(options.odometerDuration))
        ? options.odometerDuration
        : 350;
      group.dataset.duration = String(duration);
      // NOTE: builtKey must be stable across value changes, otherwise we'd rebuild every update
      // and never see any digit animation. Normalize digits to keep structure but ignore value.
      const coreSig = String(parts.core || '').replace(/[0-9]/g, '0');
      state.builtKey = `${parts.prefix}__${coreSig}__${parts.suffix}__${style.fontFamily}__${style.fontSize}__${style.fill}__${style.textAnchor}`;
      return state;
    };

    const finalizeOdometerLayout = (state, style) => {
      if (!state || !state.group || !style) return;
      const group = state.group;
      const baseX = Number.isFinite(state.baseX) ? state.baseX : 0;
      const baseY = Number.isFinite(state.baseY) ? state.baseY : 0;
      const rawHostTransform = (state.hostTransform || '').trim();

      // 1) Fix prefix overlap by shifting slots/suffix based on the actual rendered prefix width.
      try {
        const used = Number.isFinite(state.prefixWUsed) ? state.prefixWUsed : 0;
        let actual = 0;
        if (state.prefixNode) {
          try {
            if (typeof state.prefixNode.getBBox === 'function') {
              const b = state.prefixNode.getBBox();
              if (b && Number.isFinite(b.width)) actual = b.width;
            }
          } catch (e) {
            // ignore
          }
          if (!(Number.isFinite(actual) && actual > 0)) {
            try {
              if (typeof state.prefixNode.getComputedTextLength === 'function') {
                const w = state.prefixNode.getComputedTextLength();
                if (Number.isFinite(w)) actual = w;
              }
            } catch (e) {
              // ignore
            }
          }
        }

        const delta = (Number.isFinite(actual) ? actual : 0) - used;
        state.lastPrefixDelta = delta;

        // IMPORTANT: apply correction idempotently (based on stored baseX), so it doesn't drift
        // further apart on each update.
        state.slots.forEach((slot) => {
          if (!slot || !slot.viewport) return;
          const base = Number.isFinite(slot.baseX) ? slot.baseX : NaN;
          if (Number.isFinite(base)) {
            slot.viewport.setAttribute('x', String(base + delta));
          }
        });
        if (state.suffixNode) {
          const base = Number.isFinite(state.suffixBaseX) ? state.suffixBaseX : NaN;
          if (Number.isFinite(base)) {
            state.suffixNode.setAttribute('x', String(base + delta));
          }
        }
      } catch (e) {
        // ignore
      }

      // 2) Re-center (or end-align) the whole odometer group based on its real bbox.
      try {
        if (typeof group.getBBox === 'function') {
          // Measure bbox in local coordinates (without the base translate), otherwise some
          // WebViews can report 0 width and we'd double-translate off-canvas.
          const prevTransform = group.getAttribute('transform');
          try {
            group.removeAttribute('transform');
          } catch (e) {
            // ignore
          }

          const bbox = group.getBBox();

          try {
            if (prevTransform) group.setAttribute('transform', prevTransform);
          } catch (e) {
            // ignore
          }

          if (bbox && Number.isFinite(bbox.x) && Number.isFinite(bbox.width) && bbox.width > 0.5) {
            const anchor = (state.anchor || style.textAnchor || 'start');
            let localShiftX = 0;
            if (anchor === 'middle') {
              localShiftX = -(bbox.x + bbox.width / 2);
            } else if (anchor === 'end') {
              localShiftX = -(bbox.x + bbox.width);
            } else {
              // For start-anchored text, don't compensate for bbox.x.
              // BBox can extend left of x=0 because of stroke/overhang, which would cause
              // the odometer group to "jump" right on the first measured update.
              localShiftX = 0;
            }
            group.setAttribute('transform', [rawHostTransform, `translate(${baseX},${baseY}) translate(${localShiftX},0)`].filter(Boolean).join(' '));
          } else {
            // Keep the base position only.
            group.setAttribute('transform', [rawHostTransform, `translate(${baseX},${baseY})`].filter(Boolean).join(' '));
          }
        }
      } catch (e) {
        // ignore
      }
    };

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animateTranslateYRaf = (slot, fromY, toY, duration, onFinish) => {
      if (!slot || !slot.inner) return;

      const nowFn = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function')
        ? () => performance.now()
        : () => Date.now();
      const raf = (typeof requestAnimationFrame === 'function')
        ? (cb) => requestAnimationFrame(cb)
        : (cb) => setTimeout(() => cb(nowFn()), 16);
      const caf = (typeof cancelAnimationFrame === 'function')
        ? (id) => cancelAnimationFrame(id)
        : (id) => clearTimeout(id);
      try {
        if (slot._rafId) {
          caf(slot._rafId);
          slot._rafId = 0;
        }
      } catch (e) {
        // ignore
      }

      const start = nowFn();
      const safeDuration = Math.max(0, duration || 0);

      const tick = (now) => {
        const tNow = (typeof now === 'number') ? now : nowFn();
        const elapsed = Math.max(0, tNow - start);
        const t = safeDuration <= 0 ? 1 : Math.min(1, elapsed / safeDuration);
        const eased = easeOutCubic(t);
        const y = fromY + (toY - fromY) * eased;
        try {
          slot.inner.setAttribute('transform', `translate(0,${y})`);
        } catch (e) {
          // ignore
        }
        if (t < 1) {
          slot._rafId = raf(tick);
        } else {
          slot._rafId = 0;
          try {
            if (typeof onFinish === 'function') onFinish();
          } catch (e) {
            // ignore
          }
        }
      };

      slot._rafId = raf(tick);
    };

    const animateOdometerTo = (textNode, nextText, options = {}) => {
      const parts = parseOdometerParts(nextText);
      if (!parts.ok) return false;
      const state = ensureOdometerState(textNode);
      if (!state) return false;
      const style = resolveOdometerStyle(textNode, options);

      // Remember the latest inputs so we can safely rebuild after fonts load.
      state._lastNextText = nextText;
      state._lastOptions = options;
      const coreSig = String(parts.core || '').replace(/[0-9]/g, '0');
      const buildKey = `${parts.prefix}__${coreSig}__${parts.suffix}__${style.fontFamily}__${style.fontSize}__${style.fill}__${style.textAnchor}`;
      const needsRebuild = (state.builtKey !== buildKey || !Array.isArray(state.slots) || state.slots.length !== parts.core.length);
      if (needsRebuild) {
        // Avoid showing an intermediate mis-measured layout (font loads / bbox settle).
        try {
          if (state.group && state.group.style) {
            state.group.style.opacity = '0';
          }
        } catch (e) {
          // ignore
        }
        buildOdometer(textNode, parts, style, options);
      }

      // Finalize layout using actual rendered geometry (prevents Curr: overlap in HA WebViews).
      try {
        state.anchor = style.textAnchor;
        finalizeOdometerLayout(state, style);

        // Run once on next frame to ensure the DOM has a chance to layout.
        try {
          if (!state._layoutRaf) {
            state._layoutRaf = requestAnimationFrame(() => {
              try {
                finalizeOdometerLayout(state, style);
              } catch (e) {
                // ignore
              }
              try {
                if (state.group && state.group.style) state.group.style.opacity = '';
              } catch (e) {
                // ignore
              }
              state._layoutRaf = 0;
            });
          }
        } catch (e) {
          // ignore
        }

        // If font loading API is available, re-run once fonts are ready (prevents first-update flash).
        try {
          if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
            if (!state._fontsReadyPromise) {
              state._fontsReadyPromise = document.fonts.ready;
            }
            state._fontsReadyPromise.then(() => {
              // Fonts can load after the initial build; finalize alone can't fix digit widths,
              // so rebuild once with the now-available font metrics.
              try {
                if (!state._rebuiltAfterFonts) {
                  state._rebuiltAfterFonts = true;
                  const latestText = (state._lastNextText !== undefined && state._lastNextText !== null) ? String(state._lastNextText) : String(nextText);
                  const latestParts = parseOdometerParts(latestText);
                  if (latestParts && latestParts.ok) {
                    const latestOptions = state._lastOptions || options || {};
                    const latestStyle = resolveOdometerStyle(textNode, latestOptions);
                    buildOdometer(textNode, latestParts, latestStyle, latestOptions);
                  }
                }
              } catch (e) {
                // ignore
              }
              try {
                const latestOptions = state._lastOptions || options || {};
                const finalizeStyle = resolveOdometerStyle(textNode, latestOptions);
                state.anchor = finalizeStyle.textAnchor;
                finalizeOdometerLayout(state, finalizeStyle);
              } catch (e) {
                // ignore
              }
              try {
                if (state.group && state.group.style) state.group.style.opacity = '';
              } catch (e) {
                // ignore
              }
            }).catch(() => {
              try {
                if (state.group && state.group.style) state.group.style.opacity = '';
              } catch (e) {
                // ignore
              }
            });
          } else if (needsRebuild) {
            // Ensure we don't leave it hidden.
            if (state.group && state.group.style) state.group.style.opacity = '';
          }
        } catch (e) {
          // ignore
        }
        // Fonts can load late; re-run once shortly after to stabilize widths.
        if (!state._layoutTimer) {
          state._layoutTimer = setTimeout(() => {
            try {
              finalizeOdometerLayout(state, style);
            } catch (e) {
              // ignore
            }
            try {
              if (state.group && state.group.style) state.group.style.opacity = '';
            } catch (e) {
              // ignore
            }
            state._layoutTimer = 0;
          }, 250);
        }
      } catch (e) {
        // ignore
      }

      const duration = (typeof options.odometerDuration === 'number' && Number.isFinite(options.odometerDuration))
        ? options.odometerDuration
        : (state.group && state.group.dataset && state.group.dataset.duration ? parseFloat(state.group.dataset.duration) : 350);
      const lineHeight = state.lineHeight || Math.max(1, style.fontSize * 1.2);
      const chars = parts.core.split('');

      state.slots.forEach((slot, i) => {
        if (!slot || !slot.primary || !slot.secondary || !slot.inner) return;
        const nextCh = chars[i] || '';
        const prevCh = slot.primary.textContent || '';
        if (prevCh === nextCh) return;

        slot.secondary.textContent = nextCh;
        try {
          if (typeof slot.inner.getAnimations === 'function') {
            slot.inner.getAnimations().forEach((a) => a.cancel());
          }
        } catch (e) {
          // ignore
        }
        // WAAPI animations on SVG content are unreliable in some HA WebViews.
        // Use an rAF-driven transform tween for consistent digit rolling.
        slot.inner.setAttribute('transform', 'translate(0,0)');
        animateTranslateYRaf(slot, 0, -lineHeight, duration, () => {
          slot.primary.textContent = nextCh;
          slot.secondary.textContent = nextCh;
          slot.inner.setAttribute('transform', 'translate(0,0)');
        });
      });
      return true;
    };

    const applyTextContent = (node, nextText) => {
      if (!node) return;
      const tag = (node.tagName || '').toLowerCase();
      if (tag === 'text') {
        const tspans = node.querySelectorAll(':scope > tspan');
        if (tspans && tspans.length) {
          tspans.forEach((tspan, index) => {
            const value = index === 0 ? nextText : '';
            if (tspan.textContent !== value) {
              tspan.textContent = value;
            }
          });
          return;
        }
      }
      if (node.textContent !== nextText) {
        node.textContent = nextText;
      }
    };

    const applyStaticTextTranslations = () => {
      const config = this._config || this.config || {};
      const heatPumpLabelOverride = (config && typeof config.heat_pump_label === 'string' && config.heat_pump_label.trim())
        ? config.heat_pump_label.trim()
        : '';

      const language = (viewState && typeof viewState.language === 'string' && viewState.language.trim())
        ? viewState.language.trim().toLowerCase()
        : 'en';

      let styleSyncScheduled = false;

      // Built-in static label translations.
      // Only applied when a translation exists; otherwise the SVG's existing (English) text remains.
      // Naming convention: <base>-text (e.g., daily-grid-import-text).
      const STATIC_TEXT_TRANSLATIONS = {
        // Static grid labels (extend as needed).
        'grid-current-power-text': {
          en: 'Current Grid Power:',
          it: 'Potenza di rete corrente:',
          de: 'Aktuelle Netzleistung:',
          fr: 'Puissance réseau actuelle :',
          nl: 'Huidig netvermogen:'
        },
        'grid-daily-export-text': {
          en: 'Daily Grid Export:',
          it: 'Export rete giornaliero:',
          de: 'Netzexport (Tag):',
          fr: 'Export réseau (jour) :',
          nl: 'Net-export (dag):'
        },
        'grid-daily-import-text': {
          en: 'Daily Grid Import:',
          it: 'Import rete giornaliero:',
          de: 'Netzimport (Tag):',
          fr: 'Import réseau (jour) :',
          nl: 'Net-import (dag):'
        },

        'house-load-text': {
          en: 'House:',
          it: 'Casa:',
          de: 'Haus:',
          fr: 'Maison :',
          nl: 'Huis:'
        },

        // Battery labels
        // NOTE: Use battery1-soc-text so the label pairs with battery1-soc and inherits
        // the Battery SOC styling (including threshold-based color).
        // 'battery1-soc-text': {
        //   en: 'B1 SOC:',
        //   it: 'B1 SOC:',
        //   de: 'B1 SOC:',
        //   fr: 'B1 SOC:',
        //   nl: 'B1 SOC:'
        // },

        // 'battery2-soc-text': {
        //   en: 'B2 SOC:',
        //   it: 'B2 SOC:',
        //   de: 'B2 SOC:',
        //   fr: 'B2 SOC:',
        //   nl: 'B2 SOC:'
        // },

        // 'battery1-power-text': {
        //   en: 'B1 Power:',
        //   it: 'B1 Power:',
        //   de: 'B1 Power:',
        //   fr: 'B1 Power:',
        //   nl: 'B1 Power:',
        //   // Style-sync from the Battery Power settings (font size + configured color)
        //   // rather than the per-battery flow color.
        //   linkTo: 'battery-power'
        // },

        // 'battery2-power-text': {
        //   en: 'B2 Power:',
        //   it: 'B2 Power:',
        //   de: 'B2 Power:',
        //   fr: 'B2 Power:',
        //   nl: 'B2 Power:',
        //   // Style-sync from the Battery Power settings (font size + configured color)
        //   // rather than the per-battery flow color.
        //   linkTo: 'battery-power'
        // },

         'battery1-soc-text': {
          en: 'B1 SOC:',
          it: 'B1 SOC:',
          de: 'B1 SOC:',
          fr: 'B1 SOC:',
          nl: 'B1 SOC:'
        },

        'battery2-soc-text': {
          en: 'B2 SOC:',
          it: 'B2 SOC:',
          de: 'B2 SOC:',
          fr: 'B2 SOC:',
          nl: 'B2 SOC:'
        },

        'battery1-power-text': {
          en: 'B1 Power:',
          it: 'B1 Power:',
          de: 'B1 Power:',
          fr: 'B1 Power:',
          nl: 'B1 Power:',
          // Style-sync from the Battery Power settings (font size + configured color)
          // rather than the per-battery flow color.
          linkTo: 'battery-power'
        },

        'battery2-power-text': {
          en: 'B2 Power:',
          it: 'B2 Power:',
          de: 'B2 Power:',
          fr: 'B2 Power:',
          nl: 'B2 Power:',
          // Style-sync from the Battery Power settings (font size + configured color)
          // rather than the per-battery flow color.
          linkTo: 'battery-power'
        },
       

        // Appliance labels
        'washing-machine-power-text': {
          en: 'Washer:',
          it: 'Lavatrice:',
          de: 'Waschmaschine:',
          fr: 'Lave-linge :',
          nl: 'Wasmachine:',
          linkTo: 'washing-machine-power'
        },
        // Back-compat / common typo: user may provide washing-machine-power="Washer:" expecting the label.
        // The translation system only targets roles ending in -text, so we alias it.
        'washing-machine-power': {
          en: 'Washer:',
          it: 'Lavatrice:',
          de: 'Waschmaschine:',
          fr: 'Lave-linge :',
          nl: 'Wasmachine:',
          linkTo: 'washing-machine-power'
        },
        'dryer-power-text': {
          en: 'Dryer:',
          it: 'Asciugatrice:',
          de: 'Trockner:',
          fr: 'Sèche-linge :',
          nl: 'Droger:',
          linkTo: 'dryer-power'
        },
        'refrigerator-power-text': {
          en: 'Fridge:',
          it: 'Frigo:',
          de: 'Kühlschrank:',
          fr: 'Réfrigérateur :',
          nl: 'Koelkast:',
          linkTo: 'refrigerator-power'
        },
        'heat-pump-power-text': {
          en: 'Heat Pump/AC:',
          it: 'Pompa di calore/Clima:',
          de: 'Wärmepumpe/Klima:',
          fr: 'PAC/Clim :',
          nl: 'Warmtepomp/AC:',
          linkTo: 'heat-pump-power'
        },
        'pool-power-text': {
          en: 'Pool:',
          it: 'Piscina:',
          de: 'Pool:',
          fr: 'Piscine :',
          nl: 'Zwembad:',
          linkTo: 'pool-power'
        },

        // Back-compat / alias examples.
        'daily-grid-import-text': {
          en: 'Daily Grid Import:',
          it: 'Import giornaliero rete:',
          de: 'Netzimport (Tag):',
          fr: 'Import réseau (jour) :',
          nl: 'Net-import (dag):'
        },
        'daily-grid-export-text': {
          en: 'Daily Grid Export:',
          it: 'Export giornaliero rete:',
          de: 'Netzexport (Tag):',
          fr: 'Export réseau (jour) :',
          nl: 'Net-export (dag):'
        }
      };

      // Optional external locale override hook (if you later add it):
      // localeStrings.staticText[role][lang]
      let localeStaticText = null;
      try {
        const localeStrings = (typeof this._getLocaleStrings === 'function') ? this._getLocaleStrings() : null;
        localeStaticText = (localeStrings && localeStrings.staticText) ? localeStrings.staticText : null;
      } catch (e) {
        localeStaticText = null;
      }

      const nodes = svgRoot.querySelectorAll('[data-role$="-text"]');
      if (!nodes || !nodes.length) return;

      const syncLabelStylesFromBase = () => {
        if (!nodes || !nodes.length) return;
        nodes.forEach((node) => {
          try {
            if (!node || typeof node.getAttribute !== 'function') return;
            const role = (node.getAttribute('data-role') || '').trim();
            if (!role || !role.endsWith('-text')) return;
            const entry = STATIC_TEXT_TRANSLATIONS[role];
            const explicitLinkTo = (entry && typeof entry === 'object') ? (entry.linkTo || entry._linkTo) : null;
            const baseRole = (typeof explicitLinkTo === 'string' && explicitLinkTo.trim())
              ? explicitLinkTo.trim()
              : role.slice(0, -5);
            if (!baseRole) return;

            const baseNode = svgRoot.querySelector(`[data-role="${baseRole}"]`);
            if (!baseNode) return;

            const baseTarget = getVisibilityTarget(baseNode) || baseNode;
            const labelTarget = getVisibilityTarget(node) || node;

            // Static labels should not remain hidden when they participate in configured styling.
            // Some base roles start with opacity:0 for animation, but the corresponding '*-text' label must stay visible.
            const labelDataStyle = ((node.getAttribute && node.getAttribute('data-style')) ? node.getAttribute('data-style') : '') || '';
            if (String(labelDataStyle).trim().toLowerCase() === 'config') {
              // Alignment convention for easier authoring:
              // - labels (*-text) are right-aligned
              // - values (base roles) are left-aligned
              try {
                if (labelTarget && typeof labelTarget.setAttribute === 'function') {
                  labelTarget.setAttribute('text-anchor', 'end');
                }
                if (labelTarget && labelTarget.style) {
                  labelTarget.style.textAnchor = 'end';
                  if (typeof labelTarget.style.setProperty === 'function') {
                    labelTarget.style.setProperty('text-anchor', 'end');
                  }
                }
              } catch (e) {
                // ignore
              }

              try {
                if (baseTarget && typeof baseTarget.setAttribute === 'function') {
                  baseTarget.setAttribute('text-anchor', 'start');
                }
                if (baseTarget && baseTarget.style) {
                  baseTarget.style.textAnchor = 'start';
                  if (typeof baseTarget.style.setProperty === 'function') {
                    baseTarget.style.setProperty('text-anchor', 'start');
                  }
                }
              } catch (e) {
                // ignore
              }

              if (labelTarget && typeof labelTarget.getAttribute === 'function' && labelTarget.getAttribute('opacity') === '0') {
                labelTarget.removeAttribute('opacity');
              }
              if (labelTarget && labelTarget.style) {
                  if (typeof labelTarget.style.setProperty === 'function') {
                    labelTarget.style.setProperty('opacity', '1', 'important');
                  } else {
                    labelTarget.style.opacity = '1';
                  }
              }
            }

            // Copy fill + font-size + font-family.
            // (Labels are static, but users still expect configured font-family to apply.)
            // Prefer runtime-styled fill over SVG's original fill="none".
            const fill = (() => {
              const normalize = (v) => {
                if (v === null || v === undefined) return '';
                const s = String(v).trim();
                if (!s) return '';
                const lower = s.toLowerCase();
                if (lower === 'none' || lower === 'transparent' || lower === 'rgba(0, 0, 0, 0)') return '';
                return s;
              };

              const fromStyle = normalize(baseTarget.style && baseTarget.style.fill);
              if (fromStyle) return fromStyle;

              const fromAttr = normalize(baseTarget.getAttribute && baseTarget.getAttribute('fill'));
              if (fromAttr) return fromAttr;

              try {
                return normalize(getComputedStyle(baseTarget).fill);
              } catch (e) {
                return '';
              }
            })();
            if (fill) {
              labelTarget.setAttribute('fill', fill);
              if (labelTarget.style) labelTarget.style.fill = fill;
            }

            const fontSize = (() => {
              // Prefer runtime-configured fontSize (style) over the SVG's original font-size attribute.
              const fromStyle = (baseTarget.style && baseTarget.style.fontSize) ? parseFloat(baseTarget.style.fontSize) : NaN;
              if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle;

              const raw = (baseTarget.getAttribute && baseTarget.getAttribute('font-size')) ? baseTarget.getAttribute('font-size') : null;
              const parsed = raw !== null ? Number(raw) : NaN;
              if (Number.isFinite(parsed) && parsed > 0) return parsed;

              try {
                const computed = parseFloat(getComputedStyle(baseTarget).fontSize);
                return (Number.isFinite(computed) && computed > 0) ? computed : NaN;
              } catch (e) {
                return NaN;
              }
            })();
            if (Number.isFinite(fontSize)) {
              labelTarget.setAttribute('font-size', String(fontSize));
              if (labelTarget.style) labelTarget.style.fontSize = `${fontSize}px`;
              const tag = (labelTarget.tagName || '').toLowerCase();
              if (tag === 'text') {
                const tspans = labelTarget.querySelectorAll(':scope > tspan');
                if (tspans && tspans.length) {
                  tspans.forEach((tspan) => {
                    tspan.setAttribute('font-size', String(fontSize));
                    if (tspan.style) tspan.style.fontSize = `${fontSize}px`;
                  });
                }
              }
            }

            const fontFamily = (() => {
              const normalize = (v) => {
                if (v === null || v === undefined) return '';
                const s = String(v).trim();
                if (!s) return '';
                const lower = s.toLowerCase();
                if (lower === 'inherit' || lower === 'initial' || lower === 'unset') return '';
                return s;
              };

              const fromStyle = normalize(baseTarget.style && baseTarget.style.fontFamily);
              if (fromStyle) return fromStyle;

              const fromAttr = normalize(baseTarget.getAttribute && baseTarget.getAttribute('font-family'));
              if (fromAttr) return fromAttr;

              try {
                return normalize(getComputedStyle(baseTarget).fontFamily);
              } catch (e) {
                return '';
              }
            })();
            if (fontFamily) {
              labelTarget.setAttribute('font-family', fontFamily);
              if (labelTarget.style) labelTarget.style.fontFamily = fontFamily;
            }
          } catch (e) {
            // ignore
          }
        });
      };

      nodes.forEach((node) => {
        if (!node || typeof node.getAttribute !== 'function') return;
        const role = (node.getAttribute('data-role') || '').trim();
        if (!role) return;

        const fromLocale = (() => {
          try {
            const entry = localeStaticText && localeStaticText[role];
            if (!entry) return null;
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object') {
              return entry[language] || entry.en || null;
            }
            return null;
          } catch (e) {
            return null;
          }
        })();

        const fromBuiltIn = (() => {
          const entry = STATIC_TEXT_TRANSLATIONS[role];
          if (!entry) return null;
          return entry[language] || entry.en || null;
        })();

        const translated = (role === 'heat-pump-power-text' && heatPumpLabelOverride)
          ? heatPumpLabelOverride
          : (fromLocale || fromBuiltIn);
        if (typeof translated === 'string' && translated.trim()) {
          applyTextContent(node, translated);
        }

        // Apply alignment + non-odometer font for config-styled static labels immediately
        // (before the rest of the bindings run), so odometer doesn't "jump" on the first update
        // due to anchor changes.
        try {
          const labelDataStyle = ((node.getAttribute && node.getAttribute('data-style')) ? node.getAttribute('data-style') : '') || '';
          if (String(labelDataStyle).trim().toLowerCase() === 'config') {
            const entry = STATIC_TEXT_TRANSLATIONS[role];
            const explicitLinkTo = (entry && typeof entry === 'object') ? (entry.linkTo || entry._linkTo) : null;
            const baseRole = (typeof explicitLinkTo === 'string' && explicitLinkTo.trim())
              ? explicitLinkTo.trim()
              : role.endsWith('-text') ? role.slice(0, -5) : '';

            const labelTarget = getVisibilityTarget(node) || node;
            if (labelTarget && typeof labelTarget.setAttribute === 'function') {
              labelTarget.setAttribute('text-anchor', 'end');
            }
            if (labelTarget && labelTarget.style) {
              labelTarget.style.textAnchor = 'end';
              if (typeof labelTarget.style.setProperty === 'function') {
                labelTarget.style.setProperty('text-anchor', 'end');
              }
            }

            // Labels are non-animated: always use the normal configured font, not the odometer font.
            if (typeof globalFontFamily === 'string' && globalFontFamily) {
              if (labelTarget && typeof labelTarget.setAttribute === 'function') {
                labelTarget.setAttribute('font-family', globalFontFamily);
              }
              if (labelTarget && labelTarget.style) {
                labelTarget.style.fontFamily = globalFontFamily;
              }
            }

            if (baseRole) {
              const baseNode = svgRoot.querySelector(`[data-role="${baseRole}"]`);
              if (baseNode) {
                const baseTarget = getVisibilityTarget(baseNode) || baseNode;
                if (baseTarget && typeof baseTarget.setAttribute === 'function') {
                  baseTarget.setAttribute('text-anchor', 'start');
                }
                if (baseTarget && baseTarget.style) {
                  baseTarget.style.textAnchor = 'start';
                  if (typeof baseTarget.style.setProperty === 'function') {
                    baseTarget.style.setProperty('text-anchor', 'start');
                  }
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
      });

      // Defer style syncing until after the rest of bindings update the base nodes.
      if (!styleSyncScheduled) {
        styleSyncScheduled = true;
        Promise.resolve().then(() => {
          styleSyncScheduled = false;
          syncLabelStylesFromBase();
        }).catch(() => {
          styleSyncScheduled = false;
        });
      }
    };

    const setRoleVisibilityOnly = (role, visible) => {
      if (!svgRoot) {
        return;
      }
      const nodes = svgRoot.querySelectorAll(`[data-role="${role.replace(/"/g, '\"')}"]`);
      if (!nodes || !nodes.length) {
        return;
      }
      const shouldShow = Boolean(visible);
      nodes.forEach((node) => {
        const target = getVisibilityTarget(node) || node;
        if (!target) {
          return;
        }
        if (target.style) {
          if (shouldShow && target.style.display === 'none') {
            target.style.display = '';
          } else if (!shouldShow && target.style.display !== 'none') {
            target.style.display = 'none';
          }
        }
        if (typeof target.getAttribute === 'function' && typeof target.removeAttribute === 'function') {
          if (shouldShow) {
            if (target.getAttribute('display') === 'none') {
              target.removeAttribute('display');
            }
            if (target.getAttribute('visibility') === 'hidden') {
              target.removeAttribute('visibility');
            }
          } else {
            target.setAttribute('display', 'none');
          }
        }
        if (this._odometerStates && typeof this._odometerStates.get === 'function') {
          const state = this._odometerStates.get(target);
          if (state && state.group && state.group.style) {
            state.group.style.display = shouldShow ? '' : 'none';
          }
        }
      });
    };

    const getBaseYForNode = (node) => {
      if (!node) {
        return Number.NaN;
      }
      const dataKey = 'luminaBaseY';
      let raw = (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, dataKey))
        ? node.dataset[dataKey]
        : undefined;
      if (raw === undefined && typeof node.getAttribute === 'function') {
        raw = node.getAttribute('data-lumina-base-y');
      }
      if (raw === undefined || raw === null) {
        const attr = typeof node.getAttribute === 'function' ? node.getAttribute('y') : null;
        if (attr !== null && attr !== '') {
          raw = attr;
        } else if (typeof node.getBBox === 'function') {
          try {
            const bbox = node.getBBox();
            if (bbox && Number.isFinite(bbox.y)) {
              raw = String(bbox.y);
            }
          } catch (e) {
            raw = null;
          }
        }
        if (raw === undefined || raw === null) {
          raw = '';
        }
        if (node.dataset) {
          node.dataset[dataKey] = raw;
        } else if (typeof node.setAttribute === 'function') {
          node.setAttribute('data-lumina-base-y', raw);
        }
      }
      if (raw === '' || raw === null || raw === undefined) {
        return Number.NaN;
      }
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    };

    const adjustTextNodeY = (textNode, offset) => {
      const safeOffset = Number.isFinite(offset) ? offset : 0;
      const baseY = getBaseYForNode(textNode);
      if (!Number.isFinite(baseY)) {
        return;
      }
      const nextY = baseY + safeOffset;
      try {
        textNode.setAttribute('y', String(nextY));
      } catch (e) {
        // ignore
      }
      const tspans = textNode.querySelectorAll(':scope > tspan');
      if (tspans && tspans.length) {
        tspans.forEach((tspan) => {
          const spanBaseY = getBaseYForNode(tspan);
          if (!Number.isFinite(spanBaseY)) {
            return;
          }
          try {
            tspan.setAttribute('y', String(spanBaseY + safeOffset));
          } catch (e) {
            // ignore
          }
        });
      }
      if (this._odometerStates && typeof this._odometerStates.get === 'function') {
        const state = this._odometerStates.get(textNode);
        if (state) {
          state.baseY = nextY;
          state.builtKey = '';
        }
      }
    };

    const applyRoleYOffset = (role, offset) => {
      if (!svgRoot) {
        return;
      }
      const safeOffset = Number.isFinite(offset) ? offset : 0;
      const nodes = svgRoot.querySelectorAll(`[data-role="${role.replace(/"/g, '\"')}"]`);
      if (!nodes || !nodes.length) {
        return;
      }
      nodes.forEach((node) => {
        const target = getVisibilityTarget(node) || node;
        if (!target) {
          return;
        }
        const dataKey = 'luminaYOffset';
        const prevRaw = (target.dataset && Object.prototype.hasOwnProperty.call(target.dataset, dataKey))
          ? target.dataset[dataKey]
          : (typeof target.getAttribute === 'function' ? target.getAttribute('data-lumina-y-offset') : undefined);
        const prev = (prevRaw === undefined || prevRaw === null || prevRaw === '')
          ? 0
          : Number.parseFloat(prevRaw);
        if (Number.isFinite(prev) && prev === safeOffset) {
          return;
        }
        if (target.dataset) {
          target.dataset[dataKey] = String(safeOffset);
        } else if (typeof target.setAttribute === 'function') {
          target.setAttribute('data-lumina-y-offset', String(safeOffset));
        }
        adjustTextNodeY(target, safeOffset);
      });
    };

    const updateRole = (role, text, options = {}) => {
      const nodes = svgRoot.querySelectorAll(`[data-role="${role}"]`);
      if (!nodes || nodes.length === 0) {
        return;
      }
      const visible = options.visible !== undefined ? Boolean(options.visible) : true;
      const display = visible ? 'inline' : 'none';
      const nextText = (text === null || text === undefined) ? '' : String(text);

      nodes.forEach((node) => {
        const visibilityTarget = getVisibilityTarget(node);
        const featureOwner = (() => {
          const vtTag = visibilityTarget ? (visibilityTarget.tagName || '').toLowerCase() : '';
          if (vtTag === 'text') return visibilityTarget;
          const tag = (node.tagName || '').toLowerCase();
          if (tag === 'text') return node;
          return (typeof node.closest === 'function') ? node.closest('text') : null;
        })();
        const nodeWantsAnimate = hasFeatureToken(featureOwner || node, 'animate');
        const nodeWantsOdometer = Boolean(options && options.odometer) || nodeWantsAnimate;
        const nodeOptionsBase = (nodeWantsAnimate && !(options && options.odometer))
          ? { ...options, odometer: true }
          : options;
        const nodeOptions = (nodeWantsOdometer && odometerFontFamily && !(typeof nodeOptionsBase.fontFamily === 'string' && nodeOptionsBase.fontFamily))
          ? { ...nodeOptionsBase, fontFamily: odometerFontFamily }
          : nodeOptionsBase;

        const useOdometer = Boolean(nodeOptions && nodeOptions.odometer);
        if (useOdometer && visibilityTarget && (visibilityTarget.tagName || '').toLowerCase() === 'text') {
          const hostText = visibilityTarget;
          let ok = false;
          try {
            ok = animateOdometerTo(hostText, nextText, nodeOptions);
          } catch (e) {
            ok = false;
          }
          if (ok) {
            const state = this._odometerStates.get(hostText);
            if (state && state.group) {
              if (state.group.style.display !== display) {
                state.group.style.display = display;
              }
              if (state.group.getAttribute('opacity') === '0') {
                state.group.removeAttribute('opacity');
              }
              if (state.group.style.opacity === '0') {
                state.group.style.opacity = '';
              }
            }

            // Keep the underlying SVG text node styled, even when hidden, so other helpers
            // (notably '*-text' label style inheritance) can read configured values.
            const applyStyle = shouldApplyConfiguredTextStyle(node, nodeOptions);
            if (applyStyle) {
              if (typeof nodeOptions.fill === 'string' && nodeOptions.fill) {
                hostText.setAttribute('fill', nodeOptions.fill);
                hostText.style.fill = nodeOptions.fill;
              }
              const resolvedFontFamily = (typeof nodeOptions.fontFamily === 'string' && nodeOptions.fontFamily)
                ? nodeOptions.fontFamily
                : (isConfigStyledTextNode(node) ? globalFontFamily : null);
              if (typeof resolvedFontFamily === 'string' && resolvedFontFamily) {
                hostText.setAttribute('font-family', resolvedFontFamily);
                hostText.style.fontFamily = resolvedFontFamily;
              }
              if (typeof nodeOptions.fontSize === 'number' && Number.isFinite(nodeOptions.fontSize)) {
                hostText.setAttribute('font-size', String(nodeOptions.fontSize));
                hostText.style.fontSize = `${nodeOptions.fontSize}px`;
                const tspans = hostText.querySelectorAll(':scope > tspan');
                if (tspans && tspans.length) {
                  tspans.forEach((tspan) => {
                    tspan.setAttribute('font-size', String(nodeOptions.fontSize));
                    tspan.style.fontSize = `${nodeOptions.fontSize}px`;
                  });
                }
              }
            }
            hostText.style.display = 'none';
            return;
          }
          // If odometer couldn't be applied, fall back to plain text.
          teardownOdometer(hostText);
        } else if (visibilityTarget && (visibilityTarget.tagName || '').toLowerCase() === 'text') {
          // Ensure we remove any prior odometer group when toggled off.
          teardownOdometer(visibilityTarget);
        }
        applyTextContent(node, nextText);
        if (visibilityTarget) {
          if (visibilityTarget.style.display !== display) {
            visibilityTarget.style.display = display;
          }
          if (display === 'inline') {
            if (visibilityTarget.getAttribute('display') === 'none') {
              visibilityTarget.removeAttribute('display');
            }
            if (visibilityTarget.getAttribute('visibility') === 'hidden') {
              visibilityTarget.removeAttribute('visibility');
            }
            if (visibilityTarget.getAttribute('opacity') === '0') {
              visibilityTarget.removeAttribute('opacity');
            }
            if (visibilityTarget.style.opacity === '0') {
              visibilityTarget.style.opacity = '';
            }
          }
        }
        const applyStyle = shouldApplyConfiguredTextStyle(node, nodeOptions);
        if (applyStyle) {
          if (typeof nodeOptions.fill === 'string' && nodeOptions.fill) {
            node.setAttribute('fill', nodeOptions.fill);
            node.style.fill = nodeOptions.fill;
          }
          const resolvedFontFamily = (typeof nodeOptions.fontFamily === 'string' && nodeOptions.fontFamily)
            ? nodeOptions.fontFamily
            : (isConfigStyledTextNode(node) ? globalFontFamily : null);
          if (typeof resolvedFontFamily === 'string' && resolvedFontFamily) {
            node.setAttribute('font-family', resolvedFontFamily);
            node.style.fontFamily = resolvedFontFamily;
          }

          // Normalize `text-align` for better cross-WebView consistency.
          try {
            if (node && node.style) {
              node.style.textAlign = 'left';
              if (typeof node.style.setProperty === 'function') {
                node.style.setProperty('text-align', 'left');
              }
            }
          } catch (e) {
            // ignore
          }
          if (typeof nodeOptions.fontSize === 'number' && Number.isFinite(nodeOptions.fontSize)) {
            node.setAttribute('font-size', String(nodeOptions.fontSize));
            node.style.fontSize = `${nodeOptions.fontSize}px`;

            const tag = (node.tagName || '').toLowerCase();
            if (tag === 'text') {
              const tspans = node.querySelectorAll(':scope > tspan');
              if (tspans && tspans.length) {
                tspans.forEach((tspan) => {
                  tspan.setAttribute('font-size', String(nodeOptions.fontSize));
                  tspan.style.fontSize = `${nodeOptions.fontSize}px`;
                });
              }
            } else if (tag === 'tspan') {
              const host = getVisibilityTarget(node);
              if (host && host !== node && host.style) {
                host.setAttribute('font-size', String(nodeOptions.fontSize));
                host.style.fontSize = `${nodeOptions.fontSize}px`;
              }
            }
          }
        }
      });

      // If this role has a paired static label (`${role}-text`), keep it in sync with
      // the final configured styles (font-family, size, fill) after updates.
      // This prevents labels from sticking to editor defaults like "Sans".
      try {
        if (role && !String(role).endsWith('-text')) {
          const labelNodes = svgRoot.querySelectorAll(`[data-role="${role}-text"]`);
          if (labelNodes && labelNodes.length) {
            // Read from the first base node's visibility target (text element).
            const baseNode = nodes[0];
            const baseTarget = getVisibilityTarget(baseNode) || baseNode;

            const baseFill = (baseTarget && baseTarget.style && baseTarget.style.fill) ? String(baseTarget.style.fill).trim() : '';
            const baseFontSize = (baseTarget && baseTarget.style && baseTarget.style.fontSize) ? parseFloat(baseTarget.style.fontSize) : NaN;
            const baseFontFamily = (baseTarget && baseTarget.style && baseTarget.style.fontFamily) ? String(baseTarget.style.fontFamily).trim() : '';

            labelNodes.forEach((ln) => {
              const labelTarget = getVisibilityTarget(ln) || ln;
              const ds = (labelTarget && typeof labelTarget.getAttribute === 'function') ? (labelTarget.getAttribute('data-style') || '') : '';
              if (String(ds).trim().toLowerCase() !== 'config') return;

              // Anchor + align: label right, value left
              try {
                labelTarget.setAttribute('text-anchor', 'end');
                if (labelTarget.style) {
                  labelTarget.style.textAnchor = 'end';
                  labelTarget.style.textAlign = 'right';
                  if (typeof labelTarget.style.setProperty === 'function') {
                    labelTarget.style.setProperty('text-anchor', 'end');
                    labelTarget.style.setProperty('text-align', 'right');
                  }
                  // Ensure visible
                  labelTarget.style.setProperty ? labelTarget.style.setProperty('opacity', '1', 'important') : (labelTarget.style.opacity = '1');
                }
                if (labelTarget.getAttribute && labelTarget.getAttribute('opacity') === '0') {
                  labelTarget.removeAttribute('opacity');
                }
              } catch (e) {
                // ignore
              }

              if (baseFill) {
                labelTarget.setAttribute('fill', baseFill);
                if (labelTarget.style) labelTarget.style.fill = baseFill;
              }
              if (Number.isFinite(baseFontSize) && baseFontSize > 0) {
                labelTarget.setAttribute('font-size', String(baseFontSize));
                if (labelTarget.style) labelTarget.style.fontSize = `${baseFontSize}px`;
                const tag = (labelTarget.tagName || '').toLowerCase();
                if (tag === 'text') {
                  const tspans = labelTarget.querySelectorAll(':scope > tspan');
                  if (tspans && tspans.length) {
                    tspans.forEach((tspan) => {
                      tspan.setAttribute('font-size', String(baseFontSize));
                      if (tspan.style) tspan.style.fontSize = `${baseFontSize}px`;
                    });
                  }
                }
              }
              if (baseFontFamily) {
                labelTarget.setAttribute('font-family', baseFontFamily);
                if (labelTarget.style) labelTarget.style.fontFamily = baseFontFamily;
              }
            });
          }
        }
      } catch (e) {
        // ignore
      }
    };

    // Apply translated static label nodes (data-role="*-text") after helpers are ready.
    applyStaticTextTranslations();

    const updateIndexedRoles = (prefix, lines, defaults = {}) => {
      const allNodes = svgRoot.querySelectorAll(`[data-role^="${prefix}-"]`);
      if (allNodes && allNodes.length) {
        allNodes.forEach((node) => {
          const visibilityTarget = getVisibilityTarget(node);
          const role = node.getAttribute('data-role') || '';
          const match = role.match(new RegExp(`^${prefix}-(\\d+)$`));
          const index = match ? Number(match[1]) : NaN;
          const line = Number.isFinite(index) && Array.isArray(lines) ? lines[index] : null;
          const visible = Boolean(line && line.visible);
          const display = visible ? 'inline' : 'none';
          if (visibilityTarget) {
            if (visibilityTarget.style.display !== display) {
              visibilityTarget.style.display = display;
            }
            if (display === 'inline') {
              if (visibilityTarget.getAttribute('display') === 'none') {
                visibilityTarget.removeAttribute('display');
              }
              if (visibilityTarget.getAttribute('visibility') === 'hidden') {
                visibilityTarget.removeAttribute('visibility');
              }
              if (visibilityTarget.getAttribute('opacity') === '0') {
                visibilityTarget.removeAttribute('opacity');
              }
              if (visibilityTarget.style.opacity === '0') {
                visibilityTarget.style.opacity = '';
              }
            }
          }
          const nextText = visible ? String(line.text || '') : '';
          applyTextContent(node, nextText);
          const applyStyle = shouldApplyConfiguredTextStyle(node, defaults);
          if (applyStyle) {
            const fill = (line && typeof line.fill === 'string' && line.fill) ? line.fill : defaults.fill;
            if (typeof fill === 'string' && fill) {
              node.setAttribute('fill', fill);
              node.style.fill = fill;
            }
            const resolvedFontFamily = (line && typeof line.fontFamily === 'string' && line.fontFamily)
              ? line.fontFamily
              : ((defaults && typeof defaults.fontFamily === 'string' && defaults.fontFamily)
                ? defaults.fontFamily
                : (isConfigStyledTextNode(node) ? globalFontFamily : null));
            if (typeof resolvedFontFamily === 'string' && resolvedFontFamily) {
              node.setAttribute('font-family', resolvedFontFamily);
              node.style.fontFamily = resolvedFontFamily;
            }
            const fontSize = (line && typeof line.fontSize === 'number' && Number.isFinite(line.fontSize))
              ? line.fontSize
              : defaults.fontSize;
            if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
              node.setAttribute('font-size', String(fontSize));
              node.style.fontSize = `${fontSize}px`;

              const tag = (node.tagName || '').toLowerCase();
              if (tag === 'text') {
                const tspans = node.querySelectorAll(':scope > tspan');
                if (tspans && tspans.length) {
                  tspans.forEach((tspan) => {
                    tspan.setAttribute('font-size', String(fontSize));
                    tspan.style.fontSize = `${fontSize}px`;
                  });
                }
              } else if (tag === 'tspan') {
                const host = getVisibilityTarget(node);
                if (host && host !== node && host.style) {
                  host.setAttribute('font-size', String(fontSize));
                  host.style.fontSize = `${fontSize}px`;
                }
              }
            }
          }
        });
      }

      if (Array.isArray(lines)) {
        lines.forEach((line, index) => {
          const lineFontSize = (line && typeof line.fontSize === 'number' && Number.isFinite(line.fontSize))
            ? line.fontSize
            : defaults.fontSize;
          updateRole(`${prefix}-${index}`, line.text || '', {
            visible: Boolean(line.visible),
            fill: line.fill || defaults.fill,
            fontSize: lineFontSize
          });
        });
      }
    };

    const syncTitleOverlayToRect = () => {
      try {
        const overlay = this._domRefs && this._domRefs.titleOverlay;
        if (!overlay) {
          return;
        }
        const hasTitle = Boolean(viewState && viewState.title && viewState.title.text);
        if (!hasTitle) {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
          return;
        }

        const titleText = String(viewState.title.text || '');
        overlay.textContent = titleText;
        overlay.style.display = 'flex';

        const fill = (viewState.title && typeof viewState.title.fill === 'string' && viewState.title.fill) ? viewState.title.fill : '';
        const bgFill = (viewState.titleBg && typeof viewState.titleBg.fill === 'string' && viewState.titleBg.fill) ? viewState.titleBg.fill : '';
        overlay.style.color = fill || '';
        overlay.style.background = bgFill || '';

        const svgEl = this._domRefs && this._domRefs.svgRoot;
        const cardEl = this._domRefs && this._domRefs.card;
        const rect = svgRoot.querySelector('[data-role="title-bg"]');
        if (!cardEl || !rect || typeof rect.getBoundingClientRect !== 'function') {
          overlay.style.left = '50%';
          overlay.style.top = '8px';
          overlay.style.transform = 'translateX(-50%)';
          return;
        }

        const rectBox = rect.getBoundingClientRect();
        const cardBox = cardEl.getBoundingClientRect();
        if (!rectBox || !cardBox || rectBox.width <= 0 || rectBox.height <= 0) {
          return;
        }

        const centerX = (rectBox.left - cardBox.left) + rectBox.width / 2;
        const centerY = (rectBox.top - cardBox.top) + rectBox.height / 2;

        // Padding request: make the background box roomy based on card size.
        // Horizontal ends: 4% of card width each side.
        // Top/bottom: 1% of card height each side.
        const paddingX = Math.max(0, cardBox.width * 0.04);
        const paddingY = Math.max(0, cardBox.height * 0.01);
        overlay.style.padding = `${paddingY}px ${paddingX}px`;

        // Center the overlay on the SVG title-bg rect.
        overlay.style.left = `${centerX}px`;
        overlay.style.top = `${centerY}px`;
        overlay.style.transform = 'translate(-50%, -50%)';

        let scaleX = 1;
        if (svgEl && typeof svgEl.getBoundingClientRect === 'function') {
          const svgBox = svgEl.getBoundingClientRect();
          if (svgBox && svgBox.width > 0) {
            scaleX = svgBox.width / SVG_DIMENSIONS.width;
          }
        }

        // Glow effect: match the title text color.
        const glowColor = fill || 'currentColor';
        const glowInset = Math.max(2, 8 * scaleX);
        const glowInner = Math.max(2, 3 * scaleX);
        const glowOuter = Math.max(3, 9 * scaleX);
        overlay.style.boxShadow = `inset 0 0 ${glowInset}px ${glowColor}, 0 0 ${glowInner}px ${glowColor}, 0 0 ${glowOuter}px ${glowColor}`;
        overlay.style.textShadow = `0 0 ${Math.max(2, 6 * scaleX)}px ${glowColor}`;

        const fontSizeBase = (viewState.title && typeof viewState.title.fontSize === 'number' && Number.isFinite(viewState.title.fontSize))
          ? viewState.title.fontSize
          : 16;
        const fontSizePx = Math.max(8, fontSizeBase * scaleX);
        overlay.style.fontSize = `${fontSizePx}px`;
        overlay.style.fontFamily = globalFontFamily || '';
        overlay.style.fontWeight = '900';
        overlay.style.letterSpacing = `${Math.max(0, 3 * scaleX)}px`;
        overlay.style.textTransform = 'uppercase';
        // Let padding + content determine size; keep it snug.
        overlay.style.width = 'max-content';
        overlay.style.height = 'auto';
      } catch (e) {
        // ignore
      }
    };

    const syncPvDailyOverlayToRect = () => {
      try {
        const overlay = this._domRefs && this._domRefs.pvDailyOverlay;
        if (!overlay) {
          return;
        }

        const pvDaily = viewState && viewState.pvDaily;
        const visible = Boolean(pvDaily && pvDaily.visible && pvDaily.text);
        if (!visible) {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
          return;
        }

        overlay.textContent = String(pvDaily.text || '');
        overlay.style.display = 'flex';

        const fill = (pvDaily && typeof pvDaily.fill === 'string' && pvDaily.fill) ? pvDaily.fill : '';
        const bgFill = (pvDaily && typeof pvDaily.bgFill === 'string' && pvDaily.bgFill) ? pvDaily.bgFill : '';
        overlay.style.color = fill || '';
        overlay.style.background = bgFill || '';

        const svgEl = this._domRefs && this._domRefs.svgRoot;
        const cardEl = this._domRefs && this._domRefs.card;
        const rect = svgRoot.querySelector('[data-role="pvDaily"]');
        // PV daily uses an SVG rect as an anchor. If it doesn't exist, don't show the overlay.
        if (!cardEl || !rect || typeof rect.getBoundingClientRect !== 'function') {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
          return;
        }

        const rectBox = rect.getBoundingClientRect();
        const cardBox = cardEl.getBoundingClientRect();
        if (!rectBox || !cardBox || rectBox.width <= 0 || rectBox.height <= 0) {
          return;
        }

        const centerX = (rectBox.left - cardBox.left) + rectBox.width / 2;
        const centerY = (rectBox.top - cardBox.top) + rectBox.height / 2;

        // Keep padding consistent with the title overlay sizing.
        const paddingX = Math.max(0, cardBox.width * 0.04);
        const paddingY = Math.max(0, cardBox.height * 0.01);
        overlay.style.padding = `${paddingY}px ${paddingX}px`;

        overlay.style.left = `${centerX}px`;
        overlay.style.top = `${centerY}px`;
        overlay.style.transform = 'translate(-50%, -50%)';

        let scaleX = 1;
        if (svgEl && typeof svgEl.getBoundingClientRect === 'function') {
          const svgBox = svgEl.getBoundingClientRect();
          if (svgBox && svgBox.width > 0) {
            scaleX = svgBox.width / SVG_DIMENSIONS.width;
          }
        }

        // Glow effect: match the PV daily text color.
        const glowColor = fill || 'currentColor';
        const glowInset = Math.max(2, 8 * scaleX);
        const glowInner = Math.max(2, 3 * scaleX);
        const glowOuter = Math.max(3, 9 * scaleX);
        overlay.style.boxShadow = `inset 0 0 ${glowInset}px ${glowColor}, 0 0 ${glowInner}px ${glowColor}, 0 0 ${glowOuter}px ${glowColor}`;
        overlay.style.textShadow = `0 0 ${Math.max(2, 6 * scaleX)}px ${glowColor}`;

        const fontSizeBase = (pvDaily && typeof pvDaily.fontSize === 'number' && Number.isFinite(pvDaily.fontSize))
          ? pvDaily.fontSize
          : 16;
        const fontSizePx = Math.max(8, fontSizeBase * scaleX);
        overlay.style.fontSize = `${fontSizePx}px`;
        overlay.style.fontFamily = globalFontFamily || '';
        overlay.style.fontWeight = '900';
        overlay.style.letterSpacing = `${Math.max(0, 1 * scaleX)}px`;
        overlay.style.textTransform = 'none';
        overlay.style.width = 'max-content';
        overlay.style.height = 'auto';
      } catch (e) {
        // ignore
      }
    };

    // Title + daily
    const hasTitleText = Boolean(viewState.title && viewState.title.text);

    updateRole('title-bg', '', {
      visible: hasTitleText,
      fill: viewState.titleBg ? viewState.titleBg.fill : undefined
    });

    // PV Daily anchor box (SVG rect) + HTML overlay text
    const pvDailyVisible = Boolean(viewState.pvDaily && viewState.pvDaily.visible);
    updateRole('pvDaily', '', {
      visible: pvDailyVisible,
      fill: (viewState.pvDaily && viewState.pvDaily.bgFill) ? viewState.pvDaily.bgFill : undefined
    });
    if (pvDailyVisible) {
      const pvDailyRect = svgRoot.querySelector('[data-role="pvDaily"]');
      if (pvDailyRect && pvDailyRect.style) {
        pvDailyRect.style.opacity = '0';
      }
    }
    syncPvDailyOverlayToRect();

    // Hide the SVG title text; keep the bg rect present (but invisible) so we can anchor the HTML overlay to it.
    updateRole('title-text', '', { visible: false });
    const titleBgRect = svgRoot.querySelector('[data-role="title-bg"]');
    if (titleBgRect && titleBgRect.style) {
      titleBgRect.style.opacity = '0';
    }
    syncTitleOverlayToRect();

    // Always run overlay sync once so switching modes hides/shows properly.
    syncTitleOverlayToRect();
    syncPvDailyOverlayToRect();

    if (!this._titleLayoutSyncScheduled) {
      this._titleLayoutSyncScheduled = true;
      requestAnimationFrame(() => {
        syncTitleOverlayToRect();
        syncPvDailyOverlayToRect();
        this._titleLayoutSyncScheduled = false;
      });
      if (document.fonts && typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(() => {
          syncTitleOverlayToRect();
          syncPvDailyOverlayToRect();
        }).catch(() => {
          // ignore
        });
      }
    }
    const dailyVisible = Boolean(viewState.daily && viewState.daily.visible);
    updateRole('daily-label', viewState.daily ? viewState.daily.label : '', {
      visible: dailyVisible,
      fontSize: viewState.daily ? viewState.daily.labelSize : undefined
    });
    updateRole('daily-value', viewState.daily ? viewState.daily.value : '', {
      visible: dailyVisible,
      fontSize: viewState.daily ? viewState.daily.valueSize : undefined
    });

    // PV lines
    updateIndexedRoles('pv-line', viewState.pv ? viewState.pv.lines : [], {
      fontSize: viewState.pv ? viewState.pv.fontSize : undefined
    });

    // PV Total (Array 1 + Array 2 combined, direct binding)
    updateRole('pv-total', viewState.pvTotal ? viewState.pvTotal.text : '', {
      visible: Boolean(viewState.pvTotal && viewState.pvTotal.visible),
      fill: viewState.pvTotal ? viewState.pvTotal.fill : undefined,
      fontSize: viewState.pvTotal ? viewState.pvTotal.fontSize : undefined
    });

    // PV Array 1 total (direct binding)
    updateRole('pv1-total', viewState.pv1Total ? viewState.pv1Total.text : '', {
      visible: Boolean(viewState.pv1Total && viewState.pv1Total.visible),
      fill: viewState.pv1Total ? viewState.pv1Total.fill : undefined,
      fontSize: viewState.pv1Total ? viewState.pv1Total.fontSize : undefined
    });

    // Resource-friendly text edge/outline effect.
    // Implemented as a black stroke on the face text (no clone layers, no filters).
    // Applies to all text nodes by default; opt out per node with data-feature="noborder".
    const applyTextEdgeToTextNode = (textNode, extrusionKey, options = {}) => {
      if (!textNode || !textNode.parentNode) return;
      const parent = textNode.parentNode;

      const key = (extrusionKey === null || extrusionKey === undefined) ? '' : String(extrusionKey);
      if (!key) return;

      // If a previous version created an extrusion group, remove it (outline-only mode).
      const group = parent.querySelector(`:scope > g[data-lumina-extrusion-for="${key}"]`);
      if (group && group.parentNode) {
        group.parentNode.removeChild(group);
      }

      const fontSize = (() => {
        const raw = textNode.getAttribute('font-size');
        const parsed = raw !== null ? Number(raw) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
        const fallback = Number(options.fontSize);
        return (Number.isFinite(fallback) && fallback > 0) ? fallback : 16;
      })();

      const strokeColor = (typeof options.strokeColor === 'string' && options.strokeColor.trim()) ? options.strokeColor.trim() : '#000';
      const strokeOpacity = Number.isFinite(Number(options.strokeOpacity)) ? Number(options.strokeOpacity) : 1;
      const strokeWidth = Number.isFinite(Number(options.strokeWidth))
        ? Number(options.strokeWidth)
        : Math.min(2.4, Math.max(0.8, fontSize * 0.12));

      const applyEdge = (node) => {
        if (!node) return;
        try {
          node.setAttribute('data-lumina-text-edge', '1');
          node.setAttribute('paint-order', 'stroke fill');
          node.setAttribute('stroke', strokeColor);
          node.setAttribute('stroke-opacity', String(strokeOpacity));
          node.setAttribute('stroke-width', String(strokeWidth));
          node.setAttribute('stroke-linejoin', 'round');
          node.setAttribute('stroke-miterlimit', '2');
        } catch (e) {
          // ignore
        }
        try {
          if (node.style) {
            node.style.paintOrder = 'stroke fill';
            if (typeof node.style.setProperty === 'function') {
              node.style.setProperty('paint-order', 'stroke fill', 'important');
              node.style.setProperty('stroke', strokeColor, 'important');
              node.style.setProperty('stroke-opacity', String(strokeOpacity), 'important');
              node.style.setProperty('stroke-width', String(strokeWidth), 'important');
              node.style.setProperty('stroke-linejoin', 'round', 'important');
              node.style.setProperty('stroke-miterlimit', '2', 'important');
            } else {
              node.style.stroke = strokeColor;
              node.style.strokeOpacity = String(strokeOpacity);
              node.style.strokeWidth = String(strokeWidth);
              node.style.strokeLinejoin = 'round';
              node.style.strokeMiterlimit = '2';
            }
          }
        } catch (e) {
          // ignore
        }
      };

      // Apply to the host text node.
      applyEdge(textNode);

      // Also apply to child tspans: Inkscape often writes per-tspan stroke/stroke-width in inline style,
      // which overrides the host <text> stroke-width and makes the outline appear "missing".
      try {
        const tag = (textNode.tagName || '').toLowerCase();
        if (tag === 'text' && typeof textNode.querySelectorAll === 'function') {
          const tspans = textNode.querySelectorAll('tspan');
          if (tspans && tspans.length) {
            tspans.forEach((tspan) => {
              try {
                if (hasFeatureToken(tspan, 'noborder')) return;
              } catch (e) {
                // ignore
              }
              applyEdge(tspan);
            });
          }
        }
      } catch (e) {
        // ignore
      }
    };

    const applyFixedExtrusionByFeature = () => {
      // Always remove any extrusion groups (outline-only mode no longer uses them).
      const allGroups = svgRoot.querySelectorAll('g[data-lumina-extrusion-for]');
      if (allGroups && allGroups.length) {
        allGroups.forEach((group) => {
          if (group.parentNode) group.parentNode.removeChild(group);
        });
      }

      const enabledTextNodes = new Set();
      // Apply to all <text> nodes, plus any role-bearing <tspan> nodes.
      // Some custom SVGs place data-role on a <tspan> (e.g. car1-name), which previously
      // missed the outline pass.
      const textNodes = svgRoot.querySelectorAll('text');
      const roleTspans = svgRoot.querySelectorAll('tspan[data-role]');
      let autoIndex = 0;
      const applyOne = (textNode) => {
        if (!textNode) return;
        if (hasFeatureToken(textNode, 'noborder')) return;

        const role = textNode.getAttribute ? (textNode.getAttribute('data-role') || '') : '';
        const id = textNode.getAttribute ? (textNode.getAttribute('id') || '') : '';
        const key = role ? `role:${role}` : (id ? `id:${id}` : `auto:${autoIndex++}`);
        enabledTextNodes.add(textNode);
        applyTextEdgeToTextNode(textNode, key, { strokeColor: '#000' });
      };
      if (textNodes && textNodes.length) textNodes.forEach(applyOne);
      if (roleTspans && roleTspans.length) roleTspans.forEach(applyOne);

      // Cleanup any previously-applied edge styling if the feature is no longer enabled
      // (or disabled globally / opted-out via noborder).
      const previouslyApplied = svgRoot.querySelectorAll('text[data-lumina-text-edge], tspan[data-lumina-text-edge]');
      if (previouslyApplied && previouslyApplied.length) {
        previouslyApplied.forEach((textNode) => {
          if (enabledTextNodes.has(textNode)) return;
          textNode.removeAttribute('data-lumina-text-edge');
          textNode.removeAttribute('paint-order');
          textNode.removeAttribute('stroke');
          textNode.removeAttribute('stroke-opacity');
          textNode.removeAttribute('stroke-width');
          textNode.removeAttribute('stroke-linejoin');
          textNode.removeAttribute('stroke-miterlimit');
          if (textNode.style) {
            textNode.style.paintOrder = '';
            textNode.style.stroke = '';
            textNode.style.strokeOpacity = '';
            textNode.style.strokeWidth = '';
            textNode.style.strokeLinejoin = '';
            textNode.style.strokeMiterlimit = '';
          }
        });
      }
    };
    applyFixedExtrusionByFeature();

    // PV Array 2 total (direct binding)
    updateRole('pv2-total', viewState.pv2Total ? viewState.pv2Total.text : '', {
      visible: Boolean(viewState.pv2Total && viewState.pv2Total.visible),
      fill: viewState.pv2Total ? viewState.pv2Total.fill : undefined,
      fontSize: viewState.pv2Total ? viewState.pv2Total.fontSize : undefined
    });

    // Windmill total (direct binding)
    updateRole('windmill-power', viewState.windmillPower ? viewState.windmillPower.text : '', {
      visible: Boolean(viewState.windmillPower && viewState.windmillPower.visible),
      fill: viewState.windmillPower ? viewState.windmillPower.fill : undefined,
      fontSize: viewState.windmillPower ? viewState.windmillPower.fontSize : undefined
    });

    // Battery
    // Legacy aggregated roles: prefer per-battery #1 values when present.
    const legacyBatterySoc = (viewState.battery1Soc && viewState.battery1Soc.visible)
      ? viewState.battery1Soc
      : viewState.batterySoc;
    const legacyBatteryPower = (viewState.battery1Power && viewState.battery1Power.visible)
      ? viewState.battery1Power
      : viewState.batteryPower;
    updateRole('battery-soc', legacyBatterySoc ? legacyBatterySoc.text : '', {
      visible: Boolean(legacyBatterySoc && legacyBatterySoc.visible),
      fill: legacyBatterySoc ? legacyBatterySoc.fill : undefined,
      fontSize: legacyBatterySoc ? legacyBatterySoc.fontSize : undefined
    });
    updateRole('battery-power', legacyBatteryPower ? legacyBatteryPower.text : '', {
      visible: Boolean(legacyBatteryPower && legacyBatteryPower.visible),
      fill: legacyBatteryPower ? legacyBatteryPower.fill : undefined,
      fontSize: legacyBatteryPower ? legacyBatteryPower.fontSize : undefined
    });

    // Individual batteries (power)
    updateRole('battery1', viewState.battery1 ? viewState.battery1.text : '', {
      visible: Boolean(viewState.battery1 && viewState.battery1.visible),
      fill: viewState.battery1 ? viewState.battery1.fill : undefined,
      fontSize: viewState.battery1 ? viewState.battery1.fontSize : undefined
    });
    updateRole('battery2', viewState.battery2 ? viewState.battery2.text : '', {
      visible: Boolean(viewState.battery2 && viewState.battery2.visible),
      fill: viewState.battery2 ? viewState.battery2.fill : undefined,
      fontSize: viewState.battery2 ? viewState.battery2.fontSize : undefined
    });
    updateRole('battery3', viewState.battery3 ? viewState.battery3.text : '', {
      visible: Boolean(viewState.battery3 && viewState.battery3.visible),
      fill: viewState.battery3 ? viewState.battery3.fill : undefined,
      fontSize: viewState.battery3 ? viewState.battery3.fontSize : undefined
    });

    // Individual batteries (SVG placeholders)
    updateRole('battery1-soc', viewState.battery1Soc ? viewState.battery1Soc.text : '', {
      visible: Boolean(viewState.battery1Soc && viewState.battery1Soc.visible),
      fill: viewState.battery1Soc ? viewState.battery1Soc.fill : undefined,
      fontSize: viewState.battery1Soc ? viewState.battery1Soc.fontSize : undefined
    });
    updateRole('battery1-power', viewState.battery1Power ? viewState.battery1Power.text : '', {
      visible: Boolean(viewState.battery1Power && viewState.battery1Power.visible),
      fill: viewState.battery1Power ? viewState.battery1Power.fill : undefined,
      fontSize: viewState.battery1Power ? viewState.battery1Power.fontSize : undefined
    });
    updateRole('battery2-soc', viewState.battery2Soc ? viewState.battery2Soc.text : '', {
      visible: Boolean(viewState.battery2Soc && viewState.battery2Soc.visible),
      fill: viewState.battery2Soc ? viewState.battery2Soc.fill : undefined,
      fontSize: viewState.battery2Soc ? viewState.battery2Soc.fontSize : undefined
    });
    updateRole('battery2-power', viewState.battery2Power ? viewState.battery2Power.text : '', {
      visible: Boolean(viewState.battery2Power && viewState.battery2Power.visible),
      fill: viewState.battery2Power ? viewState.battery2Power.fill : undefined,
      fontSize: viewState.battery2Power ? viewState.battery2Power.fontSize : undefined
    });
    updateRole('battery3-soc', viewState.battery3Soc ? viewState.battery3Soc.text : '', {
      visible: Boolean(viewState.battery3Soc && viewState.battery3Soc.visible),
      fill: viewState.battery3Soc ? viewState.battery3Soc.fill : undefined,
      fontSize: viewState.battery3Soc ? viewState.battery3Soc.fontSize : undefined
    });
    updateRole('battery3-power', viewState.battery3Power ? viewState.battery3Power.text : '', {
      visible: Boolean(viewState.battery3Power && viewState.battery3Power.visible),
      fill: viewState.battery3Power ? viewState.battery3Power.fill : undefined,
      fontSize: viewState.battery3Power ? viewState.battery3Power.fontSize : undefined
    });
    updateRole('battery4-soc', viewState.battery4Soc ? viewState.battery4Soc.text : '', {
      visible: Boolean(viewState.battery4Soc && viewState.battery4Soc.visible),
      fill: viewState.battery4Soc ? viewState.battery4Soc.fill : undefined,
      fontSize: viewState.battery4Soc ? viewState.battery4Soc.fontSize : undefined
    });
    updateRole('battery4-power', viewState.battery4Power ? viewState.battery4Power.text : '', {
      visible: Boolean(viewState.battery4Power && viewState.battery4Power.visible),
      fill: viewState.battery4Power ? viewState.battery4Power.fill : undefined,
      fontSize: viewState.battery4Power ? viewState.battery4Power.fontSize : undefined
    });

    // Load
    const hasLoadLines = Boolean(viewState.load && Array.isArray(viewState.load.lines) && viewState.load.lines.length);
    updateRole('load-power', viewState.load ? viewState.load.text : '', {
      visible: Boolean(viewState.load && !hasLoadLines),
      fill: viewState.load ? viewState.load.fill : undefined,
      fontSize: viewState.load ? viewState.load.fontSize : undefined
    });
    updateIndexedRoles('load-line', hasLoadLines ? viewState.load.lines : [], {
      fill: viewState.load ? viewState.load.fill : undefined,
      fontSize: viewState.load ? viewState.load.fontSize : undefined
    });

    // House load (SVG-embedded text)
    updateRole('house-load', viewState.houseLoad ? viewState.houseLoad.text : '', {
      visible: Boolean(viewState.houseLoad && viewState.houseLoad.visible),
      fill: viewState.houseLoad ? viewState.houseLoad.fill : undefined,
      fontSize: viewState.houseLoad ? viewState.houseLoad.fontSize : undefined,
      odometer: Boolean(viewState.houseLoad && viewState.houseLoad.odometer),
      odometerDuration: viewState.houseLoad ? viewState.houseLoad.odometerDuration : undefined
    });

    // Grid
    const showDailyGridConfig = Boolean(viewState && viewState.showDailyGrid);
    const gridCurrentYOffset = showDailyGridConfig ? 0 : GRID_CURRENT_HIDE_DAILY_OFFSET;
    applyRoleYOffset('grid-current-power-text', gridCurrentYOffset);
    applyRoleYOffset('grid-current-power', gridCurrentYOffset);
    updateRole('grid-power', viewState.grid ? viewState.grid.text : '', {
      visible: Boolean(viewState.grid),
      fill: viewState.grid ? viewState.grid.fill : undefined,
      fontSize: viewState.grid ? viewState.grid.fontSize : undefined
    });
    updateRole('grid-current-power', viewState.gridCurrentPower ? viewState.gridCurrentPower.text : '', {
      visible: Boolean(viewState.gridCurrentPower),
      fill: viewState.gridCurrentPower ? viewState.gridCurrentPower.fill : undefined,
      fontSize: viewState.gridCurrentPower ? viewState.gridCurrentPower.fontSize : undefined,
      odometer: Boolean(viewState.gridCurrentPower && viewState.gridCurrentPower.odometer),
      odometerDuration: viewState.gridCurrentPower ? viewState.gridCurrentPower.odometerDuration : undefined
    });
    const gridDailyImportVisible = Boolean(showDailyGridConfig && viewState.gridDailyImport && viewState.gridDailyImport.visible);
    updateRole('grid-daily-import', gridDailyImportVisible ? viewState.gridDailyImport.text : '', {
      visible: gridDailyImportVisible,
      fill: viewState.gridDailyImport ? viewState.gridDailyImport.fill : undefined,
      fontSize: viewState.gridDailyImport ? viewState.gridDailyImport.fontSize : undefined,
      odometer: Boolean(viewState.gridDailyImport && viewState.gridDailyImport.odometer),
      odometerDuration: viewState.gridDailyImport ? viewState.gridDailyImport.odometerDuration : undefined
    });
    const gridDailyExportVisible = Boolean(showDailyGridConfig && viewState.gridDailyExport && viewState.gridDailyExport.visible);
    updateRole('grid-daily-export', gridDailyExportVisible ? viewState.gridDailyExport.text : '', {
      visible: gridDailyExportVisible,
      fill: viewState.gridDailyExport ? viewState.gridDailyExport.fill : undefined,
      fontSize: viewState.gridDailyExport ? viewState.gridDailyExport.fontSize : undefined,
      odometer: Boolean(viewState.gridDailyExport && viewState.gridDailyExport.odometer),
      odometerDuration: viewState.gridDailyExport ? viewState.gridDailyExport.odometerDuration : undefined
    });
    updateIndexedRoles('grid-line', viewState.grid ? viewState.grid.lines : [], {
      fill: viewState.grid ? viewState.grid.fill : undefined,
      fontSize: viewState.grid ? viewState.grid.fontSize : undefined
    });
    setRoleVisibilityOnly('grid-daily-import-text', showDailyGridConfig);
    setRoleVisibilityOnly('grid-daily-export-text', showDailyGridConfig);
    setRoleVisibilityOnly('grid-daily-import', gridDailyImportVisible);
    setRoleVisibilityOnly('grid-daily-export', gridDailyExportVisible);

    // Heat pump
    const heatPumpVisible = Boolean(viewState.heatPump && viewState.heatPump.visible);
    updateRole('heat-pump-power', viewState.heatPump ? viewState.heatPump.text : '', {
      visible: heatPumpVisible,
      fill: viewState.heatPump ? viewState.heatPump.fill : undefined,
      fontSize: viewState.heatPump ? viewState.heatPump.fontSize : undefined
    });
    setRoleVisibilityOnly('heat-pump-power-text', heatPumpVisible);
    setRoleVisibilityOnly('hp-power-text', heatPumpVisible);

    // Alias for custom SVGs
    updateRole('hp-power', viewState.heatPump ? viewState.heatPump.text : '', {
      visible: heatPumpVisible,
      fill: viewState.heatPump ? viewState.heatPump.fill : undefined,
      fontSize: viewState.heatPump ? viewState.heatPump.fontSize : undefined
    });

    // Pool
    const poolVisible = Boolean(viewState.pool && viewState.pool.visible);
    updateRole('pool-power', viewState.pool ? viewState.pool.text : '', {
      visible: poolVisible,
      fill: viewState.pool ? viewState.pool.fill : undefined,
      fontSize: viewState.pool ? viewState.pool.fontSize : undefined
    });
    setRoleVisibilityOnly('pool-power-text', poolVisible);

    // Home appliances
    const washingMachineVisible = Boolean(viewState.washingMachine && viewState.washingMachine.visible);
    updateRole('washing-machine-power', viewState.washingMachine ? viewState.washingMachine.text : '', {
      visible: washingMachineVisible,
      fill: viewState.washingMachine ? viewState.washingMachine.fill : undefined,
      fontSize: viewState.washingMachine ? viewState.washingMachine.fontSize : undefined
    });
    setRoleVisibilityOnly('washing-machine-power-text', washingMachineVisible);
    const dryerVisible = Boolean(viewState.dryer && viewState.dryer.visible);
    updateRole('dryer-power', viewState.dryer ? viewState.dryer.text : '', {
      visible: dryerVisible,
      fill: viewState.dryer ? viewState.dryer.fill : undefined,
      fontSize: viewState.dryer ? viewState.dryer.fontSize : undefined
    });
    setRoleVisibilityOnly('dryer-power-text', dryerVisible);
    const refrigeratorVisible = Boolean(viewState.refrigerator && viewState.refrigerator.visible);
    updateRole('refrigerator-power', viewState.refrigerator ? viewState.refrigerator.text : '', {
      visible: refrigeratorVisible,
      fill: viewState.refrigerator ? viewState.refrigerator.fill : undefined,
      fontSize: viewState.refrigerator ? viewState.refrigerator.fontSize : undefined
    });
    setRoleVisibilityOnly('refrigerator-power-text', refrigeratorVisible);

    // Cars
    const car1Visible = Boolean(viewState.car1 && viewState.car1.visible);
    updateRole('car1-label', viewState.car1 && viewState.car1.label ? viewState.car1.label.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.label ? viewState.car1.label.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.label ? viewState.car1.label.fontSize : undefined
    });
    updateRole('car1-name', viewState.car1 && viewState.car1.label ? viewState.car1.label.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.label ? viewState.car1.label.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.label ? viewState.car1.label.fontSize : undefined
    });
    updateRole('car1-power', viewState.car1 && viewState.car1.power ? viewState.car1.power.text : '', {
      visible: car1Visible,
      fill: viewState.car1 && viewState.car1.power ? viewState.car1.power.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.power ? viewState.car1.power.fontSize : undefined
    });
    const car1SocVisible = Boolean(viewState.car1 && viewState.car1.soc && viewState.car1.soc.visible);
    updateRole('car1-soc', viewState.car1 && viewState.car1.soc ? viewState.car1.soc.text : '', {
      visible: car1SocVisible,
      fill: viewState.car1 && viewState.car1.soc ? viewState.car1.soc.fill : undefined,
      fontSize: viewState.car1 && viewState.car1.soc ? viewState.car1.soc.fontSize : undefined
    });

    const car2Visible = Boolean(viewState.car2 && viewState.car2.visible);
    updateRole('car2-label', viewState.car2 && viewState.car2.label ? viewState.car2.label.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.label ? viewState.car2.label.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.label ? viewState.car2.label.fontSize : undefined
    });
    updateRole('car2-name', viewState.car2 && viewState.car2.label ? viewState.car2.label.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.label ? viewState.car2.label.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.label ? viewState.car2.label.fontSize : undefined
    });
    updateRole('car2-power', viewState.car2 && viewState.car2.power ? viewState.car2.power.text : '', {
      visible: car2Visible,
      fill: viewState.car2 && viewState.car2.power ? viewState.car2.power.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.power ? viewState.car2.power.fontSize : undefined
    });
    const car2SocVisible = Boolean(viewState.car2 && viewState.car2.soc && viewState.car2.soc.visible);
    updateRole('car2-soc', viewState.car2 && viewState.car2.soc ? viewState.car2.soc.text : '', {
      visible: car2SocVisible,
      fill: viewState.car2 && viewState.car2.soc ? viewState.car2.soc.fill : undefined,
      fontSize: viewState.car2 && viewState.car2.soc ? viewState.car2.soc.fontSize : undefined
    });
  }

  _handleDebugPointerMove(event) {
    // Additional safety check in case DEBUG_GRID_ENABLED is accidentally enabled
    if (!DEBUG_GRID_ENABLED || !this._domRefs || !this._domRefs.svgRoot || !this.shadowRoot) {
      return;
    }
    try {
      const rect = this._domRefs.svgRoot.getBoundingClientRect();
      const width = rect.width || 0;
      const height = rect.height || 0;
      if (width === 0 || height === 0) {
        return;
      }
      const relativeX = ((event.clientX - rect.left) / width) * SVG_DIMENSIONS.width;
      const relativeY = ((event.clientY - rect.top) / height) * SVG_DIMENSIONS.height;
      this._setDebugCoordinateText(relativeX, relativeY);
    } catch (error) {
      // Silently handle any DOM access errors
      console.warn('Debug pointer move error:', error);
      return;
    }
  }

  _handleDebugPointerLeave() {
    if (!DEBUG_GRID_ENABLED) {
      return;
    }
    this._setDebugCoordinateText(null, null);
  }

  _setDebugCoordinateText(x, y) {
    if (!DEBUG_GRID_ENABLED || !this._domRefs || !this._domRefs.debugCoords) {
      return;
    }
    try {
      const node = this._domRefs.debugCoords;
      if (x === null || y === null || Number.isNaN(Number(x)) || Number.isNaN(Number(y))) {
        // Show layer status when not hovering
        const layers = [];
        if (DEBUG_LAYER_NOSOLAR_ENABLED) layers.push('NoSolar');
        if (DEBUG_LAYER_1ARRAY_ENABLED) layers.push('1Array');
        if (DEBUG_LAYER_2ARRAY_ENABLED) layers.push('2Array');
        const layerText = layers.length > 0 ? ` | DEBUG: ${layers.join(', ')}` : '';
        node.textContent = `X: ---, Y: ---${layerText}`;
        this._debugCoordsActive = false;
        return;
      }
      const clampedX = Math.max(0, Math.min(Math.round(x), SVG_DIMENSIONS.width));
      const clampedY = Math.max(0, Math.min(Math.round(y), SVG_DIMENSIONS.height));
      const formattedX = clampedX.toString().padStart(3, '0');
      const formattedY = clampedY.toString().padStart(3, '0');
      node.textContent = `X: ${formattedX}, Y: ${formattedY}`;
      this._debugCoordsActive = true;
    } catch (error) {
      // Silently handle any DOM access errors
      console.warn('Debug coordinate text error:', error);
      return;
    }
  }

  _attachEventListeners() {
    if (!this.shadowRoot || !this._domRefs) return;

    // Delegate SVG clicks using data-action="popup:<type>" (pv/house/battery/grid/inverter)
    const svgRoot = this._domRefs.svgRoot;
    if (this._listenersAttachedTo.svgRoot && this._listenersAttachedTo.svgRoot !== svgRoot) {
      try {
        this._listenersAttachedTo.svgRoot.removeEventListener('click', this._handlePopupSvgClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.svgRoot = null;
    }
    if (svgRoot && this._listenersAttachedTo.svgRoot !== svgRoot) {
      try {
        svgRoot.addEventListener('click', this._handlePopupSvgClickBound);
        this._listenersAttachedTo.svgRoot = svgRoot;
      } catch (e) {
        // ignore
      }
    }

    // Close popup when clicking the backdrop (outside) or the popup itself
    const popupBackdrop = this._domRefs.popupBackdrop;
    if (this._listenersAttachedTo.popupBackdrop && this._listenersAttachedTo.popupBackdrop !== popupBackdrop) {
      try {
        this._listenersAttachedTo.popupBackdrop.removeEventListener('click', this._handlePopupBackdropClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.popupBackdrop = null;
    }
    if (popupBackdrop && this._listenersAttachedTo.popupBackdrop !== popupBackdrop) {
      try {
        popupBackdrop.addEventListener('click', this._handlePopupBackdropClickBound);
        this._listenersAttachedTo.popupBackdrop = popupBackdrop;
      } catch (e) {
        // ignore
      }
    }

    const popupOverlay = this._domRefs.popupOverlay;
    if (this._listenersAttachedTo.popupOverlay && this._listenersAttachedTo.popupOverlay !== popupOverlay) {
      try {
        this._listenersAttachedTo.popupOverlay.removeEventListener('click', this._handlePopupOverlayClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.popupOverlay = null;
    }
    if (popupOverlay && this._listenersAttachedTo.popupOverlay !== popupOverlay) {
      try {
        popupOverlay.addEventListener('click', this._handlePopupOverlayClickBound);
        this._listenersAttachedTo.popupOverlay = popupOverlay;
      } catch (e) {
        // ignore
      }
    }

    // Debug pointer listeners (optional)
    if (DEBUG_GRID_ENABLED && svgRoot && this.shadowRoot) {
      if (this._listenersAttachedTo.debugSvgRoot && this._listenersAttachedTo.debugSvgRoot !== svgRoot) {
        try {
          this._listenersAttachedTo.debugSvgRoot.removeEventListener('pointermove', this._handleDebugPointerMove);
          this._listenersAttachedTo.debugSvgRoot.removeEventListener('pointerleave', this._handleDebugPointerLeave);
        } catch (e) {
          // ignore
        }
        this._listenersAttachedTo.debugSvgRoot = null;
      }
      if (this._listenersAttachedTo.debugSvgRoot !== svgRoot) {
        try {
          svgRoot.addEventListener('pointermove', this._handleDebugPointerMove);
          svgRoot.addEventListener('pointerleave', this._handleDebugPointerLeave);
          this._listenersAttachedTo.debugSvgRoot = svgRoot;
        } catch (error) {
          console.warn('Failed to attach debug event listeners:', error);
        }
      }
    }

    const echoAliveContainer = this._domRefs ? this._domRefs.echoAliveContainer : null;
    if (this._listenersAttachedTo.echoAliveContainer && this._listenersAttachedTo.echoAliveContainer !== echoAliveContainer) {
      try {
        this._listenersAttachedTo.echoAliveContainer.removeEventListener('click', this._handleEchoAliveClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.echoAliveContainer = null;
    }
    if (echoAliveContainer && this._listenersAttachedTo.echoAliveContainer !== echoAliveContainer) {
      try {
        echoAliveContainer.addEventListener('click', this._handleEchoAliveClickBound, true);
        this._listenersAttachedTo.echoAliveContainer = echoAliveContainer;
      } catch (e) {
        // ignore
      }
    }
  }

  _handleEchoAliveClick(event) {
    try {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const container = (event && event.currentTarget)
        ? event.currentTarget
        : (this._domRefs ? this._domRefs.echoAliveContainer : null);
      if (!container) {
        return;
      }
      if (this._echoAliveClickTimeout) {
        try {
          clearTimeout(this._echoAliveClickTimeout);
        } catch (e) {
          // ignore
        }
        this._echoAliveClickTimeout = null;
      }
      if (typeof container.classList?.add === 'function') {
        container.classList.add('clicked');
      }
      console.log('Echo Alive click detected; keeping Silk browser awake.');
      this._echoAliveClickTimeout = setTimeout(() => {
        try {
          if (typeof container.classList?.remove === 'function') {
            container.classList.remove('clicked');
          }
        } catch (e) {
          // ignore
        } finally {
          this._echoAliveClickTimeout = null;
        }
      }, 500);
    } catch (error) {
      console.warn('Echo alive click handler error:', error);
    }
  }

  _handlePopupSvgClick(event) {
    try {
      const target = event && event.target;
      const svgRoot = this._domRefs && this._domRefs.svgRoot ? this._domRefs.svgRoot : null;

      // Some HA/SVG environments don't support Element.closest on SVG nodes reliably.
      // Use composedPath first, then fall back to walking up the DOM tree.
      let actionEl = null;
      if (event && typeof event.composedPath === 'function') {
        const path = event.composedPath();
        if (Array.isArray(path)) {
          actionEl = path.find((n) => n && typeof n.getAttribute === 'function' && n.getAttribute('data-action')) || null;
        }
      }

      if (!actionEl && target) {
        let node = target;
        while (node && node !== svgRoot && node !== this.shadowRoot) {
          if (node && typeof node.getAttribute === 'function') {
            const a = node.getAttribute('data-action');
            if (a) {
              actionEl = node;
              break;
            }
          }
          node = node.parentNode;
        }

      }

      if (!actionEl) {
        return;
      }

      const action = actionEl.getAttribute('data-action');
      if (!action || typeof action !== 'string') {
        return;
      }
      const trimmed = action.trim();
      if (!trimmed.toLowerCase().startsWith('popup:')) {
        return;
      }
      const type = trimmed.slice(6).trim().toLowerCase();
      if (!type) {
        return;
      }

      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      this._togglePopupOverlay(type);
    } catch (e) {
      // ignore
    }
  }

  _togglePopupOverlay(type) {
    const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
    if (!normalized) {
      return;
    }
    const allowed = ['pv', 'house', 'battery', 'grid', 'inverter'];
    if (!allowed.includes(normalized)) {
      return;
    }

    // Popups are driven by explicit SVG click zones (data-action="popup:*") and the
    // configured popup entities; they should not depend on whether a given UI section
    // (like PV) is currently enabled.

    if (this._activePopup === normalized) {
      this._closePopupOverlay();
      return;
    }

    const opened = this._openPopupOverlay(normalized);
    if (!opened) {
      this._closePopupOverlay();
    }
  }

  _openPopupOverlay(type) {
    if (!this._domRefs) {
      this._cacheDomReferences();
    }
    const refs = this._domRefs;
    if (!refs || !refs.popupBackdrop || !refs.popupOverlay || !refs.popupLines) {
      return false;
    }

    const config = this._config || this.config || {};
    const prefixMap = {
      pv: 'sensor_popup_pv_',
      house: 'sensor_popup_house_',
      battery: 'sensor_popup_bat_',
      grid: 'sensor_popup_grid_',
      inverter: 'sensor_popup_inverter_'
    };
    const prefix = prefixMap[type];
    if (!prefix) {
      return false;
    }

    const lineData = [];
    for (let i = 1; i <= 6; i++) {
      const entityKey = `${prefix}${i}`;
      const nameKey = `${entityKey}_name`;
      const fontKey = `${entityKey}_font_size`;
      const colorKey = `${entityKey}_color`;

      const entityIdRaw = config[entityKey];
      const entityId = typeof entityIdRaw === 'string' ? entityIdRaw.trim() : entityIdRaw;
      if (!entityId) {
        continue;
      }
      const valueText = this.formatPopupValue(null, entityId);
      if (!valueText) {
        continue;
      }

      const nameOverride = config[nameKey];
      const name = (typeof nameOverride === 'string' && nameOverride.trim())
        ? nameOverride.trim()
        : this.getEntityName(entityId);

      const fontSize = Number(config[fontKey]) || 16;
      const color = (typeof config[colorKey] === 'string' && config[colorKey]) ? config[colorKey] : '#80ffff';

      lineData.push({
        text: `${name}: ${valueText}`,
        fontSize,
        color
      });
    }

    if (!lineData.length) {
      return false;
    }

    // Render lines
    refs.popupLines.innerHTML = '';
    lineData.forEach((line) => {
      const div = document.createElement('div');
      div.className = 'popup-line';
      div.textContent = line.text;
      div.style.color = line.color;
      refs.popupLines.appendChild(div);
    });

    // Show
    refs.popupBackdrop.style.display = 'block';
    refs.popupOverlay.style.display = 'block';
    refs.popupOverlay.style.visibility = 'hidden';

    // Apply SVG->px scaling for font sizes and sizing constraints
    let scaleX = 1;
    const svgEl = refs.svgRoot;
    if (svgEl && typeof svgEl.getBoundingClientRect === 'function') {
      const svgBox = svgEl.getBoundingClientRect();
      if (svgBox && svgBox.width > 0) {
        scaleX = svgBox.width / SVG_DIMENSIONS.width;
      }
    }

    const paddingX = Math.max(8, 20 * scaleX);
    const paddingY = Math.max(8, 20 * scaleX);
    refs.popupOverlay.style.padding = `${paddingY}px ${paddingX}px`;
    refs.popupOverlay.style.minWidth = `${Math.max(0, 240 * scaleX)}px`;
    refs.popupOverlay.style.maxWidth = `${Math.max(0, 540 * scaleX)}px`;

    const children = Array.from(refs.popupLines.children);
    children.forEach((child, idx) => {
      const base = lineData[idx] && Number.isFinite(lineData[idx].fontSize) ? lineData[idx].fontSize : 16;
      child.style.fontSize = `${Math.max(8, base * scaleX)}px`;
    });

    this._activePopup = type;
    this._syncPopupOverlayToAnchor();
    refs.popupOverlay.style.visibility = 'visible';

    // Re-sync after layout/fonts settle
    requestAnimationFrame(() => {
      this._syncPopupOverlayToAnchor();
    });
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(() => {
        this._syncPopupOverlayToAnchor();
      }).catch(() => {
        // ignore
      });
    }

    return true;
  }

  _closePopupOverlay() {
    if (!this._domRefs) {
      return;
    }
    const refs = this._domRefs;
    if (refs.popupOverlay) {
      refs.popupOverlay.style.display = 'none';
    }
    if (refs.popupBackdrop) {
      refs.popupBackdrop.style.display = 'none';
    }
    this._activePopup = null;
  }

  _syncPopupOverlayToAnchor() {
    try {
      const refs = this._domRefs;
      if (!refs || !refs.popupOverlay || refs.popupOverlay.style.display === 'none') {
        return;
      }
      const svgRoot = refs.svgRoot;
      const cardEl = refs.card;
      if (!svgRoot || !cardEl) {
        return;
      }

      const anchor = svgRoot.querySelector('[data-role="popup-anchor"]');
      if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
        // Fallback: center of card
        refs.popupOverlay.style.left = '50%';
        refs.popupOverlay.style.top = '50%';
        refs.popupOverlay.style.transform = 'translate(-50%, -50%)';
        return;
      }

      const anchorBox = anchor.getBoundingClientRect();
      const cardBox = cardEl.getBoundingClientRect();
      if (!anchorBox || !cardBox || anchorBox.width <= 0 || anchorBox.height <= 0) {
        return;
      }

      const centerX = (anchorBox.left - cardBox.left) + anchorBox.width / 2;
      const centerY = (anchorBox.top - cardBox.top) + anchorBox.height / 2;

      refs.popupOverlay.style.left = `${centerX}px`;
      refs.popupOverlay.style.top = `${centerY}px`;
      refs.popupOverlay.style.transform = 'translate(-50%, -50%)';
    } catch (e) {
      // ignore
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
      heatPump: { ...viewState.heatPump },
      pool: viewState.pool ? { ...viewState.pool } : undefined,
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
      headlightFlash: viewState.headlightFlash ? {
        enabled: Boolean(viewState.headlightFlash.enabled),
        car1: viewState.headlightFlash.car1 ? { ...viewState.headlightFlash.car1 } : undefined,
        car2: viewState.headlightFlash.car2 ? { ...viewState.headlightFlash.car2 } : undefined
      } : undefined,
      showDebugGrid: Boolean(viewState.showDebugGrid)
    };
  }

  static get version() {
    return '2.0.1b3';
  }
}

// if (!customElements.get('lumina-energy-card')) {
//   customElements.define('lumina-energy-card', LuminaEnergyCard;
// }

if (!customElements.get('lumina-energy-card')) {
  customElements.define('lumina-energy-card', LuminaEnergyCard);
}

// class LuminaEnergyCardEditor extends HTMLElement {

class LuminaEnergyCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._isEditing = false;
    this._pendingConfigChange = false;
    this._defaults = (typeof LuminaEnergyCard !== 'undefined' && typeof LuminaEnergyCard.getStubConfig === 'function')
      ? { ...LuminaEnergyCard.getStubConfig() }
      : {};
    this._strings = this._buildStrings();
    this._sectionOpenState = {};

    // Avoid losing focus while typing: HA may rebuild the editor when it receives
    // a debounced config-changed event. We therefore defer dispatching config-changed
    // until the user finishes interacting (focus leaves the editor).
    this.shadowRoot.addEventListener('focusin', () => {
      this._isEditing = true;
    }, true);
    this.shadowRoot.addEventListener('focusout', (ev) => {
      const next = ev.relatedTarget;
      const stillInside = next && this.shadowRoot && this.shadowRoot.contains(next);
      if (stillInside) {
        return;
      }
      this._isEditing = false;
      if (this._pendingConfigChange && this._config) {
        this._pendingConfigChange = false;
        this.configChanged(this._config);
      }
    }, true);
  }

  _migrateBackgroundFilenames(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }
    const next = { ...config };

    const replaceFilename = (value, from, to) => {
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return value;
      }
      if (trimmed === from) {
        return to;
      }
      const suffix = `/${from}`;
      if (trimmed.endsWith(suffix)) {
        return trimmed.slice(0, -from.length) + to;
      }
      if (trimmed.includes(from)) {
        return trimmed.replace(from, to);
      }
      return value;
    };

    next.background_day = replaceFilename(next.background_day, 'lumina-new-day.svg', 'lumina-modern-day.svg');
    next.background_night = replaceFilename(next.background_night, 'lumina-new-night.svg', 'lumina-modern-night.svg');

    next.background_image = replaceFilename(next.background_image, 'lumina-new-day.svg', 'lumina-modern-day.svg');
    next.background_image = replaceFilename(next.background_image, 'lumina-new-night.svg', 'lumina-modern-night.svg');

    return next;
  }

  _buildStrings() {
    return {
      en: {
        sections: {
          general: { title: 'General Settings', helper: 'Card metadata, background, language, and update cadence.' },
          pvCommon: { title: 'Solar/PV Common', helper: 'Common Solar/PV settings shared across arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Choose the PV, battery, grid, load, and EV entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          windmill: { title: 'Windmill', helper: 'Configure windmill generator sensors and display styling.' },
          battery: { title: 'Battery', helper: 'Configure battery entities.' },
          grid: { title: 'Grid', helper: 'Configure grid entities.' },
          car: { title: 'Car', helper: 'Configure EV entities.' },
          other: { title: 'House', helper: 'Additional sensors and advanced toggles.' },
          pvPopup: { title: 'PV Popup', helper: 'Configure entities for the PV popup display.' },
          housePopup: { title: 'House Popup', helper: 'Configure entities for the house popup display.' },
          batteryPopup: { title: 'Battery Popup', helper: 'Configure battery popup display.' },
          gridPopup: { title: 'Grid Popup', helper: 'Configure entities for the grid popup display.' },
          inverterPopup: { title: 'Inverter Popup', helper: 'Configure entities for the inverter popup display.' },
          colors: { title: 'Color & Thresholds', helper: 'Configure grid thresholds and accent colours for flows and EV display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Card Title', helper: 'Title displayed at the top of the card. Leave blank to disable.' },
          title_text_color: { label: 'Title Text Color', helper: 'Overrides the fill color for [data-role="title-text"]. Leave blank to keep the SVG styling.' },
          title_bg_color: { label: 'Title Background Color', helper: 'Overrides the fill color for [data-role="title-bg"]. Leave blank to keep the SVG styling.' },
          font_family: { label: 'Font Family', helper: 'CSS font-family used for all SVG text (e.g., sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Odometer Font Family (Monospace)', helper: 'Font family used only for odometer-animated values. Leave blank to reuse Font Family. Tip: pick a monospace variant (e.g., "Roboto Mono" or "Space Mono").' },
          background_day: { label: 'Background Day', helper: 'Path to the day background SVG (e.g., /local/community/lumina-energy-card/lumina_background_day.svg).' },
          background_night: { label: 'Background Night', helper: 'Path to the night background SVG (e.g., /local/community/lumina-energy-card/lumina_background_night.svg).' },
          background_image: { label: 'Background Image Path', helper: 'Legacy single-path background setting (kept for backward compatibility).' },
          night_mode: { label: 'Day/Night Mode', helper: 'Select Day, Night, or Auto. Auto uses sun.sun: above_horizon = Day, below_horizon = Night.' },
          language: { label: 'Language', helper: 'Choose the editor language.' },
          display_unit: { label: 'Display Unit', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Update Interval', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          animation_speed_factor: { label: 'Animation Speed Factor', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Day Animation Style', helper: 'Flow animation style used when the card is in Day mode.' },
          night_animation_style: { label: 'Night Animation Style', helper: 'Flow animation style used when the card is in Night mode. Leave blank to use the Day style.' },
          dashes_glow_intensity: { label: 'Dash Glow Intensity', helper: 'Controls glow strength for "Dashes + Glow" (0 disables glow).' },
          fluid_flow_outer_glow: { label: 'Fluid Flow Outer Glow', helper: 'Enable the extra outer haze/glow layer for animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Stroke Width (px)', helper: 'Optional override for the animated flow stroke width (no SVG edits). Leave blank to keep SVG defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Stroke Width (px)', helper: 'Base stroke width for animation_style: fluid_flow. Overlay/mask widths are derived from this (default 5).' },
          
          sensor_pv_total: { label: 'PV Total Sensor', helper: 'Optional aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'PV Total Sensor (Inverter 2)', helper: 'Optional second inverter total; added to the PV total when provided.' },
          sensor_windmill_total: { label: 'Windmill Total', helper: 'Power sensor for the windmill generator (W). When not configured the windmill SVG group is hidden.' },
          sensor_windmill_daily: { label: 'Daily Windmill Production', helper: 'Optional sensor reporting daily windmill production totals.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Primary solar production sensor.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor.' },
          sensor_daily: { label: 'Daily Production Sensor (Required)', helper: 'Sensor reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Daily Production Sensor (Array 2)', helper: 'Sensor reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Battery 1 SOC' },
          sensor_bat1_power: { label: 'Battery 1 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 1 becomes active.' },
          sensor_bat1_charge_power: { label: 'Battery 1 Charge Power' },
          sensor_bat1_discharge_power: { label: 'Battery 1 Discharge Power' },
          sensor_bat2_soc: { label: 'Battery 2 SOC' },
          sensor_bat2_power: { label: 'Battery 2 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 2 becomes active.' },
          sensor_bat2_charge_power: { label: 'Battery 2 Charge Power' },
          sensor_bat2_discharge_power: { label: 'Battery 2 Discharge Power' },
          sensor_bat3_soc: { label: 'Battery 3 SOC' },
          sensor_bat3_power: { label: 'Battery 3 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 3 becomes active.' },
          sensor_bat3_charge_power: { label: 'Battery 3 Charge Power' },
          sensor_bat3_discharge_power: { label: 'Battery 3 Discharge Power' },
          sensor_bat4_soc: { label: 'Battery 4 SOC' },
          sensor_bat4_power: { label: 'Battery 4 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 4 becomes active.' },
          sensor_bat4_charge_power: { label: 'Battery 4 Charge Power' },
          sensor_bat4_discharge_power: { label: 'Battery 4 Discharge Power' },
          sensor_home_load: { label: 'Home Load/Consumption (Required)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Inverter 2)', helper: 'Optional house load sensor for the second inverter.' },
          sensor_heat_pump_consumption: { label: 'Heat Pump Consumption', helper: 'Sensor for heat pump energy consumption.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'Sensor for pool power/consumption.' },
          sensor_washing_machine_consumption: { label: 'Washing Machine', helper: 'Sensor for washing machine power/consumption.' },
          sensor_dryer_consumption: { label: 'Dryer', helper: 'Sensor for dryer power/consumption.' },
          sensor_refrigerator_consumption: { label: 'Refrigerator', helper: 'Sensor for refrigerator power/consumption.' },
          sensor_grid_power: { label: 'Grid Inverter 1 Power', helper: 'Positive/negative grid flow sensor for inverter 1. Specify either this sensor or both Grid Inverter 1 Import Sensor and Grid Inverter 1 Export Sensor.' },
          sensor_grid_import: { label: 'Grid Inverter 1 Import Sensor', helper: 'Optional entity reporting inverter 1 grid import (positive) power.' },
          sensor_grid_export: { label: 'Grid Inverter 1 Export Sensor', helper: 'Optional entity reporting inverter 1 grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Daily Grid Inverter 1 Import Sensor', helper: 'Optional entity reporting cumulative inverter 1 grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Daily Grid Inverter 1 Export Sensor', helper: 'Optional entity reporting cumulative inverter 1 grid export for the current day.' },
          sensor_grid2_power: { label: 'Grid Inverter 2 Power', helper: 'Positive/negative grid flow sensor for inverter 2. Specify either this sensor or both Grid Inverter 2 Import Sensor and Grid Inverter 2 Export Sensor.' },
          sensor_grid2_import: { label: 'Grid Inverter 2 Import Sensor', helper: 'Optional entity reporting inverter 2 grid import (positive) power.' },
          sensor_grid2_export: { label: 'Grid Inverter 2 Export Sensor', helper: 'Optional entity reporting inverter 2 grid export (positive) power.' },
          sensor_grid2_import_daily: { label: 'Daily Grid Inverter 2 Import Sensor', helper: 'Optional entity reporting cumulative inverter 2 grid import for the current day.' },
          sensor_grid2_export_daily: { label: 'Daily Grid Inverter 2 Export Sensor', helper: 'Optional entity reporting cumulative inverter 2 grid export for the current day.' },
          show_daily_grid: { label: 'Show Daily Grid Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          grid_daily_font_size: { label: 'Daily Grid Font Size (px)', helper: 'Optional override for daily grid import/export text. Defaults to Grid Font Size.' },
          grid_current_odometer: { label: 'Odometer: Grid Current', helper: 'Animate Grid Current with a per-digit rolling effect.' },
          grid_current_odometer_duration: { label: 'Odometer Duration (ms)', helper: 'Animation duration in milliseconds. Default 350.' },
          show_grid_flow_label: { label: 'Show Grid Import/Export Name', helper: 'Prepend the importing/exporting label before the grid value when enabled.' },
          enable_echo_alive: { label: 'Enable Echo Alive', helper: 'Enables an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'PV Total Color', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Color', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Color', helper: 'Colour used for the secondary PV animation line when available.' },
          load_flow_color: { label: 'Load Flow Color', helper: 'Colour applied to the home load animation line.' },
          load_text_color: { label: 'Load Text Color', helper: 'Colour applied to the home load text when thresholds are inactive.' },
          house_total_color: { label: 'House Total Color', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'INV 1 Color', helper: 'Colour applied to the INV 1 text/flow.' },
          inv2_color: { label: 'INV 2 Color', helper: 'Colour applied to the INV 2 text/flow.' },
          load_threshold_warning: { label: 'Load Warning Threshold', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Color', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Threshold', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Color', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_soc_color: { label: 'Battery SOC Color', helper: 'Hex color applied to the battery SOC percentage text.' },
          battery_charge_color: { label: 'Battery Charge Flow Color', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Battery Discharge Flow Color', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Inverter 1 Grid Import Flow Color', helper: 'Base colour before thresholds when inverter 1 is importing from the grid.' },
          grid_export_color: { label: 'Inverter 1 Grid Export Flow Color', helper: 'Base colour before thresholds when inverter 1 is exporting to the grid.' },
          grid2_import_color: { label: 'Inverter 2 Grid Import Flow Color', helper: 'Base colour before thresholds when inverter 2 is importing from the grid.' },
          grid2_export_color: { label: 'Inverter 2 Grid Export Flow Color', helper: 'Base colour before thresholds when inverter 2 is exporting to the grid.' },
          car_flow_color: { label: 'EV Flow Color', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Battery Fill (Normal) Color', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Battery Fill (Low) Color', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Battery Low Fill Threshold (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          battery_fill_opacity: { label: 'Battery Fill Opacity', helper: 'Opacity for the battery fill level (0-1).' },
          grid_activity_threshold: { label: 'Grid Animation Threshold (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_threshold_warning: { label: 'Inverter 1 Grid Warning Threshold', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Inverter 1 Grid Warning Color', helper: 'Hex or CSS color applied at the inverter 1 warning threshold.' },
          grid_threshold_critical: { label: 'Inverter 1 Grid Critical Threshold', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Inverter 1 Grid Critical Color', helper: 'Hex or CSS color applied at the inverter 1 critical threshold.' },
          grid2_threshold_warning: { label: 'Inverter 2 Grid Warning Threshold', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_warning_color: { label: 'Inverter 2 Grid Warning Color', helper: 'Hex or CSS color applied at the inverter 2 warning threshold.' },
          grid2_threshold_critical: { label: 'Inverter 2 Grid Critical Threshold', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_critical_color: { label: 'Inverter 2 Grid Critical Color', helper: 'Hex or CSS color applied at the inverter 2 critical threshold.' },
          invert_grid: { label: 'Invert Grid Values', helper: 'Enable if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Battery Values', helper: 'Enable if charge/discharge polarity is reversed.' },
          invert_bat1: { label: 'Invert Battery 1 Values', helper: 'Enable if Battery 1 charge/discharge polarity is reversed.' },
          invert_bat2: { label: 'Invert Battery 2 Values', helper: 'Enable if Battery 2 charge/discharge polarity is reversed.' },
          invert_bat3: { label: 'Invert Battery 3 Values', helper: 'Enable if Battery 3 charge/discharge polarity is reversed.' },
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
          car_headlight_flash: { label: 'Headlight Flash While Charging', helper: 'Enable to flash the EV headlights whenever charging is detected.' },
          car_pct_color: { label: 'Car SOC Color', helper: 'Hex color for EV SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Car 2 SOC Color', helper: 'Hex color for second EV SOC text (falls back to Car SOC Color).' },
          car1_name_color: { label: 'Car 1 Name Color', helper: 'Color applied to the Car 1 name label.' },
          car2_name_color: { label: 'Car 2 Name Color', helper: 'Color applied to the Car 2 name label.' },
          car1_color: { label: 'Car 1 Color', helper: 'Color applied to Car 1 power value.' },
          car2_color: { label: 'Car 2 Color', helper: 'Color applied to Car 2 power value.' },
          heat_pump_flow_color: { label: 'Heat Pump Flow Color', helper: 'Color applied to the heat pump flow animation.' },
          heat_pump_text_color: { label: 'Heat Pump Text Color', helper: 'Color applied to the heat pump power text.' },
          pool_flow_color: { label: 'Pool Flow Color', helper: 'Color applied to the pool flow animation.' },
          pool_text_color: { label: 'Pool Text Color', helper: 'Color applied to the pool power text.' },
          washing_machine_text_color: { label: 'Washing Machine Text Color', helper: 'Color applied to the washing machine power text.' },
          dryer_text_color: { label: 'Dryer Text Color', helper: 'Color applied to the dryer power text.' },
          refrigerator_text_color: { label: 'Refrigerator Text Color', helper: 'Color applied to the refrigerator power text.' },
          windmill_flow_color: { label: 'Windmill Flow Color', helper: 'Color applied to the windmill flow (data-flow-key="windmill").' },
          windmill_text_color: { label: 'Windmill Text Color', helper: 'Color applied to the windmill power text (data-role="windmill-power").' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Default 16' },
          daily_label_font_size: { label: 'Daily Label Font Size (px)', helper: 'Default 12' },
          daily_value_font_size: { label: 'Daily Value Font Size (px)', helper: 'Default 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Default 16' },
          windmill_power_font_size: { label: 'Windmill Power Font Size (px)', helper: 'Default 16' },
          battery_soc_font_size: { label: 'Battery SOC Font Size (px)', helper: 'Default 20' },
          battery_power_font_size: { label: 'Battery Power Font Size (px)', helper: 'Default 16' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Default 15' },
          inv1_power_font_size: { label: 'INV 1 Power Font Size (px)', helper: 'Font size for the INV 1 power line. Default uses Load Font Size.' },
          inv2_power_font_size: { label: 'INV 2 Power Font Size (px)', helper: 'Font size for the INV 2 power line. Default uses Load Font Size.' },
          heat_pump_font_size: { label: 'Heat Pump Font Size (px)', helper: 'Default 16' },
          pool_font_size: { label: 'Pool Font Size (px)', helper: 'Default 16' },
          washing_machine_font_size: { label: 'Washing Machine Font Size (px)', helper: 'Default 16' },
          dryer_font_size: { label: 'Dryer Font Size (px)', helper: 'Default 16' },
          refrigerator_font_size: { label: 'Refrigerator Font Size (px)', helper: 'Default 16' },
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
          sensor_popup_house_6_font_size: { label: 'House Popup 6 Font Size (px)', helper: 'Font size for house popup line 6. Default 16' },
          sensor_popup_bat_1: { label: 'Battery Popup 1', helper: 'Entity for battery popup line 1.' },
          sensor_popup_bat_1_name: { label: 'Battery Popup 1 Name', helper: 'Optional custom name for battery popup line 1. Leave blank to use entity name.' },
          sensor_popup_bat_1_color: { label: 'Battery Popup 1 Color', helper: 'Color for battery popup line 1 text.' },
          sensor_popup_bat_1_font_size: { label: 'Battery Popup 1 Font Size (px)', helper: 'Font size for battery popup line 1. Default 16' },
          sensor_popup_bat_2: { label: 'Battery Popup 2', helper: 'Entity for battery popup line 2.' },
          sensor_popup_bat_2_name: { label: 'Battery Popup 2 Name', helper: 'Optional custom name for battery popup line 2. Leave blank to use entity name.' },
          sensor_popup_bat_2_color: { label: 'Battery Popup 2 Color', helper: 'Color for battery popup line 2 text.' },
          sensor_popup_bat_2_font_size: { label: 'Battery Popup 2 Font Size (px)', helper: 'Font size for battery popup line 2. Default 16' },
          sensor_popup_bat_3: { label: 'Battery Popup 3', helper: 'Entity for battery popup line 3.' },
          sensor_popup_bat_3_name: { label: 'Battery Popup 3 Name', helper: 'Optional custom name for battery popup line 3. Leave blank to use entity name.' },
          sensor_popup_bat_3_color: { label: 'Battery Popup 3 Color', helper: 'Color for battery popup line 3 text.' },
          sensor_popup_bat_3_font_size: { label: 'Battery Popup 3 Font Size (px)', helper: 'Font size for battery popup line 3. Default 16' },
          sensor_popup_bat_4: { label: 'Battery Popup 4', helper: 'Entity for battery popup line 4.' },
          sensor_popup_bat_4_name: { label: 'Battery Popup 4 Name', helper: 'Optional custom name for battery popup line 4. Leave blank to use entity name.' },
          sensor_popup_bat_4_color: { label: 'Battery Popup 4 Color', helper: 'Color for battery popup line 4 text.' },
          sensor_popup_bat_4_font_size: { label: 'Battery Popup 4 Font Size (px)', helper: 'Font size for battery popup line 4. Default 16' },
          sensor_popup_bat_5: { label: 'Battery Popup 5', helper: 'Entity for battery popup line 5.' },
          sensor_popup_bat_5_name: { label: 'Battery Popup 5 Name', helper: 'Optional custom name for battery popup line 5. Leave blank to use entity name.' },
          sensor_popup_bat_5_color: { label: 'Battery Popup 5 Color', helper: 'Color for battery popup line 5 text.' },
          sensor_popup_bat_5_font_size: { label: 'Battery Popup 5 Font Size (px)', helper: 'Font size for battery popup line 5. Default 16' },
          sensor_popup_bat_6: { label: 'Battery Popup 6', helper: 'Entity for battery popup line 6.' },
          sensor_popup_bat_6_name: { label: 'Battery Popup 6 Name', helper: 'Optional custom name for battery popup line 6. Leave blank to use entity name.' },
          sensor_popup_bat_6_color: { label: 'Battery Popup 6 Color', helper: 'Color for battery popup line 6 text.' },
          sensor_popup_bat_6_font_size: { label: 'Battery Popup 6 Font Size (px)', helper: 'Font size for battery popup line 6. Default 16' },
          sensor_popup_grid_1: { label: 'Grid Popup 1', helper: 'Entity for grid popup line 1.' },
          sensor_popup_grid_1_name: { label: 'Grid Popup 1 Name', helper: 'Optional custom name for grid popup line 1. Leave blank to use entity name.' },
          sensor_popup_grid_1_color: { label: 'Grid Popup 1 Color', helper: 'Color for grid popup line 1 text.' },
          sensor_popup_grid_1_font_size: { label: 'Grid Popup 1 Font Size (px)', helper: 'Font size for grid popup line 1. Default 16' },
          sensor_popup_grid_2: { label: 'Grid Popup 2', helper: 'Entity for grid popup line 2.' },
          sensor_popup_grid_2_name: { label: 'Grid Popup 2 Name', helper: 'Optional custom name for grid popup line 2. Leave blank to use entity name.' },
          sensor_popup_grid_2_color: { label: 'Grid Popup 2 Color', helper: 'Color for grid popup line 2 text.' },
          sensor_popup_grid_2_font_size: { label: 'Grid Popup 2 Font Size (px)', helper: 'Font size for grid popup line 2. Default 16' },
          sensor_popup_grid_3: { label: 'Grid Popup 3', helper: 'Entity for grid popup line 3.' },
          sensor_popup_grid_3_name: { label: 'Grid Popup 3 Name', helper: 'Optional custom name for grid popup line 3. Leave blank to use entity name.' },
          sensor_popup_grid_3_color: { label: 'Grid Popup 3 Color', helper: 'Color for grid popup line 3 text.' },
          sensor_popup_grid_3_font_size: { label: 'Grid Popup 3 Font Size (px)', helper: 'Font size for grid popup line 3. Default 16' },
          sensor_popup_grid_4: { label: 'Grid Popup 4', helper: 'Entity for grid popup line 4.' },
          sensor_popup_grid_4_name: { label: 'Grid Popup 4 Name', helper: 'Optional custom name for grid popup line 4. Leave blank to use entity name.' },
          sensor_popup_grid_4_color: { label: 'Grid Popup 4 Color', helper: 'Color for grid popup line 4 text.' },
          sensor_popup_grid_4_font_size: { label: 'Grid Popup 4 Font Size (px)', helper: 'Font size for grid popup line 4. Default 16' },
          sensor_popup_grid_5: { label: 'Grid Popup 5', helper: 'Entity for grid popup line 5.' },
          sensor_popup_grid_5_name: { label: 'Grid Popup 5 Name', helper: 'Optional custom name for grid popup line 5. Leave blank to use entity name.' },
          sensor_popup_grid_5_color: { label: 'Grid Popup 5 Color', helper: 'Color for grid popup line 5 text.' },
          sensor_popup_grid_5_font_size: { label: 'Grid Popup 5 Font Size (px)', helper: 'Font size for grid popup line 5. Default 16' },
          sensor_popup_grid_6: { label: 'Grid Popup 6', helper: 'Entity for grid popup line 6.' },
          sensor_popup_grid_6_name: { label: 'Grid Popup 6 Name', helper: 'Optional custom name for grid popup line 6. Leave blank to use entity name.' },
          sensor_popup_grid_6_color: { label: 'Grid Popup 6 Color', helper: 'Color for grid popup line 6 text.' },
          sensor_popup_grid_6_font_size: { label: 'Grid Popup 6 Font Size (px)', helper: 'Font size for grid popup line 6. Default 16' },
          sensor_popup_inverter_1: { label: 'Inverter Popup 1', helper: 'Entity for inverter popup line 1.' },
          sensor_popup_inverter_1_name: { label: 'Inverter Popup 1 Name', helper: 'Optional custom name for inverter popup line 1. Leave blank to use entity name.' },
          sensor_popup_inverter_1_color: { label: 'Inverter Popup 1 Color', helper: 'Color for inverter popup line 1 text.' },
          sensor_popup_inverter_1_font_size: { label: 'Inverter Popup 1 Font Size (px)', helper: 'Font size for inverter popup line 1. Default 16' },
          sensor_popup_inverter_2: { label: 'Inverter Popup 2', helper: 'Entity for inverter popup line 2.' },
          sensor_popup_inverter_2_name: { label: 'Inverter Popup 2 Name', helper: 'Optional custom name for inverter popup line 2. Leave blank to use entity name.' },
          sensor_popup_inverter_2_color: { label: 'Inverter Popup 2 Color', helper: 'Color for inverter popup line 2 text.' },
          sensor_popup_inverter_2_font_size: { label: 'Inverter Popup 2 Font Size (px)', helper: 'Font size for inverter popup line 2. Default 16' },
          sensor_popup_inverter_3: { label: 'Inverter Popup 3', helper: 'Entity for inverter popup line 3.' },
          sensor_popup_inverter_3_name: { label: 'Inverter Popup 3 Name', helper: 'Optional custom name for inverter popup line 3. Leave blank to use entity name.' },
          sensor_popup_inverter_3_color: { label: 'Inverter Popup 3 Color', helper: 'Color for inverter popup line 3 text.' },
          sensor_popup_inverter_3_font_size: { label: 'Inverter Popup 3 Font Size (px)', helper: 'Font size for inverter popup line 3. Default 16' },
          sensor_popup_inverter_4: { label: 'Inverter Popup 4', helper: 'Entity for inverter popup line 4.' },
          sensor_popup_inverter_4_name: { label: 'Inverter Popup 4 Name', helper: 'Optional custom name for inverter popup line 4. Leave blank to use entity name.' },
          sensor_popup_inverter_4_color: { label: 'Inverter Popup 4 Color', helper: 'Color for inverter popup line 4 text.' },
          sensor_popup_inverter_4_font_size: { label: 'Inverter Popup 4 Font Size (px)', helper: 'Font size for inverter popup line 4. Default 16' },
          sensor_popup_inverter_5: { label: 'Inverter Popup 5', helper: 'Entity for inverter popup line 5.' },
          sensor_popup_inverter_5_name: { label: 'Inverter Popup 5 Name', helper: 'Optional custom name for inverter popup line 5. Leave blank to use entity name.' },
          sensor_popup_inverter_5_color: { label: 'Inverter Popup 5 Color', helper: 'Color for inverter popup line 5 text.' },
          sensor_popup_inverter_5_font_size: { label: 'Inverter Popup 5 Font Size (px)', helper: 'Font size for inverter popup line 5. Default 16' },
          sensor_popup_inverter_6: { label: 'Inverter Popup 6', helper: 'Entity for inverter popup line 6.' },
          sensor_popup_inverter_6_name: { label: 'Inverter Popup 6 Name', helper: 'Optional custom name for inverter popup line 6. Leave blank to use entity name.' },
          sensor_popup_inverter_6_color: { label: 'Inverter Popup 6 Color', helper: 'Color for inverter popup line 6 text.' },
          sensor_popup_inverter_6_font_size: { label: 'Inverter Popup 6 Font Size (px)', helper: 'Font size for inverter popup line 6. Default 16' }
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
            { value: 'dashes_glow', label: 'Dashes + Glow' },
            { value: 'fluid_flow', label: 'Fluid Flow' },
            { value: 'dots', label: 'Dots' },
            { value: 'arrows', label: 'Arrows' }
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
          pvCommon: { title: 'Solare/PV Comune', helper: 'Impostazioni Solare/PV condivise tra gli array.' },
          array1: { title: 'Solare/PV Array 1', helper: 'Configura le entita dell Array PV 1.' },
          array2: { title: 'Solare/PV Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          windmill: { title: 'Windmill', helper: 'Configura il generatore eolico e lo stile di visualizzazione.' },
          battery: { title: 'Batteria', helper: 'Configura le entita della batteria.' },
          grid: { title: 'Rete', helper: 'Configura le entita della rete.' },
          car: { title: 'Auto', helper: 'Configura le entita EV.' },
          other: { title: 'Casa', helper: 'Sensori aggiuntivi e opzioni avanzate.' },
          entities: { title: 'Selezione entita', helper: 'Scegli le entita PV, batteria, rete, carico ed EV utilizzate dalla scheda. Come minimo deve essere specificato il sensore PV totale oppure gli array di stringhe PV.' },
          pvPopup: { title: 'PV Popup', helper: 'Configura le entita per la visualizzazione del popup PV.' },
          housePopup: { title: 'House Popup', helper: 'Configura le entita per la visualizzazione del popup casa.' },
          batteryPopup: { title: 'Popup Batteria', helper: 'Configura il popup della batteria.' },
          gridPopup: { title: 'Popup Rete', helper: 'Configura le entita per la visualizzazione del popup rete.' },
          inverterPopup: { title: 'Popup Inverter', helper: 'Configura le entita per la visualizzazione del popup inverter.' },
          colors: { title: 'Colori e soglie', helper: 'Configura soglie della rete e colori di accento per i flussi.' },
          typography: { title: 'Tipografia', helper: 'Regola le dimensioni dei caratteri utilizzate nella scheda.' },
          about: { title: 'Informazioni', helper: 'Crediti, versione e link utili.' }
        },
        fields: {
          card_title: { label: 'Titolo scheda', helper: 'Titolo mostrato nella parte superiore della scheda. Lasciare vuoto per disabilitare.' },
          background_image: { label: 'Percorso immagine di sfondo', helper: 'Percorso dell immagine di sfondo (es. /local/community/lumina-energy-card/lumina_background.svg).' },
          language: { label: 'Lingua', helper: 'Seleziona la lingua dell editor.' },
          display_unit: { label: 'Unita di visualizzazione', helper: 'Unita usata per i valori di potenza.' },
          update_interval: { label: 'Intervallo di aggiornamento', helper: 'Frequenza di aggiornamento della scheda (0 disattiva il limite).' },
          animation_speed_factor: { label: 'Fattore velocita animazioni', helper: 'Regola il moltiplicatore (-3x a 3x). Usa 0 per mettere in pausa; valori negativi invertono il flusso.' },
          animation_style: { label: 'Stile animazione (Giorno)', helper: 'Stile dei flussi usato in modalita Giorno.' },
          night_animation_style: { label: 'Stile animazione (Notte)', helper: 'Stile dei flussi usato in modalita Notte. Lascia vuoto per usare lo stile Giorno.' },
          dashes_glow_intensity: { label: 'Intensita bagliore tratteggi', helper: 'Controlla il bagliore per "Tratteggi + Bagliore" (0 disattiva).' },
          fluid_flow_outer_glow: { label: 'Bagliore esterno fluid flow', helper: 'Abilita lo strato esterno di bagliore per animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Spessore flussi (px)', helper: 'Override opzionale per lo spessore dei flussi animati (senza modificare l SVG). Lascia vuoto per usare i valori dell SVG.' },
          fluid_flow_stroke_width: { label: 'Spessore fluid flow (px)', helper: 'Spessore base per animation_style: fluid_flow. Overlay/maschera derivano da questo (default 5).' },
          
          sensor_pv_total: { label: 'Sensore PV totale', helper: 'Sensore aggregato opzionale mostrato come linea combinata.' },
          sensor_pv_total_secondary: { label: 'Sensore PV totale (Inverter 2)', helper: 'Secondo sensore inverter opzionale; viene sommato al totale PV.' },
          sensor_windmill_total: { label: 'Windmill Total', helper: 'Sensore di potenza del generatore eolico (W). Se non configurato, il gruppo SVG del windmill viene nascosto.' },
          sensor_windmill_daily: { label: 'Daily Windmill Production', helper: 'Sensore opzionale per la produzione giornaliera del windmill.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Sensore principale di produzione solare.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          sensor_daily: { label: 'Sensore produzione giornaliera (Obbligatorio)', helper: 'Sensore che riporta la produzione giornaliera. Come minimo deve essere specificato il sensore PV totale oppure gli array di stringhe PV.' },
          sensor_daily_array2: { label: 'Sensore produzione giornaliera (Array 2)', helper: 'Sensore che riporta la produzione giornaliera per l Array 2.' },
          sensor_bat1_soc: { label: 'Batteria 1 SOC' },
          sensor_bat1_power: { label: 'Batteria 1 potenza', helper: 'Fornisci questo sensore di potenza combinato oppure entrambi i sensori di carica e scarica per attivare la Batteria 1.' },
          sensor_bat1_charge_power: { label: 'Potenza carica Batteria 1' },
          sensor_bat1_discharge_power: { label: 'Potenza scarica Batteria 1' },
          sensor_bat2_soc: { label: 'Batteria 2 SOC' },
          sensor_bat2_power: { label: 'Batteria 2 potenza', helper: 'Fornisci questo sensore di potenza combinato oppure entrambi i sensori di carica e scarica per attivare la Batteria 2.' },
          sensor_bat2_charge_power: { label: 'Potenza carica Batteria 2' },
          sensor_bat2_discharge_power: { label: 'Potenza scarica Batteria 2' },
          sensor_bat3_soc: { label: 'Batteria 3 SOC' },
          sensor_bat3_power: { label: 'Batteria 3 potenza', helper: 'Fornisci questo sensore di potenza combinato oppure entrambi i sensori di carica e scarica per attivare la Batteria 3.' },
          sensor_bat3_charge_power: { label: 'Potenza carica Batteria 3' },
          sensor_bat3_discharge_power: { label: 'Potenza scarica Batteria 3' },
          sensor_bat4_soc: { label: 'Batteria 4 SOC' },
          sensor_bat4_power: { label: 'Batteria 4 potenza', helper: 'Fornisci questo sensore di potenza combinato oppure entrambi i sensori di carica e scarica per attivare la Batteria 4.' },
          sensor_bat4_charge_power: { label: 'Potenza carica Batteria 4' },
          sensor_bat4_discharge_power: { label: 'Potenza scarica Batteria 4' },
          sensor_home_load: { label: 'Carico casa/consumo (Obbligatorio)', helper: 'Sensore del consumo totale dell abitazione.' },
          sensor_home_load_secondary: { label: 'Carico casa (Inverter 2)', helper: 'Sensore opzionale del carico domestico per il secondo inverter.' },
          sensor_heat_pump_consumption: { label: 'Consumo pompa di calore', helper: 'Sensore per il consumo energetico della pompa di calore.' },
          sensor_pool_consumption: { label: 'Piscina', helper: 'Sensore per potenza/consumo piscina.' },
          sensor_washing_machine_consumption: { label: 'Lavatrice', helper: 'Sensore per potenza/consumo lavatrice.' },
          sensor_dryer_consumption: { label: 'Asciugatrice', helper: 'Sensore per potenza/consumo asciugatrice.' },
          sensor_refrigerator_consumption: { label: 'Frigorifero', helper: 'Sensore per potenza/consumo frigorifero.' },
          sensor_grid_power: { label: 'Potenza rete Inverter 1', helper: 'Sensore flusso rete positivo/negativo per Inverter 1. Specificare o questo sensore o entrambi il Sensore import rete Inverter 1 e il Sensore export rete Inverter 1.' },
          sensor_grid_import: { label: 'Sensore import rete Inverter 1', helper: 'Entita opzionale che riporta la potenza di import (valori positivi) per Inverter 1.' },
          sensor_grid_export: { label: 'Sensore export rete Inverter 1', helper: 'Entita opzionale che riporta la potenza di export (valori positivi) per Inverter 1.' },
          sensor_grid_import_daily: { label: 'Sensore import rete giornaliero Inverter 1', helper: 'Entita opzionale che riporta l import cumulativo della rete per il giorno corrente (Inverter 1).' },
          sensor_grid_export_daily: { label: 'Sensore export rete giornaliero Inverter 1', helper: 'Entita opzionale che riporta l export cumulativo della rete per il giorno corrente (Inverter 1).' },
          sensor_grid2_power: { label: 'Potenza rete Inverter 2', helper: 'Sensore flusso rete positivo/negativo per Inverter 2. Specificare o questo sensore o entrambi il Sensore import rete Inverter 2 e il Sensore export rete Inverter 2.' },
          sensor_grid2_import: { label: 'Sensore import rete Inverter 2', helper: 'Entita opzionale che riporta la potenza di import (valori positivi) per Inverter 2.' },
          sensor_grid2_export: { label: 'Sensore export rete Inverter 2', helper: 'Entita opzionale che riporta la potenza di export (valori positivi) per Inverter 2.' },
          sensor_grid2_import_daily: { label: 'Sensore import rete giornaliero Inverter 2', helper: 'Entita opzionale che riporta l import cumulativo della rete per il giorno corrente (Inverter 2).' },
          sensor_grid2_export_daily: { label: 'Sensore export rete giornaliero Inverter 2', helper: 'Entita opzionale che riporta l export cumulativo della rete per il giorno corrente (Inverter 2).' },
          show_daily_grid: { label: 'Mostra valori rete giornalieri', helper: 'Mostra i totali import/export giornalieri sotto il flusso rete corrente quando abilitato.' },
          grid_daily_font_size: { label: 'Dimensione testo rete giornaliero (px)', helper: 'Opzionale: sovrascrive la dimensione del testo import/export giornaliero. Predefinita: Dimensione rete.' },
          grid_current_odometer: { label: 'Contatore: Rete attuale', helper: 'Anima il valore rete attuale con un effetto a cifre scorrevoli.' },
          grid_current_odometer_duration: { label: 'Durata contatore (ms)', helper: 'Durata animazione in millisecondi. Predefinita 350.' },
          show_grid_flow_label: { label: 'Mostra etichetta import/export rete', helper: 'Aggiunge "Importazione"/"Esportazione" prima del valore rete quando attivato.' },
          enable_echo_alive: { label: 'Enable Echo Alive', helper: 'Enables an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_primary_color: { label: 'Colore flusso FV 1', helper: 'Colore utilizzato per l animazione FV principale.' },
          pv_tot_color: { label: 'Colore PV TOTALE', helper: 'Colore applicato alla riga PV TOTALE.' },
          pv_secondary_color: { label: 'Colore flusso FV 2', helper: 'Colore utilizzato per la seconda linea FV quando presente.' },
          load_flow_color: { label: 'Colore flusso carico', helper: 'Colore applicato all animazione del carico della casa.' },
          load_text_color: { label: 'Colore testo carico', helper: 'Colore applicato al testo del carico di casa quando le soglie non sono attive.' },
          house_total_color: { label: 'Colore HOUSE TOT', helper: 'Colore applicato al testo/flusso HOUSE TOT.' },
          inv1_color: { label: 'Colore INV 1', helper: 'Colore applicato al testo/flusso INV 1.' },
          inv2_color: { label: 'Colore INV 2', helper: 'Colore applicato al testo/flusso INV 2.' },
          load_threshold_warning: { label: 'Soglia avviso carico', helper: 'Cambia colore quando il carico raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          load_warning_color: { label: 'Colore avviso carico', helper: 'Colore applicato alla soglia di avviso del carico.' },
          load_threshold_critical: { label: 'Soglia critica carico', helper: 'Cambia colore quando il carico raggiunge questa soglia critica. Usa l unita di visualizzazione selezionata.' },
          load_critical_color: { label: 'Colore critico carico', helper: 'Colore applicato alla soglia critica del carico.' },
          battery_soc_color: { label: 'Colore SOC batteria', helper: 'Colore applicato al testo percentuale SOC della batteria.' },
          battery_charge_color: { label: 'Colore flusso carica batteria', helper: 'Colore quando l energia entra nella batteria.' },
          battery_discharge_color: { label: 'Colore flusso scarica batteria', helper: 'Colore quando l energia esce dalla batteria.' },
          grid_import_color: { label: 'Colore import da rete (Inverter 1)', helper: 'Colore base (prima delle soglie) quando Inverter 1 importa dalla rete.' },
          grid_export_color: { label: 'Colore export verso rete (Inverter 1)', helper: 'Colore base (prima delle soglie) quando Inverter 1 esporta verso la rete.' },
          grid2_import_color: { label: 'Colore import da rete (Inverter 2)', helper: 'Colore base (prima delle soglie) quando Inverter 2 importa dalla rete.' },
          grid2_export_color: { label: 'Colore export verso rete (Inverter 2)', helper: 'Colore base (prima delle soglie) quando Inverter 2 esporta verso la rete.' },
          car_flow_color: { label: 'Colore flusso EV', helper: 'Colore applicato all animazione del veicolo elettrico.' },
          battery_fill_high_color: { label: 'Colore riempimento batteria (normale)', helper: 'Colore del liquido batteria quando la SOC supera la soglia bassa.' },
          battery_fill_low_color: { label: 'Colore riempimento batteria (basso)', helper: 'Colore del liquido batteria quando la SOC è uguale o inferiore alla soglia bassa.' },
          battery_fill_low_threshold: { label: 'Soglia SOC bassa batteria (%)', helper: 'Usa il colore di riempimento basso quando la SOC è uguale o inferiore a questa percentuale.' },
          battery_fill_opacity: { label: 'Opacità riempimento batteria', helper: 'Opacità del livello di riempimento batteria (0-1).' },
          grid_activity_threshold: { label: 'Soglia animazione rete (W)', helper: 'Ignora i flussi rete con magnitudine inferiore a questo valore prima di animarli.' },
          grid_threshold_warning: { label: 'Soglia avviso rete (Inverter 1)', helper: 'Cambia colore quando la magnitudine di Inverter 1 raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid_warning_color: { label: 'Colore avviso rete (Inverter 1)', helper: 'Colore applicato alla soglia di avviso per Inverter 1.' },
          grid_threshold_critical: { label: 'Soglia critica rete (Inverter 1)', helper: 'Cambia colore quando la magnitudine di Inverter 1 raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid_critical_color: { label: 'Colore critico rete (Inverter 1)', helper: 'Colore applicato alla soglia critica per Inverter 1.' },
          grid2_threshold_warning: { label: 'Soglia avviso rete (Inverter 2)', helper: 'Cambia colore quando la magnitudine di Inverter 2 raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid2_warning_color: { label: 'Colore avviso rete (Inverter 2)', helper: 'Colore applicato alla soglia di avviso per Inverter 2.' },
          grid2_threshold_critical: { label: 'Soglia critica rete (Inverter 2)', helper: 'Cambia colore quando la magnitudine di Inverter 2 raggiunge questa soglia. Usa l unita di visualizzazione selezionata.' },
          grid2_critical_color: { label: 'Colore critico rete (Inverter 2)', helper: 'Colore applicato alla soglia critica per Inverter 2.' },
            invert_grid: { label: 'Inverti valori rete', helper: 'Attiva se l import/export ha polarita invertita.' },
            invert_battery: { label: 'Inverti valori batteria', helper: 'Abilita se la polarita carica/scarica e invertita.' },
            invert_bat1: { label: 'Inverti Batteria 1', helper: 'Abilita se la polarita carica/scarica della Batteria 1 e invertita.' },
            invert_bat2: { label: 'Inverti Batteria 2', helper: 'Abilita se la polarita carica/scarica della Batteria 2 e invertita.' },
            invert_bat3: { label: 'Inverti Batteria 3', helper: 'Abilita se la polarita carica/scarica della Batteria 3 e invertita.' },
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
          car_headlight_flash: { label: 'Lampeggio fari durante la ricarica', helper: 'Attiva per far lampeggiare i fari del veicolo mentre e in carica.' },
          car_pct_color: { label: 'Colore SOC auto', helper: 'Colore esadecimale per il testo SOC EV (es. #00FFFF).' },
          car2_pct_color: { label: 'Colore SOC Auto 2', helper: 'Colore esadecimale per il testo SOC della seconda EV (usa Car SOC se vuoto).' },
          car1_name_color: { label: 'Colore nome Auto 1', helper: 'Colore applicato all etichetta del nome Auto 1.' },
          car2_name_color: { label: 'Colore nome Auto 2', helper: 'Colore applicato all etichetta del nome Auto 2.' },
          car1_color: { label: 'Colore Auto 1', helper: 'Colore applicato al valore potenza Auto 1.' },
          car2_color: { label: 'Colore Auto 2', helper: 'Colore applicato al valore potenza Auto 2.' },
          heat_pump_flow_color: { label: 'Colore flusso pompa di calore', helper: 'Colore applicato all animazione del flusso della pompa di calore.' },
          heat_pump_text_color: { label: 'Colore testo pompa di calore', helper: 'Colore applicato al testo della potenza della pompa di calore.' },
          pool_flow_color: { label: 'Colore flusso piscina', helper: 'Colore applicato all animazione del flusso della piscina.' },
          pool_text_color: { label: 'Colore testo piscina', helper: 'Colore applicato al testo della potenza della piscina.' },
          washing_machine_text_color: { label: 'Colore testo lavatrice', helper: 'Colore applicato al testo potenza della lavatrice.' },
          dryer_text_color: { label: 'Colore testo asciugatrice', helper: 'Colore applicato al testo potenza dell asciugatrice.' },
          refrigerator_text_color: { label: 'Colore testo frigorifero', helper: 'Colore applicato al testo potenza del frigorifero.' },
          windmill_flow_color: { label: 'Windmill Flow Color', helper: 'Colore applicato al flusso del windmill (data-flow-key="windmill").' },
          windmill_text_color: { label: 'Windmill Text Color', helper: 'Colore applicato al testo potenza del windmill (data-role="windmill-power").' },
          header_font_size: { label: 'Dimensione titolo (px)', helper: 'Predefinita 16' },
          daily_label_font_size: { label: 'Dimensione etichetta giornaliera (px)', helper: 'Predefinita 12' },
          daily_value_font_size: { label: 'Dimensione valore giornaliero (px)', helper: 'Predefinita 20' },
          pv_font_size: { label: 'Dimensione testo PV (px)', helper: 'Predefinita 16' },
          windmill_power_font_size: { label: 'Windmill Power Font Size (px)', helper: 'Predefinita 16' },
          battery_soc_font_size: { label: 'Dimensione SOC batteria (px)', helper: 'Predefinita 20' },
          battery_power_font_size: { label: 'Dimensione potenza batteria (px)', helper: 'Predefinita 16' },
          load_font_size: { label: 'Dimensione carico (px)', helper: 'Predefinita 15' },
          inv1_power_font_size: { label: 'Dimensione potenza INV 1 (px)', helper: 'Dimensione carattere per la riga potenza INV 1. Predefinita come Dimensione carico.' },
          inv2_power_font_size: { label: 'Dimensione potenza INV 2 (px)', helper: 'Dimensione carattere per la riga potenza INV 2. Predefinita come Dimensione carico.' },
          heat_pump_font_size: { label: 'Dimensione pompa di calore (px)', helper: 'Predefinita 16' },
          pool_font_size: { label: 'Dimensione piscina (px)', helper: 'Predefinita 16' },
          washing_machine_font_size: { label: 'Dimensione lavatrice (px)', helper: 'Predefinita 16' },
          dryer_font_size: { label: 'Dimensione asciugatrice (px)', helper: 'Predefinita 16' },
          refrigerator_font_size: { label: 'Dimensione frigorifero (px)', helper: 'Predefinita 16' },
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
          sensor_popup_house_6_font_size: { label: 'Dimensione carattere House Popup 6 (px)', helper: 'Dimensione carattere per la riga 6 del popup casa. Predefinita 16' },
          sensor_popup_bat_1: { label: 'Battery Popup 1', helper: 'Entità per la riga 1 del popup batteria.' },
          sensor_popup_bat_1_name: { label: 'Nome Battery Popup 1', helper: 'Nome personalizzato opzionale per la riga 1 del popup batteria. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_bat_1_color: { label: 'Colore Battery Popup 1', helper: 'Colore per il testo della riga 1 del popup batteria.' },
          sensor_popup_bat_1_font_size: { label: 'Dimensione carattere Battery Popup 1 (px)', helper: 'Dimensione carattere per la riga 1 del popup batteria. Predefinita 16' },
          sensor_popup_bat_2: { label: 'Battery Popup 2', helper: 'Entità per la riga 2 del popup batteria.' },
          sensor_popup_bat_2_name: { label: 'Nome Battery Popup 2', helper: 'Nome personalizzato opzionale per la riga 2 del popup batteria. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_bat_2_color: { label: 'Colore Battery Popup 2', helper: 'Colore per il testo della riga 2 del popup batteria.' },
          sensor_popup_bat_2_font_size: { label: 'Dimensione carattere Battery Popup 2 (px)', helper: 'Dimensione carattere per la riga 2 del popup batteria. Predefinita 16' },
          sensor_popup_bat_3: { label: 'Battery Popup 3', helper: 'Entità per la riga 3 del popup batteria.' },
          sensor_popup_bat_3_name: { label: 'Nome Battery Popup 3', helper: 'Nome personalizzato opzionale per la riga 3 del popup batteria. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_bat_3_color: { label: 'Colore Battery Popup 3', helper: 'Colore per il testo della riga 3 del popup batteria.' },
          sensor_popup_bat_3_font_size: { label: 'Dimensione carattere Battery Popup 3 (px)', helper: 'Dimensione carattere per la riga 3 del popup batteria. Predefinita 16' },
          sensor_popup_bat_4: { label: 'Battery Popup 4', helper: 'Entità per la riga 4 del popup batteria.' },
          sensor_popup_bat_4_name: { label: 'Nome Battery Popup 4', helper: 'Nome personalizzato opzionale per la riga 4 del popup batteria. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_bat_4_color: { label: 'Colore Battery Popup 4', helper: 'Colore per il testo della riga 4 del popup batteria.' },
          sensor_popup_bat_4_font_size: { label: 'Dimensione carattere Battery Popup 4 (px)', helper: 'Dimensione carattere per la riga 4 del popup batteria. Predefinita 16' },
          sensor_popup_bat_5: { label: 'Battery Popup 5', helper: 'Entità per la riga 5 del popup batteria.' },
          sensor_popup_bat_5_name: { label: 'Nome Battery Popup 5', helper: 'Nome personalizzato opzionale per la riga 5 del popup batteria. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_bat_5_color: { label: 'Colore Battery Popup 5', helper: 'Colore per il testo della riga 5 del popup batteria.' },
          sensor_popup_bat_5_font_size: { label: 'Dimensione carattere Battery Popup 5 (px)', helper: 'Dimensione carattere per la riga 5 del popup batteria. Predefinita 16' },
          sensor_popup_bat_6: { label: 'Battery Popup 6', helper: 'Entità per la riga 6 del popup batteria.' },
          sensor_popup_bat_6_name: { label: 'Nome Battery Popup 6', helper: 'Nome personalizzato opzionale per la riga 6 del popup batteria. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_bat_6_color: { label: 'Colore Battery Popup 6', helper: 'Colore per il testo della riga 6 del popup batteria.' },
          sensor_popup_bat_6_font_size: { label: 'Dimensione carattere Battery Popup 6 (px)', helper: 'Dimensione carattere per la riga 6 del popup batteria. Predefinita 16' },
          sensor_popup_grid_1: { label: 'Grid Popup 1', helper: 'Entità per la riga 1 del popup rete.' },
          sensor_popup_grid_1_name: { label: 'Nome Grid Popup 1', helper: 'Nome personalizzato opzionale per la riga 1 del popup rete. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_grid_1_color: { label: 'Colore Grid Popup 1', helper: 'Colore per il testo della riga 1 del popup rete.' },
          sensor_popup_grid_1_font_size: { label: 'Dimensione carattere Grid Popup 1 (px)', helper: 'Dimensione carattere per la riga 1 del popup rete. Predefinita 16' },
          sensor_popup_grid_2: { label: 'Grid Popup 2', helper: 'Entità per la riga 2 del popup rete.' },
          sensor_popup_grid_2_name: { label: 'Nome Grid Popup 2', helper: 'Nome personalizzato opzionale per la riga 2 del popup rete. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_grid_2_color: { label: 'Colore Grid Popup 2', helper: 'Colore per il testo della riga 2 del popup rete.' },
          sensor_popup_grid_2_font_size: { label: 'Dimensione carattere Grid Popup 2 (px)', helper: 'Dimensione carattere per la riga 2 del popup rete. Predefinita 16' },
          sensor_popup_grid_3: { label: 'Grid Popup 3', helper: 'Entità per la riga 3 del popup rete.' },
          sensor_popup_grid_3_name: { label: 'Nome Grid Popup 3', helper: 'Nome personalizzato opzionale per la riga 3 del popup rete. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_grid_3_color: { label: 'Colore Grid Popup 3', helper: 'Colore per il testo della riga 3 del popup rete.' },
          sensor_popup_grid_3_font_size: { label: 'Dimensione carattere Grid Popup 3 (px)', helper: 'Dimensione carattere per la riga 3 del popup rete. Predefinita 16' },
          sensor_popup_grid_4: { label: 'Grid Popup 4', helper: 'Entità per la riga 4 del popup rete.' },
          sensor_popup_grid_4_name: { label: 'Nome Grid Popup 4', helper: 'Nome personalizzato opzionale per la riga 4 del popup rete. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_grid_4_color: { label: 'Colore Grid Popup 4', helper: 'Colore per il testo della riga 4 del popup rete.' },
          sensor_popup_grid_4_font_size: { label: 'Dimensione carattere Grid Popup 4 (px)', helper: 'Dimensione carattere per la riga 4 del popup rete. Predefinita 16' },
          sensor_popup_grid_5: { label: 'Grid Popup 5', helper: 'Entità per la riga 5 del popup rete.' },
          sensor_popup_grid_5_name: { label: 'Nome Grid Popup 5', helper: 'Nome personalizzato opzionale per la riga 5 del popup rete. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_grid_5_color: { label: 'Colore Grid Popup 5', helper: 'Colore per il testo della riga 5 del popup rete.' },
          sensor_popup_grid_5_font_size: { label: 'Dimensione carattere Grid Popup 5 (px)', helper: 'Dimensione carattere per la riga 5 del popup rete. Predefinita 16' },
          sensor_popup_grid_6: { label: 'Grid Popup 6', helper: 'Entità per la riga 6 del popup rete.' },
          sensor_popup_grid_6_name: { label: 'Nome Grid Popup 6', helper: 'Nome personalizzato opzionale per la riga 6 del popup rete. Lasciare vuoto per usare il nome entità.' },
          sensor_popup_grid_6_color: { label: 'Colore Grid Popup 6', helper: 'Colore per il testo della riga 6 del popup rete.' },
          sensor_popup_grid_6_font_size: { label: 'Dimensione carattere Grid Popup 6 (px)', helper: 'Dimensione carattere per la riga 6 del popup rete. Predefinita 16' },
          sensor_popup_inverter_1: { label: 'Inverter Popup 1', helper: 'Entita per la riga 1 del popup inverter.' },
          sensor_popup_inverter_1_name: { label: 'Nome Inverter Popup 1', helper: 'Nome personalizzato opzionale per la riga 1 del popup inverter. Lasciare vuoto per utilizzare il nome entita.' },
          sensor_popup_inverter_1_color: { label: 'Colore Inverter Popup 1', helper: 'Colore per il testo della riga 1 del popup inverter.' },
          sensor_popup_inverter_1_font_size: { label: 'Dimensione carattere Inverter Popup 1 (px)', helper: 'Dimensione carattere per la riga 1 del popup inverter. Predefinita 16' },
          sensor_popup_inverter_2: { label: 'Inverter Popup 2', helper: 'Entita per la riga 2 del popup inverter.' },
          sensor_popup_inverter_2_name: { label: 'Nome Inverter Popup 2', helper: 'Nome personalizzato opzionale per la riga 2 del popup inverter. Lasciare vuoto per utilizzare il nome entita.' },
          sensor_popup_inverter_2_color: { label: 'Colore Inverter Popup 2', helper: 'Colore per il testo della riga 2 del popup inverter.' },
          sensor_popup_inverter_2_font_size: { label: 'Dimensione carattere Inverter Popup 2 (px)', helper: 'Dimensione carattere per la riga 2 del popup inverter. Predefinita 16' },
          sensor_popup_inverter_3: { label: 'Inverter Popup 3', helper: 'Entita per la riga 3 del popup inverter.' },
          sensor_popup_inverter_3_name: { label: 'Nome Inverter Popup 3', helper: 'Nome personalizzato opzionale per la riga 3 del popup inverter. Lasciare vuoto per utilizzare il nome entita.' },
          sensor_popup_inverter_3_color: { label: 'Colore Inverter Popup 3', helper: 'Colore per il testo della riga 3 del popup inverter.' },
          sensor_popup_inverter_3_font_size: { label: 'Dimensione carattere Inverter Popup 3 (px)', helper: 'Dimensione carattere per la riga 3 del popup inverter. Predefinita 16' },
          sensor_popup_inverter_4: { label: 'Inverter Popup 4', helper: 'Entita per la riga 4 del popup inverter.' },
          sensor_popup_inverter_4_name: { label: 'Nome Inverter Popup 4', helper: 'Nome personalizzato opzionale per la riga 4 del popup inverter. Lasciare vuoto per utilizzare il nome entita.' },
          sensor_popup_inverter_4_color: { label: 'Colore Inverter Popup 4', helper: 'Colore per il testo della riga 4 del popup inverter.' },
          sensor_popup_inverter_4_font_size: { label: 'Dimensione carattere Inverter Popup 4 (px)', helper: 'Dimensione carattere per la riga 4 del popup inverter. Predefinita 16' },
          sensor_popup_inverter_5: { label: 'Inverter Popup 5', helper: 'Entita per la riga 5 del popup inverter.' },
          sensor_popup_inverter_5_name: { label: 'Nome Inverter Popup 5', helper: 'Nome personalizzato opzionale per la riga 5 del popup inverter. Lasciare vuoto per utilizzare il nome entita.' },
          sensor_popup_inverter_5_color: { label: 'Colore Inverter Popup 5', helper: 'Colore per il testo della riga 5 del popup inverter.' },
          sensor_popup_inverter_5_font_size: { label: 'Dimensione carattere Inverter Popup 5 (px)', helper: 'Dimensione carattere per la riga 5 del popup inverter. Predefinita 16' },
          sensor_popup_inverter_6: { label: 'Inverter Popup 6', helper: 'Entita per la riga 6 del popup inverter.' },
          sensor_popup_inverter_6_name: { label: 'Nome Inverter Popup 6', helper: 'Nome personalizzato opzionale per la riga 6 del popup inverter. Lasciare vuoto per utilizzare il nome entita.' },
          sensor_popup_inverter_6_color: { label: 'Colore Inverter Popup 6', helper: 'Colore per il testo della riga 6 del popup inverter.' },
          sensor_popup_inverter_6_font_size: { label: 'Dimensione carattere Inverter Popup 6 (px)', helper: 'Dimensione carattere per la riga 6 del popup inverter. Predefinita 16' }
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
            { value: 'dashes_glow', label: 'Tratteggi + Bagliore' },
            { value: 'fluid_flow', label: 'Flusso fluido' },
            { value: 'dots', label: 'Punti' },
            { value: 'arrows', label: 'Frecce' }
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
          pvCommon: { title: 'Solar/PV Allgemein', helper: 'Gemeinsame Solar/PV Einstellungen fuer beide Arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'PV Array 1 Entitaeten konfigurieren.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          windmill: { title: 'Windmill', helper: 'Windrad-Generator Sensoren und Darstellung konfigurieren.' },
          battery: { title: 'Batterie', helper: 'Batterie-Entitaeten konfigurieren.' },
          grid: { title: 'Netz', helper: 'Netz-Entitaeten konfigurieren.' },
          car: { title: 'Auto', helper: 'EV-Entitaeten konfigurieren.' },
          other: { title: 'Haus', helper: 'Zusätzliche Sensoren und Erweiterungsoptionen.' },
          entities: { title: 'Entitaetenauswahl', helper: 'PV-, Batterie-, Netz-, Verbrauchs- und optionale EV-Entitaeten waehlen. Entweder der PV-Gesamt-Sensor oder Ihre PV-String-Arrays muessen mindestens angegeben werden.' },
          pvPopup: { title: 'PV Popup', helper: 'Entitaeten fuer die PV-Popup-Anzeige konfigurieren.' },
          housePopup: { title: 'House Popup', helper: 'Entitaeten fuer die House-Popup-Anzeige konfigurieren.' },
          batteryPopup: { title: 'Batterie-Popup', helper: 'Konfigurieren Sie die Batterie-Popup-Anzeige.' },
          gridPopup: { title: 'Netz-Popup', helper: 'Entitaeten fuer die Netz-Popup-Anzeige konfigurieren.' },
          inverterPopup: { title: 'Inverter-Popup', helper: 'Entitaeten fuer die Inverter-Popup-Anzeige konfigurieren.' },
          colors: { title: 'Farben & Schwellwerte', helper: 'Grenzwerte und Farben fuer Netz- und EV-Anzeige einstellen.' },
          typography: { title: 'Typografie', helper: 'Schriftgroessen der Karte feinjustieren.' },
          about: { title: 'Info', helper: 'Credits, Version und nuetzliche Links.' }
        },
        fields: {
          card_title: { label: 'Kartentitel', helper: 'Titel oben auf der Karte. Leer lassen, um zu deaktivieren.' },
          background_image: { label: 'Pfad zum Hintergrundbild', helper: 'Pfad zum Hintergrundbild (z. B. /local/community/lumina-energy-card/lumina_background.svg).' },
          language: { label: 'Sprache', helper: 'Editor-Sprache waehlen.' },
          display_unit: { label: 'Anzeigeeinheit', helper: 'Einheit fuer Leistungswerte.' },
          update_interval: { label: 'Aktualisierungsintervall', helper: 'Aktualisierungsfrequenz der Karte (0 deaktiviert das Limit).' },
          animation_speed_factor: { label: 'Animationsgeschwindigkeit', helper: 'Animationsfaktor zwischen -3x und 3x. 0 pausiert, negative Werte kehren den Fluss um.' },
          animation_style: { label: 'Animationsstil (Tag)', helper: 'Fluss-Animationsstil fuer Tag-Modus.' },
          night_animation_style: { label: 'Animationsstil (Nacht)', helper: 'Fluss-Animationsstil fuer Nacht-Modus. Leer lassen fuer Tag-Stil.' },
          dashes_glow_intensity: { label: 'Strich-Glow Intensitaet', helper: 'Steuert den Glow fuer "Striche + Leuchten" (0 deaktiviert).' },
          fluid_flow_outer_glow: { label: 'Fluid Flow Aussen-Glow', helper: 'Aktiviert die zusaetzliche Aussen-Glow/Haze-Schicht fuer animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Strichstaerke (px)', helper: 'Optionales Override fuer die Strichstaerke der Flow-Animation (ohne SVG-Aenderung). Leer lassen fuer SVG-Defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Strichstaerke (px)', helper: 'Basis-Strichstaerke fuer animation_style: fluid_flow. Overlay/Maskenbreiten werden davon abgeleitet (Standard 5).' },
          
          sensor_pv_total: { label: 'PV Gesamt Sensor', helper: 'Optionaler aggregierter Sensor fuer die kombinierte Linie.' },
          sensor_pv_total_secondary: { label: 'PV Gesamt Sensor (WR 2)', helper: 'Optionaler zweiter Wechselrichter; wird mit dem PV-Gesamtwert addiert.' },
          sensor_windmill_total: { label: 'Windmill Total', helper: 'Leistungssensor fuer den Windrad-Generator (W). Wenn nicht gesetzt, wird die Windmill SVG-Gruppe ausgeblendet.' },
          sensor_windmill_daily: { label: 'Daily Windmill Production', helper: 'Optionaler Sensor fuer taegliche Windmill-Produktion.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Primaerer Solarsensor.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          sensor_daily: { label: 'Tagesproduktion Sensor (Erforderlich)', helper: 'Sensor fuer taegliche Produktionssumme. Entweder der PV-Gesamt-Sensor oder Ihre PV-String-Arrays muessen mindestens angegeben werden.' },
          sensor_daily_array2: { label: 'Tagesproduktion Sensor (Array 2)', helper: 'Sensor fuer die taegliche Produktionssumme von Array 2.' },
          sensor_bat1_soc: { label: 'Batterie 1 SOC' },
          sensor_bat1_power: { label: 'Batterie 1 Leistung', helper: 'Hinterlegen Sie entweder diesen kombinierten Leistungssensor oder sowohl Lade- als auch Entladeleistung, damit Batterie 1 aktiv wird.' },
          sensor_bat1_charge_power: { label: 'Batterie 1 Ladeleistung' },
          sensor_bat1_discharge_power: { label: 'Batterie 1 Entladeleistung' },
          sensor_bat2_soc: { label: 'Batterie 2 SOC' },
          sensor_bat2_power: { label: 'Batterie 2 Leistung', helper: 'Hinterlegen Sie entweder diesen kombinierten Leistungssensor oder sowohl Lade- als auch Entladeleistung, damit Batterie 2 aktiv wird.' },
          sensor_bat2_charge_power: { label: 'Batterie 2 Ladeleistung' },
          sensor_bat2_discharge_power: { label: 'Batterie 2 Entladeleistung' },
          sensor_bat3_soc: { label: 'Batterie 3 SOC' },
          sensor_bat3_power: { label: 'Batterie 3 Leistung', helper: 'Hinterlegen Sie entweder diesen kombinierten Leistungssensor oder sowohl Lade- als auch Entladeleistung, damit Batterie 3 aktiv wird.' },
          sensor_bat3_charge_power: { label: 'Batterie 3 Ladeleistung' },
          sensor_bat3_discharge_power: { label: 'Batterie 3 Entladeleistung' },
          sensor_bat4_soc: { label: 'Batterie 4 SOC' },
          sensor_bat4_power: { label: 'Batterie 4 Leistung', helper: 'Hinterlegen Sie entweder diesen kombinierten Leistungssensor oder sowohl Lade- als auch Entladeleistung, damit Batterie 4 aktiv wird.' },
          sensor_bat4_charge_power: { label: 'Batterie 4 Ladeleistung' },
          sensor_bat4_discharge_power: { label: 'Batterie 4 Entladeleistung' },
          sensor_home_load: { label: 'Hausverbrauch (Erforderlich)', helper: 'Sensor fuer Gesamtverbrauch des Haushalts.' },
          sensor_home_load_secondary: { label: 'Hausverbrauch (WR 2)', helper: 'Optionale Hauslast-Entitaet fuer den zweiten Wechselrichter.' },
          sensor_heat_pump_consumption: { label: 'Waermepumpenverbrauch', helper: 'Sensor fuer den Energieverbrauch der Waermepumpe.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'Sensor fuer Pool-Leistung/Verbrauch.' },
          sensor_washing_machine_consumption: { label: 'Waschmaschine', helper: 'Sensor fuer Waschmaschinen-Leistung/Verbrauch.' },
          sensor_dryer_consumption: { label: 'Trockner', helper: 'Sensor fuer Trockner-Leistung/Verbrauch.' },
          sensor_refrigerator_consumption: { label: 'Kuehlschrank', helper: 'Sensor fuer Kuehlschrank-Leistung/Verbrauch.' },
          sensor_grid_power: { label: 'Netzleistung (WR 1)', helper: 'Sensor fuer positiven/negativen Netzfluss fuer Wechselrichter 1. Geben Sie entweder diesen Sensor an oder sowohl den Netzimport-Sensor (WR 1) als auch den Netzexport-Sensor (WR 1).' },
          sensor_grid_import: { label: 'Netzimport Sensor (WR 1)', helper: 'Optionale Entitaet fuer positiven Netzimport von Wechselrichter 1.' },
          sensor_grid_export: { label: 'Netzexport Sensor (WR 1)', helper: 'Optionale Entitaet fuer positiven Netzexport von Wechselrichter 1.' },
          sensor_grid_import_daily: { label: 'Tages-Netzimport Sensor (WR 1)', helper: 'Optionale Entitaet, die den kumulierten Netzimport fuer den aktuellen Tag (WR 1) meldet.' },
          sensor_grid_export_daily: { label: 'Tages-Netzexport Sensor (WR 1)', helper: 'Optionale Entitaet, die den kumulierten Netzexport fuer den aktuellen Tag (WR 1) meldet.' },
          sensor_grid2_power: { label: 'Netzleistung (WR 2)', helper: 'Sensor fuer positiven/negativen Netzfluss fuer Wechselrichter 2. Geben Sie entweder diesen Sensor an oder sowohl den Netzimport-Sensor (WR 2) als auch den Netzexport-Sensor (WR 2).' },
          sensor_grid2_import: { label: 'Netzimport Sensor (WR 2)', helper: 'Optionale Entitaet fuer positiven Netzimport von Wechselrichter 2.' },
          sensor_grid2_export: { label: 'Netzexport Sensor (WR 2)', helper: 'Optionale Entitaet fuer positiven Netzexport von Wechselrichter 2.' },
          sensor_grid2_import_daily: { label: 'Tages-Netzimport Sensor (WR 2)', helper: 'Optionale Entitaet, die den kumulierten Netzimport fuer den aktuellen Tag (WR 2) meldet.' },
          sensor_grid2_export_daily: { label: 'Tages-Netzexport Sensor (WR 2)', helper: 'Optionale Entitaet, die den kumulierten Netzexport fuer den aktuellen Tag (WR 2) meldet.' },
          show_daily_grid: { label: 'Tages-Netzwerte anzeigen', helper: 'Zeigt die taeglichen Import-/Exporttotalen unter dem aktuellen Netzfluss an, wenn aktiviert.' },
          grid_daily_font_size: { label: 'Schriftgroesse Tagesnetz (px)', helper: 'Optional: ueberschreibt die Schriftgroesse der taeglichen Import/Export-Werte. Standard: Schriftgroesse Netz.' },
          grid_current_odometer: { label: 'Odometer: Netz aktuell', helper: 'Animiert den aktuellen Netz-Wert mit einem Ziffern-Roll-Effekt.' },
          grid_current_odometer_duration: { label: 'Odometer Dauer (ms)', helper: 'Animationsdauer in Millisekunden. Standard 350.' },
          show_grid_flow_label: { label: 'Netz Import/Export Text anzeigen', helper: 'Fuegt "Importieren"/"Exportieren" vor dem Netzwert ein, wenn aktiviert.' },
          enable_echo_alive: { label: 'Enable Echo Alive', helper: 'Enables an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_primary_color: { label: 'PV 1 Flussfarbe', helper: 'Farbe fuer die primaere PV-Animationslinie.' },
          pv_tot_color: { label: 'PV Gesamt Farbe', helper: 'Farbe fuer die PV Gesamt Zeile.' },
          pv_secondary_color: { label: 'PV 2 Flussfarbe', helper: 'Farbe fuer die zweite PV-Linie (falls vorhanden).' },
          load_flow_color: { label: 'Lastflussfarbe', helper: 'Farbe fuer die Hausverbrauch-Animationslinie.' },
          load_text_color: { label: 'Last Textfarbe', helper: 'Farbe fuer den Hausverbrauchstext, wenn keine Schwellen aktiv sind.' },
          house_total_color: { label: 'House Total Farbe', helper: 'Farbe fuer HOUSE TOT Text/Fluss.' },
          inv1_color: { label: 'INV 1 Farbe', helper: 'Farbe fuer INV 1 Text/Fluss.' },
          inv2_color: { label: 'INV 2 Farbe', helper: 'Farbe fuer INV 2 Text/Fluss.' },
          load_threshold_warning: { label: 'Last Warnschwelle', helper: 'Farbe wechseln, wenn der Verbrauch diese Magnitude erreicht. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          load_warning_color: { label: 'Last Warnfarbe', helper: 'Farbe bei Erreichen der Warnschwelle des Hausverbrauchs.' },
          load_threshold_critical: { label: 'Last Kritische Schwelle', helper: 'Farbe wechseln, wenn der Verbrauch diese kritische Magnitude erreicht. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          load_critical_color: { label: 'Last Kritische Farbe', helper: 'Farbe bei Erreichen der kritischen Hausverbrauchsschwelle.' },
          battery_soc_color: { label: 'Batterie SOC Farbe', helper: 'Farbe für den Batterie-SOC-Prozenttext.' },
          battery_charge_color: { label: 'Batterie Ladeflussfarbe', helper: 'Farbe wenn Energie in die Batterie fliesst.' },
          battery_discharge_color: { label: 'Batterie Entladeflussfarbe', helper: 'Farbe wenn Energie aus der Batterie fliesst.' },
          grid_import_color: { label: 'Netzimport Flussfarbe (WR 1)', helper: 'Basisfarbe (vor Schwellwerten) beim Netzimport von WR 1.' },
          grid_export_color: { label: 'Netzexport Flussfarbe (WR 1)', helper: 'Basisfarbe (vor Schwellwerten) beim Netzexport von WR 1.' },
          grid2_import_color: { label: 'Netzimport Flussfarbe (WR 2)', helper: 'Basisfarbe (vor Schwellwerten) beim Netzimport von WR 2.' },
          grid2_export_color: { label: 'Netzexport Flussfarbe (WR 2)', helper: 'Basisfarbe (vor Schwellwerten) beim Netzexport von WR 2.' },
          car_flow_color: { label: 'EV Flussfarbe', helper: 'Farbe fuer die EV-Animationslinie.' },
          battery_fill_high_color: { label: 'Batterie Fuellfarbe (normal)', helper: 'Fluessigkeitsfarbe wenn die Batterie-SOC ueber dem niedrigen Schwellwert liegt.' },
          battery_fill_low_color: { label: 'Batterie Fuellfarbe (niedrig)', helper: 'Fluessigkeitsfarbe wenn die Batterie-SOC dem niedrigen Schwellwert entspricht oder darunter liegt.' },
          battery_fill_low_threshold: { label: 'Niedriger SOC-Schwellenwert (%)', helper: 'Verwende die niedrige Fuellfarbe, wenn die Batterie-SOC diesen Prozentsatz erreicht oder unterschreitet.' },
          battery_fill_opacity: { label: 'Batterie Fuellstand Deckkraft', helper: 'Deckkraft fuer den Batterie-Fuellstand (0-1).' },
          grid_activity_threshold: { label: 'Netz Animationsschwelle (W)', helper: 'Ignoriere Netzfluesse mit geringerer Absolutleistung, bevor animiert wird.' },
          grid_threshold_warning: { label: 'Netz Warnschwelle (WR 1)', helper: 'Farbe wechseln, wenn diese Magnitude fuer WR 1 erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid_warning_color: { label: 'Netz Warnfarbe (WR 1)', helper: 'Farbe bei Erreichen der Warnschwelle fuer WR 1.' },
          grid_threshold_critical: { label: 'Netz Kritische Schwelle (WR 1)', helper: 'Farbe wechseln, wenn diese Magnitude fuer WR 1 erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid_critical_color: { label: 'Netz Kritische Farbe (WR 1)', helper: 'Farbe bei Erreichen der kritischen Schwelle fuer WR 1.' },
          grid2_threshold_warning: { label: 'Netz Warnschwelle (WR 2)', helper: 'Farbe wechseln, wenn diese Magnitude fuer WR 2 erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid2_warning_color: { label: 'Netz Warnfarbe (WR 2)', helper: 'Farbe bei Erreichen der Warnschwelle fuer WR 2.' },
          grid2_threshold_critical: { label: 'Netz Kritische Schwelle (WR 2)', helper: 'Farbe wechseln, wenn diese Magnitude fuer WR 2 erreicht wird. Verwendet die ausgewaehlte Anzeigeeinheit.' },
          grid2_critical_color: { label: 'Netz Kritische Farbe (WR 2)', helper: 'Farbe bei Erreichen der kritischen Schwelle fuer WR 2.' },
          invert_grid: { label: 'Netzwerte invertieren', helper: 'Aktivieren, wenn Import/Export vertauscht ist.' },
          invert_battery: { label: 'Batterie-Werte invertieren', helper: 'Aktivieren, wenn Lade-/Entlade-Polarität vertauscht ist.' },
          invert_bat1: { label: 'Batterie 1 invertieren', helper: 'Aktivieren, wenn die Lade-/Entlade-Polarität von Batterie 1 vertauscht ist.' },
          invert_bat2: { label: 'Batterie 2 invertieren', helper: 'Aktivieren, wenn die Lade-/Entlade-Polarität von Batterie 2 vertauscht ist.' },
          invert_bat3: { label: 'Batterie 3 invertieren', helper: 'Aktivieren, wenn die Lade-/Entlade-Polarität von Batterie 3 vertauscht ist.' },
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
          car_headlight_flash: { label: 'Scheinwerferblitz beim Laden', helper: 'Aktivieren, um die Fahrzeugscheinwerfer waehrend des Ladevorgangs blinken zu lassen.' },
          car_pct_color: { label: 'Farbe fuer SOC', helper: 'Hex Farbe fuer EV SOC Text (z. B. #00FFFF).' },
          car2_pct_color: { label: 'Farbe SOC Auto 2', helper: 'Hex Farbe fuer SOC Text des zweiten Fahrzeugs (faellt auf Car SOC zurueck).' },
          car1_name_color: { label: 'Farbe Name Auto 1', helper: 'Farbe fuer die Bezeichnung von Fahrzeug 1.' },
          car2_name_color: { label: 'Farbe Name Auto 2', helper: 'Farbe fuer die Bezeichnung von Fahrzeug 2.' },
          car1_color: { label: 'Farbe Auto 1', helper: 'Farbe fuer die Leistungsanzeige von Fahrzeug 1.' },
          car2_color: { label: 'Farbe Auto 2', helper: 'Farbe fuer die Leistungsanzeige von Fahrzeug 2.' },
          heat_pump_flow_color: { label: 'Waermepumpenfluss Farbe', helper: 'Farbe fuer die Waermepumpenfluss Animation.' },
          heat_pump_text_color: { label: 'Waermepumpentext Farbe', helper: 'Farbe fuer den Waermepumpenleistungstext.' },
          pool_flow_color: { label: 'Poolfluss Farbe', helper: 'Farbe fuer die Poolfluss Animation.' },
          pool_text_color: { label: 'Pooltext Farbe', helper: 'Farbe fuer den Poolleistungstext.' },
          washing_machine_text_color: { label: 'Waschmaschine Textfarbe', helper: 'Farbe fuer den Waschmaschinen-Leistungstext.' },
          dryer_text_color: { label: 'Trockner Textfarbe', helper: 'Farbe fuer den Trockner-Leistungstext.' },
          refrigerator_text_color: { label: 'Kuehlschrank Textfarbe', helper: 'Farbe fuer den Kuehlschrank-Leistungstext.' },
          windmill_flow_color: { label: 'Windmill Flow Color', helper: 'Farbe fuer den Windmill-Flow (data-flow-key="windmill").' },
          windmill_text_color: { label: 'Windmill Text Color', helper: 'Farbe fuer den Windmill-Leistungstext (data-role="windmill-power").' },
          header_font_size: { label: 'Schriftgroesse Titel (px)', helper: 'Standard 16' },
          daily_label_font_size: { label: 'Schriftgroesse Tageslabel (px)', helper: 'Standard 12' },
          daily_value_font_size: { label: 'Schriftgroesse Tageswert (px)', helper: 'Standard 20' },
          pv_font_size: { label: 'Schriftgroesse PV Text (px)', helper: 'Standard 16' },
          windmill_power_font_size: { label: 'Windmill Power Font Size (px)', helper: 'Standard 16' },
          battery_soc_font_size: { label: 'Schriftgroesse Batterie SOC (px)', helper: 'Standard 20' },
          battery_power_font_size: { label: 'Schriftgroesse Batterie Leistung (px)', helper: 'Standard 16' },
          load_font_size: { label: 'Schriftgroesse Last (px)', helper: 'Standard 15' },
          inv1_power_font_size: { label: 'Schriftgroesse INV 1 Leistung (px)', helper: 'Schriftgroesse fuer die INV 1 Leistungszeile. Standard ist die Last-Schriftgroesse.' },
          inv2_power_font_size: { label: 'Schriftgroesse INV 2 Leistung (px)', helper: 'Schriftgroesse fuer die INV 2 Leistungszeile. Standard ist die Last-Schriftgroesse.' },
          heat_pump_font_size: { label: 'Schriftgroesse Waermepumpe (px)', helper: 'Standard 16' },
          pool_font_size: { label: 'Schriftgroesse Pool (px)', helper: 'Standard 16' },
          washing_machine_font_size: { label: 'Schriftgroesse Waschmaschine (px)', helper: 'Standard 16' },
          dryer_font_size: { label: 'Schriftgroesse Trockner (px)', helper: 'Standard 16' },
          refrigerator_font_size: { label: 'Schriftgroesse Kuehlschrank (px)', helper: 'Standard 16' },
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
          sensor_popup_house_6_font_size: { label: 'Schriftgroesse House Popup 6 (px)', helper: 'Schriftgroesse fuer House Popup Zeile 6. Standard 16' },
          sensor_popup_bat_1: { label: 'Battery Popup 1', helper: 'Entitaet fuer Battery Popup Zeile 1.' },
          sensor_popup_bat_1_name: { label: 'Name Battery Popup 1', helper: 'Optionaler benutzerdefinierter Name fuer Battery Popup Zeile 1. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_bat_1_color: { label: 'Farbe Battery Popup 1', helper: 'Farbe fuer Battery Popup Zeile 1 Text.' },
          sensor_popup_bat_1_font_size: { label: 'Schriftgroesse Battery Popup 1 (px)', helper: 'Schriftgroesse fuer Battery Popup Zeile 1. Standard 16' },
          sensor_popup_bat_2: { label: 'Battery Popup 2', helper: 'Entitaet fuer Battery Popup Zeile 2.' },
          sensor_popup_bat_2_name: { label: 'Name Battery Popup 2', helper: 'Optionaler benutzerdefinierter Name fuer Battery Popup Zeile 2. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_bat_2_color: { label: 'Farbe Battery Popup 2', helper: 'Farbe fuer Battery Popup Zeile 2 Text.' },
          sensor_popup_bat_2_font_size: { label: 'Schriftgroesse Battery Popup 2 (px)', helper: 'Schriftgroesse fuer Battery Popup Zeile 2. Standard 16' },
          sensor_popup_bat_3: { label: 'Battery Popup 3', helper: 'Entitaet fuer Battery Popup Zeile 3.' },
          sensor_popup_bat_3_name: { label: 'Name Battery Popup 3', helper: 'Optionaler benutzerdefinierter Name fuer Battery Popup Zeile 3. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_bat_3_color: { label: 'Farbe Battery Popup 3', helper: 'Farbe fuer Battery Popup Zeile 3 Text.' },
          sensor_popup_bat_3_font_size: { label: 'Schriftgroesse Battery Popup 3 (px)', helper: 'Schriftgroesse fuer Battery Popup Zeile 3. Standard 16' },
          sensor_popup_bat_4: { label: 'Battery Popup 4', helper: 'Entitaet fuer Battery Popup Zeile 4.' },
          sensor_popup_bat_4_name: { label: 'Name Battery Popup 4', helper: 'Optionaler benutzerdefinierter Name fuer Battery Popup Zeile 4. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_bat_4_color: { label: 'Farbe Battery Popup 4', helper: 'Farbe fuer Battery Popup Zeile 4 Text.' },
          sensor_popup_bat_4_font_size: { label: 'Schriftgroesse Battery Popup 4 (px)', helper: 'Schriftgroesse fuer Battery Popup Zeile 4. Standard 16' },
          sensor_popup_bat_5: { label: 'Battery Popup 5', helper: 'Entitaet fuer Battery Popup Zeile 5.' },
          sensor_popup_bat_5_name: { label: 'Name Battery Popup 5', helper: 'Optionaler benutzerdefinierter Name fuer Battery Popup Zeile 5. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_bat_5_color: { label: 'Farbe Battery Popup 5', helper: 'Farbe fuer Battery Popup Zeile 5 Text.' },
          sensor_popup_bat_5_font_size: { label: 'Schriftgroesse Battery Popup 5 (px)', helper: 'Schriftgroesse fuer Battery Popup Zeile 5. Standard 16' },
          sensor_popup_bat_6: { label: 'Battery Popup 6', helper: 'Entitaet fuer Battery Popup Zeile 6.' },
          sensor_popup_bat_6_name: { label: 'Name Battery Popup 6', helper: 'Optionaler benutzerdefinierter Name fuer Battery Popup Zeile 6. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_bat_6_color: { label: 'Farbe Battery Popup 6', helper: 'Farbe fuer Battery Popup Zeile 6 Text.' },
          sensor_popup_bat_6_font_size: { label: 'Schriftgroesse Battery Popup 6 (px)', helper: 'Schriftgroesse fuer Battery Popup Zeile 6. Standard 16' },
          sensor_popup_grid_1: { label: 'Grid Popup 1', helper: 'Entitaet fuer Grid Popup Zeile 1.' },
          sensor_popup_grid_1_name: { label: 'Name Grid Popup 1', helper: 'Optionaler benutzerdefinierter Name fuer Grid Popup Zeile 1. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_grid_1_color: { label: 'Farbe Grid Popup 1', helper: 'Farbe fuer Grid Popup Zeile 1 Text.' },
          sensor_popup_grid_1_font_size: { label: 'Schriftgroesse Grid Popup 1 (px)', helper: 'Schriftgroesse fuer Grid Popup Zeile 1. Standard 16' },
          sensor_popup_grid_2: { label: 'Grid Popup 2', helper: 'Entitaet fuer Grid Popup Zeile 2.' },
          sensor_popup_grid_2_name: { label: 'Name Grid Popup 2', helper: 'Optionaler benutzerdefinierter Name fuer Grid Popup Zeile 2. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_grid_2_color: { label: 'Farbe Grid Popup 2', helper: 'Farbe fuer Grid Popup Zeile 2 Text.' },
          sensor_popup_grid_2_font_size: { label: 'Schriftgroesse Grid Popup 2 (px)', helper: 'Schriftgroesse fuer Grid Popup Zeile 2. Standard 16' },
          sensor_popup_grid_3: { label: 'Grid Popup 3', helper: 'Entitaet fuer Grid Popup Zeile 3.' },
          sensor_popup_grid_3_name: { label: 'Name Grid Popup 3', helper: 'Optionaler benutzerdefinierter Name fuer Grid Popup Zeile 3. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_grid_3_color: { label: 'Farbe Grid Popup 3', helper: 'Farbe fuer Grid Popup Zeile 3 Text.' },
          sensor_popup_grid_3_font_size: { label: 'Schriftgroesse Grid Popup 3 (px)', helper: 'Schriftgroesse fuer Grid Popup Zeile 3. Standard 16' },
          sensor_popup_grid_4: { label: 'Grid Popup 4', helper: 'Entitaet fuer Grid Popup Zeile 4.' },
          sensor_popup_grid_4_name: { label: 'Name Grid Popup 4', helper: 'Optionaler benutzerdefinierter Name fuer Grid Popup Zeile 4. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_grid_4_color: { label: 'Farbe Grid Popup 4', helper: 'Farbe fuer Grid Popup Zeile 4 Text.' },
          sensor_popup_grid_4_font_size: { label: 'Schriftgroesse Grid Popup 4 (px)', helper: 'Schriftgroesse fuer Grid Popup Zeile 4. Standard 16' },
          sensor_popup_grid_5: { label: 'Grid Popup 5', helper: 'Entitaet fuer Grid Popup Zeile 5.' },
          sensor_popup_grid_5_name: { label: 'Name Grid Popup 5', helper: 'Optionaler benutzerdefinierter Name fuer Grid Popup Zeile 5. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_grid_5_color: { label: 'Farbe Grid Popup 5', helper: 'Farbe fuer Grid Popup Zeile 5 Text.' },
          sensor_popup_grid_5_font_size: { label: 'Schriftgroesse Grid Popup 5 (px)', helper: 'Schriftgroesse fuer Grid Popup Zeile 5. Standard 16' },
          sensor_popup_grid_6: { label: 'Grid Popup 6', helper: 'Entitaet fuer Grid Popup Zeile 6.' },
          sensor_popup_grid_6_name: { label: 'Name Grid Popup 6', helper: 'Optionaler benutzerdefinierter Name fuer Grid Popup Zeile 6. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_grid_6_color: { label: 'Farbe Grid Popup 6', helper: 'Farbe fuer Grid Popup Zeile 6 Text.' },
          sensor_popup_grid_6_font_size: { label: 'Schriftgroesse Grid Popup 6 (px)', helper: 'Schriftgroesse fuer Grid Popup Zeile 6. Standard 16' },
          sensor_popup_inverter_1: { label: 'Inverter Popup 1', helper: 'Entitaet fuer Inverter Popup Zeile 1.' },
          sensor_popup_inverter_1_name: { label: 'Name Inverter Popup 1', helper: 'Optionaler benutzerdefinierter Name fuer Inverter Popup Zeile 1. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_inverter_1_color: { label: 'Farbe Inverter Popup 1', helper: 'Farbe fuer Inverter Popup Zeile 1 Text.' },
          sensor_popup_inverter_1_font_size: { label: 'Schriftgroesse Inverter Popup 1 (px)', helper: 'Schriftgroesse fuer Inverter Popup Zeile 1. Standard 16' },
          sensor_popup_inverter_2: { label: 'Inverter Popup 2', helper: 'Entitaet fuer Inverter Popup Zeile 2.' },
          sensor_popup_inverter_2_name: { label: 'Name Inverter Popup 2', helper: 'Optionaler benutzerdefinierter Name fuer Inverter Popup Zeile 2. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_inverter_2_color: { label: 'Farbe Inverter Popup 2', helper: 'Farbe fuer Inverter Popup Zeile 2 Text.' },
          sensor_popup_inverter_2_font_size: { label: 'Schriftgroesse Inverter Popup 2 (px)', helper: 'Schriftgroesse fuer Inverter Popup Zeile 2. Standard 16' },
          sensor_popup_inverter_3: { label: 'Inverter Popup 3', helper: 'Entitaet fuer Inverter Popup Zeile 3.' },
          sensor_popup_inverter_3_name: { label: 'Name Inverter Popup 3', helper: 'Optionaler benutzerdefinierter Name fuer Inverter Popup Zeile 3. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_inverter_3_color: { label: 'Farbe Inverter Popup 3', helper: 'Farbe fuer Inverter Popup Zeile 3 Text.' },
          sensor_popup_inverter_3_font_size: { label: 'Schriftgroesse Inverter Popup 3 (px)', helper: 'Schriftgroesse fuer Inverter Popup Zeile 3. Standard 16' },
          sensor_popup_inverter_4: { label: 'Inverter Popup 4', helper: 'Entitaet fuer Inverter Popup Zeile 4.' },
          sensor_popup_inverter_4_name: { label: 'Name Inverter Popup 4', helper: 'Optionaler benutzerdefinierter Name fuer Inverter Popup Zeile 4. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_inverter_4_color: { label: 'Farbe Inverter Popup 4', helper: 'Farbe fuer Inverter Popup Zeile 4 Text.' },
          sensor_popup_inverter_4_font_size: { label: 'Schriftgroesse Inverter Popup 4 (px)', helper: 'Schriftgroesse fuer Inverter Popup Zeile 4. Standard 16' },
          sensor_popup_inverter_5: { label: 'Inverter Popup 5', helper: 'Entitaet fuer Inverter Popup Zeile 5.' },
          sensor_popup_inverter_5_name: { label: 'Name Inverter Popup 5', helper: 'Optionaler benutzerdefinierter Name fuer Inverter Popup Zeile 5. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_inverter_5_color: { label: 'Farbe Inverter Popup 5', helper: 'Farbe fuer Inverter Popup Zeile 5 Text.' },
          sensor_popup_inverter_5_font_size: { label: 'Schriftgroesse Inverter Popup 5 (px)', helper: 'Schriftgroesse fuer Inverter Popup Zeile 5. Standard 16' },
          sensor_popup_inverter_6: { label: 'Inverter Popup 6', helper: 'Entitaet fuer Inverter Popup Zeile 6.' },
          sensor_popup_inverter_6_name: { label: 'Name Inverter Popup 6', helper: 'Optionaler benutzerdefinierter Name fuer Inverter Popup Zeile 6. Leer lassen, um den Entitaetsnamen zu verwenden.' },
          sensor_popup_inverter_6_color: { label: 'Farbe Inverter Popup 6', helper: 'Farbe fuer Inverter Popup Zeile 6 Text.' },
          sensor_popup_inverter_6_font_size: { label: 'Schriftgroesse Inverter Popup 6 (px)', helper: 'Schriftgroesse fuer Inverter Popup Zeile 6. Standard 16' }
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
            { value: 'dashes_glow', label: 'Striche + Leuchten' },
            { value: 'fluid_flow', label: 'Fluessiger Fluss' },
            { value: 'dots', label: 'Punkte' },
            { value: 'arrows', label: 'Pfeile' }
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
          pvCommon: { title: 'Solaire/PV Commun', helper: 'Paramètres Solaire/PV partagés entre les arrays.' },
          array1: { title: 'Solaire/PV Array 1', helper: 'Configurer les entités de l Array PV 1.' },
          array2: { title: 'Solaire/PV Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          windmill: { title: 'Windmill', helper: 'Configurer les capteurs et le style du générateur éolien.' },
          battery: { title: 'Batterie', helper: 'Configurer les entités de la batterie.' },
          grid: { title: 'Réseau', helper: 'Configurer les entités du réseau.' },
          car: { title: 'Voiture', helper: 'Configurer les entités EV.' },
          other: { title: 'Maison', helper: 'Capteurs supplémentaires et options avancées.' },
          entities: { title: 'Sélection d entités', helper: 'Choisissez les entités PV, batterie, réseau, charge et EV utilisées par la carte. Soit le capteur PV total, soit vos tableaux de chaînes PV doivent être spécifiés au minimum.' },
          pvPopup: { title: 'Popup PV', helper: 'Configurer les entités pour l\'affichage du popup PV.' },
          housePopup: { title: 'Popup Maison', helper: 'Configurer les entités pour l\'affichage du popup maison.' },
          batteryPopup: { title: 'Popup Batterie', helper: 'Configurer l\'affichage du popup batterie.' },
          gridPopup: { title: 'Popup Réseau', helper: 'Configurer les entités pour l\'affichage du popup réseau.' },
          inverterPopup: { title: 'Popup Inverter', helper: 'Configurer les entités pour l\'affichage du popup inverter.' },
          colors: { title: 'Couleurs & Seuils', helper: 'Configurez les seuils réseau et les couleurs d accent pour les flux et l affichage EV.' },
          typography: { title: 'Typographie', helper: 'Ajustez les tailles de police utilisées dans la carte.' },
          about: { title: 'À propos', helper: 'Crédits, version et liens utiles.' }
        },
        fields: {
          card_title: { label: 'Titre de la carte', helper: 'Titre affiché en haut de la carte. Laisser vide pour désactiver.' },
          background_image: { label: 'Chemin image d arrière-plan', helper: 'Chemin vers l image d arrière-plan (ex. /local/community/lumina-energy-card/lumina_background.svg).' },
          language: { label: 'Langue', helper: 'Choisissez la langue de l éditeur.' },
          display_unit: { label: 'Unité d affichage', helper: 'Unité utilisée pour formater les valeurs de puissance.' },
          update_interval: { label: 'Intervalle de mise à jour', helper: 'Fréquence de rafraîchissement des mises à jour de la carte (0 désactive le throttling).' },
          animation_speed_factor: { label: 'Facteur de vitesse d animation', helper: 'Ajuste le multiplicateur de vitesse d animation (-3x à 3x). Mettre 0 pour pause; les négatifs inversent la direction.' },
          animation_style: { label: 'Style d animation (Jour)', helper: 'Style des flux utilisé en mode Jour.' },
          night_animation_style: { label: 'Style d animation (Nuit)', helper: 'Style des flux utilisé en mode Nuit. Laisser vide pour utiliser le style Jour.' },
          dashes_glow_intensity: { label: 'Intensité de lueur (tirets)', helper: 'Contrôle la lueur pour "Tirets + Lueur" (0 désactive).' },
          fluid_flow_outer_glow: { label: 'Lueur externe fluid flow', helper: 'Active la couche externe de lueur/haze pour animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Epaisseur flux (px)', helper: 'Override optionnel de l epaisseur des flux animés (sans modifier le SVG). Laisser vide pour garder les valeurs SVG.' },
          fluid_flow_stroke_width: { label: 'Epaisseur fluid flow (px)', helper: 'Epaisseur de base pour animation_style: fluid_flow. Les largeurs overlay/masque en dérivent (défaut 5).' },
          sensor_pv_total: { label: 'Capteur PV total', helper: 'Capteur de production agrégé optionnel affiché comme ligne combinée.' },
          sensor_pv_total_secondary: { label: 'Capteur PV total (Inverseur 2)', helper: 'Second capteur d onduleur optionnel; ajouté au total PV s il est fourni.' },
          sensor_windmill_total: { label: 'Windmill Total', helper: 'Capteur de puissance du générateur éolien (W). S il n est pas configuré, le groupe SVG windmill est masqué.' },
          sensor_windmill_daily: { label: 'Daily Windmill Production', helper: 'Capteur optionnel de production quotidienne windmill.' },
          sensor_pv1: { label: 'Chaîne PV 1 (Array 1)', helper: 'Capteur principal de production solaire.' },
          sensor_pv2: { label: 'Chaîne PV 2 (Array 1)' },
          sensor_pv3: { label: 'Chaîne PV 3 (Array 1)' },
          sensor_pv4: { label: 'Chaîne PV 4 (Array 1)' },
          sensor_pv5: { label: 'Chaîne PV 5 (Array 1)' },
          sensor_pv6: { label: 'Chaîne PV 6 (Array 1)' },
          sensor_pv_array2_1: { label: 'Chaîne PV 1 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_2: { label: 'Chaîne PV 2 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_3: { label: 'Chaîne PV 3 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_4: { label: 'Chaîne PV 4 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_5: { label: 'Chaîne PV 5 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_pv_array2_6: { label: 'Chaîne PV 6 (Array 2)', helper: 'Capteur de production solaire de l Array 2.' },
          sensor_daily: { label: 'Capteur production quotidienne (Requis)', helper: 'Capteur indiquant les totaux de production journaliers. Soit le capteur PV total, soit vos tableaux de chaînes PV doivent être spécifiés au minimum.' },
          sensor_daily_array2: { label: 'Capteur production quotidienne (Array 2)', helper: 'Capteur pour les totaux de production journaliers de l Array 2.' },
          sensor_bat1_soc: { label: 'SOC Batterie 1' },
          sensor_bat1_power: { label: 'Puissance Batterie 1', helper: 'Renseignez ce capteur de puissance combinée ou les capteurs de charge et de décharge afin d\'activer la Batterie 1.' },
          sensor_bat1_charge_power: { label: 'Puissance de charge Batterie 1' },
          sensor_bat1_discharge_power: { label: 'Puissance de décharge Batterie 1' },
          sensor_bat2_soc: { label: 'SOC Batterie 2' },
          sensor_bat2_power: { label: 'Puissance Batterie 2', helper: 'Renseignez ce capteur de puissance combinée ou les capteurs de charge et de décharge afin d\'activer la Batterie 2.' },
          sensor_bat2_charge_power: { label: 'Puissance de charge Batterie 2' },
          sensor_bat2_discharge_power: { label: 'Puissance de décharge Batterie 2' },
          sensor_bat3_soc: { label: 'SOC Batterie 3' },
          sensor_bat3_power: { label: 'Puissance Batterie 3', helper: 'Renseignez ce capteur de puissance combinée ou les capteurs de charge et de décharge afin d\'activer la Batterie 3.' },
          sensor_bat3_charge_power: { label: 'Puissance de charge Batterie 3' },
          sensor_bat3_discharge_power: { label: 'Puissance de décharge Batterie 3' },
          sensor_bat4_soc: { label: 'SOC Batterie 4' },
          sensor_bat4_power: { label: 'Puissance Batterie 4', helper: 'Renseignez ce capteur de puissance combinée ou les capteurs de charge et de décharge afin d\'activer la Batterie 4.' },
          sensor_bat4_charge_power: { label: 'Puissance de charge Batterie 4' },
          sensor_bat4_discharge_power: { label: 'Puissance de décharge Batterie 4' },
          sensor_home_load: { label: 'Charge domestique/consommation (Requis)', helper: 'Capteur de consommation totale du foyer.' },
          sensor_home_load_secondary: { label: 'Charge domestique (Inverseur 2)', helper: 'Capteur de charge domestique optionnel pour le second onduleur.' },
          sensor_heat_pump_consumption: { label: 'Consommation pompe à chaleur', helper: 'Capteur de consommation énergétique de la pompe à chaleur.' },
          sensor_pool_consumption: { label: 'Piscine', helper: 'Capteur de puissance/consommation de la piscine.' },
          sensor_washing_machine_consumption: { label: 'Lave-linge', helper: 'Capteur de puissance/consommation du lave-linge.' },
          sensor_dryer_consumption: { label: 'Sèche-linge', helper: 'Capteur de puissance/consommation du sèche-linge.' },
          sensor_refrigerator_consumption: { label: 'Réfrigérateur', helper: 'Capteur de puissance/consommation du réfrigérateur.' },
          sensor_grid_power: { label: 'Puissance réseau (Onduleur 1)', helper: 'Capteur de flux réseau positif/négatif pour l onduleur 1. Spécifiez soit ce capteur soit les capteurs Import/Export réseau (Onduleur 1).' },
          sensor_grid_import: { label: 'Capteur import réseau (Onduleur 1)', helper: 'Entité optionnelle rapportant l import réseau (valeurs positives) pour l onduleur 1.' },
          sensor_grid_export: { label: 'Capteur export réseau (Onduleur 1)', helper: 'Entité optionnelle rapportant l export réseau (valeurs positives) pour l onduleur 1.' },
          sensor_grid_import_daily: { label: 'Capteur import réseau journalier (Onduleur 1)', helper: 'Entité optionnelle rapportant l import cumulatif réseau pour la journée en cours (Onduleur 1).' },
          sensor_grid_export_daily: { label: 'Capteur export réseau journalier (Onduleur 1)', helper: 'Entité optionnelle rapportant l export cumulatif réseau pour la journée en cours (Onduleur 1).' },
          sensor_grid2_power: { label: 'Puissance réseau (Onduleur 2)', helper: 'Capteur de flux réseau positif/négatif pour l onduleur 2. Spécifiez soit ce capteur soit les capteurs Import/Export réseau (Onduleur 2).' },
          sensor_grid2_import: { label: 'Capteur import réseau (Onduleur 2)', helper: 'Entité optionnelle rapportant l import réseau (valeurs positives) pour l onduleur 2.' },
          sensor_grid2_export: { label: 'Capteur export réseau (Onduleur 2)', helper: 'Entité optionnelle rapportant l export réseau (valeurs positives) pour l onduleur 2.' },
          sensor_grid2_import_daily: { label: 'Capteur import réseau journalier (Onduleur 2)', helper: 'Entité optionnelle rapportant l import cumulatif réseau pour la journée en cours (Onduleur 2).' },
          sensor_grid2_export_daily: { label: 'Capteur export réseau journalier (Onduleur 2)', helper: 'Entité optionnelle rapportant l export cumulatif réseau pour la journée en cours (Onduleur 2).' },
                    grid2_import_color: { label: 'Couleur import réseau (Onduleur 2)', helper: 'Couleur de base (avant seuils) lors de l import réseau pour l onduleur 2.' },
                    grid2_export_color: { label: 'Couleur export réseau (Onduleur 2)', helper: 'Couleur de base (avant seuils) lors de l export réseau pour l onduleur 2.' },
                    grid2_threshold_warning: { label: 'Seuil avertissement réseau (Onduleur 2)', helper: 'Changer la couleur réseau (onduleur 2) lorsque la magnitude atteint cette valeur. Utilise l unité d affichage sélectionnée.' },
                    grid2_warning_color: { label: 'Couleur avertissement réseau (Onduleur 2)', helper: 'Couleur appliquée au seuil d avertissement (onduleur 2).' },
                    grid2_threshold_critical: { label: 'Seuil critique réseau (Onduleur 2)', helper: 'Changer la couleur réseau (onduleur 2) lorsque la magnitude atteint cette valeur. Utilise l unité d affichage sélectionnée.' },
                    grid2_critical_color: { label: 'Couleur critique réseau (Onduleur 2)', helper: 'Couleur appliquée au seuil critique (onduleur 2).' },
          show_daily_grid: { label: 'Afficher les valeurs réseau journalières', helper: 'Affiche les totaux import/export journaliers sous le flux réseau actuel lorsqu activé.' },
          grid_daily_font_size: { label: 'Taille police réseau journalier (px)', helper: 'Optionnel : remplace la taille du texte import/export journalier. Par défaut : taille police réseau.' },
          grid_current_odometer: { label: 'Compteur : Réseau actuel', helper: 'Anime la valeur réseau actuel avec un effet de défilement par chiffre.' },
          grid_current_odometer_duration: { label: 'Durée compteur (ms)', helper: 'Durée de l’animation en millisecondes. Défaut 350.' },
          show_grid_flow_label: { label: 'Afficher le libellé import/export réseau', helper: 'Ajoute "Importation"/"Exportation" avant la valeur réseau lorsqu activé.' },
          enable_echo_alive: { label: 'Enable Echo Alive', helper: 'Enables an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'Couleur PV totale', helper: 'Couleur appliquée à la ligne/texte PV TOTAL.' },
          pv_primary_color: { label: 'Couleur flux PV 1', helper: 'Couleur utilisée pour la ligne d animation PV primaire.' },
          pv_secondary_color: { label: 'Couleur flux PV 2', helper: 'Couleur utilisée pour la ligne d animation PV secondaire si disponible.' },
          load_flow_color: { label: 'Couleur flux charge', helper: 'Couleur appliquée à la ligne d animation de la charge domestique.' },
          load_text_color: { label: 'Couleur texte charge', helper: 'Couleur appliquée au texte de charge lorsque aucun seuil n est actif.' },
          house_total_color: { label: 'Couleur HOUSE TOT', helper: 'Couleur appliquée au texte/flux HOUSE TOT.' },
          inv1_color: { label: 'Couleur INV 1', helper: 'Couleur appliquée au texte/flux INV 1.' },
          inv2_color: { label: 'Couleur INV 2', helper: 'Couleur appliquée au texte/flux INV 2.' },
          load_threshold_warning: { label: 'Seuil avertissement charge', helper: 'Changer la couleur du chargeur lorsque la magnitude atteint ou dépasse cette valeur. Utilise l unité d affichage sélectionnée.' },
          load_warning_color: { label: 'Couleur avertissement charge', helper: 'Couleur hex ou CSS appliquée au seuil d avertissement de charge.' },
          load_threshold_critical: { label: 'Seuil critique charge', helper: 'Changer la couleur lorsque la magnitude atteint ou dépasse cette valeur. Utilise l unité d affichage sélectionnée.' },
          load_critical_color: { label: 'Couleur critique charge', helper: 'Couleur hex ou CSS appliquée au seuil critique de charge.' },
          battery_soc_color: { label: 'Couleur SOC batterie', helper: 'Couleur appliquée au texte du pourcentage SOC batterie.' },
          battery_charge_color: { label: 'Couleur flux charge batterie', helper: 'Couleur utilisée lorsque l énergie entre dans la batterie.' },
          battery_discharge_color: { label: 'Couleur flux décharge batterie', helper: 'Couleur utilisée lorsque l énergie sort de la batterie.' },
          battery_fill_high_color: { label: 'Couleur remplissage batterie (normale)', helper: 'Couleur du liquide lorsque le SOC de la batterie est au-dessus du seuil bas.' },
          battery_fill_low_color: { label: 'Couleur remplissage batterie (faible)', helper: 'Couleur du liquide lorsque le SOC est égal ou inférieur au seuil bas.' },
          battery_fill_low_threshold: { label: 'Seuil remplissage batterie bas (%)', helper: 'Utiliser la couleur basse lorsque le SOC est égal ou inférieur à ce pourcentage.' },
          battery_fill_opacity: { label: 'Opacité remplissage batterie', helper: 'Opacité du niveau de remplissage batterie (0-1).' },
          grid_activity_threshold: { label: 'Seuil animation réseau (W)', helper: 'Ignorer les flux réseau dont la valeur absolue est inférieure à cette puissance avant d animer.' },
          grid_threshold_warning: { label: 'Seuil avertissement réseau', helper: 'Changer la couleur réseau lorsque la magnitude atteint cette valeur. Utilise l unité d affichage sélectionnée.' },
          grid_warning_color: { label: 'Couleur avertissement réseau', helper: 'Couleur hex appliquée au seuil d avertissement.' },
          grid_threshold_critical: { label: 'Seuil critique réseau', helper: 'Changer la couleur réseau lorsque la magnitude atteint cette valeur. Utilise l unité d affichage sélectionnée.' },
          grid_critical_color: { label: 'Couleur critique réseau', helper: 'Couleur appliquée au seuil critique.' },
          invert_grid: { label: 'Inverser valeurs réseau', helper: 'Activer si la polarité import/export est inversée.' },
          invert_battery: { label: 'Inverser valeurs batterie', helper: 'Activer si la polarité charge/décharge est inversée.' },
          invert_bat1: { label: 'Inverser Batterie 1', helper: 'Activer si la polarité charge/décharge de la Batterie 1 est inversée.' },
          invert_bat2: { label: 'Inverser Batterie 2', helper: 'Activer si la polarité charge/décharge de la Batterie 2 est inversée.' },
          invert_bat3: { label: 'Inverser Batterie 3', helper: 'Activer si la polarité charge/décharge de la Batterie 3 est inversée.' },
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
          car_headlight_flash: { label: 'Clignotement des phares en charge', helper: 'Activer pour faire clignoter les phares du véhicule pendant la charge.' },
          car_pct_color: { label: 'Couleur SOC Véhicule', helper: 'Couleur hex pour le texte SOC EV (ex. #00FFFF).' },
          car2_pct_color: { label: 'Couleur SOC Véhicule 2', helper: 'Couleur hex pour le SOC du second EV (retourne sur Car SOC si vide).' },
          car1_name_color: { label: 'Couleur nom Véhicule 1', helper: 'Couleur appliquée au libellé du nom du Véhicule 1.' },
          car2_name_color: { label: 'Couleur nom Véhicule 2', helper: 'Couleur appliquée au libellé du nom du Véhicule 2.' },
          car1_color: { label: 'Couleur Véhicule 1', helper: 'Couleur appliquée à la valeur de puissance du Véhicule 1.' },
          car2_color: { label: 'Couleur Véhicule 2', helper: 'Couleur appliquée à la valeur de puissance du Véhicule 2.' },
          heat_pump_flow_color: { label: 'Couleur flux pompe à chaleur', helper: 'Couleur appliquée à l animation du flux de la pompe à chaleur.' },
          heat_pump_text_color: { label: 'Couleur texte pompe à chaleur', helper: 'Couleur appliquée au texte de puissance de la pompe à chaleur.' },
          pool_flow_color: { label: 'Couleur flux piscine', helper: 'Couleur appliquée à l animation du flux de la piscine.' },
          pool_text_color: { label: 'Couleur texte piscine', helper: 'Couleur appliquée au texte de puissance de la piscine.' },
          washing_machine_text_color: { label: 'Couleur texte lave-linge', helper: 'Couleur appliquée au texte de puissance du lave-linge.' },
          dryer_text_color: { label: 'Couleur texte sèche-linge', helper: 'Couleur appliquée au texte de puissance du sèche-linge.' },
          refrigerator_text_color: { label: 'Couleur texte réfrigérateur', helper: 'Couleur appliquée au texte de puissance du réfrigérateur.' },
          windmill_flow_color: { label: 'Windmill Flow Color', helper: 'Couleur appliquée au flux windmill (data-flow-key="windmill").' },
          windmill_text_color: { label: 'Windmill Text Color', helper: 'Couleur appliquée au texte puissance windmill (data-role="windmill-power").' },
          header_font_size: { label: 'Taille police en-tête (px)', helper: 'Par défaut 16' },
          daily_label_font_size: { label: 'Taille étiquette quotidienne (px)', helper: 'Par défaut 12' },
          daily_value_font_size: { label: 'Taille valeur quotidienne (px)', helper: 'Par défaut 20' },
          pv_font_size: { label: 'Taille police PV (px)', helper: 'Par défaut 16' },
          windmill_power_font_size: { label: 'Windmill Power Font Size (px)', helper: 'Par défaut 16' },
          battery_soc_font_size: { label: 'Taille SOC batterie (px)', helper: 'Par défaut 20' },
          battery_power_font_size: { label: 'Taille puissance batterie (px)', helper: 'Par défaut 16' },
          load_font_size: { label: 'Taille police charge (px)', helper: 'Par défaut 15' },
          inv1_power_font_size: { label: 'Taille police puissance INV 1 (px)', helper: 'Taille de police pour la ligne de puissance INV 1. Par défaut utilise la taille de charge.' },
          inv2_power_font_size: { label: 'Taille police puissance INV 2 (px)', helper: 'Taille de police pour la ligne de puissance INV 2. Par défaut utilise la taille de charge.' },
          heat_pump_font_size: { label: 'Taille police pompe à chaleur (px)', helper: 'Par défaut 16' },
          pool_font_size: { label: 'Taille police piscine (px)', helper: 'Par défaut 16' },
          washing_machine_font_size: { label: 'Taille police lave-linge (px)', helper: 'Par défaut 16' },
          dryer_font_size: { label: 'Taille police sèche-linge (px)', helper: 'Par défaut 16' },
          refrigerator_font_size: { label: 'Taille police réfrigérateur (px)', helper: 'Par défaut 16' },
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
          sensor_popup_house_6_font_size: { label: 'Taille police Popup Maison 6 (px)', helper: 'Taille de police pour la ligne 6 du popup maison. Par défaut 16' },
          sensor_popup_bat_1: { label: 'Popup Batterie 1', helper: 'Entité pour la ligne 1 du popup batterie.' },
          sensor_popup_bat_1_name: { label: 'Nom Popup Batterie 1', helper: 'Nom personnalisé optionnel pour la ligne 1 du popup batterie. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_bat_1_color: { label: 'Couleur Popup Batterie 1', helper: 'Couleur pour le texte de la ligne 1 du popup batterie.' },
          sensor_popup_bat_1_font_size: { label: 'Taille police Popup Batterie 1 (px)', helper: 'Taille de police pour la ligne 1 du popup batterie. Par défaut 16' },
          sensor_popup_bat_2: { label: 'Popup Batterie 2', helper: 'Entité pour la ligne 2 du popup batterie.' },
          sensor_popup_bat_2_name: { label: 'Nom Popup Batterie 2', helper: 'Nom personnalisé optionnel pour la ligne 2 du popup batterie. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_bat_2_color: { label: 'Couleur Popup Batterie 2', helper: 'Couleur pour le texte de la ligne 2 du popup batterie.' },
          sensor_popup_bat_2_font_size: { label: 'Taille police Popup Batterie 2 (px)', helper: 'Taille de police pour la ligne 2 du popup batterie. Par défaut 16' },
          sensor_popup_bat_3: { label: 'Popup Batterie 3', helper: 'Entité pour la ligne 3 du popup batterie.' },
          sensor_popup_bat_3_name: { label: 'Nom Popup Batterie 3', helper: 'Nom personnalisé optionnel pour la ligne 3 du popup batterie. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_bat_3_color: { label: 'Couleur Popup Batterie 3', helper: 'Couleur pour le texte de la ligne 3 du popup batterie.' },
          sensor_popup_bat_3_font_size: { label: 'Taille police Popup Batterie 3 (px)', helper: 'Taille de police pour la ligne 3 du popup batterie. Par défaut 16' },
          sensor_popup_bat_4: { label: 'Popup Batterie 4', helper: 'Entité pour la ligne 4 du popup batterie.' },
          sensor_popup_bat_4_name: { label: 'Nom Popup Batterie 4', helper: 'Nom personnalisé optionnel pour la ligne 4 du popup batterie. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_bat_4_color: { label: 'Couleur Popup Batterie 4', helper: 'Couleur pour le texte de la ligne 4 du popup batterie.' },
          sensor_popup_bat_4_font_size: { label: 'Taille police Popup Batterie 4 (px)', helper: 'Taille de police pour la ligne 4 du popup batterie. Par défaut 16' },
          sensor_popup_bat_5: { label: 'Popup Batterie 5', helper: 'Entité pour la ligne 5 du popup batterie.' },
          sensor_popup_bat_5_name: { label: 'Nom Popup Batterie 5', helper: 'Nom personnalisé optionnel pour la ligne 5 du popup batterie. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_bat_5_color: { label: 'Couleur Popup Batterie 5', helper: 'Couleur pour le texte de la ligne 5 du popup batterie.' },
          sensor_popup_bat_5_font_size: { label: 'Taille police Popup Batterie 5 (px)', helper: 'Taille de police pour la ligne 5 du popup batterie. Par défaut 16' },
          sensor_popup_bat_6: { label: 'Popup Batterie 6', helper: 'Entité pour la ligne 6 du popup batterie.' },
          sensor_popup_bat_6_name: { label: 'Nom Popup Batterie 6', helper: 'Nom personnalisé optionnel pour la ligne 6 du popup batterie. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_bat_6_color: { label: 'Couleur Popup Batterie 6', helper: 'Couleur pour le texte de la ligne 6 du popup batterie.' },
          sensor_popup_bat_6_font_size: { label: 'Taille police Popup Batterie 6 (px)', helper: 'Taille de police pour la ligne 6 du popup batterie. Par défaut 16' },
          sensor_popup_grid_1: { label: 'Popup Réseau 1', helper: 'Entité pour la ligne 1 du popup réseau.' },
          sensor_popup_grid_1_name: { label: 'Nom Popup Réseau 1', helper: 'Nom personnalisé optionnel pour la ligne 1 du popup réseau. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_grid_1_color: { label: 'Couleur Popup Réseau 1', helper: 'Couleur pour le texte de la ligne 1 du popup réseau.' },
          sensor_popup_grid_1_font_size: { label: 'Taille police Popup Réseau 1 (px)', helper: 'Taille de police pour la ligne 1 du popup réseau. Par défaut 16' },
          sensor_popup_grid_2: { label: 'Popup Réseau 2', helper: 'Entité pour la ligne 2 du popup réseau.' },
          sensor_popup_grid_2_name: { label: 'Nom Popup Réseau 2', helper: 'Nom personnalisé optionnel pour la ligne 2 du popup réseau. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_grid_2_color: { label: 'Couleur Popup Réseau 2', helper: 'Couleur pour le texte de la ligne 2 du popup réseau.' },
          sensor_popup_grid_2_font_size: { label: 'Taille police Popup Réseau 2 (px)', helper: 'Taille de police pour la ligne 2 du popup réseau. Par défaut 16' },
          sensor_popup_grid_3: { label: 'Popup Réseau 3', helper: 'Entité pour la ligne 3 du popup réseau.' },
          sensor_popup_grid_3_name: { label: 'Nom Popup Réseau 3', helper: 'Nom personnalisé optionnel pour la ligne 3 du popup réseau. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_grid_3_color: { label: 'Couleur Popup Réseau 3', helper: 'Couleur pour le texte de la ligne 3 du popup réseau.' },
          sensor_popup_grid_3_font_size: { label: 'Taille police Popup Réseau 3 (px)', helper: 'Taille de police pour la ligne 3 du popup réseau. Par défaut 16' },
          sensor_popup_grid_4: { label: 'Popup Réseau 4', helper: 'Entité pour la ligne 4 du popup réseau.' },
          sensor_popup_grid_4_name: { label: 'Nom Popup Réseau 4', helper: 'Nom personnalisé optionnel pour la ligne 4 du popup réseau. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_grid_4_color: { label: 'Couleur Popup Réseau 4', helper: 'Couleur pour le texte de la ligne 4 du popup réseau.' },
          sensor_popup_grid_4_font_size: { label: 'Taille police Popup Réseau 4 (px)', helper: 'Taille de police pour la ligne 4 du popup réseau. Par défaut 16' },
          sensor_popup_grid_5: { label: 'Popup Réseau 5', helper: 'Entité pour la ligne 5 du popup réseau.' },
          sensor_popup_grid_5_name: { label: 'Nom Popup Réseau 5', helper: 'Nom personnalisé optionnel pour la ligne 5 du popup réseau. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_grid_5_color: { label: 'Couleur Popup Réseau 5', helper: 'Couleur pour le texte de la ligne 5 du popup réseau.' },
          sensor_popup_grid_5_font_size: { label: 'Taille police Popup Réseau 5 (px)', helper: 'Taille de police pour la ligne 5 du popup réseau. Par défaut 16' },
          sensor_popup_grid_6: { label: 'Popup Réseau 6', helper: 'Entité pour la ligne 6 du popup réseau.' },
          sensor_popup_grid_6_name: { label: 'Nom Popup Réseau 6', helper: 'Nom personnalisé optionnel pour la ligne 6 du popup réseau. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_grid_6_color: { label: 'Couleur Popup Réseau 6', helper: 'Couleur pour le texte de la ligne 6 du popup réseau.' },
          sensor_popup_grid_6_font_size: { label: 'Taille police Popup Réseau 6 (px)', helper: 'Taille de police pour la ligne 6 du popup réseau. Par défaut 16' },
          sensor_popup_inverter_1: { label: 'Popup Inverter 1', helper: 'Entité pour la ligne 1 du popup Inverter.' },
          sensor_popup_inverter_1_name: { label: 'Nom Popup Inverter 1', helper: 'Nom personnalisé optionnel pour la ligne 1 du popup Inverter. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_inverter_1_color: { label: 'Couleur Popup Inverter 1', helper: 'Couleur pour le texte de la ligne 1 du popup Inverter.' },
          sensor_popup_inverter_1_font_size: { label: 'Taille police Popup Inverter 1 (px)', helper: 'Taille de police pour la ligne 1 du popup Inverter. Par défaut 16' },
          sensor_popup_inverter_2: { label: 'Popup Inverter 2', helper: 'Entité pour la ligne 2 du popup Inverter.' },
          sensor_popup_inverter_2_name: { label: 'Nom Popup Inverter 2', helper: 'Nom personnalisé optionnel pour la ligne 2 du popup Inverter. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_inverter_2_color: { label: 'Couleur Popup Inverter 2', helper: 'Couleur pour le texte de la ligne 2 du popup Inverter.' },
          sensor_popup_inverter_2_font_size: { label: 'Taille police Popup Inverter 2 (px)', helper: 'Taille de police pour la ligne 2 du popup Inverter. Par défaut 16' },
          sensor_popup_inverter_3: { label: 'Popup Inverter 3', helper: 'Entité pour la ligne 3 du popup Inverter.' },
          sensor_popup_inverter_3_name: { label: 'Nom Popup Inverter 3', helper: 'Nom personnalisé optionnel pour la ligne 3 du popup Inverter. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_inverter_3_color: { label: 'Couleur Popup Inverter 3', helper: 'Couleur pour le texte de la ligne 3 du popup Inverter.' },
          sensor_popup_inverter_3_font_size: { label: 'Taille police Popup Inverter 3 (px)', helper: 'Taille de police pour la ligne 3 du popup Inverter. Par défaut 16' },
          sensor_popup_inverter_4: { label: 'Popup Inverter 4', helper: 'Entité pour la ligne 4 du popup Inverter.' },
          sensor_popup_inverter_4_name: { label: 'Nom Popup Inverter 4', helper: 'Nom personnalisé optionnel pour la ligne 4 du popup Inverter. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_inverter_4_color: { label: 'Couleur Popup Inverter 4', helper: 'Couleur pour le texte de la ligne 4 du popup Inverter.' },
          sensor_popup_inverter_4_font_size: { label: 'Taille police Popup Inverter 4 (px)', helper: 'Taille de police pour la ligne 4 du popup Inverter. Par défaut 16' },
          sensor_popup_inverter_5: { label: 'Popup Inverter 5', helper: 'Entité pour la ligne 5 du popup Inverter.' },
          sensor_popup_inverter_5_name: { label: 'Nom Popup Inverter 5', helper: 'Nom personnalisé optionnel pour la ligne 5 du popup Inverter. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_inverter_5_color: { label: 'Couleur Popup Inverter 5', helper: 'Couleur pour le texte de la ligne 5 du popup Inverter.' },
          sensor_popup_inverter_5_font_size: { label: 'Taille police Popup Inverter 5 (px)', helper: 'Taille de police pour la ligne 5 du popup Inverter. Par défaut 16' },
          sensor_popup_inverter_6: { label: 'Popup Inverter 6', helper: 'Entité pour la ligne 6 du popup Inverter.' },
          sensor_popup_inverter_6_name: { label: 'Nom Popup Inverter 6', helper: 'Nom personnalisé optionnel pour la ligne 6 du popup Inverter. Laisser vide pour utiliser le nom de l\'entité.' },
          sensor_popup_inverter_6_color: { label: 'Couleur Popup Inverter 6', helper: 'Couleur pour le texte de la ligne 6 du popup Inverter.' },
          sensor_popup_inverter_6_font_size: { label: 'Taille police Popup Inverter 6 (px)', helper: 'Taille de police pour la ligne 6 du popup Inverter. Par défaut 16' }
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
            { value: 'dashes_glow', label: 'Tirets + Lueur' },
            { value: 'fluid_flow', label: 'Flux fluide' },
            { value: 'dots', label: 'Points' },
            { value: 'arrows', label: 'Flèches' }
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
          pvCommon: { title: 'Solar/PV Algemeen', helper: 'Gedeelde Solar/PV instellingen voor beide arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Configureer PV Array 1 entiteiten.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          windmill: { title: 'Windmill', helper: 'Configureer windmolen generator sensoren en styling.' },
          battery: { title: 'Batterij', helper: 'Configureer batterij entiteiten.' },
          grid: { title: 'Grid', helper: 'Configureer grid entiteiten.' },
          car: { title: 'Auto', helper: 'Configureer EV entiteiten.' },
          other: { title: 'Huis', helper: 'Aanvullende sensoren en geavanceerde opties.' },
          entities: { title: 'Entiteit selectie', helper: 'Kies de PV, batterij, grid, load en EV entiteiten gebruikt door de kaart. Of de totale PV sensor, of uw PV string arrays moeten minimaal worden gespecificeerd.' },
          pvPopup: { title: 'PV Popup', helper: 'Configureer entiteiten voor de PV popup weergave.' },
          housePopup: { title: 'House Popup', helper: 'Configureer entiteiten voor de House popup weergave.' },
          batteryPopup: { title: 'Batterij-popup', helper: 'Configureer de batterij popup weergave.' },
          gridPopup: { title: 'Grid-popup', helper: 'Configureer entiteiten voor de grid popup weergave.' },
          inverterPopup: { title: 'Inverter-popup', helper: 'Configureer entiteiten voor de inverter popup weergave.' },
          colors: { title: 'Kleuren & Drempels', helper: 'Configureer netwerkdrempels en accentkleuren voor stromen en EV-weergave.' },
          typography: { title: 'Typografie', helper: 'Pas de lettergrootte aan gebruikt in de kaart.' },
          about: { title: 'Over', helper: 'Credits, versie en nuttige links.' }
        },
        fields: {
          card_title: { label: 'Kaart titel', helper: 'Titel weergegeven bovenaan de kaart. Leeg laten om uit te schakelen.' },
          background_image: { label: 'Achtergrond afbeelding pad', helper: 'Pad naar achtergrond afbeelding (bijv. /local/community/lumina-energy-card/lumina_background.svg).' },
          language: { label: 'Taal', helper: 'Kies de taal van de editor.' },
          display_unit: { label: 'Weergave eenheid', helper: 'Eenheid gebruikt om kracht waarden te formatteren.' },
          update_interval: { label: 'Update interval', helper: 'Frequentie van kaart updates verversen (0 schakelt throttling uit).' },
          animation_speed_factor: { label: 'Animatie snelheid factor', helper: 'Pas de animatie snelheid multiplier aan (-3x tot 3x). Stel in op 0 voor pauze; negatieven keren richting om.' },
          animation_style: { label: 'Animatie stijl (Dag)', helper: 'Flow-animatie stijl gebruikt in Dag-modus.' },
          night_animation_style: { label: 'Animatie stijl (Nacht)', helper: 'Flow-animatie stijl gebruikt in Nacht-modus. Laat leeg om Dag-stijl te gebruiken.' },
          dashes_glow_intensity: { label: 'Strepen gloed intensiteit', helper: 'Regelt de gloed voor "Strepen + Gloed" (0 schakelt uit).' },
          fluid_flow_outer_glow: { label: 'Fluid flow buiten gloed', helper: 'Schakelt de extra buitenste gloed/haze laag in voor animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow lijndikte (px)', helper: 'Optionele override voor lijndikte van flow-animaties (zonder SVG aan te passen). Leeg laten om SVG-waarden te gebruiken.' },
          fluid_flow_stroke_width: { label: 'Fluid flow lijndikte (px)', helper: 'Basis lijndikte voor animation_style: fluid_flow. Overlay/maskerbreedtes worden hiervan afgeleid (standaard 5).' },
          sensor_pv_total: { label: 'Totale PV sensor', helper: 'Optionele geaggregeerde productie sensor weergegeven als gecombineerde lijn.' },
          sensor_pv_total_secondary: { label: 'Totale PV sensor (Inverter 2)', helper: 'Tweede optionele inverter sensor; toegevoegd aan totale PV indien opgegeven.' },
          sensor_windmill_total: { label: 'Windmill Total', helper: 'Vermogenssensor voor de windmolen generator (W). Als niet ingesteld wordt de windmill SVG-groep verborgen.' },
          sensor_windmill_daily: { label: 'Daily Windmill Production', helper: 'Optionele sensor voor dagelijkse windmill productie.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Primaire zonne productie sensor.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)' },
          sensor_pv3: { label: 'PV String 3 (Array 1)' },
          sensor_pv4: { label: 'PV String 4 (Array 1)' },
          sensor_pv5: { label: 'PV String 5 (Array 1)' },
          sensor_pv6: { label: 'PV String 6 (Array 1)' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Zonne productie sensor voor Array 2.' },
          sensor_daily: { label: 'Dagelijkse productie sensor (Vereist)', helper: 'Sensor die dagelijkse productie totalen aangeeft. Of de totale PV sensor, of uw PV string arrays moeten minimaal worden gespecificeerd.' },
          sensor_daily_array2: { label: 'Dagelijkse productie sensor (Array 2)', helper: 'Sensor voor dagelijkse productie totalen van Array 2.' },
          sensor_bat1_soc: { label: 'Batterij 1 SOC' },
          sensor_bat1_power: { label: 'Batterij 1 vermogen', helper: 'Geef deze gecombineerde vermogenssensor op of zowel de laad- als ontlaadsensor zodat Batterij 1 actief wordt.' },
          sensor_bat1_charge_power: { label: 'Batterij 1 laadvermogen' },
          sensor_bat1_discharge_power: { label: 'Batterij 1 ontlaadvermogen' },
          sensor_bat2_soc: { label: 'Batterij 2 SOC' },
          sensor_bat2_power: { label: 'Batterij 2 vermogen', helper: 'Geef deze gecombineerde vermogenssensor op of zowel de laad- als ontlaadsensor zodat Batterij 2 actief wordt.' },
          sensor_bat2_charge_power: { label: 'Batterij 2 laadvermogen' },
          sensor_bat2_discharge_power: { label: 'Batterij 2 ontlaadvermogen' },
          sensor_bat3_soc: { label: 'Batterij 3 SOC' },
          sensor_bat3_power: { label: 'Batterij 3 vermogen', helper: 'Geef deze gecombineerde vermogenssensor op of zowel de laad- als ontlaadsensor zodat Batterij 3 actief wordt.' },
          sensor_bat3_charge_power: { label: 'Batterij 3 laadvermogen' },
          sensor_bat3_discharge_power: { label: 'Batterij 3 ontlaadvermogen' },
          sensor_bat4_soc: { label: 'Batterij 4 SOC' },
          sensor_bat4_power: { label: 'Batterij 4 vermogen', helper: 'Geef deze gecombineerde vermogenssensor op of zowel de laad- als ontlaadsensor zodat Batterij 4 actief wordt.' },
          sensor_bat4_charge_power: { label: 'Batterij 4 laadvermogen' },
          sensor_bat4_discharge_power: { label: 'Batterij 4 ontlaadvermogen' },
          sensor_home_load: { label: 'Huisbelasting/verbruik (Vereist)', helper: 'Sensor voor totale huisverbruik.' },
          sensor_home_load_secondary: { label: 'Huisbelasting (Inverter 2)', helper: 'Optionele huisbelasting sensor voor de tweede inverter.' },
          sensor_heat_pump_consumption: { label: 'Warmtepomp verbruik', helper: 'Sensor voor energieverbruik van de warmtepomp.' },
          sensor_pool_consumption: { label: 'Zwembad', helper: 'Sensor voor zwembadvermogen/verbruik.' },
          sensor_washing_machine_consumption: { label: 'Wasmachine', helper: 'Sensor voor wasmachine vermogen/verbruik.' },
          sensor_dryer_consumption: { label: 'Droger', helper: 'Sensor voor droger vermogen/verbruik.' },
          sensor_refrigerator_consumption: { label: 'Koelkast', helper: 'Sensor voor koelkast vermogen/verbruik.' },
          sensor_grid_power: { label: 'Grid vermogen (omvormer 1)', helper: 'Sensor voor grid flow positief/negatief voor omvormer 1. Specificeer of deze sensor of de Grid import/export sensoren (omvormer 1).' },
          sensor_grid_import: { label: 'Grid import sensor (omvormer 1)', helper: 'Optionele entiteit die grid import rapporteert (positieve waarden) voor omvormer 1.' },
          sensor_grid_export: { label: 'Grid export sensor (omvormer 1)', helper: 'Optionele entiteit die grid export rapporteert (positieve waarden) voor omvormer 1.' },
          sensor_grid_import_daily: { label: 'Dagelijkse grid import sensor (omvormer 1)', helper: 'Optionele entiteit die cumulatieve grid import voor de huidige dag rapporteert (omvormer 1).' },
          sensor_grid_export_daily: { label: 'Dagelijkse grid export sensor (omvormer 1)', helper: 'Optionele entiteit die cumulatieve grid export voor de huidige dag rapporteert (omvormer 1).' },
          sensor_grid2_power: { label: 'Grid vermogen (omvormer 2)', helper: 'Sensor voor grid flow positief/negatief voor omvormer 2. Specificeer of deze sensor of de Grid import/export sensoren (omvormer 2).' },
          sensor_grid2_import: { label: 'Grid import sensor (omvormer 2)', helper: 'Optionele entiteit die grid import rapporteert (positieve waarden) voor omvormer 2.' },
          sensor_grid2_export: { label: 'Grid export sensor (omvormer 2)', helper: 'Optionele entiteit die grid export rapporteert (positieve waarden) voor omvormer 2.' },
          sensor_grid2_import_daily: { label: 'Dagelijkse grid import sensor (omvormer 2)', helper: 'Optionele entiteit die cumulatieve grid import voor de huidige dag rapporteert (omvormer 2).' },
          sensor_grid2_export_daily: { label: 'Dagelijkse grid export sensor (omvormer 2)', helper: 'Optionele entiteit die cumulatieve grid export voor de huidige dag rapporteert (omvormer 2).' },
                    grid2_import_color: { label: 'Grid import flow kleur (omvormer 2)', helper: 'Basis kleur (voor drempels) bij grid import voor omvormer 2.' },
                    grid2_export_color: { label: 'Grid export flow kleur (omvormer 2)', helper: 'Basis kleur (voor drempels) bij grid export voor omvormer 2.' },
                    grid2_threshold_warning: { label: 'Grid waarschuwingsdrempel (omvormer 2)', helper: 'Verander grid kleur (omvormer 2) wanneer magnitude deze waarde bereikt. Gebruikt geselecteerde weergave eenheid.' },
                    grid2_warning_color: { label: 'Grid waarschuwingskleur (omvormer 2)', helper: 'Hex kleur toegepast op waarschuwingsdrempel (omvormer 2).' },
                    grid2_threshold_critical: { label: 'Grid kritieke drempel (omvormer 2)', helper: 'Verander grid kleur (omvormer 2) wanneer magnitude deze waarde bereikt. Gebruikt geselecteerde weergave eenheid.' },
                    grid2_critical_color: { label: 'Grid kritieke kleur (omvormer 2)', helper: 'Kleur toegepast op kritieke drempel (omvormer 2).' },
          show_daily_grid: { label: 'Toon dagelijkse grid waarden', helper: 'Toon de dagelijkse import/export totalen onder de huidige grid flow wanneer ingeschakeld.' },
          grid_daily_font_size: { label: 'Dagelijkse grid lettergrootte (px)', helper: 'Optioneel: overschrijft lettergrootte voor dagelijkse import/export. Standaard: Grid lettergrootte.' },
          grid_current_odometer: { label: 'Odometer: Huidige grid', helper: 'Animeert de huidige grid-waarde met een per-cijfer rol-effect.' },
          grid_current_odometer_duration: { label: 'Odometer duur (ms)', helper: 'Animatieduur in milliseconden. Standaard 350.' },
          show_grid_flow_label: { label: 'Toon net import/export label', helper: 'Voegt "Importeren"/"Exporteren" toe voor de netwaarde wanneer ingeschakeld.' },
          enable_echo_alive: { label: 'Enable Echo Alive', helper: 'Enables an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'Totale PV kleur', helper: 'Kleur toegepast op de PV TOTAL lijn/tekst.' },
          pv_primary_color: { label: 'PV Flow 1 kleur', helper: 'Kleur gebruikt voor de primaire PV animatie lijn.' },
          pv_secondary_color: { label: 'PV Flow 2 kleur', helper: 'Kleur gebruikt voor de secundaire PV animatie lijn indien beschikbaar.' },
          load_flow_color: { label: 'Belasting flow kleur', helper: 'Kleur toegepast op de huisbelasting animatie lijn.' },
          load_text_color: { label: 'Belasting tekstkleur', helper: 'Kleur toegepast op de tekst van het huisverbruik wanneer geen drempel actief is.' },
          house_total_color: { label: 'HOUSE TOT kleur', helper: 'Kleur toegepast op HOUSE TOT tekst/flow.' },
          inv1_color: { label: 'INV 1 kleur', helper: 'Kleur toegepast op INV 1 tekst/flow.' },
          inv2_color: { label: 'INV 2 kleur', helper: 'Kleur toegepast op INV 2 tekst/flow.' },
          load_threshold_warning: { label: 'Belasting waarschuwingsdrempel', helper: 'Verander kleur van lader wanneer magnitude deze waarde bereikt of overschrijdt. Gebruikt geselecteerde weergave eenheid.' },
          load_warning_color: { label: 'Belasting waarschuwingskleur', helper: 'Hex of CSS kleur toegepast op belasting waarschuwingsdrempel.' },
          load_threshold_critical: { label: 'Belasting kritieke drempel', helper: 'Verander kleur wanneer magnitude deze waarde bereikt of overschrijdt. Gebruikt geselecteerde weergave eenheid.' },
          load_critical_color: { label: 'Belasting kritieke kleur', helper: 'Hex of CSS kleur toegepast op kritieke belasting drempel.' },
          battery_soc_color: { label: 'Batterij SOC kleur', helper: 'Kleur toegepast op de batterij-SOC-percentagetekst.' },
          battery_charge_color: { label: 'Batterij laad flow kleur', helper: 'Kleur gebruikt wanneer energie de batterij ingaat.' },
          battery_discharge_color: { label: 'Batterij ontlaad flow kleur', helper: 'Kleur gebruikt wanneer energie de batterij verlaat.' },
          battery_fill_high_color: { label: 'Batterij vulling kleur (normaal)', helper: 'Kleur van vloeistof wanneer batterij SOC boven lage drempel is.' },
          battery_fill_low_color: { label: 'Batterij vulling kleur (laag)', helper: 'Kleur van vloeistof wanneer SOC gelijk aan of lager dan lage drempel.' },
          battery_fill_low_threshold: { label: 'Lage batterij vulling drempel (%)', helper: 'Gebruik lage kleur wanneer SOC gelijk aan of lager dan dit percentage.' },
          battery_fill_opacity: { label: 'Batterij vulling dekking', helper: 'Dekking voor batterij vulling niveau (0-1).' },
          grid_activity_threshold: { label: 'Grid animatie drempel (W)', helper: 'Negeer grid flows waarvan absolute waarde lager is dan deze kracht voordat animeren.' },
          grid_threshold_warning: { label: 'Grid waarschuwingsdrempel', helper: 'Verander grid kleur wanneer magnitude deze waarde bereikt. Gebruikt geselecteerde weergave eenheid.' },
          grid_warning_color: { label: 'Grid waarschuwingskleur', helper: 'Hex kleur toegepast op waarschuwingsdrempel.' },
          grid_threshold_critical: { label: 'Grid kritieke drempel', helper: 'Verander grid kleur wanneer magnitude deze waarde bereikt. Gebruikt geselecteerde weergave eenheid.' },
          grid_critical_color: { label: 'Grid kritieke kleur', helper: 'Kleur toegepast op kritieke drempel.' },
          invert_grid: { label: 'Grid waarden omkeren', helper: 'Inschakelen als import/export polariteit omgekeerd is.' },
          invert_battery: { label: 'Batterij waarden omkeren', helper: 'Inschakelen als laad/ontlaad polariteit omgekeerd is.' },
          invert_bat1: { label: 'Batterij 1 omkeren', helper: 'Inschakelen als laad/ontlaad polariteit van Batterij 1 omgekeerd is.' },
          invert_bat2: { label: 'Batterij 2 omkeren', helper: 'Inschakelen als laad/ontlaad polariteit van Batterij 2 omgekeerd is.' },
          invert_bat3: { label: 'Batterij 3 omkeren', helper: 'Inschakelen als laad/ontlaad polariteit van Batterij 3 omgekeerd is.' },
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
          car_headlight_flash: { label: 'Koplampen laten knipperen tijdens laden', helper: 'Inschakelen om de voertuigkoplampen te laten knipperen tijdens het laden.' },
          car_pct_color: { label: 'Voertuig SOC kleur', helper: 'Hex kleur voor EV SOC tekst (bijv. #00FFFF).' },
          car2_pct_color: { label: 'Voertuig 2 SOC kleur', helper: 'Hex kleur voor tweede EV SOC (valt terug op Voertuig SOC indien leeg).' },
          car1_name_color: { label: 'Voertuig 1 naam kleur', helper: 'Kleur toegepast op Voertuig 1 naam label.' },
          car2_name_color: { label: 'Voertuig 2 naam kleur', helper: 'Kleur toegepast op Voertuig 2 naam label.' },
          car1_color: { label: 'Voertuig 1 kleur', helper: 'Kleur toegepast op Voertuig 1 vermogen waarde.' },
          car2_color: { label: 'Voertuig 2 kleur', helper: 'Kleur toegepast op Voertuig 2 vermogen waarde.' },
          heat_pump_flow_color: { label: 'Warmtepomp stroom kleur', helper: 'Kleur toegepast op de warmtepomp stroom animatie.' },
          heat_pump_text_color: { label: 'Warmtepomp tekst kleur', helper: 'Kleur toegepast op de warmtepomp vermogen tekst.' },
          pool_flow_color: { label: 'Zwembad stroom kleur', helper: 'Kleur toegepast op de zwembad stroom animatie.' },
          pool_text_color: { label: 'Zwembad tekst kleur', helper: 'Kleur toegepast op de zwembad vermogen tekst.' },
          washing_machine_text_color: { label: 'Wasmachine tekst kleur', helper: 'Kleur toegepast op de wasmachine vermogen tekst.' },
          dryer_text_color: { label: 'Droger tekst kleur', helper: 'Kleur toegepast op de droger vermogen tekst.' },
          refrigerator_text_color: { label: 'Koelkast tekst kleur', helper: 'Kleur toegepast op de koelkast vermogen tekst.' },
          windmill_flow_color: { label: 'Windmill Flow Color', helper: 'Kleur toegepast op de windmill flow (data-flow-key="windmill").' },
          windmill_text_color: { label: 'Windmill Text Color', helper: 'Kleur toegepast op de windmill vermogen tekst (data-role="windmill-power").' },
          header_font_size: { label: 'Header lettergrootte (px)', helper: 'Standaard 16' },
          daily_label_font_size: { label: 'Dagelijks label lettergrootte (px)', helper: 'Standaard 12' },
          daily_value_font_size: { label: 'Dagelijks waarde lettergrootte (px)', helper: 'Standaard 20' },
          pv_font_size: { label: 'PV lettergrootte (px)', helper: 'Standaard 16' },
          windmill_power_font_size: { label: 'Windmill Power Font Size (px)', helper: 'Standaard 16' },
          battery_soc_font_size: { label: 'Batterij SOC lettergrootte (px)', helper: 'Standaard 20' },
          battery_power_font_size: { label: 'Batterij vermogen lettergrootte (px)', helper: 'Standaard 16' },
          load_font_size: { label: 'Belasting lettergrootte (px)', helper: 'Standaard 15' },
          inv1_power_font_size: { label: 'INV 1 vermogen lettergrootte (px)', helper: 'Lettergrootte voor de INV 1 vermogensregel. Standaard gebruikt belasting lettergrootte.' },
          inv2_power_font_size: { label: 'INV 2 vermogen lettergrootte (px)', helper: 'Lettergrootte voor de INV 2 vermogensregel. Standaard gebruikt belasting lettergrootte.' },
          heat_pump_font_size: { label: 'Warmtepomp lettergrootte (px)', helper: 'Standaard 16' },
          pool_font_size: { label: 'Zwembad lettergrootte (px)', helper: 'Standaard 16' },
          washing_machine_font_size: { label: 'Wasmachine lettergrootte (px)', helper: 'Standaard 16' },
          dryer_font_size: { label: 'Droger lettergrootte (px)', helper: 'Standaard 16' },
          refrigerator_font_size: { label: 'Koelkast lettergrootte (px)', helper: 'Standaard 16' },
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
          sensor_popup_house_6_font_size: { label: 'Lettergrootte House Popup 6 (px)', helper: 'Lettergrootte voor house popup lijn 6. Standaard 16' },
          sensor_popup_bat_1: { label: 'Battery Popup 1', helper: 'Entiteit voor battery popup lijn 1.' },
          sensor_popup_bat_1_name: { label: 'Naam Battery Popup 1', helper: 'Optionele aangepaste naam voor battery popup lijn 1. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_bat_1_color: { label: 'Kleur Battery Popup 1', helper: 'Kleur voor battery popup lijn 1 tekst.' },
          sensor_popup_bat_1_font_size: { label: 'Lettergrootte Battery Popup 1 (px)', helper: 'Lettergrootte voor battery popup lijn 1. Standaard 16' },
          sensor_popup_bat_2: { label: 'Battery Popup 2', helper: 'Entiteit voor battery popup lijn 2.' },
          sensor_popup_bat_2_name: { label: 'Naam Battery Popup 2', helper: 'Optionele aangepaste naam voor battery popup lijn 2. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_bat_2_color: { label: 'Kleur Battery Popup 2', helper: 'Kleur voor battery popup lijn 2 tekst.' },
          sensor_popup_bat_2_font_size: { label: 'Lettergrootte Battery Popup 2 (px)', helper: 'Lettergrootte voor battery popup lijn 2. Standaard 16' },
          sensor_popup_bat_3: { label: 'Battery Popup 3', helper: 'Entiteit voor battery popup lijn 3.' },
          sensor_popup_bat_3_name: { label: 'Naam Battery Popup 3', helper: 'Optionele aangepaste naam voor battery popup lijn 3. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_bat_3_color: { label: 'Kleur Battery Popup 3', helper: 'Kleur voor battery popup lijn 3 tekst.' },
          sensor_popup_bat_3_font_size: { label: 'Lettergrootte Battery Popup 3 (px)', helper: 'Lettergrootte voor battery popup lijn 3. Standaard 16' },
          sensor_popup_bat_4: { label: 'Battery Popup 4', helper: 'Entiteit voor battery popup lijn 4.' },
          sensor_popup_bat_4_name: { label: 'Naam Battery Popup 4', helper: 'Optionele aangepaste naam voor battery popup lijn 4. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_bat_4_color: { label: 'Kleur Battery Popup 4', helper: 'Kleur voor battery popup lijn 4 tekst.' },
          sensor_popup_bat_4_font_size: { label: 'Lettergrootte Battery Popup 4 (px)', helper: 'Lettergrootte voor battery popup lijn 4. Standaard 16' },
          sensor_popup_bat_5: { label: 'Battery Popup 5', helper: 'Entiteit voor battery popup lijn 5.' },
          sensor_popup_bat_5_name: { label: 'Naam Battery Popup 5', helper: 'Optionele aangepaste naam voor battery popup lijn 5. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_bat_5_color: { label: 'Kleur Battery Popup 5', helper: 'Kleur voor battery popup lijn 5 tekst.' },
          sensor_popup_bat_5_font_size: { label: 'Lettergrootte Battery Popup 5 (px)', helper: 'Lettergrootte voor battery popup lijn 5. Standaard 16' },
          sensor_popup_bat_6: { label: 'Battery Popup 6', helper: 'Entiteit voor battery popup lijn 6.' },
          sensor_popup_bat_6_name: { label: 'Naam Battery Popup 6', helper: 'Optionele aangepaste naam voor battery popup lijn 6. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_bat_6_color: { label: 'Kleur Battery Popup 6', helper: 'Kleur voor battery popup lijn 6 tekst.' },
          sensor_popup_bat_6_font_size: { label: 'Lettergrootte Battery Popup 6 (px)', helper: 'Lettergrootte voor battery popup lijn 6. Standaard 16' },
          sensor_popup_grid_1: { label: 'Grid Popup 1', helper: 'Entiteit voor grid popup lijn 1.' },
          sensor_popup_grid_1_name: { label: 'Naam Grid Popup 1', helper: 'Optionele aangepaste naam voor grid popup lijn 1. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_grid_1_color: { label: 'Kleur Grid Popup 1', helper: 'Kleur voor grid popup lijn 1 tekst.' },
          sensor_popup_grid_1_font_size: { label: 'Lettergrootte Grid Popup 1 (px)', helper: 'Lettergrootte voor grid popup lijn 1. Standaard 16' },
          sensor_popup_grid_2: { label: 'Grid Popup 2', helper: 'Entiteit voor grid popup lijn 2.' },
          sensor_popup_grid_2_name: { label: 'Naam Grid Popup 2', helper: 'Optionele aangepaste naam voor grid popup lijn 2. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_grid_2_color: { label: 'Kleur Grid Popup 2', helper: 'Kleur voor grid popup lijn 2 tekst.' },
          sensor_popup_grid_2_font_size: { label: 'Lettergrootte Grid Popup 2 (px)', helper: 'Lettergrootte voor grid popup lijn 2. Standaard 16' },
          sensor_popup_grid_3: { label: 'Grid Popup 3', helper: 'Entiteit voor grid popup lijn 3.' },
          sensor_popup_grid_3_name: { label: 'Naam Grid Popup 3', helper: 'Optionele aangepaste naam voor grid popup lijn 3. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_grid_3_color: { label: 'Kleur Grid Popup 3', helper: 'Kleur voor grid popup lijn 3 tekst.' },
          sensor_popup_grid_3_font_size: { label: 'Lettergrootte Grid Popup 3 (px)', helper: 'Lettergrootte voor grid popup lijn 3. Standaard 16' },
          sensor_popup_grid_4: { label: 'Grid Popup 4', helper: 'Entiteit voor grid popup lijn 4.' },
          sensor_popup_grid_4_name: { label: 'Naam Grid Popup 4', helper: 'Optionele aangepaste naam voor grid popup lijn 4. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_grid_4_color: { label: 'Kleur Grid Popup 4', helper: 'Kleur voor grid popup lijn 4 tekst.' },
          sensor_popup_grid_4_font_size: { label: 'Lettergrootte Grid Popup 4 (px)', helper: 'Lettergrootte voor grid popup lijn 4. Standaard 16' },
          sensor_popup_grid_5: { label: 'Grid Popup 5', helper: 'Entiteit voor grid popup lijn 5.' },
          sensor_popup_grid_5_name: { label: 'Naam Grid Popup 5', helper: 'Optionele aangepaste naam voor grid popup lijn 5. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_grid_5_color: { label: 'Kleur Grid Popup 5', helper: 'Kleur voor grid popup lijn 5 tekst.' },
          sensor_popup_grid_5_font_size: { label: 'Lettergrootte Grid Popup 5 (px)', helper: 'Lettergrootte voor grid popup lijn 5. Standaard 16' },
          sensor_popup_grid_6: { label: 'Grid Popup 6', helper: 'Entiteit voor grid popup lijn 6.' },
          sensor_popup_grid_6_name: { label: 'Naam Grid Popup 6', helper: 'Optionele aangepaste naam voor grid popup lijn 6. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_grid_6_color: { label: 'Kleur Grid Popup 6', helper: 'Kleur voor grid popup lijn 6 tekst.' },
          sensor_popup_grid_6_font_size: { label: 'Lettergrootte Grid Popup 6 (px)', helper: 'Lettergrootte voor grid popup lijn 6. Standaard 16' },
          sensor_popup_inverter_1: { label: 'Inverter Popup 1', helper: 'Entiteit voor inverter popup lijn 1.' },
          sensor_popup_inverter_1_name: { label: 'Naam Inverter Popup 1', helper: 'Optionele aangepaste naam voor inverter popup lijn 1. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_inverter_1_color: { label: 'Kleur Inverter Popup 1', helper: 'Kleur voor inverter popup lijn 1 tekst.' },
          sensor_popup_inverter_1_font_size: { label: 'Lettergrootte Inverter Popup 1 (px)', helper: 'Lettergrootte voor inverter popup lijn 1. Standaard 16' },
          sensor_popup_inverter_2: { label: 'Inverter Popup 2', helper: 'Entiteit voor inverter popup lijn 2.' },
          sensor_popup_inverter_2_name: { label: 'Naam Inverter Popup 2', helper: 'Optionele aangepaste naam voor inverter popup lijn 2. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_inverter_2_color: { label: 'Kleur Inverter Popup 2', helper: 'Kleur voor inverter popup lijn 2 tekst.' },
          sensor_popup_inverter_2_font_size: { label: 'Lettergrootte Inverter Popup 2 (px)', helper: 'Lettergrootte voor inverter popup lijn 2. Standaard 16' },
          sensor_popup_inverter_3: { label: 'Inverter Popup 3', helper: 'Entiteit voor inverter popup lijn 3.' },
          sensor_popup_inverter_3_name: { label: 'Naam Inverter Popup 3', helper: 'Optionele aangepaste naam voor inverter popup lijn 3. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_inverter_3_color: { label: 'Kleur Inverter Popup 3', helper: 'Kleur voor inverter popup lijn 3 tekst.' },
          sensor_popup_inverter_3_font_size: { label: 'Lettergrootte Inverter Popup 3 (px)', helper: 'Lettergrootte voor inverter popup lijn 3. Standaard 16' },
          sensor_popup_inverter_4: { label: 'Inverter Popup 4', helper: 'Entiteit voor inverter popup lijn 4.' },
          sensor_popup_inverter_4_name: { label: 'Naam Inverter Popup 4', helper: 'Optionele aangepaste naam voor inverter popup lijn 4. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_inverter_4_color: { label: 'Kleur Inverter Popup 4', helper: 'Kleur voor inverter popup lijn 4 tekst.' },
          sensor_popup_inverter_4_font_size: { label: 'Lettergrootte Inverter Popup 4 (px)', helper: 'Lettergrootte voor inverter popup lijn 4. Standaard 16' },
          sensor_popup_inverter_5: { label: 'Inverter Popup 5', helper: 'Entiteit voor inverter popup lijn 5.' },
          sensor_popup_inverter_5_name: { label: 'Naam Inverter Popup 5', helper: 'Optionele aangepaste naam voor inverter popup lijn 5. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_inverter_5_color: { label: 'Kleur Inverter Popup 5', helper: 'Kleur voor inverter popup lijn 5 tekst.' },
          sensor_popup_inverter_5_font_size: { label: 'Lettergrootte Inverter Popup 5 (px)', helper: 'Lettergrootte voor inverter popup lijn 5. Standaard 16' },
          sensor_popup_inverter_6: { label: 'Inverter Popup 6', helper: 'Entiteit voor inverter popup lijn 6.' },
          sensor_popup_inverter_6_name: { label: 'Naam Inverter Popup 6', helper: 'Optionele aangepaste naam voor inverter popup lijn 6. Laat leeg om entiteit naam te gebruiken.' },
          sensor_popup_inverter_6_color: { label: 'Kleur Inverter Popup 6', helper: 'Kleur voor inverter popup lijn 6 tekst.' },
          sensor_popup_inverter_6_font_size: { label: 'Lettergrootte Inverter Popup 6 (px)', helper: 'Lettergrootte voor inverter popup lijn 6. Standaard 16' }
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
            { value: 'dashes_glow', label: 'Strepen + Gloed' },
            { value: 'fluid_flow', label: 'Vloeiende stroom' },
            { value: 'dots', label: 'Stippen' },
            { value: 'arrows', label: 'Pijlen' }
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
      animation_style: localeStrings.options.animation_styles
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
    const popupEntitySelector = { entity: {} };
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
        { name: 'title_text_color', label: (fields.title_text_color && fields.title_text_color.label) || 'Title Text Color', helper: (fields.title_text_color && fields.title_text_color.helper) || '', selector: { color_picker: {} }, default: '' },
        { name: 'title_bg_color', label: (fields.title_bg_color && fields.title_bg_color.label) || 'Title Background Color', helper: (fields.title_bg_color && fields.title_bg_color.helper) || '', selector: { color_picker: {} }, default: '' },
        { name: 'font_family', label: (fields.font_family && fields.font_family.label) || 'Font Family', helper: (fields.font_family && fields.font_family.helper) || '', selector: { text: { mode: 'blur' } }, default: 'sans-serif' },
        { name: 'odometer_font_family', label: (fields.odometer_font_family && fields.odometer_font_family.label) || 'Odometer Font Family (Monospace)', helper: (fields.odometer_font_family && fields.odometer_font_family.helper) || '', selector: { text: { mode: 'blur' } }, default: '' },
        { name: 'header_font_size', label: fields.header_font_size.label, helper: fields.header_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'daily_label_font_size', label: fields.daily_label_font_size.label, helper: fields.daily_label_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'daily_value_font_size', label: fields.daily_value_font_size.label, helper: fields.daily_value_font_size.helper, selector: { text: { mode: 'blur' } } },       
        { name: 'background_day', label: fields.background_day.label, helper: fields.background_day.helper, selector: { text: { mode: 'blur' } }, default: '' },
        { name: 'background_night', label: fields.background_night.label, helper: fields.background_night.helper, selector: { text: { mode: 'blur' } }, default: '' },
        { name: 'day_night_mode', label: fields.night_mode.label, helper: fields.night_mode.helper, selector: { select: { options: [
          { value: 'day', label: 'Day' },
          { value: 'night', label: 'Night' },
          { value: 'auto', label: 'Auto' }
        ] } } },
        { name: 'language', label: fields.language.label, helper: fields.language.helper, selector: { select: { options: optionDefs.language } } },
        { name: 'display_unit', label: fields.display_unit.label, helper: fields.display_unit.helper, selector: { select: { options: optionDefs.display_unit } } },
        { name: 'update_interval', label: fields.update_interval.label, helper: fields.update_interval.helper, selector: { number: { min: 0, max: 60, step: 5, mode: 'slider', unit_of_measurement: 's' } } },
        { name: 'enable_echo_alive', label: (fields.enable_echo_alive && fields.enable_echo_alive.label) || 'Enable Echo Alive', helper: (fields.enable_echo_alive && fields.enable_echo_alive.helper) || 'Enables an invisible iframe to keep the Silk browser open on Echo Show.', selector: { boolean: {} }, default: false },
        { name: 'animation_speed_factor', label: fields.animation_speed_factor.label, helper: fields.animation_speed_factor.helper, selector: { number: { min: -3, max: 3, step: 0.25, mode: 'slider', unit_of_measurement: 'x' } } },
        { name: 'animation_style', label: fields.animation_style.label, helper: fields.animation_style.helper, selector: { select: { options: optionDefs.animation_style } } },
        { name: 'night_animation_style', label: fields.night_animation_style.label, helper: fields.night_animation_style.helper, selector: { select: { options: optionDefs.animation_style } } },
        { name: 'dashes_glow_intensity', label: fields.dashes_glow_intensity.label, helper: fields.dashes_glow_intensity.helper, selector: { number: { min: 0, max: 3, step: 0.1, mode: 'slider' } } },
        { name: 'flow_stroke_width', label: fields.flow_stroke_width.label, helper: fields.flow_stroke_width.helper, selector: { number: { min: 0.5, max: 30, step: 0.5, mode: 'slider', unit_of_measurement: 'px' } }, default: 3 },
        { name: 'fluid_flow_stroke_width', label: fields.fluid_flow_stroke_width.label, helper: fields.fluid_flow_stroke_width.helper, selector: { number: { min: 0.5, max: 30, step: 0.5, mode: 'slider', unit_of_measurement: 'px' } }, default: 4 },
        
      ]),
      pvCommon: define([
        { name: 'pv_tot_color', label: fields.pv_tot_color.label, helper: fields.pv_tot_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },        
        { name: 'pv_font_size', label: fields.pv_font_size.label, helper: fields.pv_font_size.helper, selector: { text: { mode: 'blur' } } },
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
        { name: 'pv_primary_color', label: fields.pv_primary_color.label, helper: fields.pv_primary_color.helper, selector: { color_picker: {} } },
        
      ]),
      array2: define([
        { name: 'sensor_pv_total_secondary', label: fields.sensor_pv_total_secondary.label, helper: fields.sensor_pv_total_secondary.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_1', label: fields.sensor_pv_array2_1.label, helper: fields.sensor_pv_array2_1.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_2', label: fields.sensor_pv_array2_2.label, helper: fields.sensor_pv_array2_2.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_3', label: fields.sensor_pv_array2_3.label, helper: fields.sensor_pv_array2_3.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_4', label: fields.sensor_pv_array2_4.label, helper: fields.sensor_pv_array2_4.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_5', label: fields.sensor_pv_array2_5.label, helper: fields.sensor_pv_array2_5.helper, selector: entitySelector },
        { name: 'sensor_pv_array2_6', label: fields.sensor_pv_array2_6.label, helper: fields.sensor_pv_array2_6.helper, selector: entitySelector },
        { name: 'sensor_daily_array2', label: fields.sensor_daily_array2.label, helper: fields.sensor_daily_array2.helper, selector: entitySelector },
        { name: 'pv_secondary_color', label: fields.pv_secondary_color.label, helper: fields.pv_secondary_color.helper, selector: { color_picker: {} } },
        
      ]),
      windmill: define([
        { name: 'sensor_windmill_total', label: fields.sensor_windmill_total.label, helper: fields.sensor_windmill_total.helper, selector: entitySelector },
        { name: 'sensor_windmill_daily', label: fields.sensor_windmill_daily.label, helper: fields.sensor_windmill_daily.helper, selector: entitySelector },
        { name: 'windmill_flow_color', label: fields.windmill_flow_color.label, helper: fields.windmill_flow_color.helper, selector: { color_picker: {} } },
        { name: 'windmill_text_color', label: fields.windmill_text_color.label, helper: fields.windmill_text_color.helper, selector: { color_picker: {} } },
        { name: 'windmill_power_font_size', label: fields.windmill_power_font_size.label, helper: fields.windmill_power_font_size.helper, selector: { text: { mode: 'blur' } } }
      ]),
      battery: define([
        { name: 'sensor_bat1_soc', label: fields.sensor_bat1_soc.label, helper: fields.sensor_bat1_soc.helper, selector: entitySelector },
        { name: 'sensor_bat1_power', label: fields.sensor_bat1_power.label, helper: fields.sensor_bat1_power.helper, selector: entitySelector },
        { name: 'sensor_bat1_charge_power', label: fields.sensor_bat1_charge_power.label, helper: fields.sensor_bat1_charge_power.helper, selector: entitySelector },
        { name: 'sensor_bat1_discharge_power', label: fields.sensor_bat1_discharge_power.label, helper: fields.sensor_bat1_discharge_power.helper, selector: entitySelector },
        { name: 'sensor_bat2_soc', label: fields.sensor_bat2_soc.label, helper: fields.sensor_bat2_soc.helper, selector: entitySelector },
        { name: 'sensor_bat2_power', label: fields.sensor_bat2_power.label, helper: fields.sensor_bat2_power.helper, selector: entitySelector },
        { name: 'sensor_bat2_charge_power', label: fields.sensor_bat2_charge_power.label, helper: fields.sensor_bat2_charge_power.helper, selector: entitySelector },
        { name: 'sensor_bat2_discharge_power', label: fields.sensor_bat2_discharge_power.label, helper: fields.sensor_bat2_discharge_power.helper, selector: entitySelector },
        { name: 'sensor_bat3_soc', label: fields.sensor_bat3_soc.label, helper: fields.sensor_bat3_soc.helper, selector: entitySelector },
        { name: 'sensor_bat3_power', label: fields.sensor_bat3_power.label, helper: fields.sensor_bat3_power.helper, selector: entitySelector },
        { name: 'sensor_bat3_charge_power', label: fields.sensor_bat3_charge_power.label, helper: fields.sensor_bat3_charge_power.helper, selector: entitySelector },
        { name: 'sensor_bat3_discharge_power', label: fields.sensor_bat3_discharge_power.label, helper: fields.sensor_bat3_discharge_power.helper, selector: entitySelector },
        { name: 'sensor_bat4_soc', label: fields.sensor_bat4_soc.label, helper: fields.sensor_bat4_soc.helper, selector: entitySelector },
        { name: 'sensor_bat4_power', label: fields.sensor_bat4_power.label, helper: fields.sensor_bat4_power.helper, selector: entitySelector },
        { name: 'sensor_bat4_charge_power', label: fields.sensor_bat4_charge_power.label, helper: fields.sensor_bat4_charge_power.helper, selector: entitySelector },
        { name: 'sensor_bat4_discharge_power', label: fields.sensor_bat4_discharge_power.label, helper: fields.sensor_bat4_discharge_power.helper, selector: entitySelector },
        { name: 'invert_battery', label: fields.invert_battery.label, helper: fields.invert_battery.helper, selector: { boolean: {} } },
        { name: 'battery_soc_color', label: fields.battery_soc_color.label, helper: fields.battery_soc_color.helper, selector: { color_picker: {} } },
        { name: 'battery_charge_color', label: fields.battery_charge_color.label, helper: fields.battery_charge_color.helper, selector: { color_picker: {} } },
        { name: 'battery_discharge_color', label: fields.battery_discharge_color.label, helper: fields.battery_discharge_color.helper, selector: { color_picker: {} } },
        { name: 'battery_fill_high_color', label: fields.battery_fill_high_color.label, helper: fields.battery_fill_high_color.helper, selector: { color_picker: {} } },
        { name: 'battery_fill_low_color', label: fields.battery_fill_low_color.label, helper: fields.battery_fill_low_color.helper, selector: { color_picker: {} } },
        { name: 'battery_fill_low_threshold', label: fields.battery_fill_low_threshold.label, helper: fields.battery_fill_low_threshold.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } }, default: DEFAULT_BATTERY_LOW_THRESHOLD },
        { name: 'battery_fill_opacity', label: fields.battery_fill_opacity.label, helper: fields.battery_fill_opacity.helper, selector: { number: { min: 0, max: 1, step: 0.05, mode: 'slider' } }, default: 1 },
        { name: 'battery_soc_font_size', label: fields.battery_soc_font_size.label, helper: fields.battery_soc_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'battery_power_font_size', label: fields.battery_power_font_size.label, helper: fields.battery_power_font_size.helper, selector: { text: { mode: 'blur' } } },
        
      ]),
      grid: define([
        { name: 'sensor_grid_power', label: fields.sensor_grid_power.label, helper: fields.sensor_grid_power.helper, selector: entitySelector },
        { name: 'sensor_grid_import', label: fields.sensor_grid_import.label, helper: fields.sensor_grid_import.helper, selector: entitySelector },
        { name: 'sensor_grid_export', label: fields.sensor_grid_export.label, helper: fields.sensor_grid_export.helper, selector: entitySelector },
        { name: 'sensor_grid_import_daily', label: fields.sensor_grid_import_daily.label, helper: fields.sensor_grid_import_daily.helper, selector: entitySelector },
        { name: 'sensor_grid_export_daily', label: fields.sensor_grid_export_daily.label, helper: fields.sensor_grid_export_daily.helper, selector: entitySelector },
        { name: 'sensor_grid2_power', label: fields.sensor_grid2_power.label, helper: fields.sensor_grid2_power.helper, selector: entitySelector },
        { name: 'sensor_grid2_import', label: fields.sensor_grid2_import.label, helper: fields.sensor_grid2_import.helper, selector: entitySelector },
        { name: 'sensor_grid2_export', label: fields.sensor_grid2_export.label, helper: fields.sensor_grid2_export.helper, selector: entitySelector },
        { name: 'sensor_grid2_import_daily', label: fields.sensor_grid2_import_daily.label, helper: fields.sensor_grid2_import_daily.helper, selector: entitySelector },
        { name: 'sensor_grid2_export_daily', label: fields.sensor_grid2_export_daily.label, helper: fields.sensor_grid2_export_daily.helper, selector: entitySelector },
        { name: 'show_daily_grid', label: fields.show_daily_grid.label, helper: fields.show_daily_grid.helper, selector: { boolean: {} } },
        { name: 'grid_daily_font_size', label: fields.grid_daily_font_size.label, helper: fields.grid_daily_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'grid_current_odometer', label: fields.grid_current_odometer.label, helper: fields.grid_current_odometer.helper, selector: { boolean: {} }, default: false },
        { name: 'grid_current_odometer_duration', label: fields.grid_current_odometer_duration.label, helper: fields.grid_current_odometer_duration.helper, selector: { number: { min: 50, max: 2000, step: 50, mode: 'slider', unit_of_measurement: 'ms' } }, default: 350 },
        { name: 'show_grid_flow_label', label: fields.show_grid_flow_label.label, helper: fields.show_grid_flow_label.helper, selector: { boolean: {} } },
        { name: 'invert_grid', label: fields.invert_grid.label, helper: fields.invert_grid.helper, selector: { boolean: {} } },
        { name: 'inv1_color', label: fields.inv1_color.label, helper: fields.inv1_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
        { name: 'inv2_color', label: fields.inv2_color.label, helper: fields.inv2_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
        { name: 'grid_import_color', label: fields.grid_import_color.label, helper: fields.grid_import_color.helper, selector: { color_picker: {} } },
        { name: 'grid_export_color', label: fields.grid_export_color.label, helper: fields.grid_export_color.helper, selector: { color_picker: {} } },
        { name: 'grid2_import_color', label: fields.grid2_import_color.label, helper: fields.grid2_import_color.helper, selector: { color_picker: {} } },
        { name: 'grid2_export_color', label: fields.grid2_export_color.label, helper: fields.grid2_export_color.helper, selector: { color_picker: {} } },
        { name: 'grid_activity_threshold', label: fields.grid_activity_threshold.label, helper: fields.grid_activity_threshold.helper, selector: { number: { min: 0, max: 100000, step: 10 } }, default: DEFAULT_GRID_ACTIVITY_THRESHOLD },
        { name: 'grid_threshold_warning', label: fields.grid_threshold_warning.label, helper: fields.grid_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
        { name: 'grid_warning_color', label: fields.grid_warning_color.label, helper: fields.grid_warning_color.helper, selector: { color_picker: {} } },
        { name: 'grid_threshold_critical', label: fields.grid_threshold_critical.label, helper: fields.grid_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
        { name: 'grid_critical_color', label: fields.grid_critical_color.label, helper: fields.grid_critical_color.helper, selector: { color_picker: {} } },
        { name: 'grid2_threshold_warning', label: fields.grid2_threshold_warning.label, helper: fields.grid2_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
        { name: 'grid2_warning_color', label: fields.grid2_warning_color.label, helper: fields.grid2_warning_color.helper, selector: { color_picker: {} } },
        { name: 'grid2_threshold_critical', label: fields.grid2_threshold_critical.label, helper: fields.grid2_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
        { name: 'grid2_critical_color', label: fields.grid2_critical_color.label, helper: fields.grid2_critical_color.helper, selector: { color_picker: {} } },
        { name: 'grid_font_size', label: fields.grid_font_size.label, helper: fields.grid_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'inv1_power_font_size', label: fields.inv1_power_font_size.label, helper: fields.inv1_power_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'inv2_power_font_size', label: fields.inv2_power_font_size.label, helper: fields.inv2_power_font_size.helper, selector: { text: { mode: 'blur' } } },        
        
      ]),
      car: define([
        { name: 'sensor_car_power', label: fields.sensor_car_power.label, helper: fields.sensor_car_power.helper, selector: entitySelector },
        { name: 'sensor_car_soc', label: fields.sensor_car_soc.label, helper: fields.sensor_car_soc.helper, selector: entitySelector },
        { name: 'sensor_car2_power', label: fields.sensor_car2_power.label, helper: fields.sensor_car2_power.helper, selector: entitySelector },
        { name: 'sensor_car2_soc', label: fields.sensor_car2_soc.label, helper: fields.sensor_car2_soc.helper, selector: entitySelector },
        { name: 'car1_label', label: fields.car1_label.label, helper: fields.car1_label.helper, selector: { text: { mode: 'blur' } } },
        { name: 'car2_label', label: fields.car2_label.label, helper: fields.car2_label.helper, selector: { text: { mode: 'blur' } } },
        { name: 'car_headlight_flash', label: fields.car_headlight_flash.label, helper: fields.car_headlight_flash.helper, selector: { boolean: {} } },
        { name: 'car_flow_color', label: fields.car_flow_color.label, helper: fields.car_flow_color.helper, selector: { color_picker: {} } },
        { name: 'car_pct_color', label: fields.car_pct_color.label, helper: fields.car_pct_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
        { name: 'car2_pct_color', label: fields.car2_pct_color.label, helper: fields.car2_pct_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
        { name: 'car1_name_color', label: fields.car1_name_color.label, helper: fields.car1_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'car2_name_color', label: fields.car2_name_color.label, helper: fields.car2_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'car1_color', label: fields.car1_color.label, helper: fields.car1_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'car2_color', label: fields.car2_color.label, helper: fields.car2_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'car_power_font_size', label: fields.car_power_font_size.label, helper: fields.car_power_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'car2_power_font_size', label: (fields.car2_power_font_size && fields.car2_power_font_size.label) || '', helper: (fields.car2_power_font_size && fields.car2_power_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car_name_font_size', label: (fields.car_name_font_size && fields.car_name_font_size.label) || '', helper: (fields.car_name_font_size && fields.car_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car2_name_font_size', label: (fields.car2_name_font_size && fields.car2_name_font_size.label) || '', helper: (fields.car2_name_font_size && fields.car2_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car_soc_font_size', label: (fields.car_soc_font_size && fields.car_soc_font_size.label) || '', helper: (fields.car_soc_font_size && fields.car_soc_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'car2_soc_font_size', label: (fields.car2_soc_font_size && fields.car2_soc_font_size.label) || '', helper: (fields.car2_soc_font_size && fields.car2_soc_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
       
      ]),
      other: define([
        { name: 'sensor_home_load', label: fields.sensor_home_load.label, helper: fields.sensor_home_load.helper, selector: entitySelector },
        { name: 'sensor_home_load_secondary', label: fields.sensor_home_load_secondary.label, helper: fields.sensor_home_load_secondary.helper, selector: entitySelector },        
        { name: 'sensor_heat_pump_consumption', label: fields.sensor_heat_pump_consumption.label, helper: fields.sensor_heat_pump_consumption.helper, selector: entitySelector },
        { name: 'heat_pump_label', label: (fields.heat_pump_label && fields.heat_pump_label.label) || 'Heat Pump/AC Label', helper: (fields.heat_pump_label && fields.heat_pump_label.helper) || 'Optional. Overrides the static label shown next to the heat pump value (data-role="heat-pump-power-text"). If empty, built-in translations are used.', selector: { text: { mode: 'blur' } }, default: '' },
        { name: 'sensor_pool_consumption', label: fields.sensor_pool_consumption.label, helper: fields.sensor_pool_consumption.helper, selector: entitySelector },
        { name: 'sensor_washing_machine_consumption', label: fields.sensor_washing_machine_consumption.label, helper: fields.sensor_washing_machine_consumption.helper, selector: entitySelector },
        { name: 'sensor_dryer_consumption', label: fields.sensor_dryer_consumption.label, helper: fields.sensor_dryer_consumption.helper, selector: entitySelector },
        { name: 'sensor_refrigerator_consumption', label: fields.sensor_refrigerator_consumption.label, helper: fields.sensor_refrigerator_consumption.helper, selector: entitySelector },
        { name: 'heat_pump_flow_color', label: fields.heat_pump_flow_color.label, helper: fields.heat_pump_flow_color.helper, selector: { color_picker: {} }, default: '#FFA500' },
        { name: 'heat_pump_text_color', label: fields.heat_pump_text_color.label, helper: fields.heat_pump_text_color.helper, selector: { color_picker: {} }, default: '#FFA500' },
        { name: 'pool_flow_color', label: fields.pool_flow_color.label, helper: fields.pool_flow_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
        { name: 'pool_text_color', label: fields.pool_text_color.label, helper: fields.pool_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'washing_machine_text_color', label: fields.washing_machine_text_color.label, helper: fields.washing_machine_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'dryer_text_color', label: fields.dryer_text_color.label, helper: fields.dryer_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'refrigerator_text_color', label: fields.refrigerator_text_color.label, helper: fields.refrigerator_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'load_flow_color', label: fields.load_flow_color.label, helper: fields.load_flow_color.helper, selector: { color_picker: {} } },
        { name: 'load_text_color', label: fields.load_text_color.label, helper: fields.load_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
        { name: 'house_total_color', label: fields.house_total_color.label, helper: fields.house_total_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
        { name: 'load_threshold_warning', label: fields.load_threshold_warning.label, helper: fields.load_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
        { name: 'load_warning_color', label: fields.load_warning_color.label, helper: fields.load_warning_color.helper, selector: { color_picker: {} } },
        { name: 'load_threshold_critical', label: fields.load_threshold_critical.label, helper: fields.load_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
        { name: 'load_critical_color', label: fields.load_critical_color.label, helper: fields.load_critical_color.helper, selector: { color_picker: {} } },      
        { name: 'heat_pump_font_size', label: fields.heat_pump_font_size.label, helper: fields.heat_pump_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'pool_font_size', label: fields.pool_font_size.label, helper: fields.pool_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'washing_machine_font_size', label: fields.washing_machine_font_size.label, helper: fields.washing_machine_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'dryer_font_size', label: fields.dryer_font_size.label, helper: fields.dryer_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'refrigerator_font_size', label: fields.refrigerator_font_size.label, helper: fields.refrigerator_font_size.helper, selector: { text: { mode: 'blur' } } },
        { name: 'load_font_size', label: fields.load_font_size.label, helper: fields.load_font_size.helper, selector: { text: { mode: 'blur' } } },

      ]),
      entities: define([
        
      ]),
      colors: define([

      ]),
      typography: define([
      ]),
      pvPopup: define([
        { name: 'sensor_popup_pv_1', label: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.label) || '', helper: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_pv_1_name', label: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.label) || '', helper: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_2', label: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.label) || '', helper: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_pv_2_name', label: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.label) || '', helper: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_3', label: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.label) || '', helper: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_pv_3_name', label: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.label) || '', helper: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_4', label: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.label) || '', helper: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_pv_4_name', label: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.label) || '', helper: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_5', label: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.label) || '', helper: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_pv_5_name', label: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.label) || '', helper: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_6', label: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.label) || '', helper: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_pv_6_name', label: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.label) || '', helper: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_pv_1_color', label: (fields.sensor_popup_pv_1_color && fields.sensor_popup_pv_1_color.label) || '', helper: (fields.sensor_popup_pv_1_color && fields.sensor_popup_pv_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_pv_2_color', label: (fields.sensor_popup_pv_2_color && fields.sensor_popup_pv_2_color.label) || '', helper: (fields.sensor_popup_pv_2_color && fields.sensor_popup_pv_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_pv_3_color', label: (fields.sensor_popup_pv_3_color && fields.sensor_popup_pv_3_color.label) || '', helper: (fields.sensor_popup_pv_3_color && fields.sensor_popup_pv_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_pv_4_color', label: (fields.sensor_popup_pv_4_color && fields.sensor_popup_pv_4_color.label) || '', helper: (fields.sensor_popup_pv_4_color && fields.sensor_popup_pv_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_pv_5_color', label: (fields.sensor_popup_pv_5_color && fields.sensor_popup_pv_5_color.label) || '', helper: (fields.sensor_popup_pv_5_color && fields.sensor_popup_pv_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_pv_6_color', label: (fields.sensor_popup_pv_6_color && fields.sensor_popup_pv_6_color.label) || '', helper: (fields.sensor_popup_pv_6_color && fields.sensor_popup_pv_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_pv_1_font_size', label: (fields.sensor_popup_pv_1_font_size && fields.sensor_popup_pv_1_font_size.label) || '', helper: (fields.sensor_popup_pv_1_font_size && fields.sensor_popup_pv_1_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_2_font_size', label: (fields.sensor_popup_pv_2_font_size && fields.sensor_popup_pv_2_font_size.label) || '', helper: (fields.sensor_popup_pv_2_font_size && fields.sensor_popup_pv_2_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_3_font_size', label: (fields.sensor_popup_pv_3_font_size && fields.sensor_popup_pv_3_font_size.label) || '', helper: (fields.sensor_popup_pv_3_font_size && fields.sensor_popup_pv_3_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_4_font_size', label: (fields.sensor_popup_pv_4_font_size && fields.sensor_popup_pv_4_font_size.label) || '', helper: (fields.sensor_popup_pv_4_font_size && fields.sensor_popup_pv_4_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_5_font_size', label: (fields.sensor_popup_pv_5_font_size && fields.sensor_popup_pv_5_font_size.label) || '', helper: (fields.sensor_popup_pv_5_font_size && fields.sensor_popup_pv_5_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_pv_6_font_size', label: (fields.sensor_popup_pv_6_font_size && fields.sensor_popup_pv_6_font_size.label) || '', helper: (fields.sensor_popup_pv_6_font_size && fields.sensor_popup_pv_6_font_size.helper) || '', selector: { text: { mode: 'blur' } } },

      ]),
      batteryPopup: define([
        { name: 'sensor_popup_bat_1', label: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.label) || '', helper: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_bat_1_name', label: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.label) || '', helper: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_2', label: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.label) || '', helper: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_bat_2_name', label: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.label) || '', helper: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_3', label: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.label) || '', helper: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_bat_3_name', label: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.label) || '', helper: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_4', label: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.label) || '', helper: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_bat_4_name', label: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.label) || '', helper: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_5', label: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.label) || '', helper: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_bat_5_name', label: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.label) || '', helper: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_6', label: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.label) || '', helper: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_bat_6_name', label: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.label) || '', helper: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_bat_1_color', label: (fields.sensor_popup_bat_1_color && fields.sensor_popup_bat_1_color.label) || '', helper: (fields.sensor_popup_bat_1_color && fields.sensor_popup_bat_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_bat_2_color', label: (fields.sensor_popup_bat_2_color && fields.sensor_popup_bat_2_color.label) || '', helper: (fields.sensor_popup_bat_2_color && fields.sensor_popup_bat_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_bat_3_color', label: (fields.sensor_popup_bat_3_color && fields.sensor_popup_bat_3_color.label) || '', helper: (fields.sensor_popup_bat_3_color && fields.sensor_popup_bat_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_bat_4_color', label: (fields.sensor_popup_bat_4_color && fields.sensor_popup_bat_4_color.label) || '', helper: (fields.sensor_popup_bat_4_color && fields.sensor_popup_bat_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_bat_5_color', label: (fields.sensor_popup_bat_5_color && fields.sensor_popup_bat_5_color.label) || '', helper: (fields.sensor_popup_bat_5_color && fields.sensor_popup_bat_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_bat_6_color', label: (fields.sensor_popup_bat_6_color && fields.sensor_popup_bat_6_color.label) || '', helper: (fields.sensor_popup_bat_6_color && fields.sensor_popup_bat_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_bat_1_font_size', label: (fields.sensor_popup_bat_1_font_size && fields.sensor_popup_bat_1_font_size.label) || '', helper: (fields.sensor_popup_bat_1_font_size && fields.sensor_popup_bat_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_2_font_size', label: (fields.sensor_popup_bat_2_font_size && fields.sensor_popup_bat_2_font_size.label) || '', helper: (fields.sensor_popup_bat_2_font_size && fields.sensor_popup_bat_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_3_font_size', label: (fields.sensor_popup_bat_3_font_size && fields.sensor_popup_bat_3_font_size.label) || '', helper: (fields.sensor_popup_bat_3_font_size && fields.sensor_popup_bat_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_4_font_size', label: (fields.sensor_popup_bat_4_font_size && fields.sensor_popup_bat_4_font_size.label) || '', helper: (fields.sensor_popup_bat_4_font_size && fields.sensor_popup_bat_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_5_font_size', label: (fields.sensor_popup_bat_5_font_size && fields.sensor_popup_bat_5_font_size.label) || '', helper: (fields.sensor_popup_bat_5_font_size && fields.sensor_popup_bat_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_bat_6_font_size', label: (fields.sensor_popup_bat_6_font_size && fields.sensor_popup_bat_6_font_size.label) || '', helper: (fields.sensor_popup_bat_6_font_size && fields.sensor_popup_bat_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' }
      ]),
      gridPopup: define([
        { name: 'sensor_popup_grid_1', label: (fields.sensor_popup_grid_1 && fields.sensor_popup_grid_1.label) || '', helper: (fields.sensor_popup_grid_1 && fields.sensor_popup_grid_1.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_grid_1_name', label: (fields.sensor_popup_grid_1_name && fields.sensor_popup_grid_1_name.label) || '', helper: (fields.sensor_popup_grid_1_name && fields.sensor_popup_grid_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_grid_2', label: (fields.sensor_popup_grid_2 && fields.sensor_popup_grid_2.label) || '', helper: (fields.sensor_popup_grid_2 && fields.sensor_popup_grid_2.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_grid_2_name', label: (fields.sensor_popup_grid_2_name && fields.sensor_popup_grid_2_name.label) || '', helper: (fields.sensor_popup_grid_2_name && fields.sensor_popup_grid_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_grid_3', label: (fields.sensor_popup_grid_3 && fields.sensor_popup_grid_3.label) || '', helper: (fields.sensor_popup_grid_3 && fields.sensor_popup_grid_3.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_grid_3_name', label: (fields.sensor_popup_grid_3_name && fields.sensor_popup_grid_3_name.label) || '', helper: (fields.sensor_popup_grid_3_name && fields.sensor_popup_grid_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_grid_4', label: (fields.sensor_popup_grid_4 && fields.sensor_popup_grid_4.label) || '', helper: (fields.sensor_popup_grid_4 && fields.sensor_popup_grid_4.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_grid_4_name', label: (fields.sensor_popup_grid_4_name && fields.sensor_popup_grid_4_name.label) || '', helper: (fields.sensor_popup_grid_4_name && fields.sensor_popup_grid_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_grid_5', label: (fields.sensor_popup_grid_5 && fields.sensor_popup_grid_5.label) || '', helper: (fields.sensor_popup_grid_5 && fields.sensor_popup_grid_5.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_grid_5_name', label: (fields.sensor_popup_grid_5_name && fields.sensor_popup_grid_5_name.label) || '', helper: (fields.sensor_popup_grid_5_name && fields.sensor_popup_grid_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_grid_6', label: (fields.sensor_popup_grid_6 && fields.sensor_popup_grid_6.label) || '', helper: (fields.sensor_popup_grid_6 && fields.sensor_popup_grid_6.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_grid_6_name', label: (fields.sensor_popup_grid_6_name && fields.sensor_popup_grid_6_name.label) || '', helper: (fields.sensor_popup_grid_6_name && fields.sensor_popup_grid_6_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_grid_1_color', label: (fields.sensor_popup_grid_1_color && fields.sensor_popup_grid_1_color.label) || '', helper: (fields.sensor_popup_grid_1_color && fields.sensor_popup_grid_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_grid_2_color', label: (fields.sensor_popup_grid_2_color && fields.sensor_popup_grid_2_color.label) || '', helper: (fields.sensor_popup_grid_2_color && fields.sensor_popup_grid_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_grid_3_color', label: (fields.sensor_popup_grid_3_color && fields.sensor_popup_grid_3_color.label) || '', helper: (fields.sensor_popup_grid_3_color && fields.sensor_popup_grid_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_grid_4_color', label: (fields.sensor_popup_grid_4_color && fields.sensor_popup_grid_4_color.label) || '', helper: (fields.sensor_popup_grid_4_color && fields.sensor_popup_grid_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_grid_5_color', label: (fields.sensor_popup_grid_5_color && fields.sensor_popup_grid_5_color.label) || '', helper: (fields.sensor_popup_grid_5_color && fields.sensor_popup_grid_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_grid_6_color', label: (fields.sensor_popup_grid_6_color && fields.sensor_popup_grid_6_color.label) || '', helper: (fields.sensor_popup_grid_6_color && fields.sensor_popup_grid_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_grid_1_font_size', label: (fields.sensor_popup_grid_1_font_size && fields.sensor_popup_grid_1_font_size.label) || '', helper: (fields.sensor_popup_grid_1_font_size && fields.sensor_popup_grid_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_grid_2_font_size', label: (fields.sensor_popup_grid_2_font_size && fields.sensor_popup_grid_2_font_size.label) || '', helper: (fields.sensor_popup_grid_2_font_size && fields.sensor_popup_grid_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_grid_3_font_size', label: (fields.sensor_popup_grid_3_font_size && fields.sensor_popup_grid_3_font_size.label) || '', helper: (fields.sensor_popup_grid_3_font_size && fields.sensor_popup_grid_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_grid_4_font_size', label: (fields.sensor_popup_grid_4_font_size && fields.sensor_popup_grid_4_font_size.label) || '', helper: (fields.sensor_popup_grid_4_font_size && fields.sensor_popup_grid_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_grid_5_font_size', label: (fields.sensor_popup_grid_5_font_size && fields.sensor_popup_grid_5_font_size.label) || '', helper: (fields.sensor_popup_grid_5_font_size && fields.sensor_popup_grid_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_grid_6_font_size', label: (fields.sensor_popup_grid_6_font_size && fields.sensor_popup_grid_6_font_size.label) || '', helper: (fields.sensor_popup_grid_6_font_size && fields.sensor_popup_grid_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
      ]),
      inverterPopup: define([
        { name: 'sensor_popup_inverter_1', label: (fields.sensor_popup_inverter_1 && fields.sensor_popup_inverter_1.label) || '', helper: (fields.sensor_popup_inverter_1 && fields.sensor_popup_inverter_1.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_inverter_1_name', label: (fields.sensor_popup_inverter_1_name && fields.sensor_popup_inverter_1_name.label) || '', helper: (fields.sensor_popup_inverter_1_name && fields.sensor_popup_inverter_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_inverter_2', label: (fields.sensor_popup_inverter_2 && fields.sensor_popup_inverter_2.label) || '', helper: (fields.sensor_popup_inverter_2 && fields.sensor_popup_inverter_2.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_inverter_2_name', label: (fields.sensor_popup_inverter_2_name && fields.sensor_popup_inverter_2_name.label) || '', helper: (fields.sensor_popup_inverter_2_name && fields.sensor_popup_inverter_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_inverter_3', label: (fields.sensor_popup_inverter_3 && fields.sensor_popup_inverter_3.label) || '', helper: (fields.sensor_popup_inverter_3 && fields.sensor_popup_inverter_3.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_inverter_3_name', label: (fields.sensor_popup_inverter_3_name && fields.sensor_popup_inverter_3_name.label) || '', helper: (fields.sensor_popup_inverter_3_name && fields.sensor_popup_inverter_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_inverter_4', label: (fields.sensor_popup_inverter_4 && fields.sensor_popup_inverter_4.label) || '', helper: (fields.sensor_popup_inverter_4 && fields.sensor_popup_inverter_4.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_inverter_4_name', label: (fields.sensor_popup_inverter_4_name && fields.sensor_popup_inverter_4_name.label) || '', helper: (fields.sensor_popup_inverter_4_name && fields.sensor_popup_inverter_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_inverter_5', label: (fields.sensor_popup_inverter_5 && fields.sensor_popup_inverter_5.label) || '', helper: (fields.sensor_popup_inverter_5 && fields.sensor_popup_inverter_5.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_inverter_5_name', label: (fields.sensor_popup_inverter_5_name && fields.sensor_popup_inverter_5_name.label) || '', helper: (fields.sensor_popup_inverter_5_name && fields.sensor_popup_inverter_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_inverter_6', label: (fields.sensor_popup_inverter_6 && fields.sensor_popup_inverter_6.label) || '', helper: (fields.sensor_popup_inverter_6 && fields.sensor_popup_inverter_6.label) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_inverter_6_name', label: (fields.sensor_popup_inverter_6_name && fields.sensor_popup_inverter_6_name.label) || '', helper: (fields.sensor_popup_inverter_6_name && fields.sensor_popup_inverter_6_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_inverter_1_color', label: (fields.sensor_popup_inverter_1_color && fields.sensor_popup_inverter_1_color.label) || '', helper: (fields.sensor_popup_inverter_1_color && fields.sensor_popup_inverter_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_inverter_2_color', label: (fields.sensor_popup_inverter_2_color && fields.sensor_popup_inverter_2_color.label) || '', helper: (fields.sensor_popup_inverter_2_color && fields.sensor_popup_inverter_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_inverter_3_color', label: (fields.sensor_popup_inverter_3_color && fields.sensor_popup_inverter_3_color.label) || '', helper: (fields.sensor_popup_inverter_3_color && fields.sensor_popup_inverter_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_inverter_4_color', label: (fields.sensor_popup_inverter_4_color && fields.sensor_popup_inverter_4_color.label) || '', helper: (fields.sensor_popup_inverter_4_color && fields.sensor_popup_inverter_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_inverter_5_color', label: (fields.sensor_popup_inverter_5_color && fields.sensor_popup_inverter_5_color.label) || '', helper: (fields.sensor_popup_inverter_5_color && fields.sensor_popup_inverter_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_inverter_6_color', label: (fields.sensor_popup_inverter_6_color && fields.sensor_popup_inverter_6_color.label) || '', helper: (fields.sensor_popup_inverter_6_color && fields.sensor_popup_inverter_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_inverter_1_font_size', label: (fields.sensor_popup_inverter_1_font_size && fields.sensor_popup_inverter_1_font_size.label) || '', helper: (fields.sensor_popup_inverter_1_font_size && fields.sensor_popup_inverter_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_inverter_2_font_size', label: (fields.sensor_popup_inverter_2_font_size && fields.sensor_popup_inverter_2_font_size.label) || '', helper: (fields.sensor_popup_inverter_2_font_size && fields.sensor_popup_inverter_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_inverter_3_font_size', label: (fields.sensor_popup_inverter_3_font_size && fields.sensor_popup_inverter_3_font_size.label) || '', helper: (fields.sensor_popup_inverter_3_font_size && fields.sensor_popup_inverter_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_inverter_4_font_size', label: (fields.sensor_popup_inverter_4_font_size && fields.sensor_popup_inverter_4_font_size.label) || '', helper: (fields.sensor_popup_inverter_4_font_size && fields.sensor_popup_inverter_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_inverter_5_font_size', label: (fields.sensor_popup_inverter_5_font_size && fields.sensor_popup_inverter_5_font_size.label) || '', helper: (fields.sensor_popup_inverter_5_font_size && fields.sensor_popup_inverter_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        { name: 'sensor_popup_inverter_6_font_size', label: (fields.sensor_popup_inverter_6_font_size && fields.sensor_popup_inverter_6_font_size.label) || '', helper: (fields.sensor_popup_inverter_6_font_size && fields.sensor_popup_inverter_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
      ]),
      housePopup: define([
        { name: 'sensor_popup_house_1', label: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.label) || '', helper: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_house_1_name', label: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.label) || '', helper: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_2', label: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.label) || '', helper: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_house_2_name', label: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.label) || '', helper: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_3', label: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.label) || '', helper: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_house_3_name', label: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.label) || '', helper: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_4', label: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.label) || '', helper: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_house_4_name', label: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.label) || '', helper: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_5', label: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.label) || '', helper: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_house_5_name', label: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.label) || '', helper: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_6', label: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.label) || '', helper: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.helper) || '', selector: popupEntitySelector },
        { name: 'sensor_popup_house_6_name', label: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.label) || '', helper: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.helper) || '', selector: { text: {} } },
        { name: 'sensor_popup_house_1_color', label: (fields.sensor_popup_house_1_color && fields.sensor_popup_house_1_color.label) || '', helper: (fields.sensor_popup_house_1_color && fields.sensor_popup_house_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_house_2_color', label: (fields.sensor_popup_house_2_color && fields.sensor_popup_house_2_color.label) || '', helper: (fields.sensor_popup_house_2_color && fields.sensor_popup_house_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_house_3_color', label: (fields.sensor_popup_house_3_color && fields.sensor_popup_house_3_color.label) || '', helper: (fields.sensor_popup_house_3_color && fields.sensor_popup_house_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_house_4_color', label: (fields.sensor_popup_house_4_color && fields.sensor_popup_house_4_color.label) || '', helper: (fields.sensor_popup_house_4_color && fields.sensor_popup_house_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_house_5_color', label: (fields.sensor_popup_house_5_color && fields.sensor_popup_house_5_color.label) || '', helper: (fields.sensor_popup_house_5_color && fields.sensor_popup_house_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_house_6_color', label: (fields.sensor_popup_house_6_color && fields.sensor_popup_house_6_color.label) || '', helper: (fields.sensor_popup_house_6_color && fields.sensor_popup_house_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
        { name: 'sensor_popup_house_1_font_size', label: (fields.sensor_popup_house_1_font_size && fields.sensor_popup_house_1_font_size.label) || '', helper: (fields.sensor_popup_house_1_font_size && fields.sensor_popup_house_1_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_2_font_size', label: (fields.sensor_popup_house_2_font_size && fields.sensor_popup_house_2_font_size.label) || '', helper: (fields.sensor_popup_house_2_font_size && fields.sensor_popup_house_2_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_3_font_size', label: (fields.sensor_popup_house_3_font_size && fields.sensor_popup_house_3_font_size.label) || '', helper: (fields.sensor_popup_house_3_font_size && fields.sensor_popup_house_3_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_4_font_size', label: (fields.sensor_popup_house_4_font_size && fields.sensor_popup_house_4_font_size.label) || '', helper: (fields.sensor_popup_house_4_font_size && fields.sensor_popup_house_4_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_5_font_size', label: (fields.sensor_popup_house_5_font_size && fields.sensor_popup_house_5_font_size.label) || '', helper: (fields.sensor_popup_house_5_font_size && fields.sensor_popup_house_5_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sensor_popup_house_6_font_size', label: (fields.sensor_popup_house_6_font_size && fields.sensor_popup_house_6_font_size.label) || '', helper: (fields.sensor_popup_house_6_font_size && fields.sensor_popup_house_6_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
      ])
    };
  }

  _createSectionDefs(localeStrings, schemaDefs) {
    const sections = localeStrings.sections;
    return [
      { id: 'pvCommon', title: sections.pvCommon.title, helper: sections.pvCommon.helper, schema: schemaDefs.pvCommon, defaultOpen: false },
      { id: 'array1', title: sections.array1.title, helper: sections.array1.helper, schema: schemaDefs.array1, defaultOpen: false },
      { id: 'array2', title: sections.array2.title, helper: sections.array2.helper, renderContent: () => {
        const wrapper = document.createElement('div');
        wrapper.appendChild(this._createForm(schemaDefs.array2));
        return wrapper;
      }, defaultOpen: false },
      { id: 'windmill', title: sections.windmill.title, helper: sections.windmill.helper, schema: schemaDefs.windmill, defaultOpen: false },
      { id: 'battery', title: sections.battery.title, helper: sections.battery.helper, schema: schemaDefs.battery, defaultOpen: false },
      { id: 'grid', title: sections.grid.title, helper: sections.grid.helper, schema: schemaDefs.grid, defaultOpen: false },
      { id: 'car', title: sections.car.title, helper: sections.car.helper, schema: schemaDefs.car, defaultOpen: false },
      { id: 'other', title: sections.other.title, helper: sections.other.helper, schema: schemaDefs.other, defaultOpen: false },
      { id: 'pvPopup', title: sections.pvPopup.title, helper: sections.pvPopup.helper, schema: schemaDefs.pvPopup, defaultOpen: false },
      { id: 'batteryPopup', title: sections.batteryPopup.title, helper: sections.batteryPopup.helper, schema: schemaDefs.batteryPopup, defaultOpen: false },
      { id: 'gridPopup', title: sections.gridPopup.title, helper: sections.gridPopup.helper, schema: schemaDefs.gridPopup, defaultOpen: false },
      { id: 'inverterPopup', title: sections.inverterPopup.title, helper: sections.inverterPopup.helper, schema: schemaDefs.inverterPopup, defaultOpen: false },
      { id: 'housePopup', title: sections.housePopup.title, helper: sections.housePopup.helper, schema: schemaDefs.housePopup, defaultOpen: false },
      { id: 'general', title: sections.general.title, helper: sections.general.helper, schema: schemaDefs.general, defaultOpen: false },
      { id: 'about', title: sections.about.title, helper: sections.about.helper, schema: null, defaultOpen: false, renderContent: () => this._createAboutContent() }
    ];
  }

  _configWithDefaults() {
    const merged = { ...this._defaults, ...this._config };

    // Backward-compat mapping: if only legacy background_image is set, treat it as both day/night.
    if (!merged.background_day && merged.background_image) {
      merged.background_day = merged.background_image;
    }
    if (!merged.background_night && merged.background_image) {
      merged.background_night = merged.background_image;
    }

    const rawMode = merged.day_night_mode;
    const normalized = typeof rawMode === 'string' ? rawMode.trim().toLowerCase() : '';
    if (normalized !== 'day' && normalized !== 'night' && normalized !== 'auto') {
      if (typeof merged.night_mode === 'boolean') {
        merged.day_night_mode = merged.night_mode ? 'night' : 'day';
      } else {
        merged.day_night_mode = 'day';
      }
    }
    return merged;
  }

  setConfig(config) {
    const migrated = this._migrateBackgroundFilenames(config);
    const sanitized = stripLegacyCarVisibility(migrated);
    this._config = { ...sanitized };
    this._rendered = false;
    this.render();

    // Persist legacy background filename migrations back into the dashboard config.
    try {
      const backgroundsUpdated = config && migrated && (
        config.background_day !== migrated.background_day ||
        config.background_night !== migrated.background_night ||
        config.background_image !== migrated.background_image
      );
      const legacyKeysRemoved = sanitized !== migrated;
      if (backgroundsUpdated || legacyKeysRemoved) {
        this.configChanged(this._config);
      }
    } catch (e) {
      // ignore
    }
  }

  get value() {
    return this._config;
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
    this._config = newConfig;
    if (this._configChangeTimer) {
      clearTimeout(this._configChangeTimer);
      this._configChangeTimer = null;
    }
    if (immediate) {
      this.configChanged(newConfig);
      return;
    }
    const delay = 800;
    this._configChangeTimer = setTimeout(() => {
      // If the user is still editing (focused inside the editor), defer the
      // config-changed event to prevent focus loss.
      if (this._isEditing) {
        this._pendingConfigChange = true;
        this._configChangeTimer = null;
        return;
      }
      this.configChanged(this._config);
      this._configChangeTimer = null;
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
      // Many HA controls bubble `value-changed` from an inner component.
      // Also, on clear (X), some components update `ha-form` data *after* the event.
      // Run once in a microtask and once on the next frame to read authoritative `form.data`.
      ev.stopPropagation();
      const raw = ev.detail ? ev.detail.value : undefined;
      const syntheticEv = { stopPropagation() {}, detail: { value: raw } };
      // Apply once synchronously so any immediate focusout commit uses the latest config.
      this._onFormValueChanged(syntheticEv, schema, form);
      queueMicrotask(() => {
        this._onFormValueChanged(syntheticEv, schema, form);
      });
      const schedule = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 0);
      schedule(() => {
        this._onFormValueChanged(syntheticEv, schema, form);
      });
    });
    // Apply config immediately when any inner input loses focus
    form.addEventListener('focusout', (ev) => {
      // Ensure the event originated from inside this form
      if (!form.contains(ev.target)) return;
      const next = ev.relatedTarget;
      if (next && form.contains(next)) return;
      this._debouncedConfigChanged(this._config, true);
    });
    return form;
  }

  _createCustomForm(schema) {
    const container = document.createElement('div');
    container.className = 'custom-form';
    const data = this._configWithDefaults();

    schema.forEach(field => {
      if (field.name === 'day_night_mode') {
        container.appendChild(this._createDayNightModeField(field, data[field.name] || field.default));
      } else if (field.selector && field.selector.color_picker) {
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

    colorInput.addEventListener('input', (e) => {
      textInput.value = e.target.value;
      this._updateFieldValue(field.name, e.target.value);
    });

    // Commit only when leaving the whole color field (prevents focus loss when
    // switching between the swatch and the text input).
    wrapper.addEventListener('focusout', (ev) => {
      if (!wrapper.contains(ev.target)) return;
      const next = ev.relatedTarget;
      if (next && wrapper.contains(next)) return;
      this._debouncedConfigChanged(this._config, true);
    });

    inputWrapper.appendChild(colorInput);
    inputWrapper.appendChild(textInput);
    wrapper.appendChild(inputWrapper);

    return wrapper;
  }

  _createDayNightModeField(field, value) {
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

    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const current = (normalized === 'day' || normalized === 'night' || normalized === 'auto') ? normalized : 'day';

    const group = document.createElement('div');
    group.className = 'radio-group';
    const groupName = 'lumina_day_night_mode';

    const options = [
      { value: 'day', label: 'Day' },
      { value: 'night', label: 'Night' },
      { value: 'auto', label: 'Auto' }
    ];

    options.forEach((opt) => {
      const optionLabel = document.createElement('label');
      optionLabel.className = 'radio-option';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = opt.value;
      input.checked = opt.value === current;

      const text = document.createElement('span');
      text.textContent = opt.label;

      input.addEventListener('change', () => {
        if (!input.checked) return;
        const newValue = input.value;
        const nextConfig = { ...(this._config || {}), day_night_mode: newValue };
        this._config = nextConfig;
        this._debouncedConfigChanged(nextConfig, true);
      });

      optionLabel.appendChild(input);
      optionLabel.appendChild(text);
      group.appendChild(optionLabel);
    });

    wrapper.appendChild(group);
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
      const isEntitySelector = Boolean(field.selector && field.selector.entity);
      this._updateFieldValue(field.name, newValue, isEntitySelector);
    });
    // When an inner input loses focus, apply the config immediately
    form.addEventListener('focusout', (ev) => {
      if (!form.contains(ev.target)) return;
      const next = ev.relatedTarget;
      if (next && form.contains(next)) return;
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

  _updateFieldValue(fieldName, value, immediate = false) {
    if (!this._config) {
      this._config = {};
    }
    const newConfig = { ...this._config };
    if (value === '' || value === null || value === undefined) {
      delete newConfig[fieldName];
    } else {
      newConfig[fieldName] = value;
    }
    this._config = newConfig;
    this._debouncedConfigChanged(newConfig, Boolean(immediate));
  }

  _onFormValueChanged(ev, schema, formEl) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const rawValue = ev.detail ? ev.detail.value : undefined;
    const formData = (formEl && formEl.data && typeof formEl.data === 'object') ? formEl.data : undefined;
    // Some HA selectors emit partial `value-changed` payloads (e.g., only the field
    // that changed), and on clear (X) the event can fire before `ha-form` updates
    // `form.data`. Merge so payload overrides form data when present.
    const rawObj = (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) ? rawValue : undefined;
    const rawKeys = rawObj ? Object.keys(rawObj) : [];
    // Entity selector changes are not "typing" and can be safely dispatched immediately.
    // IMPORTANT: ha-form often emits the *entire* form data on any change, so we must
    // only force-immediate when one of the battery entity selector fields actually changed.
    const normalizeEntityId = (v) => {
      if (v === undefined || v === null) return '';
      return typeof v === 'string' ? v.trim() : String(v);
    };
    const entitySelectorKeys = Array.isArray(schema)
      ? schema
        .filter((f) => f && f.name && f.selector && f.selector.entity)
        .map((f) => f.name)
      : [];
    const forceImmediate = Boolean(rawObj) && entitySelectorKeys.some((k) => {
      if (!Object.prototype.hasOwnProperty.call(rawObj, k)) {
        return false;
      }
      const prev = this._config ? normalizeEntityId(this._config[k]) : '';
      const next = normalizeEntityId(rawObj[k]);
      return next !== prev;
    });
    const value = (formData && rawObj)
      ? { ...formData, ...rawObj }
      : (formData || rawValue);
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
    this._debouncedConfigChanged(newConfig, forceImmediate || nextDisplayUnit !== prevDisplayUnit);
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

    const fieldsToConvert = [
      'load_threshold_warning',
      'load_threshold_critical',
      'grid_threshold_warning',
      'grid_threshold_critical',
      'grid2_threshold_warning',
      'grid2_threshold_critical'
    ];
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
      .radio-group {
        display: flex;
        flex-direction: row;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }
      .radio-option {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        cursor: pointer;
        color: var(--primary-text-color);
        user-select: none;
      }
      .radio-option input[type="radio"] {
        accent-color: var(--primary-color);
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
