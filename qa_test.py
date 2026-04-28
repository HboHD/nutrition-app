#!/usr/bin/env python3
"""QA tests for nutrition app (modular architecture) — run before deploy."""
import re, sys, os
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
sys.stderr.reconfigure(encoding='utf-8',errors='replace')

P = 0
F = 0
def ok(name, cond):
    global P, F
    if cond: P += 1; print(f"  ✓ {name}")
    else: F += 1; print(f"  ✗ FAIL: {name}")

def group(name):
    print(f"\n--- {name} ---")

# Load all files
with open('index.html',encoding='utf-8') as f: html = f.read()
with open('css/style.css',encoding='utf-8') as f: style = f.read()
with open('sw.js',encoding='utf-8') as f: sw = f.read()

js_files = {}
for fn in ['app.js','state.js','data.js','nutrition-db.js','supabase.js','plan.js','shop.js','pantry.js','recipes.js']:
    with open(f'js/{fn}',encoding='utf-8') as f: js_files[fn] = f.read()

# Combined JS for content checks
js_all = '\n'.join(js_files.values())

# =====================
# 1. FILE STRUCTURE
# =====================
group("File structure")
ok("index.html exists", os.path.exists('index.html'))
ok("css/style.css exists", os.path.exists('css/style.css'))
ok("sw.js exists", os.path.exists('sw.js'))
for fn in ['app.js','state.js','data.js','nutrition-db.js','supabase.js','plan.js','shop.js','pantry.js','recipes.js']:
    ok(f"js/{fn} exists", os.path.exists(f'js/{fn}'))
ok("index.html links style.css", 'css/style.css' in html)
ok("index.html loads app.js as module", 'type="module" src="js/app.js"' in html)

# =====================
# 2. HTML STRUCTURE
# =====================
group("HTML structure")
ok("DOCTYPE present", html.startswith("<!DOCTYPE html>"))
ok("lang=pl", 'lang="pl"' in html)
ok("charset UTF-8", 'charset="UTF-8"' in html)
ok("viewport meta", 'viewport' in html)
ok("Supabase SDK loaded", 'supabase.min.js' in html)
ok("manifest link", 'rel="manifest"' in html)
ok("apple-mobile-web-app-capable", 'apple-mobile-web-app-capable' in html)
ok("theme-color", 'theme-color' in html)
ok("no inline style tag", '<style>' not in html)
ok("no inline script (except module)", html.count('<script') == 2)  # SDK + module

# =====================
# 3. CSS CHECKS
# =====================
group("CSS integrity")
required_classes = [
    '.day', '.day-header', '.meal', '.macros', '.macro',
     
    '.shop', '.pantry', '.swap-bar', '.modal',
    '.recipe-opt', '.drag-handle', '.item', '.dept',
    '.p-form', '.p-item', '.p-del',
    '.meal.selected', '.day.dragging', '.day.drag-over',
    '.in-pantry', '.pantry-badge'
]
for cls in required_classes:
    ok(f"CSS: {cls} defined", cls in style)
ok("h2 AND h3 styled in .shop-head", '.shop-head h2,.shop-head h3' in style)
ok("swap-bar bottom >= 140px", 'bottom:140px' in style)
ok("fab z-index=110", 'z-index:110' in style)
ok("modal z-index=120", 'z-index:120' in style)
ok("treat CSS class", ".treat{" in style)
ok("no .boost CSS", ".boost{" not in style)

# =====================
# 4. ES MODULES
# =====================
group("ES modules")
ok("state.js exports state", "export const state" in js_files['state.js'])
ok("state.js exports SLOTS", "export const SLOTS" in js_files['state.js'])
ok("data.js exports DAYS", "export const DAYS" in js_files['data.js'])
ok("data.js exports SHOP", "export const SHOP" in js_files['data.js'])
ok("data.js exports RECIPES", "export const RECIPES" in js_files['data.js'])
ok("data.js exports RECIPES_INSP", "export const RECIPES_INSP" in js_files['data.js'])
ok("supabase.js exports saveState", "export function saveState" in js_files['supabase.js'])
ok("supabase.js exports loadState", "export async function loadState" in js_files['supabase.js'])
ok("plan.js exports renderDays", "export function renderDays" in js_files['plan.js'])
ok("shop.js exports renderShop", "export function renderShop" in js_files['shop.js'])
ok("pantry.js exports renderPantry", "export function renderPantry" in js_files['pantry.js'])
ok("recipes.js exports getAllRecipes", "export function getAllRecipes" in js_files['recipes.js'])
ok("app.js imports all modules", js_files['app.js'].count('import ') >= 5)
ok("app.js exposes window functions", "Object.assign(window" in js_files['app.js'])

