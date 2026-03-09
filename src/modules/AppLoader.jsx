import React from 'react';
import { T } from '../theme/tokens.js';

// ===================== LOADING SKELETON =====================
const AppLoader = () => (
  <div style={{
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    height:'100dvh', width:'100%', background:T.bg, gap:20,
    fontFamily:"'DM Sans',system-ui,sans-serif"
  }}>
    <div style={{
      width:52, height:52, borderRadius:14,
      background:`linear-gradient(135deg,${T.accent},${T.orange})`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:30, animation:'sbPulse 1.4s ease-in-out infinite'
    }}>🧠</div>
    <div style={{display:'flex', flexDirection:'column', gap:10, alignItems:'center'}}>
      {[160,120,140].map((w,i)=>(
        <div key={i} style={{
          width:w, height:10, borderRadius:6,
          background:`linear-gradient(90deg,${T.surface} 25%,${T.surface2} 50%,${T.surface} 75%)`,
          backgroundSize:'200% 100%',
          animation:`sbShimmer 1.4s ease-in-out ${i*0.15}s infinite`
        }}/>
      ))}
    </div>
    <style>{`
      @keyframes sbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}
      @keyframes sbShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    `}</style>
  </div>
);


export { AppLoader };
export let isMobileGlobal = false;
export const setIsMobileGlobal = (v) => { isMobileGlobal = v; };
