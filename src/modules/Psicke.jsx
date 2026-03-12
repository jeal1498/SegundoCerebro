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

const GROQ_MODELS = ['llama-3.3-70b-versatile'];

// ===================== PSICKE — FLOATING BRAIN =====================
// ── Intent detection ──
const detectIntent=(msg)=>{
  const m=msg.toLowerCase();
  const i=new Set();
  if(/(gast|ingres|dinero|pag[oué]|transacc|presupuest|saldo|deuda|factura|precio|costo|cobr|efectivo|billete|tarjeta)/i.test(m)) i.add('finanzas');
  if(/(salud|peso|ejerc|gym|corr|caminé|caminar|medicament|pastilla|doctor|médico|workout|calorí|proteín|agua|sueño|dormí|dormir|horas de|vacuna(?! mascota)|suplemento)/i.test(m)) i.add('salud');
  if(/(coche|carro|auto|km|kilómetro|gasolina|aceite|llanta|freno|mecánico|taller|afinaci|servicio del)/i.test(m)) i.add('coche');
  if(/(casa|hogar|depa|departamento|plomero|electricist|limpieza|mantenimiento del hogar|documento|seguro del hogar|garantía|contrato)/i.test(m)) i.add('hogar');
  if(/(amig|famili|conocí|llamé|mensaj[eé]|reunión con|cita con|cumpleaños|relaci|persona nueva|conoce)/i.test(m)) i.add('relaciones');
  if(/(proyecto|app|web|código|desarrollar|lanzar|startup|side project|repo|deploy)/i.test(m)) i.add('proyectos');
  if(/(dormí|soñé|cama|desperté|sueño raro|pesadilla|sueño lúcido|registro de sueño)/i.test(m)) i.add('sueno');
  if(/(compra|supermercado|súper|tienda|lista de|necesito comprar)/i.test(m)) i.add('compras');
  if(/(película|serie|ver |netflix|prime|disney|hbo|anime|episodio|temporada|contenido)/i.test(m)) i.add('entretenimiento');
  if(/(mascota|perro|gato|vet|veterinari|vacuna del|vacuna a)/i.test(m)) i.add('mascotas');
  if(/(viaj|destino|vuelo|hotel|trip|vacacione|airbnb)/i.test(m)) i.add('viajes');
  if(/(libro|leer|leyendo|lectura|autor|novela|ensayo)/i.test(m)) i.add('libros');
  if(/(aprend|curso|estudi|clase|apunte|habilidad|certif)/i.test(m)) i.add('desarrollo');
  if(/(idea|insight|reflexi|retro|diario|fue un día|hoy fue|semana fue)/i.test(m)) i.add('desarrollo');
  if(/(farmacia|botiquín|medicin|pastilla|suplemento|ibuprofeno|paracetamol)/i.test(m)) i.add('farmacia');
  if(/(hábito|habit|racha)/i.test(m)) i.add('habitos');
  if(/(receta|cocinar|ingrediente|platillo|cocin)/i.test(m)) i.add('nutricion');
  if(/(tarea|pendiente|hacer|recordatorio|deadline|completé la tarea)/i.test(m)) i.add('tareas');
  if(/(nota|apunte|guarda|recordar|inbox|captura)/i.test(m)) i.add('notas');
  return i;
};

// ── Modular context builders ──
const ctxFinanzas=(data,t)=>{
  const tx=(data.transactions||[]).slice(0,5).map(x=>`• ${x.type==='ingreso'?'↑':'↓'} $${x.amount} ${x.currency||'MXN'} — ${x.category||''} ${x.description||''}`).join('\n');
  const bud=(data.budget||[]).map(b=>`• ${b.title}: $${b.amount} ${b.currency||'MXN'}/mes día ${b.dayOfMonth}`).join('\n');
  return `── FINANZAS ──\nÚltimas transacciones:\n${tx||'(sin transacciones)'}\nPresupuesto fijo:\n${bud||'(sin presupuesto)'}`;
};
const ctxSalud=(data,t)=>{
  const met=(data.healthMetrics||[]).slice(0,3).map(m=>`• ${m.type}: ${m.value} ${m.unit||''} (${m.date})`).join('\n');
  const med=(data.medications||[]).map(m=>`• ${m.name} ${m.dose||''} ${m.unit||''} — ${m.frequency||''}`).join('\n');
  const wk=(data.workouts||[]).slice(0,3).map(w=>`• ${w.type} ${w.duration||''}min ${w.date}`).join('\n');
  const hg=Object.entries(data.healthGoals||{}).map(([k,v])=>`${k}: ${v}`).join(', ');
  return `── SALUD ──\nMétricas: ${met||'(sin métricas)'}\nMetas: ${hg||'(por defecto)'}\nMedicamentos: ${med||'(ninguno)'}\nActividad: ${wk||'(sin registros)'}`;
};
const ctxCoche=(data)=>{
  const ci=data.carInfo||{};
  const inf=ci.brand?`${ci.brand} ${ci.model||''} ${ci.year||''} · ${ci.plate||''} · ${ci.km||'?'} km`:'Sin datos del coche';
  const mt=(data.carMaintenances||[]).slice(0,3).map(m=>`• ${m.name} — último: ${m.lastDone||'nunca'}, cada ${m.frequencyDays||'?'}d/${m.frequencyKm||'?'}km`).join('\n');
  const gx=(data.carExpenses||[]).slice(0,3).map(e=>`• ${e.concept}: $${e.amount} (${e.date||''})`).join('\n');
  return `── COCHE ──\nDatos: ${inf}\nMantenimientos:\n${mt||'(sin mantenimientos)'}\nGastos recientes:\n${gx||'(sin gastos)'}`;
};
const ctxHogar=(data)=>{
  const mt=(data.maintenances||[]).slice(0,3).map(m=>`• ${m.name} — cada ${m.frequencyDays}d, último: ${m.lastDone||'nunca'}`).join('\n');
  const dc=(data.homeDocs||[]).slice(0,3).map(d=>`• ${d.name} vence: ${d.expiryDate||'—'}`).join('\n');
  return `── HOGAR ──\nMantenimientos:\n${mt||'(sin mantenimientos)'}\nDocumentos:\n${dc||'(sin documentos)'}`;
};
const ctxRelaciones=(data)=>{
  const pp=(data.people||[]).map(p=>`• ${p.emoji||'👤'} ${p.name} (${p.relation||''})`).join('\n');
  const fu=(data.followUps||[]).filter(f=>!f.done).slice(0,3).map(f=>{
    const p=(data.people||[]).find(x=>x.id===f.personId);
    return `• ${f.task} → ${p?.name||'?'} ${f.dueDate?'('+f.dueDate+')':''}`;
  }).join('\n');
  return `── RELACIONES ──\nPersonas:\n${pp||'(sin personas)'}\nSeguimientos pendientes:\n${fu||'(sin seguimientos)'}`;
};
const ctxProyectos=(data)=>{
  const ap=(data.sideProjects||[]).filter(p=>p.status==='progress').map(p=>`• ${p.name} — ${p.stack||''}`).join('\n');
  const tk=(data.spTasks||[]).filter(t=>!t.done).slice(0,4).map(t=>{
    const p=(data.sideProjects||[]).find(x=>x.id===t.projectId);
    return `• ${t.title} [${p?.name||'?'}]`;
  }).join('\n');
  return `── SIDE PROJECTS ──\nEn progreso:\n${ap||'(sin proyectos activos)'}\nTareas pendientes:\n${tk||'(sin tareas)'}`;
};
const ctxSueno=(data)=>{
  const sl=(data.sleepLog||[]).slice(0,3).map(s=>`• ${s.date}: ${s.hoursSlept}h · calidad ${s.quality}/5`).join('\n');
  return `── SUEÑO ──\nÚltimas noches:\n${sl||'(sin registros)'}`;
};
const ctxCompras=(data)=>{
  const sh=(data.shopping||[]).filter(i=>!i.done).map(i=>`• ${i.qty} ${i.unit} ${i.name}${i.category?' ['+i.category+']':''}`).join('\n');
  return `── COMPRAS ──\nLista pendiente:\n${sh||'(lista vacía)'}`;
};
const ctxEntretenimiento=(data)=>{
  const w=(data.entertainment||[]).filter(e=>e.status==='watching').map(e=>`• ${e.title} (${e.type==='movie'?'Película':'Serie'})`).join('\n');
  const ww=(data.entertainment||[]).filter(e=>e.status==='want').slice(0,3).map(e=>`• ${e.title}`).join('\n');
  return `── ENTRETENIMIENTO ──\nViendo: ${w||'(nada)'}\nPor ver: ${ww||'(lista vacía)'}`;
};
const ctxMascotas=(data)=>{
  const ps=(data.pets||[]).map(p=>`• ${p.type} ${p.name}${p.breed?' ('+p.breed+')':''}`).join('\n');
  return `── MASCOTAS ──\n${ps||'(sin mascotas)'}`;
};
const ctxViajes=(data)=>{
  const tr=(data.trips||[]).slice(0,3).map(t=>`• ${t.emoji} ${t.destination} [${t.status}]${t.startDate?' · '+t.startDate:''}`).join('\n');
  return `── VIAJES ──\n${tr||'(sin viajes)'}`;
};
const ctxDesarrollo=(data)=>{
  const lr=(data.learnings||[]).filter(l=>l.status==='active').map(l=>`• ${l.name} ${l.progress||0}% — ${l.platform||''}`).join('\n');
  const id=(data.ideas||[]).slice(0,3).map(i=>`• [${i.tag||'Idea'}] ${i.content.slice(0,35)}`).join('\n');
  const bk=(data.books||[]).filter(b=>b.status==='reading').map(b=>`• ${b.title}${b.author?' — '+b.author:''}`).join('\n');
  return `── DESARROLLO PERSONAL ──\nAprendizajes activos:\n${lr||'(ninguno)'}\nLibros leyendo:\n${bk||'(ninguno)'}\nIdeas recientes:\n${id||'(sin ideas)'}`;
};
const ctxFarmacia=(data)=>{
  const fm=(data.farmaciaItems||[]).map(f=>`• ${f.name}: ${f.quantity} ${f.unit}${f.expiresAt?' vence '+f.expiresAt:''}`).join('\n');
  return `── FARMACIA / BOTIQUÍN ──\n${fm||'(botiquín vacío)'}`;
};

