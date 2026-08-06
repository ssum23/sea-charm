import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));

/* GitHub Pages 는 주소가 `이름.github.io/sea-charm/` 처럼 한 칸 들어간다.
 * 그래서 앱이 자기 주소 앞에 `/sea-charm` 을 붙여야 그림·글꼴을 찾는다.
 * 이 값은 배포할 때 자동으로 채워지고, 내 컴퓨터에서 볼 때는 비어 있다.
 *   내 컴퓨터  → http://localhost:3000/
 *   GitHub    → https://이름.github.io/sea-charm/
 */
const 밑주소 = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 파일로만 내보낸다 — 서버 없음(시스템디자인 §1).
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,

  basePath: 밑주소,
  assetPrefix: 밑주소 || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: 밑주소 },

  // 판정 엔진과 기준표는 ../app/ 에 있는 원본을 그대로 읽는다.
  // 복사본을 만들지 않기 위해 바깥 폴더까지 읽을 수 있게 뿌리를 한 칸 올린다.
  turbopack: { root: path.join(여기, '..') },
  outputFileTracingRoot: path.join(여기, '..'),
};

export default nextConfig;
