import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== HEALTH =====================
const Health = ({data,setData,isMobile,onBack}) => {
  const [tab,setTab]=useState('trends');
  const [metric,setMetric]=useState('peso');
  const [workoutModal,setWorkoutModal]=useState(false);
  const [metricModal,setMetricModal]=useState(false);
  const [medModal,setMedModal]=useState(false);
  const [wForm,setWForm]=useState({type:'Gym',date:today(),duration:60,calories:0,distance:''});
  const [mForm,setMForm]=useState({metric:'peso',value:'',date:today()});
  const [medForm,setMedForm]=useState({name:'',dose:'',unit:'mg',frequency:'Diaria',time:'08:00',notes:''});
  // Scheduled notification interval refs: { medId: intervalId }
  const notifRefs=useRef({});

  const meds=data.medications||[];
  const medVisits=data.medicalVisits||[];
  const medDocs=data.medicalDocs||[];
  const [visitModal,setVisitModal]=useState(false);
  const [docModal,setDocModal]=useState(false);
  const [vForm,setVForm]=useState({date:'',specialty:'',doctor:'',clinic:'',reason:'',diagnosis:'',treatment:'',nextVisit:'',cost:'',notes:''});
  const [dForm,setDForm]=useState({date:'',type:'analítica',title:'',description:'',lab:'',results:'',notes:''});
  const [visitDetail,setVisitDetail]=useState(null);

  const saveMed=()=>{
    if(!medForm.name.trim())return;
    const m={id:uid(),...medForm,createdAt:today()};
    const upd=[m,...meds];
    setData(d=>({...d,medications:upd}));save('medications',upd);
    setMedModal(false);setMedForm({name:'',dose:'',unit:'mg',frequency:'Diaria',time:'08:00',notes:''});
    toast.success(`💊 ${m.name} agregado`);
  };
  const delMed=(id)=>{
    // Cancel any pending notification for this med
    clearTimeout(notifRefs.current[id]);
    const upd=meds.filter(m=>m.id!==id);
    setData(d=>({...d,medications:upd}));save('medications',upd);
  };
  const scheduleMedNotif=(med)=>{
    if(!('Notification' in window)||Notification.permission!=='granted'){
      toast.warn('Activa las notificaciones del navegador en Configuración primero.');
      return;
    }
    const [hh,mm]=(med.time||'08:00').split(':').map(Number);
    const now=new Date();
    const next=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm,0,0);
    if(next<=now) next.setDate(next.getDate()+1);
    const ms=next-now;
    clearTimeout(notifRefs.current[med.id]);
    notifRefs.current[med.id]=setTimeout(()=>{
      new Notification(`💊 Medicamento: ${med.name}`,{
        body:`${med.dose}${med.unit} — ${med.frequency}`,
        icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">💊</text></svg>'
      });
    },ms);
    toast.success(`🔔 Recordatorio de ${med.name} programado para las ${med.time}`);
  };

  const workouts=data.workouts||[];
  const metrics=data.healthMetrics||{};

  const saveWorkout=()=>{
    if(!wForm.type||!wForm.duration)return;
    const upd=[{id:uid(),...wForm,duration:Number(wForm.duration),calories:Number(wForm.calories||0)},...workouts];
    setData(d=>({...d,workouts:upd}));save('workouts',upd);
    setWorkoutModal(false);setWForm({type:'Gym',date:today(),duration:60,calories:0,distance:''});
  };
  const saveMetric=()=>{
    if(!mForm.value)return;
    const key=mForm.metric;
    const entry={date:mForm.date,value:Number(mForm.value)};
    const prev=metrics[key]||[];
    const upd={...metrics,[key]:[...prev.filter(e=>e.date!==mForm.date),entry].sort((a,b)=>a.date.localeCompare(b.date))};
    setData(d=>({...d,healthMetrics:upd}));save('healthMetrics',upd);
    setMetricModal(false);setMForm({metric:'peso',value:'',date:today()});
  };
  const delWorkout=(id)=>{const u=workouts.filter(w=>w.id!==id);setData(d=>({...d,workouts:u}));save('workouts',u);};

  const [goalEditModal,setGoalEditModal]=useState(false);
  const [goalForm,setGoalForm]=useState({});

  const hGoals=data.healthGoals||{peso:75,sueño:8,pasos:10000,agua:2,entrenosSem:4};

  const saveHealthGoal=(key,val)=>{
    const upd={...hGoals,[key]:Number(val)};
    setData(d=>({...d,healthGoals:upd}));save('healthGoals',upd);
  };

  const METRIC_CFG={
    peso:  {label:'Peso',  unit:'kg',color:T.blue,   goal:hGoals.peso||75, icon:'⚖️',lowerBetter:true},
    sueño: {label:'Sueño', unit:'h', color:T.purple,  goal:hGoals.sueño||8,  icon:'😴',lowerBetter:false},
    pasos: {label:'Pasos', unit:'',  color:T.accent,  goal:hGoals.pasos||10000, icon:'👟',lowerBetter:false},
    agua:  {label:'Agua',  unit:'L', color:T.blue,    goal:hGoals.agua||2,   icon:'💧',lowerBetter:false},
  };

  const cfg=METRIC_CFG[metric]||METRIC_CFG.peso;
  const mData=metrics[metric]||[];
  const latest=mData.length?mData[mData.length-1]?.value:null;
  const prev=mData.length>1?mData[mData.length-2]?.value:null;
  const delta=latest!=null&&prev!=null?(latest-prev):null;
  const goalPct=latest!=null?Math.min(Math.round((latest/cfg.goal)*100),200):0;
  const goalColor=cfg.lowerBetter
    ?(goalPct<=100?T.accent:goalPct<=120?T.orange:T.red)
    :(goalPct>=100?T.accent:goalPct>=70?T.orange:T.red);

  // Workout stats
  const last7Days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
  const weekWorkouts=workouts.filter(w=>last7Days.includes(w.date));
  const weekCal=weekWorkouts.reduce((s,w)=>s+(w.calories||0),0);
  const weekMin=weekWorkouts.reduce((s,w)=>s+(w.duration||0),0);

  // Workout streak
  const sortedDates=[...new Set(workouts.map(w=>w.date))].sort().reverse();
  let wStreak=0;
  const ref=new Date();
  for(let i=0;i<sortedDates.length;i++){
    const d=new Date(sortedDates[i]);
    const diff=Math.floor((ref-d)/86400000);
    if(diff===i||(i===0&&diff<=1)){wStreak++;}else break;
  }
  // Best workout streak
  const wBestStreak=(()=>{
    if(!sortedDates.length)return 0;
    const asc=[...sortedDates].reverse();
    let maxS=1,cur=1;
    for(let i=1;i<asc.length;i++){
      const diff=(new Date(asc[i])-new Date(asc[i-1]))/86400000;
      if(diff===1){cur++;maxS=Math.max(maxS,cur);}else cur=1;
    }
    return maxS;
  })();
  // Workout heatmap - last 14 days
  const wHeatmap=Array.from({length:14},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(13-i));
    const str=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const count=workouts.filter(w=>w.date===str).length;
    return {date:str,count,label:d.toLocaleDateString('es-ES',{weekday:'narrow'})};
  });

  // Weekly summary data
  const weekSummary=(()=>{
    const now=new Date();
    const weekStart=new Date(now);weekStart.setDate(now.getDate()-6);
    const wsStr=`${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2,'0')}-${String(weekStart.getDate()).padStart(2,'0')}`;
    const wkWorkouts=workouts.filter(w=>w.date>=wsStr);
    const wkMin=wkWorkouts.reduce((s,w)=>s+(w.duration||0),0);
    const wkCal=wkWorkouts.reduce((s,w)=>s+(w.calories||0),0);
    const metricDeltas=Object.entries(METRIC_CFG).map(([k,c])=>{
      const mEntries=metrics[k]||[];
      const recent=mEntries.filter(e=>e.date>=wsStr);
      if(recent.length<2)return {key:k,...c,delta:null};
      const first=recent[0].value,last=recent[recent.length-1].value;
      return {key:k,...c,delta:last-first,last};
    });
    const dailyHabits=(data.habits||[]).filter(h=>!h.frequency||h.frequency==='daily');
    const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
    const habitTotal=dailyHabits.reduce((s,h)=>s+last7.filter(d=>h.completions.includes(d)).length,0);
    const habitPossible=dailyHabits.length*7;
    const habitPct=habitPossible?Math.round(habitTotal/habitPossible*100):0;
    return {workouts:wkWorkouts.length,min:wkMin,cal:wkCal,metricDeltas,habitPct};
  })();

  const WORKOUT_TYPES=['Gym','Correr','Ciclismo','Natación','Yoga','HIIT','Caminata','Otro'];
  const wtIcon=(t)=>t==='Correr'?'🏃':t==='Gym'?'🏋️':t==='Ciclismo'?'🚴':t==='Natación'?'🏊':t==='Yoga'?'🧘':t==='HIIT'?'⚡':t==='Caminata'?'🚶':'💪';

  const fmtVal=v=>metric==='pasos'?Number(v).toLocaleString():v;

  const GOALS=[
    {label:'Peso objetivo',icon:'⚖️',metricKey:'peso',current:mData.length&&metric==='peso'?mData[mData.length-1].value+'kg':((metrics.peso||[]).length?(metrics.peso||[]).slice(-1)[0].value+'kg':'—'),goal:`${hGoals.peso||75} kg`,pct:Math.min(Math.round(((metrics.peso||[]).length?((hGoals.peso||75)/(metrics.peso||[]).slice(-1)[0].value)*100:0)),100),color:T.blue,inv:true},
    {label:'Sueño promedio',icon:'😴',metricKey:'sueño',current:(metrics.sueño||[]).slice(-7).length?((metrics.sueño||[]).slice(-7).reduce((s,e)=>s+e.value,0)/Math.min(7,(metrics.sueño||[]).length)).toFixed(1)+'h':'—',goal:`${hGoals.sueño||8}h/noche`,pct:Math.min(Math.round(((metrics.sueño||[]).slice(-7).length?((metrics.sueño||[]).slice(-7).reduce((s,e)=>s+e.value,0)/(7*(hGoals.sueño||8)))*100:0)),100),color:T.purple,inv:false},
    {label:'Pasos diarios',icon:'👟',metricKey:'pasos',current:(metrics.pasos||[]).slice(-7).length?Math.round((metrics.pasos||[]).slice(-7).reduce((s,e)=>s+e.value,0)/(metrics.pasos||[]).slice(-7).length).toLocaleString():'—',goal:(hGoals.pasos||10000).toLocaleString(),pct:Math.min(Math.round(((metrics.pasos||[]).slice(-7).length?((metrics.pasos||[]).slice(-7).reduce((s,e)=>s+e.value,0)/((metrics.pasos||[]).slice(-7).length*(hGoals.pasos||10000)))*100:0)),100),color:T.accent,inv:false},
    {label:'Entrenos/semana',icon:'🏋️',metricKey:'entrenosSem',current:`${weekWorkouts.length}`,goal:`${hGoals.entrenosSem||4} sesiones`,pct:Math.min(Math.round((weekWorkouts.length/(hGoals.entrenosSem||4))*100),100),color:T.orange,inv:false},
  ];

  return (
    <div>
      <PageHeader title="💪 Salud" subtitle="Seguimiento y tendencias" isMobile={isMobile} onBack={onBack}
        action={<div style={{display:'flex',gap:6}}>
          <Btn size="sm" variant="ghost" onClick={()=>setMetricModal(true)}>+ Métrica</Btn>
          <Btn size="sm" onClick={()=>setWorkoutModal(true)}><Icon name="plus" size={12}/>Entreno</Btn>
        </div>}/>

      {/* Summary row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
        {[
          {label:'Racha entrenos',val:`🔥 ${wStreak}d`,color:T.orange},
          {label:'Mejor racha',val:`⚡ ${wBestStreak}d`,color:T.purple},
          {label:'Esta semana',val:`${weekWorkouts.length} sesiones`,color:T.blue},
          {label:'Calorías 7d',val:weekCal>0?weekCal.toLocaleString():'—',color:T.red},
        ].map(s=>(
          <Card key={s.label} style={{padding:isMobile?8:12,textAlign:'center'}}>
            <div style={{fontSize:isMobile?12:13,fontWeight:800,color:s.color}}>{s.val}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:3}}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {[['trends','📈 Tendencias'],['workouts','🏃 Entrenos'],['summary','📊 Resumen'],['goals','🎯 Metas'],['meds','💊 Medicamentos'],['medico','🩺 Médico']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'6px 14px',borderRadius:10,border:`1px solid ${tab===id?T.green:T.border}`,background:tab===id?`${T.green}18`:'transparent',color:tab===id?T.green:T.muted,cursor:'pointer',fontSize:12,fontWeight:tab===id?700:400,fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TRENDS ── */}
      {tab==='trends'&&(
        <Card style={{padding:18}}>
          <div style={{display:'flex',gap:6,marginBottom:16,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
            {Object.entries(METRIC_CFG).map(([k,c])=>(
              <button key={k} onClick={()=>setMetric(k)}
                style={{padding:'5px 12px',borderRadius:9,border:`1px solid ${metric===k?c.color:T.border}`,background:metric===k?`${c.color}18`:'transparent',color:metric===k?c.color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          {mData.length===0?(
            <div style={{textAlign:'center',padding:'24px 0',color:T.dim}}>
              <p style={{fontSize:14,marginBottom:8}}>Sin registros de {cfg.label.toLowerCase()} aún</p>
              <Btn size="sm" onClick={()=>{setMForm(f=>({...f,metric}));setMetricModal(true);}}>+ Registrar {cfg.label}</Btn>
            </div>
          ):(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <div style={{fontSize:28,fontWeight:800,color:cfg.color}}>{fmtVal(latest)} <span style={{fontSize:14,color:T.muted,fontWeight:400}}>{cfg.unit}</span></div>
                  {delta!=null&&<div style={{fontSize:12,marginTop:3,color:cfg.lowerBetter?(delta<=0?T.accent:T.red):(delta>=0?T.accent:T.red)}}>
                    {delta>0?'▲':'▼'} {Math.abs(delta).toFixed(metric==='pasos'?0:1)} {cfg.unit} vs anterior
                  </div>}
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,color:T.muted}}>Meta: {metric==='pasos'?cfg.goal.toLocaleString():cfg.goal} {cfg.unit}</div>
                  <div style={{fontSize:13,fontWeight:700,color:goalColor,marginTop:2}}>{cfg.lowerBetter?goalPct<=100?'✓ Dentro de meta':'Por encima':goalPct+'% de meta'}</div>
                </div>
              </div>
              <MetricTrendChart
                data={mData.slice(-30)}
                color={cfg.color}
                goal={cfg.goal}
                unit={cfg.unit}
                width={Math.min((typeof window!=="undefined"?window.innerWidth:360)-80,340)}
                height={140}
              />
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:9,color:T.dim}}>{mData.slice(-30)[0]?.date?.slice(5)}</span>
                <span style={{fontSize:9,color:T.dim}}>{mData[mData.length-1]?.date?.slice(5)}</span>
              </div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:11,color:T.muted}}>Progreso hacia meta</span>
                  <span style={{fontSize:11,fontWeight:700,color:goalColor}}>{cfg.lowerBetter?goalPct<=100?'✓':''+goalPct+'%':goalPct+'%'}</span>
                </div>
                <div style={{height:6,background:T.border,borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(cfg.lowerBetter?Math.max(0,200-goalPct):goalPct,100)}%`,background:goalColor,borderRadius:3,transition:'width 0.6s'}}/>
                </div>
              </div>
              <div style={{marginTop:10,textAlign:'right'}}>
                <button onClick={()=>{setMForm(f=>({...f,metric}));setMetricModal(true);}} style={{fontSize:11,color:T.accent,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>+ Registrar {cfg.label}</button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── WORKOUTS ── */}
      {tab==='workouts'&&(
        <div>
          <Card style={{marginBottom:12,padding:14}}>
            <div style={{fontWeight:600,fontSize:13,color:T.text,marginBottom:10}}>Resumen semanal</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {[
                {l:'Sesiones',v:weekWorkouts.length,c:T.accent},
                {l:'Minutos',v:weekMin,c:T.blue},
                {l:'Calorías',v:weekCal||'—',c:T.red},
                {l:'Racha',v:`🔥${wStreak}d`,c:T.orange},
              ].map(s=>(
                <div key={s.l} style={{textAlign:'center',padding:'6px 4px'}}>
                  <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:9,color:T.muted,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          </Card>
          {/* Workout heatmap - últimos 14 días */}
          <Card style={{marginBottom:12,padding:14}}>
            <div style={{fontWeight:600,fontSize:12,color:T.muted,marginBottom:8}}>Actividad — últimos 14 días</div>
            <div style={{display:'flex',gap:4,alignItems:'flex-end'}}>
              {wHeatmap.map((d,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <div style={{
                    width:'100%',height:d.count>0?Math.max(d.count*14,14):6,maxHeight:42,
                    borderRadius:4,
                    background:d.count>0?T.accent:`${T.border}`,
                    opacity:d.count>0?Math.min(0.4+d.count*0.3,1):0.3,
                    transition:'all 0.3s',
                  }} title={`${d.date}: ${d.count} entreno${d.count!==1?'s':''}`}/>
                  <span style={{fontSize:8,color:d.date===today()?T.accent:T.dim}}>{d.label}</span>
                </div>
              ))}
            </div>
          </Card>
          {workouts.slice(0,10).map(w=>(
            <div key={w.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:6}}>
              <div style={{width:36,height:36,borderRadius:9,background:`${T.blue}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{wtIcon(w.type)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>{w.type}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>{fmt(w.date)} · {w.duration}min{w.distance?` · ${w.distance}`:''}</div>
              </div>
              {w.calories>0&&<div style={{fontSize:13,fontWeight:700,color:T.red,flexShrink:0}}>{w.calories} kcal</div>}
              <button onClick={()=>delWorkout(w.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4}}><Icon name="trash" size={12}/></button>
            </div>
          ))}
          {!workouts.length&&<div style={{textAlign:'center',padding:'30px 0',color:T.dim}}><p style={{fontSize:14}}>Sin entrenamientos registrados</p><Btn size="sm" onClick={()=>setWorkoutModal(true)} style={{marginTop:8}}><Icon name="plus" size={12}/>Registrar entreno</Btn></div>}
        </div>
      )}

      {/* ── WEEKLY SUMMARY ── */}
      {tab==='summary'&&(
        <div>
          <Card style={{padding:18,marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:14}}>📊 Resumen semanal de actividad</div>
            {/* Workout stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
              {[
                {l:'Entrenos',v:weekSummary.workouts,c:T.accent,icon:'🏋️'},
                {l:'Minutos totales',v:weekSummary.min,c:T.blue,icon:'⏱'},
                {l:'Calorías quemadas',v:weekSummary.cal||'—',c:T.red,icon:'🔥'},
              ].map(s=>(
                <div key={s.l} style={{background:T.surface2,borderRadius:10,padding:'12px 10px',textAlign:'center'}}>
                  <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:9,color:T.muted,marginTop:3}}>{s.l}</div>
                </div>
              ))}
            </div>
            {/* Consistency */}
            <div style={{background:T.surface2,borderRadius:10,padding:'12px 14px',marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:600,color:T.text}}>🔥 Consistencia hábitos</span>
                <span style={{fontSize:14,fontWeight:800,color:weekSummary.habitPct>=70?T.accent:weekSummary.habitPct>=40?T.orange:T.red}}>{weekSummary.habitPct}%</span>
              </div>
              <div style={{height:6,background:T.border,borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${weekSummary.habitPct}%`,background:weekSummary.habitPct>=70?T.accent:weekSummary.habitPct>=40?T.orange:T.red,borderRadius:3,transition:'width 0.6s'}}/>
              </div>
            </div>
            {/* Metric deltas */}
            <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:8}}>📈 Tendencias de la semana</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {weekSummary.metricDeltas.map(m=>(
                <div key={m.key} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:T.surface,borderRadius:9,border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:16}}>{m.icon}</span>
                  <span style={{flex:1,fontSize:13,color:T.text}}>{m.label}</span>
                  {m.delta!=null?(
                    <span style={{fontSize:13,fontWeight:700,color:m.lowerBetter?(m.delta<=0?T.accent:T.red):(m.delta>=0?T.accent:T.red)}}>
                      {m.delta>0?'▲':'▼'} {Math.abs(m.delta).toFixed(m.key==='pasos'?0:1)} {m.unit}
                    </span>
                  ):(
                    <span style={{fontSize:11,color:T.dim}}>Sin datos esta semana</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
          {/* Workout streak visual */}
          <Card style={{padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontWeight:600,fontSize:12,color:T.text}}>🔥 Racha de entrenamientos</span>
              <div style={{display:'flex',gap:12}}>
                <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:T.orange}}>{wStreak}d</div><div style={{fontSize:8,color:T.muted}}>Actual</div></div>
                <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:T.purple}}>{wBestStreak}d</div><div style={{fontSize:8,color:T.muted}}>Máxima</div></div>
              </div>
            </div>
            <div style={{display:'flex',gap:3}}>
              {wHeatmap.map((d,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  <div style={{width:'100%',height:18,borderRadius:4,background:d.count>0?T.accent:T.border,opacity:d.count>0?Math.min(0.5+d.count*0.25,1):0.25}} title={`${d.date}: ${d.count}`}/>
                  <span style={{fontSize:7,color:d.date===today()?T.accent:T.dim}}>{d.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── GOALS ── */}
      {tab==='goals'&&(
        <Card style={{padding:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>Metas de salud</div>
            <button onClick={()=>{setGoalForm({peso:hGoals.peso||75,sueño:hGoals.sueño||8,pasos:hGoals.pasos||10000,agua:hGoals.agua||2,entrenosSem:hGoals.entrenosSem||4});setGoalEditModal(true);}}
              style={{fontSize:11,color:T.accent,background:`${T.accent}12`,border:`1px solid ${T.accent}30`,borderRadius:8,padding:'4px 12px',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
              ✏️ Editar metas
            </button>
          </div>
          {GOALS.map(g=>(
            <div key={g.label} style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <span>{g.icon}</span>
                  <span style={{fontSize:13,fontWeight:600,color:T.text}}>{g.label}</span>
                </div>
                <div style={{fontSize:12,color:T.muted}}><strong style={{color:g.color}}>{g.current}</strong> / {g.goal}</div>
              </div>
              <div style={{height:7,background:T.border,borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${g.pct}%`,background:g.color,borderRadius:4,transition:'width 0.6s'}}/>
              </div>
              <div style={{fontSize:10,color:g.pct>=100?T.accent:T.muted,marginTop:3,textAlign:'right'}}>{g.pct>=100?'✅ Meta alcanzada':`${g.pct}%`}</div>
            </div>
          ))}
        </Card>
      )}

      {/* ── MEDICATIONS ── */}
      {tab==='meds'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>💊 Mis medicamentos</div>
            <Btn size="sm" onClick={()=>setMedModal(true)}><Icon name="plus" size={13}/>Agregar</Btn>
          </div>
          {meds.length===0?(
            <Card style={{textAlign:'center',padding:'32px 20px'}}>
              <div style={{fontSize:36,marginBottom:10}}>💊</div>
              <div style={{color:T.muted,fontSize:14,marginBottom:12}}>Sin medicamentos registrados</div>
              <Btn size="sm" onClick={()=>setMedModal(true)}><Icon name="plus" size={12}/>Agregar medicamento</Btn>
            </Card>
          ):(
            meds.map(m=>(
              <Card key={m.id} style={{marginBottom:10,padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:T.text}}>{m.name}</div>
                    <div style={{fontSize:12,color:T.muted,marginTop:3}}>
                      {m.dose&&`${m.dose}${m.unit}`} {m.frequency&&`· ${m.frequency}`} {m.time&&`· 🕐 ${m.time}`}
                    </div>
                    {m.notes&&<div style={{fontSize:11,color:T.dim,marginTop:4}}>{m.notes}</div>}
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>scheduleMedNotif(m)}
                      title="Programar recordatorio de hoy"
                      style={{background:`${T.orange}15`,border:`1px solid ${T.orange}40`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:11,color:T.orange,fontFamily:'inherit',fontWeight:600}}>
                      🔔 Recordatorio
                    </button>
                    <button onClick={()=>delMed(m.id)} aria-label="Eliminar medicamento"
                      style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}>
                      <Icon name="trash" size={13}/>
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Workout modal */}
      {workoutModal&&<Modal title="Nuevo entreno" onClose={()=>setWorkoutModal(false)}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Select value={wForm.type} onChange={v=>setWForm(f=>({...f,type:v}))}>
            {WORKOUT_TYPES.map(t=><option key={t} value={t}>{wtIcon(t)} {t}</option>)}
          </Select>
          <Input type="date" value={wForm.date} onChange={v=>setWForm(f=>({...f,date:v}))}/>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}><label style={{fontSize:11,color:T.muted}}>Duración (min)</label><Input type="number" value={wForm.duration} onChange={v=>setWForm(f=>({...f,duration:v}))}/></div>
            <div style={{flex:1}}><label style={{fontSize:11,color:T.muted}}>Calorías</label><Input type="number" value={wForm.calories} onChange={v=>setWForm(f=>({...f,calories:v}))}/></div>
          </div>
          <Input value={wForm.distance} onChange={v=>setWForm(f=>({...f,distance:v}))} placeholder="Distancia (ej: 5.2km) — opcional"/>
          <Btn onClick={saveWorkout} style={{width:'100%',justifyContent:'center'}}>Guardar entreno</Btn>
        </div>
      </Modal>}

      {/* Metric modal */}
      {metricModal&&<Modal title="Registrar métrica" onClose={()=>setMetricModal(false)}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Select value={mForm.metric} onChange={v=>setMForm(f=>({...f,metric:v}))}>
            {Object.entries(METRIC_CFG).map(([k,c])=><option key={k} value={k}>{c.icon} {c.label} ({c.unit||'unidades'})</option>)}
          </Select>
          <Input type="number" value={mForm.value} onChange={v=>setMForm(f=>({...f,value:v}))} placeholder={`Valor en ${METRIC_CFG[mForm.metric]?.unit||'unidades'}`}/>
          <Input type="date" value={mForm.date} onChange={v=>setMForm(f=>({...f,date:v}))}/>
          <Btn onClick={saveMetric} style={{width:'100%',justifyContent:'center'}}>Guardar</Btn>
        </div>
      </Modal>}
      {/* ═══ MÉDICO TAB ═══ */}
      {tab==='medico'&&(
        <div>
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            <button onClick={()=>setVisitModal(true)} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`1px solid ${T.border}`,background:T.surface2,color:T.muted,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600}}>
              🏥 + Nueva visita
            </button>
            <button onClick={()=>setDocModal(true)} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`1px solid ${T.border}`,background:T.surface2,color:T.muted,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600}}>
              📄 + Analítica / doc
            </button>
          </div>

          {/* Visit detail */}
          {visitDetail&&medVisits.find(v=>v.id===visitDetail.id)&&(
            <div style={{background:T.surface,border:`2px solid ${T.blue}`,borderRadius:16,padding:16,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{color:T.text,fontWeight:700,fontSize:15}}>🏥 {visitDetail.reason}</div>
                  <div style={{display:'flex',gap:10,marginTop:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,color:T.muted}}>📅 {visitDetail.date}</span>
                    {visitDetail.specialty&&<span style={{fontSize:12,color:T.blue,background:`${T.blue}12`,padding:'1px 8px',borderRadius:6}}>{visitDetail.specialty}</span>}
                    {visitDetail.doctor&&<span style={{fontSize:12,color:T.muted}}>Dr. {visitDetail.doctor}</span>}
                    {visitDetail.clinic&&<span style={{fontSize:12,color:T.dim}}>{visitDetail.clinic}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>delVisit(visitDetail.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4}}><Icon name="trash" size={14}/></button>
                </div>
              </div>
              {visitDetail.diagnosis&&<div style={{marginBottom:8}}><span style={{fontSize:12,color:T.muted,fontWeight:600}}>Diagnóstico: </span><span style={{fontSize:13,color:T.text}}>{visitDetail.diagnosis}</span></div>}
              {visitDetail.treatment&&<div style={{marginBottom:8}}><span style={{fontSize:12,color:T.muted,fontWeight:600}}>Tratamiento: </span><span style={{fontSize:13,color:T.text}}>{visitDetail.treatment}</span></div>}
              {visitDetail.nextVisit&&<div style={{padding:'8px 12px',background:`${T.orange}10`,borderRadius:8,fontSize:12,color:T.orange}}>🔔 Próxima cita: {visitDetail.nextVisit}</div>}
              {visitDetail.notes&&<p style={{color:T.muted,fontSize:12,margin:'8px 0 0',fontStyle:'italic'}}>{visitDetail.notes}</p>}
            </div>
          )}

          {/* Visits by specialty */}
          {(()=>{
            const bySpecialty={};
            medVisits.forEach(v=>{const s=v.specialty||'General';if(!bySpecialty[s])bySpecialty[s]=[];bySpecialty[s].push(v);});
            return Object.entries(bySpecialty).map(([spec,visits])=>(
              <div key={spec} style={{marginBottom:14}}>
                <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{spec}</div>
                {visits.map(v=>(
                  <div key={v.id} onClick={()=>setVisitDetail(visitDetail?.id===v.id?null:v)}
                    style={{padding:'10px 12px',background:visitDetail?.id===v.id?T.surface2:T.surface,border:`1px solid ${visitDetail?.id===v.id?T.blue:T.border}`,borderRadius:12,marginBottom:6,cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{color:T.text,fontSize:13,fontWeight:600}}>🏥 {v.reason}</div>
                        <div style={{display:'flex',gap:8,marginTop:3}}>
                          <span style={{fontSize:11,color:T.muted}}>{v.date}</span>
                          {v.doctor&&<span style={{fontSize:11,color:T.dim}}>· Dr. {v.doctor}</span>}
                          {v.cost&&<span style={{fontSize:11,color:T.orange}}>· ${v.cost}</span>}
                        </div>
                      </div>
                      {v.nextVisit&&<span style={{fontSize:10,color:T.orange}}>🔔 {v.nextVisit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}

          {medVisits.length===0&&medDocs.length===0&&(
            <div style={{textAlign:'center',padding:'32px 20px'}}>
              <div style={{fontSize:40,marginBottom:10}}>🩺</div>
              <div style={{color:T.muted,fontSize:14,fontWeight:600}}>Sin historial médico</div>
              <div style={{color:T.dim,fontSize:12,marginTop:4}}>Registra tus visitas y guarda analíticas importantes</div>
            </div>
          )}

          {/* Medical documents */}
          {medDocs.length>0&&(
            <div>
              <div style={{fontSize:11,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>📄 Analíticas y documentos</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {medDocs.map(d=>(
                  <div key={d.id} style={{padding:'10px 12px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <div style={{color:T.text,fontSize:13,fontWeight:600}}>📄 {d.title}</div>
                        <div style={{display:'flex',gap:8,marginTop:3}}>
                          {d.date&&<span style={{fontSize:11,color:T.muted}}>{d.date}</span>}
                          <span style={{fontSize:11,color:T.blue,background:`${T.blue}10`,padding:'1px 6px',borderRadius:5}}>{d.type}</span>
                          {d.lab&&<span style={{fontSize:11,color:T.dim}}>{d.lab}</span>}
                        </div>
                        {d.results&&<div style={{fontSize:12,color:T.muted,marginTop:5}}>{d.results}</div>}
                      </div>
                      <button onClick={()=>delDoc(d.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2}}><Icon name="trash" size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visit modal */}
      {visitModal&&(
        <Modal title="🏥 Nueva visita médica" onClose={()=>setVisitModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Fecha</div><input type="date" value={vForm.date} onChange={e=>setVForm(f=>({...f,date:e.target.value}))} style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Especialidad</div><input value={vForm.specialty} onChange={e=>setVForm(f=>({...f,specialty:e.target.value}))} placeholder="Medicina general, Cardiología..." style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Médico / Dr.</div><input value={vForm.doctor} onChange={e=>setVForm(f=>({...f,doctor:e.target.value}))} placeholder="Nombre del doctor" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Clínica / Hospital</div><input value={vForm.clinic} onChange={e=>setVForm(f=>({...f,clinic:e.target.value}))} placeholder="Nombre del centro" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            </div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Motivo de la visita *</div><input value={vForm.reason} onChange={e=>setVForm(f=>({...f,reason:e.target.value}))} placeholder="¿Por qué fuiste?" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Diagnóstico</div><input value={vForm.diagnosis} onChange={e=>setVForm(f=>({...f,diagnosis:e.target.value}))} placeholder="¿Qué encontró el médico?" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Tratamiento</div><input value={vForm.treatment} onChange={e=>setVForm(f=>({...f,treatment:e.target.value}))} placeholder="Medicación, reposo, cirugía..." style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Próxima cita</div><input type="date" value={vForm.nextVisit} onChange={e=>setVForm(f=>({...f,nextVisit:e.target.value}))} style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Costo ($)</div><input type="number" value={vForm.cost} onChange={e=>setVForm(f=>({...f,cost:e.target.value}))} placeholder="0" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            </div>
            <button onClick={saveVisit} style={{padding:'11px',borderRadius:12,background:T.accent,border:'none',color:'#000',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:14}}>🏥 Guardar visita</button>
          </div>
        </Modal>
      )}

      {/* Doc modal */}
      {docModal&&(
        <Modal title="📄 Nueva analítica / documento" onClose={()=>setDocModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Fecha</div><input type="date" value={dForm.date} onChange={e=>setDForm(f=>({...f,date:e.target.value}))} style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
              <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Tipo</div>
                <select value={dForm.type} onChange={e=>setDForm(f=>({...f,type:e.target.value}))} style={{width:'100%',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}>
                  {['analítica','radiografía','ecografía','resonancia','informe','receta','otro'].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Título *</div><input value={dForm.title} onChange={e=>setDForm(f=>({...f,title:e.target.value}))} placeholder="Ej. Analítica completa enero 2025" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Laboratorio / Centro</div><input value={dForm.lab} onChange={e=>setDForm(f=>({...f,lab:e.target.value}))} placeholder="Nombre del laboratorio" style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Resultados / descripción</div><textarea value={dForm.results} onChange={e=>setDForm(f=>({...f,results:e.target.value}))} rows={4} placeholder="Valores, hallazgos, observaciones del médico..." style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit',resize:'vertical'}}/></div>
            <button onClick={saveDoc} style={{padding:'11px',borderRadius:12,background:T.accent,border:'none',color:'#000',fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:14}}>📄 Guardar documento</button>
          </div>
        </Modal>
      )}

      {medModal&&<Modal title="Agregar medicamento" onClose={()=>setMedModal(false)}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Input value={medForm.name} onChange={v=>setMedForm(f=>({...f,name:v}))} placeholder="Nombre del medicamento"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Input value={medForm.dose} onChange={v=>setMedForm(f=>({...f,dose:v}))} placeholder="Dosis (ej: 500)" type="number"/>
            <Select value={medForm.unit} onChange={v=>setMedForm(f=>({...f,unit:v}))}>
              {['mg','ml','g','UI','gotas','comprimido','cápsula'].map(u=><option key={u}>{u}</option>)}
            </Select>
          </div>
          <Select value={medForm.frequency} onChange={v=>setMedForm(f=>({...f,frequency:v}))}>
            {['Diaria','Cada 8h','Cada 12h','Semanal','Mensual','Según necesidad'].map(f=><option key={f}>{f}</option>)}
          </Select>
          <div>
            <label style={{fontSize:11,color:T.muted,display:'block',marginBottom:4}}>⏰ Hora del recordatorio</label>
            <Input type="time" value={medForm.time} onChange={v=>setMedForm(f=>({...f,time:v}))}/>
          </div>
          <Input value={medForm.notes} onChange={v=>setMedForm(f=>({...f,notes:v}))} placeholder="Notas (p.ej: tomar con comida)"/>
          <Btn onClick={saveMed} style={{width:'100%',justifyContent:'center'}}>💊 Guardar</Btn>
        </div>
      </Modal>}
      {goalEditModal&&<Modal title="✏️ Editar metas de salud" onClose={()=>setGoalEditModal(false)}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {[
            {key:'peso',label:'⚖️ Peso objetivo',unit:'kg',placeholder:'75'},
            {key:'sueño',label:'😴 Sueño objetivo',unit:'horas/noche',placeholder:'8'},
            {key:'pasos',label:'👟 Pasos diarios',unit:'pasos',placeholder:'10000'},
            {key:'agua',label:'💧 Agua diaria',unit:'litros',placeholder:'2'},
            {key:'entrenosSem',label:'🏋️ Entrenos/semana',unit:'sesiones',placeholder:'4'},
          ].map(g=>(
            <div key={g.key}>
              <label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>{g.label} ({g.unit})</label>
              <Input type="number" value={goalForm[g.key]||''} onChange={v=>setGoalForm(f=>({...f,[g.key]:v}))} placeholder={g.placeholder}/>
            </div>
          ))}
          <Btn onClick={()=>{
            const upd={...hGoals};
            Object.keys(goalForm).forEach(k=>{if(goalForm[k])upd[k]=Number(goalForm[k]);});
            setData(d=>({...d,healthGoals:upd}));save('healthGoals',upd);
            setGoalEditModal(false);toast.success('Metas de salud actualizadas');
          }} style={{width:'100%',justifyContent:'center'}}>Guardar metas</Btn>
        </div>
      </Modal>}
    </div>
  );
};


export default Health;
