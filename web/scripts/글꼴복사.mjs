/* Pretendard 글꼴을 앱 안으로 복사한다.
 *
 * 왜 이런 걸 두는가 —
 * 이 앱은 바다에서 인터넷 없이 열려야 하고(시스템디자인 §8 「외부 네트워크 요청 0건」),
 * 글꼴을 외부 서버에서 받아오면 그 원칙이 깨진다.
 * 그렇다고 글꼴 파일 92개를 소스에 같이 넣어두면 폴더가 지저분해진다.
 * 그래서 npm install 이 끝날 때마다 이 파일이 자동으로 복사해 준다.
 *
 * 사람이 직접 실행할 일은 없다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

const 원본 = path.join(뿌리, 'node_modules/pretendard/dist/web/variable');
const 목적지 = path.join(뿌리, 'public/font');

if (!fs.existsSync(원본)) {
  console.log('[글꼴] pretendard 꾸러미가 아직 없습니다 — 건너뜁니다.');
  process.exit(0);
}

fs.mkdirSync(path.join(목적지, 'woff2-dynamic-subset'), { recursive: true });

// 글꼴 조각들 — 브라우저가 필요한 조각만 골라 받는다
const 조각들 = fs.readdirSync(path.join(원본, 'woff2-dynamic-subset'));
for (const f of 조각들) {
  fs.copyFileSync(
    path.join(원본, 'woff2-dynamic-subset', f),
    path.join(목적지, 'woff2-dynamic-subset', f),
  );
}

/* 글꼴 조각 주소는 `./` 상대주소 그대로 둔다.
 * 절대주소(`/font/...`)로 바꾸면 GitHub Pages 처럼 주소 앞에 한 칸
 * (`/sea-charm`) 이 붙는 곳에서 전부 404 가 난다.
 * 상대주소면 내 컴퓨터에서도, GitHub 에서도 알아서 맞는다. */
const css = fs.readFileSync(path.join(원본, 'pretendardvariable-dynamic-subset.css'), 'utf8');
fs.writeFileSync(path.join(목적지, 'pretendard.css'), css);

console.log(`[글꼴] Pretendard ${조각들.length}조각 준비 완료`);
