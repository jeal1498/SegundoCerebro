import React, { useState, useEffect, useRef } from 'react';
import { DARK_THEME } from '../theme/tokens.js';
const D = DARK_THEME; // Onboarding always uses dark theme regardless of system setting

// ===================== ONBOARDING =====================
// ===================== PSICKE ONBOARDING =====================
export const OB_AREAS = [
  { id:'salud',      emoji:'💪', label:'Salud'          },
  { id:'trabajo',    emoji:'💼', label:'Trabajo'         },
  { id:'finanzas',   emoji:'💰', label:'Finanzas'        },
  { id:'hogar',      emoji:'🏠', label:'Hogar'           },
  { id:'relaciones', emoji:'👥', label:'Relaciones'      },
  { id:'desarrollo', emoji:'🧠', label:'Desarrollo'      },
  { id:'sideproj',   emoji:'🚀', label:'Side projects'   },
];
const OB_CHALLENGES = [
  { id:'capt',  label:'Olvido cosas importantes'  },
  { id:'prio',  label:'No sé qué priorizar'        },
  { id:'habit', label:'Mis hábitos no duran'       },
  { id:'proj',  label:'Proyectos sin terminar'     },
  { id:'over',  label:'Me siento abrumado'         },
];
const OB_AREA_QS = {
  trabajo:[
    { key:'trabajo_proyecto', type:'text',
      question:(n)=><>¿En qué proyecto de trabajo estás más <em>enfocado ahora mismo</em>, {n}?</>,
      placeholder:'Nombre del proyecto…', hint:'Se creará como tu proyecto activo principal' },
    { key:'trabajo_next', type:'text',
      question:()=><>¿Y cuál es la <em>siguiente acción concreta</em> que tienes pendiente?</>,
      placeholder:'Ej. Enviar propuesta al cliente…', hint:'Se añadirá como tarea con prioridad alta' },
  ],
  salud:[
    { key:'salud_habit', type:'text',
      question:(n)=><>¿Qué hábito de salud quieres <em>mantener o retomar</em>, {n}?</>,
      placeholder:'Ej. Correr 30 minutos, beber 2L de agua…', hint:'Se creará como hábito diario' },
    { key:'salud_objetivo', type:'text',
      question:()=><>¿Cuál es tu <em>meta de salud</em> para este año?</>,
      placeholder:'Ej. Correr una carrera de 5K…', hint:'Se creará como objetivo en tu área de Salud' },
  ],
  finanzas:[
    { key:'finanzas_meta', type:'text',
      question:(n)=><>{n}, ¿tienes alguna <em>meta financiera</em> clara este año?</>,
      placeholder:'Ej. Ahorrar 3 meses de emergencia…', hint:'Se creará como objetivo en Finanzas' },
    { key:'finanzas_pendiente', type:'text',
      question:()=><>¿Hay algún tema de dinero que llevas tiempo <em>posponiendo atender</em>?</>,
      placeholder:'Ej. Revisar suscripciones, declarar impuestos…', hint:'Se añadirá a tu Inbox' },
  ],
  hogar:[
    { key:'hogar_pendiente', type:'text',
      question:(n)=><>{n}, ¿hay algo en casa que llevas tiempo <em>posponiendo</em>?</>,
      placeholder:'Ej. Reparar la llave del baño…', hint:'Se creará como mantenimiento pendiente' },
  ],
  relaciones:[
    { key:'relaciones_persona', type:'text',
      question:(n)=><>¿Hay alguien con quien quieras <em>mantener más contacto</em>, {n}?</>,
      placeholder:'Nombre de esa persona…', hint:'Se añadirá a tus contactos' },
  ],
  desarrollo:[
    { key:'desarrollo_aprender', type:'text',
      question:(n)=><>{n}, ¿qué quieres <em>aprender o dominar</em> este año?</>,
      placeholder:'Ej. React, fotografía, un idioma…', hint:'Se creará como objetivo de desarrollo' },
    { key:'desarrollo_leer', type:'text', optional:true,
      question:()=><>¿Hay algún libro que tengas en mente para <em>leer próximamente</em>?</>,
      placeholder:'Título del libro… (opcional)', hint:'Se añadirá a tu lista de lectura' },
  ],
  sideproj:[
    { key:'sideproj_nombre', type:'text',
      question:(n)=><>{n}, ¿cómo se llama tu <em>side project más importante</em> ahora?</>,
      placeholder:'Nombre del proyecto…', hint:'Se creará en tu sección de Side Projects' },
    { key:'sideproj_estado', type:'choice',
      question:()=><>¿En qué fase está ese proyecto <em>en este momento</em>?</>,
      hint:'Ayuda a saber en qué momento del camino estás',
      choices:[
        { id:'idea',     label:'Solo una idea'       },
        { id:'building', label:'Lo estoy construyendo'},
        { id:'launched', label:'Ya está lanzado'      },
        { id:'paused',   label:'Está pausado'         },
      ],
    },
  ],
};

