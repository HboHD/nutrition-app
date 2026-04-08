#!/usr/bin/env python3
"""QA tests for nutrition app — run before deploy."""
import json, re, sys

# === Load and parse index.html ===
with open('index.html') as f:
    html = f.read()

P = 0
F = 0
def ok(name, cond):
    global P, F
    if cond:
        P += 1; print(f"  ✓ {name}")
    else:
        F += 1; print(f"  ✗ FAIL: {name}")

def eq(name, a, b):
    ok(f"{name} ({a!r} == {b!r})", a == b)

def group(name):
    print(f"\n--- {name} ---")

# =====================
# 1. HTML STRUCTURE
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

# No orphan CSS classes used in HTML
ok("no .shop-btn in HTML (removed)", 'class="shop-btn"' not in html)
ok("no .shop-btn in CSS", '.shop-btn{' not in html)

# =====================
# 2. CSS CHECKS
# =====================
group("CSS integrity")
style = re.search(r'<style>(.*?)</style>', html, re.DOTALL).group(1)

required_classes = [
    '.day', '.day-header', '.meal', '.macros', '.macro',
    '.fab-group', '.fab', '.fab-shop', '.fab-pantry',
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

# =====================
# 3. JS STRUCTURE
# =====================
group("JS structure")
script = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
ok("script tag found", script is not None)
js = script.group(1)

ok("Supabase client created", "supabase.createClient(" in js)
ok("SW registration relative path", "register('sw.js')" in js)
ok("SW registration NOT absolute", "register('/sw.js')" not in js)
ok("DAYS array defined", "var DAYS=[" in js)
ok("SHOP array defined", "var SHOP=[" in js)
ok("RECIPES array defined", "var RECIPES=[" in js)
ok("LONG_TERM defined", "var LONG_TERM=" in js)
ok("LONG_TERM_ITEMS defined", "var LONG_TERM_ITEMS=" in js)
ok("mealOverrides state", "var mealOverrides=" in js)

# Override key uses dayOrder[pos] not pos directly
ok("getMeal key = dayOrder[pos]+'_'+slot", "dayOrder[pos]+'_'+slot" in js)
ok("selectMeal kA uses dayOrder", "kA=dayOrder[selected.pos]" in js)
ok("selectMeal kB uses dayOrder", "kB=dayOrder[pos]" in js)

# =====================
# 4. FUNCTIONS PRESENT
# =====================
group("Required functions")
fns = ['getMeal', 'renderDays', 'toggle', 'initDrag',
       'pantryHas', 'renderShop', 'ck', 'shopToggle', 'shopClose',
       'selectMeal', 'cancelSwap', 'openRecipePicker', 'pickRecipe', 'closeRecipePicker',
       'renderPantry', 'addPantryItem', 'delPantry', 'pantryToggle', 'pantryClose',
       'showSync', 'saveState', 'loadState']
for fn in fns:
    ok(f"function {fn}", f"function {fn}" in js)

# =====================
# 5. DATA INTEGRITY
# =====================
group("DAYS data")
days_match = re.findall(r"hdr:'([^']+)'", js)
ok(f"4 days found ({len(days_match)})", len(days_match) == 4)

meals_count = js.count("name:'")
ok(f"20 meals total (4 days × 5 slots) ({meals_count})", meals_count == 20)

# All meals have m:[4 numbers]
m_arrays = re.findall(r'm:\[(\d+),(\d+),(\d+),(\d+)\]', js)
ok(f"all meals have m[4] arrays ({len(m_arrays)} found)", len(m_arrays) >= 20)
for i, (kcal, p, c, f_) in enumerate(m_arrays[:16]):
    ok(f"meal {i} kcal>0", int(kcal) > 0)

group("SHOP data")
shop_depts = re.findall(r'\["([^"]+)",\[', js)
ok(f"10 shop departments ({len(shop_depts)})", len(shop_depts) == 10)

# All items have " — " separator
shop_items = re.findall(r'"([^"]+) — ([^"]+)"', js)
ok(f"shop items have separator ({len(shop_items)} items)", len(shop_items) >= 20)

group("RECIPES data")
recipe_entries = re.findall(r"\['([^']+)','([^']+)','(b|sb|d|s|p)',(\d+),(\d+),(\d+),(\d+)\]", js)
ok(f"recipes parsed ({len(recipe_entries)})", len(recipe_entries) >= 30)
slots_found = set(r[2] for r in recipe_entries)
ok("all 5 slots covered", slots_found == {'b', 'sb', 'd', 's', 'p'})

# =====================
# 6. SYNC & ERROR HANDLING
# =====================
group("Supabase sync")
ok("loadState loads day_order", "r.key==='day_order'" in js)
ok("loadState loads shopping", "r.key==='shopping'" in js)
ok("loadState loads pantry", "r.key==='pantry'" in js)
ok("loadState loads meal_overrides", "r.key==='meal_overrides'" in js)
ok("realtime channel subscribed", ".subscribe()" in js)
ok("realtime handles meal_overrides", "meal_overrides" in js.split('.subscribe')[0].split("channel('sync')")[1])
ok("error handling .catch", ".catch(" in js)
ok("showSync for errors", "showSync(" in js)
ok("network error message", "brak sieci" in js)

# =====================
# 7. FEATURE CHECKS
# =====================
group("Features")
ok("day open state preserved", "openSet" in js)
ok("pantry sort uses .slice()", "pantry.slice().sort" in js)
ok("pantry auto-add on long-term purchase", "LONG_TERM[di]||LONG_TERM_ITEMS[k]" in js)
ok("pantry duplicate updates qty", "existing.qty=qty" in js)
ok("recipe picker filters by slot", "r[2]===slot" in js)
ok("macro comparison in picker", "ro-plus" in js and "ro-minus" in js)
ok("drag handle present", "drag-handle" in js)
ok("pointerdown for drag", "pointerdown" in js)
ok("5 meal slots (SLOTS)", "['b','sb','d','s','p']" in js)
ok("treat budget calculated", "treatMax" in js)
ok("treat budget uses 15% cap", "target*0.15" in js)
ok("no boost references", "d.boost" not in js)
ok("treat CSS class", ".treat{" in style)
ok("no .boost CSS", ".boost{" not in style)
ok("snack recipes in RECIPES", any(r[2]=='p' for r in recipe_entries))

# =====================
# 8. SERVICE WORKER
# =====================
group("Service Worker")
with open('sw.js') as f:
    sw = f.read()
ok("sw.js exists and readable", len(sw) > 0)
ok("fetch event handler", "self.addEventListener('fetch'" in sw)
ok("cache strategy (network-first)", "fetch(e.request).then" in sw or "fetch(e.request).catch" in sw)
ok("cache versioning", "const V=" in sw or "var V=" in sw)

# =====================
# SUMMARY
# =====================
print(f"\n{'='*40}")
if F:
    print(f"❌ {F} FAILED — {P} passed, {F} failed")
else:
    print(f"✅ ALL PASSED — {P} passed, {F} failed")
sys.exit(1 if F else 0)
