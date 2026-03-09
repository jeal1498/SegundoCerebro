import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

import { toast } from './Toast.jsx';
// ===================== RELACIONES =====================
const Relaciones = ({data,setData,isMobile,onBack}) => {
  const [tab,setTab]               = useState('personas');
  const [modalPerson,setModalPerson]   = useState(false);
  const [modalFollowUp,setModalFollowUp] = useState(false);
  const [modalInteraction,setModalInteraction] = useState(false);
  const [selPerson,setSelPerson]       = useState(null);
  const [editingPerson,setEditingPerson] = useState(null);
  const [personForm,setPersonForm]     = useState({name:'',relation:'',birthday:'',emoji:'👤',phone:'',email:'',notes:''});
  const [followForm,setFollowForm]     = useState({personId:'',task:'',dueDate:'',priority:'media',done:false});
  const [interForm,setInterForm]       = useState({personId:'',type:'Mensaje',notes:'',date:today()});
  const [personSearch,setPersonSearch] = useState('');
  const [relationFilter,setRelationFilter] = useState('todas');
  const [tlPersonFilter,setTlPersonFilter] = useState('all');
  const [tlTypeFilter,setTlTypeFilter]     = useState('all');

  const people       = data.people||[];
  const followUps    = data.followUps||[];
  const interactions = data.interactions||[];

  // ── helpers ──
  const fmtDate=(d)=>{ try{ return new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}); }catch{return d||'—';} };

  const birthdayDaysLeft=(bday)=>{
    if(!bday) return null;
    const now=new Date(); const [,m,d]=bday.split('-');
    const next=new Date(now.getFullYear(),Number(m)-1,Number(d));
    if(next<now) next.setFullYear(now.getFullYear()+1);
    return Math.ceil((next-now)/(1000*60*60*24));
  };

  // ── summary ──
  const upcomingBdays  = people.filter(p=>{ const dl=birthdayDaysLeft(p.birthday); return dl!==null&&dl<=7; });
  const pendingFollows = followUps.filter(f=>!f.done);
  const lastInter      = [...interactions].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const lastInterDays  = lastInter ? Math.floor((new Date()-new Date(lastInter.date+'T12:00:00'))/(1000*60*60*24)) : null;

  // ── PERSON actions ──
  const RELATIONS=['Amigo','Familiar','Pareja','Colega','Mentor','Cliente','Conocido','Otro'];
  const EMOJIS=['👤','👨','👩','👦','👧','🧑','👴','👵','🧔','👨‍💼','👩‍💼','🧑‍💻','👨‍🏫','👩‍🏫'];
  const savePerson=()=>{
    if(!personForm.name.trim()) return;
    const p={id:editingPerson?.id||uid(),...personForm,createdAt:editingPerson?.createdAt||today()};
    const upd=editingPerson?people.map(x=>x.id===p.id?p:x):[p,...people];
    setData(d=>({...d,people:upd})); save('people',upd);
    setModalPerson(false); setEditingPerson(null);
    setPersonForm({name:'',relation:'',birthday:'',emoji:'👤',phone:'',email:'',notes:''});
  };
  const openEditPerson=(p)=>{ setPersonForm({name:p.name,relation:p.relation||'',birthday:p.birthday||'',emoji:p.emoji||'👤',phone:p.phone||'',email:p.email||'',notes:p.notes||''}); setEditingPerson(p); setModalPerson(true); };
  const delPerson=(id)=>{
    if(!window.confirm('¿Eliminar esta persona?')) return;
    const upd=people.filter(p=>p.id!==id); setData(d=>({...d,people:upd})); save('people',upd);
    if(selPerson?.id===id) setSelPerson(null);
  };

  // ── FOLLOWUP actions ──
  const saveFollowUp=()=>{
    if(!followForm.task.trim()) return;
    const f={id:uid(),...followForm,done:false,createdAt:today()};
    const upd=[f,...followUps]; setData(d=>({...d,followUps:upd})); save('followUps',upd);
    setModalFollowUp(false); setFollowForm({personId:selPerson?.id||'',task:'',dueDate:'',priority:'media',done:false});
  };
  const toggleFollowUp=(id)=>{
    const upd=followUps.map(f=>f.id===id?{...f,done:!f.done}:f);
    setData(d=>({...d,followUps:upd})); save('followUps',upd);
  };
  const delFollowUp=(id)=>{ const upd=followUps.filter(f=>f.id!==id); setData(d=>({...d,followUps:upd})); save('followUps',upd); };

  // ── INTERACTION actions ──
  const INTER_TYPES=['Mensaje','Llamada','Videollamada','Comida','Café','Evento','Email','Visita','Otro'];
  const saveInteraction=()=>{
    if(!interForm.personId) return;
    const i={id:uid(),...interForm,createdAt:today()};
    const upd=[i,...interactions]; setData(d=>({...d,interactions:upd})); save('interactions',upd);
    setModalInteraction(false); setInterForm({personId:selPerson?.id||'',type:'Mensaje',notes:'',date:today()});
  };
  const delInteraction=(id)=>{ const upd=interactions.filter(i=>i.id!==id); setData(d=>({...d,interactions:upd})); save('interactions',upd); };

  const personName=(id)=>people.find(p=>p.id===id)?.name||'Desconocido';
  const personEmoji=(id)=>people.find(p=>p.id===id)?.emoji||'👤';

  // ── Export contacts ──
  const exportContactsCSV=()=>{
    const rows=[['Nombre','Relación','Cumpleaños','Teléfono','Email','Notas'],
      ...people.map(p=>[p.name,p.relation||'',p.birthday||'',p.phone||'',p.email||'',(p.notes||'').replace(/,/g,';')])];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='contactos.csv';a.click();
    toast.success(`📥 ${people.length} contactos exportados`);
  };
  const exportContactsVCard=()=>{
    const vcf=people.map(p=>[
      'BEGIN:VCARD','VERSION:3.0',
      `FN:${p.name}`,
      p.phone?`TEL:${p.phone}`:'',
      p.email?`EMAIL:${p.email}`:'',
      p.birthday?`BDAY:${p.birthday.replace(/-/g,'')}`.slice(0,14):'',
      p.notes?`NOTE:${p.notes.replace(/\n/g,'\\n')}`:'',
      'END:VCARD'
    ].filter(Boolean).join('\r\n')).join('\r\n\r\n');
    const blob=new Blob([vcf],{type:'text/vcard;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='contactos.vcf';a.click();
    toast.success(`📱 ${people.length} contactos exportados como vCard`);
  };

  // ── Temperature helpers ──
  const daysAgoFn=(date)=>{try{return Math.floor((new Date()-new Date(date+'T12:00:00'))/86400000);}catch{return 999;}};
  const lastContactDate=(p)=>{
    const pInter=[...interactions].filter(i=>i.personId===p.id).sort((a,b)=>b.date.localeCompare(a.date));
    return pInter[0]?.date||p.createdAt||null;
  };
  const tempColor=(days)=>days<=7?T.green:days<=21?T.orange:days<=60?T.yellow:T.red;
  const tempLabel=(days)=>days<=3?'🟢 Caliente':days<=14?'🟡 Tibio':days<=30?'🟠 Enfriando':'🔴 Frío';


  const priorityColor=(p)=>p==='alta'?T.red:p==='media'?T.orange:T.green;

  return (
    <div>
      <PageHeader isMobile={isMobile} title="👥 Relaciones" onBack={onBack}
        subtitle="CRM personal — personas, seguimientos e interacciones"
        action={
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {tab==='personas'&&people.length>0&&(
              <div style={{display:'flex',gap:4}}>
                <button onClick={exportContactsCSV} title="Exportar CSV" style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>↓ CSV</button>
                <button onClick={exportContactsVCard} title="Exportar vCard" style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>↓ vCard</button>
              </div>
            )}
            {tab==='personas'     &&<Btn size="sm" onClick={()=>{setEditingPerson(null);setPersonForm({name:'',relation:'',birthday:'',emoji:'👤',phone:'',email:'',notes:''});setModalPerson(true);}}><Icon name="plus" size={14}/>Persona</Btn>}
            {tab==='seguimientos' &&<Btn size="sm" onClick={()=>{setFollowForm({personId:selPerson?.id||'',task:'',dueDate:'',priority:'media',done:false});setModalFollowUp(true);}}><Icon name="plus" size={14}/>Seguimiento</Btn>}
            {tab==='historial'    &&<Btn size="sm" onClick={()=>{setInterForm({personId:selPerson?.id||'',type:'Mensaje',notes:'',date:today()});setModalInteraction(true);}}><Icon name="plus" size={14}/>Contacto</Btn>}
          </div>
        }
      />

      {/* ── Summary cards ── */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[
          {label:'Cumpleaños próximos', val:upcomingBdays.length,  color:upcomingBdays.length>0?T.orange:T.muted, icon:'🎂'},
          {label:'Seguimientos pendientes', val:pendingFollows.length, color:pendingFollows.length>0?T.accent:T.muted, icon:'📋'},
          {label:'Personas',           val:people.length,          color:T.blue,  icon:'👥'},
          {label:'Último contacto',    val:lastInterDays===null?'—':`hace ${lastInterDays}d`, color:lastInterDays===null||lastInterDays>14?T.orange:T.green, icon:'💬'},
        ].map(s=>(
          <Card key={s.label} style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:isMobile?18:22,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Birthday banner ── */}
      {upcomingBdays.length>0&&(
        <div style={{padding:'12px 16px',background:`${T.orange}12`,border:`1px solid ${T.orange}30`,borderRadius:12,marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>🎂</span>
          <div style={{flex:1}}>
            <div style={{color:T.text,fontSize:13,fontWeight:600}}>Cumpleaños próximos</div>
            <div style={{color:T.muted,fontSize:12,marginTop:2}}>
              {upcomingBdays.map(p=>{
                const dl=birthdayDaysLeft(p.birthday);
                return <span key={p.id} style={{marginRight:12}}>{p.emoji} {p.name} — {dl===0?'¡hoy!':dl===1?'mañana':`en ${dl}d`}</span>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[{id:'personas',label:'🧑 Personas'},{id:'seguimientos',label:'📋 Seguimientos'},{id:'historial',label:'💬 Historial'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'7px 16px',borderRadius:10,border:`1px solid ${tab===t.id?T.accent:T.border}`,background:tab===t.id?`${T.accent}18`:'transparent',color:tab===t.id?T.accent:T.muted,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?600:400,fontFamily:'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ PERSONAS ══════════ */}
      {tab==='personas'&&(
        <div>
          {/* Person detail panel */}
          {selPerson&&(()=>{
            const personFollows=followUps.filter(f=>f.personId===selPerson.id&&!f.done);
            const personInters=[...interactions].filter(i=>i.personId===selPerson.id).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
            const lcd=lastContactDate(selPerson);
            const days=lcd?daysAgoFn(lcd):999;
            const tc=tempColor(days);
            const tl=tempLabel(days);
            return (
              <Card style={{marginBottom:16,borderLeft:`3px solid ${tc}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:48,height:48,borderRadius:14,background:`${T.accent}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{selPerson.emoji}</div>
                    <div>
                      <div style={{color:T.text,fontWeight:700,fontSize:16}}>{selPerson.name}</div>
                      <div style={{color:T.muted,fontSize:12,marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                        {selPerson.relation&&<span>{selPerson.relation}</span>}
                        {selPerson.birthday&&<span>🎂 {fmtDate(selPerson.birthday)} {birthdayDaysLeft(selPerson.birthday)!==null?`(en ${birthdayDaysLeft(selPerson.birthday)}d)`:''}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEditPerson(selPerson)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit'}}>✏️</button>
                    <button onClick={()=>delPerson(selPerson.id)} style={{background:'none',border:'none',color:T.red,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={15}/></button>
                  </div>
                </div>
                {/* contact buttons */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:selPerson.notes||personFollows.length>0||personInters.length>0?12:0}}>
                  {selPerson.phone&&<a href={`tel:${selPerson.phone}`} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:`${T.green}15`,border:`1px solid ${T.green}30`,borderRadius:8,color:T.green,fontSize:12,fontWeight:600,textDecoration:'none'}}>📞 {selPerson.phone}</a>}
                  {selPerson.email&&<a href={`mailto:${selPerson.email}`} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:8,color:T.blue,fontSize:12,fontWeight:600,textDecoration:'none'}}>✉️ {selPerson.email}</a>}
                  <button onClick={()=>{setInterForm({personId:selPerson.id,type:'Mensaje',notes:'',date:today()});setModalInteraction(true);}} style={{padding:'6px 12px',background:`${T.purple}15`,border:`1px solid ${T.purple}30`,borderRadius:8,color:T.purple,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>💬 Registrar contacto</button>
                  <button onClick={()=>{setFollowForm({personId:selPerson.id,task:'',dueDate:'',priority:'media',done:false});setModalFollowUp(true);}} style={{padding:'6px 12px',background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:8,color:T.accent,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>📋 Agregar seguimiento</button>
                </div>
                {/* Temperature bar */}
                <div style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:T.muted}}>Temperatura de relación</span>
                    <span style={{fontSize:11,fontWeight:700,color:tc}}>{tl} {days<999?`· hace ${days}d`:''}</span>
                  </div>
                  <div style={{height:5,background:T.border,borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.max(0,100-Math.min(days*1.5,100))}%`,background:tc,borderRadius:3,transition:'width 0.5s'}}/>
                  </div>
                </div>
                {selPerson.notes&&<div style={{color:T.muted,fontSize:12,lineHeight:1.6,marginBottom:personFollows.length>0||personInters.length>0?12:0}}>{selPerson.notes}</div>}
                {personFollows.length>0&&(
                  <div style={{marginBottom:personInters.length>0?10:0}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.accent,marginBottom:6}}>Pendientes</div>
                    {personFollows.map(f=>(
                      <div key={f.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
                        <button onClick={()=>toggleFollowUp(f.id)} style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${priorityColor(f.priority)}`,background:'transparent',cursor:'pointer',flexShrink:0}}/>
                        <span style={{color:T.text,fontSize:12,flex:1}}>{f.task}</span>
                        {f.dueDate&&<span style={{color:T.dim,fontSize:11}}>{fmtDate(f.dueDate)}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {personInters.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:T.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Últimos contactos</div>
                    <div style={{position:'relative',paddingLeft:28}}>
                      <div style={{position:'absolute',left:8,top:4,bottom:4,width:1.5,background:T.border,borderRadius:2}}/>
                      {personInters.map((i,idx)=>{
                        const TYPE_ICONS={'Mensaje':'💬','Llamada':'📞','Videollamada':'🎥','Comida':'🍽️','Café':'☕','Evento':'🎉','Email':'✉️','Visita':'🏠','Otro':'📌'};
                        return (
                          <div key={i.id} style={{position:'relative',marginBottom:idx===personInters.length-1?0:8}}>
                            <div style={{position:'absolute',left:-24,top:2,width:16,height:16,borderRadius:'50%',background:T.surface,border:`1.5px solid ${T.purple}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>{TYPE_ICONS[i.type]||'•'}</div>
                            <div style={{fontSize:12,color:T.muted,lineHeight:1.4}}>
                              <span style={{color:T.accent,fontWeight:600,marginRight:5}}>{i.type}</span>
                              {i.notes&&<span style={{marginRight:6}}>{i.notes}</span>}
                              <span style={{color:T.dim,fontSize:10}}>{fmtDate(i.date)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}

          {people.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>👥</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin personas registradas</div>
               <Btn size="sm" onClick={()=>setModalPerson(true)}><Icon name="plus" size={13}/>Agregar</Btn>
             </div>
            :<div>
               {/* Search + relation filter */}
               <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                 <div style={{flex:1,minWidth:160,position:'relative'}}>
                   <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13,color:T.dim,pointerEvents:'none'}}>🔍</span>
                   <input value={personSearch} onChange={e=>setPersonSearch(e.target.value)}
                     placeholder="Buscar por nombre, relación…"
                     style={{width:'100%',background:T.surface2,border:`1px solid ${personSearch?T.accent:T.border}`,color:T.text,padding:'8px 10px 8px 30px',borderRadius:10,fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color 0.15s'}}/>
                   {personSearch&&<button onClick={()=>setPersonSearch('')} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.dim,cursor:'pointer',fontSize:14,padding:2}}>✕</button>}
                 </div>
                 <select value={relationFilter} onChange={e=>setRelationFilter(e.target.value)}
                   style={{background:T.surface2,border:`1px solid ${relationFilter!=='todas'?T.accent:T.border}`,color:T.text,padding:'8px 10px',borderRadius:10,fontSize:13,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                   <option value="todas">Todas las relaciones</option>
                   {[...new Set(people.map(p=>p.relation).filter(Boolean))].sort().map(r=><option key={r}>{r}</option>)}
                 </select>
               </div>
               {/* Results count when filtering */}
               {(personSearch||relationFilter!=='todas')&&(()=>{
                 const ps=s=>(s||'').toLowerCase();
                 const match=(p)=>{
                   const sq=ps(personSearch);
                   const textMatch=!sq||(ps(p.name).includes(sq)||ps(p.relation).includes(sq)||ps(p.notes).includes(sq)||ps(p.phone).includes(sq)||ps(p.email).includes(sq));
                   const relMatch=relationFilter==='todas'||p.relation===relationFilter;
                   return textMatch&&relMatch;
                 };
                 const cnt=people.filter(match).length;
                 return <div style={{fontSize:11,color:T.muted,marginBottom:8}}>{cnt} persona{cnt!==1?'s':''} encontrada{cnt!==1?'s':''}</div>;
               })()}
               <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
               {(()=>{
                 const ps=s=>(s||'').toLowerCase();
                 const match=(p)=>{
                   const sq=ps(personSearch);
                   const textMatch=!sq||(ps(p.name).includes(sq)||ps(p.relation).includes(sq)||ps(p.notes).includes(sq)||ps(p.phone).includes(sq)||ps(p.email).includes(sq));
                   const relMatch=relationFilter==='todas'||p.relation===relationFilter;
                   return textMatch&&relMatch;
                 };
                 const visible=people.filter(match);
                 if(!visible.length) return <div style={{gridColumn:'1/-1',textAlign:'center',padding:'28px 0',color:T.dim,fontSize:13}}>Sin resultados para "<span style={{color:T.accent}}>{personSearch}</span>"</div>;
                 return visible.map(p=>{
                 const dl=birthdayDaysLeft(p.birthday);
                 const pFollows=followUps.filter(f=>f.personId===p.id&&!f.done).length;
                 const lcd=lastContactDate(p);
                 const days=lcd?daysAgoFn(lcd):999;
                 const tc=tempColor(days);
                 const tl=tempLabel(days);
                 return (
                   <div key={p.id} onClick={()=>setSelPerson(selPerson?.id===p.id?null:p)}
                     style={{padding:'14px',background:T.surface,border:`1px solid ${selPerson?.id===p.id?T.accent:T.border}`,borderTop:`3px solid ${tc}`,borderRadius:12,cursor:'pointer',transition:'border-color 0.15s',position:'relative'}}>
                     {dl!==null&&dl<=7&&<span style={{position:'absolute',top:8,right:8,fontSize:14}}>🎂</span>}
                     <div style={{fontSize:30,marginBottom:6}}>{p.emoji}</div>
                     <div style={{color:T.text,fontSize:13,fontWeight:600}}>{p.name}</div>
                     {p.relation&&<div style={{fontSize:10,color:T.muted,marginTop:1}}>{p.relation}</div>}
                     <div style={{fontSize:10,color:tc,marginTop:4,fontWeight:600}}>{tl}</div>
                     {lcd&&<div style={{fontSize:9,color:T.dim,marginTop:1}}>hace {days}d</div>}
                     {pFollows>0&&<div style={{marginTop:5,fontSize:10,color:T.accent,background:`${T.accent}15`,padding:'1px 7px',borderRadius:7,display:'inline-block'}}>{pFollows} pendiente{pFollows>1?'s':''}</div>}
                   </div>
                 );
                 });
               })()}
               </div>
             </div>
          }
        </div>
      )}

      {/* ══════════ SEGUIMIENTOS ══════════ */}
      {tab==='seguimientos'&&(
        <div>
          {followUps.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>📋</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin seguimientos pendientes</div>
               <Btn size="sm" onClick={()=>setModalFollowUp(true)}><Icon name="plus" size={13}/>Agregar</Btn>
             </div>
            :<div>
               {/* pending */}
               {pendingFollows.length>0&&(
                 <div style={{marginBottom:20}}>
                   <div style={{fontSize:12,fontWeight:600,color:T.muted,marginBottom:10}}>PENDIENTES</div>
                   {[...pendingFollows].sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).map(f=>(
                     <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:11,marginBottom:8,borderLeft:`3px solid ${priorityColor(f.priority)}`}}>
                       <button onClick={()=>toggleFollowUp(f.id)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${priorityColor(f.priority)}`,background:'transparent',cursor:'pointer',flexShrink:0}}/>
                       <div style={{flex:1}}>
                         <div style={{color:T.text,fontSize:13,fontWeight:500}}>{f.task}</div>
                         <div style={{color:T.muted,fontSize:11,marginTop:2,display:'flex',gap:8}}>
                           <span>{personEmoji(f.personId)} {personName(f.personId)}</span>
                           {f.dueDate&&<span>📅 {fmtDate(f.dueDate)}</span>}
                         </div>
                       </div>
                       <button onClick={()=>delFollowUp(f.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                     </div>
                   ))}
                 </div>
               )}
               {/* done */}
               {followUps.filter(f=>f.done).length>0&&(
                 <div style={{opacity:0.5}}>
                   <div style={{fontSize:12,fontWeight:600,color:T.muted,marginBottom:10}}>COMPLETADOS</div>
                   {followUps.filter(f=>f.done).map(f=>(
                     <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:T.surface,borderRadius:10,marginBottom:6}}>
                       <button onClick={()=>toggleFollowUp(f.id)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${T.green}`,background:`${T.green}30`,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                         <Icon name="check" size={12} color={T.green}/>
                       </button>
                       <div style={{flex:1}}>
                         <div style={{color:T.muted,fontSize:13,textDecoration:'line-through'}}>{f.task}</div>
                         <div style={{color:T.dim,fontSize:11}}>{personEmoji(f.personId)} {personName(f.personId)}</div>
                       </div>
                       <button onClick={()=>delFollowUp(f.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={12}/></button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          }
        </div>
      )}

      {/* ══════════ HISTORIAL (TIMELINE) ══════════ */}
      {tab==='historial'&&(
        <div>
          {/* Filters */}
          {interactions.length>0&&(
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
              <select value={tlPersonFilter} onChange={e=>setTlPersonFilter(e.target.value)}
                style={{background:T.surface2,border:`1px solid ${tlPersonFilter!=='all'?T.accent:T.border}`,color:tlPersonFilter!=='all'?T.accent:T.muted,padding:'6px 10px',borderRadius:9,fontSize:12,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                <option value="all">Todas las personas</option>
                {people.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
              <select value={tlTypeFilter} onChange={e=>setTlTypeFilter(e.target.value)}
                style={{background:T.surface2,border:`1px solid ${tlTypeFilter!=='all'?T.accent:T.border}`,color:tlTypeFilter!=='all'?T.accent:T.muted,padding:'6px 10px',borderRadius:9,fontSize:12,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                <option value="all">Todos los tipos</option>
                {INTER_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              {(tlPersonFilter!=='all'||tlTypeFilter!=='all')&&(
                <button onClick={()=>{setTlPersonFilter('all');setTlTypeFilter('all');}}
                  style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.dim,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                  ✕ Limpiar
                </button>
              )}
            </div>
          )}

          {interactions.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>💬</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin interacciones registradas</div>
               <Btn size="sm" onClick={()=>setModalInteraction(true)}><Icon name="plus" size={13}/>Registrar</Btn>
             </div>
            :(()=>{
              const TYPE_ICONS={'Mensaje':'💬','Llamada':'📞','Videollamada':'🎥','Comida':'🍽️','Café':'☕','Evento':'🎉','Email':'✉️','Visita':'🏠','Otro':'📌'};
              const filtered=[...interactions]
                .filter(i=>(tlPersonFilter==='all'||i.personId===tlPersonFilter)&&(tlTypeFilter==='all'||i.type===tlTypeFilter))
                .sort((a,b)=>b.date.localeCompare(a.date));
              if(!filtered.length) return <div style={{textAlign:'center',padding:'28px 0',color:T.dim,fontSize:13}}>Sin interacciones con estos filtros</div>;

              // Group by month
              const byMonth={};
              filtered.forEach(i=>{
                const key=i.date.slice(0,7);
                if(!byMonth[key])byMonth[key]=[];
                byMonth[key].push(i);
              });

              return Object.entries(byMonth).map(([month,items])=>(
                <div key={month} style={{marginBottom:28}}>
                  {/* Month header */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                    <span style={{fontSize:12,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:1,whiteSpace:'nowrap'}}>
                      {new Date(month+'-01').toLocaleDateString('es-ES',{month:'long',year:'numeric'})}
                    </span>
                    <div style={{flex:1,height:1,background:T.border}}/>
                    <span style={{fontSize:11,color:T.dim,whiteSpace:'nowrap'}}>{items.length} contacto{items.length!==1?'s':''}</span>
                  </div>

                  {/* Timeline entries */}
                  <div style={{position:'relative',paddingLeft:44}}>
                    {/* Vertical line */}
                    <div style={{position:'absolute',left:16,top:8,bottom:8,width:2,background:`${T.border}`,borderRadius:2}}/>

                    {items.map((i,idx)=>{
                      const person=people.find(p=>p.id===i.personId);
                      const typeIcon=TYPE_ICONS[i.type]||'📌';
                      const isLast=idx===items.length-1;
                      return (
                        <div key={i.id} style={{position:'relative',marginBottom:isLast?0:14}}>
                          {/* Node dot */}
                          <div style={{
                            position:'absolute',left:-36,top:6,
                            width:22,height:22,borderRadius:'50%',
                            background:T.surface2,border:`2px solid ${T.purple}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:11,zIndex:1,
                          }}>
                            {typeIcon}
                          </div>

                          {/* Card */}
                          <div style={{
                            background:T.surface,border:`1px solid ${T.border}`,
                            borderRadius:11,padding:'10px 14px',
                            transition:'border-color 0.15s',
                          }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=T.purple}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:i.notes?4:0}}>
                                  <span style={{fontSize:16,flexShrink:0}}>{person?.emoji||'👤'}</span>
                                  <span style={{color:T.text,fontSize:13,fontWeight:600}}>{person?.name||'—'}</span>
                                  <span style={{fontSize:11,color:T.purple,background:`${T.purple}15`,padding:'2px 8px',borderRadius:8,fontWeight:600}}>{i.type}</span>
                                  <span style={{fontSize:11,color:T.dim,marginLeft:'auto'}}>{new Date(i.date+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</span>
                                </div>
                                {i.notes&&<div style={{color:T.muted,fontSize:12,lineHeight:1.5,paddingLeft:24}}>{i.notes}</div>}
                              </div>
                              <button onClick={()=>delInteraction(i.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:2,flexShrink:0,opacity:0.6}}
                                onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.6}>
                                <Icon name="trash" size={12}/>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          }
        </div>
      )}

      {/* ══════════ MODALES ══════════ */}
      {modalPerson&&(
        <Modal title={editingPerson?'Editar persona':'Nueva persona'} onClose={()=>{setModalPerson(false);setEditingPerson(null);}}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Emoji / Avatar</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {EMOJIS.map(e=>(
                  <button key={e} onClick={()=>setPersonForm(f=>({...f,emoji:e}))}
                    style={{width:36,height:36,borderRadius:8,border:`2px solid ${personForm.emoji===e?T.accent:T.border}`,background:personForm.emoji===e?`${T.accent}18`:'transparent',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <Input value={personForm.name} onChange={v=>setPersonForm(f=>({...f,name:v}))} placeholder="Nombre"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Select value={personForm.relation} onChange={v=>setPersonForm(f=>({...f,relation:v}))}>
                <option value="">— Relación —</option>
                {RELATIONS.map(r=><option key={r}>{r}</option>)}
              </Select>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:4}}>Cumpleaños</div>
                <Input value={personForm.birthday} onChange={v=>setPersonForm(f=>({...f,birthday:v}))} type="date"/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input value={personForm.phone} onChange={v=>setPersonForm(f=>({...f,phone:v}))} placeholder="Teléfono" type="tel"/>
              <Input value={personForm.email} onChange={v=>setPersonForm(f=>({...f,email:v}))} placeholder="Email" type="email"/>
            </div>
            <Textarea value={personForm.notes} onChange={v=>setPersonForm(f=>({...f,notes:v}))} placeholder="Notas (temas de conversación, contexto, intereses...)" rows={3}/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={savePerson} style={{flex:1,justifyContent:'center'}}>{editingPerson?'Guardar cambios':'Agregar'}</Btn>
            <Btn variant="ghost" onClick={()=>{setModalPerson(false);setEditingPerson(null);}}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalFollowUp&&(
        <Modal title="Nuevo seguimiento" onClose={()=>setModalFollowUp(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Select value={followForm.personId} onChange={v=>setFollowForm(f=>({...f,personId:v}))}>
              <option value="">— ¿Con quién? —</option>
              {people.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </Select>
            <Input value={followForm.task} onChange={v=>setFollowForm(f=>({...f,task:v}))} placeholder="¿Qué tienes que hacer? (ej: Llamar, Enviar info, Agradecer...)"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:4}}>Fecha límite</div>
                <Input value={followForm.dueDate} onChange={v=>setFollowForm(f=>({...f,dueDate:v}))} type="date"/>
              </div>
              <Select value={followForm.priority} onChange={v=>setFollowForm(f=>({...f,priority:v}))}>
                <option value="baja">🟢 Baja</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🔴 Alta</option>
              </Select>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveFollowUp} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalFollowUp(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalInteraction&&(
        <Modal title="Registrar contacto" onClose={()=>setModalInteraction(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Select value={interForm.personId} onChange={v=>setInterForm(f=>({...f,personId:v}))}>
              <option value="">— ¿Con quién? —</option>
              {people.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </Select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Select value={interForm.type} onChange={v=>setInterForm(f=>({...f,type:v}))}>
                {INTER_TYPES.map(t=><option key={t}>{t}</option>)}
              </Select>
              <Input value={interForm.date} onChange={v=>setInterForm(f=>({...f,date:v}))} type="date"/>
            </div>
            <Textarea value={interForm.notes} onChange={v=>setInterForm(f=>({...f,notes:v}))} placeholder="Notas de la conversación, temas tratados..." rows={3}/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveInteraction} style={{flex:1,justifyContent:'center'}}>Registrar</Btn>
            <Btn variant="ghost" onClick={()=>setModalInteraction(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default Relaciones;
