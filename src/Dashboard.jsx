import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== DASHBOARD =====================
// ===================== DASHBOARD — CENTRO DE COMANDO =====================
// Sub-components
const DB_ProgressBar = ({value,color,h=4}) => (
  <div style={{height:h,borderRadius:h,overflow:'hidden',background:'rgba(128,128,128,0.13)'}}>
    <div style={{height:'100%',width:`${Math.min(value||0,100)}%`,background:color,borderRadius:h,transition:'width .6s cubic-bezier(.4,0,.2,1)'}}/>
  </div>
);

const DB_Pill = ({label,color,bg}) => (
  <span style={{fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:700,background:bg,color,flexShrink:0,letterSpacing:.3}}>{label}</span>
);

const CAPTURE_DEST = [
  {id:'inbox',  label:'Inbox',   emoji:'📥'},
  {id:'task',   label:'Tarea',   emoji:'✅'},
  {id:'note',   label:'Nota',    emoji:'📝'},
  {id:'project',label:'Proyecto',emoji:'🎯'},
];

const DashCaptureBar = ({onCapture}) => {
  const [value,setValue]   = useState('');
  const [focused,setFocused] = useState(false);
  const [dest,setDest]     = useState('inbox');
  const inputRef           = useRef(null);

  const submit = () => {
    if(!value.trim()) return;
    onCapture({text:value.trim(),dest});
    setValue('');
    inputRef.current?.focus();
  };

  const activeDest = CAPTURE_DEST.find(d=>d.id===dest);

  return (
    <div style={{
      position:'sticky',top:0,zIndex:20,
      background:T.surface,
      borderBottom:`1px solid ${T.border}`,
      padding:'10px 0 12px',
      marginBottom:16,
    }}>
      {/* Input row */}
      <div style={{
        display:'flex',alignItems:'center',gap:8,
        background:T.surface2,
        border:`1.5px solid ${focused?T.accent:T.border}`,
        borderRadius:16,padding:'9px 12px',
        transition:'border-color .15s, box-shadow .15s',
        boxShadow:focused?`0 0 0 3px ${T.accent}18`:'none',
      }}>
        <span style={{color:focused?T.accent:T.dim,display:'flex',flexShrink:0,transition:'color .15s'}}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
          </svg>
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={e=>setValue(e.target.value)}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setFocused(false)}
          onKeyDown={e=>{if(e.key==='Enter')submit();if(e.key==='Escape'){setValue('');inputRef.current?.blur();}}}
          placeholder="Captura rápida… (Enter para guardar)"
          style={{flex:1,background:'transparent',outline:'none',fontSize:13,color:T.text,fontFamily:"'Playfair Display',serif",fontStyle:value?'normal':'italic'}}
        />
        {/* Destination toggle */}
        <button
          onMouseDown={e=>e.preventDefault()}
          onClick={()=>{const i=CAPTURE_DEST.findIndex(d=>d.id===dest);setDest(CAPTURE_DEST[(i+1)%CAPTURE_DEST.length].id);}}
          style={{flexShrink:0,display:'flex',alignItems:'center',gap:4,padding:'3px 8px',
            borderRadius:10,border:`1px solid ${T.border}`,background:'transparent',
            cursor:'pointer',fontSize:10,fontWeight:700,color:T.muted,fontFamily:'inherit'}}>
          <span style={{fontSize:11}}>{activeDest.emoji}</span>{activeDest.label}
        </button>
        {/* Send */}
        <button
          onMouseDown={e=>e.preventDefault()}
          onClick={submit}
          style={{flexShrink:0,width:28,height:28,borderRadius:10,
            background:value?T.accent:`${T.accent}22`,
            color:value?'#000':T.dim,
            border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            transition:'all .2s',fontFamily:'inherit'}}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      {/* Dest pills — show when focused or has text */}
      {(focused||value)&&(
        <div style={{display:'flex',gap:6,marginTop:8,animation:'dbSlideDown .12s ease'}}>
          {CAPTURE_DEST.map(d=>(
            <button key={d.id}
              onMouseDown={e=>e.preventDefault()}
              onClick={()=>setDest(d.id)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',
                borderRadius:20,border:`1px solid ${dest===d.id?T.accent:T.border}`,
                background:dest===d.id?`${T.accent}18`:'transparent',
                color:dest===d.id?T.accent:T.muted,
                fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .12s'}}>
              <span>{d.emoji}</span>{d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = ({data,setData,isMobile,onNavigate}) => {
  const todayStr=today();
  const h=new Date().getHours();
  const greeting=h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
  const storedName=(()=>{try{return localStorage.getItem('sb_user_name')||'';}catch{return '';}})();
  const [toast,setToast]       = useState(null);
  const [projExpanded,setProjExpanded] = useState(null);
  const [addingTask,setAddingTask]     = useState(false);
  const [newTaskText,setNewTaskText]   = useState('');
  const [newTaskProj,setNewTaskProj]   = useState('');
  const [inboxAction,setInboxAction]   = useState(null);
  const [inboxRouteTo,setInboxRouteTo] = useState('');

  const showToast = useCallback((emoji,msg)=>{
    setToast({emoji,msg});
    setTimeout(()=>setToast(null),2200);
  },[]);

  // ── Capture handler ──
  const handleCapture = useCallback(({text,dest})=>{
    if(dest==='inbox'||dest==='note'||dest==='project'){
      const item={id:uid(),content:text,createdAt:todayStr,processed:false};
      const updated=[item,...(data.inbox||[])];
      setData(d=>({...d,inbox:updated}));save('inbox',updated);
      showToast('📥','Guardado en Inbox');
    } else if(dest==='task'){
      const task={id:uid(),title:text,status:'todo',createdAt:todayStr,projectId:'',priority:'media',dueDate:todayStr};
      const updated=[...(data.tasks||[]),task];
      setData(d=>({...d,tasks:updated}));save('tasks',updated);
      showToast('✅','Tarea creada para hoy');
    }
  },[data,setData,todayStr,showToast]);

  // ── Projects ──
  const projects = data.projects||[];
  const areas    = data.areas||[];
  const getArea  = (areaId)=>areas.find(a=>a.id===areaId);
  const getProjColor = (p)=>getArea(p.areaId)?.color||T.accent;
  const getProjTasks = (projId)=>(data.tasks||[]).filter(t=>t.projectId===projId);
  const getProjProgress = (projId)=>{
    const pt=getProjTasks(projId);
    if(!pt.length) return 0;
    return Math.round(pt.filter(t=>t.status==='done').length/pt.length*100);
  };

  // ── Tasks ──
  const todayTasks=(data.tasks||[]).filter(t=>!t.dueDate||t.dueDate===todayStr||t.status!=='done');
  const sortedTasks=[...todayTasks].sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')).slice(0,8);
  const doneCount=todayTasks.filter(t=>t.status==='done').length;

  const toggleTask=(taskId)=>{
    const updated=(data.tasks||[]).map(t=>t.id===taskId?{...t,status:t.status==='done'?'todo':'done'}:t);
    setData(d=>({...d,tasks:updated}));save('tasks',updated);
  };
  const deleteTask=(taskId)=>{
    const updated=(data.tasks||[]).filter(t=>t.id!==taskId);
    setData(d=>({...d,tasks:updated}));save('tasks',updated);
  };
  const addTask=()=>{
    if(!newTaskText.trim()) return;
    const task={id:uid(),title:newTaskText.trim(),status:'todo',createdAt:todayStr,projectId:newTaskProj,priority:'media',dueDate:todayStr};
    const updated=[...(data.tasks||[]),task];
    setData(d=>({...d,tasks:updated}));save('tasks',updated);
    setNewTaskText('');setAddingTask(false);
  };

  // ── Habits ──
  const HABIT_COLORS=['#4da6ff',T.accent,'#ff8c42','#a78bfa','#ff5069','#ffd166'];
  const dailyHabits=(data.habits||[]).filter(hb=>!hb.frequency||hb.frequency==='daily');
  const getHabitColor=(hb,idx)=>hb.color||(HABIT_COLORS[idx%HABIT_COLORS.length]);
  const isHabitDone=(hb)=>hb.completions?.includes(todayStr);
  const getStreak=(hb)=>{
    let s=0;const d=new Date();
    while(true){
      const str=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if(!(hb.completions||[]).includes(str)) break;
      s++;d.setDate(d.getDate()-1);
    }
    return s;
  };
  const habitsDone=dailyHabits.filter(isHabitDone).length;
  const toggleHabit=(habitId)=>{
    const updated=(data.habits||[]).map(hb=>{
      if(hb.id!==habitId) return hb;
      const has=hb.completions?.includes(todayStr);
      return {...hb,completions:has?hb.completions.filter(d=>d!==todayStr):[...(hb.completions||[]),todayStr]};
    });
    setData(d=>({...d,habits:updated}));save('habits',updated);
  };

  // ── Inbox ──
  const inboxItems=(data.inbox||[]).filter(i=>!i.processed);
  const processInbox=(item,dest)=>{
    if(dest==='task'){
      const task={id:uid(),title:item.content,status:'todo',createdAt:todayStr,projectId:inboxRouteTo,priority:'media',dueDate:todayStr};
      const updT=[...(data.tasks||[]),task];
      setData(d=>({...d,tasks:updT}));save('tasks',updT);
      showToast('✅','Movido a tareas');
    } else if(dest==='delete'){
      showToast('🗑','Eliminado');
    } else {
      showToast('⏸','Queda para después');
    }
    if(dest!=='later'){
      const updI=(data.inbox||[]).map(i=>i.id===item.id?{...i,processed:true}:i);
      setData(d=>({...d,inbox:updI}));save('inbox',updI);
    }
    setInboxAction(null);
  };

  // ── Challenge profile ──────────────────────────────────────────────────
  const challenge=(()=>{ try{ return localStorage.getItem('sb_challenge')||null; }catch{ return null; } })();

  // Save challenge from onboarding if stored in progress (one-time migration)
  useEffect(()=>{
    try{
      const prog=JSON.parse(localStorage.getItem('sb_onboarding_progress')||'{}');
      if(prog.challenge && !localStorage.getItem('sb_challenge')){
        localStorage.setItem('sb_challenge', prog.challenge);
      }
    }catch{}
  },[]);

  // Per-challenge config: focusMsg, widget order, which KPIs to highlight
  const PROFILES = {
    capt:  { emoji:'📥', color:T.orange,  focusMsg:'¿Qué tienes en la cabeza que no has anotado?',    order:['capture','kpi','inbox','tasks','projects','habits','pillars'] },
    prio:  { emoji:'🎯', color:T.accent,  focusMsg:'¿Qué mueve la aguja hoy?',                        order:['capture','kpi','tasks','projects','objectives_mini','habits','pillars'] },
    habit: { emoji:'🔥', color:'#ff8c42', focusMsg:'Un día a la vez — ¿cómo van los hábitos de hoy?', order:['capture','kpi','habits','tasks','projects','pillars'] },
    proj:  { emoji:'📁', color:'#a78bfa', focusMsg:'¿Cuál es el siguiente paso en tu proyecto?',      order:['capture','kpi','projects','tasks','habits','inbox','pillars'] },
    over:  { emoji:'🌿', color:T.blue,    focusMsg:'Solo una cosa a la vez. Tú puedes.',              order:['capture','kpi_mini','tasks_top1','habits','pillars'] },
  };
  const profile = challenge ? PROFILES[challenge] : null;

  // ── Active objectives mini widget (for 'prio') ──
  const activeObjs=(data.objectives||[]).filter(o=>o.status==='active').slice(0,3);

  // ── Top 1 task for 'over' mode ──
  const topTask = sortedTasks.find(t=>t.status!=='done') || sortedTasks[0];

  // ── Widget renderer ─────────────────────────────────────────────────────
  const widgets = {
    capture: (
      <DashCaptureBar key="capture" onCapture={handleCapture}/>
    ),
    kpi: (
      <div key="kpi" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
        {[
          {label:'Hoy',     val:`${doneCount}/${todayTasks.length}`,  color: challenge==='prio'?T.accent:T.accent,  icon:'✅', view:'projects', highlight: challenge==='prio'},
          {label:'Inbox',   val:inboxItems.length,                     color:T.orange,  icon:'📥', view:'inbox',    highlight: challenge==='capt'},
          {label:'Hábitos', val:`${habitsDone}/${dailyHabits.length}`, color:T.purple,  icon:'🔥', view:'habits',   highlight: challenge==='habit'},
        ].map(k=>(
          <div key={k.label} onClick={()=>onNavigate&&onNavigate(k.view,null)}
            style={{background:k.highlight?`${k.color}14`:T.surface,
              border:`1px solid ${k.highlight?k.color:T.border}`,
              borderRadius:14,padding:'10px 10px 8px',textAlign:'center',cursor:'pointer',
              transition:'all .2s',
              boxShadow:k.highlight?`0 0 0 1px ${k.color}30, 0 4px 16px ${k.color}18`:'none'}}>
            <div style={{fontSize:16,marginBottom:4}}>{k.icon}</div>
            <div style={{fontSize:17,fontWeight:800,color:k.color,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:9,color:T.muted,marginTop:3,fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>{k.label}</div>
          </div>
        ))}
      </div>
    ),
    kpi_mini: (
      /* Modo 'abrumado': solo 1 stat — tareas de hoy */
      <div key="kpi_mini" style={{marginBottom:16}}>
        <div onClick={()=>onNavigate&&onNavigate('projects',null)}
          style={{background:T.surface,border:`2px solid ${T.blue}`,borderRadius:18,padding:'16px',
            display:'flex',alignItems:'center',gap:14,cursor:'pointer'}}>
          <div style={{fontSize:28,lineHeight:1}}>✅</div>
          <div>
            <div style={{fontSize:24,fontWeight:900,color:T.blue,lineHeight:1}}>{doneCount}<span style={{fontSize:14,color:T.muted,fontWeight:500}}>/{todayTasks.length}</span></div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>tareas completadas hoy</div>
          </div>
          {doneCount===todayTasks.length&&todayTasks.length>0&&(
            <div style={{marginLeft:'auto',fontSize:22}}>🎉</div>
          )}
        </div>
      </div>
    ),
    tasks_top1: (
      /* Modo 'abrumado': solo muestra LA tarea más importante */
      <div key="tasks_top1" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:16,marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.8,color:T.muted,marginBottom:12}}>✅ Tu tarea más importante ahora</div>
        {topTask ? (
          <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
            <button onClick={()=>toggleTask(topTask.id)}
              style={{background:'none',border:'none',padding:0,marginTop:2,cursor:'pointer',
                color:topTask.status==='done'?T.accent:T.dim,flexShrink:0,fontSize:20}}>
              {topTask.status==='done'?'✓':'○'}
            </button>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:15,fontWeight:600,color:T.text,lineHeight:1.4,
                textDecoration:topTask.status==='done'?'line-through':'none'}}>
                {topTask.title}
              </p>
              {topTask.status!=='done'&&(
                <p style={{margin:'6px 0 0',fontSize:11,color:T.muted}}>
                  Una vez hecha esto, todo lo demás puede esperar.
                </p>
              )}
            </div>
          </div>
        ):(
          <div style={{textAlign:'center',padding:'12px 0',color:T.dim,fontSize:13}}>🎉 ¡Sin tareas pendientes!</div>
        )}
        <button onClick={()=>onNavigate&&onNavigate('projects',null)}
          style={{marginTop:12,width:'100%',background:'transparent',border:`1px solid ${T.border}`,
            borderRadius:10,padding:'7px 0',fontSize:11,color:T.muted,cursor:'pointer',fontFamily:'inherit'}}>
          Ver todas las tareas →
        </button>
      </div>
    ),
    projects: (
      <div key="projects" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
          <span style={{color:T.muted,fontSize:10}}>🎯</span>
          <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.8,color:T.muted}}>Proyectos activos</span>
          <button onClick={()=>onNavigate&&onNavigate('projects',null)}
            style={{marginLeft:'auto',background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'2px 10px',cursor:'pointer',color:T.muted,fontSize:10,fontFamily:'inherit'}}>
            Ver todos →
          </button>
        </div>
        {projects.length===0?(
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'16px',textAlign:'center',color:T.dim,fontSize:12}}>
            Sin proyectos — <span style={{color:T.accent,cursor:'pointer'}} onClick={()=>onNavigate&&onNavigate('projects',null)}>crear uno →</span>
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {projects.slice(0, challenge==='proj'?6:4).map(p=>{
              const color=getProjColor(p);
              const pct=getProjProgress(p.id);
              const pt=getProjTasks(p.id);
              const isOpen=projExpanded===p.id;
              const area=getArea(p.areaId);
              // In 'proj' mode, highlight next action
              const nextAction=pt.find(t=>t.status!=='done');
              return (
                <div key={p.id} style={{background:T.surface,border:`1px solid ${isOpen?T.borderLight:T.border}`,borderRadius:18,overflow:'hidden',transition:'border-color .2s'}}>
                  <button onClick={()=>setProjExpanded(isOpen?null:p.id)}
                    style={{width:'100%',background:'transparent',border:'none',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                    <span style={{fontSize:19,flexShrink:0}}>{p.emoji||'📁'}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:12,fontWeight:700,color:T.text}}>{p.title||p.name}</span>
                        <span style={{fontSize:11,fontWeight:800,color,marginLeft:8}}>{pct}%</span>
                      </div>
                      <DB_ProgressBar value={pct} color={color}/>
                      {challenge==='proj'&&nextAction&&(
                        <p style={{margin:'5px 0 0',fontSize:10,color:T.muted,lineHeight:1.3}}>
                          → {nextAction.title}
                        </p>
                      )}
                    </div>
                    <span style={{color:T.dim,display:'flex',fontSize:12,transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}>▾</span>
                  </button>
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${T.border}`,padding:'10px 14px 14px',background:T.surface2,animation:'dbSlideDown .15s ease'}}>
                      <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
                        {area&&<DB_Pill label={`${area.icon} ${area.name}`} color={area.color} bg={`${area.color}18`}/>}
                        <DB_Pill label={`${pt.filter(t=>t.status==='done').length}/${pt.length} tareas`} color={color} bg={`${color}18`}/>
                      </div>
                      {pt.slice(0,3).map(t=>(
                        <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:t.status==='done'?T.dim:T.textSoft||T.muted,marginBottom:5}}>
                          <span style={{color:t.status==='done'?color:T.dim,fontSize:13}}>{t.status==='done'?'✓':'○'}</span>
                          <span style={{textDecoration:t.status==='done'?'line-through':'none',flex:1,lineHeight:1.3}}>{t.title}</span>
                        </div>
                      ))}
                      <div style={{display:'flex',gap:8,marginTop:10}}>
                        <button onClick={()=>onNavigate&&onNavigate('projects',p.id)}
                          style={{flex:1,background:`${color}18`,color,border:'none',borderRadius:10,padding:'8px 0',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          Ver tareas
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    tasks: (
      <div key="tasks" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:14,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:12,marginRight:6}}>✅</span>
          <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.8,color:T.muted}}>Tareas de hoy</span>
          <div style={{flex:1,margin:'0 10px'}}>
            <div style={{height:3,borderRadius:2,overflow:'hidden',background:'rgba(128,128,128,0.14)'}}>
              <div style={{height:'100%',width:`${todayTasks.length?(doneCount/todayTasks.length)*100:0}%`,background:T.accent,borderRadius:2,transition:'width .5s'}}/>
            </div>
          </div>
          <span style={{fontSize:10,color:T.muted,marginRight:8}}>{doneCount}/{todayTasks.length}</span>
          <button onClick={()=>setAddingTask(v=>!v)}
            style={{width:22,height:22,borderRadius:8,background:`${T.accent}20`,color:T.accent,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontFamily:'inherit'}}>+</button>
        </div>
        {addingTask&&(
          <div style={{marginBottom:10,animation:'dbSlideDown .12s ease'}}>
            <input value={newTaskText} onChange={e=>setNewTaskText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')addTask();if(e.key==='Escape'){setAddingTask(false);setNewTaskText('');}}}
              placeholder="Descripción de la tarea… (Enter)" autoFocus
              style={{width:'100%',background:T.surface2,border:`1px solid ${T.accent}50`,borderRadius:10,padding:'8px 12px',fontSize:12,color:T.text,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8}}/>
            <div style={{display:'flex',gap:5,overflowX:'auto',scrollbarWidth:'none',paddingBottom:4}}>
              {projects.slice(0,5).map(p=>{
                const c=getProjColor(p);
                return (
                  <button key={p.id} onClick={()=>setNewTaskProj(p.id)}
                    style={{flexShrink:0,padding:'3px 9px',borderRadius:20,border:`1.5px solid ${newTaskProj===p.id?c:T.border}`,
                      background:newTaskProj===p.id?`${c}18`:'transparent',color:newTaskProj===p.id?c:T.muted,
                      fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {p.emoji||'📁'} {(p.title||p.name||'').split(' ').slice(0,2).join(' ')}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          {sortedTasks.map((task,i)=>{
            const proj=projects.find(p=>p.id===task.projectId);
            const color=proj?getProjColor(proj):T.dim;
            return (
              <div key={task.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:i<sortedTasks.length-1?`1px solid ${T.border}`:'none',
                opacity:task.status==='done'?0.5:1,transition:'opacity .2s'}}
                className="db-task-row">
                <button onClick={()=>toggleTask(task.id)}
                  style={{background:'none',border:'none',padding:0,marginTop:1,cursor:'pointer',color:task.status==='done'?color:T.dim,flexShrink:0,display:'flex',fontSize:16}}>
                  {task.status==='done'?'✓':'○'}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:12,color:task.status==='done'?T.dim:T.text,textDecoration:task.status==='done'?'line-through':'none',lineHeight:1.35}}>{task.title}</p>
                  {proj&&<span style={{fontSize:9,color,fontWeight:700,opacity:.8,letterSpacing:.3}}>{proj.emoji||'📁'} {proj.title||proj.name}</span>}
                </div>
                <button onClick={()=>deleteTask(task.id)} className="db-del-btn"
                  style={{background:'none',border:'none',padding:3,cursor:'pointer',color:T.dim,display:'flex',borderRadius:6,opacity:0,transition:'opacity .15s',fontFamily:'inherit'}}>✕</button>
              </div>
            );
          })}
          {todayTasks.length===0&&<div style={{textAlign:'center',padding:'16px 0',color:T.dim,fontSize:12}}>🎉 Sin tareas pendientes</div>}
        </div>
      </div>
    ),
    habits: (
      dailyHabits.length>0?(
        <div key="habits" style={{background:T.surface,border:`1px solid ${challenge==='habit'?T.orange:T.border}`,
          borderRadius:18,padding:14,marginBottom:16,
          boxShadow:challenge==='habit'?`0 0 0 1px ${'#ff8c42'}22, 0 4px 20px ${'#ff8c42'}12`:'none',
          transition:'all .2s'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:12,marginRight:6}}>🔥</span>
            <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.8,color:T.muted}}>Hábitos</span>
            {challenge==='habit'&&habitsDone>0&&(
              <span style={{marginLeft:8,fontSize:10,color:'#ff8c42',fontWeight:700}}>¡{habitsDone} completado{habitsDone!==1?'s':''}!</span>
            )}
            <span style={{marginLeft:'auto',fontSize:10,color:T.muted}}>{habitsDone}/{dailyHabits.length} hoy</span>
            <button onClick={()=>onNavigate&&onNavigate('habits',null)}
              style={{marginLeft:8,background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'2px 8px',cursor:'pointer',color:T.dim,fontSize:10,fontFamily:'inherit'}}>Ver →</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(dailyHabits.length,4)},1fr)`,gap:8}}>
            {dailyHabits.slice(0,8).map((hb,idx)=>{
              const done=isHabitDone(hb);
              const hc=getHabitColor(hb,idx);
              const streak=getStreak(hb);
              return (
                <button key={hb.id} onClick={()=>toggleHabit(hb.id)}
                  style={{borderRadius:16,padding: challenge==='habit'?'14px 6px 10px':'10px 6px 8px',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                    background:done?`${hc}18`:'rgba(128,128,128,0.04)',
                    border:`1.5px solid ${done?hc:T.border}`,
                    cursor:'pointer',transition:'all .2s',transform:done?'scale(1.04)':'scale(1)',fontFamily:'inherit'}}>
                  <span style={{fontSize: challenge==='habit'?22:18}}>{hb.emoji||'⭕'}</span>
                  {streak>0&&<span style={{fontSize:9,fontWeight:800,color:done?hc:T.dim}}>🔥{streak}</span>}
                  <span style={{fontSize:9,color:T.muted,textAlign:'center',lineHeight:1.2}}>{hb.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ):null
    ),
    inbox: (
      <div key="inbox" style={{background:T.surface,border:`1px solid ${challenge==='capt'?T.orange:T.border}`,
        borderRadius:18,padding:14,marginBottom:16,
        boxShadow:challenge==='capt'?`0 0 0 1px ${T.orange}22, 0 4px 20px ${T.orange}12`:'none'}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:12,marginRight:6}}>📥</span>
          <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.8,color:T.muted}}>Inbox</span>
          {inboxItems.length>0&&<span style={{marginLeft:6,background:T.red,color:'#fff',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:8}}>{inboxItems.length}</span>}
          <button onClick={()=>onNavigate&&onNavigate('inbox',null)}
            style={{marginLeft:'auto',background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'2px 8px',cursor:'pointer',color:T.muted,fontSize:10,fontFamily:'inherit'}}>
            Ver todo →
          </button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          {inboxItems.slice(0,6).map((item,i)=>(
            <div key={item.id}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:inboxAction===item.id?T.accent:T.dim,transition:'background .15s'}}/>
                <span style={{flex:1,fontSize:12,color:T.text,lineHeight:1.3}}>{item.content}</span>
                <span style={{fontSize:9,color:T.dim,flexShrink:0}}>{fmt(item.createdAt)}</span>
                <button onClick={()=>setInboxAction(inboxAction===item.id?null:item.id)}
                  style={{flexShrink:0,background:inboxAction===item.id?`${T.accent}18`:'transparent',color:inboxAction===item.id?T.accent:T.muted,
                    border:'none',borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                  {inboxAction===item.id?'✕':'→'}
                </button>
              </div>
              {inboxAction===item.id&&(
                <div style={{background:T.surface2,padding:'10px 0 12px',borderBottom:`1px solid ${T.border}`,animation:'dbSlideDown .12s ease'}}>
                  <p style={{fontSize:10,color:T.muted,marginBottom:8}}>Procesar como:</p>
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    {[{label:'✅ Tarea',dest:'task',color:T.accent},{label:'🗑 Borrar',dest:'delete',color:T.red},{label:'⏸ Después',dest:'later',color:T.muted}].map(btn=>(
                      <button key={btn.dest} onClick={()=>processInbox(item,btn.dest)}
                        style={{flex:1,padding:'7px 0',borderRadius:10,fontSize:10,fontWeight:700,background:`${btn.color}18`,color:btn.color,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:5,overflowX:'auto',scrollbarWidth:'none'}}>
                    {projects.slice(0,5).map(p=>{
                      const c=getProjColor(p);
                      return (
                        <button key={p.id} onClick={()=>setInboxRouteTo(p.id)}
                          style={{flexShrink:0,padding:'3px 8px',borderRadius:20,border:`1px solid ${inboxRouteTo===p.id?c:T.border}`,
                            background:inboxRouteTo===p.id?`${c}18`:'transparent',color:inboxRouteTo===p.id?c:T.dim,
                            fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          {p.emoji||'📁'} {(p.title||p.name||'').split(' ').slice(0,2).join(' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          {inboxItems.length===0&&<div style={{textAlign:'center',padding:'14px 0',color:T.dim,fontSize:12}}>✨ Inbox vacío — excelente</div>}
        </div>
      </div>
    ),
    objectives_mini: (
      activeObjs.length>0?(
        <div key="objectives_mini" style={{marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.8,color:T.muted,marginBottom:8}}>🎯 Objetivos activos</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {activeObjs.map(o=>(
              <div key={o.id} onClick={()=>onNavigate&&onNavigate('objectives',null)}
                style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
                  padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:16}}>🎯</span>
                <span style={{flex:1,fontSize:12,color:T.text,fontWeight:500,lineHeight:1.3}}>{o.title}</span>
                <span style={{fontSize:10,color:T.muted,flexShrink:0}}>{o.deadline}</span>
              </div>
            ))}
          </div>
        </div>
      ):null
    ),
    pillars: (
      <div key="pillars" style={{marginTop:16}}>
        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>Pilares</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[
            {label:'Salud',      icon:'💪', route:'health',       color:'#4da6ff'},
            {label:'Finanzas',   icon:'💰', route:'finance',      color:T.accent},
            {label:'Hogar',      icon:'🏠', route:'hogar',        color:'#a78bfa'},
            {label:'Relaciones', icon:'👥', route:'relaciones',   color:'#ff8c42'},
            {label:'Desarrollo', icon:'🧠', route:'desarrollo',   color:'#ff5069'},
            {label:'S.Projects', icon:'🚀', route:'sideprojects', color:'#ffd166'},
            {label:'Trabajo',    icon:'💼', route:'trabajo',      color:'#4da6ff'},
            {label:'Objetivos',  icon:'🎯', route:'objectives',   color:T.accent},
          ].map(p=>(
            <div key={p.route} onClick={()=>onNavigate&&onNavigate(p.route,null)}
              style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'10px 6px',textAlign:'center',cursor:'pointer',transition:'all 0.15s',borderTop:`3px solid ${p.color}`}}>
              <div style={{fontSize:20,marginBottom:4}}>{p.icon}</div>
              <div style={{fontSize:10,fontWeight:600,color:T.muted,lineHeight:1.2}}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  // Widget order based on challenge profile
  const widgetOrder = profile ? profile.order : ['capture','kpi','projects','tasks','habits','inbox','pillars'];

  return (
    <div>
      {/* ── Focus banner ── */}
      {profile&&(
        <div style={{
          background:`${profile.color}0e`,
          border:`1px solid ${profile.color}28`,
          borderRadius:14,padding:'10px 14px',marginBottom:16,
          display:'flex',alignItems:'center',gap:10,
        }}>
          <span style={{fontSize:18,flexShrink:0}}>{profile.emoji}</span>
          <p style={{margin:0,fontSize:12,color:T.muted,lineHeight:1.4,fontStyle:'italic'}}>
            {profile.focusMsg}
          </p>
        </div>
      )}

      {/* ── Render widgets in challenge order ── */}
      {widgetOrder.map(key=>widgets[key]||null)}

      {/* Toast */}
      {toast&&(
        <div style={{position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',
          background:T.surface,border:`1px solid ${T.borderLight||T.border}`,
          borderRadius:16,padding:'10px 18px',display:'flex',alignItems:'center',gap:8,
          boxShadow:'0 8px 32px rgba(0,0,0,0.35)',zIndex:500,whiteSpace:'nowrap',
          animation:'dbToastIn .2s ease'}}>
          <span style={{fontSize:16}}>{toast.emoji}</span>
          <span style={{fontSize:12,fontWeight:600,color:T.text}}>{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes dbSlideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dbToastIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .db-task-row:hover .db-del-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
};


export default Dashboard;