// ── Module definitions per area (PASO III) ──
const modGeneral=`  1. Meta de vida medible → OBJETIVO → SAVE_PLAN
  2. Conjunto de acciones → PROYECTO → SAVE_PLAN
  3. Acción única concreta → SAVE_TASK (title, priority, deadline)
  4. Acción recurrente → SAVE_HABIT (name, frequency: daily|weekly|monthly)
  5. Info/dato/referencia → SAVE_NOTE
  6. Ambiguo → SAVE_INBOX`;

const modFinanzas=`  FINANZAS:
  • Gasto/ingreso → SAVE_TRANSACTION (type: egreso|ingreso, amount, currency, category, description, date)
    Categorías egreso: Alimentación, Transporte, Salud, Educación, Entretenimiento, Hogar, Ropa, Servicios, Deuda, Otro
    Categorías ingreso: Salario, Freelance, Negocio, Inversión, Regalo, Otro
  • Gasto fijo mensual → SAVE_BUDGET (title, amount, currency, dayOfMonth)`;

const modSalud=`  SALUD:
  • Medición corporal (peso/presión/glucosa/pasos/agua) → SAVE_HEALTH_METRIC (type, value, unit, date)
  • Medicamento/suplemento → SAVE_MEDICATION (name, dose, unit, frequency, time, stock)
  • Ejercicio → SAVE_WORKOUT (type, duration, calories, distance, date)
    Tipos: Correr, Caminar, Ciclismo, Natación, Gym, Yoga, HIIT, Fútbol, Basquetbol, Otro`;

const modCoche=`  COCHE:
  • Mantenimiento → SAVE_CAR_MAINTENANCE (name, category, lastDone, frequencyKm, frequencyDays, cost)
    ⚠️ Si cost>0 → emitir también SAVE_TRANSACTION(egreso, Transporte)
    ⚠️ Si se menciona km → emitir también SAVE_CAR_INFO(km)
  • Gasto coche → SAVE_CAR_EXPENSE + SAVE_TRANSACTION(egreso, Transporte)
  • Actualizar datos → SAVE_CAR_INFO (brand, model, year, plate, km, fuelType)
  • Recordatorio → SAVE_CAR_REMINDER (title, dueDate)`;

const modHogar=`  HOGAR:
  • Mantenimiento recurrente → SAVE_MAINTENANCE (name, category, frequencyDays, lastDone, cost)
    Categorías: General, Jardín, Plomería, Electricidad, Climatización, Electrodomésticos, Otro
  • Documento/seguro/contrato → SAVE_HOME_DOC (name, category, expiryDate, provider, annualCost)
    Categorías: Seguro, Garantía, Contrato, Escritura, Impuesto, Membresía, Suscripción, Otro
  • Contacto de servicio → SAVE_HOME_CONTACT (name, role, phone, email)`;

const modRelaciones=`  RELACIONES:
  • Nueva persona → SAVE_PERSON (name, relation, birthday, emoji, phone, email)
    ⚠️ Siempre emitir también SAVE_INTERACTION si hubo contacto
  • Tarea pendiente con alguien → SAVE_FOLLOWUP (personName, task, dueDate, priority)
  • Registro de contacto → SAVE_INTERACTION (personName, type, date, notes)
    Tipos: Mensaje, Llamada, Videollamada, Comida, Café, Evento, Email, Visita, Otro`;

const modProyectos=`  SIDE PROJECTS:
  • Nuevo proyecto → SAVE_SIDE_PROJECT (name, description, status: idea|progress|paused|launched|archived, stack, url)
    ⚠️ Siempre emitir también SAVE_TASK con la primera acción concreta
  • Tarea de proyecto → SAVE_SP_TASK (projectName, title, priority, dueDate)
  • Logro/hito → SAVE_MILESTONE (projectName, title, date, notes)`;

const modSueno=`  SUEÑO:
  • Noche dormida → SAVE_SLEEP_LOG (date, bedTime, wakeTime, hoursSlept, quality 1-5, interruptions)
  • Sueño/ensueño → SAVE_DREAM (date, title, description, type: Agradable|Pesadilla|Lúcido|Neutro, emotions)`;

const modCompras=`  COMPRAS:
  • Ítem para lista → SAVE_SHOPPING_ITEM (name, qty, unit, category)
    Units: pza, kg, g, L, mL, caja, bolsa, lata, frasco, paq
    Categorías: Despensa, Frutas, Verduras, Lácteos, Limpieza, Higiene, Bebidas, Carnes, Otro`;

