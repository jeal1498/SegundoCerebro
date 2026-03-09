import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== GLOBAL SEARCH =====================
const GlobalSearch = ({data,onNavigate,onClose}) => {
  const [q,setQ]=useState('');
  const [activeType,setActiveType]=useState('all');
  const [expanded,setExpanded]=useState(null);
  const [recentSearches,setRecentSearches]=useState(()=>{try{return JSON.parse(localStorage.getItem('sb_recent_searches')||'[]');}catch{return [];}});
  const inputRef=useRef(null);
  useEffect(()=>inputRef.current?.focus(),[]);

  // ── Natural language date resolver ──
  const resolveDateRange=(q)=>{
    const s=q.toLowerCase().trim();
    const now=new Date(); const todayStr=today();
    const ymd=(d)=>d.toISOString().slice(0,10);
    const pad=(n)=>String(n).padStart(2,'0');
    const fmt2=(d)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if(s==='hoy'||s==='today') return {from:todayStr,to:todayStr,label:'hoy'};
    if(s==='ayer'||s==='yesterday'){const d=new Date(now);d.setDate(d.getDate()-1);const s2=ymd(d);return{from:s2,to:s2,label:'ayer'};}
    if(s.match(/esta semana|this week/)){const d=new Date(now);d.setDate(d.getDate()-d.getDay());return{from:fmt2(d),to:todayStr,label:'esta semana'};}
    if(s.match(/semana pasada|last week/)){const d=new Date(now);d.setDate(d.getDate()-d.getDay()-7);const e=new Date(d);e.setDate(e.getDate()+6);return{from:fmt2(d),to:fmt2(e),label:'semana pasada'};}
    if(s.match(/este mes|this month/)){return{from:`${todayStr.slice(0,7)}-01`,to:todayStr,label:'este mes'};}
    if(s.match(/mes pasado|last month/)){const d=new Date(now.getFullYear(),now.getMonth()-1,1);const e=new Date(now.getFullYear(),now.getMonth(),0);return{from:fmt2(d),to:fmt2(e),label:'mes pasado'};}
    if(s.match(/últimos? (\d+) días?/)){const n=parseInt(s.match(/(\d+)/)[1]);const d=new Date(now);d.setDate(d.getDate()-n);return{from:fmt2(d),to:todayStr,label:`últimos ${n} días`};}
    if(s.match(/esta semana|hace \d|hoy|ayer|este mes/)) return null;
    return null;
  };

  const dateRange=resolveDateRange(q);
  const isDateQuery=!!dateRange;

  const addRecent=(term)=>{
    if(!term.trim())return;
    const upd=[term,...recentSearches.filter(r=>r!==term)].slice(0,6);
    setRecentSearches(upd);
    try{localStorage.setItem('sb_recent_searches',JSON.stringify(upd));}catch{}
  };

  const TYPE_META={
    nota:{label:'📝 Nota',color:T.accent,nav:'notes'},
    tarea:{label:'✅ Tarea',color:'#4da6ff',nav:'projects'},
    objetivo:{label:'🎯 Objetivo',color:'#ff8c42',nav:'objectives'},
    proyecto:{label:'📁 Proyecto',color:'#4da6ff',nav:'projects'},
    habito:{label:'🔁 Hábito',color:'#ff5069',nav:'habits'},
    persona:{label:'👥 Persona',color:'#a78bfa',nav:'relaciones'},
    transaccion:{label:'💰 Transacción',color:'#ffd166',nav:'finance'},
    workout:{label:'🏃 Entreno',color:T.accent,nav:'health'},
    libro:{label:'📚 Libro',color:T.accent,nav:'books'},
    aprendizaje:{label:'🎓 Aprendizaje',color:'#a78bfa',nav:'desarrollo'},
    idea:{label:'💡 Idea',color:'#ffd166',nav:'desarrollo'},
    mantenimiento:{label:'🔧 Mantenimiento',color:'#4da6ff',nav:'hogar'},
    documento:{label:'📄 Documento',color:'#ff8c42',nav:'hogar'},
    contacto_hogar:{label:'📞 Contacto',color:T.accent,nav:'hogar'},
    side_project:{label:'🚀 Side Project',color:'#ff5069',nav:'sideProjects'},
    sp_tarea:{label:'📌 SP Tarea',color:'#ff8c42',nav:'sideProjects'},
    compra:{label:'🛒 Compra',color:'#ffd166',nav:'shopping'},
    metrica_salud:{label:'📊 Métrica',color:T.accent,nav:'health'},
    medicamento:{label:'💊 Medicamento',color:'#ff8c42',nav:'health'},
    diario:{label:'📔 Diario',color:'#a78bfa',nav:'journal'},
  };

  const ql=q.toLowerCase().trim();
  const buildResults=()=>{
    if(!ql)return[];
    // Date-range mode: filter items by date
    if(isDateQuery){
      const {from,to}=dateRange;
      const inRange=(d)=>d&&d>=from&&d<=to;
      const res=[];
      (data.notes||[]).filter(n=>inRange(n.createdAt)).forEach(n=>res.push({type:'nota',label:n.title,sub:n.createdAt,hint:'notes:'+n.id}));
      (data.tasks||[]).filter(t=>inRange(t.createdAt)||inRange(t.dueDate)).forEach(t=>res.push({type:'tarea',label:t.title,sub:t.dueDate||t.createdAt||'',hint:'projects'}));
      (data.transactions||[]).filter(t=>inRange(t.date)).forEach(t=>res.push({type:'transaccion',label:t.description,sub:`${t.type==='ingreso'?'+':'-'}$${t.amount} · ${t.date}`,hint:'finance'}));
      (data.workouts||[]).filter(w=>inRange(w.date)).forEach(w=>res.push({type:'workout',label:`${w.type} · ${w.date}`,sub:`${w.duration}min`,hint:'health'}));
      (data.journal||[]).filter(j=>inRange(j.date)).forEach(j=>res.push({type:'nota',label:`📔 Diario ${j.date}`,sub:j.content?.slice(0,60)||'',hint:'journal'}));
      return res;
    }
    const res=[];
    const push=(type,label,sub,hint,raw='',preview=null)=>{
      if(label.toLowerCase().includes(ql)||sub.toLowerCase().includes(ql)||raw.toLowerCase().includes(ql))
        res.push({type,label,sub,hint,preview});
    };
    (data.notes||[]).forEach(n=>push('nota',n.title,n.content.slice(0,80),'notes:'+n.id,n.tags?.join(' ')||'',{content:n.content?.slice(0,200),tags:n.tags,date:n.createdAt}));
    (data.tasks||[]).forEach(t=>push('tarea',t.title,t.status==='done'?'Completada':'Pendiente','projects','',{status:t.status,priority:t.priority,dueDate:t.dueDate,subtasks:(t.subtasks||[]).length}));
    (data.objectives||[]).forEach(o=>push('objetivo',o.title,o.status==='active'?'Activo':'Completado','objectives','',{status:o.status,deadline:o.deadline,milestones:(o.milestones||[]).length,completedAt:o.completedAt}));
    (data.projects||[]).forEach(p=>push('proyecto',p.title,'','projects','',{taskCount:(data.tasks||[]).filter(t=>t.projectId===p.id).length}));
    (data.habits||[]).forEach(h=>push('habito',h.name,h.frequency==='daily'?'Diario':h.frequency==='weekly'?'Semanal':'Mensual','habits','',{frequency:h.frequency,totalCompletions:h.completions?.length||0}));
    (data.people||[]).forEach(p=>push('persona',p.name,p.relation||'','relaciones','',{relation:p.relation,birthday:p.birthday,phone:p.phone}));
    (data.transactions||[]).forEach(t=>push('transaccion',t.description,`${t.type==='ingreso'?'+':'-'}$${t.amount} · ${t.date}`,'finance',t.category||'',{type:t.type,amount:t.amount,category:t.category,date:t.date}));
    (data.workouts||[]).forEach(w=>push('workout',`${w.type} · ${w.date}`,`${w.duration}min${w.calories?' · '+w.calories+'kcal':''}`,'health','',{duration:w.duration,calories:w.calories,distance:w.distance}));
    (data.books||[]).forEach(b=>push('libro',b.title,b.author||'','books','',{author:b.author,status:b.status,rating:b.rating}));
    (data.learnings||[]).forEach(l=>push('aprendizaje',l.title,l.platform||'','desarrollo','',{platform:l.platform,progress:l.progress,hoursSpent:l.hoursSpent}));
    (data.ideas||[]).forEach(i=>push('idea',i.content.slice(0,60),i.tag||'','desarrollo','',{content:i.content,tag:i.tag}));
    (data.maintenances||[]).forEach(m=>push('mantenimiento',m.name,m.category||'','hogar',m.notes||'',{category:m.category,lastDone:m.lastDone}));
    (data.homeDocs||[]).forEach(d=>push('documento',d.name,d.category||'','hogar',d.provider||'',{category:d.category,expiryDate:d.expiryDate,provider:d.provider}));
    (data.homeContacts||[]).forEach(c=>push('contacto_hogar',c.name,c.role||'','hogar',c.phone||'',{role:c.role,phone:c.phone}));
    (data.sideProjects||[]).forEach(p=>push('side_project',p.name,p.description?.slice(0,60)||p.stack||'','sideProjects',p.url||'',{stack:p.stack,status:p.status,url:p.url}));
    (data.spTasks||[]).forEach(t=>push('sp_tarea',t.title,t.projectName||'','sideProjects',t.status||''));
    (data.shopping||[]).forEach(s=>push('compra',s.name,s.category||'','shopping',s.notes||''));
    Object.entries(data.healthMetrics||{}).forEach(([metricType,entries])=>{
      (entries||[]).forEach(e=>push('metrica_salud',`${metricType}: ${e.value}`,`${e.date}`,'health',metricType));
    });
    (data.medications||[]).forEach(m=>push('medicamento',m.name,`${m.dose||''}${m.unit||''} · ${m.frequency||''}`,'health',m.notes||'',{dose:m.dose,unit:m.unit,frequency:m.frequency,time:m.time}));
    (data.journal||[]).forEach(j=>push('diario',`📔 ${j.date}`,j.content?.slice(0,80)||'','journal',j.mood||'',{content:j.content?.slice(0,200),mood:j.mood}));
    return res;
  };

  const results=buildResults();
  const types=[...new Set(results.map(r=>r.type))];
  const filtered=activeType==='all'?results:results.filter(r=>r.type===activeType);

  const handleSelect=(r)=>{
    addRecent(q);
    const meta=TYPE_META[r.type];
    const [view,hint]=(r.hint||'').includes(':')?[r.hint.split(':')[0],r.hint]:[(r.hint||meta?.nav||''),''];
    onNavigate(view,hint||null);
    onClose();
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:56,backdropFilter:'blur(8px)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:'100%',maxWidth:560,padding:'0 16px',maxHeight:'80vh',display:'flex',flexDirection:'column',gap:0}} onClick={e=>e.stopPropagation()}>

        {/* Search input */}
        <div style={{position:'relative',marginBottom:8}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:T.muted,fontSize:17,pointerEvents:'none'}}>🔍</span>
          <input ref={inputRef} value={q} onChange={e=>{setQ(e.target.value);setExpanded(null);setActiveType('all');}} autoComplete="off"
            onKeyDown={e=>e.key==='Escape'&&onClose()}
            placeholder="Buscar… o escribe 'esta semana', 'hoy', 'últimos 7 días'…"
            style={{width:'100%',background:T.surface,border:`2px solid ${q?T.accent:T.border}`,color:T.text,padding:'14px 44px 14px 44px',borderRadius:14,fontSize:15,outline:'none',boxSizing:'border-box',fontFamily:'inherit',transition:'border-color 0.15s'}}/>
          <button onClick={onClose} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.muted,cursor:'pointer',display:'flex',padding:4}}>
            <Icon name="x" size={18}/>
          </button>
        </div>

        {/* Content box */}
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',maxHeight:'68vh',display:'flex',flexDirection:'column'}}>

          {/* No query: recent + hint */}
          {!ql&&(
            <div style={{padding:16}}>
              {recentSearches.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Recientes</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {recentSearches.map(s=>(
                      <button key={s} onClick={()=>setQ(s)}
                        style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${T.border}`,background:T.surface2,color:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
                        <span style={{color:T.dim,fontSize:10}}>↩</span>{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Búsqueda por fecha</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {['hoy','ayer','esta semana','este mes','últimos 7 días','últimos 30 días'].map(s=>(
                    <button key={s} onClick={()=>setQ(s)}
                      style={{padding:'4px 11px',borderRadius:20,border:`1px solid ${T.purple}40`,background:`${T.purple}10`,color:T.purple,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                      🗓 {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{color:T.dim,fontSize:12,textAlign:'center',padding:'8px 0'}}>
                Busca por nombre, o presiona <kbd style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:4,padding:'1px 6px',fontSize:10}}>Esc</kbd> para cerrar
              </div>
            </div>
          )}

          {/* Date range active banner */}
          {ql&&isDateQuery&&(
            <div style={{padding:'8px 14px',background:`${T.purple}12`,borderBottom:`1px solid ${T.purple}30`,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <span style={{fontSize:13}}>🗓</span>
              <span style={{fontSize:12,color:T.purple,fontWeight:600}}>Mostrando registros de <strong>{dateRange.label}</strong></span>
              <span style={{fontSize:11,color:T.dim,marginLeft:'auto'}}>{dateRange.from} → {dateRange.to}</span>
            </div>
          )}

          {/* Type filters when there are results */}
          {ql&&results.length>0&&types.length>1&&(
            <div style={{padding:'8px 12px',borderBottom:`1px solid ${T.border}`,display:'flex',gap:5,flexWrap:'wrap',flexShrink:0}}>
              <button onClick={()=>setActiveType('all')}
                style={{padding:'3px 10px',borderRadius:8,border:`1px solid ${activeType==='all'?T.accent:T.border}`,background:activeType==='all'?`${T.accent}15`:'transparent',color:activeType==='all'?T.accent:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                Todos ({results.length})
              </button>
              {types.map(t=>{
                const cnt=results.filter(r=>r.type===t).length;
                const meta=TYPE_META[t];
                return (
                  <button key={t} onClick={()=>setActiveType(t)}
                    style={{padding:'3px 10px',borderRadius:8,border:`1px solid ${activeType===t?meta.color:T.border}`,background:activeType===t?`${meta.color}15`:'transparent',color:activeType===t?meta.color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                    {meta.label.split(' ')[0]} {cnt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Results */}
          {ql&&(
            <div style={{overflowY:'auto',flex:1}}>
              {filtered.length===0
                ?<div style={{padding:'28px 16px',textAlign:'center',color:T.dim,fontSize:13}}>
                   {isDateQuery
                     ?<>Sin registros para <span style={{color:T.purple}}>{dateRange.label}</span></>
                     :<>Sin resultados para "<span style={{color:T.accent}}>{q}</span>"</>
                   }
                 </div>
                :filtered.map((r,i)=>{
                  const meta=TYPE_META[r.type];
                  const isExp=expanded===i;
                  const hi=(text)=>{
                    const idx=text.toLowerCase().indexOf(ql);
                    if(idx<0)return text;
                    return <>{text.slice(0,idx)}<mark style={{background:`${T.accent}30`,color:T.accent,borderRadius:2,padding:'0 1px'}}>{text.slice(idx,idx+ql.length)}</mark>{text.slice(idx+ql.length)}</>;
                  };
                  return (
                    <div key={i}>
                      <div onClick={()=>setExpanded(isExp?null:i)}
                        style={{padding:'11px 16px',cursor:'pointer',borderBottom:`1px solid ${T.border}`,display:'flex',gap:10,alignItems:'center',background:isExp?T.surface2:'transparent',transition:'background 0.1s'}}
                        onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.surface2;}}
                        onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background='transparent';}}>
                        <span style={{fontSize:11,color:meta.color,background:`${meta.color}18`,padding:'2px 8px',borderRadius:8,flexShrink:0,fontWeight:600,whiteSpace:'nowrap'}}>{meta.label}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:T.text,fontSize:13,fontWeight:500}}>{hi(r.label)}</div>
                          {r.sub&&<div style={{color:T.muted,fontSize:11,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{hi(r.sub)}</div>}
                        </div>
                        <span style={{color:T.dim,fontSize:11,flexShrink:0}}>{isExp?'▲':'▼'}</span>
                      </div>
                      {isExp&&(
                        <div style={{padding:'10px 16px 12px',borderBottom:`1px solid ${T.border}`,background:T.surface2}}>
                          {/* Preview content */}
                          {r.preview&&(
                            <div style={{marginBottom:10,display:'flex',flexWrap:'wrap',gap:6,fontSize:11,color:T.muted}}>
                              {r.preview.content&&<div style={{width:'100%',color:T.text,fontSize:12,lineHeight:1.5,marginBottom:4,borderLeft:`2px solid ${meta.color}`,paddingLeft:10}}>{r.preview.content}</div>}
                              {r.preview.tags&&r.preview.tags.length>0&&r.preview.tags.map(tag=><span key={tag} style={{background:`${T.purple}15`,color:T.purple,padding:'1px 7px',borderRadius:6,fontSize:10}}>#{tag}</span>)}
                              {r.preview.date&&<span>📅 {r.preview.date}</span>}
                              {r.preview.status&&<span style={{color:r.preview.status==='done'?T.green:T.orange,fontWeight:600}}>{r.preview.status==='done'?'✅ Hecha':'⏳ Pendiente'}</span>}
                              {r.preview.priority&&<span style={{color:r.preview.priority==='alta'?T.red:r.preview.priority==='media'?T.orange:T.accent}}>● {r.preview.priority}</span>}
                              {r.preview.dueDate&&<span>📅 Vence: {r.preview.dueDate}</span>}
                              {r.preview.subtasks>0&&<span>📋 {r.preview.subtasks} subtareas</span>}
                              {r.preview.deadline&&<span>🎯 Fecha límite: {r.preview.deadline}</span>}
                              {r.preview.milestones>0&&<span>🏁 {r.preview.milestones} milestones</span>}
                              {r.preview.completedAt&&<span style={{color:T.green}}>✅ Completado: {r.preview.completedAt}</span>}
                              {r.preview.taskCount!=null&&<span>📁 {r.preview.taskCount} tareas</span>}
                              {r.preview.totalCompletions>0&&<span>🔥 {r.preview.totalCompletions} días completados</span>}
                              {r.preview.relation&&<span>👤 {r.preview.relation}</span>}
                              {r.preview.birthday&&<span>🎂 {r.preview.birthday}</span>}
                              {r.preview.phone&&<span>📱 {r.preview.phone}</span>}
                              {r.preview.amount&&<span style={{color:r.preview.type==='ingreso'?T.green:T.red,fontWeight:700}}>{r.preview.type==='ingreso'?'+':'-'}${Number(r.preview.amount).toLocaleString()}</span>}
                              {r.preview.category&&<span>🏷 {r.preview.category}</span>}
                              {r.preview.duration&&<span>⏱ {r.preview.duration}min</span>}
                              {r.preview.calories>0&&<span>🔥 {r.preview.calories}kcal</span>}
                              {r.preview.distance&&<span>📏 {r.preview.distance}</span>}
                              {r.preview.author&&<span>✍️ {r.preview.author}</span>}
                              {r.preview.rating>0&&<span>{'⭐'.repeat(r.preview.rating)}</span>}
                              {r.preview.platform&&<span>📺 {r.preview.platform}</span>}
                              {r.preview.progress!=null&&<span>📊 {r.preview.progress}%</span>}
                              {r.preview.hoursSpent>0&&<span>⏱ {r.preview.hoursSpent}h</span>}
                              {r.preview.stack&&<span>🛠 {r.preview.stack}</span>}
                              {r.preview.url&&<span style={{color:T.blue}}>🔗 {r.preview.url.slice(0,30)}</span>}
                              {r.preview.expiryDate&&<span>📅 Vence: {r.preview.expiryDate}</span>}
                              {r.preview.provider&&<span>🏢 {r.preview.provider}</span>}
                              {r.preview.role&&<span>👷 {r.preview.role}</span>}
                              {r.preview.dose&&<span>💊 {r.preview.dose}{r.preview.unit} · {r.preview.frequency}</span>}
                              {r.preview.time&&<span>⏰ {r.preview.time}</span>}
                              {r.preview.mood&&<span>{r.preview.mood}</span>}
                              {r.preview.lastDone&&<span>🔧 Último: {r.preview.lastDone}</span>}
                            </div>
                          )}
                          <button onClick={()=>handleSelect(r)}
                            style={{padding:'6px 16px',borderRadius:9,border:`1px solid ${meta.color}`,background:`${meta.color}15`,color:meta.color,cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:600}}>
                            Abrir →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              {ql&&<div style={{padding:'8px 16px',color:T.dim,fontSize:11,textAlign:'center',borderTop:`1px solid ${T.border}`}}>{filtered.length} resultado{filtered.length!==1?'s':''}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