# =====================
# 5. DATA INTEGRITY
# =====================
group("DAYS data")
data_js = js_files['data.js']
days_match = re.findall(r"hdr:'([^']+)'", data_js)
num_days = len(days_match)
ok(f"{num_days} days found", num_days >= 2)

meals_count = len(re.findall(r"(?<!alt:\{)name:'", data_js))
expected_meals = num_days * 5
ok(f"{expected_meals} meals total ({num_days} days × 5 slots) ({meals_count})", meals_count == expected_meals)

m_arrays = re.findall(r'm:\[(\d+),(\d+),(\d+),(\d+)\]', data_js)
ok(f"all meals have m[4] arrays ({len(m_arrays)} found)", len(m_arrays) >= expected_meals)
meal_names = re.findall(r"name:'([^']*)'", data_js)
for i, (kcal, p, c, f_) in enumerate(m_arrays[:expected_meals]):
    name = meal_names[i] if i < len(meal_names) else ''
    skipped = 'pominięt' in name.lower() or 'skip' in name.lower()
    ok(f"meal {i} kcal>0 or skipped", int(kcal) > 0 or skipped)

group("SHOP data")
ok("generateShop function exists", "function generateShop" in js_files['shop.js'])
ok("shop uses DEPT mapping", "DEPT[" in js_files['shop.js'] or "DEPT_NAMES" in js_files['shop.js'])
ok("shop uses PKG for rounding", "PKG[" in js_files['shop.js'])
ok("startEditShop in shop.js", "function startEditShop" in js_files['shop.js'])

group("RECIPES data")
recipe_entries = re.findall(r"\['([^']+)','([^']+)','(b|sb|d|s|p)',(\d+),(\d+),(\d+),(\d+),", data_js)
ok(f"recipes parsed ({len(recipe_entries)})", len(recipe_entries) >= 30)
slots_found = set(r[2] for r in recipe_entries)
ok("all 5 slots covered", slots_found == {'b', 'sb', 'd', 's', 'p'})

# =====================
# 6. FUNCTION CHECKS
# =====================
group("Required functions")
fn_checks = {
    'plan.js': ['getMeal', 'renderDays', 'toggle', 'initDrag', 'selectMeal', 'cancelSwap', 'openRecipePicker', 'pickRecipe'],
    'shop.js': ['pantryHas', 'renderShop', 'ck', 'shopToggle', 'shopClose'],
    'pantry.js': ['renderPantry', 'addPantryItem', 'delPantry', 'pantryToggle', 'pantryClose'],
    'supabase.js': ['showSync', 'saveState', 'loadState'],
    'recipes.js': ['getAllRecipes', 'renderRecipes', 'openRecipeDetail', 'openEditRecipe', 'calcEditMacros']
}
for fn_file, fns in fn_checks.items():
    for fn in fns:
        ok(f"{fn} in {fn_file}", f"function {fn}" in js_files[fn_file])

# =====================
# 7. SYNC & FEATURES
# =====================
group("Supabase sync")
sb_js = js_files['supabase.js']
ok("loadState loads day_order", "day_order" in sb_js)
ok("loadState loads shopping", "'shopping'" in sb_js)
ok("loadState loads pantry", "'pantry'" in sb_js)
ok("loadState loads meal_overrides", "'meal_overrides'" in sb_js)
ok("loadState loads shop_edits", "'shop_edits'" in sb_js)
ok("loadState loads recipe_edits", "'recipe_edits'" in sb_js)
ok("loadState loads user_recipes", "'user_recipes'" in sb_js)
ok("realtime subscription", ".subscribe()" in sb_js)
ok("error handling .catch", ".catch(" in sb_js)
ok("network error message", "brak sieci" in sb_js)