const modEntretenimiento=`  ENTRETENIMIENTO:
  • Película/serie/contenido → SAVE_ENTERTAINMENT (title, type: movie|series|doc|anime|podcast,
    status: want|watching|done|dropped, platform, genre, rating 1-5, year, seasons, currentEp)
  "Vi X" → status:done, pedir rating · "Quiero ver X" → status:want · "Empecé X" → status:watching`;

const modMascotas=`  MASCOTAS:
  • Nueva mascota → SAVE_PET (name, type, breed, birthDate, weight, color)
  • Vacuna → SAVE_PET_VAC (petName, name, date, nextDate, status, clinic, cost)
  • Visita vet → SAVE_PET_VET (petName, date, reason, diagnosis, treatment, cost)
    ⚠️ Si cost>0 → emitir también SAVE_TRANSACTION(egreso, Salud)`;

const modViajes=`  VIAJES:
  • Destino/viaje → SAVE_TRIP (destination, country, status: wishlist|planned|done, startDate, endDate, budget, emoji)
  • Gasto de viaje → SAVE_TRIP_EXPENSE (tripDestination, category, amount, currency, description, date)`;

const modDesarrollo=`  DESARROLLO PERSONAL:
  • Curso/habilidad → SAVE_LEARNING (name, platform, category, progress, hoursSpent, hoursTotal)
  • Reflexión periódica → SAVE_RETRO (period, date, wentWell, improve, learned)
  • Idea/insight/cita → SAVE_IDEA (content, tag, date)
    Tags: Insight, Cita, Aprendizaje, Pregunta, Idea, Reflexión, Otro
  • Entrada de diario → SAVE_JOURNAL (date, mood, content, gratitude, intention)
  • Libro → SAVE_BOOK (title, author, status: want|reading|done|dropped, genre, pages, rating, review)`;

const modFarmacia=`  FARMACIA:
  • Medicamento en botiquín → SAVE_FARMACIA_ITEM (name, quantity, unit, expiresAt, location)
    Unidades: unidades, tabletas, cápsulas, ml, mg, frascos, sobres, parches, gotas`;

const modNutricion=`  NUTRICIÓN:
  • Receta → SAVE_RECIPE (name, category, difficulty: Fácil|Media|Difícil, time, servings, calories, ingredients[], steps[])`;

const modEducacion=`  EDUCACIÓN:
  • Apunte de clase → SAVE_EDUCATION_NOTE (subjectName, title, content, type: apunte|resumen|ejercicio|examen)`;

const modHabitos=`  HÁBITOS / TAREAS (control):
  • Marcar hábito completado hoy → MARK_HABIT_DONE (habitName) — fuzzy match
  • Actualizar estado de tarea → UPDATE_TASK_STATUS (taskTitle, status: done|todo|inprogress|cancelled) — fuzzy match`;

// ── Examples per area ──
const exFinanzas=(t)=>`Transacción: \`\`\`json
{"action":"SAVE_TRANSACTION","data":{"type":"egreso","amount":350,"currency":"MXN","category":"Alimentación","description":"Súper semanal","date":"${t}"}}
\`\`\`
Presupuesto: \`\`\`json
{"action":"SAVE_BUDGET","data":{"title":"Netflix","amount":199,"currency":"MXN","dayOfMonth":15}}
\`\`\``;

const exSalud=(t)=>`Workout: \`\`\`json
{"action":"SAVE_WORKOUT","data":{"type":"Correr","duration":30,"calories":280,"distance":4.5,"date":"${t}","notes":""}}
\`\`\`
Métrica: \`\`\`json
{"action":"SAVE_HEALTH_METRIC","data":{"type":"peso","value":"75.5","unit":"kg","date":"${t}","notes":""}}
\`\`\``;

const exCoche=(t)=>`Mantenimiento coche (SIEMPRE 3 bloques si hay costo y km): \`\`\`json
{"action":"SAVE_CAR_MAINTENANCE","data":{"name":"Mantenimiento mayor","category":"Revisión general","lastDone":"${t}","frequencyDays":180,"frequencyKm":10000,"cost":3400,"notes":""}}
\`\`\`
\`\`\`json
{"action":"SAVE_TRANSACTION","data":{"type":"egreso","amount":3400,"currency":"MXN","category":"Transporte","description":"Mantenimiento mayor coche","date":"${t}"}}
\`\`\`
\`\`\`json
{"action":"SAVE_CAR_INFO","data":{"km":"73000"}}
\`\`\``;

const exRelaciones=(t)=>`Persona + interacción: \`\`\`json
{"action":"SAVE_PERSON","data":{"name":"María López","relation":"Mentor","emoji":"👩","phone":"5598765432","notes":""}}
\`\`\`
\`\`\`json
{"action":"SAVE_INTERACTION","data":{"personName":"María López","type":"Llamada","date":"${t}","notes":"Hablamos de la propuesta"}}
\`\`\``;

const exProyectos=(t)=>`Side project: \`\`\`json
{"action":"SAVE_SIDE_PROJECT","data":{"name":"App de hábitos","description":"Tracker minimalista","status":"progress","stack":"React Native","startDate":"${t}"}}
\`\`\`
Tarea de proyecto: \`\`\`json
{"action":"SAVE_SP_TASK","data":{"projectName":"App de hábitos","title":"Diseñar pantalla principal","priority":"alta","dueDate":""}}
\`\`\``;

const exGeneral=(t)=>`Tarea: \`\`\`json
{"action":"SAVE_TASK","data":{"title":"Llamar al mecánico","priority":"alta"}}
\`\`\`
Hábito: \`\`\`json
{"action":"SAVE_HABIT","data":{"name":"Caminar 30 min","frequency":"daily"}}
\`\`\`
Nota: \`\`\`json
{"action":"SAVE_NOTE","data":{"title":"Reunión — puntos clave","content":"El cliente quiere entrega antes del viernes","tags":["clientes"],"area":"Trabajo"}}
\`\`\`
Hábito completado: \`\`\`json
{"action":"MARK_HABIT_DONE","data":{"habitName":"Caminar 30 min"}}
\`\`\`
Tarea completada: \`\`\`json
{"action":"UPDATE_TASK_STATUS","data":{"taskTitle":"Llamar al mecánico","status":"done"}}
\`\`\``;

