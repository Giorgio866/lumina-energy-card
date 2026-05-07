# Lumina Energy Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
![Version](https://img.shields.io/badge/version-3.5.5-blue.svg)

Repository: [https://github.com/Giorgio866/lumina-energy-card](https://github.com/Giorgio866/lumina-energy-card)

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0** (`LICENSE`).
Commercial use / resale requires a separate agreement (`COMMERCIAL-LICENSE.md`).

**[Install directly (HACS)][install]** · Support: [![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge&logo=paypal)](https://paypal.me/giorgiosalierno) · [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-Giorgio866-pink?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/Giorgio866)  
*Send as donation; other payment methods will be refunded.*

[install]: https://my.home-assistant.io/redirect/hacs_repository/?owner=Giorgio866&repository=lumina-energy-card&category=frontend

[![Open your Home Assistant instance and add this repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)][install]

![Lumina Energy Card](https://raw.githubusercontent.com/Giorgio866/lumina-energy-card/main/Images/screen.jpeg)

*Lumina Energy Card – main view with energy flows, PV, battery, grid, and house*

---

## English

### Overview

Lumina Energy Card is a Home Assistant custom Lovelace card that displays animated energy flows (PV, battery, grid, load, heat pump, EV), aggregates PV strings and batteries, and supports optional EV charging and heat pump metrics. It includes **House Management** (cameras, lights, temperature, humidity, security keypad), **interactive popups** with toggles, round buttons (Echo Alive, Text toggle, HOME), **PRO** features (motion-based text visibility, overlay images, custom flows), **Import & Export** for config backup, an optional **Tech** schematic dashboard, and **version 3.5.x** enhancements.

### What's new in 3.5.5

Tech Dashboard (image_style: tech)
The SVG schematic view offers a comprehensive visual representation of your energy system with the following features:

Solar Tracking: A day arc displaying the sun position synchronized with daytime hours.

PV Management: Includes PV1/PV2 power labels and a total PV bubble, with a straight flow from the sun directly to the inverter.

Battery Storage: Support for up to four battery packs, featuring SOC (State of Charge) fill levels and individual per-pack sensors.

Energy Flows:

PV: Green flow from sun to inverter.

Battery: Green when charging and red when discharging.

Grid: Red when importing and green when exporting (aligns with the Invert grid flow toggle).

Customization:

Select from up to six inverter brand images directly from the dashboard with a single touch.

Choose custom icons for Grid and Home within the editor.

Bottom Panels: Optional displays for temperatures, cell stats, or inverter daily kWh metrics.
<img width="1706" height="724" alt="Screenshot 2026-05-07 144750" src="https://github.com/user-attachments/assets/e62f4960-ccac-4c79-ac3a-64dd7757cfe8" />

### What's new in 3.4.0.3

Patch release focused on translations, clearer automotive labeling, multi-account PRO on shared dashboards, numeric formatting, flow visuals, and editor UX polish.

- **Spanish translation complete ([#310](https://github.com/Giorgio866/lumina-energy-card/issues/310)):** Filled gaps so Spanish (**ES**) covers the card UI and editor strings consistently — fewer mixed-language leftovers while browsing labels and dialogs.

- **First-car label corrected ([#315](https://github.com/Giorgio866/lumina-energy-card/issues/315)):** Fixed an incorrect label for the **first vehicle** slot so “Car 1” naming matches what you configure for EV slot **one**.

- **One dashboard, multiple Home Assistant users ([#316](https://github.com/Giorgio866/lumina-energy-card/issues/316)):** Shared dashboards can now honour **different PRO passwords per logged-in user**. In **Lumina PRO**, open the **password mapping** section (**Home Assistant user id → PRO password**): each row locks PRO features to that HA account while everyone sees the same card YAML. If only one user exists, keep using the single **`pro_password`** field as before.

- **Decimal places on the card ([#305](https://github.com/Giorgio866/lumina-energy-card/issues/305)):** Under **General settings**, pick **how many digits after the decimal** (**0 / 1 / 2**) for power (kW), energy (kWh), and on-card temperatures — a compact dashboard stays tidy without sacrificing precision where you need it.

- **Scale energy-flow strokes:** In **Animation styles**, adjust **Flow stroke width** (and **`fluid_flow` stroke width** when that style is active) to make animated flows finer or bolder without hacks — ideal when backgrounds are busy or you watch from afar.

### What's new in 3.4.0

- **New language:** Full **Spanish** translation for card labels and editor UI.
- **New "People" section:** Added a dedicated **People** area in the editor/dashboard to configure person entities and quickly see who is **home** or **away** directly on the card.
- **New Solar Forecast popup:** Added a redesigned **solar forecast popup** with improved layout controls for weekly forecast visibility and positioning.
- **More customization slots:** **Custom Flows** and **Custom Text** are now expanded to **20 slots each**.
- **Bug fix – Custom Flow auto direction:** Fixed a regression where flow direction was not always inverting correctly in `auto` mode when sensor sign changed.
- **Visual editor performance:** Optimizations in preview syncing and editor updates with up to **~60% faster** interactions in heavy configs.
- **New Video Guides section:** Added a dedicated in-editor **Video Guides** section (now placed right below **Lumina PRO**) for faster onboarding.
- **10 new text style presets:** Added **10 additional font/style options** to fine-tune dashboard text appearance.
- **New Mini Cam feature (PRO):**
  - Add mini camera widgets directly on the dashboard with drag-and-drop positioning in **Preview Lumina (drag)**.
  - Each mini cam has independent icon position/size and top bar geometry.
  - Motion-aware behaviors are supported via dedicated motion sensor + motion popup options.
  - You can configure each slot separately (entity, title, dimensions, offsets, motion popup visibility and size).
  - In preview, select exactly what to move (`icon`, `bar`, or `motion popup`) and edit precise coordinates from numeric fields.
- **New Custom Popup layouts (PRO):**
  - **Classic (text lines):** traditional multi-line popup (up to six sensor rows).
  - **Tactical vehicle:** EV/car-oriented layout with map, speed/range/charge metrics, lock controls, and optional vehicle telemetry sensors.
  - **Life sign (person):** person/presence layout with battery ring, connection/activity modules, and optional health sensors (heart rate, HR status, body temperature).
  - You can choose the layout per popup slot, then configure layout-specific entities in dedicated grouped subsections.

### What's new in 3.3.5

- **Bug fixes:** Fixed [#275](https://github.com/Giorgio866/lumina-energy-card/issues/275), [#273](https://github.com/Giorgio866/lumina-energy-card/issues/273), [#272](https://github.com/Giorgio866/lumina-energy-card/issues/272).
- **Text colors:** You can now change the color **individually** for each auto-related text (PV, battery, grid, etc.), and change the color of the **house absorption** text from the editor.
- **4 independent batteries with SVG logo and fill:** You can now use **up to 4 batteries**, each with its own **SVG logo** and **fill level** (SOC-based), all independent. Configure each battery’s sensors, position, and style in the editor.
- **Day/Night background:** You can set a **night background image** that switches **automatically** from day to night. The card uses the sun entity (e.g. `sun.sun`) to detect sunrise/sunset; you can also force “night view” with a toggle.  
  **Where to upload the night image:** Place your image file (**`night.jpg`** or **`night.png`**) in your Home Assistant www folder for the card, for example:
  - **`/config/www/community/lumina-energy-card/`** (if you use `config`), or  
  - **`/homeassistant/www/community/lumina-energy-card/`** (e.g. in some installs).  
  Then use the URL **`/local/community/lumina-energy-card/night.jpg`** (or **`night.png`**) in the editor under **Day/Night Background**. After uploading, **reload the frontend** (or the integration) and refresh the page so the image is served correctly.

### What's new in 3.3.3

- **Gallery:** Share your dashboard templates to the community and browse templates shared by others. From the editor, use **"Share to gallery"** to submit a template (name, description, author, email, rules). One share per user per month. **"Top"** shows the most popular templates; a 30-day timer resets and notifies the winner.
- **Bug fix – Text button:** The text toggle button no longer disappears when the HOME button is off.
- **Clock color:** You can now change the color of the digital clock from the editor.
- **Bug fix – Inverter ↔ House flow:** Corrected the energy flow display between inverter and house.
- **Bug fix – Solar forecast SVG:** The solar forecast icon (sun/rain) is now always visible when solar forecast is enabled, even when "Hide texts" is on.
- **PV Box and Grid Box:** You can now disable PV Box and Grid Box directly from their respective sections in the editor.

### What's new in 3.1.2

- **🛡️ Never Lose Your Config Again:** Import & Export buttons let you save your setup locally and restore it instantly. Your data is finally safe.
- **Expanded string support:** Up to 9 strings for complex setups.
- **Smart flow visibility:** Flow line automatically disappears when wattage drops below threshold, keeping the dashboard clean.
- **Drag & Drop interface:** PV Box and Grid Box sections are now fully drag-and-drop — move and arrange them exactly where you like.
- **Customizable Array 2:** You can now modify the text within Array 2.
- **Bug fixes:** Fixed #212, #208.

### What's new in 3.0

- **Security keypad (PIN):** In House Management → Security you can assign a **keypad** entity. The keypad shows a PIN pad with **colors that change by state** (e.g. armed, disarmed, pending).
- **Camera fullscreen on motion:** When motion is detected (e.g. via your motion sensor), the **camera popup can expand to fullscreen** so you see the feed on the whole screen.
- **Custom thresholds:** In **Colori Flussi** (Flow colors) you can set **flow visibility threshold**, **PV animation threshold** (disable PV animation below a power value in W), and **grid animation threshold**.
- **Counter animation: house or inverter:** You can choose whether the **animated counter** shows **house consumption** or **inverter** (e.g. total PV) — configurable in the editor.
- **10 custom flow slots:** PRO section now supports **10 custom energy flows** (was 5), each with sensor, path, color, direction, and threshold.
- **Overlay and flows in PRO and Preview:** **Overlay images** and **custom flows** can be edited both in the **PRO** section and in the **Preview Lumina (drag)** — drag to position overlays and flows in the preview.
- **Custom background:** You can use **your own background** by **uploading an image** (URL or local path), or **generate one with IA** using tokens (PRO). No need to use only the built-in backgrounds.
- **Editable array text:** The **text shown next to each PV/array** can be **customized** (e.g. “Stringa 1”, “Array 2”) from the editor.
- **Box Grid and Box PV – choose what to show:** **Grid box** and **PV box** now let you **choose what to display** (e.g. power, daily, or custom sensors) so you can show exactly what you need.
- **Home temperature sensor:** A **house temperature sensor** can be displayed on the card (e.g. living room temperature).
- **Digital clock:** An **optional digital clock** shows the current time on the card (style and position configurable).
- **All texts drag-and-drop:** **Every text label** on the card (PV, battery, grid, load, etc.) is **draggable** in the editor preview so you can place them exactly where you want.
- **Russian and Portuguese:** The card and editor are fully translated into **Russian** and **Portuguese** (in addition to EN, IT, DE, FR, NL).
- **Fix #188 (GitHub):** Resolved the issue reported in [GitHub #188](https://github.com/Giorgio866/lumina-energy-card/issues/188).

### Performance note (important for Raspberry Pi / low-power kiosks)

- **Where performance is measured**: the card runs in the **browser** (frontend). If you use a Raspberry Pi as a kiosk (Chromium), performance/INP depends on the Pi’s browser.
- **`performance_mode: low`**: some heavy animation styles are **automatically simplified** to keep the UI responsive (better INP).  
  In particular, **`shimmer` / `arrows` / `fluid_flow`** will fall back to **`dots`** in low mode.
- **`performance_mode: auto`**: default is “balanced”, but on low-power clients it can **auto-downgrade to low** for responsiveness.
- **Want all styles anyway?** Set **`performance_mode: high`** (more CPU/GPU usage).

### Installation

**One-click install (HACS):**  
[![Open your Home Assistant instance and add this repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)][install]  
Click the badge → your Home Assistant opens → the repo is added to HACS. Then go to **HACS → Frontend**, search **Lumina Energy Card**, and install. Finally: **Dashboard → Edit → Add card → Lumina Energy Card**.

**HACS (manual):**
1. HACS → Frontend → Custom repositories → Add `https://github.com/Giorgio866/lumina-energy-card` (category: Dashboard).
2. Search **Lumina Energy Card**, install it.
3. Dashboard → Edit → Add card → **Lumina Energy Card**.

**Manual (no HACS):** Place `lumina-energy-card.js` and `lumina_background.png` in `/config/www/community/lumina-energy-card/`, add the Lovelace resource, restart Home Assistant.

### Minimal configuration

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.solar_production
sensor_daily: sensor.daily_production
sensor_bat1_soc: sensor.battery_soc
sensor_bat1_power: sensor.battery_power
sensor_home_load: sensor.home_consumption
sensor_grid_power: sensor.grid_power
background_image: /local/community/lumina-energy-card/lumina_background.png
```

Use the card’s visual editor (Edit → Lumina) to configure entities, colors, and options.

---

### Latest features – how to use them

#### 1. House Management (cameras, lights, temperature, humidity)

- **HOME button:** A round **HOME** button appears on the card (together with Echo Alive and Text toggle, if enabled). Click it to open a **collapsible panel** on the right with **5 icons**: Camera, Lights, Temperature, Security, Humidity.
- **Assign entities:** In the editor, open the **“House Management”** section. Configure up to **6 entities per icon**:
  - **`house_camera_1` … `house_camera_6`:** Camera entities. Click the **Camera** icon → popup with a grid of your cameras.
  - **`house_lights_1` … `house_lights_6`:** Lights or switches. Click **Lights** → list with **ON / OFF** buttons.
  - **`house_temperature_1` … `house_temperature_6`:** Temperature sensors. Click **Temperature** → list with names and values (°C).
  - **`house_humidity_1` … `house_humidity_6`:** Humidity sensors. Click **Humidity** → list with names and values (%).
  - **`house_security_1` … `house_security_6`:** Security keypad (PIN). Click **Security** → keypad with PIN; **colors change by state** (armed, disarmed, pending, etc.).

**Cameras popup:**
- Each camera has a **▶ Start** and **■ Stop** button. Streams **do not** start automatically; click **▶ Start** to begin.
- If the camera supports it, the card uses **live streaming** (`ha-camera-stream`). Otherwise it shows **refreshed snapshots**.
- Close the popup with the **×** button or by clicking the dark overlay. Always click **■ Stop** before closing to free resources, or the card will stop streams automatically when you close.

**Lights popup:**
- Each light/switch shows its state (On/Off) and **ON** / **OFF** buttons. The card calls `light.turn_on` / `light.turn_off` or `switch.turn_on` / `switch.turn_off` automatically.

---

#### 2. Interactive popups (PV, Battery, Grid, House, Inverter)

- **Clickable areas:** Click on **PV** (daily badge / solar panels), **Battery**, **Grid**, **House**, or **Inverter** to open the corresponding popup.
- **Up to 6 lines per popup:** In the editor, use `sensor_popup_pv_1` … `sensor_popup_pv_6` (and similar for `house`, `bat`, `grid`, `inverter`). You can set custom names (`sensor_popup_pv_1_name`, etc.) and colors.
- **Toggles in popups:** If you assign **active entities** (e.g. lights, switches), the popup shows **toggles** to turn them on/off directly from the popup, without opening another card.
- **Closing:** Click the **popup background** (the semi‑transparent rect), not the content, to close. This keeps the popup easy to use without accidental closes.

---

#### 3. Echo Alive (Echo Show / Alexa)

- **Purpose:** Keeps the dashboard alive on **Echo Show** devices. The Silk browser tends to suspend or close the page; Echo Alive prevents that.
- **How to use:** Enable **`enable_echo_alive`** in the editor (Pulsanti e visibilità testi / Buttons and text visibility). A **round button** appears first on the left. On Echo Show, keep the dashboard open on a view that uses Lumina with Echo Alive enabled; the card will ping the page to avoid suspension.

---

#### 4. Text toggle and “Clean mode”

- **Text toggle:** Enable **`enable_text_toggle_button`** to show a round **Text** button. Click it to **show or hide** all text labels (PV, battery, grid, etc.) and enjoy a **clean**, graphic‑only view.
- **Initial state:** You can hide texts by default and reveal them only when needed via the toggle.

---

#### 5. Battery: flow vs charge/discharge mode

- **`battery_power_mode`** in the editor:
  - **`flow`** (default): One sensor **with sign** (`sensor_battery_flow`). **Positive** = charging (flow toward battery), **negative** = discharging (flow toward inverter).
  - **`charge_discharge`**: Two separate sensors, `sensor_battery_charge` and `sensor_battery_discharge`. Charge → flow toward battery, discharge → flow toward inverter.

---

#### 5b. Battery SOC “grid” (6‑segment bar) + toggle

- **What it is:** a 6‑segment SOC bar shown on the battery overlay (looks like a “grid” on the battery).
- **Toggle:** enable/disable from the editor with **`battery_overlay_enabled`** (it also enables the battery overlay image).
- **Position/size:** `battery_overlay_x`, `battery_overlay_y`, `battery_overlay_width`, `battery_overlay_height`, `battery_overlay_opacity`.

---

#### 6. Animation style (shimmer, dashes, dots, arrows)

- **`animation_style`** (in **Colori flussi** / Flow colors, or **Stili animazioni**):  
  **`shimmer`** (default), **`dashes`**, **`dots`**, **`arrows`**.
- **`animation_speed_factor`:** Adjust speed (e.g. `1` = normal, `2` = faster). Use `0` to pause animations.

---

#### 6b. Performance mode (General Settings)

- In **General Settings** you can choose the performance profile with **`performance_mode`**:
  - `auto` (default): balanced
  - `low`: lower CPU usage (lighter animations)
  - `high`: smoothest animations (more CPU)

---

#### 7. Solar forecast (PRO)

- **Purpose:** Show **estimated solar production** with a **cyan holographic sun** and a status label (lots/moderate/little sun).
- **How to enable:** In the editor, open the **PRO** section and set:
  - `solar_forecast_enabled: true`
  - `sensor_solar_forecast: sensor.xxx` (your forecast sensor)
  - `solar_forecast_max_power` (e.g., 10000 W)
- **Position & style:** Adjust `solar_forecast_x`, `solar_forecast_y`, `solar_forecast_color` (default **#00FFFF**), and `solar_forecast_size`.
- **Tip:** If the sun doesn’t appear, the forecast icon (sun/rain) is always visible when solar forecast is enabled. If values don't appear, check that the sensor has a numeric value.

---

#### 8. Gallery (share and browse templates)

- **What it is:** The **Gallery** lets you **share** your Lumina dashboard configuration as a template and **browse** templates shared by other users. You can apply a template to get a ready-made layout and then customize it.
- **How to share:** In the card **editor**, open the **Gallery** section and click **"Share to gallery"**. Fill in: **template name**, **description**, **author name**, **email** (for contact), and accept the **rules**. Your current dashboard configuration is sent to the gallery. **Limit:** one share per user per month.
- **How to use a template:** In the Gallery, browse the list or use **"Top"** to see the most popular templates. Click a template to view details and **Apply** to load it into your card (you can then edit it as usual).
- **Top & winner:** The **"Top"** shows templates ranked by popularity. A **30-day timer** runs; when it ends, the top template's author is notified as the winner for that period, then the timer resets.

---

#### 9. PRO section (optional extras)

PRO features require a **PRO password** (`pro_password`), unlocked via the editor’s PRO section (PayPal support).

- **Text visibility motion sensor (`text_visibility_sensor`):**  
  Set a **motion** entity (e.g. `binary_sensor.corridoio_motion`). When motion is detected, **texts appear** and stay visible for **60 seconds** after the last motion. Ideal for **wall tablets with a camera**: texts show only when someone is in front of the device.  
  If you use the **Text toggle** to show texts, visibility is controlled only by the button (no motion timeout).

- **Overlay images:**  
  Add up to **10 transparent PNGs** over the main background (e.g. second car, pool, wind turbine). Configure **`overlay_image`** … **`overlay_image_10`**, position, size, and opacity in the PRO section. Overlay and custom flows can also be edited in **Preview Lumina (drag)**.

---

#### Visual editor: Drag & Drop (overlay images + background)

- Enable the Lumina visual preview: turn on **“Preview Lumina (drag)”** in the editor.
- **Overlay images (PRO):** drag inside the preview to update X/Y (`overlay_image_x`, `overlay_image_y`, and images 2–5).
- **Background:** drag inside the preview to update `background_image_x` / `background_image_y`.

- **Custom flows:**  
  Up to **20 custom energy flows** with their own sensor, path, color, and direction. Use **`custom_flow_1_enabled`** … **`custom_flow_20_enabled`**, **`custom_flow_1_sensor`** … **`custom_flow_20_sensor`**, path (or preset), color, threshold. Editable in PRO and in **Preview Lumina (drag)**.

- **Custom text:**  
  Up to **20 custom text labels** with optional sensor values, position, color, and font size.

- **Solar forecast:**  
  Enable **`solar_forecast_enabled`**, set **`sensor_solar_forecast`**, and tune **`solar_forecast_max_power`**, position, and color (**default #00FFFF**).

---

### Quick reference

| Feature | Where to configure | What it does |
|--------|-------------------|--------------|
| House Management | Editor → **House Management** | Cameras, lights, temperature, humidity, security keypad (PIN) via HOME panel |
| Security keypad (PIN) | **House Management** → Security | Keypad with PIN; colors by state (armed/disarmed/pending) |
| Camera fullscreen on motion | **PRO** / motion sensor | Camera popup expands to fullscreen when motion detected |
| Custom thresholds | **Colori Flussi** (Flow colors) | PV / flow / grid animation thresholds (W) |
| Counter: house or inverter | Editor | Animated counter shows house consumption or inverter (PV) |
| 20 custom flows | **PRO** section | Up to 20 custom energy flows; editable in PRO and Preview |
| 20 custom text slots | **PRO** section | Up to 20 custom text labels with optional sensor value and independent styling |
| Mini Cam (PRO) | **PRO** section + **Preview Lumina (drag)** | Dashboard mini camera widgets with draggable icon/bar/motion popup geometry |
| Custom popup layouts (PRO) | **PRO** → Custom popups | Choose Classic, Tactical vehicle, or Life sign layout per popup slot |
| Overlay (10 images) | **PRO** + **Preview Lumina (drag)** | Up to 10 overlay images; drag to position in preview |
| Custom background | Editor / **PRO** | Upload your image or generate with IA (tokens) |
| Day/Night background | Editor → **Day/Night** | Night image URL; auto switch by sun; upload to `www/community/lumina-energy-card/` |
| 4 batteries (SVG + fill) | Editor → **Batteries** | Up to 4 independent batteries with SVG logo and SOC fill |
| Text colors (auto, house) | Editor | Individual colors for PV/battery/grid texts; house absorption text color |
| Array text | Editor | Customize text next to each PV/array |
| Box Grid / Box PV content | **Grid Box** / **PV Box** | Choose what to show (power, daily, custom sensors) |
| Home temperature | Editor | Display house temperature sensor on card |
| Digital clock | Editor | Optional digital clock on card |
| All texts drag-and-drop | **Preview Lumina (drag)** | Every text label draggable in editor preview |
| Interactive popups | **Popup** options (`sensor_popup_*`) | PV, Battery, Grid, House, Inverter popups with toggles |
| Echo Alive | **`enable_echo_alive`** | Keeps dashboard alive on Echo Show |
| Text toggle | **`enable_text_toggle_button`** | Show/hide all texts (clean mode) |
| Performance mode | **General Settings** → **`performance_mode`** | Choose `auto` / `low` / `high` performance profile |
| Battery mode | **`battery_power_mode`** | `flow` or `charge_discharge` |
| Battery SOC grid | **`battery_overlay_enabled`** | Toggle battery overlay + 6‑segment SOC grid |
| Animation style | **`animation_style`** | `shimmer`, `dashes`, `dots`, `arrows` |
| Gallery | Editor → **Gallery** | Share your template to the gallery; browse and apply templates from others; Top & 30-day winner |
| Solar forecast | **PRO** section | Estimated solar production + holographic sun (icon always visible) |
| PRO (motion, overlay, etc.) | **PRO** section + **`pro_password`** | Motion-based text, overlay images, custom flows/text |
| Tech schematic | Editor → **Image style** = `tech` | Alternate SVG energy-flow diagram with arc, multi-battery layout, coloured flows |
| Languages | **Language** (editor) | EN, IT, DE, FR, NL, **RU**, **PT**, **ES** |

---

### Privacy Policy

The full privacy notice (**Italian, English, German, French, Spanish**) for Lumina Card — including payment/licensing purposes — is maintained in **[docs/index.md](docs/index.md)**.  
For **PRO** verification in the card: the backend may process your **Home Assistant user ID** (`hass.user.id`) for validation; rolling retention policies are described in repository tooling/docs where applicable — see the linked policy for the authoritative wording.

---

### Troubleshooting

- **Card not showing:** Ensure the Lovelace resource is added and clear the browser cache.
- **Values at zero:** Check entity IDs and that entities exist and are available.
- **Cameras 403 / not loading:** Cameras must expose `access_token` (most HA camera integrations do). Use **■ Stop** before closing the camera popup.
- **Editor slow:** Increase **`update_interval`** or reduce dashboard refresh frequency.
- **Images not downloaded with HACS:** HACS installs only the JavaScript file (`.js`). To use the default backgrounds, download the images from the [**dist** folder](https://github.com/Giorgio866/lumina-energy-card/tree/main/dist) (e.g. `lumina_background.png`, `lumina_background1.png`), place them in `/config/www/community/lumina-energy-card/`, then reload the dashboard. Links: [lumina_background.png](https://github.com/Giorgio866/lumina-energy-card/raw/main/dist/lumina_background.png), [lumina_background1.png](https://github.com/Giorgio866/lumina-energy-card/raw/main/dist/lumina_background1.png).

---

## Italiano

### Panoramica

Lumina Energy Card è una scheda Lovelace personalizzata per Home Assistant che mostra flussi energetici animati (PV, batteria, rete, carico, pompa di calore, EV), aggrega stringhe FV e batterie e supporta metriche opzionali per EV e pompa di calore. Include **Gestione casa** (telecamere, luci, temperatura, umidità, keypad sicurezza), **popup interattivi** con toggle, pulsanti rotondi (Echo Alive, Toggle testi, HOME), funzioni **PRO** (visibilità testi con sensore movimento, overlay, flussi personalizzati), **Import & Export** per il backup della configurazione, la **dashboard Tech** (schema SVG opzionale) e le novità della serie **3.5.x** (release **3.5.5**).

### Novità in 3.5.5

- **Dashboard Tech (`image_style: tech`):** Vista alternativa a **schema SVG** — arco giorno/notte con **posizione del sole**, etichette **PV1/PV2**, **bolla PV totale**, **flusso FV** dal sole all’**inverter**, fino a **quattro batterie** con riempimento SOC e sensori dedicati, flussi **rete** e **casa**, e **pannelli inferiori** opzionali (temperature, celle, riepilogo inverter giornaliero). Colori flussi: **FV** verde (sole → inverter), **batteria** verde in carica e rossa in scarica, **rete** rossa in import e verde in export (coerente con **Inverti flusso rete** se attivo). Editor: icone rete/casa e immagine marca inverter opzionale.

### Novità in 3.4.0.3

Aggiornamento mirato a traduzioni, etichette EV, più account sulla stessa dashboard, formato numerico e resa grafica dei flussi — più chiaro anche nell’editor.

- **Traduzione spagnola completata ([#310](https://github.com/Giorgio866/lumina-energy-card/issues/310)):** Colmate le stringhe mancanti: lo **spagnolo** copre in modo uniforme scheda e editor, con meno “mezze lingue” aprendo le impostazioni.

- **Nome prima auto corretto ([#315](https://github.com/Giorgio866/lumina-energy-card/issues/315)):** Risolta un’etichetta errata per la **prima vettura** così il nome mostrato per lo slot auto **uno** coincide con quanto configurato.

- **Stessa dashboard, più utenti Home Assistant ([#316](https://github.com/Giorgio866/lumina-energy-card/issues/316)):** Una configurazione YAML condivisa può riservare **password PRO diverse** a utenti diversi. In **Lumina PRO** usa il campo dedicato alla **mappa id utente HA → password PRO**: chi è loggato usa prima la propria riga; resta valido anche un solo campo **`pro_password`** quando serve una password per tutti.

- **Decimali sulla scheda ([#305](https://github.com/Giorgio866/lumina-energy-card/issues/305)):** Da **Impostazioni generali** scegli **quante cifre dopo la virgola** (**0 / 1 / 2**) per potenza (kW), energia (kWh) e temperature sulla card — dashboard leggibile senza rinunciare al dettaglio dove serve.

- **Scala spessore flussi animati:** Nella sezione **Stili animazioni** regola **spessore tratto flussi** (e lo **spessore fluid_flow** quando attivi quello stile) per rendere i flussi più sottili o più evidenti sul tuo sfondo.

### Novità in 3.3.5

- **Correzioni bug:** Risolti [#275](https://github.com/Giorgio866/lumina-energy-card/issues/275), [#273](https://github.com/Giorgio866/lumina-energy-card/issues/273), [#272](https://github.com/Giorgio866/lumina-energy-card/issues/272).
- **Nuova sezione "Persone":** Aggiunta una sezione dedicata **Persone** in editor/dashboard per configurare le entità persona e vedere subito chi è **in casa** o **fuori casa** direttamente sulla card.
- **Nuovo popup previsioni solari:** Aggiunto un nuovo **popup previsioni solari** con layout migliorato e più controllo su visibilità/posizionamento della previsione settimanale.
- **Colori testi:** Puoi ora cambiare il colore **singolarmente** per ogni testo (PV, batteria, rete, ecc.) e il colore del testo **assorbimento casa** dall’editor.
- **4 batterie indipendenti con logo SVG e riempimento:** Puoi usare **fino a 4 batterie**, ciascuna con **logo SVG** e **livello di riempimento** (basato sul SOC), tutte indipendenti. Configura sensori, posizione e stile per ogni batteria dall’editor.
- **Sfondo giorno/notte:** Puoi impostare un’**immagine di sfondo notturna** che viene **alternata automaticamente** tra giorno e notte. La card usa l’entità sole (es. `sun.sun`) per rilevare alba/tramonto; puoi anche forzare la “vista notte” con un toggle.  
  **Dove caricare l’immagine notturna:** Metti il file (**`night.jpg`** o **`night.png`**) nella cartella www di Home Assistant della card, ad esempio:
  - **`/config/www/community/lumina-energy-card/`** (se usi `config`), oppure  
  - **`/homeassistant/www/community/lumina-energy-card/`** (in alcune installazioni).  
  Poi usa l’URL **`/local/community/lumina-energy-card/night.jpg`** (o **`night.png`**) nell’editor nella sezione **Sfondo giorno/notte**. Dopo il caricamento **ricarica il frontend** (o l’integrazione) e aggiorna la pagina perché l’immagine venga servita correttamente.

### Novità in 3.3.3

- **Galleria:** Condividi i template della tua dashboard con la community e sfoglia i template condivisi da altri. Dall’editor usa **"Condividi in galleria"** per inviare un template (nome, descrizione, autore, email, regole). Un invio per utente al mese. La **"Top"** mostra i template più popolari; un timer di 30 giorni si resetta e notifica il vincitore.
- **Correzione – Pulsante Testo:** Il pulsante toggle testi non scompare più quando il pulsante HOME è disattivato.
- **Colore orologio:** Ora puoi cambiare il colore dell’orologio digitale dall’editor.
- **Correzione – Flusso inverter ↔ casa:** Corretto il flusso energetico tra inverter e casa.
- **Correzione – SVG previsione solare:** L’icona della previsione solare (sole/pioggia) è ora sempre visibile quando la previsione è attiva, anche con "Nascondi testi" attivo.

- **PV Box e Grid Box:** Ora puoi disattivare PV Box e Grid Box direttamente dalle rispettive sezioni nell'editor.

### Novità in 3.1.2

- **🛡️ Mai più perdere la configurazione:** I pulsanti Import e Export ti permettono di salvare la configurazione in locale e ripristinarla all'istante. I tuoi dati sono al sicuro.
- **Supporto stringhe espanso:** Fino a 9 stringhe per configurazioni complesse.
- **Visibilità flussi intelligente:** La linea del flusso scompare automaticamente quando la potenza scende sotto la soglia, mantenendo la dashboard pulita.
- **Interfaccia Drag & Drop:** Le sezioni PV Box e Grid Box sono ora completamente trascinabili — posizionale dove preferisci.
- **Array 2 personalizzabile:** Puoi ora modificare il testo nell'Array 2.
- **Correzioni bug:** Risolti #212, #208.

### Novità in 3.0

- **Keypad sicurezza (PIN):** In Gestione casa → Sicurezza puoi assegnare un’entità **keypad**. Il keypad mostra una tastierina PIN con **colori che cambiano in base allo stato** (es. armato, disarmato, in attesa).
- **Telecamera a tutto schermo al movimento:** Al **rilevamento di movimento** (es. tramite sensore movimento), il popup della **telecamera può espandersi a tutto schermo** per vedere il flusso a schermo intero.
- **Soglie personalizzabili:** In **Colori Flussi** puoi impostare **soglia visibilità flussi**, **soglia animazione FV** (disattiva l’animazione fotovoltaico sotto una certa potenza in W) e **soglia animazione rete**.
- **Animazione contatore: casa o inverter:** Puoi scegliere se il **contatore animato** mostra il **consumo casa** o l’**inverter** (es. PV totale) — configurabile nell’editor.
- **10 slot per flussi custom:** La sezione PRO supporta ora **10 flussi energetici personalizzati** (prima 5), ciascuno con sensore, percorso, colore, direzione e soglia.
- **Overlay e flussi in PRO e Preview:** **Overlay** e **flussi personalizzati** sono modificabili sia nella sezione **PRO** sia nella **Preview Lumina (drag)** — trascina per posizionare overlay e flussi nella preview.
- **Sfondo personalizzato:** Puoi usare un **tuo sfondo** **caricando un’immagine** (URL o path locale) o **generandone uno con IA** tramite token (PRO). Non sei più limitato agli sfondi inclusi.
- **Testo array modificabile:** Il **testo accanto a ogni stringa/array FV** può essere **personalizzato** (es. “Stringa 1”, “Array 2”) dall’editor.
- **Box Grid e Box PV – scegli cosa mostrare:** **Box rete** e **Box PV** permettono ora di **scegliere cosa visualizzare** (es. potenza, giornaliero o sensori custom) in base alle tue esigenze.
- **Sensore temperatura casa:** Un **sensore temperatura casa** può essere mostrato sulla card (es. temperatura soggiorno).
- **Orologio digitale:** Un **orologio digitale** opzionale mostra l’ora corrente sulla card (stile e posizione configurabili).
- **Tutti i testi drag-and-drop:** **Ogni etichetta di testo** sulla card (PV, batteria, rete, carico, ecc.) è **trascinabile** nella preview dell’editor per posizionarla dove vuoi.
- **Russo e portoghese:** Card e editor sono tradotti in **russo** e **portoghese** (oltre a EN, IT, DE, FR, NL).
- **Fix #188 (GitHub):** Risolto il problema segnalato in [GitHub #188](https://github.com/Giorgio866/lumina-energy-card/issues/188).

### Nota prestazioni (importante per Raspberry Pi / kiosk)

- **Dove si misurano le prestazioni**: la card gira nel **browser** (frontend). Se usi un Raspberry Pi come kiosk (Chromium), CPU/RAM/INP dipendono dal browser sul Pi.
- **`performance_mode: low`**: alcuni stili “pesanti” vengono **semplificati automaticamente** per mantenere la UI reattiva (INP migliore).  
  In particolare, **`shimmer` / `arrows` / `fluid_flow`** vengono convertiti in **`dots`** in modalità low.
- **`performance_mode: auto`**: di default è “bilanciato”, ma su device poco potenti può **scendere automaticamente a low** per reattività.
- **Vuoi usare tutti gli stili comunque?** Imposta **`performance_mode: high`** (più CPU/GPU).

### Installazione

**Installa direttamente (HACS, un clic):**  
[![Apri Home Assistant e aggiungi questo repository a HACS](https://my.home-assistant.io/badges/hacs_repository.svg)][install]  
Clicca il badge → si apre la tua istanza Home Assistant → il repository viene aggiunto a HACS. Poi vai in **HACS → Frontend**, cerca **Lumina Energy Card** e installala. Infine: **Dashboard → Modifica → Aggiungi scheda → Lumina Energy Card**.

**HACS (manuale):**
1. HACS → Frontend → Custom repositories → Aggiungi `https://github.com/Giorgio866/lumina-energy-card` (categoria: Dashboard).
2. Cerca **Lumina Energy Card**, installala.
3. Dashboard → Modifica → Aggiungi scheda → **Lumina Energy Card**.

**Manuale (senza HACS):** Copia `lumina-energy-card.js` e `lumina_background.png` in `/config/www/community/lumina-energy-card/`, aggiungi la risorsa Lovelace e riavvia Home Assistant.

### Configurazione minima

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.solar_production
sensor_daily: sensor.daily_production
sensor_bat1_soc: sensor.battery_soc
sensor_bat1_power: sensor.battery_power
sensor_home_load: sensor.home_consumption
sensor_grid_power: sensor.grid_power
background_image: /local/community/lumina-energy-card/lumina_background.png
```

Usa l’**editor visivo** della scheda (Modifica → Lumina) per configurare entità, colori e opzioni.

---

### Ultime novità – come usarle

#### 1. Gestione casa (telecamere, luci, temperatura, umidità)

- **Pulsante HOME:** Sulla card compare un pulsante rotondo **HOME** (insieme a Echo Alive e Toggle testi, se abilitati). Cliccandolo si apre un **pannello laterale** a destra con **5 icone**: Telecamera, Luci, Temperatura, Sicurezza, Umidità.
- **Assegnare le entità:** Nell’editor apri la sezione **“Gestione casa”**. Puoi configurare fino a **6 entità per icona**:
  - **`house_camera_1` … `house_camera_6`:** Entità telecamera. Clic sull’icona **Telecamera** → popup con griglia delle telecamere.
  - **`house_lights_1` … `house_lights_6`:** Luci o interruttori. Clic su **Luci** → elenco con pulsanti **ON** / **OFF**.
  - **`house_temperature_1` … `house_temperature_6`:** Sensori temperatura. Clic su **Temperatura** → elenco con nomi e valori (°C).
  - **`house_humidity_1` … `house_humidity_6`:** Sensori umidità. Clic su **Umidità** → elenco con nomi e valori (%).
  - **`house_security_1` … `house_security_6`:** Keypad sicurezza (PIN). Clic su **Sicurezza** → tastierina PIN; i **colori cambiano in base allo stato** (armato, disarmato, in attesa, ecc.).

**Popup telecamere:**
- Ogni telecamera ha **▶ Avvia** e **■ Stop**. Gli stream **non** partono da soli: clicca **▶ Avvia** per avviare.
- Se la telecamera lo supporta, la card usa lo **streaming live** (`ha-camera-stream`). Altrimenti mostra **istantanee** aggiornate periodicamente.
- Chiudi il popup con **×** o cliccando sull’overlay scuro. È bene cliccare **■ Stop** prima di chiudere; in alternativa la card interrompe gli stream automaticamente alla chiusura.

**Popup luci:**
- Ogni luce/interruttore mostra lo stato (On/Off) e i pulsanti **ON** / **OFF**. La card chiama `light.turn_on` / `light.turn_off` o `switch.turn_on` / `switch.turn_off` in automatico.

---

#### 2. Popup interattivi (PV, Batteria, Rete, Casa, Inverter)

- **Aree cliccabili:** Clicca su **PV** (badge giornaliero / pannelli), **Batteria**, **Rete**, **Casa** o **Inverter** per aprire il rispettivo popup.
- **Fino a 6 righe per popup:** Nell’editor usa `sensor_popup_pv_1` … `sensor_popup_pv_6` (e analoghi per `house`, `bat`, `grid`, `inverter`). Puoi impostare nomi personalizzati (`sensor_popup_pv_1_name`, ecc.) e colori.
- **Toggle nei popup:** Se assegni **entità attive** (es. luci, interruttori), nel popup compaiono **toggle** per accenderle/spegnerle direttamente, senza usare altre schede.
- **Chiusura:** Clicca sullo **sfondo del popup** (il rettangolo semi‑trasparente), non sul contenuto, per chiudere. Così si evita di chiudere per sbaglio mentre si usano i toggle.

---

#### 3. Echo Alive (Echo Show / Alexa)

- **Scopo:** Mantiene la dashboard attiva sugli **Echo Show**. Il browser Silk tende a sospendere o chiudere la pagina; Echo Alive lo contrasta.
- **Uso:** Abilita **`enable_echo_alive`** nell’editor (Pulsanti e visibilità testi). Compare un **pulsante rotondo** come primo a sinistra. Su Echo Show, tieni la dashboard aperta su una vista con Lumina e Echo Alive attivo; la card “sveglia” la pagina per evitare la sospensione.

---

#### 4. Toggle testi e “modalità pulita”

- **Toggle testi:** Abilita **`enable_text_toggle_button`** per mostrare il pulsante rotondo **Testo**. Cliccandolo **mostri o nascondi** tutte le etichette (PV, batteria, rete, ecc.) e usi la card in **modalità pulita**, solo grafica.
- **Stato iniziale:** Puoi nascondere i testi di default e mostrarli solo quando serve tramite il toggle.

---

#### 5. Batteria: modalità flow e carica/scarica

- **`battery_power_mode`** nell’editor:
  - **`flow`** (predefinito): Un solo sensore **con segno** (`sensor_battery_flow`). **Positivo** = carica (flusso verso batteria), **negativo** = scarica (flusso verso inverter).
  - **`charge_discharge`**: Due sensori separati, `sensor_battery_charge` e `sensor_battery_discharge`. Carica → flusso verso batteria, scarica → flusso verso inverter.

---

#### 5b. Griglia SOC batteria (barra a 6 segmenti) + toggle

- **Cos’è:** una barra SOC a 6 segmenti sulla batteria (sembra una “griglia” sulla batteria).
- **Toggle:** abilita/disabilita dall’editor con **`battery_overlay_enabled`** (attiva anche l’immagine overlay batteria).
- **Posizione/dimensione:** `battery_overlay_x`, `battery_overlay_y`, `battery_overlay_width`, `battery_overlay_height`, `battery_overlay_opacity`.

---

#### 6. Stile animazioni (shimmer, tratteggi, punti, frecce)

- **`animation_style`** (in **Colori flussi** o **Stili animazioni**):  
  **`shimmer`** (predefinito), **`dashes`**, **`dots`**, **`arrows`**.
- **`animation_speed_factor`:** Regola la velocità (es. `1` = normale, `2` = più veloce). Con `0` le animazioni sono in pausa.

---

#### 6b. Prestazioni (Impostazioni generali)

- Nella sezione **Impostazioni generali** puoi scegliere il profilo prestazioni con **`performance_mode`**:
  - `auto` (predefinito): bilanciato
  - `low`: riduce l’uso CPU (animazioni più leggere)
  - `high`: animazioni più fluide (più CPU)

---

#### 7. Previsione solare (PRO)

- **Scopo:** Mostra la **produzione solare stimata** con un **sole olografico ciano** e testo stato (tanto/moderato/poco sole).
- **Attivazione:** Nell’editor, apri la sezione **PRO** e imposta:
  - `solar_forecast_enabled: true`
  - `sensor_solar_forecast: sensor.xxx` (il tuo sensore)
  - `solar_forecast_max_power` (es. 10000 W)
- **Posizione & stile:** Regola `solar_forecast_x`, `solar_forecast_y`, `solar_forecast_color` (default **#00FFFF**) e `solar_forecast_size`.
- **Nota:** Se non compare, verifica che il sensore abbia un valore numerico e che il **Toggle testi** non stia nascondendo i testi.

---

#### 8. Sezione PRO (funzionalità extra)

Le funzioni PRO richiedono la **password PRO** (`pro_password`), sbloccabile dalla sezione PRO dell’editor (supporto PayPal).

- **Sensore movimento visibilità testi (`text_visibility_sensor`):**  
  Imposta un’entità **movimento** (es. `binary_sensor.corridoio_motion`). Al **movimento** i **testi compaiono** e restano visibili per **60 secondi** dopo l’ultimo movimento. Ideale per **tablet a muro con telecamera**: i testi si vedono solo quando qualcuno è davanti al dispositivo.  
  Se usi il **Toggle testi** per mostrare i testi, la visibilità dipende solo dal pulsante (nessun timeout da movimento).

- **Overlay immagini:**  
  Fino a **10 PNG trasparenti** sopra lo sfondo principale (es. seconda auto, piscina, pala eolica). Configura **`overlay_image`** … **`overlay_image_10`**, posizione, dimensione e opacità nella sezione PRO. Overlay e flussi custom si modificano anche nella **Preview Lumina (drag)**.

---

#### Editor visivo: Drag & Drop (overlay immagini + sfondo)

- Attiva la preview Lumina: abilita **“Preview Lumina (drag)”** nell’editor.
- **Overlay immagini (PRO):** trascina nella preview per aggiornare X/Y (`overlay_image_x`, `overlay_image_y` e immagini 2–5).
- **Sfondo:** trascina nella preview per aggiornare `background_image_x` / `background_image_y`.

- **Flussi personalizzati:**  
  Fino a **10 flussi energetici** custom con sensore, percorso, colore e direzione propri. Usa **`custom_flow_1_enabled`** … **`custom_flow_10_enabled`**, **`custom_flow_1_sensor`** … **`custom_flow_10_sensor`**, percorso (o preset), colore, soglia. Modificabili in PRO e nella **Preview Lumina (drag)**.

- **Testi personalizzati:**  
  Fino a **5 etichette** custom con eventuale valore da sensore, posizione, colore e dimensione font.

- **Previsione solare:**  
  Abilita **`solar_forecast_enabled`**, imposta **`sensor_solar_forecast`** e regola **`solar_forecast_max_power`**, posizione e colore (**default #00FFFF**).

---

### Riferimento rapido

| Funzione | Dove configurarla | Cosa fa |
|----------|-------------------|---------|
| Gestione casa | Editor → **Gestione casa** | Telecamere, luci, temperatura, umidità, keypad sicurezza (PIN) dal pannello HOME |
| Keypad sicurezza (PIN) | **Gestione casa** → Sicurezza | Tastierina PIN; colori in base allo stato (armato/disarmato/in attesa) |
| Telecamera fullscreen al movimento | **PRO** / sensore movimento | Popup telecamera si espande a tutto schermo al movimento |
| Soglie personalizzabili | **Colori Flussi** | Soglie animazione FV / flussi / rete (W) |
| Contatore: casa o inverter | Editor | Contatore animato mostra consumo casa o inverter (PV) |
| 10 flussi custom | Sezione **PRO** | Fino a 10 flussi energetici; modificabili in PRO e Preview |
| Overlay (10 immagini) | **PRO** + **Preview Lumina (drag)** | Fino a 10 overlay; trascina per posizionare nella preview |
| Sfondo personalizzato | Editor / **PRO** | Carica la tua immagine o genera con IA (token) |
| Sfondo giorno/notte | Editor → **Giorno/Notte** | URL immagine notte; switch automatico con sole; carica in `www/community/lumina-energy-card/` |
| 4 batterie (SVG + riempimento) | Editor → **Batterie** | Fino a 4 batterie indipendenti con logo SVG e riempimento SOC |
| Colori testi (auto, casa) | Editor | Colori singoli per testi PV/batteria/rete; colore testo assorbimento casa |
| Testo array | Editor | Personalizza il testo accanto a ogni stringa/array FV |
| Contenuto Box Grid / Box PV | **Grid Box** / **PV Box** | Scegli cosa mostrare (potenza, giornaliero, sensori custom) |
| Temperatura casa | Editor | Mostra sensore temperatura casa sulla card |
| Orologio digitale | Editor | Orologio digitale opzionale sulla card |
| Tutti i testi drag-and-drop | **Preview Lumina (drag)** | Ogni etichetta trascinabile nella preview dell’editor |
| Popup interattivi | Opzioni **Popup** (`sensor_popup_*`) | Popup PV, Batteria, Rete, Casa, Inverter con toggle |
| Echo Alive | **`enable_echo_alive`** | Mantiene la dashboard attiva su Echo Show |
| Toggle testi | **`enable_text_toggle_button`** | Mostra/nascondi tutti i testi (modalità pulita) |
| Prestazioni | **Impostazioni generali** → **`performance_mode`** | Scegli profilo `auto` / `low` / `high` |
| Modalità batteria | **`battery_power_mode`** | `flow` o `charge_discharge` |
| Griglia SOC batteria | **`battery_overlay_enabled`** | Toggle overlay batteria + griglia SOC a 6 segmenti |
| Stile animazioni | **`animation_style`** | `shimmer`, `dashes`, `dots`, `arrows` |
| Previsione solare | Sezione **PRO** | Produzione stimata + sole olografico |
| PRO (movimento, overlay, ecc.) | Sezione **PRO** + **`pro_password`** | Testi su movimento, overlay, flussi/testi custom |
| Dashboard Tech | Editor → **Tipo immagine / Image style** = `tech` | Schema SVG alternativo con arco solare, più batterie, flussi colorati |
| Lingue | **Lingua** (editor) | EN, IT, DE, FR, NL, **RU**, **PT** |

---

### Privacy Policy / Informativa privacy

L’informativa completa (**italiano, inglese, tedesco, francese, spagnolo**) è nel repository in **[docs/index.md](docs/index.md)**.  
Per la **verifica PRO** nella card: il backend può elaborare l’**ID utente Home Assistant** (`hass.user.id`) per la validazione; per il testo ufficiale e il dettaglio sul trattamento dati vedi il documento collegato.

---

### Risoluzione problemi

- **La scheda non compare:** Verifica che la risorsa Lovelace sia aggiunta e svuota la cache del browser.
- **Valori a zero:** Controlla gli entity ID e che le entità esistano e siano disponibili.
- **Telecamere 403 / non caricano:** Le telecamere devono esporre `access_token` (la maggior parte delle integrazioni HA lo fa). Usa **■ Stop** prima di chiudere il popup telecamere.
- **Editor lento:** Aumenta **`update_interval`** o riduci la frequenza di aggiornamento della dashboard.
- **Immagini non scaricate con HACS:** HACS installa solo il file JavaScript (`.js`). Per usare gli sfondi predefiniti, scarica le immagini dalla cartella [**dist**](https://github.com/Giorgio866/lumina-energy-card/tree/main/dist) (es. `lumina_background.png`, `lumina_background1.png`), mettile in `/config/www/community/lumina-energy-card/` e ricarica la dashboard. Link diretti: [lumina_background.png](https://github.com/Giorgio866/lumina-energy-card/raw/main/dist/lumina_background.png), [lumina_background1.png](https://github.com/Giorgio866/lumina-energy-card/raw/main/dist/lumina_background1.png).

---

### Licenza e supporto

- **Licenza:** MIT. Vedi [LICENSE](LICENSE).
- **Segnalazioni e richieste:** [GitHub](https://github.com/Giorgio866/lumina-energy-card).

© 2025 Giorgio866 e contributors.
