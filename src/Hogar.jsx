import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== HOGAR =====================
const Hogar = ({data,setData,isMobile,onBack}) => {
  const [tab,setTab]       = useState('mantenimientos');
  const [modalMaint,setModalMaint]   = useState(false);
  const [modalDoc,setModalDoc]       = useState(false);
  const [modalContact,setModalContact] = useState(false);
  const [editMaint,setEditMaint]     = useState(null);
  const [editDoc,setEditDoc]         = useState(null);
  const [editContact,setEditContact] = useState(null);
  const [editMaintForm,setEditMaintForm] = useState({});
  const [editDocForm,setEditDocForm]     = useState({});
  const [editContactForm,setEditContactForm] = useState({});
  const [maintForm,setMaintForm]     = useState({name:'',category:'',frequencyDays:90,lastDone:'',notes:'',cost:''});
  const [docForm,setDocForm]         = useState({name:'',category:'',expiresAt:'',provider:'',amount:'',notes:'',photoUrl:''});
  const [contactForm,setContactForm] = useState({name:'',role:'',phone:'',email:'',notes:''});
  const [contactSearch,setContactSearch] = useState('');
  const [modalFarmacia,setModalFarmacia] = useState(false);
  const [editFarmacia,setEditFarmacia]   = useState(null);
  const [editFarmaciaForm,setEditFarmaciaForm] = useState({});
  const [farmaciaForm,setFarmaciaForm]   = useState({name:'',quantity:'',unit:'unidades',expiresAt:'',location:'',notes:''});
  const [farmaciaSearch,setFarmaciaSearch] = useState('');

  const maints   = data.maintenances||[];
  const docs     = data.homeDocs||[];
  const contacts = data.homeContacts||[];

  // ── date helpers ──
  const diffDays=(dateStr)=>{
    if(!dateStr) return null;
    const diff=Math.ceil((new Date(dateStr)-new Date())/(1000*60*60*24));
    return diff;
  };
  const nextDate=(lastDone,freqDays)=>{
    if(!lastDone) return null;
    const d=new Date(lastDone); d.setDate(d.getDate()+Number(freqDays));
    return d.toISOString().slice(0,10);
  };
  const fmtDate=(d)=>{ try{ return new Date(d+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}); }catch{return d||'—';} };

  // ── summary counts ──
  const overdueMaints  = maints.filter(m=>{ const nd=nextDate(m.lastDone,m.frequencyDays); return nd&&diffDays(nd)<=0; });
  const soonMaints     = maints.filter(m=>{ const nd=nextDate(m.lastDone,m.frequencyDays); const d=diffDays(nd); return nd&&d>0&&d<=14; });
  const expiringDocs   = docs.filter(d=>{ const diff=diffDays(d.expiresAt); return diff!==null&&diff>=0&&diff<=30; });
  const expiredDocs    = docs.filter(d=>{ const diff=diffDays(d.expiresAt); return diff!==null&&diff<0; });

  // next upcoming maint
  const nextMaint = [...maints]
    .map(m=>({...m,_next:nextDate(m.lastDone,m.frequencyDays)}))
    .filter(m=>m._next&&diffDays(m._next)>0)
    .sort((a,b)=>a._next.localeCompare(b._next))[0];

  // ── MAINT actions ──
  const MAINT_CATS=['General','Coche','Jardín','Plomería','Electricidad','Climatización','Electrodomésticos','Otro'];
  const saveMaint=()=>{
    if(!maintForm.name.trim()) return;
    const m={id:uid(),...maintForm,frequencyDays:Number(maintForm.frequencyDays)||90,createdAt:today()};
    const upd=[m,...maints]; setData(d=>({...d,maintenances:upd})); save('maintenances',upd);
    setModalMaint(false); setMaintForm({name:'',category:'',frequencyDays:90,lastDone:'',notes:'',cost:''});
  };
  const doneMaint=(id)=>{
    const upd=maints.map(m=>m.id===id?{...m,lastDone:today()}:m);
    setData(d=>({...d,maintenances:upd})); save('maintenances',upd);
    toast.success('Mantenimiento registrado como hecho');
  };
  const delMaint=(id)=>{ const u=maints.filter(m=>m.id!==id); setData(d=>({...d,maintenances:u})); save('maintenances',u); };
  const updateMaint=()=>{
    if(!editMaintForm.name?.trim()) return;
    const upd=maints.map(m=>m.id===editMaint.id?{...m,...editMaintForm,frequencyDays:Number(editMaintForm.frequencyDays)||90}:m);
    setData(d=>({...d,maintenances:upd})); save('maintenances',upd); setEditMaint(null);
  };

  // ── DOC actions ──
  const DOC_CATS=['Seguro','Garantía','Contrato','Escritura','Impuesto','Membresía','Suscripción','Otro'];
  const saveDoc=()=>{
    if(!docForm.name.trim()) return;
    const d={id:uid(),...docForm,createdAt:today()};
    const upd=[d,...docs]; setData(s=>({...s,homeDocs:upd})); save('homeDocs',upd);
    setModalDoc(false); setDocForm({name:'',category:'',expiresAt:'',provider:'',amount:'',notes:'',photoUrl:''});
  };
  const delDoc=(id)=>{ const u=docs.filter(d=>d.id!==id); setData(s=>({...s,homeDocs:u})); save('homeDocs',u); };
  const updateDoc=()=>{
    if(!editDocForm.name?.trim()) return;
    const upd=docs.map(d=>d.id===editDoc.id?{...d,...editDocForm}:d);
    setData(s=>({...s,homeDocs:upd})); save('homeDocs',upd); setEditDoc(null);
  };

  // ── CONTACT actions ──
  const CONTACT_ROLES=['Plomero','Electricista','Médico','Dentista','Veterinario','Mecánico','Abogado','Contador','Jardinero','Limpieza','Cerrajero','Otro'];
  const saveContact=()=>{
    if(!contactForm.name.trim()) return;
    const c={id:uid(),...contactForm,createdAt:today()};
    const upd=[c,...contacts]; setData(d=>({...d,homeContacts:upd})); save('homeContacts',upd);
    setModalContact(false); setContactForm({name:'',role:'',phone:'',email:'',notes:''});
  };
  const delContact=(id)=>{ const u=contacts.filter(c=>c.id!==id); setData(d=>({...d,homeContacts:u})); save('homeContacts',u); };
  const updateContact=()=>{
    if(!editContactForm.name?.trim()) return;
    const upd=contacts.map(c=>c.id===editContact.id?{...c,...editContactForm}:c);
    setData(d=>({...d,homeContacts:upd})); save('homeContacts',upd); setEditContact(null);
  };
  const copyPhone=(phone)=>{ navigator.clipboard?.writeText(phone).catch(()=>{}); };

  // ── FARMACIA actions ──
  const farmaciaItems = data.farmaciaItems||[];
  const FARMACIA_UNITS=['unidades','tabletas','cápsulas','ml','mg','frascos','sobres','parches','gotas'];
  const saveFarmacia=()=>{
    if(!farmaciaForm.name.trim()) return;
    const item={id:uid(),...farmaciaForm,quantity:Number(farmaciaForm.quantity)||0,createdAt:today()};
    const upd=[item,...farmaciaItems]; setData(d=>({...d,farmaciaItems:upd})); save('farmaciaItems',upd);
    setModalFarmacia(false); setFarmaciaForm({name:'',quantity:'',unit:'unidades',expiresAt:'',location:'',notes:''});
    toast.success('Medicamento añadido al botiquín');
  };
  const delFarmacia=(id)=>{ const u=farmaciaItems.filter(i=>i.id!==id); setData(d=>({...d,farmaciaItems:u})); save('farmaciaItems',u); };
  const updateFarmacia=()=>{
    const upd=farmaciaItems.map(i=>i.id===editFarmacia.id?{...i,...editFarmaciaForm,quantity:Number(editFarmaciaForm.quantity)||0}:i);
    setData(d=>({...d,farmaciaItems:upd})); save('farmaciaItems',upd); setEditFarmacia(null);
  };
  // Conexión con Salud: nombres de medicamentos activos
  const activeMedNames=(data.medications||[]).map(m=>m.name.toLowerCase());
  const isActiveMed=(name)=>activeMedNames.some(n=>name.toLowerCase().includes(n)||n.includes(name.toLowerCase()));

  // ── status helpers ──
  const maintStatus=(m)=>{
    const nd=nextDate(m.lastDone,m.frequencyDays);
    if(!m.lastDone) return {label:'Sin registrar',color:T.muted,urgent:false};
    const d=diffDays(nd);
    if(d<=0)  return {label:`Vencido hace ${Math.abs(d)}d`,color:T.red,   urgent:true};
    if(d<=7)  return {label:`Vence en ${d}d`,             color:T.orange, urgent:true};
    if(d<=14) return {label:`En ${d} días`,               color:T.orange, urgent:false};
    return      {label:`En ${d} días`,                    color:T.green,  urgent:false};
  };
  const docStatus=(doc)=>{
    if(!doc.expiresAt) return {label:'Sin vencimiento',color:T.muted};
    const d=diffDays(doc.expiresAt);
    if(d<0)   return {label:`Vencido hace ${Math.abs(d)}d`, color:T.red};
    if(d<=7)  return {label:`Vence en ${d}d`,              color:T.red};
    if(d<=30) return {label:`Vence en ${d}d`,              color:T.orange};
    return      {label:fmtDate(doc.expiresAt),             color:T.green};
  };

  const FREQ_OPTS=[
    {label:'Semanal',days:7},{label:'Quincenal',days:15},{label:'Mensual',days:30},
    {label:'Bimestral',days:60},{label:'Trimestral',days:90},{label:'Semestral',days:180},
    {label:'Anual',days:365},{label:'Personalizado',days:0},
  ];

  return (
    <div>
      <PageHeader isMobile={isMobile} title="🏠 Hogar" onBack={onBack}
        subtitle="Mantenimientos, documentos y contactos de servicio"
        action={
          <div style={{display:'flex',gap:8}}>
            {tab==='mantenimientos'&&<Btn size="sm" onClick={()=>setModalMaint(true)}><Icon name="plus" size={14}/>Tarea</Btn>}
            {tab==='documentos'    &&<Btn size="sm" onClick={()=>setModalDoc(true)}><Icon name="plus" size={14}/>Doc</Btn>}
            {tab==='contactos'     &&<Btn size="sm" onClick={()=>setModalContact(true)}><Icon name="plus" size={14}/>Contacto</Btn>}
            {tab==='farmacia'      &&<Btn size="sm" onClick={()=>setModalFarmacia(true)}><Icon name="plus" size={14}/>Medicamento</Btn>}
          </div>
        }
      />

      {/* ── Summary cards ── */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[
          {label:'Vencidos',       val:overdueMaints.length, color:overdueMaints.length>0?T.red:T.green,   icon:'🔧'},
          {label:'Próx. 14 días',  val:soonMaints.length,    color:soonMaints.length>0?T.orange:T.muted,   icon:'⏰'},
          {label:'Docs por vencer',val:expiringDocs.length+expiredDocs.length, color:(expiringDocs.length+expiredDocs.length)>0?T.orange:T.muted, icon:'📄'},
          {label:'Contactos',      val:contacts.length,       color:T.blue,                                 icon:'📞'},
        ].map(s=>(
          <Card key={s.label} style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:isMobile?20:24,fontWeight:700,color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Alertas críticas de documentos ── */}
      {(expiredDocs.length>0||expiringDocs.length>0)&&(
        <div style={{background:`${T.red}10`,border:`1px solid ${T.red}35`,borderRadius:12,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
          <span style={{fontSize:22,flexShrink:0}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{color:T.red,fontWeight:700,fontSize:13,marginBottom:4}}>
              {expiredDocs.length>0&&`${expiredDocs.length} documento${expiredDocs.length>1?'s':''} vencido${expiredDocs.length>1?'s':''}`}
              {expiredDocs.length>0&&expiringDocs.length>0&&' · '}
              {expiringDocs.length>0&&`${expiringDocs.length} por vencer pronto`}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[...expiredDocs,...expiringDocs].slice(0,4).map(d=>{
                const dd=diffDays(d.expiresAt);
                return <span key={d.id} style={{fontSize:11,color:dd<=0?T.red:dd<=7?T.orange:T.muted}}>{d.name} {dd<=0?'(vencido)':`(en ${dd}d)`}</span>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Costo acumulado por categoría ── */}
      {maints.filter(m=>m.cost).length>0&&(()=>{
        const byCategory={};
        maints.filter(m=>m.cost).forEach(m=>{
          const cat=m.category||'Sin categoría';
          byCategory[cat]=(byCategory[cat]||0)+Number(m.cost);
        });
        const cats=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
        const total=cats.reduce((s,[,v])=>s+v,0);
        return (
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>💰 Costos de mantenimiento por categoría</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:6}}>
              {cats.map(([cat,cost])=>(
                <div key={cat} style={{background:T.surface2,borderRadius:8,padding:'6px 12px'}}>
                  <div style={{fontSize:10,color:T.muted}}>{cat}</div>
                  <div style={{fontSize:15,fontWeight:700,color:T.accent}}>${cost.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:T.muted}}>Total estimado: <span style={{fontWeight:700,color:T.text}}>${total.toLocaleString()}</span></div>
          </div>
        );
      })()}

      {/* ── Próximo mantenimiento banner ── */}
      {nextMaint&&(
        <div style={{padding:'12px 16px',background:`${T.blue}12`,border:`1px solid ${T.blue}30`,borderRadius:12,marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>📅</span>
          <div style={{flex:1}}>
            <div style={{color:T.text,fontSize:13,fontWeight:600}}>Próximo: {nextMaint.name}</div>
            <div style={{color:T.muted,fontSize:12}}>{fmtDate(nextMaint._next)} · en {diffDays(nextMaint._next)} días</div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[{id:'mantenimientos',label:'🔧 Mantenimientos'},{id:'documentos',label:'📄 Documentos'},{id:'contactos',label:'📞 Contactos'},{id:'farmacia',label:'💊 Farmacia'},{id:'coche',label:'🚗 Coche'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'7px 16px',borderRadius:10,border:`1px solid ${tab===t.id?T.accent:T.border}`,background:tab===t.id?`${T.accent}18`:'transparent',color:tab===t.id?T.accent:T.muted,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?600:400,fontFamily:'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ MANTENIMIENTOS ══════════ */}
      {tab==='mantenimientos'&&(
        <div>
          {maints.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>🔧</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin tareas de mantenimiento</div>
               <Btn size="sm" onClick={()=>setModalMaint(true)}><Icon name="plus" size={13}/>Agregar</Btn>
             </div>
            :[...maints].sort((a,b)=>{
               const da=diffDays(nextDate(a.lastDone,a.frequencyDays))??999;
               const db=diffDays(nextDate(b.lastDone,b.frequencyDays))??999;
               return da-db;
             }).map(m=>{
               const st=maintStatus(m);
               const nd=nextDate(m.lastDone,m.frequencyDays);
               return (
                 <div key={m.id} style={{padding:'14px 16px',background:T.surface,border:`1px solid ${st.urgent?st.color:T.border}`,borderRadius:12,marginBottom:10,borderLeft:`3px solid ${st.color}`}}>
                   <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                     <div style={{flex:1}}>
                       <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                         <span style={{color:T.text,fontSize:14,fontWeight:600}}>{m.name}</span>
                         {m.category&&<span style={{fontSize:11,background:`${T.accent}15`,color:T.accent,padding:'2px 8px',borderRadius:8}}>{m.category}</span>}
                       </div>
                       <div style={{color:T.muted,fontSize:12,marginTop:4,display:'flex',gap:12,flexWrap:'wrap'}}>
                         {m.lastDone&&<span>✅ Último: {fmtDate(m.lastDone)}</span>}
                         {nd&&<span>📅 Próximo: {fmtDate(nd)}</span>}
                         {m.cost&&<span>💰 ${Number(m.cost).toLocaleString()}</span>}
                       </div>
                       {m.notes&&<div style={{color:T.dim,fontSize:11,marginTop:4}}>{m.notes}</div>}
                     </div>
                     <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                       <span style={{fontSize:11,fontWeight:600,color:st.color,background:`${st.color}15`,padding:'3px 10px',borderRadius:8,whiteSpace:'nowrap'}}>{st.label}</span>
                       <div style={{display:'flex',gap:6}}>
                         <button onClick={()=>{setEditMaint(m);setEditMaintForm({name:m.name,category:m.category||'',frequencyDays:m.frequencyDays||90,lastDone:m.lastDone||'',notes:m.notes||'',cost:m.cost||'',});}} style={{padding:'5px 8px',background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:8,cursor:'pointer',color:T.accent,fontSize:11,fontFamily:'inherit'}}>✏️</button>
                         <button onClick={()=>doneMaint(m.id)}
                           style={{padding:'5px 10px',background:`${T.green}18`,border:`1px solid ${T.green}40`,borderRadius:8,cursor:'pointer',color:T.green,fontSize:11,fontWeight:600,fontFamily:'inherit'}}>
                           ✓ Hecho hoy
                         </button>
                         <button onClick={()=>delMaint(m.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })
          }
        </div>
      )}

      {/* ══════════ DOCUMENTOS ══════════ */}
      {tab==='documentos'&&(
        <div>
          {docs.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>📄</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin documentos registrados</div>
               <Btn size="sm" onClick={()=>setModalDoc(true)}><Icon name="plus" size={13}/>Agregar</Btn>
             </div>
            :[...docs].sort((a,b)=>{
               const da=diffDays(a.expiresAt)??9999;
               const db=diffDays(b.expiresAt)??9999;
               return da-db;
             }).map(doc=>{
               const st=docStatus(doc);
               return (
                 <div key={doc.id} style={{padding:'14px 16px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:10,borderLeft:`3px solid ${st.color}`}}>
                   <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                     <div style={{flex:1}}>
                       <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                         <span style={{color:T.text,fontSize:14,fontWeight:600}}>{doc.name}</span>
                         {doc.category&&<span style={{fontSize:11,background:`${T.blue}15`,color:T.blue,padding:'2px 8px',borderRadius:8}}>{doc.category}</span>}
                       </div>
                       <div style={{color:T.muted,fontSize:12,marginTop:4,display:'flex',gap:12,flexWrap:'wrap'}}>
                         {doc.provider&&<span>🏢 {doc.provider}</span>}
                         {doc.amount&&<span>💰 ${Number(doc.amount).toLocaleString()}/año</span>}
                       </div>
                       {doc.notes&&<div style={{color:T.dim,fontSize:11,marginTop:4}}>{doc.notes}</div>}
                       {doc.photoUrl&&(
                         <a href={doc.photoUrl} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:6,fontSize:11,color:T.blue,textDecoration:'none',background:`${T.blue}10`,padding:'3px 10px',borderRadius:6,border:`1px solid ${T.blue}25`}}
                           onClick={e=>e.stopPropagation()}>
                           📷 Ver foto / QR
                         </a>
                       )}
                     </div>
                     <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                       <span style={{fontSize:11,fontWeight:600,color:st.color,background:`${st.color}15`,padding:'3px 10px',borderRadius:8,whiteSpace:'nowrap'}}>{st.label}</span>
                       <div style={{display:'flex',gap:4}}>
                         <button onClick={()=>{setEditDoc(doc);setEditDocForm({name:doc.name,category:doc.category||'',expiresAt:doc.expiresAt||'',provider:doc.provider||'',amount:doc.amount||'',notes:doc.notes||'',photoUrl:doc.photoUrl||''});}} style={{background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:7,color:T.blue,cursor:'pointer',padding:'4px 7px',display:'flex',alignItems:'center',fontSize:11}}>✏️</button>
                         <button onClick={()=>delDoc(doc.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })
          }
        </div>
      )}

      {/* ══════════ CONTACTOS ══════════ */}
      {tab==='contactos'&&(
        <div>
          <Input value={contactSearch} onChange={setContactSearch} placeholder="Buscar contacto por nombre, rol, teléfono…" style={{marginBottom:12,fontSize:13}}/>
          {(()=>{
            const fc=contactSearch?contacts.filter(c=>
              [c.name,c.role,c.specialty,c.notes].join(' ').toLowerCase().includes(contactSearch.toLowerCase())
            ):contacts;
            if(contacts.length===0) return (
              <div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>📞</div>
               <div style={{fontSize:14,marginBottom:12}}>Sin contactos de servicio</div>
               <Btn size="sm" onClick={()=>setModalContact(true)}><Icon name="plus" size={13}/>Agregar</Btn>
              </div>
            );
            if(fc.length===0) return <div style={{textAlign:'center',padding:'20px',color:T.dim,fontSize:12}}>Sin resultados para "{contactSearch}"</div>;
            return <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
               {fc.map(c=>(
                 <div key={c.id} style={{padding:'14px 16px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,borderLeft:`3px solid ${T.purple}`}}>
                   <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                     <div style={{flex:1,minWidth:0}}>
                       <div style={{color:T.text,fontSize:14,fontWeight:600}}>{c.name}</div>
                       {c.role&&<span style={{fontSize:11,background:`${T.purple}15`,color:T.purple,padding:'2px 8px',borderRadius:8,display:'inline-block',marginTop:4}}>{c.role}</span>}
                       {c.notes&&<div style={{color:T.dim,fontSize:11,marginTop:6}}>{c.notes}</div>}
                     </div>
                     <div style={{display:'flex',gap:4,flexShrink:0}}>
                       <button onClick={()=>{setEditContact(c);setEditContactForm({name:c.name,role:c.role||'',phone:c.phone||'',email:c.email||'',notes:c.notes||''});}} style={{background:`${T.purple}15`,border:`1px solid ${T.purple}30`,borderRadius:7,color:T.purple,cursor:'pointer',padding:'4px 7px',display:'flex',alignItems:'center',fontSize:11}}>✏️</button>
                       <button onClick={()=>delContact(c.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                     </div>
                   </div>
                   <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                     {c.phone&&(
                       <button onClick={()=>copyPhone(c.phone)}
                         style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:8,cursor:'pointer',color:T.accent,fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
                         📞 {c.phone}
                       </button>
                     )}
                     {c.email&&(
                       <a href={`mailto:${c.email}`}
                         style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:8,cursor:'pointer',color:T.blue,fontSize:12,fontWeight:600,textDecoration:'none'}}>
                         ✉️ {c.email}
                       </a>
                     )}
                   </div>
                 </div>
               ))}
             </div>;
          })()}
        </div>
      )}

      {/* ══════════ MODALES ══════════ */}
      {modalMaint&&(
        <Modal title="Nueva tarea de mantenimiento" onClose={()=>setModalMaint(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={maintForm.name} onChange={v=>setMaintForm(f=>({...f,name:v}))} placeholder="Nombre (ej: Cambio de filtro de aire, Revisión coche...)"/>
            <Select value={maintForm.category} onChange={v=>setMaintForm(f=>({...f,category:v}))}>
              <option value="">— Categoría —</option>
              {MAINT_CATS.map(c=><option key={c}>{c}</option>)}
            </Select>
            <div>
              <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Frecuencia</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {FREQ_OPTS.map(f=>(
                  <button key={f.label} onClick={()=>setMaintForm(m=>({...m,frequencyDays:f.days||m.frequencyDays}))}
                    style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${maintForm.frequencyDays===f.days&&f.days!==0?T.accent:T.border}`,background:maintForm.frequencyDays===f.days&&f.days!==0?`${T.accent}18`:'transparent',color:maintForm.frequencyDays===f.days&&f.days!==0?T.accent:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
                    {f.label}
                  </button>
                ))}
              </div>
              <Input value={maintForm.frequencyDays} onChange={v=>setMaintForm(f=>({...f,frequencyDays:Number(v)}))} placeholder="Días entre cada mantenimiento" type="number" style={{marginTop:8}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Último realizado</div>
                <Input value={maintForm.lastDone} onChange={v=>setMaintForm(f=>({...f,lastDone:v}))} type="date"/>
              </div>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Costo aprox.</div>
                <Input value={maintForm.cost} onChange={v=>setMaintForm(f=>({...f,cost:v}))} placeholder="$" type="number"/>
              </div>
            </div>
            <Input value={maintForm.notes} onChange={v=>setMaintForm(f=>({...f,notes:v}))} placeholder="Notas (proveedor, observaciones...)"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveMaint} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalMaint(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalDoc&&(
        <Modal title="Nuevo documento / garantía" onClose={()=>setModalDoc(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={docForm.name} onChange={v=>setDocForm(f=>({...f,name:v}))} placeholder="Nombre (ej: Seguro de coche, Garantía lavadora...)"/>
            <Select value={docForm.category} onChange={v=>setDocForm(f=>({...f,category:v}))}>
              <option value="">— Categoría —</option>
              {DOC_CATS.map(c=><option key={c}>{c}</option>)}
            </Select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Fecha de vencimiento</div>
                <Input value={docForm.expiresAt} onChange={v=>setDocForm(f=>({...f,expiresAt:v}))} type="date"/>
              </div>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Costo anual</div>
                <Input value={docForm.amount} onChange={v=>setDocForm(f=>({...f,amount:v}))} placeholder="$" type="number"/>
              </div>
            </div>
            <Input value={docForm.provider} onChange={v=>setDocForm(f=>({...f,provider:v}))} placeholder="Proveedor / Compañía"/>
            <Input value={docForm.photoUrl} onChange={v=>setDocForm(f=>({...f,photoUrl:v}))} placeholder="📷 URL de foto o QR del documento (opcional)"/>
            <Input value={docForm.notes} onChange={v=>setDocForm(f=>({...f,notes:v}))} placeholder="Notas (número de póliza, ubicación del documento...)"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveDoc} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalDoc(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modalContact&&(
        <Modal title="Nuevo contacto de servicio" onClose={()=>setModalContact(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={contactForm.name} onChange={v=>setContactForm(f=>({...f,name:v}))} placeholder="Nombre completo"/>
            <Select value={contactForm.role} onChange={v=>setContactForm(f=>({...f,role:v}))}>
              <option value="">— Especialidad —</option>
              {CONTACT_ROLES.map(r=><option key={r}>{r}</option>)}
            </Select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input value={contactForm.phone} onChange={v=>setContactForm(f=>({...f,phone:v}))} placeholder="Teléfono" type="tel"/>
              <Input value={contactForm.email} onChange={v=>setContactForm(f=>({...f,email:v}))} placeholder="Email" type="email"/>
            </div>
            <Input value={contactForm.notes} onChange={v=>setContactForm(f=>({...f,notes:v}))} placeholder="Notas (zona que cubre, horario, precio aprox...)"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveContact} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalContact(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Edit: mantenimiento ── */}
      {editMaint&&(
        <Modal title="Editar mantenimiento" onClose={()=>setEditMaint(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={editMaintForm.name||''} onChange={v=>setEditMaintForm(f=>({...f,name:v}))} placeholder="Nombre"/>
            <Select value={editMaintForm.category||''} onChange={v=>setEditMaintForm(f=>({...f,category:v}))}>
              <option value="">— Categoría —</option>
              {MAINT_CATS.map(c=><option key={c}>{c}</option>)}
            </Select>
            <Input value={editMaintForm.frequencyDays||''} onChange={v=>setEditMaintForm(f=>({...f,frequencyDays:v}))} placeholder="Días entre mantenimientos" type="number"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Último realizado</div>
                <Input value={editMaintForm.lastDone||''} onChange={v=>setEditMaintForm(f=>({...f,lastDone:v}))} type="date"/>
              </div>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Costo aprox.</div>
                <Input value={editMaintForm.cost||''} onChange={v=>setEditMaintForm(f=>({...f,cost:v}))} placeholder="$" type="number"/>
              </div>
            </div>
            <Input value={editMaintForm.notes||''} onChange={v=>setEditMaintForm(f=>({...f,notes:v}))} placeholder="Notas"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={updateMaint} style={{flex:1,justifyContent:'center'}}>Guardar cambios</Btn>
            <Btn variant="ghost" onClick={()=>setEditMaint(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Edit: documento ── */}
      {editDoc&&(
        <Modal title="Editar documento" onClose={()=>setEditDoc(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={editDocForm.name||''} onChange={v=>setEditDocForm(f=>({...f,name:v}))} placeholder="Nombre"/>
            <Select value={editDocForm.category||''} onChange={v=>setEditDocForm(f=>({...f,category:v}))}>
              <option value="">— Categoría —</option>
              {DOC_CATS.map(c=><option key={c}>{c}</option>)}
            </Select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Vencimiento</div>
                <Input value={editDocForm.expiresAt||''} onChange={v=>setEditDocForm(f=>({...f,expiresAt:v}))} type="date"/>
              </div>
              <div>
                <div style={{fontSize:12,color:T.muted,marginBottom:6}}>Costo anual</div>
                <Input value={editDocForm.amount||''} onChange={v=>setEditDocForm(f=>({...f,amount:v}))} placeholder="$" type="number"/>
              </div>
            </div>
            <Input value={editDocForm.provider||''} onChange={v=>setEditDocForm(f=>({...f,provider:v}))} placeholder="Proveedor"/>
            <Input value={editDocForm.photoUrl||''} onChange={v=>setEditDocForm(f=>({...f,photoUrl:v}))} placeholder="📷 URL de foto o QR del documento"/>
            <Input value={editDocForm.notes||''} onChange={v=>setEditDocForm(f=>({...f,notes:v}))} placeholder="Notas"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={updateDoc} style={{flex:1,justifyContent:'center'}}>Guardar cambios</Btn>
            <Btn variant="ghost" onClick={()=>setEditDoc(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Edit: contacto ── */}
      {editContact&&(
        <Modal title="Editar contacto" onClose={()=>setEditContact(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={editContactForm.name||''} onChange={v=>setEditContactForm(f=>({...f,name:v}))} placeholder="Nombre"/>
            <Select value={editContactForm.role||''} onChange={v=>setEditContactForm(f=>({...f,role:v}))}>
              <option value="">— Rol —</option>
              {CONTACT_ROLES.map(r=><option key={r}>{r}</option>)}
            </Select>
            <Input value={editContactForm.phone||''} onChange={v=>setEditContactForm(f=>({...f,phone:v}))} placeholder="Teléfono"/>
            <Input value={editContactForm.email||''} onChange={v=>setEditContactForm(f=>({...f,email:v}))} placeholder="Email"/>
            <Input value={editContactForm.notes||''} onChange={v=>setEditContactForm(f=>({...f,notes:v}))} placeholder="Notas"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={updateContact} style={{flex:1,justifyContent:'center'}}>Guardar cambios</Btn>
            <Btn variant="ghost" onClick={()=>setEditContact(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}
      {/* ══════════ FARMACIA ══════════ */}
      {tab==='farmacia'&&(
        <div>
          {/* Conexión con Salud */}
          {activeMedNames.length>0&&(
            <div style={{background:`${T.green}12`,border:`1px solid ${T.green}30`,borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18}}>💊</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:T.green}}>Medicamentos activos en Salud</div>
                <div style={{fontSize:11,color:T.muted}}>{(data.medications||[]).map(m=>m.name).join(' · ')||'—'}</div>
              </div>
            </div>
          )}
          <input value={farmaciaSearch} onChange={e=>setFarmaciaSearch(e.target.value)}
            placeholder="Buscar en botiquín…"
            style={{width:'100%',padding:'9px 14px',borderRadius:10,border:`1px solid ${T.border}`,background:T.surface2,color:T.text,fontSize:13,marginBottom:14,boxSizing:'border-box',fontFamily:'inherit'}}/>
          {farmaciaItems.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:36,marginBottom:8}}>💊</div>
               <div style={{fontSize:14,marginBottom:4}}>Botiquín vacío</div>
               <Btn size="sm" onClick={()=>setModalFarmacia(true)}>+ Agregar medicamento</Btn>
             </div>
            :<div style={{display:'flex',flexDirection:'column',gap:8}}>
              {farmaciaItems
                .filter(i=>!farmaciaSearch||i.name.toLowerCase().includes(farmaciaSearch.toLowerCase()))
                .map(item=>{
                  const active=isActiveMed(item.name);
                  const expDiff=item.expiresAt?Math.ceil((new Date(item.expiresAt)-new Date())/(1000*60*60*24)):null;
                  const expColor=expDiff===null?T.muted:expDiff<0?T.red:expDiff<=30?T.orange:T.green;
                  return (
                    <div key={item.id} style={{background:T.surface,border:`1px solid ${active?T.green:T.border}`,borderRadius:12,padding:'12px 14px',display:'flex',gap:12,alignItems:'flex-start',borderLeft:`4px solid ${active?T.green:T.border}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{fontWeight:600,fontSize:14,color:T.text}}>{item.name}</span>
                          {active&&<span style={{fontSize:10,background:`${T.green}20`,color:T.green,padding:'2px 7px',borderRadius:6,fontWeight:600}}>● EN USO</span>}
                        </div>
                        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,color:T.muted}}>📦 {item.quantity} {item.unit}</span>
                          {item.location&&<span style={{fontSize:11,color:T.muted}}>📍 {item.location}</span>}
                          {expDiff!==null&&<span style={{fontSize:11,color:expColor,fontWeight:600}}>{expDiff<0?`Vencido hace ${Math.abs(expDiff)}d`:expDiff===0?'Vence hoy':`Vence en ${expDiff}d`}</span>}
                        </div>
                        {item.notes&&<div style={{fontSize:11,color:T.dim,marginTop:4}}>{item.notes}</div>}
                      </div>
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        <button onClick={()=>{setEditFarmacia(item);setEditFarmaciaForm({...item});}} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.muted,fontSize:11,fontFamily:'inherit'}}>Editar</button>
                        <button onClick={()=>delFarmacia(item.id)} style={{background:'none',border:`1px solid ${T.red}40`,borderRadius:8,padding:'4px 10px',cursor:'pointer',color:T.red,fontSize:11,fontFamily:'inherit'}}>✕</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          }
        </div>
      )}

      {/* ══════════ COCHE ══════════ */}
      {tab==='coche'&&(
        <Coche data={data} setData={setData} isMobile={isMobile} onBack={()=>setTab('mantenimientos')} embedded={true}/>
      )}

      {/* ── Modal: nueva farmacia ── */}
      {modalFarmacia&&(
        <Modal title="Agregar al botiquín" onClose={()=>setModalFarmacia(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={farmaciaForm.name} onChange={v=>setFarmaciaForm(f=>({...f,name:v}))} placeholder="Nombre del medicamento *"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input value={farmaciaForm.quantity} onChange={v=>setFarmaciaForm(f=>({...f,quantity:v}))} placeholder="Cantidad" type="number"/>
              <Select value={farmaciaForm.unit} onChange={v=>setFarmaciaForm(f=>({...f,unit:v}))}>
                {FARMACIA_UNITS.map(u=><option key={u}>{u}</option>)}
              </Select>
            </div>
            <Input value={farmaciaForm.expiresAt} onChange={v=>setFarmaciaForm(f=>({...f,expiresAt:v}))} placeholder="Fecha vencimiento" type="date"/>
            <Input value={farmaciaForm.location} onChange={v=>setFarmaciaForm(f=>({...f,location:v}))} placeholder="Ubicación (cajón, mueble…)"/>
            <Input value={farmaciaForm.notes} onChange={v=>setFarmaciaForm(f=>({...f,notes:v}))} placeholder="Notas opcionales"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={saveFarmacia} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
            <Btn variant="ghost" onClick={()=>setModalFarmacia(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* ── Modal: editar farmacia ── */}
      {editFarmacia&&(
        <Modal title="Editar medicamento" onClose={()=>setEditFarmacia(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Input value={editFarmaciaForm.name||''} onChange={v=>setEditFarmaciaForm(f=>({...f,name:v}))} placeholder="Nombre *"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Input value={editFarmaciaForm.quantity||''} onChange={v=>setEditFarmaciaForm(f=>({...f,quantity:v}))} placeholder="Cantidad" type="number"/>
              <Select value={editFarmaciaForm.unit||'unidades'} onChange={v=>setEditFarmaciaForm(f=>({...f,unit:v}))}>
                {FARMACIA_UNITS.map(u=><option key={u}>{u}</option>)}
              </Select>
            </div>
            <Input value={editFarmaciaForm.expiresAt||''} onChange={v=>setEditFarmaciaForm(f=>({...f,expiresAt:v}))} type="date"/>
            <Input value={editFarmaciaForm.location||''} onChange={v=>setEditFarmaciaForm(f=>({...f,location:v}))} placeholder="Ubicación"/>
            <Input value={editFarmaciaForm.notes||''} onChange={v=>setEditFarmaciaForm(f=>({...f,notes:v}))} placeholder="Notas"/>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <Btn onClick={updateFarmacia} style={{flex:1,justifyContent:'center'}}>Guardar cambios</Btn>
            <Btn variant="ghost" onClick={()=>setEditFarmacia(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default Hogar;
