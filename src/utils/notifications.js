// ===================== NOTIFICATIONS UTILITY =====================
// Wrapper para notificaciones locales programadas vía SW dedicado.

const SW_URL = '/sw-notifications.js';
let _swReg   = null;

// ── Registrar el SW de notificaciones ────────────────────
export async function registerNotificationSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    _swReg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    return _swReg;
  } catch (e) {
    console.warn('[Notifications] SW registration failed:', e);
    return null;
  }
}

// ── Pedir permiso ─────────────────────────────────────────
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result;
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ── Enviar mensaje al SW ──────────────────────────────────
async function swMessage(payload) {
  if (!('serviceWorker' in navigator)) return null;
  const reg = _swReg || (await navigator.serviceWorker.getRegistration(SW_URL));
  const sw  = reg?.active || reg?.installing || reg?.waiting;
  if (!sw) return null;

  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = e => resolve(e.data);
    sw.postMessage(payload, [channel.port2]);
  });
}

// ── Programar una notificación ────────────────────────────
// reminder: { id, title, body, fireAt: timestamp_ms, url? }
export async function scheduleNotification(reminder) {
  const perm = await requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'permission_denied' };

  // Guardar en localStorage como backup legible
  try {
    const stored = JSON.parse(localStorage.getItem('sb_reminders') || '[]');
    const updated = [...stored.filter(r => r.id !== reminder.id), reminder];
    localStorage.setItem('sb_reminders', JSON.stringify(updated));
  } catch {}

  const result = await swMessage({ type: 'SCHEDULE', reminder });
  return result || { ok: false, reason: 'sw_unavailable' };
}

// ── Cancelar una notificación ─────────────────────────────
export async function cancelNotification(id) {
  try {
    const stored = JSON.parse(localStorage.getItem('sb_reminders') || '[]');
    localStorage.setItem('sb_reminders', JSON.stringify(stored.filter(r => r.id !== id)));
  } catch {}
  return swMessage({ type: 'CANCEL', reminder: { id } });
}

// ── Listar recordatorios pendientes ──────────────────────
export async function listReminders() {
  try {
    return JSON.parse(localStorage.getItem('sb_reminders') || '[]');
  } catch {
    return [];
  }
}

// ── Verificar al abrir la app (fallback: mostrar notif vencidas) ──
export async function checkOnFocus() {
  await swMessage({ type: 'CHECK' });
}

// ── Formato legible de fecha ──────────────────────────────
// Recibe una string como "mañana a las 9am", "el lunes", "15 de abril a las 8pm"
// Retorna { fireAt: timestamp } o null si no se puede parsear
export function parseReminderTime(str) {
  // Normalizamos para intentar parseo con Date
  const s = str.toLowerCase().trim();
  const now = new Date();

  // "mañana a las X"
  const tmrMatch = s.match(/ma[ñn]ana.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (tmrMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    let h = parseInt(tmrMatch[1]);
    const m = parseInt(tmrMatch[2] || '0');
    if (tmrMatch[3] === 'pm' && h < 12) h += 12;
    if (tmrMatch[3] === 'am' && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    return { fireAt: d.getTime() };
  }

  // "hoy a las X"
  const todayMatch = s.match(/hoy.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (todayMatch) {
    const d = new Date(now);
    let h = parseInt(todayMatch[1]);
    const m = parseInt(todayMatch[2] || '0');
    if (todayMatch[3] === 'pm' && h < 12) h += 12;
    if (todayMatch[3] === 'am' && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    return { fireAt: d.getTime() };
  }

  // ISO date or parseable
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { fireAt: parsed.getTime() };
  }

  return null;
}
