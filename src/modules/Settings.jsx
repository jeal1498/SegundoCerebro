import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T, getIsDark, setIsDark } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== GEMINI CONFIG =====================
const GEMINI_MODEL='gemini-2.0-flash';


// ===================== SETTINGS =====================
const Settings = ({apiKey,setApiKey,isMobile,data,setData,viewHint,onConsumeHint,onOpenPsicke,onInstall,isInstalled}) => {
  const [val,setVal]=useState(apiKey);
  const [show,setShow]=useState(false);
  const [saved,setSaved]=useState(false);
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(null);
  const [testMsg,setTestMsg]=useState('');
  const [sTab,setSTab]=useState('ia');
  const [reviewStep,setReviewStep]=useState(0);
  const [notifEnabled,setNotifEnabled]=useState(()=>{try{return localStorage.getItem('sb_notifs')==='true';}catch{return false;}});
  const [notifSettings,setNotifSettings]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('sb_notif_cfg')||'{}');}catch{return {};}
  });

  // Navigate to revision tab if hinted from dashboard
  useEffect(()=>{
    if(viewHint==='revision'){setSTab('revision');setReviewStep(0);onConsumeHint?.();}
  },[viewHint]);

  const handleSave=()=>{
    const k=val.trim();
    localStorage.setItem('sb_gemini_key',k);
    setApiKey(k);setSaved(true);
    setTimeout(()=>setSaved(false),2500);
    toast.success('API Key guardada');
  };
  const handleClear=()=>{setVal('');setApiKey('');localStorage.removeItem('sb_gemini_key');setTestResult(null);toast.info('API Key eliminada');};

  const testKey=async()=>{
    const k=val.trim();
    if(!k){setTestResult('error');setTestMsg('Ingresa una API Key primero.');return;}
    setTesting(true);setTestResult(null);setTestMsg('');
    try{
      const res=await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${k}`,
        {method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({contents:[{role:'user',parts:[{text:'Di hola.'}]}],generationConfig:{maxOutputTokens:10}})}
      );
      if(res.ok){
        setTestResult('ok');
        setTestMsg('✅ API Key válida y funcionando correctamente.');
        localStorage.setItem('sb_gemini_key',k);
        setApiKey(k);setSaved(true);
        setTimeout(()=>setSaved(false),2500);
      } else {
        const err=await res.json().catch(()=>({}));
        setTestResult('error');
        setTestMsg('❌ '+(err?.error?.message||`Error HTTP ${res.status}`));
      }
    }catch(e){
      setTestResult('error');
      setTestMsg('❌ Error de red: '+e.message);
    }
    setTesting(false);
  };

  // ── BACKUP ──
  const exportData=()=>{
    if(!data) return;
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`segundo-cerebro-${today()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Backup exportado','Guardado en tu carpeta de descargas');
  };

  const importData=(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const imported=JSON.parse(ev.target.result);
        if(!imported||typeof imported!=='object') throw new Error('Formato inválido');
        setData(d=>({...d,...imported}));
        Object.entries(imported).forEach(([k,v])=>save(k,v));
        toast.success('Datos importados correctamente','Todos los módulos actualizados');
      } catch(err){
        toast.error('Error al importar','El archivo no es un backup válido');
      }
    };
    reader.readAsText(file);
    e.target.value='';
  };

  // ── WEEKLY REVIEW ──
  const reviewSteps=[
    {icon:'📥',title:'Inbox',q:'¿Quedó algo sin procesar?',key:'inbox',count:data?data.inbox.filter(i=>!i.processed).length:0},
    {icon:'✅',title:'Tareas',q:'¿Completaste lo que planeabas?',key:'tasks',count:data?data.tasks.filter(t=>t.status!=='done').length:0},
    {icon:'🎯',title:'Objetivos',q:'¿Avanzaste en tus objetivos activos?',key:'objectives',count:data?data.objectives.filter(o=>o.status==='active').length:0},
    {icon:'🔥',title:'Hábitos',q:'¿Cómo fue tu constancia esta semana?',key:'habits',count:data?data.habits.length:0},
    {icon:'🧠',title:'Psicke',q:'Genera un resumen de la semana con IA',key:'psicke',psicke:true},
  ];

  // ── NOTIFICATIONS ──
  const requestNotifs=async()=>{
    if(!('Notification' in window)){toast.error('Notificaciones no soportadas en este navegador');return;}
    const perm=await Notification.requestPermission();
    if(perm==='granted'){
      setNotifEnabled(true);localStorage.setItem('sb_notifs','true');
      toast.success('Notificaciones activadas');
      new Notification('Segundo Cerebro',{body:'Las notificaciones están activas ✓'});
    } else {
      toast.warn('Notificaciones denegadas','Habilítalas en la configuración del navegador');
    }
  };
  const toggleNotif=(key)=>{
    const updated={...notifSettings,[key]:!notifSettings[key]};
    setNotifSettings(updated);
    localStorage.setItem('sb_notif_cfg',JSON.stringify(updated));
  };

  // ── Schedule real browser notifications ──
  const notifTimersRef=useRef({});
  useEffect(()=>{
    if(!notifEnabled||!data||Notification.permission!=='granted') return;
    // Clear previous timers
    Object.values(notifTimersRef.current).forEach(clearTimeout);
    notifTimersRef.current={};

    const msUntil=(hh,mm,extraDays=0)=>{
      const now=new Date();
      const t=new Date(now.getFullYear(),now.getMonth(),now.getDate()+extraDays,hh,mm,0,0);
      if(t<=now) t.setDate(t.getDate()+1);
      return t-now;
    };

    // Hábitos: recordatorio a las 20:00 si hay hábitos sin completar
    if(notifSettings.habits){
      const ms=msUntil(20,0);
      notifTimersRef.current['habits']=setTimeout(()=>{
        const pending=(data.habits||[]).filter(h=>!h.completions.includes(today())).length;
        if(pending>0){
          new Notification('🔥 Hábitos pendientes',{
            body:`Tienes ${pending} hábito${pending>1?'s':''} sin completar hoy.`,
            icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">🔥</text></svg>'
          });
        }
      },ms);
    }

    // Cumpleaños: recordatorio a las 09:00 del día del cumpleaños
    if(notifSettings.bdays && data.people){
      data.people.forEach(p=>{
        if(!p.birthday) return;
        const [,m,d]=p.birthday.split('-');
        const now=new Date();
        const bday=new Date(now.getFullYear(),Number(m)-1,Number(d),9,0,0,0);
        if(bday<now) bday.setFullYear(now.getFullYear()+1);
        const ms=bday-now;
        if(ms<86400000*2){ // sólo programar si es en menos de 2 días
          notifTimersRef.current[`bday_${p.id}`]=setTimeout(()=>{
            new Notification(`🎂 Cumpleaños de ${p.name}`,{
              body:`Hoy es el cumpleaños de ${p.emoji||'👤'} ${p.name}. ¡No olvides felicitarle!`,
              icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">🎂</text></svg>'
            });
          },ms);
        }
      });
    }

    // Documentos por vencer: aviso 30, 7 y 1 día antes a las 09:00
    if(notifSettings.docs && data.homeDocs){
      const todayStr=today();
      data.homeDocs.forEach(doc=>{
        if(!doc.expiresAt) return;
        [30,7,1].forEach(days=>{
          const d=new Date(doc.expiresAt+'T09:00:00');
          d.setDate(d.getDate()-days);
          const ms=d-new Date();
          if(ms>0 && ms<86400000*31){
            notifTimersRef.current[`doc_${doc.id}_${days}`]=setTimeout(()=>{
              new Notification(`📄 Documento por vencer`,{
                body:`"${doc.name}" vence en ${days} día${days>1?'s':''}.`,
                icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">📄</text></svg>'
              });
            },ms);
          }
        });
      });
    }

    // Medicamentos: recordatorio automático según hora configurada
    if(notifSettings.meds && data.medications){
      (data.medications||[]).forEach(med=>{
        if(!med.time) return;
        const [hh,mm]=(med.time).split(':').map(Number);
        const now=new Date();
        const next=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm,0,0);
        if(next<=now) next.setDate(next.getDate()+1);
        const ms=next-now;
        // Only schedule if within 24h
        if(ms>0&&ms<86400000){
          notifTimersRef.current[`med_${med.id}`]=setTimeout(()=>{
            new Notification(`💊 Medicamento: ${med.name}`,{
              body:`${med.dose||''}${med.unit||''} — ${med.frequency||'Diaria'}`,
              icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">💊</text></svg>'
            });
          },ms);
        }
      });
    }

    return ()=>Object.values(notifTimersRef.current).forEach(clearTimeout);
  },[notifEnabled,notifSettings,data]);

  const NOTIF_OPTIONS=[
    {key:'habits',label:'Hábitos pendientes',time:'20:00 cada día'},
    {key:'meds',label:'Medicamentos',time:'Según horario configurado'},
    {key:'weekly',label:'Revisión semanal',time:'Domingos a las 19:00'},
    {key:'docs',label:'Documentos por vencer',time:'30, 7 y 1 día antes'},
    {key:'bdays',label:'Cumpleaños',time:'Día del cumpleaños, 09:00'},
  ];

  const STABS=[{id:'ia',label:'🤖 IA'},{id:'backup',label:'💾 Backup'},{id:'revision',label:'📋 Revisión semanal'},{id:'notifs',label:'🔔 Notificaciones'},{id:'app',label:'📱 App'}];

  return (
    <div style={{maxWidth:560,margin:'0 auto',padding:isMobile?'0 0 80px':'0 0 40px'}}>
      <PageHeader title="Configuración" subtitle="Ajustes y herramientas del sistema" isMobile={isMobile}/>

      {/* Sub-tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {STABS.map(t=>(
          <button key={t.id} onClick={()=>setSTab(t.id)}
            style={{padding:'7px 16px',borderRadius:10,border:`1px solid ${sTab===t.id?T.accent:T.border}`,background:sTab===t.id?`${T.accent}18`:'transparent',color:sTab===t.id?T.accent:T.muted,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── IA ── */}
      {sTab==='ia'&&(
        <>
          <Card style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:40,height:40,background:`${T.accent}22`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon name="key" size={20} color={T.accent}/>
              </div>
              <div>
                <div style={{color:T.text,fontWeight:600,fontSize:15}}>Google Gemini API Key</div>
                <div style={{color:T.muted,fontSize:12,marginTop:2}}>Necesaria para el asistente IA</div>
              </div>
              <div style={{marginLeft:'auto',width:10,height:10,borderRadius:'50%',background:apiKey?T.green:T.dim}}/>
            </div>
            {/* form real → Chrome en Android detecta el campo y ofrece guardar la contraseña */}
            <form
              action="#"
              onSubmit={e=>{e.preventDefault();handleSave();}}
              style={{marginBottom:0}}
            >
              {/* Campo usuario oculto — Chrome lo necesita para asociar a qué cuenta pertenece */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                defaultValue="segundo-cerebro-api"
                style={{position:'absolute',opacity:0,pointerEvents:'none',width:1,height:1,overflow:'hidden'}}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div style={{position:'relative',marginBottom:12}}>
                <input
                  type={show?'text':'password'}
                  name="password"
                  autoComplete={apiKey?'current-password':'new-password'}
                  value={val}
                  onChange={e=>setVal(e.target.value)}
                  placeholder="AIza..."
                  style={{width:'100%',background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 60px 10px 14px',borderRadius:10,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
                />
                <button
                  type="button"
                  onClick={()=>setShow(s=>!s)}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}
                >
                  {show?'Ocultar':'Ver'}
                </button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',gap:8}}>
                  <Btn type="submit" style={{flex:1,justifyContent:'center'}}>
                    {saved?<><Icon name="checkCircle" size={15}/>Guardada</>:<><Icon name="key" size={15}/>Guardar</>}
                  </Btn>
                  <Btn type="button" variant="ghost" onClick={testKey} disabled={testing} style={{flex:1,justifyContent:'center'}}>
                    {testing?'Probando…':'🔍 Probar'}
                  </Btn>
                </div>
                {testResult&&(
                  <div style={{fontSize:12,color:testResult==='ok'?T.green:T.red,background:testResult==='ok'?`${T.green}11`:`${T.red}11`,border:`1px solid ${testResult==='ok'?T.green:T.red}33`,borderRadius:8,padding:'8px 12px',lineHeight:1.5}}>
                    {testMsg}
                  </div>
                )}
                {apiKey&&<Btn variant="danger" type="button" onClick={handleClear} size="md" style={{alignSelf:'flex-start'}}>Limpiar key</Btn>}
              </div>
            </form>
          </Card>
          <Card>
            <div style={{color:T.muted,fontSize:13,lineHeight:1.7}}>
              <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:10}}>¿Cómo obtener la API Key?</div>
              <ol style={{margin:0,paddingLeft:18,display:'flex',flexDirection:'column',gap:6}}>
                <li>Ve a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color:T.accent}}>aistudio.google.com</a></li>
                <li>Inicia sesión con tu cuenta de Google</li>
                <li>Haz clic en "Create API Key"</li>
                <li>Copia la clave y pégala arriba</li>
              </ol>
              <div style={{marginTop:12,padding:'10px 14px',background:`${T.green}12`,borderRadius:8,borderLeft:`3px solid ${T.green}`,fontSize:12}}>
                ✓ El plan gratuito de Gemini es suficiente para uso personal intensivo.
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── BACKUP ── */}
      {sTab==='backup'&&(
        <>
          <Card style={{marginBottom:14}}>
            <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:6}}>Exportar datos</div>
            <div style={{color:T.muted,fontSize:12,marginBottom:14,lineHeight:1.6}}>Descarga todos tus datos como archivo JSON. Puedes restaurarlos en cualquier momento.</div>
            {data&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
                {[
                  {label:'Notas',val:data.notes?.length||0,color:T.blue},
                  {label:'Tareas',val:data.tasks?.length||0,color:T.accent},
                  {label:'Hábitos',val:data.habits?.length||0,color:T.orange},
                  {label:'Personas',val:data.people?.length||0,color:T.purple},
                  {label:'Finanzas',val:data.transactions?.length||0,color:T.green},
                  {label:'Objetivos',val:data.objectives?.length||0,color:T.red},
                ].map(s=>(
                  <div key={s.label} style={{background:T.surface2,borderRadius:8,padding:'8px 10px'}}>
                    <div style={{fontSize:10,color:T.muted}}>{s.label}</div>
                    <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={exportData} style={{width:'100%',padding:'12px',borderRadius:10,border:'none',background:T.accent,color:'#000',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
              ⬇️ Exportar todo como JSON
            </button>
          </Card>
          <Card>
            <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:6}}>Importar datos</div>
            <div style={{color:T.muted,fontSize:12,marginBottom:14,lineHeight:1.6}}>Restaura desde un archivo JSON exportado anteriormente. Los datos actuales serán reemplazados.</div>
            <label style={{display:'block',border:`2px dashed ${T.border}`,borderRadius:10,padding:'24px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{fontSize:30,marginBottom:8}}>📂</div>
              <div style={{fontSize:13,color:T.muted}}>Arrastra tu archivo backup.json aquí</div>
              <div style={{fontSize:11,color:T.dim,marginTop:4}}>o haz clic para seleccionar</div>
              <input type="file" accept=".json" onChange={importData} style={{display:'none'}}/>
            </label>
          </Card>
        </>
      )}

      {/* ── REVISIÓN SEMANAL ── */}
      {sTab==='revision'&&(
        <>
          <div style={{background:`${T.accent}08`,border:`1px solid ${T.accent}30`,borderRadius:12,padding:'14px 16px',marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <div style={{fontSize:14,fontWeight:700,color:T.accent}}>📋 Revisión semanal</div>
            </div>
            <div style={{fontSize:12,color:T.muted}}>Revisa tu semana guiado paso a paso en 5 minutos.</div>
          </div>

          {/* Step progress */}
          <div style={{display:'flex',gap:6,marginBottom:16,overflowX:'auto',paddingBottom:4}}>
            {reviewSteps.map((s,i)=>(
              <button key={i} onClick={()=>setReviewStep(i)} style={{
                flexShrink:0,padding:'8px 14px',borderRadius:10,
                border:`2px solid ${reviewStep===i?T.accent:reviewStep>i?T.green:T.border}`,
                background:reviewStep===i?`${T.accent}15`:reviewStep>i?`${T.green}10`:'transparent',
                color:reviewStep===i?T.accent:reviewStep>i?T.green:T.muted,
                cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',
                display:'flex',flexDirection:'column',alignItems:'center',gap:3,
              }}>
                <span style={{fontSize:18}}>{s.icon}</span>
                <span>{s.title}</span>
                {reviewStep>i&&<span style={{fontSize:9,color:T.green}}>✓</span>}
              </button>
            ))}
          </div>

          <Card>
            {!reviewSteps[reviewStep].psicke?(
              <div>
                <div style={{fontSize:24,marginBottom:10}}>{reviewSteps[reviewStep].icon}</div>
                <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>{reviewSteps[reviewStep].title}</div>
                <div style={{fontSize:13,color:T.muted,marginBottom:14}}>{reviewSteps[reviewStep].q}</div>
                <div style={{display:'inline-block',background:`${T.accent}12`,border:`1px solid ${T.accent}30`,borderRadius:8,padding:'6px 14px',fontSize:12,color:T.accent,fontWeight:700,marginBottom:14}}>
                  {reviewSteps[reviewStep].count} ítems
                </div>
                <textarea placeholder="Notas de esta sección..." rows={3} style={{
                  width:'100%',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,
                  color:T.text,padding:'10px 12px',fontSize:12,outline:'none',resize:'none',
                  fontFamily:'inherit',boxSizing:'border-box',display:'block',
                }}/>
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button onClick={()=>setReviewStep(Math.max(0,reviewStep-1))} style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>← Atrás</button>
                  <button onClick={()=>setReviewStep(Math.min(reviewSteps.length-1,reviewStep+1))} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:T.accent,color:'#000',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>Siguiente →</button>
                </div>
              </div>
            ):(
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:36,marginBottom:10}}>🧠</div>
                <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:8}}>Resumen con Psicke</div>
                <div style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:16,textAlign:'left',background:T.surface2,borderRadius:10,padding:'12px 14px'}}>
                  {data&&`Tienes ${data.inbox.filter(i=>!i.processed).length} ítems en inbox, ${data.tasks.filter(t=>t.status!=='done').length} tareas pendientes, ${data.objectives.filter(o=>o.status==='active').length} objetivos activos y ${data.habits.length} hábitos configurados.`}
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                  <button onClick={()=>setReviewStep(0)} style={{padding:'10px 20px',borderRadius:10,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>Reiniciar</button>
                  {onOpenPsicke&&<button onClick={()=>{onOpenPsicke();toast.info('Pídele a Psicke un resumen de tu semana');}} style={{padding:'10px 24px',borderRadius:10,border:`1px solid ${T.purple}`,background:`${T.purple}18`,color:T.purple,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>🧠 Abrir Psicke</button>}
                  <button onClick={()=>toast.success('Revisión completada','¡Buen trabajo esta semana!')} style={{padding:'10px 24px',borderRadius:10,border:'none',background:T.accent,color:'#000',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>✅ Completar revisión</button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── NOTIFICACIONES ── */}
      {sTab==='notifs'&&(
        <>
          <Card style={{marginBottom:14}}>
            <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:6}}>Notificaciones del navegador</div>
            <div style={{color:T.muted,fontSize:12,marginBottom:14,lineHeight:1.6}}>Recibe recordatorios aunque la app esté cerrada o en segundo plano.</div>
            {!notifEnabled
              ?<button onClick={requestNotifs} style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${T.accent}`,background:`${T.accent}15`,color:T.accent,cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
                 🔔 Activar notificaciones
               </button>
              :<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:`${T.green}12`,border:`1px solid ${T.green}30`,borderRadius:10}}>
                 <span style={{fontSize:18}}>✅</span>
                 <div>
                   <div style={{fontSize:13,fontWeight:600,color:T.green}}>Notificaciones activas</div>
                   <div style={{fontSize:11,color:T.muted}}>Tu navegador enviará recordatorios</div>
                 </div>
               </div>
            }
          </Card>
          {notifEnabled&&(
            <Card>
              {NOTIF_OPTIONS.map((opt,i)=>(
                <div key={opt.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<NOTIF_OPTIONS.length-1?`1px solid ${T.border}`:'none'}}>
                  <div>
                    <div style={{fontSize:13,color:T.text,fontWeight:500}}>{opt.label}</div>
                    <div style={{fontSize:11,color:T.dim,marginTop:2}}>{opt.time}</div>
                  </div>
                  <button onClick={()=>toggleNotif(opt.key)} style={{width:40,height:22,borderRadius:11,background:notifSettings[opt.key]!==false?T.accent:T.border,border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                    <div style={{position:'absolute',top:3,left:notifSettings[opt.key]!==false?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                  </button>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {sTab==='app'&&(
        <>
          {/* Install card */}
          <Card style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <div style={{width:40,height:40,background:`${T.accent}18`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📱</div>
              <div>
                <div style={{color:T.text,fontWeight:600,fontSize:15}}>Instalar en tu dispositivo</div>
                <div style={{color:T.muted,fontSize:12,marginTop:2}}>Acceso directo sin abrir el navegador</div>
              </div>
            </div>
            {isInstalled
              ?<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:`${T.green}12`,border:`1px solid ${T.green}30`,borderRadius:10}}>
                 <span style={{fontSize:18}}>✅</span>
                 <div>
                   <div style={{fontSize:13,fontWeight:600,color:T.green}}>App instalada</div>
                   <div style={{fontSize:11,color:T.muted}}>Ya tienes acceso desde tu pantalla de inicio</div>
                 </div>
               </div>
              :onInstall
                ?<button onClick={onInstall} style={{width:'100%',padding:'12px',borderRadius:10,border:`1px solid ${T.accent}`,background:`${T.accent}15`,color:T.accent,cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                   <span>⬇️</span> Instalar Segundo Cerebro
                 </button>
                :<div style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 14px'}}>
                   <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:8}}>Instalación manual</div>
                   <div style={{fontSize:12,color:T.muted,lineHeight:1.7}}>
                     <div style={{marginBottom:6}}><strong style={{color:T.text}}>iPhone / iPad:</strong> Abre en Safari → Compartir → "Añadir a pantalla de inicio"</div>
                     <div><strong style={{color:T.text}}>Android:</strong> Abre en Chrome → Menú (⋮) → "Añadir a pantalla de inicio"</div>
                   </div>
                 </div>
            }
          </Card>

          {/* Theme card */}
          <Card style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,background:`${T.blue}18`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🎨</div>
                <div>
                  <div style={{color:T.text,fontWeight:600,fontSize:14}}>Tema</div>
                  <div style={{color:T.muted,fontSize:12,marginTop:2}}>Paleta Jade & Slate</div>
                </div>
              </div>
              <button onClick={()=>{
                const next=!getIsDark();setIsDark(next);
                try{
                  const systemDark=window.matchMedia?.('(prefers-color-scheme: dark)').matches??true;
                  if(next===systemDark){ localStorage.removeItem('sb_theme'); }
                  else { localStorage.setItem('sb_theme',next?'dark':'light'); }
                }catch{}
                try{const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content=next?'#0d1117':'#f6f8fa';}catch{}
                window.location.reload();
              }} style={{
                display:'flex',alignItems:'center',gap:6,
                background:T.surface2,border:`1px solid ${T.border}`,
                borderRadius:8,padding:'7px 14px',cursor:'pointer',
                color:T.text,fontSize:13,fontFamily:'inherit',fontWeight:500,
              }}>
                {getIsDark()?'☀️ Claro':'🌙 Oscuro'}
              </button>
            </div>
          </Card>

          {/* Version */}
          <Card>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{color:T.text,fontWeight:600,fontSize:14}}>Segundo Cerebro</div>
                <div style={{color:T.muted,fontSize:12,marginTop:2}}>v2.0 — Jade & Slate</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                <span style={{fontSize:11,color:T.green,fontWeight:600,background:`${T.green}15`,padding:'3px 8px',borderRadius:6}}>✓ PWA Ready</span>
                <span style={{fontSize:10,color:T.dim}}>Service Worker activo</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};



export default Settings;
