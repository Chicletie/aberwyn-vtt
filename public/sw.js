// "Service worker" do app instalável. Não guarda nada (o palco precisa da internet para
// receber a mesa de qualquer jeito): só mostra um aviso amigável se o app abrir sem internet.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (evento) => {
  if (evento.request.mode !== 'navigate') return; // imagens, fontes e o Firebase passam direto
  evento.respondWith(
    fetch(evento.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
            '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#090a14;color:#e8c170;font:20px monospace;text-align:center">' +
            'Sem internet.<br>Conecte e abra de novo.</body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        ),
    ),
  );
});