// ── Main dynamic prompt builder ──
const buildPsickePrompt=(data,challenge,userMsg='')=>{
  const t=today();
  const intents=detectIntent(userMsg);

  // Base data — always present
  const areaNames=(data.areas||[]).map(a=>`${a.icon} ${a.name}`).join(', ');
  const areaMap=(data.areas||[]).map(a=>`"${a.name}" → "${a.id}"`).join(', ');
  const objectives=(data.objectives||[]).filter(o=>o.status==='active').map(o=>`• ${o.title}`).join('\n');
  const tasksPending=(data.tasks||[]).filter(t=>t.status==='todo');
  const tasksSummary=tasksPending.slice(0,3).map(t=>`• ${t.title.slice(0,30)}${t.deadline?' ('+t.deadline+')':''}`).join('\n');
  const inboxPending=(data.inbox||[]).filter(i=>!i.processed).length;
  const habitNames=(data.habits||[]).map(h=>h.name).join(', ');
  const notesSummary=(data.notes||[]).slice(0,3).map(n=>`• ${n.title.slice(0,30)}`).join('\n');
  const allTags=[...new Set((data.notes||[]).flatMap(n=>n.tags||[]))].slice(0,6).join(', ')||'(sin tags)';

  // Build dynamic data sections
  const dataSections=[];
  if(intents.has('finanzas')) dataSections.push(ctxFinanzas(data,t));
  if(intents.has('salud'))    dataSections.push(ctxSalud(data,t));
  if(intents.has('coche'))    dataSections.push(ctxCoche(data));
  if(intents.has('hogar'))    dataSections.push(ctxHogar(data));
  if(intents.has('relaciones'))dataSections.push(ctxRelaciones(data));
  if(intents.has('proyectos'))dataSections.push(ctxProyectos(data));
  if(intents.has('sueno'))    dataSections.push(ctxSueno(data));
  if(intents.has('compras'))  dataSections.push(ctxCompras(data));
  if(intents.has('entretenimiento'))dataSections.push(ctxEntretenimiento(data));
  if(intents.has('mascotas')) dataSections.push(ctxMascotas(data));
  if(intents.has('viajes'))   dataSections.push(ctxViajes(data));
  if(intents.has('libros')||intents.has('desarrollo'))dataSections.push(ctxDesarrollo(data));
  if(intents.has('farmacia')) dataSections.push(ctxFarmacia(data));

  // Build dynamic module definitions (PASO III)
  const moduleDefs=[modGeneral];
  if(intents.has('finanzas'))  moduleDefs.push(modFinanzas);
  if(intents.has('salud'))     moduleDefs.push(modSalud);
  if(intents.has('coche'))     moduleDefs.push(modCoche);
  if(intents.has('hogar'))     moduleDefs.push(modHogar);
  if(intents.has('relaciones'))moduleDefs.push(modRelaciones);
  if(intents.has('proyectos')) moduleDefs.push(modProyectos);
  if(intents.has('sueno'))     moduleDefs.push(modSueno);
  if(intents.has('compras'))   moduleDefs.push(modCompras);
  if(intents.has('entretenimiento'))moduleDefs.push(modEntretenimiento);
  if(intents.has('mascotas'))  moduleDefs.push(modMascotas);
  if(intents.has('viajes'))    moduleDefs.push(modViajes);
  if(intents.has('libros')||intents.has('desarrollo'))moduleDefs.push(modDesarrollo);
  if(intents.has('farmacia'))  moduleDefs.push(modFarmacia);
  if(intents.has('nutricion')) moduleDefs.push(modNutricion);
  if(intents.has('habitos')||intents.has('tareas'))moduleDefs.push(modHabitos);

  // Build relevant examples
  const examples=[];
  if(intents.has('finanzas'))  examples.push(exFinanzas(t));
  if(intents.has('salud'))     examples.push(exSalud(t));
  if(intents.has('coche'))     examples.push(exCoche(t));
  if(intents.has('relaciones'))examples.push(exRelaciones(t));
  if(intents.has('proyectos')) examples.push(exProyectos(t));
  if(!examples.length)         examples.push(exGeneral(t));

  const challengeBlock={
    capt:`═══ PERFIL: Captura todo antes de que se pierda. Sugiere siempre guardar. Pregunta: "¿Algo más en tu cabeza?"`,
    prio:`═══ PERFIL: Ayuda a priorizar. Una tarea más importante de hoy. Marcos: Eisenhower, impacto/esfuerzo.`,
    habit:`═══ PERFIL: Acompaña hábitos. Celebra rachas. Si no completó algo, pregunta sin juicio.`,
    proj:`═══ PERFIL: Proyectos sin terminar. Siempre pregunta: ¿cuál es el siguiente paso concreto?`,
    over:`═══ PERFIL: Abrumado. Máximo 2 puntos. Solo lo más urgente. Tono calmado.`,
  }[challenge]||'';

  return `Eres Psicke — la IA dentro del Segundo Cerebro del usuario. Directa, empática, humor seco. Tratas de USTED siempre. NUNCA digas "como asistente de IA".

HOY: ${t}

FORMATO OBLIGATORIO DE RESPUESTA:
Cada respuesta: razonamiento breve interno → respuesta visible (máx 2-3 oraciones) → JSON al final si aplica.
Si hay múltiples acciones: emite VARIOS bloques \`\`\`json\`\`\` consecutivos, uno por acción.
JAMÁS confirmes que guardaste algo sin incluir el bloque JSON — si no hay JSON, no se guarda nada.

═══ DATOS BASE ═══
Áreas: ${areaNames||'Ninguna'}
Mapa de áreas: ${areaMap||'sin áreas'}
Objetivos activos:\n${objectives||'(sin objetivos)'}
Tareas pendientes (${tasksPending.length}):\n${tasksSummary||'(sin tareas)'}
Notas recientes:\n${notesSummary||'(sin notas)'}
Tags: ${allTags} · Inbox sin procesar: ${inboxPending} · Hábitos: ${habitNames||'(ninguno)'}

${dataSections.join('\n\n')}

═══ PROTOCOLO DE CLASIFICACIÓN ═══
PASO I — TIPO:
  A) Saludo/conversación casual → responder brevemente. NUNCA guardar.
  B) Consulta → responder con datos. NUNCA guardar.
  C) Captura → continuar a PASO II

PASO II — ÁREA: ¿A qué área pertenece? Áreas: ${areaNames||'ninguna'}

PASO III — MÓDULO:
${moduleDefs.join('\n')}

PASO IV — CAMPOS:
  Regla absoluta: UN REGISTRO INCOMPLETO ES UN FRACASO.
  Si faltan campos clave, pregúntalos TODOS juntos en un mensaje.
  Montos: siempre amount + currency. Fechas: YYYY-MM-DD. Horas: HH:MM.

PASO V — RESPONDER:
  [Si faltan campos: pregunta todo lo que falta agrupado]
  [Si tienes todo: confirma brevemente y emite el JSON]

═══ FORMATOS DE GUARDADO ═══
${examples.join('\n')}

⚠️ REGLA FINAL: Si el usuario menciona algo que debe guardarse, DEBES incluir el JSON. Sin JSON = dato perdido = mentirle al usuario.

${challengeBlock}`;
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
    /^\[PASO/m,
    /^\[ETAPA/m,
  ];
  // Also strip any [PASO...] bracket blocks entirely
  out=out.replace(/\[PASO[\s\S]*?\]/g,'').replace(/\[ETAPA[\s\S]*?\]/g,'');
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

  // 3. Strip common reasoning leaks
  out=out.replace(/^No hay(?:acción|\s+acción)[^\n]*/gim,'');
  out=out.replace(/^Acción:\s*ninguna[^\n]*/gim,'');
  out=out.replace(/^Módulo:[^\n]*/gim,'');
  out=out.replace(/^Tipo de entrada:[^\n]*/gim,'');
  out=out.replace(/^Área relevante:[^\n]*/gim,'');
  out=out.replace(/^Acción a ejecutar:[^\n]*/gim,'');

  // 4. Strip JSON blocks
  out=out.replace(/```json[\s\S]*?```/g,'');

  return out.trim();
};

const Psicke=({apiKey,onGoSettings,data,setData,openFromNav,onNavClose,welcomeData,onWelcomeDone})=>{
  const nowTime=()=>new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  const INIT_MSG={role:'assistant',content:'Aquí Psicke. ¿En qué está pensando?',time:nowTime()};
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
  const clearMsgs=()=>{ if(!window.confirm('¿Borrar todo el historial de conversación?'))return; saveMsgs([INIT_MSG]); };

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,open]);
  useEffect(()=>{if(open)setTimeout(()=>inputRef.current?.focus(),300);},[open]);

  // ── Challenge profile ──────────────────────────────────────────────────
  const challenge=useMemo(()=>{ try{ return localStorage.getItem('sb_challenge')||null; }catch{ return null; } },[]);

  // ── Daily auto-summary — DISABLED (consume quota on open) ──
  // To re-enable: uncomment the block below
  /*
  useEffect(()=>{
    if(!open||!apiKey) return;
    const key='psicke_daily_summary';
    const lastDate=localStorage.getItem(key);
    if(lastDate===today()) return;
    const timer=setTimeout(()=>{
      localStorage.setItem(key,today());
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
  */

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const suggestions=useMemo(()=>buildSuggestions(),[data.tasks,data.objectives,data.habits,data.inbox,data.people]);

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
    if(!key){setOpen(false);onGoSettings();return;}
    if(key.length < 20){ setMsgs(m=>[...m,{role:'assistant',content:'⚠️ La API Key guardada parece incorrecta (muy corta). Ve a Ajustes y pega la clave completa desde console.groq.com.',time:nowTime()}]); return; }
    const userMsg={role:'user',content:text,time:nowTime()};
    const next=[...msgs,userMsg];
    saveMsgs(next);setInput('');setLoading(true);
    try{
      const sysPrompt=buildPsickePrompt(data,challenge,text);
      // Clean conversation for API: strip save labels, keep last 8 msgs (OpenAI format)
      const cleanMsgs=next.slice(-4).map(m=>({
        role:m.role==='assistant'?'assistant':'user',
        content:(m.content||'').replace(/\n\n✅[^\n]*/g,'').trim()||' '
      }));
      const body={
        model: GROQ_MODELS[0], // overridden per callApi
        messages:[
          {role:'system', content:sysPrompt},
          {role:'user',    content:'Hola Psicke, estoy listo.'},
          {role:'assistant',content:'Aquí Psicke. ¿En qué está pensando?'},
          ...cleanMsgs
        ],
        temperature:0.7,
        max_tokens:800,
      };

      // API call with model fallback + retry on 429
      const callApi=async(modelIdx=0, attempt=0)=>{
        const model = GROQ_MODELS[modelIdx] || GROQ_MODELS[0];
        const res=await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {method:'POST',
           headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
           body:JSON.stringify({...body, model})}
        );
        if(res.status===429){
          const err=await res.json().catch(()=>({}));
          const emsg=(err?.error?.message||'').toLowerCase();
          // Daily quota exhausted → try next model
          if(emsg.includes('quota')||emsg.includes('day')||emsg.includes('limit')){
            if(modelIdx<GROQ_MODELS.length-1) return callApi(modelIdx+1, 0);
            throw new Error('Cuota diaria agotada en Groq. Intenta mañana o ve a console.groq.com para revisar tus límites.');
          }
          // Rate limit por minuto → retry con backoff
          if(attempt<2){
            const wait=[8000,20000][attempt];
            await new Promise(r=>setTimeout(r,wait));
            return callApi(modelIdx, attempt+1);
          }
          if(modelIdx<GROQ_MODELS.length-1) return callApi(modelIdx+1, 0);
          throw new Error('Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.');
        }
        if(res.status===401){
          throw new Error('API Key de Groq no válida. Ve a Ajustes → borra la clave → pega la nueva desde console.groq.com → API Keys.');
        }
        if(res.status===400){
          const err=await res.json().catch(()=>({}));
          throw new Error(`Error 400: ${err?.error?.message||'Solicitud inválida'}`);
        }
        if(res.status===404){
          if(modelIdx<GROQ_MODELS.length-1) return callApi(modelIdx+1, 0);
          throw new Error('Ningún modelo Groq disponible para esta API Key.');
        }
        if(!res.ok){
          const err=await res.json().catch(()=>({}));
          throw new Error(err?.error?.message||`Error HTTP ${res.status}`);
        }
        return res.json();
      };

      const d=await callApi();
      // Groq uses OpenAI response format
      const raw=d.choices?.[0]?.message?.content;
      if(!raw){
        const reason=d.choices?.[0]?.finish_reason||'desconocido';
        if(reason==='length') throw new Error('Respuesta cortada por límite de tokens. Intente un mensaje más corto.');
        throw new Error(`Sin respuesta (${reason})`);
      }

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
          // Sync the active vehicle in vehicles[] to stay consistent with carInfo
          const activeId=updData.activeVehicleId;
          const updVehicles=(updData.vehicles||[]).map(v=>
            v.id===activeId?{...v,...action.data}:v
          );
          updData={...updData,carInfo:updated,vehicles:updVehicles};
          save('carInfo',updated);
          if(activeId) save('vehicles',updVehicles);
          const parts=[];
          if(action.data.km) parts.push(`🛣 ${Number(action.data.km).toLocaleString()} km`);
          if(action.data.brand) parts.push(`${action.data.brand} ${action.data.model||""}`);
          if(action.data.plate) parts.push(action.data.plate);
          return `🚗 Coche actualizado${parts.length?' · '+parts.join(' · '):""}`;

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

        // ── SAVE_SLEEP_LOG ──
        }else if(action.action==='SAVE_SLEEP_LOG'){
          const s={id:uid(),date:action.data.date||td,
            bedTime:action.data.bedTime||'23:00',wakeTime:action.data.wakeTime||'07:00',
            hoursSlept:Number(action.data.hoursSlept)||0,quality:Number(action.data.quality)||3,
            interruptions:Number(action.data.interruptions)||0,
            hygiene:action.data.hygiene||[],notes:action.data.notes||''};
          const upd=[s,...(updData.sleepLog||[])];
          updData={...updData,sleepLog:upd};save('sleepLog',upd);
          return `😴 Sueño registrado · ${s.hoursSlept}h · calidad ${s.quality}/5`;

        // ── SAVE_DREAM ──
        }else if(action.action==='SAVE_DREAM'&&action.data.description){
          const d2={id:uid(),date:action.data.date||td,title:action.data.title||'Sueño',
            description:action.data.description,type:action.data.type||'Neutro',
            emotions:action.data.emotions||'',tags:action.data.tags||''};
          const upd=[d2,...(updData.dreamJournal||[])];
          updData={...updData,dreamJournal:upd};save('dreamJournal',upd);
          return `💭 Sueño anotado: "${d2.title}"`;

        // ── SAVE_SHOPPING_ITEM ──
        }else if(action.action==='SAVE_SHOPPING_ITEM'&&action.data.name){
          const i={id:uid(),name:action.data.name,qty:Number(action.data.qty)||1,
            unit:action.data.unit||'pza',category:action.data.category||'',
            done:false,createdAt:td};
          const upd=[...(updData.shopping||[]),i];
          updData={...updData,shopping:upd};save('shopping',upd);
          return `🛒 Lista de compras: ${i.qty} ${i.unit} ${i.name}`;

        // ── SAVE_ENTERTAINMENT ──
        }else if(action.action==='SAVE_ENTERTAINMENT'&&action.data.title){
          const e={id:uid(),title:action.data.title,type:action.data.type||'movie',
            status:action.data.status||'want',platform:action.data.platform||'',
            genre:action.data.genre||'',rating:Number(action.data.rating)||0,
            seasons:action.data.seasons||'',currentSeason:action.data.currentSeason||'1',
            currentEp:action.data.currentEp||'1',totalEps:action.data.totalEps||'',
            synopsis:action.data.synopsis||'',notes:action.data.notes||'',
            year:action.data.year||'',addedAt:td};
          const upd=[e,...(updData.entertainment||[])];
          updData={...updData,entertainment:upd};save('entertainment',upd);
          const statusMap={want:'🌟 por ver',watching:'▶️ viendo',done:'✅ visto',dropped:'❌ abandonado'};
          return `🎬 ${e.type==='movie'?'Película':'Serie'}: "${e.title}" · ${statusMap[e.status]||e.status}${e.rating?' · ⭐'+e.rating:''}`;

        // ── SAVE_TRIP ──
        }else if(action.action==='SAVE_TRIP'&&action.data.destination){
          const t={id:uid(),destination:action.data.destination,country:action.data.country||'',
            status:action.data.status||'wishlist',startDate:action.data.startDate||'',
            endDate:action.data.endDate||'',transport:action.data.transport||'',
            accommodation:action.data.accommodation||'',budget:action.data.budget||'',
            actualCost:action.data.actualCost||'',notes:action.data.notes||'',
            emoji:action.data.emoji||'✈️',createdAt:td};
          const upd=[t,...(updData.trips||[])];
          updData={...updData,trips:upd};save('trips',upd);
          const statusMap={wishlist:'🌟 deseo',planned:'📅 planificado',done:'✅ visitado'};
          return `✈️ Viaje: ${t.emoji} ${t.destination}${t.country?' ('+t.country+')':''} · ${statusMap[t.status]||t.status}`;

        // ── SAVE_TRIP_EXPENSE ──
        }else if(action.action==='SAVE_TRIP_EXPENSE'&&action.data.amount){
          // find tripId by destination name
          const tripMatch=(updData.trips||[]).find(t=>t.destination.toLowerCase()===action.data.tripDestination?.toLowerCase());
          const e={id:uid(),tripId:tripMatch?.id||'',category:action.data.category||'Otro',
            amount:Number(action.data.amount)||0,currency:action.data.currency||'MXN',
            description:action.data.description||'',date:action.data.date||td};
          const upd=[e,...(updData.tripExpenses||[])];
          updData={...updData,tripExpenses:upd};save('tripExpenses',upd);
          return `✈️ Gasto viaje: $${e.amount} ${e.currency} · ${e.category}${tripMatch?' ('+tripMatch.destination+')':''}`;

        // ── SAVE_RECIPE ──
        }else if(action.action==='SAVE_RECIPE'&&action.data.name){
          const r={id:uid(),name:action.data.name,category:action.data.category||'Otro',
            difficulty:action.data.difficulty||'Fácil',time:action.data.time||'',
            servings:action.data.servings||'2',calories:action.data.calories||'',
            tags:action.data.tags||'',description:action.data.description||'',
            ingredients:action.data.ingredients||[],steps:action.data.steps||[],
            favorite:action.data.favorite||false,createdAt:td};
          const upd=[r,...(updData.recipes||[])];
          updData={...updData,recipes:upd};save('recipes',upd);
          return `🍳 Receta: "${r.name}" · ${r.difficulty} · ${r.time||'?'} min`;

        // ── SAVE_EDUCATION_NOTE ──
        }else if(action.action==='SAVE_EDUCATION_NOTE'&&action.data.title){
          // find subject by name, add note to its notes array
          const edu=(updData.education||[]);
          const subjectName=action.data.subjectName||'';
          const subjectIdx=subjectName?edu.findIndex(s=>s.name.toLowerCase()===subjectName.toLowerCase()):-1;
          const note={id:uid(),title:action.data.title,content:action.data.content||'',
            tags:(action.data.tags||'').split(',').map(t=>t.trim()).filter(Boolean),
            type:action.data.type||'apunte',createdAt:td};
          let updEdu;
          if(subjectIdx>=0){
            updEdu=edu.map((s,i)=>i===subjectIdx?{...s,notes:[note,...(s.notes||[])]}:s);
          }else{
            // Create subject on the fly if given
            const newSubject={id:uid(),name:subjectName||'General',icon:'📚',color:'#4da6ff',notes:[note],createdAt:td};
            updEdu=[newSubject,...edu];
          }
          updData={...updData,education:updEdu};save('education',updEdu);
          return `📚 Apunte: "${note.title}"${subjectName?' en '+subjectName:''}`;

        // ── SAVE_PET ──
        }else if(action.action==='SAVE_PET'&&action.data.name){
          const p={id:uid(),name:action.data.name,type:action.data.type||'🐶 Perro',
            breed:action.data.breed||'',birthDate:action.data.birthDate||'',
            weight:action.data.weight||'',color:action.data.color||'',
            notes:action.data.notes||'',createdAt:td};
          const upd=[p,...(updData.pets||[])];
          updData={...updData,pets:upd};save('pets',upd);
          return `🐾 Mascota: ${p.type} ${p.name}${p.breed?' ('+p.breed+')':''}`;

        // ── SAVE_PET_VAC ──
        }else if(action.action==='SAVE_PET_VAC'&&action.data.name){
          const petMatch=(updData.pets||[]).find(p=>p.name.toLowerCase()===action.data.petName?.toLowerCase());
          const v={id:uid(),petId:petMatch?.id||'',name:action.data.name,
            date:action.data.date||td,nextDate:action.data.nextDate||'',
            status:action.data.status||'done',clinic:action.data.clinic||'',
            cost:action.data.cost||'',notes:action.data.notes||''};
          const upd=[v,...(updData.petVaccines||[])];
          updData={...updData,petVaccines:upd};save('petVaccines',upd);
          return `💉 Vacuna: ${v.name}${petMatch?' para '+petMatch.name:''}`;

        // ── SAVE_PET_VET ──
        }else if(action.action==='SAVE_PET_VET'&&action.data.reason){
          const petMatch=(updData.pets||[]).find(p=>p.name.toLowerCase()===action.data.petName?.toLowerCase());
          const v={id:uid(),petId:petMatch?.id||'',date:action.data.date||td,
            reason:action.data.reason,clinic:action.data.clinic||'',vet:action.data.vet||'',
            diagnosis:action.data.diagnosis||'',treatment:action.data.treatment||'',
            cost:action.data.cost||'',nextVisit:action.data.nextVisit||'',notes:action.data.notes||''};
          const upd=[v,...(updData.petVetVisits||[])];
          updData={...updData,petVetVisits:upd};save('petVetVisits',upd);
          return `🏥 Visita vet: ${v.reason}${petMatch?' · '+petMatch.name:''}${v.cost?' · $'+v.cost:''}`;

        // ── MARK_HABIT_DONE ──
        }else if(action.action==='MARK_HABIT_DONE'&&action.data.habitName){
          const habits=updData.habits||[];
          const kw=action.data.habitName.toLowerCase();
          const match=habits.find(h=>h.name.toLowerCase().includes(kw)||kw.includes(h.name.toLowerCase()));
          if(match&&!match.completions?.includes(td)){
            const updHabits=habits.map(h=>h.id===match.id?{...h,completions:[...(h.completions||[]),td]}:h);
            updData={...updData,habits:updHabits};save('habits',updHabits);
            return `🔥 Hábito completado: ${match.name}`;
          }
          return match?`ℹ️ ${match.name} ya estaba marcado hoy`:`⚠️ Hábito no encontrado: ${action.data.habitName}`;

        // ── UPDATE_TASK_STATUS ──
        }else if(action.action==='UPDATE_TASK_STATUS'&&action.data.taskTitle){
          const tasks=updData.tasks||[];
          const kw=action.data.taskTitle.toLowerCase();
          const match=tasks.find(t=>t.title.toLowerCase().includes(kw)||kw.includes(t.title.toLowerCase()));
          if(match){
            const newStatus=action.data.status||'done';
            const updTasks=tasks.map(t=>t.id===match.id?{...t,status:newStatus}:t);
            updData={...updData,tasks:updTasks};save('tasks',updTasks);
            const statusEmoji={done:'✅',todo:'⬜',inprogress:'🔄',cancelled:'❌'}[newStatus]||'✅';
            return `${statusEmoji} Tarea "${match.title}" → ${newStatus}`;
          }
          return `⚠️ Tarea no encontrada: ${action.data.taskTitle}`;

        // ── SAVE_CAR_REMINDER ──
        }else if(action.action==='SAVE_CAR_REMINDER'&&action.data.title){
          const r={id:uid(),title:action.data.title,dueDate:action.data.dueDate||'',
            notes:action.data.notes||'',done:false,createdAt:td};
          const upd=[r,...(updData.carReminders||[])];
          updData={...updData,carReminders:upd};save('carReminders',upd);
          return `⏰ Recordatorio coche: ${r.title}${r.dueDate?' · '+r.dueDate:''}`;

        // ── SAVE_BOOK ──
        }else if(action.action==='SAVE_BOOK'&&action.data.title){
          const b={id:uid(),title:action.data.title,author:action.data.author||'',
            status:action.data.status||'want',rating:Number(action.data.rating)||0,
            review:action.data.review||'',genre:action.data.genre||'',
            pages:action.data.pages||'',createdAt:td};
          const upd=[b,...(updData.books||[])];
          updData={...updData,books:upd};save('books',upd);
          const statusMap={want:'📚 por leer',reading:'📖 leyendo',done:'✅ leído',dropped:'❌ abandonado'};
          return `📚 Libro: "${b.title}"${b.author?' · '+b.author:''} · ${statusMap[b.status]||b.status}${b.rating?' · ⭐'+b.rating:''}`;

        // ── SAVE_JOURNAL ──
        }else if(action.action==='SAVE_JOURNAL'&&action.data.content){
          const e={id:uid(),date:action.data.date||td,
            mood:action.data.mood||'',content:action.data.content,
            gratitude:action.data.gratitude||'',intention:action.data.intention||''};
          const upd=[e,...(updData.journalEntries||[])];
          updData={...updData,journalEntries:upd};save('journalEntries',upd);
          return `📓 Entrada de diario guardada${e.mood?' · '+e.mood:''}`;
        }
        return null;
      };

        // ── AUTO-CASCADE: guaranteed cross-module propagation regardless of AI output ──
        // Helper: fuzzy check if a SAVE_TRANSACTION for this amount+context already exists
        // Checks both: (1) actions emitted by Gemini in this response, and
        //              (2) entries already in the accumulated store (updData)
        const hasTxForAmount=(amt,keyword)=>{
          const kw=(keyword||'').toLowerCase().split(' ')[0];
          const inActions=actions.some(a=>
            a.action==='SAVE_TRANSACTION'&&
            Number(a.data.amount)===Number(amt)&&
            (a.data.description||'').toLowerCase().includes(kw)
          );
          const inStore=(updData.transactions||[]).some(t=>
            Number(t.amount)===Number(amt)&&
            (t.description||'').toLowerCase().includes(kw)
          );
          return inActions||inStore;
        };
        const hasCarExpForAmount=(amt)=>{
          const inActions=actions.some(a=>
            a.action==='SAVE_CAR_EXPENSE'&&Number(a.data.amount)===Number(amt)
          );
          const inStore=(updData.carExpenses||[]).some(e=>
            Number(e.amount)===Number(amt)
          );
          return inActions||inStore;
        };

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
      saveMsgs([...next,{role:'assistant',content:finalContent,time:nowTime()}]);
    }catch(e){
      const msg=e.message==='Failed to fetch'
        ?'No se pudo conectar. Verifica su conexión o que la API key sea válida.'
        :e.message;
      saveMsgs([...next,{role:'assistant',content:`⚠️ ${msg}`,time:nowTime()}]);
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        @keyframes psicke-in{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes psicke-pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,200,150,0.5)}50%{box-shadow:0 0 0 12px rgba(0,200,150,0)}}
        @keyframes psicke-ring{0%{opacity:0.6;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}
        @keyframes pop-in{from{opacity:0;transform:scale(.93) translateY(5px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes psicke-dot{0%,100%{opacity:.25;transform:scale(.65)}50%{opacity:1;transform:scale(1)}}
        .psicke-bubble:active{transform:scale(0.93)!important;}
        .psicke-msg{animation:pop-in 0.2s cubic-bezier(.22,1,.36,1) both;}
      `}</style>

      {/* CHAT PANEL */}
      {open&&(
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',flexDirection:'column',
          background:T.surface,animation:'psicke-in 0.28s ease-out both'}}>

          {/* Header */}
          <div style={{padding:'12px 20px 0',flexShrink:0}}>
              <div style={{display:'none'}}/>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:40,height:40,borderRadius:13,background:`linear-gradient(135deg,${T.accent},${T.orange})`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22,border:`1.5px solid ${T.borderLight}`,boxShadow:`0 0 18px rgba(79,142,247,.3),0 0 6px rgba(249,115,22,.15)`}}>
                    🧠
                  </div>
                  <div>
                    <div style={{color:T.text,fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif",lineHeight:1}}>Psicke</div>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block',boxShadow:'0 0 6px #34d39966'}}/>
                      <span style={{color:T.muted,fontSize:11}}>Tu IA personal · siempre aquí</span>
                    </div>
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

            {/* Suggestions — collapsible */}
            {suggestions.length>0&&(
              <div style={{padding:'0 14px 6px',flexShrink:0}}>
                <button onClick={()=>setShowSugg(s=>!s)}
                  style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:T.muted,cursor:'pointer',padding:'2px 0 6px',fontSize:11,fontFamily:'inherit',fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',width:'100%',transition:'color 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.color=T.accent}
                  onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
                  <span style={{flex:1,textAlign:'left'}}>Sugerencias</span>
                  <span style={{fontSize:13,transform:showSugg?'rotate(0deg)':'rotate(-90deg)',transition:'transform 0.2s',display:'inline-block'}}>▾</span>
                </button>
                {showSugg&&(
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
                )}
              </div>
            )}
            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'0 12px',display:'flex',flexDirection:'column',gap:3,minHeight:0,
              backgroundImage:`radial-gradient(circle at 1px 1px, ${T.border} 1px, transparent 0)`,backgroundSize:'22px 22px'}}
              onClick={()=>setMsgMenu(null)}>
              <div style={{textAlign:'center',margin:'6px 0 8px'}}>
                <span style={{background:T.surface2,color:T.muted,fontSize:11,padding:'3px 12px',borderRadius:8,fontWeight:500,border:`1px solid ${T.border}`}}>Hoy</span>
              </div>
              {msgs.map((m,i)=>{
                const isUser=m.role==='user';
                const showMenu=msgMenu===i;
                const isEditing=editingIdx===i;
                const prevSameRole=i>0&&msgs[i-1].role===m.role;
                return(
                  <div key={i} className="psicke-msg" style={{display:'flex',flexDirection:'column',
                    alignItems:isUser?'flex-end':'flex-start',
                    marginBottom:1,marginTop:prevSameRole?1:6}}>
                    <div style={{display:'flex',justifyContent:isUser?'flex-end':'flex-start',
                      alignItems:'flex-end',gap:8,width:'100%',position:'relative'}}>

                      {/* Bot avatar */}
                      {!isUser&&(
                        <div style={{width:28,height:28,borderRadius:9,flexShrink:0,marginBottom:2,
                          background:!prevSameRole?`linear-gradient(135deg,${T.accent}33,${T.orange}22)`:'transparent',
                          border:!prevSameRole?`1px solid ${T.accent}25`:'none',
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>
                          {!prevSameRole?'🧠':''}
                        </div>
                      )}

                      {isUser&&isEditing?(
                        <div style={{maxWidth:'80%',display:'flex',flexDirection:'column',gap:6}}>
                          <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
                            autoFocus rows={3}
                            style={{width:'100%',background:T.surface2,border:`1px solid ${T.accent}`,color:T.text,
                              padding:'8px 12px',borderRadius:12,fontSize:14,outline:'none',resize:'none',
                              fontFamily:'inherit',lineHeight:1.5,boxSizing:'border-box'}}/>
                          <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                            <button onClick={()=>{setEditingIdx(null);setEditVal('');}}
                              style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 12px',
                                cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit'}}>Cancelar</button>
                            <button onClick={()=>{
                                if(!editVal.trim())return;
                                const trimmed=msgs.slice(0,i);
                                saveMsgs(trimmed);
                                setEditingIdx(null);setEditVal('');setMsgMenu(null);
                                setTimeout(()=>send(editVal.trim()),50);
                              }}
                              style={{background:T.accent,border:'none',borderRadius:8,padding:'4px 14px',
                                cursor:'pointer',color:'#000',fontSize:12,fontFamily:'inherit',fontWeight:600}}>Enviar</button>
                          </div>
                        </div>
                      ):(
                        <div
                          onClick={e=>{if(isUser){e.stopPropagation();setMsgMenu(showMenu?null:i);}}}
                          style={{
                            maxWidth:'75%',minWidth:64,
                            padding:'10px 14px',
                            borderRadius:isUser
                              ?(prevSameRole?'18px 4px 4px 18px':'18px 18px 4px 18px')
                              :(prevSameRole?'4px 18px 18px 4px':'4px 18px 18px 4px'),
                            fontSize:14.5,lineHeight:1.65,whiteSpace:'pre-wrap',wordBreak:'break-word',
                            background:isUser?`linear-gradient(135deg,#1b4fa0,#133b82)`:'#eef1f6',
                            color:isUser?'#fff':'#1c2333',
                            boxShadow:isUser?`0 2px 12px rgba(27,79,160,.3)`:`0 1px 3px rgba(0,0,0,.07)`,
                            cursor:isUser?'pointer':'default',
                            transition:'opacity 0.15s',
                            opacity:isUser&&showMenu?0.8:1}}>
                          <span dangerouslySetInnerHTML={{__html:renderMd(m.content||'')}}/>
                        </div>
                      )}
                    </div>

                    {/* Timestamp + ticks below bubble */}
                    {!isEditing&&m.time&&(
                      <div style={{display:'flex',alignItems:'center',gap:3,marginTop:3,
                        paddingLeft:!isUser?36:0,paddingRight:isUser?2:0}}>
                        <span style={{color:T.muted,fontSize:10.5,opacity:.75}}>{m.time}</span>
                        {isUser&&<svg width="14" height="10" viewBox="0 0 16 11"><path fill={T.accent} d="M15.01.99l-1.06-1.06-7.94 7.94-3.45-3.45L1.5 5.48l4.51 4.51L15.01.99zM11.01.99L9.95-.07 5.5 4.38l.53.53L11.01.99z"/></svg>}
                      </div>
                    )}

                    {/* Action bar */}
                    {isUser&&showMenu&&!isEditing&&(
                      <div onClick={e=>e.stopPropagation()}
                        style={{display:'flex',gap:4,marginTop:4,marginRight:2,
                          animation:'psicke-in 0.15s ease-out both'}}>
                        {[
                          {label:copied===i?'✓ Copiado':'Copiar', action:()=>{
                            navigator.clipboard?.writeText(m.content).catch(()=>{});
                            setCopied(i);setTimeout(()=>setCopied(null),2000);
                          }},
                          {label:'Editar', action:()=>{setEditVal(m.content);setEditingIdx(i);setMsgMenu(null);}},
                          {label:'Reenviar', action:()=>{
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
                <div className="psicke-msg" style={{display:'flex',justifyContent:'flex-start',paddingLeft:36,marginBottom:2}}>
                  <div style={{background:'#f0f2f5',borderRadius:'18px 18px 18px 4px',
                    padding:'12px 18px',boxShadow:`0 1px 4px rgba(0,0,0,.08)`,
                    display:'flex',gap:5,alignItems:'center'}}>
                    {[0,1,2].map(j=><span key={j} style={{width:7,height:7,borderRadius:'50%',background:'#94a3b8',
                      display:'inline-block',animation:`psicke-dot 1.1s ${j*.22}s ease-in-out infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input area */}
            <div style={{padding:'8px 12px 24px',flexShrink:0,borderTop:`1px solid ${T.border}`,paddingBottom:'max(24px,env(safe-area-inset-bottom))'}}>
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
              <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                {/* Pill input container */}
                <div style={{flex:1,background:T.surface2,borderRadius:22,border:`1px solid ${T.border}`,
                  display:'flex',alignItems:'flex-end',padding:'6px 12px',gap:8,transition:'border-color .2s'}}
                  onFocusCapture={e=>e.currentTarget.style.borderColor=`${T.accent}55`}
                  onBlurCapture={e=>e.currentTarget.style.borderColor=T.border}>
                  {/* Mic icon inside pill */}
                  <button onClick={toggleMic} aria-label={recording?'Detener':'Micrófono'}
                    style={{background:'none',border:'none',cursor:'pointer',padding:0,flexShrink:0,marginBottom:3,
                      color:recording?T.red:T.muted,display:'flex',transition:'color .2s'}}>
                    <Icon name={recording?'micoff':'mic'} size={20} color={recording?T.red:T.muted}/>
                  </button>
                  <textarea ref={inputRef} value={input}
                    onChange={e=>{handleInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';}}
                    onKeyDown={e=>{
                      if(e.key==='Escape'){setSlashMenu(false);return;}
                      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();setSlashMenu(false);send();}
                    }}
                    autoComplete="off" autoCorrect="off" spellCheck="false" rows={1}
                    placeholder="Pregunta, idea o escribe / para comandos..."
                    style={{flex:1,background:'transparent',border:'none',outline:'none',color:T.text,
                      fontSize:15,fontFamily:'inherit',resize:'none',lineHeight:1.5,
                      minHeight:24,maxHeight:120,padding:0}}/>
                </div>
                {/* Circular gradient send button */}
                <button onClick={()=>{setSlashMenu(false);send();}} disabled={loading}
                  aria-label="Enviar mensaje"
                  style={{width:46,height:46,borderRadius:'50%',flexShrink:0,
                    background:`linear-gradient(135deg,${T.accent},${T.orange})`,
                    border:'none',cursor:loading?'not-allowed':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:`0 3px 14px rgba(79,142,247,.35)`,
                    opacity:loading?0.5:1,
                    transition:'box-shadow .2s,opacity .2s'}}
                  onMouseEnter={e=>{if(!loading)e.currentTarget.style.boxShadow=`0 4px 20px rgba(79,142,247,.55)`;}}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 3px 14px rgba(79,142,247,.35)`}>
                  {input.trim()
                    ?<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{marginLeft:2}}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    :<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                  }
                </button>
              </div>
            </div>
        </div>
      )}

    </>
  );
};


export default Psicke;
