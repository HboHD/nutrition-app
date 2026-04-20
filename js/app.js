import { state } from './state.js';
import { DAYS } from './data.js';
import { loadState, initRealtime, showSync } from './supabase.js';
import { renderDays, toggle, selectMeal, cancelSwap, clearMeal, openRecipePicker, pickRecipe, closeRecipePicker } from './plan.js';
import { renderShop, shopToggle, shopClose, ck, ckCustom, addShopItem, delShopItem, clearShop, startEditShop, refreshShop } from './shop.js';
import { renderPantry, pantryToggle, pantryClose, addPantryItem, delPantry, editPantryItem, startEditPantry, consumePlan } from './pantry.js';
import { renderRecipes, filterRecipes, filterSource, searchRecipes, openRecipeDetail, closeRecipeDetail, openEditRecipe, saveEditRecipe, openAddRecipe, saveNewRecipe, deleteRecipe, addIngRow, calcEditMacros } from './recipes.js';

// --- Tab switching (bottom nav) ---
var currentTab = 'plan';
function switchTab(t) {
  currentTab = t;
  ['planView', 'shopView', 'pantryView', 'recipesView'].forEach(function(id) {
    document.getElementById(id).classList.remove('active');
  });
  document.querySelectorAll('.bnav button').forEach(function(b, i) {
    b.classList.toggle('active', ['plan', 'shop', 'pantry', 'recipes'][i] === t);
  });
  var viewMap = { plan: 'planView', shop: 'shopView', pantry: 'pantryView', recipes: 'recipesView' };
  document.getElementById(viewMap[t]).classList.add('active');
  document.getElementById('targetBar').style.display = t === 'plan' ? 'block' : 'none';
  if (t === 'shop') renderShop();
  if (t === 'pantry') renderPantry();
  if (t === 'recipes') renderRecipes();
}

// --- Person (first-time prompt + subtle toggle) ---
function initPerson() {
  var saved = localStorage.getItem('person');
  if (!saved) {
    document.getElementById('personPrompt').style.display = 'flex';
  } else {
    state.person = saved;
    updatePersonIcon();
  }
}

function setPerson(p) {
  state.person = p;
  localStorage.setItem('person', p);
  document.getElementById('personPrompt').style.display = 'none';
  updatePersonIcon();
  renderDays();
}

function togglePerson() {
  setPerson(state.person === 'on' ? 'ona' : 'on');
}

function updatePersonIcon() {
  document.getElementById('personBtn').textContent = state.person === 'on' ? '🧔' : '👩';
}

// --- Sync indicator ---
function setSyncDot(status) {
  var dot = document.getElementById('syncDot');
  if (dot) dot.className = 'sync-dot ' + status;
}

// --- Expose functions to window for onclick handlers ---
Object.assign(window, {
  switchTab, setPerson, togglePerson, toggle, selectMeal, cancelSwap, clearMeal, openRecipePicker, pickRecipe, closeRecipePicker,
  shopToggle, shopClose, ck, ckCustom, addShopItem, delShopItem, clearShop, startEditShop, refreshShop,
  pantryToggle, pantryClose, addPantryItem, delPantry, editPantryItem, startEditPantry, consumePlan,
  renderRecipes, filterRecipes, filterSource, searchRecipes, openRecipeDetail, closeRecipeDetail,
  openEditRecipe, saveEditRecipe, openAddRecipe, saveNewRecipe, deleteRecipe, addIngRow, calcEditMacros
});

// --- Init ---
state.dayOrder = DAYS.map(function(_, i) { return i; });

initPerson();
setSyncDot('loading');

loadState().then(function() {
  renderDays();
  setSyncDot('ok');
}).catch(function() {
  renderDays();
  setSyncDot('err');
});

initRealtime({
  onPlan: renderDays,
  onShop: function() { if (currentTab === 'shop') renderShop(); },
  onPantry: function() { if (currentTab === 'pantry') renderPantry(); },
  onRecipes: function() { if (currentTab === 'recipes') renderRecipes(); }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
