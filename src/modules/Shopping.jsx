import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== SHOPPING =====================
const Shopping = ({data,setData,isMobile}) => {
  const [form,setForm]=useState({name:'',qty:'1',unit:'pza',category:''});
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [catFilter,setCatFilter]=useState('all');
  const UNITS=['pza','kg','g','L','mL','caja','bolsa','lata','frasco','paq'];

  const saveItem=()=>{
    if(!form.name.trim())return;
    const item={id:uid(),...form,qty:Number(form.qty)||1,done:false,createdAt:today()};
    const upd=[item,...(data.shopping||[])];
    setData(d=>({...d,shopping:upd}));
    const s=JSON.stringify(upd);try{localStorage.setItem('shopping',s);}catch(e){}try{window.storage?.set('shopping',s);}catch(e){}
    setForm({name:'',qty:'1',unit:'pza',category:form.category});
  };
  const toggle=(id)=>{const u=(data.shopping||[]).map(i=>i.id===id?{...i,done:!i.done}:i);setData(d=>({...d,shopping:u}));const s=JSON.stringify(u);try{localStorage.setItem('shopping',s);}catch(e){}try{window.storage?.set('shopping',s);}catch(e){}};
  const del=(id)=>{const u=(data.shopping||[]).filter(i=>i.id!==id);setData(d=>({...d,shopping:u}));const s=JSON.stringify(u);try{localStorage.setItem('shopping',s);}catch(e){}try{window.storage?.set('shopping',s);}catch(e){}};
  const clearDone=()=>{const u=(data.shopping||[]).filter(i=>!i.done);setData(d=>({...d,shopping:u}));const s=JSON.stringify(u);try{localStorage.setItem('shopping',s);}catch(e){}try{window.storage?.set('shopping',s);}catch(e){}};

  const items=data.shopping||[];
  const pending=items.filter(i=>!i.done);
  const done=items.filter(i=>i.done);
  const cats=[...new Set(items.map(i=>i.category).filter(Boolean))];
  const visible=(catFilter==='all'?items:items.filter(i=>i.category===catFilter));

  return (
    <div>
      <PageHeader title="Lista de Compras" subtitle={`${pending.length} pendientes · ${done.length} en carrito`} isMobile={isMobile}
        action={done.length>0&&<Btn size="sm" variant="ghost" onClick={clearDone}>Limpiar ✓</Btn>}/>

      {/* Add form */}
      <Card style={{marginBottom:20}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Input value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Producto..."
            style={{flex:'2 1 120px'}} onKeyDown={e=>e.key==='Enter'&&saveItem()}/>
          <Input type="number" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} placeholder="Cant."
            style={{flex:'0 1 60px',padding:'10px 8px'}}/>
          <Select value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} style={{flex:'0 1 70px',padding:'10px 8px',fontSize:13}}>
            {UNITS.map(u=><option key={u}>{u}</option>)}
          </Select>
          <Input value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} placeholder="Categoría (ej: Frutas)"
            style={{flex:'1 1 100px'}}/>
          <button onClick={saveItem} style={{background:T.accent,border:'none',borderRadius:10,padding:'0 16px',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0}}>
            <Icon name="plus" size={20} color="#000"/>
          </button>
        </div>
      </Card>

      {/* Category filter */}
      {cats.length>0&&(
        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
          <button onClick={()=>setCatFilter('all')} style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${catFilter==='all'?T.accent:T.border}`,background:catFilter==='all'?`${T.accent}18`:'transparent',cursor:'pointer',color:catFilter==='all'?T.accent:T.muted,fontSize:12,fontFamily:'inherit'}}>Todos</button>
          {cats.map(c=><button key={c} onClick={()=>setCatFilter(c===catFilter?'all':c)}
            style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${catFilter===c?T.accent:T.border}`,background:catFilter===c?`${T.accent}18`:'transparent',cursor:'pointer',color:catFilter===c?T.accent:T.muted,fontSize:12,fontFamily:'inherit'}}>{c}</button>)}
        </div>
      )}

      {/* Items */}
      {visible.filter(i=>!i.done).map(i=>(
        <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:8}}>
          <button onClick={()=>toggle(i.id)} style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${T.border}`,background:'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}/>
          <div style={{flex:1,minWidth:0}}>
            <span style={{color:T.text,fontSize:14,fontWeight:500}}>{i.name}</span>
            {i.category&&<span style={{color:T.muted,fontSize:11,marginLeft:8}}>{i.category}</span>}
          </div>
          <span style={{color:T.accent,fontSize:13,fontWeight:600,flexShrink:0}}>{i.qty} {i.unit}</span>
          <button onClick={()=>del(i.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',display:'flex',padding:4}}><Icon name="trash" size={13}/></button>
        </div>
      ))}

      {visible.filter(i=>i.done).length>0&&(
        <div style={{marginTop:12,opacity:0.5}}>
          <div style={{color:T.muted,fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>En carrito ✓</div>
          {visible.filter(i=>i.done).map(i=>(
            <div key={i.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:`1px solid ${T.border}`}}>
              <button onClick={()=>toggle(i.id)} style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${T.green}`,background:T.green,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon name="check" size={11} color="#000"/>
              </button>
              <span style={{color:T.muted,fontSize:14,flex:1,textDecoration:'line-through'}}>{i.name}</span>
              <span style={{color:T.dim,fontSize:12}}>{i.qty} {i.unit}</span>
              <button onClick={()=>del(i.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',display:'flex',padding:4}}><Icon name="trash" size={13}/></button>
            </div>
          ))}
        </div>
      )}

      {!visible.length&&<div style={{textAlign:'center',padding:'30px 0',color:T.dim}}><Icon name="cart" size={40}/><p>La lista está vacía.</p></div>}
    </div>
  );
};


export default Shopping;
