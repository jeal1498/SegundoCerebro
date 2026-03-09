// ===================== HELPERS =====================
export const uid = () => Math.random().toString(36).slice(2,10);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}) : '';
