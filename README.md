# Tableau de bord de supervision énergétique

Dashboard web interactif qui simule ou récupère des données de consommation /
production électrique. Conçu pour présenter une supervision claire, des alertes
et des exports utiles à la prise de décision.

## Aperçu

- Authentification simple (démo)
- API Node/Express avec données simulées ou réelles (Open‑Meteo)
- Graphiques interactifs (consommation, production, alertes)
- Filtres par période + export CSV / PDF
- Notifications visuelles de dépassement de seuils

## Stack

- Front: React + Vite, Recharts, React Router, React Toastify
- Back: Node.js + Express
- Exports: CSV + PDF (jsPDF)

## Démarrage rapide

### 1) Lancer l'API Node/Express

```bash
cd "server"
npm install
npm run dev
```

API disponible sur `http://localhost:4000`.

### 2) Lancer le front React

```bash
cd "client"
npm install
npm run dev
```

Ouvrir l'URL indiquée par Vite (ex: `http://localhost:5173`).

## Utilisation

1. Se connecter avec n'importe quels identifiants (mode démo).
2. Choisir une période, une source (Simulée / Open‑Meteo) et une zone.
3. Exporter les données en CSV ou PDF.
4. Lire les alertes générées selon les seuils.

## Endpoints API

- `POST /api/login`  
  Corps: `{ "username": "...", "password": "..." }`

- `GET /api/metrics`  
  Paramètres:  
  - `from` (ISO) et `to` (ISO)  
  - `source=simulated|real`  
  - `lat` et `lon` (si `source=real`)

- `GET /api/health`

Exemple:
```
http://localhost:4000/api/metrics?from=2026-01-01T00:00:00&to=2026-01-02T23:59:59&source=real&lat=48.8566&lon=2.3522
```

## Captures d'écran

Ajoutez vos images dans `docs/screens/` puis mettez les liens ici:

- `docs/screens/login.png`
- `docs/screens/dashboard.png`
- `docs/screens/exports.png`
- `docs/screens/alerts.png`

## Notes

- Les données Open‑Meteo servent de proxy pour un scénario énergétique réaliste.
- Le backend repasse automatiquement en simulation si l'API publique échoue.
