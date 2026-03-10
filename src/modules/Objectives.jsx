import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== OBJECTIVES =====================
const Objectives = ({data,setData,isMobile,viewHint,onConsumeHint,onNavigate}) => {
  const [modal,setModal]=useState(false);
  const [smartStep,setSmartStep]=useState(0); // 0-3 multi-step wizard
  const [form,setForm]=useState({
    title:'',specific:'',measurable:'',achievable:'',relevant:'',
    areaId:'',deadline:'',status:'active',
  });
  const [view,setView]=useState('list');
  const [selected,setSelected]=useState(null);
  const [checkinModal,setCheckinModal]=useState(null);
  const [checkinForm,setCheckinForm]=useState({mood:'🟢',note:''});

  const [areaFilter,setAreaFilter]=useState(()=>viewHint?.startsWith('area:')?viewHint.slice(5):null);
  useEffect(()=>{
    if(viewHint?.startsWith('area:')){setAreaFilter(viewHint.slice(5));onConsumeHint?.();}
  },[viewHint]);

  const filteredArea=areaFilter?data.areas.find(a=>a.id===areaFilter):null;
  const allObj=areaFilter?data.objectives.filter(o=>o.areaId===areaFilter):data.objectives;

  const saveObj=()=>{
    if(!form.title.trim())return;
    const updated=[...data.objectives,{id:uid(),...form,milestones:[],checkins:[]}];
    setData(d=>({...d,objectives:updated}));save('objectives',updated);
    setModal(false);toast.success('Objetivo guardado');setForm({title:'',areaId:areaFilter||'',deadline:'',status:'active'});
  };
  const toggle=(id)=>{const u=data.objectives.map(o=>o.id===id?{...o,status:o.status==='active'?'done':'active',completedAt:o.status==='active'?today():null}:o);setData(d=>({...d,objectives:u}));save('objectives',u);};
  const del=(id)=>{const u=data.objectives.filter(o=>o.id!==id);setData(d=>({...d,objectives:u}));save('objectives',u);if(selected===id)setSelected(null);};

  // Milestones
  const [msForm,setMsForm]=useState({text:'',dueDate:'',weight:20});
  const addMilestone=(objId)=>{
    if(!msForm.text.trim())return;
    const m={id:uid(),text:msForm.text,dueDate:msForm.dueDate||'',weight:Number(msForm.weight)||20,done:false};
    const u=data.objectives.map(o=>o.id!==objId?o:{...o,milestones:[...(o.milestones||[]),m]});
    setData(d=>({...d,objectives:u}));save('objectives',u);
    setMsForm({text:'',dueDate:'',weight:20});
  };
  const toggleMilestone=(objId,msId)=>{
    const u=data.objectives.map(o=>o.id!==objId?o:{...o,milestones:(o.milestones||[]).map(m=>m.id!==msId?m:{...m,done:!m.done})});
    setData(d=>({...d,objectives:u}));save('objectives',u);
  };
  const delMilestone=(objId,msId)=>{
    const u=data.objectives.map(o=>o.id!==objId?o:{...o,milestones:(o.milestones||[]).filter(m=>m.id!==msId)});
    setData(d=>({...d,objectives:u}));save('objectives',u);
  };
  const updateMilestone=(objId,msId,patch)=>{
    const u=data.objectives.map(o=>o.id!==objId?o:{...o,milestones:(o.milestones||[]).map(m=>m.id!==msId?m:{...m,...patch})});
    setData(d=>({...d,objectives:u}));save('objectives',u);
  };

  // Check-ins
  const saveCheckin=(objId)=>{
    if(!checkinForm.note.trim())return;
    const ci={id:uid(),...checkinForm,date:today()};
    const u=data.objectives.map(o=>o.id!==objId?o:{...o,checkins:[ci,...(o.checkins||[])]});
    setData(d=>({...d,objectives:u}));save('objectives',u);
    setCheckinModal(null);setCheckinForm({mood:'🟢',note:''});
  };

  const getMsPct=(o)=>{
    const ms=o.milestones||[];
    if(!ms.length)return null;
    const totalWeight=ms.reduce((s,m)=>s+(m.weight||20),0);
    if(!totalWeight)return Math.round(ms.filter(m=>m.done).length/ms.length*100);
    const doneWeight=ms.filter(m=>m.done).reduce((s,m)=>s+(m.weight||20),0);
    return Math.round(doneWeight/totalWeight*100);
  };
  const getTaskPct=(o)=>{
    const relProj=data.projects.filter(p=>p.objectiveId===o.id);
    const projTasks=data.tasks.filter(t=>relProj.some(p=>p.id===t.projectId));
    const directTasks=data.tasks.filter(t=>t.objectiveId===o.id);
    const allTasks=[...projTasks,...directTasks.filter(dt=>!projTasks.some(pt=>pt.id===dt.id))];
    if(!allTasks.length)return null;
    return Math.round(allTasks.filter(t=>t.status==='done').length/allTasks.length*100);
  };
  const getPct=(o)=>{const a=getMsPct(o);const b=getTaskPct(o);return a!==null?a:b!==null?b:0;};

  const daysLeft=(dl)=>Math.ceil((new Date(dl)-new Date())/86400000);

  const selObj=selected?data.objectives.find(o=>o.id===selected):null;

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <h2 style={{margin:0,color:T.text,fontSize:isMobile?18:20,fontWeight:700}}>
            {filteredArea?`${filteredArea.icon} ${filteredArea.name}`:'🎯 Objetivos'}
          </h2>
          <p style={{color:T.muted,fontSize:13,marginTop:4,marginBottom:0}}>
            {filteredArea?<>Objetivos de esta área <button onClick={()=>setAreaFilter(null)} style={{marginLeft:6,background:'none',border:`1px solid ${T.border}`,borderRadius:6,padding:'1px 8px',cursor:'pointer',color:T.muted,fontSize:11,fontFamily:'inherit'}}>✕ Todos</button></>:'Metas concretas con milestones y check-ins.'}
          </p>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <div style={{display:'flex',gap:3,background:T.surface2,borderRadius:9,padding:3}}>
            {[['list','☰'],['tree','🌳'],['done','✅']].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)}
                style={{padding:'4px 10px',borderRadius:6,border:'none',background:view===v?T.accent:'transparent',color:view===v?'#000':T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:view===v?700:400}}>
                {l}
              </button>
            ))}
          </div>
          <Btn onClick={()=>setModal(true)} size="sm"><Icon name="plus" size={14}/>Nuevo</Btn>
        </div>
      </div>

      {/* LIST VIEW */}
      {view==='list'&&(
        <div>
          {['active','done'].map(status=>{
            const list=allObj.filter(o=>o.status===status);
            if(!list.length)return null;
            return (
              <div key={status} style={{marginBottom:24}}>
                <h3 style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>{status==='active'?'Activos':'Completados'}</h3>
                {list.map(o=>{
                  const area=data.areas.find(a=>a.id===o.areaId);
                  const pct=getPct(o);
                  const msPct=getMsPct(o);
                  const taskPct=getTaskPct(o);
                  const isOverdue=o.deadline&&o.deadline<today()&&status==='active';
                  const dl=o.deadline?daysLeft(o.deadline):null;
                  const isSel=selected===o.id;
                  return (
                    <div key={o.id} style={{marginBottom:8}}>
                      <Card style={{opacity:status==='done'?0.65:1,border:`1px solid ${isSel?T.accent:T.border}`}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                          <button onClick={e=>{e.stopPropagation();toggle(o.id);}}
                            style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${status==='done'?T.green:T.border}`,background:status==='done'?T.green:'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginTop:2}}>
                            {status==='done'&&<Icon name="check" size={11} color="#000"/>}
                          </button>
                          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>setSelected(isSel?null:o.id)}>
                            <div style={{color:T.text,fontWeight:600,fontSize:14,textDecoration:status==='done'?'line-through':'none',marginBottom:5}}>{o.title}</div>
                            {/* Progress bars */}
                            {(msPct!==null||taskPct!==null)&&(
                              <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:6}}>
                                {msPct!==null&&(
                                  <div>
                                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                                      <span style={{color:T.dim,fontSize:10}}>🏁 Milestones</span>
                                      <span style={{color:T.accent,fontSize:10,fontWeight:600}}>{msPct}%</span>
                                    </div>
                                    <div style={{height:3,background:T.border,borderRadius:2}}>
                                      <div style={{height:'100%',width:`${msPct}%`,background:T.accent,borderRadius:2,transition:'width 0.4s'}}/>
                                    </div>
                                  </div>
                                )}
                                {taskPct!==null&&(
                                  <div>
                                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                                      <span style={{color:T.dim,fontSize:10}}>✅ Tareas</span>
                                      <span style={{color:T.muted,fontSize:10}}>{taskPct}%</span>
                                    </div>
                                    <div style={{height:3,background:T.border,borderRadius:2}}>
                                      <div style={{height:'100%',width:`${taskPct}%`,background:T.muted,borderRadius:2,transition:'width 0.4s'}}/>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                              {area&&<Tag text={`${area.icon} ${area.name}`} color={area.color}/>}
                              {o.deadline&&<span style={{color:isOverdue?T.red:dl&&dl<=7?T.orange:T.muted,fontSize:12,fontWeight:isOverdue||dl<=7?600:400}}>{isOverdue?'⚠️ Vencido: ':dl&&dl<=7?`⏰ ${dl}d: `:'📅 '}{fmt(o.deadline)}</span>}
                              {status==='done'&&o.completedAt&&<span style={{color:T.green,fontSize:12,fontWeight:600}}>✅ Completado {fmt(o.completedAt)}</span>}
                              <span onClick={e=>{e.stopPropagation();onNavigate&&onNavigate('projects',`obj:${o.id}`);}}
                                style={{color:T.blue,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                                📁 {data.projects.filter(p=>p.objectiveId===o.id).length} proyectos →
                              </span>
                            </div>
                          </div>
                          <div style={{display:'flex',gap:4,flexShrink:0}}>
                            <button onClick={e=>{e.stopPropagation();setCheckinModal(o.id);setCheckinForm({mood:'🟢',note:''});}}
                              style={{background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:7,color:T.blue,cursor:'pointer',padding:'3px 7px',fontSize:11,fontFamily:'inherit'}}>
                              ✍️
                            </button>
                            <button onClick={e=>{e.stopPropagation();del(o.id);}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                          </div>
                        </div>
                      </Card>

                      {/* Inline detail: milestones + checkins */}
                      {isSel&&(
                        <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderTop:'none',borderRadius:'0 0 12px 12px',padding:'14px 16px'}}>
                          {/* Milestones */}
                          <div style={{marginBottom:14}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                              <div style={{fontSize:12,fontWeight:700,color:T.text}}>🏁 Milestones</div>
                              {(o.milestones||[]).length>0&&(()=>{
                                const totalW=(o.milestones||[]).reduce((s,m)=>s+(m.weight||20),0);
                                const isBalanced=Math.abs(totalW-100)<=2;
                                return (
                                  <span style={{fontSize:10,color:isBalanced?T.accent:T.orange,fontWeight:600,background:isBalanced?`${T.accent}15`:`${T.orange}15`,padding:'2px 8px',borderRadius:8}}>
                                    {isBalanced?`✓ ${totalW}% balanceado`:`Σ ${totalW}% — ajustar pesos`}
                                  </span>
                                );
                              })()}
                            </div>

                            {(o.milestones||[]).map((m,mi)=>{
                              const msOverdue=m.dueDate&&m.dueDate<today()&&!m.done;
                              const msDue=m.dueDate?daysLeft(m.dueDate):null;
                              return (
                                <div key={m.id} style={{
                                  display:'flex',alignItems:'flex-start',gap:8,
                                  padding:'8px 10px',marginBottom:5,
                                  background:m.done?`${T.accent}06`:T.bg,
                                  borderRadius:9,
                                  border:`1px solid ${msOverdue?T.red+'40':m.done?T.accent+'30':T.border}`,
                                  transition:'all 0.15s',
                                }}>
                                  {/* Toggle */}
                                  <button onClick={()=>toggleMilestone(o.id,m.id)}
                                    style={{width:18,height:18,borderRadius:5,border:`2px solid ${m.done?T.accent:T.border}`,
                                      background:m.done?T.accent:'transparent',cursor:'pointer',flexShrink:0,
                                      display:'flex',alignItems:'center',justifyContent:'center',marginTop:1,transition:'all 0.15s'}}>
                                    {m.done&&<span style={{color:'#000',fontSize:10,fontWeight:900,lineHeight:1}}>✓</span>}
                                  </button>

                                  {/* Text + meta */}
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:12,color:m.done?T.muted:T.text,textDecoration:m.done?'line-through':'none',lineHeight:1.4}}>{m.text}</div>
                                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
                                      {/* Weight badge */}
                                      <span style={{fontSize:10,fontWeight:700,
                                        color:m.done?T.accent:T.blue,
                                        background:m.done?`${T.accent}15`:`${T.blue}15`,
                                        padding:'1px 7px',borderRadius:6,cursor:'pointer'}}
                                        title="Click para editar peso"
                                        onClick={()=>{
                                          const v=window.prompt(`Peso de este milestone (1–100):`,m.weight||20);
                                          if(v&&!isNaN(v))updateMilestone(o.id,m.id,{weight:Math.min(100,Math.max(1,Number(v)))});
                                        }}>
                                        {m.weight||20}%
                                      </span>
                                      {/* Due date */}
                                      {m.dueDate?(
                                        <span style={{fontSize:10,color:msOverdue?T.red:msDue&&msDue<=3?T.orange:T.muted,
                                          fontWeight:msOverdue||msDue<=3?600:400,
                                          background:msOverdue?`${T.red}12`:msDue<=3&&!m.done?`${T.orange}12`:'transparent',
                                          padding:msOverdue||msDue<=3?'1px 6px':'0',borderRadius:5}}>
                                          {msOverdue?`⚠️ Vencido ${fmt(m.dueDate)}`:msDue<=0?'📅 Hoy':msDue===1?'📅 Mañana':`📅 ${fmt(m.dueDate)}`}
                                        </span>
                                      ):(
                                        <button onClick={()=>{
                                          const v=window.prompt('Fecha límite (YYYY-MM-DD):',today());
                                          if(v)updateMilestone(o.id,m.id,{dueDate:v});
                                        }} style={{fontSize:10,color:T.dim,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>
                                          + fecha
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Delete */}
                                  <button onClick={()=>delMilestone(o.id,m.id)}
                                    style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2,flexShrink:0}}>
                                    <Icon name="trash" size={10}/>
                                  </button>
                                </div>
                              );
                            })}

                            {/* Weighted progress bar */}
                            {(o.milestones||[]).length>0&&(()=>{
                              const ms=o.milestones||[];
                              const totalW=ms.reduce((s,m)=>s+(m.weight||20),0)||1;
                              let cumX=0;
                              return (
                                <div style={{marginTop:10,marginBottom:12}}>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                                    <span style={{fontSize:10,color:T.muted}}>Progreso ponderado</span>
                                    <span style={{fontSize:11,fontWeight:700,color:T.accent}}>{getMsPct(o)}%</span>
                                  </div>
                                  {/* Segmented bar */}
                                  <div style={{height:8,display:'flex',borderRadius:5,overflow:'hidden',gap:1,background:T.border}}>
                                    {ms.map((m,i)=>{
                                      const segW=(m.weight||20)/totalW*100;
                                      return (
                                        <div key={m.id} style={{
                                          width:`${segW}%`,height:'100%',flexShrink:0,
                                          background:m.done?T.accent:`${T.accent}25`,
                                          transition:'background 0.3s',
                                        }} title={`${m.text} (${m.weight||20}%)`}/>
                                      );
                                    })}
                                  </div>
                                  <div style={{display:'flex',gap:2,marginTop:3}}>
                                    {ms.map(m=>(
                                      <div key={m.id} style={{flex:`${m.weight||20}`,textAlign:'center',fontSize:8,color:m.done?T.accent:T.dim,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',minWidth:0}} title={m.text}>
                                        {m.text.slice(0,8)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Add milestone form */}
                            <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8,background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:'10px 12px'}}>
                              <input value={msForm.text} onChange={e=>setMsForm(f=>({...f,text:e.target.value}))}
                                onKeyDown={e=>{if(e.key==='Enter')addMilestone(o.id);}}
                                placeholder="Nombre del milestone…"
                                style={{background:'transparent',border:'none',borderBottom:`1px solid ${T.border}`,color:T.text,padding:'4px 0',fontSize:12,outline:'none',fontFamily:'inherit',width:'100%'}}/>
                              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                <div style={{flex:1}}>
                                  <label style={{fontSize:9,color:T.muted,display:'block',marginBottom:3}}>Fecha límite</label>
                                  <input type="date" value={msForm.dueDate} onChange={e=>setMsForm(f=>({...f,dueDate:e.target.value}))}
                                    style={{width:'100%',background:T.bg,border:`1px solid ${T.border}`,color:T.muted,padding:'4px 8px',borderRadius:6,fontSize:11,outline:'none',fontFamily:'inherit'}}/>
                                </div>
                                <div style={{width:72}}>
                                  <label style={{fontSize:9,color:T.muted,display:'block',marginBottom:3}}>Peso (%)</label>
                                  <input type="number" min="1" max="100" value={msForm.weight} onChange={e=>setMsForm(f=>({...f,weight:e.target.value}))}
                                    style={{width:'100%',background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'4px 8px',borderRadius:6,fontSize:11,outline:'none',fontFamily:'inherit',textAlign:'center'}}/>
                                </div>
                                <button onClick={()=>addMilestone(o.id)}
                                  style={{marginTop:14,padding:'5px 14px',borderRadius:8,border:'none',background:T.accent,color:'#000',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit',flexShrink:0}}>+</button>
                              </div>
                            </div>
                          </div>

                          {/* Check-ins */}
                          {(o.checkins||[]).length>0&&(
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:8}}>📝 Check-ins</div>
                              {(o.checkins||[]).slice(0,3).map((ci,i)=>(
                                <div key={ci.id||i} style={{display:'flex',gap:8,padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
                                  <span style={{fontSize:14,flexShrink:0}}>{ci.mood}</span>
                                  <div><div style={{fontSize:10,color:T.muted}}>{ci.date}</div><div style={{fontSize:12,color:T.text,marginTop:1}}>{ci.note}</div></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {!allObj.length&&(
            <div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
              <Icon name="target" size={40}/><p style={{marginBottom:12}}>Sin objetivos aún</p>
              <Btn onClick={()=>setModal(true)} size="sm"><Icon name="plus" size={14}/>Crear primer objetivo</Btn>
            </div>
          )}
        </div>
      )}

      {/* TREE VIEW */}
      {view==='tree'&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {data.areas.filter(a=>!areaFilter||a.id===areaFilter).map(area=>{
            const aObjs=data.objectives.filter(o=>o.areaId===area.id&&o.status==='active');
            if(!aObjs.length)return null;
            return (
              <Card key={area.id} style={{padding:14}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <div style={{width:10,height:10,borderRadius:3,background:area.color,flexShrink:0}}/>
                  <span style={{fontSize:13,fontWeight:700,color:area.color}}>{area.icon} {area.name}</span>
                </div>
                {aObjs.map(o=>{
                  const pct=getPct(o);
                  const relProj=data.projects.filter(p=>p.objectiveId===o.id);
                  return (
                    <div key={o.id} style={{marginLeft:16,borderLeft:`2px solid ${area.color}40`,paddingLeft:12,marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:T.text,cursor:'pointer'}} onClick={()=>{setView('list');setSelected(o.id);}}>{o.title}</span>
                        <span style={{fontSize:12,fontWeight:700,color:T.accent}}>{pct}%</span>
                      </div>
                      <div style={{height:4,background:T.border,borderRadius:2,marginBottom:6,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:area.color,borderRadius:2,transition:'width 0.5s'}}/>
                      </div>
                      {relProj.map(p=>{
                        const pTasks=data.tasks.filter(t=>t.projectId===p.id);
                        const pp=pTasks.length?Math.round(pTasks.filter(t=>t.status==='done').length/pTasks.length*100):0;
                        return (
                          <div key={p.id} style={{marginLeft:16,borderLeft:`2px solid ${T.border}`,paddingLeft:10,marginBottom:5}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                              <span style={{fontSize:11,color:T.muted}}>📁 {p.title}</span>
                              <span style={{fontSize:9,color:pp===100?T.accent:T.muted}}>{pTasks.filter(t=>t.status==='done').length}/{pTasks.length}</span>
                            </div>
                            <div style={{height:2,background:T.border,borderRadius:1,overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${pp}%`,background:pp===100?T.accent:T.blue,borderRadius:1,opacity:0.6}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>
      )}

      {/* COMPLETED HISTORY VIEW */}
      {view==='done'&&(
        <div>
          {(()=>{
            const doneObjs=[...allObj.filter(o=>o.status==='done')].sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||''));
            if(!doneObjs.length) return (
              <div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
                <div style={{fontSize:40,marginBottom:8}}>🏆</div>
                <p style={{fontSize:14,marginBottom:4}}>Sin objetivos completados aún</p>
                <p style={{fontSize:12,color:T.dim}}>Cuando completes un objetivo aparecerá aquí con su fecha y milestones.</p>
              </div>
            );
            // Group by month
            const byMonth={};
            doneObjs.forEach(o=>{
              const key=o.completedAt?o.completedAt.slice(0,7):'sin-fecha';
              if(!byMonth[key])byMonth[key]=[];
              byMonth[key].push(o);
            });
            return Object.entries(byMonth).map(([month,objs])=>(
              <div key={month} style={{marginBottom:20}}>
                <h3 style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>
                  {month==='sin-fecha'?'Sin fecha':new Date(month+'-01').toLocaleDateString('es-ES',{month:'long',year:'numeric'})}
                </h3>
                {objs.map(o=>{
                  const area=data.areas.find(a=>a.id===o.areaId);
                  const ms=o.milestones||[];
                  const checkins=o.checkins||[];
                  const pct=getPct(o);
                  const relProj=data.projects.filter(p=>p.objectiveId===o.id);
                  const directTasks=data.tasks.filter(t=>t.objectiveId===o.id);
                  const totalTasks=relProj.reduce((s,p)=>s+data.tasks.filter(t=>t.projectId===p.id).length,0)+directTasks.length;
                  return (
                    <Card key={o.id} style={{marginBottom:8,borderLeft:`3px solid ${area?.color||T.green}`}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:T.green,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{color:'#000',fontSize:13,fontWeight:900}}>✓</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:4}}>{o.title}</div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',fontSize:11}}>
                            {area&&<span style={{color:area.color,fontWeight:600}}>{area.icon} {area.name}</span>}
                            {o.completedAt&&<span style={{color:T.green,fontWeight:600}}>✅ {fmt(o.completedAt)}</span>}
                            {o.deadline&&<span style={{color:T.muted}}>📅 Meta: {fmt(o.deadline)}</span>}
                            {ms.length>0&&<span style={{color:T.accent}}>🏁 {ms.filter(m=>m.done).length}/{ms.length} milestones</span>}
                            {totalTasks>0&&<span style={{color:T.muted}}>📋 {totalTasks} tareas</span>}
                            {relProj.length>0&&<span style={{color:T.blue}}>📁 {relProj.length} proyectos</span>}
                            {checkins.length>0&&<span style={{color:T.muted}}>📝 {checkins.length} check-ins</span>}
                          </div>
                          {/* Show milestone list if any */}
                          {ms.length>0&&(
                            <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:3}}>
                              {ms.slice(0,4).map(m=>(
                                <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}>
                                  <span style={{color:m.done?T.accent:T.dim}}>{m.done?'✓':'○'}</span>
                                  <span style={{color:m.done?T.muted:T.dim,textDecoration:m.done?'line-through':'none'}}>{m.text}</span>
                                </div>
                              ))}
                              {ms.length>4&&<span style={{fontSize:10,color:T.dim}}>+{ms.length-4} más</span>}
                            </div>
                          )}
                        </div>
                        <button onClick={()=>toggle(o.id)} title="Reactivar objetivo"
                          style={{background:'none',border:`1px solid ${T.border}`,borderRadius:7,padding:'3px 8px',cursor:'pointer',color:T.muted,fontSize:10,fontFamily:'inherit',flexShrink:0}}>
                          ↩ Reactivar
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* New objective modal — SMART wizard */}
      {modal&&(
        <Modal title="🎯 Nuevo objetivo SMART" onClose={()=>{setModal(false);setSmartStep(0);setForm({title:'',specific:'',measurable:'',achievable:'',relevant:'',areaId:'',deadline:'',status:'active'});}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Step indicators */}
            <div style={{display:'flex',gap:4}}>
              {[['S','Específico'],['M','Medible'],['A','Alcanzable'],['T','Tiempo']].map(([letter,label],i)=>(
                <div key={i} onClick={()=>setSmartStep(i)} style={{flex:1,cursor:'pointer',textAlign:'center'}}>
                  <div style={{height:4,borderRadius:4,background:smartStep>=i?T.accent:T.border,marginBottom:4,transition:'background 0.2s'}}/>
                  <div style={{fontSize:10,color:smartStep===i?T.accent:T.dim,fontWeight:smartStep===i?700:400}}>{letter}</div>
                </div>
              ))}
            </div>
            {/* Step 0: S — Específico */}
            {smartStep===0&&(
              <div>
                <div style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:4}}>📌 Específico: ¿Qué exactamente quieres lograr?</div>
                <div style={{fontSize:11,color:T.dim,marginBottom:10,lineHeight:1.5}}>Sé concreto. Evita frases vagas como "mejorar" o "aprender más".</div>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ej. Correr una media maratón de 21km"
                  style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit',marginBottom:8}}/>
                <input value={form.specific} onChange={e=>setForm(f=>({...f,specific:e.target.value}))} placeholder="¿Por qué este objetivo? ¿Quién está involucrado?"
                  style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/>
              </div>
            )}
            {/* Step 1: M — Medible */}
            {smartStep===1&&(
              <div>
                <div style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:4}}>📊 Medible: ¿Cómo sabrás que lo lograste?</div>
                <div style={{fontSize:11,color:T.dim,marginBottom:10,lineHeight:1.5}}>Define números, fechas o resultados tangibles para medir tu avance.</div>
                <input value={form.measurable} onChange={e=>setForm(f=>({...f,measurable:e.target.value}))} placeholder="Ej. Completar 21km en menos de 2h30min"
                  style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/>
              </div>
            )}
            {/* Step 2: A + R — Alcanzable + Relevante */}
            {smartStep===2&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:4}}>💪 Alcanzable: ¿Es realista para ti ahora?</div>
                  <input value={form.achievable} onChange={e=>setForm(f=>({...f,achievable:e.target.value}))} placeholder="Ej. Ya corro 10km, entrenaré 4 veces/semana"
                    style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/>
                </div>
                <div>
                  <div style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:4}}>🎯 Relevante: ¿Por qué te importa?</div>
                  <input value={form.relevant} onChange={e=>setForm(f=>({...f,relevant:e.target.value}))} placeholder="Ej. Quiero mejorar mi salud y tener más energía"
                    style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:T.muted,marginBottom:4}}>Área de vida</div>
                  <select value={form.areaId||areaFilter||''} onChange={e=>setForm(f=>({...f,areaId:e.target.value}))}
                    style={{width:'100%',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}>
                    <option value="">Sin área</option>
                    {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {/* Step 3: T — Tiempo */}
            {smartStep===3&&(
              <div>
                <div style={{fontSize:13,color:T.text,fontWeight:600,marginBottom:4}}>⏰ Tiempo: ¿Cuál es tu fecha límite?</div>
                <div style={{fontSize:11,color:T.dim,marginBottom:10,lineHeight:1.5}}>Sin fecha límite, los objetivos se quedan en el aire. Sé ambicioso pero realista.</div>
                <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}
                  style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit',marginBottom:14}}/>
                {/* Summary */}
                {form.title&&(
                  <div style={{padding:'12px 14px',background:`${T.accent}08`,border:`1px solid ${T.accent}20`,borderRadius:12}}>
                    <div style={{fontSize:11,color:T.accent,fontWeight:700,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Resumen SMART</div>
                    {[
                      {letter:'S',val:form.title||form.specific},
                      {letter:'M',val:form.measurable},
                      {letter:'A',val:form.achievable},
                      {letter:'R',val:form.relevant},
                      {letter:'T',val:form.deadline},
                    ].map(r=>r.val&&(
                      <div key={r.letter} style={{display:'flex',gap:8,marginBottom:4}}>
                        <span style={{width:18,height:18,borderRadius:'50%',background:T.accent,color:'#000',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{r.letter}</span>
                        <span style={{fontSize:12,color:T.muted}}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Navigation */}
            <div style={{display:'flex',gap:8}}>
              {smartStep>0&&<Btn variant="ghost" onClick={()=>setSmartStep(s=>s-1)} style={{flex:1,justifyContent:'center'}}>← Anterior</Btn>}
              {smartStep<3&&<Btn onClick={()=>{if(!form.title.trim()){alert('El título es obligatorio');return;}setSmartStep(s=>s+1);}} style={{flex:2,justifyContent:'center'}}>Siguiente →</Btn>}
              {smartStep===3&&<Btn onClick={saveObj} style={{flex:2,justifyContent:'center'}}>🎯 Crear objetivo</Btn>}
            </div>
          </div>
        </Modal>
      )}

      {/* Check-in modal */}
      {checkinModal&&(
        <Modal title="Check-in semanal" onClose={()=>setCheckinModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{fontSize:13,color:T.muted}}>¿Cómo va este objetivo?</div>
            <div style={{display:'flex',gap:6}}>
              {['🟢','🟡','🔴'].map(m=>(
                <button key={m} onClick={()=>setCheckinForm(f=>({...f,mood:m}))}
                  style={{flex:1,padding:'8px',borderRadius:10,border:`2px solid ${checkinForm.mood===m?T.accent:T.border}`,background:checkinForm.mood===m?`${T.accent}18`:'transparent',cursor:'pointer',fontSize:20}}>
                  {m}
                </button>
              ))}
            </div>
            <Textarea value={checkinForm.note} onChange={v=>setCheckinForm(f=>({...f,note:v}))} placeholder="¿Qué avanzaste? ¿Qué bloqueó?" rows={3}/>
            <Btn onClick={()=>saveCheckin(checkinModal)} style={{width:'100%',justifyContent:'center'}}>Guardar check-in</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};



export default Objectives;
