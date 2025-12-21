# Lumina Energy Card

Limuna Energy Card repository is <https://github.com/ratava/lumina-energy-card>.

Home Assistant card that visualises PV, battery, grid, load, and EV energy flows with configurable colour thresholds in a single dashboard.

## Highlights

- Up to six PV strings and four batteries with automatic aggregation
- Optional EV charging block with power and SOC readouts
- Battery inputs accept either a single net sensor or separate charge/discharge sensors
- Colour-configurable flow lines with per-path thresholds and throttled refresh logic
- Distinct colours for battery and EV import/export directions
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
- `invert_grid`: flips grid import/export sign if needed
- `sensor_car_power` and `sensor_car_soc`: enable EV panel when provided
