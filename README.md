# 🧠 Segundo Cerebro

Sistema de productividad personal basado en el método de Tiago Forte (PARA).
Construido con React 18 + Vite + PWA.

## Stack

- **React 18** — UI con hooks y Suspense
- **Vite 5** — Build ultrarrápido con code splitting
- **vite-plugin-pwa** — PWA installable con Workbox
- **IA:** Gemini 2.5 Flash (via Google AI API)
- **Storage:** localStorage (primario) + window.storage (fallback)

## Estructura del proyecto

```
src/
├── App.jsx                    # Router thin — 408 líneas (era 11,516)
├── main.jsx                   # Entry point
├── theme/
│   └── tokens.js              # DARK_THEME, LIGHT_THEME, T proxy
├── storage/
│   └── index.js               # save(), load()
├── utils/
│   └── helpers.js             # uid(), today(), fmt()
├── context/
│   ├── AppContext.jsx          # useReducer + Provider (Phase 2 ready)
│   └── initialData.js         # Datos iniciales del sistema
├── components/
│   ├── ui/index.jsx            # Modal, Input, Btn, Card, etc.
│   ├── charts/index.jsx        # Ring, Sparkline, HeatMap, etc.
│   └── icons/Icon.jsx          # Icon component (SVG inline)
└── modules/                   # Cada módulo = su propio archivo
    ├── Dashboard.jsx           # Mi Día — Panel de control
    ├── Objectives.jsx          # Sistema SMART
    ├── HabitTracker.jsx        # Tracker de hábitos
    ├── Journal.jsx             # Diario personal
    ├── Notes.jsx               # Notas y recursos
    ├── Finance.jsx             # Finanzas personales
    ├── Health.jsx              # Salud integral
    ├── Books.jsx               # Biblioteca digital
    ├── Relaciones.jsx          # CRM personal
    ├── Hogar.jsx               # Hogar y mantenimiento
    ├── Vehiculos.jsx           # Vehículos
    ├── SideProjects.jsx        # Side Projects
    ├── DesarrolloPersonal.jsx  # Desarrollo personal
    ├── Psicke.jsx              # IA assistant (Gemini)
    ├── Onboarding.jsx          # Onboarding personalizado
    ├── Settings.jsx            # Configuración
    ├── Shopping.jsx            # Lista de compras
    ├── Education.jsx           # Módulo académico
    ├── TrabajoEmbed.jsx        # Trabajo embed
    ├── GlobalSearch.jsx        # Búsqueda global (Cmd+K)
    ├── Toast.jsx               # Sistema de notificaciones
    ├── AppLoader.jsx           # Loading skeleton
    ├── ErrorBoundary.jsx       # Error boundary
    └── navConfig.js            # NAV_SECTIONS, MOBILE_NAV
```

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy en Vercel

1. Conectar repo a Vercel
2. Framework: Vite
3. Build command: `npm run build`
4. Output dir: `dist`

## Roadmap de módulos pendientes

| Módulo           | Estado    | Fase |
|------------------|-----------|------|
| Nutrición        | Pendiente | 3    |
| Viajes           | Pendiente | 3    |
| Entretenimiento  | Pendiente | 3    |
| Mascotas         | Pendiente | 3    |
| Sueño            | Pendiente | 2    |
| Fitness avanzado | Parcial   | 2    |
| CRM completo     | Parcial   | 2    |
| Academia         | Parcial   | 2    |

## API Key de Gemini

Obtener gratis en https://aistudio.google.com/apikey
Se configura en Ajustes → IA dentro de la app.
