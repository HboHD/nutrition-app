export const state = {
  dayOrder: [],
  shopChecked: {},
  pantry: [],
  mealOverrides: {},
  selected: null,
  customShopItems: [],
  shopCleared: false,
  recipeEdits: {},
  userRecipes: [],
  shopEdits: {},
  shopSnapshot: null,
  rFilter: 'all',
  rSource: 'base',
  person: localStorage.getItem('person') || 'on'
};

export const SLOTS = ['b', 'sb', 'd', 's', 'p'];

export function slotLabel(s) {
  return { b: '🥣 Śniadanie', sb: '🥞 II śniadanie', d: '🍲 Obiad', s: '🥗 Kolacja', p: '🥜 Przekąska' }[s] || s;
}
