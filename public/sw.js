const CACHE_NAME = 'agaate-v1';
const PRECACHE = [
  '/',
  '/login',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE).catch(()=>undefined)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Bypass for API and uploads - network only with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(()=> new Response(JSON.stringify({error: 'You are offline. Operation requires connectivity.'}), {status: 503, headers: {'Content-Type':'application/json'}}))
    );
    return;
  }
  // For navigation requests, network-first then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(res=> {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache=> cache.put(event.request, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match(event.request).then(cached=> cached || caches.match('/login')).then(cached=> cached || new Response('Offline', {status:503})))
    );
    return;
  }
  // For static assets, cache-first
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(res=>{
        if(res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache=> cache.put(event.request, copy)).catch(()=>{});
        }
        return res;
      }).catch(()=> cached || new Response('', {status: 404}))
    })
  );
});
