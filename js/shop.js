import { state } from './state.js';
import { DAYS, RECIPES, RECIPES_INSP } from './data.js';
import { DEPT, DEPT_NAMES, PKG } from './nutrition-db.js';
import { saveState } from './supabase.js';
import { getMeal } from './plan.js';

// --- Find recipe by id across all sources ---
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

// --- Generate shopping list from current plan ---
export function generateShop() {
  var items = {}; // key → { total_g: N, counts: N, unit: 'g'|'szt'|'', dept: N }

  state.dayOrder.forEach(function(di, pos) {
    var d = DAYS[di];
    for (var s = 0; s < d.meals.length; s++) {
      var ml = getMeal(pos, s);
      // Skip leftovers
      if (ml.tag && ml.tag.indexOf('🔄') >= 0) continue;
      // Skip skipped meals
      if (ml.m[0] === 0) continue;

      var rid = ml.rid || ml.recipeId;
      var recipe = findRecipe(rid);
      if (!recipe || !recipe.ing || !recipe.ing.length) continue;

      // Check if meal has alt variant (both people eat different things)
      var baseMeal = DAYS[di].meals[s];
      var hasAlt = baseMeal && baseMeal.alt;
      var mult = hasAlt ? 1 : (recipe.servings === 1 ? 2 : 1);

      recipe.ing.forEach(function(ig) {
        var key = ig.item;
        if (!items[key]) items[key] = { total_g: 0, counts: [], dept: DEPT[key] != null ? DEPT[key] : 9 };

        if (ig.amount_g) {
          items[key].total_g += parseFloat(ig.amount_g) * mult;
        } else if (ig.amount) {
          items[key].counts.push(ig.amount);
        }
      });

      // Also add alt variant ingredients (for the other person)
      if (hasAlt) {
        var altRecipe = findRecipe(baseMeal.alt.rid);
        if (altRecipe && altRecipe.ing) {
          altRecipe.ing.forEach(function(ig) {
            var key = ig.item;
            if (!items[key]) items[key] = { total_g: 0, counts: [], dept: DEPT[key] != null ? DEPT[key] : 9 };
            if (ig.amount_g) items[key].total_g += parseFloat(ig.amount_g);
            else if (ig.amount) items[key].counts.push(ig.amount);
          });
        }
      }
    }
  });

  // Format into department groups
  var deptBuckets = {};
  DEPT_NAMES.forEach(function(name) { deptBuckets[name] = []; });

  Object.keys(items).sort().forEach(function(key) {
    var info = items[key];
    var deptName = DEPT_NAMES[info.dept] || DEPT_NAMES[9];
    var qty;

    if (info.total_g > 0) {
      var pkg = PKG[key];
      if (pkg) {
        var needed = Math.ceil(info.total_g / pkg[0]);
        qty = needed + ' × ' + pkg[2];
      } else {
        qty = Math.round(info.total_g) + 'g';
      }
    } else if (info.counts.length) {
      // Aggregate piece counts
      var totalPcs = 0;
      info.counts.forEach(function(c) {
        var n = parseFloat(c);
        if (!isNaN(n)) totalPcs += n;
      });
      if (totalPcs > 0) {
        var pkg = PKG[key];
        if (pkg && pkg[1] === 'szt') {
          qty = Math.ceil(totalPcs / pkg[0]) + ' × ' + pkg[2];
        } else {
          qty = Math.ceil(totalPcs) + ' szt';
        }
      } else {
        qty = info.counts.join(' + ');
      }
    } else {
      qty = '1';
    }

    deptBuckets[deptName].push(key + ' — ' + qty);
  });

  // Return only non-empty departments
  return DEPT_NAMES.filter(function(name) { return deptBuckets[name].length > 0; })
    .map(function(name) { return [name, deptBuckets[name]]; });
}

// --- Get current shop data (snapshot or fresh) ---
export function getShopData() {
  return generateShop();
}

