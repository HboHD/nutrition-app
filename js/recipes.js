import { state, slotLabel } from './state.js';
import { RECIPES, RECIPES_INSP } from './data.js';
import { NUT } from './nutrition-db.js';
import { saveState } from './supabase.js';

export function getAllRecipes() {
  var all = RECIPES.map(function(r) {
    var e = state.recipeEdits[r[0]] || {};
    return { id: r[0], name: e.name || r[1], slot: r[2], m: [e.kcal || r[3], e.protein || r[4], e.carbs || r[5], e.fat || r[6]],
      ing: e.ing || r[7] || [], notes: e.notes != null ? e.notes : (r[8] || ''), tags: e.tags || r[9] || [], prep: r[10] || 0, src: 'base' };
  });
  RECIPES_INSP.forEach(function(r) {
    var e = state.recipeEdits[r[0]] || {};
    all.push({ id: r[0], name: e.name || r[1], slot: r[2], m: [e.kcal || r[3], e.protein || r[4], e.carbs || r[5], e.fat || r[6]],
      ing: e.ing || r[7] || [], notes: e.notes || r[8] || '', tags: [r[9], 'inspiration'], prep: r[10] || 30, src: 'insp', inspSrc: r[9] });
  });
  state.userRecipes.forEach(function(r) { all.push(Object.assign({ src: 'user' }, r)); });
  return all;
}

export function filterSource(s) {
  state.rSource = s;
  document.querySelectorAll('#rSource button').forEach(function(b, i) {
    b.classList.toggle('active', ['base', 'insp', 'user', 'all'][i] === s);
  });
  renderRecipes();
}

export function filterRecipes(f) {
  state.rFilter = f;
  document.querySelectorAll('#rFilter button').forEach(function(b, i) {
    b.classList.toggle('active', ['all', 'b', 'sb', 'd', 's'][i] === f);
  });
  renderRecipes();
}

export function renderRecipes() {
  var all = getAllRecipes().filter(function(r) {
    return (state.rFilter === 'all' || r.slot === state.rFilter) && (state.rSource === 'all' || r.src === state.rSource);
  });
  all.sort(function(a, b) { return a.name.localeCompare(b.name, 'pl'); });
  var h = '';
  all.forEach(function(r) {
    var tags = (r.tags || []).map(function(t) { return '<span class="r-tag">' + t + '</span>'; }).join('');
    h += '<div class="r-card" onclick="openRecipeDetail(\'' + r.id + '\')"><div class="r-name">' + (r.src === 'user' ? '✏️ ' : r.src === 'insp' ? '💡 ' : '') + r.name + '</div><div class="r-meta">' + slotLabel(r.slot) + ' · ' + r.m[0] + ' kcal · B:' + r.m[1] + 'g W:' + r.m[2] + 'g T:' + r.m[3] + 'g' + (r.prep ? ' · ⏱' + r.prep + 'min' : '') + (r.inspSrc ? ' · ' + r.inspSrc : '') + '</div>' + (tags ? '<div class="r-tags">' + tags + '</div>' : '') + '</div>';
  });
  if (!h) h = '<div style="color:#666;text-align:center;padding:20px">Brak przepisów</div>';
  document.getElementById('rList').innerHTML = h;
}

export function openRecipeDetail(id) {
  var r = getAllRecipes().find(function(x) { return x.id === id; });
  if (!r) return;
  var ingH = '';
  (r.ing || []).forEach(function(i) {
    ingH += '<div class="r-ing-item">' + i.item + (i.amount_g ? ' — ' + i.amount_g + 'g' : '') + (i.amount ? ' — ' + i.amount : '') + (i.lidl_package ? ' <span style="color:#555">(' + i.lidl_package + ')</span>' : '') + '</div>';
  });
  var el = document.getElementById('rDetail');
  el.innerHTML = '<div class="shop-head"><h3>' + r.name + '</h3><button class="shop-close" onclick="closeRecipeDetail()">✕</button></div>' +
    '<div class="r-meta" style="margin:4px 0">' + slotLabel(r.slot) + (r.prep ? ' · ⏱ ' + r.prep + ' min' : '') + (r.src === 'user' ? ' · ✏️ własny' : '') + '</div>' +
    '<div class="r-macros">' + ['kcal', 'białko', 'węgle', 'tłuszcz'].map(function(l, i) { return '<div class="macro"><span class="val">' + r.m[i] + '</span><span class="lbl">' + l + '</span></div>'; }).join('') + '</div>' +
    (ingH ? '<div class="r-section"><div class="r-section-title">Składniki</div>' + ingH + '</div>' : '') +
    (r.notes ? '<div class="r-notes">' + r.notes + '</div>' : '') +
    (r.tags && r.tags.length ? '<div class="r-section"><div class="r-section-title">Tagi</div><div class="r-tags">' + r.tags.map(function(t) { return '<span class="r-tag">' + t + '</span>'; }).join('') + '</div></div>' : '') +
    '<button class="r-btn" onclick="openEditRecipe(\'' + r.id + '\')">✏️ Edytuj</button>' +
    (r.src === 'user' ? '<button class="r-btn danger" onclick="deleteRecipe(\'' + r.id + '\')">🗑️ Usuń</button>' : '');
  el.classList.add('open');
}

