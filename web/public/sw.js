/* 오프라인 캐시 — 바다에서 인터넷 없이 열리게 한다.
 *
 * 규칙 둘:
 *  1) 한 번 받은 것은 저장해 두고, 다음엔 저장한 것을 먼저 준다.
 *  2) 외부 주소는 손대지 않는다 — 이 앱은 애초에 외부로 나가지 않는다.
 */
var 판 = 'seacharm-v2';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== 판; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      var 받아오기 = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var 사본 = res.clone();
          caches.open(판).then(function (c) { c.put(req, 사본); });
        }
        return res;
      }).catch(function () {
        // 인터넷이 없다 — 저장한 게 있으면 그걸, 없으면 첫 화면을
        return hit || caches.match(self.registration.scope);
      });
      return hit || 받아오기;
    })
  );
});
