#!/usr/bin/env python3
"""UX tests — validate app from user's perspective."""
import re, sys

P = 0; F = 0
def ok(name, cond):
    global P, F
    if cond: P += 1; print(f"  ✓ {name}")
    else: F += 1; print(f"  ✗ FAIL: {name}")
def group(name): print(f"\n--- {name} ---")

with open('index.html') as f: html = f.read()
with open('js/data.js') as f: data_js = f.read()
with open('js/nutrition-db.js') as f: ndb_js = f.read()
with open('js/app.js') as f: app_js = f.read()

# Parse DAYS — use line-by-line approach
days = []
current_day = None
for line in data_js.split('\n'):
    hdr_m = re.search(r"hdr:'([^']+)'", line)
    if hdr_m:
        current_day = {'hdr': hdr_m.group(1), 'meals': [], 'rids': [], 'tags': [], 'alts': []}
        days.append(current_day)
    if current_day:
        meal_m = re.search(r"(?<!alt:\{)name:'([^']*)'.*?m:\[(\d+),(\d+),(\d+),(\d+)\]", line)
        if meal_m:
            current_day['meals'].append((meal_m.group(1), int(meal_m.group(2)), int(meal_m.group(3)), int(meal_m.group(4)), int(meal_m.group(5))))
        rid_m = re.search(r"rid:'([^']*)'", line)
        if rid_m and 'alt:{' not in line[:line.index("rid:'")]:
            current_day['rids'].append(rid_m.group(1))
        tag_m = re.search(r"tag:'([^']*)'", line)
        if tag_m:
            current_day['tags'].append(tag_m.group(1))
        alt_m = re.search(r"alt:\{name:'([^']*)'", line)
        if alt_m:
            current_day['alts'].append(alt_m.group(1))

# Parse RECIPES (base only)
base_section = data_js.split('RECIPES_INSP')[0]
recipes = re.findall(r"\['([^']+)','([^']+)','(b|sb|d|s|p)',(\d+),(\d+),(\d+),(\d+),", base_section)
recipe_ids = set(r[0] for r in recipes)

# Parse DEPT
dept_items = set(re.findall(r"'([^']+)':\d", ndb_js.split('DEPT_NAMES')[0]))

# Parse onclick handlers vs window exports
onclick_fns = set(re.findall(r'onclick="(\w+)\(', html))
window_block = app_js.split('Object.assign(window')[1].split('});')[0] if 'Object.assign(window' in app_js else ''
window_fns = set(re.findall(r'(\w+)', window_block))

# =====================
group("📅 Otwieram plan — widzę dni")
ok(f"plan ma {len(days)} dni", len(days) >= 2)
for d in days:
    ok(f"  {d['hdr']}: {len(d['meals'])} posiłków", len(d['meals']) == 5)

group("📊 Kalorie mają sens")
for d in days:
    total = sum(m[1] for m in d['meals'])
    ok(f"  {d['hdr']}: {total} kcal (1200-2500)", 1200 <= total <= 2500)

group("🍳 Batch cooking — cook days i resztki")
cook_days = sum(1 for d in days for t in d['tags'] if '🍳' in t)
leftovers = sum(1 for d in days for t in d['tags'] if '🔄' in t)
ok(f"cook days: {cook_days}, leftovers: {leftovers}", cook_days > 0 and leftovers > 0)

group("🔗 Recipe IDs prowadzą do istniejących przepisów")
all_rids = set()
for d in days:
    all_rids.update(d['rids'])
missing_rids = all_rids - recipe_ids
ok(f"wszystkie rid istnieją w RECIPES ({len(missing_rids)} brakujących)", len(missing_rids) == 0)
for r in missing_rids:
    print(f"    ⚠ brak: '{r}'")

group("👩 Warianty On/Ona")
days_with_alts = [d for d in days if d['alts']]
ok(f"dni z wariantami: {len(days_with_alts)}", len(days_with_alts) > 0)
for d in days_with_alts:
    for alt in d['alts']:
        ok(f"  {d['hdr']}: alt '{alt[:35]}'", len(alt) > 3)

group("🛒 Składniki mają dział sklepu (DEPT)")
recipe_ings = set(re.findall(r"item:'([^']+)'", base_section))
unmapped = recipe_ings - dept_items
ok(f"zmapowane: {len(recipe_ings)-len(unmapped)}/{len(recipe_ings)}", len(unmapped) == 0)
for u in unmapped:
    print(f"    ⚠ brak w DEPT: '{u}'")

group("⏱ Czas gotowania")
prep_times = re.findall(r",(\d+)\](?:,|\n)", base_section)
ok(f"przepisy z prep_time: {len(prep_times)}", len(prep_times) >= 50)
quick = [int(p) for p in prep_times if int(p) <= 5]
ok(f"szybkie (≤5min): {len(quick)} (cel: ≥10)", len(quick) >= 10)

group("📖 Przeglądarka przepisów")
all_recipes = re.findall(r"\['[^']+','[^']+','(b|sb|d|s|p)',", data_js)
ok(f"łącznie przepisów: {len(all_recipes)} (cel: ≥100)", len(all_recipes) >= 100)
ok("wszystkie sloty pokryte", set(all_recipes) == {'b','sb','d','s','p'})
insp_section = data_js.split('RECIPES_INSP=')[1] if 'RECIPES_INSP=' in data_js else ''
insp_with_ing = len(re.findall(r"\[\{item:", insp_section))
ok(f"inspiracje ze składnikami: {insp_with_ing} (cel: >130)", insp_with_ing > 130)

group("🖱️ Onclick → window functions")
missing = onclick_fns - window_fns - {'return'}
ok(f"wszystkie handlery mają export ({len(onclick_fns)} handlerów)", len(missing) == 0)
for m in missing:
    print(f"    ⚠ brak: '{m}'")

group("📱 PWA elementy w HTML")
elements = {
    'toggle On/Ona': 'togglePerson', 'tab Plan': 'Plan', 'tab Przepisy': 'Przepisy',
    'bottom nav': 'bnav', 'nav Zakupy': 'Zakupy', 'nav Spiżarnia': 'Spiżarnia',
    'swap bar': 'swapBar', 'recipe picker': 'recipePicker', 'recipe detail': 'rDetail',
    'shop view': 'shopView', 'pantry view': 'pantryView', 'recipe search': 'rSearch',
    'sync indicator': 'syncDot', 'person prompt': 'personPrompt'
}
for name, check in elements.items():
    ok(name, check in html)

group("🔒 Spójność danych")
# Duplicate base recipe IDs
base_ids = [r[0] for r in recipes]
dupes = [x for x in set(base_ids) if base_ids.count(x) > 1]
ok(f"brak duplikatów base recipe ID", len(dupes) == 0)
for d in dupes:
    print(f"    ⚠ duplikat: '{d}'")

ok("brak ujemnych kalorii", all(int(r[3]) >= 0 for r in recipes))
hdrs = [d['hdr'] for d in days]
ok("unikalne nagłówki dni", len(hdrs) == len(set(hdrs)))

# No empty recipe names
empty_names = [r for r in recipes if len(r[1]) < 3]
ok("brak pustych nazw przepisów", len(empty_names) == 0)

# =====================
print(f"\n{'='*40}")
if F: print(f"❌ {F} FAILED — {P} passed, {F} failed")
else: print(f"✅ ALL PASSED — {P} passed, {F} failed")
sys.exit(1 if F else 0)
