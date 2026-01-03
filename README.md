# Lumina Energy Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
![Version](https://img.shields.io/badge/version-1.1.31-svg10-blue.svg)

Limuna Energy Card repository is <https://github.com/ratava/lumina-energy-card>.

![Lumina Energy Card Background](dist/lumina_background.png)

Support Giorgio [![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge&logo=paypal)](https://www.paypal.me/giorgiosalierno)
Support Brent @ratava[![Donate Brent Wesley @ratava](https://github.com/user-attachments/assets/b603f494-a142-4bb0-893f-aaafd5d19dfd)](https://ko-fi.com/brentwesley)

**Language / Lingua / Sprache / Langue:** [English](#english) | [Italiano](#italiano) | [Deutsch](#deutsch) | [Français](#fran%C3%A7ais) | [Nederlands](#nederlands)

## Quick Install (Custom HACS Repository)

1. Open HACS in Home Assistant and choose **Frontend**.
1. Click the three-dot menu and select **Custom repositories**.
1. Paste `https://github.com/ratava/lumina-energy-card`, set the category to **Dashboard**, and click **Add**.
1. Close the dialog, locate **Lumina Energy Card** in the Frontend list, and install it.
1. Restart Home Assistant if requested, then add the card from the Lovelace visual editor.

---

## English

### Overview (EN)

Lumina Energy Card is a Home Assistant custom Lovelace card that renders animated energy flows, aggregates PV strings and batteries, and surfaces optional EV charging metrics in a cinematic layout.

### Key Features (EN)

- Up to six PV sensors with smart per-string or totalised labels
- Up to four battery systems with SOC averaging and liquid-fill battery visualisation
- Animated grid, load, PV, battery and EV flows with dynamic colour based on thresholds and selectable dash/dot/arrow styles
- Configurable grid animation threshold (default 100 W) to suppress low-level import/export chatter
- Adjustable animation speed multiplier (-3x to 3x, default 1x, pause/reverse supported) and per-flow visibility thresholds
- Optional EV panel with power and SOC display, configurable colour, and typography. 2 Veichles now supported
- Daily production badge plus full typography controls for header, PV, battery, load, grid, and EV text
- Daily Import and Export Totals
- Load warning/critical colour overrides and a configurable low SOC threshold for the battery liquid fill
- Update interval slider (0–60 s, default 30 s) with optional real-time refresh when set to 0
- Popup Information Displays for House, Solar, Battery, Grid and Inverter. Each has 6 slots for entities with name overrides available. Font Size and Color selection
- Many new features coming with support for more items.

#### Feature Walkthrough (EN)

[Feature walkthrough](https://github.com/user-attachments/assets/a598c4a4-2b4c-4827-b1f8-bb561a2089ec)

### Installation (EN)

#### HACS (EN)

1. Open HACS in Home Assistant and choose **Frontend**.
1. Use the three-dot menu → **Custom repositories**.
1. Enter `https://github.com/ratava/lumina-energy-card`, pick **Dashboard**, and click **Add**.
1. Locate **Lumina Energy Card** under Frontend and click **Install**.
1. Restart Home Assistant if prompted.

#### Manual Installation (EN)

1. Download `dist/lumina-energy-card.js` from the [latest release](https://github.com/ratava/lumina-energy-card/releases).
1. Copy the file to `/config/www/community/lumina-energy-card/`.
1. Place `dist/lumina_background.png` in the same directory.
1. Add the Lovelace resource:

```yaml
lovelace:
  resources:
    - url: /local/community/lumina-energy-card/lumina-energy-card.js
      type: module
```

1. Restart Home Assistant to load the resource.

### Configuration (EN)

1. Edit your dashboard and click **Add Card**.
1. Search for **Lumina Energy Card**.
1. Fill in the fields using the entity pickers and switches.
1. Adjust the **Update Interval** slider to control refresh cadence.

Minimal YAML example:

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

### Options (EN)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `card_title` | string | — | Optional header text; blank keeps the title hidden. |
| `background_image` | string | `/local/community/lumina-energy-card/lumina_background.png` | Default 16:9 background asset. |
| `language` | string | `en` | Supported editor languages: `en`, `it`, `de`, `fr`, `nl`. |
| `display_unit` | string | `kW` | Display values in `W` or `kW`. |
| `update_interval` | number | `30` | Refresh cadence (0–60 s, step 5; 0 disables throttling). |
| `animation_speed_factor` | number | `1` | Flow animation multiplier (-3–3, 0 pauses, negatives reverse). |
| `animation_style` | string | `dashes` | Flow motif (`dashes`, `dots`, or `arrows`). |
| `header_font_size` | number | `16` | Typography for the header (12–32 px). |
| `daily_label_font_size` | number | `12` | Typography for the daily label (8–24 px). |
| `daily_value_font_size` | number | `20` | Typography for the daily total (12–32 px). |
| `pv_font_size` | number | `16` | Typography for PV text (12–28 px). |
| `battery_soc_font_size` | number | `20` | Typography for the SOC label (12–32 px). |
| `battery_power_font_size` | number | `14` | Typography for the battery wattage (10–28 px). |
| `load_font_size` | number | `15` | Typography for the load text (10–28 px). |
| `grid_font_size` | number | `15` | Typography for the grid text (10–28 px). |
| `heat_pump_font_size` | number | `16` | Typography for the heat pump readout (10–28 px). |
| `car_power_font_size` | number | `15` | Typography for Car 1 power (10–28 px). |
| `car2_power_font_size` | number | `15` | Typography for Car 2 power (10–28 px, falls back to Car 1 value). |
| `car_soc_font_size` | number | `12` | Typography for Car 1 SOC (8–24 px). |
| `car2_soc_font_size` | number | `12` | Typography for Car 2 SOC (8–24 px, falls back to Car 1 value). |
| `car_name_font_size` | number | `15` | Typography for Car 1 name label (px). |
| `car2_name_font_size` | number | `15` | Typography for Car 2 name label (px). |
| `sensor_pv_total` | entity | — | Optional aggregate PV production sensor. Provide either this sensor **or** at least one PV string. |
| `sensor_pv1` .. `sensor_pv6` | entity | — | PV string sensors for Array 1. When no total is given, at least one string is required and all configured strings are summed to produce PV TOTAL. |
| `show_pv_strings` | boolean | `false` | Display the PV total plus each configured PV string. |
| `sensor_daily` | entity | — | Daily production sensor (required). |
| `sensor_bat1_soc` | entity | — | Battery SOC sensor (required only when a battery is displayed). |
| `sensor_bat1_power` | entity | — | Battery power sensor (required only when a battery is displayed). |
| `sensor_home_load` | entity | — | Home load/consumption sensor (required). |
| `sensor_grid_power` | entity | — | Net grid sensor (required unless import/export pair supplied). |
| `sensor_grid_import` | entity | — | Optional import-only sensor (positive values). |
| `sensor_grid_export` | entity | — | Optional export-only sensor (positive values). |
| `sensor_grid_import_daily` | entity | — | Optional cumulative daily grid import sensor. |
| `sensor_grid_export_daily` | entity | — | Optional cumulative daily grid export sensor. |
| `show_daily_grid` | boolean | `false` | Shows the daily import/export totals above the live grid value. |
| `show_grid_flow_label` | boolean | `true` | Prepends “Importing/Exporting” before the grid value. |
| `sensor_heat_pump_consumption` | entity | — | Heat pump sensor; unlocks the orange flow and swaps the background. |
| `sensor_car_power` | entity | — | Optional Car 1 charging power sensor. |
| `sensor_car_soc` | entity | — | Optional Car 1 SOC sensor. |
| `sensor_car2_power` | entity | — | Optional Car 2 charging power sensor. |
| `sensor_car2_soc` | entity | — | Optional Car 2 SOC sensor. |
| `show_car_soc` | boolean | `false` | Toggle the Car 1 panel (power + SOC). |
| `show_car2` | boolean | `false` | Toggle the Car 2 panel when sensors exist. |
| `car_flow_color` | string | `#00FFFF` | EV flow animation colour. |
| `car1_color` | string | `#FFFFFF` | Car 1 power text colour. |
| `car2_color` | string | `#FFFFFF` | Car 2 power text colour. |
| `car_pct_color` | string | `#00FFFF` | Car 1 SOC text colour. |
| `car2_pct_color` | string | `#00FFFF` | Car 2 SOC text colour. |
| `car1_name_color` | string | `#FFFFFF` | Car 1 name label colour. |
| `car2_name_color` | string | `#FFFFFF` | Car 2 name label colour. |
| `pv_primary_color` | string | `#0080ff` | PV 1 flow animation colour. |
| `pv_secondary_color` | string | `#80ffff` | PV 2 flow animation colour. |
| `pv_tot_color` | string | `#00FFFF` | PV TOTAL text/line colour. |
| `load_flow_color` | string | `#0080ff` | Home load flow animation colour. |
| `load_text_color` | string | `#FFFFFF` | Home load text colour when thresholds are inactive. |
| `load_threshold_warning` | number | — | Load warning threshold (W or kW based on the display unit). |
| `load_warning_color` | string | `#ff8000` | Load warning colour. |
| `load_threshold_critical` | number | — | Load critical threshold (W or kW based on the display unit). |
| `load_critical_color` | string | `#ff0000` | Load critical colour. |
| `battery_soc_color` | string | `#FFFFFF` | Battery SOC percentage text colour. |
| `battery_charge_color` | string | `#00FFFF` | Battery charge flow colour. |
| `battery_discharge_color` | string | `#FFFFFF` | Battery discharge flow colour. |
| `grid_import_color` | string | `#FF3333` | Grid import flow colour. |
| `grid_export_color` | string | `#00ff00` | Grid export flow colour. |
| `heat_pump_flow_color` | string | `#FFA500` | Flow colour for the dedicated heat pump conduit. |
| `heat_pump_text_color` | string | `#FFA500` | Text colour for the heat pump wattage label. |
| `battery_fill_high_color` | string | `#00ffff` | Battery liquid fill colour above the low threshold. |
| `battery_fill_low_color` | string | `#ff0000` | Battery liquid fill colour at or below the low threshold. |
| `battery_fill_low_threshold` | number | `25` | SOC percentage that flips to the low fill colour. |
| `grid_activity_threshold` | number | `100` | Minimum absolute grid power (W) before flows animate. |
| `grid_threshold_warning` | number | — | Trigger warning colour when grid magnitude meets this value. |
| `grid_warning_color` | string | `#ff8000` | Grid warning colour. |
| `grid_threshold_critical` | number | — | Trigger critical colour when magnitude meets this value. |
| `grid_critical_color` | string | `#ff0000` | Grid critical colour. |
| `invert_grid` | boolean | `false` | Flip grid polarity if import/export are reversed. |
| `invert_battery` | boolean | `false` | Flip battery polarity and swap charge/discharge hues. |

### Grid Flow Routing (EN)

The card now selects the grid animation path automatically:

- When a PV total (`sensor_pv_total`) or at least one Array 1 string sensor exists, imports and exports animate along the inverter conduit just like before.
- If `sensor_pv_total` and all Array 1 string slots are left blank, the card assumes you're running directly from the grid: the animation shifts to the house branch, the grid arrow points at the home, and PV-only UI (Daily Yield badge + PV popup) stays hidden.

The legacy grid→house toggle has been removed, so delete any `grid_flow_mode` entries from your YAML. Detection now happens every render and `grid_activity_threshold` still governs when the animation starts.

### Popups (Editor Options)

The card provides five editable popup groups (PV, House, Battery, Grid, Inverter). Each popup exposes up to six entity slots, optional custom names, per-line colour pickers, and font-size controls.
The entities specfied in here will not have any conversions done to them other tha the name override if you specify one. This has been done delibertly so it is more flexible.
It is not only sensors that can be specifed in the popups. Text based entities can be displayed (e.g. alerts). If you have a sensor that needs its units converted. Please use
a helper to display it.

- PV Popup
  - `sensor_popup_pv_1` .. `sensor_popup_pv_6`: entity selectors for PV popup lines.
  - `sensor_popup_pv_1_name` .. `sensor_popup_pv_6_name`: optional custom names (falls back to entity name).
  - `sensor_popup_pv_1_color` .. `sensor_popup_pv_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_pv_1_font_size` .. `sensor_popup_pv_6_font_size`: per-line font-size (px) (default `14`).
  - Clickable areas are the Daily PV Yield box and the Solar Panels. Click to toggle the PV popup; clicking the popup closes it.

- House Popup
  - `sensor_popup_house_1` .. `sensor_popup_house_6`: entity selectors for House popup lines.
  - `sensor_popup_house_1_name` .. `sensor_popup_house_6_name`: optional custom names.
  - `sensor_popup_house_1_color` .. `sensor_popup_house_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_house_1_font_size` .. `sensor_popup_house_6_font_size`: per-line font-size (px) (default `14`).
  - House clickable area is the House; click to toggle the House popup and click the popup to close.

- Battery Popup
  - `sensor_popup_bat_1` .. `sensor_popup_bat_6`: entity selectors for Battery popup lines.
  - `sensor_popup_bat_1_name` .. `sensor_popup_bat_6_name`: optional custom names.
  - `sensor_popup_bat_1_color` .. `sensor_popup_bat_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_bat_1_font_size` .. `sensor_popup_bat_6_font_size`: per-line font-size (px) (default `16`).
  - Battery clickable areads is the battery image. Click to toggle the Battery popup; clicking the popup closes it.

- Grid Popup
  - `sensor_popup_grid_1` .. `sensor_popup_grid_6`: entity selectors for Grid popup lines.
  - `sensor_popup_grid_1_name` .. `sensor_popup_grid_6_name`: optional custom names.
  - `sensor_popup_grid_1_color` .. `sensor_popup_grid_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_grid_1_font_size` .. `sensor_popup_grid_6_font_size`: per-line font-size (px) (default `16`).
  - Grid clickable area is the Grid section; click to toggle the Grid popup and click the popup to close.

- Inverter Popup
  - `sensor_popup_inverter_1` .. `sensor_popup_inverter_6`: entity selectors for Inverter popup lines.
  - `sensor_popup_inverter_1_name` .. `sensor_popup_inverter_6_name`: optional custom names.
  - `sensor_popup_inverter_1_color` .. `sensor_popup_inverter_6_color`: per-line colour pickers (default `#80ffff`).
  - `sensor_popup_inverter_1_font_size` .. `sensor_popup_inverter_6_font_size`: per-line font-size (px) (default `16`).
  - Inverter clickable area is the Inverter section; click to toggle the Inverter popup and click the popup to close.

### Additional Array 2 & Options (EN)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `sensor_pv_total_secondary` | entity | — | Optional second inverter total (PV2). When provided it is added to PV TOT and drives the secondary PV flow. |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6` | entities | — | Up to six per-string sensors for Array 2. When `show_pv_strings` is enabled they render as separate PV lines. |
| `sensor_daily_array2` | entity | — | Daily production sensor for Array 2; combined daily yield = `sensor_daily` + `sensor_daily_array2`. |
| `sensor_home_load_secondary` | entity | — | Optional home load sensor tied to inverter 2; required for HOUSE TOT / INV 2 lines when Array 2 is active. |
| `pv_tot_color` | string | `#00FFFF` | Overrides the PV TOT line/text colour (also affects string inheritance when set). |
| `house_total_color` / `inv1_color` / `inv2_color` | string | — | Per-line colour overrides for HOUSE TOT, INV 1 and INV 2 flows. |
| `invert_battery` | boolean | `false` | Swaps charge/discharge polarity, colours, and animation direction. |

Car colours & fonts: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` — new colour and name-font-size controls for Car 1 and Car 2 (power and SOC font sizes remain available as `car_power_font_size`, `car2_power_font_size`, `car_soc_font_size`, `car2_soc_font_size`).

Notes:

- When Array 2 is active the PV flow mapping is: `pv1` → Array 1 (primary), `pv2` → Array 2 (secondary). The PV TOT line shows the combined production where applicable.

- Enabling `show_pv_strings` will show per-string lines for the active array(s); when Array 2 is present the card will render PV TOT / Array1 total / Array2 total and the HOUSE section will render `HOUSE TOT / INV 1 / INV 2` as separate lines.

### Ulteriori opzioni Array 2 (IT)

`sensor_pv_total_secondary` | entity | — | Sensore totale opzionale per il secondo inverter (trattato come PV2). Quando presente viene sommato al PV TOT e usato come flusso FV secondario.

`sensor_pv_array2_1` .. `sensor_pv_array2_6` | entities | — | Fino a sei sensori per stringa per un secondo array FV (Array 2). Se `show_pv_strings` è abilitato appaiono come linee separate sotto il totale PV.

`sensor_daily_array2` | entity | — | Sensore di produzione giornaliera per Array 2; la scheda mostra il totale giornaliero combinato = `sensor_daily` + `sensor_daily_array2`.

`sensor_home_load_secondary` | entity | — | Sensore opzionale di carico domestico associato all inverter 2; usato per calcolare HOUSE TOT e INV 2 quando Array 2 è configurato.

`pv_tot_color` | string | `#00FFFF` | Colore applicato alla riga/testo PV TOT (sovrascrive l ereditarieta per stringa se impostato).

`house_total_color`, `inv1_color`, `inv2_color` | string | — | Colori per riga applicati a HOUSE TOT, INV 1 e INV 2 quando Array 2 è attivo.

`invert_battery` | boolean | `false` | Inverti la polarita di carica/scarica batteria (scambia i colori e inverte la direzione dell animazione se abilitato).

Opzioni colori/font Auto: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` — nuove opzioni per colori e dimensione del nome Auto 1/2.

Note:

- Quando Array 2 è attivo il mapping dei flussi FV è: `pv1` → Array 1 (primario), `pv2` → Array 2 (secondario). La riga PV TOT mostra la produzione combinata quando disponibile.

- Abilitando `show_pv_strings` verranno mostrate le linee per stringa per gli array attivi; quando Array 2 è presente la scheda renderizzerà PV TOT / Totale Array1 / Totale Array2 e la sezione HOUSE mostrerà `HOUSE TOT / INV 1 / INV 2` come linee separate.

### Zusätzliche Array-2-Optionen (DE, Kurzfassung)

`sensor_pv_total_secondary` | entity | — | Optionaler Gesamtwertsensor für den zweiten Wechselrichter (als PV2 behandelt). Wenn vorhanden wird er in PV TOT einbezogen und als sekundärer PV-Fluss verwendet.

`sensor_pv_array2_1` .. `sensor_pv_array2_6` | entities | — | Bis zu sechs Einzelstring-Sensoren für ein zweites PV-Array (Array 2). Wenn `show_pv_strings` aktiviert ist, werden diese als separate Zeilen unter der PV-Gesamtlinie angezeigt.

`sensor_daily_array2` | entity | — | Tagesproduktionssensor für Array 2; die Karte zeigt den kombinierten Tagesertrag = `sensor_daily` + `sensor_daily_array2`.

`sensor_home_load_secondary` | entity | — | Optionaler Haushaltsverbrauchssensor, der mit Wechselrichter 2 verbunden ist; wird verwendet, um HOUSE TOT und INV 2 Werte zu berechnen, wenn Array 2 konfiguriert ist.

`pv_tot_color` | string | `#00FFFF` | Farbe für die PV TOT Text-/Linie (überschreibt die Vererbung pro String, wenn gesetzt).

`house_total_color`, `inv1_color`, `inv2_color` | string | — | Zeilenfarben für HOUSE TOT, INV 1 und INV 2, wenn Array 2 aktiv ist.

`invert_battery` | boolean | `false` | Batterie-Lade-/Entladepolarität umkehren (tauscht Lade-/Entladefarben und kehrt die Animationsrichtung um, wenn aktiviert).

Auto-Farben & Schriften: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` — neue Farb- und Namensschriftgröße-Optionen für Auto 1 und Auto 2.

Hinweise:

- Wenn Array 2 aktiv ist, gilt folgende PV-Fluss-Zuordnung: `pv1` → Array 1 (primär), `pv2` → Array 2 (sekundär). Die PV TOT Zeile zeigt die kombinierte Produktion, falls vorhanden.

- Wenn `show_pv_strings` aktiviert ist, werden pro String Zeilen für die aktiven Arrays angezeigt; wenn Array 2 vorhanden ist, rendert die Karte PV TOT / Array1 Gesamt / Array2 Gesamt und der HOUSE-Bereich rendert `HOUSE TOT / INV 1 / INV 2` als separate Zeilen.

---

## Italiano

### Panoramica (IT)

Lumina Energy Card è una scheda Lovelace personalizzata per Home Assistant che rappresenta flussi energetici animati, consolida stringhe FV e batterie e può mostrare metriche EV opzionali in un layout cinematografico.

### Funzionalità Chiave (IT)

- Fino a sei sensori fotovoltaici con etichettatura intelligente per stringa o totale.
- Fino a quattro sistemi batteria con media SOC e visualizzazione a riempimento liquido.
- Flussi animati per rete, carichi, FV, batterie ed EV con colori dinamici e stili trattini/punti/frecce selezionabili.
- Soglia di animazione della rete configurabile (default 100 W) per sopprimere micro import/export.
- Moltiplicatore di velocità (-3x a 3x, 0 in pausa, valori negativi invertono) e soglie dedicate per ogni flusso.
- Pannello EV opzionale con potenza e SOC, colori e tipografia personalizzabili, con supporto per due veicoli.
- Badge della produzione giornaliera più controlli tipografici completi per intestazione, FV, batteria, carichi, rete ed EV.
- Totali giornalieri di import ed export rete quando i sensori sono disponibili.
- Colori di avviso/critico per il carico domestico e soglia SOC bassa configurabile per il riempimento della batteria.
- Cursore dell'intervallo di aggiornamento (0–60 s, default 30 s) con aggiornamento in tempo reale impostando 0 s.
- Popup informativi per Casa, Solare, Batteria, Rete e Inverter con sei righe configurabili (nome, colore, dimensione font).
- Modalità dedicate per pompa di calore, doppio flusso di rete e future estensioni.

### Installazione (IT)

#### HACS (IT)

1. Apri HACS in Home Assistant e scegli **Frontend**.
1. Dal menu a tre punti seleziona **Repository personalizzati**.
1. Inserisci `https://github.com/ratava/lumina-energy-card`, imposta la categoria su **Dashboard** e premi **Aggiungi**.
1. Trova **Lumina Energy Card** nell'elenco Frontend e installala.
1. Riavvia Home Assistant se richiesto, quindi aggiungi la scheda dall'editor Lovelace.

#### Installazione manuale (IT)

1. Scarica `dist/lumina-energy-card.js` dall'[ultima release](https://github.com/ratava/lumina-energy-card/releases).
1. Copia il file in `/config/www/community/lumina-energy-card/`.
1. Copia `dist/lumina_background.png` nella stessa cartella.
1. Aggiungi la risorsa Lovelace:

```yaml
lovelace:
  resources:
    - url: /local/community/lumina-energy-card/lumina-energy-card.js
      type: module
```

1. Riavvia Home Assistant per caricare la risorsa.

### Configurazione (IT)

1. Apri il tuo dashboard e scegli **Aggiungi scheda**.
1. Cerca **Lumina Energy Card**.
1. Compila i campi usando i selettori di entità e gli interruttori.
1. Regola lo **Update Interval** per definire la frequenza di refresh.

Esempio YAML minimo (IT):

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.produzione_solare
sensor_daily: sensor.produzione_giornaliera
sensor_bat1_soc: sensor.batteria_soc
sensor_bat1_power: sensor.batteria_potenza
sensor_home_load: sensor.consumo_casa
sensor_grid_power: sensor.potenza_rete
background_image: /local/community/lumina-energy-card/lumina_background.png
```

### Opzioni (IT)

| Opzione | Tipo | Predefinito | Note |
| --- | --- | --- | --- |
| `card_title` | stringa | — | Testo intestazione opzionale; se vuoto il titolo resta nascosto. |
| `background_image` | stringa | `/local/community/lumina-energy-card/lumina_background.png` | Immagine di sfondo 16:9 predefinita. |
| `language` | stringa | `en` | Lingue supportate: `en`, `it`, `de`, `fr`, `nl`. |
| `display_unit` | stringa | `kW` | Visualizza i valori in `W` o `kW`. |
| `update_interval` | numero | `30` | Cadenza di aggiornamento (0–60 s, passo 5; 0 disattiva la limitazione). |
| `animation_speed_factor` | numero | `1` | Moltiplicatore delle animazioni (-3 a 3; 0 in pausa, valori negativi invertono). |
| `animation_style` | stringa | `dashes` | Stile dei flussi (`dashes`, `dots`, `arrows`). |
| `header_font_size` | numero | `16` | Dimensione carattere dell'intestazione (12–32 px). |
| `daily_label_font_size` | numero | `12` | Dimensione etichetta produzione giornaliera (8–24 px). |
| `daily_value_font_size` | numero | `20` | Dimensione valore produzione giornaliera (12–32 px). |
| `pv_font_size` | numero | `16` | Dimensione testo FV (12–28 px). |
| `battery_soc_font_size` | numero | `20` | Dimensione etichetta SOC (12–32 px). |
| `battery_power_font_size` | numero | `14` | Dimensione testo potenza batteria (10–28 px). |
| `load_font_size` | numero | `15` | Dimensione testo carico (10–28 px). |
| `grid_font_size` | numero | `15` | Dimensione testo rete (10–28 px). |
| `heat_pump_font_size` | numero | `16` | Dimensione testo pompa di calore (10–28 px). |
| `car_power_font_size` | numero | `15` | Dimensione testo potenza Auto 1 (10–28 px). |
| `car2_power_font_size` | numero | `15` | Dimensione testo potenza Auto 2 (10–28 px, ricade su Auto 1 se assente). |
| `car_soc_font_size` | numero | `12` | Dimensione SOC Auto 1 (8–24 px). |
| `car2_soc_font_size` | numero | `12` | Dimensione SOC Auto 2 (8–24 px, ricade su Auto 1). |
| `car_name_font_size` | numero | `15` | Dimensione nome Auto 1. |
| `car2_name_font_size` | numero | `15` | Dimensione nome Auto 2. |
| `sensor_pv_total` | entità | — | Sensore totale FV opzionale. Specificare questo sensore **oppure** almeno una stringa. |
| `sensor_pv1` .. `sensor_pv6` | entità | — | Sensori stringa FV per Array 1. Se manca il totale è richiesta almeno una stringa e tutte quelle configurate vengono sommate. |
| `show_pv_strings` | booleano | `false` | Mostra PV TOT e ogni stringa configurata. |
| `sensor_daily` | entità | — | Sensore produzione giornaliera (obbligatorio). |
| `sensor_bat1_soc` | entità | — | Sensore SOC batteria (obbligatorio solo se la batteria è mostrata). |
| `sensor_bat1_power` | entità | — | Sensore potenza batteria (obbligatorio solo se la batteria è mostrata). |
| `sensor_home_load` | entità | — | Sensore carico casa (obbligatorio). |
| `sensor_grid_power` | entità | — | Sensore rete netto (obbligatorio salvo coppia import/export). |
| `sensor_grid_import` | entità | — | Sensore di import positivo opzionale. |
| `sensor_grid_export` | entità | — | Sensore di export positivo opzionale. |
| `sensor_grid_import_daily` | entità | — | Sensore import giornaliero cumulativo (opzionale). |
| `sensor_grid_export_daily` | entità | — | Sensore export giornaliero cumulativo (opzionale). |
| `show_daily_grid` | booleano | `false` | Mostra i totali giornalieri import/export sopra il valore live. |
| `show_grid_flow_label` | booleano | `true` | Antepone “Importazione/Esportazione” al valore di rete. |
| `sensor_heat_pump_consumption` | entità | — | Sensore pompa di calore; abilita flusso arancione e sfondo dedicato. |
| `sensor_car_power` | entità | — | Sensore potenza carica Auto 1 (opzionale). |
| `sensor_car_soc` | entità | — | Sensore SOC Auto 1 (opzionale). |
| `sensor_car2_power` | entità | — | Sensore potenza carica Auto 2 (opzionale). |
| `sensor_car2_soc` | entità | — | Sensore SOC Auto 2 (opzionale). |
| `show_car_soc` | booleano | `false` | Mostra il pannello Auto 1 (potenza + SOC). |
| `show_car2` | booleano | `false` | Mostra il pannello Auto 2 quando sono presenti sensori. |
| `car_flow_color` | stringa | `#00FFFF` | Colore del flusso EV. |
| `car1_color` | stringa | `#FFFFFF` | Colore testo potenza Auto 1. |
| `car2_color` | stringa | `#FFFFFF` | Colore testo potenza Auto 2. |
| `car_pct_color` | stringa | `#00FFFF` | Colore testo SOC Auto 1. |
| `car2_pct_color` | stringa | `#00FFFF` | Colore testo SOC Auto 2. |
| `car1_name_color` | stringa | `#FFFFFF` | Colore nome Auto 1. |
| `car2_name_color` | stringa | `#FFFFFF` | Colore nome Auto 2. |
| `pv_primary_color` | stringa | `#0080ff` | Colore animazione flusso FV primario. |
| `pv_secondary_color` | stringa | `#80ffff` | Colore flusso FV secondario. |
| `pv_tot_color` | stringa | `#00FFFF` | Colore della riga/testo PV TOT. |
| `load_flow_color` | stringa | `#0080ff` | Colore del flusso carico casa. |
| `load_text_color` | stringa | `#FFFFFF` | Colore del testo del carico quando le soglie non sono attive. |
| `load_threshold_warning` | numero | — | Soglia di avviso per il carico (W o kW). |
| `load_warning_color` | stringa | `#ff8000` | Colore di avviso per il carico. |
| `load_threshold_critical` | numero | — | Soglia critica per il carico (W o kW). |
| `load_critical_color` | stringa | `#ff0000` | Colore critico per il carico. |
| `battery_soc_color` | stringa | `#FFFFFF` | Colore del testo percentuale SOC della batteria. |
| `battery_charge_color` | stringa | `#00FFFF` | Colore del flusso di carica batteria. |
| `battery_discharge_color` | stringa | `#FFFFFF` | Colore del flusso di scarica batteria. |
| `grid_import_color` | stringa | `#FF3333` | Colore del flusso di import rete. |
| `grid_export_color` | stringa | `#00ff00` | Colore del flusso di export rete. |
| `heat_pump_flow_color` | stringa | `#FFA500` | Colore del flusso della pompa di calore. |
| `heat_pump_text_color` | stringa | `#FFA500` | Colore del testo pompa di calore. |
| `battery_fill_high_color` | stringa | `#00ffff` | Colore di riempimento batteria sopra la soglia bassa. |
| `battery_fill_low_color` | stringa | `#ff0000` | Colore di riempimento batteria sotto la soglia bassa. |
| `battery_fill_low_threshold` | numero | `25` | Percentuale SOC che attiva la colorazione bassa. |
| `grid_activity_threshold` | numero | `100` | Potenza minima di rete (W) prima di animare i flussi. |
| `grid_threshold_warning` | numero | — | Soglia per la colorazione di avviso rete. |
| `grid_warning_color` | stringa | `#ff8000` | Colore di avviso rete. |
| `grid_threshold_critical` | numero | — | Soglia per la colorazione critica rete. |
| `grid_critical_color` | stringa | `#ff0000` | Colore critico rete. |
| `invert_grid` | booleano | `false` | Inverte la polarità della rete se import/export risultano invertiti. |
| `invert_battery` | booleano | `false` | Inverte polarità, colori e direzione dell'animazione della batteria. |

### Flusso rete automatico (IT)

Ora la scheda sceglie automaticamente il percorso della rete:

- Quando imposti un sensore FV totale (`sensor_pv_total`) o almeno una stringa per l'Array 1, import/export scorrono verso l'inverter come prima.
- Se lasci vuoti `sensor_pv_total` e tutte le stringhe dell'Array 1 la scheda presuppone un impianto solo rete: la freccia segue il ramo casa e gli elementi FV (badge produzione giornaliera + popup FV) vengono nascosti.

Il vecchio toggle grid→house è stato rimosso: elimina qualsiasi `grid_flow_mode` dal tuo YAML; il rilevamento è automatico e `grid_activity_threshold` controlla ancora l'avvio dell'animazione.

### Popup (IT)

Le cinque finestre (FV, Casa, Batteria, Rete, Inverter) offrono sei righe ciascuna con selettore entità, nome facoltativo, colore e dimensione del font. I valori vengono mostrati così come arrivano, così puoi combinare sensori numerici e testuali.

- Popup FV: aree cliccabili sul badge di produzione giornaliera e sui pannelli; clicca per aprire/chiudere, clic sul popup per nasconderlo.
- Popup Casa: la casa è cliccabile per alternare la finestra.
- Popup Batteria: clic sulla batteria per aprire/chiudere; clic sul popup per chiudere.
- Popup Rete: la sezione rete è cliccabile per alternare la finestra.
- Popup Inverter: la sezione inverter è cliccabile per alternare la finestra.

I campi disponibili includono `sensor_popup_*`, `*_name`, `*_color`, `*_font_size` (colore di default `#80ffff`, 14 px per PV/Casa, 16 px per Batteria/Rete/Inverter).

### Opzioni aggiuntive Array 2 (IT)

| Opzione | Tipo | Predefinito | Note |
| --- | --- | --- | --- |
| `sensor_pv_total_secondary` | entità | — | Sensore totale per il secondo inverter (PV2); sommato a PV TOT e usato per il flusso secondario. |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6` | entità | — | Fino a sei sensori per stringa dell'Array 2; visibili singolarmente con `show_pv_strings`. |
| `sensor_daily_array2` | entità | — | Sensore produzione giornaliera per l'Array 2; totale = `sensor_daily` + `sensor_daily_array2`. |
| `sensor_home_load_secondary` | entità | — | Sensore carico casa legato all'inverter 2; necessario per HOUSE TOT / INV 2 con Array 2 attivo. |
| `pv_tot_color` | stringa | `#00FFFF` | Sovrascrive la colorazione della riga PV TOT (influenza anche le stringhe). |
| `house_total_color` / `inv1_color` / `inv2_color` | stringa | — | Colori per le linee HOUSE TOT, INV 1 e INV 2. |
| `invert_battery` | booleano | `false` | Inverte polarità, colori e direzione del flusso batteria. |

Colori e font delle auto: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car_pct_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` mantengono allineati i pannelli Auto 1 e Auto 2.

Note:

- Con Array 2 attivo `pv1` alimenta l'array primario e `pv2` quello secondario; la riga PV TOT mostra la produzione combinata.
- Abilitando `show_pv_strings` compaiono PV TOT / Array 1 / Array 2 e nella sezione Casa vengono visualizzate le righe `HOUSE TOT / INV 1 / INV 2`.

### Sfondo & Risoluzione problemi (IT)

- Sfondo predefinito: `/local/community/lumina-energy-card/lumina_background.png` (copia la tua immagine accanto al file JS per personalizzarlo).
- Dimensioni consigliate: 800×450 (16:9).
- Scheda mancante: verifica che la risorsa Lovelace sia stata aggiunta e svuota la cache del browser.
- Letture pari a zero: controlla gli ID delle entità e che i sensori siano disponibili.
- Editor lento: aumenta `update_interval` o riduci la frequenza di aggiornamento del dashboard.

### Supporto & Licenza (IT)

- Licenza: MIT (vedi [LICENSE](LICENSE)).
- Per problemi o richieste di feature apri un ticket su [GitHub](https://github.com/ratava/lumina-energy-card).

### Changelog (IT)

- **1.1.25 (2025-12-26)** – Incremento di versione (vedi voce precedente per le novità).
- **1.1.20 (2025)** – Ridimensionamento animazioni freccia, soglia animazione rete, toggle pannello EV e aggiornamento documentazione.
- **1.1.18 (2025)** – Aggiunti stili di animazione selezionabili (tratteggi, punti, frecce) e documentazione aggiornata.
- **1.1.13 (2025)** – Nuovo easing per la durata dei flussi, pulizia logica e refresh in tempo reale con intervallo 0 s.
- **1.1.1 (2025)** – Localizzazione dei testi e preparazione del bundle monofile.
- **1.1.0 (2025)** – Localizzazione delle schede di configurazione per inglese/italiano/tedesco e distribuzione monofile.
- **1.0.8 (2025)** – Controlli tipografici convertiti in input testuali accanto alle impostazioni EV.
- **1.0.7 (2025)** – Ripristino dei controlli tipografici nella nuova interfaccia editor.
- **1.0.5 (2025)** – Editor Lovelace ricostruito con selettori nativi per aggiornamenti immediati.
- **1.0.4 (2025)** – Fusione dell'editor nel bundle principale e aggiunta di tab localizzati.
- **1.0.3 (2025)** – Velocità animazioni scalabile, slider tipografia e esempi di entità inline.
- **1.0.2 (2025)** – Aggiornamento del codice base.
- **1.0.1 (2025)** – File distributivi spostati in `dist/` e documentazione installazione manuale allineata.

## Français

### Aperçu (FR)

Lumina Energy Card est une carte Lovelace personnalisée pour Home Assistant qui représente des flux d'énergie animés, regroupe les chaînes photovoltaïques et les batteries, et affiche en option les métriques de charge EV dans une mise en page immersive.

### Fonctionnalités clés (FR)

- Jusqu'à six capteurs PV avec étiquetage intelligent par chaîne ou totalisé.
- Jusqu'à quatre systèmes de batteries avec moyenne SOC et visualisation liquide animée.
- Flux animés pour réseau, charge, PV, batterie et EV avec couleurs dynamiques et styles dash/points/flèches sélectionnables.
- Seuil d'animation du réseau configurable (100 W par défaut) pour masquer le bruit d'import/export faible.
- Multiplicateur de vitesse (-3x à 3x, 0 en pause, valeurs négatives inversent) et seuils de visibilité dédiés pour chaque flux.
- Panneau EV optionnel incluant puissance et SOC, couleurs et typographie personnalisables, avec prise en charge de deux véhicules.
- Badge de production quotidienne et commandes typographiques complètes pour l'en-tête, les PV, les batteries, la charge, le réseau et l'EV.
- Totaux quotidiens d'import et d'export du réseau lorsque les capteurs correspondants sont fournis.
- Couleurs d'avertissement/critique pour la charge domestique et seuil SOC bas configurable pour le remplissage liquide de la batterie.
- Curseur d'intervalle de mise à jour (0–60 s, valeur par défaut 30 s) avec rafraîchissement temps réel si réglé sur 0 s.
- Cinq popups d'information (Maison, Solaire, Batterie, Réseau, Onduleur) avec six lignes configurables (nom, couleur, taille de police).
- Prise en charge d'un second onduleur, d'un flux pompe à chaleur dédié et d'autres évolutions à venir.

### Installation (FR)

#### HACS (FR)

1. Ouvrez HACS dans Home Assistant et choisissez **Frontend**.
1. Cliquez sur le menu à trois points et sélectionnez **Custom repositories**.
1. Collez `https://github.com/ratava/lumina-energy-card`, définissez la catégorie sur **Frontend**, puis cliquez sur **Add**.
1. Fermez la boîte, trouvez **Lumina Energy Card** dans la liste Frontend et installez-la.
1. Redémarrez Home Assistant si nécessaire, puis ajoutez la carte depuis l'éditeur Lovelace.

#### Installation manuelle (FR)

1. Téléchargez `dist/lumina-energy-card.js` depuis la [dernière release](https://github.com/ratava/lumina-energy-card/releases).
1. Copiez le fichier dans `/config/www/community/lumina-energy-card/`.
1. Placez `dist/lumina_background.png` dans le même dossier.
1. Ajoutez la ressource Lovelace :

```yaml
lovelace:
  resources:
    - url: /local/community/lumina-energy-card/lumina-energy-card.js
      type: module
```

1. Redémarrez Home Assistant pour charger la ressource.

### Configuration (FR)

1. Éditez votre tableau de bord et cliquez sur **Add Card**.
1. Recherchez **Lumina Energy Card**.
1. Remplissez les champs à l'aide des sélecteurs d'entités et des bascules.
1. Ajustez l'intervalle de mise à jour (**Update Interval**) selon vos besoins.

Exemple YAML minimal (FR) :

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

### Options (FR)

| Option | Type | Par défaut | Remarques |
| --- | --- | --- | --- |
| `card_title` | chaîne | — | Texte d'en-tête optionnel ; vide = titre masqué. |
| `background_image` | chaîne | `/local/community/lumina-energy-card/lumina_background.png` | Image de fond 16:9 par défaut. |
| `language` | chaîne | `en` | Langues prises en charge : `en`, `it`, `de`, `fr`, `nl`. |
| `display_unit` | chaîne | `kW` | Affiche les valeurs en `W` ou `kW`. |
| `update_interval` | nombre | `30` | Cadence d'actualisation (0–60 s, pas de 5 ; 0 supprime toute limitation). |
| `animation_speed_factor` | nombre | `1` | Multiplicateur des flux (-3 à 3 ; 0 met en pause, valeurs négatives inversent). |
| `animation_style` | chaîne | `dashes` | Motif des flux (`dashes`, `dots`, `arrows`). |
| `header_font_size` | nombre | `16` | Taille de police de l'en-tête (12–32 px). |
| `daily_label_font_size` | nombre | `12` | Taille de l'étiquette quotidienne (8–24 px). |
| `daily_value_font_size` | nombre | `20` | Taille du total quotidien (12–32 px). |
| `pv_font_size` | nombre | `16` | Taille du texte PV (12–28 px). |
| `battery_soc_font_size` | nombre | `20` | Taille du libellé SOC (12–32 px). |
| `battery_power_font_size` | nombre | `14` | Taille du texte puissance batterie (10–28 px). |
| `load_font_size` | nombre | `15` | Taille du texte de charge (10–28 px). |
| `grid_font_size` | nombre | `15` | Taille du texte réseau (10–28 px). |
| `heat_pump_font_size` | nombre | `16` | Taille du texte pompe à chaleur (10–28 px). |
| `car_power_font_size` | nombre | `15` | Taille du texte puissance voiture 1 (10–28 px). |
| `car2_power_font_size` | nombre | `15` | Taille du texte puissance voiture 2 (10–28 px, retombe sur Car 1 si absent). |
| `car_soc_font_size` | nombre | `12` | Taille du SOC voiture 1 (8–24 px). |
| `car2_soc_font_size` | nombre | `12` | Taille du SOC voiture 2 (8–24 px, retombe sur Car 1). |
| `car_name_font_size` | nombre | `15` | Taille du nom de la voiture 1. |
| `car2_name_font_size` | nombre | `15` | Taille du nom de la voiture 2. |
| `sensor_pv_total` | entité | — | Capteur PV total optionnel. Fournissez ce capteur **ou** au moins une chaîne PV. |
| `sensor_pv1` .. `sensor_pv6` | entité | — | Capteurs PV par chaîne pour Array 1. Sans total, au moins une chaîne est requise et toutes les chaînes configurées sont additionnées. |
| `show_pv_strings` | booléen | `false` | Affiche le total PV ainsi que chaque chaîne configurée. |
| `sensor_daily` | entité | — | Capteur de production quotidienne (obligatoire). |
| `sensor_bat1_soc` | entité | — | Capteur SOC batterie (obligatoire si une batterie apparaît). |
| `sensor_bat1_power` | entité | — | Capteur de puissance batterie (obligatoire si une batterie apparaît). |
| `sensor_home_load` | entité | — | Capteur de charge domestique (obligatoire). |
| `sensor_grid_power` | entité | — | Capteur net réseau (obligatoire sauf si import/export séparés fournis). |
| `sensor_grid_import` | entité | — | Capteur d'import positif facultatif. |
| `sensor_grid_export` | entité | — | Capteur d'export positif facultatif. |
| `sensor_grid_import_daily` | entité | — | Capteur d'import quotidien cumulé (facultatif). |
| `sensor_grid_export_daily` | entité | — | Capteur d'export quotidien cumulé (facultatif). |
| `show_daily_grid` | booléen | `false` | Affiche les totaux d'import/export quotidiens au-dessus de la valeur live. |
| `show_grid_flow_label` | booléen | `true` | Ajoute « Importation » ou « Exportation » avant la valeur réseau. |
| `sensor_heat_pump_consumption` | entité | — | Capteur pompe à chaleur ; active le flux orange et l'arrière-plan dédié. |
| `sensor_car_power` | entité | — | Capteur de puissance de charge voiture 1 (facultatif). |
| `sensor_car_soc` | entité | — | Capteur SOC voiture 1 (facultatif). |
| `sensor_car2_power` | entité | — | Capteur de puissance de charge voiture 2 (facultatif). |
| `sensor_car2_soc` | entité | — | Capteur SOC voiture 2 (facultatif). |
| `show_car_soc` | booléen | `false` | Affiche le panneau voiture 1 (puissance + SOC). |
| `show_car2` | booléen | `false` | Affiche le panneau voiture 2 lorsque des capteurs sont fournis. |
| `car_flow_color` | chaîne | `#00FFFF` | Couleur du flux EV. |
| `car1_color` | chaîne | `#FFFFFF` | Couleur du texte puissance voiture 1. |
| `car2_color` | chaîne | `#FFFFFF` | Couleur du texte puissance voiture 2. |
| `car_pct_color` | chaîne | `#00FFFF` | Couleur du texte SOC voiture 1. |
| `car2_pct_color` | chaîne | `#00FFFF` | Couleur du texte SOC voiture 2. |
| `car1_name_color` | chaîne | `#FFFFFF` | Couleur du nom voiture 1. |
| `car2_name_color` | chaîne | `#FFFFFF` | Couleur du nom voiture 2. |
| `pv_primary_color` | chaîne | `#0080ff` | Couleur d'animation du flux PV principal. |
| `pv_secondary_color` | chaîne | `#80ffff` | Couleur du flux PV secondaire. |
| `pv_tot_color` | chaîne | `#00FFFF` | Couleur de la ligne/texte PV TOTAL. |
| `load_flow_color` | chaîne | `#0080ff` | Couleur du flux de charge domestique. |
| `load_text_color` | chaîne | `#FFFFFF` | Couleur du texte de charge lorsque aucun seuil n'est actif. |
| `load_threshold_warning` | nombre | — | Seuil d'avertissement pour la charge (W ou kW). |
| `load_warning_color` | chaîne | `#ff8000` | Couleur d'avertissement pour la charge. |
| `load_threshold_critical` | nombre | — | Seuil critique pour la charge (W ou kW). |
| `load_critical_color` | chaîne | `#ff0000` | Couleur critique pour la charge. |
| `battery_soc_color` | chaîne | `#FFFFFF` | Couleur du texte du pourcentage SOC batterie. |
| `battery_charge_color` | chaîne | `#00FFFF` | Couleur du flux de charge batterie. |
| `battery_discharge_color` | chaîne | `#FFFFFF` | Couleur du flux de décharge batterie. |
| `grid_import_color` | chaîne | `#FF3333` | Couleur du flux d'import réseau. |
| `grid_export_color` | chaîne | `#00ff00` | Couleur du flux d'export réseau. |
| `heat_pump_flow_color` | chaîne | `#FFA500` | Couleur du flux dédié pompe à chaleur. |
| `heat_pump_text_color` | chaîne | `#FFA500` | Couleur du texte pompe à chaleur. |
| `battery_fill_high_color` | chaîne | `#00ffff` | Couleur de remplissage batterie au-dessus du seuil bas. |
| `battery_fill_low_color` | chaîne | `#ff0000` | Couleur de remplissage batterie sous le seuil bas. |
| `battery_fill_low_threshold` | nombre | `25` | Pourcentage SOC qui déclenche la couleur basse. |
| `grid_activity_threshold` | nombre | `100` | Puissance réseau minimale (W) avant animation. |
| `grid_threshold_warning` | nombre | — | Seuil déclenchant la couleur d'avertissement réseau. |
| `grid_warning_color` | chaîne | `#ff8000` | Couleur d'avertissement réseau. |
| `grid_threshold_critical` | nombre | — | Seuil déclenchant la couleur critique réseau. |
| `grid_critical_color` | chaîne | `#ff0000` | Couleur critique réseau. |
| `invert_grid` | booléen | `false` | Inverse l'import/export si la polarité est inversée. |
| `invert_battery` | booléen | `false` | Inverse la polarité et les couleurs de charge/décharge batterie. |

### Routage réseau automatique (FR)

La carte choisit désormais le tracé réseau automatiquement :

- Si un total PV (`sensor_pv_total`) ou au moins une chaîne Array 1 est configuré(e), les imports/exports transitent par le conduit de l'onduleur comme auparavant.
- Si `sensor_pv_total` et toutes les chaînes Array 1 sont laissés vides, la carte suppose un site alimenté directement par le réseau : la flèche suit la branche Maison et les éléments PV (badge de production quotidienne + popup PV) sont masqués.

L'ancienne bascule grid→house a été supprimée ; retirez toute entrée `grid_flow_mode` de votre YAML. La détection reste automatique à chaque rendu et `grid_activity_threshold` contrôle toujours le démarrage de l'animation.

### Popups (FR)

Les cinq groupes de popups (PV, Maison, Batterie, Réseau, Onduleur) offrent chacun six emplacements avec entité, nom facultatif, couleur et taille de police. Les valeurs sont affichées telles quelles pour permettre l'utilisation de capteurs numériques ou textuels.

- Popup PV
  - `sensor_popup_pv_1` .. `sensor_popup_pv_6` : entités à afficher.
  - `sensor_popup_pv_1_name` .. `sensor_popup_pv_6_name` : noms personnalisés facultatifs.
  - `sensor_popup_pv_1_color` .. `sensor_popup_pv_6_color` : couleurs par ligne (défaut `#80ffff`).
  - `sensor_popup_pv_1_font_size` .. `sensor_popup_pv_6_font_size` : tailles de police (px) (défaut `14`).
  - Zones cliquables : le badge de production quotidienne et les panneaux solaires ouvrent/ferment le popup ; cliquer sur le popup le masque.

- Popup Maison
  - `sensor_popup_house_1` .. `sensor_popup_house_6` : entités à afficher.
  - `sensor_popup_house_1_name` .. `sensor_popup_house_6_name` : noms facultatifs.
  - `sensor_popup_house_1_color` .. `sensor_popup_house_6_color` : couleurs (défaut `#80ffff`).
  - `sensor_popup_house_1_font_size` .. `sensor_popup_house_6_font_size` : tailles de police (px) (défaut `14`).
  - La maison est cliquable pour ouvrir/fermer le popup ; cliquer sur le popup le ferme.

- Popup Batterie
  - `sensor_popup_bat_1` .. `sensor_popup_bat_6` : entités à afficher.
  - `sensor_popup_bat_1_name` .. `sensor_popup_bat_6_name` : noms facultatifs.
  - `sensor_popup_bat_1_color` .. `sensor_popup_bat_6_color` : couleurs (défaut `#80ffff`).
  - `sensor_popup_bat_1_font_size` .. `sensor_popup_bat_6_font_size` : tailles de police (px) (défaut `16`).
  - La batterie est cliquable ; cliquer dessus ouvre/ferme le popup, cliquer sur le popup le ferme.

- Popup Réseau
  - `sensor_popup_grid_1` .. `sensor_popup_grid_6` : entités à afficher.
  - `sensor_popup_grid_1_name` .. `sensor_popup_grid_6_name` : noms facultatifs.
  - `sensor_popup_grid_1_color` .. `sensor_popup_grid_6_color` : couleurs (défaut `#80ffff`).
  - `sensor_popup_grid_1_font_size` .. `sensor_popup_grid_6_font_size` : tailles de police (px) (défaut `16`).
  - La section réseau est cliquable pour ouvrir/fermer le popup ; cliquer sur le popup le ferme.

- Popup Onduleur
  - `sensor_popup_inverter_1` .. `sensor_popup_inverter_6` : entités à afficher.
  - `sensor_popup_inverter_1_name` .. `sensor_popup_inverter_6_name` : noms facultatifs.
  - `sensor_popup_inverter_1_color` .. `sensor_popup_inverter_6_color` : couleurs (défaut `#80ffff`).
  - `sensor_popup_inverter_1_font_size` .. `sensor_popup_inverter_6_font_size` : tailles de police (px) (défaut `16`).
  - La section onduleur est cliquable pour ouvrir/fermer le popup ; cliquer sur le popup le ferme.

### Options supplémentaires Array 2 (FR)

| Option | Type | Par défaut | Remarques |
| --- | --- | --- | --- |
| `sensor_pv_total_secondary` | entité | — | Capteur total optionnel pour le deuxième onduleur (PV2). Ajouté à PV TOT et alimente le flux PV secondaire. |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6` | entités | — | Jusqu'à six capteurs par chaîne pour Array 2 ; visibles individuellement si `show_pv_strings` est activé. |
| `sensor_daily_array2` | entité | — | Capteur de production quotidienne pour Array 2 ; total quotidien = `sensor_daily` + `sensor_daily_array2`. |
| `sensor_home_load_secondary` | entité | — | Capteur de charge maison lié à l'onduleur 2 ; requis pour HOUSE TOT / INV 2 lorsque Array 2 est actif. |
| `pv_tot_color` | chaîne | `#00FFFF` | Remplace la couleur de la ligne/texte PV TOTAL (affecte aussi les chaînes). |
| `house_total_color` / `inv1_color` / `inv2_color` | chaîne | — | Couleurs par ligne pour HOUSE TOT, INV 1 et INV 2. |
| `invert_battery` | booléen | `false` | Inverse la polarité et la direction d'animation de la batterie. |

Couleurs et polices des voitures : `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car_pct_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` permettent d'aligner les panneaux Car 1 et Car 2 (les tailles de puissance/SOC restent contrôlées par les options principales).

Notes :

- Lorsque Array 2 est actif : `pv1` alimente l'Array 1 (primaire) et `pv2` l'Array 2 (secondaire). La ligne PV TOT affiche la production combinée.
- Avec `show_pv_strings`, la carte affiche PV TOT / Array 1 / Array 2 ainsi que `HOUSE TOT / INV 1 / INV 2` dans la section Maison.

### Fond & Dépannage (FR)

- Fond par défaut : `/local/community/lumina-energy-card/lumina_background.png` (copiez votre image à côté du fichier JS pour personnaliser).
- Dimensions recommandées : 800×450 (16:9).
- Carte manquante : vérifiez que la ressource est ajoutée et videz le cache du navigateur.
- Valeurs nulles : contrôlez les IDs d'entités et la disponibilité des capteurs.
- Éditeur lent : augmentez `update_interval` ou réduisez la fréquence de rafraîchissement du tableau de bord.

### Support & Licence (FR)

- Licence : MIT (voir [LICENSE](LICENSE)).
- Problèmes et demandes de fonctionnalités : ouvrez un ticket sur [GitHub](https://github.com/ratava/lumina-energy-card).

### Changelog (FR)

- **1.1.25 (2025-12-26)** – Increment de version (reportez-vous à l'entrée précédente pour les nouveautés).
- **1.1.20 (2025)** – Ajustement de l'échelle des flèches, seuil d'animation réseau, bascule du panneau EV et rafraîchissement de la documentation.
- **1.1.18 (2025)** – Ajout des styles d'animation (tirets, points, flèches) et mise à jour de la documentation.
- **1.1.13 (2025)** – Ajout de l'easing pour la durée des flux, nettoyage des garde-fous et option d'intervalle 0 s pour un rafraîchissement en temps réel.
- **1.1.1 (2025)** – Localisation des textes et préparation de la distribution en fichier unique.
- **1.1.0 (2025)** – Localisation des onglets de configuration anglais/italien/allemand et distribution monofichier.
- **1.0.8 (2025)** – Contrôles de typographie convertis en champs texte avec les paramètres EV.
- **1.0.7 (2025)** – Rétablissement des contrôles de typographie dans la nouvelle mise en page de l'éditeur.
- **1.0.5 (2025)** – Refonte de l'éditeur Lovelace avec sélecteurs natifs et mises à jour instantanées.
- **1.0.4 (2025)** – Fusion de l'éditeur dans le bundle principal et ajout d'onglets localisés pour la configuration.
- **1.0.3 (2025)** – Ajout du réglage de vitesse d'animation, des curseurs de typographie et des exemples d'entités en ligne.
- **1.0.2 (2025)** – Mise à jour de la base de code.
- **1.0.1 (2025)** – Déplacement des fichiers distribuables dans `dist/` et alignement de l'installation manuelle.

---

### Background & Troubleshooting (EN)

- Default background: `/local/community/lumina-energy-card/lumina_background.png` (copy your image next to the JS file to customise).
- Recommended dimensions: 800×450 (16:9).
- Missing card: ensure the resource entry exists and clear browser cache.
- Zero readings: confirm entity IDs and sensor availability.
- Editor lag: increase `update_interval` or reduce dashboard refresh load.

### Support & License (EN)

- License: MIT (see [LICENSE](LICENSE)).
- Issues & feature requests: submit via [GitHub](https://github.com/ratava/lumina-energy-card).

- **1.1.25 (2025-12-26)** – Version bump. (See previous entry for last feature update.)
- **1.1.20 (2025)** – Tuned arrow animation scaling, added grid animation threshold, EV panel toggle, and documentation refresh.
- **1.1.18 (2025)** – Added selectable flow animation styles (dashes, dots, arrows) and refreshed documentation.
- **1.1.13 (2025)** – Added smooth flow duration easing with dynamic rate scaling, cleanup guards, and a 0s update interval option for real-time refresh.
- **1.1.1 (2025)** – Polished localisation text and prepped packaging for the single-file release.
- **1.1.0 (2025)** – Localised the Lovelace editor labels/helpers for English, Italian, and German while keeping the single-file distribution.
- **1.0.8 (2025)** – Converted typography controls to simple text inputs alongside EV settings for quicker edits.
- **1.0.7 (2025)** – Restored typography controls inside the new form-based editor layout.
- **1.0.5 (2025)** – Rebuilt the Lovelace editor with Home Assistant form selectors so entity pickers and sliders update config instantly.
- **1.0.4 (2025)** – Merged the editor into the main bundle, added localized configuration tabs, and moved typography controls into their own tab.
- **1.0.3 (2025)** – Added animation speed scaling, typography sliders, and inline entity examples in the editor.
- **1.0.2 (2025)** – Update to base code.
- **1.0.1 (2025)** – Moved distributable files into `dist/` and aligned manual install docs with new filenames.

---

## Deutsch

### Überblick (DE)

Lumina Energy Card ist eine benutzerdefinierte Lovelace-Karte für Home Assistant, die animierte Energieflüsse darstellt, PV-Stränge und Batteriespeicher aggregiert und optional EV-Lademetriken in einem modernen Layout einbettet.

### Wichtige Funktionen (DE)

- Bis zu sechs PV-Sensoren mit intelligenter pro-Strang- oder Gesamtbeschriftung.
- Bis zu vier Batteriesysteme mit SOC-Mittelwert und animierter Flüssigfüllung.
- Animierte Netz-, Haus-, PV-, Batterie- und EV-Flüsse mit dynamischen Farben sowie wählbaren Strich/Punkt/Pfeil-Stilen.
- Konfigurierbare Netzanimationsschwelle (Standard 100 W) blendet Kleinstimporte/-exporte aus.
- Einstellbarer Geschwindigkeitsfaktor (-3x bis 3x, 0 pausiert, negative Werte kehren um) plus individuelle Schwellen pro Fluss.
- Optionales EV-Panel mit Leistung und SOC, konfigurierbaren Farben und Typografie, inklusive Unterstützung für zwei Fahrzeuge.
- Tagesertrags-Badge und vollständige Typografie-Kontrollen für Kopfzeile, PV, Batterie, Last, Netz und EV.
- Tägliche Import-/Export-Summen des Netzes, sofern Sensoren vorhanden sind.
- Konfigurierbare Lastwarn-/Kritikfarben und ein SOC-Untergrenzwert für die Batteriefüllung.
- Update-Intervall-Schieberegler (0–60 s, Standard 30 s) mit Live-Refresh bei 0 s.
- Info-Popups für Haus, Solar, Batterie, Netz und Wechselrichter mit je sechs konfigurierbaren Zeilen (Name, Farbe, Schriftgröße).
- Dedizierter Wärmepumpenpfad, zweigeteilte Netzflüsse und weitere geplante Funktionen.

### Installation (DE)

#### HACS (DE)

1. Öffne HACS in Home Assistant und wähle **Frontend**.
1. Drei-Punkte-Menü → **Custom repositories**.
1. Trage `https://github.com/ratava/lumina-energy-card` ein, setze die Kategorie auf **Dashboard** und klicke **Add**.
1. Suche **Lumina Energy Card** in der Frontend-Liste und installiere sie.
1. Starte Home Assistant bei Bedarf neu und füge die Karte im Lovelace-Editor hinzu.

#### Manuelle Installation (DE)

1. Lade `dist/lumina-energy-card.js` aus dem [aktuellen Release](https://github.com/ratava/lumina-energy-card/releases).
1. Kopiere die Datei nach `/config/www/community/lumina-energy-card/`.
1. Lege `dist/lumina_background.png` im selben Ordner ab.
1. Ergänze die Lovelace-Ressource:

```yaml
lovelace:
  resources:
    - url: /local/community/lumina-energy-card/lumina-energy-card.js
      type: module
```

1. Starte Home Assistant neu, damit die Ressource geladen wird.

### Konfiguration (DE)

1. Öffne dein Dashboard und klicke auf **Karte hinzufügen**.
1. Suche nach **Lumina Energy Card**.
1. Wähle die Entitäten über die Picker und aktiviere gewünschte Schalter.
1. Stelle den Regler **Update Interval** auf deine bevorzugte Aktualisierungsrate ein.

Minimales YAML (DE):

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.pv_leistung
sensor_daily: sensor.pv_tagessumme
sensor_bat1_soc: sensor.batterie_soc
sensor_bat1_power: sensor.batterie_leistung
sensor_home_load: sensor.hausverbrauch
sensor_grid_power: sensor.netzleistung
background_image: /local/community/lumina-energy-card/lumina_background.png
```

### Optionen (DE)

| Option | Typ | Standard | Hinweise |
| --- | --- | --- | --- |
| `card_title` | Zeichenkette | — | Optionaler Kopfzeilentext; leer blendet den Titel aus. |
| `background_image` | Zeichenkette | `/local/community/lumina-energy-card/lumina_background.png` | Standard-Background (16:9). |
| `language` | Zeichenkette | `en` | Unterstützte Sprachen: `en`, `it`, `de`, `fr`, `nl`. |
| `display_unit` | Zeichenkette | `kW` | Anzeige in `W` oder `kW`. |
| `update_interval` | Zahl | `30` | Aktualisierungsintervall (0–60 s, Schritt 5; 0 deaktiviert das Throttling). |
| `animation_speed_factor` | Zahl | `1` | Animationsmultiplikator (-3 bis 3; 0 pausiert, negativ = rückwärts). |
| `animation_style` | Zeichenkette | `dashes` | Flussstil (`dashes`, `dots`, `arrows`). |
| `header_font_size` | Zahl | `16` | Schriftgröße der Überschrift (12–32 px). |
| `daily_label_font_size` | Zahl | `12` | Schriftgröße des Tageslabels (8–24 px). |
| `daily_value_font_size` | Zahl | `20` | Schriftgröße des Tageswerts (12–32 px). |
| `pv_font_size` | Zahl | `16` | Schriftgröße für PV (12–28 px). |
| `battery_soc_font_size` | Zahl | `20` | Schriftgröße für den SOC-Text (12–32 px). |
| `battery_power_font_size` | Zahl | `14` | Schriftgröße für die Batterieleistung (10–28 px). |
| `load_font_size` | Zahl | `15` | Schriftgröße für den Hausverbrauch (10–28 px). |
| `grid_font_size` | Zahl | `15` | Schriftgröße für den Netztext (10–28 px). |
| `heat_pump_font_size` | Zahl | `16` | Schriftgröße des Wärmepumpenlabels (10–28 px). |
| `car_power_font_size` | Zahl | `15` | Schriftgröße der Leistung von Fahrzeug 1 (10–28 px). |
| `car2_power_font_size` | Zahl | `15` | Schriftgröße der Leistung von Fahrzeug 2 (10–28 px, fallback Fahrzeug 1). |
| `car_soc_font_size` | Zahl | `12` | Schriftgröße des SOC Fahrzeug 1 (8–24 px). |
| `car2_soc_font_size` | Zahl | `12` | Schriftgröße des SOC Fahrzeug 2 (8–24 px, fallback Fahrzeug 1). |
| `car_name_font_size` | Zahl | `15` | Schriftgröße des Namens für Fahrzeug 1. |
| `car2_name_font_size` | Zahl | `15` | Schriftgröße des Namens für Fahrzeug 2. |
| `sensor_pv_total` | Entität | — | Optionaler Gesamt-PV-Sensor. Entweder diesen Sensor oder mindestens einen PV-Strang angeben. |
| `sensor_pv1` .. `sensor_pv6` | Entität | — | PV-Strangsensoren für Array 1. Ohne Gesamtwert ist mindestens ein Strang nötig; alle gesetzten Stränge werden summiert. |
| `show_pv_strings` | Boolesch | `false` | Zeigt PV TOTAL plus jeden konfigurierten Strang. |
| `sensor_daily` | Entität | — | Tagesertragssensor (Pflichtfeld). |
| `sensor_bat1_soc` | Entität | — | Batterien-SOC (nur erforderlich, wenn eine Batterie angezeigt wird). |
| `sensor_bat1_power` | Entität | — | Batterieleistung (nur erforderlich, wenn eine Batterie angezeigt wird). |
| `sensor_home_load` | Entität | — | Hausverbrauchssensor (Pflicht). |
| `sensor_grid_power` | Entität | — | Netzsensorsaldo (Pflicht, außer Import/Export-Paar vorhanden). |
| `sensor_grid_import` | Entität | — | Optionaler Import-Sensor (positive Werte). |
| `sensor_grid_export` | Entität | — | Optionaler Export-Sensor (positive Werte). |
| `sensor_grid_import_daily` | Entität | — | Optionaler Tagesimport-Zähler. |
| `sensor_grid_export_daily` | Entität | — | Optionaler Tagesexport-Zähler. |
| `show_daily_grid` | Boolesch | `false` | Zeigt Tagesimporte/-exporte oberhalb des Live-Netzwerts. |
| `show_grid_flow_label` | Boolesch | `true` | Präfix „Importiert/Exportiert“ vor dem Netztext. |
| `sensor_heat_pump_consumption` | Entität | — | Wärmepumpensensor; aktiviert den orangefarbenen Fluss und das alternative Hintergrundbild. |
| `sensor_car_power` | Entität | — | Optionaler Leistungssensor für Fahrzeug 1. |
| `sensor_car_soc` | Entität | — | Optionaler SOC-Sensor für Fahrzeug 1. |
| `sensor_car2_power` | Entität | — | Optionaler Leistungssensor für Fahrzeug 2. |
| `sensor_car2_soc` | Entität | — | Optionaler SOC-Sensor für Fahrzeug 2. |
| `show_car_soc` | Boolesch | `false` | Blendt das Panel für Fahrzeug 1 (Leistung + SOC) ein. |
| `show_car2` | Boolesch | `false` | Aktiviert das Panel für Fahrzeug 2, wenn Sensoren vorhanden sind. |
| `car_flow_color` | Zeichenkette | `#00FFFF` | Animationsfarbe des EV-Flusses. |
| `car1_color` | Zeichenkette | `#FFFFFF` | Schriftfarbe Leistung Fahrzeug 1. |
| `car2_color` | Zeichenkette | `#FFFFFF` | Schriftfarbe Leistung Fahrzeug 2. |
| `car_pct_color` | Zeichenkette | `#00FFFF` | Schriftfarbe SOC Fahrzeug 1. |
| `car2_pct_color` | Zeichenkette | `#00FFFF` | Schriftfarbe SOC Fahrzeug 2. |
| `car1_name_color` | Zeichenkette | `#FFFFFF` | Schriftfarbe Name Fahrzeug 1. |
| `car2_name_color` | Zeichenkette | `#FFFFFF` | Schriftfarbe Name Fahrzeug 2. |
| `pv_primary_color` | Zeichenkette | `#0080ff` | Animationsfarbe des primären PV-Flusses. |
| `pv_secondary_color` | Zeichenkette | `#80ffff` | Animationsfarbe des sekundären PV-Flusses. |
| `pv_tot_color` | Zeichenkette | `#00FFFF` | Farbe für PV TOTAL. |
| `load_flow_color` | Zeichenkette | `#0080ff` | Animationsfarbe des Hausverbrauchs. |
| `load_text_color` | Zeichenkette | `#FFFFFF` | Farbe für den Hausverbrauchstext, wenn keine Schwellen aktiv sind. |
| `load_threshold_warning` | Zahl | — | Warnschwelle für den Verbrauch (W oder kW). |
| `load_warning_color` | Zeichenkette | `#ff8000` | Warnfarbe für den Verbrauch. |
| `load_threshold_critical` | Zahl | — | Kritische Schwelle für den Verbrauch (W oder kW). |
| `load_critical_color` | Zeichenkette | `#ff0000` | Kritische Farbe für den Verbrauch. |
| `battery_soc_color` | Zeichenkette | `#FFFFFF` | Farbe für den Batterie-SOC-Prozenttext. |
| `battery_charge_color` | Zeichenkette | `#00FFFF` | Farbe des Batterieladeflusses. |
| `battery_discharge_color` | Zeichenkette | `#FFFFFF` | Farbe des Batteriespeiseflusses. |
| `grid_import_color` | Zeichenkette | `#FF3333` | Farbe des Netzimports. |
| `grid_export_color` | Zeichenkette | `#00ff00` | Farbe des Netzexports. |
| `heat_pump_flow_color` | Zeichenkette | `#FFA500` | Farbe für den Wärmepumpenfluss. |
| `heat_pump_text_color` | Zeichenkette | `#FFA500` | Farbe für das Wärmepumpenlabel. |
| `battery_fill_high_color` | Zeichenkette | `#00ffff` | Füllfarbe oberhalb der SOC-Schwelle. |
| `battery_fill_low_color` | Zeichenkette | `#ff0000` | Füllfarbe bei/unter der niedrigen SOC-Schwelle. |
| `battery_fill_low_threshold` | Zahl | `25` | SOC-Prozentsatz für die Umschaltung auf die niedrige Farbe. |
| `grid_activity_threshold` | Zahl | `100` | Minimale Netzleistung (W), bevor Animationen starten. |
| `grid_threshold_warning` | Zahl | — | Schwelle für die Netz-Warnfarbe. |
| `grid_warning_color` | Zeichenkette | `#ff8000` | Netz-Warnfarbe. |
| `grid_threshold_critical` | Zahl | — | Schwelle für die Netz-Kritikfarbe. |
| `grid_critical_color` | Zeichenkette | `#ff0000` | Netz-Kritikfarbe. |
| `invert_grid` | Boolesch | `false` | Kehrt die Netzpolung um, falls Import/Export vertauscht sind. |
| `invert_battery` | Boolesch | `false` | Kehrt Batterielade-/Entladepolarität, Farben und Animationsrichtung um. |

### Automatischer Netzfluss (DE)

Die Karte ermittelt den passenden Netzpfad jetzt selbst:

- Sobald ein PV-Gesamtsensor (`sensor_pv_total`) oder mindestens ein Array-1-Strang konfiguriert ist, laufen Import/Export wie gewohnt über den Wechselrichter-Zweig.
- Fehlen Array-1-Sensoren komplett (kein `sensor_pv_total`, keine Strings), behandelt die Karte die Anlage als reinen Netzbetrieb: Der Pfeil läuft über den Hauszweig und die PV-UI (Tagesertrags-Badge + PV-Popup) bleibt verborgen.

Der frühere grid→house-Schalter wurde entfernt – lösche `grid_flow_mode` aus deinem YAML. Die Erkennung passiert bei jedem Render und `grid_activity_threshold` bestimmt weiterhin, ab welcher Leistung animiert wird.

### Popups (DE)

Die fünf Popup-Gruppen (PV, Haus, Batterie, Netz, Wechselrichter) stellen je sechs Zeilen mit Entität, optionalem Namen, Farbe und Schriftgröße bereit. Werte werden unverändert angezeigt, sodass auch Textsensoren genutzt werden können.

- PV-Popup: Klick auf den Tagesertrags-Badge oder die PV-Flächen öffnet/schließt das Popup; Klick auf das Popup blendet es aus.
- Haus-Popup: Das Haus ist klickbar und toggelt die Anzeige.
- Batterie-Popup: Die Batteriefläche öffnet/schließt das Popup; ein Klick auf das Popup schließt es.
- Netz-Popup: Der Netzbereich ist klickbar und toggelt die Anzeige.
- Wechselrichter-Popup: Der Wechselrichterbereich ist klickbar und toggelt die Anzeige.

Felder: `sensor_popup_*`, `*_name`, `*_color`, `*_font_size` (Standardfarbe `#80ffff`, Schriftgröße 14 px für PV/Haus und 16 px für Batterie/Netz/Wechselrichter).

### Zusätzliche Array-2-Optionen (DE)

| Option | Typ | Standard | Hinweise |
| --- | --- | --- | --- |
| `sensor_pv_total_secondary` | Entität | — | Optionaler Gesamtwertsensor für den zweiten Wechselrichter (PV2); wird zu PV TOT addiert und treibt den sekundären PV-Fluss an. |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6` | Entitäten | — | Bis zu sechs Strangsensoren für Array 2; sichtbar, wenn `show_pv_strings` aktiv ist. |
| `sensor_daily_array2` | Entität | — | Tagesertragssensor für Array 2; Gesamtertrag = `sensor_daily` + `sensor_daily_array2`. |
| `sensor_home_load_secondary` | Entität | — | Optionaler Hausverbrauch für Wechselrichter 2; nötig für HOUSE TOT / INV 2 bei aktivem Array 2. |
| `pv_tot_color` | Zeichenkette | `#00FFFF` | Überschreibt die Farbe der PV-TOTAL-Zeile (vererbt an Strings). |
| `house_total_color` / `inv1_color` / `inv2_color` | Zeichenkette | — | Linienfarben für HOUSE TOT, INV 1 und INV 2. |
| `invert_battery` | Boolesch | `false` | Kehrt Polarität, Farben und Animation der Batterie um. |

Fahrzeugfarben/-schriften: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car_pct_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` halten beide Fahrzeug-Kacheln konsistent.

Hinweise:

- Mit aktivem Array 2: `pv1` → Array 1 (primär), `pv2` → Array 2 (sekundär). PV TOT zeigt den kombinierten Wert.
- `show_pv_strings` blendet PV TOT / Array 1 / Array 2 sowie `HOUSE TOT / INV 1 / INV 2` als getrennte Zeilen ein.

### Hintergrund & Fehlerbehebung (DE)

- Standardhintergrund: `/local/community/lumina-energy-card/lumina_background.png` (lege eigene Bilder neben die JS-Datei).
- Empfohlene Größe: 800×450 (16:9).
- Karte fehlt: Ressourceneintrag prüfen und Browser-Cache leeren.
- Nullwerte: Entitätsnamen und Sensorverfügbarkeit kontrollieren.
- Langsamer Editor: `update_interval` erhöhen oder Dashboard-Refresh reduzieren.

### Support & Lizenz (DE)

- Lizenz: MIT (siehe [LICENSE](LICENSE)).
- Issues & Feature-Wünsche: bitte im [GitHub-Repository](https://github.com/ratava/lumina-energy-card) melden.

### Changelog (DE)

- **1.1.25 (26.12.2025)** – Versionssprung (Details siehe vorherigen Eintrag).
- **1.1.20 (2025)** – Pfeil-Skalierung, Netzanimationsschwelle, EV-Panel-Toggle und Doku-Refresh.
- **1.1.18 (2025)** – Neue Animationsstile (Striche, Punkte, Pfeile) und Dokumentationsupdate.
- **1.1.13 (2025)** – Animations-Easing, Schutzlogik und 0-s-Intervall für Echtzeit-Refresh.
- **1.1.1 (2025)** – Lokalisierte Texte und Vorbereitung des Ein-Datei-Bundles.
- **1.1.0 (2025)** – Lokalisierte Konfigtabs (EN/IT/DE) innerhalb des Single-File-Bundles.
- **1.0.8 (2025)** – Typografie-Controls auf Textfelder mit EV-Einstellungen umgestellt.
- **1.0.7 (2025)** – Typografie-Controls in das neue Formularlayout zurückgeführt.
- **1.0.5 (2025)** – Lovelace-Editor mit nativen Selects und Sofort-Updates neu aufgebaut.
- **1.0.4 (2025)** – Editor ins Hauptbundle verschoben und lokalisierte Tabs ergänzt.
- **1.0.3 (2025)** – Animationsgeschwindigkeit skalierbar, Typografie-Slider und Inline-Beispiele.
- **1.0.2 (2025)** – Basiscode aktualisiert.
- **1.0.1 (2025)** – Distributables nach `dist/` verschoben und Anleitung angepasst.

## Nederlands

### Overzicht (NL)

De Lumina Energy Card is een aangepaste Lovelace-kaart voor Home Assistant die energie- en verbruiksstromen visualiseert. Ze combineert meerdere PV-strengen, batterijen, EV-laden en optionele warmtepompverbruikers in één kaart met animatie, kleur- en typografiecontrole.

### Belangrijkste functies (NL)

- Tot zes PV-sensoren met slimme labeling (per string of totaal) plus optionele tweede array.
- Tot vier batterijen met gemiddelde SOC, geanimeerde vloeivulling en waarschuwingen bij lage SOC.
- Animaties voor PV, batterij, net, huislast, EV en warmtepomp met configureerbare stijl (streepjes, punten, pijlen) en snelheid (-3× tot 3×; 0 pauzeert, negatieve waarden draaien om).
- Instelbare netdrempel (standaard 100 W) om kleine import-/exportwaarden te onderdrukken.
- EV-paneel met vermogen, SOC, kleuren en typografie, inclusief ondersteuning voor twee voertuigen.
- Dagelijkse import-/exporttellers (indien sensors aanwezig) plus badge voor PV-daginbreng.
- Typografie-instellingen per sectie (kop, PV, batterij, load, grid, EV, warmtepomp).
- Popups voor huis, PV en batterij (elk zes rijen) voor extra informatie.
- Dediceerde warmtepompoverlay en gesplitste netweergave `grid_to_house_inverter`.

### Installatie (NL)

#### HACS (NL)

1. Open HACS → **Frontend** in Home Assistant.
1. Klik op het menu met drie puntjes → **Custom repositories**.
1. Voeg `https://github.com/ratava/lumina-energy-card` toe als **Dashboard**-repository en bevestig.
1. Zoek **Lumina Energy Card** in de frontendlijst en installeer.
1. Herstart Home Assistant indien nodig en voeg de kaart toe via de Lovelace-editor.

#### Handmatig (NL)

1. Download `dist/lumina-energy-card.js` uit de [laatste release](https://github.com/ratava/lumina-energy-card/releases).
1. Plaats het bestand in `/config/www/community/lumina-energy-card/`.
1. Kopieer `dist/lumina_background.png` naar dezelfde map.
1. Voeg de Lovelace-resource toe:

```yaml
lovelace:
  resources:
    - url: /local/community/lumina-energy-card/lumina-energy-card.js
      type: module
```

1. Herstart Home Assistant zodat de resource beschikbaar is.

### Configuratie (NL)

1. Open het dashboard, klik **Kaart toevoegen** en kies **Lumina Energy Card**.
1. Selecteer de gewenste entiteiten en configureer de schakelaars/kleuren.
1. Stel `update_interval` in (0–60 s; 0 = direct vernieuwen).

Minimalistisch YAML-voorbeeld (NL):

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.pv_omvormer_1
sensor_daily: sensor.pv_dagopbrengst
sensor_bat1_soc: sensor.accu_soc
sensor_bat1_power: sensor.accu_vermogen
sensor_home_load: sensor.huis_verbruik
sensor_grid_power: sensor.net_vermogen
background_image: /local/community/lumina-energy-card/lumina_background.png
```

### Opties (NL)

| Optie | Type | Standaard | Toelichting |
| --- | --- | --- | --- |
| `card_title` | Tekst | — | Optionele titel bovenaan; leeg laat de titel weg. |
| `background_image` | Tekst | `/local/community/lumina-energy-card/lumina_background.png` | Hoofdachtergrond (16:9) of eigen afbeelding. |
| `language` | Tekst | `en` | UI-taal (`en`, `it`, `de`, `fr`, `nl`). |
| `display_unit` | Tekst | `kW` | Kies tussen `kW` en `W`. |
| `update_interval` | Nummer | `30` | Updatefrequentie in seconden (0–60; stap 5). |
| `animation_speed_factor` | Nummer | `1` | Animatiesnelheid (-3 tot 3; 0 pauzeert; negatief = omgekeerd). |
| `animation_style` | Tekst | `dashes` | Animatiestijl (`dashes`, `dots`, `arrows`). |
| `header_font_size` | Nummer | `16` | Tekengrootte titel (12–32 px). |
| `daily_label_font_size` | Nummer | `12` | Labelgrootte dagopbrengst (8–24 px). |
| `daily_value_font_size` | Nummer | `20` | Waardegrootte dagopbrengst (12–32 px). |
| `pv_font_size` | Nummer | `16` | PV-tekst (12–28 px). |
| `battery_soc_font_size` | Nummer | `20` | SOC-tekst (12–32 px). |
| `battery_power_font_size` | Nummer | `14` | Batterijvermogen (10–28 px). |
| `load_font_size` | Nummer | `15` | Huislast (10–28 px). |
| `grid_font_size` | Nummer | `15` | Netlabel (10–28 px). |
| `heat_pump_font_size` | Nummer | `16` | Warmtepomplabel (10–28 px). |
| `car_power_font_size` | Nummer | `15` | Vermogen EV 1 (10–28 px). |
| `car2_power_font_size` | Nummer | `15` | Vermogen EV 2 (fallback EV 1). |
| `car_soc_font_size` | Nummer | `12` | SOC EV 1 (8–24 px). |
| `car2_soc_font_size` | Nummer | `12` | SOC EV 2 (fallback EV 1). |
| `car_name_font_size` | Nummer | `15` | Naam EV 1. |
| `car2_name_font_size` | Nummer | `15` | Naam EV 2. |
| `sensor_pv_total` | Entiteit | — | Totale PV-output. Vereist indien geen individuele strengen zijn opgegeven. |
| `sensor_pv1` .. `sensor_pv6` | Entiteiten | — | PV-strengen voor array 1. Minstens één streng of totaal nodig. |
| `show_pv_strings` | Boolean | `false` | Toont PV TOTAL + individuele strengen (en, indien ingesteld, array 2). |
| `sensor_daily` | Entiteit | — | Dagelijkse PV-opbrengst (vereist). |
| `sensor_bat1_soc` | Entiteit | — | SOC batterij 1 (vereist voor batterijweergave). |
| `sensor_bat1_power` | Entiteit | — | Vermogen batterij 1 (vereist voor batterijweergave). |
| `sensor_home_load` | Entiteit | — | Huisverbruik (vereist). |
| `sensor_grid_power` | Entiteit | — | Actuele netbalans (vereist, tenzij import/export-sensors zijn ingesteld). |
| `sensor_grid_import` | Entiteit | — | Positieve import. |
| `sensor_grid_export` | Entiteit | — | Positieve export. |
| `sensor_grid_import_daily` | Entiteit | — | Dagelijkse importteller. |
| `sensor_grid_export_daily` | Entiteit | — | Dagelijkse exportteller. |
| `show_daily_grid` | Boolean | `false` | Toont dagimport/-export boven de livewaarde. |
| `show_grid_flow_label` | Boolean | `true` | Plaatst "Importeert"/"Exporteert" vóór de netwaarde. |
| `sensor_heat_pump_consumption` | Entiteit | — | Activeert warmtepompoverlay. |
| `sensor_car_power` / `sensor_car_soc` | Entiteiten | — | EV 1 vermogen/SOC. |
| `sensor_car2_power` / `sensor_car2_soc` | Entiteiten | — | EV 2 vermogen/SOC. |
| `show_car_soc` | Boolean | `false` | Toont EV-paneel (vermogen + SOC). |
| `show_car2` | Boolean | `false` | Activeert EV 2 wanneer sensors beschikbaar zijn. |
| `car_flow_color` | Tekst | `#00FFFF` | Kleur EV-animatie. |
| `car1_color` / `car2_color` | Tekst | `#FFFFFF` | Tekstkleur EV-vermogen. |
| `car_pct_color` / `car2_pct_color` | Tekst | `#00FFFF` | Tekstkleur EV-SOC. |
| `car1_name_color` / `car2_name_color` | Tekst | `#FFFFFF` | Naamkleur EV-paneel. |
| `pv_primary_color` | Tekst | `#0080ff` | Hoofd PV-animatie. |
| `pv_secondary_color` | Tekst | `#80ffff` | Secundaire PV-animatie. |
| `pv_tot_color` | Tekst | `#00FFFF` | PV TOTAL-label. |
| `load_flow_color` | Tekst | `#0080ff` | Animatie huislast. |
| `load_text_color` | Tekst | `#FFFFFF` | Tekstkleur voor huisverbruik wanneer er geen drempel actief is. |
| `load_threshold_warning` | Nummer | — | Waarschuwingsdrempel (W/kW). |
| `load_warning_color` | Tekst | `#ff8000` | Waarschuwing kleur. |
| `load_threshold_critical` | Nummer | — | Kritieke drempel. |
| `load_critical_color` | Tekst | `#ff0000` | Kritieke kleur. |
| `battery_soc_color` | Tekst | `#FFFFFF` | Kleur voor de batterij-SOC-tekst. |
| `battery_charge_color` | Tekst | `#00FFFF` | Kleur laadstroom. |
| `battery_discharge_color` | Tekst | `#FFFFFF` | Kleur ontlaadstroom. |
| `grid_import_color` | Tekst | `#FF3333` | Kleur netimport. |
| `grid_export_color` | Tekst | `#00ff00` | Kleur netexport. |
| `heat_pump_flow_color` | Tekst | `#FFA500` | Kleur warmtepompflow. |
| `heat_pump_text_color` | Tekst | `#FFA500` | Labelkleur warmtepomp. |
| `battery_fill_high_color` | Tekst | `#00ffff` | Kleur voor SOC boven drempel. |
| `battery_fill_low_color` | Tekst | `#ff0000` | Kleur onder de drempel. |
| `battery_fill_low_threshold` | Nummer | `25` | SOC-percentage voor lage kleur. |
| `grid_activity_threshold` | Nummer | `100` | Minimum netverbruik voor animatie (W). |
| `grid_threshold_warning` | Nummer | — | Waarschuwingsdrempel net. |
| `grid_warning_color` | Tekst | `#ff8000` | Waarschuwingskleur net. |
| `grid_threshold_critical` | Nummer | — | Kritieke drempel net. |
| `grid_critical_color` | Tekst | `#ff0000` | Kritieke kleur net. |
| `invert_grid` | Boolean | `false` | Draait de netpolariteit om indien import/export zijn omgekeerd. |
| `invert_battery` | Boolean | `false` | Draait batterijpolariteit, kleuren en animatie om. |

### Automatisch netpad (NL)

De kaart kiest nu zelf welk netpad gebruikt wordt:

- Zodra er een PV-totaal (`sensor_pv_total`) of minstens één Array 1-streng actief is, loopt de animatie via de omvormer zoals voorheen.
- Laat je Array 1 volledig leeg (geen `sensor_pv_total`, geen strengen), dan gaat de kaart ervan uit dat je rechtstreeks vanaf het net draait: de pijl volgt het huispad en de PV-UI (dagopbrengstbadge + PV-popup) wordt verborgen.

De oude grid→house-toggle is verwijderd; haal `grid_flow_mode` uit je YAML. Detectie gebeurt nu elke render en `grid_activity_threshold` bepaalt nog steeds wanneer de animatie start.

### Popups (NL)

De vijf popupgroepen (PV, Huis, Batterij, Net, Omvormer) bieden elk zes plaatsen met entiteit, optionele naam, kleur en lettergrootte. Waarden worden weergegeven zoals ze zijn om het gebruik van numerieke of tekstuele sensoren mogelijk te maken.

- PV Popup
  - `sensor_popup_pv_1` .. `sensor_popup_pv_6` : entiteiten om weer te geven.
  - `sensor_popup_pv_1_name` .. `sensor_popup_pv_6_name` : optionele aangepaste namen.
  - `sensor_popup_pv_1_color` .. `sensor_popup_pv_6_color` : kleuren per regel (standaard `#80ffff`).
  - `sensor_popup_pv_1_font_size` .. `sensor_popup_pv_6_font_size` : lettergroottes (px) (standaard `14`).
  - Klikbare gebieden: het dagelijkse productiebadge en zonnepanelen openen/sluiten de popup; klikken op de popup verbergt deze.

- Huis Popup
  - `sensor_popup_house_1` .. `sensor_popup_house_6` : entiteiten om weer te geven.
  - `sensor_popup_house_1_name` .. `sensor_popup_house_6_name` : optionele namen.
  - `sensor_popup_house_1_color` .. `sensor_popup_house_6_color` : kleuren (standaard `#80ffff`).
  - `sensor_popup_house_1_font_size` .. `sensor_popup_house_6_font_size` : lettergroottes (px) (standaard `14`).
  - Het huis is klikbaar om de popup te openen/sluiten; klikken op de popup sluit deze.

- Batterij Popup
  - `sensor_popup_bat_1` .. `sensor_popup_bat_6` : entiteiten om weer te geven.
  - `sensor_popup_bat_1_name` .. `sensor_popup_bat_6_name` : optionele namen.
  - `sensor_popup_bat_1_color` .. `sensor_popup_bat_6_color` : kleuren (standaard `#80ffff`).
  - `sensor_popup_bat_1_font_size` .. `sensor_popup_bat_6_font_size` : lettergroottes (px) (standaard `16`).
  - De batterij is klikbaar; klikken erop opent/sluit de popup, klikken op de popup sluit deze.

- Net Popup
  - `sensor_popup_grid_1` .. `sensor_popup_grid_6` : entiteiten om weer te geven.
  - `sensor_popup_grid_1_name` .. `sensor_popup_grid_6_name` : optionele namen.
  - `sensor_popup_grid_1_color` .. `sensor_popup_grid_6_color` : kleuren (standaard `#80ffff`).
  - `sensor_popup_grid_1_font_size` .. `sensor_popup_grid_6_font_size` : lettergroottes (px) (standaard `16`).
  - De netsectie is klikbaar om de popup te openen/sluiten; klikken op de popup sluit deze.

- Omvormer Popup
  - `sensor_popup_inverter_1` .. `sensor_popup_inverter_6` : entiteiten om weer te geven.
  - `sensor_popup_inverter_1_name` .. `sensor_popup_inverter_6_name` : optionele namen.
  - `sensor_popup_inverter_1_color` .. `sensor_popup_inverter_6_color` : kleuren (standaard `#80ffff`).
  - `sensor_popup_inverter_1_font_size` .. `sensor_popup_inverter_6_font_size` : lettergroottes (px) (standaard `16`).
  - De omvormersectie is klikbaar om de popup te openen/sluiten; klikken op de popup sluit deze.

### Array 2 & extra opties (NL)

| Optie | Type | Standaard | Toelichting |
| --- | --- | --- | --- |
| `sensor_pv_total_secondary` | Entiteit | — | Extra totaal voor tweede omvormer; wordt bij PV TOTAL opgeteld. |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6` | Entiteiten | — | Tweede set PV-strengen; zichtbaar met `show_pv_strings`. |
| `sensor_daily_array2` | Entiteit | — | Dagopbrengst voor array 2; totaal = array1 + array2. |
| `sensor_home_load_secondary` | Entiteit | — | Secundaire huislast voor INV2/HOUSE TOT wanneer array 2 actief is. |
| `house_total_color`, `inv1_color`, `inv2_color` | Tekst | — | Lijnkleuren voor HOUSE TOT / INV 1 / INV 2. |
| `invert_battery` | Boolean | `false` | Draait batterijpolariteit, kleuren en animatie om. |

Tips:

- Met array 2 actief geeft PV TOT beide arrays weer, terwijl `show_pv_strings` PV TOTAL, ARRAY 1, ARRAY 2 en individuele strings toont.
- EV-sectie gebruikt `car_flow_color`, `car*_color`, `car*_name_color` en `car*_soc_font_size` voor twee voertuigen.

### Achtergrond & probleemoplossing (NL)

- Standaardachtergrond: `/local/community/lumina-energy-card/lumina_background.png` (bewaar je eigen assets in dezelfde map als de JS-file).
- Aanbevolen resolutie 800×450 (16:9) voor optimale uitlijning.
- Kaart niet zichtbaar? Controleer of de resource is geladen en leeg de browsercache.
- Nullwaarden? Controleer sensor-ID's en of de entiteiten updates ontvangen.
- Trage editor? Verhoog `update_interval` of verminder dashboard-refreshes.

### Support & licentie (NL)

- Licentie: MIT, zie [LICENSE](LICENSE).
- Bugs/feature requests: open een issue op [GitHub](https://github.com/ratava/lumina-energy-card).

### Changelog (NL)

- **1.1.25 (26-12-2025)** – Versie-opschoning (zie eerder log).
- **1.1.20 (2025)** – Pijl-scaling, netdrempel, EV-paneel, documentatie-update.
- **1.1.18 (2025)** – Nieuwe animatiestijlen (streepjes/punten/pijlen) + documentatie.
- **1.1.13 (2025)** – Animatie-easing, failsafes en 0 s-interval voor live refresh.
- **1.1.1 (2025)** – Gelokaliseerde teksten en bundling in één bestand.
- **1.1.0 (2025)** – Gelokaliseerde configuratietabs (EN/IT/DE) in het hoofdscript.
- **1.0.8 (2025)** – Tekstvelden en EV-instellingen toegevoegd aan typografiepanelen.
- **1.0.7 (2025)** – Typografiebediening teruggebracht in het nieuwe formulier.
- **1.0.5 (2025)** – Lovelace-editor opnieuw opgebouwd met native selects en live updates.
- **1.0.4 (2025)** – Editor naar het hoofdscript verplaatst en tabbladen gelokaliseerd.
- **1.0.3 (2025)** – Animatiesnelheidsfactor, typografie-sliders en inline voorbeelden.
- **1.0.2 (2025)** – Basiscode bijgewerkt.
- **1.0.1 (2025)** – Distributables verplaatst naar `dist/` en instructies aangepast.

## Repository Details

- `hacs.json` declares the card as a frontend resource (`content_in_root: false`) and points to `dist/lumina-energy-card.js`.
- `.github/workflows/hacs-validation.yml` runs the official HACS validation action on pushes, pull requests, and manual triggers.
- `CODEOWNERS` registers @Giorgio866 and @ratava as maintainers for automated reviews.
- The project is released under the MIT License (see [LICENSE](LICENSE)).

---

© 2025 ratava, Giorgio866, and contributors. Released under the MIT License.
