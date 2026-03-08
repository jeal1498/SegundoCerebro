import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== PROJECTS & TASKS =====================
const ProjectsAndTasks = ({data,setData,isMobile,viewHint,onConsumeHint,onNavigate}) => {
  const [selProject,setSelProject]=useState(null);
  const [showDetail,setShowDetail]=useState(false);
  const [projModal,setProjModal]=useState(false);
  const [taskModal,setTaskModal]=useState(false);
  const [projForm,setProjForm]=useState({title:'',objectiveId:'',areaId:'',status:'active'});
  const [taskForm,setTaskForm]=useState({title:'',priority:'media',dueDate:'',recurrence:'none'});
  const [objFilter,setObjFilter]=useState(null);
  const [kanbanView,setKanbanView]=useState(false);
  const [listView,setListView]=useState('list');
  const [filterPriority,setFilterPriority]=useState('all');
  const [filterArea,setFilterArea]=useState('all');
  const [filterDeadline,setFilterDeadline]=useState('all');
  const [selectedTasks,setSelectedTasks]=useState([]);
  const [dragTask,setDragTask]=useState(null);
  const [expandedTask,setExpandedTask]=useState(null);

  const UNASSIGNED={id:'__unassigned__',title:'📥 Sin proyecto'};
  const unassignedTasks=data.tasks.filter(t=>!t.projectId);

  useEffect(()=>{
    if(viewHint==='pending'){
      if(unassignedTasks.length>0){setSelProject(UNASSIGNED);if(isMobile)setShowDetail(true);}
      onConsumeHint?.();
    } else if(typeof viewHint==='string'&&viewHint.startsWith('obj:')){
      const oId=viewHint.slice(4);setObjFilter(oId);
      const firstProj=data.projects.find(p=>p.objectiveId===oId);
      if(firstProj){setSelProject(firstProj);if(isMobile)setShowDetail(true);}
      else{setSelProject(null);setShowDetail(false);}
      onConsumeHint?.();
    }
  },[viewHint]);

  const saveProj=()=>{
    if(!projForm.title.trim())return;
    const updated=[...data.projects,{id:uid(),...projForm}];
    setData(d=>({...d,projects:updated}));save('projects',updated);
    setProjModal(false);setProjForm({title:'',objectiveId:'',areaId:'',status:'active'});
  };
  const saveTask=()=>{
    if(!taskForm.title.trim()||!selProject)return;
    const pid=selProject.id==='__unassigned__'?'':selProject.id;
    const updated=[...data.tasks,{id:uid(),projectId:pid,status:'todo',subtasks:[],...taskForm}];
    setData(d=>({...d,tasks:updated}));save('tasks',updated);
    setTaskModal(false);setTaskForm({title:'',priority:'media',dueDate:'',recurrence:'none'});
  };
  const [editTask,setEditTask]=useState(null);
  const [editTaskForm,setEditTaskForm]=useState({title:'',priority:'media',dueDate:''});
  const nextRecurDate=(dueDate,recurrence)=>{
    if(!dueDate||recurrence==='none')return '';
    const d=new Date(dueDate+'T12:00:00');
    if(recurrence==='daily')  d.setDate(d.getDate()+1);
    if(recurrence==='weekly') d.setDate(d.getDate()+7);
    if(recurrence==='monthly')d.setMonth(d.getMonth()+1);
    return d.toISOString().slice(0,10);
  };
  const toggleTask=(id)=>{
    const task=data.tasks.find(t=>t.id===id);
    const nowDone=task?.status!=='done';
    let updated=data.tasks.map(t=>t.id===id?{...t,status:nowDone?'done':'todo'}:t);
    // Auto-create next occurrence when completing a recurring task
    if(nowDone&&task?.recurrence&&task.recurrence!=='none'){
      const nextDate=nextRecurDate(task.dueDate,task.recurrence);
      const clone={...task,id:uid(),status:'todo',dueDate:nextDate,createdAt:today()};
      updated=[...updated,clone];
      toast.info(`🔁 Tarea recurrente regenerada para ${nextDate||'la próxima vez'}`);
    }
    setData(d=>({...d,tasks:updated}));save('tasks',updated);
  };
  const delTask=(id)=>{if(!window.confirm('¿Eliminar esta tarea?'))return;const u=data.tasks.filter(t=>t.id!==id);setData(d=>({...d,tasks:u}));save('tasks',u);};
  const startEditTask=(t)=>{setEditTaskForm({title:t.title,priority:t.priority||'media',dueDate:t.dueDate||''});setEditTask(t.id);};
  const saveEditTask=()=>{const u=data.tasks.map(t=>t.id===editTask?{...t,...editTaskForm}:t);setData(d=>({...d,tasks:u}));save('tasks',u);setEditTask(null);};
  const delProj=(id)=>{
    const updP=data.projects.filter(p=>p.id!==id);
    const updT=data.tasks.filter(t=>t.projectId!==id);
    setData(d=>({...d,projects:updP,tasks:updT}));save('projects',updP);save('tasks',updT);
    if(selProject?.id===id){setSelProject(null);setShowDetail(false);}
  };
  const openProject=(p)=>{setSelProject(p);if(isMobile)setShowDetail(true);};
  const isUnassigned=selProject?.id==='__unassigned__';
  const pTasks=selProject?(isUnassigned?unassignedTasks:data.tasks.filter(t=>t.projectId===selProject.id)):[];
  const pColors={alta:T.red,media:T.accent,baja:T.green};

  // Subtask toggle
  const toggleSubtask=(taskId,subtaskId)=>{
    const u=data.tasks.map(t=>{
      if(t.id!==taskId)return t;
      return {...t,subtasks:(t.subtasks||[]).map(s=>s.id!==subtaskId?s:{...s,done:!s.done})};
    });
    setData(d=>({...d,tasks:u}));save('tasks',u);
  };

  // Bulk actions
  const bulkMarkDone=()=>{
    const u=data.tasks.map(t=>selectedTasks.includes(t.id)?{...t,status:'done'}:t);
    setData(d=>({...d,tasks:u}));save('tasks',u);
    toast.success(`✓ ${selectedTasks.length} tarea${selectedTasks.length!==1?'s':''} completada${selectedTasks.length!==1?'s':''}`);
    setSelectedTasks([]);
  };
  const bulkMoveToStatus=(status)=>{
    const u=data.tasks.map(t=>selectedTasks.includes(t.id)?{...t,status}:t);
    setData(d=>({...d,tasks:u}));save('tasks',u);
    const label=status==='todo'?'Pendiente':status==='in-progress'?'En progreso':'Completado';
    toast.success(`→ ${selectedTasks.length} tarea${selectedTasks.length!==1?'s':''} movida${selectedTasks.length!==1?'s':''} a ${label}`);
    setSelectedTasks([]);
  };
  const bulkDelete=()=>{
    if(!window.confirm(`¿Eliminar ${selectedTasks.length} tarea${selectedTasks.length!==1?'s':''}? Esta acción no se puede deshacer.`))return;
    const u=data.tasks.filter(t=>!selectedTasks.includes(t.id));
    setData(d=>({...d,tasks:u}));save('tasks',u);
    toast.info(`🗑 ${selectedTasks.length} tarea${selectedTasks.length!==1?'s':''} eliminada${selectedTasks.length!==1?'s':''}`);
    setSelectedTasks([]);
  };

  // Kanban move
  const moveToStatus=(taskId,newStatus)=>{
    const u=data.tasks.map(t=>t.id===taskId?{...t,status:newStatus}:t);
    setData(d=>({...d,tasks:u}));save('tasks',u);
  };

  const KANBAN_COLS=[
    {id:'todo',label:'Pendiente',color:T.muted},
    {id:'in-progress',label:'En progreso',color:T.blue},
    {id:'done',label:'Completado',color:T.accent},
  ];

  const filteredPTasks=pTasks.filter(t=>{
    if(filterPriority!=='all'&&t.priority!==filterPriority) return false;
    if(filterArea!=='all'){
      const proj=data.projects.find(p=>p.id===t.projectId);
      if((proj?.areaId||''  )!==filterArea) return false;
    }
    if(filterDeadline!=='all'){
      const td=today();
      if(filterDeadline==='overdue'  &&!(t.dueDate&&t.dueDate<td&&t.status!=='done'))  return false;
      if(filterDeadline==='today'    &&!(t.dueDate===td))                               return false;
      if(filterDeadline==='week'){
        const wEnd=new Date();wEnd.setDate(wEnd.getDate()+7);
        const we=wEnd.toISOString().slice(0,10);
        if(!(t.dueDate&&t.dueDate>=td&&t.dueDate<=we))                                 return false;
      }
      if(filterDeadline==='nodate'   &&t.dueDate)                                       return false;
    }
    return true;
  });
  const totalPTasks=pTasks.length;
  const donePTasks=pTasks.filter(t=>t.status==='done').length;
  const donePct=totalPTasks?Math.round(donePTasks/totalPTasks*100):0;
  const allVisibleIds=filteredPTasks.map(t=>t.id);
  const allSelected=allVisibleIds.length>0&&allVisibleIds.every(id=>selectedTasks.includes(id));
  const toggleSelectAll=()=>setSelectedTasks(allSelected?[]:allVisibleIds);

  const TaskRow=({t,showKanbanMove})=>{
    const isExpanded=expandedTask===t.id;
    const isSel=selectedTasks.includes(t.id);
    const doneSubs=(t.subtasks||[]).filter(s=>s.done).length;
    const totalSubs=(t.subtasks||[]).length;
    return (
      <div style={{marginBottom:8}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-start',padding:'10px 12px',background:isSel?`${T.accent}08`:T.surface2,borderRadius:10,border:`1px solid ${isSel?T.accent:T.border}`,transition:'all 0.15s'}}>
          <input type="checkbox" checked={isSel} onChange={()=>setSelectedTasks(prev=>isSel?prev.filter(x=>x!==t.id):[...prev,t.id])}
            style={{marginTop:3,accentColor:T.accent,cursor:'pointer',flexShrink:0}}/>
          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>setExpandedTask(isExpanded?null:t.id)}>
            <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
              <button onClick={e=>{e.stopPropagation();toggleTask(t.id);}}
                style={{width:18,height:18,borderRadius:4,border:`2px solid ${t.status==='done'?T.accent:T.border}`,background:t.status==='done'?T.accent:'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',marginTop:1}}>
                {t.status==='done'&&<Icon name="check" size={10} color="#000"/>}
              </button>
              <span style={{color:t.status==='done'?T.muted:T.text,fontSize:13,flex:1,textDecoration:t.status==='done'?'line-through':'none',lineHeight:1.4}}>{t.title}</span>
            </div>
            <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap',alignItems:'center',paddingLeft:26}}>
              <span style={{fontSize:10,fontWeight:700,color:pColors[t.priority]||T.muted,background:`${pColors[t.priority]||T.muted}18`,padding:'1px 7px',borderRadius:5}}>{t.priority||'media'}</span>
              {t.dueDate&&<span style={{fontSize:10,color:T.dim}}>{fmt(t.dueDate)}</span>}
              {t.recurrence&&t.recurrence!=='none'&&<span style={{fontSize:10,color:T.blue,background:`${T.blue}15`,padding:'1px 6px',borderRadius:5}}>🔁 {t.recurrence==='daily'?'diaria':t.recurrence==='weekly'?'semanal':'mensual'}</span>}
              {totalSubs>0&&<span style={{fontSize:10,color:T.muted}}>{doneSubs}/{totalSubs} subtareas</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
            {editTask===t.id
              ?<Btn size="sm" onClick={saveEditTask}>✓</Btn>
              :<button onClick={()=>startEditTask(t)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:3,display:'flex'}}><Icon name="pencil" size={12}/></button>
            }
            <button onClick={()=>delTask(t.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:3,display:'flex'}}><Icon name="trash" size={12}/></button>
          </div>
        </div>
        {/* Subtask progress + expanded panel */}
        {totalSubs>0&&(
          <div style={{height:3,background:T.border,borderRadius:0,margin:'0 0 0 20px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(doneSubs/totalSubs)*100}%`,background:T.accent,transition:'width 0.3s'}}/>
          </div>
        )}
        {isExpanded&&(
          <div style={{background:`${T.accent}05`,border:`1px solid ${T.border}`,borderTop:'none',borderRadius:'0 0 10px 10px',padding:'10px 14px 10px 40px'}}>
            {editTask===t.id?(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Input value={editTaskForm.title} onChange={v=>setEditTaskForm(f=>({...f,title:v}))} placeholder="Título"/>
                <div style={{display:'flex',gap:8}}>
                  <Select value={editTaskForm.priority} onChange={v=>setEditTaskForm(f=>({...f,priority:v}))} style={{flex:1}}>
                    <option value="baja">🟢 Baja</option><option value="media">🟡 Media</option><option value="alta">🔴 Alta</option>
                  </Select>
                  <Input type="date" value={editTaskForm.dueDate} onChange={v=>setEditTaskForm(f=>({...f,dueDate:v}))} style={{flex:1}}/>
                </div>
              </div>
            ):(
              <>
                {(t.subtasks||[]).length>0&&(
                  <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:8}}>
                    {(t.subtasks||[]).map(s=>(
                      <div key={s.id} onClick={()=>toggleSubtask(t.id,s.id)}
                        style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',padding:'2px 0'}}>
                        <div style={{width:15,height:15,borderRadius:3,border:`1.5px solid ${s.done?T.accent:T.border}`,background:s.done?T.accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {s.done&&<span style={{color:'#000',fontSize:9,fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:12,color:s.done?T.muted:T.text,textDecoration:s.done?'line-through':'none'}}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showKanbanMove&&(
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {KANBAN_COLS.filter(c=>c.id!==t.status).map(c=>(
                      <button key={c.id} onClick={()=>moveToStatus(t.id,c.id)}
                        style={{fontSize:10,padding:'3px 9px',borderRadius:6,border:`1px solid ${c.color}`,background:`${c.color}15`,color:c.color,cursor:'pointer',fontFamily:'inherit'}}>
                        → {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const ProjModals=()=><>
    {projModal&&<Modal title="Nuevo proyecto" onClose={()=>setProjModal(false)}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input value={projForm.title} onChange={v=>setProjForm(f=>({...f,title:v}))} placeholder="Nombre del proyecto"/>
        <Select value={projForm.areaId} onChange={v=>setProjForm(f=>({...f,areaId:v}))}>
          <option value="">Sin área</option>
          {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
        </Select>
        <Select value={projForm.objectiveId} onChange={v=>setProjForm(f=>({...f,objectiveId:v}))}>
          <option value="">Sin objetivo</option>
          {data.objectives.map(o=><option key={o.id} value={o.id}>{o.title}</option>)}
        </Select>
        <Btn onClick={saveProj} style={{width:'100%',justifyContent:'center'}}>Crear proyecto</Btn>
      </div>
    </Modal>}
    {taskModal&&<Modal title="Nueva tarea" onClose={()=>setTaskModal(false)}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input value={taskForm.title} onChange={v=>setTaskForm(f=>({...f,title:v}))} placeholder="¿Qué hay que hacer?"/>
        <Select value={taskForm.priority} onChange={v=>setTaskForm(f=>({...f,priority:v}))}>
          <option value="baja">🟢 Baja</option><option value="media">🟡 Media</option><option value="alta">🔴 Alta</option>
        </Select>
        <Input type="date" value={taskForm.dueDate} onChange={v=>setTaskForm(f=>({...f,dueDate:v}))}/>
        <Select value={taskForm.recurrence} onChange={v=>setTaskForm(f=>({...f,recurrence:v}))}>
          <option value="none">🔂 Sin repetición</option>
          <option value="daily">🔁 Diaria</option>
          <option value="weekly">📅 Semanal</option>
          <option value="monthly">🗓️ Mensual</option>
        </Select>
        <Btn onClick={saveTask} style={{width:'100%',justifyContent:'center'}}>Crear tarea</Btn>
      </div>
    </Modal>}
  </>;

  const ProjectList=()=>{
    const filteredObj=objFilter?data.objectives.find(o=>o.id===objFilter):null;
    const visibleProjects=objFilter?data.projects.filter(p=>p.objectiveId===objFilter):data.projects;
    return (
    <div>
      {filteredObj&&<div style={{background:`${T.purple}15`,border:`1px solid ${T.purple}30`,borderRadius:10,padding:'8px 14px',marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
        <span style={{color:T.purple,fontSize:12}}>🎯 Filtrando por: <strong>{filteredObj.title}</strong></span>
        <button onClick={()=>setObjFilter(null)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',fontSize:12}}>✕</button>
      </div>}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <Btn onClick={()=>setProjModal(true)} size="sm" style={{flex:1,justifyContent:'center'}}><Icon name="plus" size={12}/>Proyecto</Btn>
        {selProject&&<Btn onClick={()=>setTaskModal(true)} size="sm" variant="ghost" style={{flex:1,justifyContent:'center'}}><Icon name="plus" size={12}/>Tarea</Btn>}
      </div>
      {[UNASSIGNED,...visibleProjects].map(p=>{
        const tasks=p.id==='__unassigned__'?unassignedTasks:data.tasks.filter(t=>t.projectId===p.id);
        const done=tasks.filter(t=>t.status==='done').length;
        const pct=tasks.length?Math.round(done/tasks.length*100):0;
        const area=data.areas.find(a=>a.id===p.areaId);
        const isActive=selProject?.id===p.id;
        return (
          <div key={p.id} onClick={()=>openProject(p)}
            style={{padding:'12px 14px',borderRadius:10,cursor:'pointer',marginBottom:8,background:isActive?T.surface2:T.surface,border:`1px solid ${isActive?T.accent:T.border}`,transition:'border-color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=isActive?T.accent:T.border}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
              <div style={{color:T.text,fontSize:14,fontWeight:500,flex:1}}>{p.title}</div>
              {p.id!=='__unassigned__'&&<button onClick={e=>{e.stopPropagation();if(window.confirm('¿Eliminar proyecto y sus tareas?'))delProj(p.id);}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2}}><Icon name="trash" size={12}/></button>}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:tasks.length?6:0}}>
              {area&&<span style={{fontSize:11,color:area.color}}>{area.icon} {area.name}</span>}
              <span style={{fontSize:11,color:T.dim}}>{tasks.length} tareas · {done} hechas</span>
            </div>
            {tasks.length>0&&<div style={{height:3,background:T.border,borderRadius:2}}><div style={{height:'100%',width:`${pct}%`,background:pct===100?T.green:T.accent,borderRadius:2,transition:'width 0.3s'}}/></div>}
          </div>
        );
      })}
      {!visibleProjects.length&&!unassignedTasks.length&&<div style={{textAlign:'center',padding:'30px 0',color:T.dim}}>
        <Icon name="grid" size={40}/><p style={{marginTop:8,fontSize:13}}>Sin proyectos aún</p>
        <Btn size="sm" onClick={()=>setProjModal(true)} style={{marginTop:8}}><Icon name="plus" size={12}/>Nuevo proyecto</Btn>
      </div>}
    </div>
  );};

  const TaskDetail=()=>{
    if(!selProject) return <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:T.dim,textAlign:'center'}}><Icon name="check" size={48}/><p style={{marginTop:8}}>Selecciona un proyecto</p></div>;

    return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <h3 style={{color:T.text,fontSize:16,fontWeight:700,margin:0}}>{selProject.title}</h3>
          {totalPTasks>0&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>{donePct}% completado</div>}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setListView(listView==='list'?'kanban':'list')}
            style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
            {listView==='list'?'⬜ Kanban':'☰ Lista'}
          </button>
          <Btn size="sm" onClick={()=>setTaskModal(true)}><Icon name="plus" size={12}/>Tarea</Btn>
        </div>
      </div>

      {/* Progress + filters */}
      {totalPTasks>0&&<div style={{height:4,background:T.border,borderRadius:2,marginBottom:12,overflow:'hidden'}}><div style={{height:'100%',width:`${donePct}%`,background:T.accent,borderRadius:2,transition:'width 0.4s'}}/></div>}

      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        {/* Priority */}
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {[['all','Todos'],['alta','🔴 Alta'],['media','🟡 Media'],['baja','🟢 Baja']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilterPriority(v)}
              style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${filterPriority===v?(v==='alta'?T.red:v==='media'?T.accent:v==='baja'?T.green:T.accent):T.border}`,
                background:filterPriority===v?(v==='alta'?`${T.red}18`:v==='media'?`${T.accent}18`:v==='baja'?`${T.green}18`:`${T.accent}18`):'transparent',
                color:filterPriority===v?(v==='alta'?T.red:v==='media'?T.accent:v==='baja'?T.green:T.accent):T.muted,
                cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
              {l}
            </button>
          ))}
        </div>
        {/* Area */}
        {data.areas.length>0&&(
          <select value={filterArea} onChange={e=>setFilterArea(e.target.value)}
            style={{background:T.surface2,border:`1px solid ${filterArea!=='all'?T.purple:T.border}`,color:filterArea!=='all'?T.purple:T.muted,padding:'4px 8px',borderRadius:8,fontSize:11,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
            <option value="all">Todas las áreas</option>
            {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        )}
        {/* Deadline */}
        <select value={filterDeadline} onChange={e=>setFilterDeadline(e.target.value)}
          style={{background:T.surface2,border:`1px solid ${filterDeadline!=='all'?T.orange:T.border}`,color:filterDeadline!=='all'?T.orange:T.muted,padding:'4px 8px',borderRadius:8,fontSize:11,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
          <option value="all">Cualquier fecha</option>
          <option value="overdue">⚠️ Vencidas</option>
          <option value="today">📅 Hoy</option>
          <option value="week">🗓 Esta semana</option>
          <option value="nodate">— Sin fecha</option>
        </select>
        {/* Active filter count + reset */}
        {(filterPriority!=='all'||filterArea!=='all'||filterDeadline!=='all')&&(
          <button onClick={()=>{setFilterPriority('all');setFilterArea('all');setFilterDeadline('all');}}
            style={{marginLeft:'auto',padding:'4px 10px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.dim,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
            ✕ Limpiar filtros
          </button>
        )}
        {/* Select all toggle */}
        {filteredPTasks.length>0&&(
          <button onClick={toggleSelectAll}
            style={{marginLeft:'auto',padding:'4px 10px',borderRadius:8,
              border:`1px solid ${allSelected?T.accent:T.border}`,
              background:allSelected?`${T.accent}15`:'transparent',
              color:allSelected?T.accent:T.muted,
              cursor:'pointer',fontSize:11,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:13,height:13,borderRadius:3,border:`1.5px solid ${allSelected?T.accent:T.muted}`,
              background:allSelected?T.accent:'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {allSelected&&<span style={{color:'#000',fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
            </span>
            {allSelected?'Deseleccionar todo':'Seleccionar todo'}
          </button>
        )}
      </div>
      {/* BULK ACTION BAR — floats above bottom nav when tasks are selected */}
      {selectedTasks.length>0&&(
        <div style={{
          position:'sticky', bottom: isMobile ? 80 : 16,
          zIndex:40, margin:'16px 0 0',
          background:T.surface2,
          border:`1.5px solid ${T.accent}60`,
          borderRadius:14,
          padding:'10px 14px',
          display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
          boxShadow:`0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${T.accent}20`,
          animation:'slideIn 0.18s ease',
        }}>
          {/* Count pill */}
          <div style={{
            background:`${T.accent}20`, border:`1px solid ${T.accent}40`,
            borderRadius:20, padding:'3px 12px',
            fontSize:12, fontWeight:800, color:T.accent, flexShrink:0,
          }}>
            {selectedTasks.length} seleccionada{selectedTasks.length!==1?'s':''}
          </div>

          <div style={{display:'flex',gap:6,flex:1,flexWrap:'wrap'}}>
            {/* Mark done */}
            <button onClick={bulkMarkDone} style={{
              padding:'5px 12px', borderRadius:9,
              border:`1px solid ${T.green}60`, background:`${T.green}15`,
              color:T.green, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span style={{fontSize:13}}>✓</span> Completar
            </button>

            {/* Move to in-progress */}
            <button onClick={()=>bulkMoveToStatus('in-progress')} style={{
              padding:'5px 12px', borderRadius:9,
              border:`1px solid ${T.blue}60`, background:`${T.blue}15`,
              color:T.blue, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span style={{fontSize:13}}>▶</span> En progreso
            </button>

            {/* Move to pending */}
            <button onClick={()=>bulkMoveToStatus('todo')} style={{
              padding:'5px 12px', borderRadius:9,
              border:`1px solid ${T.muted}40`, background:`${T.muted}10`,
              color:T.muted, cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:5,
            }}>
              ↩ Pendiente
            </button>

            {/* Delete */}
            <button onClick={bulkDelete} style={{
              padding:'5px 12px', borderRadius:9,
              border:`1px solid ${T.red}50`, background:`${T.red}12`,
              color:T.red, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span style={{fontSize:13}}>🗑</span> Eliminar
            </button>
          </div>

          {/* Dismiss */}
          <button onClick={()=>setSelectedTasks([])} style={{
            background:'none', border:`1px solid ${T.border}`,
            borderRadius:8, padding:'4px 8px',
            color:T.dim, cursor:'pointer', fontSize:13, flexShrink:0,
          }} title="Deseleccionar todo">✕</button>
        </div>
      )}
      {/* Active filters summary */}
      {(filterPriority!=='all'||filterArea!=='all'||filterDeadline!=='all')&&(
        <div style={{fontSize:11,color:T.dim,marginBottom:8}}>
          {filteredPTasks.length} tarea{filteredPTasks.length!==1?'s':''} con los filtros aplicados
        </div>
      )}

      {/* LIST VIEW */}
      {listView==='list'&&(
        <div>
          {['todo','in-progress','done'].map(status=>{
            const stTasks=filteredPTasks.filter(t=>t.status===status||(status==='todo'&&!t.status));
            const col=KANBAN_COLS.find(c=>c.id===status);
            if(!stTasks.length)return null;
            return (
              <div key={status} style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:col?.color||T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{col?.label||status} ({stTasks.length})</div>
                {stTasks.map(t=><TaskRow key={t.id} t={t} showKanbanMove={true}/>)}
              </div>
            );
          })}
          {!filteredPTasks.length&&<div style={{textAlign:'center',padding:'24px 0',color:T.dim,fontSize:13}}>Sin tareas{filterPriority!=='all'?' con esta prioridad':''}</div>}
        </div>
      )}

      {/* KANBAN VIEW */}
      {listView==='kanban'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {KANBAN_COLS.map(col=>(
            <div key={col.id}
              onDragOver={e=>e.preventDefault()}
              onDrop={()=>{if(dragTask){moveToStatus(dragTask,col.id);setDragTask(null);}}}
              style={{background:T.surface2,borderRadius:10,padding:'8px 6px',border:`1px solid ${T.border}`,minHeight:120}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'0 4px'}}>
                <span style={{fontSize:11,fontWeight:700,color:col.color,textTransform:'uppercase',letterSpacing:0.5}}>{col.label}</span>
                <span style={{fontSize:10,color:T.muted,background:T.border,borderRadius:8,padding:'1px 6px'}}>{filteredPTasks.filter(t=>(t.status||'todo')===col.id).length}</span>
              </div>
              {filteredPTasks.filter(t=>(t.status||'todo')===col.id).map(t=>(
                <div key={t.id} draggable onDragStart={()=>setDragTask(t.id)}
                  style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'9px 10px',marginBottom:6,cursor:'grab',opacity:dragTask===t.id?0.4:1}}>
                  <div style={{fontSize:12,color:T.text,lineHeight:1.4,marginBottom:5}}>{t.title}</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,color:pColors[t.priority]||T.muted,fontWeight:600}}>{t.priority||'media'}</span>
                    {t.dueDate&&<span style={{fontSize:10,color:T.dim}}>{fmt(t.dueDate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );};

  if(isMobile) return (
    <div>
      {!showDetail&&<PageHeader title="Proyectos & Tareas" isMobile={isMobile}/>}
      {showDetail&&selProject&&<div style={{marginBottom:12}}><button onClick={()=>{setShowDetail(false);}} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:14,padding:0}}><Icon name="back" size={18}/>Proyectos</button></div>}
      {showDetail&&selProject?<TaskDetail/>:<ProjectList/>}
      <ProjModals/>
    </div>
  );

  return (
    <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:16,minHeight:400}}>
      <ProjectList/>
      <TaskDetail/>
      <ProjModals/>
    </div>
  );
};



export default ProjectsAndTasks;
