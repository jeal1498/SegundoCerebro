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
const DesarrolloPersonal = lazy(() => import('./modules/DesarrolloPersonal.jsx'));
const Hogar            = lazy(() => import('./modules/Hogar.jsx'));
const Vehiculos        = lazy(() => import('./modules/Vehiculos.jsx'));
const Settings         = lazy(() => import('./modules/Settings.jsx'));
const GlobalSearch     = lazy(() => import('./modules/GlobalSearch.jsx'));
const Psicke           = lazy(() => import('./modules/Psicke.jsx'));
const Nutricion        = lazy(() => import('./modules/Nutricion.jsx'));
const Sueno            = lazy(() => import('./modules/Sueno.jsx'));
const Entretenimiento  = lazy(() => import('./modules/Entretenimiento.jsx'));
const Mascotas         = lazy(() => import('./modules/Mascotas.jsx'));
const Viajes           = lazy(() => import('./modules/Viajes.jsx'));

// ── Storage helpers (re-export pattern for App-level use) ──
import { save, load } from './storage/index.js';
import { uid, today } from './utils/helpers.js';
import { initData } from './context/initialData.js';
import { registerNotificationSW, checkOnFocus } from './utils/notifications.js';

function App() {
  const [view, setView]               = useState('dashboard');
  const [viewHint, setViewHint]       = useState(null);
  const [data, setData]               = useState(null);
  const [psickeOpen, setPsickeOpen]   = useState(false);
  const [welcomePsicke, setWelcomePsicke] = useState(null);
  const [showSearch, setShowSearch]   = useState(false);
  const [apiKey, setApiKey]           = useState(() => { try { return localStorage.getItem('sb_gemini_key') || ''; } catch { return ''; } });
  const [isFirstTime] = useState(() => { try { return !localStorage.getItem('sb_user_name'); } catch { return true; } });
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

  // ── Registrar SW de notificaciones ──
  useEffect(() => {
    registerNotificationSW().catch(() => {});
    // Verificar notificaciones vencidas al abrir la app
    const onVisible = () => { if (!document.hidden) checkOnFocus().catch(()=>{}); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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
      const def = initData();
      const keys = Object.keys(def);
      const loaded = await Promise.all(keys.map(k => load(k, def[k])));
      const result = {};
      keys.forEach((k, i) => { result[k] = loaded[i]; });

      // ── Inyectar objetivo tutorial si no existe ──
      const TUTORIAL_OBJ_ID = 'sb_tutorial_obj';
      if (!result.objectives.find(o => o.id === TUTORIAL_OBJ_ID)) {
        const todayStr = today();
        const tutObj = {
          id: TUTORIAL_OBJ_ID,
          title: '🎓 Aprender Segundo Cerebro',
          areaId: '', deadline: '2026-12-31', status: 'active',
          milestones: [], notes: 'Completa estas acciones para dominar tu sistema personal.'
        };
        const tutTasks = [
          { id:'tut_1', title:'📥 Captura algo en el Inbox',       status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Inbox → toca + y escribe cualquier idea o pendiente.' },
          { id:'tut_2', title:'📝 Crea tu primera nota',           status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Notas → Nueva nota → guarda con cualquier contenido.' },
          { id:'tut_3', title:'✅ Completa un hábito hoy',         status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Salud → Hábitos → marca uno como completado hoy.' },
          { id:'tut_4', title:'📁 Crea un proyecto',               status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Tareas → Proyectos → crea un nuevo proyecto.' },
          { id:'tut_5', title:'💸 Registra un gasto',              status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Finanzas → Nueva transacción → registra cualquier gasto.' },
          { id:'tut_6', title:'📔 Escribe en tu diario',           status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Inicio → Diario → escribe tu primera entrada.' },
          { id:'tut_7', title:'🎯 Crea un objetivo propio',        status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Ve a Objetivos → Nuevo objetivo → algo que quieras lograr.' },
          { id:'tut_8', title:'🧠 Envía un mensaje a Psicke',      status:'todo', priority:'normal', projectId:'', objectiveId:TUTORIAL_OBJ_ID, createdAt:todayStr, dueDate:'', subtasks:[], notes:'Toca el botón de Psicke en la barra inferior y escríbele algo.' },
        ];
        result.objectives = [...result.objectives, tutObj];
        result.tasks = [...result.tasks, ...tutTasks];
        save('objectives', result.objectives);
        save('tasks', result.tasks);
      }

      setData(result);
      // ── Primer arranque: abrir Psicke automáticamente ──
      const isFirst = (() => { try { return !localStorage.getItem('sb_user_name'); } catch { return true; } })();
      if (isFirst) setTimeout(() => setPsickeOpen(true), 800);
    })();
  }, []);

  // ── Auto-completar tareas del tutorial ──
  useEffect(() => {
    if (!data) return;
    const TUTORIAL_OBJ_ID = 'sb_tutorial_obj';
    const tutTasks = data.tasks.filter(t => t.objectiveId === TUTORIAL_OBJ_ID && t.status !== 'done');
    if (tutTasks.length === 0) return;

    const psickeUsed = (() => { try { return localStorage.getItem('sb_psicke_used') === '1'; } catch { return false; } })();

    const checks = {
      tut_1: data.inbox.length > 1,
      tut_2: data.notes.length > 1,
      tut_3: data.habits.some(h => h.completions && h.completions.length > 0),
      tut_4: data.projects.length > 0,
      tut_5: data.transactions.length > 0,
      tut_6: data.journal.length > 0,
      tut_7: data.objectives.filter(o => o.id !== TUTORIAL_OBJ_ID).length > 1,
      tut_8: psickeUsed,
    };

    const toComplete = tutTasks.filter(t => checks[t.id]);
    if (toComplete.length === 0) return;

    const labels = {
      tut_1: '¡Inbox capturado!', tut_2: '¡Primera nota creada!',
      tut_3: '¡Hábito completado!', tut_4: '¡Primer proyecto creado!',
      tut_5: '¡Gasto registrado!', tut_6: '¡Diario iniciado!',
      tut_7: '¡Objetivo creado!', tut_8: '¡Psicke activado!',
    };

    const updated = data.tasks.map(t =>
      toComplete.find(tc => tc.id === t.id) ? { ...t, status: 'done' } : t
    );

    toComplete.forEach(t => toast.success(`🎓 ${labels[t.id] || 'Tarea completada'} +1 en tu objetivo tutorial`));

    // ¿Completaste todo?
    const allDone = updated.filter(t => t.objectiveId === TUTORIAL_OBJ_ID).every(t => t.status === 'done');
    if (allDone) {
      const updatedObjs = data.objectives.map(o =>
        o.id === TUTORIAL_OBJ_ID ? { ...o, status: 'completed' } : o
      );
      setTimeout(() => toast.success('🏆 ¡Dominaste el Segundo Cerebro! Objetivo completado al 100%'), 800);
      setData(d => ({ ...d, tasks: updated, objectives: updatedObjs }));
      save('tasks', updated);
      save('objectives', updatedObjs);
    } else {
      setData(d => ({ ...d, tasks: updated }));
      save('tasks', updated);
    }
  }, [data?.inbox?.length, data?.notes?.length, data?.habits, data?.projects?.length,
      data?.transactions?.length, data?.journal?.length, data?.objectives?.length,
      data?.tasks]);

  // ── Navigation ──
  const goToView = useCallback((v, hint = null) => {
    setTransitioning(true);
    setTimeout(() => { setView(v); setViewHint(hint); setTransitioning(false); }, 120);
  }, []);

  const navigate = (v, hint = null) => {
    if (v === 'trabajo') { window.open('https://jeal1498.github.io/AppWeb-ControlCheck/index.html','_blank','noopener,noreferrer'); return; }
    if (v === view) { setViewHint(hint); return; }
    history.pushState({ view: v, hint }, '', null);
    goToView(v, hint);
  };
  const navTo = (v) => {
    if (v === view) return;
    history.pushState({ view: v, hint: null }, '', null);
    goToView(v, null);
  };
  const consumeHint = useCallback(() => setViewHint(null), []);
  const backToDashboard = useCallback(() => {
    history.pushState({ view: 'dashboard', hint: null }, '', null);
    goToView('dashboard', null);
  }, [goToView]);

  // ── Android/iOS back button — intercept popstate ──
  useEffect(() => {
    // replaceState sella la entrada nativa + pushState añade un buffer extra
    // así siempre hay al menos 2 entradas propias antes de poder salir
    history.replaceState({ view: 'dashboard', hint: null }, '', null);
    history.pushState({ view: 'dashboard', hint: null }, '', null);

    const onPop = (e) => {
      const state = e.state;
      if (state && state.view) {
        goToView(state.view, state.hint || null);
      }
      // Si state es null llegamos al fondo — re-insertar buffer y quedarnos
      if (!state || !state.view) {
        history.pushState({ view: 'dashboard', hint: null }, '', null);
        history.pushState({ view: 'dashboard', hint: null }, '', null);
        goToView('dashboard', null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [goToView]);

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
      case 'desarrollo':   return <DesarrolloPersonal {...props} onBack={backToDashboard} />;
      case 'hogar':        return <Hogar {...props} onBack={backToDashboard} />;
      case 'coche':        return <Vehiculos {...props} onBack={backToDashboard} />;
      case 'nutricion':       return <Nutricion {...props} />;
      case 'sueno':           return <Sueno {...props} />;
      case 'entretenimiento': return <Entretenimiento {...props} />;
      case 'mascotas':       return <Mascotas {...props} />;
      case 'viajes':         return <Viajes {...props} />;
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
      fontFamily: "'DM Sans',system-ui,sans-serif",
      color: T.text, overflow: 'hidden', position: 'fixed', inset: 0,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@300;400;500&display=swap');
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
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:T.text,lineHeight:1 }}>Segundo</div>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:T.accent,lineHeight:1 }}>Cerebro</div>
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
        <div style={{ background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:28,height:28,background:`linear-gradient(135deg,${T.accent},${T.orange})`,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17 }}>🧠</div>
            <span style={{ fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:T.text }}>
              Segundo <span style={{ color:T.accent }}>Cerebro</span>
            </span>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {inboxCount > 0 && <span style={{ background:T.red,color:'#fff',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:12 }}>{inboxCount} inbox</span>}
            <button onClick={toggleTheme} style={{ background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'3px 10px',cursor:'pointer',color:T.muted,fontSize:14,display:'flex',alignItems:'center' }}>{isDark ? '☀️' : '🌙'}</button>
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

      <ToastContainer/>
    </div>
  );
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
