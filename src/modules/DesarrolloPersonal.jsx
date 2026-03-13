import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

import { toast } from './Toast.jsx';
// ===================== DESARROLLO PERSONAL =====================
const DesarrolloPersonal = ({data,setData,isMobile,onBack}) => {
  const [tab,setTab]=useState('learning');
  const [pomActive,setPomActive]=useState(false);
  const [pomSeconds,setPomSeconds]=useState(25*60);
  const [pomMode,setPomMode]=useState('focus');
  const [pomCycles,setPomCycles]=useState(0);
  const [studyMin,setStudyMin]=useState(0);
  const [selCourse,setSelCourse]=useState(null);
  const [ideaFilter,setIdeaFilter]=useState('all');
  const timerRef=useRef(null);

  const [modal,setModal]=useState(false);
  const [ideaModal,setIdeaModal]=useState(false);
  const [form,setForm]=useState({type:'learning',title:'',platform:'',category:'',hoursTotal:10,progress:0});
  const [ideaForm,setIdeaForm]=useState({content:'',tag:'💡 Idea'});

  const learnings=(data.learnings||[]);
  const ideas=(data.ideas||[]);

  const saveLearning=()=>{
    if(!form.title.trim())return;
    const upd=[...learnings,{id:uid(),...form,hoursSpent:0,streak:0,createdAt:today()}];
    setData(d=>({...d,learnings:upd}));save('learnings',upd);
    setModal(false);setForm({type:'learning',title:'',platform:'',category:'',hoursTotal:10,progress:0});
  };
  const saveIdea=()=>{
    if(!ideaForm.content.trim())return;
    const upd=[{id:uid(),...ideaForm,createdAt:today()},...ideas];
    setData(d=>({...d,ideas:upd}));save('ideas',upd);
    setIdeaModal(false);setIdeaForm({content:'',tag:'💡 Idea'});
  };
  const delLearning=(id)=>{const u=learnings.filter(l=>l.id!==id);setData(d=>({...d,learnings:u}));save('learnings',u);};
  const delIdea=(id)=>{const u=ideas.filter(i=>i.id!==id);setData(d=>({...d,ideas:u}));save('ideas',u);};
  const updateProgress=(id,pct)=>{const u=learnings.map(l=>l.id!==id?l:{...l,progress:Math.min(100,Math.max(0,pct))});setData(d=>({...d,learnings:u}));save('learnings',u);};
  const updateHoursSpent=(id,h)=>{
    const hrs=Math.max(0,Number(h)||0);
    const u=learnings.map(l=>l.id!==id?l:{...l,hoursSpent:hrs});
    setData(d=>({...d,learnings:u}));save('learnings',u);
  };

  // Pomodoro timer — al completar un ciclo de enfoque, acumula 25min al curso seleccionado
  const selCourseRef=useRef(selCourse);
  useEffect(()=>{selCourseRef.current=selCourse;},[selCourse]);
  useEffect(()=>{
    if(pomActive){
      timerRef.current=setInterval(()=>{
        setPomSeconds(s=>{
          if(s<=1){
            clearInterval(timerRef.current);setPomActive(false);
            if(pomMode==='focus'){
              setPomCycles(c=>c+1);setStudyMin(m=>m+25);setPomMode('break');
              // Acumular horas al curso seleccionado
              const cId=selCourseRef.current;
              if(cId){
                setData(d=>{
                  const upd=(d.learnings||[]).map(l=>{
                    if(l.id!==cId)return l;
                    const newH=Math.round(((l.hoursSpent||0)+25/60)*100)/100;
                    // streak: actualizar si último día de estudio no es hoy
                    const newStreak=(l.lastStudyDate===today())?(l.streak||1):((l.lastStudyDate)===new Date(Date.now()-86400000).toISOString().slice(0,10)?(l.streak||0)+1:1);
                    return {...l,hoursSpent:newH,lastStudyDate:today(),streak:newStreak};
                  });
                  save('learnings',upd);
                  return {...d,learnings:upd};
                });
                toast.success('🍅 ¡Pomodoro completado! +25 min registrados');
              }
              return 5*60;
            }
            else{setPomMode('focus');return 25*60;}
          }
          return s-1;
        });
      },1000);
    } else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[pomActive,pomMode]);

  const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const pomTotalSecs=pomMode==='focus'?25*60:5*60;
  const pomPct=(1-pomSeconds/pomTotalSecs)*100;

  const IDEA_TAGS=['💡 Idea','✍️ Escritura','🎓 Educación','📋 Plantilla','🚀 Proyecto','🔧 Herramienta'];
  const LEARNING_COLORS=[T.blue,T.purple,T.accent,T.orange,T.red,T.yellow];
  const lColor=(l,i)=>l.color||(LEARNING_COLORS[i%LEARNING_COLORS.length]);
  const maxHours=Math.max(...learnings.map(l=>l.hoursSpent||0),1);

  const uniqueTags=[...new Set(ideas.map(i=>i.tag))];
  const filteredIdeas=ideaFilter==='all'?ideas:ideas.filter(i=>i.tag===ideaFilter);

  // Retrospectives
  const [retros,setRetros]=useState(data.retros||[]);
  const [retroForm,setRetroForm]=useState({bien:'',mejorar:'',aprendi:'',intencion:''});
  const saveRetro=()=>{
    const upd=[{id:uid(),...retroForm,date:today()},...retros];
    setRetros(upd);setData(d=>({...d,retros:upd}));save('retros',upd);
    setRetroForm({bien:'',mejorar:'',aprendi:'',intencion:''});
  };

  return (
    <div>
      <PageHeader title="Desarrollo Personal" subtitle="Aprende, reflexiona, crece 🧠" isMobile={isMobile} onBack={onBack}/>

      {/* Tab nav */}
      <div style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {[['learning','📚 Aprendizajes'],['pomodoro','⏱ Pomodoro'],['ideas','💡 Ideas'],['retro','📋 Retro']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'6px 14px',borderRadius:10,border:`1px solid ${tab===id?T.purple:T.border}`,background:tab===id?`${T.purple}18`:'transparent',color:tab===id?T.purple:T.muted,cursor:'pointer',fontSize:12,fontWeight:tab===id?700:400,fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LEARNING ── */}
      {tab==='learning'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={12}/>Agregar</Btn>
          </div>
          {/* Hours bar chart */}
          {learnings.length>0&&(
            <Card style={{marginBottom:14,padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>📊 Horas dedicadas por curso</div>
                <div style={{fontSize:11,color:T.muted}}>
                  Total: <strong style={{color:T.accent}}>{learnings.reduce((s,l)=>s+(l.hoursSpent||0),0).toFixed(1)}h</strong>
                  {' / '}{learnings.reduce((s,l)=>s+(l.hoursTotal||0),0)}h
                </div>
              </div>
              {/* Horizontal bars with labels */}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {learnings.map((l,i)=>{
                  const color=lColor(l,i);
                  const spent=l.hoursSpent||0;
                  const total=l.hoursTotal||1;
                  const pct=Math.min(Math.round((spent/total)*100),100);
                  const barW=maxHours>0?Math.max((spent/maxHours)*100,spent>0?4:0):0;
                  return (
                    <div key={l.id} style={{cursor:'pointer'}} onClick={()=>setSelCourse(selCourse===l.id?null:l.id)}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                        <span style={{fontSize:12,color:selCourse===l.id?color:T.text,fontWeight:selCourse===l.id?700:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{l.title}</span>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                          <span style={{fontSize:11,color:T.muted}}>{spent.toFixed(1)}h / {total}h</span>
                          <span style={{fontSize:10,fontWeight:700,color:pct>=100?T.green:pct>=50?color:T.muted,background:pct>=100?`${T.green}15`:`${color}12`,padding:'1px 7px',borderRadius:6}}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{height:8,background:T.border,borderRadius:4,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${barW}%`,background:selCourse===l.id?color:`${color}88`,borderRadius:4,transition:'all 0.4s'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {learnings.map((l,i)=>{
            const color=lColor(l,i);
            const isSel=selCourse===l.id;
            return (
              <Card key={l.id} style={{marginBottom:10,border:`1.5px solid ${isSel?color:T.border}`}} onClick={()=>setSelCourse(isSel?null:l.id)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:T.text}}>{l.title}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:2}}>{l.platform&&`${l.platform} · `}{l.category}</div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {(l.streak||0)>0&&<span style={{fontSize:11,color:T.orange,fontWeight:700}}>🔥{l.streak}d</span>}
                    <span style={{fontSize:14,fontWeight:800,color,fontFamily:'monospace'}}>{l.progress||0}%</span>
                    <button onClick={e=>{e.stopPropagation();delLearning(l.id);}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2}}><Icon name="trash" size={12}/></button>
                  </div>
                </div>
                <div style={{height:5,background:T.border,borderRadius:3,overflow:'hidden',marginBottom:4}}>
                  <div style={{height:'100%',width:`${l.progress||0}%`,background:color,borderRadius:3,transition:'width 0.5s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:T.muted}}>
                  <span>{l.hoursSpent||0}h de {l.hoursTotal||0}h</span>
                  <span>{(l.hoursTotal||0)-(l.hoursSpent||0)}h restantes</span>
                </div>
                {isSel&&(
                  <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`,display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:12,color:T.muted,flexShrink:0}}>Progreso:</span>
                      <input type="range" min={0} max={100} value={l.progress||0}
                        onChange={e=>{e.stopPropagation();updateProgress(l.id,Number(e.target.value));}}
                        onClick={e=>e.stopPropagation()}
                        style={{flex:1,accentColor:color}}/>
                      <span style={{fontSize:12,fontWeight:700,color,flexShrink:0}}>{l.progress||0}%</span>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                      <span style={{fontSize:12,color:T.muted,flexShrink:0}}>Horas reales:</span>
                      <input type="number" min={0} step={0.5} value={l.hoursSpent||0}
                        onChange={e=>updateHoursSpent(l.id,e.target.value)}
                        style={{width:80,background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'4px 8px',borderRadius:8,fontSize:12,outline:'none',textAlign:'center'}}/>
                      <span style={{fontSize:11,color:T.muted}}>de {l.hoursTotal||0}h</span>
                      {(l.streak||0)>0&&<span style={{fontSize:11,color:T.orange,fontWeight:700,marginLeft:'auto'}}>🔥 racha {l.streak}d</span>}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {!learnings.length&&<div style={{textAlign:'center',padding:'30px 0',color:T.dim}}><p style={{fontSize:14}}>Sin cursos aún</p><Btn size="sm" onClick={()=>setModal(true)} style={{marginTop:8}}><Icon name="plus" size={12}/>Agregar curso</Btn></div>}
          {modal&&<Modal title="Nuevo aprendizaje" onClose={()=>setModal(false)}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <Input value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Nombre del curso/libro/skill"/>
              <Input value={form.platform} onChange={v=>setForm(f=>({...f,platform:v}))} placeholder="Plataforma (Udemy, Coursera...)"/>
              <Input value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} placeholder="Categoría (Desarrollo, Diseño...)"/>
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1}}><label style={{fontSize:11,color:T.muted}}>Horas totales</label><Input type="number" value={form.hoursTotal} onChange={v=>setForm(f=>({...f,hoursTotal:Number(v)}))} placeholder="20"/></div>
                <div style={{flex:1}}><label style={{fontSize:11,color:T.muted}}>Progreso inicial %</label><Input type="number" value={form.progress} onChange={v=>setForm(f=>({...f,progress:Number(v)}))} placeholder="0"/></div>
              </div>
              <Btn onClick={saveLearning} style={{width:'100%',justifyContent:'center'}}>Agregar</Btn>
            </div>
          </Modal>}
        </div>
      )}

      {/* ── POMODORO ── */}
      {tab==='pomodoro'&&(
        <Card style={{padding:isMobile?20:28,textAlign:'center'}}>
          <div style={{fontSize:12,fontWeight:700,color:pomMode==='focus'?T.red:T.accent,textTransform:'uppercase',letterSpacing:2,marginBottom:16}}>
            {pomMode==='focus'?'🍅 Enfoque':'☕ Descanso'}
            {selCourse&&learnings.find(l=>l.id===selCourse)&&<span style={{color:T.muted,fontWeight:400,marginLeft:8,textTransform:'none'}}>— {learnings.find(l=>l.id===selCourse)?.title?.split(' ')[0]}</span>}
          </div>
          <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:24}}>
            <svg width={160} height={160} style={{transform:'rotate(-90deg)'}}>
              <circle cx={80} cy={80} r={68} fill="none" stroke={T.border} strokeWidth={10}/>
              <circle cx={80} cy={80} r={68} fill="none" stroke={pomMode==='focus'?T.red:T.accent} strokeWidth={10}
                strokeDasharray={`${2*Math.PI*68*(pomPct/100)} ${2*Math.PI*68}`} strokeLinecap="round"
                style={{transition:'stroke-dasharray 1s linear'}}/>
            </svg>
            <div style={{position:'absolute',textAlign:'center'}}>
              <div style={{fontSize:38,fontWeight:800,color:T.text,lineHeight:1}}>{fmtTime(pomSeconds)}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:4}}>{pomCycles} ciclos · {studyMin}min hoy</div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:16}}>
            <Btn onClick={()=>setPomActive(!pomActive)} style={{padding:'10px 28px',fontSize:14}}>
              {pomActive?'⏸ Pausar':'▶ Iniciar'}
            </Btn>
            <button onClick={()=>{setPomActive(false);setPomSeconds(25*60);setPomMode('focus');}}
              style={{padding:'10px 16px',borderRadius:12,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:16,fontFamily:'inherit'}}>↺</button>
          </div>
          {learnings.length>0&&(
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:8}}>Estudiando:</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {learnings.map((l,i)=>{
                  const color=lColor(l,i);
                  const isSel=selCourse===l.id;
                  return (
                    <button key={l.id} onClick={()=>setSelCourse(isSel?null:l.id)}
                      style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${isSel?color:T.border}`,background:isSel?`${color}20`:'transparent',color:isSel?color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                      {l.title.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── IDEAS MOODBOARD ── */}
      {tab==='ideas'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              <button onClick={()=>setIdeaFilter('all')}
                style={{padding:'4px 12px',borderRadius:8,border:`1px solid ${ideaFilter==='all'?T.purple:T.border}`,background:ideaFilter==='all'?`${T.purple}18`:'transparent',color:ideaFilter==='all'?T.purple:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                Todas ({ideas.length})
              </button>
              {uniqueTags.map(t=>{
                const cnt=ideas.filter(i=>i.tag===t).length;
                return (
                  <button key={t} onClick={()=>setIdeaFilter(ideaFilter===t?'all':t)}
                    style={{padding:'4px 12px',borderRadius:8,border:`1px solid ${ideaFilter===t?T.purple:T.border}`,background:ideaFilter===t?`${T.purple}18`:'transparent',color:ideaFilter===t?T.purple:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                    {t} ({cnt})
                  </button>
                );
              })}
            </div>
            <Btn size="sm" onClick={()=>setIdeaModal(true)}><Icon name="plus" size={12}/>Idea</Btn>
          </div>
          {/* Moodboard grid */}
          <div style={{columns:isMobile?1:2,gap:12,columnFill:'balance'}}>
            {filteredIdeas.map((idea,idx)=>{
              const tagColors={'💡 Idea':T.blue,'✍️ Escritura':T.purple,'🎓 Educación':T.orange,'📋 Plantilla':T.accent,'🚀 Proyecto':T.red,'🔧 Herramienta':T.yellow};
              const color=tagColors[idea.tag]||T.blue;
              const isLong=idea.content.length>120;
              const isShort=idea.content.length<40;
              const tagEmoji=idea.tag.split(' ')[0];
              return (
                <div key={idea.id} style={{
                  breakInside:'avoid',marginBottom:12,
                  background:`linear-gradient(135deg, ${color}08, ${color}04)`,
                  border:`1.5px solid ${color}30`,
                  borderRadius:16,
                  padding:isShort?'16px 18px':'18px 18px 14px',
                  position:'relative',
                  overflow:'hidden',
                }}>
                  {/* Decorative bg emoji */}
                  <div style={{position:'absolute',top:-8,right:-8,fontSize:isLong?64:48,opacity:0.06,pointerEvents:'none',lineHeight:1}}>{tagEmoji}</div>
                  {/* Tag + date header */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:isShort?6:10,position:'relative',zIndex:1}}>
                    <span style={{fontSize:11,fontWeight:700,color,background:`${color}18`,padding:'3px 10px',borderRadius:8}}>{idea.tag}</span>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {idea.createdAt&&<span style={{fontSize:9,color:T.dim}}>{fmt(idea.createdAt)}</span>}
                      <button onClick={()=>delIdea(idea.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2,display:'flex'}}><Icon name="trash" size={11}/></button>
                    </div>
                  </div>
                  {/* Content */}
                  <p style={{fontSize:isShort?15:13,color:T.text,margin:0,lineHeight:1.65,position:'relative',zIndex:1,fontWeight:isShort?600:400}}>{idea.content}</p>
                  {/* Bottom accent bar */}
                  <div style={{height:2,background:`linear-gradient(90deg, ${color}60, transparent)`,borderRadius:2,marginTop:isShort?8:12}}/>
                </div>
              );
            })}
          </div>
          {!filteredIdeas.length&&<div style={{textAlign:'center',padding:'30px 0',color:T.dim}}><div style={{fontSize:48,marginBottom:10}}>💡</div><p style={{fontSize:14,marginBottom:4}}>Sin ideas aún — ¡captura todo!</p><p style={{fontSize:12,color:T.dim}}>Las ideas son semillas: captura rápido, clasifica después.</p><Btn size="sm" onClick={()=>setIdeaModal(true)} style={{marginTop:12}}><Icon name="plus" size={12}/>Nueva idea</Btn></div>}
          {ideaModal&&<Modal title="Nueva idea" onClose={()=>setIdeaModal(false)}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <Textarea value={ideaForm.content} onChange={v=>setIdeaForm(f=>({...f,content:v}))} placeholder="¿Qué tienes en mente?" rows={4}/>
              <Select value={ideaForm.tag} onChange={v=>setIdeaForm(f=>({...f,tag:v}))}>
                {IDEA_TAGS.map(t=><option key={t} value={t}>{t}</option>)}
              </Select>
              <Btn onClick={saveIdea} style={{width:'100%',justifyContent:'center'}}>Guardar idea</Btn>
            </div>
          </Modal>}
        </div>
      )}

      {/* ── RETROSPECTIVA ── */}
      {tab==='retro'&&(
        <div>
          <Card style={{padding:18,marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:4}}>📋 Retrospectiva semanal</div>
            <div style={{fontSize:12,color:T.muted,marginBottom:14}}>{new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</div>
            {[
              {key:'bien',q:'¿Qué salió bien esta semana?',color:T.accent,icon:'✅'},
              {key:'mejorar',q:'¿Qué mejorar la próxima semana?',color:T.orange,icon:'🔧'},
              {key:'aprendi',q:'¿Qué aprendí?',color:T.blue,icon:'💡'},
              {key:'intencion',q:'Intención para la próxima semana',color:T.purple,icon:'🎯'},
            ].map(s=>(
              <div key={s.key} style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <span>{s.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:s.color}}>{s.q}</span>
                </div>
                <Textarea value={retroForm[s.key]} onChange={v=>setRetroForm(f=>({...f,[s.key]:v}))} placeholder="" rows={2}/>
              </div>
            ))}
            <Btn onClick={saveRetro} style={{width:'100%',justifyContent:'center'}}>Guardar retrospectiva</Btn>
          </Card>
          {retros.length>0&&(
            <div>
              <h3 style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Retrospectivas anteriores</h3>
              {retros.slice(0,3).map(r=>(
                <Card key={r.id} style={{marginBottom:10,padding:14}}>
                  <div style={{fontSize:11,color:T.muted,marginBottom:8}}>{fmt(r.date)}</div>
                  {r.bien&&<p style={{fontSize:12,color:T.text,margin:'0 0 4px'}}><span style={{color:T.accent}}>✅</span> {r.bien}</p>}
                  {r.aprendi&&<p style={{fontSize:12,color:T.text,margin:0}}><span style={{color:T.blue}}>💡</span> {r.aprendi}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};



export default DesarrolloPersonal;
