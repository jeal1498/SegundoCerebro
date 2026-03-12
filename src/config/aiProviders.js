// ╔══════════════════════════════════════════════════════╗
// ║         AI PROVIDERS — SINGLE SOURCE OF TRUTH        ║
// ║  Para agregar un proveedor: agrega entrada al array  ║
// ╚══════════════════════════════════════════════════════╝

export const PROVIDERS = [
  // ── Gemini (prioridad 1: tier gratuito generoso) ──────
  {
    id: 'gemini',
    name: 'Gemini',
    label: 'Gemini Flash 2.0',
    keyStorage: 'sb_ai_key_gemini',
    model: 'gemini-2.0-flash',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Google AI Studio ↗',
    color: '#4285F4',
    buildRequest: (messages, systemPrompt, key) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || ' ' }],
          })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      },
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text,
    isQuotaError: (status, body) => {
      if (status !== 429) return false;
      const msg = (body?.error?.message || '').toLowerCase();
      return msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('exceeded');
    },
  },

  // ── OpenAI ────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    label: 'GPT-4o Mini',
    keyStorage: 'sb_ai_key_openai',
    model: 'gpt-4o-mini',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'platform.openai.com ↗',
    color: '#10a37f',
    buildRequest: (messages, systemPrompt, key) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 800,
      },
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
    isQuotaError: (status, body) => {
      if (status !== 429) return false;
      const msg = (body?.error?.message || '').toLowerCase();
      return msg.includes('quota') || msg.includes('day') || msg.includes('limit');
    },
  },

  // ── Anthropic ─────────────────────────────────────────
  {
    id: 'anthropic',
    name: 'Anthropic',
    label: 'Claude Haiku',
    keyStorage: 'sb_ai_key_anthropic',
    model: 'claude-haiku-4-5',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'console.anthropic.com ↗',
    color: '#d97706',
    buildRequest: (messages, systemPrompt, key) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: {
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: systemPrompt,
        messages: messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || ' ',
          })),
      },
    }),
    parseResponse: (data) => data.content?.[0]?.text,
    isQuotaError: (status, body) => {
      return status === 529 || (status === 429 && (body?.error?.type || '').includes('overloaded'));
    },
  },

  // ── Groq ──────────────────────────────────────────────
  {
    id: 'groq',
    name: 'Groq',
    label: 'LLaMA 3.1 (Groq)',
    keyStorage: 'sb_ai_key_groq',
    model: 'llama-3.1-8b-instant',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'console.groq.com ↗',
    color: '#f97316',
    buildRequest: (messages, systemPrompt, key) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 800,
      },
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
    isQuotaError: (status, _body) => status === 429,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Leer key de un proveedor desde localStorage */
export const getProviderKey = (providerId) => {
  const p = PROVIDERS.find(p => p.id === providerId);
  if (!p) return '';
  try { return localStorage.getItem(p.keyStorage)?.trim() || ''; } catch { return ''; }
};

/** Guardar/borrar key de un proveedor en localStorage y emitir evento */
export const setProviderKey = (providerId, key) => {
  const p = PROVIDERS.find(p => p.id === providerId);
  if (!p) return;
  try {
    if (key) localStorage.setItem(p.keyStorage, key.trim());
    else localStorage.removeItem(p.keyStorage);
  } catch {}
  // Notificar a App.jsx que el estado de keys cambió
  window.dispatchEvent(new CustomEvent('ai-key-changed'));
};

/** ¿Hay al menos un proveedor configurado? */
export const hasAnyKey = () => PROVIDERS.some(p => getProviderKey(p.id));

/** Primer proveedor activo (para mostrar en el header) */
export const getActiveProvider = () => PROVIDERS.find(p => getProviderKey(p.id)) || null;

/** Migrar keys legacy → nuevos nombres (ejecutar una vez al montar App) */
export const migrateLegacyKeys = () => {
  try {
    const oldGemini = localStorage.getItem('sb_gemini_key');
    if (oldGemini && !localStorage.getItem('sb_ai_key_gemini')) {
      localStorage.setItem('sb_ai_key_gemini', oldGemini);
    }
    const oldOpenAI = localStorage.getItem('psicke_openai_key');
    if (oldOpenAI && !localStorage.getItem('sb_ai_key_openai')) {
      localStorage.setItem('sb_ai_key_openai', oldOpenAI);
    }
  } catch {}
};

// ── Caller principal con fallback automático ───────────────────────────────

/**
 * Llama a los proveedores en orden. Si uno devuelve error de cuota,
 * pasa al siguiente automáticamente.
 *
 * @param {Array}    messages     - Array [{role, content}] sin system
 * @param {string}   systemPrompt - System prompt completo
 * @param {Function} onSwitch     - Callback opcional: (providerName) => void
 * @returns {Promise<{text: string, provider: string}>}
 */
export const callWithFallback = async (messages, systemPrompt, onSwitch) => {
  const errors = [];

  for (const provider of PROVIDERS) {
    const key = getProviderKey(provider.id);
    if (!key) continue; // sin key = saltar silenciosamente

    try {
      onSwitch?.(provider.name);

      const { url, headers, body } = provider.buildRequest(messages, systemPrompt, key);
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));

      // Cuota agotada → siguiente proveedor
      if (provider.isQuotaError(res.status, data)) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        errors.push(`${provider.name}: cuota agotada (${msg})`);
        console.warn(`[AI Fallback] ${provider.name} quota exhausted → next`);
        continue;
      }

      // Key inválida → siguiente proveedor (no reintentar)
      if (res.status === 401 || res.status === 403) {
        errors.push(`${provider.name}: API key inválida`);
        console.warn(`[AI Fallback] ${provider.name} invalid key → next`);
        continue;
      }

      // Error genérico → siguiente proveedor
      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        errors.push(`${provider.name}: ${msg}`);
        console.warn(`[AI Fallback] ${provider.name} error → next`);
        continue;
      }

      const text = provider.parseResponse(data);
      if (!text) throw new Error('Respuesta vacía del modelo');

      return { text, provider: provider.name };

    } catch (e) {
      errors.push(`${provider.name}: ${e.message}`);
      console.warn(`[AI Fallback] ${provider.name} threw:`, e.message);
    }
  }

  // Todos fallaron
  const hasConfigured = PROVIDERS.some(p => getProviderKey(p.id));
  if (!hasConfigured) {
    throw new Error('No hay ninguna API Key configurada. Ve a Ajustes → IA para agregar una.');
  }
  throw new Error(`Todos los proveedores fallaron:\n${errors.join('\n')}`);
};
