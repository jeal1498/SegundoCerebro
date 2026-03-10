import React, { useState, useMemo, useCallback } from 'react';
import { T } from '../theme/tokens.js';
import { save } from '../storage/index.js';
import { uid, today } from '../utils/helpers.js';
import Icon from '../components/icons/Icon.jsx';
import { Modal, Input, Textarea, Select, Btn, Card, PageHeader } from '../components/ui/index.jsx';

// ===================== NUTRICIÓN =====================
const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const MEALS = [
  { id: 'desayuno', label: 'Desayuno',  emoji: '☀️', color: '#f59e0b' },
  { id: 'almuerzo', label: 'Almuerzo',  emoji: '🥗', color: '#10b981' },
  { id: 'comida',   label: 'Comida',    emoji: '🍽️', color: '#3b82f6' },
  { id: 'cena',     label: 'Cena',      emoji: '🌙', color: '#8b5cf6' },
];
const DIFFICULTY = ['Fácil','Media','Difícil'];
const CATEGORIES_RECIPE = ['Desayuno','Ensalada','Sopa','Pasta','Carne','Pescado','Vegetariano','Postre','Snack','Bebida','Otro'];

const Nutricion = ({ data, setData, isMobile }) => {
  const [tab, setTab]           = useState('menu');
  const [menuWeek, setMenuWeek] = useState(0); // 0=esta semana, -1=anterior, 1=próxima
  const [recipeModal, setRecipeModal]   = useState(false);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [editRecipe, setEditRecipe]     = useState(null);
  const [assignModal, setAssignModal]   = useState(null); // {day, meal}
  const [ingredientInput, setIngredientInput] = useState('');
  const [stepInput, setStepInput]             = useState('');
  const [recipeFilter, setRecipeFilter]       = useState('all');
  const [recipeSearch, setRecipeSearch]       = useState('');

  const emptyRecipe = {
    name: '', category: 'Otro', difficulty: 'Fácil', time: '', servings: '2',
    calories: '', tags: '', description: '', ingredients: [], steps: [], favorite: false,
  };
  const [rForm, setRForm] = useState(emptyRecipe);

  const recipes  = data.recipes   || [];
  const menus    = data.weekMenus  || {}; // key: "week_OFFSET_day_meal" → recipeId or freeText
  const sharedSL = data.shopping   || [];

  // ── Week key helpers ─────────────────────────────────────
  const weekKey = (offset, day, meal) => `w${offset}_${day}_${meal}`;

  const getMenu = (day, meal) => menus[weekKey(menuWeek, day, meal)];

  const setMenu = (day, meal, value) => {
    const upd = { ...menus, [weekKey(menuWeek, day, meal)]: value };
    setData(d => ({ ...d, weekMenus: upd }));
    save('weekMenus', upd);
  };

  const clearMenu = (day, meal) => {
    const upd = { ...menus };
    delete upd[weekKey(menuWeek, day, meal)];
    setData(d => ({ ...d, weekMenus: upd }));
    save('weekMenus', upd);
  };

  // ── Recipe CRUD ──────────────────────────────────────────
  const saveRecipe = (isEdit = false) => {
    if (!rForm.name.trim()) return;
    const r = {
      ...rForm,
      id: isEdit ? editRecipe.id : uid(),
      createdAt: isEdit ? (editRecipe.createdAt || today()) : today(),
      tags: typeof rForm.tags === 'string' ? rForm.tags.split(',').map(t => t.trim()).filter(Boolean) : rForm.tags,
    };
    const upd = isEdit ? recipes.map(x => x.id === r.id ? r : x) : [r, ...recipes];
    setData(d => ({ ...d, recipes: upd }));
    save('recipes', upd);
    setRecipeModal(false); setEditRecipe(null); setRForm(emptyRecipe);
    setRecipeDetail(r);
  };

  const delRecipe = (id) => {
    if (!window.confirm('¿Eliminar esta receta?')) return;
    const upd = recipes.filter(r => r.id !== id);
    setData(d => ({ ...d, recipes: upd }));
    save('recipes', upd);
    if (recipeDetail?.id === id) setRecipeDetail(null);
  };

  const toggleFav = (id) => {
    const upd = recipes.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r);
    setData(d => ({ ...d, recipes: upd }));
    save('recipes', upd);
    if (recipeDetail?.id === id) setRecipeDetail(upd.find(r => r.id === id));
  };

  // ── Send recipe ingredients to shopping list ─────────────
  const sendToShopping = (recipe) => {
    if (!recipe.ingredients?.length) return;
    const newItems = recipe.ingredients.map(ing => ({
      id: uid(), name: ing, qty: 1, unit: 'pza', category: 'Receta: ' + recipe.name, done: false, createdAt: today(),
    }));
    const upd = [...newItems, ...sharedSL];
    setData(d => ({ ...d, shopping: upd }));
    save('shopping', upd);
  };

  // ── Assign recipe to menu slot ───────────────────────────
  const assignRecipe = (recipe) => {
    if (!assignModal) return;
    setMenu(assignModal.day, assignModal.meal, { type: 'recipe', id: recipe.id, name: recipe.name });
    setAssignModal(null);
  };

  // ── Filtered recipes ─────────────────────────────────────
  const visibleRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (recipeFilter === 'favorites' && !r.favorite) return false;
      if (recipeFilter !== 'all' && recipeFilter !== 'favorites' && r.category !== recipeFilter) return false;
      if (recipeSearch && !r.name.toLowerCase().includes(recipeSearch.toLowerCase())) return false;
      return true;
    });
  }, [recipes, recipeFilter, recipeSearch]);

  // ── Weekly shopping summary ──────────────────────────────
  const weekIngredients = useMemo(() => {
    const ids = new Set();
    DAYS.forEach((_, di) => MEALS.forEach(m => {
      const slot = menus[weekKey(menuWeek, di, m.id)];
      if (slot?.type === 'recipe') ids.add(slot.id);
    }));
    const ings = [];
    ids.forEach(id => {
      const r = recipes.find(x => x.id === id);
      if (r?.ingredients) ings.push(...r.ingredients.map(i => ({ item: i, recipe: r.name })));
    });
    return ings;
  }, [menus, recipes, menuWeek]);

  const weekLabel = menuWeek === 0 ? 'Esta semana' : menuWeek > 0 ? `+${menuWeek} semana${menuWeek > 1 ? 's' : ''}` : `${Math.abs(menuWeek)} semana${Math.abs(menuWeek) > 1 ? 's' : ''} atrás`;

  return (
    <div>
      <PageHeader title="Nutrición" subtitle="Menús semanales, recetario y lista de compra." isMobile={isMobile}
        action={tab === 'recipes' ? (
          <Btn size="sm" onClick={() => { setEditRecipe(null); setRForm(emptyRecipe); setRecipeModal(true); }}>
            <Icon name="plus" size={14} /> Receta
          </Btn>
        ) : null} />

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'menu',     label: '📅 Menú semanal' },
          { id: 'recipes',  label: '📖 Recetario' },
          { id: 'shopping', label: '🛒 Compra' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '8px 6px', borderRadius: 10, border: `1px solid ${tab === t.id ? T.accent : T.border}`, background: tab === t.id ? `${T.accent}15` : 'transparent', color: tab === t.id ? T.accent : T.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: tab === t.id ? 600 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ MENU SEMANAL ═══ */}
      {tab === 'menu' && (
        <div>
          {/* Week nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={() => setMenuWeek(w => w - 1)}
              style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: T.muted, fontFamily: 'inherit', fontSize: 13 }}>← Anterior</button>
            <span style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{weekLabel}</span>
            <button onClick={() => setMenuWeek(w => w + 1)}
              style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: T.muted, fontFamily: 'inherit', fontSize: 13 }}>Siguiente →</button>
          </div>

          {/* Days grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DAYS.map((day, di) => (
              <Card key={di} style={{ padding: '12px 14px' }}>
                <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{day}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {MEALS.map(meal => {
                    const slot = getMenu(di, meal.id);
                    return (
                      <div key={meal.id} style={{ background: slot ? `${meal.color}12` : T.surface2, border: `1px solid ${slot ? meal.color + '40' : T.border}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', position: 'relative' }}
                        onClick={() => setAssignModal({ day: di, meal: meal.id, mealLabel: meal.label, dayLabel: day })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: slot ? 4 : 0 }}>
                          <span style={{ fontSize: 14 }}>{meal.emoji}</span>
                          <span style={{ fontSize: 11, color: meal.color, fontWeight: 600 }}>{meal.label}</span>
                        </div>
                        {slot ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {slot.name || slot}
                            </span>
                            <button onClick={e => { e.stopPropagation(); clearMenu(di, meal.id); }}
                              style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', padding: '0 0 0 4px', fontSize: 14, lineHeight: 1 }}>×</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: T.dim }}>+ Asignar</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RECETARIO ═══ */}
      {tab === 'recipes' && (
        <div>
          {/* Recipe detail */}
          {recipeDetail && recipes.find(r => r.id === recipeDetail.id) && (
            <Card style={{ marginBottom: 16, borderLeft: `3px solid ${T.accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>{recipeDetail.name}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: T.muted, background: T.surface2, padding: '2px 8px', borderRadius: 6 }}>{recipeDetail.category}</span>
                    <span style={{ fontSize: 11, color: recipeDetail.difficulty === 'Fácil' ? T.green : recipeDetail.difficulty === 'Difícil' ? T.red : T.orange }}>{recipeDetail.difficulty}</span>
                    {recipeDetail.time && <span style={{ fontSize: 11, color: T.muted }}>⏱ {recipeDetail.time} min</span>}
                    {recipeDetail.servings && <span style={{ fontSize: 11, color: T.muted }}>👤 {recipeDetail.servings} porciones</span>}
                    {recipeDetail.calories && <span style={{ fontSize: 11, color: T.orange }}>🔥 {recipeDetail.calories} kcal</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleFav(recipeDetail.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}>
                    {recipeDetail.favorite ? '❤️' : '🤍'}
                  </button>
                  <button onClick={() => { setEditRecipe(recipeDetail); setRForm({ ...emptyRecipe, ...recipeDetail, tags: Array.isArray(recipeDetail.tags) ? recipeDetail.tags.join(', ') : recipeDetail.tags || '' }); setRecipeModal(true); }}
                    style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: T.muted, fontSize: 12, fontFamily: 'inherit' }}>✏️</button>
                  <button onClick={() => delRecipe(recipeDetail.id)}
                    style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
              {recipeDetail.description && <p style={{ color: T.muted, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{recipeDetail.description}</p>}
              {recipeDetail.ingredients?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Ingredientes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {recipeDetail.ingredients.map((ing, i) => (
                      <span key={i} style={{ fontSize: 12, background: `${T.accent}12`, border: `1px solid ${T.accent}25`, color: T.muted, padding: '3px 10px', borderRadius: 8 }}>{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              {recipeDetail.steps?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Preparación</div>
                  {recipeDetail.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.accent, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <p style={{ color: T.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>
              )}
              {recipeDetail.ingredients?.length > 0 && (
                <Btn size="sm" onClick={() => sendToShopping(recipeDetail)} style={{ marginTop: 4 }}>
                  🛒 Agregar ingredientes a lista de compra
                </Btn>
              )}
            </Card>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <input value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="🔍 Buscar receta..."
              style={{ flex: 1, minWidth: 120, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px', color: T.text, fontSize: 13, fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {['all', 'favorites', ...CATEGORIES_RECIPE].map(c => (
              <button key={c} onClick={() => setRecipeFilter(c)}
                style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${recipeFilter === c ? T.accent : T.border}`, background: recipeFilter === c ? `${T.accent}15` : 'transparent', color: recipeFilter === c ? T.accent : T.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {c === 'all' ? '📋 Todas' : c === 'favorites' ? '❤️ Favoritas' : c}
              </button>
            ))}
          </div>

          {visibleRecipes.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📖</div>
              <div style={{ color: T.muted, fontSize: 14, fontWeight: 600 }}>Sin recetas todavía</div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>Agrega tus recetas favoritas para planificar el menú</div>
              <Btn style={{ marginTop: 14 }} onClick={() => { setEditRecipe(null); setRForm(emptyRecipe); setRecipeModal(true); }}>📖 Agregar receta</Btn>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleRecipes.map(r => (
                <Card key={r.id} onClick={() => setRecipeDetail(recipeDetail?.id === r.id ? null : r)}
                  style={{ cursor: 'pointer', border: `1px solid ${recipeDetail?.id === r.id ? T.accent : T.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🍽️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{r.name}</span>
                        {r.favorite && <span style={{ fontSize: 12 }}>❤️</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: T.muted }}>{r.category}</span>
                        {r.time && <span style={{ fontSize: 11, color: T.dim }}>· ⏱{r.time}min</span>}
                        {r.difficulty && <span style={{ fontSize: 11, color: r.difficulty === 'Fácil' ? T.green : r.difficulty === 'Difícil' ? T.red : T.orange }}>· {r.difficulty}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPRA ═══ */}
      {tab === 'shopping' && (
        <div>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>
            Ingredientes de las recetas asignadas a <strong style={{ color: T.text }}>{weekLabel.toLowerCase()}</strong>
          </div>
          {weekIngredients.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
              <div style={{ color: T.muted, fontSize: 13 }}>Sin ingredientes esta semana</div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>Asigna recetas al menú semanal para ver los ingredientes aquí</div>
            </Card>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {weekIngredients.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <span style={{ color: T.text, fontSize: 13 }}>• {item.item}</span>
                    <span style={{ fontSize: 11, color: T.dim }}>{item.recipe}</span>
                  </div>
                ))}
              </div>
              <Btn onClick={() => {
                const newItems = weekIngredients.map(item => ({
                  id: uid(), name: item.item, qty: 1, unit: 'pza', category: 'Menú semanal', done: false, createdAt: today(),
                }));
                const upd = [...newItems, ...sharedSL.filter(x => !newItems.find(n => n.name === x.name))];
                setData(d => ({ ...d, shopping: upd }));
                save('shopping', upd);
              }}>
                🛒 Enviar todo a lista de compras
              </Btn>
            </>
          )}
        </div>
      )}

      {/* Assign modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)}
        title={assignModal ? `${MEALS.find(m => m.id === assignModal.meal)?.emoji} ${assignModal.mealLabel} — ${assignModal.dayLabel}` : ''}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recipes.length > 0 && (
            <>
              <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Elegir del recetario:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {recipes.map(r => (
                  <button key={r.id} onClick={() => assignRecipe(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                    <span style={{ fontSize: 18 }}>🍽️</span>
                    <div>
                      <div style={{ color: T.text, fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                      <div style={{ color: T.dim, fontSize: 11 }}>{r.category} · {r.difficulty}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ color: T.dim, fontSize: 12, textAlign: 'center' }}>— o escribe libremente —</div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Ej. Tacos de pollo, Ensalada verde..."
              style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit' }}
              onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { if (assignModal) setMenu(assignModal.day, assignModal.meal, { type: 'free', name: e.target.value.trim() }); setAssignModal(null); } }} />
            <Btn size="sm" onClick={e => {
              const input = e.currentTarget.previousSibling;
              if (input.value.trim() && assignModal) { setMenu(assignModal.day, assignModal.meal, { type: 'free', name: input.value.trim() }); setAssignModal(null); }
            }}>OK</Btn>
          </div>
        </div>
      </Modal>

      {/* Recipe modal */}
      <Modal open={recipeModal} onClose={() => { setRecipeModal(false); setEditRecipe(null); setRForm(emptyRecipe); }}
        title={editRecipe ? '✏️ Editar receta' : '📖 Nueva receta'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Nombre *" value={rForm.name} onChange={e => setRForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Tacos de pollo al pastor" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select label="Categoría" value={rForm.category} onChange={e => setRForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES_RECIPE.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Dificultad" value={rForm.difficulty} onChange={e => setRForm(f => ({ ...f, difficulty: e.target.value }))}>
              {DIFFICULTY.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Input label="Tiempo (min)" value={rForm.time} onChange={e => setRForm(f => ({ ...f, time: e.target.value }))} type="number" placeholder="30" />
            <Input label="Porciones" value={rForm.servings} onChange={e => setRForm(f => ({ ...f, servings: e.target.value }))} type="number" placeholder="2" />
            <Input label="Calorías" value={rForm.calories} onChange={e => setRForm(f => ({ ...f, calories: e.target.value }))} type="number" placeholder="400" />
          </div>
          <Textarea label="Descripción breve" value={rForm.description} onChange={e => setRForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="De qué se trata esta receta..." />

          {/* Ingredients */}
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>Ingredientes</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={ingredientInput} onChange={e => setIngredientInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && ingredientInput.trim()) { setRForm(f => ({ ...f, ingredients: [...(f.ingredients || []), ingredientInput.trim()] })); setIngredientInput(''); } }}
                placeholder="Ej. 200g pollo — presiona Enter para agregar"
                style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', color: T.text, fontSize: 12, fontFamily: 'inherit' }} />
              <button onClick={() => { if (ingredientInput.trim()) { setRForm(f => ({ ...f, ingredients: [...(f.ingredients || []), ingredientInput.trim()] })); setIngredientInput(''); } }}
                style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', color: '#000', fontWeight: 700 }}>+</button>
            </div>
            {rForm.ingredients?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rForm.ingredients.map((ing, i) => (
                  <span key={i} style={{ fontSize: 12, background: `${T.accent}15`, border: `1px solid ${T.accent}30`, color: T.muted, padding: '3px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => setRForm(f => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))}>
                    {ing} <span style={{ color: T.dim }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Steps */}
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 600 }}>Pasos de preparación</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={stepInput} onChange={e => setStepInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && stepInput.trim()) { setRForm(f => ({ ...f, steps: [...(f.steps || []), stepInput.trim()] })); setStepInput(''); } }}
                placeholder={`Paso ${(rForm.steps?.length || 0) + 1}...`}
                style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', color: T.text, fontSize: 12, fontFamily: 'inherit' }} />
              <button onClick={() => { if (stepInput.trim()) { setRForm(f => ({ ...f, steps: [...(f.steps || []), stepInput.trim()] })); setStepInput(''); } }}
                style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', color: '#000', fontWeight: 700 }}>+</button>
            </div>
            {rForm.steps?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rForm.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: T.surface2, borderRadius: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: T.accent, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, color: T.muted, fontSize: 12 }}>{step}</span>
                    <button onClick={() => setRForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}
                      style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input label="Tags (separados por coma)" value={typeof rForm.tags === 'string' ? rForm.tags : (rForm.tags || []).join(', ')} onChange={e => setRForm(f => ({ ...f, tags: e.target.value }))} placeholder="saludable, rápido, vegetariano..." />
          <Btn onClick={() => saveRecipe(!!editRecipe)}>{editRecipe ? '💾 Guardar cambios' : '📖 Crear receta'}</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default Nutricion;
