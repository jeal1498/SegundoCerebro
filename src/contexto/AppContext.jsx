import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { load } from '../storage/index.js';
import { initData } from './initialData.js';

// ─── Context ───────────────────────────────────────────────────────────────
const AppContext = createContext(null);

// ─── Reducer ───────────────────────────────────────────────────────────────
// NOTE: Phase 1 uses a simple "merge" reducer.
// Phase 2 will expand this with domain-specific action types for cross-module logic.
function appReducer(state, action) {
  switch (action.type) {
    case 'INIT':       return { ...state, ...action.payload };
    case 'SET_FIELD':  return { ...state, [action.key]: action.value };
    case 'SET_MANY':   return { ...state, ...action.payload };
    default:           return state;
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [data, dispatch] = useReducer(appReducer, null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const def = initData();
      const keys = Object.keys(def);
      const loaded = await Promise.all(keys.map(k => load(k, def[k])));
      const result = {};
      keys.forEach((k, i) => { result[k] = loaded[i]; });
      dispatch({ type: 'INIT', payload: result });
      setLoading(false);
    })();
  }, []);

  // Legacy-compatible setData function (for prop-drilling phase compatibility)
  const setData = (updater) => {
    if (typeof updater === 'function') {
      dispatch({ type: 'SET_MANY', payload: updater(data) });
    } else {
      dispatch({ type: 'SET_MANY', payload: updater });
    }
  };

  return (
    <AppContext.Provider value={{ data, setData, loading }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used inside AppProvider');
  return ctx;
}

export default AppContext;
