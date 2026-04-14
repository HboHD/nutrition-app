import { state, SLOTS, slotLabel } from './state.js';
import { DAYS } from './data.js';
import { saveState } from './supabase.js';
import { getAllRecipes } from './recipes.js';

function resetShopIfConfirmed() {
  if (confirm('Posiłek zmieniony. Zaktualizować listę zakupów?\n(Zaznaczenia zostaną zresetowane)')) {
    state.shopChecked = {};
    saveState('shopping', state.shopChecked);
  }
}

export function getMeal(pos, slot) {
  var k = state.dayOrder[pos] + '_' + slot;
  if (state.mealOverrides[k]) {
    var o = state.mealOverrides[k];
    if (Array.isArray(o)) return DAYS[o[0]].meals[o[1]];
    return o;
  }
  return DAYS[state.dayOrder[pos]].meals[slot];
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
    var meals = '', dt = [0, 0, 0, 0];
    for (var s = 0; s < d.meals.length; s++) {
      var ml = getMeal(pos, s);
      for (var mi = 0; mi < 4; mi++) dt[mi] += ml.m[mi];
      var tg = ml.tag ? (' <span class="tag ' + ml.tagClass + '">' + ml.tag + '</span>') : '';
      var sel = (state.selected && state.selected.pos === pos && state.selected.slot === s) ? ' selected' : '';
      meals += '<div class="meal' + sel + '" onclick="selectMeal(' + pos + ',' + s + ')"><div class="meal-name">' + ml.name + tg + '</div><div class="ingredients">' + (ml.ing || '') + '</div><div class="macros">' +
        ['kcal', 'białko', 'węgle', 'tłuszcz'].map(function(l, i) { return '<div class="macro"><span class="val">' + ml.m[i] + '</span><span class="lbl">' + l + '</span></div>'; }).join('') + '</div></div>';
    }
    var isOpen = openSet[pos] ? ' open' : '';
    var target = 2000;
    var treatMax = Math.min(Math.floor(target * 0.15), Math.max(0, target - dt[0]));
    var treatTxt = treatMax > 0 ? '🍬 ~' + treatMax + ' kcal (~' + Math.floor(treatMax / 160 * 30) + 'g czipsów / ' + Math.floor(treatMax / 135) + ' rządków czekolady / ' + Math.floor(treatMax / 25) + ' cukierków)' : '🍬 brak budżetu';
    el.innerHTML = '<div class="day-header" onclick="toggle(this)"><span class="drag-handle">⠿</span><span>' + d.hdr + '</span><span>▼</span></div>' +
      '<div class="day-content' + isOpen + '">' + meals +
      '<div class="summary"><div class="sum-row"><span class="sum-label"></span><div class="sum-vals"><span>kcal</span><span>B</span><span>W</span><span>T</span></div></div>' +
      '<div class="sum-row"><span class="sum-label">Baza</span><div class="sum-vals">' + dt.map(function(n, j) { return '<span><b>' + n + '</b>' + (j > 0 ? 'g' : '') + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="treat">' + treatTxt + '</div></div>';
    initDrag(el); c.appendChild(el);
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
  resetShopIfConfirmed();
}

export function cancelSwap() { state.selected = null; document.getElementById('swapBar').classList.remove('show'); renderDays(); }

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
    h += '<div class="recipe-opt" onclick="pickRecipe(\'' + r.id + '\')"><div class="ro-name">' + r.name + '</div><div class="ro-macros"><span>' + r.m[0] + ' kcal</span><span>B:' + r.m[1] + '</span><span>W:' + r.m[2] + '</span><span>T:' + r.m[3] + '</span></div><div class="ro-diff">vs obecny: ' + diff + '</div></div>';
  });
  document.getElementById('recipeList').innerHTML = h;
  document.getElementById('recipePicker').classList.add('open');
}

export function pickRecipe(id) {
  var r = getAllRecipes().find(function(x) { return x.id === id; });
  if (!r || !state.selected) return;
  var k = state.dayOrder[state.selected.pos] + '_' + state.selected.slot;
  state.mealOverrides[k] = { name: r.name, m: r.m, ing: '', rid: r.id, recipeId: r.id };
  closeRecipePicker(); cancelSwap();
  renderDays(); saveState('meal_overrides', state.mealOverrides);
  resetShopIfConfirmed();
}

export function closeRecipePicker() { document.getElementById('recipePicker').classList.remove('open'); }
