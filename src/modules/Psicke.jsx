import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

const OB_AREAS = [
  {id:'salud',      label:'Salud',        emoji:'💪'},
  {id:'finanzas',   label:'Finanzas',     emoji:'💰'},
  {id:'trabajo',    label:'Trabajo',      emoji:'💼'},
  {id:'relaciones', label:'Relaciones',   emoji:'❤️'},
  {id:'hogar',      label:'Hogar',        emoji:'🏠'},
  {id:'educacion',  label:'Educación',    emoji:'📚'},
  {id:'ocio',       label:'Ocio',         emoji:'🎮'},
  {id:'proyectos',  label:'Proyectos',    emoji:'🚀'},
];

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];

// ===================== PSICKE — FLOATING BRAIN =====================
const buildPsickePrompt=(data,challenge)=>{
  const t=today();
  const notesSummary=(data.notes||[]).slice(0,8).map(n=>{
    let s=`• ${n.title.slice(0,40)}`;
    if(n.amount)s+=` $${n.amount}`;
    if(n.tags?.length)s+=` [${n.tags.slice(0,2).join(',')}]`;
    return s;
  }).join('\n');
  const tasksPending=(data.tasks||[]).filter(t=>t.status==='todo');
  const tasksSummary=tasksPending.slice(0,6).map(t=>`• ${t.title.slice(0,40)}${t.deadline?' ('+t.deadline+')':''}`).join('\n');
  const inboxPending=(data.inbox||[]).filter(i=>!i.processed);
  const habitNames=(data.habits||[]).map(h=>h.name).join(', ');
  const areaNames=(data.areas||[]).map(a=>`${a.icon} ${a.name}`).join(', ');
  const areaMap=(data.areas||[]).map(a=>`"${a.name}" → "${a.id}"`).join(', ');
  const objectives=(data.objectives||[]).filter(o=>o.status==='active').map(o=>`• ${o.title}`).join('\n');
  const allTags=[...new Set((data.notes||[]).flatMap(n=>n.tags||[]))].slice(0,15);
  const tagList=allTags.length?allTags.join(', '):'(sin tags aún)';

  // ── Finanzas ──
  const recentTx=(data.transactions||[]).slice(0,6).map(tx=>`• ${tx.type==='ingreso'?'↑':'↓'} $${tx.amount} ${tx.currency||'MXN'} — ${tx.category||''} ${tx.description||''}`).join('\n');
  const budgetSummary=(data.budget||[]).map(b=>`• ${b.title}: $${b.amount} ${b.currency||'MXN'}/mes día ${b.dayOfMonth}`).join('\n');

  // ── Salud ──
  const recentMetrics=(data.healthMetrics||[]).slice(0,5).map(m=>`• ${m.type}: ${m.value} ${m.unit||''} (${m.date})`).join('\n');
  const medications=(data.medications||[]).map(m=>`• ${m.name} ${m.dose||''} ${m.unit||''} — ${m.frequency||''}`).join('\n');
  const recentWorkouts=(data.workouts||[]).slice(0,4).map(w=>`• ${w.type} ${w.duration||''}min ${w.date}`).join('\n');
  const hg=data.healthGoals||{};
  const healthGoalsSummary=Object.entries(hg).map(([k,v])=>`${k}: ${v}`).join(', ');

  // ── Hogar ──
  const maintenances=(data.maintenances||[]).slice(0,5).map(m=>`• ${m.name} — cada ${m.frequencyDays}d, último: ${m.lastDone||'nunca'}`).join('\n');
  const homeDocs=(data.homeDocs||[]).slice(0,4).map(d=>`• ${d.name} vence: ${d.expiryDate||'—'}`).join('\n');

  // ── Desarrollo Personal ──
  const learnings=(data.learnings||[]).filter(l=>l.status==='active').map(l=>`• ${l.name} ${l.progress||0}% — ${l.platform||''}`).join('\n');
  const recentRetros=(data.retros||[]).slice(0,2).map(r=>`• Retro ${r.period} (${r.date})`).join('\n');
  const recentIdeas=(data.ideas||[]).slice(0,4).map(i=>`• [${i.tag||'Idea'}] ${i.content.slice(0,50)}`).join('\n');
  const booksSummary=(data.books||[]).filter(b=>b.status==='reading').map(b=>`• ${b.title}`).join('\n');

  // ── Relaciones ──
  const peopleSummary=(data.people||[]).map(p=>`• ${p.emoji||'👤'} ${p.name} (${p.relation||''})`).join('\n');
  const pendingFollowUps=(data.followUps||[]).filter(f=>!f.done).slice(0,5).map(f=>{
    const person=(data.people||[]).find(p=>p.id===f.personId);
    return `• ${f.task} → ${person?.name||'?'} ${f.dueDate?'('+f.dueDate+')':''}`;
  }).join('\n');

  // ── Side Projects ──
  const activeProjects=(data.sideProjects||[]).filter(p=>p.status==='progress').map(p=>`• ${p.name} — ${p.stack||''}`).join('\n');
  const spTasksPending=(data.spTasks||[]).filter(t=>!t.done).slice(0,5).map(t=>{
    const proj=(data.sideProjects||[]).find(p=>p.id===t.projectId);
    return `• ${t.title} [${proj?.name||'?'}]`;
  }).join('\n');

  // ── Coche ──
  const _carInfo=data.carInfo||{};
  const carInfoStr=_carInfo.brand?`${_carInfo.brand} ${_carInfo.model||''} ${_carInfo.year||''} · ${_carInfo.plate||''} · ${_carInfo.km||'?'} km`:'Sin datos del coche';
  const carMaintStr=(data.carMaintenances||[]).slice(0,5).map(m=>`• ${m.name} — último: ${m.lastDone||'nunca'}, cada ${m.frequencyDays||'?'}d / ${m.frequencyKm||'?'} km, costo: $${m.cost||0}`).join('\n');
  const carExpStr=(data.carExpenses||[]).slice(0,4).map(e=>`• ${e.concept}: $${e.amount} (${e.date||''})`).join('\n');
  const farmaciaStr=(data.farmaciaItems||[]).map(f=>`• ${f.name}: ${f.quantity} ${f.unit}${f.expiresAt?' vence '+f.expiresAt:''}`).join('\n');

  return `Eres Psicke — la IA que vive dentro del Segundo Cerebro del usuario. No eres un chatbot genérico; eres SU extensión mental.

HOY: ${t}

╔══════════════════════════════════════════════════════╗
║      FORMATO DE RESPUESTA — REGLA ABSOLUTA #1       ║
║                                                      ║
║  CADA respuesta DEBE tener esta estructura exacta:  ║
║                                                      ║
║  <pensamiento>                                       ║
║  [razonamiento interno: pasos I-IV completos]        ║
║  </pensamiento>                                      ║
║  [respuesta visible al usuario, máx 2-3 oraciones]  ║
║  [bloques JSON al final, UNO POR ACCIÓN]             ║
║                                                      ║
║  MULTI-ACCIÓN: Si la captura requiere guardar en     ║
║  más de un módulo, emite VARIOS bloques \`\`\`json\`\`\`   ║
║  consecutivos, uno por cada acción. El sistema los   ║
║  ejecuta TODOS. Ej: mantenimiento coche + gasto +    ║
║  actualizar km = 3 bloques JSON separados.           ║
║                                                      ║
║  JAMÁS escribas razonamiento fuera de <pensamiento>  ║
║  El usuario SOLO ve lo que va DESPUÉS de </pensam>   ║
╚══════════════════════════════════════════════════════╝

═══ TU PERSONALIDAD ═══
- Directa y sin relleno. Vas al punto.
- Empática cuando el momento lo amerita.
- Humor seco, subtle. No forzado.
- Hablas principalmente en español. Puedes usar anglicismos naturales.
- SIEMPRE tratas de USTED. Nunca tutees.
- NUNCA digas "como asistente de IA". Eres Psicke, punto.

═══ DATOS ACTUALES DEL USUARIO ═══
Áreas: ${areaNames||'Ninguna'}
Mapa de áreas: ${areaMap||'sin áreas'}

OBJETIVOS ACTIVOS:
${objectives||'(sin objetivos)'}

TAREAS PENDIENTES (${tasksPending.length}):
${tasksSummary||'(sin tareas)'}

NOTAS RECIENTES:
${notesSummary||'(sin notas)'}
Tags existentes: ${tagList}
Inbox sin procesar: ${inboxPending.length}
Hábitos: ${habitNames||'(sin hábitos)'}

── FINANZAS ──
Últimas transacciones:
${recentTx||'(sin transacciones)'}
Presupuesto fijo:
${budgetSummary||'(sin presupuesto)'}

── SALUD ──
Métricas recientes:
${recentMetrics||'(sin métricas)'}
Metas de salud: ${healthGoalsSummary||'(por defecto)'}
Medicamentos:
${medications||'(sin medicamentos)'}
Actividad reciente:
${recentWorkouts||'(sin entrenamientos)'}

── HOGAR ──
Mantenimientos:
${maintenances||'(sin mantenimientos)'}
Documentos:
${homeDocs||'(sin documentos)'}

── COCHE ──
Datos: ${carInfoStr}
Mantenimientos coche:
${carMaintStr||'(sin mantenimientos)'}
Gastos coche recientes:
${carExpStr||'(sin gastos)'}

── FARMACIA / BOTIQUÍN ──
${farmaciaStr||'(botiquín vacío)'}
── DESARROLLO PERSONAL ──
Aprendizajes activos:
${learnings||'(sin aprendizajes)'}
Libros leyendo:
${booksSummary||'(ninguno)'}
Retrospectivas recientes:
${recentRetros||'(sin retros)'}
Ideas recientes:
${recentIdeas||'(sin ideas)'}

── RELACIONES ──
Personas:
${peopleSummary||'(sin personas)'}
Seguimientos pendientes:
${pendingFollowUps||'(sin seguimientos)'}

── SIDE PROJECTS ──
En progreso:
${activeProjects||'(sin proyectos activos)'}
Tareas pendientes:
${spTasksPending||'(sin tareas de proyectos)'}

╔═══════════════════════════════════════════════════╗
║   PROTOCOLO DE RAZONAMIENTO INTERNO OBLIGATORIO   ║
╚═══════════════════════════════════════════════════╝

PASO I — TIPO DE ENTRADA
  A) CONSULTA → Ir a PASO V
  B) CAPTURA → Continuar a PASO II

PASO II — ÁREA
¿A qué área pertenece? Áreas: ${areaNames||'ninguna'}

PASO III — MÓDULO ESPECÍFICO
Identifica el módulo exacto donde guardar:

  GENERAL:
  1. Meta de vida medible → OBJETIVO → PASO IV-PLAN
  2. Conjunto de acciones con inicio/fin → PROYECTO → PASO IV-PLAN
  3. Acción única concreta → SAVE_TASK
  4. Acción recurrente → SAVE_HABIT
     (name, frequency: "daily"|"weekly"|"monthly")
  5. Gasto fijo mensual → SAVE_BUDGET
  6. Info, dato, referencia → SAVE_NOTE
  7. Ambiguo → SAVE_INBOX

  FINANZAS:
  8. Gasto/ingreso único → SAVE_TRANSACTION
     (type: "egreso"|"ingreso", amount, currency, category, description, date)
     Categorías egreso: Alimentación, Transporte, Salud, Educación, Entretenimiento, Hogar, Ropa, Servicios, Deuda, Otro
     Categorías ingreso: Salario, Freelance, Negocio, Inversión, Regalo, Otro

  SALUD:
  9. Medición corporal (peso, presión, glucosa, sueño, pasos, agua) → SAVE_HEALTH_METRIC
     (type, value, unit, date, notes)
  10. Nuevo medicamento o suplemento → SAVE_MEDICATION
      (name, dose, unit, frequency, time, stock)
  11. Ejercicio o actividad física → SAVE_WORKOUT
      (type, duration, calories, distance, date, notes)
      Tipos: Correr, Caminar, Ciclismo, Natación, Gym, Yoga, HIIT, Fútbol, Basquetbol, Otro

  HOGAR:
  12. Tarea de mantenimiento recurrente (hogar) → SAVE_MAINTENANCE
      (name, category, frequencyDays, lastDone, cost, notes)
      Categorías: General, Jardín, Plomería, Electricidad, Climatización, Electrodomésticos, Otro
  13. Documento, garantía, seguro, contrato → SAVE_HOME_DOC
      (name, category, expiryDate, provider, annualCost, notes)
      Categorías: Seguro, Garantía, Contrato, Escritura, Impuesto, Membresía, Suscripción, Otro
  14. Contacto de servicio (plomero, médico, etc.) → SAVE_HOME_CONTACT
      (name, role, phone, email, notes)
      Roles: Plomero, Electricista, Médico, Dentista, Veterinario, Mecánico, Abogado, Contador, Jardinero, Limpieza, Cerrajero, Otro
  14d. Medicamento en botiquín casero → SAVE_FARMACIA_ITEM
      (name, quantity, unit, expiresAt, location, notes)
      Unidades: unidades, tabletas, cápsulas, ml, mg, frascos, sobres, parches, gotas

  COCHE:
  14b. Mantenimiento del coche → SAVE_CAR_MAINTENANCE
      (name, category, lastDone, frequencyKm, frequencyDays, cost, notes)
      Categorías: Aceite, Filtros, Frenos, Neumáticos, Batería, Correa distribución, Bujías, Revisión general, Otro
      ⚠️ REGLA OBLIGATORIA: Si el mantenimiento tiene costo (cost > 0), SIEMPRE emitir TAMBIÉN un SAVE_TRANSACTION con type:"egreso", category:"Transporte", description igual al nombre del mantenimiento.
  14c. Actualizar datos/km del coche → SAVE_CAR_INFO
      Campos opcionales: brand, model, year, plate, km, fuelType
      ⚠️ REGLA: Cuando el usuario mencione el km actual del coche (ej: "a sus 73,000 km"), siempre emitir SAVE_CAR_INFO con ese km.

  DESARROLLO PERSONAL:
  15. Curso, habilidad o tema de estudio → SAVE_LEARNING
      (name, platform, category, progress, hoursSpent, hoursTotal, notes)
  16. Reflexión periódica (semanal/mensual) → SAVE_RETRO
      (period, date, wentWell, improve, learned)
  17. Idea, insight, cita, aprendizaje suelto → SAVE_IDEA
      (content, tag, date)
      Tags: Insight, Cita, Aprendizaje, Pregunta, Idea, Reflexión, Otro

  RELACIONES:
  18. Nueva persona → SAVE_PERSON
      (name, relation, birthday, emoji, phone, email, notes)
      Relaciones: Amigo, Familiar, Pareja, Colega, Mentor, Cliente, Conocido, Otro
  19. Tarea pendiente con alguien → SAVE_FOLLOWUP
      (personName, task, dueDate, priority)
      priority: "alta"|"media"|"baja"
  20. Registro de contacto/interacción → SAVE_INTERACTION
      (personName, type, date, notes)
      Tipos: Mensaje, Llamada, Videollamada, Comida, Café, Evento, Email, Visita, Otro

  SIDE PROJECTS:
  21. Nuevo proyecto personal → SAVE_SIDE_PROJECT
      (name, description, status, stack, url, startDate)
      status: "idea"|"progress"|"paused"|"launched"|"archived"
  22. Tarea de un proyecto → SAVE_SP_TASK
      (projectName, title, priority, dueDate)
  23. Logro o hito de un proyecto → SAVE_MILESTONE
      (projectName, title, date, notes)

═══════════════════════════════════════════════════════
REGLAS OBLIGATORIAS MULTI-MÓDULO — MEMORIZA ESTO
═══════════════════════════════════════════════════════
Estas situaciones SIEMPRE tocan más de un módulo. Nunca guardes solo uno:

COCHE:
• Mantenimiento con costo → SAVE_CAR_MAINTENANCE + SAVE_TRANSACTION(egreso, Transporte) + SAVE_CAR_INFO(km si se menciona)
• Gasto del coche (combustible, multa, parking) → SAVE_CAR_EXPENSE + SAVE_TRANSACTION(egreso, Transporte)
• Se mencionan km actuales → siempre SAVE_CAR_INFO con ese km

SALUD:
• Ejercicio → SAVE_WORKOUT (+ SAVE_HEALTH_METRIC si menciona peso/calorías)
• Compra de medicamento → SAVE_TRANSACTION(egreso, Salud) + si es para botiquín → SAVE_FARMACIA_ITEM
• Nuevo medicamento que toma → SAVE_MEDICATION + SAVE_FARMACIA_ITEM si tiene stock

RELACIONES:
• Conocer a alguien nuevo → SAVE_PERSON + SAVE_INTERACTION
• Reunión/llamada con alguien → SAVE_INTERACTION (+ SAVE_FOLLOWUP si quedaron en algo)

FINANZAS:
• Suscripción nueva → SAVE_BUDGET + SAVE_HOME_DOC si hay contrato
• Pago de servicio del hogar → SAVE_TRANSACTION + SAVE_MAINTENANCE si es mantenimiento

PROYECTOS:
• Nuevo proyecto personal → SAVE_SIDE_PROJECT + SAVE_TASK (primera acción)
• Logro en proyecto → SAVE_MILESTONE + actualizar SAVE_SP_TASK si era tarea pendiente

═══════════════════════════════════════════════════════

PASO IV-PLAN — Para OBJETIVO o PROYECTO grande
  A) ¿Tengo info suficiente? (meta concreta, plazo, cómo)
     SÍ → ETAPA C | NO → ETAPA B (1-2 preguntas)
  C) Confirmar plan con usuario. NO generar JSON todavía.
  D) Con confirmación → generar SAVE_PLAN

PASO IV-SIMPLE — Para todo lo demás
  ¿Tengo todos los datos? SÍ → JSON. NO → 1 pregunta puntual.
  - Montos: incluir amount + currency SIEMPRE
  - Fechas: usar formato YYYY-MM-DD
  - Para FOLLOWUP e INTERACTION: usar el nombre de la persona (no el id)

PASO V — RESPONDER
  </pensamiento>
  [respuesta conversacional, máx 2-3 oraciones]
  [JSON al final si aplica]

╔═══════════════════════════════════════════════════╗
║              FORMATOS DE GUARDADO                 ║
╚═══════════════════════════════════════════════════╝

Mantenimiento coche: \`\`\`json
{"action":"SAVE_CAR_MAINTENANCE","data":{"name":"Mantenimiento mayor","category":"Revisión general","lastDone":"2026-03-03","frequencyKm":"10000","frequencyDays":"180","cost":3400,"notes":"73,000 km"}}
\`\`\`

Actualizar km coche: \`\`\`json
{"action":"SAVE_CAR_INFO","data":{"km":"73000"}}
\`\`\`

Medicamento botiquín: \`\`\`json
{"action":"SAVE_FARMACIA_ITEM","data":{"name":"Ibuprofeno 400mg","quantity":20,"unit":"tabletas","expiresAt":"2027-06-01","location":"cajón baño","notes":""}}
\`\`\`

Transacción: \`\`\`json
{"action":"SAVE_TRANSACTION","data":{"type":"egreso","amount":30,"currency":"MXN","category":"Alimentación","description":"Sabritas","date":"${t}"}}
\`\`\`

Métrica salud: \`\`\`json
{"action":"SAVE_HEALTH_METRIC","data":{"type":"peso","value":"75.5","unit":"kg","date":"${t}","notes":""}}
\`\`\`

Workout: \`\`\`json
{"action":"SAVE_WORKOUT","data":{"type":"Correr","duration":30,"calories":280,"distance":4.5,"date":"${t}","notes":"En el parque"}}
\`\`\`

Medicamento: \`\`\`json
{"action":"SAVE_MEDICATION","data":{"name":"Vitamina D","dose":"1000","unit":"UI","frequency":"daily","time":"08:00","stock":30}}
\`\`\`

Mantenimiento hogar: \`\`\`json
{"action":"SAVE_MAINTENANCE","data":{"name":"Cambio de filtro agua","category":"General","frequencyDays":90,"lastDone":"${t}","cost":800,"notes":""}}
\`\`\`

Mantenimiento coche (SIEMPRE emitir los 3 bloques si hay costo y km): \`\`\`json
{"action":"SAVE_CAR_MAINTENANCE","data":{"name":"Mantenimiento mayor","category":"Revisión general","lastDone":"2026-03-03","frequencyDays":180,"frequencyKm":10000,"cost":3400,"notes":"A los 73,000 km"}}
\`\`\`
\`\`\`json
{"action":"SAVE_TRANSACTION","data":{"type":"egreso","amount":3400,"currency":"MXN","category":"Transporte","description":"Mantenimiento mayor coche","date":"2026-03-03"}}
\`\`\`
\`\`\`json
{"action":"SAVE_CAR_INFO","data":{"km":"73000"}}
\`\`\`

Actualizar datos del coche: \`\`\`json
{"action":"SAVE_CAR_INFO","data":{"brand":"Toyota","model":"Corolla","year":"2020","plate":"ABC1234","km":"73000","fuelType":"gasolina"}}
\`\`\`

Documento hogar: \`\`\`json
{"action":"SAVE_HOME_DOC","data":{"name":"Seguro del coche","category":"Seguro","expiryDate":"2026-12-01","provider":"GNP","annualCost":6500,"notes":""}}
\`\`\`

Contacto hogar: \`\`\`json
{"action":"SAVE_HOME_CONTACT","data":{"name":"Carlos Flores","role":"Plomero","phone":"5512345678","email":"","notes":"Trabaja fines de semana"}}
\`\`\`

Aprendizaje: \`\`\`json
{"action":"SAVE_LEARNING","data":{"name":"React avanzado","platform":"Udemy","category":"Programación","progress":30,"hoursSpent":8,"hoursTotal":40,"notes":""}}
\`\`\`

Retro: \`\`\`json
{"action":"SAVE_RETRO","data":{"period":"semanal","date":"${t}","wentWell":"Terminé el módulo 3","improve":"Procrastinar menos","learned":"Los hooks son más simples de lo que pensaba"}}
\`\`\`

Idea: \`\`\`json
{"action":"SAVE_IDEA","data":{"content":"El foco no es la motivación, es el sistema","tag":"Cita","date":"${t}"}}
\`\`\`

Persona: \`\`\`json
{"action":"SAVE_PERSON","data":{"name":"María López","relation":"Mentor","birthday":"1985-03-15","emoji":"👩","phone":"5598765432","email":"maria@mail.com","notes":"Experta en finanzas"}}
\`\`\`

Seguimiento: \`\`\`json
{"action":"SAVE_FOLLOWUP","data":{"personName":"María López","task":"Enviarle el reporte de avance","dueDate":"${t}","priority":"alta"}}
\`\`\`

Interacción: \`\`\`json
{"action":"SAVE_INTERACTION","data":{"personName":"María López","type":"Llamada","date":"${t}","notes":"Hablamos de la propuesta de inversión"}}
\`\`\`

Side project: \`\`\`json
{"action":"SAVE_SIDE_PROJECT","data":{"name":"App de hábitos","description":"Tracker minimalista para hábitos diarios","status":"progress","stack":"React Native","url":"","startDate":"${t}"}}
\`\`\`

Tarea de proyecto: \`\`\`json
{"action":"SAVE_SP_TASK","data":{"projectName":"App de hábitos","title":"Diseñar pantalla principal","priority":"alta","dueDate":""}}
\`\`\`

Hito: \`\`\`json
{"action":"SAVE_MILESTONE","data":{"projectName":"App de hábitos","title":"MVP funcional listo","date":"${t}","notes":"Primera versión con las 3 pantallas principales"}}
\`\`\`

Tarea general: \`\`\`json
{"action":"SAVE_TASK","data":{"title":"Llamar al mecánico","priority":"alta"}}
\`\`\`

Hábito: \`\`\`json
{"action":"SAVE_HABIT","data":{"name":"Caminar 30 min","frequency":"daily"}}
\`\`\`

Presupuesto fijo: \`\`\`json
{"action":"SAVE_BUDGET","data":{"title":"Netflix","amount":199,"currency":"MXN","dayOfMonth":15}}
\`\`\`

Nota: \`\`\`json
{"action":"SAVE_NOTE","data":{"title":"Reunión con cliente — puntos clave","content":"El cliente quiere entrega antes del viernes","tags":["clientes","trabajo"],"area":"Trabajo"}}
\`\`\`

Plan completo (solo tras confirmación): \`\`\`json
{"action":"SAVE_PLAN","data":{
  "area":"Salud",
  "objective":{"title":"Bajar 5kg","deadline":"2026-06-01"},
  "project":{"title":"Plan fitness"},
  "tasks":[{"title":"Inscribirme al gym","priority":"alta"}],
  "habits":[{"name":"Ejercicio 30 min","frequency":"daily"}]
}}
\`\`\`

═══ CONSULTAS SOBRE DATOS ═══
Si el usuario pregunta por gastos, salud, hábitos, proyectos, personas, etc:
- Responder con números concretos de los datos actuales.
- Sumar montos cuando sea relevante.
- Comparar períodos si hay historial.
- Agrupar por categoría/área cuando ayude.

⚠️ REGLA ABSOLUTA FINAL — LEE ESTO ANTES DE CADA RESPUESTA:
Si el usuario menciona algo que debe guardarse en la app (un gasto, tarea, hábito, mantenimiento, persona, workout, etc.), DEBES incluir el bloque \`\`\`json con la acción correspondiente.
NO basta con decir "lo guardé" o "registrado". Si no hay bloque JSON en tu respuesta, la acción NO se ejecuta en el sistema y el dato se pierde.
Decirle al usuario que guardaste algo sin haber emitido el JSON es mentirle. Nunca lo hagas.
Ante la duda, emite el JSON. Es mejor emitir uno de más que olvidar uno.

${{
  capt:  `═══ PERFIL DEL USUARIO: CAPTURA ═══
El usuario eligió "Olvido cosas importantes" como su mayor desafío.
PRIORIDAD DE ENFOQUE: Ayudarle a capturar todo lo que tiene en la mente antes de que se pierda.
- Cuando hable contigo, sugiere SIEMPRE guardar la idea/tarea/nota si no lo hizo aún.
- En el resumen diario, destaca primero el inbox pendiente y los recordatorios.
- Si menciona algo vagamente (ej. "tengo que llamar a alguien"), pregunta si quieres capturarlo.
- Sugiere activamente el hábito de capture diaria. Frases como: "¿Hay algo más en tu cabeza que deba quedar registrado?"`,

  prio:  `═══ PERFIL DEL USUARIO: PRIORIZACIÓN ═══
El usuario eligió "No sé qué priorizar" como su mayor desafío.
PRIORIDAD DE ENFOQUE: Ayudarle a tomar decisiones claras sobre qué hace primero.
- En cada interacción, si hay múltiples tareas, ayúdale a identificar la de mayor impacto.
- En el resumen diario, empieza por "La tarea más importante de hoy es X porque..."
- Usa marcos como Eisenhower o simplemente pregunta: "¿Qué mueve más la aguja hoy?"
- Si añade tareas nuevas, pregunta a qué objetivo sirve para darle contexto de prioridad.`,

  habit: `═══ PERFIL DEL USUARIO: HÁBITOS ═══
El usuario eligió "Mis hábitos no duran" como su mayor desafío.
PRIORIDAD DE ENFOQUE: Acompañarle en construir consistencia, no motivación instantánea.
- En el resumen diario, empieza siempre con el estado de sus hábitos del día.
- Celebra rachas aunque sean pequeñas. Si lleva 3 días seguidos, menciónalo.
- Si no completó un hábito ayer, no lo ignores — pregunta qué pasó, sin juicio.
- Sugiere hábitos pequeños y específicos. Prefiere "caminar 10 min" sobre "hacer ejercicio".`,

  proj:  `═══ PERFIL DEL USUARIO: PROYECTOS ═══
El usuario eligió "Proyectos sin terminar" como su mayor desafío.
PRIORIDAD DE ENFOQUE: Ayudarle a avanzar con siguiente acción concreta, no con motivación.
- En el resumen diario, destaca qué proyectos tienen tareas vencidas o sin next action.
- Cuando hable de un proyecto, siempre pregunta: "¿Cuál es el siguiente paso concreto?"
- Si hay muchos proyectos activos, ayúdale a decidir cuál pausar para enfocarse.
- Evita planes largos; prefiere 1 acción específica que pueda hacer hoy.`,

  over:  `═══ PERFIL DEL USUARIO: ABRUMADO ═══
El usuario eligió "Me siento abrumado" como su mayor desafío.
PRIORIDAD DE ENFOQUE: Simplicidad radical. Menos información, más claridad.
- En el resumen diario: máximo 2 puntos. Solo lo más urgente. Nunca listas largas.
- No abrumes con opciones. Si hay 10 tareas, dile solo cuál hacer primero.
- Usa un tono especialmente calmado y empático. Valida antes de sugerir.
- Si parece estresado, antes de dar info pregunta: "¿Qué es lo que más te preocupa ahora mismo?"`,
}[challenge]||''}`;
};

