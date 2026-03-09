import React, { useState } from 'react';
import { T } from '../../theme/tokens.js';

const renderMd = (text='') => text
  .replace(/\[\[([^\]]+)\]\]/g,`<span class="backlink" data-backlink="$1" style="color:${T.purple};cursor:pointer;text-decoration:underline;font-weight:500;border-radius:3px;padding:0 2px" title="Ir a: $1">$1</span>`)
  .replace(/^### (.+)$/gm,`<h3 style="font-size:14px;font-weight:700;color:${T.text};margin:10px 0 4px">$1</h3>`)
  .replace(/^## (.+)$/gm,`<h2 style="font-size:16px;font-weight:700;color:${T.text};margin:12px 0 6px">$1</h2>`)
  .replace(/^# (.+)$/gm,`<h1 style="font-size:19px;font-weight:800;color:${T.text};margin:0 0 8px">$1</h1>`)
  .replace(/\*\*(.+?)\*\*/g,`<strong style="color:${T.text};font-weight:700">$1</strong>`)
  .replace(/\*(.+?)\*/g,`<em style="color:${T.muted};font-style:italic">$1</em>`)
  .replace(/^- \[ \] (.+)$/gm,`<div style="display:flex;gap:8px;align-items:flex-start;margin:3px 0"><input type="checkbox" style="margin-top:3px;accent-color:${T.accent}"/><span style="color:${T.text};font-size:14px">$1</span></div>`)
  .replace(/^- \[x\] (.+)$/gm,`<div style="display:flex;gap:8px;align-items:flex-start;margin:3px 0"><input type="checkbox" checked style="margin-top:3px;accent-color:${T.accent}"/><span style="color:${T.muted};text-decoration:line-through;font-size:14px">$1</span></div>`)
  .replace(/^- (.+)$/gm,`<div style="display:flex;gap:8px;margin:3px 0"><span style="color:${T.accent};margin-top:2px">•</span><span style="color:${T.text};font-size:14px">$1</span></div>`)
  .replace(/^(\d+)\. (.+)$/gm,`<div style="display:flex;gap:8px;margin:3px 0"><span style="color:${T.muted};font-size:12px;min-width:16px;margin-top:2px">$1.</span><span style="color:${T.text};font-size:14px">$2</span></div>`)
  .replace(/\n/g,'<br/>');


// ===================== RING CHART =====================
const Ring = ({pct:p,color,size=52,stroke=5,label,sublabel}) => {
  const r=(size-stroke*2)/2;
  const circ=2*Math.PI*r;
  const dash=circ*((p||0)/100);
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:'stroke-dasharray 0.6s ease'}}/>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fill={T.text} fontSize={size<50?9:10} fontWeight="700"
          style={{transform:'rotate(90deg)',transformOrigin:'center'}}>
          {p||0}%
        </text>
      </svg>
      {label&&<div style={{fontSize:9,color:T.muted,textAlign:'center',maxWidth:54,lineHeight:1.2}}>{label}</div>}
      {sublabel&&<div style={{fontSize:9,color:color,fontWeight:700}}>{sublabel}</div>}
    </div>
  );
};

// ===================== BALANCE MINI-CHART =====================
const BalanceSparkline = ({transactions}) => {
  const months=[];
  const now=new Date();
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label=d.toLocaleDateString('es-ES',{month:'short'});
    const month=(transactions||[]).filter(t=>t.date?.slice(0,7)===key);
    const income=month.filter(t=>t.type==='ingreso').reduce((s,t)=>s+(t.amount||0),0);
    const expense=month.filter(t=>t.type==='egreso').reduce((s,t)=>s+(t.amount||0),0);
    months.push({label,income,expense,key});
  }
  const max=Math.max(...months.flatMap(m=>[m.income,m.expense]),1);
  return (
    <div style={{display:'flex',gap:5,alignItems:'flex-end',height:52}}>
      {months.map((m,i)=>{
        const iH=Math.max((m.income/max)*44,m.income>0?3:0);
        const eH=Math.max((m.expense/max)*44,m.expense>0?3:0);
        const isCurrent=i===5;
        return (
          <div key={m.key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <div style={{display:'flex',gap:1.5,alignItems:'flex-end',height:44}}>
              <div style={{width:5,height:iH,background:T.accent,borderRadius:'2px 2px 0 0',opacity:isCurrent?1:0.6,transition:'height 0.4s ease'}}/>
              <div style={{width:5,height:eH,background:T.red,borderRadius:'2px 2px 0 0',opacity:isCurrent?1:0.6,transition:'height 0.4s ease'}}/>
            </div>
            <div style={{fontSize:8,color:isCurrent?T.accent:T.dim,fontWeight:isCurrent?700:400}}>{m.label}</div>
          </div>
        );
      })}
    </div>
  );
};

