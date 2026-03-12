import { uid } from '../utils/helpers.js';
import { T } from '../theme/tokens.js';

// ===================== INITIAL DATA =====================
// Perfil demo: Andrés Villanueva — Freelancer / Emprendedor, CDMX, 32 años
// Diseñador UX + fundador de agencia pequeña "Pixel Norte"

const initData = () => {
  // IDs fijos para poder referenciarlos entre módulos
  const aId = { salud:'a1', trabajo:'a2', finanzas:'a3', hogar:'a4', dev:'a5', rel:'a6', side:'a7' };
  const pId = { pixelnorte:'p1', appfit:'p2', rebrand:'p3' };

  return {
  // ─── ÁREAS ────────────────────────────────────────────
  areas:[
    {id:aId.salud,    name:'Salud',             color:T.areaColors[1], icon:'💪'},
    {id:aId.trabajo,  name:'Trabajo',           color:T.areaColors[0], icon:'💼'},
    {id:aId.finanzas, name:'Finanzas',          color:T.areaColors[2], icon:'💰'},
    {id:aId.hogar,    name:'Hogar',             color:T.areaColors[3], icon:'🏠'},
    {id:aId.dev,      name:'Desarrollo Personal',color:T.areaColors[4],icon:'🧠'},
    {id:aId.rel,      name:'Relaciones',        color:T.areaColors[5], icon:'👥'},
    {id:aId.side,     name:'Side Projects',     color:T.areaColors[6], icon:'🚀'},
  ],

  // ─── OBJETIVOS ────────────────────────────────────────
  objectives:[
    {id:uid(),title:'Facturar $120k MXN mensuales',    areaId:aId.trabajo,  deadline:'2026-06-30', status:'active'},
    {id:uid(),title:'Lanzar AppFit al mercado',         areaId:aId.side,     deadline:'2026-08-15', status:'active'},
    {id:uid(),title:'Bajar a 78 kg y mantenerlo',       areaId:aId.salud,    deadline:'2026-09-01', status:'active'},
    {id:uid(),title:'Ahorrar fondo de emergencia 6 meses',areaId:aId.finanzas,deadline:'2026-12-31',status:'active'},
    {id:uid(),title:'Leer 18 libros en el año',         areaId:aId.dev,      deadline:'2026-12-31', status:'active'},
    {id:uid(),title:'Remodelar estudio en casa',        areaId:aId.hogar,    deadline:'2026-07-31', status:'active'},
  ],

  // ─── PROYECTOS ────────────────────────────────────────
  projects:[
    {id:pId.pixelnorte, title:'Pixel Norte — Operaciones Q2', areaId:aId.trabajo, status:'active',  deadline:'2026-06-30', notes:'Foco en retener 3 clientes actuales y cerrar 2 nuevos'},
    {id:pId.appfit,     title:'AppFit — MVP v1.0',            areaId:aId.side,    status:'active',  deadline:'2026-08-15', notes:'App de seguimiento de entrenos con IA'},
    {id:pId.rebrand,    title:'Rebrand Cafetería El Molino',   areaId:aId.trabajo, status:'active',  deadline:'2026-04-30', notes:'Cliente: Laura Méndez. Identidad visual + menú + señalética'},
  ],

  // ─── TAREAS ───────────────────────────────────────────
  tasks:[
    {id:uid(),title:'Enviar propuesta a Constructora Hermes',  projectId:pId.pixelnorte, areaId:aId.trabajo,  status:'todo',       deadline:'2026-03-15', priority:'high'},
    {id:uid(),title:'Revisar contrato con cliente SaaS',       projectId:pId.pixelnorte, areaId:aId.trabajo,  status:'todo',       deadline:'2026-03-13', priority:'high'},
    {id:uid(),title:'Diseñar pantallas onboarding AppFit',     projectId:pId.appfit,     areaId:aId.side,     status:'todo',       deadline:'2026-03-20', priority:'medium'},
    {id:uid(),title:'Integrar API de OpenAI en AppFit',        projectId:pId.appfit,     areaId:aId.side,     status:'in_progress',deadline:'2026-03-25', priority:'high'},
    {id:uid(),title:'Entregar logo final El Molino',           projectId:pId.rebrand,    areaId:aId.trabajo,  status:'in_progress',deadline:'2026-03-14', priority:'high'},
    {id:uid(),title:'Presentar 3 opciones de paleta El Molino',projectId:pId.rebrand,    areaId:aId.trabajo,  status:'done',       deadline:'2026-03-10', priority:'medium'},
    {id:uid(),title:'Pagar ISR trimestral',                    projectId:null,           areaId:aId.finanzas, status:'todo',       deadline:'2026-03-17', priority:'high'},
    {id:uid(),title:'Agendar cita dentista',                   projectId:null,           areaId:aId.salud,    status:'todo',       deadline:'2026-03-20', priority:'low'},
    {id:uid(),title:'Comprar monitor 4K para estudio',         projectId:null,           areaId:aId.hogar,    status:'todo',       deadline:'2026-03-30', priority:'medium'},
    {id:uid(),title:'Terminar curso de Framer Motion',         projectId:null,           areaId:aId.dev,      status:'in_progress',deadline:'2026-04-01', priority:'medium'},
  ],

  // ─── NOTAS ────────────────────────────────────────────
  notes:[
    {id:uid(),title:'Sistema de precios Pixel Norte 2026',content:'Tier 1 — Branding básico: $18,000\nTier 2 — Branding + web: $35,000\nTier 3 — Identidad completa + estrategia: $65,000+\n\nPolítica: 50% anticipo, 50% entrega. No iniciar sin anticipo.',tags:['negocio','precios'],areaId:aId.trabajo,createdAt:'2026-01-15'},
    {id:uid(),title:'Ideas para AppFit — diferenciadores',content:'1. Rutinas generadas por IA según historial\n2. Modo "sin gym" con ejercicios en casa\n3. Integración con Apple Health / Google Fit\n4. Gamificación: racha semanal, badges\n5. Coach virtual (voz) para corrección de postura',tags:['appfit','producto'],areaId:aId.side,createdAt:'2026-02-03'},
    {id:uid(),title:'Reflexión — Por qué freelanceo',content:'No se trata de trabajar menos, sino de elegir con quién trabajas y en qué. El control del tiempo es el verdadero lujo. Recordar esto cuando llegue el miedo a la incertidumbre.',tags:['mentalidad','propósito'],areaId:aId.dev,createdAt:'2026-01-28'},
    {id:uid(),title:'Recursos diseño UX — Bookmark',content:'• Mobbin.com — patrones UI reales\n• Scrnshts.com — inspiración apps\n• Component.gallery — sistemas de diseño\n• Laws of UX (lawsofux.com)\n• Refactoring UI — libro imprescindible',tags:['diseño','recursos'],areaId:aId.trabajo,createdAt:'2026-02-18'},
    {id:uid(),title:'Conversación clave con papá',content:'Me dijo que el mayor error que cometió fue no apostar por su negocio a los 30. "A tu edad yo ya tenía miedo, tú no dejes que el miedo decida." Guardar esto para cuando dude.',tags:['familia','motivación'],areaId:aId.rel,createdAt:'2026-02-10'},
  ],

  // ─── INBOX ────────────────────────────────────────────
  inbox:[
    {id:uid(),content:'Investigar herramientas de facturación electrónica para freelancers',createdAt:'2026-03-12',processed:false},
    {id:uid(),content:'Llamar a Miguel sobre la propuesta de sociedad en AppFit',           createdAt:'2026-03-11',processed:false},
    {id:uid(),content:'Ver si conviene abrir cuenta en Clip o Conekta para cobros',         createdAt:'2026-03-11',processed:false},
    {id:uid(),content:'Buscar coworking cerca de Condesa para reuniones con clientes',      createdAt:'2026-03-10',processed:false},
    {id:uid(),content:'Idea: newsletter semanal sobre diseño para emprendedores',           createdAt:'2026-03-09',processed:false},
    {id:uid(),content:'Revisar si tengo CFDI de todos los gastos de febrero',               createdAt:'2026-03-08',processed:true},
    {id:uid(),content:'Conseguir número de contacto del contador de Javier',               createdAt:'2026-03-07',processed:true},
  ],

  // ─── HÁBITOS ──────────────────────────────────────────
  habits:[
    {id:uid(),name:'Ejercicio 45 min',    frequency:'daily',  completions:['2026-03-11','2026-03-10','2026-03-09','2026-03-08','2026-03-07','2026-03-06','2026-03-05']},
    {id:uid(),name:'Leer 30 min',         frequency:'daily',  completions:['2026-03-12','2026-03-11','2026-03-10','2026-03-09','2026-03-07','2026-03-06']},
    {id:uid(),name:'Journaling matutino', frequency:'daily',  completions:['2026-03-12','2026-03-11','2026-03-10','2026-03-08','2026-03-07']},
    {id:uid(),name:'Sin azúcar',          frequency:'daily',  completions:['2026-03-12','2026-03-11','2026-03-09','2026-03-08','2026-03-07','2026-03-06','2026-03-05','2026-03-04']},
    {id:uid(),name:'Revisar finanzas',    frequency:'weekly', completions:['2026-03-10','2026-03-03','2026-02-24']},
    {id:uid(),name:'Llamada familiar',    frequency:'weekly', completions:['2026-03-09','2026-03-02','2026-02-23']},
  ],

  // ─── FINANZAS ─────────────────────────────────────────
  budget:[
    {id:uid(),category:'Renta estudio',    amount:12000, type:'expense', period:'monthly'},
    {id:uid(),category:'Servicios (luz, internet, tel)',amount:2200,type:'expense',period:'monthly'},
    {id:uid(),category:'Comida',           amount:5000,  type:'expense', period:'monthly'},
    {id:uid(),category:'Suscripciones SaaS',amount:1800, type:'expense', period:'monthly'},
    {id:uid(),category:'Transporte',       amount:1500,  type:'expense', period:'monthly'},
    {id:uid(),category:'Ahorro',           amount:10000, type:'expense', period:'monthly'},
    {id:uid(),category:'Inversión',        amount:5000,  type:'expense', period:'monthly'},
    {id:uid(),category:'Freelance clientes',amount:80000,type:'income',  period:'monthly'},
  ],
  transactions:[
    {id:uid(),description:'Pago proyecto El Molino — anticipo',  amount:17500, type:'income', category:'Freelance',date:'2026-03-01'},
    {id:uid(),description:'Renta marzo',                          amount:12000, type:'expense',category:'Vivienda',  date:'2026-03-01'},
    {id:uid(),description:'Adobe Creative Cloud',                 amount:890,   type:'expense',category:'Software',  date:'2026-03-02'},
    {id:uid(),description:'Figma Professional',                   amount:420,   type:'expense',category:'Software',  date:'2026-03-02'},
    {id:uid(),description:'Supermercado — Chedraui',              amount:1240,  type:'expense',category:'Comida',    date:'2026-03-04'},
    {id:uid(),description:'Pago cliente SaaS — Enero (atrasado)', amount:32000, type:'income', category:'Freelance', date:'2026-03-05'},
    {id:uid(),description:'Gasolina',                             amount:680,   type:'expense',category:'Transporte',date:'2026-03-06'},
    {id:uid(),description:'Comida con cliente (Hermes)',           amount:840,   type:'expense',category:'Negocio',   date:'2026-03-07'},
    {id:uid(),description:'Transferencia a cuenta ahorro',        amount:10000, type:'expense',category:'Ahorro',    date:'2026-03-08'},
    {id:uid(),description:'Uber Eats — varios días',              amount:560,   type:'expense',category:'Comida',    date:'2026-03-10'},
    {id:uid(),description:'ChatGPT Plus',                         amount:350,   type:'expense',category:'Software',  date:'2026-03-11'},
    {id:uid(),description:'Pago proyecto El Molino — 2do pago',   amount:17500, type:'income', category:'Freelance', date:'2026-03-12'},
  ],

  // ─── SALUD ────────────────────────────────────────────
  healthMetrics:[
    {id:uid(),date:'2026-03-01',peso:83.2,pasos:7200,agua:1.8,sueño:6.5},
    {id:uid(),date:'2026-03-03',peso:83.0,pasos:9100,agua:2.0,sueño:7.0},
    {id:uid(),date:'2026-03-05',peso:82.7,pasos:11200,agua:2.2,sueño:7.5},
    {id:uid(),date:'2026-03-07',peso:82.5,pasos:8900,agua:2.0,sueño:6.8},
    {id:uid(),date:'2026-03-10',peso:82.1,pasos:10400,agua:2.5,sueño:8.0},
    {id:uid(),date:'2026-03-12',peso:81.8,pasos:9800,agua:2.3,sueño:7.2},
  ],
  healthGoals:{peso:78,sueño:8,pasos:10000,agua:2.5,entrenosSem:5},
  medications:[
    {id:uid(),name:'Vitamina D3',dose:'2000 UI',frequency:'daily',  notes:'Con el desayuno',stock:45},
    {id:uid(),name:'Omega 3',    dose:'1g',      frequency:'daily',  notes:'Con comida',      stock:30},
    {id:uid(),name:'Magnesio',   dose:'400mg',   frequency:'nightly',notes:'Antes de dormir', stock:20},
  ],
  workouts:[
    {id:uid(),date:'2026-03-11',type:'Fuerza',duration:50,exercises:['Press banca 4x8','Sentadilla 4x8','Peso muerto 3x5'],notes:'PR en peso muerto: 100kg'},
    {id:uid(),date:'2026-03-10',type:'Cardio', duration:35,exercises:['Caminata inclinada'],notes:''},
    {id:uid(),date:'2026-03-09',type:'Fuerza', duration:55,exercises:['Press militar 4x8','Dominadas 4x6','Remo 3x10'],notes:''},
    {id:uid(),date:'2026-03-07',type:'HIIT',   duration:30,exercises:['Tabata 8 rondas'],notes:'Muy intenso'},
    {id:uid(),date:'2026-03-06',type:'Fuerza', duration:50,exercises:['Press banca','Fondos','Curl bíceps'],notes:''},
  ],
  medicalVisits:[
    {id:uid(),date:'2026-02-14',doctor:'Dr. Ramírez',specialty:'Medicina general',notes:'Checkup anual. Todo bien. Recomienda bajar sodio.',diagnosis:'Sano',nextVisit:'2026-08-14'},
  ],
  medicalDocs:[],

  // ─── HOGAR ────────────────────────────────────────────
  maintenances:[
    {id:uid(),item:'Boiler',       lastDate:'2025-10-01',nextDate:'2026-04-01',notes:'Revisión gas anual',cost:800,status:'upcoming'},
    {id:uid(),item:'A/C sala',     lastDate:'2026-01-15',nextDate:'2026-06-15',notes:'Limpieza filtros',  cost:450,status:'upcoming'},
    {id:uid(),item:'Plomería',     lastDate:'2026-02-20',nextDate:null,        notes:'Fuga bajo fregadero reparada',cost:650,status:'done'},
    {id:uid(),item:'Pintura estudio',lastDate:null,      nextDate:'2026-04-15',notes:'Pared norte necesita repintado',cost:1200,status:'pending'},
  ],
  homeDocs:[
    {id:uid(),name:'Contrato arrendamiento',  category:'Legal',  expiry:'2026-12-31',notes:'Renovación automática si no se avisa con 30 días'},
    {id:uid(),name:'Póliza seguro hogar',      category:'Seguro', expiry:'2026-09-01',notes:'Cubre robo y daños estructurales'},
    {id:uid(),name:'Recibo luz — Febrero 2026',category:'Servicio',expiry:null,       notes:'$780 MXN'},
  ],
  homeContacts:[
    {id:uid(),name:'Don Roberto',  role:'Plomero',     phone:'55-1234-5678',notes:'Muy confiable, cobra justo'},
    {id:uid(),name:'Eléctrica Sur',role:'Electricista', phone:'55-8765-4321',notes:'Empresa, pedir a "Mauricio"'},
    {id:uid(),name:'Carlos (casero)',role:'Arrendador',  phone:'55-2222-3333',notes:'Cobro el 1ro, acepta transferencia'},
  ],

  // ─── DESARROLLO PERSONAL ──────────────────────────────
  learnings:[
    {id:uid(),title:'Framer Motion avanzado',      source:'Curso Udemy',  date:'2026-03-10',tags:['animación','react'],  notes:'Animaciones de layout y shared elements son las más útiles'},
    {id:uid(),title:'Pricing psicológico',          source:'Libro: Priceless',date:'2026-02-28',tags:['negocio','ventas'],notes:'El precio ancla cambia completamente la percepción de valor'},
    {id:uid(),title:'Sistema Zettelkasten',         source:'Blog Obsidian', date:'2026-02-15',tags:['productividad','notas'],notes:'Atomic notes + links bidireccionales'},
    {id:uid(),title:'JTBD — Jobs to Be Done',       source:'Podcast Lenny', date:'2026-01-30',tags:['producto','ux'],    notes:'Los usuarios no compran features, contratan soluciones a problemas específicos'},
  ],
  retros:[
    {id:uid(),period:'Febrero 2026',went_well:'Cerré 2 proyectos, mantuve racha ejercicio 18 días, terminé libro de finanzas',improve:'Dormí mal la última semana, descuidé inbox, no avancé en AppFit',action:'Bloquear viernes por la tarde solo para AppFit',createdAt:'2026-03-01'},
    {id:uid(),period:'Enero 2026',went_well:'Arranqué el año con claridad, definí objetivos anuales, conseguí cliente nuevo (El Molino)',improve:'Gasté de más en salidas, no hice ejercicio la 3ra semana',action:'Presupuesto fijo para entretenimiento: $2,000/mes',createdAt:'2026-02-01'},
  ],
  ideas:[
    {id:uid(),content:'Podcast sobre diseño para no diseñadores — orientado a founders',   createdAt:'2026-03-08',tags:['contenido','negocio']},
    {id:uid(),content:'Template de propuesta comercial con IA que adapta el tono al cliente',createdAt:'2026-03-05',tags:['herramienta','ia']},
    {id:uid(),content:'Comunidad de freelancers creativos en CDMX — eventos mensuales',     createdAt:'2026-02-22',tags:['comunidad','networking']},
    {id:uid(),content:'Curso: "De diseñador a dueño de agencia" — lo que nadie te enseña', createdAt:'2026-02-10',tags:['educación','negocio']},
  ],

  // ─── RELACIONES ───────────────────────────────────────
  people:[
    {id:'r1',name:'Miguel Ángel Torres', role:'Socio potencial AppFit', tags:['negocio','tech'],  notes:'Dev full-stack, muy bueno. Interesado en co-fundar AppFit. Pendiente definir equity.'},
    {id:'r2',name:'Laura Méndez',        role:'Cliente — El Molino',    tags:['cliente'],          notes:'Fundadora de la cafetería. Muy exigente pero justa. Referirla si queda contenta.'},
    {id:'r3',name:'Javier Soto',         role:'Mentor / colega',        tags:['mentor','negocio'], notes:'10 años de agencia. Almorzamos cada mes. Siempre tiene perspectiva valiosa.'},
    {id:'r4',name:'Daniela Ruiz',        role:'Diseñadora freelance',   tags:['colega','red'],     notes:'Muy buena en motion. La llamo cuando tengo overflow de trabajo.'},
    {id:'r5',name:'Carlos Hermes',       role:'Prospecto — Constructora',tags:['prospecto'],       notes:'Necesita rediseño de sitio + materiales de ventas. Presupuesto alto.'},
  ],
  followUps:[
    {id:uid(),personId:'r1',topic:'Definir términos de sociedad AppFit', dueDate:'2026-03-15',done:false},
    {id:uid(),personId:'r5',topic:'Enviar propuesta formal Constructora Hermes',dueDate:'2026-03-15',done:false},
    {id:uid(),personId:'r3',topic:'Almuerzo mensual de marzo',           dueDate:'2026-03-18',done:false},
    {id:uid(),personId:'r2',topic:'Llamada de cierre — entrega final El Molino',dueDate:'2026-03-14',done:false},
  ],
  interactions:[
    {id:uid(),personId:'r1',date:'2026-03-08',type:'Café',notes:'Hablamos 2h del MVP. Él pondría el backend, yo el diseño y producto. Acordamos reunirnos la semana siguiente con números.'},
    {id:uid(),personId:'r3',date:'2026-02-20',type:'Almuerzo',notes:'Me aconsejó no bajar precios para conseguir clientes. "El cliente barato es el cliente problema."'},
    {id:uid(),personId:'r2',date:'2026-03-01',type:'Videollamada',notes:'Aprobó las 3 propuestas de concepto. Elige opción B con ajustes menores.'},
    {id:uid(),personId:'r5',date:'2026-03-07',type:'Comida',notes:'Primera reunión. Buen feeling. Quiere propuesta esta semana. Presupuesto: $45-55k.'},
  ],

  // ─── SIDE PROJECTS ────────────────────────────────────
  sideProjects:[
    {id:'sp1',name:'AppFit',      description:'App de entrenamiento con IA para rutinas personalizadas',status:'active', areaId:aId.side,color:'#6366f1'},
  ],
  spTasks:[
    {id:uid(),projectId:'sp1',title:'Definir arquitectura de base de datos',  status:'done',       priority:'high',  deadline:'2026-02-20'},
    {id:uid(),projectId:'sp1',title:'Wireframes flujo principal (onboarding)', status:'done',       priority:'high',  deadline:'2026-03-01'},
    {id:uid(),projectId:'sp1',title:'Diseñar UI kit del proyecto',             status:'in_progress',priority:'high',  deadline:'2026-03-15'},
    {id:uid(),projectId:'sp1',title:'Integrar API generación de rutinas (IA)', status:'in_progress',priority:'high',  deadline:'2026-03-25'},
    {id:uid(),projectId:'sp1',title:'Pantallas de seguimiento de progreso',    status:'todo',       priority:'medium',deadline:'2026-04-05'},
    {id:uid(),projectId:'sp1',title:'Beta privada con 10 usuarios',            status:'todo',       priority:'medium',deadline:'2026-05-01'},
    {id:uid(),projectId:'sp1',title:'Landing page y waitlist',                 status:'todo',       priority:'low',   deadline:'2026-06-01'},
  ],
  milestones:[
    {id:uid(),projectId:'sp1',title:'MVP funcional completo',date:'2026-08-15',done:false},
    {id:uid(),projectId:'sp1',title:'Beta pública lanzada',  date:'2026-10-01',done:false},
  ],
  spTimeLogs:[
    {id:uid(),projectId:'sp1',date:'2026-03-11',hours:2.5,notes:'Avancé diseño UI kit'},
    {id:uid(),projectId:'sp1',date:'2026-03-10',hours:1.5,notes:'Research competencia'},
    {id:uid(),projectId:'sp1',date:'2026-03-07',hours:3.0,notes:'Integración API IA — primeras pruebas'},
    {id:uid(),projectId:'sp1',date:'2026-03-05',hours:2.0,notes:'Wireframes revisados con Miguel'},
    {id:uid(),projectId:'sp1',date:'2026-03-03',hours:4.0,notes:'Setup proyecto React + Supabase'},
  ],

  // ─── JOURNAL ──────────────────────────────────────────
  journal:[
    {id:uid(),date:'2026-03-12',mood:'bueno',content:'Entregué los logos de El Molino. Laura quedó contenta. Ese alivio post-entrega es de los mejores sentimientos del freelance. Ahora toca enfocarse en la propuesta de Hermes y seguir con AppFit esta noche.'},
    {id:uid(),date:'2026-03-10',mood:'reflexivo',content:'Reunión con Miguel fue bien. Me da miedo la idea de tener socio, pero también sé que solo no voy a llegar tan lejos con AppFit. El modelo de negocio todavía no está claro. ¿Freemium? ¿Suscripción? Hay que decidir antes de seguir construyendo.'},
    {id:uid(),date:'2026-03-07',mood:'motivado',content:'Primer café con Carlos Hermes. Si sale el proyecto, sería el más grande del año. No quiero emocionarme antes, pero $50k en un solo proyecto cambiaría mucho las cosas para el segundo semestre.'},
    {id:uid(),date:'2026-03-03',mood:'cansado',content:'Semana muy cargada. El proyecto del Molino me tiene en ciclos de revisiones que no terminan. Tengo que aprender a cerrar los feedback loops desde el contrato. Próximo cliente: máximo 2 rondas de revisión.'},
  ],

  // ─── LIBROS ───────────────────────────────────────────
  books:[
    {id:uid(),title:'The Mom Test',          author:'Rob Fitzpatrick', status:'done',    rating:5,notes:'Cómo hablar con clientes sin que te mientan. Fundamental para AppFit.',startDate:'2026-02-01',endDate:'2026-02-12',areaId:aId.side},
    {id:uid(),title:'Company of One',        author:'Paul Jarvis',     status:'done',    rating:5,notes:'El crecimiento no siempre es la respuesta. Me hizo replantear si quiero agencia grande.',startDate:'2026-01-10',endDate:'2026-01-25',areaId:aId.trabajo},
    {id:uid(),title:'Atomic Habits',         author:'James Clear',     status:'done',    rating:4,notes:'Los sistemas > las metas. Cambié mis rutinas después de leer esto.',startDate:'2025-12-01',endDate:'2025-12-18',areaId:aId.dev},
    {id:uid(),title:'Shape Up',              author:'Ryan Singer',     status:'reading', rating:null,notes:'Método de Basecamp para producto. Aplicar en AppFit.',startDate:'2026-03-05',endDate:null,areaId:aId.side},
    {id:uid(),title:'Never Split the Difference',author:'Chris Voss',  status:'reading', rating:null,notes:'Negociación. Para el trato con Hermes.',startDate:'2026-03-01',endDate:null,areaId:aId.trabajo},
    {id:uid(),title:'Thinking, Fast and Slow',author:'Daniel Kahneman',status:'pending', rating:null,notes:'Para entender mejor el comportamiento del usuario.',startDate:null,endDate:null,areaId:aId.dev},
  ],

  // ─── EDUCACIÓN ────────────────────────────────────────
  education:[
    {id:uid(),title:'Framer Motion — Animaciones avanzadas',platform:'Udemy',  status:'in_progress',progress:65,url:'https://udemy.com',notes:'Aplicar en redesign del portafolio',areaId:aId.trabajo},
    {id:uid(),title:'Supabase & PostgreSQL para frontend devs',platform:'YouTube',status:'done',progress:100,url:'',notes:'Completado para AppFit',areaId:aId.side},
    {id:uid(),title:'Copywriting para founders',             platform:'Gumroad',status:'pending',   progress:0, url:'',notes:'Comprado, sin empezar',areaId:aId.trabajo},
  ],

  // ─── SHOPPING ─────────────────────────────────────────
  shopping:[
    {id:uid(),name:'Café molido Veracruz',qty:500, unit:'g',  category:'Despensa',     done:false,createdAt:'2026-03-10'},
    {id:uid(),name:'Avena',              qty:1,   unit:'kg', category:'Despensa',     done:false,createdAt:'2026-03-10'},
    {id:uid(),name:'Huevos',             qty:12,  unit:'pzas',category:'Básicos',     done:false,createdAt:'2026-03-10'},
    {id:uid(),name:'Pechuga de pollo',   qty:1,   unit:'kg', category:'Proteína',     done:false,createdAt:'2026-03-10'},
    {id:uid(),name:'Espinacas baby',     qty:1,   unit:'bolsa',category:'Verduras',   done:false,createdAt:'2026-03-11'},
    {id:uid(),name:'Aguacate',           qty:4,   unit:'pzas',category:'Verduras',    done:false,createdAt:'2026-03-11'},
    {id:uid(),name:'Leche deslactosada', qty:2,   unit:'L',  category:'Lácteos',      done:true, createdAt:'2026-03-09'},
    {id:uid(),name:'Proteína whey',      qty:1,   unit:'bote',category:'Suplementos', done:false,createdAt:'2026-03-08'},
    {id:uid(),name:'Papel de baño',      qty:1,   unit:'paq',category:'Hogar',        done:true, createdAt:'2026-03-09'},
    {id:uid(),name:'Detergente',         qty:1,   unit:'L',  category:'Hogar',        done:false,createdAt:'2026-03-10'},
  ],

  // ─── FARMACIA ─────────────────────────────────────────
  farmaciaItems:[
    {id:uid(),name:'Vitamina D3 2000UI',   qty:1,brand:'Natrol',   done:false,notes:'Pedir el de 90 cápsulas'},
    {id:uid(),name:'Magnesio Glicinato',   qty:1,brand:'Solgar',   done:false,notes:''},
    {id:uid(),name:'Aspirina 500mg',       qty:1,brand:'Bayer',    done:true, notes:'Reserva en cajón'},
  ],

  // ─── VEHÍCULOS ────────────────────────────────────────
  carInfo:{brand:'Mazda',model:'CX-5',year:'2022',plate:'ABC-123-X',km:'38400',fuelType:'gasolina',fuelType1:'',fuelType2:''},
  vehicles:[
    {id:'v1',brand:'Mazda',model:'CX-5',year:'2022',plate:'ABC-123-X',km:'38400',fuelType:'gasolina',color:'Gris Polaris',notes:'Principal'},
  ],
  activeVehicleId:'v1',
  carMaintenances:[
    {id:uid(),vehicleId:'v1',type:'Aceite',        date:'2025-12-10',km:35000,cost:980, workshop:'Taller Mazda Sur',    notes:'Aceite 5W-30 sintético',nextKm:40000,nextDate:'2026-06-10'},
    {id:uid(),vehicleId:'v1',type:'Frenos',        date:'2025-09-20',km:32000,cost:2400,workshop:'AutoFreno Express',   notes:'Pastillas delanteras y traseras',nextKm:null,nextDate:'2026-09-20'},
    {id:uid(),vehicleId:'v1',type:'Verificación',  date:'2026-01-15',km:36500,cost:380, workshop:'Verificentro Norte',  notes:'Aprobó sin problemas',nextKm:null,nextDate:'2026-07-15'},
  ],
  carExpenses:[
    {id:uid(),vehicleId:'v1',date:'2026-03-06',type:'Gasolina',amount:680, km:38200,notes:'Full tank'},
    {id:uid(),vehicleId:'v1',date:'2026-02-20',type:'Gasolina',amount:650, km:37800,notes:''},
    {id:uid(),vehicleId:'v1',date:'2026-02-05',type:'Estacionamiento',amount:120,km:null,notes:'Reunión cliente'},
    {id:uid(),vehicleId:'v1',date:'2026-01-15',type:'Verificación',   amount:380, km:36500,notes:''},
  ],
  carDocs:[
    {id:uid(),vehicleId:'v1',name:'Tarjeta circulación', expiry:'2027-03-31',notes:'Renovar en marzo 2027'},
    {id:uid(),vehicleId:'v1',name:'Seguro auto — GNP',   expiry:'2026-11-01',notes:'Amplia cobertura, $8,200/año'},
    {id:uid(),vehicleId:'v1',name:'Factura compra vehículo',expiry:null,    notes:'Guardada en carpeta física'},
  ],
  carReminders:[
    {id:uid(),vehicleId:'v1',title:'Cambio de aceite próximo',dueKm:40000,dueDate:'2026-06-10',done:false},
    {id:uid(),vehicleId:'v1',title:'Verificación semestral', dueKm:null,  dueDate:'2026-07-15',done:false},
  ],

  // ─── SUEÑO ────────────────────────────────────────────
  sleepLog:[
    {id:uid(),date:'2026-03-11',bedtime:'23:30',wakeup:'07:00',quality:4,notes:''},
    {id:uid(),date:'2026-03-10',bedtime:'00:15',wakeup:'07:30',quality:3,notes:'Me costó dormirme'},
    {id:uid(),date:'2026-03-09',bedtime:'23:00',wakeup:'06:45',quality:5,notes:'Excelente'},
    {id:uid(),date:'2026-03-08',bedtime:'01:00',wakeup:'08:00',quality:3,notes:'Noche de trabajo tarde'},
    {id:uid(),date:'2026-03-07',bedtime:'23:15',wakeup:'07:00',quality:4,notes:''},
    {id:uid(),date:'2026-03-06',bedtime:'00:00',wakeup:'08:30',quality:4,notes:'Viernes, no había prisa'},
  ],
  dreamJournal:[
    {id:uid(),date:'2026-03-09',content:'Soñé que presentaba AppFit en un stage enorme y se caía la app en vivo. Clásica ansiedad de producto.'},
  ],

  // ─── NUTRICIÓN ────────────────────────────────────────
  recipes:[
    {id:uid(),name:'Bowl proteico matutino',ingredients:'1 taza avena, 1 scoop whey vainilla, 1 plátano, 1 cdta mantequilla almendra, canela',instructions:'Mezclar avena cocida con whey. Agregar plátano en rodajas y mantequilla de almendra.',calories:480,protein:38,tags:['desayuno','rápido']},
    {id:uid(),name:'Pollo con espinacas al ajo',ingredients:'200g pechuga, 2 tazas espinacas, 3 dientes ajo, aceite oliva, sal, pimienta',instructions:'Sellar pollo en sartén. Saltear ajo, agregar espinacas. Salpimentar.',calories:320,protein:45,tags:['comida','alto-proteína','rápido']},
    {id:uid(),name:'Ensalada guacamole power',ingredients:'1 aguacate, tomate cherry, cebolla morada, limón, cilantro, 150g atún en agua',instructions:'Machacar aguacate. Mezclar todo. Servir frío.',calories:380,protein:30,tags:['cena','ligero']},
  ],
  weekMenus:{},

  // ─── ENTRETENIMIENTO ──────────────────────────────────
  entertainment:[
    {id:uid(),type:'serie',  title:'Severance',        platform:'Apple TV+',status:'watching',rating:5,notes:'La mejor serie sobre trabajo que he visto'},
    {id:uid(),type:'serie',  title:'The Bear',          platform:'Disney+', status:'done',    rating:5,notes:'S2 es obra maestra'},
    {id:uid(),type:'pelicula',title:'Oppenheimer',      platform:'Streaming',status:'done',   rating:4,notes:''},
    {id:uid(),type:'juego',  title:'Balatro',           platform:'Steam',   status:'playing', rating:5,notes:'Adictivo. Solo fines de semana.'},
    {id:uid(),type:'podcast',title:'Lenny\'s Podcast',  platform:'Spotify', status:'active',  rating:5,notes:'Producto y growth — muy bueno'},
    {id:uid(),type:'podcast',title:'My First Million',  platform:'Spotify', status:'active',  rating:4,notes:'Ideas de negocio, energizante'},
    {id:uid(),type:'serie',  title:'Succession',        platform:'Max',     status:'pending', rating:null,notes:'Pendiente desde hace meses'},
  ],

  // ─── MASCOTAS ─────────────────────────────────────────
  pets:[
    {id:'pet1',name:'Kira',species:'Perro',breed:'Labrador',birthdate:'2022-05-10',weight:24,color:'Negra',notes:'Muy energética, necesita 2 paseos largos al día'},
  ],
  petVaccines:[
    {id:uid(),petId:'pet1',name:'Antirrábica',    date:'2025-09-15',nextDate:'2026-09-15',vet:'Dr. Moreno',notes:'Al corriente'},
    {id:uid(),petId:'pet1',name:'Polivalente',    date:'2025-09-15',nextDate:'2026-09-15',vet:'Dr. Moreno',notes:'Pentavalente canina'},
    {id:uid(),petId:'pet1',name:'Antiparasitario',date:'2026-01-10',nextDate:'2026-04-10',vet:'Dr. Moreno',notes:'Próxima en abril'},
  ],
  petVetVisits:[
    {id:uid(),petId:'pet1',date:'2025-09-15',reason:'Vacunas anuales',vet:'Dr. Moreno — Clínica Animalia',cost:680,notes:'Todo bien. Peso ideal.'},
    {id:uid(),petId:'pet1',date:'2026-01-10',reason:'Antiparasitario + revisión',vet:'Dr. Moreno',cost:350,notes:'Encías perfectas. Antiparasitario oral.'},
  ],

  // ─── VIAJES ───────────────────────────────────────────
  trips:[
    {id:'t1',name:'Oaxaca — Semana Santa',destination:'Oaxaca, México',startDate:'2026-04-02',endDate:'2026-04-07',status:'planning',budget:12000,notes:'Con pareja. Vuelos comprados.'},
    {id:'t2',name:'Medellín — Conferencia de diseño',destination:'Medellín, Colombia',startDate:'2026-06-10',endDate:'2026-06-14',status:'idea',budget:20000,notes:'LatAm UX Summit. Ver si sale la fecha oficial.'},
  ],
  tripStops:[
    {id:uid(),tripId:'t1',name:'Monte Albán',          date:'2026-04-03',notes:'Ir temprano, antes del calor'},
    {id:uid(),tripId:'t1',name:'Mercado 20 de Noviembre',date:'2026-04-04',notes:'Desayuno obligatorio'},
    {id:uid(),tripId:'t1',name:'Sierra Juárez',        date:'2026-04-05',notes:'Caminata Llano Grande — confirmar guía'},
    {id:uid(),tripId:'t1',name:'Mezcal El Silencio',   date:'2026-04-06',notes:'Tour de producción + cata'},
  ],
  tripExpenses:[
    {id:uid(),tripId:'t1',description:'Vuelos CDMX-OAX ida y vuelta x2',amount:5800,date:'2026-02-20',category:'Vuelos'},
    {id:uid(),tripId:'t1',description:'Airbnb Centro Histórico (5 noches)',amount:3200,date:'2026-02-20',category:'Hospedaje'},
  ],
  tripChecklist:{
    't1':[
      {id:uid(),text:'Confirmar guía Sierra Juárez',done:false},
      {id:uid(),text:'Reservar restaurante Criollo',done:false},
      {id:uid(),text:'Comprar adaptador para cámara',done:false},
      {id:uid(),text:'Descargar mapas offline Oaxaca',done:false},
      {id:uid(),text:'Avisarle a vecina que cuide a Kira',done:false},
      {id:uid(),text:'Vuelos comprados',done:true},
      {id:uid(),text:'Airbnb confirmado',done:true},
    ]
  },

  // ─── MOMENTOS ─────────────────────────────────────────
  moments:[
    {id:uid(),date:'2026-03-07',title:'Primera reunión grande del año',content:'Carlos Hermes me trató como par desde el principio. Fue la primera vez que sentí que mi posicionamiento como "senior" está funcionando.',mood:'🚀',tags:['negocio','confianza']},
    {id:uid(),date:'2026-02-14',title:'Cena especial con Ana',content:'Reservé Quintonil. Fue perfecto. Esos momentos me recuerdan por qué trabajo duro.',mood:'❤️',tags:['personal','pareja']},
    {id:uid(),date:'2026-01-01',title:'Año nuevo con claridad',content:'Por primera vez en años empecé enero con un plan real, no solo buenos deseos. Los objetivos están escritos, los sistemas están armados.',mood:'✨',tags:['reflexión','metas']},
  ],

  // ─── RETOS HÁBITOS ────────────────────────────────────
  habitChallenges:[
    {id:uid(),name:'21 días sin azúcar refinada',startDate:'2026-02-20',endDate:'2026-03-12',completions:['2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-24','2026-02-25','2026-02-26','2026-02-27','2026-02-28','2026-03-01','2026-03-02','2026-03-04','2026-03-05','2026-03-06','2026-03-07','2026-03-08','2026-03-09','2026-03-10','2026-03-11','2026-03-12'],notes:'Fallé el 3 de marzo (cumpleaños de mamá 🎂). Seguí al día siguiente.'},
  ],

  // ─── REMINDERS ────────────────────────────────────────
  reminders:[
    {id:uid(),title:'Pagar ISR trimestral',              dueDate:'2026-03-17',done:false,priority:'high',  notes:'Usar el portal del SAT'},
    {id:uid(),title:'Renovar Figma Professional',         dueDate:'2026-04-02',done:false,priority:'medium',notes:'Revisar si subió el precio'},
    {id:uid(),title:'Vacuna antiparasitaria Kira',        dueDate:'2026-04-10',done:false,priority:'medium',notes:'Dr. Moreno — Clínica Animalia'},
    {id:uid(),title:'Revisión semestral boiler',          dueDate:'2026-04-01',done:false,priority:'low',   notes:'Llamar a Don Roberto'},
    {id:uid(),title:'Verificación vehicular',             dueDate:'2026-07-15',done:false,priority:'low',   notes:'Verificentro Norte'},
  ],
};
};

export { initData };
