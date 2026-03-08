import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== JOURNAL =====================
const Journal = ({data,setData,isMobile}) => {
  const MOODS=[{e:'😄',l:'Genial'},{e:'🙂',l:'Bien'},{e:'😐',l:'Regular'},{e:'😔',l:'Mal'},{e:'😤',l:'Estresado'}];
  const PROMPTS=['¿Qué salió bien hoy?','¿Qué aprendí hoy?','¿Por qué estoy agradecido?','¿Qué haría diferente?','¿Cuál es mi intención para mañana?'];
  const [sel,setSel]=useState(null);
  const [writing,setWriting]=useState(false);
  const [form,setForm]=useState({mood:'',content:'',gratitude:'',intention:''});
  const todayStr=today();
  const todayEntry=(data.journal||[]).find(j=>j.date===todayStr);

  const save=()=>{
    if(!form.content.trim()&&!form.gratitude.trim())return;
    const entry={id:uid(),date:todayStr,mood:form.mood,content:form.content,gratitude:form.gratitude,intention:form.intention,createdAt:todayStr};
    const existing=(data.journal||[]).find(j=>j.date===todayStr);
    const upd=existing?(data.journal||[]).map(j=>j.date===todayStr?{...j,...form}:j):[entry,...(data.journal||[])];
    setData(d=>({...d,journal:upd}));
    import('react').then(()=>{});
    const s=JSON.stringify(upd);try{localStorage.setItem('journal',s);}catch(e){}
    try{window.storage?.set('journal',s);}catch(e){}
    setWriting(false);setSel(upd.find(j=>j.date===todayStr)||entry);
  };

  const del=(id)=>{
    if(!window.confirm('¿Eliminar esta entrada?'))return;
    const upd=(data.journal||[]).filter(j=>j.id!==id);
    setData(d=>({...d,journal:upd}));
    try{localStorage.setItem('journal',JSON.stringify(upd));}catch(e){}
    try{window.storage?.set('journal',JSON.stringify(upd));}catch(e){}
    if(sel?.id===id)setSel(null);
  };

  const openWrite=(entry)=>{
    if(entry){setForm({mood:entry.mood||'',content:entry.content||'',gratitude:entry.gratitude||'',intention:entry.intention||''});}
    else{setForm({mood:'',content:'',gratitude:'',intention:''});}
    setWriting(true);
  };

  const streak=(()=>{let s=0,d=new Date();while(true){const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(!(data.journal||[]).find(j=>j.date===ds))break;s++;d.setDate(d.getDate()-1);}return s;})();

  return (
    <div>
      <PageHeader title="Journal" subtitle="Tu espacio de reflexión diaria." isMobile={isMobile}
        action={<Btn size="sm" onClick={()=>openWrite(todayEntry)}><Icon name="plus" size={14}/>{todayEntry?'Editar hoy':'Escribir hoy'}</Btn>}/>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        <Card style={{textAlign:'center',padding:14}}>
          <div style={{fontSize:22,fontWeight:700,color:T.accent}}>{streak}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>🔥 Días seguidos</div>
        </Card>
        <Card style={{textAlign:'center',padding:14}}>
          <div style={{fontSize:22,fontWeight:700,color:T.purple}}>{(data.journal||[]).length}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>📖 Entradas</div>
        </Card>
        <Card style={{textAlign:'center',padding:14}}>
          <div style={{fontSize:22}}>{todayEntry?.mood||'—'}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>Hoy</div>
        </Card>
      </div>

      {/* Entry form */}
      {writing&&(
        <Card style={{marginBottom:20,border:`1px solid ${T.accent}40`}}>
          <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:14}}>
            {todayEntry?'Editando entrada de hoy':'Nueva entrada · '+new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:8}}>¿Cómo te sientes hoy?</div>
            <div style={{display:'flex',gap:8}}>
              {MOODS.map(m=><button key={m.e} onClick={()=>setForm(f=>({...f,mood:m.e}))}
                style={{padding:'6px 12px',borderRadius:10,border:`2px solid ${form.mood===m.e?T.accent:T.border}`,background:form.mood===m.e?`${T.accent}18`:'transparent',cursor:'pointer',fontSize:18,transition:'all 0.15s'}}>{m.e}</button>)}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:6}}>Reflexión libre</div>
            <Textarea value={form.content} onChange={v=>setForm(f=>({...f,content:v}))} placeholder="¿Qué pasó hoy? ¿Cómo te fue?..." rows={4}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:6}}>Agradecimiento</div>
            <Input value={form.gratitude} onChange={v=>setForm(f=>({...f,gratitude:v}))} placeholder="Hoy estoy agradecido por..."/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{color:T.muted,fontSize:12,marginBottom:6}}>Intención para mañana</div>
            <Input value={form.intention} onChange={v=>setForm(f=>({...f,intention:v}))} placeholder="Mañana quiero..."/>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Btn onClick={save} style={{flex:1,justifyContent:'center'}}>Guardar entrada</Btn>
            <Btn variant="ghost" onClick={()=>setWriting(false)} style={{flex:1,justifyContent:'center'}}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {/* Entry detail */}
      {sel&&!writing&&(
        <Card style={{marginBottom:20,borderLeft:`3px solid ${T.purple}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div>
              <span style={{fontSize:20,marginRight:8}}>{sel.mood}</span>
              <span style={{color:T.text,fontWeight:600}}>{new Date(sel.date+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>openWrite(sel)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit'}}>✏️ Editar</button>
              <button onClick={()=>del(sel.id)} style={{background:'none',border:'none',color:T.red,cursor:'pointer',display:'flex',padding:4}}><Icon name="trash" size={15}/></button>
            </div>
          </div>
          {sel.content&&<p style={{color:T.text,fontSize:14,lineHeight:1.7,margin:'0 0 10px',whiteSpace:'pre-wrap'}}>{sel.content}</p>}
          {sel.gratitude&&<div style={{padding:'8px 12px',background:`${T.green}12`,borderRadius:8,marginBottom:8,color:T.green,fontSize:13}}>🙏 {sel.gratitude}</div>}
          {sel.intention&&<div style={{padding:'8px 12px',background:`${T.blue}12`,borderRadius:8,color:T.blue,fontSize:13}}>🌅 {sel.intention}</div>}
        </Card>
      )}

      {/* Entries list */}
      <div>
        <div style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Historial</div>
        {(data.journal||[]).length===0&&<p style={{color:T.dim,fontSize:13,textAlign:'center',padding:'20px 0'}}>Sin entradas aún. Empieza escribiendo hoy.</p>}
        {(data.journal||[]).map(j=>(
          <div key={j.id} onClick={()=>setSel(sel?.id===j.id?null:j)}
            style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:sel?.id===j.id?T.surface2:T.surface,border:`1px solid ${sel?.id===j.id?T.accent:T.border}`,borderRadius:10,marginBottom:8,cursor:'pointer',transition:'all 0.15s'}}>
            <div style={{fontSize:22,flexShrink:0}}>{j.mood||'📔'}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:T.text,fontSize:13,fontWeight:500}}>{new Date(j.date+'T12:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}</div>
              {j.content&&<div style={{color:T.muted,fontSize:12,marginTop:2}}>{j.content.slice(0,70)}{j.content.length>70?'…':''}</div>}
            </div>
            <div style={{flexShrink:0,color:T.dim,fontSize:11}}>{fmt(j.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default Journal;
