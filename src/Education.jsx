import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== EDUCATION =====================
const Education = ({data,setData,isMobile}) => {
  const [modal,setModal]=useState(false);
  const [noteModal,setNoteModal]=useState(false);
  const [selSubject,setSelSubject]=useState(null);
  const [subjectForm,setSubjectForm]=useState({name:'',icon:'📚',color:T.areaColors[3]});
  const [noteForm,setNoteForm]=useState({title:'',content:'',tags:'',type:'apunte'});
  const [editNote,setEditNote]=useState(null);
  const [editNoteForm,setEditNoteForm]=useState({});
  const [selNote,setSelNote]=useState(null);

  const ICONS=['📚','🔬','💻','🧮','🎨','🏛️','🌍','⚗️','📐','🎵','📖','🧠'];
  const NOTE_TYPES=[{id:'apunte',label:'Apunte',color:T.blue},{id:'tarea',label:'Tarea',color:T.orange},{id:'examen',label:'Examen',color:T.red},{id:'resumen',label:'Resumen',color:T.green}];

  const edu=data.education||[];

  const saveSubject=()=>{
    if(!subjectForm.name.trim())return;
    const s={id:uid(),...subjectForm,notes:[],createdAt:today()};
    const upd=[...edu,s];
    setData(d=>({...d,education:upd}));
    const str=JSON.stringify(upd);try{localStorage.setItem('education',str);}catch(e){}try{window.storage?.set('education',str);}catch(e){}
    setModal(false);setSubjectForm({name:'',icon:'📚',color:T.areaColors[3]});
    setSelSubject(s);
  };
  const delSubject=(id)=>{
    if(!window.confirm('¿Eliminar esta materia y todas sus notas?'))return;
    const upd=edu.filter(s=>s.id!==id);
    setData(d=>({...d,education:upd}));
    const str=JSON.stringify(upd);try{localStorage.setItem('education',str);}catch(e){}try{window.storage?.set('education',str);}catch(e){}
    if(selSubject?.id===id){setSelSubject(null);setSelNote(null);}
  };
  const saveNote=()=>{
    if(!noteForm.title.trim()||!selSubject)return;
    const n={id:uid(),...noteForm,tags:noteForm.tags.split(',').map(t=>t.trim()).filter(Boolean),createdAt:today()};
    const upd=edu.map(s=>s.id===selSubject.id?{...s,notes:[n,...(s.notes||[])]}:s);
    setData(d=>({...d,education:upd}));
    const str=JSON.stringify(upd);try{localStorage.setItem('education',str);}catch(e){}try{window.storage?.set('education',str);}catch(e){}
    setNoteModal(false);setNoteForm({title:'',content:'',tags:'',type:'apunte'});
    setSelSubject(upd.find(s=>s.id===selSubject.id));
    setSelNote(n);
  };
  const saveEditNote=()=>{
    if(!editNoteForm.title?.trim())return;
    const upd=edu.map(s=>s.id===selSubject.id?{...s,notes:(s.notes||[]).map(n=>n.id===editNote?{...n,...editNoteForm,tags:(editNoteForm.tags||'').split(',').map(t=>t.trim()).filter(Boolean)}:n)}:s);
    setData(d=>({...d,education:upd}));
    const str=JSON.stringify(upd);try{localStorage.setItem('education',str);}catch(e){}try{window.storage?.set('education',str);}catch(e){}
    setSelSubject(upd.find(s=>s.id===selSubject.id));
    setSelNote(upd.find(s=>s.id===selSubject.id)?.notes?.find(n=>n.id===editNote));
    setEditNote(null);
  };
  const delNote=(nid)=>{
    if(!window.confirm('¿Eliminar esta nota?'))return;
    const upd=edu.map(s=>s.id===selSubject.id?{...s,notes:(s.notes||[]).filter(n=>n.id!==nid)}:s);
    setData(d=>({...d,education:upd}));
    const str=JSON.stringify(upd);try{localStorage.setItem('education',str);}catch(e){}try{window.storage?.set('education',str);}catch(e){}
    setSelSubject(upd.find(s=>s.id===selSubject.id));
    if(selNote?.id===nid)setSelNote(null);
  };

  const totalNotes=edu.reduce((s,sub)=>s+(sub.notes||[]).length,0);

  return (
    <div>
      <PageHeader title="Educación" subtitle="Materias, apuntes y tareas escolares." isMobile={isMobile}
        action={<Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={14}/>Materia</Btn>}/>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        <Card style={{textAlign:'center',padding:14}}>
          <div style={{fontSize:22,fontWeight:700,color:T.purple}}>{edu.length}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>Materias</div>
        </Card>
        <Card style={{textAlign:'center',padding:14}}>
          <div style={{fontSize:22,fontWeight:700,color:T.blue}}>{totalNotes}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>Notas totales</div>
        </Card>
        <Card style={{textAlign:'center',padding:14}}>
          <div style={{fontSize:22,fontWeight:700,color:T.orange}}>{edu.reduce((s,sub)=>(s+(sub.notes||[]).filter(n=>n.type==='tarea').length),0)}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>Tareas</div>
        </Card>
      </div>

      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':selSubject?'220px 1fr':'1fr',gap:16}}>
        {/* Subject list */}
        <div>
          {edu.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}><Icon name="graduation" size={40}/><p style={{marginBottom:12}}>Sin materias aún.</p><Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={12}/>Agregar materia</Btn></div>}
          {edu.map(s=>{
            const notesCount=(s.notes||[]).length;
            const tareasCount=(s.notes||[]).filter(n=>n.type==='tarea').length;
            return <div key={s.id} onClick={()=>{setSelSubject(selSubject?.id===s.id?null:s);setSelNote(null);}}
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:selSubject?.id===s.id?T.surface2:T.surface,border:`1px solid ${selSubject?.id===s.id?T.accent:T.border}`,borderRadius:10,marginBottom:8,cursor:'pointer',borderLeft:`4px solid ${s.color}`,transition:'all 0.15s'}}>
              <div style={{fontSize:22,flexShrink:0}}>{s.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:T.text,fontWeight:600,fontSize:14}}>{s.name}</div>
                <div style={{color:T.muted,fontSize:11,marginTop:2}}>{notesCount} notas{tareasCount>0?` · ${tareasCount} tareas`:''}</div>
              </div>
              <button onClick={e=>{e.stopPropagation();delSubject(s.id);}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
            </div>;
          })}
        </div>

        {/* Notes panel */}
        {selSubject&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:20}}>{selSubject.icon}</span>
                <span style={{color:T.text,fontWeight:700,fontSize:16}}>{selSubject.name}</span>
              </div>
              <Btn size="sm" onClick={()=>setNoteModal(true)}><Icon name="plus" size={12}/>Nueva nota</Btn>
            </div>

            {/* Note detail */}
            {selNote&&(
              <Card style={{marginBottom:16,borderLeft:`3px solid ${NOTE_TYPES.find(t=>t.id===selNote.type)?.color||T.accent}`}}>
                {editNote===selNote.id?(
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Input value={editNoteForm.title||''} onChange={v=>setEditNoteForm(f=>({...f,title:v}))} placeholder="Título"/>
                    <Select value={editNoteForm.type||'apunte'} onChange={v=>setEditNoteForm(f=>({...f,type:v}))}>
                      {NOTE_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                    </Select>
                    <Textarea value={editNoteForm.content||''} onChange={v=>setEditNoteForm(f=>({...f,content:v}))} rows={5} placeholder="Contenido..."/>
                    <Input value={editNoteForm.tags||''} onChange={v=>setEditNoteForm(f=>({...f,tags:v}))} placeholder="Tags"/>
                    <div style={{display:'flex',gap:8}}>
                      <Btn onClick={saveEditNote} size="sm" style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
                      <Btn variant="ghost" onClick={()=>setEditNote(null)} size="sm" style={{flex:1,justifyContent:'center'}}>Cancelar</Btn>
                    </div>
                  </div>
                ):(
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div>
                        <div style={{color:T.text,fontWeight:700,fontSize:15}}>{selNote.title}</div>
                        <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                          {(()=>{const t=NOTE_TYPES.find(x=>x.id===selNote.type);return t?<Tag text={t.label} color={t.color}/>:null;})()}
                          {selNote.tags?.map(t=><Tag key={t} text={t}/>)}
                          <span style={{color:T.dim,fontSize:11,alignSelf:'center'}}>{fmt(selNote.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>{setEditNoteForm({title:selNote.title,content:selNote.content||'',tags:(selNote.tags||[]).join(', '),type:selNote.type});setEditNote(selNote.id);}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit'}}>✏️</button>
                        <button onClick={()=>delNote(selNote.id)} style={{background:'none',border:'none',color:T.red,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={14}/></button>
                      </div>
                    </div>
                    {selNote.content&&<p style={{color:T.text,fontSize:14,lineHeight:1.8,margin:0,whiteSpace:'pre-wrap'}}>{selNote.content}</p>}
                  </>
                )}
              </Card>
            )}

            {/* Notes list */}
            {(selSubject.notes||[]).length===0&&<div style={{textAlign:'center',padding:'20px 0',color:T.dim,fontSize:13}}>Sin notas en esta materia.</div>}
            {(selSubject.notes||[]).map(n=>{
              const nt=NOTE_TYPES.find(t=>t.id===n.type);
              return <div key={n.id} onClick={()=>setSelNote(selNote?.id===n.id?null:n)}
                style={{padding:'10px 14px',background:selNote?.id===n.id?T.surface2:T.surface,border:`1px solid ${selNote?.id===n.id?T.accent:T.border}`,borderRadius:10,marginBottom:8,cursor:'pointer',transition:'all 0.15s',borderLeft:`3px solid ${nt?.color||T.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{color:T.text,fontSize:13,fontWeight:500}}>{n.title}</div>
                  <span style={{color:nt?.color||T.muted,fontSize:10,background:`${nt?.color||T.muted}18`,padding:'2px 8px',borderRadius:8,fontWeight:600}}>{nt?.label||n.type}</span>
                </div>
                {n.content&&<div style={{color:T.muted,fontSize:12,marginTop:3}}>{n.content.slice(0,60)}{n.content.length>60?'…':''}</div>}
              </div>;
            })}
          </div>
        )}
      </div>

      {/* Subject modal */}
      {modal&&(
        <Modal title="Nueva materia" onClose={()=>setModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Input value={subjectForm.name} onChange={v=>setSubjectForm(f=>({...f,name:v}))} placeholder="Nombre de la materia"/>
            <div>
              <div style={{color:T.muted,fontSize:12,marginBottom:8}}>Icono</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {ICONS.map(e=><button key={e} onClick={()=>setSubjectForm(f=>({...f,icon:e}))}
                  style={{width:38,height:38,borderRadius:9,border:`2px solid ${subjectForm.icon===e?T.accent:T.border}`,background:T.bg,cursor:'pointer',fontSize:18}}>{e}</button>)}
              </div>
            </div>
            <div>
              <div style={{color:T.muted,fontSize:12,marginBottom:8}}>Color</div>
              <div style={{display:'flex',gap:8}}>
                {T.areaColors.map(c=><button key={c} onClick={()=>setSubjectForm(f=>({...f,color:c}))}
                  style={{width:28,height:28,borderRadius:'50%',background:c,border:`3px solid ${subjectForm.color===c?T.text:'transparent'}`,cursor:'pointer'}}/>)}
              </div>
            </div>
            <Btn onClick={saveSubject} style={{width:'100%',justifyContent:'center'}}>Crear materia</Btn>
          </div>
        </Modal>
      )}

      {/* Note modal */}
      {noteModal&&(
        <Modal title="Nueva nota" onClose={()=>setNoteModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Input value={noteForm.title} onChange={v=>setNoteForm(f=>({...f,title:v}))} placeholder="Título de la nota"/>
            <Select value={noteForm.type} onChange={v=>setNoteForm(f=>({...f,type:v}))}>
              {NOTE_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <Textarea value={noteForm.content} onChange={v=>setNoteForm(f=>({...f,content:v}))} placeholder="Contenido..." rows={5}/>
            <Input value={noteForm.tags} onChange={v=>setNoteForm(f=>({...f,tags:v}))} placeholder="Tags (separados por coma)"/>
            <Btn onClick={saveNote} style={{width:'100%',justifyContent:'center'}}>Guardar nota</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default Education;
