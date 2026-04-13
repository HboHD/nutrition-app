import { state } from './state.js';

const sb = supabase.createClient('https://tkfxjkleaeuwqqaeiigt.supabase.co', 'sb_publishable_lECu6yNlYFf_QPMgmzXW5g_R41cyMXo');

var saveTimer = {};

export function showSync(msg) {
  ['syncStatus', 'syncStatus2'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.textContent = msg;
  });
  setTimeout(function() { ['syncStatus', 'syncStatus2'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.textContent = '';
  }); }, 2000);
}

export function saveState(key, val) {
  clearTimeout(saveTimer[key]);
  saveTimer[key] = setTimeout(function() {
    sb.from('app_state').upsert({ key: key, value: val, updated_at: new Date().toISOString() })
      .then(function(res) { if (res.error) showSync('⚠ błąd zapisu'); else showSync('✓ zsynchronizowano'); })
      .catch(function() { showSync('⚠ brak sieci'); });
  }, 300);
}

export async function loadState() {
  var { data } = await sb.from('app_state').select('*');
  if (data) data.forEach(function(r) {
    if (r.key === 'day_order' && r.value && r.value.length) state.dayOrder = r.value;
    if (r.key === 'shopping' && r.value) state.shopChecked = r.value;
    if (r.key === 'pantry' && Array.isArray(r.value)) state.pantry = r.value;
    if (r.key === 'meal_overrides' && r.value) state.mealOverrides = r.value;
    if (r.key === 'custom_shop' && Array.isArray(r.value)) state.customShopItems = r.value;
    if (r.key === 'shop_cleared' && r.value) state.shopCleared = !!r.value.cleared;
    if (r.key === 'recipe_edits' && r.value) state.recipeEdits = r.value;
    if (r.key === 'user_recipes' && Array.isArray(r.value)) state.userRecipes = r.value;
  });
}

export function initRealtime(handlers) {
  sb.channel('sync').on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, function(p) {
    var r = p.new;
    if (r.key === 'day_order' && r.value && r.value.length) { state.dayOrder = r.value; handlers.onPlan(); }
    if (r.key === 'shopping' && r.value) { state.shopChecked = r.value; handlers.onShop(); }
    if (r.key === 'pantry' && Array.isArray(r.value)) { state.pantry = r.value; handlers.onPantry(); handlers.onShop(); }
    if (r.key === 'meal_overrides' && r.value) { state.mealOverrides = r.value; handlers.onPlan(); }
    if (r.key === 'custom_shop' && Array.isArray(r.value)) { state.customShopItems = r.value; handlers.onShop(); }
    if (r.key === 'shop_cleared' && r.value) { state.shopCleared = !!r.value.cleared; handlers.onShop(); }
    if (r.key === 'recipe_edits' && r.value) { state.recipeEdits = r.value; handlers.onRecipes(); }
    if (r.key === 'user_recipes' && Array.isArray(r.value)) { state.userRecipes = r.value; handlers.onRecipes(); }
  }).subscribe();
}
