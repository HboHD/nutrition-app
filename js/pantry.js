import { state } from './state.js';
import { DAYS, RECIPES, RECIPES_INSP } from './data.js';
import { PKG } from './nutrition-db.js';
import { saveState } from './supabase.js';
import { getMeal } from './plan.js';

function findRecipe(rid) {
  if (!rid) return null;
  var r = RECIPES.find(function(x) { return x[0] === rid; });
  if (r) return { ing: r[7] || [], servings: 2 };
  r = RECIPES_INSP.find(function(x) { return x[0] === rid; });
  if (r) return { ing: [], servings: 1 };
  var ur = state.userRecipes.find(function(x) { return x.id === rid; });
  if (ur) return { ing: ur.ing || [], servings: ur.servings || 2 };
  return null;
}

// Parse pantry qty string → grams or pieces
// "2 × 300g" → {val:600, unit:'g'}, "1 × 1kg" → {val:1000, unit:'g'}, "3 szt" → {val:3, unit:'szt'}
function parseQty(s) {
  if (!s) return null;
  var m = s.match(/(\d+)\s*×\s*(\d+)\s*(g|kg|ml|L|szt)/i);
  if (m) {
    var n = parseInt(m[1]) * parseInt(m[2]);
    var u = m[3].toLowerCase();
    if (u === 'kg' || u === 'l') n *= 1000;
    return { val: n, unit: u === 'szt' ? 'szt' : 'g' };
  }
  m = s.match(/(\d+)\s*(g|kg|ml|szt)/i);
  if (m) {
    var n2 = parseInt(m[1]);
    var u2 = m[2].toLowerCase();
    if (u2 === 'kg') n2 *= 1000;
    return { val: n2, unit: u2 === 'szt' ? 'szt' : 'g' };
  }
  return null;
}

export function consumePlan() {
  // Aggregate ingredient usage from current plan
  var usage = {}; // itemName → total_g or total_szt
  state.dayOrder.forEach(function(di, pos) {
    var d = DAYS[di];
    for (var s = 0; s < d.meals.length; s++) {
      var ml = getMeal(pos, s);
      if (ml.tag && ml.tag.indexOf('🔄') >= 0) continue;
      if (ml.m[0] === 0) continue;
      var rid = ml.rid || ml.recipeId;
      var recipe = findRecipe(rid);
      if (!recipe || !recipe.ing || !recipe.ing.length) continue;
      var baseMeal = DAYS[di].meals[s];
      var hasAlt = baseMeal && baseMeal.alt;
      var mult = hasAlt ? 1 : (recipe.servings === 1 ? 2 : 1);
      recipe.ing.forEach(function(ig) {
        var key = ig.item;
        if (!usage[key]) usage[key] = { g: 0, szt: 0 };
        if (ig.amount_g) usage[key].g += parseFloat(ig.amount_g) * mult;
        else if (ig.amount) {
          var n = parseFloat(ig.amount);
          if (!isNaN(n)) usage[key].szt += n * mult;
        }
      });
      if (hasAlt) {
        var altRecipe = findRecipe(baseMeal.alt.rid);
        if (altRecipe && altRecipe.ing) {
          altRecipe.ing.forEach(function(ig) {
            var key = ig.item;
            if (!usage[key]) usage[key] = { g: 0, szt: 0 };
            if (ig.amount_g) usage[key].g += parseFloat(ig.amount_g);
            else if (ig.amount) {
              var n = parseFloat(ig.amount);
              if (!isNaN(n)) usage[key].szt += n;
            }
          });
        }
      }
    }
  });

  // Subtract from pantry
  var consumed = [], removed = [];
  state.pantry = state.pantry.filter(function(p) {
    var name = p.item.toLowerCase().trim();
    // Find matching usage (case-insensitive, replacing spaces/underscores)
    var uKey = Object.keys(usage).find(function(k) {
      return k.toLowerCase().replace(/_/g, ' ').trim() === name.replace(/_/g, ' ');
    });
    if (!uKey) return true; // no match, keep

    var pq = parseQty(p.qty);
    if (!pq) { removed.push(p.item); return false; } // can't parse → remove entirely

    var used = usage[uKey];
    var usedVal = pq.unit === 'szt' ? used.szt : used.g;
    if (usedVal <= 0) return true;

    var remaining = pq.val - usedVal;
    if (remaining <= 0) {
      removed.push(p.item);
      return false;
    }
    consumed.push(p.item + ': ' + Math.round(pq.val) + pq.unit + ' → ' + Math.round(remaining) + pq.unit);
    p.qty = Math.round(remaining) + (pq.unit === 'szt' ? ' szt' : 'g');
    return true;
  });

  saveState('pantry', state.pantry);
  renderPantry();

  var msg = '';
  if (removed.length) msg += 'Usunięto: ' + removed.join(', ') + '\n';
  if (consumed.length) msg += 'Zmniejszono: ' + consumed.join(', ');
  if (!msg) msg = 'Brak produktów do rozliczenia (spiżarnia nie pasuje do planu).';
  alert('📦 Rozliczenie planu:\n\n' + msg);
}

