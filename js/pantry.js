import { state } from './state.js';
import { saveState } from './supabase.js';

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
    h += '<div class="p-item"><div class="p-info"><span class="p-name">' + p.item + '</span>' + (p.qty ? ' · ' + p.qty : '') + '<br><span class="p-meta' + expClass + '">' + (expStr || 'brak daty') + '</span></div><button class="p-del" onclick="delPantry(' + idx + ')">✕</button></div>';
  });
  document.getElementById('pantryList').innerHTML = h || '<div style="color:#666;text-align:center;padding:20px">Spiżarnia pusta</div>';
}

export function addPantryItem(form) {
  var d = new FormData(form);
  state.pantry.push({ item: d.get('item'), qty: d.get('qty') || '', exp: d.get('exp') || '' });
  form.reset(); renderPantry(); saveState('pantry', state.pantry); return false;
}

export function delPantry(i) { state.pantry.splice(i, 1); renderPantry(); saveState('pantry', state.pantry); }

export function pantryToggle() { renderPantry(); }
export function pantryClose() { }
