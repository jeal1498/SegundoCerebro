import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== BOOKS =====================
const Books = ({data,setData,isMobile}) => {
  const STATUSES=[{id:'want',label:'Por leer',color:T.blue,emoji:'📚'},{id:'reading',label:'Leyendo',color:T.accent,emoji:'📖'},{id:'done',label:'Leído',color:T.green,emoji:'✅'},{id:'abandoned',label:'Abandonado',color:T.dim,emoji:'❌'}];
  const [modal,setModal]=useState(false);
  const [filter,setFilter]=useState('all');
  const [sel,setSel]=useState(null);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({title:'',author:'',status:'want',rating:0,review:'',genre:'',pages:''});

  const saveBook=(isEdit=false)=>{
    if(!form.title.trim())return;
    const b={...form,id:isEdit?sel.id:uid(),pages:Number(form.pages)||0,createdAt:isEdit?(sel.createdAt||today()):today()};
    const upd=isEdit?(data.books||[]).map(x=>x.id===b.id?b:x):[b,...(data.books||[])];
    setData(d=>({...d,books:upd}));
    const s=JSON.stringify(upd);try{localStorage.setItem('books',s);}catch(e){}try{window.storage?.set('books',s);}catch(e){}
    setModal(false);setEditing(false);setSel(b);setForm({title:'',author:'',status:'want',rating:0,review:'',genre:'',pages:''});
  };
  const del=(id)=>{
    if(!window.confirm('¿Eliminar este libro?'))return;
    const upd=(data.books||[]).filter(b=>b.id!==id);
    setData(d=>({...d,books:upd}));
    try{localStorage.setItem('books',JSON.stringify(upd));}catch(e){}try{window.storage?.set('books',JSON.stringify(upd));}catch(e){}
    if(sel?.id===id)setSel(null);
  };
  const openEdit=(b)=>{setForm({title:b.title,author:b.author||'',status:b.status,rating:b.rating||0,review:b.review||'',genre:b.genre||'',pages:b.pages||''});setEditing(true);setSel(b);setModal(true);};

  const books=data.books||[];
  const visible=filter==='all'?books:books.filter(b=>b.status===filter);
  const reading=books.filter(b=>b.status==='reading').length;
  const done=books.filter(b=>b.status==='done').length;

  const StarRating=({val,onChange})=>(
    <div style={{display:'flex',gap:4}}>
      {[1,2,3,4,5].map(i=><button key={i} onClick={()=>onChange&&onChange(i===val?0:i)}
        style={{background:'none',border:'none',cursor:onChange?'pointer':'default',padding:2,color:i<=val?T.accent:T.border}}>
        <Icon name={i<=val?'star':'starEmpty'} size={18} color={i<=val?T.accent:T.border}/>
      </button>)}
    </div>
  );

  return (
    <div>
      <PageHeader title="Biblioteca" subtitle="Libros que lees, leíste y quieres leer." isMobile={isMobile}
        action={<Btn size="sm" onClick={()=>{setEditing(false);setForm({title:'',author:'',status:'want',rating:0,review:'',genre:'',pages:''});setModal(true);}}><Icon name="plus" size={14}/>Agregar</Btn>}/>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:20}}>
        {STATUSES.map(s=>{
          const cnt=books.filter(b=>b.status===s.id).length;
          return <Card key={s.id} onClick={()=>setFilter(filter===s.id?'all':s.id)}
            style={{textAlign:'center',padding:10,border:`1px solid ${filter===s.id?s.color:T.border}`,cursor:'pointer'}}>
            <div style={{fontSize:18}}>{s.emoji}</div>
            <div style={{fontSize:20,fontWeight:700,color:s.color}}>{cnt}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:1}}>{s.label}</div>
          </Card>;
        })}
      </div>

      {/* Book detail */}
      {sel&&(
        <Card style={{marginBottom:20,borderLeft:`3px solid ${T.accent}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{color:T.text,fontWeight:700,fontSize:16}}>{sel.title}</div>
              {sel.author&&<div style={{color:T.muted,fontSize:13,marginTop:2}}>por {sel.author}</div>}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>openEdit(sel)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit'}}>✏️ Editar</button>
              <button onClick={()=>del(sel.id)} style={{background:'none',border:'none',color:T.red,cursor:'pointer',display:'flex',padding:4}}><Icon name="trash" size={15}/></button>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10,alignItems:'center'}}>
            {(()=>{const s=STATUSES.find(x=>x.id===sel.status);return s?<Tag text={`${s.emoji} ${s.label}`} color={s.color}/>:null;})()}
            {sel.genre&&<Tag text={sel.genre}/>}
            {sel.pages>0&&<span style={{color:T.muted,fontSize:12}}>{sel.pages} págs</span>}
          </div>
          {sel.rating>0&&<div style={{marginBottom:8}}><StarRating val={sel.rating}/></div>}
          {sel.review&&<p style={{color:T.text,fontSize:14,lineHeight:1.7,margin:0,fontStyle:'italic'}}>"{sel.review}"</p>}
        </Card>
      )}

      {/* Book list */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
        {visible.map(b=>{
          const st=STATUSES.find(s=>s.id===b.status);
          return <div key={b.id} onClick={()=>setSel(sel?.id===b.id?null:b)}
            style={{padding:'12px 14px',background:T.surface,border:`1px solid ${sel?.id===b.id?T.accent:T.border}`,borderRadius:10,cursor:'pointer',transition:'border-color 0.15s',borderTop:`3px solid ${st?.color||T.border}`}}>
            <div style={{color:T.text,fontSize:13,fontWeight:600,marginBottom:4,lineHeight:1.3}}>{b.title}</div>
            {b.author&&<div style={{color:T.muted,fontSize:11,marginBottom:6}}>{b.author}</div>}
            {b.rating>0&&<div style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=b.rating?T.accent:T.border,fontSize:11}}>★</span>)}</div>}
          </div>;
        })}
        {!visible.length&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'30px 0',color:T.dim}}><Icon name="book" size={40}/><p>Sin libros{filter!=='all'?' en esta categoría':' aún'}.</p></div>}
      </div>

      {modal&&(
        <Modal title={editing?'Editar libro':'Nuevo libro'} onClose={()=>{setModal(false);setEditing(false);}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Input value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Título del libro"/>
            <Input value={form.author} onChange={v=>setForm(f=>({...f,author:v}))} placeholder="Autor"/>
            <div style={{display:'flex',gap:10}}>
              <Input value={form.genre} onChange={v=>setForm(f=>({...f,genre:v}))} placeholder="Género" style={{flex:1}}/>
              <Input type="number" value={form.pages} onChange={v=>setForm(f=>({...f,pages:v}))} placeholder="Páginas" style={{flex:1}}/>
            </div>
            <Select value={form.status} onChange={v=>setForm(f=>({...f,status:v}))}>
              {STATUSES.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </Select>
            <div>
              <div style={{color:T.muted,fontSize:12,marginBottom:6}}>Calificación</div>
              <StarRating val={form.rating} onChange={v=>setForm(f=>({...f,rating:v}))}/>
            </div>
            <Textarea value={form.review} onChange={v=>setForm(f=>({...f,review:v}))} placeholder="Reseña o notas del libro..." rows={3}/>
            <Btn onClick={()=>saveBook(editing)} style={{width:'100%',justifyContent:'center'}}>{editing?'Guardar cambios':'Agregar libro'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default Books;
