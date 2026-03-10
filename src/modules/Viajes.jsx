import React, { useState, useMemo } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Card, PageHeader } from '../components/ui/index.jsx';

// ===================== VIAJES =====================
const Viajes = ({ data, setData, isMobile }) => {
  const STATUSES = [
    { id: 'wishlist',  label: 'Lista de deseos', emoji: '🌟', color: T.purple },
    { id: 'planned',   label: 'Planificado',     emoji: '📅', color: T.blue },
    { id: 'done',      label: 'Visitado',        emoji: '✅', color: T.green },
  ];
  const TRANSPORT = ['✈️ Avión','🚗 Coche','🚌 Autobús','🚂 Tren','🚢 Barco','🏍️ Moto','Otro'];

  const emptyTrip = { destination: '', country: '', status: 'wishlist', startDate: '', endDate: '', transport: '', accommodation: '', budget: '', actualCost: '', notes: '', emoji: '✈️' };
  const emptyStop = { tripId: '', time: '', activity: '', place: '', address: '', notes: '', type: 'sightseeing' };
  const emptyExpense = { tripId: '', category: '', amount: '', currency: 'MXN', description: '', date: '' };

  const CHECKLIST_ITEMS = [
    { id: 'passport',   label: 'Pasaporte vigente',          category: 'doc' },
    { id: 'visa',       label: 'Visa (si aplica)',           category: 'doc' },
    { id: 'insurance',  label: 'Seguro de viaje',            category: 'doc' },
    { id: 'tickets',    label: 'Boletos / reservas',         category: 'doc' },
    { id: 'hotel',      label: 'Confirmación de hotel',      category: 'doc' },
    { id: 'clothes',    label: 'Ropa adecuada al clima',     category: 'maleta' },
    { id: 'toiletries', label: 'Artículos de higiene',       category: 'maleta' },
    { id: 'charger',    label: 'Cargadores y adaptadores',   category: 'maleta' },
    { id: 'meds',       label: 'Medicamentos necesarios',    category: 'maleta' },
    { id: 'cash',       label: 'Efectivo / tarjetas',        category: 'previo' },
    { id: 'notify',     label: 'Avisar al banco del viaje',  category: 'previo' },
    { id: 'plants',     label: 'Regar plantas / cuidado hogar', category: 'previo' },
    { id: 'locks',      label: 'Revisar puertas y ventanas', category: 'previo' },
  ];

  const [modal,     setModal]     = useState(false);
  const [tab,       setTab]       = useState('list');
  const [selTrip,   setSelTrip]   = useState(null);
  const [editTrip,  setEditTrip]  = useState(null);
  const [tripForm,  setTripForm]  = useState(emptyTrip);
  const [stopModal, setStopModal] = useState(false);
  const [stopForm,  setStopForm]  = useState(emptyStop);
  const [expModal,  setExpModal]  = useState(false);
  const [expForm,   setExpForm]   = useState(emptyExpense);
  const [filter,    setFilter]    = useState('all');

  const trips    = data.trips         || [];
  const stops    = data.tripStops     || [];
  const expenses = data.tripExpenses  || [];
  const checks   = data.tripChecklist || {};

  const activeTrip = selTrip ? trips.find(t => t.id === selTrip) : null;

  const saveTrip = (isEdit = false) => {
    if (!tripForm.destination.trim()) return;
    const t = { ...tripForm, id: isEdit ? editTrip.id : uid(), createdAt: isEdit ? (editTrip.createdAt || today()) : today() };
    const upd = isEdit ? trips.map(x => x.id === t.id ? t : x) : [t, ...trips];
    setData(d => ({ ...d, trips: upd }));
    save('trips', upd);
    setModal(false); setEditTrip(null); setTripForm(emptyTrip);
    if (!isEdit) { setSelTrip(t.id); setTab('detail'); }
  };

  const delTrip = (id) => {
    if (!window.confirm('¿Eliminar este viaje y todos sus datos?')) return;
    const upd = trips.filter(t => t.id !== id);
    setData(d => ({ ...d, trips: upd, tripStops: stops.filter(s => s.tripId !== id), tripExpenses: expenses.filter(e => e.tripId !== id) }));
    save('trips', upd);
    save('tripStops', stops.filter(s => s.tripId !== id));
    save('tripExpenses', expenses.filter(e => e.tripId !== id));
    setSelTrip(null); setTab('list');
  };

  const saveStop = () => {
    if (!stopForm.activity.trim()) return;
    const s = { ...stopForm, tripId: activeTrip.id, id: uid() };
    const upd = [...stops, s].sort((a, b) => (a.time || '') > (b.time || '') ? 1 : -1);
    setData(d => ({ ...d, tripStops: upd }));
    save('tripStops', upd);
    setStopModal(false); setStopForm(emptyStop);
  };

  const saveExpense = () => {
    if (!expForm.amount || !expForm.category) return;
    const e = { ...expForm, tripId: activeTrip.id, id: uid(), date: expForm.date || today() };
    const upd = [e, ...expenses];
    setData(d => ({ ...d, tripExpenses: upd }));
    save('tripExpenses', upd);
    setExpModal(false); setExpForm(emptyExpense);
  };

  const toggleCheck = (tripId, checkId) => {
    const key = `${tripId}_${checkId}`;
    const upd = { ...checks, [key]: !checks[key] };
    setData(d => ({ ...d, tripChecklist: upd }));
    save('tripChecklist', upd);
  };

  const tripStops    = activeTrip ? stops.filter(s => s.tripId === activeTrip.id)    : [];
  const tripExpenses = activeTrip ? expenses.filter(e => e.tripId === activeTrip.id) : [];

  const totalExpenses = tripExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCategory = tripExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + Number(e.amount); return acc; }, {});

  const visible = filter === 'all' ? trips : trips.filter(t => t.status === filter);

  const tripDays = (t) => {
    if (!t.startDate || !t.endDate) return null;
    const diff = (new Date(t.endDate) - new Date(t.startDate)) / (1000 * 3600 * 24);
    return Math.max(1, Math.round(diff) + 1);
  };

  return (
    <div>
      <PageHeader title="Viajes" subtitle="Planifica, explora y recuerda tus aventuras." isMobile={isMobile}
        action={<Btn size="sm" onClick={() => { setEditTrip(null); setTripForm(emptyTrip); setModal(true); }}><Icon name="plus" size={14} /> Viaje</Btn>} />

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => { setTab('list'); setSelTrip(null); }}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${tab === 'list' ? T.accent : T.border}`, background: tab === 'list' ? `${T.accent}15` : 'transparent', color: tab === 'list' ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === 'list' ? 600 : 400 }}>
          🗺️ Mis Viajes
        </button>
        {activeTrip && (
          <button onClick={() => setTab('detail')}
            style={{ flex: 2, padding: '8px', borderRadius: 10, border: `1px solid ${tab !== 'list' ? T.accent : T.border}`, background: tab !== 'list' ? `${T.accent}15` : 'transparent', color: tab !== 'list' ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab !== 'list' ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✈️ {activeTrip.destination}
          </button>
        )}
      </div>

      {/* Trip list */}
      {tab === 'list' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {['all', ...STATUSES.map(s => s.id)].map(id => {
              const s = STATUSES.find(x => x.id === id);
              return (
                <button key={id} onClick={() => setFilter(id)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${filter === id ? (s?.color || T.accent) : T.border}`, background: filter === id ? `${s?.color || T.accent}15` : 'transparent', color: filter === id ? (s?.color || T.accent) : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {s ? `${s.emoji} ${s.label}` : '🌍 Todos'}
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
              <div style={{ color: T.muted, fontSize: 15, fontWeight: 600 }}>Sin viajes registrados</div>
              <div style={{ color: T.dim, fontSize: 13, marginTop: 6 }}>Agrega destinos a tu lista de deseos o viajes planificados</div>
              <Btn style={{ marginTop: 16 }} onClick={() => { setEditTrip(null); setTripForm(emptyTrip); setModal(true); }}>✈️ Agregar viaje</Btn>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map(trip => {
                const st = STATUSES.find(s => s.id === trip.status) || STATUSES[0];
                const days = tripDays(trip);
                return (
                  <Card key={trip.id} onClick={() => { setSelTrip(trip.id); setTab('detail'); }}
                    style={{ cursor: 'pointer', borderLeft: `3px solid ${st.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 22 }}>{trip.emoji || '✈️'}</span>
                          <div>
                            <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{trip.destination}</div>
                            {trip.country && <div style={{ color: T.muted, fontSize: 12 }}>{trip.country}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: st.color, fontWeight: 600 }}>{st.emoji} {st.label}</span>
                          {trip.startDate && <span style={{ fontSize: 11, color: T.muted }}>📅 {trip.startDate}{trip.endDate ? ` → ${trip.endDate}` : ''}</span>}
                          {days && <span style={{ fontSize: 11, color: T.dim }}>{days} día{days !== 1 ? 's' : ''}</span>}
                          {trip.transport && <span style={{ fontSize: 11, color: T.dim }}>{trip.transport}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); delTrip(trip.id); }}
                        style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 4 }}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Trip detail */}
      {tab !== 'list' && activeTrip && (
        <>
          {/* Trip header */}
          <Card style={{ marginBottom: 14, borderLeft: `3px solid ${STATUSES.find(s => s.id === activeTrip.status)?.color || T.accent}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{activeTrip.emoji || '✈️'}</span>
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>{activeTrip.destination}</div>
                    {activeTrip.country && <div style={{ color: T.muted, fontSize: 13 }}>{activeTrip.country}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                  {activeTrip.startDate && <span style={{ fontSize: 12, color: T.muted }}>📅 {activeTrip.startDate}{activeTrip.endDate ? ` → ${activeTrip.endDate}` : ''}</span>}
                  {activeTrip.transport && <span style={{ fontSize: 12, color: T.muted }}>{activeTrip.transport}</span>}
                  {activeTrip.accommodation && <span style={{ fontSize: 12, color: T.muted }}>🏨 {activeTrip.accommodation}</span>}
                </div>
                {activeTrip.budget && (
                  <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
                    💰 Presupuesto: ${activeTrip.budget} | Gastado: ${totalExpenses.toFixed(0)}
                    {Number(activeTrip.budget) > 0 && (
                      <div style={{ marginTop: 4, background: T.border, borderRadius: 4, height: 4, width: 120 }}>
                        <div style={{ height: '100%', borderRadius: 4, background: totalExpenses > Number(activeTrip.budget) ? T.red : T.accent, width: `${Math.min(100, (totalExpenses / Number(activeTrip.budget)) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => { setEditTrip(activeTrip); setTripForm({ ...emptyTrip, ...activeTrip }); setModal(true); }}
                style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: T.muted, fontSize: 12, fontFamily: 'inherit' }}>✏️</button>
            </div>
          </Card>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto' }}>
            {[
              { id: 'itinerary', label: '📍 Itinerario' },
              { id: 'checklist', label: '✅ Checklist' },
              { id: 'expenses',  label: '💸 Gastos' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: '7px 8px', borderRadius: 10, border: `1px solid ${tab === t.id ? T.accent : T.border}`, background: tab === t.id ? `${T.accent}15` : 'transparent', color: tab === t.id ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: tab === t.id ? 600 : 400, whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Itinerary */}
          {tab === 'itinerary' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <Btn size="sm" onClick={() => { setStopForm(emptyStop); setStopModal(true); }}><Icon name="plus" size={14} /> Parada</Btn>
              </div>
              {tripStops.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
                  <div style={{ color: T.muted, fontSize: 13 }}>Sin paradas en el itinerario</div>
                  <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>Agrega actividades, visitas y restaurantes</div>
                </Card>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: T.border }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tripStops.map((s, i) => (
                      <div key={s.id} style={{ display: 'flex', gap: 12, paddingLeft: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.accent, border: `2px solid ${T.surface}`, flexShrink: 0, marginTop: 6, zIndex: 1 }} />
                        <Card style={{ flex: 1, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              {s.time && <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginBottom: 2 }}>🕐 {s.time}</div>}
                              <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{s.activity}</div>
                              {s.place && <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>📍 {s.place}</div>}
                              {s.address && <div style={{ color: T.dim, fontSize: 11, marginTop: 1 }}>🗺️ {s.address}</div>}
                              {s.notes && <div style={{ color: T.muted, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{s.notes}</div>}
                            </div>
                            <button onClick={() => { const upd = stops.filter(x => x.id !== s.id); setData(d => ({ ...d, tripStops: upd })); save('tripStops', upd); }}
                              style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 2 }}><Icon name="trash" size={13} /></button>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist */}
          {tab === 'checklist' && (
            <div>
              {['doc', 'maleta', 'previo'].map(cat => {
                const catItems = CHECKLIST_ITEMS.filter(c => c.category === cat);
                const catLabel = { doc: '📋 Documentación', maleta: '🧳 Maleta', previo: '🔑 Antes de salir' }[cat];
                const done = catItems.filter(c => checks[`${activeTrip.id}_${c.id}`]).length;
                return (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{catLabel}</div>
                      <span style={{ fontSize: 12, color: done === catItems.length ? T.green : T.muted }}>{done}/{catItems.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {catItems.map(c => {
                        const checked = !!checks[`${activeTrip.id}_${c.id}`];
                        return (
                          <button key={c.id} onClick={() => toggleCheck(activeTrip.id, c.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: checked ? `${T.green}10` : T.surface, border: `1px solid ${checked ? T.green : T.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? T.green : T.border}`, background: checked ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {checked && <Icon name="check" size={11} color="#000" />}
                            </div>
                            <span style={{ color: checked ? T.muted : T.text, fontSize: 13, textDecoration: checked ? 'line-through' : 'none' }}>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expenses */}
          {tab === 'expenses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>Total: ${totalExpenses.toFixed(2)}</div>
                  {activeTrip.budget && <div style={{ color: T.muted, fontSize: 12 }}>Presupuesto: ${activeTrip.budget}</div>}
                </div>
                <Btn size="sm" onClick={() => { setExpForm(emptyExpense); setExpModal(true); }}><Icon name="plus" size={14} /> Gasto</Btn>
              </div>
              {Object.keys(byCategory).length > 0 && (
                <Card style={{ marginBottom: 14, padding: 12 }}>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 600 }}>Por categoría</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(byCategory).map(([cat, amt]) => (
                      <div key={cat} style={{ fontSize: 12, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', color: T.muted }}>
                        {cat}: <strong style={{ color: T.text }}>${amt.toFixed(0)}</strong>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {tripExpenses.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
                  <div style={{ color: T.muted, fontSize: 13 }}>Sin gastos registrados</div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tripExpenses.map(e => (
                    <Card key={e.id} style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: T.text, fontSize: 13 }}>{e.description || e.category}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: T.muted }}>{e.category}</span>
                            {e.date && <span style={{ fontSize: 11, color: T.dim }}>· {e.date}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ color: T.orange, fontWeight: 700, fontSize: 15 }}>${e.amount}</span>
                          <button onClick={() => { const upd = expenses.filter(x => x.id !== e.id); setData(d => ({ ...d, tripExpenses: upd })); save('tripExpenses', upd); }}
                            style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 2 }}><Icon name="trash" size={13} /></button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Trip modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditTrip(null); setTripForm(emptyTrip); }}
        title={editTrip ? '✏️ Editar viaje' : '✈️ Nuevo viaje'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 10 }}>
            <Input label="🗺️" value={tripForm.emoji} onChange={e => setTripForm(f => ({ ...f, emoji: e.target.value }))} placeholder="✈️" />
            <Input label="Destino *" value={tripForm.destination} onChange={e => setTripForm(f => ({ ...f, destination: e.target.value }))} placeholder="Ej. Ciudad de México, París..." />
          </div>
          <Input label="País" value={tripForm.country} onChange={e => setTripForm(f => ({ ...f, country: e.target.value }))} placeholder="México" />
          <Select label="Estado" value={tripForm.status} onChange={e => setTripForm(f => ({ ...f, status: e.target.value }))}>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha de ida" value={tripForm.startDate} onChange={e => setTripForm(f => ({ ...f, startDate: e.target.value }))} type="date" />
            <Input label="Fecha de vuelta" value={tripForm.endDate} onChange={e => setTripForm(f => ({ ...f, endDate: e.target.value }))} type="date" />
          </div>
          <Select label="Transporte" value={tripForm.transport} onChange={e => setTripForm(f => ({ ...f, transport: e.target.value }))}>
            <option value="">Sin especificar</option>
            {TRANSPORT.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Alojamiento" value={tripForm.accommodation} onChange={e => setTripForm(f => ({ ...f, accommodation: e.target.value }))} placeholder="Hotel, Airbnb, casa de amigos..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Presupuesto ($)" value={tripForm.budget} onChange={e => setTripForm(f => ({ ...f, budget: e.target.value }))} type="number" />
            <Input label="Gasto real ($)" value={tripForm.actualCost} onChange={e => setTripForm(f => ({ ...f, actualCost: e.target.value }))} type="number" />
          </div>
          <Textarea label="Notas" value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Información importante del viaje..." />
          <Btn onClick={() => saveTrip(!!editTrip)}>{editTrip ? '💾 Guardar' : '✈️ Crear viaje'}</Btn>
        </div>
      </Modal>

      {/* Stop modal */}
      <Modal open={stopModal} onClose={() => { setStopModal(false); setStopForm(emptyStop); }} title="📍 Nueva parada">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Actividad *" value={stopForm.activity} onChange={e => setStopForm(f => ({ ...f, activity: e.target.value }))} placeholder="Visitar el museo, comer en..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Hora" value={stopForm.time} onChange={e => setStopForm(f => ({ ...f, time: e.target.value }))} type="time" />
            <Input label="Lugar" value={stopForm.place} onChange={e => setStopForm(f => ({ ...f, place: e.target.value }))} placeholder="Nombre del lugar" />
          </div>
          <Input label="Dirección / Google Maps" value={stopForm.address} onChange={e => setStopForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección o link de Maps" />
          <Textarea label="Notas" value={stopForm.notes} onChange={e => setStopForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Reservación, precio, tips..." />
          <Btn onClick={saveStop}>📍 Agregar parada</Btn>
        </div>
      </Modal>

      {/* Expense modal */}
      <Modal open={expModal} onClose={() => { setExpModal(false); setExpForm(emptyExpense); }} title="💸 Registrar gasto">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Categoría *" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))} placeholder="Comida, Transporte..." />
            <Input label="Monto *" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} type="number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Moneda" value={expForm.currency} onChange={e => setExpForm(f => ({ ...f, currency: e.target.value }))} placeholder="MXN" />
            <Input label="Fecha" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} type="date" />
          </div>
          <Input label="Descripción" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="¿En qué gastaste?" />
          <Btn onClick={saveExpense}>💸 Registrar gasto</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default Viajes;
