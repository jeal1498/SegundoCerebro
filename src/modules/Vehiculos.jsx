import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

import { toast } from './Toast.jsx';
// ===================== HOGAR =====================
// ===================== COCHE =====================
const FUEL_OPTIONS=['gasolina','diésel','eléctrico','GLP','GNC'];
const FuelForm=({form,setForm})=>(
  <div style={{display:'flex',flexDirection:'column',gap:10}}>
    <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Tipo de energía</label>
      <Select value={form.fuelType||'gasolina'} onChange={v=>setForm(f=>({...f,fuelType:v}))}>
        {['gasolina','diésel','híbrido','eléctrico','GLP','GNC'].map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
      </Select>
    </div>
    {form.fuelType==='híbrido'&&(
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>⚡ Energía 1</label>
          <Select value={form.fuelType1||'gasolina'} onChange={v=>setForm(f=>({...f,fuelType1:v}))}>
            {FUEL_OPTIONS.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
          </Select>
        </div>
        <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>⚡ Energía 2</label>
          <Select value={form.fuelType2||'GLP'} onChange={v=>setForm(f=>({...f,fuelType2:v}))}>
            {FUEL_OPTIONS.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
          </Select>
        </div>
      </div>
    )}
  </div>
);

const Coche = ({data,setData,isMobile,onBack,embedded=false}) => {
  const [tab,setTab]     = useState('resumen');
  const [modalMaint,setModalMaint]   = useState(false);
  const [modalExp,setModalExp]       = useState(false);
  const [modalDoc,setModalDoc]       = useState(false);
  const [modalReminder,setModalReminder] = useState(false);
  const [modalInfo,setModalInfo]     = useState(false);
  const [modalNewVehicle,setModalNewVehicle] = useState(false);
  const [editItem,setEditItem]       = useState(null);
  const [editForm,setEditForm]       = useState({});

  const emptyMaint   = {name:'',category:'',lastDone:'',frequencyKm:'',frequencyDays:'',cost:'',notes:''};
  const emptyExp     = {concept:'',category:'Combustible',amount:'',date:today(),notes:''};
  const emptyDoc     = {name:'',category:'Seguro',expiresAt:'',provider:'',amount:'',notes:''};
  const emptyReminder= {title:'',dueDate:'',notes:'',done:false};
  const emptyVehicle = {brand:'',model:'',year:'',plate:'',km:'',fuelType:'gasolina',fuelType1:'',fuelType2:''};
  const [maintForm,setMaintForm]     = useState(emptyMaint);
  const [expForm,setExpForm]         = useState(emptyExp);
  const [docForm,setDocForm]         = useState(emptyDoc);
  const [reminderForm,setReminderForm] = useState(emptyReminder);
  const [infoForm,setInfoForm]       = useState({brand:'',model:'',year:'',plate:'',km:'',fuelType:'gasolina',fuelType1:'',fuelType2:''});
  const [newVehicleForm,setNewVehicleForm] = useState(emptyVehicle);

  const maints   = data.carMaintenances||[];
  const expenses = data.carExpenses||[];
  const docs     = data.carDocs||[];
  const reminders= data.carReminders||[];
  const carInfo  = data.carInfo||{brand:'',model:'',year:'',plate:'',km:'',fuelType:'gasolina',fuelType1:'',fuelType2:''};

  // ── Multi-vehicle ──
  const vehicles = data.vehicles||[];
  const activeVehicleId = data.activeVehicleId||null;

  const switchVehicle=(v)=>{
    setData(d=>({...d,carInfo:v,activeVehicleId:v.id}));
    save('carInfo',v); save('activeVehicleId',v.id);
  };
  const saveNewVehicle=()=>{
    if(!newVehicleForm.brand.trim()) return;
    const v={...newVehicleForm,id:uid(),createdAt:today()};
    const upd=[...vehicles,v];
    setData(d=>({...d,vehicles:upd}));
    save('vehicles',upd);
    setModalNewVehicle(false);
    setNewVehicleForm(emptyVehicle);
  };
  const deleteVehicle=(vid)=>{
    if(!window.confirm('¿Eliminar este vehículo?')) return;
    const upd=vehicles.filter(v=>v.id!==vid);
    setData(d=>({...d,vehicles:upd}));
    save('vehicles',upd);
  };

  // Helper: label de combustible
  const fuelLabel=(ci)=>{
    if(ci.fuelType==='híbrido'&&ci.fuelType1&&ci.fuelType2) return `Híbrido (${ci.fuelType1} + ${ci.fuelType2})`;
    return ci.fuelType||'—';
  };

  // ── helpers ──
  const diffDays=(dateStr)=>{ if(!dateStr) return null; return Math.ceil((new Date(dateStr)-new Date())/(1000*60*60*24)); };
  const fmtDate=(d)=>{ try{ return new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}); }catch{return d||'—';} };
  const fmtMoney=(n)=>`$${Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}`;

  // ── status ──
  const maintStatus=(m)=>{
    if(!m.lastDone) return {label:'Sin registrar',color:T.muted};
    if(m.frequencyDays){
      const d=new Date(m.lastDone); d.setDate(d.getDate()+Number(m.frequencyDays));
      const diff=Math.ceil((d-new Date())/(1000*60*60*24));
      if(diff<=0)  return {label:`Vencido hace ${Math.abs(diff)}d`,color:T.red};
      if(diff<=14) return {label:`En ${diff} días`,color:T.orange};
      return {label:`En ${diff} días`,color:T.green};
    }
    return {label:'Ver fecha',color:T.muted};
  };
  const docStatus=(doc)=>{
    if(!doc.expiresAt) return {label:'Sin vencimiento',color:T.muted};
    const d=diffDays(doc.expiresAt);
    if(d<0)   return {label:`Vencido hace ${Math.abs(d)}d`,color:T.red};
    if(d<=30) return {label:`Vence en ${d}d`,color:T.orange};
    return {label:fmtDate(doc.expiresAt),color:T.green};
  };

  // ── alerts ──
  const alertMaints  = maints.filter(m=>{ const s=maintStatus(m); return s.color===T.red||s.color===T.orange; });
  const alertDocs    = docs.filter(d=>{ const s=docStatus(d); return s.color===T.red||s.color===T.orange; });
  const pendingRems  = reminders.filter(r=>!r.done);
  const overdueRems  = pendingRems.filter(r=>r.dueDate&&diffDays(r.dueDate)<=0);

  // ── this month expenses ──
  const thisMonth = today().slice(0,7);
  const monthTotal = expenses.filter(e=>e.date?.slice(0,7)===thisMonth).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const totalExpenses = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);

  // ── MAINT actions ──
  const MAINT_CATS=['Aceite','Filtros','Frenos','Neumáticos','Batería','Correa distribución','Bujías','Climatización','Revisión general','Otro'];
  const saveMaint=()=>{
    if(!maintForm.name.trim()) return;
    const m={id:uid(),...maintForm,createdAt:today()};
    const upd=[m,...maints]; setData(d=>({...d,carMaintenances:upd})); save('carMaintenances',upd);
    setModalMaint(false); setMaintForm(emptyMaint); toast.success('Mantenimiento añadido');
  };
  const doneMaint=(id)=>{
    const upd=maints.map(m=>m.id===id?{...m,lastDone:today()}:m);
    setData(d=>({...d,carMaintenances:upd})); save('carMaintenances',upd); toast.success('Registrado ✓');
  };
  const delMaint=(id)=>{ const u=maints.filter(m=>m.id!==id); setData(d=>({...d,carMaintenances:u})); save('carMaintenances',u); };
  const updateMaint=()=>{
    const upd=maints.map(m=>m.id===editItem.id?{...m,...editForm}:m);
    setData(d=>({...d,carMaintenances:upd})); save('carMaintenances',upd); setEditItem(null);
  };

  // ── EXPENSE actions ──
  const EXP_CATS=['Combustible','Parking','Peaje','Multa','Lavado','Seguro','ITV','Reparación','Accesorios','Otro'];
  const saveExp=()=>{
    if(!expForm.concept.trim()||!expForm.amount) return;
    const e={id:uid(),...expForm,amount:Number(expForm.amount),createdAt:today()};
    const upd=[e,...expenses]; setData(d=>({...d,carExpenses:upd})); save('carExpenses',upd);
    setModalExp(false); setExpForm(emptyExp); toast.success('Gasto añadido');
  };
  const delExp=(id)=>{ const u=expenses.filter(e=>e.id!==id); setData(d=>({...d,carExpenses:u})); save('carExpenses',u); };
  const updateExp=()=>{
    const upd=expenses.map(e=>e.id===editItem.id?{...e,...editForm,amount:Number(editForm.amount)}:e);
    setData(d=>({...d,carExpenses:upd})); save('carExpenses',upd); setEditItem(null);
  };

  // ── DOC actions ──
  const DOC_CATS=['Seguro','ITV','Permiso de circulación','Garantía','Contrato compra','Ficha técnica','Otro'];
  const saveDoc=()=>{
    if(!docForm.name.trim()) return;
    const d={id:uid(),...docForm,createdAt:today()};
    const upd=[d,...docs]; setData(s=>({...s,carDocs:upd})); save('carDocs',upd);
    setModalDoc(false); setDocForm(emptyDoc); toast.success('Documento añadido');
  };
  const delDoc=(id)=>{ const u=docs.filter(d=>d.id!==id); setData(s=>({...s,carDocs:u})); save('carDocs',u); };
  const updateDoc=()=>{
    const upd=docs.map(d=>d.id===editItem.id?{...d,...editForm}:d);
    setData(s=>({...s,carDocs:upd})); save('carDocs',upd); setEditItem(null);
  };

  // ── REMINDER actions ──
  const saveReminder=()=>{
    if(!reminderForm.title.trim()) return;
    const r={id:uid(),...reminderForm,done:false,createdAt:today()};
    const upd=[r,...reminders]; setData(d=>({...d,carReminders:upd})); save('carReminders',upd);
    setModalReminder(false); setReminderForm(emptyReminder); toast.success('Recordatorio añadido');
  };
  const toggleReminder=(id)=>{
    const upd=reminders.map(r=>r.id===id?{...r,done:!r.done}:r);
    setData(d=>({...d,carReminders:upd})); save('carReminders',upd);
  };
  const delReminder=(id)=>{ const u=reminders.filter(r=>r.id!==id); setData(d=>({...d,carReminders:u})); save('carReminders',u); };

  // ── INFO actions ──
  const saveInfo=()=>{
    const updated={...infoForm,id:infoForm.id||uid()};
    // Also update in vehicles array if it's there
    const inVehicles=vehicles.some(v=>v.id===updated.id);
    if(inVehicles){
      const updVeh=vehicles.map(v=>v.id===updated.id?updated:v);
      setData(d=>({...d,carInfo:updated,vehicles:updVeh}));
      save('carInfo',updated); save('vehicles',updVeh);
    } else {
      setData(d=>({...d,carInfo:updated})); save('carInfo',updated);
    }
    setModalInfo(false); toast.success('Datos del coche guardados');
  };

  const TABS=[
    {id:'resumen',label:'Resumen',emoji:'🏁'},
    {id:'mantenimiento',label:'Manten.',emoji:'🔧'},
    {id:'gastos',label:'Gastos',emoji:'💸'},
    {id:'documentos',label:'Docs',emoji:'📄'},
    {id:'recordatorios',label:'Alertas',emoji:'🔔'},
  ];

  // ── FuelForm component (reusable in both modals) ──
  return (
    <div>
      {!embedded&&<PageHeader isMobile={isMobile} title="🚗 Mi Coche" onBack={onBack}
        subtitle={carInfo.brand?`${carInfo.brand} ${carInfo.model} ${carInfo.year} · ${carInfo.plate}`:'Gestión completa de tu vehículo'}
        action={
          <div style={{display:'flex',gap:8}}>
            <Btn size="sm" variant="ghost" onClick={()=>setModalNewVehicle(true)}>+ Vehículo</Btn>
            <Btn size="sm" variant="ghost" onClick={()=>{setInfoForm({...carInfo});setModalInfo(true);}}>⚙️ Datos</Btn>
            {tab==='mantenimiento'  &&<Btn size="sm" onClick={()=>setModalMaint(true)}><Icon name="plus" size={14}/>Mant.</Btn>}
            {tab==='gastos'        &&<Btn size="sm" onClick={()=>setModalExp(true)}><Icon name="plus" size={14}/>Gasto</Btn>}
            {tab==='documentos'    &&<Btn size="sm" onClick={()=>setModalDoc(true)}><Icon name="plus" size={14}/>Doc</Btn>}
            {tab==='recordatorios' &&<Btn size="sm" onClick={()=>setModalReminder(true)}><Icon name="plus" size={14}/>Alerta</Btn>}
          </div>
        }
      />}

      {/* embedded header substitute */}
      {embedded&&(
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:13,color:T.muted}}>{carInfo.brand?`${carInfo.brand} ${carInfo.model} ${carInfo.year} · ${carInfo.plate}`:'Sin datos del vehículo'}</div>
            <div style={{display:'flex',gap:6}}>
              <Btn size="sm" variant="ghost" onClick={()=>setModalNewVehicle(true)}>🚙 +</Btn>
              <Btn size="sm" variant="ghost" onClick={()=>{setInfoForm({...carInfo});setModalInfo(true);}}>⚙️ Datos</Btn>
            </div>
          </div>
          {/* vehicle pills in embedded mode */}
          {vehicles.length>0&&(
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
              <button onClick={()=>{setData(d=>({...d,activeVehicleId:null}));save('activeVehicleId',null);}}
                style={{border:`2px solid ${!activeVehicleId?T.accent:T.border}`,borderRadius:20,padding:'4px 10px',cursor:'pointer',
                  background:!activeVehicleId?T.accent+'22':T.surface,color:!activeVehicleId?T.accent:T.muted,
                  fontFamily:'inherit',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>
                🚗 {carInfo.brand||'Principal'}
              </button>
              {vehicles.map(v=>(
                <div key={v.id} style={{display:'flex',alignItems:'center',gap:3}}>
                  <button onClick={()=>switchVehicle(v)}
                    style={{border:`2px solid ${activeVehicleId===v.id?T.accent:T.border}`,borderRadius:20,padding:'4px 10px',cursor:'pointer',
                      background:activeVehicleId===v.id?T.accent+'22':T.surface,color:activeVehicleId===v.id?T.accent:T.muted,
                      fontFamily:'inherit',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>
                    🚙 {v.brand} {v.model}
                  </button>
                  <button onClick={()=>deleteVehicle(v.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:13,padding:2}}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:6,marginBottom:18,overflowX:'auto',paddingBottom:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{border:'none',borderRadius:10,padding:'7px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,whiteSpace:'nowrap',
              background:tab===t.id?T.accent:T.surface,color:tab===t.id?'#000':T.muted,
              borderBottom:tab===t.id?`2px solid ${T.accent}`:'2px solid transparent'}}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Vehicle switcher ── */}
      {vehicles.length>0&&(
        <div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',paddingBottom:2,alignItems:'center'}}>
          <span style={{fontSize:11,color:T.muted,whiteSpace:'nowrap'}}>Vehículos:</span>
          {/* Primary vehicle */}
          <button onClick={()=>{setData(d=>({...d,activeVehicleId:null}));save('activeVehicleId',null);}}
            style={{border:`2px solid ${!activeVehicleId?T.accent:T.border}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',
              background:!activeVehicleId?T.accent+'22':T.surface,color:!activeVehicleId?T.accent:T.muted,
              fontFamily:'inherit',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>
            🚗 {carInfo.brand||'Principal'}
          </button>
          {vehicles.map(v=>(
            <div key={v.id} style={{display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>switchVehicle(v)}
                style={{border:`2px solid ${activeVehicleId===v.id?T.accent:T.border}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',
                  background:activeVehicleId===v.id?T.accent+'22':T.surface,color:activeVehicleId===v.id?T.accent:T.muted,
                  fontFamily:'inherit',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>
                🚙 {v.brand} {v.model}
              </button>
              <button onClick={()=>deleteVehicle(v.id)}
                style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:14,padding:2}}>×</button>
            </div>
          ))}
          <button onClick={()=>setModalNewVehicle(true)}
            style={{border:`2px dashed ${T.border}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',
              background:'none',color:T.muted,fontFamily:'inherit',fontSize:12,whiteSpace:'nowrap'}}>
            + Añadir
          </button>
        </div>
      )}

      {/* ══════════ RESUMEN ══════════ */}
      {tab==='resumen'&&(
        <div>
          {/* summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[
              {label:'Alertas mant.',val:alertMaints.length,color:alertMaints.length>0?T.red:T.green,icon:'🔧'},
              {label:'Docs por vencer',val:alertDocs.length,color:alertDocs.length>0?T.orange:T.green,icon:'📄'},
              {label:'Recordatorios',val:overdueRems.length,color:overdueRems.length>0?T.red:T.green,icon:'🔔'},
              {label:'Gasto este mes',val:fmtMoney(monthTotal),color:T.blue,icon:'💸'},
            ].map(s=>(
              <Card key={s.label} style={{textAlign:'center',padding:14}}>
                <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:700,color:s.color}}>{s.val}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>{s.label}</div>
              </Card>
            ))}
          </div>

          {/* car info card */}
          {carInfo.brand?(
            <Card style={{marginBottom:14,padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{carInfo.brand} {carInfo.model}</div>
                  <div style={{fontSize:13,color:T.muted,marginTop:3}}>{carInfo.year} · {carInfo.plate} · {fuelLabel(carInfo)}</div>
                  {carInfo.km&&<div style={{fontSize:13,color:T.accent,marginTop:3,fontWeight:600}}>🛣 {Number(carInfo.km).toLocaleString()} km</div>}
                </div>
                <div style={{fontSize:36}}>🚗</div>
              </div>
            </Card>
          ):(
            <Card style={{marginBottom:14,padding:20,textAlign:'center',cursor:'pointer'}} onClick={()=>{setInfoForm({...carInfo});setModalInfo(true);}}>
              <div style={{fontSize:28,marginBottom:8}}>🚗</div>
              <div style={{fontSize:14,color:T.muted}}>Añade los datos de tu coche</div>
              <div style={{fontSize:12,color:T.dim,marginTop:4}}>Marca, modelo, matrícula…</div>
            </Card>
          )}

          {/* next maintenance */}
          {maints.length>0&&(
            <Card style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:T.muted,marginBottom:10}}>🔧 Próximos mantenimientos</div>
              {maints.slice(0,3).map(m=>{
                const st=maintStatus(m);
                return (
                  <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
                    <div>
                      <div style={{fontSize:13,color:T.text,fontWeight:500}}>{m.name}</div>
                      {m.category&&<div style={{fontSize:11,color:T.dim}}>{m.category}</div>}
                    </div>
                    <span style={{fontSize:11,color:st.color,fontWeight:600}}>{st.label}</span>
                  </div>
                );
              })}
            </Card>
          )}

          {/* pending reminders */}
          {pendingRems.length>0&&(
            <Card>
              <div style={{fontSize:13,fontWeight:600,color:T.muted,marginBottom:10}}>🔔 Recordatorios pendientes</div>
              {pendingRems.slice(0,3).map(r=>(
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:13,color:T.text}}>{r.title}</span>
                  {r.dueDate&&<span style={{fontSize:11,color:diffDays(r.dueDate)<=0?T.red:T.muted}}>{fmtDate(r.dueDate)}</span>}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ══════════ MANTENIMIENTO ══════════ */}
      {tab==='mantenimiento'&&(
        <div>
          {maints.length===0&&(
            <Card style={{textAlign:'center',padding:32}}>
              <div style={{fontSize:32,marginBottom:8}}>🔧</div>
              <div style={{color:T.muted,fontSize:14}}>Sin mantenimientos registrados</div>
              <div style={{color:T.dim,fontSize:12,marginTop:4}}>Añade aceite, frenos, neumáticos…</div>
            </Card>
          )}
          {maints.map(m=>{
            const st=maintStatus(m);
            return (
              <Card key={m.id} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:600,color:T.text}}>{m.name}</span>
                      {m.category&&<Tag text={m.category} color={T.blue}/>}
                    </div>
                    {m.lastDone&&<div style={{fontSize:12,color:T.dim}}>Último: {fmtDate(m.lastDone)}</div>}
                    {m.frequencyDays&&<div style={{fontSize:12,color:T.dim}}>Cada {m.frequencyDays} días</div>}
                    {m.frequencyKm&&<div style={{fontSize:12,color:T.dim}}>Cada {Number(m.frequencyKm).toLocaleString()} km</div>}
                    {m.cost&&<div style={{fontSize:12,color:T.accent}}>Coste: {fmtMoney(m.cost)}</div>}
                    {m.notes&&<div style={{fontSize:12,color:T.muted,marginTop:3}}>{m.notes}</div>}
                    <div style={{marginTop:6}}>
                      <span style={{fontSize:11,fontWeight:700,color:st.color,background:`${st.color}18`,padding:'2px 8px',borderRadius:8}}>{st.label}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                    <button onClick={()=>doneMaint(m.id)} style={{background:T.accent,border:'none',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'#000',fontSize:11,fontWeight:700}}>✓ Hecho</button>
                    <button onClick={()=>{setEditItem(m);setEditForm({...m});}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:11}}>Editar</button>
                    <button onClick={()=>delMaint(m.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.dim,padding:4}}><Icon name="trash" size={14}/></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══════════ GASTOS ══════════ */}
      {tab==='gastos'&&(
        <div>
          {/* monthly summary */}
          <Card style={{marginBottom:14,padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,color:T.muted}}>Este mes</div>
                <div style={{fontSize:22,fontWeight:700,color:T.accent}}>{fmtMoney(monthTotal)}</div>
              </div>
              <div>
                <div style={{fontSize:13,color:T.muted}}>Total acumulado</div>
                <div style={{fontSize:18,fontWeight:600,color:T.text}}>{fmtMoney(totalExpenses)}</div>
              </div>
            </div>
          </Card>

          {expenses.length===0&&(
            <Card style={{textAlign:'center',padding:32}}>
              <div style={{fontSize:32,marginBottom:8}}>💸</div>
              <div style={{color:T.muted,fontSize:14}}>Sin gastos registrados</div>
            </Card>
          )}

          {/* group by category for this month */}
          {expenses.length>0&&(()=>{
            const bycat={};
            expenses.filter(e=>e.date?.slice(0,7)===thisMonth).forEach(e=>{ bycat[e.category]=(bycat[e.category]||0)+Number(e.amount); });
            const cats=Object.entries(bycat).sort((a,b)=>b[1]-a[1]);
            const catColors={'Combustible':T.orange,'Parking':T.blue,'Peaje':T.purple,'Multa':T.red,'Lavado':T.teal,'Seguro':T.accent,'ITV':T.yellow,'Reparación':T.red,'Accesorios':T.blue,'Otro':T.muted};
            return cats.length>0&&(
              <Card style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:T.muted,marginBottom:10}}>Distribución este mes</div>
                {cats.map(([cat,amt])=>(
                  <HBar key={cat} label={cat} value={amt} total={monthTotal} color={catColors[cat]||T.muted} amount={amt}/>
                ))}
              </Card>
            );
          })()}

          {expenses.slice(0,30).map(e=>(
            <Card key={e.id} style={{marginBottom:8,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:600,color:T.text}}>{e.concept}</span>
                    <Tag text={e.category} color={T.blue}/>
                  </div>
                  {e.date&&<div style={{fontSize:11,color:T.dim,marginTop:2}}>{fmtDate(e.date)}</div>}
                  {e.notes&&<div style={{fontSize:12,color:T.muted,marginTop:2}}>{e.notes}</div>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:15,fontWeight:700,color:T.red}}>{fmtMoney(e.amount)}</span>
                  <button onClick={()=>{setEditItem(e);setEditForm({...e});}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'3px 8px',cursor:'pointer',color:T.muted,fontSize:11}}>✏️</button>
                  <button onClick={()=>delExp(e.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.dim}}><Icon name="trash" size={14}/></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══════════ DOCUMENTOS ══════════ */}
      {tab==='documentos'&&(
        <div>
          {docs.length===0&&(
            <Card style={{textAlign:'center',padding:32}}>
              <div style={{fontSize:32,marginBottom:8}}>📄</div>
              <div style={{color:T.muted,fontSize:14}}>Sin documentos registrados</div>
              <div style={{color:T.dim,fontSize:12,marginTop:4}}>Seguro, ITV, permiso de circulación…</div>
            </Card>
          )}
          {docs.map(d=>{
            const st=docStatus(d);
            return (
              <Card key={d.id} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:600,color:T.text}}>{d.name}</span>
                      <Tag text={d.category} color={T.purple}/>
                    </div>
                    {d.provider&&<div style={{fontSize:12,color:T.muted}}>Proveedor: {d.provider}</div>}
                    {d.amount&&<div style={{fontSize:12,color:T.accent}}>Importe: {fmtMoney(d.amount)}</div>}
                    {d.notes&&<div style={{fontSize:12,color:T.muted,marginTop:3}}>{d.notes}</div>}
                    <div style={{marginTop:6}}>
                      <span style={{fontSize:11,fontWeight:700,color:st.color,background:`${st.color}18`,padding:'2px 8px',borderRadius:8}}>{st.label}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                    <button onClick={()=>{setEditItem(d);setEditForm({...d});}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:11}}>Editar</button>
                    <button onClick={()=>delDoc(d.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.dim,padding:4}}><Icon name="trash" size={14}/></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══════════ RECORDATORIOS ══════════ */}
      {tab==='recordatorios'&&(
        <div>
          {reminders.length===0&&(
            <Card style={{textAlign:'center',padding:32}}>
              <div style={{fontSize:32,marginBottom:8}}>🔔</div>
              <div style={{color:T.muted,fontSize:14}}>Sin recordatorios</div>
              <div style={{color:T.dim,fontSize:12,marginTop:4}}>ITV próxima, revisión anual…</div>
            </Card>
          )}
          {reminders.map(r=>{
            const overdue=r.dueDate&&diffDays(r.dueDate)<=0&&!r.done;
            return (
              <Card key={r.id} style={{marginBottom:10,opacity:r.done?0.5:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{display:'flex',gap:10,flex:1}}>
                    <button onClick={()=>toggleReminder(r.id)} style={{background:r.done?T.accent:T.surface2,border:`2px solid ${r.done?T.accent:T.border}`,borderRadius:6,width:22,height:22,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                      {r.done&&<Icon name="check" size={13} color="#000"/>}
                    </button>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600,color:r.done?T.dim:T.text,textDecoration:r.done?'line-through':'none'}}>{r.title}</div>
                      {r.dueDate&&<div style={{fontSize:12,marginTop:2,fontWeight:overdue?700:400,color:overdue?T.red:T.muted}}>{overdue?'⚠️ Vencido: ':''}{fmtDate(r.dueDate)}</div>}
                      {r.notes&&<div style={{fontSize:12,color:T.dim,marginTop:3}}>{r.notes}</div>}
                    </div>
                  </div>
                  <button onClick={()=>delReminder(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.dim,padding:4}}><Icon name="trash" size={14}/></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══════════ MODALES ══════════ */}

      {/* Modal: Nuevo vehículo */}
      {modalNewVehicle&&(
        <Modal title="🚙 Añadir vehículo" onClose={()=>setModalNewVehicle(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Marca *</label><Input value={newVehicleForm.brand} onChange={v=>setNewVehicleForm(f=>({...f,brand:v}))} placeholder="Honda"/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Modelo</label><Input value={newVehicleForm.model} onChange={v=>setNewVehicleForm(f=>({...f,model:v}))} placeholder="Civic"/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Año</label><Input value={newVehicleForm.year} onChange={v=>setNewVehicleForm(f=>({...f,year:v}))} placeholder="2022"/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Matrícula</label><Input value={newVehicleForm.plate} onChange={v=>setNewVehicleForm(f=>({...f,plate:v.toUpperCase()}))} placeholder="XYZ 5678"/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Kilómetros actuales</label><Input value={newVehicleForm.km} onChange={v=>setNewVehicleForm(f=>({...f,km:v}))} placeholder="0" type="number"/></div>
            <FuelForm form={newVehicleForm} setForm={setNewVehicleForm}/>
            <Btn onClick={saveNewVehicle}>Añadir vehículo</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: Datos del coche */}
      {modalInfo&&(
        <Modal title="🚗 Datos del coche" onClose={()=>setModalInfo(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Marca</label><Input value={infoForm.brand} onChange={v=>setInfoForm(f=>({...f,brand:v}))} placeholder="Toyota"/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Modelo</label><Input value={infoForm.model} onChange={v=>setInfoForm(f=>({...f,model:v}))} placeholder="Corolla"/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Año</label><Input value={infoForm.year} onChange={v=>setInfoForm(f=>({...f,year:v}))} placeholder="2021"/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Matrícula</label><Input value={infoForm.plate} onChange={v=>setInfoForm(f=>({...f,plate:v.toUpperCase()}))} placeholder="1234 ABC"/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Kilómetros actuales</label><Input value={infoForm.km} onChange={v=>setInfoForm(f=>({...f,km:v}))} placeholder="85000" type="number"/></div>
            <FuelForm form={infoForm} setForm={setInfoForm}/>
            <Btn onClick={saveInfo}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo mantenimiento */}
      {modalMaint&&(
        <Modal title="🔧 Nuevo mantenimiento" onClose={()=>setModalMaint(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Nombre *</label><Input value={maintForm.name} onChange={v=>setMaintForm(f=>({...f,name:v}))} placeholder="Cambio de aceite"/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Categoría</label>
              <Select value={maintForm.category} onChange={v=>setMaintForm(f=>({...f,category:v}))}>
                <option value="">Sin categoría</option>
                {MAINT_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Última vez</label><Input type="date" value={maintForm.lastDone} onChange={v=>setMaintForm(f=>({...f,lastDone:v}))}/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Cada (días)</label><Input type="number" value={maintForm.frequencyDays} onChange={v=>setMaintForm(f=>({...f,frequencyDays:v}))} placeholder="365"/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Cada (km)</label><Input type="number" value={maintForm.frequencyKm} onChange={v=>setMaintForm(f=>({...f,frequencyKm:v}))} placeholder="10000"/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Coste aprox.</label><Input type="number" value={maintForm.cost} onChange={v=>setMaintForm(f=>({...f,cost:v}))} placeholder="0"/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={maintForm.notes} onChange={v=>setMaintForm(f=>({...f,notes:v}))} placeholder="Notas opcionales" rows={2}/></div>
            <Btn onClick={saveMaint}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: editar mantenimiento */}
      {editItem&&tab==='mantenimiento'&&(
        <Modal title="Editar mantenimiento" onClose={()=>setEditItem(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Nombre</label><Input value={editForm.name||''} onChange={v=>setEditForm(f=>({...f,name:v}))}/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Categoría</label>
              <Select value={editForm.category||''} onChange={v=>setEditForm(f=>({...f,category:v}))}>
                <option value="">Sin categoría</option>
                {MAINT_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Última vez</label><Input type="date" value={editForm.lastDone||''} onChange={v=>setEditForm(f=>({...f,lastDone:v}))}/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Cada (días)</label><Input type="number" value={editForm.frequencyDays||''} onChange={v=>setEditForm(f=>({...f,frequencyDays:v}))}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Cada (km)</label><Input type="number" value={editForm.frequencyKm||''} onChange={v=>setEditForm(f=>({...f,frequencyKm:v}))}/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Coste aprox.</label><Input type="number" value={editForm.cost||''} onChange={v=>setEditForm(f=>({...f,cost:v}))}/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={editForm.notes||''} onChange={v=>setEditForm(f=>({...f,notes:v}))} rows={2}/></div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={updateMaint}>Guardar</Btn>
              <Btn variant="ghost" onClick={()=>setEditItem(null)}>Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo gasto */}
      {modalExp&&(
        <Modal title="💸 Nuevo gasto" onClose={()=>setModalExp(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Concepto *</label><Input value={expForm.concept} onChange={v=>setExpForm(f=>({...f,concept:v}))} placeholder="Gasolina full tank"/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Categoría</label>
                <Select value={expForm.category} onChange={v=>setExpForm(f=>({...f,category:v}))}>
                  {EXP_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Importe *</label><Input type="number" value={expForm.amount} onChange={v=>setExpForm(f=>({...f,amount:v}))} placeholder="0"/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Fecha</label><Input type="date" value={expForm.date} onChange={v=>setExpForm(f=>({...f,date:v}))}/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={expForm.notes} onChange={v=>setExpForm(f=>({...f,notes:v}))} placeholder="Notas opcionales" rows={2}/></div>
            <Btn onClick={saveExp}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: editar gasto */}
      {editItem&&tab==='gastos'&&(
        <Modal title="Editar gasto" onClose={()=>setEditItem(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Concepto</label><Input value={editForm.concept||''} onChange={v=>setEditForm(f=>({...f,concept:v}))}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Categoría</label>
                <Select value={editForm.category||''} onChange={v=>setEditForm(f=>({...f,category:v}))}>
                  {EXP_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Importe</label><Input type="number" value={editForm.amount||''} onChange={v=>setEditForm(f=>({...f,amount:v}))}/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Fecha</label><Input type="date" value={editForm.date||''} onChange={v=>setEditForm(f=>({...f,date:v}))}/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={editForm.notes||''} onChange={v=>setEditForm(f=>({...f,notes:v}))} rows={2}/></div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={updateExp}>Guardar</Btn>
              <Btn variant="ghost" onClick={()=>setEditItem(null)}>Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo documento */}
      {modalDoc&&(
        <Modal title="📄 Nuevo documento" onClose={()=>setModalDoc(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Nombre *</label><Input value={docForm.name} onChange={v=>setDocForm(f=>({...f,name:v}))} placeholder="Seguro todo riesgo"/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Categoría</label>
              <Select value={docForm.category} onChange={v=>setDocForm(f=>({...f,category:v}))}>
                {DOC_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Vence el</label><Input type="date" value={docForm.expiresAt} onChange={v=>setDocForm(f=>({...f,expiresAt:v}))}/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Importe</label><Input type="number" value={docForm.amount} onChange={v=>setDocForm(f=>({...f,amount:v}))} placeholder="0"/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Proveedor / Aseguradora</label><Input value={docForm.provider} onChange={v=>setDocForm(f=>({...f,provider:v}))} placeholder="Mapfre…"/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={docForm.notes} onChange={v=>setDocForm(f=>({...f,notes:v}))} placeholder="Notas opcionales" rows={2}/></div>
            <Btn onClick={saveDoc}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: editar documento */}
      {editItem&&tab==='documentos'&&(
        <Modal title="Editar documento" onClose={()=>setEditItem(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Nombre</label><Input value={editForm.name||''} onChange={v=>setEditForm(f=>({...f,name:v}))}/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Categoría</label>
              <Select value={editForm.category||''} onChange={v=>setEditForm(f=>({...f,category:v}))}>
                {DOC_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Vence el</label><Input type="date" value={editForm.expiresAt||''} onChange={v=>setEditForm(f=>({...f,expiresAt:v}))}/></div>
              <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Importe</label><Input type="number" value={editForm.amount||''} onChange={v=>setEditForm(f=>({...f,amount:v}))}/></div>
            </div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Proveedor</label><Input value={editForm.provider||''} onChange={v=>setEditForm(f=>({...f,provider:v}))}/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={editForm.notes||''} onChange={v=>setEditForm(f=>({...f,notes:v}))} rows={2}/></div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={updateDoc}>Guardar</Btn>
              <Btn variant="ghost" onClick={()=>setEditItem(null)}>Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nuevo recordatorio */}
      {modalReminder&&(
        <Modal title="🔔 Nuevo recordatorio" onClose={()=>setModalReminder(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Título *</label><Input value={reminderForm.title} onChange={v=>setReminderForm(f=>({...f,title:v}))} placeholder="ITV en julio…"/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Fecha límite</label><Input type="date" value={reminderForm.dueDate} onChange={v=>setReminderForm(f=>({...f,dueDate:v}))}/></div>
            <div><label style={{fontSize:12,color:T.muted,display:'block',marginBottom:4}}>Notas</label><Textarea value={reminderForm.notes} onChange={v=>setReminderForm(f=>({...f,notes:v}))} placeholder="Detalles…" rows={2}/></div>
            <Btn onClick={saveReminder}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default Coche;
