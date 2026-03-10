import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== HABIT TRACKER =====================
const HabitTracker = ({data,setData,isMobile}) => {
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:'',frequency:'daily',objectiveId:''});
  const [selectedHabit,setSelectedHabit]=useState(null);
  const [freqFilter,setFreqFilter]=useState('all');
  const [tab21,setTab21]=useState(false);
  const [challengeModal,setChallengeModal]=useState(false);
  const [cForm,setCForm]=useState({name:'',replace:'',why:'',startDate:today()});
  const [selChallenge,setSelChallenge]=useState(null);
  const [dragIdx,setDragIdx]=useState(null);
  const [touchDrag,setTouchDrag]=useState(null); // {idx, startY, currentY, el}
  const habitListRef=useRef(null);
  const todayStr=today();

  const toggle=(habitId,date)=>{
    const updated=data.habits.map(h=>{
      if(h.id!==habitId)return h;
      const has=h.completions.includes(date);
      return {...h,completions:has?h.completions.filter(d=>d!==date):[...h.completions,date]};
    });
    setData(d=>({...d,habits:updated}));save('habits',updated);
    if(selectedHabit?.id===habitId)setSelectedHabit(updated.find(h=>h.id===habitId));
  };

  const add=()=>{
    if(!form.name.trim())return;
    const updated=[...data.habits,{id:uid(),...form,completions:[]}];
    setData(d=>({...d,habits:updated}));save('habits',updated);
    setModal(false);setForm({name:'',frequency:'daily',objectiveId:''});
  };
  const del=(id)=>{
    const u=data.habits.filter(h=>h.id!==id);
    setData(d=>({...d,habits:u}));save('habits',u);
    if(selectedHabit?.id===id)setSelectedHabit(null);
  };

  const computeStreak=(h)=>{
    const freq=h.frequency||'daily';
    const fd=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(freq==='daily'){
      let s=0,d=new Date();
      while(h.completions.includes(fd(d))){s++;d.setDate(d.getDate()-1);}
      return s;
    }
    if(freq==='weekly'){
      let s=0,d=new Date();
      d.setDate(d.getDate()-d.getDay()); // start of current week (Sun)
      while(true){
        const wDates=Array.from({length:7},(_,i)=>{const dd=new Date(d);dd.setDate(dd.getDate()+i);return fd(dd);});
        if(wDates.some(wd=>h.completions.includes(wd)))s++;else break;
        d.setDate(d.getDate()-7);
      }
      return s;
    }
    // monthly
    let s=0,d=new Date();
    while(true){
      const mKey=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(h.completions.some(c=>c.slice(0,7)===mKey))s++;else break;
      d.setMonth(d.getMonth()-1);
    }
    return s;
  };
  const computeMaxStreak=(h)=>{
    if(!h.completions.length)return 0;
    const freq=h.frequency||'daily';
    if(freq==='daily'){
      const sorted=[...h.completions].sort();
      let maxS=1,cur=1;
      for(let i=1;i<sorted.length;i++){
        const diff=(new Date(sorted[i])-new Date(sorted[i-1]))/86400000;
        if(diff===1){cur++;maxS=Math.max(maxS,cur);}else cur=1;
      }
      return maxS;
    }
    if(freq==='weekly'){
      const weeks=new Set(h.completions.map(c=>{const d=new Date(c);const sun=new Date(d);sun.setDate(d.getDate()-d.getDay());return sun.toISOString().slice(0,10);}));
      const sorted=[...weeks].sort();
      let maxS=1,cur=1;
      for(let i=1;i<sorted.length;i++){
        const diff=(new Date(sorted[i])-new Date(sorted[i-1]))/86400000;
        if(diff===7){cur++;maxS=Math.max(maxS,cur);}else cur=1;
      }
      return maxS;
    }
    // monthly
    const months=new Set(h.completions.map(c=>c.slice(0,7)));
    const sorted=[...months].sort();
    let maxS=1,cur=1;
    for(let i=1;i<sorted.length;i++){
      const[y1,m1]=sorted[i-1].split('-').map(Number);
      const[y2,m2]=sorted[i].split('-').map(Number);
      if((y2*12+m2)-(y1*12+m1)===1){cur++;maxS=Math.max(maxS,cur);}else cur=1;
    }
    return maxS;
  };

  const last28=Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});

  const dailyHabits=data.habits.filter(h=>!h.frequency||h.frequency==='daily');
  const todayDone=dailyHabits.filter(h=>h.completions.includes(todayStr)).length;
  const todayTotal=dailyHabits.length;
  const todayPct=todayTotal?Math.round(todayDone/todayTotal*100):0;
  const weekTotal=data.habits.reduce((s,h)=>s+weekDates.filter(d=>h.completions.includes(d)).length,0);
  const weekPossible=dailyHabits.length*7;
  const weekPct=weekPossible?Math.round(weekTotal/weekPossible*100):0;
  // % últimas 4 semanas (28 días) — solo hábitos diarios
  const month28Total=dailyHabits.reduce((s,h)=>s+last28.filter(d=>h.completions.includes(d)).length,0);
  const month28Possible=dailyHabits.length*28;
  const month28Pct=month28Possible?Math.round(month28Total/month28Possible*100):0;
  const allStreaks=data.habits.map(h=>({id:h.id,streak:computeStreak(h),maxStreak:computeMaxStreak(h)}));
  const bestStreakData=(()=>{const best=allStreaks.reduce((max,s)=>s.streak>max.streak?s:max,{streak:0,id:''});const habit=data.habits.find(h=>h.id===best.id);const u=!habit||!habit.frequency||habit.frequency==='daily'?'d':habit.frequency==='weekly'?'sem':'m';return{val:best.streak,unit:u};})();

  const HABIT_COLORS=['#58a6ff',T.accent,'#e3b341','#bc8cff','#f85149','#ffd166','#39d353','#ff79c6'];
  const habitColor=(h,idx)=>h.color||(HABIT_COLORS[idx%HABIT_COLORS.length]);
  const filteredHabits=freqFilter==='all'?data.habits:data.habits.filter(h=>(h.frequency||'daily')===freqFilter);

  const onDragStart=(i)=>setDragIdx(i);
  const onDrop=(targetIdx)=>{
    if(dragIdx===null||dragIdx===targetIdx)return;
    const arr=[...data.habits];
    const [moved]=arr.splice(dragIdx,1);
    arr.splice(targetIdx,0,moved);
    setData(d=>({...d,habits:arr}));save('habits',arr);
    setDragIdx(null);
  };

  // ── Touch drag & drop (mobile) ──
  const touchTimerRef=useRef(null);
  const onTouchDragStart=(idx,e)=>{
    // Long-press to initiate drag on mobile
    const touch=e.touches[0];
    touchTimerRef.current=setTimeout(()=>{
      setTouchDrag({idx,startY:touch.clientY,currentY:touch.clientY});
      setDragIdx(idx);
    },300);
  };
  const onTouchDragMove=(e)=>{
    if(touchDrag===null){clearTimeout(touchTimerRef.current);return;}
    e.preventDefault(); // prevent scroll while dragging
    clearTimeout(touchTimerRef.current);
    const touch=e.touches[0];
    setTouchDrag(td=>td?{...td,currentY:touch.clientY}:null);
    // Find which habit card we're hovering over
    if(!habitListRef.current)return;
    const cards=habitListRef.current.querySelectorAll('[data-habit-idx]');
    for(const card of cards){
      const rect=card.getBoundingClientRect();
      if(touch.clientY>=rect.top&&touch.clientY<=rect.bottom){
        const hoverIdx=parseInt(card.getAttribute('data-habit-idx'));
        if(hoverIdx!==touchDrag.idx){
          // Reorder in real-time
          const arr=[...data.habits];
          const [moved]=arr.splice(touchDrag.idx,1);
          arr.splice(hoverIdx,0,moved);
          setData(d=>({...d,habits:arr}));save('habits',arr);
          setTouchDrag(td=>td?{...td,idx:hoverIdx}:null);
          setDragIdx(hoverIdx);
        }
        break;
      }
    }
  };
  const onTouchDragEnd=()=>{
    clearTimeout(touchTimerRef.current);
    setTouchDrag(null);
    setDragIdx(null);
  };

  return (
    <div>
      <PageHeader title="Habit Tracker" subtitle="Construye rachas diarias 🔥" isMobile={isMobile}
        action={
          <div style={{display:'flex',gap:6}}>
            <Btn size="sm" variant="ghost" onClick={()=>setTab21(t=>!t)}>
              {tab21?'📋 Hábitos':'🔥 21 días'}
            </Btn>
            {!tab21&&<Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={14}/>Nuevo</Btn>}
            {tab21&&<Btn size="sm" onClick={()=>setChallengeModal(true)}><Icon name="plus" size={14}/>Desafío</Btn>}
          </div>
        }/>

      {/* ── Stats ── */}
      {data.habits.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:10,marginBottom:16}}>
          <Card style={{textAlign:'center',padding:isMobile?10:14}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:4}}>Hoy</div>
            <div style={{fontSize:isMobile?20:24,fontWeight:700,color:todayPct===100?T.green:todayPct>50?T.accent:T.text}}>{todayDone}/{todayTotal}</div>
            <div style={{height:3,background:T.border,borderRadius:2,marginTop:6}}>
              <div style={{height:'100%',width:`${todayPct}%`,background:todayPct===100?T.green:T.accent,borderRadius:2,transition:'width 0.3s'}}/>
            </div>
          </Card>
          <Card style={{textAlign:'center',padding:isMobile?10:14}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:4}}>Mejor racha</div>
            <div style={{fontSize:isMobile?20:24,fontWeight:700,color:bestStreakData.val>=7?T.green:bestStreakData.val>=3?T.accent:T.text}}>🔥 {bestStreakData.val}{bestStreakData.unit}</div>
          </Card>
          <Card style={{textAlign:'center',padding:isMobile?10:14}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:4}}>Esta semana</div>
            <div style={{fontSize:isMobile?20:24,fontWeight:700,color:weekPct>=80?T.green:weekPct>=50?T.accent:T.text}}>{weekPct}%</div>
            <div style={{height:3,background:T.border,borderRadius:2,marginTop:6}}>
              <div style={{height:'100%',width:`${weekPct}%`,background:weekPct>=80?T.green:T.accent,borderRadius:2,transition:'width 0.3s'}}/>
            </div>
          </Card>
          <Card style={{textAlign:'center',padding:isMobile?10:14}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:4}}>Últimas 4 sem.</div>
            <div style={{fontSize:isMobile?20:24,fontWeight:700,color:month28Pct>=80?T.green:month28Pct>=50?T.accent:T.red}}>{month28Pct}%</div>
            <div style={{height:3,background:T.border,borderRadius:2,marginTop:6}}>
              <div style={{height:'100%',width:`${month28Pct}%`,background:month28Pct>=80?T.green:month28Pct>=50?T.accent:T.red,borderRadius:2,transition:'width 0.3s'}}/>
            </div>
          </Card>
        </div>
      )}

      {/* ── Frequency filter ── */}
      {data.habits.length>0&&(
        <div style={{display:'flex',gap:4,background:T.surface2,borderRadius:10,padding:3,marginBottom:14,width:'fit-content'}}>
          {['all','daily','weekly','monthly'].map(f=>(
            <button key={f} onClick={()=>setFreqFilter(f)}
              style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'inherit',
                background:freqFilter===f?T.accent:'transparent',color:freqFilter===f?'#000':T.muted,transition:'all 0.15s'}}>
              {f==='all'?'Todos':f==='daily'?'Diarios':f==='weekly'?'Semanales':'Mensuales'}
            </button>
          ))}
        </div>
      )}

      {/* ── Habit cards ── */}
      <div ref={habitListRef} onTouchMove={onTouchDragMove} onTouchEnd={onTouchDragEnd} onTouchCancel={onTouchDragEnd}
        style={{display:'flex',flexDirection:'column',gap:6}}>
        {filteredHabits.map((h,idx)=>{
          const realIdx=data.habits.indexOf(h);
          const color=habitColor(h,realIdx);
          const done=h.completions.includes(todayStr);
          const streak=allStreaks.find(s=>s.id===h.id)?.streak||0;
          const maxStreak=allStreaks.find(s=>s.id===h.id)?.maxStreak||0;
          const isSelected=selectedHabit?.id===h.id;
          const pct28=Math.round(last28.filter(d=>h.completions.includes(d)).length/28*100);
          const days28=last28.filter(d=>h.completions.includes(d)).length;
          return (
            <div key={h.id}>
              {/* ── Card row ── */}
              <div
                data-habit-idx={realIdx}
                draggable
                onDragStart={()=>onDragStart(realIdx)}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>onDrop(realIdx)}
                onTouchStart={e=>onTouchDragStart(realIdx,e)}
                style={{
                  background:T.surface,
                  border:`1.5px solid ${isSelected?color+'60':T.border}`,
                  borderLeft:`3px solid ${color}`,
                  borderRadius:12,
                  padding:'12px 14px',
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  transition:touchDrag?'none':'all 0.15s',
                  opacity:dragIdx===realIdx?0.45:1,
                  cursor:'default',
                  ...(touchDrag&&touchDrag.idx===realIdx?{zIndex:10,boxShadow:`0 4px 20px ${color}30`,transform:'scale(1.02)'}:{}),
                }}>

                {/* Drag handle */}
                <div style={{color:touchDrag&&touchDrag.idx===realIdx?T.accent:T.dim,fontSize:18,cursor:'grab',flexShrink:0,userSelect:'none',lineHeight:1,touchAction:'none',padding:'4px 0'}}>⠿</div>

                {/* Circular toggle */}
                <button
                  onClick={e=>{e.stopPropagation();toggle(h.id,todayStr);}}
                  style={{
                    width:30,height:30,borderRadius:'50%',flexShrink:0,
                    border:`2.5px solid ${done?color:T.border}`,
                    background:done?color:'transparent',
                    cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'all 0.2s',
                  }}>
                  {done&&<Icon name="check" size={13} color="#000"/>}
                </button>

                {/* Name + frequency */}
                <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>setSelectedHabit(isSelected?null:h)}>
                  <div style={{fontSize:14,fontWeight:500,color:done?T.muted:T.text,
                    textDecoration:done?'line-through':'none',lineHeight:1.3}}>{h.name}</div>
                  <div style={{fontSize:10,color:T.dim,marginTop:2}}>
                    {(h.frequency||'daily')==='daily'?'Diario':(h.frequency==='weekly'?'Semanal':'Mensual')}
                    {h.objectiveId&&(()=>{const o=data.objectives?.find(x=>x.id===h.objectiveId);return o?<span style={{color:T.purple}}> · 🎯 {o.title.slice(0,20)}</span>:null;})()}
                  </div>
                </div>

                {/* Streak badge */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:3,background:`${color}18`,borderRadius:7,padding:'3px 9px'}}>
                    <span style={{fontSize:11}}>🔥</span>
                    <span style={{fontSize:12,fontWeight:700,color}}>{streak}{(h.frequency||'daily')==='daily'?'d':h.frequency==='weekly'?'sem':'m'}</span>
                  </div>
                  <span style={{fontSize:9,color:T.dim}}>máx {maxStreak}</span>
                </div>

                {/* Delete */}
                <button
                  onClick={e=>{e.stopPropagation();del(h.id);}}
                  style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:'3px',display:'flex',flexShrink:0}}>
                  <Icon name="trash" size={12}/>
                </button>
              </div>

              {/* ── Inline detail panel ── */}
              {isSelected&&(
                <div style={{
                  background:`${color}06`,
                  border:`1.5px solid ${color}30`,
                  borderTop:'none',
                  borderRadius:'0 0 12px 12px',
                  padding:'14px 16px',
                }}>
                  {/* Header */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <span style={{fontWeight:700,fontSize:13,color:T.text}}>{h.name} — {(h.frequency||'daily')==='daily'?'últimas 5 semanas':h.frequency==='weekly'?'últimas semanas':'últimos meses'}</span>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:16,fontWeight:800,color}}>{days28}/28</div>
                        <div style={{fontSize:9,color:T.muted}}>últimos días</div>
                      </div>
                      <Ring pct={pct28} color={color} size={46} stroke={4}/>
                    </div>
                  </div>

                  {/* Heatmap */}
                  <HabitHeatmap completions={h.completions} color={color}/>

                  {/* Weekly performance bars */}
                  <HabitWeeklyBars habit={h} color={color}/>

                  {/* Stat pills */}
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    {[
                      {v:`🔥 ${streak}`,c:color,   l:(h.frequency||'daily')==='daily'?'Racha (días)':h.frequency==='weekly'?'Racha (sem.)':'Racha (meses)'},
                      {v:`⚡ ${maxStreak}`,c:T.orange,l:'Racha máxima'},
                      {v:h.completions.length,c:T.text,l:'Total completions'},
                    ].map(s=>(
                      <div key={s.l} style={{flex:1,background:T.surface2,borderRadius:9,padding:'9px 10px',textAlign:'center'}}>
                        <div style={{fontSize:15,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                        <div style={{fontSize:9,color:T.muted,marginTop:3}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!filteredHabits.length&&(
          <div style={{padding:'40px 20px',textAlign:'center',color:T.dim,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:40,marginBottom:8}}>🔥</div>
            <p style={{margin:'0 0 4px',fontSize:14}}>{data.habits.length?'Sin hábitos en este filtro':'Sin hábitos aún'}</p>
            <p style={{margin:'0 0 12px',fontSize:12,color:T.muted}}>Los hábitos se construyen un día a la vez.</p>
            <Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={12}/>Crear primer hábito</Btn>
          </div>
        )}
      </div>

      {/* ═══ 21-DAY CHALLENGE UI ═══ */}
      {tab21&&(
        <div>
          {selChallenge&&(()=>{
            const c=selChallenge;
            const start=new Date(c.startDate+'T12:00');
            const grid=Array.from({length:21},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return{ds,i,isToday:ds===todayStr,done:c.completions.includes(ds),past:ds<todayStr};});
            let streak=0;const now=new Date(todayStr+'T12:00');for(let i=0;i<21;i++){const d=new Date(now);d.setDate(d.getDate()-i);const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(c.completions.includes(ds))streak++;else break;}
            const done=c.completions.length;const pct=Math.round((done/21)*100);const complete=done>=21;
            return (
              <div style={{marginBottom:16}}>
                <div style={{background:complete?`${T.green}10`:T.surface,border:`2px solid ${complete?T.green:T.accent}`,borderRadius:16,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                        <span style={{fontSize:20}}>🔥</span>
                        <span style={{color:T.text,fontWeight:700,fontSize:16}}>{c.name}</span>
                        {complete&&<span style={{fontSize:11,background:`${T.green}20`,color:T.green,padding:'2px 8px',borderRadius:8,fontWeight:700}}>✅ COMPLETADO</span>}
                      </div>
                      {c.replace&&<div style={{fontSize:12,color:T.muted}}>Reemplaza: <em>{c.replace}</em></div>}
                      {c.why&&<div style={{fontSize:12,color:T.dim,marginTop:2}}>💡 {c.why}</div>}
                    </div>
                    <button onClick={()=>{if(!window.confirm('¿Eliminar?'))return;const upd=(data.habitChallenges||[]).filter(x=>x.id!==c.id);setData(d=>({...d,habitChallenges:upd}));save('habitChallenges',upd);setSelChallenge(null);}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4}}><Icon name="trash" size={14}/></button>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:T.muted}}>{done}/21 días · {pct}%</span>
                      <span style={{fontSize:12,color:T.accent}}>🔥 Racha: {streak}</span>
                    </div>
                    <div style={{background:T.border,borderRadius:6,height:8}}><div style={{height:'100%',borderRadius:6,background:complete?T.green:T.accent,width:`${pct}%`,transition:'width 0.5s'}}/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
                    {grid.map(({ds,i,isToday,done:dayDone,past})=>(
                      <button key={ds} onClick={()=>{const has=c.completions.includes(ds);const upd=(data.habitChallenges||[]).map(x=>x.id!==c.id?x:{...x,completions:has?x.completions.filter(d=>d!==ds):[...x.completions,ds]});setData(d=>({...d,habitChallenges:upd}));save('habitChallenges',upd);setSelChallenge(upd.find(x=>x.id===c.id));}}
                        style={{aspectRatio:'1',borderRadius:10,border:`2px solid ${dayDone?T.accent:isToday?T.accent+'80':T.border}`,background:dayDone?T.accent:isToday?`${T.accent}15`:'transparent',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:2}}>
                        <span style={{fontSize:11,fontWeight:dayDone?700:400,color:dayDone?'#000':past?T.dim:isToday?T.accent:T.dim}}>{i+1}</span>
                        {dayDone&&<span style={{fontSize:8,color:'#000'}}>✓</span>}
                      </button>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:T.dim,textAlign:'center'}}>Toca cada cuadro para marcar ese día</div>
                </div>
              </div>
            );
          })()}
          {(data.habitChallenges||[]).length===0?(
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:48,marginBottom:12}}>🔥</div>
              <div style={{color:T.muted,fontSize:15,fontWeight:600}}>Sin desafíos activos</div>
              <div style={{color:T.dim,fontSize:13,marginTop:6,marginBottom:16}}>21 días para automatizar un hábito nuevo</div>
              <Btn onClick={()=>setChallengeModal(true)}>🔥 Crear primer desafío</Btn>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(data.habitChallenges||[]).map(c=>{
                const done=c.completions.length;const pct=Math.round((done/21)*100);const complete=done>=21;
                return (
                  <div key={c.id} onClick={()=>setSelChallenge(selChallenge?.id===c.id?null:c)}
                    style={{background:T.surface,border:`1px solid ${selChallenge?.id===c.id?T.accent:T.border}`,borderRadius:14,padding:'12px 14px',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:42,height:42,borderRadius:12,background:complete?`${T.green}20`:`${T.accent}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{complete?'🏆':'🔥'}</div>
                      <div style={{flex:1}}>
                        <div style={{color:T.text,fontWeight:600,fontSize:14}}>{c.name}</div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                          <div style={{flex:1,background:T.border,borderRadius:4,height:4}}><div style={{height:'100%',borderRadius:4,background:complete?T.green:T.accent,width:`${pct}%`}}/></div>
                          <span style={{fontSize:11,color:complete?T.green:T.muted,fontWeight:600,flexShrink:0}}>{done}/21</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modal&&(
        <Modal title="Nuevo hábito" onClose={()=>setModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Input value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Nombre del hábito"/>
            <Select value={form.frequency} onChange={v=>setForm(f=>({...f,frequency:v}))}>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </Select>
            <Select value={form.objectiveId} onChange={v=>setForm(f=>({...f,objectiveId:v}))}>
              <option value="">Sin objetivo vinculado</option>
              {data.objectives.filter(o=>o.status==='active').map(o=><option key={o.id} value={o.id}>🎯 {o.title}</option>)}
            </Select>
            <Btn onClick={add} style={{width:'100%',justifyContent:'center'}}>Crear hábito</Btn>
          </div>
        </Modal>
      )}
      {challengeModal&&(
        <Modal title="🔥 Nuevo desafío 21 días" onClose={()=>setChallengeModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Hábito a construir *</div>
              <input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="Ej. Meditar 10 minutos cada mañana"
                style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Hábito que reemplaza (opcional)</div>
              <input value={cForm.replace} onChange={e=>setCForm(f=>({...f,replace:e.target.value}))} placeholder="Ej. Ver el teléfono al despertar"
                style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>¿Por qué es importante para ti?</div>
              <input value={cForm.why} onChange={e=>setCForm(f=>({...f,why:e.target.value}))} placeholder="Mi motivación es..."
                style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div><div style={{fontSize:12,color:T.muted,marginBottom:4}}>Fecha de inicio</div>
              <input type="date" value={cForm.startDate} onChange={e=>setCForm(f=>({...f,startDate:e.target.value}))}
                style={{width:'100%',boxSizing:'border-box',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 12px',color:T.text,fontSize:13,fontFamily:'inherit'}}/></div>
            <div style={{padding:'10px 12px',background:`${T.accent}08`,border:`1px solid ${T.accent}20`,borderRadius:10,fontSize:12,color:T.muted,lineHeight:1.6}}>
              💡 <strong style={{color:T.text}}>21 días</strong> para que un comportamiento empiece a automatizarse.
            </div>
            <Btn onClick={()=>{
              if(!cForm.name.trim())return;
              const c={...cForm,id:uid(),completions:[],createdAt:today()};
              const upd=[c,...(data.habitChallenges||[])];
              setData(d=>({...d,habitChallenges:upd}));save('habitChallenges',upd);
              setChallengeModal(false);setCForm({name:'',replace:'',why:'',startDate:today()});
              setSelChallenge(c);
            }} style={{width:'100%',justifyContent:'center'}}>🔥 Empezar desafío</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};




export default HabitTracker;