export function refreshShop() {
  var oldSnap = state.shopSnapshot || [];
  var newSnap = generateShop();

  // Build old map: itemName → checked (by scanning old snapshot + shopChecked)
  var oldMap = {};
  oldSnap.forEach(function(d, di) {
    d[1].forEach(function(it, ii) {
      var name = it.split(' — ')[0];
      oldMap[name] = { checked: !!state.shopChecked[di + '_' + ii], qty: it.split(' — ')[1] || '' };
    });
  });

  // Build new checked state + detect changes
  var newChecked = {};
  var changes = {}; // itemName → 'new' | 'changed'
  newSnap.forEach(function(d, di) {
    d[1].forEach(function(it, ii) {
      var name = it.split(' — ')[0];
      var newQty = it.split(' — ')[1] || '';
      var k = di + '_' + ii;
      if (oldMap[name]) {
        if (oldMap[name].checked) newChecked[k] = 1;
        if (oldMap[name].qty !== newQty) changes[name] = 'changed';
        delete oldMap[name];
      } else {
        changes[name] = 'new';
      }
    });
  });

  state.shopSnapshot = newSnap;
  state.shopChecked = newChecked;
  state.shopChanges = changes;
  saveState('shopping', state.shopChecked);
  renderShop();

  // Toast summary
  var added = 0, changed = 0;
  Object.keys(changes).forEach(function(n) { if (changes[n] === 'new') added++; else changed++; });
  var removed = Object.keys(oldMap).length;
  if (added || changed || removed) {
    var parts = [];
    if (added) parts.push('+' + added + ' nowych');
    if (changed) parts.push(changed + ' zmienionych');
    if (removed) parts.push('-' + removed + ' usuniętych');
    showToast('Lista zaktualizowana: ' + parts.join(', '));
  }

  // Clear highlights after 8s
  setTimeout(function() { state.shopChanges = {}; renderShop(); }, 8000);
}

// --- Pantry matching (exact, quantity-aware) ---
export function pantryHas(shopItem) {
  var parts = shopItem.split(' — ');
  var name = parts[0].toLowerCase().trim();
  var p = state.pantry.find(function(x) { return x.item.toLowerCase().trim() === name; });
  if (!p) return false;
  // If we can parse both quantities, compare
  var needQty = parts[1] ? parseShopQty(parts[1]) : null;
  var haveQty = p.qty ? parseShopQty(p.qty) : null;
  if (needQty && haveQty && needQty.unit === haveQty.unit) return haveQty.val >= needQty.val;
  return true; // can't compare, just show "masz"
}

function parseShopQty(s) {
  var m = s.match(/(\d+)\s*×\s*(\d+)\s*(g|kg|ml|L|szt)/i);
  if (m) { var n = parseInt(m[1]) * parseInt(m[2]), u = m[3].toLowerCase(); if (u==='kg'||u==='l') n*=1000; return {val:n, unit:u==='szt'?'szt':'g'}; }
  m = s.match(/(\d+)\s*(g|kg|ml|szt)/i);
  if (m) { var n2 = parseInt(m[1]), u2 = m[2].toLowerCase(); if (u2==='kg') n2*=1000; return {val:n2, unit:u2==='szt'?'szt':'g'}; }
  return null;
}

