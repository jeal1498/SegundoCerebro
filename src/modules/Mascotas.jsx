import React, { useState, useMemo } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today, fmt } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Card, PageHeader } from '../components/ui/index.jsx';

// ===================== MASCOTAS =====================
const Mascotas = ({ data, setData, isMobile }) => {
  const PET_TYPES = ['🐶 Perro','🐱 Gato','🐦 Ave','🐠 Pez','🐹 Roedor','🐢 Reptil','🐇 Conejo','Otro'];
  const VAC_STATUS = [
    { id: 'pending',   label: 'Pendiente', color: T.orange },
    { id: 'done',      label: 'Aplicada',  color: T.green },
    { id: 'scheduled', label: 'Agendada',  color: T.blue },
  ];

  const emptyPet = { name: '', type: '🐶 Perro', breed: '', birthDate: '', weight: '', color: '', notes: '' };
  const emptyVac = { petId: '', name: '', date: '', nextDate: '', status: 'done', clinic: '', cost: '', notes: '' };
  const emptyVet = { petId: '', date: today(), reason: '', clinic: '', vet: '', diagnosis: '', treatment: '', cost: '', nextVisit: '', notes: '' };
  const emptyFeed = { petId: '', time: '08:00', food: '', amount: '', frequency: 'daily' };

  const [petModal,  setPetModal]  = useState(false);
  const [vacModal,  setVacModal]  = useState(false);
  const [vetModal,  setVetModal]  = useState(false);
  const [tab,       setTab]       = useState('pets');
  const [selPet,    setSelPet]    = useState(null);
  const [editPet,   setEditPet]   = useState(null);
  const [petForm,   setPetForm]   = useState(emptyPet);
  const [vacForm,   setVacForm]   = useState(emptyVac);
  const [vetForm,   setVetForm]   = useState(emptyVet);

  const pets      = data.pets         || [];
  const vaccines  = data.petVaccines  || [];
  const vetVisits = data.petVetVisits || [];

  const activePet = selPet ? pets.find(p => p.id === selPet) : pets[0];

  const savePet = (isEdit = false) => {
    if (!petForm.name.trim()) return;
    const p = { ...petForm, id: isEdit ? editPet.id : uid(), createdAt: isEdit ? (editPet.createdAt || today()) : today() };
    const upd = isEdit ? pets.map(x => x.id === p.id ? p : x) : [p, ...pets];
    setData(d => ({ ...d, pets: upd }));
    save('pets', upd);
    setPetModal(false); setEditPet(null); setPetForm(emptyPet);
    if (!isEdit) setSelPet(p.id);
  };

  const delPet = (id) => {
    if (!window.confirm('¿Eliminar esta mascota y todos sus registros?')) return;
    const upd = pets.filter(p => p.id !== id);
    const updVac = vaccines.filter(v => v.petId !== id);
    const updVet = vetVisits.filter(v => v.petId !== id);
    setData(d => ({ ...d, pets: upd, petVaccines: updVac, petVetVisits: updVet }));
    save('pets', upd); save('petVaccines', updVac); save('petVetVisits', updVet);
    setSelPet(upd[0]?.id || null);
  };

  const saveVac = () => {
    if (!vacForm.name.trim() || !activePet) return;
    const v = { ...vacForm, petId: activePet.id, id: uid(), createdAt: today() };
    const upd = [v, ...vaccines];
    setData(d => ({ ...d, petVaccines: upd }));
    save('petVaccines', upd);
    setVacModal(false); setVacForm(emptyVac);
  };

  const saveVet = () => {
    if (!vetForm.reason.trim() || !activePet) return;
    const v = { ...vetForm, petId: activePet.id, id: uid() };
    const upd = [v, ...vetVisits];
    setData(d => ({ ...d, petVetVisits: upd }));
    save('petVetVisits', upd);
    setVetModal(false); setVetForm(emptyVet);
  };

  const petVacs  = activePet ? vaccines.filter(v => v.petId === activePet.id)  : [];
  const petVisits= activePet ? vetVisits.filter(v => v.petId === activePet.id) : [];

  const age = (birthDate) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor(diff / (30.44 * 24 * 3600 * 1000));
    return years >= 1 ? `${years} año${years > 1 ? 's' : ''}` : `${months} mes${months !== 1 ? 'es' : ''}`;
  };

  const nextVac = petVacs.filter(v => v.nextDate).sort((a, b) => a.nextDate > b.nextDate ? 1 : -1)[0];

  return (
    <div>
      <PageHeader title="Mascotas" subtitle="Salud, vacunas y visitas veterinarias." isMobile={isMobile}
        action={<Btn size="sm" onClick={() => { setEditPet(null); setPetForm(emptyPet); setPetModal(true); }}><Icon name="plus" size={14} /> Mascota</Btn>} />

      {pets.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
          <div style={{ color: T.muted, fontSize: 15, fontWeight: 600 }}>Sin mascotas registradas</div>
          <div style={{ color: T.dim, fontSize: 13, marginTop: 6 }}>Agrega tu primera mascota para empezar a llevar su historial</div>
          <Btn style={{ marginTop: 16 }} onClick={() => { setEditPet(null); setPetForm(emptyPet); setPetModal(true); }}>
            🐾 Agregar mascota
          </Btn>
        </Card>
      ) : (
        <>
          {/* Pet selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {pets.map(p => (
              <button key={p.id} onClick={() => setSelPet(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, border: `1px solid ${(selPet === p.id || (!selPet && p === pets[0])) ? T.accent : T.border}`, background: (selPet === p.id || (!selPet && p === pets[0])) ? `${T.accent}15` : T.surface, color: (selPet === p.id || (!selPet && p === pets[0])) ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 18 }}>{p.type?.split(' ')[0] || '🐾'}</span>
                {p.name}
              </button>
            ))}
          </div>

          {/* Active pet card */}
          {activePet && (
            <Card style={{ marginBottom: 16, borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {activePet.type?.split(' ')[0] || '🐾'}
                  </div>
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 18 }}>{activePet.name}</div>
                    <div style={{ color: T.muted, fontSize: 13 }}>{activePet.type}{activePet.breed ? ` · ${activePet.breed}` : ''}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      {activePet.birthDate && <span style={{ fontSize: 12, color: T.dim }}>🎂 {age(activePet.birthDate)}</span>}
                      {activePet.weight && <span style={{ fontSize: 12, color: T.dim }}>⚖️ {activePet.weight} kg</span>}
                      {activePet.color && <span style={{ fontSize: 12, color: T.dim }}>🎨 {activePet.color}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditPet(activePet); setPetForm({ ...emptyPet, ...activePet }); setPetModal(true); }}
                    style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: T.muted, fontSize: 12, fontFamily: 'inherit' }}>✏️</button>
                  <button onClick={() => delPet(activePet.id)}
                    style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
              {nextVac && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: `${T.orange}12`, border: `1px solid ${T.orange}30`, borderRadius: 10 }}>
                  <span style={{ fontSize: 12, color: T.orange }}>💉 Próxima vacuna: <strong>{nextVac.name}</strong> · {nextVac.nextDate}</span>
                </div>
              )}
              {activePet.notes && <p style={{ color: T.muted, fontSize: 12, margin: '12px 0 0', fontStyle: 'italic' }}>{activePet.notes}</p>}
            </Card>
          )}

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[
              { id: 'vaccines', label: '💉 Vacunas', count: petVacs.length },
              { id: 'vet',      label: '🏥 Veterinario', count: petVisits.length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${tab === t.id ? T.accent : T.border}`, background: tab === t.id ? `${T.accent}15` : 'transparent', color: tab === t.id ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.id ? 600 : 400 }}>
                {t.label} {t.count > 0 && <span style={{ fontSize: 10, background: `${T.accent}25`, borderRadius: 8, padding: '1px 5px' }}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Vaccines tab */}
          {tab === 'vaccines' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <Btn size="sm" onClick={() => { setVacForm({ ...emptyVac, petId: activePet?.id || '' }); setVacModal(true); }}>
                  <Icon name="plus" size={14} /> Vacuna
                </Btn>
              </div>
              {petVacs.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💉</div>
                  <div style={{ color: T.muted, fontSize: 13 }}>Sin vacunas registradas</div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {petVacs.map(v => {
                    const st = VAC_STATUS.find(s => s.id === v.status) || VAC_STATUS[0];
                    return (
                      <Card key={v.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>💉 {v.name}</span>
                              <span style={{ fontSize: 10, color: st.color, background: `${st.color}15`, padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>{st.label}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                              {v.date && <span style={{ fontSize: 12, color: T.muted }}>📅 Aplicada: {v.date}</span>}
                              {v.nextDate && <span style={{ fontSize: 12, color: T.orange }}>🔔 Próxima: {v.nextDate}</span>}
                            </div>
                            {v.clinic && <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>🏥 {v.clinic}{v.cost ? ` · $${v.cost}` : ''}</div>}
                          </div>
                          <button onClick={() => { const upd = vaccines.filter(x => x.id !== v.id); setData(d => ({ ...d, petVaccines: upd })); save('petVaccines', upd); }}
                            style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 2 }}><Icon name="trash" size={14} /></button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Vet visits tab */}
          {tab === 'vet' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <Btn size="sm" onClick={() => { setVetForm({ ...emptyVet, petId: activePet?.id || '' }); setVetModal(true); }}>
                  <Icon name="plus" size={14} /> Visita
                </Btn>
              </div>
              {petVisits.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
                  <div style={{ color: T.muted, fontSize: 13 }}>Sin visitas registradas</div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {petVisits.map(v => (
                    <Card key={v.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>🏥 {v.reason}</div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: T.muted }}>📅 {v.date}</span>
                            {v.clinic && <span style={{ fontSize: 12, color: T.muted }}>{v.clinic}</span>}
                            {v.vet && <span style={{ fontSize: 12, color: T.muted }}>Dr. {v.vet}</span>}
                            {v.cost && <span style={{ fontSize: 12, color: T.orange }}>💰 ${v.cost}</span>}
                          </div>
                          {v.diagnosis && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}><strong>Diagnóstico:</strong> {v.diagnosis}</div>}
                          {v.treatment && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}><strong>Tratamiento:</strong> {v.treatment}</div>}
                          {v.nextVisit && <div style={{ fontSize: 12, color: T.blue, marginTop: 4 }}>🔔 Próxima cita: {v.nextVisit}</div>}
                        </div>
                        <button onClick={() => { const upd = vetVisits.filter(x => x.id !== v.id); setData(d => ({ ...d, petVetVisits: upd })); save('petVetVisits', upd); }}
                          style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: 2 }}><Icon name="trash" size={14} /></button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Pet modal */}
      <Modal open={petModal} onClose={() => { setPetModal(false); setEditPet(null); setPetForm(emptyPet); }}
        title={editPet ? '✏️ Editar mascota' : '🐾 Nueva mascota'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Nombre *" value={petForm.name} onChange={e => setPetForm(f => ({ ...f, name: e.target.value }))} placeholder="¿Cómo se llama?" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Tipo" value={petForm.type} onChange={e => setPetForm(f => ({ ...f, type: e.target.value }))}>
              {PET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input label="Raza" value={petForm.breed} onChange={e => setPetForm(f => ({ ...f, breed: e.target.value }))} placeholder="Ej. Golden Retriever" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha de nacimiento" value={petForm.birthDate} onChange={e => setPetForm(f => ({ ...f, birthDate: e.target.value }))} type="date" />
            <Input label="Peso (kg)" value={petForm.weight} onChange={e => setPetForm(f => ({ ...f, weight: e.target.value }))} type="number" step="0.1" />
          </div>
          <Input label="Color / apariencia" value={petForm.color} onChange={e => setPetForm(f => ({ ...f, color: e.target.value }))} placeholder="Café con manchas blancas" />
          <Textarea label="Notas" value={petForm.notes} onChange={e => setPetForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Alergias, temperamento, cuidados especiales..." />
          <Btn onClick={() => savePet(!!editPet)}>{editPet ? '💾 Guardar' : '🐾 Agregar'}</Btn>
        </div>
      </Modal>

      {/* Vaccine modal */}
      <Modal open={vacModal} onClose={() => { setVacModal(false); setVacForm(emptyVac); }} title="💉 Registrar vacuna">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Nombre de la vacuna *" value={vacForm.name} onChange={e => setVacForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Rabia, Moquillo..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha aplicada" value={vacForm.date} onChange={e => setVacForm(f => ({ ...f, date: e.target.value }))} type="date" />
            <Input label="Próxima dosis" value={vacForm.nextDate} onChange={e => setVacForm(f => ({ ...f, nextDate: e.target.value }))} type="date" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Estado" value={vacForm.status} onChange={e => setVacForm(f => ({ ...f, status: e.target.value }))}>
              {VAC_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Input label="Costo" value={vacForm.cost} onChange={e => setVacForm(f => ({ ...f, cost: e.target.value }))} type="number" placeholder="0" />
          </div>
          <Input label="Clínica / veterinario" value={vacForm.clinic} onChange={e => setVacForm(f => ({ ...f, clinic: e.target.value }))} placeholder="Nombre de la clínica" />
          <Btn onClick={saveVac}>💉 Registrar vacuna</Btn>
        </div>
      </Modal>

      {/* Vet visit modal */}
      <Modal open={vetModal} onClose={() => { setVetModal(false); setVetForm(emptyVet); }} title="🏥 Nueva visita veterinaria">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Motivo de la visita *" value={vetForm.reason} onChange={e => setVetForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ej. Revisión anual, vacuna, lesión..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Fecha" value={vetForm.date} onChange={e => setVetForm(f => ({ ...f, date: e.target.value }))} type="date" />
            <Input label="Costo ($)" value={vetForm.cost} onChange={e => setVetForm(f => ({ ...f, cost: e.target.value }))} type="number" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Clínica" value={vetForm.clinic} onChange={e => setVetForm(f => ({ ...f, clinic: e.target.value }))} placeholder="Nombre de la clínica" />
            <Input label="Veterinario" value={vetForm.vet} onChange={e => setVetForm(f => ({ ...f, vet: e.target.value }))} placeholder="Nombre del doctor" />
          </div>
          <Textarea label="Diagnóstico" value={vetForm.diagnosis} onChange={e => setVetForm(f => ({ ...f, diagnosis: e.target.value }))} rows={2} />
          <Textarea label="Tratamiento" value={vetForm.treatment} onChange={e => setVetForm(f => ({ ...f, treatment: e.target.value }))} rows={2} />
          <Input label="Próxima cita" value={vetForm.nextVisit} onChange={e => setVetForm(f => ({ ...f, nextVisit: e.target.value }))} type="date" />
          <Btn onClick={saveVet}>🏥 Guardar visita</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default Mascotas;
