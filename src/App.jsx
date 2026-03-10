// ===================== APP — THIN ROUTER =====================
// This file is the orchestration layer. All heavy logic lives in src/modules/.
// State is loaded via AppContext (see src/context/AppContext.jsx).

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { T, getIsDark, setIsDark } from './theme/tokens.js';
import { AppLoader } from './modules/AppLoader.jsx';
import ErrorBoundary from './modules/ErrorBoundary.jsx';
import { NAV_SECTIONS, MOBILE_NAV } from './modules/navConfig.js';
import Icon from './components/icons/Icon.jsx';
import { toast, ToastContainer } from './modules/Toast.jsx';

// ── Lazy-loaded modules (code splitting) ──
const Dashboard        = lazy(() => import('./modules/Dashboard.jsx'));
const Areas            = lazy(() => import('./modules/Areas.jsx').then(m => ({ default: m.Areas })));
const AreaDetail       = lazy(() => import('./modules/Areas.jsx').then(m => ({ default: m.AreaDetail })));
const Objectives       = lazy(() => import('./modules/Objectives.jsx'));
const ProjectsAndTasks = lazy(() => import('./modules/ProjectsAndTasks.jsx'));
const Notes            = lazy(() => import('./modules/Notes.jsx'));
const Inbox            = lazy(() => import('./modules/Inbox.jsx'));
const HabitTracker     = lazy(() => import('./modules/HabitTracker.jsx'));
const Journal          = lazy(() => import('./modules/Journal.jsx'));
const Books            = lazy(() => import('./modules/Books.jsx'));
const Shopping         = lazy(() => import('./modules/Shopping.jsx'));
const Education        = lazy(() => import('./modules/Education.jsx'));
const Finance          = lazy(() => import('./modules/Finance.jsx'));
const Health           = lazy(() => import('./modules/Health.jsx'));
const Relaciones       = lazy(() => import('./modules/Relaciones.jsx'));
const SideProjects     = lazy(() => import('./modules/SideProjects.jsx'));
const TrabajoEmbed     = lazy(() => import('./modules/TrabajoEmbed.jsx'));
const DesarrolloPersonal = lazy(() => import('./modules/DesarrolloPersonal.jsx'));
const Hogar            = lazy(() => import('./modules/Hogar.jsx'));
const Vehiculos        = lazy(() => import('./modules/Vehiculos.jsx'));
const Settings         = lazy(() => import('./modules/Settings.jsx'));
const GlobalSearch     = lazy(() => import('./modules/GlobalSearch.jsx'));
const Psicke           = lazy(() => import('./modules/Psicke.jsx'));
const Entretenimiento  = lazy(() => import('./modules/Entretenimiento.jsx'));
const Mascotas         = lazy(() => import('./modules/Mascotas.jsx'));
const Viajes           = lazy(() => import('./modules/Viajes.jsx'));
const Nutricion        = lazy(() => import('./modules/Nutricion.jsx'));
const Sueno            = lazy(() => import('./modules/Sueno.jsx'));

// ── Storage helpers (re-export pattern for App-level use) ──
import { save, load } from './storage/index.js';
import { uid, today } from './utils/helpers.js';
import { initData } from './context/initialData.js';

