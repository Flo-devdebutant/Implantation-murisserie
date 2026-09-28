/* Service worker de l'application Mûrisserie.

   Il garde une copie de l'application sur l'appareil pour qu'elle s'ouvre même
   sans réseau — en chambre froide, sur le quai, ou quand la connexion saute.
   Les journées elles-mêmes sont déjà enregistrées dans le navigateur ; il ne
   manquait que la page et les scripts Firebase pour pouvoir les consulter.

   — La page (index.html) : le réseau d'abord, pour recevoir aussitôt chaque
     nouvelle version ; la copie gardée si le réseau ne répond pas dans les
     4 secondes ou s'il est absent.
   — Les scripts Firebase : leur adresse porte leur numéro de version, leur
     contenu ne change donc jamais ; la copie gardée d'abord.
   — Tout le reste (Firestore, comptes) passe sans être touché : Firebase gère
     lui-même son fonctionnement hors ligne.

   Changer VERSION purge les anciennes copies à l'activation. */
const VERSION = 'murisserie-2026-09-28';
const PAGE = './index.html';
const DELAI_RESEAU = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(['./', PAGE]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function garder(requete, reponse) {
  if (reponse && reponse.ok) {
    const copie = reponse.clone();
    caches.open(VERSION).then((c) => c.put(requete, copie));
  }
  return reponse;
}

/* Le réseau, mais pas indéfiniment : un réseau qui « répond à moitié »
   (ERR_NETWORK_CHANGED, Wi-Fi du quai) bloquerait sinon l'ouverture. */
function reseauAvecDelai(requete) {
  return new Promise((ok, ko) => {
    const minuteur = setTimeout(() => ko(new Error('délai')), DELAI_RESEAU);
    fetch(requete).then((r) => { clearTimeout(minuteur); ok(r); },
                        (err) => { clearTimeout(minuteur); ko(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const estPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
    if (!estPage) return;
    e.respondWith(
      reseauAvecDelai(req)
        .then((r) => garder(PAGE, r))
        .catch(() => caches.match(PAGE).then((m) => m || caches.match('./')))
    );
    return;
  }

  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((r) => garder(req, r)))
    );
  }
});
