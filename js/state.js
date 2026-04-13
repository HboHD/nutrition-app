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
  rFilter: 'all',
  rSource: 'base'
};

export const SLOTS = ['b', 'sb', 'd', 's', 'p'];

export function slotLabel(s) {
  return { b: '🥣 Śniadanie', sb: '🥞 II śniadanie', d: '🍲 Obiad', s: '🥗 Kolacja', p: '🥜 Przekąska' }[s] || s;
}
