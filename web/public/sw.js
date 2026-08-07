/* 오프라인 — 바다에서 인터넷 없이 열리게 한다.
 *
 * 🔴 2026-08-07 전면 개편 (폰 점검 1번 — 「비행기 모드에서 앱이 안 열린다」)
 *
 * 무엇이 문제였나 —
 *   전에는 **한 번 본 것만** 저장했다(`caches.match` → 없으면 `fetch`).
 *   그래서 홈만 보고 비행기 모드로 들어가면 판정 화면이 통째로 없었고,
 *   화면을 그리는 부품(_next 폴더의 조각들)도 안 받아둔 상태라
 *   「인터넷에 연결되어 있지 않음」이 떴다.
 *   **이 앱의 존재 이유가 「인터넷 없이 판정한다」인데 그게 안 되고 있었다.**
 *
 * 이제 어떻게 하나 —
 *   ① **설치할 때 미리 받아둔다.** 목록은 사람이 손으로 적지 않는다 —
 *      `scripts/오프라인목록.mjs` 가 **빌드 결과 폴더를 훑어 자동으로 채워 넣는다.**
 *      손으로 적으면 화면을 하나 추가할 때마다 잊어버린다.
 *   ② 목록을 둘로 나눈다.
 *      **핵심**(화면·부품·아이콘 ≈ 1.5MB) — 이게 있어야 앱이 열린다. 설치할 때 바로 받는다.
 *      **글꼴 조각**(≈ 3MB) — 없어도 앱은 열린다(폰 기본 글꼴로 보인다).
 *      그래서 앱을 켠 뒤 **뒤에서 천천히** 하나씩 받는다. 첫 방문이 느려지지 않는다.
 *   ③ 인터넷이 없고 저장해 둔 것도 없는 화면 요청이면 **첫 화면을 대신 준다.**
 *      하얀 화면보다 낫다.
 *
 * 🔴 고칠 때 주의 —
 *   - `판` 값을 바꿔야 폰이 옛 저장분을 버리고 새로 받는다. **안 바꾸면 고쳐도 안 바뀐다.**
 *   - `c.addAll` 을 쓰지 않는다. 하나라도 404 면 **전부** 실패한다. 하나씩 넣는다.
 *   - 아랫줄의 `/*__…__*\/` 표시는 빌드가 채워 넣는 자리다. 지우지 마라.
 */

var 판 = 'seacharm-v3';

/* 빌드가 채워 넣는 자리 — 손으로 적지 않는다 */
var 밑 = '/*__밑주소__*/';
var 핵심 = [/*__핵심__*/];
var 글꼴 = [/*__글꼴__*/];

var 첫화면 = 밑 + '/';

/* ── 설치 — 핵심을 미리 받아둔다 ─────────────────────────── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(판)
      .then(function (c) {
        return Promise.all(
          핵심.map(function (u) {
            /* cache:'reload' — 브라우저가 갖고 있던 낡은 사본을 쓰지 않게 한다 */
            return c.add(new Request(u, { cache: 'reload' })).catch(function () {
              /* 하나 실패해도 나머지는 받는다 */
            });
          })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ── 켜짐 — 옛 저장분을 버리고, 글꼴을 뒤에서 채운다 ───────── */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(
          ks.filter(function (k) { return k !== 판; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
      .then(function () { return 글꼴채우기(); })
  );
});

/* 글꼴 조각을 **하나씩 차례로** 받는다.
   92개를 한꺼번에 부르면 첫 화면이 느려진다. */
function 글꼴채우기() {
  return caches.open(판).then(function (c) {
    var i = 0;
    function 다음() {
      if (i >= 글꼴.length) return Promise.resolve();
      var u = 글꼴[i++];
      return c.match(u).then(function (있음) {
        if (있음) return 다음();
        return c.add(new Request(u, { cache: 'reload' }))
          .catch(function () {})
          .then(다음);
      });
    }
    return 다음();
  });
}

/* ── 요청 — 저장한 것을 먼저, 없으면 받아오고, 그것도 안 되면 첫 화면 ── */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (있음) {
      if (있음) {
        /* 저장한 것을 바로 주고, 새 것은 뒤에서 조용히 받아 갈아둔다 */
        e.waitUntil(조용히받기(req));
        return 있음;
      }
      return fetch(req)
        .then(function (res) {
          if (res && res.status === 200 && res.type === 'basic') {
            var 사본 = res.clone();
            caches.open(판).then(function (c) { c.put(req, 사본); });
          }
          return res;
        })
        .catch(function () {
          /* 인터넷이 없다 */
          if (req.mode === 'navigate') {
            return caches.match(첫화면).then(function (홈) {
              return 홈 || new Response(
                '<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">' +
                '앱을 한 번 인터넷에 연결해서 열어주세요. 그 뒤에는 바다에서도 열립니다.</p>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
          }
          return new Response('', { status: 504, statusText: '오프라인' });
        });
    })
  );
});

function 조용히받기(req) {
  return fetch(req)
    .then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        return caches.open(판).then(function (c) { return c.put(req, res.clone()); });
      }
    })
    .catch(function () { /* 인터넷이 없으면 그냥 넘어간다 */ });
}
