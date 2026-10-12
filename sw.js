/**
 * JOGATINAL - Service Worker (PWA Offline First)
 * Permite navegação offline e consulta de catálogos e regras em Moçambique
 */

const NOME_CACHE = 'jogatinal-v1';
const RECURSOS_PRECACHE = [
  '/',
  '/index.html',
  '/jogos.html',
  '/loja.html',
  '/vender.html',
  '/sobre.html',
  '/contacto.html',
  '/faq.html',
  '/manifest.json',
  '/assets/favicon.svg',
  '/css/reset.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/configurador.css',
  '/css/paginas.css',
  '/js/config.js',
  '/js/api.js',
  '/js/utils.js',
  '/js/carrinho.js',
  '/js/filtros.js',
  '/js/packs.js',
  '/js/configurador.js',
  '/js/loja.js',
  '/js/paginas.js',
  '/js/exportar.js',
  '/js/menu.js',
  '/js/pwa.js',
  '/lib/jspdf.umd.min.js',
  '/data/config.json',
  '/data/produtos.json',
  '/data/retoma_tabela.json',
  '/data/jogos.json',
  '/data/hds.json',
  '/data/zonas.json',
  '/data/packs.json',
  '/data/torneios.json',
  '/data/ranking.json',
  '/data/noticias.json'
];

// Instalação do Service Worker e precache
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE).then((cache) => {
      return cache.addAll(RECURSOS_PRECACHE).catch((err) => {
        console.warn('[SW] Aviso durante precache de alguns recursos:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) => {
      return Promise.all(
        chaves.map((chave) => {
          if (chave !== NOME_CACHE) {
            return caches.delete(chave);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de pedidos (Network-first com fallback para Cache)
self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  // Apenas intercepta pedidos GET
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    fetch(evento.request)
      .then((respostaRede) => {
        // Guarda cópia atualizada na cache se for bem sucedida
        if (respostaRede && respostaRede.status === 200) {
          const respostaClonada = respostaRede.clone();
          caches.open(NOME_CACHE).then((cache) => {
            cache.put(evento.request, respostaClonada);
          });
        }
        return respostaRede;
      })
      .catch(() => {
        // Se a rede falhar, vai buscar à cache
        return caches.match(evento.request).then((respostaCache) => {
          if (respostaCache) {
            return respostaCache;
          }
          if (evento.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline: Recurso indisponível sem ligação à internet.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});
