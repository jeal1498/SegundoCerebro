import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

import { toast } from './Toast.jsx';
// ===================== NOTES =====================
const NOTE_TEMPLATES=[
  {id:'tpl1',name:'Reunión',icon:'🤝',content:`# Reunión — [Título]\n**Fecha:** \n**Asistentes:** \n\n## Agenda\n- \n\n## Decisiones\n- \n\n## Próximos pasos\n- [ ] `},
  {id:'tpl2',name:'Reflexión',icon:'💭',content:`# Reflexión — [Fecha]\n\n## ¿Qué salió bien?\n\n## ¿Qué mejorar?\n\n## ¿Qué aprendí?\n\n## Intención para mañana\n`},
  {id:'tpl3',name:'Proyecto',icon:'🚀',content:`# [Nombre del proyecto]\n\n**Objetivo:** \n**Deadline:** \n**Área:** \n\n## Contexto\n\n## Tareas\n- [ ] \n- [ ] \n\n## Notas\n`},
  {id:'tpl4',name:'Receta',icon:'🍳',content:`# [Nombre del platillo]\n\n**Tiempo:** min | **Porciones:** \n\n## Ingredientes\n- \n\n## Preparación\n1. \n`},
  {id:'tpl5',name:'Libro',icon:'📚',content:`# [Título del libro]\n**Autor:** \n**Estado:** Leyendo\n\n## Ideas clave\n- \n\n## Citas destacadas\n> \n\n## Acciones a tomar\n- [ ] `},
];

