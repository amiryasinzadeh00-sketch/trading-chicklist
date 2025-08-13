self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('ccache-v2full').then(cache => cache.addAll([
    './','./index.html','./styles.css','./app.js','./manifest.webmanifest',
    './icons/icon-192.png','./icons/icon-512.png'
  ])));
});
self.addEventListener('activate', (e)=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});