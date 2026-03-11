// ===================== HELPERS =====================
export const uid = () => Math.random().toString(36).slice(2,10);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export const fmt = (d) => {
  if (!d) return '';
  // Parse YYYY-MM-DD as local time (not UTC) to avoid off-by-one on negative UTC offsets
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};
