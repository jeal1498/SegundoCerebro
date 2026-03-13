import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Tag, Card, PageHeader } from '../components/ui/index.jsx';
import { Ring, BalanceSparkline, HabitHeatmap, Sparkline, BalanceBarChart, MetricTrendChart, HabitWeeklyBars, HBar, renderMd } from '../components/charts/index.jsx';

const Finance = ({data,setData,isMobile,onBack}) => {
  const [modal,setModal]=useState(false);
  const [editTx,setEditTx]=useState(null);
  const [editBudget,setEditBudget]=useState(null);
  const [tab,setTab]=useState('movimientos');
  const [chartTab,setChartTab]=useState('overview');
  const [filter,setFilter]=useState('all');
  const [monthFilter,setMonthFilter]=useState(today().slice(0,7));
  const [form,setForm]=useState({type:'egreso',amount:'',category:'',description:'',date:today(),currency:'MXN',areaId:''});
  const [editTxForm,setEditTxForm]=useState({});
  const [editBudgetForm,setEditBudgetForm]=useState({});

  const txs=data.transactions||[];
  const budgets=data.budget||[];

  const months=[...new Set(txs.map(t=>t.date.slice(0,7)))].sort((a,b)=>b.localeCompare(a));
  if(months.length>0&&!months.includes(monthFilter)){setMonthFilter(months[0]);}

  const filtered=txs.filter(t=>monthFilter==='all'||t.date.slice(0,7)===monthFilter).filter(t=>filter==='all'||t.type===filter).sort((a,b)=>b.date.localeCompare(a.date));
  const allMonth=txs.filter(t=>t.date.slice(0,7)===monthFilter);
  const totalIngresos=allMonth.filter(t=>t.type==='ingreso').reduce((s,t)=>s+(t.amount||0),0);
  const totalEgresos=allMonth.filter(t=>t.type==='egreso').reduce((s,t)=>s+(t.amount||0),0);
  const balance=totalIngresos-totalEgresos;
  const totalPresupuesto=budgets.reduce((s,b)=>s+(b.amount||0),0);

  const catBreakdown={};
  allMonth.filter(t=>t.type==='egreso').forEach(t=>{const c=t.category||'Sin categoría';catBreakdown[c]=(catBreakdown[c]||0)+t.amount;});
  const catEntries=Object.entries(catBreakdown).sort((a,b)=>b[1]-a[1]);

  const CATS_EGRESO=['Comida','Transporte','Renta','Salud','Entretenimiento','Servicios','Ropa','Educación','Otros'];
  const CATS_INGRESO=['Salario','Freelance','Inversiones','Ventas','Regalo','Otros'];

  const fmtCurrency=(n)=>`$${Number(n).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
  const monthLabel=(m)=>{try{return new Date(m+'-02').toLocaleDateString('es-ES',{month:'long',year:'numeric'});}catch{return m;}};

  // 6-month bar chart data
  const sixMonthsData=Array.from({length:6},(_,i)=>{
    const d=new Date();d.setMonth(d.getMonth()-5+i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label=d.toLocaleDateString('es-ES',{month:'short'});
    const monthTxs=txs.filter(t=>t.date.slice(0,7)===key);
    return {key,label,income:monthTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+(t.amount||0),0),expense:monthTxs.filter(t=>t.type==='egreso').reduce((s,t)=>s+(t.amount||0),0)};
  });
  const balanceTrend=sixMonthsData.map(m=>({value:m.income-m.expense}));

  // Budget alerts
  const budgetAlerts=budgets.map(b=>{
    const spent=allMonth.filter(t=>t.type==='egreso'&&t.category===b.title).reduce((s,t)=>s+(t.amount||0),0);
    const pct=b.amount>0?Math.round(spent/b.amount*100):0;
    return{...b,spent,pct,over:pct>100};
  }).filter(b=>b.pct>80);

  // Savings goal
  const savingGoal=data.savingGoal||0;
  const savedAmount=balance>0?balance:0;
  const savePct=savingGoal>0?Math.min(Math.round((savedAmount/savingGoal)*100),100):0;

  const saveTx=()=>{
    if(!form.amount||!form.description.trim())return;
    const t={id:uid(),...form,amount:Number(form.amount),createdAt:today()};
    const upd=[t,...txs];setData(d=>({...d,transactions:upd}));save('transactions',upd);
    setModal(false);setForm({type:'egreso',amount:'',category:'',description:'',date:today(),currency:'MXN',areaId:''});
  };
  const delTx=(id)=>{const upd=txs.filter(t=>t.id!==id);setData(d=>({...d,transactions:upd}));save('transactions',upd);};
  const updateTx=()=>{
    if(!editTxForm.amount||!editTxForm.description?.trim())return;
    const upd=txs.map(t=>t.id===editTx.id?{...t,...editTxForm,amount:Number(editTxForm.amount)}:t);
    setData(d=>({...d,transactions:upd}));save('transactions',upd);setEditTx(null);
  };
  const delBudget=(id)=>{const upd=budgets.filter(b=>b.id!==id);setData(d=>({...d,budget:upd}));save('budget',upd);};
  const updateBudget=()=>{
    if(!editBudgetForm.title?.trim()||!editBudgetForm.amount)return;
    const upd=budgets.map(b=>b.id===editBudget.id?{...b,...editBudgetForm,amount:Number(editBudgetForm.amount)}:b);
    setData(d=>({...d,budget:upd}));save('budget',upd);setEditBudget(null);
  };

  const exportCSV=()=>{
    const rows=[['Fecha','Tipo','Categoría','Descripción','Monto','Moneda'],...filtered.map(t=>[t.date,t.type,t.category||'',t.description,t.amount,t.currency||'MXN'])];
    const csv=rows.map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`finanzas_${monthFilter}.csv`;a.click();
  };

  return (
    <div>
      <PageHeader isMobile={isMobile} onBack={onBack}
        title="💰 Finanzas"
        subtitle="Control de ingresos, egresos y presupuesto"
        action={<div style={{display:'flex',gap:6}}>
          <button onClick={exportCSV} style={{padding:'6px 10px',borderRadius:9,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>↓ CSV</button>
          <Btn size="sm" onClick={()=>setModal(true)}><Icon name="plus" size={14}/>Nuevo</Btn>
        </div>}/>

      {/* Insights row */}
      {(()=>{
        const prevMonthDate2=new Date();prevMonthDate2.setMonth(prevMonthDate2.getMonth()-1);
        const prevMonthKey=`${prevMonthDate2.getFullYear()}-${String(prevMonthDate2.getMonth()+1).padStart(2,'0')}`;
        const prevTxs=txs.filter(t=>t.date.slice(0,7)===prevMonthKey);
        const prevEgr=prevTxs.filter(t=>t.type==='egreso').reduce((s,t)=>s+(t.amount||0),0);
        const prevIng=prevTxs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+(t.amount||0),0);
        const expDeltaPct=prevEgr>0?Math.round(((totalEgresos-prevEgr)/prevEgr)*100):null;
        const topCat=catEntries[0];
        return (
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            {expDeltaPct!==null&&(
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:9,background:expDeltaPct>10?`${T.red}12`:expDeltaPct<-10?`${T.green}12`:T.surface2,border:`1px solid ${expDeltaPct>10?T.red:expDeltaPct<-10?T.green:T.border}`,fontSize:12}}>
                <span style={{fontWeight:700,color:expDeltaPct>0?T.red:T.green}}>{expDeltaPct>0?'↑':'↓'}{Math.abs(expDeltaPct)}% egresos</span>
                <span style={{color:T.dim}}>vs mes anterior</span>
              </div>
            )}
            {topCat&&<div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:9,background:`${T.orange}12`,border:`1px solid ${T.orange}30`,fontSize:12}}><span style={{color:T.orange,fontWeight:700}}>Top gasto:</span><span style={{color:T.text}}>{topCat[0]}</span><span style={{color:T.muted}}>{fmtCurrency(topCat[1])}</span></div>}
            {savingGoal>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:9,background:`${T.accent}12`,border:`1px solid ${T.accent}30`,fontSize:12,flex:1}}>
              <span style={{color:T.accent,fontWeight:700}}>Meta ahorro:</span>
              <div style={{flex:1,height:6,background:T.border,borderRadius:3,overflow:'hidden',minWidth:60}}>
                <div style={{height:'100%',width:`${savePct}%`,background:T.accent,borderRadius:3}}/>
              </div>
              <span style={{color:T.accent,fontWeight:700,whiteSpace:'nowrap'}}>{savePct}%</span>
            </div>}
          </div>
        );
      })()}

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'Ingresos',val:totalIngresos,color:T.green,sign:'+'},
          {label:'Egresos',val:totalEgresos,color:T.red,sign:'-'},
          {label:'Balance',val:balance,color:balance>=0?T.green:T.red,sign:balance>=0?'+':''},
          {label:'Presupuesto/mes',val:totalPresupuesto,color:T.blue,sign:''},
        ].map(s=>(
          <Card key={s.label} style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:isMobile?15:18,fontWeight:700,color:s.color}}>{s.sign}{fmtCurrency(Math.abs(s.val))}</div>
            <div style={{fontSize:10,color:T.dim}}>{monthLabel(monthFilter)}</div>
          </Card>
        ))}
      </div>

      {/* Budget alerts */}
      {budgetAlerts.length>0&&(
        <div style={{marginBottom:14}}>
          {budgetAlerts.map(b=>(
            <div key={b.id} style={{padding:'9px 14px',borderRadius:10,background:`${b.over?T.red:T.orange}10`,border:`1px solid ${b.over?T.red:T.orange}30`,marginBottom:6,display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:15}}>{b.over?'🚨':'⚠️'}</span>
              <div>
                <span style={{fontSize:12,fontWeight:700,color:b.over?T.red:T.orange}}>{b.title}</span>
                <span style={{fontSize:11,color:T.muted,marginLeft:8}}>{fmtCurrency(b.spent)} de {fmtCurrency(b.amount)} ({b.pct}%{b.over?' — EXCEDIDO':''})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {[{id:'movimientos',label:'📋 Movimientos'},{id:'graficos',label:'📊 Gráficos'},{id:'presupuesto',label:'📌 Presupuesto'},{id:'ahorro',label:'🎯 Ahorro'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'6px 14px',borderRadius:10,border:`1px solid ${tab===t.id?T.accent:T.border}`,background:tab===t.id?`${T.accent}18`:'transparent',color:tab===t.id?T.accent:T.muted,cursor:'pointer',fontSize:12,fontWeight:tab===t.id?600:400,fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MOVIMIENTOS ── */}
      {tab==='movimientos'&&(
        <div>
          <div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',scrollbarWidth:'none',alignItems:'center'}}>
            <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
              style={{background:T.bg,border:`1px solid ${T.border}`,color:T.text,padding:'6px 12px',borderRadius:10,fontSize:13,outline:'none',cursor:'pointer'}}>
              {months.length===0?<option value={today().slice(0,7)}>{monthLabel(today().slice(0,7))}</option>:months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            {['all','ingreso','egreso'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'6px 14px',borderRadius:10,border:`1px solid ${filter===f?(f==='egreso'?T.red:f==='ingreso'?T.green:T.accent):T.border}`,background:filter===f?(f==='egreso'?`${T.red}18`:f==='ingreso'?`${T.green}18`:`${T.accent}18`):'transparent',color:filter===f?(f==='egreso'?T.red:f==='ingreso'?T.green:T.accent):T.muted,cursor:'pointer',fontSize:12,fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>
                {f==='all'?'Todos':f==='ingreso'?'Ingresos':'Egresos'}
              </button>
            ))}
          </div>
          {filtered.map(t=>(
            <div key={t.id} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 14px',background:T.surface,borderRadius:10,marginBottom:6,border:`1px solid ${T.border}`,borderLeft:`3px solid ${t.type==='ingreso'?T.green:T.red}`}}>
              {editTx?.id===t.id?(
                <div style={{flex:1,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <Input style={{flex:2,minWidth:120}} value={editTxForm.description||''} onChange={v=>setEditTxForm(f=>({...f,description:v}))} placeholder="Descripción"/>
                  <Input type="number" style={{width:90}} value={editTxForm.amount||''} onChange={v=>setEditTxForm(f=>({...f,amount:v}))} placeholder="Monto"/>
                  <Btn size="sm" onClick={updateTx}>✓</Btn>
                  <Btn size="sm" variant="ghost" onClick={()=>setEditTx(null)}>✕</Btn>
                </div>
              ):(
                <>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:T.text,fontSize:13,fontWeight:500}}>{t.description}</div>
                    <div style={{display:'flex',gap:8,marginTop:2}}>
                      {t.category&&<span style={{fontSize:10,color:T.muted}}>{t.category}</span>}
                      <span style={{fontSize:10,color:T.dim}}>{fmt(t.date)}</span>
                    </div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:t.type==='ingreso'?T.green:T.red,flexShrink:0}}>{t.type==='ingreso'?'+':'-'}{fmtCurrency(t.amount)}</div>
                  <div style={{display:'flex',gap:2,flexShrink:0}}>
                    <button onClick={()=>{setEditTx(t);setEditTxForm({description:t.description,amount:t.amount,category:t.category,date:t.date});}} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:3}}><Icon name="pencil" size={12}/></button>
                    <button onClick={()=>delTx(t.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:3}}><Icon name="trash" size={13}/></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {!filtered.length&&<p style={{color:T.dim,fontSize:13,textAlign:'center',padding:'20px 0'}}>Sin movimientos{filter!=='all'?` de tipo ${filter}`:''}</p>}
        </div>
      )}

      {/* ── GRÁFICOS ── */}
      {tab==='graficos'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {[['overview','📊 6 meses'],['cats','🗂 Categorías'],['trend','📈 Tendencia']].map(([id,label])=>(
              <button key={id} onClick={()=>setChartTab(id)}
                style={{padding:'5px 12px',borderRadius:9,border:`1px solid ${chartTab===id?T.orange:T.border}`,background:chartTab===id?`${T.orange}15`:'transparent',color:chartTab===id?T.orange:T.muted,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                {label}
              </button>
            ))}
          </div>
          {chartTab==='overview'&&(
            <Card style={{padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:14,color:T.text}}>Ingresos vs Egresos — 6 meses</div>
                <div style={{display:'flex',gap:10}}>
                  {[[T.accent,'Ingresos'],[T.red,'Egresos']].map(([c,l])=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{width:7,height:7,borderRadius:2,background:c}}/>
                      <span style={{fontSize:9,color:T.muted}}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <BalanceBarChart months={sixMonthsData} height={100}/>
            </Card>
          )}
          {chartTab==='cats'&&catEntries.length>0&&(
            <Card style={{padding:18}}>
              <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:14}}>Egresos por categoría — {monthLabel(monthFilter)}</div>
              {catEntries.map(([cat,amt],i)=>(
                <HBar key={cat} label={cat} value={amt} total={totalEgresos} color={T.areaColors?T.areaColors[i%T.areaColors.length]:T.accent} amount={amt} fmtCurrency={fmtCurrency}/>
              ))}
              {!catEntries.length&&<p style={{color:T.dim,fontSize:13,textAlign:'center'}}>Sin egresos con categoría este mes</p>}
            </Card>
          )}
          {chartTab==='cats'&&!catEntries.length&&(
            <Card style={{padding:18,textAlign:'center'}}><p style={{color:T.dim,fontSize:13}}>Sin egresos categorizados este mes</p></Card>
          )}
          {chartTab==='trend'&&(
            <Card style={{padding:18}}>
              <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:4}}>Balance mensual — tendencia</div>
              <div style={{fontSize:11,color:T.muted,marginBottom:12}}>Diferencia entre ingresos y egresos por mes</div>
              <Sparkline data={balanceTrend} color={T.accent} width={isMobile?280:340} height={65} filled/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                {sixMonthsData.map(m=><span key={m.key} style={{fontSize:9,color:T.dim}}>{m.label}</span>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
                <div style={{background:T.surface2,borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:T.muted}}>Balance este mes</div>
                  <div style={{fontSize:18,fontWeight:800,color:balance>=0?T.accent:T.red,marginTop:2}}>{balance>=0?'+':''}{fmtCurrency(balance)}</div>
                </div>
                <div style={{background:T.surface2,borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:T.muted}}>Mejor mes (6m)</div>
                  <div style={{fontSize:18,fontWeight:800,color:T.text,marginTop:2}}>{fmtCurrency(Math.max(...sixMonthsData.map(m=>m.income-m.expense),0))}</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── PRESUPUESTO ── */}
      {tab==='presupuesto'&&(
        <div>
          <p style={{color:T.muted,fontSize:13,marginBottom:14}}>Gastos fijos recurrentes que salen cada mes.</p>
          {budgets.length===0
            ?<div style={{textAlign:'center',padding:'40px 0',color:T.dim}}>
               <div style={{fontSize:32,marginBottom:8}}>📌</div>
               <div style={{fontSize:14}}>Sin presupuesto fijo registrado</div>
               <div style={{fontSize:12,color:T.muted,marginTop:4}}>Agrégalos desde el área correspondiente</div>
             </div>
            :budgets.map(b=>{
              const spent=allMonth.filter(t=>t.type==='egreso'&&t.category===b.title).reduce((s,t)=>s+(t.amount||0),0);
              const pct=b.amount>0?Math.round(spent/b.amount*100):0;
              const alert=pct>100;
              return (
                <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:T.surface,border:`1px solid ${alert?T.red:T.border}`,borderRadius:11,marginBottom:8,borderLeft:`3px solid ${alert?T.red:T.blue}`}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${T.blue}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>💳</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:T.text,fontSize:13,fontWeight:500}}>{b.title}</div>
                    <div style={{color:T.muted,fontSize:11,marginTop:2}}>Día {b.dayOfMonth} · {b.currency||'MXN'}</div>
                    {b.amount>0&&<div style={{height:3,background:T.border,borderRadius:2,marginTop:5}}><div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:alert?T.red:T.accent,borderRadius:2,transition:'width 0.4s'}}/></div>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{color:alert?T.red:T.blue,fontWeight:700,fontSize:15}}>{fmtCurrency(b.amount)}</div>
                    {spent>0&&<div style={{fontSize:10,color:alert?T.red:T.muted,marginTop:2}}>{fmtCurrency(spent)} usado ({pct}%)</div>}
                  </div>
                  <button onClick={()=>{setEditBudget(b);setEditBudgetForm({title:b.title,amount:b.amount,dayOfMonth:b.dayOfMonth||1,currency:b.currency||'MXN'});}} style={{background:`${T.blue}15`,border:`1px solid ${T.blue}30`,borderRadius:7,color:T.blue,cursor:'pointer',padding:'4px 7px',flexShrink:0,fontSize:11}}>✏️</button>
                  <button onClick={()=>delBudget(b.id)} style={{background:'none',border:'none',color:T.dim,cursor:'pointer',padding:4,display:'flex'}}><Icon name="trash" size={13}/></button>
                </div>
              );
            })
          }
          {budgets.length>0&&<div style={{marginTop:12,padding:'12px 14px',background:`${T.blue}10`,border:`1px solid ${T.blue}30`,borderRadius:11}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:T.muted,fontSize:13}}>Total mensual fijo</span>
              <span style={{color:T.blue,fontWeight:700,fontSize:16}}>{fmtCurrency(totalPresupuesto)}</span>
            </div>
          </div>}
        </div>
      )}

      {/* ── AHORRO ── */}
      {tab==='ahorro'&&(
        <Card style={{padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:4}}>🎯 Meta de ahorro mensual</div>
          <div style={{fontSize:12,color:T.muted,marginBottom:16}}>Configura una meta y sigue tu progreso</div>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:20}}>
            <div style={{flex:1}}>
              <label style={{fontSize:11,color:T.muted}}>Meta de ahorro ($)</label>
              <Input type="number" value={data.savingGoal||''} onChange={v=>{setData(d=>({...d,savingGoal:Number(v)}));save('savingGoal',Number(v));}} placeholder="8000"/>
            </div>
          </div>
          {savingGoal>0&&(
            <>
              <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:16}}>
                <svg width={100} height={100} style={{transform:'rotate(-90deg)',flexShrink:0}}>
                  <circle cx={50} cy={50} r={40} fill="none" stroke={T.border} strokeWidth={10}/>
                  <circle cx={50} cy={50} r={40} fill="none" stroke={savePct>=100?T.accent:T.orange} strokeWidth={10}
                    strokeDasharray={`${2*Math.PI*40*(savePct/100)} ${2*Math.PI*40}`} strokeLinecap="round"
                    style={{transition:'stroke-dasharray 0.8s ease'}}/>
                  <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={T.text} fontSize={15} fontWeight="800"
                    style={{transform:'rotate(90deg)',transformOrigin:'center'}}>{savePct}%</text>
                </svg>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:6}}>{savePct>=100?'✅ ¡Meta alcanzada!':'En progreso...'}</div>
                  <div style={{fontSize:12,color:T.muted,marginBottom:4}}>Ahorrado: <strong style={{color:T.accent}}>{fmtCurrency(savedAmount)}</strong></div>
                  <div style={{fontSize:12,color:T.muted}}>Meta: <strong>{fmtCurrency(savingGoal)}</strong></div>
                  {savePct<100&&<div style={{fontSize:11,color:T.dim,marginTop:4}}>Faltan: {fmtCurrency(savingGoal-savedAmount)}</div>}
                </div>
              </div>
              <div style={{height:8,background:T.border,borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${savePct}%`,background:savePct>=100?T.accent:T.orange,borderRadius:4,transition:'width 0.8s'}}/>
              </div>
            </>
          )}
        </Card>
      )}

      {/* New transaction modal */}
      {modal&&<Modal title="Nuevo movimiento" onClose={()=>setModal(false)}>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {['egreso','ingreso'].map(t=>(
            <button key={t} onClick={()=>setForm(f=>({...f,type:t,category:''}))}
              style={{flex:1,padding:'9px 0',borderRadius:10,border:`2px solid ${form.type===t?(t==='egreso'?T.red:T.green):T.border}`,background:form.type===t?(t==='egreso'?`${T.red}18`:`${T.green}18`):'transparent',color:form.type===t?(t==='egreso'?T.red:T.green):T.muted,cursor:'pointer',fontWeight:600,fontSize:14,fontFamily:'inherit'}}>
              {t==='egreso'?'📉 Egreso':'📈 Ingreso'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Input value={form.description} onChange={v=>setForm(f=>({...f,description:v}))} placeholder="Descripción (ej: Uber, Nómina...)"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Input value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder="Monto" type="number"/>
            <Select value={form.currency} onChange={v=>setForm(f=>({...f,currency:v}))}>
              {['MXN','USD','EUR','COP','ARS'].map(c=><option key={c}>{c}</option>)}
            </Select>
          </div>
          <Select value={form.category} onChange={v=>setForm(f=>({...f,category:v}))}>
            <option value="">— Categoría —</option>
            {(form.type==='egreso'?CATS_EGRESO:CATS_INGRESO).map(c=><option key={c}>{c}</option>)}
          </Select>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Input value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
            <Select value={form.areaId} onChange={v=>setForm(f=>({...f,areaId:v}))}>
              <option value="">Sin área</option>
              {data.areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </Select>
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <Btn onClick={saveTx} style={{flex:1,justifyContent:'center'}}>Guardar</Btn>
          <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
        </div>
      </Modal>}
      {editTx&&<Modal title="Editar movimiento" onClose={()=>setEditTx(null)}>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {['egreso','ingreso'].map(t=>(
            <button key={t} onClick={()=>setEditTxForm(f=>({...f,type:t,category:''}))}
              style={{flex:1,padding:'9px 0',borderRadius:10,border:`2px solid ${editTxForm.type===t?(t==='egreso'?T.red:T.green):T.border}`,background:editTxForm.type===t?(t==='egreso'?`${T.red}18`:`${T.green}18`):'transparent',color:editTxForm.type===t?(t==='egreso'?T.red:T.green):T.muted,cursor:'pointer',fontWeight:600,fontSize:14,fontFamily:'inherit'}}>
              {t==='egreso'?'📉 Egreso':'📈 Ingreso'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Input value={editTxForm.description||''} onChange={v=>setEditTxForm(f=>({...f,description:v}))} placeholder="Descripción"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Input value={editTxForm.amount||''} onChange={v=>setEditTxForm(f=>({...f,amount:v}))} placeholder="Monto" type="number"/>
            <Select value={editTxForm.currency||'MXN'} onChange={v=>setEditTxForm(f=>({...f,currency:v}))}>
              {['MXN','USD','EUR','COP','ARS'].map(c=><option key={c}>{c}</option>)}
            </Select>
          </div>
          <Select value={editTxForm.category||''} onChange={v=>setEditTxForm(f=>({...f,category:v}))}>
            <option value="">— Categoría —</option>
            {(editTxForm.type==='egreso'?CATS_EGRESO:CATS_INGRESO).map(c=><option key={c}>{c}</option>)}
          </Select>
          <Input value={editTxForm.date||''} onChange={v=>setEditTxForm(f=>({...f,date:v}))} type="date"/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <Btn onClick={updateTx} style={{flex:1,justifyContent:'center'}}>Guardar cambios</Btn>
          <Btn variant="ghost" onClick={()=>setEditTx(null)}>Cancelar</Btn>
        </div>
      </Modal>}
      {editBudget&&<Modal title="Editar presupuesto fijo" onClose={()=>setEditBudget(null)}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Input value={editBudgetForm.title||''} onChange={v=>setEditBudgetForm(f=>({...f,title:v}))} placeholder="Nombre del gasto"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Input value={editBudgetForm.amount||''} onChange={v=>setEditBudgetForm(f=>({...f,amount:v}))} placeholder="Monto" type="number"/>
            <Select value={editBudgetForm.currency||'MXN'} onChange={v=>setEditBudgetForm(f=>({...f,currency:v}))}>
              {['MXN','USD','EUR','COP','ARS'].map(c=><option key={c}>{c}</option>)}
            </Select>
          </div>
          <Input value={editBudgetForm.dayOfMonth||''} onChange={v=>setEditBudgetForm(f=>({...f,dayOfMonth:v}))} placeholder="Día del mes (ej: 1)" type="number"/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <Btn onClick={updateBudget} style={{flex:1,justifyContent:'center'}}>Guardar cambios</Btn>
          <Btn variant="ghost" onClick={()=>setEditBudget(null)}>Cancelar</Btn>
        </div>
      </Modal>}
    </div>
  );
};



export default Finance;
