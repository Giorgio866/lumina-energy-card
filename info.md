# Lumina Energy Dashboard (Ultimate Edition)

An advanced energy flow visualization card for Home Assistant with support for:

- **Multiple PV Strings**: Up to 6 individual solar/PV sensors
- **Multiple Batteries**: Up to 4 battery systems with SOC and power tracking
- **Real-time Energy Flows**: Animated visualization of energy movement
- **EV Charging**: Optional electric vehicle power and SOC display
- **Multi-language Support**: English, Italian, and German
- **Customizable Display**: Choose between W or kW units
- **3D Battery Visualization**: Liquid-fill style battery display with dynamic level

## Features

- Beautiful animated energy flow paths with speed based on power levels
- Dynamic color coding (cyan for normal flow, red for grid import, white for battery charging)
- Responsive SVG graphics that scale to any card size
- Support for grid import/export with optional value inversion
- Daily production total display
- Customizable background image
- Professional "Orbitron" font for title display
- Pulsing glow effects on active elements

## Installation

Install via HACS or manually by placing the files from `dist/` (for example `lumina-energy-card.js`) in `/config/www/community/lumina-energy-card/`.

### HACS Installation (English)

1. Open HACS in Home Assistant and navigate to "Frontend".
2. Click the three-dot menu and choose "Custom repositories" if the card is not yet listed.
3. Enter `https://github.com/Giorgio866/lumina-energy-card`, select "Frontend" as category, and click "Add".
4. Close the dialog, search for "Lumina Energy Dashboard" in HACS, and install it.
5. Copy the files from `dist/` (JS, editor, background) to `/config/www/community/lumina-energy-card/` and restart Home Assistant.

### Installazione HACS (Italiano)

1. Apri HACS in Home Assistant e vai in "Frontend".
2. Se la scheda non è presente, clicca sui tre puntini e scegli "Repository personalizzati".
3. Inserisci `https://github.com/Giorgio866/lumina-energy-card`, imposta la categoria su "Frontend" e clicca su "Aggiungi".
4. Chiudi la finestra, cerca "Lumina Energy Dashboard" in HACS e procedi con l'installazione.
5. Copia i file in `dist/` (JS, editor, immagine) in `/config/www/community/lumina-energy-card/` e riavvia Home Assistant.

### HACS-Installation (Deutsch)

1. Öffne HACS in Home Assistant und wechsle zu "Frontend".
2. Falls die Karte noch fehlt, klicke auf das Dreipunkt-Menü und wähle "Benutzerdefinierte Repositories".
3. Gib `https://github.com/Giorgio866/lumina-energy-card` ein, setze die Kategorie auf "Frontend" und klicke auf "Hinzufügen".
4. Schließe den Dialog, suche in HACS nach "Lumina Energy Dashboard" und installiere die Karte.
5. Kopiere die Dateien aus `dist/` (JS, Editor, Hintergrund) nach `/config/www/community/lumina-energy-card/` und starte Home Assistant neu.
