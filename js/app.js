import { state } from './state.js';
import { DAYS } from './data.js';
import { loadState, initRealtime } from './supabase.js';
import { renderDays, toggle, selectMeal, cancelSwap, openRecipePicker, pickRecipe, closeRecipePicker } from './plan.js';
import { renderShop, shopToggle, shopClose, ck, ckCustom, addShopItem, delShopItem, clearShop, editShopItem, refreshShop } from './shop.js';
import { renderPantry, pantryToggle, pantryClose, addPantryItem, delPantry } from './pantry.js';
import { renderRecipes, filterRecipes, filterSource, openRecipeDetail, closeRecipeDetail, openEditRecipe, saveEditRecipe, openAddRecipe, saveNewRecipe, deleteRecipe, addIngRow, calcEditMacros } from './recipes.js';

// --- Tab switching ---
function switchTab(t) {
  document.querySelectorAll('.tab').forEach(function(el) { el.classList.toggle('active', el.textContent.indexOf(t === 'plan' ? 'Plan' : 'Przepisy') >= 0); });
  document.getElementById('planView').classList.toggle('active', t === 'plan');
  document.getElementById('recipesView').classList.toggle('active', t === 'recipes');
  document.getElementById('fabAdd').classList.toggle('show', t === 'recipes');
  document.querySelector('.fab-group').style.display = t === 'plan' ? 'flex' : 'none';
  document.querySelector('.target').style.display = t === 'plan' ? 'block' : 'none';
  if (t === 'recipes') renderRecipes();
}

// --- Expose functions to window for onclick handlers ---
Object.assign(window, {
  switchTab, toggle, selectMeal, cancelSwap, openRecipePicker, pickRecipe, closeRecipePicker,
  shopToggle, shopClose, ck, ckCustom, addShopItem, delShopItem, clearShop, editShopItem, refreshShop,
  pantryToggle, pantryClose, addPantryItem, delPantry,
  renderRecipes, filterRecipes, filterSource, openRecipeDetail, closeRecipeDetail,
  openEditRecipe, saveEditRecipe, openAddRecipe, saveNewRecipe, deleteRecipe, addIngRow, calcEditMacros
});

// --- Init ---
state.dayOrder = DAYS.map(function(_, i) { return i; });

loadState().then(function() { renderDays(); });

initRealtime({
  onPlan: renderDays,
  onShop: function() { if (document.getElementById('shop').classList.contains('open')) renderShop(); },
  onPantry: function() { if (document.getElementById('pantry').classList.contains('open')) renderPantry(); },
  onRecipes: renderRecipes
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
