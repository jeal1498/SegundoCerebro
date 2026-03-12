// ===================== GOOGLE CALENDAR INTEGRATION =====================
// OAuth 2.0 implicit flow (browser-only, no backend needed)

const CLIENT_ID = '247535277758-vuer2li51u07jljessg8r48hue049nur.apps.googleusercontent.com';
const SCOPES    = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_KEY = 'sb_gcal_token';
const EXPIRY_KEY = 'sb_gcal_expiry';

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

// ── OAuth popup flow ──────────────────────────────────────────────────
export function connectGoogleCalendar() {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const state = Math.random().toString(36).slice(2);

    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  redirectUri,
      response_type: 'token',
      scope:         SCOPES,
      state,
      prompt:        'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const popup = window.open(authUrl, 'gcal_auth', 'width=500,height=600,left=100,top=100');

    if (!popup) {
      reject(new Error('Popup bloqueado. Permite popups para esta página.'));
      return;
    }

    // Listen for redirect back with token in hash
    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error('Ventana cerrada sin autorizar'));
          return;
        }
        const url = popup.location.href;
        if (url.includes('access_token')) {
          popup.close();
          clearInterval(interval);
          const hash = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
          const token     = hash.get('access_token');
          const expiresIn = parseInt(hash.get('expires_in') || '3600');
          if (token) {
            saveToken(token, expiresIn);
            resolve(token);
          } else {
            reject(new Error('No se recibió token de acceso'));
          }
        }
      } catch {
        // Cross-origin error while Google is processing — ignore and keep polling
      }
    }, 500);

    // Timeout after 3 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (!popup.closed) popup.close();
      reject(new Error('Tiempo de espera agotado'));
    }, 180_000);
  });
}

// ── Create Calendar Event ─────────────────────────────────────────────
// reminder: { title, body, fireAt (timestamp ms), durationMinutes? }
export async function createCalendarEvent(reminder) {
  let token = getToken();

  if (!token) {
    try {
      token = await connectGoogleCalendar();
    } catch (e) {
      throw new Error('No autenticado con Google Calendar: ' + e.message);
    }
  }

  const start = new Date(reminder.fireAt);
  const end   = new Date(reminder.fireAt + (reminder.durationMinutes || 30) * 60_000);

  const fmt = (d) => d.toISOString();

  const event = {
    summary:     reminder.title,
    description: reminder.body || 'Recordatorio de Segundo Cerebro',
    start:   { dateTime: fmt(start), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:     { dateTime: fmt(end),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    reminders: {
      useDefault: false,
      overrides:  [
        { method: 'popup',  minutes: 0 },
        { method: 'popup',  minutes: 10 },
      ],
    },
  };

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
