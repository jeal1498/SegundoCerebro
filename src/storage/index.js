// ===================== STORAGE =====================
// Dual-layer: localStorage (primary) + window.storage (Claude artifact env fallback)

export const save = async (key, val) => {
  const str = JSON.stringify(val);
  try { localStorage.setItem(key, str); } catch(e) {}
  try { await window.storage?.set(key, str); } catch(e) {}
};

export const load = async (key, def) => {
  try {
    const r = await window.storage?.get(key);
    if (r?.value) return JSON.parse(r.value);
  } catch(e) {}
  try {
    const item = localStorage.getItem(key);
    if (item) return JSON.parse(item);
  } catch(e) {}
  return def;
};