export function renderPantry() {
  var h = '';
  var sorted = state.pantry.slice().sort(function(a, b) { return (a.exp || '9').localeCompare(b.exp || '9'); });
  sorted.forEach(function(p) {
    var idx = state.pantry.indexOf(p);
    var expStr = '', expClass = '';
    if (p.exp) {
      var diff = Math.ceil((new Date(p.exp) - new Date()) / (1000 * 60 * 60 * 24));
      expStr = diff <= 0 ? 'przeterminowane!' : diff <= 2 ? 'za ' + diff + 'd!' : 'do ' + p.exp;
      expClass = diff <= 2 ? ' p-exp' : '';
    }
    h += '<div class="p-item"><div class="p-info"><span class="p-name" onclick="startEditPantry(' + idx + ',\'item\',this)">' + p.item + '</span>' + (p.qty ? ' · <span class="p-qty" onclick="startEditPantry(' + idx + ',\'qty\',this)">' + p.qty + '</span>' : '') + '<br><span class="p-meta' + expClass + '">' + (expStr || 'brak daty') + '</span></div><button class="p-del" onclick="delPantry(' + idx + ')">✕</button></div>';
  });
  document.getElementById('pantryList').innerHTML = h || '<div style="color:#666;text-align:center;padding:20px">Spiżarnia pusta</div>';
}

export function addPantryItem(form) {
  var d = new FormData(form);
  state.pantry.push({ item: d.get('item'), qty: d.get('qty') || '', exp: d.get('exp') || '' });
  form.reset(); renderPantry(); saveState('pantry', state.pantry); return false;
}

export function delPantry(i) { state.pantry.splice(i, 1); renderPantry(); saveState('pantry', state.pantry); }

export function editPantryItem(i, field, value) {
  var v = value.trim();
  if (!v || !state.pantry[i]) return;
  if (field === 'name') state.pantry[i].item = v;
  if (field === 'qty') state.pantry[i].qty = v;
  saveState('pantry', state.pantry);
}

export function startEditPantry(i, field, el) {
  var text = el.textContent;
  var input = document.createElement('input');
  input.type = 'text'; input.value = text;
  input.onblur = function() {
    var val = input.value.trim();
    if (val && val !== text && state.pantry[i]) {
      if (field === 'item') state.pantry[i].item = val;
      if (field === 'qty') state.pantry[i].qty = val;
      saveState('pantry', state.pantry);
    }
    var span = document.createElement('span');
    span.className = el.className;
    span.textContent = val || text;
    span.onclick = function() { startEditPantry(i, field, span); };
    input.replaceWith(span);
  };
  input.onkeydown = function(e) { if (e.key === 'Enter') input.blur(); };
  el.replaceWith(input);
  input.focus();
  input.select();
}

export function pantryToggle() { renderPantry(); }
export function pantryClose() { }