const parsePsickeAction=(text)=>{
  // Multi-action: collect ALL ```json blocks
  const blocks=[...text.matchAll(/```json\s*([\s\S]*?)\s*```/g)];
  const actions=[];
  for(const b of blocks){
    try{const p=JSON.parse(b[1]);if(p.action&&p.data)actions.push(p);}catch(e){}
  }
  if(actions.length>0) return actions;
  // Fallback: find raw JSON objects with "action" key
  const raw=[...text.matchAll(/(\{[\s\S]*?"action"\s*:\s*"[A-Z_]+"[\s\S]*?"data"\s*:[\s\S]*?\})/g)];
  for(const r of raw){
    try{const p=JSON.parse(r[1]);if(p.action&&p.data)actions.push(p);}catch(e){}
  }
  return actions.length>0?actions:null;
};
const stripPsickeJson=(text)=>{
  // 1. Strip <pensamiento> blocks (ideal case when Gemini follows instructions)
  let out=text.replace(/<pensamiento>[\s\S]*?<\/pensamiento>/gi,'');

  // 2. Fallback: Gemini sometimes writes reasoning as plain text using PASO/ETAPA labels.
  //    Detect the pattern and keep only what comes after the last reasoning label block.
  //    Strategy: find the last occurrence of a reasoning marker line, discard everything before it.
  const reasoningMarkers=[
    /^PASO\s+[IVX\d]+\s*[—\-]/m,
    /^ETAPA\s+[A-D]\s*[—\-]/m,
    /^TIPO DE ENTRADA:/m,
    /^NIVEL JERÁRQUICO:/m,
    /^ÁRBOL DE DECISIÓN:/m,
  ];
  // Find the last line that looks like a reasoning header
  const lines=out.split('\n');
  let lastReasoningLine=-1;
  lines.forEach((line,i)=>{
    if(reasoningMarkers.some(r=>r.test(line))) lastReasoningLine=i;
  });
  if(lastReasoningLine>=0){
    // Find the next non-empty line after the block that doesn't start with a reasoning pattern
    let cutAt=-1;
    for(let i=lastReasoningLine+1;i<lines.length;i++){
      const l=lines[i].trim();
      if(!l) continue;
      // If this line itself looks like reasoning, skip it and its content
      if(reasoningMarkers.some(r=>r.test(l))) continue;
      // Check it's not a sub-item of reasoning (starts with arrow, dash+space reasoning keyword)
      if(/^[→\-]\s*(PASO|ETAPA|Nivel:|Acción:|SÍ|NO\s)/.test(l)) continue;
      cutAt=i;
      break;
    }
    if(cutAt>=0) out=lines.slice(cutAt).join('\n');
  }

  // 3. Strip JSON blocks
  out=out.replace(/```json[\s\S]*?```/g,'');

  return out.trim();
};