export function closeRecipeDetail() { document.getElementById('rDetail').classList.remove('open'); }

export function openEditRecipe(id) {
  var r = getAllRecipes().find(function(x) { return x.id === id; });
  if (!r) return;
  var ingRows = '';
  (r.ing || []).forEach(function(ig, i) {
    ingRows += '<div class="r-row"><input name="ei_item_' + i + '" value="' + ig.item + '"><input name="ei_amt_' + i + '" value="' + (ig.amount_g || ig.amount || '') + '" placeholder="ilość" style="max-width:80px"><button type="button" class="p-del" onclick="this.parentElement.remove();calcEditMacros()">✕</button></div>';
  });
  var el = document.getElementById('rDetail');
  el.innerHTML = '<div class="shop-head"><h3>Edytuj: ' + r.name + '</h3><button class="shop-close" onclick="closeRecipeDetail()">✕</button></div>' +
    '<form class="r-edit-form" onsubmit="return saveEditRecipe(\'' + r.id + '\',this)">' +
    '<input name="name" value="' + r.name + '" placeholder="Nazwa">' +
    '<div class="r-row"><select name="slot"><option value="b"' + (r.slot === 'b' ? ' selected' : '') + '>Śniadanie</option><option value="sb"' + (r.slot === 'sb' ? ' selected' : '') + '>II śniadanie</option><option value="d"' + (r.slot === 'd' ? ' selected' : '') + '>Obiad</option><option value="s"' + (r.slot === 's' ? ' selected' : '') + '>Kolacja</option><option value="p"' + (r.slot === 'p' ? ' selected' : '') + '>Przekąska</option></select></div>' +
    '<div class="r-section"><div class="r-section-title">Składniki <button type="button" style="background:#2d6a4f;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:.8em;cursor:pointer" onclick="addIngRow(this)">+ dodaj</button></div><div id="editIngs">' + ingRows + '</div></div>' +
    '<div class="r-calc" id="editCalc">Przelicz makra z składników ↓</div>' +
    '<button type="button" class="r-btn secondary" onclick="calcEditMacros()">🔄 Przelicz makra</button>' +
    '<div class="r-section"><div class="r-section-title">Makra per serving (lub ręcznie)</div>' +
    '<div class="r-row"><input name="kcal" value="' + r.m[0] + '" placeholder="kcal" type="number"><input name="protein" value="' + r.m[1] + '" placeholder="białko" type="number"><input name="carbs" value="' + r.m[2] + '" placeholder="węgle" type="number"><input name="fat" value="' + r.m[3] + '" placeholder="tłuszcz" type="number"></div>' +
    '<input name="servings" value="' + (r.servings || 2) + '" placeholder="porcje" type="number" style="max-width:120px"></div>' +
    '<textarea name="notes" placeholder="Notatki">' + (r.notes || '') + '</textarea>' +
    '<input name="tags" value="' + (r.tags || []).join(', ') + '" placeholder="Tagi (po przecinku)">' +
    '<button type="submit" class="r-btn">💾 Zapisz</button></form>';
  el.classList.add('open');
}

export function addIngRow() {
  var c = document.getElementById('editIngs'), i = c.children.length;
  c.insertAdjacentHTML('beforeend', '<div class="r-row"><input name="ei_item_' + i + '" placeholder="składnik"><input name="ei_amt_' + i + '" placeholder="ilość (g)" style="max-width:80px"><button type="button" class="p-del" onclick="this.parentElement.remove();calcEditMacros()">✕</button></div>');
}

export function calcEditMacros() {
  var rows = document.querySelectorAll('#editIngs .r-row'), tot = [0, 0, 0, 0];
  rows.forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var item = (inputs[0].value || '').toLowerCase().trim();
    var amt = parseFloat(inputs[1].value) || 0;
    var n = NUT[item];
    if (n && amt > 0) {
      var f = amt / 100;
      tot[0] += Math.round(n[0] * f); tot[1] += Math.round(n[1] * f);
      tot[2] += Math.round(n[2] * f); tot[3] += Math.round(n[3] * f);
    }
  });
  var serv = parseInt(document.querySelector('input[name=servings]').value) || 2;
  var ps = [Math.round(tot[0] / serv), Math.round(tot[1] / serv), Math.round(tot[2] / serv), Math.round(tot[3] / serv)];
  document.getElementById('editCalc').innerHTML = 'Suma: <b>' + tot[0] + '</b> kcal · B:' + tot[1] + 'g · W:' + tot[2] + 'g · T:' + tot[3] + 'g<br>Per serving (÷' + serv + '): <b>' + ps[0] + '</b> kcal · B:' + ps[1] + 'g · W:' + ps[2] + 'g · T:' + ps[3] + 'g';
  document.querySelector('input[name=kcal]').value = ps[0];
  document.querySelector('input[name=protein]').value = ps[1];
  document.querySelector('input[name=carbs]').value = ps[2];
  document.querySelector('input[name=fat]').value = ps[3];
}

