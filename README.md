# 🧠 Segundo Cerebro

Sistema integral de gestión personal basado en el método PARA de Tiago Forte.
Construido con React 18 + Vite + PWA. Desplegado en [o-two.vercel.app](https://o-two.vercel.app).

## Stack

- **React 18** — UI con hooks, lazy loading y Suspense
- **Vite 5** — Build ultrarrápido con code splitting automático
- **vite-plugin-pwa** — PWA instalable con Workbox (offline-ready)
- **IA:** Gemini 2.5 Flash (via Google AI Studio API)
- **Storage:** localStorage (primario) + window.storage (fallback)

---

## Módulos disponibles

### 🏠 Core
| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Panel de control diario — KPIs, tareas de hoy, hábitos, captura rápida, Pomodoro integrado |
| **Psicke** | Asistente IA (Gemini) — guarda datos con acciones JSON, roadmap SMART, historial persistente |
| **Inbox** | Bandeja de entrada rápida — captura sin fricciones |
| **GlobalSearch** | Búsqueda global (Cmd+K) entre todos los módulos |

### 🎯 Productividad
| Módulo | Descripción |
|--------|-------------|
| **Objetivos** | Sistema SMART — wizard de 4 pasos (Específico/Medible/Alcanzable/Tiempo), check-ins semanales, milestones, barra de progreso calculada desde tareas |
| **Tareas** | Gestión de tareas por proyecto, prioridades, drag & drop, deadlines |
| **HabitTracker** | Tracker diario con rachas, heatmap, vinculación a objetivos. Incluye **Desafío 21 días** con grid de progreso |
| **Notes** | Notas con markdown, búsqueda, etiquetas |
| **SideProjects** | Gestión de proyectos paralelos — tareas, milestones, time logs |
| **DesarrolloPersonal** | Retrospectivas, ideas, aprendizajes |

### 💰 Finanzas
| Módulo | Descripción |
|--------|-------------|
| **Finanzas** | Presupuesto mensual, transacciones, balance, gráficas de evolución |

### ❤️ Salud
| Módulo | Descripción |
|--------|-------------|
| **Health** | Métricas (peso, sueño, energía, pasos), workouts, medicamentos, metas. Nuevo tab **🩺 Médico**: historial de visitas por especialista, analíticas y documentos médicos |
| **Nutrición** | Menú semanal (4 comidas/día), recetario con ingredientes/pasos/calorías, sincronización con lista de compras |
| **Sueño** | Registro diario (horas, calidad, interrupciones), gráfica 14 noches vs. meta, checklist de higiene del sueño, diario de sueños |

### 🏡 Hogar y Vehículos
| Módulo | Descripción |
|--------|-------------|
| **Hogar** | Mantenimientos, documentos del hogar, contactos de servicios |
| **Vehículos** | Multi-vehículo — mantenimientos, gastos, documentos, recordatorios |

### 👥 Relaciones
| Módulo | Descripción |
|--------|-------------|
| **Relaciones** | CRM personal — personas, seguimientos, historial de interacciones |

### 📚 Conocimiento
| Módulo | Descripción |
|--------|-------------|
| **Books** | Biblioteca personal — lecturas, estado, notas por libro |
| **Education** | Módulo académico — cursos, recursos, progreso |
| **Shopping** | Lista de compras inteligente — recibe ingredientes automáticamente desde Nutrición |

### ✈️ Estilo de Vida
| Módulo | Descripción |
|--------|-------------|
| **Entretenimiento** | Películas, series y documentales — filtros por tipo/estado/plataforma, valoración por estrellas, seguimiento de temporadas |
| **Mascotas** | Perfil de mascotas, historial de vacunas con próxima dosis, visitas al veterinario |
| **Viajes** | Lista de deseos/planificado/visitado, itinerario con línea de tiempo, checklist, gastos con barra de presupuesto |

### 📔 Personal
| Módulo | Descripción |
|--------|-------------|
| **Journal** | Diario personal con estados de ánimo, gratitud e intención. Nuevo tab **⭐ Momentos Inolvidables**: guarda recuerdos por categoría, con personas y tags |

---

## Funciones transversales

- **Pomodoro** en Dashboard — timer circular SVG con fases enfoque/descanso/descanso largo, niveles de energía, contador de sesiones
- **Psicke IA** — acciones de guardado estructurado en JSON para todos los módulos, confirmación de roadmap SMART, historial conversacional persistente
- **Notificaciones locales** — push notifications via Service Worker
- **PWA instalable** — icono 🧠, funciona offline, back button de Android
- **GlobalSearch** — búsqueda unificada (Cmd+K / barra superior)
- **Tema oscuro/claro** — toggle en header
- **Backup/restore** — exportar e importar JSON desde Ajustes
- **Revisión semanal** — modo guiado en Ajustes
- **Tutorial integrado** — objetivo con 8 tareas que guían al usuario nuevo

---

## Estructura del proyecto

```
src/
├── App.jsx                      # Router principal con lazy loading
├── main.jsx
├── theme/
│   └── tokens.js                # DARK_THEME, LIGHT_THEME, T proxy
├── storage/
│   └── index.js                 # save(), load()
├── utils/
│   ├── helpers.js               # uid(), today(), fmt()
│   └── notifications.js         # Push notifications via SW
├── context/
│   └── initialData.js           # Estado inicial de todos los módulos
├── components/
│   ├── ui/index.jsx             # Modal, Input, Btn, Card, Select, Tag…
│   ├── charts/index.jsx         # Ring, Sparkline, HeatMap, BarChart…
│   └── icons/Icon.jsx           # SVG inline (brain, car, paw, plane, fork, moon…)
└── modules/
    ├── Dashboard.jsx            # Panel de control + Pomodoro
    ├── Psicke.jsx               # Asistente IA Gemini
    ├── Objectives.jsx           # Objetivos SMART (wizard 4 pasos)
    ├── HabitTracker.jsx         # Hábitos + Desafío 21 días
    ├── Journal.jsx              # Diario + Momentos Inolvidables
    ├── Health.jsx               # Salud + tab Médico
    ├── Nutricion.jsx            # Nutrición y menú semanal
    ├── Sueno.jsx                # Sueño y higiene del sueño
    ├── Entretenimiento.jsx      # Películas, series, docs
    ├── Mascotas.jsx             # Mascotas y veterinario
    ├── Viajes.jsx               # Viajes y destinos
    ├── Notes.jsx
    ├── Finance.jsx
    ├── Books.jsx
    ├── Relaciones.jsx
    ├── Hogar.jsx
    ├── Vehiculos.jsx
    ├── SideProjects.jsx
    ├── DesarrolloPersonal.jsx
    ├── Shopping.jsx
    ├── Education.jsx
    ├── Settings.jsx
    ├── GlobalSearch.jsx
    ├── Onboarding.jsx
    ├── Toast.jsx
    ├── AppLoader.jsx
    ├── ErrorBoundary.jsx
    └── navConfig.js             # NAV_SECTIONS, MOBILE_NAV
public/
├── sw-notifications.js          # Service Worker para push notifications
├── icon-192.png                 # PWA icon 🧠
└── icon-512.png
```

---

## Instalación

```bash
npm install
npm run dev
```

## Build y deploy

```bash
npm run build
npm run preview
```

**Vercel:** conectar repo → Framework: Vite → Build: `npm run build` → Output: `dist`

## API Key de Gemini

Obtener gratis en https://aistudio.google.com/apikey  
Configurar en **Ajustes → IA** dentro de la app.

---

## Claves de localStorage utilizadas

| Clave | Contenido |
|-------|-----------|
| `sb_user_name` | Nombre del usuario |
| `sb_onboarding_done` | Flag de onboarding completado |
| `sb_challenge` | Perfil de desafío activo del Dashboard |
| `psicke_msgs` | Historial de conversación con Psicke |
| Claves de datos | `tasks`, `habits`, `objectives`, `journal`, `moments`, `habitChallenges`, `medicalVisits`, `medicalDocs`, `recipes`, `weekMenus`, `sleepLog`, `dreamJournal`, `entertainment`, `pets`, `trips`, etc. |
