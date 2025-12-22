# Lumina Energy Card

Limuna Energy Card repository is <https://github.com/ratava/lumina-energy-card>.

Animated Home Assistant card that visualises PV, battery, grid, load, and EV energy flows in a single dashboard.

## Highlights

- Up to six PV strings and four batteries with automatic aggregation
- Optional EV charging block with power and SOC readouts
- Animated SVG flows with dynamic coloration, selectable dash/dot/arrow styles, speed scaling, and throttled refresh logic
- Multi-language UI strings (English, Italiano, Deutsch)
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

- `update_interval`: polling cadence in seconds (10–60, default 30)
- `display_unit`: choose `W` or `kW`
- `sensor_pv_total`: optional aggregate PV production sensor for the total line
- `show_pv_strings`: display both the total and each PV string value simultaneously
- `invert_grid`: flips grid import/export sign if needed
- `sensor_car_power` and `sensor_car_soc`: enable EV panel when provided
