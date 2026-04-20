import { state, SLOTS, slotLabel } from './state.js';
import { DAYS, RECIPES, RECIPES_INSP } from './data.js';
import { SERVINGS } from './nutrition-db.js';
import { saveState } from './supabase.js';
import { getAllRecipes } from './recipes.js';
import { refreshShop } from './shop.js';

function askRefreshShop() {
  if (confirm('Zaktualizować listę zakupów do nowego planu?')) {
    refreshShop();
  }
}

// Build per-serving ingredient string from recipe data
function recipeIngStr(rid) {
  if (!rid) return '';
  var r = RECIPES.find(function(x) { return x[0] === rid; });
  if (!r) r = RECIPES_INSP.find(function(x) { return x[0] === rid; });
  if (!r || !r[7] || !r[7].length) {
    var ur = state.userRecipes.find(function(x) { return x.id === rid; });
    if (ur && ur.ing) return ur.ing.map(function(ig) {
      var q = ig.amount_g ? ig.amount_g + 'g' : (ig.amount || '');
      return ig.item + (q ? ' ' + q : '');
    }).join(' · ');
    return '';
  }
  var srv = SERVINGS[rid] || 1;
  return r[7].map(function(ig) {
    if (ig.amount_g) {
      var g = Math.round(parseFloat(ig.amount_g) / srv);
      return ig.item + ' ' + g + 'g';
    }
    if (ig.amount) {
      var n = parseFloat(ig.amount);
      if (!isNaN(n) && srv > 1) {
        var perServ = n / srv;
        var display = perServ % 1 === 0 ? perServ.toString() : perServ.toFixed(1).replace(/\.0$/, '');
        return ig.item + ' ' + display + ' szt';
      }
      return ig.item + ' ' + ig.amount;
    }
    return ig.item;
  }).join(' · ');
}

// Full recipe amounts (for batch cooking — what goes in the pot)
function recipeTotalStr(rid) {
  if (!rid) return '';
  var r = RECIPES.find(function(x) { return x[0] === rid; });
  if (!r) r = RECIPES_INSP.find(function(x) { return x[0] === rid; });
  if (!r || !r[7] || !r[7].length) return '';
  return r[7].map(function(ig) {
    if (ig.amount_g) return ig.item + ' ' + ig.amount_g + 'g';
    if (ig.amount) return ig.item + ' ' + ig.amount;
    return ig.item;
  }).join(' · ');
}

// Format ingredient string for picker (always per-serving)
export function pickerIngStr(r) {
  if (!r.ing || !r.ing.length) return recipeIngStr(r.id);
  var srv = SERVINGS[r.id] || 1;
  return r.ing.map(function(ig) {
    if (ig.amount_g) {
      var g = Math.round(parseFloat(ig.amount_g) / srv);
      return ig.item + ' ' + g + 'g';
    }
    if (ig.amount) {
      var n = parseFloat(ig.amount);
      if (!isNaN(n) && srv > 1) return ig.item + ' ' + (n / srv).toFixed(1).replace(/\.0$/, '') + ' szt';
      return ig.item + ' ' + ig.amount;
    }
    return ig.item;
  }).join(' · ');
}

export function getMeal(pos, slot) {
  var k = state.dayOrder[pos] + '_' + slot;
  if (state.mealOverrides[k]) {
    var o = state.mealOverrides[k];
    if (Array.isArray(o)) return DAYS[o[0]].meals[o[1]];
    return o;
  }
  var meal = DAYS[state.dayOrder[pos]].meals[slot];
  if (meal.alt && state.person === 'ona') {
    return { name: meal.alt.name, rid: meal.alt.rid, m: meal.alt.m, ing: meal.alt.ing || meal.ing, tag: meal.tag, tagClass: meal.tagClass, _isAlt: true, _mainName: meal.name };
  }
  if (meal.alt) {
    return Object.assign({}, meal, { _hasAlt: true, _altName: meal.alt.name });
  }
  return meal;
}