export function saveEditRecipe(id, form) {
  var d = new FormData(form);
  var ing = [];
  document.querySelectorAll('#editIngs .r-row').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    if (inputs[0].value.trim()) ing.push({ item: inputs[0].value.trim(), amount_g: inputs[1].value.trim() });
  });
  var tags = d.get('tags').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
  var edit = { name: d.get('name'), kcal: +d.get('kcal'), protein: +d.get('protein'), carbs: +d.get('carbs'), fat: +d.get('fat'),
    ing: ing, notes: d.get('notes'), tags: tags, servings: +d.get('servings'), slot: d.get('slot') };
  var ur = state.userRecipes.find(function(r) { return r.id === id; });
  if (ur) {
    Object.assign(ur, { name: edit.name, slot: edit.slot, m: [edit.kcal, edit.protein, edit.carbs, edit.fat],
      ing: edit.ing, notes: edit.notes, tags: edit.tags, servings: edit.servings });
    saveState('user_recipes', state.userRecipes);
  } else {
    state.recipeEdits[id] = edit;
    saveState('recipe_edits', state.recipeEdits);
  }
  closeRecipeDetail(); renderRecipes(); return false;
}

export function openAddRecipe() {
  var el = document.getElementById('rDetail');
  el.innerHTML = '<div class="shop-head"><h3>Nowy przepis</h3><button class="shop-close" onclick="closeRecipeDetail()">✕</button></div>' +
    '<form class="r-edit-form" onsubmit="return saveNewRecipe(this)">' +
    '<input name="name" placeholder="Nazwa przepisu" required>' +
    '<select name="slot"><option value="b">Śniadanie</option><option value="sb">II śniadanie</option><option value="d" selected>Obiad</option><option value="s">Kolacja</option><option value="p">Przekąska</option></select>' +
    '<div class="r-section"><div class="r-section-title">Składniki <button type="button" style="background:#2d6a4f;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:.8em;cursor:pointer" onclick="addIngRow(this)">+ dodaj</button></div>' +
    '<div id="editIngs"><div class="r-row"><input name="ei_item_0" placeholder="składnik"><input name="ei_amt_0" placeholder="ilość (g)" style="max-width:80px"><button type="button" class="p-del" onclick="this.parentElement.remove()">✕</button></div></div></div>' +
    '<div class="r-calc" id="editCalc">Dodaj składniki i przelicz ↓</div>' +
    '<button type="button" class="r-btn secondary" onclick="calcEditMacros()">🔄 Przelicz makra</button>' +
    '<div class="r-section"><div class="r-section-title">Makra per serving</div>' +
    '<div class="r-row"><input name="kcal" placeholder="kcal" type="number" required><input name="protein" placeholder="białko" type="number" required><input name="carbs" placeholder="węgle" type="number" required><input name="fat" placeholder="tłuszcz" type="number" required></div>' +
    '<input name="servings" value="2" placeholder="porcje" type="number" style="max-width:120px"></div>' +
    '<textarea name="notes" placeholder="Notatki"></textarea>' +
    '<input name="tags" placeholder="Tagi (po przecinku)">' +
    '<button type="submit" class="r-btn">💾 Dodaj przepis</button></form>';
  el.classList.add('open');
}

export function saveNewRecipe(form) {
  var d = new FormData(form);
  var ing = [];
  document.querySelectorAll('#editIngs .r-row').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    if (inputs[0].value.trim()) ing.push({ item: inputs[0].value.trim(), amount_g: inputs[1].value.trim() });
  });
  var tags = d.get('tags').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
  var id = 'user-' + Date.now();
  state.userRecipes.push({ id: id, name: d.get('name'), slot: d.get('slot'),
    m: [+d.get('kcal'), +d.get('protein'), +d.get('carbs'), +d.get('fat')],
    ing: ing, notes: d.get('notes'), tags: tags, servings: +d.get('servings') });
  saveState('user_recipes', state.userRecipes);
  closeRecipeDetail(); renderRecipes(); return false;
}

export function deleteRecipe(id) {
  if (!confirm('Usunąć przepis?')) return;
  state.userRecipes = state.userRecipes.filter(function(r) { return r.id !== id; });
  saveState('user_recipes', state.userRecipes);
  closeRecipeDetail(); renderRecipes();
}
