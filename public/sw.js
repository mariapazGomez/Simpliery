// Service worker mínimo de Control Local.
// Su única función es habilitar la instalación como app (PWA): tener un
// handler de "fetch" registrado es lo que permite el botón "Instalar app" en
// Android. NO cachea respuestas (deja pasar todo a la red) para no servir
// versiones viejas de la app tras un despliegue.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
