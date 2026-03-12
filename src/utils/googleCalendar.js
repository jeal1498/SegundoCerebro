// ===================== GOOGLE CALENDAR INTEGRATION =====================
// OAuth 2.0 implicit flow — redirect mode (funciona en Chrome móvil)

const CLIENT_ID  = '247535277758-vuer2li51u07jljessg8r48hue049nur.apps.googleusercontent.com';
const SCOPES     = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_KEY  = 'sb_gcal_token';
const EXPIRY_KEY = 'sb_gcal_expiry';
const STATE_KEY  = 'sb_gcal_state';

// ── Token helpers ─────────────────────────────────────────────────────
function saveToken(token, expiresIn) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
  } catch {}
}

export function getToken() {
  try {
    const token  = localStorage.getItem(TOKEN_KEY);
    const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0');
    if (token && expiry > Date.now() + 60_000) return token;
    return null;
  } catch { return null; }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {}
}

export function isConnected() {
  return !!getToken();
}

// ── Redirect flow (mobile-safe) ───────────────────────────────────────
// Llama esto para iniciar OAuth — redirige a Google y vuelve a la app
export function connectGoogleCalendar() {
  const state = Math.random().toString(36).slice(2);
  try { localStorage.setItem(STATE_KEY, state); } catch {}

  const redirectUri = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  redirectUri,
    response_type: 'token',
    scope:         SCOPES,
    state,
    prompt:        'consent',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ── Procesar el callback OAuth al volver a la app ─────────────────────
// Llamar esto en App.jsx al montar. Retorna true si hubo token nuevo.
export function handleOAuthCallback() {
  try {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return false;

    const params     = new URLSearchParams(hash.replace('#', ''));
    const token      = params.get('access_token');
    const expiresIn  = parseInt(params.get('expires_in') || '3600');
    const state      = params.get('state');
    const savedState = localStorage.getItem(STATE_KEY);

    // Limpiar el hash de la URL para que no quede visible
    history.replaceState(null, '', window.location.pathname);
    localStorage.removeItem(STATE_KEY);

    if (!token) return false;
    // Validar state para prevenir CSRF (relajado: si no hay state guardado igual acepta)
    if (savedState && state !== savedState) return false;

    saveToken(token, expiresIn);
    return true;
  } catch { return false; }
}

// ── Crear evento en Google Calendar ──────────────────────────────────
export async function createCalendarEvent(reminder) {
  const token = getToken();
  if (!token) throw new Error('No conectado a Google Calendar');

  const start = new Date(reminder.fireAt);
  const end   = new Date(reminder.fireAt + (reminder.durationMinutes || 30) * 60_000);
  const tz    = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const event = {
    summary:     reminder.title,
    description: reminder.body || 'Recordatorio de Segundo Cerebro',
    start: { dateTime: start.toISOString(), timeZone: tz },
    end:   { dateTime: end.toISOString(),   timeZone: tz },
    reminders: {
      useDefault: false,
      overrides:  [
        { method: 'popup', minutes: 0  },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  // Agregar recurrencia si viene especificada (RRULE de RFC 5545)
  if (reminder.rrule) {
    event.recurrence = [reminder.rrule];
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(event),
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('Token expirado. Reconecta Google Calendar en Ajustes.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error ${res.status}`);
  }

  const data = await res.json();
  return { ok: true, eventId: data.id, htmlLink: data.htmlLink };
}
