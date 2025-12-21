# Lumina Energy Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)

![Lumina Energy Card Background](dist/lumina_background.jpg)

**Language / Lingua:** [English](#english) | [Italiano](#italiano) | [Deutsch](#deutsch)

---

## Quick Install (Custom HACS Repository)

1. Open HACS in Home Assistant and choose **Frontend**.
1. Click the three-dot menu and select **Custom repositories**.
1. Paste `https://github.com/Giorgio866/lumina-energy-card`, set the category to **Frontend**, and click **Add**.
1. Close the dialog, locate **Lumina Energy Card** in the Frontend list, and install it.
1. Restart Home Assistant if requested, then add the card from the Lovelace visual editor.

---

## English

### Overview (EN)

Lumina Energy Card is a Home Assistant custom Lovelace card that renders animated energy flows, aggregates PV strings and batteries, and surfaces optional EV charging metrics in a cinematic layout.

![Lumina Energy Card Preview](dist/lumina_background.jpg)

### Key Features (EN)

- Up to six PV sensors with smart per-string or totalised labels
- Up to four battery systems with SOC averaging and liquid-fill battery visualisation
- Animated grid, load, PV, battery and EV flows with dynamic colour and speed
- Optional EV panel with power and SOC display, including custom colour
- Daily production badge, custom card title, background, and unit selection
- Update interval slider (10–60 s, default 30 s) with throttled rendering when editing

### Installation (EN)

#### HACS (EN)

1. Open HACS in Home Assistant and choose **Frontend**.
1. Use the three-dot menu → **Custom repositories**.
1. Enter `https://github.com/Giorgio866/lumina-energy-card`, pick **Frontend**, and click **Add**.
1. Locate **Lumina Energy Card** under Frontend and click **Install**.
1. Restart Home Assistant if prompted.

#### Manual Installation (EN)

1. Download `dist/lumina-energy-card.js` from the [latest release](https://github.com/Giorgio866/Energy-Dashboard-Updated/releases).
1. Copy the file to `config/www/community/lumina-energy-card/`.
1. Place `dist/lumina_background.jpg` in the same directory.
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
background_image: /local/community/lumina-energy-card/lumina_background.jpg
```

### Options (EN)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `card_title` | string | `LUMINA ENERGY` | Optional header text |
| `background_image` | string | `/local/community/lumina-energy-card/lumina_background.jpg` | Background asset path |
| `language` | string | `en` | Accepts `en`, `it`, or `de` |
| `display_unit` | string | `kW` | Display values in `W` or `kW` |
| `update_interval` | number | `30` | Refresh cadence (10–60, step 10) |
| `sensor_pv1` | entity | — | Primary PV sensor (required) |
| `sensor_daily` | entity | — | Daily production sensor (required) |
| `sensor_bat1_soc` | entity | — | Battery SOC sensor (required) |
| `sensor_bat1_power` | entity | — | Battery power sensor (required) |
| `sensor_home_load` | entity | — | Home load sensor (required) |
| `sensor_grid_power` | entity | — | Grid import/export sensor (required) |
| `invert_grid` | boolean | `false` | Flip grid sign if needed |
| `sensor_car_power` | entity | — | Optional EV charging power |
| `sensor_car_soc` | entity | — | Optional EV SOC sensor |
| `show_car_soc` | boolean | `false` | Enable EV SOC text |
| `car_pct_color` | string | `#00FFFF` | EV SOC text colour |

### Background & Troubleshooting (EN)

- Default background: `/local/community/lumina-energy-card/lumina_background.jpg` (copy your image next to the JS file to customise).
- Recommended dimensions: 800×450 (16:9).
- Missing card: ensure the resource entry exists and clear browser cache.
- Zero readings: confirm entity IDs and sensor availability.
- Editor lag: increase `update_interval` or reduce dashboard refresh load.

### Support & License (EN)

- License: MIT (see [LICENSE](LICENSE)).
- Issues & feature requests: submit via [GitHub](https://github.com/Giorgio866/Energy-Dashboard-Updated).

### Changelog (EN)

- **1.0.1 (2025)** – Moved distributable files into `dist/` and aligned manual install docs with new filenames.

---

## Italiano

### Panoramica (IT)

Lumina Energy Card è una scheda Lovelace per Home Assistant che offre grafica animata dei flussi energetici, gestione di stringhe FV multiple, batterie e monitor EV opzionale in un'unica interfaccia.

### Funzionalità Chiave (IT)

- Fino a 6 sensori fotovoltaici con etichettatura intelligente
- Fino a 4 batterie con media SOC e visualizzazione liquida 3D
- Flussi animati con colori dinamici per rete, casa, FV, batterie ed EV
- Pannello EV opzionale con potenza e SOC personalizzabili
- Badge produzione giornaliera, titolo, sfondo e unità configurabili
- Slider intervallo aggiornamento (10–60 s) con blocco degli aggiornamenti durante l'editing

### Installazione HACS (IT)

1. Apri HACS → **Frontend**.
1. Menu a tre puntini → **Repository personalizzati**.
1. Inserisci `https://github.com/Giorgio866/lumina-energy-card`, seleziona **Frontend** e premi **Aggiungi**.
1. Installa **Lumina Energy Card** dalla sezione Frontend.
1. Riavvia Home Assistant se richiesto.

### Installazione Manuale (IT)

1. Scarica `dist/lumina-energy-card.js` dall'[ultima release](https://github.com/Giorgio866/Energy-Dashboard-Updated/releases).
1. Copia il file in `config/www/community/lumina-energy-card/`.
1. Copia `dist/lumina_background.jpg` nella stessa cartella.
1. Aggiungi la risorsa Lovelace come mostrato nella sezione inglese.
1. Riavvia Home Assistant.

### Configurazione Rapida (IT)

- Aggiungi la scheda tramite editor visivo e seleziona le entità con gli entity picker.
- YAML minimo:

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.produzione_solare
sensor_daily: sensor.produzione_giornaliera
sensor_bat1_soc: sensor.batteria_soc
sensor_bat1_power: sensor.batteria_potenza
sensor_home_load: sensor.consumo_casa
sensor_grid_power: sensor.potenza_rete
background_image: /local/community/lumina-energy-card/lumina_background.jpg
```

### Suggerimenti (IT)

- Obbligatori: `sensor_pv1`, `sensor_daily`, `sensor_bat1_soc`, `sensor_bat1_power`, `sensor_home_load`, `sensor_grid_power`.
- Per uno sfondo personalizzato copia l'immagine nella stessa cartella del JS e aggiorna `background_image`.
- Imposta `invert_grid: true` se i valori di rete risultano invertiti.

---

## Deutsch

### Überblick (DE)

Die Lumina Energy Card zeigt animierte Energieflüsse in Home Assistant, unterstützt mehrere PV-Stränge, Batteriespeicher und eine optionale EV-Anzeige.

### Wichtige Funktionen (DE)

- Bis zu 6 PV-Sensoren mit intelligenter Beschriftung
- Bis zu 4 Batteriesysteme mit SOC-Durchschnitt und kombiniertem Leistungswert
- Animierte Leitungen für Netz, Haus, PV, Batterie und EV mit Farbcodierung
- Optionales EV-Panel inklusive SOC-Farbe
- Tagesertrag, Kartentitel, Hintergrund und Einheiten anpassbar
- Update-Intervall-Regler (10–60 s) verhindert unnötige Aktualisierungen im Editor

### Installation HACS (DE)

1. Öffne HACS und wähle **Frontend**.
1. Dreipunkt-Menü → **Benutzerdefinierte Repositories**.
1. Trage `https://github.com/Giorgio866/lumina-energy-card` ein, wähle **Frontend** und klicke **Hinzufügen**.
1. Installiere **Lumina Energy Card** aus Frontend.
1. Starte Home Assistant bei Bedarf neu.

### Manuelle Installation (DE)

1. Lade `dist/lumina-energy-card.js` aus dem [aktuellen Release](https://github.com/Giorgio866/Energy-Dashboard-Updated/releases).
1. Kopiere die Datei nach `config/www/community/lumina-energy-card/`.
1. Lege `dist/lumina_background.jpg` im selben Ordner ab.
1. Ergänze die Lovelace-Ressource wie im englischen Abschnitt.
1. Starte Home Assistant neu.

### Schnelle Konfiguration (DE)

- Karte über den visuellen Editor hinzufügen und Entitäten wählen.
- Minimales YAML:

```yaml
type: custom:lumina-energy-card
sensor_pv1: sensor.pv_leistung
sensor_daily: sensor.pv_tagessumme
sensor_bat1_soc: sensor.batterie_soc
sensor_bat1_power: sensor.batterie_leistung
sensor_home_load: sensor.hausverbrauch
sensor_grid_power: sensor.netzleistung
background_image: /local/community/lumina-energy-card/lumina_background.jpg
```

### Hinweise (DE)

- Pflichtwerte: PV1, Daily, Batterie SOC/Power, Hauslast, Netzleistung.
- Für eigene Hintergründe Bild neben die JS-Datei kopieren und `background_image` anpassen.
- Bei invertierten Netz-Werten `invert_grid: true` setzen.

---

## Repository Details

- `hacs.json` declares the card as a frontend resource (`content_in_root: false`) and points to `dist/lumina-energy-card.js`.
- `.github/workflows/hacs-validation.yml` runs the official HACS validation action on pushes, pull requests, and manual triggers.
- `CODEOWNERS` registers @Giorgio866 and @ratava as maintainers for automated reviews.
- The project is released under the MIT License (see [LICENSE](LICENSE)).

---

© 2025 Giorgio866 and contributors. Released under the MIT License.
