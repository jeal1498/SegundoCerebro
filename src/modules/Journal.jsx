import React, { useState, useMemo } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Card, PageHeader } from '../components/ui/index.jsx';

// ===================== JOURNAL =====================
const Journal = ({ data, setData, isMobile }) => {
  const MOODS = [
    { e: '😄', l: 'Genial' }, { e: '🙂', l: 'Bien' }, { e: '😐', l: 'Regular' },
    { e: '😔', l: 'Mal' },    { e: '😤', l: 'Estresado' },
  ];
  const MOMENT_CATEGORIES = [
    { id: 'viaje',     label: 'Viaje',      emoji: '✈️' },
    { id: 'familia',   label: 'Familia',    emoji: '👨‍👩‍👧' },
    { id: 'logro',     label: 'Logro',      emoji: '🏆' },
    { id: 'amistad',   label: 'Amigos',     emoji: '🤝' },
    { id: 'amor',      label: 'Amor',       emoji: '❤️' },
    { id: 'naturaleza',label: 'Naturaleza', emoji: '🌿' },
    { id: 'diversion', label: 'Diversión',  emoji: '🎉' },
    { id: 'otro',      label: 'Otro',       emoji: '⭐' },
  ];

  const [tab,       setTab]       = useState('diario');
  const [sel,       setSel]       = useState(null);
  const [writing,   setWriting]   = useState(false);
  const [form,      setForm]      = useState({ mood: '', content: '', gratitude: '', intention: '' });
  const [momentModal,  setMomentModal]  = useState(false);
  const [momentDetail, setMomentDetail] = useState(null);
  const [editMoment,   setEditMoment]   = useState(null);
  const [mFilter,   setMFilter]   = useState('all');
  const [mForm,     setMForm]     = useState({ title: '', description: '', date: today(), category: 'otro', people: [], emoji: '⭐', tags: '' });
  const [personInput, setPersonInput] = useState('');

  const todayStr   = today();
  const entries    = data.journal   || [];
  const moments    = data.moments   || [];
  const peopleList = data.people    || [];
  const todayEntry = entries.find(j => j.date === todayStr);

  // ── Journal save ───────────────────────────────────────────
  const saveEntry = () => {
    if (!form.content.trim() && !form.gratitude.trim()) return;
    const entry = { id: uid(), date: todayStr, mood: form.mood, content: form.content, gratitude: form.gratitude, intention: form.intention, createdAt: todayStr };
    const existing = entries.find(j => j.date === todayStr);
    const upd = existing ? entries.map(j => j.date === todayStr ? { ...j, ...form } : j) : [entry, ...entries];
    setData(d => ({ ...d, journal: upd }));
    save('journal', upd);
    setWriting(false); setSel(upd.find(j => j.date === todayStr) || entry);
  };

  const delEntry = (id) => {
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    const upd = entries.filter(j => j.id !== id);
    setData(d => ({ ...d, journal: upd }));
    save('journal', upd);
    if (sel?.id === id) setSel(null);
  };

  const openWrite = (entry) => {
    setForm(entry ? { mood: entry.mood || '', content: entry.content || '', gratitude: entry.gratitude || '', intention: entry.intention || '' } : { mood: '', content: '', gratitude: '', intention: '' });
    setWriting(true);
  };

  const streak = (() => {
    let s = 0, d = new Date();
    while (true) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!entries.find(j => j.date === ds)) break;
      s++; d.setDate(d.getDate() - 1);
    }
    return s;
  })();

  // ── Moments CRUD ───────────────────────────────────────────
  const saveMoment = (isEdit = false) => {
    if (!mForm.title.trim()) return;
    const m = {
      ...mForm, id: isEdit ? editMoment.id : uid(),
      createdAt: isEdit ? (editMoment.createdAt || today()) : today(),
      tags: typeof mForm.tags === 'string' ? mForm.tags.split(',').map(t => t.trim()).filter(Boolean) : mForm.tags,
    };
    const upd = isEdit ? moments.map(x => x.id === m.id ? m : x) : [m, ...moments];
    setData(d => ({ ...d, moments: upd }));
    save('moments', upd);
    setMomentModal(false); setEditMoment(null); setMForm({ title: '', description: '', date: today(), category: 'otro', people: [], emoji: '⭐', tags: '' });
    setMomentDetail(m);
  };

  const delMoment = (id) => {
    if (!window.confirm('¿Eliminar este momento?')) return;
    const upd = moments.filter(m => m.id !== id);
    setData(d => ({ ...d, moments: upd }));
    save('moments', upd);
    if (momentDetail?.id === id) setMomentDetail(null);
  };

  const togglePerson = (name) => {
    setMForm(f => ({
      ...f,
      people: f.people.includes(name) ? f.people.filter(p => p !== name) : [...f.people, name],
    }));
  };

  const visibleMoments = useMemo(() => {
    if (mFilter === 'all') return moments;
    return moments.filter(m => m.category === mFilter);
  }, [moments, mFilter]);

  return (
    <div>
      <PageHeader title="Journal" subtitle="Reflexión diaria y momentos que quieres recordar." isMobile={isMobile}
        action={
          tab === 'diario' ? (
            <Btn size="sm" onClick={() => openWrite(todayEntry)}>
              <Icon name="plus" size={14} />{todayEntry ? 'Editar hoy' : 'Escribir hoy'}
            </Btn>
          ) : (
            <Btn size="sm" onClick={() => { setEditMoment(null); setMForm({ title: '', description: '', date: today(), category: 'otro', people: [], emoji: '⭐', tags: '' }); setMomentModal(true); }}>
              <Icon name="plus" size={14} /> Momento
            </Btn>
          )
        } />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => setTab('diario')}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${tab === 'diario' ? T.purple : T.border}`, background: tab === 'diario' ? `${T.purple}15` : 'transparent', color: tab === 'diario' ? T.purple : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === 'diario' ? 600 : 400 }}>
          📔 Diario
        </button>
        <button onClick={() => setTab('momentos')}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${tab === 'momentos' ? T.accent : T.border}`, background: tab === 'momentos' ? `${T.accent}15` : 'transparent', color: tab === 'momentos' ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === 'momentos' ? 600 : 400 }}>
          ⭐ Momentos
        </button>
      </div>

      {/* ═══ DIARIO ═══ */}
      {tab === 'diario' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            <Card style={{ textAlign: 'center', padding: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.accent }}>{streak}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>🔥 Días seguidos</div>
            </Card>
            <Card style={{ textAlign: 'center', padding: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.purple }}>{entries.length}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>📖 Entradas</div>
            </Card>
            <Card style={{ textAlign: 'center', padding: 14 }}>
              <div style={{ fontSize: 22 }}>{todayEntry?.mood || '—'}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Hoy</div>
            </Card>
          </div>

          {/* Entry form */}
          {writing && (
            <Card style={{ marginBottom: 20, border: `1px solid ${T.accent}40` }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
                {todayEntry ? 'Editando entrada de hoy' : 'Nueva entrada · ' + new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>¿Cómo te sientes hoy?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOODS.map(m => (
                    <button key={m.e} onClick={() => setForm(f => ({ ...f, mood: m.e }))}
                      style={{ padding: '6px 12px', borderRadius: 10, border: `2px solid ${form.mood === m.e ? T.accent : T.border}`, background: form.mood === m.e ? `${T.accent}18` : 'transparent', cursor: 'pointer', fontSize: 18, transition: 'all 0.15s' }}>{m.e}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>Reflexión libre</div>
                <Textarea value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} placeholder="¿Qué pasó hoy? ¿Cómo te fue?..." rows={4} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>Agradecimiento</div>
                <Input value={form.gratitude} onChange={v => setForm(f => ({ ...f, gratitude: v }))} placeholder="Hoy estoy agradecido por..." />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>Intención para mañana</div>
                <Input value={form.intention} onChange={v => setForm(f => ({ ...f, intention: v }))} placeholder="Mañana quiero..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn onClick={saveEntry} style={{ flex: 1, justifyContent: 'center' }}>Guardar entrada</Btn>
                <Btn variant="ghost" onClick={() => setWriting(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Btn>
              </div>
            </Card>
          )}

          {/* Entry detail */}
          {sel && !writing && (
            <Card style={{ marginBottom: 20, borderLeft: `3px solid ${T.purple}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 20, marginRight: 8 }}>{sel.mood}</span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{new Date(sel.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openWrite(sel)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: T.muted, fontSize: 12, fontFamily: 'inherit' }}>✏️ Editar</button>
                  <button onClick={() => delEntry(sel.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', display: 'flex', padding: 4 }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
              {sel.content && <p style={{ color: T.text, fontSize: 14, lineHeight: 1.7, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{sel.content}</p>}
              {sel.gratitude && <div style={{ padding: '8px 12px', background: `${T.green}12`, borderRadius: 8, marginBottom: 8, color: T.green, fontSize: 13 }}>🙏 {sel.gratitude}</div>}
              {sel.intention && <div style={{ padding: '8px 12px', background: `${T.blue}12`, borderRadius: 8, color: T.blue, fontSize: 13 }}>🌅 {sel.intention}</div>}
            </Card>
          )}

          {/* Entries list */}
          <div>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Historial</div>
            {entries.length === 0 && <p style={{ color: T.dim, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin entradas aún. Empieza escribiendo hoy.</p>}
            {entries.map(j => (
              <div key={j.id} onClick={() => setSel(sel?.id === j.id ? null : j)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: sel?.id === j.id ? T.surface2 : T.surface, border: `1px solid ${sel?.id === j.id ? T.accent : T.border}`, borderRadius: 10, marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{j.mood || '📔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 500 }}>{new Date(j.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                  {j.content && <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{j.content.slice(0, 70)}{j.content.length > 70 ? '…' : ''}</div>}
                </div>
                <div style={{ flexShrink: 0, color: T.dim, fontSize: 11 }}>{fmt(j.date)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MOMENTOS ═══ */}
      {tab === 'momentos' && (
        <div>
          {/* Category filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
            <button onClick={() => setMFilter('all')}
              style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${mFilter === 'all' ? T.accent : T.border}`, background: mFilter === 'all' ? `${T.accent}15` : 'transparent', color: mFilter === 'all' ? T.accent : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              ⭐ Todos ({moments.length})
            </button>
            {MOMENT_CATEGORIES.map(c => {
              const cnt = moments.filter(m => m.category === c.id).length;
              if (cnt === 0) return null;
              return (
                <button key={c.id} onClick={() => setMFilter(c.id)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${mFilter === c.id ? T.accent : T.border}`, background: mFilter === c.id ? `${T.accent}15` : 'transparent', color: mFilter === c.id ? T.accent : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {c.emoji} {c.label} ({cnt})
                </button>
              );
            })}
          </div>

          {/* Moment detail */}
          {momentDetail && moments.find(m => m.id === momentDetail.id) && (
            <Card style={{ marginBottom: 16, borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 32 }}>{momentDetail.emoji}</span>
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>{momentDetail.title}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: T.muted }}>📅 {momentDetail.date}</span>
                      {momentDetail.category && (
                        <span style={{ fontSize: 11, color: T.accent, background: `${T.accent}15`, padding: '1px 8px', borderRadius: 6 }}>
                          {MOMENT_CATEGORIES.find(c => c.id === momentDetail.category)?.emoji} {MOMENT_CATEGORIES.find(c => c.id === momentDetail.category)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditMoment(momentDetail); setMForm({ ...momentDetail, tags: Array.isArray(momentDetail.tags) ? momentDetail.tags.join(', ') : momentDetail.tags || '' }); setMomentModal(true); }}
                    style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: T.muted, fontSize: 12, fontFamily: 'inherit' }}>✏️</button>
                  <button onClick={() => delMoment(momentDetail.id)}
                    style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
              {momentDetail.description && (
                <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.7, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{momentDetail.description}</p>
              )}
              {momentDetail.people?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: T.muted }}>👥</span>
                  {momentDetail.people.map((p, i) => (
                    <span key={i} style={{ fontSize: 12, background: T.surface2, border: `1px solid ${T.border}`, padding: '2px 10px', borderRadius: 12, color: T.muted }}>{p}</span>
                  ))}
                </div>
              )}
              {Array.isArray(momentDetail.tags) && momentDetail.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {momentDetail.tags.map((t, i) => (
                    <span key={i} style={{ fontSize: 11, color: T.accent, background: `${T.accent}10`, padding: '2px 8px', borderRadius: 10 }}>#{t}</span>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Moments list */}
          {visibleMoments.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
              <div style={{ color: T.muted, fontSize: 15, fontWeight: 600 }}>Sin momentos guardados</div>
              <div style={{ color: T.dim, fontSize: 13, marginTop: 6 }}>Guarda los momentos que no quieres olvidar: viajes, logros, risas...</div>
              <Btn style={{ marginTop: 16 }} onClick={() => { setEditMoment(null); setMForm({ title: '', description: '', date: today(), category: 'otro', people: [], emoji: '⭐', tags: '' }); setMomentModal(true); }}>
                ⭐ Guardar primer momento
              </Btn>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleMoments.map(m => {
                const cat = MOMENT_CATEGORIES.find(c => c.id === m.category);
                const isSelected = momentDetail?.id === m.id;
                return (
                  <Card key={m.id} onClick={() => setMomentDetail(isSelected ? null : m)}
                    style={{ cursor: 'pointer', border: `1px solid ${isSelected ? T.accent : T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                        {m.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: T.muted }}>📅 {m.date}</span>
                          {cat && <span style={{ fontSize: 11, color: T.dim }}>{cat.emoji} {cat.label}</span>}
                          {m.people?.length > 0 && <span style={{ fontSize: 11, color: T.dim }}>· 👥 {m.people.slice(0, 2).join(', ')}{m.people.length > 2 ? ` +${m.people.length - 2}` : ''}</span>}
                        </div>
                        {m.description && <div style={{ color: T.muted, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</div>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Moment modal */}
      <Modal open={momentModal} onClose={() => { setMomentModal(false); setEditMoment(null); }}
        title={editMoment ? '✏️ Editar momento' : '⭐ Nuevo momento inolvidable'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 10 }}>
            <Input label="Emoji" value={mForm.emoji} onChange={e => setMForm(f => ({ ...f, emoji: e.target.value }))} placeholder="⭐" />
            <Input label="Título *" value={mForm.title} onChange={e => setMForm(f => ({ ...f, title: e.target.value }))} placeholder="¿Cómo llamarías este momento?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha" value={mForm.date} onChange={e => setMForm(f => ({ ...f, date: e.target.value }))} type="date" />
            <Select label="Categoría" value={mForm.category} onChange={e => setMForm(f => ({ ...f, category: e.target.value }))}>
              {MOMENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </Select>
          </div>
          <Textarea label="Descripción" value={mForm.description} onChange={e => setMForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Describe este momento con detalle... ¿qué pasó? ¿cómo te sentiste? ¿qué lo hizo especial?" />

          {/* People */}
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>👥 ¿Con quién viviste este momento?</div>
            {peopleList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {peopleList.slice(0, 12).map(p => {
                  const selected = mForm.people.includes(p.name);
                  return (
                    <button key={p.id} onClick={() => togglePerson(p.name)}
                      style={{ padding: '4px 10px', borderRadius: 14, border: `1px solid ${selected ? T.accent : T.border}`, background: selected ? `${T.accent}15` : T.surface2, color: selected ? T.accent : T.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={personInput} onChange={e => setPersonInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && personInput.trim()) { setMForm(f => ({ ...f, people: f.people.includes(personInput.trim()) ? f.people : [...f.people, personInput.trim()] })); setPersonInput(''); } }}
                placeholder="Escribir nombre y presionar Enter..."
                style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px', color: T.text, fontSize: 12, fontFamily: 'inherit' }} />
            </div>
            {mForm.people.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {mForm.people.map((p, i) => (
                  <span key={i} onClick={() => setMForm(f => ({ ...f, people: f.people.filter((_, j) => j !== i) }))}
                    style={{ fontSize: 12, background: `${T.accent}15`, border: `1px solid ${T.accent}30`, color: T.muted, padding: '3px 8px', borderRadius: 8, cursor: 'pointer' }}>
                    {p} <span style={{ color: T.dim }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Input label="Tags (coma separados)" value={typeof mForm.tags === 'string' ? mForm.tags : (mForm.tags || []).join(', ')} onChange={e => setMForm(f => ({ ...f, tags: e.target.value }))} placeholder="playas, familia, risas..." />
          <Btn onClick={() => saveMoment(!!editMoment)}>{editMoment ? '💾 Guardar cambios' : '⭐ Guardar momento'}</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default Journal;
