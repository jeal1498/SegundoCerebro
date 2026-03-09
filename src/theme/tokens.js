// ===================== THEME — Jade & Slate =====================
// Single source of truth for all color tokens.
// The _isDark variable is module-level so the T Proxy always reads the current value.

let _isDark = true;
try {
  const saved = localStorage.getItem('sb_theme');
  if (saved) {
    _isDark = saved !== 'light';
  } else {
    _isDark = !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
} catch(e) {}

const DARK_THEME = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2330',
  border: '#273040', borderLight: '#2f3a4e',
  accent: '#3fb950', accentHover: '#56d364',
  text: '#e6edf3', muted: '#7d8590', dim: '#3d444d',
  green: '#3fb950', red: '#f85149', blue: '#58a6ff',
  purple: '#bc8cff', orange: '#e3b341', yellow: '#ffd166', teal: '#39d353',
  userBubble: '#3fb950', userText: '#000',
  areaColors: ['#58a6ff','#3fb950','#e3b341','#bc8cff','#f85149','#39d353','#ffd166','#ff79c6'],
};
const LIGHT_THEME = {
  bg: '#f6f8fa', surface: '#ffffff', surface2: '#f0f2f5',
  border: '#d0d7de', borderLight: '#e4e9f0',
  accent: '#1a7f37', accentHover: '#1d8f3e',
  text: '#1f2328', muted: '#636c76', dim: '#afb8c1',
  green: '#1a7f37', red: '#cf222e', blue: '#0550ae',
  purple: '#6639ba', orange: '#953800', yellow: '#9a6700', teal: '#116329',
  userBubble: '#1a7f37', userText: '#ffffff',
  areaColors: ['#0550ae','#1a7f37','#953800','#6639ba','#cf222e','#116329','#9a6700','#a40e26'],
};

const T = new Proxy({}, { get: (_, k) => (_isDark ? DARK_THEME : LIGHT_THEME)[k] });

export { DARK_THEME, LIGHT_THEME, T };
export const getIsDark = () => _isDark;
export const setIsDark = (v) => { _isDark = v; };
