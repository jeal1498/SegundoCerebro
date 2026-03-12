// ===================== NOTIFICATIONS UTILITY =====================

const SW_URL = '/sw-notifications.js';
let _swReg   = null;
let _checkInterval = null;

// ── Registrar el SW ───────────────────────────────────────
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

// ── Guardar recordatorio en localStorage ──────────────────
function saveToStorage(reminder) {
  try {
    const stored = JSON.parse(localStorage.getItem('sb_reminders') || '[]');
    const updated = [...stored.filter(r => r.id !== reminder.id), reminder];
    localStorage.setItem('sb_reminders', JSON.stringify(updated));
  } catch {}
}

function removeFromStorage(id) {
  try {
    const stored = JSON.parse(localStorage.getItem('sb_reminders') || '[]');
    localStorage.setItem('sb_reminders', JSON.stringify(stored.filter(r => r.id !== id)));
  } catch {}
}

// ── Mostrar notificación nativa ───────────────────────────
async function showNow(reminder) {
  if (Notification.permission !== 'granted') return;
  try {
    const reg = _swReg || (await navigator.serviceWorker.getRegistration());
    if (reg) {
      await reg.showNotification(reminder.title, {
        body: reminder.body || 'Segundo Cerebro',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: reminder.id,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: reminder.url || '/' },
      });
    } else {
      new Notification(reminder.title, {
        body: reminder.body || 'Segundo Cerebro',
        icon: '/icon-192.png',
        tag: reminder.id,
      });
    }
  } catch (e) {
    console.warn('[Notifications] showNow failed:', e);
  }
}

// ── Verificar y disparar recordatorios vencidos ───────────
export async function checkDue() {
  if (Notification.permission !== 'granted') return;
  try {
    const now = Date.now();
    const stored = JSON.parse(localStorage.getItem('sb_reminders') || '[]');
    const due = stored.filter(r => r.fireAt && r.fireAt <= now);
    for (const r of due) {
      await showNow(r);
      removeFromStorage(r.id);
    }
  } catch {}
}

// ── Programar un recordatorio ─────────────────────────────
export async function scheduleNotification(reminder) {
  const perm = await requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'permission_denied' };

  saveToStorage(reminder);

  const delay = reminder.fireAt - Date.now();

  if (delay <= 0) {
    // Ya venció — mostrar ahora
    await showNow(reminder);
    removeFromStorage(reminder.id);
  } else if (delay < 30 * 60 * 1000) {
    // Menos de 30 min — setTimeout en el hilo principal (más confiable en Android)
    setTimeout(async () => {
      const stored = JSON.parse(localStorage.getItem('sb_reminders') || '[]');
      if (stored.find(r => r.id === reminder.id)) {
        await showNow(reminder);
        removeFromStorage(reminder.id);
      }
    }, delay);
  }
  // Para tiempos largos: checkDue() al volver a la app lo disparará

  return { ok: true };
}

// ── Cancelar ──────────────────────────────────────────────
export async function cancelNotification(id) {
  removeFromStorage(id);
  return { ok: true };
}

// ── Listar pendientes ─────────────────────────────────────
export async function listReminders() {
  try {
    return JSON.parse(localStorage.getItem('sb_reminders') || '[]');
  } catch {
    return [];
  }
}

// ── Chequear al volver al foco (visibilitychange) ─────────
export function startFocusCheck() {
  // Chequear al volver a la app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkDue();
  });
  // Polling cada 30 segundos mientras la app está abierta
  if (_checkInterval) clearInterval(_checkInterval);
  _checkInterval = setInterval(checkDue, 30 * 1000);
}

// ── checkOnFocus (alias para App.jsx) ─────────────────────
export async function checkOnFocus() {
  await checkDue();
}

// ── Parser de tiempo en texto ─────────────────────────────
export function parseReminderTime(str) {
  // Eliminar patrones de fecha dd/mm/yyyy o yyyy-mm-dd para no confundir con horas
  const cleaned = str.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').replace(/\d{4}-\d{2}-\d{2}/g, '').trim();
  const s = cleaned.toLowerCase();
  const now = new Date();

  // Detectar "tarde" o "noche" como indicador de PM
  const esTarde = /tarde|noche|pm/.test(s);
  const esManana2 = /ma[ñn]ana|morning|am/.test(s) && !esTarde;

  // "hoy a las X:XX am/pm/tarde"
  const todayMatch = s.match(/hoy.*?(?:las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (todayMatch) {
    const d = new Date();
    let h = parseInt(todayMatch[1]);
    const m = parseInt(todayMatch[2] || '0');
    const meridiem = todayMatch[3] || (esTarde ? 'pm' : '');
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    return { fireAt: d.getTime() };
  }

  // "mañana a las X:XX am/pm"
  const tmrMatch = s.match(/ma[ñn]ana.*?(?:las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (tmrMatch) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    let h = parseInt(tmrMatch[1]);
    const m = parseInt(tmrMatch[2] || '0');
    const meridiem = tmrMatch[3] || (esTarde ? 'pm' : '');
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    return { fireAt: d.getTime() };
  }

  // "en X minutos"
  const minsMatch = s.match(/en\s+(\d+)\s*min/);
  if (minsMatch) {
    return { fireAt: Date.now() + parseInt(minsMatch[1]) * 60 * 1000 };
  }

  // "en X horas"
  const hrsMatch = s.match(/en\s+(\d+)\s*hora/);
  if (hrsMatch) {
    return { fireAt: Date.now() + parseInt(hrsMatch[1]) * 60 * 60 * 1000 };
  }

  // "cada X a las HH:mm" — extrae solo la hora para el primer evento (hoy o mañana)
  const cadaMatch = s.match(/cada.*?(?:las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (cadaMatch) {
    const d = new Date();
    let h = parseInt(cadaMatch[1]);
    const m = parseInt(cadaMatch[2] || '0');
    const esTardeRec = /tarde|noche|pm/.test(s);
    const meridiem = cadaMatch[3] || (esTardeRec ? 'pm' : '');
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1); // si ya pasó hoy, empezar mañana
    return { fireAt: d.getTime() };
  }

  // ISO date o parseable
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { fireAt: parsed.getTime() };
  }

  return null;
}
