import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== INBOX =====================
const Inbox = ({data,setData,isMobile}) => {
  const [text,setText]=useState('');
  const [wizard,setWizard]=useState(null);
  const [wizardStep,setWizardStep]=useState(0);
  // Swipe state for mobile
  const swipeTouchX = useRef({});
  const [swipeOffsets, setSwipeOffsets] = useState({});   // { id: deltaX }
  const SWIPE_THRESHOLD = 72;

  const onSwipeStart=(id,e)=>{
    swipeTouchX.current[id]=e.touches[0].clientX;
  };
  const onSwipeMove=(id,e)=>{
    const start=swipeTouchX.current[id];
    if(start==null)return;
    const delta=e.touches[0].clientX-start;
    setSwipeOffsets(prev=>({...prev,[id]:delta}));
  };
  const onSwipeEnd=(id,item,e)=>{
    const delta=swipeOffsets[id]||0;
    setSwipeOffsets(prev=>{const n={...prev};delete n[id];return n;});
    delete swipeTouchX.current[id];
    if(delta>SWIPE_THRESHOLD){convertToNote(item);}
    else if(delta<-SWIPE_THRESHOLD){del(id);}
  };

  const add=()=>{
    if(!text.trim())return;
    const updated=[{id:uid(),content:text.trim(),createdAt:today(),processed:false},...data.inbox];
    setData(d=>({...d,inbox:updated}));save('inbox',updated);setText('');
  };
  const process=(id)=>{const u=data.inbox.map(i=>i.id===id?{...i,processed:!i.processed}:i);setData(d=>({...d,inbox:u}));save('inbox',u);};
  const del=(id)=>{const u=data.inbox.filter(i=>i.id!==id);setData(d=>({...d,inbox:u}));save('inbox',u);};
  const convertToNote=(item)=>{
    const n={id:uid(),title:item.content.slice(0,50),content:item.content,tags:['inbox'],areaId:'',createdAt:today()};
    const updN=[n,...data.notes];
    const updI=data.inbox.map(i=>i.id===item.id?{...i,processed:true}:i);
    setData(d=>({...d,notes:updN,inbox:updI}));save('notes',updN);save('inbox',updI);
  };
  const convertToTask=(item)=>{
    const t={id:uid(),title:item.content.slice(0,80),projectId:'',status:'todo',priority:'media',dueDate:'',createdAt:today()};
    const updT=[t,...data.tasks];
    const updI=data.inbox.map(i=>i.id===item.id?{...i,processed:true}:i);
    setData(d=>({...d,tasks:updT,inbox:updI}));save('tasks',updT);save('inbox',updI);
  };
  const convertToObjective=(item)=>{
    const o={id:uid(),title:item.content.slice(0,80),areaId:'',deadline:'',status:'active'};
    const updO=[o,...data.objectives];
    const updI=data.inbox.map(i=>i.id===item.id?{...i,processed:true}:i);
    setData(d=>({...d,objectives:updO,inbox:updI}));save('objectives',updO);save('inbox',updI);
  };

  // Compute days since item was created
  const daysAgo=(dateStr)=>{
    if(!dateStr)return 0;
    const diff=new Date(today())-new Date(dateStr);
    return Math.max(0,Math.floor(diff/86400000));
  };

  // Psicke suggestion heuristic
  const getSuggestion=(content)=>{
    const c=content.toLowerCase();
    if(c.includes('comprar')||c.includes('pagar')||c.includes('factura')||c.includes('gasto'))return{module:'Transacción',icon:'💰'};
    if(c.includes('llamar')||c.includes('hablar')||c.includes('reunión')||c.includes('email'))return{module:'Tarea',icon:'✅'};
    if(c.includes('aprender')||c.includes('curso')||c.includes('libro')||c.includes('leer'))return{module:'Aprendizaje',icon:'📚'};
    if(c.includes('médico')||c.includes('ejercicio')||c.includes('correr')||c.includes('salud'))return{module:'Salud',icon:'💪'};
    if(c.includes('proyecto')||c.includes('desarrollar')||c.includes('crear')||c.includes('construir'))return{module:'Proyecto',icon:'📁'};
    if(c.includes('idea')||c.includes('pensar')||c.includes('quizás')||c.includes('podría'))return{module:'Idea',icon:'💡'};
    return{module:'Nota',icon:'📝'};
  };

  // GTD wizard steps
  const WIZARD_STEPS=[
    {q:'¿Requiere acción de tu parte?',opts:['Sí, hay algo que hacer','No, es referencia o basura']},
    {q:'¿Cuánto tiempo toma?',opts:['Menos de 2 minutos → hacerlo ya','Más de 2 min → agendarlo o delegarlo']},
    {q:'¿A dónde va?',opts:['📝 Nota / Referencia','✅ Tarea','🎯 Objetivo','✓ Procesado / Descartar']},
  ];
  const stepColors=[T.accent,T.blue,T.purple];

  const handleWizardOpt=(optIdx)=>{
    if(wizardStep<WIZARD_STEPS.length-1){
      setWizardStep(s=>s+1);
    } else {
      // Last step — take action
      if(optIdx===0)convertToNote(wizard);
      else if(optIdx===1)convertToTask(wizard);
      else if(optIdx===2)convertToObjective(wizard);
      else process(wizard.id);
      setWizard(null);setWizardStep(0);
    }
  };

  const pending=data.inbox.filter(i=>!i.processed);
  const processed=data.inbox.filter(i=>i.processed);

  return (
    <div>
      <PageHeader title="Captura Rápida" subtitle="Vuelca ideas. Clasifícalas después." isMobile={isMobile}/>

      {/* Quick capture input */}
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <Input value={text} onChange={setText} placeholder="¿Qué tienes en mente?" style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&add()}/>
        <button onClick={add} aria-label="Agregar al inbox" style={{background:T.accent,border:'none',borderRadius:10,padding:'0 16px',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0}}><Icon name="plus" size={20} color="#000"/></button>
      </div>

      {/* Pending items */}
      {pending.length>0&&(
        <div style={{marginBottom:20}}>
          <h3 style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>
            Por procesar ({pending.length})
          </h3>
          {pending.map(i=>{
            const days=daysAgo(i.createdAt);
            const isOld=days>=3;
            const suggestion=getSuggestion(i.content);
            const swipeDelta  = swipeOffsets[i.id] || 0;
            const swipeAbs    = Math.abs(swipeDelta);
            const swipeRight  = swipeDelta > 0;
            const swipeActive = swipeAbs > 8;
            const swipeReady  = swipeAbs >= SWIPE_THRESHOLD;
            return (
              <div key={i.id} style={{position:'relative',marginBottom:10,borderRadius:14,overflow:'hidden'}}>
                {/* Swipe hint bg — mobile only */}
                {isMobile&&swipeActive&&(
                  <div style={{
                    position:'absolute',inset:0,borderRadius:14,pointerEvents:'none',
                    background: swipeRight
                      ? `linear-gradient(90deg,${T.accent}${swipeReady?'44':'18'},${T.accent}${swipeReady?'28':'10'})`
                      : `linear-gradient(270deg,${T.red}${swipeReady?'44':'18'},${T.red}${swipeReady?'28':'10'})`,
                    display:'flex',alignItems:'center',
                    justifyContent:swipeRight?'flex-start':'flex-end',
                    padding:'0 22px',
                  }}>
                    <span style={{fontSize:22,opacity:swipeReady?1:0.45,transition:'opacity 0.12s'}}>
                      {swipeRight?'📝':'🗑️'}
                    </span>
                  </div>
                )}
                <Card
                  onTouchStart={isMobile?e=>onSwipeStart(i.id,e):undefined}
                  onTouchMove={isMobile?e=>onSwipeMove(i.id,e):undefined}
                  onTouchEnd={isMobile?e=>onSwipeEnd(i.id,i,e):undefined}
                  style={{
                    borderLeft:`3px solid ${isOld?T.orange:T.accent}`,
                    position:'relative',overflow:'hidden',
                    transform:isMobile&&swipeActive?`translateX(${Math.sign(swipeDelta)*Math.min(swipeAbs,110)}px)`:'translateX(0)',
                    transition:swipeActive?'none':'transform 0.22s ease',
                    touchAction:'pan-y',
                    userSelect:'none',
                  }}>
                  {/* Age badge */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <p style={{color:T.text,margin:0,fontSize:14,lineHeight:1.5,flex:1,paddingRight:8}}>{i.content}</p>
                    <div style={{flexShrink:0,fontSize:10,fontWeight:700,
                      color:isOld?T.orange:days===0?T.muted:T.dim,
                      background:isOld?`${T.orange}15`:'transparent',
                      border:isOld?`1px solid ${T.orange}30`:'none',
                      padding:isOld?'2px 8px':'0',borderRadius:6,whiteSpace:'nowrap'}}>
                      {days===0?'Hoy':days===1?'Ayer':`${days}d sin procesar`}
                    </div>
                  </div>

                  {/* AI suggestion */}
                  <div style={{display:'inline-flex',alignItems:'center',gap:5,marginBottom:10,
                    background:`${T.purple}10`,border:`1px solid ${T.purple}25`,
                    borderRadius:7,padding:'4px 10px'}}>
                    <span style={{fontSize:11}}>⚡</span>
                    <span style={{fontSize:11,color:T.purple,fontWeight:600}}>Psicke sugiere:</span>
                    <span style={{fontSize:11,color:T.muted}}>{suggestion.icon} {suggestion.module}</span>
                  </div>

                  {/* Swipe hint label — mobile, only when idle */}
                  {isMobile&&!swipeActive&&(
                    <div style={{fontSize:10,color:T.dim,marginBottom:8,letterSpacing:0.2}}>
                      ← eliminar &nbsp;·&nbsp; → guardar como nota
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <button onClick={()=>{setWizard(i);setWizardStep(0);}}
                      style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${T.accent}50`,
                        background:`${T.accent}12`,color:T.accent,cursor:'pointer',
                        fontSize:11,fontWeight:700,fontFamily:'inherit'}}>
                      🧭 Procesar con GTD
                    </button>
                    <Btn size="sm" variant="ghost" onClick={()=>convertToNote(i)}>📝 Nota</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>convertToTask(i)}>✅ Tarea</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>convertToObjective(i)}>🎯 Objetivo</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>process(i)}>✓ Listo</Btn>
                    <Btn size="sm" variant="danger" onClick={()=>del(i.id)} aria-label="Eliminar ítem"><Icon name="trash" size={11}/></Btn>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Processed */}
      {processed.length>0&&(
        <div style={{opacity:0.5}}>
          <h3 style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Procesados</h3>
          {processed.slice(0,5).map(i=>(
            <div key={i.id} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
              <Icon name="check" size={14} color={T.green}/>
              <span style={{color:T.muted,fontSize:14,flex:1}}>{i.content}</span>
              <button onClick={()=>del(i.id)} aria-label="Eliminar ítem procesado" style={{background:'none',border:'none',color:T.dim,cursor:'pointer',display:'flex',padding:4}}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      )}

      {/* GTD WIZARD MODAL */}
      {wizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)'}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,
            padding:28,width:'100%',maxWidth:420,margin:'0 16px',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}>

            {/* Progress bar */}
            <div style={{display:'flex',gap:5,marginBottom:24}}>
              {WIZARD_STEPS.map((_,i)=>(
                <div key={i} style={{flex:1,height:3,borderRadius:2,
                  background:i<=wizardStep?stepColors[i]:T.border,transition:'background 0.3s'}}/>
              ))}
            </div>

            <div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>
              Paso {wizardStep+1} de {WIZARD_STEPS.length}
            </div>
            <h3 style={{color:T.text,fontSize:17,fontWeight:700,margin:'0 0 10px'}}>{WIZARD_STEPS[wizardStep].q}</h3>

            {/* Captured content */}
            <div style={{background:T.surface2,borderRadius:10,padding:'10px 14px',marginBottom:16,
              borderLeft:`3px solid ${stepColors[wizardStep]}`}}>
              <p style={{color:T.muted,fontSize:13,margin:0,lineHeight:1.5}}>{wizard.content}</p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {WIZARD_STEPS[wizardStep].opts.map((opt,i)=>(
                <button key={i} onClick={()=>handleWizardOpt(i)}
                  style={{padding:'12px 16px',borderRadius:12,border:`1px solid ${T.border}`,
                    background:T.surface2,color:T.text,cursor:'pointer',
                    textAlign:'left',fontSize:13,fontFamily:'inherit',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=stepColors[wizardStep];e.currentTarget.style.background=`${stepColors[wizardStep]}12`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface2;}}>
                  {opt}
                </button>
              ))}
            </div>

            <button onClick={()=>{setWizard(null);setWizardStep(0);}}
              style={{marginTop:14,width:'100%',padding:'8px',background:'transparent',
                border:'none',color:T.dim,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


export default Inbox;