export function renderDays() {
  var c = document.getElementById('days');
  var openSet = {};
  c.querySelectorAll('.day-content.open').forEach(function(el) {
    var day = el.parentElement; if (day && day.dataset.pos != null) openSet[day.dataset.pos] = 1;
  });
  if (!Object.keys(openSet).length) openSet[0] = 1;
  c.innerHTML = '';
  state.dayOrder.forEach(function(di, pos) {
    var d = DAYS[di], el = document.createElement('div');
    el.className = 'day'; el.dataset.pos = pos;
    // Highlight today
    var dateMatch = d.hdr.match(/(\d+)\.(\d+)/);
    if (dateMatch) {
      var now = new Date();
      if (parseInt(dateMatch[1]) === now.getDate() && parseInt(dateMatch[2]) === now.getMonth() + 1) el.className += ' today';
    }
    var meals = '', dt = [0, 0, 0, 0];
    for (var s = 0; s < d.meals.length; s++) {
      var ml = getMeal(pos, s);
      for (var mi = 0; mi < 4; mi++) dt[mi] += ml.m[mi];
      var tg = ml.tag ? (' <span class="tag ' + ml.tagClass + '">' + ml.tag + '</span>') : '';
      var sel = (state.selected && state.selected.pos === pos && state.selected.slot === s) ? ' selected' : '';
      var cookClass = (ml.tag && ml.tag.indexOf('🔄') >= 0) ? ' leftover' : (ml.tag && ml.tag.indexOf('🍳') >= 0) ? ' cook' : '';
      // Ingredient display: per-serving from recipe data, with batch/leftover notes
      var isLeftover = ml.tag && ml.tag.indexOf('🔄') >= 0;
      var isCook = ml.tag && ml.tag.indexOf('🍳') >= 0;
      var ingDisplay = '';
      if (isLeftover) {
        ingDisplay = 'resztki z poprzedniego dnia';
      } else {
        ingDisplay = ml.ing || recipeIngStr(ml.rid || ml.recipeId) || '';
        if (isCook && ingDisplay) {
          var rid = ml.rid || ml.recipeId;
          var srv = SERVINGS[rid] || 0;
          if (srv > 1) {
            var totalStr = recipeTotalStr(rid);
            if (totalStr) ingDisplay += '<div class="batch-total">🍳 Gotuj łącznie: ' + totalStr + '</div>';
          }
        }
      }
      var altInfo = '';
      if (ml._hasAlt) altInfo = '<div class="meal-alt">👩 Ona: ' + ml._altName + '</div>';
      if (ml._isAlt) altInfo = '<div class="meal-alt">🧔 On: ' + ml._mainName + '</div>';
      var rid = ml.rid || ml.recipeId || '';
      var recipeBtn = rid ? '<span class="recipe-link" onclick="event.stopPropagation();openRecipeDetail(\'' + rid + '\')">📖</span>' : '';
      meals += '<div class="meal' + sel + cookClass + '" onclick="selectMeal(' + pos + ',' + s + ')"><div class="meal-name">' + ml.name + tg + recipeBtn + '</div>' + altInfo + '<div class="ingredients">' + ingDisplay + '</div><div class="macros">' +
        ['kcal', 'białko', 'węgle', 'tłuszcz'].map(function(l, i) { return '<div class="macro"><span class="val">' + ml.m[i] + '</span><span class="lbl">' + l + '</span></div>'; }).join('') + '</div></div>';
    }
    var isOpen = openSet[pos] ? ' open' : '';
    var target = 2000;
    var treatMax = Math.min(Math.floor(target * 0.15), Math.max(0, target - dt[0]));
    var treatTxt = treatMax > 0 ? '🍬 ~' + treatMax + ' kcal (~' + Math.floor(treatMax / 160 * 30) + 'g czipsów / ' + Math.floor(treatMax / 135) + ' rządków czekolady / ' + Math.floor(treatMax / 25) + ' cukierków)' : '🍬 brak budżetu';
    el.innerHTML = '<div class="day-header" onclick="toggle(this)"><span>' + d.hdr + '</span><span>▼</span></div>' +
      '<div class="day-content' + isOpen + '">' + meals +
      '<div class="summary"><div class="sum-row"><span class="sum-label"></span><div class="sum-vals"><span>kcal</span><span>B</span><span>W</span><span>T</span></div></div>' +
      '<div class="sum-row"><span class="sum-label">Baza</span><div class="sum-vals">' + dt.map(function(n, j) { return '<span><b>' + n + '</b>' + (j > 0 ? 'g' : '') + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="treat">' + treatTxt + '</div></div>';
    c.appendChild(el);
  });
}

export function toggle(hdr) { hdr.nextElementSibling.classList.toggle('open'); }

var dragged = null;
function initDrag(el) {
  var h = el.querySelector('.drag-handle');
  h.addEventListener('pointerdown', function(e) {
    e.preventDefault(); e.stopPropagation(); dragged = el; el.classList.add('dragging');
    var moveHandler = function(ev) {
      var tgt = document.elementFromPoint(ev.clientX, ev.clientY);
      if (tgt) { var day = tgt.closest('.day');
        document.querySelectorAll('.day').forEach(function(d) { d.classList.remove('drag-over'); });
        if (day && day !== dragged) day.classList.add('drag-over');
      }
    };
    var upHandler = function(ev) {
      document.removeEventListener('pointermove', moveHandler);
      document.removeEventListener('pointerup', upHandler);
      el.classList.remove('dragging');
      var tgt = document.elementFromPoint(ev.clientX, ev.clientY);
      if (tgt) { var day = tgt.closest('.day');
        if (day && day !== dragged) {
          var from = +dragged.dataset.pos, to = +day.dataset.pos;
          var item = state.dayOrder.splice(from, 1)[0]; state.dayOrder.splice(to, 0, item);
          renderDays(); saveState('day_order', state.dayOrder);
        }
      }
      document.querySelectorAll('.day').forEach(function(d) { d.classList.remove('drag-over'); });
      dragged = null;
    };
    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
  });
}

export function selectMeal(pos, slot) {
  if (!state.selected) {
    state.selected = { pos: pos, slot: slot };
    document.getElementById('swapBar').classList.add('show');
    document.getElementById('swapMsg').textContent = getMeal(pos, slot).name;
    renderDays(); return;
  }
  if (state.selected.pos === pos && state.selected.slot === slot) { cancelSwap(); return; }
  var kA = state.dayOrder[state.selected.pos] + '_' + state.selected.slot, kB = state.dayOrder[pos] + '_' + slot;
  var mA = getMeal(state.selected.pos, state.selected.slot), mB = getMeal(pos, slot);
  var origA = state.mealOverrides[kA] || [state.dayOrder[state.selected.pos], state.selected.slot];
  var origB = state.mealOverrides[kB] || [state.dayOrder[pos], slot];
  state.mealOverrides[kA] = Array.isArray(origB) ? origB : { name: mB.name, m: mB.m, ing: mB.ing || '' };
  state.mealOverrides[kB] = Array.isArray(origA) ? origA : { name: mA.name, m: mA.m, ing: mA.ing || '' };
  state.selected = null; document.getElementById('swapBar').classList.remove('show');
  renderDays(); saveState('meal_overrides', state.mealOverrides);
  askRefreshShop();
}

export function cancelSwap() { state.selected = null; document.getElementById('swapBar').classList.remove('show'); renderDays(); }

export function clearMeal() {
  if (!state.selected) return;
  var k = state.dayOrder[state.selected.pos] + '_' + state.selected.slot;
  state.mealOverrides[k] = { name: '— pominięta', m: [0, 0, 0, 0], ing: '' };
  state.selected = null; document.getElementById('swapBar').classList.remove('show');
  renderDays(); saveState('meal_overrides', state.mealOverrides);
  askRefreshShop();
}

export function openRecipePicker() {
  if (!state.selected) return;
  var slot = SLOTS[state.selected.slot];
  var current = getMeal(state.selected.pos, state.selected.slot);
  var all = getAllRecipes().filter(function(r) { return r.slot === slot; });
  var h = '';
  all.forEach(function(r) {
    var diff = ['kcal', 'B', 'W', 'T'].map(function(l, i) {
      var d = r.m[i] - current.m[i];
      return '<span class="' + (d >= 0 ? 'ro-plus' : 'ro-minus') + '">' + (d >= 0 ? '+' : '') + d + ' ' + l + '</span>';
    }).join(' ');
    var ingStr = pickerIngStr(r);
    h += '<div class="recipe-opt" onclick="pickRecipe(\'' + r.id + '\')"><div class="ro-name">' + r.name + '</div>' +
      (ingStr ? '<div class="ro-ing">' + ingStr + '</div>' : '') +
      '<div class="ro-macros"><span>' + r.m[0] + ' kcal</span><span>B:' + r.m[1] + '</span><span>W:' + r.m[2] + '</span><span>T:' + r.m[3] + '</span></div><div class="ro-diff">vs obecny: ' + diff + '</div></div>';
  });
  document.getElementById('recipeList').innerHTML = h;
  document.getElementById('recipePicker').classList.add('open');
}

export function pickRecipe(id) {
  var r = getAllRecipes().find(function(x) { return x.id === id; });
  if (!r || !state.selected) return;
  var k = state.dayOrder[state.selected.pos] + '_' + state.selected.slot;
  var ingStr = pickerIngStr(r);
  state.mealOverrides[k] = { name: r.name, m: r.m, ing: ingStr, rid: r.id, recipeId: r.id };
  closeRecipePicker(); cancelSwap();
  renderDays(); saveState('meal_overrides', state.mealOverrides);
  askRefreshShop();
}

export function closeRecipePicker() { document.getElementById('recipePicker').classList.remove('open'); }
