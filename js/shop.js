import { state } from './state.js';
import { SHOP, LONG_TERM, LONG_TERM_ITEMS } from './data.js';
import { saveState } from './supabase.js';

export function pantryHas(shopItem) {
  var name = shopItem.split(' — ')[0].toLowerCase();
  return state.pantry.some(function(p) { return name.indexOf(p.item.toLowerCase()) >= 0 || p.item.toLowerCase().indexOf(name) >= 0; });
}

export function renderShop() {
  var h = '', total = 0, done = 0;
  if (!state.shopCleared) {
    SHOP.forEach(function(d, di) {
      h += '<div class="dept"><div class="dept-name">' + d[0] + '</div>';
      d[1].forEach(function(it, ii) {
        var k = di + '_' + ii, inP = pantryHas(it); total++; if (state.shopChecked[k]) done++;
        h += '<div class="item' + (state.shopChecked[k] ? ' done' : '') + (inP ? ' in-pantry' : '') + '"><input type="checkbox" id="c' + k + '"' + (state.shopChecked[k] ? ' checked' : '') + ' onchange="ck(\'' + k + '\',this)"><label for="c' + k + '">' + it + '</label>' + (inP ? '<span class="pantry-badge">masz ✓</span>' : '') + '</div>';
      }); h += '</div>';
    });
  }
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
  if (el.checked) {
    state.shopChecked[k] = 1;
    var parts = k.split('_'), di = +parts[0], ii = +parts[1];
    if (LONG_TERM[di] || LONG_TERM_ITEMS[k]) {
      var itemName = SHOP[di][1][ii].split(' — ')[0];
      var qty = SHOP[di][1][ii].split(' — ')[1] || '';
      var existing = state.pantry.find(function(p) { return p.item === itemName; });
      if (existing) { existing.qty = qty; existing.exp = ''; }
      else { state.pantry.push({ item: itemName, qty: qty, exp: '' }); }
      saveState('pantry', state.pantry);
    }
  } else { delete state.shopChecked[k]; }
  el.parentElement.classList.toggle('done', el.checked);
  renderShop(); saveState('shopping', state.shopChecked);
}

export function shopToggle() {
  if (document.getElementById('shop').classList.contains('open')) { shopClose(); return; }
  document.getElementById('pantry').classList.remove('open');
  document.getElementById('shop').classList.add('open'); renderShop();
}

export function shopClose() { document.getElementById('shop').classList.remove('open'); }
