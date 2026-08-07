/* 오프라인에 미리 받아둘 목록을 자동으로 만든다.
 *
 * 왜 이게 필요한가 —
 * 앱이 바다에서 열리려면 「무엇을 미리 받아둘지」를 `sw.js` 가 알아야 한다.
 * 그런데 그 목록을 **사람이 손으로 적으면 반드시 낡는다** —
 * 화면을 하나 추가하거나 부품 이름이 바뀌면(빌드할 때마다 이름에 붙는 숫자가 달라진다)
 * 목록만 옛것으로 남고, 그 화면은 바다에서 안 열린다.
 * 그래서 **빌드가 끝난 폴더를 그대로 훑어** 목록을 채운다. 사람이 손댈 일이 없다.
 *
 * 언제 도는가 — `npm run build` 가 `next build` 다음에 자동으로 부른다.
 * 사람이 직접 실행할 일은 없다.
 *
 * 🔴 목록을 둘로 나누는 이유 —
 *   핵심(화면·부품·아이콘)이 없으면 앱이 아예 안 열린다 → 설치할 때 바로 받는다.
 *   글꼴 조각은 없어도 앱이 열린다(폰 기본 글꼴로 보인다) → 뒤에서 천천히 받는다.
 *   글꼴이 3MB라 이걸 같이 받으면 첫 방문이 눈에 띄게 느려진다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
const 나온곳 = path.join(뿌리, 'out');
const 밑 = process.env.NEXT_PUBLIC_BASE_PATH || '';

if (!fs.existsSync(나온곳)) {
  console.log('[오프라인] out 폴더가 없습니다 — 건너뜁니다.');
  process.exit(0);
}

/* 폴더를 통째로 훑는다 */
function 훑기(폴더, 담을곳 = []) {
  for (const 것 of fs.readdirSync(폴더, { withFileTypes: true })) {
    const 길 = path.join(폴더, 것.name);
    if (것.isDirectory()) 훑기(길, 담을곳);
    else 담을곳.push(path.relative(나온곳, 길).split(path.sep).join('/'));
  }
  return 담을곳;
}

const 전부 = 훑기(나온곳);

/* 미리 받지 않는 것 —
 *  sw.js       : 자기 자신
 *  *.txt       : 화면 사이 이동에 쓰는 부속 파일. 없으면 브라우저가 주소를 새로 연다(=동작한다)
 *  404.html    : 오프라인에서 쓸 일이 없다 */
const 뺄것 = (u) => u === 'sw.js' || u.endsWith('.txt') || u === '404.html';

/* 주소로 바꾼다.
 *  out/index.html        → {밑}/
 *  out/catch/index.html  → {밑}/catch/
 *  out/_next/…/abc.js    → {밑}/_next/…/abc.js
 * 🔴 `index.html` 을 그대로 적으면 안 된다 — 브라우저가 부르는 주소는 폴더 주소다. */
function 주소로(u) {
  if (u === 'index.html') return 밑 + '/';
  if (u.endsWith('/index.html')) return 밑 + '/' + u.slice(0, -'index.html'.length);
  return 밑 + '/' + u;
}

const 글꼴조각 = (u) => u.startsWith('font/woff2-dynamic-subset/');

const 핵심 = 전부.filter((u) => !뺄것(u) && !글꼴조각(u)).map(주소로).sort();
const 글꼴 = 전부.filter((u) => !뺄것(u) && 글꼴조각(u)).map(주소로).sort();

/* 🔴 첫 화면이 목록에 없으면 오프라인이 통째로 실패한다. 여기서 잡는다. */
if (!핵심.includes(밑 + '/')) {
  console.error('[오프라인] 🔴 첫 화면(' + 밑 + '/)이 목록에 없습니다. 빌드를 확인하세요.');
  process.exit(1);
}

const 적기 = (a) => a.map((u) => JSON.stringify(u)).join(',\n  ');

const 원본길 = path.join(나온곳, 'sw.js');
let sw = fs.readFileSync(원본길, 'utf8');

/* 표시를 찾지 못하면 조용히 넘어가면 안 된다 — 오프라인이 안 되는 채로 배포된다 */
for (const 표시 of ['/*__밑주소__*/', '/*__핵심__*/', '/*__글꼴__*/']) {
  if (!sw.includes(표시)) {
    console.error('[오프라인] 🔴 sw.js 에서 ' + 표시 + ' 를 찾지 못했습니다.');
    process.exit(1);
  }
}

sw = sw
  .replace('/*__밑주소__*/', 밑)
  .replace('/*__핵심__*/', '\n  ' + 적기(핵심) + '\n')
  .replace('/*__글꼴__*/', '\n  ' + 적기(글꼴) + '\n');

fs.writeFileSync(원본길, sw);

const 잰다 = (목록) =>
  목록.reduce((합, u) => {
    const 파일 = path.join(나온곳, u.slice(밑.length).replace(/\/$/, '/index.html'));
    try { return 합 + fs.statSync(파일).size; } catch { return 합; }
  }, 0);

const 메가 = (n) => (n / 1024 / 1024).toFixed(1) + 'MB';
console.log(
  '[오프라인] 미리 받을 것 — 핵심 ' + 핵심.length + '개(' + 메가(잰다(핵심)) + ')' +
  ' · 글꼴 ' + 글꼴.length + '개(' + 메가(잰다(글꼴)) + ')'
);