group("Dynamic shopping")
shop_js = js_files['shop.js']
ok("generateShop function", "function generateShop" in shop_js)
ok("getShopData uses snapshot", "shopSnapshot" in shop_js)
ok("refreshShop regenerates", "function refreshShop" in shop_js)
ok("startEditShop function", "function startEditShop" in shop_js)
ok("shop uses DEPT mapping", "DEPT[" in shop_js)
ok("shop uses PKG for rounding", "PKG[" in shop_js)
ok("shop handles alt meals", "alt" in shop_js and "baseMeal" in shop_js)
ok("swap confirm before shop update", "askRefreshShop" in js_files['plan.js'] or "refreshShop" in js_files['plan.js'])

group("Person variants")
ok("person state in state.js", "person:" in js_files['state.js'])
ok("setPerson in app.js", "setPerson" in js_files['app.js'])
ok("getMeal handles alt", "alt" in js_files['plan.js'] and "person" in js_files['plan.js'])
ok("alt meals in DAYS", "alt:{" in data_js)
ok("person toggle in HTML", "personToggle" in html or "setPerson" in html)

group("Prep time & recipes")
ndb_js = js_files['nutrition-db.js']
# Check all base recipes have prep_time (11th element)
prep_times = re.findall(r",(\d+)\](?:,|\n)", data_js.split('RECIPES_INSP')[0])
ok(f"base recipes have prep_time ({len(prep_times)}/{len(recipe_entries)})", len(prep_times) >= 50)
# Check DEPT covers common ingredients
dept_items = re.findall(r"'([^']+)':\d", ndb_js)
ok(f"DEPT maps {len(dept_items)} ingredients", len(dept_items) >= 50)
pkg_items = re.findall(r"'([^']+)':\[", ndb_js)
ok(f"PKG maps {len(pkg_items)} packages", len(pkg_items) >= 40)
# Check recipe ingredients are in DEPT
recipe_ings = set(re.findall(r"item:'([^']+)'", data_js.split('RECIPES_INSP')[0]))
dept_set = set(dept_items)
unmapped = recipe_ings - dept_set
ok(f"recipe ingredients in DEPT ({len(unmapped)} unmapped)", len(unmapped) <= 5)

group("Features")
ok("day open state preserved", "openSet" in js_files['plan.js'])
ok("meals have recipe IDs", "rid:" in data_js)
ok("pantry exact match (no substring)", "=== name" in shop_js)
ok("pantry sort uses .slice()", ".slice().sort" in js_files['pantry.js'])
ok("pantry auto-add on long-term purchase", "LONG_TERM" in shop_js)
ok("recipe picker filters by slot", "r.slot===slot" in js_all or "r.slot === slot" in js_all)
ok("macro comparison in picker", "ro-plus" in js_all and "ro-minus" in js_all)
ok("drag handle present", "drag-handle" in js_all)
ok("pointerdown for drag", "pointerdown" in js_all)
ok("treat budget calculated", "treatMax" in js_all)
ok("treat budget uses 15% cap", "target*0.15" in js_all or "target * 0.15" in js_all)
ok("snack recipes in RECIPES", any(r[2]=='p' for r in recipe_entries))
ok("NUT database has entries", "export const NUT" in ndb_js)
ok("DEPT mapping exists", "export const DEPT" in ndb_js)
ok("DEPT_NAMES exists", "export const DEPT_NAMES" in ndb_js)
ok("PKG mapping exists", "export const PKG" in ndb_js)
ok("prep_time in recipe detail", "prep" in js_files['recipes.js'])

# =====================
# 8. SERVICE WORKER
# =====================
group("Service Worker")
ok("sw.js exists and readable", len(sw) > 0)
ok("fetch event handler", "self.addEventListener('fetch'" in sw)
ok("cache strategy (network-first)", "fetch(e.request).then" in sw)
ok("cache versioning", "const V=" in sw)
ok("sw caches CSS file", "css/style.css" in sw)
ok("sw caches JS modules", "js/app.js" in sw)
ok("sw caches all JS files", sw.count("js/") >= 7)

# =====================
# SUMMARY
# =====================
print(f"\n{'='*40}")
if F:
    print(f"❌ {F} FAILED — {P} passed, {F} failed")
else:
    print(f"✅ ALL PASSED — {P} passed, {F} failed")
sys.exit(1 if F else 0)
