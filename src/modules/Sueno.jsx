import React, { useState, useMemo } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Card, PageHeader } from '../components/ui/index.jsx';

// ===================== SUEÑO =====================
const QUALITY_LABELS = ['', '😫 Muy malo', '😕 Malo', '😐 Regular', '😊 Bueno', '😄 Excelente'];
const HYGIENE_HABITS = [
  { id: 'noscreen',   label: 'Sin pantallas 1h antes',       emoji: '📵' },
  { id: 'nocaffeine', label: 'Sin cafeína tras las 16h',      emoji: '☕' },
  { id: 'dark',       label: 'Habitación oscura',             emoji: '🌑' },
  { id: 'cool',       label: 'Temperatura fresca',            emoji: '❄️' },
  { id: 'routine',    label: 'Rutina constante de sueño',     emoji: '🔄' },
  { id: 'relax',      label: 'Técnica de relajación',         emoji: '🧘' },
  { id: 'nolate',     label: 'En cama antes de medianoche',   emoji: '🕛' },
  { id: 'exercise',   label: 'Ejercicio durante el día',      emoji: '🏃' },
];
const DREAM_TYPES = ['Neutro','Positivo','Pesadilla','Lúcido','Recurrente'];

const Sueno = ({ data, setData, isMobile }) => {
  const [tab, setTab]             = useState('log');
  const [modal, setModal]         = useState(false);
  const [dreamModal, setDreamModal] = useState(false);
  const [editing, setEditing]     = useState(null);

  const emptyEntry = {
    date: today(), bedTime: '23:00', wakeTime: '07:00',
    hoursSlept: '', quality: 3, interruptions: '0',
    hygiene: [], notes: '',
  };
  const emptyDream = {
    date: today(), title: '', description: '', type: 'Neutro', emotions: '', tags: '',
  };

  const [form, setForm]           = useState(emptyEntry);
  const [dreamForm, setDreamForm] = useState(emptyDream);

  const entries = data.sleepLog    || [];
  const dreams  = data.dreamJournal || [];
  const goal    = data.healthGoals?.sueño || 8;

  // ── Auto-calc hours from bed/wake ──────────────────────
  const calcHours = (bed, wake) => {
    if (!bed || !wake) return '';
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(1);
  };

  const updateTime = (field, val, current) => {
    const next = { ...current, [field]: val };
    const hrs = calcHours(
      field === 'bedTime' ? val : current.bedTime,
      field === 'wakeTime' ? val : current.wakeTime,
    );
    return { ...next, hoursSlept: hrs };
  };

  // ── Save entry ─────────────────────────────────────────
  const saveEntry = (isEdit = false) => {
    const e = {
      ...form,
      id: isEdit ? editing.id : uid(),
      hoursSlept: Number(form.hoursSlept) || 0,
      interruptions: Number(form.interruptions) || 0,
      createdAt: isEdit ? (editing.createdAt || today()) : today(),
    };
    const upd = isEdit
      ? entries.map(x => x.id === e.id ? e : x)
      : [e, ...entries].sort((a, b) => b.date > a.date ? 1 : -1);
    setData(d => ({ ...d, sleepLog: upd }));
    save('sleepLog', upd);
    setModal(false); setEditing(null); setForm(emptyEntry);
  };

  const delEntry = (id) => {
    const upd = entries.filter(e => e.id !== id);
    setData(d => ({ ...d, sleepLog: upd }));
    save('sleepLog', upd);
  };

  const saveDream = () => {
    if (!dreamForm.description.trim()) return;
    const d = { ...dreamForm, id: uid() };
    const upd = [d, ...dreams];
    setData(dd => ({ ...dd, dreamJournal: upd }));
    save('dreamJournal', upd);
    setDreamModal(false); setDreamForm(emptyDream);
  };

  const delDream = (id) => {
    const upd = dreams.filter(d => d.id !== id);
    setData(dd => ({ ...dd, dreamJournal: upd }));
    save('dreamJournal', upd);
  };

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const last7 = entries.slice(0, 7);
    if (!last7.length) return null;
    const avgHrs  = last7.reduce((s, e) => s + (e.hoursSlept || 0), 0) / last7.length;
    const avgQual = last7.reduce((s, e) => s + (e.quality || 0), 0) / last7.length;
    const daysGoal= last7.filter(e => e.hoursSlept >= goal).length;
    const hygieneScore = last7.reduce((s, e) => s + (e.hygiene?.length || 0), 0) / (last7.length * HYGIENE_HABITS.length) * 100;
    return { avgHrs: avgHrs.toFixed(1), avgQual: avgQual.toFixed(1), daysGoal, hygieneScore: Math.round(hygieneScore), total: entries.length };
  }, [entries, goal]);

  // ── Quality color ──────────────────────────────────────
  const qualityColor = (q) => {
    if (q >= 4) return T.green;
    if (q >= 3) return T.accent;
    if (q >= 2) return T.orange;
    return T.red;
  };

  // ── Last 14 days chart ─────────────────────────────────
  const chartData = useMemo(() => {
    return entries.slice(0, 14).reverse().map(e => ({
      date: e.date?.slice(5),
      hrs: e.hoursSlept || 0,
      quality: e.quality || 0,
    }));
  }, [entries]);

  const maxHrs = Math.max(goal + 2, ...chartData.map(d => d.hrs), 1);

  return (
    <div>
      <PageHeader title="Sueño" subtitle="Registro de sueño, higiene y diario de sueños." isMobile={isMobile}
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant="ghost" onClick={() => { setDreamForm(emptyDream); setDreamModal(true); }}>💭 Sueño</Btn>
            <Btn size="sm" onClick={() => { setEditing(null); setForm(emptyEntry); setModal(true); }}><Icon name="plus" size={14} /> Registrar</Btn>
          </div>
        } />

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Promedio',  val: `${stats.avgHrs}h`, color: stats.avgHrs >= goal ? T.green : T.orange, emoji: '😴' },
            { label: 'Calidad',   val: `${stats.avgQual}/5`, color: qualityColor(Number(stats.avgQual)), emoji: '⭐' },
            { label: 'Meta lograda', val: `${stats.daysGoal}/7`, color: T.blue, emoji: '🎯' },
            { label: 'Higiene',   val: `${stats.hygieneScore}%`, color: T.purple, emoji: '✅' },
          ].map(s => (
            <Card key={s.label} style={{ textAlign: 'center', padding: 10 }}>
              <div style={{ fontSize: 18 }}>{s.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'log',     label: '📋 Registro' },
          { id: 'chart',   label: '📊 Tendencia' },
          { id: 'hygiene', label: '✅ Higiene' },
          { id: 'dreams',  label: '💭 Diario' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${tab === t.id ? T.accent : T.border}`, background: tab === t.id ? `${T.accent}15` : 'transparent', color: tab === t.id ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: tab === t.id ? 600 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ LOG ═══ */}
      {tab === 'log' && (
        entries.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😴</div>
            <div style={{ color: T.muted, fontSize: 15, fontWeight: 600 }}>Sin registros de sueño</div>
            <div style={{ color: T.dim, fontSize: 13, marginTop: 6 }}>Empieza a registrar tu sueño para ver tendencias</div>
            <Btn style={{ marginTop: 16 }} onClick={() => { setEditing(null); setForm(emptyEntry); setModal(true); }}>
              😴 Registrar primera noche
            </Btn>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(entry => {
              const qColor = qualityColor(entry.quality);
              const onGoal = entry.hoursSlept >= goal;
              return (
                <Card key={entry.id} style={{ borderLeft: `3px solid ${qColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ color: T.muted, fontSize: 12, fontWeight: 600 }}>📅 {entry.date}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: onGoal ? T.green : T.orange }}>
                          {entry.hoursSlept}h
                        </span>
                        <span style={{ fontSize: 13 }}>{QUALITY_LABELS[entry.quality] || ''}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {entry.bedTime && <span style={{ fontSize: 12, color: T.muted }}>🌙 {entry.bedTime}</span>}
                        {entry.wakeTime && <span style={{ fontSize: 12, color: T.muted }}>☀️ {entry.wakeTime}</span>}
                        {entry.interruptions > 0 && <span style={{ fontSize: 12, color: T.orange }}>⚡ {entry.interruptions} interrupciones</span>}
                        {entry.hygiene?.length > 0 && <span style={{ fontSize: 12, color: T.purple }}>✅ {entry.hygiene.length} hábitos</span>}
                      </div>
                      {entry.notes && <p style={{ color: T.dim, fontSize: 12, margin: '6px 0 0', fontStyle: 'italic' }}>{entry.notes}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditing(entry); setForm({ ...emptyEntry, ...entry, hygiene: entry.hygiene || [] }); setModal(true); }}
                        style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '3px 8px', cursor: 'pointer', color: T.muted, fontSize: 11, fontFamily: 'inherit' }}>✏️</button>
                      <button onClick={() => delEntry(entry.id)}
                        style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 3 }}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ═══ CHART ═══ */}
      {tab === 'chart' && (
        <div>
          {chartData.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ color: T.muted }}>Sin datos suficientes para mostrar tendencia</div>
            </Card>
          ) : (
            <Card style={{ padding: '16px 14px' }}>
              <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 16 }}>Últimas {chartData.length} noches</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, position: 'relative' }}>
                {/* Goal line */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(goal / maxHrs) * 100}%`, borderTop: `1px dashed ${T.accent}60`, zIndex: 1 }}>
                  <span style={{ fontSize: 9, color: T.accent, position: 'absolute', right: 0, top: -10 }}>meta {goal}h</span>
                </div>
                {chartData.map((d, i) => {
                  const pct = (d.hrs / maxHrs) * 100;
                  const qColor = qualityColor(d.quality);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: '100%', height: `${pct}%`, background: d.hrs >= goal ? T.green : T.orange, borderRadius: '4px 4px 0 0', opacity: 0.85, minHeight: 2, position: 'relative' }} title={`${d.date}: ${d.hrs}h, calidad ${QUALITY_LABELS[d.quality]}`} />
                      <div style={{ fontSize: 8, color: T.dim, transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{d.date}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: T.green }} />
                  <span style={{ fontSize: 11, color: T.muted }}>Cumple meta</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: T.orange }} />
                  <span style={{ fontSize: 11, color: T.muted }}>Bajo meta</span>
                </div>
              </div>
              {stats && (
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 12px', background: T.surface2, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: T.muted }}>Mejor racha</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.green, marginTop: 2 }}>
                      {(() => {
                        let best = 0, cur = 0;
                        [...entries].reverse().forEach(e => { if (e.hoursSlept >= goal) { cur++; best = Math.max(best, cur); } else cur = 0; });
                        return `${best} noches`;
                      })()}
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: T.surface2, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: T.muted }}>Total registrado</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 2 }}>{stats.total} noches</div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ═══ HYGIENE ═══ */}
      {tab === 'hygiene' && (
        <div>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            La higiene del sueño son hábitos que mejoran la calidad y duración de tu descanso. Puedes marcarlos al registrar cada noche.
          </div>
          {/* Habit stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HYGIENE_HABITS.map(h => {
              const last7 = entries.slice(0, 7);
              const done = last7.filter(e => e.hygiene?.includes(h.id)).length;
              const pct = last7.length ? Math.round((done / last7.length) * 100) : 0;
              return (
                <Card key={h.id} style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{h.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: T.text, fontSize: 13, fontWeight: 500, marginBottom: 5 }}>{h.label}</div>
                      <div style={{ background: T.border, borderRadius: 4, height: 5 }}>
                        <div style={{ height: '100%', borderRadius: 4, background: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red, width: `${pct}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: pct >= 70 ? T.green : pct >= 40 ? T.orange : T.red }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: T.dim }}>{done}/{last7.length} noches</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: '12px 16px', background: `${T.purple}10`, border: `1px solid ${T.purple}25`, borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: T.purple, fontWeight: 600, marginBottom: 4 }}>💡 Consejo</div>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
              Mejorar 2–3 hábitos de higiene del sueño durante 21 días seguidos puede aumentar tus horas de sueño profundo hasta en un 30%. Empieza por los más fáciles.
            </div>
          </div>
        </div>
      )}

      {/* ═══ DREAMS ═══ */}
      {tab === 'dreams' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Btn size="sm" onClick={() => { setDreamForm(emptyDream); setDreamModal(true); }}>
              <Icon name="plus" size={14} /> Registrar sueño
            </Btn>
          </div>
          {dreams.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💭</div>
              <div style={{ color: T.muted, fontSize: 14, fontWeight: 600 }}>Tu diario de sueños está vacío</div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 6 }}>Registra tus sueños justo al despertar para recordarlos mejor</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dreams.map(d => {
                const typeColors = { Positivo: T.green, Pesadilla: T.red, Lúcido: T.purple, Recurrente: T.orange, Neutro: T.muted };
                return (
                  <Card key={d.id} style={{ borderLeft: `3px solid ${typeColors[d.type] || T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ color: T.muted, fontSize: 11 }}>📅 {d.date}</span>
                          <span style={{ fontSize: 10, color: typeColors[d.type], background: `${typeColors[d.type]}15`, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>💭 {d.type}</span>
                        </div>
                        {d.title && <div style={{ color: T.text, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{d.title}</div>}
                        <p style={{ color: T.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{d.description}</p>
                        {d.emotions && <div style={{ color: T.dim, fontSize: 12, marginTop: 6 }}>🫀 {d.emotions}</div>}
                      </div>
                      <button onClick={() => delDream(d.id)}
                        style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 2, marginLeft: 8 }}><Icon name="trash" size={13} /></button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Entry modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); setForm(emptyEntry); }}
        title={editing ? '✏️ Editar registro' : '😴 Registrar noche'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Fecha" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} type="date" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Input label="Me dormí" value={form.bedTime}
              onChange={e => setForm(f => updateTime('bedTime', e.target.value, f))} type="time" />
            <Input label="Me desperté" value={form.wakeTime}
              onChange={e => setForm(f => updateTime('wakeTime', e.target.value, f))} type="time" />
            <Input label="Horas totales" value={form.hoursSlept}
              onChange={e => setForm(f => ({ ...f, hoursSlept: e.target.value }))} type="number" step="0.5" />
          </div>

          {/* Quality */}
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 600 }}>Calidad del sueño</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(q => (
                <button key={q} onClick={() => setForm(f => ({ ...f, quality: q }))}
                  style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: `1px solid ${form.quality === q ? qualityColor(q) : T.border}`, background: form.quality === q ? `${qualityColor(q)}20` : T.surface2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, color: form.quality === q ? qualityColor(q) : T.muted, fontWeight: form.quality === q ? 700 : 400, textAlign: 'center' }}>
                  {['😫','😕','😐','😊','😄'][q - 1]}<br />{q}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: qualityColor(form.quality), marginTop: 6, fontWeight: 600 }}>
              {QUALITY_LABELS[form.quality]}
            </div>
          </div>

          <Input label="Interrupciones (veces que te despertaste)" value={form.interruptions} onChange={e => setForm(f => ({ ...f, interruptions: e.target.value }))} type="number" />

          {/* Hygiene checklist */}
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 600 }}>Hábitos de higiene del sueño esta noche</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {HYGIENE_HABITS.map(h => {
                const checked = form.hygiene?.includes(h.id);
                return (
                  <button key={h.id} onClick={() => setForm(f => ({ ...f, hygiene: checked ? f.hygiene.filter(x => x !== h.id) : [...(f.hygiene || []), h.id] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: checked ? `${T.green}12` : T.surface2, border: `1px solid ${checked ? T.green : T.border}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? T.green : T.border}`, background: checked ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <Icon name="check" size={10} color="#000" />}
                    </div>
                    <span style={{ fontSize: 10, color: checked ? T.text : T.muted }}>{h.emoji} {h.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea label="Notas" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="¿Cómo te sientes? ¿Algo que influyó en tu sueño?" />
          <Btn onClick={() => saveEntry(!!editing)}>{editing ? '💾 Guardar cambios' : '😴 Registrar noche'}</Btn>
        </div>
      </Modal>

      {/* Dream modal */}
      <Modal open={dreamModal} onClose={() => { setDreamModal(false); setDreamForm(emptyDream); }} title="💭 Registrar sueño">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha" value={dreamForm.date} onChange={e => setDreamForm(f => ({ ...f, date: e.target.value }))} type="date" />
            <Select label="Tipo" value={dreamForm.type} onChange={e => setDreamForm(f => ({ ...f, type: e.target.value }))}>
              {DREAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <Input label="Título (opcional)" value={dreamForm.title} onChange={e => setDreamForm(f => ({ ...f, title: e.target.value }))} placeholder="Un nombre para este sueño..." />
          <Textarea label="Descripción *" value={dreamForm.description} onChange={e => setDreamForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="Describe lo que recuerdas... lugares, personas, sensaciones..." />
          <Input label="Emociones que sentiste" value={dreamForm.emotions} onChange={e => setDreamForm(f => ({ ...f, emotions: e.target.value }))} placeholder="Miedo, alegría, confusión, paz..." />
          <Btn onClick={saveDream}>💭 Guardar sueño</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default Sueno;