const OBAppear=({children,delay=0,style={}})=>{
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),delay);return()=>clearTimeout(t);},[delay]);
  return(
    <div style={{opacity:show?1:0,transform:show?'translateY(0)':'translateY(10px)',
      transition:'opacity .65s ease,transform .65s ease',...style}}>
      {children}
    </div>
  );
};

// [OB_STYLE_HELPERS_MOVED_INSIDE]

const OB_SAVE_KEY = 'sb_onboarding_progress';
const obLoad = () => { try { const s = localStorage.getItem(OB_SAVE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const obSave = (patch) => { try { const cur = obLoad() || {}; localStorage.setItem(OB_SAVE_KEY, JSON.stringify({...cur,...patch})); } catch {} };
const obClear = () => { try { localStorage.removeItem(OB_SAVE_KEY); } catch {} };

const Onboarding=({onDone})=>{
  // ── Style helpers using T tokens ──
  const OB_ghost = (active) => ({
    background: active ? `${D.accent}22` : 'transparent',
    border: `1px solid ${active ? D.accent : D.border}`,
    borderRadius: 10, padding: '12px 16px',
    color: active ? D.accent : D.muted,
    fontSize: 13, fontFamily: "'Inter',sans-serif", fontWeight: 300,
    cursor: 'pointer', textAlign: 'left', transition: 'all .2s', letterSpacing: .3, width: '100%',
  });
  const OB_pill = (active) => ({
    background: active ? `${D.accent}22` : 'transparent',
    border: `1px solid ${active ? D.accent : D.border}`,
    borderRadius: 24, padding: '8px 15px',
    color: active ? D.accent : D.muted,
    fontSize: 12, fontFamily: "'Inter',sans-serif", fontWeight: active ? 500 : 300,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all .2s', letterSpacing: .3,
  });
  const OB_cta = (enabled) => ({
    background: enabled ? D.accent : 'transparent',
    border: `1px solid ${enabled ? D.accent : D.border}`,
    borderRadius: 24, padding: '9px 22px',
    color: enabled ? '#000' : D.dim,
    fontSize: 11, fontFamily: "'Inter',sans-serif", fontWeight: enabled ? 600 : 300,
    letterSpacing: 2, textTransform: 'uppercase',
    cursor: enabled ? 'pointer' : 'default', transition: 'all .3s', alignSelf: 'flex-start',
  });
  const OB_input = {
    background: 'transparent', border: 'none',
    borderBottom: `1px solid ${D.border}`,
    color: D.text, fontSize: 18,
    fontFamily: "'Lora',serif", fontStyle: 'italic',
    padding: '6px 0', outline: 'none', width: '100%',
    caretColor: D.accent,
  };
  // Restore saved progress on mount
  const saved = obLoad();

  const [gStep,setGStep]         = useState(saved?.gStep||'api');
  const [transitioning,setTrans] = useState(false);
  const [obApiKey,setObApiKey]   = useState(saved?.obApiKey||'');
  const [apiInput,setApiInput]   = useState('');
  const [showApiKey,setShowApiKey] = useState(false);
  const [userName,setUserName]   = useState(saved?.userName||'');
  const [inputVal,setInputVal]   = useState('');
  const [challenge,setChallenge] = useState(saved?.challenge||null);
  const [selAreas,setSelAreas]   = useState(saved?.selAreas||[]);
  const [seedData,setSeedData]   = useState(saved?.seedData||{});
  const [areaQueue,setAreaQueue] = useState(saved?.areaQueue||[]);
  const [curArea,setCurArea]     = useState(saved?.curArea||null);
  const [curQIdx,setCurQIdx]     = useState(saved?.curQIdx||0);
  const [areaInput,setAreaInput] = useState('');
  const [choiceVal,setChoiceVal] = useState(null);
  const [polishing,setPolishing] = useState(false); // Gemini rewrite in progress
  const inputRef    = useRef(null);
  const areaInputRef = useRef(null);
  const apiInputRef  = useRef(null);

  // Persist state on every relevant change
  useEffect(()=>{
    obSave({gStep,obApiKey,userName,challenge,selAreas,seedData,areaQueue,curArea,curQIdx});
  },[gStep,obApiKey,userName,challenge,selAreas,seedData,areaQueue,curArea,curQIdx]);

  useEffect(()=>{ if(gStep==='api')  setTimeout(()=>apiInputRef.current?.focus(),800); },[gStep]);
  useEffect(()=>{ if(gStep==='name') setTimeout(()=>inputRef.current?.focus(),750); },[gStep]);
  useEffect(()=>{ if(gStep==='area_questions') setTimeout(()=>areaInputRef.current?.focus(),700); },[gStep,curArea,curQIdx]);

  const advance=(next,fn)=>{
    setTrans(true);
    setTimeout(()=>{ fn?.(); setGStep(next); setTrans(false); },400);
  };

  const confirmApi=(skip=false)=>{
    const k = skip ? '' : apiInput.trim();
    if(k) {
      try { localStorage.setItem('sb_gemini_key', k); } catch{}
    }
    advance('name', ()=>setObApiKey(k));
  };

  const confirmName=()=>{
    if(!inputVal.trim()) return;
    advance('challenge',()=>setUserName(inputVal.trim()));
  };
  const confirmChallenge=(id)=>{
    setChallenge(id);
    setTimeout(()=>advance('areas',()=>{}),320);
  };
  const toggleArea=(id)=>setSelAreas(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);
  const confirmAreas=()=>{
    const queue=selAreas.filter(id=>OB_AREA_QS[id]);
    if(!queue.length){ advance('done',()=>{}); return; }
    advance('area_questions',()=>{
      setAreaQueue(queue); setCurArea(queue[0]); setCurQIdx(0); setAreaInput(''); setChoiceVal(null);
    });
  };

  // ── Gemini rewrite of seedData ──────────────────────────────────────────
  const rewriteWithAI = async (raw, key) => {
    const entries = Object.entries(raw).filter(([,v])=>v && typeof v==='string');
    if(!entries.length || !key) return raw;

    const prompt = `Eres el asistente de un sistema de productividad personal llamado Segundo Cerebro.
El usuario respondió preguntas de configuración inicial escribiendo en lenguaje coloquial y sin formato.
Tu trabajo es reescribir cada respuesta como texto claro, profesional y conciso (máx 8 palabras por campo).
No agregues explicaciones. No uses comillas. Devuelve ÚNICAMENTE un JSON válido con las mismas claves.

Campos a reescribir:
${entries.map(([k,v])=>`"${k}": "${v}"`).join('\n')}

Reglas:
- Mantén el significado original
- Capitaliza la primera letra
- Elimina muletillas ("pues", "este", "o sea", "bueno", "claro", etc.)
- Si el valor ya es claro y corto, déjalo igual
- El campo "sideproj_estado" es un ID, NO lo toques`;

    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+key, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }],
          generationConfig:{ temperature:0.3, maxOutputTokens:512 } })
      });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/gi,'').trim();
      const parsed = JSON.parse(clean);
      return { ...raw, ...parsed };
    } catch(e) {
      return raw; // silently fallback to raw if anything fails
    }
  };

  const handleFinish = async () => {
    const key = obApiKey || (()=>{ try{ return localStorage.getItem('sb_gemini_key')||''; }catch{ return ''; } })();
    if(key && Object.values(seedData).some(v=>v)) {
      setPolishing(true);
      const polished = await rewriteWithAI(seedData, key);
      setPolishing(false);
      obClear();
      onDone(polished, userName, selAreas);
    } else {
      obClear();
      onDone(seedData, userName, selAreas);
    }
  };

  const curQs    = curArea?(OB_AREA_QS[curArea]||[]):[];
  const curQ     = curQs[curQIdx]||null;
  const totalQs  = areaQueue.reduce((s,id)=>s+(OB_AREA_QS[id]?.length||0),0);
  const doneQs   = areaQueue.slice(0,areaQueue.indexOf(curArea)).reduce((s,id)=>s+(OB_AREA_QS[id]?.length||0),0)+curQIdx;
  const canNext  = curQ?.type==='choice'?!!choiceVal:(curQ?.optional?true:areaInput.trim().length>0);
  const areaInfo = curArea?OB_AREAS.find(a=>a.id===curArea):null;

  const nextQ=()=>{
    if(curQ?.type==='choice'){ if(choiceVal) setSeedData(d=>({...d,[curQ.key]:choiceVal})); }
    else { if(areaInput.trim()||curQ?.optional) setSeedData(d=>({...d,[curQ.key]:areaInput.trim()})); }
    if(curQIdx+1<curQs.length){
      setTrans(true);
      setTimeout(()=>{ setCurQIdx(i=>i+1); setAreaInput(''); setChoiceVal(null); setTrans(false); },380);
      return;
    }
    const nextIdx=areaQueue.indexOf(curArea)+1;
    if(nextIdx<areaQueue.length){
      setTrans(true);
      setTimeout(()=>{ setCurArea(areaQueue[nextIdx]); setCurQIdx(0); setAreaInput(''); setChoiceVal(null); setTrans(false); },380);
      return;
    }
    // All area questions done — collect last answer then go to done
    const finalSeed = {...seedData};
    if(curQ?.type==='choice'){ if(choiceVal) finalSeed[curQ.key]=choiceVal; }
    else { if(areaInput.trim()||curQ?.optional) finalSeed[curQ.key]=areaInput.trim(); }
    advance('done',()=>setSeedData(finalSeed));
  };

  const OB_SEED_META={
    trabajo_proyecto:{ icon:'📁', label:'Proyecto'  },
    trabajo_next:    { icon:'✅', label:'Tarea'      },
    salud_habit:     { icon:'🔥', label:'Hábito'     },
    salud_objetivo:  { icon:'🎯', label:'Objetivo'   },
    finanzas_meta:   { icon:'🎯', label:'Objetivo'   },
    finanzas_pendiente:{ icon:'📥', label:'Inbox'    },
    hogar_pendiente: { icon:'🔧', label:'Mantenimiento'},
    relaciones_persona:{ icon:'👤', label:'Contacto' },
    desarrollo_aprender:{ icon:'🎯', label:'Objetivo'},
    desarrollo_leer: { icon:'📚', label:'Libro'      },
    sideproj_nombre: { icon:'🚀', label:'Side project'},
    sideproj_estado: { icon:'📍', label:'Estado'     },
  };

  const content=(
    <div style={{
      width:'100%',maxWidth:400,position:'relative',zIndex:1,
      opacity:transitioning?0:1,
      transform:transitioning?'translateY(8px)':'translateY(0)',
      transition:'opacity .38s ease,transform .38s ease',
    }}>
      {/* Wordmark */}
      <OBAppear delay={0} style={{marginBottom:60}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={D.border} strokeWidth="1.1">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.44-4.44 2.5 2.5 0 0 1 0-3.1 2.5 2.5 0 0 1 2.44-4.5A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.44-4.44 2.5 2.5 0 0 0 0-3.1 2.5 2.5 0 0 0-2.44-4.5A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
          <span style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:2.5,textTransform:'uppercase',fontFamily:"'Inter',sans-serif"}}>
            Segundo Cerebro
          </span>
        </div>
      </OBAppear>

      {/* ── API KEY (paso 0) ── */}
      {gStep==='api'&&<>
        <OBAppear delay={180} style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:10,background:D.border,
              border:`1px solid ${D.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
              🧠
            </div>
            <span style={{fontSize:10,color:D.dim,letterSpacing:2,textTransform:'uppercase',
              fontFamily:"'Inter',sans-serif",fontWeight:300}}>Psicke · IA</span>
          </div>
        </OBAppear>
        <OBAppear delay={350} style={{marginBottom:20}}>
          <p style={{fontSize:21,fontFamily:"'Lora',serif",fontWeight:400,color:D.muted,lineHeight:1.75,margin:0}}>
            Hola. Soy <em>Psicke</em>, tu asistente dentro de Segundo Cerebro.
          </p>
        </OBAppear>
        <OBAppear delay={580} style={{marginBottom:36}}>
          <p style={{fontSize:14,fontFamily:"'Inter',sans-serif",fontWeight:300,color:D.dim,lineHeight:1.85,margin:0}}>
            Puedo ayudarte a organizar mejor lo que escribas, responderte preguntas y acompañarte en tu productividad.
            Para eso necesito una{' '}
            <span style={{color:D.muted}}>Google Gemini API Key</span>
            {' '}— es gratis y toma menos de un minuto obtenerla.
          </p>
        </OBAppear>
        <OBAppear delay={800} style={{display:'flex',flexDirection:'column',gap:10}}>
          {/* API key input */}
          <div style={{position:'relative'}}>
            <input
              ref={apiInputRef}
              type={showApiKey?'text':'password'}
              value={apiInput}
              onChange={e=>setApiInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&apiInput.trim()&&confirmApi(false)}
              placeholder="AIza…"
              style={{...OB_input, paddingRight:72}}
            />
            {apiInput&&(
              <button onClick={()=>setShowApiKey(s=>!s)}
                style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',color:D.dim,fontSize:11,
                  cursor:'pointer',fontFamily:"'Inter',sans-serif",fontWeight:300,padding:0}}>
                {showApiKey?'ocultar':'ver'}
              </button>
            )}
          </div>
          <button onClick={()=>confirmApi(false)} style={OB_cta(!!apiInput.trim())}>
            Activar Psicke
          </button>
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
            <div style={{flex:1,height:1,background:D.border}}/>
            <span style={{fontSize:10,color:D.border,fontFamily:"'Inter',sans-serif",fontWeight:300}}>o</span>
            <div style={{flex:1,height:1,background:D.border}}/>
          </div>
          <button onClick={()=>confirmApi(true)}
            style={{background:'transparent',border:'none',color:D.dim,fontSize:11,
              fontFamily:"'Inter',sans-serif",fontWeight:300,cursor:'pointer',letterSpacing:.5,
              padding:'6px 0',textAlign:'center'}}>
            Continuar sin IA — agregarla después en Configuración
          </button>
        </OBAppear>
        <OBAppear delay={1300} style={{marginTop:32}}>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            style={{fontSize:10,color:D.border,fontFamily:"'Inter',sans-serif",
              fontWeight:300,textDecoration:'none',display:'flex',alignItems:'center',gap:5}}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Obtener key gratuita en aistudio.google.com
          </a>
        </OBAppear>
      </>}

      {/* ── NAME ── */}
      {gStep==='name'&&<>
        <OBAppear delay={180} style={{marginBottom:20}}>
          <p style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:2.5,textTransform:'uppercase',margin:0,fontFamily:"'Inter',sans-serif"}}>01 / 03</p>
        </OBAppear>
        <OBAppear delay={350} style={{marginBottom:36}}>
          <p style={{fontSize:21,fontFamily:"'Lora',serif",fontWeight:400,color:D.muted,lineHeight:1.7,margin:0}}>
            Antes de empezar, <em>¿cómo te gusta que te llamen?</em>
          </p>
        </OBAppear>
        <OBAppear delay={620} style={{display:'flex',flexDirection:'column',gap:14}}>
          <input ref={inputRef} value={inputVal} onChange={e=>setInputVal(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&confirmName()}
            placeholder="Tu nombre o apodo…" style={OB_input}/>
          <button onClick={confirmName} style={OB_cta(!!inputVal.trim())}>Continuar</button>
        </OBAppear>
        <OBAppear delay={1100} style={{marginTop:36}}>
          <p style={{fontSize:10,color:D.border,margin:0,fontFamily:"'Inter',sans-serif"}}>Presiona Enter para continuar</p>
        </OBAppear>
      </>}

      {/* ── CHALLENGE ── */}
      {gStep==='challenge'&&<>
        <OBAppear delay={180} style={{marginBottom:20}}>
          <p style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:2.5,textTransform:'uppercase',margin:0,fontFamily:"'Inter',sans-serif"}}>02 / 03</p>
        </OBAppear>
        <OBAppear delay={350} style={{marginBottom:36}}>
          <p style={{fontSize:21,fontFamily:"'Lora',serif",fontWeight:400,color:D.muted,lineHeight:1.7,margin:0}}>
            Hola, <em>{userName}</em>. Todos llegamos con una necesidad distinta.{' '}
            <em>¿Cuál es la tuya ahora mismo?</em>
          </p>
        </OBAppear>
        <OBAppear delay={620}>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {OB_CHALLENGES.map(ch=>(
              <button key={ch.id} onClick={()=>confirmChallenge(ch.id)} style={OB_ghost(challenge===ch.id)}>
                {ch.label}
              </button>
            ))}
          </div>
        </OBAppear>
        <OBAppear delay={1100} style={{marginTop:36}}>
          <p style={{fontSize:10,color:D.border,margin:0,fontFamily:"'Inter',sans-serif"}}>Tómate tu tiempo</p>
        </OBAppear>
      </>}

      {/* ── AREAS ── */}
      {gStep==='areas'&&<>
        <OBAppear delay={180} style={{marginBottom:20}}>
          <p style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:2.5,textTransform:'uppercase',margin:0,fontFamily:"'Inter',sans-serif"}}>03 / 03</p>
        </OBAppear>
        <OBAppear delay={350} style={{marginBottom:36}}>
          <p style={{fontSize:21,fontFamily:"'Lora',serif",fontWeight:400,color:D.muted,lineHeight:1.7,margin:0}}>
            Segundo Cerebro se organiza alrededor de tu vida.{' '}
            <em>¿Qué áreas quieres que cuide contigo?</em>
          </p>
        </OBAppear>
        <OBAppear delay={620}>
          <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:22}}>
            {OB_AREAS.map(a=>(
              <button key={a.id} onClick={()=>toggleArea(a.id)} style={OB_pill(selAreas.includes(a.id))}>
                <span style={{fontSize:13}}>{a.emoji}</span>{a.label}
              </button>
            ))}
          </div>
          <button onClick={confirmAreas} style={OB_cta(selAreas.length>0)}>
            {selAreas.length?`Activar ${selAreas.length} área${selAreas.length!==1?'s':''}` : 'Elige al menos una'}
          </button>
        </OBAppear>
      </>}

      {/* ── AREA QUESTIONS ── */}
      {gStep==='area_questions'&&curQ&&<>
        <OBAppear delay={100} style={{marginBottom:22,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:11,color:D.dim,fontWeight:300,letterSpacing:1.5,textTransform:'uppercase',
            display:'flex',alignItems:'center',gap:6,fontFamily:"'Inter',sans-serif"}}>
            <span style={{fontSize:14}}>{areaInfo?.emoji}</span>{areaInfo?.label}
          </span>
          <div style={{flex:1,height:1,background:D.border,borderRadius:1}}>
            <div style={{height:'100%',borderRadius:1,background:D.dim,
              width:`${totalQs?((doneQs/totalQs)*100):0}%`,transition:'width .5s ease'}}/>
          </div>
          <span style={{fontSize:10,color:D.dim,fontWeight:300,whiteSpace:'nowrap',fontFamily:"'Inter',sans-serif"}}>
            {doneQs+1} / {totalQs}
          </span>
        </OBAppear>
        <OBAppear delay={280} style={{marginBottom:34}}>
          <p style={{fontSize:20,fontFamily:"'Lora',serif",fontWeight:400,color:D.muted,lineHeight:1.72,margin:0}}>
            {curQ.question(userName)}
          </p>
        </OBAppear>
        <OBAppear delay={520}>
          {curQ.type==='choice'?(
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {curQ.choices.map(ch=>(
                <button key={ch.id} onClick={()=>{setChoiceVal(ch.id);setTimeout(nextQ,350);}} style={OB_ghost(choiceVal===ch.id)}>
                  {ch.label}
                </button>
              ))}
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <input ref={areaInputRef} value={areaInput} onChange={e=>setAreaInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&canNext&&nextQ()}
                placeholder={curQ.placeholder} style={OB_input}/>
              <p style={{fontSize:10,color:D.dim,fontWeight:300,margin:0,letterSpacing:.3,fontFamily:"'Inter',sans-serif"}}>
                {curQ.hint}
              </p>
              <div style={{display:'flex',gap:14,alignItems:'center',marginTop:4}}>
                <button onClick={nextQ} style={OB_cta(canNext)}>
                  {curQ.optional&&!areaInput.trim()?'Omitir':'Continuar'}
                </button>
                {!curQ.optional&&(
                  <button onClick={nextQ} style={{background:'transparent',border:'none',
                    color:D.dim,fontSize:11,fontFamily:"'Inter',sans-serif",
                    fontWeight:300,cursor:'pointer',letterSpacing:.5,padding:0,
                    textDecoration:'underline',textDecorationColor:D.border}}>
                    omitir
                  </button>
                )}
              </div>
            </div>
          )}
        </OBAppear>
      </>}

      {/* ── DONE ── */}
      {gStep==='done'&&<>
        <OBAppear delay={150} style={{marginBottom:20}}>
          <p style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:2.5,textTransform:'uppercase',margin:0,fontFamily:"'Inter',sans-serif"}}>Todo listo</p>
        </OBAppear>
        <OBAppear delay={350} style={{marginBottom:10}}>
          <p style={{fontSize:24,fontFamily:"'Lora',serif",color:D.text,lineHeight:1.6,margin:0}}>
            Bienvenido, <em>{userName}</em>.
          </p>
        </OBAppear>
        <OBAppear delay={600} style={{marginBottom:36}}>
          <p style={{fontSize:15,fontFamily:"'Lora',serif",color:D.dim,lineHeight:1.8,margin:0,fontStyle:'italic'}}>
            Tu segundo cerebro ya está tomando forma. Todo tiene su lugar aquí.
          </p>
        </OBAppear>

        {/* CTA primero — siempre visible sin scroll */}
        <OBAppear delay={800} style={{marginBottom:44}}>
          <button
            onClick={polishing?undefined:handleFinish}
            disabled={polishing}
            style={{background: polishing?D.border:D.border,
              border:`1px solid ${polishing?D.border:D.dim}`,
              borderRadius:28,padding:'14px 36px',
              color: polishing?D.dim:D.text,
              fontSize:11, fontFamily:"'Inter',sans-serif",fontWeight:400,letterSpacing:2,
              textTransform:'uppercase',cursor:polishing?'default':'pointer',
              transition:'all .35s',display:'flex',alignItems:'center',gap:10}}
            onMouseEnter={e=>{ if(!polishing){ e.currentTarget.style.background=D.border;e.currentTarget.style.color=D.text;e.currentTarget.style.borderColor=D.muted; }}}
            onMouseLeave={e=>{ if(!polishing){ e.currentTarget.style.background=D.border;e.currentTarget.style.color=D.text;e.currentTarget.style.borderColor=D.dim; }}}>
            {polishing?(
              <>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{animation:'spin 1s linear infinite'}}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Psicke está ordenando tu información…
              </>
            ):(
              <>
                {obApiKey&&'✨ '}Abrir Segundo Cerebro
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
          {polishing&&(
            <p style={{fontSize:10,color:D.dim,fontFamily:"'Inter',sans-serif",
              fontWeight:300,margin:'10px 0 0',letterSpacing:.5}}>
              Reescribiendo tus respuestas para mayor claridad…
            </p>
          )}
        </OBAppear>

        {/* Resumen — debajo del botón, scrollable */}
        <OBAppear delay={1050}>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:Object.entries(seedData).filter(([,v])=>v).length?16:0}}>
            {selAreas.map(id=>{ const a=OB_AREAS.find(x=>x.id===id); return(
              <span key={id} style={{fontSize:11,padding:'5px 13px',borderRadius:24,
                border:`1px solid ${D.border}`,color:D.dim,
                fontFamily:"'Inter',sans-serif",fontWeight:300,display:'flex',alignItems:'center',gap:6}}>
                {a.emoji} {a.label}
              </span>
            );})}
          </div>
          {Object.entries(seedData).filter(([,v])=>v).length>0&&(
            <div style={{borderTop:`1px solid ${D.border}`,paddingTop:16,display:'flex',flexDirection:'column',gap:6}}>
              <p style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:2,textTransform:'uppercase',margin:'0 0 8px',fontFamily:"'Inter',sans-serif"}}>
                Pre-llenado en tu app
              </p>
              {Object.entries(seedData).filter(([,v])=>v).map(([key,val])=>{
                const meta=OB_SEED_META[key]||{icon:'·',label:key};
                const display=key==='sideproj_estado'
                  ?(OB_AREA_QS.sideproj[1].choices.find(c=>c.id===val)?.label||val):val;
                return(
                  <div key={key} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <span style={{fontSize:11,minWidth:22}}>{meta.icon}</span>
                    <span style={{fontSize:10,color:D.dim,fontWeight:300,letterSpacing:.3,fontFamily:"'Inter',sans-serif"}}>
                      <span style={{color:D.dim,fontWeight:400}}>{meta.label}</span>
                      {' — '}{display}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </OBAppear>
      </>}
    </div>
  );

  return(
    <div style={{position:'fixed',inset:0,zIndex:9000,
      background:D.bg,
      display:'flex',alignItems:'flex-start',justifyContent:'center',
      padding:'48px 24px 64px',overflowY:'auto',overflowX:'hidden'}}>

      {/* Warm ambient */}
      <div style={{position:'absolute',top:'-10%',left:'50%',transform:'translateX(-50%)',
        width:600,height:400,borderRadius:'50%',pointerEvents:'none',
        background:`radial-gradient(ellipse, ${D.bgAmbient} 0%, transparent 65%)`}}/>

      {/* Grain */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.03,pointerEvents:'none'}}>
        <filter id="obgrain">
          <feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#obgrain)"/>
      </svg>

      {content}

      <style>{`
        #obgrain ~ rect { display: block; }
        em { color: D.text; font-style: italic; }
        input[data-ob]::placeholder { color: D.border; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};



export default Onboarding;