// --- Render shopping list ---
export function renderShop() {
  var shopData = state.shopCleared ? [] : getShopData();
  var h = '', total = 0, done = 0;

  shopData.forEach(function(d, di) {
    h += '<div class="dept"><div class="dept-name">' + d[0] + '</div>';
    d[1].forEach(function(it, ii) {
      var k = di + '_' + ii, inP = pantryHas(it);
      // Apply user edits
      var edited = state.shopEdits && state.shopEdits[it.split(' — ')[0]];
      var display = edited ? edited.item + ' — ' + edited.qty : it;
      var origKey = it.split(' — ')[0].replace(/'/g, "\\'");
      var chg = state.shopChanges && state.shopChanges[it.split(' — ')[0]];
      var chgClass = chg === 'new' ? ' shop-new' : chg === 'changed' ? ' shop-changed' : '';
      var chgBadge = chg === 'new' ? '<span class="shop-badge new">nowy</span>' : chg === 'changed' ? '<span class="shop-badge chg">zmiana</span>' : '';
      total++; if (state.shopChecked[k]) done++;
      h += '<div class="item' + (state.shopChecked[k] ? ' done' : '') + (inP ? ' in-pantry' : '') + chgClass + '">' +
        '<input type="checkbox" id="c' + k + '"' + (state.shopChecked[k] ? ' checked' : '') + ' onchange="ck(\'' + k + '\',this)">' +
        '<span class="item-text" onclick="startEditShop(this,\'' + origKey + '\')">' + display + '</span>' +
        (inP ? '<span class="pantry-badge">masz ✓</span>' : '') + chgBadge +
        '</div>';
    }); h += '</div>';
  });

  if (state.customShopItems.length) {
    h += '<div class="dept"><div class="dept-name">✏️ Dodane ręcznie</div>';
    state.customShopItems.forEach(function(ci, i) {
      total++; if (ci.checked) done++;
      h += '<div class="item' + (ci.checked ? ' done' : '') + '"><input type="checkbox"' + (ci.checked ? ' checked' : '') + ' onchange="ckCustom(' + i + ',this)"><label>' + ci.item + '</label><button class="p-del" onclick="delShopItem(' + i + ')">✕</button></div>';
    }); h += '</div>';
  }

  if (!h) h = '<div style="color:#666;text-align:center;padding:20px">Lista pusta</div>';
  document.getElementById('shopList').innerHTML = h;
  document.getElementById('prog').textContent = total ? done + ' / ' + total + ' ✓' : '';
}

// --- Tap-to-edit shop item ---
export function startEditShop(el, origName) {
  var text = el.textContent;
  var input = document.createElement('input');
  input.type = 'text'; input.value = text;
  input.onblur = function() {
    var val = input.value.trim();
    if (val && val !== text) {
      var parts = val.split(' — ');
      if (!state.shopEdits) state.shopEdits = {};
      state.shopEdits[origName] = { item: parts[0].trim(), qty: parts[1] ? parts[1].trim() : '' };
      saveState('shop_edits', state.shopEdits);
    }
    var span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = val || text;
    span.onclick = function() { startEditShop(span, origName); };
    input.replaceWith(span);
  };
  input.onkeydown = function(e) { if (e.key === 'Enter') input.blur(); };
  el.replaceWith(input);
  input.focus();
  input.select();
}

// --- Standard shop functions ---
export function addShopItem(form) {
  var d = new FormData(form);
  state.customShopItems.push({ item: d.get('item'), checked: false });
  form.reset(); renderShop(); saveState('custom_shop', state.customShopItems); return false;
}

export function ckCustom(i, el) {
  state.customShopItems[i].checked = el.checked;
  renderShop(); saveState('custom_shop', state.customShopItems);
}

export function delShopItem(i) { state.customShopItems.splice(i, 1); renderShop(); saveState('custom_shop', state.customShopItems); }

export function clearShop() {
  if (!confirm('Wyczyścić zaznaczenia? Ręcznie dodane produkty zostaną.')) return;
  state.shopCleared = true; state.shopChecked = {};
  saveState('shopping', state.shopChecked); saveState('shop_cleared', { cleared: true }); renderShop();
}

export function ck(k, el) {
  var shopData = getShopData();
  if (el.checked) {
    state.shopChecked[k] = 1;
    // Auto-add long-term items to pantry (puszki:2, suche:3, jajka:4, mrożonki:8, inne:9 + masło)
    var parts = k.split('_'), di = +parts[0], ii = +parts[1];
    var LONG_TERM = { 2: 1, 3: 1, 4: 1, 8: 1, 9: 1 };
    if (shopData[di] && shopData[di][1] && shopData[di][1][ii]) {
      var itemName = shopData[di][1][ii].split(' — ')[0];
      var qty = shopData[di][1][ii].split(' — ')[1] || '';
      var deptIdx = DEPT_NAMES.indexOf(shopData[di][0]);
      if (LONG_TERM[deptIdx] || itemName === 'masło') {
        var existing = state.pantry.find(function(p) { return p.item === itemName; });
        if (existing) { existing.qty = qty; existing.exp = ''; }
        else { state.pantry.push({ item: itemName, qty: qty, exp: '' }); }
        saveState('pantry', state.pantry);
      }
    }
  } else { delete state.shopChecked[k]; }
  el.parentElement.classList.toggle('done', el.checked);
  renderShop(); saveState('shopping', state.shopChecked);
}

export function shopToggle() { renderShop(); }
export function shopClose() { }

function showToast(msg) {
  var t = document.getElementById('shopToast');
  if (!t) { t = document.createElement('div'); t.id = 'shopToast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 4000);
}
