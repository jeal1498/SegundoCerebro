import React, { useState, useMemo } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Card, PageHeader } from '../components/ui/index.jsx';

// ===================== ENTRETENIMIENTO =====================
const Entretenimiento = ({ data, setData, isMobile }) => {
  const TYPES = [
    { id: 'movie',  label: 'Película', emoji: '🎬' },
    { id: 'series', label: 'Serie',    emoji: '📺' },
    { id: 'doc',    label: 'Documental', emoji: '🎥' },
  ];
  const STATUSES = [
    { id: 'want',     label: 'Pendiente', emoji: '🔖', color: T.blue },
    { id: 'watching', label: 'Viendo',    emoji: '▶️',  color: T.accent },
    { id: 'done',     label: 'Vista',     emoji: '✅',  color: T.green },
    { id: 'dropped',  label: 'Dejé',      emoji: '❌',  color: T.dim },
  ];
  const PLATFORMS = ['Netflix','Disney+','HBO Max','Prime Video','Apple TV+','Crunchyroll','YouTube','Otro'];

  const emptyForm = { title:'', type:'movie', status:'want', platform:'', genre:'', rating:0, seasons:'', currentSeason:'1', currentEp:'1', totalEps:'', synopsis:'', notes:'', year:'', addedAt:'' };

  const [modal,   setModal]   = useState(false);
  const [detail,  setDetail]  = useState(null);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState(emptyForm);
  const [filter,  setFilter]  = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search,  setSearch]  = useState('');

  const items = data.entertainment || [];

  const saveItem = (isEdit = false) => {
    if (!form.title.trim()) return;
    const item = {
      ...form,
      id: isEdit ? detail.id : uid(),
      rating: Number(form.rating) || 0,
      addedAt: isEdit ? (detail.addedAt || today()) : today(),
    };
    const upd = isEdit ? items.map(x => x.id === item.id ? item : x) : [item, ...items];
    setData(d => ({ ...d, entertainment: upd }));
    save('entertainment', upd);
    setModal(false); setEditing(false);
    setDetail(item);
    setForm(emptyForm);
  };

  const del = (id) => {
    if (!window.confirm('¿Eliminar este título?')) return;
    const upd = items.filter(x => x.id !== id);
    setData(d => ({ ...d, entertainment: upd }));
    save('entertainment', upd);
    if (detail?.id === id) setDetail(null);
  };

  const openEdit = (item) => {
    setForm({ ...emptyForm, ...item });
    setEditing(true);
    setModal(true);
  };

  const visible = useMemo(() => {
    return items.filter(x => {
      if (filter !== 'all' && x.status !== filter) return false;
      if (typeFilter !== 'all' && x.type !== typeFilter) return false;
      if (search && !x.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, typeFilter, search]);

  const StarRating = ({ val, onChange }) => (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange && onChange(i === val ? 0 : i)}
          style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 2, color: i <= val ? T.orange : T.border }}>
          <Icon name={i <= val ? 'star' : 'starEmpty'} size={16} color={i <= val ? T.orange : T.border} />
        </button>
      ))}
    </div>
  );

  const StatusBadge = ({ status }) => {
    const s = STATUSES.find(x => x.id === status) || STATUSES[0];
    return (
      <span style={{ fontSize: 11, background: `${s.color}18`, color: s.color, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
        {s.emoji} {s.label}
      </span>
    );
  };

  const stats = useMemo(() => ({
    total:    items.length,
    watching: items.filter(x => x.status === 'watching').length,
    done:     items.filter(x => x.status === 'done').length,
    want:     items.filter(x => x.status === 'want').length,
  }), [items]);

  return (
    <div>
      <PageHeader title="Entretenimiento" subtitle="Películas, series y documentales." isMobile={isMobile}
        action={<Btn size="sm" onClick={() => { setEditing(false); setForm(emptyForm); setModal(true); }}><Icon name="plus" size={14} /> Agregar</Btn>} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total',    val: stats.total,    color: T.text,   emoji: '🎬' },
          { label: 'Viendo',   val: stats.watching, color: T.accent, emoji: '▶️' },
          { label: 'Vistas',   val: stats.done,     color: T.green,  emoji: '✅' },
          { label: 'Pendiente',val: stats.want,     color: T.blue,   emoji: '🔖' },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: 10 }}>
            <div style={{ fontSize: 16 }}>{s.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: T.muted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
          style={{ flex: 1, minWidth: 120, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px', color: T.text, fontSize: 13, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', ...TYPES.map(t => t.id)].map(id => {
            const t = TYPES.find(x => x.id === id);
            return (
              <button key={id} onClick={() => setTypeFilter(id)}
                style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${typeFilter === id ? T.accent : T.border}`, background: typeFilter === id ? `${T.accent}15` : 'transparent', color: typeFilter === id ? T.accent : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t ? t.emoji : '🎬'} {t ? t.label : 'Todo'}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...STATUSES.map(s => s.id)].map(id => {
          const s = STATUSES.find(x => x.id === id);
          return (
            <button key={id} onClick={() => setFilter(id)}
              style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${filter === id ? (s?.color || T.accent) : T.border}`, background: filter === id ? `${s?.color || T.accent}15` : 'transparent', color: filter === id ? (s?.color || T.accent) : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {s ? `${s.emoji} ${s.label}` : '📋 Todos'}
            </button>
          );
        })}
      </div>

      {/* Detail card */}
      {detail && items.find(x => x.id === detail.id) && (
        <Card style={{ marginBottom: 16, borderLeft: `3px solid ${T.accent}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>{TYPES.find(t => t.id === detail.type)?.emoji || '🎬'}</span>
                <span style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>{detail.title}</span>
                {detail.year && <span style={{ color: T.dim, fontSize: 12 }}>({detail.year})</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={detail.status} />
                {detail.platform && <span style={{ fontSize: 11, color: T.muted, background: T.surface2, padding: '2px 8px', borderRadius: 6 }}>{detail.platform}</span>}
                {detail.genre && <span style={{ fontSize: 11, color: T.muted }}>{detail.genre}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openEdit(detail)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: T.muted, fontSize: 12, fontFamily: 'inherit' }}>✏️</button>
              <button onClick={() => del(detail.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}><Icon name="trash" size={15} /></button>
            </div>
          </div>
          {detail.rating > 0 && <div style={{ marginBottom: 8 }}><StarRating val={detail.rating} /></div>}
          {detail.type === 'series' && (detail.currentSeason || detail.totalEps) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              {detail.currentSeason && <span style={{ fontSize: 12, color: T.muted }}>📺 Temporada {detail.currentSeason} · Ep {detail.currentEp || 1}</span>}
              {detail.totalEps && <span style={{ fontSize: 12, color: T.muted }}>Total: {detail.totalEps} eps</span>}
            </div>
          )}
          {detail.synopsis && <p style={{ color: T.muted, fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>{detail.synopsis}</p>}
          {detail.notes && <p style={{ color: T.muted, fontSize: 12, margin: '8px 0 0', fontStyle: 'italic', borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>{detail.notes}</p>}
        </Card>
      )}

      {/* Grid */}
      {visible.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
          <div style={{ color: T.muted, fontSize: 14 }}>Sin títulos aquí todavía</div>
          <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>Agrega películas y series para empezar</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(item => {
            const type = TYPES.find(t => t.id === item.type);
            const status = STATUSES.find(s => s.id === item.status);
            const isSelected = detail?.id === item.id;
            return (
              <Card key={item.id} onClick={() => setDetail(isSelected ? null : item)}
                style={{ cursor: 'pointer', border: `1px solid ${isSelected ? T.accent : T.border}`, transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${status?.color || T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {type?.emoji || '🎬'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: T.text, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                      {item.year && <span style={{ color: T.dim, fontSize: 11, flexShrink: 0 }}>({item.year})</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: status?.color, fontWeight: 600 }}>{status?.emoji} {status?.label}</span>
                      {item.platform && <span style={{ fontSize: 10, color: T.dim }}>· {item.platform}</span>}
                      {item.rating > 0 && <span style={{ fontSize: 10, color: T.orange }}>{'★'.repeat(item.rating)}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(false); setForm(emptyForm); }}
        title={editing ? '✏️ Editar título' : '🎬 Nuevo título'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre de la película o serie" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Tipo" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </Select>
            <Select label="Estado" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Plataforma" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
              <option value="">Sin plataforma</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input label="Año" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" type="number" />
          </div>
          <Input label="Género" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="Drama, Comedia, Thriller..." />
          {form.type === 'series' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Input label="Temporada actual" value={form.currentSeason} onChange={e => setForm(f => ({ ...f, currentSeason: e.target.value }))} type="number" />
              <Input label="Episodio actual" value={form.currentEp} onChange={e => setForm(f => ({ ...f, currentEp: e.target.value }))} type="number" />
              <Input label="Total episodios" value={form.totalEps} onChange={e => setForm(f => ({ ...f, totalEps: e.target.value }))} type="number" />
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Valoración</div>
            <StarRating val={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
          </div>
          <Textarea label="Sinopsis / descripción" value={form.synopsis} onChange={e => setForm(f => ({ ...f, synopsis: e.target.value }))} rows={3} placeholder="De qué trata..." />
          <Textarea label="Notas personales" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Tus impresiones, personajes favoritos..." />
          <Btn onClick={() => saveItem(editing)} style={{ marginTop: 4 }}>
            {editing ? '💾 Guardar cambios' : '🎬 Agregar título'}
          </Btn>
        </div>
      </Modal>
    </div>
  );
};

export default Entretenimiento;
