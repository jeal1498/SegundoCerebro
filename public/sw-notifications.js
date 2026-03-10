// ===================== SW NOTIFICATIONS =====================
// Service worker dedicado a notificaciones locales programadas.
// Se registra junto al SW de Workbox. No interfiere con el caché.

const DB_NAME = 'sb_notifications';
const STORE   = 'reminders';

// ── IndexedDB helpers ──────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = () => rej(req.error);
  });
}

async function getReminders() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

async function saveReminder(reminder) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(reminder);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

async function deleteReminder(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ── Check and fire due notifications ──────────────────────
async function checkDue() {
  const now       = Date.now();
  const reminders = await getReminders();
  for (const r of reminders) {
    if (r.fireAt <= now) {
      await self.registration.showNotification(r.title, {
        body:  r.body  || '',
        icon:  r.icon  || '/icon-192.png',
        badge: r.badge || '/icon-192.png',
        tag:   r.id,
        data:  { id: r.id, url: r.url || '/' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
      });
      await deleteReminder(r.id);
    }
  }
}

// ── Service Worker lifecycle ───────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => {
  e.waitUntil(self.clients.claim());
  checkDue();
  // Poll every minute while SW is alive
  setInterval(checkDue, 60 * 1000);
});

// ── Message handler (from app) ────────────────────────────
self.addEventListener('message', async e => {
  const { type, reminder } = e.data || {};

  if (type === 'SCHEDULE') {
    await saveReminder(reminder);
    // Schedule a precise setTimeout for this reminder
    const delay = Math.max(0, reminder.fireAt - Date.now());
    if (delay < 24 * 60 * 60 * 1000) { // only within 24h
      setTimeout(async () => {
        const all = await getReminders();
        if (all.find(r => r.id === reminder.id)) {
          await self.registration.showNotification(reminder.title, {
            body:  reminder.body  || '',
            icon:  '/icon-192.png',
            badge: '/icon-192.png',
            tag:   reminder.id,
            data:  { id: reminder.id, url: reminder.url || '/' },
            vibrate: [200, 100, 200],
          });
          await deleteReminder(reminder.id);
        }
      }, delay);
    }
    e.ports?.[0]?.postMessage({ ok: true });
  }

  if (type === 'CANCEL') {
    await deleteReminder(reminder.id);
    e.ports?.[0]?.postMessage({ ok: true });
  }

  if (type === 'CHECK') {
    await checkDue();
    e.ports?.[0]?.postMessage({ ok: true });
  }

  if (type === 'LIST') {
    const all = await getReminders();
    e.ports?.[0]?.postMessage({ reminders: all });
  }
});

// ── Notification click → open app ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