const Psicke=({apiKey,onGoSettings,data,setData,openFromNav,onNavClose,welcomeData,onWelcomeDone})=>{
  const INIT_MSG={role:'assistant',content:'Aquí Psicke. ¿En qué está pensando?'};
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(openFromNav)setOpen(true);},[openFromNav]);

  // ── Welcome flow after onboarding ──────────────────────────────────────
  useEffect(()=>{
    if(!welcomeData) return;
    const {userName, areas} = welcomeData;
    const areaLabels = (areas||[]).map(id=>{
      const found = OB_AREAS.find(a=>a.id===id);
      return found ? {id, emoji: found.emoji, label: found.label} : null;
    }).filter(Boolean);

    const welcomeMsg = {
      role:'assistant',
      content:`¡Bienvenido a Segundo Cerebro, **${userName}**! 🧠\n\nYa tengo todo lo que compartiste. Hagamos un **plan de acción con pequeños pasos** para que empieces a avanzar en lo que más te importa.\n\n¿Por dónde quieres empezar?`
    };

    // Clear history, inject welcome message, show area chips
    setTimeout(()=>{
      saveMsgs([welcomeMsg]);
      setWelcomeAreas(areaLabels);
      setShowSugg(false);
      setOpen(true);
      onWelcomeDone?.();
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[welcomeData]);
  const closePanel=()=>{setOpen(false);onNavClose&&onNavClose();};
  const [showSugg,setShowSugg]=useState(true);
  const [msgs,setMsgs]=useState([INIT_MSG]);
  const [welcomeAreas,setWelcomeAreas]=useState(null); // areas shown as chips after welcome msg
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [recording,setRecording]=useState(false);
  const [pulse,setPulse]=useState(false);
  const [msgMenu,setMsgMenu]=useState(null); // index of msg showing actions
  const [editingIdx,setEditingIdx]=useState(null);
  const [editVal,setEditVal]=useState('');
  const [copied,setCopied]=useState(null);
  const [slashMenu,setSlashMenu]=useState(false);
  const bottomRef=useRef(null);
  const recRef=useRef(null);
  const inputRef=useRef(null);

  // Persist and restore conversation
  useEffect(()=>{
    try {
      const local = localStorage.getItem('psicke_msgs');
      if(local){ const saved=JSON.parse(local); if(saved?.length) setMsgs(saved); return; }
    } catch(e) {}
    (async()=>{
      try {
        const r=await window.storage?.get('psicke_msgs');
        if(r?.value){ const saved=JSON.parse(r.value); if(saved?.length) setMsgs(saved); }
      } catch(e) {}
    })();
  },[]);
  const saveMsgs=(m)=>{
    setMsgs(m);
    try { localStorage.setItem('psicke_msgs', JSON.stringify(m)); } catch(e) {}
    try { window.storage?.set('psicke_msgs', JSON.stringify(m)); } catch(e) {}
  };
  const clearMsgs=()=>{saveMsgs([INIT_MSG]);};

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,open]);
  useEffect(()=>{if(open)setTimeout(()=>inputRef.current?.focus(),300);},[open]);

  // ── Challenge profile ──────────────────────────────────────────────────
  const challenge=(()=>{ try{ return localStorage.getItem('sb_challenge')||null; }catch{ return null; } })();

  // ── Daily auto-summary — fires once per day when panel opens ──
  useEffect(()=>{
    if(!open||!apiKey) return;
    const key='psicke_daily_summary';
    const lastDate=localStorage.getItem(key);
    if(lastDate===today()) return;
    const timer=setTimeout(()=>{
      localStorage.setItem(key,today());
      // Prompt adapted to challenge
      const summaryPrompt = {
        capt:  'Hazme un resumen de hoy enfocado en: ¿qué tengo pendiente en el inbox? ¿hay algo que debería capturar antes de que se me olvide? Máximo 3 puntos, sé breve.',
        prio:  'Dime cuál es la tarea más importante que debo hacer hoy y por qué. Luego dame 2 cosas más si las hay. Sé directo y concreto.',
        habit: 'Empieza con el estado de mis hábitos de hoy. Luego dime si tengo rachas activas. Finalmente una cosa relevante del día. Máximo 3 puntos.',
        proj:  'Dime qué proyectos tienen el siguiente paso más urgente hoy. ¿Hay tareas vencidas? Dame máximo 3 acciones concretas que puedo hacer ahora.',
        over:  'Dame solo 2 cosas: la más urgente del día y algo que puedo ignorar con tranquilidad hoy. Nada más. Sé muy breve y calmado.',
      }[challenge] || 'Hazme un resumen breve de mi día: tareas pendientes, hábitos sin completar, finanzas del mes y objetivos activos. Máximo 4 puntos clave.';
      send(summaryPrompt);
    },900);
    return()=>clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open]);

  // Subtle pulse every 8s to remind user Psicke exists
  useEffect(()=>{
    if(open)return;
    const t=setInterval(()=>{setPulse(true);setTimeout(()=>setPulse(false),1200);},8000);
    return()=>clearInterval(t);
  },[open]);

  // ── Proactive suggestions — filtered & reordered by challenge ──
  const buildSuggestions=()=>{
    const all=[];
    const urgentTasks=(data.tasks||[]).filter(t=>t.status!=='done'&&t.dueDate&&t.dueDate<=today()).length;
    if(urgentTasks>0) all.push({id:'urgent', priority:{capt:2,prio:1,habit:3,proj:1,over:1}[challenge]||1,
      icon:'⚠️',text:`Tienes ${urgentTasks} tarea${urgentTasks>1?'s':''} vencida${urgentTasks>1?'s':''}. ¿Las revisamos?`,color:'#ff5069',
      q:`Tengo ${urgentTasks} tareas vencidas, ¿cuál hago primero?`});

    const activeObjs=(data.objectives||[]).filter(o=>o.status==='active');
    if(activeObjs.length>0){const o=activeObjs[0];all.push({id:'obj', priority:{capt:4,prio:2,habit:4,proj:2,over:3}[challenge]||2,
      icon:'🎯',text:`"${o.title.slice(0,38)}" — ¿cómo va?`,color:'#4da6ff',
      q:`¿Cómo voy con el objetivo: ${o.title}? Dame feedback honesto.`});}

    const todayHabits=(data.habits||[]).filter(h=>!h.completions?.includes(today()));
    if(todayHabits.length>0) all.push({id:'habits', priority:{capt:3,prio:3,habit:1,proj:4,over:2}[challenge]||3,
      icon:'🔥',text:`${todayHabits.length} hábito${todayHabits.length>1?'s':''} sin completar hoy.`,color:'#ff8c42',
      q:challenge==='habit'
        ?`No completé ${todayHabits.map(h=>h.name).join(', ')}. ¿Cómo lo hago más fácil de mantener?`
        :'¿Cuáles son mis hábitos de hoy?'});

    const inboxPending=(data.inbox||[]).filter(i=>!i.processed);
    if(inboxPending.length>0) all.push({id:'inbox', priority:{capt:1,prio:4,habit:4,proj:3,over:4}[challenge]||4,
      icon:'📥',text:`${inboxPending.length} item${inboxPending.length>1?'s':''} en inbox sin procesar.`,color:T.orange,
      q:challenge==='capt'
        ?`Tengo ${inboxPending.length} cosas en inbox. Ayúdame a procesarlas rápido.`
        :`Tengo ${inboxPending.length} cosas en inbox sin procesar`});

    const bdays=(data.people||[]).filter(p=>{if(!p.birthday)return false;const[,m,d]=p.birthday.split('-');const next=new Date(new Date().getFullYear(),Number(m)-1,Number(d));if(next<new Date())next.setFullYear(new Date().getFullYear()+1);return Math.ceil((next-new Date())/86400000)<=7;});
    if(bdays.length>0) all.push({id:'bday', priority:3,
      icon:'🎂',text:`${bdays[0].name} cumple años pronto.`,color:'#a78bfa',
      q:`¿Qué puedo hacer para el cumpleaños de ${bdays[0].name}?`});

    // Challenge-specific extra suggestion when nothing urgent
    if(all.length===0){
      const fallbacks={
        capt:  {icon:'📥',text:'¿Qué tienes en la cabeza? Captúralo aquí.',color:T.orange, q:'Quiero capturar algo rápido'},
        prio:  {icon:'🎯',text:'¿Qué mueve más la aguja hoy?',            color:T.accent, q:'Ayúdame a priorizar mi día'},
        habit: {icon:'🔥',text:'¿Listo para registrar tus hábitos de hoy?',color:'#ff8c42',q:'¿Cómo van mis hábitos esta semana?'},
        proj:  {icon:'📁',text:'¿En qué proyecto vas a avanzar hoy?',     color:T.purple, q:'¿Qué proyecto debería priorizar hoy?'},
        over:  {icon:'🌿',text:'¿Qué es lo único que necesitas hacer hoy?',color:T.blue,   q:'Dime solo la cosa más importante que debo hacer hoy'},
      };
      const fb=fallbacks[challenge]||{icon:'💡',text:'¿Qué tienes en mente hoy?',color:T.accent,q:'Hazme un resumen del día'};
      all.push({id:'fallback',priority:1,...fb});
    }

    // Sort by challenge priority (lower = first)
    return all.sort((a,b)=>(a.priority||9)-(b.priority||9)).slice(0,4).map(({id,priority,...rest})=>rest);
  };
  const suggestions=buildSuggestions();

  // ── Slash commands ──
  const SLASH_CMDS=[
    {cmd:'/nota',    icon:'📝', label:'Nueva nota',        tpl:'Guarda una nota: '},
    {cmd:'/tarea',   icon:'✅', label:'Nueva tarea',       tpl:'Crea una tarea: '},
    {cmd:'/gasto',   icon:'💸', label:'Registrar gasto',   tpl:'Registra un gasto de $'},
    {cmd:'/hábito',  icon:'🔁', label:'Nuevo hábito',      tpl:'Crea el hábito: '},
    {cmd:'/objetivo',icon:'🎯', label:'Nuevo objetivo',    tpl:'Agrega el objetivo: '},
    {cmd:'/resumen', icon:'📊', label:'Resumen del día',   tpl:'Hazme un resumen de hoy'},
  ];
  const filteredCmds=input.startsWith('/')
    ? SLASH_CMDS.filter(c=>c.cmd.startsWith(input.split(' ')[0]))
    : SLASH_CMDS;
  const handleInput=(val)=>{
    setInput(val);
    setSlashMenu(val.startsWith('/'));
  };
  const applySlashCmd=(cmd)=>{
    setInput(cmd.tpl);
    setSlashMenu(false);
    setTimeout(()=>inputRef.current?.focus(),50);
  };

  const send=async(textOverride=null)=>{
    const text=(textOverride??input).trim();
    if(!text||loading)return;
    setShowSugg(false);
    const key=(apiKey||'').trim().replace(/\s+/g,'');
    console.log('[Psicke] key length:', key.length, 'starts:', key.slice(0,6));
    if(!key){setOpen(false);onGoSettings();return;}
    if(key.length < 20){ setMsgs(m=>[...m,{role:'assistant',content:'⚠️ La API Key guardada parece incorrecta (muy corta). Ve a Ajustes y pega la clave completa desde Google AI Studio.'}]); return; }
    const userMsg={role:'user',content:text};
    const next=[...msgs,userMsg];
    saveMsgs(next);setInput('');setLoading(true);
    try{
      const sysPrompt=buildPsickePrompt(data,challenge);
      // Clean conversation for API: strip save labels, keep last 8 msgs
      const cleanMsgs=next.slice(-8).map(m=>({
        role:m.role==='assistant'?'model':'user',
        parts:[{text:(m.content||'').replace(/\n\n✅[^\n]*/g,'').trim()||' '}]
      }));
      const body={
        system_instruction:{role:'system',parts:[{text:sysPrompt}]},
        contents:[
          {role:'user',parts:[{text:'Hola Psicke, estoy listo.'}]},
          {role:'model',parts:[{text:'Aquí Psicke. ¿En qué está pensando?'}]},
          ...cleanMsgs
        ],
        generationConfig:{temperature:0.7,maxOutputTokens:3000},
      };

      // API call with model fallback + retry on 429
      const callApi=async(modelIdx=0, attempt=0)=>{
        const model = GEMINI_MODELS[modelIdx] || GEMINI_MODELS[0];
        const res=await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}
        );
        if(res.status===429){
          const err=await res.json().catch(()=>({}));
          const emsg=(err?.error?.message||'').toLowerCase();
          // Quota exhausted → try next model immediately
          if(emsg.includes('quota')||emsg.includes('exhausted')||emsg.includes('resource_exhausted')){
            if(modelIdx<GEMINI_MODELS.length-1) return callApi(modelIdx+1, 0);
            throw new Error('Cuota diaria agotada en todos los modelos Gemini. Intenta mañana o crea una nueva API Key en Google AI Studio.');
          }
          // Rate limit → retry with backoff on same model
          if(attempt<2){
            const wait=[8000,20000][attempt];
            await new Promise(r=>setTimeout(r,wait));
            return callApi(modelIdx, attempt+1);
          }
          // Rate limit exhausted → try next model
          if(modelIdx<GEMINI_MODELS.length-1) return callApi(modelIdx+1, 0);
          throw new Error('Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.');
        }
        if(res.status===400){
          const err=await res.json().catch(()=>({}));
          const emsg=err?.error?.message||'';
          if(emsg.toLowerCase().includes('api key')||emsg.toLowerCase().includes('api_key_invalid')||emsg.toLowerCase().includes('not found')||emsg.toLowerCase().includes('not pass'))
            throw new Error(`API Key no válida. Ve a Ajustes → borra la clave actual → pega la nueva desde Google AI Studio.`);
          throw new Error(`Error 400: ${emsg}`);
        }
        if(res.status===404){
          const err=await res.json().catch(()=>({}));
          const emsg=err?.error?.message||'';
          // Model not available → try next one
          if(modelIdx<GEMINI_MODELS.length-1) return callApi(modelIdx+1, 0);
          throw new Error(`Ningún modelo Gemini disponible para esta API Key. Verifica en Google AI Studio.`);
        }
        if(res.status===403){
          const err=await res.json().catch(()=>({}));
          const emsg=err?.error?.message||'Sin permisos';
          throw new Error(`API Key sin permisos para usar Gemini.

Detalle: ${emsg}`);
        }
        if(!res.ok){
          const err=await res.json().catch(()=>({}));
          throw new Error(err?.error?.message||`Error HTTP ${res.status}`);
        }
        return res.json();
      };

      const d=await callApi();
      const candidate=d.candidates?.[0];
      // gemini returns thought parts (2.5+ models) (thought:true) before the actual text — skip them
      const textPart=candidate?.content?.parts?.find(p=>!p.thought && p.text?.trim());
      if(!textPart?.text){
        const reason=candidate?.finishReason||d.promptFeedback?.blockReason||'desconocido';
        const safetyRatings=candidate?.safetyRatings?.filter(r=>r.probability!=='NEGLIGIBLE').map(r=>`${r.category}:${r.probability}`).join(', ')||'';
        if(reason==='SAFETY')throw new Error('Respuesta bloqueada por filtros de seguridad. Intente reformular.');
        if(reason==='MAX_TOKENS')throw new Error('Respuesta cortada por límite de tokens. Intente un mensaje más corto.');
        throw new Error(`Sin respuesta (${reason}${safetyRatings?' · '+safetyRatings:''})`);
      }
      const raw=textPart.text;

      // Parse and execute ALL save actions present
      const actions=parsePsickeAction(raw);
      const display=stripPsickeJson(raw);
      const savedLabels=[];

      if(actions&&setData){
        const td=today();
        // ── Helper: resolve personId by name ──
        const resolvePersonId=(name)=>{
          if(!name) return '';
          const p=(data.people||[]).find(p=>p.name.toLowerCase()===name.toLowerCase());
          return p?.id||'';
        };

        // Run all actions sequentially, accumulating state
        let updData={...data};
        const execAction=(action)=>{        // ── SAVE_PLAN ──
        if(action.action==='SAVE_PLAN'&&action.data.objective){
          const plan=action.data;
          const matchedArea=(data.areas||[]).find(a=>a.name.toLowerCase()===plan.area?.toLowerCase());
          const areaId=matchedArea?.id||'';
          const objId=uid();
          const newObj={id:objId,title:plan.objective.title,areaId,deadline:plan.objective.deadline||'',status:'active'};
          const projId=uid();
          const newProj={id:projId,title:plan.project?.title||plan.objective.title,objectiveId:objId,areaId,status:'active'};
          const newTasks=(plan.tasks||[]).map(t=>({id:uid(),title:t.title,projectId:projId,status:'todo',priority:t.priority||'media',dueDate:t.dueDate||''}));
          const newHabits=(plan.habits||[]).map(h=>({id:uid(),name:h.name,frequency:h.frequency||'daily',completions:[]}));
          const updObj=[newObj,...(updData.objectives||[])];
          const updProj=[newProj,...(updData.projects||[])];
          const updTasks=[...newTasks,...(updData.tasks||[])];
          const updHabits=[...(updData.habits||[]),...newHabits];
          updData={...updData,objectives:updObj,projects:updProj,tasks:updTasks,habits:updHabits};
          save('objectives',updObj);save('projects',updProj);save('tasks',updTasks);save('habits',updHabits);
          return `🗺️ Plan creado · 🎯 ${newObj.title} · 📋 ${newTasks.length} tareas${newHabits.length?' · 🔁 '+newHabits.length+' hábitos':''}`;

        // ── SAVE_TASK ──
        }else if(action.action==='SAVE_TASK'&&action.data.title){
          const t={id:uid(),title:action.data.title,projectId:'',status:'todo',priority:action.data.priority||'media',deadline:action.data.deadline||''};
          const upd=[t,...(updData.tasks||[])];
          updData={...updData,tasks:upd};save('tasks',upd);
          return '📋 Tarea guardada';

        // ── SAVE_NOTE ──
        }else if(action.action==='SAVE_NOTE'&&action.data.title){
          let resolvedAreaId=action.data.areaId||'';
          if(!resolvedAreaId&&action.data.area){
            const match=(data.areas||[]).find(a=>a.name.toLowerCase()===action.data.area?.toLowerCase());
            resolvedAreaId=match?.id||'';
          }
          const areaLabel=resolvedAreaId?(data.areas||[]).find(a=>a.id===resolvedAreaId):null;
          const n={id:uid(),title:action.data.title,content:action.data.content||'',tags:action.data.tags||[],areaId:resolvedAreaId,createdAt:td,
            ...(action.data.amount?{amount:Number(action.data.amount),currency:action.data.currency||'MXN'}:{})};
          const upd=[n,...(updData.notes||[])];
          updData={...updData,notes:upd};save('notes',upd);
          const noteLabel=`📝 Nota guardada${areaLabel?' · '+areaLabel.icon+' '+areaLabel.name:''}${n.amount?' · 💰 $'+n.amount+' '+n.currency:''}`;
          return noteLabel;
        // ── SAVE_INBOX ──
        }else if(action.action==='SAVE_INBOX'&&action.data.content){
          const i={id:uid(),content:action.data.content,createdAt:td,processed:false};
          const upd=[i,...(updData.inbox||[])];
          updData={...updData,inbox:upd};save('inbox',upd);
          return '📥 Agregado al inbox';

        // ── SAVE_BUDGET ──
        }else if(action.action==='SAVE_BUDGET'&&action.data.title){
          const b={id:uid(),title:action.data.title,amount:Number(action.data.amount)||0,currency:action.data.currency||'MXN',
            dayOfMonth:Number(action.data.dayOfMonth)||1,
            areaId:(()=>{if(action.data.areaId)return action.data.areaId;if(action.data.area){const m=(data.areas||[]).find(a=>a.name.toLowerCase()===action.data.area.toLowerCase());return m?.id||'';}return '';})(),
            createdAt:td};
          const upd=[b,...(updData.budget||[])];
          updData={...updData,budget:upd};save('budget',upd);
          return `💳 Presupuesto: ${b.title} — $${b.amount} ${b.currency}/mes (día ${b.dayOfMonth})`;

        // ── SAVE_HABIT ──
        }else if(action.action==='SAVE_HABIT'&&action.data.name){
          const h={id:uid(),name:action.data.name,frequency:action.data.frequency||'daily',completions:[]};
          const upd=[...(updData.habits||[]),h];
          updData={...updData,habits:upd};save('habits',upd);
          return `🔁 Hábito creado: ${h.name}`;

        // ── SAVE_TRANSACTION ──
        }else if(action.action==='SAVE_TRANSACTION'&&action.data.amount){
          const tx={id:uid(),type:action.data.type||'egreso',amount:Number(action.data.amount)||0,
            currency:action.data.currency||'MXN',category:action.data.category||'Otro',
            description:action.data.description||'',date:action.data.date||td,createdAt:td};
          const upd=[tx,...(updData.transactions||[])];
          updData={...updData,transactions:upd};save('transactions',upd);
          return `💸 ${tx.type==='ingreso'?'Ingreso':'Gasto'}: $${tx.amount} ${tx.currency} — ${tx.category}${tx.description?' ('+tx.description+')':''}`;

        // ── SAVE_HEALTH_METRIC ──
        }else if(action.action==='SAVE_HEALTH_METRIC'&&action.data.type){
          const m={id:uid(),type:action.data.type,value:action.data.value,unit:action.data.unit||'',
            date:action.data.date||td,notes:action.data.notes||'',createdAt:td};
          const upd=[m,...(updData.healthMetrics||[])];
          updData={...updData,healthMetrics:upd};save('healthMetrics',upd);
          return `📊 Métrica: ${m.type} — ${m.value} ${m.unit}`;

        // ── SAVE_WORKOUT ──
        }else if(action.action==='SAVE_WORKOUT'&&action.data.type){
          const w={id:uid(),type:action.data.type,duration:Number(action.data.duration)||0,
            calories:Number(action.data.calories)||0,distance:Number(action.data.distance)||0,
            date:action.data.date||td,notes:action.data.notes||'',createdAt:td};
          const upd=[w,...(updData.workouts||[])];
          updData={...updData,workouts:upd};save('workouts',upd);
          return `🏃 Workout: ${w.type} ${w.duration}min${w.calories?' · '+w.calories+'kcal':''}`;

        // ── SAVE_MEDICATION ──
        }else if(action.action==='SAVE_MEDICATION'&&action.data.name){
          const m={id:uid(),name:action.data.name,dose:action.data.dose||'',unit:action.data.unit||'',
            frequency:action.data.frequency||'daily',time:action.data.time||'',
            stock:Number(action.data.stock)||0,createdAt:td};
          const upd=[m,...(updData.medications||[])];
          updData={...updData,medications:upd};save('medications',upd);
          return `💊 Medicamento: ${m.name} ${m.dose} ${m.unit}`;

        // ── SAVE_MAINTENANCE ──
        }else if(action.action==='SAVE_MAINTENANCE'&&action.data.name){
          const m={id:uid(),name:action.data.name,category:action.data.category||'General',
            frequencyDays:Number(action.data.frequencyDays)||30,lastDone:action.data.lastDone||td,
            cost:Number(action.data.cost)||0,notes:action.data.notes||'',createdAt:td};
          const upd=[m,...(updData.maintenances||[])];
          updData={...updData,maintenances:upd};save('maintenances',upd);
          return `🔧 Mantenimiento: ${m.name} — cada ${m.frequencyDays}d`;

        // ── SAVE_HOME_DOC ──
        }else if(action.action==='SAVE_HOME_DOC'&&action.data.name){
          const d2={id:uid(),name:action.data.name,category:action.data.category||'Otro',
            expiryDate:action.data.expiryDate||'',provider:action.data.provider||'',
            annualCost:Number(action.data.annualCost)||0,notes:action.data.notes||'',createdAt:td};
          const upd=[d2,...(updData.homeDocs||[])];
          updData={...updData,homeDocs:upd};save('homeDocs',upd);
          return `📄 Documento: ${d2.name}${d2.expiryDate?' · vence '+d2.expiryDate:''}`;

        // ── SAVE_HOME_CONTACT ──
        }else if(action.action==='SAVE_HOME_CONTACT'&&action.data.name){
          const c={id:uid(),name:action.data.name,role:action.data.role||'Otro',
            phone:action.data.phone||'',email:action.data.email||'',
            notes:action.data.notes||'',createdAt:td};
          const upd=[c,...(updData.homeContacts||[])];
          updData={...updData,homeContacts:upd};save('homeContacts',upd);
          return `📞 Contacto: ${c.name} (${c.role})`;

        // ── SAVE_LEARNING ──
        }else if(action.action==='SAVE_LEARNING'&&action.data.name){
          const l={id:uid(),name:action.data.name,platform:action.data.platform||'',
            category:action.data.category||'',progress:Number(action.data.progress)||0,
            hoursSpent:Number(action.data.hoursSpent)||0,hoursTotal:Number(action.data.hoursTotal)||0,
            status:'active',notes:action.data.notes||'',createdAt:td};
          const upd=[l,...(updData.learnings||[])];
          updData={...updData,learnings:upd};save('learnings',upd);
          return `📖 Aprendizaje: ${l.name}${l.platform?' en '+l.platform:''} (${l.progress}%)`;

        // ── SAVE_RETRO ──
        }else if(action.action==='SAVE_RETRO'&&(action.data.wentWell||action.data.learned)){
          const r={id:uid(),period:action.data.period||'semanal',date:action.data.date||td,
            wentWell:action.data.wentWell||'',improve:action.data.improve||'',
            learned:action.data.learned||'',createdAt:td};
          const upd=[r,...(updData.retros||[])];
          updData={...updData,retros:upd};save('retros',upd);
          return `🔄 Retrospectiva ${r.period} guardada`;

        // ── SAVE_IDEA ──
        }else if(action.action==='SAVE_IDEA'&&action.data.content){
          const i={id:uid(),content:action.data.content,tag:action.data.tag||'Idea',
            date:action.data.date||td,createdAt:td};
          const upd=[i,...(updData.ideas||[])];
          updData={...updData,ideas:upd};save('ideas',upd);
          return `💡 Idea guardada: [${i.tag}]`;

        // ── SAVE_PERSON ──
        }else if(action.action==='SAVE_PERSON'&&action.data.name){
          const p={id:uid(),name:action.data.name,relation:action.data.relation||'',
            birthday:action.data.birthday||'',emoji:action.data.emoji||'👤',
            phone:action.data.phone||'',email:action.data.email||'',
            notes:action.data.notes||'',createdAt:td};
          const upd=[p,...(updData.people||[])];
          updData={...updData,people:upd};save('people',upd);
          return `👤 Persona: ${p.emoji} ${p.name}${p.relation?' ('+p.relation+')':''}`;

        // ── SAVE_FOLLOWUP ──
        }else if(action.action==='SAVE_FOLLOWUP'&&action.data.task){
          const personId=resolvePersonId(action.data.personName);
          const f={id:uid(),personId,task:action.data.task,
            dueDate:action.data.dueDate||'',priority:action.data.priority||'media',
            done:false,createdAt:td};
          const upd=[f,...(updData.followUps||[])];
          updData={...updData,followUps:upd};save('followUps',upd);
          return `📋 Seguimiento: "${f.task}"${action.data.personName?' con '+action.data.personName:''}`;

        // ── SAVE_INTERACTION ──
        }else if(action.action==='SAVE_INTERACTION'&&action.data.personName){
          const personId=resolvePersonId(action.data.personName);
          const i={id:uid(),personId,type:action.data.type||'Otro',
            date:action.data.date||td,notes:action.data.notes||'',createdAt:td};
          const upd=[i,...(updData.interactions||[])];
          updData={...updData,interactions:upd};save('interactions',upd);
          return `💬 Contacto: ${action.data.type||'Interacción'} con ${action.data.personName}`;

        // ── SAVE_SIDE_PROJECT ──
        }else if(action.action==='SAVE_SIDE_PROJECT'&&action.data.name){
          const p={id:uid(),name:action.data.name,description:action.data.description||'',
            status:action.data.status||'idea',stack:action.data.stack||'',
            url:action.data.url||'',startDate:action.data.startDate||td,
            color:T.areaColors[Math.floor(Math.random()*T.areaColors.length)],createdAt:td};
          const upd=[p,...(updData.sideProjects||[])];
          updData={...updData,sideProjects:upd};save('sideProjects',upd);
          return `🚀 Proyecto: ${p.name} [${p.status}]`;

        // ── SAVE_SP_TASK ──
        }else if(action.action==='SAVE_SP_TASK'&&action.data.title){
          const proj=(updData.sideProjects||[]).find(p=>p.name.toLowerCase()===action.data.projectName?.toLowerCase());
          const t={id:uid(),projectId:proj?.id||'',title:action.data.title,
            priority:action.data.priority||'media',dueDate:action.data.dueDate||'',
            done:false,createdAt:td};
          const upd=[t,...(updData.spTasks||[])];
          updData={...updData,spTasks:upd};save('spTasks',upd);
          return `✅ Tarea: "${t.title}"${proj?' en '+proj.name:''}`;

        // ── SAVE_MILESTONE ──
        }else if(action.action==='SAVE_MILESTONE'&&action.data.title){
          const proj=(updData.sideProjects||[]).find(p=>p.name.toLowerCase()===action.data.projectName?.toLowerCase());
          const m={id:uid(),projectId:proj?.id||'',title:action.data.title,
            date:action.data.date||td,notes:action.data.notes||'',createdAt:td};
          const upd=[m,...(updData.milestones||[])];
          updData={...updData,milestones:upd};save('milestones',upd);
          return `🏆 Hito: "${m.title}"${proj?' en '+proj.name:''}`;

        // ── SAVE_CAR_INFO ──
        }else if(action.action==='SAVE_CAR_INFO'){
          const current=updData.carInfo||{};
          const updated={...current,...action.data};
          updData={...updData,carInfo:updated};save('carInfo',updated);
          const parts=[];
          if(action.data.km) parts.push(`🛣 ${Number(action.data.km).toLocaleString()} km`);
          if(action.data.brand) parts.push(`${action.data.brand} ${action.data.model||''}`);
          if(action.data.plate) parts.push(action.data.plate);
          return `🚗 Coche actualizado${parts.length?' · '+parts.join(' · '):''}`;

        // ── SAVE_CAR_EXPENSE ──
        }else if(action.action==='SAVE_CAR_EXPENSE'&&action.data.concept){
          const e={id:uid(),concept:action.data.concept,category:action.data.category||'Otro',
            amount:Number(action.data.amount)||0,date:action.data.date||td,
            notes:action.data.notes||'',createdAt:td};
          const upd=[e,...(updData.carExpenses||[])];
          updData={...updData,carExpenses:upd};save('carExpenses',upd);
          return `🚗 Gasto coche: ${e.concept} · $${e.amount}`;

        // ── SAVE_CAR_MAINTENANCE ──
        }else if(action.action==='SAVE_CAR_MAINTENANCE'&&action.data.name){
          const m={id:uid(),name:action.data.name,category:action.data.category||'General',
            lastDone:action.data.lastDone||td,frequencyKm:action.data.frequencyKm||'',
            frequencyDays:action.data.frequencyDays||'',cost:Number(action.data.cost)||0,
            notes:action.data.notes||'',createdAt:td};
          const upd=[m,...(updData.carMaintenances||[])];
          updData={...updData,carMaintenances:upd};save('carMaintenances',upd);
          return `🔧 Mantenimiento coche: ${m.name}${m.cost?' · $'+m.cost:''}`;

        // ── SAVE_FARMACIA_ITEM ──
        }else if(action.action==='SAVE_FARMACIA_ITEM'&&action.data.name){
          const f={id:uid(),name:action.data.name,quantity:Number(action.data.quantity)||0,
            unit:action.data.unit||'unidades',expiresAt:action.data.expiresAt||'',
            location:action.data.location||'',notes:action.data.notes||'',createdAt:td};
          const upd=[f,...(updData.farmaciaItems||[])];
          updData={...updData,farmaciaItems:upd};save('farmaciaItems',upd);
          return `💊 Botiquín: ${f.name} · ${f.quantity} ${f.unit}${f.expiresAt?' vence '+f.expiresAt:''}`;
        }
        return null;
      };

        // ── AUTO-CASCADE: guaranteed cross-module propagation regardless of AI output ──
        // Helper: fuzzy check if a SAVE_TRANSACTION for this amount+context already exists in actions
        const hasTxForAmount=(amt,keyword)=>actions.some(a=>
          a.action==='SAVE_TRANSACTION'&&
          Number(a.data.amount)===Number(amt)&&
          (a.data.description||'').toLowerCase().includes((keyword||'').toLowerCase().split(' ')[0])
        );
        const hasCarExpForAmount=(amt)=>actions.some(a=>
          a.action==='SAVE_CAR_EXPENSE'&&Number(a.data.amount)===Number(amt)
        );

        const autoCascade=(action)=>{
          const d=action.data;const cascaded=[];
          // CAR MAINTENANCE with cost → auto TRANSACTION + CAR EXPENSE (only if AI didn't already send them)
          if(action.action==='SAVE_CAR_MAINTENANCE'&&Number(d.cost)>0){
            if(!hasTxForAmount(d.cost,d.name))
              cascaded.push({action:'SAVE_TRANSACTION',data:{type:'egreso',amount:d.cost,currency:d.currency||'MXN',category:'Transporte',description:d.name,date:d.lastDone||td}});
            if(!hasCarExpForAmount(d.cost))
              cascaded.push({action:'SAVE_CAR_EXPENSE',data:{concept:d.name,category:'Reparación',amount:d.cost,date:d.lastDone||td,notes:d.notes||''}});
          }
          // HOGAR MAINTENANCE with cost → auto TRANSACTION
          if(action.action==='SAVE_MAINTENANCE'&&Number(d.cost)>0){
            if(!hasTxForAmount(d.cost,d.name))
              cascaded.push({action:'SAVE_TRANSACTION',data:{type:'egreso',amount:d.cost,currency:d.currency||'MXN',category:'Hogar',description:d.name,date:d.lastDone||td}});
          }
          // WORKOUT → auto mark matching habit complete today
          if(action.action==='SAVE_WORKOUT'){
            const wType=(d.type||'').toLowerCase();
            const matchHabit=(updData.habits||[]).find(h=>{
              const n=h.name.toLowerCase();
              return n.includes(wType)||n.includes('ejercicio')||n.includes('gym')||n.includes('entreno')||n.includes('deporte');
            });
            if(matchHabit&&!matchHabit.completions?.includes(td)){
              const updHabits=(updData.habits||[]).map(h=>h.id===matchHabit.id?{...h,completions:[...(h.completions||[]),td]}:h);
              updData={...updData,habits:updHabits};save('habits',updHabits);
              savedLabels.push(`🔥 Hábito marcado: ${matchHabit.name}`);
            }
          }
          // MEDICATION with stock → auto add to farmacia if not already there
          if(action.action==='SAVE_MEDICATION'&&Number(d.stock)>0){
            const alreadyFarm=actions.some(a=>a.action==='SAVE_FARMACIA_ITEM');
            const existsInFarm=(updData.farmaciaItems||[]).some(f=>f.name.toLowerCase()===d.name.toLowerCase());
            if(!alreadyFarm&&!existsInFarm)
              cascaded.push({action:'SAVE_FARMACIA_ITEM',data:{name:d.name,quantity:d.stock,unit:d.unit||'unidades',notes:`Prescrito: ${d.dose||''} ${d.frequency||''}`}});
          }
          // TRANSACTION egreso Transporte → auto CAR EXPENSE only if carInfo exists AND no CAR_MAINTENANCE already handling it
          if(action.action==='SAVE_TRANSACTION'&&d.type==='egreso'&&d.category==='Transporte'){
            const maintHandled=actions.some(a=>a.action==='SAVE_CAR_MAINTENANCE');
            if(!maintHandled&&!hasCarExpForAmount(d.amount)&&updData.carInfo?.brand)
              cascaded.push({action:'SAVE_CAR_EXPENSE',data:{concept:d.description||d.category,category:'Combustible',amount:d.amount,date:d.date||td,notes:''}});
          }
          // SAVE_PERSON with birthday → auto SAVE_FOLLOWUP reminder
          if(action.action==='SAVE_PERSON'&&d.birthday){
            cascaded.push({action:'SAVE_FOLLOWUP',data:{personName:d.name,task:`Felicitar cumpleaños a ${d.name}`,dueDate:d.birthday.replace(/^\d{4}/,new Date().getFullYear()),priority:'media'}});
          }
          return cascaded;
        };

        // Execute all actions + their cascades
        const allActions=[...actions];
        for(const action of allActions){
          const label=execAction(action);
          if(label) savedLabels.push(label);
          const cascaded=autoCascade(action);
          for(const ca of cascaded){
            const cl=execAction(ca);
            if(cl) savedLabels.push('↳ '+cl);
          }
        }
        // Solo aplicar las keys que Psicke realmente modificó,
        // preservando cualquier cambio concurrente del usuario.
        const dataSnapshot=data;
        const delta=Object.fromEntries(
          Object.keys(updData).filter(k=>updData[k]!==dataSnapshot[k]).map(k=>[k,updData[k]])
        );
        setData(d=>({...d,...delta}));
      }
      const finalContent=display+(savedLabels.length?'\n\n✅ '+savedLabels.join('\n✅ '):'');
      saveMsgs([...next,{role:'assistant',content:finalContent}]);
    }catch(e){
      const msg=e.message==='Failed to fetch'
        ?'No se pudo conectar. Verifica su conexión o que la API key sea válida.'
        :e.message;
      saveMsgs([...next,{role:'assistant',content:`⚠️ ${msg}`}]);
    }
    setLoading(false);
  };

  const toggleMic=()=>{
    if(recording){recRef.current?.stop();setRecording(false);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return;
    const r=new SR();r.lang='es-MX';r.continuous=false;r.interimResults=false;
    r.onresult=e=>{setInput(e.results[0][0].transcript);setRecording(false);};
    r.onerror=r.onend=()=>setRecording(false);
    recRef.current=r;r.start();setRecording(true);
  };

  return(
    <>
      <style>{`
        @keyframes psicke-in{from{opacity:0;transform:translateY(32px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes psicke-pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,200,150,0.5)}50%{box-shadow:0 0 0 12px rgba(0,200,150,0)}}
        @keyframes psicke-dot{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes psicke-ring{0%{opacity:0.6;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}
        .psicke-bubble:active{transform:scale(0.93)!important;}
      `}</style>

      {/* CHAT PANEL */}
      {open&&(
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}
          onClick={e=>e.target===e.currentTarget&&closePanel()}>
          {/* Backdrop */}
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)'}} onClick={()=>closePanel()}/>

          {/* Panel */}
          <div style={{position:'relative',zIndex:1,background:T.surface,borderRadius:'20px 20px 0 0',border:`1px solid ${T.borderLight}`,borderBottom:'none',
            maxHeight:'78vh',display:'flex',flexDirection:'column',
            animation:'psicke-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
            boxShadow:'0 -8px 48px rgba(0,0,0,0.6)'}}>

            {/* Handle + header */}
            <div style={{padding:'12px 20px 0',flexShrink:0}}>
              <div style={{width:36,height:4,background:T.border,borderRadius:2,margin:'0 auto 14px'}}/>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.orange})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>
                    🧠
                  </div>
                  <div>
                    <div style={{color:T.text,fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif",lineHeight:1}}>Psicke</div>
                    <div style={{color:T.muted,fontSize:11,marginTop:2}}>Tu IA personal · siempre aquí</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button onClick={clearMsgs}
                    style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.dim,fontSize:11,fontFamily:'inherit'}}>
                    Borrar
                  </button>
                  <button onClick={()=>closePanel()}
                    style={{background:'none',border:'none',cursor:'pointer',color:T.muted,display:'flex',padding:4}}>
                    <Icon name="x" size={20}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Back arrow + Suggestions */}
            {!showSugg&&msgs.length>1&&(
              <div style={{padding:'0 16px 6px',flexShrink:0}}>
                <button onClick={()=>setShowSugg(true)}
                  style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:T.muted,cursor:'pointer',padding:'4px 0',fontSize:12,fontFamily:'inherit',transition:'color 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.color=T.accent}
                  onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
                  ← Sugerencias
                </button>
              </div>
            )}
            {showSugg&&suggestions.length>0&&(
              <div style={{padding:'0 14px 10px',flexShrink:0}}>
                <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:7}}>Sugerencias</div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {suggestions.map((s,i)=>(
                    <div key={i} onClick={()=>{setInput(s.q);setShowSugg(false);setTimeout(()=>inputRef.current?.focus(),50);}}
                      style={{display:'flex',alignItems:'center',gap:9,padding:'8px 11px',background:T.surface2,border:`1px solid ${s.color}28`,borderLeft:`3px solid ${s.color}`,borderRadius:9,cursor:'pointer',transition:'all 0.15s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#162030'}
                      onMouseLeave={e=>e.currentTarget.style.background=T.surface2}>
                      <span style={{fontSize:15,flexShrink:0}}>{s.icon}</span>
                      <span style={{fontSize:12,color:T.text,flex:1,lineHeight:1.4}}>{s.text}</span>
                      <span style={{fontSize:10,color:s.color,fontWeight:700,flexShrink:0}}>→</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'0 16px',display:'flex',flexDirection:'column',gap:10,minHeight:0}}
              onClick={()=>setMsgMenu(null)}>
              {msgs.map((m,i)=>{
                const isUser=m.role==='user';
                const showMenu=msgMenu===i;
                const isEditing=editingIdx===i;
                return(
                  <div key={i} style={{display:'flex',flexDirection:'column',alignItems:isUser?'flex-end':'flex-start'}}>
                    <div style={{display:'flex',justifyContent:isUser?'flex-end':'flex-start',alignItems:'flex-end',gap:6}}>
                      {!isUser&&<div style={{width:24,height:24,borderRadius:7,background:`${T.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2,fontSize:14}}>
                        🧠
                      </div>}
                      {isUser&&isEditing?(
                        <div style={{maxWidth:'82%',display:'flex',flexDirection:'column',gap:6}}>
                          <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
                            autoFocus rows={3}
                            style={{width:'100%',background:T.surface2,border:`1px solid ${T.accent}`,color:T.text,
                              padding:'8px 12px',borderRadius:12,fontSize:14,outline:'none',resize:'none',
                              fontFamily:'inherit',lineHeight:1.5,boxSizing:'border-box'}}/>
                          <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                            <button onClick={()=>{setEditingIdx(null);setEditVal('');}}
                              style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 12px',
                                cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit'}}>
                              Cancelar
                            </button>
                            <button onClick={()=>{
                                if(!editVal.trim())return;
                                // Truncate history to this message and resend with edited content
                                const trimmed=msgs.slice(0,i);
                                saveMsgs(trimmed);
                                setEditingIdx(null);setEditVal('');setMsgMenu(null);
                                setTimeout(()=>send(editVal.trim()),50);
                              }}
                              style={{background:T.accent,border:'none',borderRadius:8,padding:'4px 14px',
                                cursor:'pointer',color:T.userText||'#000',fontSize:12,fontFamily:'inherit',fontWeight:600}}>
                              Enviar
                            </button>
                          </div>
                        </div>
                      ):(
                        <div
                          onClick={e=>{if(isUser){e.stopPropagation();setMsgMenu(showMenu?null:i);}}}
                          style={{maxWidth:'82%',padding:'9px 13px',borderRadius:13,fontSize:14,lineHeight:1.6,whiteSpace:'pre-wrap',
                            background:isUser?(T.userBubble||T.accent):T.surface2,
                            color:isUser?(T.userText||'#000'):T.text,
                            borderBottomRightRadius:isUser?2:13,
                            borderBottomLeftRadius:!isUser?2:13,
                            border:!isUser?`1px solid ${T.border}`:'none',
                            cursor:isUser?'pointer':'default',
                            transition:'opacity 0.15s',
                            opacity:isUser&&showMenu?0.85:1}}>
                          {m.content}
                        </div>
                      )}
                    </div>
                    {/* Action bar for user messages */}
                    {isUser&&showMenu&&!isEditing&&(
                      <div onClick={e=>e.stopPropagation()}
                        style={{display:'flex',gap:4,marginTop:4,marginRight:2,
                          animation:'psicke-in 0.15s ease-out both'}}>
                        {[
                          {label:copied===i?'✓ Copiado':'Copiar', action:()=>{
                            navigator.clipboard?.writeText(m.content).catch(()=>{});
                            setCopied(i);setTimeout(()=>setCopied(null),2000);
                          }},
                          {label:'Editar', action:()=>{
                            setEditVal(m.content);setEditingIdx(i);setMsgMenu(null);
                          }},
                          {label:'Reenviar', action:()=>{
                            // Trim history to just before this msg and resend it
                            const trimmed=msgs.slice(0,i);
                            saveMsgs(trimmed);setMsgMenu(null);
                            setTimeout(()=>send(m.content),50);
                          }},
                        ].map(btn=>(
                          <button key={btn.label} onClick={btn.action}
                            style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:8,
                              padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:11,
                              fontFamily:'inherit',transition:'all 0.15s',fontWeight:500}}
                            onMouseEnter={e=>e.currentTarget.style.color=T.accent}
                            onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Welcome area chips ── */}
              {welcomeAreas&&welcomeAreas.length>0&&!loading&&(
                <div style={{paddingLeft:30,marginTop:4,animation:'psicke-in 0.3s ease-out both'}}>
                  <p style={{fontSize:11,color:T.muted,margin:'0 0 8px',fontWeight:500}}>Elige un área para empezar:</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                    {welcomeAreas.map(a=>(
                      <button key={a.id} onClick={()=>{
                        setWelcomeAreas(null);
                        setShowSugg(false);
                        send(`Hagamos un plan de acción con pequeños pasos concretos para el área de ${a.label}. Toma en cuenta todo lo que ya sé de mi información inicial.`);
                      }} style={{
                        background:`${T.accent}12`,
                        border:`1px solid ${T.accent}30`,
                        borderRadius:20,padding:'6px 14px',
                        color:T.accent,fontSize:12,fontWeight:500,
                        cursor:'pointer',fontFamily:'inherit',
                        display:'flex',alignItems:'center',gap:6,
                        transition:'all 0.15s',
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${T.accent}22`;e.currentTarget.style.borderColor=`${T.accent}55`;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=`${T.accent}12`;e.currentTarget.style.borderColor=`${T.accent}30`;}}>
                        <span style={{fontSize:14}}>{a.emoji}</span>{a.label}
                      </button>
                    ))}
                    <button onClick={()=>setWelcomeAreas(null)}
                      style={{background:'transparent',border:`1px solid ${T.border}`,borderRadius:20,
                        padding:'6px 14px',color:T.dim,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                      Explorar solo
                    </button>
                  </div>
                </div>
              )}

              {loading&&(
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:24,height:24,borderRadius:7,background:`${T.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}}>
                    🧠
                  </div>
                  <div style={{padding:'9px 14px',borderRadius:13,borderBottomLeftRadius:2,background:T.surface2,border:`1px solid ${T.border}`,display:'flex',gap:4,alignItems:'center'}}>
                    {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:'50%',background:T.accent,display:'inline-block',animation:`psicke-dot 0.9s ${i*0.18}s ease-in-out infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input area */}
            <div style={{padding:'12px 16px 20px',flexShrink:0,borderTop:`1px solid ${T.border}`,marginTop:8}}>
              {recording&&<div style={{textAlign:'center',color:T.red,fontSize:11,fontWeight:600,marginBottom:6,letterSpacing:1}}>● ESCUCHANDO</div>}
              {/* Slash command menu */}
              {slashMenu&&filteredCmds.length>0&&(
                <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:8,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
                  {filteredCmds.map(c=>(
                    <div key={c.cmd} onClick={()=>applySlashCmd(c)}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',borderBottom:`1px solid ${T.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}10`}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontSize:16}}>{c.icon}</span>
                      <div>
                        <span style={{fontSize:13,fontWeight:700,color:T.accent}}>{c.cmd}</span>
                        <span style={{fontSize:12,color:T.muted,marginLeft:8}}>{c.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button onClick={toggleMic} aria-label={recording?'Detener grabación':'Iniciar grabación de voz'} style={{
                  width:38,height:38,borderRadius:'50%',border:`2px solid ${recording?T.red:T.border}`,
                  background:recording?`${T.red}22`:'transparent',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:recording?T.red:T.muted,flexShrink:0,transition:'all 0.2s'}}>
                  <Icon name={recording?'micoff':'mic'} size={16} color={recording?T.red:undefined}/>
                </button>
                <input ref={inputRef} value={input} onChange={e=>{handleInput(e.target.value);}}
                  onKeyDown={e=>{
                    if(e.key==='Escape'){setSlashMenu(false);return;}
                    if(e.key==='Enter'&&!e.shiftKey){setSlashMenu(false);send();}
                  }}
                  autoComplete="off" autoCorrect="off" spellCheck="false"
                  placeholder="Pregunta, idea o escribe / para comandos..."
                  style={{flex:1,background:T.bg,border:`1px solid ${T.border}`,color:T.text,
                    padding:'10px 14px',borderRadius:12,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
                <button onClick={()=>{setSlashMenu(false);send();}} disabled={!input.trim()||loading}
                  aria-label="Enviar mensaje"
                  style={{width:38,height:38,borderRadius:'50%',flexShrink:0,
                    background:input.trim()&&!loading?T.accent:'transparent',
                    border:input.trim()&&!loading?'none':`1px solid ${T.border}`,
                    cursor:input.trim()&&!loading?'pointer':'not-allowed',
                    display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}>
                  <Icon name="send" size={16} color={input.trim()&&!loading?'#000':T.dim}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};


export default Psicke;
