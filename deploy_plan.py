#!/usr/bin/env python3
"""Deploy new meal plan: consume old plan from pantry + reset Supabase state."""
import json, re, sys, urllib.request, urllib.parse

SUPA_URL = 'https://tkfxjkleaeuwqqaeiigt.supabase.co'
SUPA_KEY = 'sb_publishable_lECu6yNlYFf_QPMgmzXW5g_R41cyMXo'
HEADERS = {'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

def supa_get(key):
    url = f'{SUPA_URL}/rest/v1/app_state?key=eq.{key}&select=value'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    return data[0]['value'] if data else None

def supa_set(key, val):
    url = f'{SUPA_URL}/rest/v1/app_state'
    body = json.dumps({'key': key, 'value': val}).encode()
    h = dict(HEADERS)
    h['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    req = urllib.request.Request(url, data=body, headers=h, method='POST')
    urllib.request.urlopen(req)

def parse_pantry_qty(s):
    """Parse '2 × 300g' → (600,'g'), '3 szt' → (3,'szt'), '200g' → (200,'g')"""
    if not s: return None
    m = re.match(r'(\d+)\s*×\s*(\d+)\s*(g|kg|ml|L|szt)', s, re.I)
    if m:
        n = int(m[1]) * int(m[2])
        u = m[3].lower()
        if u in ('kg','l'): n *= 1000
        return (n, 'szt' if u == 'szt' else 'g')
    m = re.match(r'(\d+)\s*(g|kg|ml|szt)', s, re.I)
    if m:
        n = int(m[1])
        if m[2].lower() == 'kg': n *= 1000
        return (n, 'szt' if m[2].lower() == 'szt' else 'g')
    return None

def extract_plan_usage(data_js_path):
    """Extract ingredient usage from current DAYS in data.js."""
    with open(data_js_path) as f: c = f.read()
    # Extract RECIPES ingredient data
    recipes = {}
    for m in re.finditer(r"\['([^']+)','[^']+','[^']+',\d+,\d+,\d+,\d+,\[([^\]]*)\]", c):
        rid, ing_str = m.group(1), m.group(2)
        ings = []
        for ig in re.finditer(r"\{item:'([^']+)'(?:,amount_g:'(\d+)')?(?:,amount:'([^']*)')?\}", ing_str):
            ings.append({'item': ig.group(1), 'amount_g': ig.group(2), 'amount': ig.group(3)})
        recipes[rid] = ings

    # Extract meal rids from DAYS (skip leftovers)
    usage = {}
    for m in re.finditer(r"rid:'([^']+)'.*?tag:'([^']*)'", c[:c.index('export const SHOP=')]):
        rid, tag = m.group(1), m.group(2)
        if '🔄' in tag: continue
        if rid in recipes:
            for ig in recipes[rid]:
                key = ig['item']
                if key not in usage: usage[key] = {'g': 0, 'szt': 0}
                if ig['amount_g']: usage[key]['g'] += float(ig['amount_g'])
                elif ig['amount']:
                    n = re.match(r'[\d.]+', ig['amount'])
                    if n: usage[key]['szt'] += float(n.group())
    return usage

def consume_pantry(pantry, usage):
    """Subtract plan usage from pantry. Returns (new_pantry, log)."""
    consumed, removed = [], []
    new_pantry = []
    for p in pantry:
        name = p['item'].lower().strip()
        ukey = None
        for k in usage:
            if k.lower().replace('_',' ').strip() == name.replace('_',' '):
                ukey = k; break
        if not ukey:
            new_pantry.append(p); continue
        pq = parse_pantry_qty(p.get('qty',''))
        if not pq:
            removed.append(p['item']); continue
        used_val = usage[ukey]['szt'] if pq[1] == 'szt' else usage[ukey]['g']
        if used_val <= 0:
            new_pantry.append(p); continue
        remaining = pq[0] - used_val
        if remaining <= 0:
            removed.append(p['item'])
        else:
            consumed.append(f"{p['item']}: {pq[0]}{pq[1]} → {round(remaining)}{pq[1]}")
            p['qty'] = f"{round(remaining)}{'szt' if pq[1]=='szt' else 'g'}"
            new_pantry.append(p)
    return new_pantry, consumed, removed

def main():
    print('📦 Deploy plan: rozliczanie spiżarni + reset Supabase\n')

    # 1. Get current pantry
    pantry = supa_get('pantry') or []
    print(f'Spiżarnia: {len(pantry)} produktów')

    # 2. Calculate usage from old plan
    usage = extract_plan_usage('js/data.js')
    print(f'Składniki w starym planie: {len(usage)}')

    # 3. Consume pantry
    new_pantry, consumed, removed = consume_pantry(pantry, usage)
    if removed: print(f'\n🗑️  Usunięto: {", ".join(removed)}')
    if consumed: print(f'📉 Zmniejszono:\n  ' + '\n  '.join(consumed))
    if not removed and not consumed: print('ℹ️  Brak produktów do rozliczenia')

    # 4. Save updated pantry
    supa_set('pantry', new_pantry)
    print(f'\n✅ Spiżarnia zaktualizowana ({len(new_pantry)} produktów)')

    # 5. Reset plan-related state
    resets = {
        'day_order': [],
        'shopping': {},
        'meal_overrides': {},
        'shop_cleared': {'cleared': False},
        'shop_edits': {},
    }
    for key, val in resets.items():
        supa_set(key, val)
    print('🔄 Zresetowano: ' + ', '.join(resets.keys()))
    print('\n✅ Gotowe! Teraz wgraj nowy data.js i pushuj.')

if __name__ == '__main__':
    main()