const Notes = ({data,setData,isMobile,viewHint,onConsumeHint}) => {
  const [sel,setSel]=useState(null);
  const [showNote,setShowNote]=useState(false);
  const [modal,setModal]=useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [form,setForm]=useState({title:'',content:'',tags:'',areaId:''});
  const [search,setSearch]=useState('');
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState({title:'',content:'',tags:'',areaId:''});
  const [mdPreview,setMdPreview]=useState(true);
  const [filterArea,setFilterArea]=useState('all');
  const [filterTag,setFilterTag]=useState('all');
  const [sortBy,setSortBy]=useState('date');
  const [noteView,setNoteView]=useState('lista'); // 'lista' | 'tablero'

  useEffect(()=>{
    if(viewHint&&viewHint!=='null'){
      const found=data.notes.find(n=>n.id===viewHint);
      if(found){setSel(found);if(isMobile)setShowNote(true);}
      onConsumeHint?.();
    }
  },[viewHint]);

  const saveNote=()=>{
    if(!form.title.trim())return;
    const n={id:uid(),...form,tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean),createdAt:today()};
    const updated=[n,...data.notes];
    setData(d=>({...d,notes:updated}));save('notes',updated);
    setModal(false);toast.success('Nota guardada');setForm({title:'',content:'',tags:'',areaId:''});
    setSel(n);if(isMobile)setShowNote(true);
  };
  const applyTemplate=(tpl)=>{setForm(f=>({...f,content:tpl.content}));setShowTemplates(false);setModal(true);};
  const startEdit=(n)=>{setEditForm({title:n.title,content:n.content,tags:(n.tags||[]).join(', '),areaId:n.areaId||''});setEditing(true);};
  const saveEdit=()=>{
    if(!editForm.title.trim())return;
    const updated=data.notes.map(n=>n.id===sel.id?{...n,...editForm,tags:editForm.tags.split(',').map(t=>t.trim()).filter(Boolean)}:n);
    setData(d=>({...d,notes:updated}));save('notes',updated);
    setSel(updated.find(n=>n.id===sel.id));setEditing(false);
  };
  const del=(id)=>{
    if(!window.confirm('Eliminar esta nota?'))return;
    const updated=data.notes.filter(n=>n.id!==id);
    setData(d=>({...d,notes:updated}));save('notes',updated);
    if(sel?.id===id){setSel(null);setShowNote(false);}
  };

  const allTags=[...new Set(data.notes.flatMap(n=>n.tags||[]))];
  let filtered=data.notes.filter(n=>{
    const q=search.toLowerCase();
    const matchQ=!q||n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q)||(n.tags||[]).some(t=>t.toLowerCase().includes(q));
    const matchArea=filterArea==='all'||n.areaId===filterArea;
    const matchTag=filterTag==='all'||(n.tags||[]).includes(filterTag);
    return matchQ&&matchArea&&matchTag;
  });
  if(sortBy==='date')filtered=[...filtered].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if(sortBy==='title')filtered=[...filtered].sort((a,b)=>a.title.localeCompare(b.title));
  if(sortBy==='area')filtered=[...filtered].sort((a,b)=>(a.areaId||'').localeCompare(b.areaId||''));

  const TEMPLATES=[
    {name:'Diaria',icon:'📅',content:'## Hoy\n\n### Prioridades\n- \n- \n\n### Notas\n\n### Mañana\n- '},
    {name:'Reunión',icon:'🤝',content:'## Reunión\n**Fecha:** \n**Participantes:** \n\n### Agenda\n- \n\n### Acuerdos\n- \n\n### Próximos pasos\n- '},
    {name:'Libro',icon:'📚',content:'## \n**Autor:** \n**Rating:** ⭐⭐⭐⭐⭐\n\n### Ideas clave\n1. \n2. \n\n### Cita favorita\n> \n\n### Acción a tomar\n- '},
    {name:'Idea',icon:'💡',content:'## Idea: \n\n**Problema que resuelve:** \n\n**Cómo funcionaría:** \n\n**Siguiente paso:** '},
    {name:'Reflexión',icon:'🧘',content:'## Reflexión\n\n**¿Qué salió bien?**\n\n**¿Qué mejoraría?**\n\n**¿Qué aprendí?**\n\n**Intención para mañana:** '},
  ];

  const renderMd=(text)=>text
    .replace(/\[\[([^\]]+)\]\]/g,'<span class="backlink" data-backlink="$1" style="color:#a78bfa;cursor:pointer;text-decoration:underline;font-weight:500;border-radius:3px;padding:0 2px" title="Ir a: $1">$1</span>')
    .replace(/^### (.+)$/gm,'<h4 style="color:#e2eaf4;margin:8px 0 4px;font-size:12px">$1</h4>')
    .replace(/^## (.+)$/gm,'<h3 style="color:#e2eaf4;margin:10px 0 6px;font-size:14px">$1</h3>')
    .replace(/^# (.+)$/gm,'<h2 style="color:#e2eaf4;margin:12px 0 8px;font-size:16px">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^> (.+)$/gm,'<blockquote style="border-left:3px solid '+T.accent+';margin:6px 0;padding:4px 10px;color:#6b8299;font-style:italic">$1</blockquote>')
    .replace(/^- (.+)$/gm,'<div style="display:flex;gap:6px;margin:2px 0"><span style="color:'+T.accent+';flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm,'<div style="margin:2px 0">$1</div>')
    .replace(/\n/g,'<br/>');

  const NoteCard=({n,compact=false})=>{
    const area=data.areas.find(a=>a.id===n.areaId);
    return (
      <div onClick={()=>{setSel(n);if(isMobile)setShowNote(true);}}
        style={{padding:compact?'10px 12px':'12px 14px',background:T.surface,border:`1px solid ${sel?.id===n.id?T.accent:T.border}`,borderLeft:`3px solid ${area?.color||T.accent}`,borderRadius:10,cursor:'pointer',marginBottom:compact?6:8,transition:'border-color 0.15s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
          <div style={{color:T.text,fontSize:compact?12:13,fontWeight:500,flex:1,lineHeight:1.3}}>{n.title}</div>
          {n.amount&&<span style={{color:T.green,fontSize:11,fontWeight:600,flexShrink:0}}>${n.amount}</span>}
        </div>
        <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
          {area&&<span style={{fontSize:10,color:area.color}}>{area.icon} {area.name}</span>}
          {(n.tags||[]).slice(0,2).map(t=><span key={t} style={{fontSize:10,color:T.purple,background:`${T.purple}15`,padding:'1px 6px',borderRadius:6}}>#{t}</span>)}
          <span style={{fontSize:10,color:T.dim,marginLeft:'auto'}}>{fmt(n.createdAt)}</span>
        </div>
      </div>
    );
  };

  const TableroView=()=>{
    const cols=[
      {id:'none',label:'Sin área',color:T.accent,icon:'📝'},
      ...data.areas.map(a=>({id:a.id,label:a.name,color:a.color,icon:a.icon})),
    ];
    return (
      <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:12,minHeight:200}}>
        {cols.map(col=>{
          const colNotes=filtered.filter(n=>col.id==='none'?!n.areaId||n.areaId==='':n.areaId===col.id);
          if(colNotes.length===0&&col.id!=='none')return null;
          return (
            <div key={col.id} style={{minWidth:240,flex:'0 0 240px',background:T.surface2,borderRadius:12,padding:10,border:`1px solid ${T.border}`,maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:14}}>{col.icon}</span>
                <span style={{fontSize:12,fontWeight:700,color:col.color}}>{col.label}</span>
                <span style={{marginLeft:'auto',fontSize:11,color:T.dim,background:T.border,borderRadius:10,padding:'1px 6px'}}>{colNotes.length}</span>
              </div>
              {colNotes.map(n=><NoteCard key={n.id} n={n} compact/>)}
              {colNotes.length===0&&<div style={{color:T.dim,fontSize:12,textAlign:'center',padding:'20px 0'}}>Vacío</div>}
            </div>
          );
        })}
      </div>
    );
  };

  const NoteList=()=>(
    <div>
      <Input value={search} onChange={setSearch} placeholder="Buscar notas..." style={{marginBottom:10,fontSize:14}}/>
      <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
        <select value={filterArea} onChange={e=>setFilterArea(e.target.value)}
          style={{flex:1,minWidth:100,background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'6px 10px',borderRadius:9,fontSize:12,outline:'none'}}>
          <option value="all">Todas las áreas</option>
          {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
        </select>
        {allTags.length>0&&(
          <select value={filterTag} onChange={e=>setFilterTag(e.target.value)}
            style={{flex:1,minWidth:90,background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'6px 10px',borderRadius:9,fontSize:12,outline:'none'}}>
            <option value="all">Todos los tags</option>
            {allTags.map(t=><option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'6px 10px',borderRadius:9,fontSize:12,outline:'none'}}>
          <option value="date">Reciente</option>
          <option value="title">A-Z</option>
          <option value="area">Área</option>
        </select>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button onClick={()=>setShowTemplates(true)} style={{flex:1,padding:'7px',border:`1px solid ${T.border}`,borderRadius:9,background:'transparent',color:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>📋 Plantilla</button>
        <Btn onClick={()=>setModal(true)} size="sm" style={{flex:1,justifyContent:'center'}}><Icon name="plus" size={12}/>Nueva nota</Btn>
      </div>
      {filtered.length===0
        ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
           <div style={{fontSize:32,marginBottom:8}}>📝</div>
           <div style={{fontSize:14,marginBottom:12}}>{data.notes.length===0?'Sin notas aún':'Sin resultados'}</div>
           {data.notes.length===0&&<Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={12}/>Primera nota</Btn>}
         </div>
        :filtered.map(n=><NoteCard key={n.id} n={n}/>)
      }
    </div>
  );

  const NoteDetail=()=>{
    if(!sel)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:T.dim,fontSize:14}}>Selecciona una nota</div>;
    const area=data.areas.find(a=>a.id===sel.areaId);
    return (
      <div>
        {isMobile&&<button onClick={()=>setShowNote(false)} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:13,fontFamily:'inherit',marginBottom:12,padding:0}}>← Volver</button>}
        {editing?(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <Input value={editForm.title} onChange={v=>setEditForm(f=>({...f,title:v}))} placeholder="Título"/>
            <textarea value={editForm.content} onChange={e=>setEditForm(f=>({...f,content:e.target.value}))} rows={12}
              style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 12px',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',lineHeight:1.6}}/>
            <Input value={editForm.tags} onChange={v=>setEditForm(f=>({...f,tags:v}))} placeholder="tags, separados, por, comas"/>
            <select value={editForm.areaId} onChange={e=>setEditForm(f=>({...f,areaId:e.target.value}))}
              style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'8px 12px',borderRadius:9,fontSize:13,outline:'none'}}>
              <option value="">Sin área</option>
              {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={saveEdit} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
              <Btn variant="ghost" onClick={()=>setEditing(false)}>Cancelar</Btn>
            </div>
          </div>
        ):(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div style={{flex:1,minWidth:0}}>
                <h2 style={{color:T.text,fontSize:18,fontWeight:700,margin:'0 0 6px',lineHeight:1.3}}>{sel.title}</h2>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  {area&&<span style={{fontSize:11,color:area.color}}>{area.icon} {area.name}</span>}
                  <span style={{color:T.dim,fontSize:11}}>{fmt(sel.createdAt)}</span>
                  {sel.amount&&<span style={{color:T.green,fontSize:12,fontWeight:600}}>${sel.amount}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:6,marginLeft:10,flexShrink:0}}>
                <button onClick={()=>setMdPreview(p=>!p)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:11,fontFamily:'inherit'}}>{mdPreview?'Raw':'Preview'}</button>
                <button onClick={()=>startEdit(sel)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:11,fontFamily:'inherit'}}>✏️</button>
                <button onClick={()=>del(sel.id)} aria-label="Eliminar nota" style={{background:'none',border:'none',color:T.red,cursor:'pointer',padding:4}}><Icon name="trash" size={14}/></button>
              </div>
            </div>
            {(sel.tags||[]).length>0&&(
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
                {sel.tags.map(t=><span key={t} style={{fontSize:11,color:T.purple,background:`${T.purple}15`,padding:'2px 8px',borderRadius:8}}>#{t}</span>)}
              </div>
            )}
            <div style={{background:T.surface2,borderRadius:10,padding:'14px 16px',minHeight:120,lineHeight:1.7,fontSize:13,color:T.text}}
              onClick={e=>{
                const bl=e.target.closest?.('[data-backlink]');
                if(bl){
                  const title=bl.getAttribute('data-backlink');
                  const target=data.notes.find(n=>n.title.toLowerCase()===title.toLowerCase());
                  if(target){setSel(target);if(isMobile)setShowNote(true);}
                  else{toast.info(`Nota "${title}" no encontrada`);}
                }
              }}>
              {mdPreview
                ?<div dangerouslySetInnerHTML={{__html:renderMd(sel.content||'')}}/>
                :<pre style={{margin:0,fontFamily:'inherit',whiteSpace:'pre-wrap',color:T.muted}}>{sel.content}</pre>
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  if(isMobile){
    if(showNote)return(
      <div style={{padding:'0 2px'}}>
        <NoteDetail/>
      </div>
    );
    return (
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{color:T.text,margin:0,fontSize:20,fontWeight:700}}>Notas</h2>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setNoteView(v=>v==='lista'?'tablero':'lista')} style={{padding:'6px 12px',borderRadius:9,border:`1px solid ${T.border}`,background:noteView==='tablero'?`${T.accent}18`:'transparent',color:noteView==='tablero'?T.accent:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>{noteView==='lista'?'Tablero':'Lista'}</button>
          </div>
        </div>
        {noteView==='tablero'?<TableroView/>:<NoteList/>}
        {showTemplates&&(
          <Modal title="Plantillas" onClose={()=>setShowTemplates(false)}>
            {TEMPLATES.map(tpl=>(
              <div key={tpl.name} onClick={()=>applyTemplate(tpl)} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:`1px solid ${T.border}`,cursor:'pointer'}}>
                <span style={{fontSize:24}}>{tpl.icon}</span>
                <div><div style={{color:T.text,fontWeight:600,fontSize:14}}>{tpl.name}</div><div style={{color:T.muted,fontSize:12,marginTop:2}}>Usar esta plantilla</div></div>
              </div>
            ))}
          </Modal>
        )}
        {modal&&(
          <Modal title="Nueva nota" onClose={()=>setModal(false)}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Input value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Título de la nota"/>
              <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={6} placeholder="Escribe aquí... (Markdown soportado)"
                style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 12px',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',lineHeight:1.6}}/>
              <Input value={form.tags} onChange={v=>setForm(f=>({...f,tags:v}))} placeholder="Tags: trabajo, ideas, personal"/>
              <select value={form.areaId} onChange={e=>setForm(f=>({...f,areaId:e.target.value}))}
                style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'8px 12px',borderRadius:9,fontSize:13,outline:'none'}}>
                <option value="">Sin área</option>
                {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <Btn onClick={saveNote} style={{justifyContent:'center'}}>Guardar nota</Btn>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // Desktop: split panel
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h2 style={{color:T.text,margin:0,fontSize:22,fontWeight:700}}>Notas <span style={{color:T.dim,fontSize:14,fontWeight:400}}>({data.notes.length})</span></h2>
        <div style={{display:'flex',gap:8}}>
          <div style={{display:'flex',gap:0,border:`1px solid ${T.border}`,borderRadius:9,overflow:'hidden'}}>
            {['lista','tablero'].map(v=>(
              <button key={v} onClick={()=>setNoteView(v)} style={{padding:'6px 14px',border:'none',background:noteView===v?`${T.accent}20`:'transparent',color:noteView===v?T.accent:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:noteView===v?700:400}}>
                {v==='lista'?'Lista':'Tablero'}
              </button>
            ))}
          </div>
          <Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={13}/>Nueva</Btn>
        </div>
      </div>

      {noteView==='tablero'?(
        <TableroView/>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:16,height:'calc(100vh - 140px)'}}>
          <div style={{overflowY:'auto'}}>
            <NoteList/>
          </div>
          <div style={{overflowY:'auto',background:T.surface,borderRadius:12,padding:'16px 20px',border:`1px solid ${T.border}`}}>
            <NoteDetail/>
          </div>
        </div>
      )}

      {showTemplates&&(
        <Modal title="Plantillas de notas" onClose={()=>setShowTemplates(false)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {TEMPLATES.map(tpl=>(
              <div key={tpl.name} onClick={()=>applyTemplate(tpl)} style={{display:'flex',gap:10,padding:'12px',background:T.surface2,borderRadius:10,border:`1px solid ${T.border}`,cursor:'pointer',transition:'border-color 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <span style={{fontSize:24}}>{tpl.icon}</span>
                <div><div style={{color:T.text,fontWeight:600,fontSize:13}}>{tpl.name}</div><div style={{color:T.muted,fontSize:11,marginTop:2}}>Usar plantilla</div></div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {modal&&(
        <Modal title="Nueva nota" onClose={()=>setModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <Input value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Título de la nota"/>
            <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={8} placeholder="Escribe aquí... (Markdown soportado)"
              style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 12px',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',lineHeight:1.6}}/>
            <Input value={form.tags} onChange={v=>setForm(f=>({...f,tags:v}))} placeholder="Tags: trabajo, ideas, personal"/>
            <select value={form.areaId} onChange={e=>setForm(f=>({...f,areaId:e.target.value}))}
              style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'8px 12px',borderRadius:9,fontSize:13,outline:'none'}}>
              <option value="">Sin área</option>
              {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
            <Btn onClick={saveNote} style={{justifyContent:'center'}}>Guardar nota</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default Notes;
