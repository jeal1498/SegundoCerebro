import React, { useState, useEffect } from 'react';
import { T } from '../theme/tokens.js';

const ToastCtx = { listeners: [] };
const toast = {
  show:(msg,type='success',sub='')=>ToastCtx.listeners.forEach(fn=>fn({id:Date.now()+Math.random(),msg,type,sub})),
  success:(msg,sub='')=>toast.show(msg,'success',sub),
  info:(msg,sub='')=>toast.show(msg,'info',sub),
  warn:(msg,sub='')=>toast.show(msg,'warn',sub),
  error:(msg,sub='')=>toast.show(msg,'error',sub),
};
const ToastContainer=()=>{
  const [toasts,setToasts]=useState([]);
  useEffect(()=>{
    const fn=(t)=>{
      setToasts(prev=>[...prev.slice(-4),t]);
      setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==t.id)),4000);
    };
    ToastCtx.listeners.push(fn);
    return()=>{ToastCtx.listeners=ToastCtx.listeners.filter(f=>f!==fn);};
  },[]);
  const tColor=(type)=>({success:T.accent,info:T.blue,warn:T.orange,error:T.red}[type]||T.accent);
  if(!toasts.length) return null;
  return (
    <div style={{position:'fixed',bottom:isMobileGlobal?72:24,right:16,zIndex:9999,display:'flex',flexDirection:'column',gap:8,maxWidth:320,minWidth:240}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:T.surface2,border:`1px solid ${tColor(t.type)}40`,borderLeft:`3px solid ${tColor(t.type)}`,borderRadius:10,padding:'10px 14px',display:'flex',gap:10,alignItems:'flex-start',boxShadow:'0 4px 24px rgba(0,0,0,0.4)',animation:'slideIn 0.2s ease'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>{t.msg}</div>
            {t.sub&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>{t.sub}</div>}
          </div>
          <button onClick={()=>setToasts(p=>p.filter(x=>x.id!==t.id))} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',fontSize:18,padding:0,lineHeight:1,flexShrink:0}}>×</button>
        </div>
      ))}
    </div>
  );
};
// ===================== ERROR BOUNDARY =====================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{background:'#0d1117',color:'#f85149',padding:24,fontFamily:'monospace',fontSize:13,minHeight:'100vh',overflowY:'auto'}}>
          <div style={{color:'#3fb950',fontSize:18,marginBottom:16}}>🧠 Error detectado</div>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#f85149'}}>{String(this.state.error)}</pre>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#7d8590',fontSize:11,marginTop:12}}>{this.state.error?.stack}</pre>
          <button onClick={()=>this.setState({error:null})} style={{marginTop:16,background:'#3fb950',color:'#000',border:'none',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontWeight:600}}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}


export { toast, ToastContainer };
