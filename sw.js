const V='v10';
const FILES=['./', 'css/style.css', 'js/app.js', 'js/state.js', 'js/data.js', 'js/nutrition-db.js', 'js/supabase.js', 'js/plan.js', 'js/shop.js', 'js/pantry.js', 'js/recipes.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(res=>{caches.open(V).then(c=>c.put(e.request,res.clone()));return res}).catch(()=>caches.match(e.request))));
