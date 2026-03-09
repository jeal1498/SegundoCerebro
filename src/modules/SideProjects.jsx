import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

import { toast } from './Toast.jsx';
// ===================== SIDE PROJECTS =====================
const SideProjects = ({data,setData,isMobile,onBack}) => {
  const [tab,setTab]             = useState('proyectos');
  const [roadmapHover,setRoadmapHover] = useState(null);
  const [modalProj,setModalProj] = useState(false);
  const [modalTask,setModalTask] = useState(false);
  const [modalMile,setModalMile] = useState(false);
  const [modalTime,setModalTime] = useState(false);
  const [selProj,setSelProj]     = useState(null);
  const [editingProj,setEditingProj] = useState(null);
  const [projFilter,setProjFilter]   = useState('all');
  const [projForm,setProjForm]   = useState({name:'',description:'',status:'idea',stack:'',url:'',repoUrl:'',platform:'',revenue:0,costs:0,startDate:today(),color:''});
  const [taskForm,setTaskForm]   = useState({projectId:'',title:'',priority:'media',dueDate:'',done:false});
  const [mileForm,setMileForm]   = useState({projectId:'',title:'',date:today(),notes:''});
  const [timeForm,setTimeForm]   = useState({projectId:'',hours:'',note:'',date:today()});

  const sideProjects = data.sideProjects||[];
  const spTasks      = data.spTasks||[];
  const milestones   = data.milestones||[];
  const timeLogs     = data.spTimeLogs||[];

  const STATUSES=[
    {id:'idea',     label:'Idea',       color:T.muted,   emoji:'💡'},
    {id:'progress', label:'En progreso',color:T.accent,  emoji:'⚡'},
    {id:'paused',   label:'Pausado',    color:T.orange,  emoji:'⏸️'},
    {id:'launched', label:'Lanzado',    color:T.green,   emoji:'🚀'},
    {id:'archived', label:'Archivado',  color:T.dim,     emoji:'📦'},
  ];
  const statusInfo=(id)=>STATUSES.find(s=>s.id===id)||STATUSES[0];

  const activeProjs   = sideProjects.filter(p=>p.status==='progress');
  const launchedProjs = sideProjects.filter(p=>p.status==='launched');
  const pendingTasks  = spTasks.filter(t=>!t.done);
  const todayTasks    = pendingTasks.filter(t=>t.dueDate===today());
  const lastMile      = [...milestones].sort((a,b)=>b.date.localeCompare(a.date))[0];

  const fmtDate=(d)=>{ try{ return new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'}); } catch{ return d; } };
  const priorityColor=(p)=>p==='alta'?T.red:p==='media'?T.orange:T.green;

  const COLORS=[T.areaColors[0],T.areaColors[1],T.areaColors[2],T.areaColors[3],T.areaColors[4],T.areaColors[5],T.areaColors[6]];

  // ── PROJECT actions ──
  const saveProj=()=>{
    if(!projForm.name.trim()) return;
    const p={id:editingProj?.id||uid(),...projForm,createdAt:editingProj?.createdAt||today()};
    const upd=editingProj?sideProjects.map(x=>x.id===p.id?p:x):[p,...sideProjects];
    setData(d=>({...d,sideProjects:upd})); save('sideProjects',upd);
    setModalProj(false); setEditingProj(null); setSelProj(p);
    setProjForm({name:'',description:'',status:'idea',stack:'',url:'',repoUrl:'',platform:'',revenue:0,costs:0,startDate:today(),color:''});
    toast.success(editingProj?'Proyecto actualizado':'Proyecto creado');
  };
  const openEditProj=(p)=>{ setProjForm({name:p.name,description:p.description||'',status:p.status,stack:p.stack||'',url:p.url||'',repoUrl:p.repoUrl||'',platform:p.platform||'',revenue:p.revenue||0,costs:p.costs||0,startDate:p.startDate||today(),color:p.color||''}); setEditingProj(p); setModalProj(true); };
  const delProj=(id)=>{
    if(!window.confirm('¿Eliminar este proyecto?')) return;
    const upd=sideProjects.filter(p=>p.id!==id); setData(d=>({...d,sideProjects:upd})); save('sideProjects',upd);
    if(selProj?.id===id) setSelProj(null);
    toast.warn('Proyecto eliminado');
  };
  const updateStatus=(id,status)=>{
    const upd=sideProjects.map(p=>p.id===id?{...p,status}:p);
    setData(d=>({...d,sideProjects:upd})); save('sideProjects',upd);
    setSelProj(p=>p?.id===id?{...p,status}:p);
    toast.success('Estado actualizado');
  };

  // ── TASK actions ──
  const saveTask=()=>{
    if(!taskForm.title.trim()) return;
    const t={id:uid(),...taskForm,createdAt:today()};
    const upd=[...spTasks,t]; setData(d=>({...d,spTasks:upd})); save('spTasks',upd);
    setModalTask(false); setTaskForm({projectId:selProj?.id||'',title:'',priority:'media',dueDate:'',done:false});
    toast.success('Tarea agregada');
  };
  const toggleTask=(id)=>{
    const upd=spTasks.map(t=>t.id===id?{...t,done:!t.done}:t);
    setData(d=>({...d,spTasks:upd})); save('spTasks',upd);
  };
  const delTask=(id)=>{
    const upd=spTasks.filter(t=>t.id!==id); setData(d=>({...d,spTasks:upd})); save('spTasks',upd);
  };

  // ── MILESTONE actions ──
  const saveMile=()=>{
    if(!mileForm.title.trim()) return;
    const m={id:uid(),...mileForm,done:false}; const upd=[...milestones,m];
    setData(d=>({...d,milestones:upd})); save('milestones',upd);
    setModalMile(false); setMileForm({projectId:selProj?.id||'',title:'',date:today(),notes:''});
    toast.success('Hito registrado');
  };
  const toggleMile=(id)=>{
    const upd=milestones.map(m=>m.id===id?{...m,done:!m.done}:m);
    setData(d=>({...d,milestones:upd})); save('milestones',upd);
  };
  const delMile=(id)=>{
    const upd=milestones.filter(m=>m.id!==id); setData(d=>({...d,milestones:upd})); save('milestones',upd);
  };

  // ── TIME LOG actions ──
  const saveTimeLog=()=>{
    if(!timeForm.hours||!timeForm.projectId) return;
    const log={id:uid(),...timeForm,hours:parseFloat(timeForm.hours)||0};
    const upd=[log,...timeLogs]; setData(d=>({...d,spTimeLogs:upd})); save('spTimeLogs',upd);
    setModalTime(false); setTimeForm({projectId:selProj?.id||'',hours:'',note:'',date:today()});
    toast.success(`${timeForm.hours}h registradas`);
  };
  const delTimeLog=(id)=>{
    const upd=timeLogs.filter(t=>t.id!==id); setData(d=>({...d,spTimeLogs:upd})); save('spTimeLogs',upd);
  };

  // ── COMPUTED ──
  const projHours=(projId)=>timeLogs.filter(t=>t.projectId===projId).reduce((s,t)=>s+(t.hours||0),0);
  const thisWeekHours=(projId)=>{
    const wkAgo=new Date(); wkAgo.setDate(wkAgo.getDate()-7);
    const wkStr=wkAgo.toISOString().slice(0,10);
    return timeLogs.filter(t=>t.projectId===projId&&t.date>=wkStr).reduce((s,t)=>s+(t.hours||0),0);
  };
  const projMilestones=(projId)=>milestones.filter(m=>m.projectId===projId).sort((a,b)=>a.date.localeCompare(b.date));
  const milestonePct=(projId)=>{
    const ms=projMilestones(projId); if(!ms.length) return null;
    return Math.round(ms.filter(m=>m.done).length/ms.length*100);
  };

  // ── FILTERED PROJECTS ──
  const filteredProjs = projFilter==='all' ? sideProjects : sideProjects.filter(p=>p.status===projFilter);

  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:isMobile?'0 0 80px':'0 0 40px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 20px',borderBottom:`1px solid ${T.border}`}}>
        {isMobile&&<button onClick={onBack} style={{background:'none',border:'none',color:T.muted,cursor:'pointer',padding:4}}><Icon name="chevron-left" size={20}/></button>}
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:700,color:T.text,letterSpacing:-0.5}}>🚀 Side Projects</div>
          <div style={{fontSize:12,color:T.muted,marginTop:2}}>{sideProjects.length} proyectos · {pendingTasks.length} tareas pendientes</div>
        </div>
        <Btn size="sm" onClick={()=>{setEditingProj(null);setProjForm({name:'',description:'',status:'idea',stack:'',url:'',repoUrl:'',platform:'',revenue:0,costs:0,startDate:today(),color:''});setModalProj(true);}}><Icon name="plus" size={13}/>Proyecto</Btn>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,padding:'16px 20px'}}>
        {[
          {label:'Activos',val:activeProjs.length,color:T.accent,icon:'⚡'},
          {label:'Lanzados',val:launchedProjs.length,color:T.green,icon:'🚀'},
          {label:'Pendientes',val:pendingTasks.length,color:T.orange,icon:'📋'},
          {label:'Hoy',val:todayTasks.length,color:T.red,icon:'🔥'},
        ].map(s=>(
          <Card key={s.label} style={{textAlign:'center',padding:12}}>
            <div style={{fontSize:16,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:isMobile?20:24,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,padding:'0 20px 16px',flexWrap:'wrap'}}>
        {[{id:'proyectos',label:'🗂️ Proyectos'},{id:'tareas',label:'✅ Tareas'},{id:'hitos',label:'🏆 Hitos'},{id:'tiempo',label:'⏱️ Tiempo'},{id:'roadmap',label:'🗺️ Roadmap'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'7px 16px',borderRadius:10,border:`1px solid ${tab===t.id?T.accent:T.border}`,background:tab===t.id?`${T.accent}18`:'transparent',color:tab===t.id?T.accent:T.muted,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:'0 20px'}}>

      {/* ══════════ PROYECTOS ══════════ */}
      {tab==='proyectos'&&(
        <div>
          {/* Status filter */}
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {[{id:'all',label:'Todos'},...STATUSES].map(s=>(
              <button key={s.id} onClick={()=>setProjFilter(s.id)}
                style={{padding:'4px 12px',borderRadius:8,border:`1px solid ${projFilter===s.id?T.accent:T.border}`,background:projFilter===s.id?`${T.accent}18`:'transparent',color:projFilter===s.id?T.accent:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                {s.emoji||''} {s.label}
              </button>
            ))}
          </div>

          {filteredProjs.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>🚀</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin proyectos{projFilter!=='all'?' con este estado':''}</div>
               <Btn size="sm" onClick={()=>setModalProj(true)}><Icon name="plus" size={13}/>Crear proyecto</Btn>
             </div>
            :filteredProjs.map(p=>{
              const si=statusInfo(p.status);
              const hours=projHours(p.id);
              const weekH=thisWeekHours(p.id);
              const msPct=milestonePct(p.id);
              const isSel=selProj?.id===p.id;
              return (
                <div key={p.id} style={{marginBottom:10}}>
                  <Card style={{border:`1px solid ${isSel?p.color||T.accent:T.border}`,borderLeft:`3px solid ${p.color||T.accent}`,cursor:'pointer'}}
                    onClick={()=>setSelProj(isSel?null:p)}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <span style={{color:T.text,fontWeight:700,fontSize:14}}>{p.name}</span>
                          <span style={{fontSize:11,fontWeight:600,color:si.color,background:`${si.color}18`,padding:'2px 8px',borderRadius:6}}>{si.emoji} {si.label}</span>
                        </div>
                        {p.description&&<div style={{color:T.muted,fontSize:12,marginTop:4,lineHeight:1.5}}>{p.description}</div>}
                        <div style={{display:'flex',gap:12,marginTop:6,flexWrap:'wrap'}}>
                          {hours>0&&<span style={{fontSize:11,color:T.muted}}>⏱️ {hours.toFixed(1)}h total</span>}
                          {weekH>0&&<span style={{fontSize:11,color:T.accent}}>🔥 {weekH.toFixed(1)}h esta semana</span>}
                          {p.revenue>0&&<span style={{fontSize:11,color:T.green}}>💰 ${Number(p.revenue).toLocaleString()}</span>}
                          {p.costs>0&&<span style={{fontSize:11,color:T.red}}>💸 -${Number(p.costs).toLocaleString()}</span>}
                          {p.stack&&<span style={{fontSize:11,color:T.muted}}>🛠️ {p.stack}</span>}
                        </div>
                        {msPct!==null&&(
                          <div style={{marginTop:8}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                              <span style={{fontSize:10,color:T.muted}}>Milestones</span>
                              <span style={{fontSize:10,fontWeight:700,color:p.color||T.accent}}>{msPct}%</span>
                            </div>
                            <div style={{height:3,background:T.border,borderRadius:2,overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${msPct}%`,background:p.color||T.accent,borderRadius:2,transition:'width 0.5s'}}/>
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();openEditProj(p);}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:7,padding:'3px 8px',cursor:'pointer',color:T.muted,fontSize:11,fontFamily:'inherit'}}>✏️</button>
                        <button onClick={e=>{e.stopPropagation();delProj(p.id);}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                      </div>
                    </div>
                  </Card>

                  {/* Expanded: deployment + milestone roadmap + quick actions */}
                  {isSel&&(
                    <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderTop:'none',borderRadius:'0 0 12px 12px',padding:'14px 16px'}}>
                      {/* Deployment info */}
                      {(p.url||p.repoUrl||p.platform)&&(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>🚀 Despliegue</div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                            {p.url&&<a href={p.url.startsWith('http')?p.url:`https://${p.url}`} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:`${T.accent}12`,border:`1px solid ${T.accent}30`,borderRadius:7,color:T.accent,fontSize:11,fontWeight:600,textDecoration:'none'}}>🌐 {p.url}</a>}
                            {p.repoUrl&&<a href={p.repoUrl.startsWith('http')?p.repoUrl:`https://${p.repoUrl}`} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:`${T.purple}12`,border:`1px solid ${T.purple}30`,borderRadius:7,color:T.purple,fontSize:11,fontWeight:600,textDecoration:'none'}}>📦 {p.repoUrl.replace('https://','')}</a>}
                            {p.platform&&<span style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:`${T.blue}12`,border:`1px solid ${T.blue}30`,borderRadius:7,color:T.blue,fontSize:11,fontWeight:600}}>☁️ {p.platform}</span>}
                          </div>
                        </div>
                      )}

                      {/* Milestone roadmap */}
                      {projMilestones(p.id).length>0&&(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>🗺️ Roadmap</div>
                          <div style={{position:'relative',paddingLeft:22}}>
                            <div style={{position:'absolute',left:8,top:6,bottom:6,width:2,background:T.border,borderRadius:1}}/>
                            {projMilestones(p.id).map((m,idx)=>(
                              <div key={m.id} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:idx<projMilestones(p.id).length-1?10:0,position:'relative'}}>
                                <button onClick={()=>toggleMile(m.id)} style={{position:'absolute',left:-22,top:0,width:18,height:18,borderRadius:'50%',background:m.done?p.color||T.accent:T.surface2,border:`2px solid ${m.done?p.color||T.accent:T.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}>
                                  {m.done&&<span style={{color:'#000',fontSize:8,fontWeight:900}}>✓</span>}
                                </button>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,color:m.done?T.muted:T.text,fontWeight:m.done?400:600,textDecoration:m.done?'line-through':'none'}}>{m.title}</div>
                                  <div style={{fontSize:10,color:T.dim,marginTop:1}}>{fmtDate(m.date)}</div>
                                </div>
                                <button onClick={()=>delMile(m.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2}}><Icon name="trash" size={10}/></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button onClick={()=>{setMileForm({projectId:p.id,title:'',date:today(),notes:''});setModalMile(true);}} style={{padding:'5px 11px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>+ Hito</button>
                        <button onClick={()=>{setTaskForm({projectId:p.id,title:'',priority:'media',dueDate:'',done:false});setModalTask(true);}} style={{padding:'5px 11px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>+ Tarea</button>
                        <button onClick={()=>{setTimeForm({projectId:p.id,hours:'',note:'',date:today()});setModalTime(true);}} style={{padding:'5px 11px',borderRadius:8,border:`1px solid ${T.accent}`,background:`${T.accent}12`,color:T.accent,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'inherit'}}>⏱️ Registrar tiempo</button>
                        {STATUSES.map(s=>s.id!==p.status&&(
                          <button key={s.id} onClick={()=>updateStatus(p.id,s.id)} style={{padding:'5px 11px',borderRadius:8,border:`1px solid ${s.color}40`,background:`${s.color}10`,color:s.color,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>{s.emoji} {s.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* ══════════ TAREAS ══════════ */}
      {tab==='tareas'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <Btn size="sm" onClick={()=>{setTaskForm({projectId:selProj?.id||'',title:'',priority:'media',dueDate:'',done:false});setModalTask(true);}}><Icon name="plus" size={13}/>Nueva tarea</Btn>
          </div>
          {spTasks.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>✅</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin tareas registradas</div>
               <Btn size="sm" onClick={()=>setModalTask(true)}><Icon name="plus" size={13}/>Agregar tarea</Btn>
             </div>
            :[...spTasks].sort((a,b)=>(a.done?1:-1)||(a.dueDate||'z').localeCompare(b.dueDate||'z')).map(t=>{
              const proj=sideProjects.find(p=>p.id===t.projectId);
              return (
                <div key={t.id} style={{display:'flex',gap:10,padding:'12px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:8,opacity:t.done?0.6:1}}>
                  <button onClick={()=>toggleTask(t.id)} style={{width:20,height:20,borderRadius:6,border:`2px solid ${priorityColor(t.priority)}`,background:t.done?priorityColor(t.priority):'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginTop:2}}>
                    {t.done&&<Icon name="check" size={11} color="#000"/>}
                  </button>
                  <div style={{flex:1}}>
                    <div style={{color:T.text,fontSize:13,fontWeight:600,textDecoration:t.done?'line-through':'none'}}>{t.title}</div>
                    <div style={{display:'flex',gap:8,marginTop:3,flexWrap:'wrap'}}>
                      {proj&&<span style={{fontSize:10,color:proj.color||T.accent,background:`${proj.color||T.accent}15`,padding:'1px 7px',borderRadius:6}}>{proj.name}</span>}
                      {t.dueDate&&<span style={{fontSize:10,color:t.dueDate<today()?T.red:T.muted}}>📅 {fmtDate(t.dueDate)}</span>}
                    </div>
                  </div>
                  <button onClick={()=>delTask(t.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex',flexShrink:0}}><Icon name="trash" size={13}/></button>
                </div>
              );
            })
          }
        </div>
      )}

      {/* ══════════ HITOS ══════════ */}
      {tab==='hitos'&&(
        <div>
          {/* project filter */}
          {sideProjects.length>0&&(
            <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
              <button onClick={()=>setSelProj(null)}
                style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${!selProj?T.accent:T.border}`,background:!selProj?`${T.accent}18`:'transparent',color:!selProj?T.accent:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
                Todos
              </button>
              {sideProjects.map(p=>(
                <button key={p.id} onClick={()=>setSelProj(selProj?.id===p.id?null:p)}
                  style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${selProj?.id===p.id?p.color||T.accent:T.border}`,background:selProj?.id===p.id?`${p.color||T.accent}18`:'transparent',color:selProj?.id===p.id?p.color||T.accent:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {(()=>{
            const filtered=selProj?milestones.filter(m=>m.projectId===selProj.id):milestones;
            if(filtered.length===0) return (
              <div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
                <div style={{fontSize:36,marginBottom:8}}>🏆</div>
                <div style={{fontSize:14,marginBottom:12}}>Sin hitos registrados</div>
                <Btn size="sm" onClick={()=>{setMileForm({projectId:selProj?.id||'',title:'',date:today(),notes:''});setModalMile(true);}}><Icon name="plus" size={13}/>Registrar hito</Btn>
              </div>
            );
            return [...filtered].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>{
              const proj=sideProjects.find(p=>p.id===m.projectId);
              return (
                <div key={m.id} style={{display:'flex',gap:12,padding:'14px 16px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:10,borderLeft:`3px solid ${proj?.color||T.purple}`,opacity:m.done?0.7:1}}>
                  <button onClick={()=>toggleMile(m.id)} style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${m.done?proj?.color||T.accent:T.border}`,background:m.done?proj?.color||T.accent:'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginTop:2}}>
                    {m.done&&<Icon name="check" size={11} color="#000"/>}
                  </button>
                  <div style={{flex:1}}>
                    <div style={{color:T.text,fontSize:14,fontWeight:600,textDecoration:m.done?'line-through':'none'}}>{m.title}</div>
                    <div style={{display:'flex',gap:10,marginTop:4,flexWrap:'wrap'}}>
                      {proj&&<span style={{fontSize:11,color:proj.color||T.purple,background:`${proj.color||T.purple}15`,padding:'2px 8px',borderRadius:8}}>{proj.name}</span>}
                      <span style={{fontSize:11,color:T.muted}}>📅 {fmtDate(m.date)}</span>
                    </div>
                    {m.notes&&<div style={{color:T.muted,fontSize:12,marginTop:6,lineHeight:1.5}}>{m.notes}</div>}
                  </div>
                  <button onClick={()=>delMile(m.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex',flexShrink:0,alignSelf:'flex-start'}}><Icon name="trash" size={13}/></button>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ══════════ TIEMPO ══════════ */}
      {tab==='tiempo'&&(
        <div>
          {/* per-project summary */}
          {sideProjects.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {sideProjects.map(p=>{
                const total=projHours(p.id);
                const week=thisWeekHours(p.id);
                const projLogs=timeLogs.filter(t=>t.projectId===p.id).slice(0,3);
                return (
                  <Card key={p.id} style={{borderLeft:`3px solid ${p.color||T.accent}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:projLogs.length?10:0}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{p.name}</div>
                        <div style={{display:'flex',gap:10,marginTop:3}}>
                          <span style={{fontSize:11,color:T.muted}}>⏱️ {total.toFixed(1)}h total</span>
                          {week>0&&<span style={{fontSize:11,color:T.accent}}>🔥 {week.toFixed(1)}h esta semana</span>}
                        </div>
                      </div>
                      <button onClick={()=>{setTimeForm({projectId:p.id,hours:'',note:'',date:today()});setModalTime(true);}} style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${T.accent}`,background:`${T.accent}12`,color:T.accent,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'inherit'}}>+ Tiempo</button>
                    </div>
                    {projLogs.map(log=>(
                      <div key={log.id} style={{display:'flex',gap:8,padding:'6px 0',borderTop:`1px solid ${T.border}`,alignItems:'flex-start'}}>
                        <span style={{fontSize:11,color:p.color||T.accent,fontWeight:700,minWidth:30}}>{log.hours}h</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:T.text}}>{log.note||'Sin nota'}</div>
                          <div style={{fontSize:10,color:T.dim,marginTop:1}}>{log.date}</div>
                        </div>
                        <button onClick={()=>delTimeLog(log.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2}}><Icon name="trash" size={11}/></button>
                      </div>
                    ))}
                  </Card>
                );
              })}
            </div>
          )}

          {timeLogs.length===0&&(
            <div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
              <div style={{fontSize:36,marginBottom:8}}>⏱️</div>
              <div style={{fontSize:14,marginBottom:12}}>Sin registros de tiempo aún</div>
              <Btn size="sm" onClick={()=>{setTimeForm({projectId:sideProjects[0]?.id||'',hours:'',note:'',date:today()});setModalTime(true);}}><Icon name="plus" size={13}/>Registrar tiempo</Btn>
            </div>
          )}
        </div>
      )}

      {/* ══════════ ROADMAP ══════════ */}
      {tab==='roadmap'&&(
        <div>
          {sideProjects.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>🗺️</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin proyectos para mostrar</div>
               <Btn size="sm" onClick={()=>setModalProj(true)}><Icon name="plus" size={13}/>Crear proyecto</Btn>
             </div>
            :(()=>{
              // Build date range: from earliest startDate to today+1mo
              const allDates=[...sideProjects.map(p=>p.startDate).filter(Boolean),...milestones.map(m=>m.date).filter(Boolean)];
              const minDate=allDates.sort()[0]||today().slice(0,7)+'-01';
              const maxDateRaw=new Date(); maxDateRaw.setMonth(maxDateRaw.getMonth()+1);
              const maxDate=maxDateRaw.toISOString().slice(0,10);

              const msToNum=(d)=>new Date(d+'T00:00:00').getTime();
              const rangeMs=msToNum(maxDate)-msToNum(minDate)||1;
              const pct=(d)=>Math.max(0,Math.min(100,(msToNum(d)-msToNum(minDate))/rangeMs*100));

              // Build month axis labels
              const months=[];
              const cur=new Date(minDate+'T00:00:00');
              const end=new Date(maxDate+'T00:00:00');
              while(cur<=end){
                months.push({label:cur.toLocaleDateString('es-ES',{month:'short',year:'2-digit'}),pct:pct(cur.toISOString().slice(0,10))});
                cur.setMonth(cur.getMonth()+1);
              }

              const todayPct=pct(today());
              const STATUS_COLORS={idea:T.muted,progress:T.accent,paused:T.orange,launched:T.green,archived:T.dim};

              return (
                <div>
                  {/* Legend */}
                  <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                    {Object.entries({idea:'💡 Idea',progress:'⚡ En progreso',paused:'⏸️ Pausado',launched:'🚀 Lanzado',archived:'📦 Archivado'}).map(([k,v])=>(
                      <div key={k} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.muted}}>
                        <div style={{width:12,height:4,borderRadius:2,background:STATUS_COLORS[k]}}/>
                        {v}
                      </div>
                    ))}
                    <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.muted}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:T.yellow}}/>
                      Milestone
                    </div>
                  </div>

                  {/* Chart */}
                  <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,overflow:'hidden'}}>

                    {/* Month axis header */}
                    <div style={{position:'relative',height:28,borderBottom:`1px solid ${T.border}`,marginLeft:isMobile?100:140}}>
                      {months.map((m,i)=>(
                        <div key={i} style={{position:'absolute',left:`${m.pct}%`,top:0,bottom:0,display:'flex',alignItems:'center'}}>
                          <div style={{width:1,height:'100%',background:T.border,position:'absolute'}}/>
                          <span style={{fontSize:9,color:T.dim,position:'absolute',left:3,whiteSpace:'nowrap'}}>{m.label}</span>
                        </div>
                      ))}
                      {/* Today line header */}
                      <div style={{position:'absolute',left:`${todayPct}%`,top:0,bottom:0,borderLeft:`2px dashed ${T.accent}60`}}/>
                    </div>

                    {/* Project rows */}
                    {[...sideProjects].sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999')).map((p,pi)=>{
                      const color=p.color||STATUS_COLORS[p.status]||T.accent;
                      const start=p.startDate||today();
                      const end=p.status==='launched'&&p.launchDate?p.launchDate:today();
                      const startPct=pct(start);
                      const endPct=Math.max(startPct+1,pct(end));
                      const pMiles=milestones.filter(m=>m.projectId===p.id);
                      const isHov=roadmapHover===p.id;

                      return (
                        <div key={p.id}
                          style={{display:'flex',alignItems:'center',minHeight:44,borderBottom:pi<sideProjects.length-1?`1px solid ${T.border}`:'none',background:isHov?`${T.accent}05`:'transparent',transition:'background 0.15s',cursor:'pointer'}}
                          onClick={()=>setSelProj(selProj?.id===p.id?null:p)}
                          onMouseEnter={()=>setRoadmapHover(p.id)}
                          onMouseLeave={()=>setRoadmapHover(null)}>

                          {/* Project name */}
                          <div style={{width:isMobile?100:140,flexShrink:0,padding:'0 12px',display:'flex',alignItems:'center',gap:8,borderRight:`1px solid ${T.border}`}}>
                            <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                            <span style={{fontSize:isMobile?10:12,color:T.text,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{p.name}</span>
                          </div>

                          {/* Bar area */}
                          <div style={{flex:1,position:'relative',height:44}}>
                            {/* Grid lines */}
                            {months.map((m,i)=>(
                              <div key={i} style={{position:'absolute',left:`${m.pct}%`,top:0,bottom:0,width:1,background:`${T.border}60`}}/>
                            ))}
                            {/* Today dashed line */}
                            <div style={{position:'absolute',left:`${todayPct}%`,top:0,bottom:0,borderLeft:`2px dashed ${T.accent}50`,zIndex:1}}/>

                            {/* Project bar */}
                            <div
                              style={{
                                position:'absolute',
                                left:`${startPct}%`,
                                width:`${Math.max(1,endPct-startPct)}%`,
                                top:'50%',transform:'translateY(-50%)',
                                height:isHov?20:16,borderRadius:5,
                                background:color,
                                opacity:p.status==='archived'?0.4:0.85,
                                zIndex:2,transition:'height 0.15s',
                              }}
                              title={`${p.name} · ${start} → ${end}`}/>

                            {/* Milestone dots */}
                            {pMiles.map(m=>{
                              const mp=pct(m.date);
                              return (
                                <div key={m.id}
                                  title={`${m.title} · ${m.date}`}
                                  style={{
                                    position:'absolute',left:`${mp}%`,
                                    top:'50%',transform:'translate(-50%,-50%)',
                                    width:10,height:10,borderRadius:'50%',
                                    background:m.done?T.yellow:T.surface,
                                    border:`2px solid ${T.yellow}`,
                                    zIndex:3,cursor:'default',
                                    boxShadow:m.done?`0 0 6px ${T.yellow}60`:'none',
                                  }}/>
                              );
                            })}

                            {/* Status badge at end of bar */}
                            {!isMobile&&(
                              <div style={{
                                position:'absolute',left:`${endPct}%`,
                                top:'50%',transform:'translateY(-50%)',
                                marginLeft:4,zIndex:3,
                                fontSize:10,color:color,fontWeight:600,whiteSpace:'nowrap',
                              }}>
                                {statusInfo(p.status).emoji}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected project detail */}
                  {selProj&&(
                    <Card style={{marginTop:14,borderLeft:`3px solid ${selProj.color||T.accent}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                        <div>
                          <div style={{color:T.text,fontWeight:700,fontSize:15}}>{selProj.name}</div>
                          <div style={{color:T.muted,fontSize:12,marginTop:3,display:'flex',gap:10,flexWrap:'wrap'}}>
                            {selProj.startDate&&<span>🗓 Inicio: {fmtDate(selProj.startDate)}</span>}
                            {selProj.stack&&<span>🛠 {selProj.stack}</span>}
                            <span style={{color:STATUS_COLORS[selProj.status],fontWeight:600}}>{statusInfo(selProj.status).emoji} {statusInfo(selProj.status).label}</span>
                          </div>
                        </div>
                        <button onClick={()=>setSelProj(null)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',fontSize:16,padding:2}}>✕</button>
                      </div>
                      {selProj.description&&<div style={{color:T.muted,fontSize:12,lineHeight:1.6,marginBottom:8}}>{selProj.description}</div>}
                      {milestones.filter(m=>m.projectId===selProj.id).length>0&&(
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:T.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Milestones</div>
                          {[...milestones.filter(m=>m.projectId===selProj.id)].sort((a,b)=>a.date.localeCompare(b.date)).map(m=>(
                            <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:`1px solid ${T.border}`}}>
                              <div style={{width:8,height:8,borderRadius:'50%',background:m.done?T.yellow:T.dim,flexShrink:0}}/>
                              <span style={{flex:1,fontSize:12,color:m.done?T.muted:T.text,textDecoration:m.done?'line-through':'none'}}>{m.title}</span>
                              <span style={{fontSize:10,color:T.dim}}>{fmtDate(m.date)}</span>
                              {m.done&&<span style={{fontSize:10,color:T.yellow}}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{display:'flex',gap:8,marginTop:12}}>
                        <Btn size="sm" onClick={()=>openEditProj(selProj)}>✏️ Editar</Btn>
                        {selProj.url&&<a href={selProj.url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',background:`${T.green}15`,border:`1px solid ${T.green}30`,borderRadius:8,color:T.green,fontSize:11,fontWeight:600,textDecoration:'none'}}>🔗 Ver</a>}
                        <Btn size="sm" variant="ghost" onClick={()=>{setMileForm({projectId:selProj.id,title:'',date:today(),notes:''});setModalMile(true);}}>🏆 Hito</Btn>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })()
          }
        </div>
      )}

      </div>{/* end padding wrapper */}

      {/* ══════════ MODALES ══════════ */}
      {modalProj&&(
        <Modal title={editingProj?'Editar proyecto':'Nuevo proyecto'} onClose={()=>{setModalProj(false);setEditingProj(null);}}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={projForm.name} onChange={v=>setProjForm(f=>({...f,name:v}))} placeholder="Nombre del proyecto"/>
            <Textarea value={projForm.description} onChange={v=>setProjForm(f=>({...f,description:v}))} placeholder="¿De qué trata? ¿Qué problema resuelve?" rows={3}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Select value={projForm.status} onChange={v=>setProjForm(f=>({...f,status:v}))}>
                {STATUSES.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
              </Select>
              <Input value={projForm.startDate} onChange={v=>setProjForm(f=>({...f,startDate:v}))} type="date"/>
            </div>
            <Input value={projForm.stack} onChange={v=>setProjForm(f=>({...f,stack:v}))} placeholder="Stack / Herramientas (ej: React, Notion, Figma...)"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <Input value={projForm.url} onChange={v=>setProjForm(f=>({...f,url:v}))} placeholder="URL publicado"/>
              <Input value={projForm.repoUrl} onChange={v=>setProjForm(f=>({...f,repoUrl:v}))} placeholder="Repositorio"/>
              <Input value={projForm.platform} onChange={v=>setProjForm(f=>({...f,platform:v}))} placeholder="Plataforma"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input value={projForm.revenue} onChange={v=>setProjForm(f=>({...f,revenue:v}))} placeholder="Ingresos $" type="number"/>
              <Input value={projForm.costs} onChange={v=>setProjForm(f=>({...f,costs:v}))} placeholder="Costos $" type="number"/>
            </div>
            <div>
              <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Color</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>setProjForm(f=>({...f,color:c}))}
                    style={{width:28,height:28,borderRadius:8,background:c,border:`3px solid ${projForm.color===c?T.text:'transparent'}`,cursor:'pointer'}}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveProj} style={{flex:1,justifyContent:'center'}}>{editingProj?'Guardar cambios':'Crear proyecto'}</Btn>
            <Btn variant="ghost" onClick={()=>{setModalProj(false);setEditingProj(null);}}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalTask&&(
        <Modal title="Nueva tarea" onClose={()=>setModalTask(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Select value={taskForm.projectId} onChange={v=>setTaskForm(f=>({...f,projectId:v}))}>
              <option value="">— Proyecto —</option>
              {sideProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input value={taskForm.title} onChange={v=>setTaskForm(f=>({...f,title:v}))} placeholder="¿Qué hay que hacer?"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Select value={taskForm.priority} onChange={v=>setTaskForm(f=>({...f,priority:v}))}>
                <option value="baja">🟢 Baja</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🔴 Alta</option>
              </Select>
              <Input value={taskForm.dueDate} onChange={v=>setTaskForm(f=>({...f,dueDate:v}))} type="date"/>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveTask} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalTask(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalMile&&(
        <Modal title="Registrar hito" onClose={()=>setModalMile(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Select value={mileForm.projectId} onChange={v=>setMileForm(f=>({...f,projectId:v}))}>
              <option value="">— Proyecto —</option>
              {sideProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input value={mileForm.title} onChange={v=>setMileForm(f=>({...f,title:v}))} placeholder="¿Qué lograste? (ej: MVP listo, Primer usuario, $100 MRR...)"/>
            <Input value={mileForm.date} onChange={v=>setMileForm(f=>({...f,date:v}))} type="date"/>
            <Textarea value={mileForm.notes} onChange={v=>setMileForm(f=>({...f,notes:v}))} placeholder="Notas o contexto del hito..." rows={3}/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveMile} style={{flex:1,justifyContent:'center'}}>Registrar</Btn>
            <Btn variant="ghost" onClick={()=>setModalMile(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalTime&&(
        <Modal title="Registrar tiempo" onClose={()=>setModalTime(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Select value={timeForm.projectId} onChange={v=>setTimeForm(f=>({...f,projectId:v}))}>
              <option value="">— Proyecto —</option>
              {sideProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input value={timeForm.hours} onChange={v=>setTimeForm(f=>({...f,hours:v}))} placeholder="Horas (ej: 1.5)" type="number" step="0.5"/>
              <Input value={timeForm.date} onChange={v=>setTimeForm(f=>({...f,date:v}))} type="date"/>
            </div>
            <Input value={timeForm.note} onChange={v=>setTimeForm(f=>({...f,note:v}))} placeholder="¿En qué trabajaste? (opcional)"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveTimeLog} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalTime(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};



export default SideProjects;