// ===================== HABIT HEATMAP =====================
const HabitHeatmap = ({completions,color}) => {
  const days=Array.from({length:35},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(34-i));
    const str=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {str,done:(completions||[]).includes(str)};
  });
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
      {days.map((d,i)=>(
        <div key={i} title={d.str}
          style={{width:10,height:10,borderRadius:2,
            background:d.done?color:T.border,
            opacity:d.done?0.9:0.35,transition:'background 0.2s'}}/>
      ))}
    </div>
  );
};

// ===================== SPARKLINE =====================
const Sparkline = ({data,color,width=260,height=56,filled=false}) => {
  if(!data||data.length<2) return null;
  const vals=data.map(d=>typeof d==='object'?(d.value??d.v??0):d);
  const min=Math.min(...vals),max=Math.max(...vals);
  const range=max-min||1;
  const pts=vals.map((v,i)=>{
    const x=(i/(vals.length-1))*width;
    const y=height-((v-min)/range)*(height-8)-4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD=`M ${pts.join(' L ')}`;
  const fillD=`M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;
  const lastPt=pts[pts.length-1].split(',');
  return (
    <svg width={width} height={height} style={{overflow:'visible',display:'block'}}>
      {filled&&<path d={fillD} fill={`${color}20`}/>}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color}/>
    </svg>
  );
};

// ===================== BALANCE BAR CHART =====================
const BalanceBarChart = ({months,height=90}) => {
  const max=Math.max(...months.flatMap(m=>[m.income||0,m.expense||0]),1);
  return (
    <div style={{display:'flex',gap:5,alignItems:'flex-end',height}}>
      {months.map((m,i)=>{
        const iH=Math.max(((m.income||0)/max)*(height-18),m.income>0?3:0);
        const eH=Math.max(((m.expense||0)/max)*(height-18),m.expense>0?3:0);
        const isCur=i===months.length-1;
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <div style={{display:'flex',gap:2,alignItems:'flex-end',height:height-18}}>
              <div style={{width:8,height:iH,background:T.accent,borderRadius:'3px 3px 0 0',opacity:isCur?1:0.55,transition:'height 0.5s'}} title={`Ingresos: $${(m.income||0).toLocaleString()}`}/>
              <div style={{width:8,height:eH,background:T.red,borderRadius:'3px 3px 0 0',opacity:isCur?1:0.55,transition:'height 0.5s'}} title={`Egresos: $${(m.expense||0).toLocaleString()}`}/>
            </div>
            <div style={{fontSize:9,color:isCur?T.accent:T.dim,fontWeight:isCur?700:400,textAlign:'center'}}>{m.label}</div>
          </div>
        );
      })}
    </div>
  );
};

// ===================== METRIC TREND CHART =====================
const MetricTrendChart = ({data:pts,color,goal,unit,width=340,height=130}) => {
  const [hoverIdx,setHoverIdx]=useState(null);
  if(!pts||pts.length<2) return null;
  const vals=pts.map(p=>p.value);
  const minV=Math.min(...vals);
  const maxV=Math.max(...vals,goal??-Infinity);
  const range=maxV-minV||1;
  const PAD={t:18,r:10,b:26,l:38};
  const W=width-PAD.l-PAD.r;
  const H=height-PAD.t-PAD.b;
  const xS=i=>PAD.l+(i/(pts.length-1))*W;
  const yS=v=>PAD.t+H-((v-minV)/range)*H;
  const pathD=pts.map((p,i)=>`${i===0?'M':'L'} ${xS(i).toFixed(1)} ${yS(p.value).toFixed(1)}`).join(' ');
  const fillD=`M ${xS(0).toFixed(1)} ${(PAD.t+H).toFixed(1)} ${pts.map((p,i)=>`L ${xS(i).toFixed(1)} ${yS(p.value).toFixed(1)}`).join(' ')} L ${xS(pts.length-1).toFixed(1)} ${(PAD.t+H).toFixed(1)} Z`;
  const goalY=goal!=null?yS(Math.min(Math.max(goal,minV),maxV)):null;
  const fmtV=v=>unit==='pasos'?Number(v).toLocaleString():Number(v).toFixed(unit==='h'?1:1);
  const xLabels=[0,Math.floor((pts.length-1)/2),pts.length-1].map(i=>({i,x:xS(i),label:pts[i]?.date?.slice(5)||''}));
  const yTicks=[minV,minV+(maxV-minV)/2,maxV];
  const hover=hoverIdx!=null?pts[hoverIdx]:null;
  return (
    <div style={{position:'relative',width,userSelect:'none'}}>
      <svg width={width} height={height} style={{overflow:'visible',display:'block'}}
        onMouseLeave={()=>setHoverIdx(null)}>
        {/* Area fill */}
        <path d={fillD} fill={`${color}12`}/>
        {/* Subtle grid lines */}
        {yTicks.map((v,i)=>(
          <line key={i} x1={PAD.l} y1={yS(v).toFixed(1)} x2={PAD.l+W} y2={yS(v).toFixed(1)}
            stroke={T.border} strokeWidth="0.8" strokeDasharray="3 4"/>
        ))}
        {/* Goal line */}
        {goalY!=null&&(
          <>
            <line x1={PAD.l} y1={goalY.toFixed(1)} x2={PAD.l+W} y2={goalY.toFixed(1)}
              stroke={color} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.55"/>
            <text x={PAD.l+W} y={goalY-5} fill={color} fontSize="8" textAnchor="end" opacity="0.8" fontWeight="600">meta</text>
          </>
        )}
        {/* Main line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Data points + invisible hover rects */}
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={xS(i).toFixed(1)} cy={yS(p.value).toFixed(1)}
              r={hoverIdx===i?5:i===pts.length-1?3.5:2}
              fill={hoverIdx===i||i===pts.length-1?color:`${color}70`}
              style={{transition:'r 0.1s'}}/>
            <rect x={(xS(i)-10).toFixed(1)} y={PAD.t} width={20} height={H}
              fill="transparent" style={{cursor:'crosshair'}}
              onMouseEnter={()=>setHoverIdx(i)}/>
          </g>
        ))}
        {/* Y-axis labels */}
        {[{v:maxV,y:PAD.t+6},{v:minV,y:PAD.t+H+1}].map(({v,y},i)=>(
          <text key={i} x={PAD.l-5} y={y} fill={T.dim} fontSize="8.5" textAnchor="end">{fmtV(v)}</text>
        ))}
        {/* X-axis labels */}
        {xLabels.map(({x,label,i:idx})=>(
          <text key={idx} x={x.toFixed(1)} y={height-4} fill={T.dim} fontSize="8.5" textAnchor="middle">{label}</text>
        ))}
      </svg>
      {/* Hover tooltip */}
      {hover&&hoverIdx!=null&&(
        <div style={{
          position:'absolute',
          left:Math.min(xS(hoverIdx)+10,width-100),
          top:Math.max(yS(hover.value)-42,0),
          background:T.surface2,border:`1px solid ${color}50`,borderRadius:8,
          padding:'5px 10px',pointerEvents:'none',fontSize:11,
          boxShadow:'0 3px 14px rgba(0,0,0,0.45)',zIndex:10,whiteSpace:'nowrap',
        }}>
          <div style={{fontWeight:800,color,lineHeight:1.2}}>{fmtV(hover.value)} {unit}</div>
          <div style={{color:T.muted,fontSize:9,marginTop:2}}>{hover.date}</div>
        </div>
      )}
    </div>
  );
};

// ===================== HABIT WEEKLY BARS =====================
const HabitWeeklyBars = ({habit,color}) => {
  if((habit.frequency||'daily')!=='daily') return null;
  const weeks=Array.from({length:4},(_,wi)=>{
    const endDate=new Date();
    endDate.setDate(endDate.getDate()-wi*7);
    const days=Array.from({length:7},(_,di)=>{
      const d=new Date(endDate);
      d.setDate(endDate.getDate()-di);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
    const done=days.filter(d=>habit.completions.includes(d)).length;
    const pct=Math.round(done/7*100);
    const endLabel=endDate.toLocaleDateString('es-ES',{month:'short',day:'numeric'});
    return {done,pct,label:`Sem ${4-wi}`,endLabel};
  }).reverse();

  return (
    <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
      <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:10,textTransform:'uppercase',letterSpacing:0.8}}>
        Rendimiento por semana
      </div>
      <div style={{display:'flex',gap:6,alignItems:'flex-end',height:72}}>
        {weeks.map((w,i)=>{
          const barH=Math.max(Math.round(w.pct/100*46),w.pct>0?3:0);
          const barColor=w.pct>=70?T.green:w.pct>=40?T.orange:w.pct>0?T.red:T.border;
          const isCur=i===weeks.length-1;
          return (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{fontSize:11,fontWeight:700,color:w.pct>0?barColor:T.dim,lineHeight:1}}>
                {w.pct>0?`${w.pct}%`:'—'}
              </div>
              <div style={{
                width:'100%',height:barH||3,borderRadius:'4px 4px 0 0',
                background:barColor,opacity:isCur?1:0.7,
                transition:'height 0.45s ease',
              }}/>
              <div style={{height:1,width:'100%',background:T.border}}/>
              <div style={{fontSize:10,color:isCur?color:T.dim,fontWeight:isCur?700:400}}>{w.label}</div>
              <div style={{fontSize:9,color:T.dim}}>{w.done}/7d</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===================== HORIZONTAL BAR =====================
const HBar = ({label,value,total,color,amount,fmtCurrency}) => {
  const pct=total>0?(value/total)*100:0;
  const fmt=fmtCurrency||(n=>`$${Number(n).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}`);
  return (
    <div style={{marginBottom:11}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:12,color:T.muted}}>{label}</span>
        <div style={{display:'flex',gap:10}}>
          <span style={{fontSize:11,color:T.dim}}>{pct.toFixed(0)}%</span>
          <span style={{fontSize:12,color,fontWeight:600}}>{fmt(amount)}</span>
        </div>
      </div>
      <div style={{height:6,background:T.border,borderRadius:3,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:3,transition:'width 0.6s ease'}}/>
      </div>
    </div>
  );
};

export { renderMd, Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar };
