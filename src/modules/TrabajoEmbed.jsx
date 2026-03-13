import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

// ===================== TRABAJO EMBED =====================
const TrabajoEmbed = ({isMobile,onBack}) => {
  const [loaded,setLoaded]     = useState(false);
  const [error,setError]       = useState(false);
  const [fullscreen,setFullscreen] = useState(false);
  const URL = 'https://jeal1498.github.io/AppWeb-ControlCheck/index.html';

  // close fullscreen on Escape
  useEffect(()=>{
    const handler=(e)=>{ if(e.key==='Escape') setFullscreen(false); };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[]);

  const header = (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:fullscreen?0:14,
      ...(fullscreen?{padding:'10px 16px',background:T.surface,borderBottom:`1px solid ${T.border}`,flexShrink:0}:{})}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>

        <div>
          <h2 style={{margin:0,color:T.text,fontSize:isMobile?18:20,fontWeight:700}}>💼 Trabajo</h2>
          {!fullscreen&&<p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>ControlCheck — tu app de trabajo</p>}
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setFullscreen(f=>!f)}
          style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:10,color:T.accent,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          {fullscreen?'⊙ Salir':'⛶ Pantalla completa'}
        </button>
        <a href={URL} target="_blank" rel="noreferrer"
          style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:10,color:T.blue,fontSize:12,fontWeight:600,textDecoration:'none'}}>
          🔗 Nueva pestaña
        </a>
      </div>
    </div>
  );

  const iframeEl = (
    <div style={{flex:1,borderRadius:fullscreen?0:14,overflow:'hidden',border:fullscreen?'none':`1px solid ${T.border}`,background:T.surface,position:'relative',minHeight:fullscreen?0:isMobile?'65vh':'70vh'}}>
      {!loaded&&!error&&(
        <div style={{position:'absolute',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,color:T.muted,fontSize:13,pointerEvents:'none',zIndex:1,left:'50%',top:'50%',transform:'translate(-50%,-50%)'}}>
          <div style={{fontSize:32}}>💼</div>
          <div>Cargando tu app...</div>
        </div>
      )}
      {error
        ?<div style={{textAlign:'center',padding:'40px 0',color:T.muted}}>
           <div style={{fontSize:36,marginBottom:8}}>⚠️</div>
           <div style={{fontSize:14,marginBottom:6}}>No se pudo cargar la app</div>
           <div style={{fontSize:12,color:T.dim,marginBottom:16}}>Puede que el sitio bloquee iframes</div>
           <a href={URL} target="_blank" rel="noreferrer"
             style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',background:T.accent,borderRadius:10,color:'#000',fontSize:13,fontWeight:700,textDecoration:'none'}}>
             🔗 Abrir en nueva pestaña
           </a>
         </div>
        :<iframe src={URL} title="ControlCheck — Trabajo"
           onLoad={()=>setLoaded(true)} onError={()=>setError(true)}
           style={{width:'100%',height:'100%',border:'none',display:'block',minHeight:fullscreen?'calc(100vh - 57px)':isMobile?'65vh':'70vh'}}
           allow="clipboard-read; clipboard-write"/>
      }
    </div>
  );

  if(fullscreen) return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:T.bg,display:'flex',flexDirection:'column'}}>
      {header}
      {iframeEl}
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {header}
      {iframeEl}
    </div>
  );
};


export default TrabajoEmbed;
