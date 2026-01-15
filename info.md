# Lumina Energy Card

Limuna Energy Card repository is <https://github.com/ratava/lumina-energy-card>.

Animated Home Assistant card that visualises PV, battery, grid, load, and EV energy flows in a single dashboard.

## Highlights

- Up to six PV strings and four batteries with automatic aggregation
- Optional EV charging block with power and SOC readouts
- Interactive house popup with up to six configurable sensors for detailed load monitoring
- Animated SVG flows with dynamic coloration, selectable dash/dot/arrow styles, speed scaling, and throttled refresh logic
- Load warning/critical colour overrides plus a configurable low SOC threshold for the battery liquid fill
- Multi-language UI strings (English, Italiano, Deutsch, Français, Nederlands)
- Customisable card title, typography, units (W or kW), background image, and update interval

## Installation

### HACS (recommended)

1. Open HACS → **Frontend** → three-dot menu → **Custom repositories**.
2. Add `https://github.com/ratava/lumina-energy-card` as a **Frontend** repository.
3. Install **Lumina Energy Card** from the Frontend list and restart Home Assistant if prompted.

### Manual

1. Download the assets from the [latest release](https://github.com/ratava/lumina-energy-card/releases).
2. Copy `dist/lumina-energy-card.js` and `dist/lumina_background.jpg` to `/config/www/community/lumina-energy-card/`.
3. Add the Lovelace resource pointing to `/local/community/lumina-energy-card/lumina-energy-card.js` and reload the frontend.

## Basic Configuration

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.solar_production
sensor_daily: sensor.daily_solar
sensor_bat1_soc: sensor.battery_soc
sensor_bat1_power: sensor.battery_power
sensor_home_load: sensor.home_consumption
sensor_grid_power: sensor.grid_power
background_image: /local/community/lumina-energy-card/lumina_background.jpg
```

### Useful Options

- `update_interval`: polling cadence in seconds (0–60, default 30; 0 enables live refresh)
- `display_unit`: choose `W` or `kW`
- `animation_speed_factor`: flow speed multiplier (-3 to 3, default 1; 0 pauses, negatives reverse)
- `animation_style`: choose the flow motif (`dashes`, `dots`, `arrows`)
- `sensor_pv_total`: optional aggregate PV production sensor for the total line
- PV string sensors (`sensor_pv1` .. `sensor_pv6`, `sensor_pv_array2_1` .. `sensor_pv_array2_6`) are used for aggregation when totals are not provided; per-string values can be shown via the PV popup configuration
- `sensor_grid_import` / `sensor_grid_export`: optional dedicated import/export sensors (positive values)
- `grid_activity_threshold`: minimum grid magnitude (W) before grid flow animates (default 100)
- `grid_threshold_warning` / `grid_threshold_critical`: change grid colours when magnitude reaches warning/critical levels
- `invert_grid`: flips grid import/export sign if needed
- `battery_fill_low_threshold`: SOC percentage that switches the liquid fill to the low colour
- `sensor_car_power` and `sensor_car_soc`: enable EV panel when provided
- `show_car_soc`: toggle the Electric Vehicle panel (power + SOC)
- `sensor_popup_house_1` through `sensor_popup_house_6`: optional sensors for the house popup (click house/load text to show)
- `sensor_popup_house_1_name` through `sensor_popup_house_6_name`: custom names for house popup sensors