function App() {
  const [view, setView]               = useState('dashboard');
  const [viewHint, setViewHint]       = useState(null);
  const [data, setData]               = useState(null);
  const [psickeOpen, setPsickeOpen]   = useState(false);
  const [welcomePsicke, setWelcomePsicke] = useState(null);
  const [showSearch, setShowSearch]   = useState(false);
  const [apiKey, setApiKey]           = useState(() => { try { return localStorage.getItem('sb_gemini_key') || ''; } catch { return ''; } });
  const [showWelcome, setShowWelcome] = useState(() => { try { return !localStorage.getItem('sb_gemini_key'); } catch { return true; } });
  const [welcomeKeyInput, setWelcomeKeyInput] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [isOnline, setIsOnline]       = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDark, setIsDarkState]      = useState(() => {
    try {
      const saved = localStorage.getItem('sb_theme');
      if (saved) return saved !== 'light';
      return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return true; }
  });

  const isMobile = true; // App is mobile-first

  // ── System theme sync ──
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      try { if (localStorage.getItem('sb_theme')) return; } catch {}
      setIsDark(e.matches);
      setIsDarkState(e.matches);
      try { document.body.style.background = e.matches ? '#0d1117' : '#f6f8fa'; } catch {}
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    setIsDarkState(next);
    try {
      const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
      if (next === systemDark) { localStorage.removeItem('sb_theme'); }
      else { localStorage.setItem('sb_theme', next ? 'dark' : 'light'); }
    } catch {}
    try { document.body.style.background = next ? '#0d1117' : '#f6f8fa'; } catch {}
  }, [isDark]);

  // ── Online/offline ──
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Android back button trap ──
  useEffect(() => {
    // Push a dummy state so the back button pops it instead of leaving the app
    history.pushState(null, '', window.location.href);
    const onPop = () => {
      history.pushState(null, '', window.location.href);
      // If a panel is open, close it; otherwise stay on current view
      if (psickeOpen) { setPsickeOpen(false); return; }
      if (showSearch) { setShowSearch(false); return; }
      if (view !== 'dashboard') { navTo('dashboard'); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, psickeOpen, showSearch]);

  // ── Android back button trap ──
  useEffect(() => {
    history.pushState(null, '', window.location.href);
    const onPop = () => {
      history.pushState(null, '', window.location.href);
      if (psickeOpen) { setPsickeOpen(false); return; }
      if (showSearch) { setShowSearch(false); return; }
      if (view !== 'dashboard') { navTo('dashboard'); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, psickeOpen, showSearch]);

  // ── PWA + SW ──
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    try { return localStorage.getItem('sb_pwa_installed') === '1' || window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch { return false; }
  });

  useEffect(() => {
    const handler = e => {
      e.preventDefault(); setInstallPrompt(e);
      try { if (localStorage.getItem('sb_install_dismissed') !== '1') setShowInstallBanner(true); } catch { setShowInstallBanner(true); }
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true); setShowInstallBanner(false);
      try { localStorage.setItem('sb_pwa_installed', '1'); } catch {}
      toast.success('¡App instalada!', 'Ya puedes abrirla desde tu pantalla de inicio');
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null); setShowInstallBanner(false);
  }, [installPrompt]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    try { localStorage.setItem('sb_install_dismissed', '1'); } catch {}
  }, []);

  // ── Cmd+K global search ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Data bootstrap ──
  useEffect(() => {
    (async () => {
      try { localStorage.setItem('sb_onboarding_done', '1'); } catch {}
      const def = initData();
      const keys = Object.keys(def);
      const loaded = await Promise.all(keys.map(k => load(k, def[k])));
      const result = {};
      keys.forEach((k, i) => { result[k] = loaded[i]; });
      setData(result);
    })();
  }, []);

  // ── Navigation ──
  const navigate = (v, hint = null) => {
    if (v === view) { setViewHint(hint); return; }
    setTransitioning(true);
    setTimeout(() => { setView(v); setViewHint(hint); setTransitioning(false); }, 120);
  };
  const navTo = (v) => {
    if (v === view) return;
    setTransitioning(true);
    setTimeout(() => { setView(v); setViewHint(null); setTransitioning(false); }, 120);
  };
  const consumeHint = useCallback(() => setViewHint(null), []);
  const backToDashboard = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => { setView('dashboard'); setViewHint(null); setTransitioning(false); }, 120);
  }, []);

  if (!data) return <AppLoader />;

  const inboxCount = data.inbox.filter(i => !i.processed).length;
  const props = { data, setData, isMobile };

  // ── View renderer ──
  const renderView = () => {
    switch (view) {
      case 'dashboard':    return <Dashboard {...props} onNavigate={navigate} />;
      case 'areas':        return <Areas data={data} isMobile={isMobile} onNavigate={navigate} />;
      case 'areaDetail':   return <AreaDetail {...props} viewHint={viewHint} onConsumeHint={consumeHint} onNavigate={navigate} onBack={() => navTo('areas')} />;
      case 'objectives':   return <Objectives {...props} viewHint={viewHint} onConsumeHint={consumeHint} onNavigate={navigate} />;
      case 'projects':     return <ProjectsAndTasks {...props} viewHint={viewHint} onConsumeHint={consumeHint} onNavigate={navigate} />;
      case 'notes':        return <Notes {...props} viewHint={viewHint} onConsumeHint={consumeHint} />;
      case 'finance':      return <Finance {...props} onBack={backToDashboard} />;
      case 'inbox':        return <Inbox {...props} />;
      case 'habits':       return <HabitTracker {...props} />;
      case 'journal':      return <Journal {...props} />;
      case 'books':        return <Books {...props} />;
      case 'shopping':     return <Shopping {...props} />;
      case 'education':    return <Education {...props} />;
      case 'health':       return <Health {...props} onBack={backToDashboard} />;
      case 'relaciones':   return <Relaciones {...props} onBack={backToDashboard} />;
      case 'sideprojects': return <SideProjects {...props} onBack={backToDashboard} />;
      case 'trabajo':      return <TrabajoEmbed isMobile={isMobile} onBack={backToDashboard} />;
      case 'desarrollo':   return <DesarrolloPersonal {...props} onBack={backToDashboard} />;
      case 'hogar':        return <Hogar {...props} onBack={backToDashboard} />;
      case 'coche':        return <Vehiculos {...props} onBack={backToDashboard} />;
      case 'entretenimiento': return <Entretenimiento {...props} onBack={backToDashboard} />;
      case 'mascotas':     return <Mascotas {...props} onBack={backToDashboard} />;
      case 'viajes':       return <Viajes {...props} onBack={backToDashboard} />;
      case 'nutricion':    return <Nutricion {...props} onBack={backToDashboard} />;
      case 'sueno':        return <Sueno {...props} onBack={backToDashboard} />;
      case 'settings':     return (
        <Settings apiKey={apiKey} setApiKey={setApiKey} isMobile={isMobile} data={data} setData={setData}
          viewHint={viewHint} onConsumeHint={consumeHint}
          onOpenPsicke={() => setPsickeOpen(true)}
          onInstall={(!isInstalled && installPrompt) ? triggerInstall : null}
          isInstalled={isInstalled} />
      );
      default: return null;
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      height: '100dvh', width: '100%',
      background: T.bg,
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      color: T.text, overflow: 'hidden', position: 'fixed', inset: 0,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        html,body,#root{margin:0;padding:0;width:100%;height:100%;background:${T.bg};}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        *:focus-visible{outline:2px solid ${T.accent};outline-offset:2px;border-radius:4px;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px;}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes sbSlideUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${isDark?'invert(0.5)':'none'};}
        select option{background:${T.surface};color:${T.text};}
      `}</style>

      {/* ── Offline indicator ── */}
      {!isOnline && (
        <div style={{ position:'fixed',top:0,left:0,right:0,zIndex:999,background:'#ff5c5c',color:'#fff',textAlign:'center',padding:'6px 12px',fontSize:12,fontWeight:700 }}>
          📡 Sin conexión — los datos se guardan localmente
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <div style={{ width:220,background:T.surface,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0 }}>
          <div style={{ padding:'20px 16px 16px',borderBottom:`1px solid ${T.border}` }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:34,height:34,background:`linear-gradient(135deg,${T.accent},${T.orange})`,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🧠</div>
              <div>
                <div style={{ fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:800,color:T.text,lineHeight:1 }}>Segundo</div>
                <div style={{ fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:800,color:T.accent,lineHeight:1 }}>Cerebro</div>
              </div>
            </div>
          </div>
          <nav style={{ flex:1,padding:'8px',overflowY:'auto' }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label} style={{ marginBottom:4 }}>
                <div style={{ fontSize:9,fontWeight:700,color:T.dim,letterSpacing:1.2,textTransform:'uppercase',padding:'8px 12px 4px' }}>{section.label}</div>
                {section.items.map(item => {
                  const active = view === item.id;
                  const badge  = item.id === 'inbox' && inboxCount > 0 ? inboxCount : null;
                  return (
                    <button key={item.id} onClick={() => navTo(item.id)}
                      style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderRadius:9,border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12,fontWeight:active?600:400,background:active?`${T.accent}18`:'transparent',color:active?T.accent:T.muted,transition:'all 0.15s',marginBottom:1 }}>
                      <Icon name={item.icon} size={15} color={active ? T.accent : T.muted}/>
                      <span style={{ flex:1 }}>{item.label}</span>
                      {badge && <span style={{ background:T.red,color:'#fff',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10 }}>{badge}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div style={{ padding:'12px 16px',borderTop:`1px solid ${T.border}`,display:'flex',flexDirection:'column',gap:6 }}>
            <button onClick={() => setShowSearch(true)} style={{ display:'flex',alignItems:'center',gap:8,background:'transparent',border:`1px solid ${T.border}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',color:T.muted,fontSize:12,fontFamily:'inherit',width:'100%',marginBottom:4 }}>
              🔍 <span>Búsqueda global</span>
            </button>
            <div style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer' }} onClick={() => navTo('settings')}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:apiKey?T.green:T.red,display:'inline-block',flexShrink:0 }}/>
              <span style={{ fontSize:11,color:apiKey?T.green:T.red,fontWeight:600 }}>{apiKey ? 'Gemini activo' : 'Sin API Key'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={{ background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'8px 16px',minHeight:58,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,color:T.text }}>
              Segundo <span style={{ color:T.accent }}>Cerebro</span>
            </span>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {inboxCount > 0 && <button onClick={() => navTo('inbox')} style={{ background:T.red,color:'#fff',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'inherit' }}>{inboxCount} inbox</button>}
            <button onClick={() => setShowSearch(true)} style={{ background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'3px 10px',cursor:'pointer',color:T.muted,fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:4 }}>🔍</button>
            <button onClick={() => navTo('settings')} style={{ background:'none',border:`1px solid ${apiKey?T.green:T.red}`,borderRadius:8,padding:'3px 10px',cursor:'pointer',color:apiKey?T.green:T.red,fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ width:6,height:6,borderRadius:'50%',background:apiKey?T.green:T.red,display:'inline-block' }}/>
              {apiKey ? 'IA ON' : 'IA OFF'}
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main style={{ flex:1,overflowY:'auto',padding:isMobile?'16px 16px 90px':'28px',minHeight:0,marginTop:isOnline?0:28 }}>
        <div style={{ opacity:transitioning?0:1,transform:transitioning?'translateY(6px)':'translateY(0)',transition:'opacity 0.12s ease,transform 0.12s ease' }}>
          <Suspense fallback={<AppLoader/>}>
            {renderView()}
          </Suspense>
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <nav style={{ position:'fixed',bottom:0,left:0,right:0,background:T.surface,borderTop:`1px solid ${T.border}`,display:'flex',zIndex:50,paddingBottom:'env(safe-area-inset-bottom)' }}>
          {MOBILE_NAV.map(item => {
            const isPsicke = item.id === '__psicke__';
            const active   = isPsicke ? psickeOpen : (view === item.id && !psickeOpen);
            return (
              <button key={item.id}
                onClick={() => { if (isPsicke) { setPsickeOpen(true); } else { setPsickeOpen(false); navTo(item.id); } }}
                style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 4px 8px',border:'none',cursor:'pointer',background:'transparent',color:active?T.accent:T.dim,fontFamily:'inherit',position:'relative',gap:3 }}>
                {isPsicke
                  ? <div style={{ width:22,height:22,borderRadius:6,background:active?`linear-gradient(135deg,${T.accent},${T.orange})`:`${T.dim}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,transition:'all 0.2s' }}>🧠</div>
                  : <Icon name={item.icon} size={22} color={active ? T.accent : undefined}/>
                }
                <span style={{ fontSize:10,fontWeight:active?600:400,color:active?T.accent:T.dim }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Global search overlay ── */}
      <Suspense fallback={null}>
        {showSearch && data && (
          <GlobalSearch data={data} onNavigate={(v, h) => { navigate(v, h); }} onClose={() => setShowSearch(false)}/>
        )}
      </Suspense>

      {/* ── Psicke AI ── */}
      <Suspense fallback={null}>
        <Psicke apiKey={apiKey} onGoSettings={() => navTo('settings')} data={data} setData={setData}
          openFromNav={psickeOpen} onNavClose={() => setPsickeOpen(false)}
          welcomeData={welcomePsicke} onWelcomeDone={() => setWelcomePsicke(null)}/>
      </Suspense>

      {/* ── PWA Install Banner ── */}
      {showInstallBanner && !isInstalled && (
        <div style={{ position:'fixed',bottom:isMobile?72:24,left:'50%',transform:'translateX(-50%)',zIndex:9998,width:'calc(100% - 32px)',maxWidth:380,background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'14px 16px',boxShadow:'0 8px 32px rgba(0,0,0,0.35)',display:'flex',alignItems:'center',gap:12,animation:'sbSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${T.accent}22,${T.blue}22)`,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>🧠</div>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ margin:0,fontSize:13,fontWeight:600,color:T.text }}>Instalar Segundo Cerebro</p>
            <p style={{ margin:'2px 0 0',fontSize:11,color:T.muted,fontWeight:300 }}>Acceso directo desde tu pantalla de inicio</p>
          </div>
          <button onClick={triggerInstall} style={{ background:T.accent,border:'none',borderRadius:8,padding:'7px 14px',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' }}>Instalar</button>
          <button onClick={dismissInstallBanner} style={{ background:'none',border:'none',color:T.dim,cursor:'pointer',fontSize:18,padding:'0 2px',flexShrink:0,lineHeight:1 }}>×</button>
        </div>
      )}

      {/* ── Welcome / API Key screen ── */}
      {showWelcome && (
        <div style={{ position:'fixed',inset:0,zIndex:9999,background:T.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:28 }}>
          <div style={{ width:'100%',maxWidth:380 }}>
            {/* Logo */}
            <div style={{ textAlign:'center',marginBottom:36 }}>
              <div style={{ fontSize:52,marginBottom:12 }}>🧠</div>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:26,fontWeight:800,color:T.text,lineHeight:1.1 }}>
                Segundo<br/><span style={{ color:T.accent }}>Cerebro</span>
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:T.muted,marginTop:10,lineHeight:1.6 }}>
                Tu sistema de productividad personal
              </div>
            </div>

            {/* Card */}
            <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:24 }}>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:T.text,marginBottom:6 }}>
                Activa tu asistente IA
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:T.muted,lineHeight:1.6,marginBottom:20 }}>
                Psicke necesita una <strong style={{ color:T.text }}>Google Gemini API Key</strong> para funcionar. Es gratis y tarda menos de un minuto obtenerla.
              </div>

              {/* Input */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,fontWeight:600,color:T.muted,letterSpacing:.5,textTransform:'uppercase',display:'block',marginBottom:6 }}>
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="AIza..."
                  value={welcomeKeyInput}
                  onChange={e => setWelcomeKeyInput(e.target.value)}
                  style={{ width:'100%',background:T.surface2,border:`1px solid ${welcomeKeyInput.length>10?T.accent:T.border}`,borderRadius:10,padding:'10px 14px',color:T.text,fontSize:14,fontFamily:"'Plus Jakarta Sans',sans-serif",outline:'none',transition:'border-color .2s' }}
                />
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => {
                  const key = welcomeKeyInput.trim();
                  if (!key) return;
                  try { localStorage.setItem('sb_gemini_key',''); localStorage.setItem('sb_gemini_key', key); } catch {}
                  setApiKey(key);
                  setShowWelcome(false);
                }}
                disabled={welcomeKeyInput.trim().length < 10}
                style={{ width:'100%',background:welcomeKeyInput.trim().length>=10?T.accent:'#2a3440',border:'none',borderRadius:12,padding:'13px 0',color:welcomeKeyInput.trim().length>=10?'#000':T.dim,fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,cursor:welcomeKeyInput.trim().length>=10?'pointer':'not-allowed',transition:'all .2s',marginBottom:10 }}>
                Activar Psicke →
              </button>

              {/* Get key link */}
              <div style={{ textAlign:'center',marginBottom:16 }}>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                  style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:T.blue,textDecoration:'none' }}>
                  Obtener API Key gratis en Google AI Studio ↗
                </a>
              </div>

              {/* Skip */}
              <button
                onClick={() => {
                  try { localStorage.setItem('sb_gemini_key', ''); } catch {}
                  setShowWelcome(false);
                }}
                style={{ width:'100%',background:'none',border:'none',color:T.dim,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,cursor:'pointer',padding:'6px 0' }}>
                Continuar sin IA — configurar después en Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer/>
    </div>
  );
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
