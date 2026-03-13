import React from 'react';
import { T } from '../../theme/tokens.js';
import Icon from '../icons/Icon.jsx';

// ===================== BASE COMPONENTS =====================
const Modal = ({title,onClose,children}) => (
  <div role="dialog" aria-modal="true" aria-label={title}
    style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,
      display:'flex',alignItems:'center',justifyContent:'center',
      backdropFilter:'blur(4px)',padding:'16px'}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,
      padding:24,width:'100%',maxWidth:520,
      boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
      maxHeight:'88vh',overflowY:'auto',
      position:'relative'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h3 style={{margin:0,color:T.text,fontSize:16,fontWeight:600}}>{title}</h3>
        <button onClick={onClose} aria-label="Cerrar" style={{background:'none',border:'none',color:T.muted,cursor:'pointer',padding:4,display:'flex'}}><Icon name="x" size={18}/></button>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({value,onChange,placeholder,style={},type='text',...p}) => (
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:'100%',background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 14px',borderRadius:10,fontSize:15,outline:'none',boxSizing:'border-box',...style}} {...p}/>
);

const Textarea = ({value,onChange,placeholder,rows=4}) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{width:'100%',background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 14px',borderRadius:10,fontSize:15,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
);

const Select = ({value,onChange,children,style={}}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'10px 14px',borderRadius:10,fontSize:15,outline:'none',width:'100%',...style}}>
    {children}
  </select>
);

const Btn = ({onClick,children,variant='primary',size='md',style={},type='button'}) => {
  const base={border:'none',cursor:'pointer',borderRadius:10,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,fontFamily:'inherit',...style};
  const v={
    primary:{background:T.accent,color:'#000',padding:size==='sm'?'6px 12px':'10px 18px',fontSize:size==='sm'?12:14},
    ghost:{background:'transparent',color:T.muted,padding:size==='sm'?'6px 12px':'10px 18px',fontSize:size==='sm'?12:14,border:`1px solid ${T.border}`},
    danger:{background:'rgba(248,81,73,0.15)',color:T.red,padding:size==='sm'?'6px 12px':'10px 18px',fontSize:size==='sm'?12:14,border:`1px solid rgba(248,81,73,0.3)`},
  };
  return <button type={type} onClick={onClick} style={{...base,...v[variant]}}>{children}</button>;
};

const Tag = ({text,color}) => (
  <span style={{background:`${color||T.accent}22`,color:color||T.accent,padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:500}}>{text}</span>
);

const Card = ({children,style={},onClick}) => (
  <div onClick={onClick} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:16,cursor:onClick?'pointer':'default',transition:'border-color 0.2s',...style}}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.borderColor=T.accent)}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.borderColor=T.border)}>
    {children}
  </div>
);

const PageHeader = ({title,subtitle,action,isMobile,onBack}) => (
  <div style={{marginBottom:20}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
      {/* Title */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:action?'flex-start':'flex-start',minWidth:0}}>
        <h2 style={{margin:0,color:T.text,fontSize:isMobile?18:20,fontWeight:700,display:'flex',alignItems:'center',gap:6}}>{title}</h2>
      </div>
      {/* Action */}
      {action&&<div style={{flexShrink:0}}>{action}</div>}
    </div>
    {subtitle&&<p style={{color:T.muted,fontSize:13,marginTop:4,marginBottom:0}}>{subtitle}</p>}
  </div>
);

export { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader };
