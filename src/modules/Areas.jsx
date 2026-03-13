import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';
import Finance from './Finance.jsx';
import Health from './Health.jsx';
import Hogar from './Hogar.jsx';
import DesarrolloPersonal from './DesarrolloPersonal.jsx';
import Relaciones from './Relaciones.jsx';
import SideProjects from './SideProjects.jsx';
import TrabajoEmbed from './TrabajoEmbed.jsx';

// ===================== AREAS =====================
const Areas = ({data,isMobile,onNavigate}) => {
  const MODULES = [
    {label:'PRODUCTIVIDAD', items:[
      {id:'habits',     emoji:'🔄', name:'Hábitos'},
      {id:'objectives', emoji:'🎯', name:'Objetivos'},
      {id:'projects',   emoji:'📁', name:'Proyectos'},
      {id:'journal',    emoji:'📔', name:'Journal'},
      {id:'notes',      emoji:'📝', name:'Notas'},
      {id:'books',      emoji:'📚', name:'Libros'},
    ]},
    {label:'ESTILO DE VIDA', items:[
      {id:'entretenimiento', emoji:'🎬', name:'Entretenimiento'},
      {id:'mascotas',        emoji:'🐾', name:'Mascotas'},
      {id:'viajes',          emoji:'✈️', name:'Viajes'},
      {id:'nutricion',       emoji:'🍴', name:'Nutrición'},
      {id:'sueno',           emoji:'🌙', name:'Sueño'},
    ]},
    {label:'GESTIÓN', items:[
      {id:'coche',       emoji:'🚗', name:'Vehículos'},
      {id:'shopping',    emoji:'🛒', name:'Compras'},
      {id:'education',   emoji:'🎓', name:'Educación'},
      {id:'desarrollo',  emoji:'🧠', name:'Desarrollo'},
      {id:'sideprojects',emoji:'🚀', name:'Side Projects'},
    ]},
  ];

  return (
    <div>
      {/* ── Título ── */}
      <div style={{marginBottom:20}}>
        <h2 style={{margin:0,color:T.text,fontSize:20,fontWeight:700}}>Áreas de vida</h2>
        <p style={{color:T.muted,fontSize:12,margin:'4px 0 0'}}>Los grandes pilares de tu vida.</p>
      </div>

      {/* ── Áreas cards — fila compacta ── */}
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:28}}>
        {data.areas.map(a=>{
          const objCount=data.objectives.filter(o=>o.areaId===a.id).length;
          const projCount=data.projects.filter(p=>p.areaId===a.id).length;
          return (
            <div key={a.id} onClick={()=>onNavigate&&onNavigate('areaDetail',a.id)}
              style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:T.surface,border:`1px solid ${T.border}`,borderLeft:`4px solid ${a.color}`,borderRadius:12,cursor:'pointer'}}>
              <div style={{fontSize:26,flexShrink:0,width:36,textAlign:'center'}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.text,fontWeight:600,fontSize:14}}>{a.name}</div>
                <div style={{display:'flex',gap:6,marginTop:3}}>
                  <span style={{fontSize:10,color:T.muted}}>{objCount} objetivos</span>
                  <span style={{color:T.dim,fontSize:10}}>·</span>
                  <span style={{fontSize:10,color:T.muted}}>{projCount} proyectos</span>
                </div>
              </div>
              <div style={{color:T.accent,fontSize:16,flexShrink:0}}>›</div>
            </div>
          );
        })}
      </div>

      {/* ── Módulos ── */}
      {MODULES.map(section=>(
        <div key={section.label} style={{marginBottom:24}}>
          <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:1.4,textTransform:'uppercase',marginBottom:10,paddingLeft:2}}>{section.label}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {section.items.map(mod=>(
              <button key={mod.id} onClick={()=>onNavigate&&onNavigate(mod.id)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,padding:'14px 6px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,cursor:'pointer',fontFamily:'inherit',minHeight:78}}>
                <span style={{fontSize:24,lineHeight:1}}>{mod.emoji}</span>
                <span style={{fontSize:mod.name.length>10?10:11,fontWeight:500,color:T.text,textAlign:'center',lineHeight:1.3,overflowWrap:'break-word',wordBreak:'break-word',width:'100%',padding:'0 2px'}}>{mod.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ===================== AREA DETAIL =====================
const AreaDetail = ({data,setData,isMobile,viewHint,onConsumeHint,onNavigate,onBack}) => {
  const [areaId,setAreaId]=useState(viewHint||'');


  useEffect(()=>{
    if(viewHint){setAreaId(viewHint);onConsumeHint?.();}
  },[viewHint]);

  const area=data.areas.find(a=>a.id===areaId);

  if(!area) return <div style={{textAlign:'center',padding:40,color:T.dim}}>Área no encontrada</div>;

  // Si el área es Finanzas, renderizar la vista dedicada
  if(area.name.toLowerCase().includes('finanz')||area.icon==='💰'){
    return <Finance data={data} setData={setData} isMobile={isMobile} onBack={onBack}/>;
  }

  // Si el área es Salud, renderizar la vista dedicada
  if(area.name.toLowerCase().includes('salud')||area.icon==='💪'){
    return <Health data={data} setData={setData} isMobile={isMobile} onBack={onBack}/>;
  }

  // Si el área es Hogar, renderizar la vista dedicada
  if(area.name.toLowerCase().includes('hogar')||area.name.toLowerCase().includes('casa')||area.icon==='🏠'){
    return <Hogar data={data} setData={setData} isMobile={isMobile} onBack={onBack}/>;
  }

  // Si el área es Desarrollo Personal, renderizar la vista dedicada
  if(area.name.toLowerCase().includes('desarrollo')||area.name.toLowerCase().includes('personal')||area.icon==='🧠'){
    return <DesarrolloPersonal data={data} setData={setData} isMobile={isMobile} onBack={onBack}/>;
  }

  // Si el área es Relaciones, renderizar la vista dedicada
  if(area.name.toLowerCase().includes('relacion')||area.icon==='👥'){
    return <Relaciones data={data} setData={setData} isMobile={isMobile} onBack={onBack}/>;
  }

  // Si el área es Side Projects, renderizar la vista dedicada
  if(area.name.toLowerCase().includes('side')||area.name.toLowerCase().includes('project')||area.icon==='🚀'){
    return <SideProjects data={data} setData={setData} isMobile={isMobile} onBack={onBack}/>;
  }

  // Si el área es Trabajo, embeber app externa
  if(area.name.toLowerCase().includes('trabajo')||area.name.toLowerCase().includes('work')||area.icon==='💼'){
    return <TrabajoEmbed isMobile={isMobile} onBack={onBack}/>;
  }

  const areaObjectives=data.objectives.filter(o=>o.areaId===areaId);
  const areaProjects=data.projects.filter(p=>p.areaId===areaId);
  const areaNotes=data.notes.filter(n=>n.areaId===areaId).sort((a,b)=>b.createdAt>a.createdAt?1:-1);
  const notesWithAmount=areaNotes.filter(n=>n.amount);
  const totalSpent=notesWithAmount.reduce((s,n)=>s+(n.amount||0),0);
  const areaBudget=(data.budget||[]).filter(b=>b.areaId===areaId);
  const totalBudget=areaBudget.reduce((s,b)=>s+(b.amount||0),0);

  const delBudget=(id)=>{const u=(data.budget||[]).filter(b=>b.id!==id);setData(d=>({...d,budget:u}));save('budget',u);};

  // Group spending by month
  const spendingByMonth={};
  notesWithAmount.forEach(n=>{
    const m=n.createdAt?.slice(0,7)||'sin-fecha';
    if(!spendingByMonth[m])spendingByMonth[m]={total:0,items:[]};
    spendingByMonth[m].total+=n.amount;
    spendingByMonth[m].items.push(n);
  });

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        {onBack&&(
          <button onClick={onBack} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:10,padding:'6px 10px',cursor:'pointer',color:T.muted,display:'flex',alignItems:'center',gap:4,fontFamily:'inherit',fontSize:12,flexShrink:0}}>
            <Icon name="back" size={16}/><span style={{fontSize:12,fontWeight:500}}>Áreas</span>
          </button>
        )}
        <div style={{width:44,height:44,borderRadius:12,background:`${area.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{area.icon}</div>
        <div style={{flex:1}}>
          <h2 style={{margin:0,color:T.text,fontSize:isMobile?20:24,fontWeight:700}}>{area.name}</h2>
          <p style={{color:T.muted,fontSize:12,margin:0}}>{areaObjectives.length} objetivos · {areaProjects.length} proyectos · {areaNotes.length} notas</p>
        </div>
      </div>

      {/* Quick nav */}
      <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        <Btn size="sm" onClick={()=>onNavigate&&onNavigate('objectives',`area:${areaId}`)}><Icon name="target" size={12}/>Objetivos ({areaObjectives.length})</Btn>
        <Btn size="sm" onClick={()=>onNavigate&&onNavigate('projects',areaProjects[0]?`obj:${areaProjects[0].objectiveId}`:null)}><Icon name="folder" size={12}/>Proyectos ({areaProjects.length})</Btn>
      </div>

      {/* Financial Summary — solo si hay registros de gasto en esta área */}
      {notesWithAmount.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:10,marginBottom:20}}>
          <Card style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Gastado total</div>
            <div style={{fontSize:22,fontWeight:700,color:T.red}}>${totalSpent.toLocaleString()}</div>
            <div style={{fontSize:10,color:T.dim}}>{notesWithAmount.length} registros</div>
          </Card>
          <Card style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Este mes</div>
            <div style={{fontSize:22,fontWeight:700,color:T.text}}>${(spendingByMonth[today().slice(0,7)]?.total||0).toLocaleString()}</div>
            <div style={{fontSize:10,color:T.dim}}>{spendingByMonth[today().slice(0,7)]?.items?.length||0} gastos</div>
          </Card>
          {areaBudget.length>0&&<Card style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Presupuesto/mes</div>
            <div style={{fontSize:22,fontWeight:700,color:T.accent}}>${totalBudget.toLocaleString()}</div>
            <div style={{fontSize:10,color:T.dim}}>{areaBudget.length} items fijos</div>
          </Card>}
        </div>
      )}

      {/* Budget items — solo si esta área ya tiene gastos fijos asignados */}
      {areaBudget.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{color:T.text,fontSize:14,fontWeight:600,margin:0}}>💳 Presupuesto fijo</h3>
          </div>
          {areaBudget.map(b=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{color:T.text,fontSize:14,fontWeight:500}}>{b.title}</div>
                <div style={{color:T.muted,fontSize:11}}>Día {b.dayOfMonth} de cada mes</div>
              </div>
              <div style={{color:T.accent,fontWeight:700,fontSize:15}}>${b.amount.toLocaleString()}</div>
              <button onClick={()=>delBudget(b.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
            </div>
          ))}
        </div>
      )}

      {/* Spending history */}
      {notesWithAmount.length>0&&(
        <div style={{marginBottom:24}}>
          <h3 style={{color:T.text,fontSize:14,fontWeight:600,margin:'0 0 12px'}}>📊 Historial de gastos</h3>
          {Object.entries(spendingByMonth).sort(([a],[b])=>b.localeCompare(a)).map(([month,{total,items}])=>(
            <div key={month} style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{color:T.muted,fontSize:12,fontWeight:600,textTransform:'uppercase'}}>{new Date(month+'-01').toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</span>
                <span style={{color:T.red,fontSize:13,fontWeight:700}}>−${total.toLocaleString()}</span>
              </div>
              {items.map(n=>(
                <div key={n.id} onClick={()=>onNavigate&&onNavigate('notes',n.id)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:T.surface,borderRadius:8,marginBottom:4,cursor:'pointer',border:`1px solid ${T.border}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:T.text,fontSize:13,fontWeight:500}}>{n.title}</div>
                    <div style={{display:'flex',gap:4,marginTop:2}}>
                      {n.tags?.slice(0,3).map(t=><span key={t} style={{fontSize:9,color:T.accent,background:`${T.accent}15`,padding:'1px 5px',borderRadius:6}}>{t}</span>)}
                    </div>
                  </div>
                  <span style={{color:T.red,fontSize:13,fontWeight:600,flexShrink:0}}>−${n.amount.toLocaleString()}</span>
                  <span style={{color:T.dim,fontSize:10,flexShrink:0}}>{fmt(n.createdAt)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Recent notes without amounts */}
      {areaNotes.filter(n=>!n.amount).length>0&&(
        <div>
          <h3 style={{color:T.text,fontSize:14,fontWeight:600,margin:'0 0 12px'}}>📝 Notas</h3>
          {areaNotes.filter(n=>!n.amount).slice(0,5).map(n=>(
            <div key={n.id} onClick={()=>onNavigate&&onNavigate('notes',n.id)}
              style={{padding:'10px 14px',background:T.surface,borderRadius:10,marginBottom:8,cursor:'pointer',border:`1px solid ${T.border}`,borderLeft:`3px solid ${area.color}`}}>
              <div style={{color:T.text,fontSize:13,fontWeight:500}}>{n.title}</div>
              <div style={{color:T.muted,fontSize:11,marginTop:3}}>{fmt(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}


    </div>
  );
};


export { Areas, AreaDetail };
