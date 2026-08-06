import { AppRouterCacheProvider } from '@montage-ui/nextjs';
import { ThemeProvider } from '@montage-ui/core';
import '@montage-ui/core/global.css';
import './글꼴.css';

/* GitHub Pages 에서는 주소 앞에 `/sea-charm` 이 붙는다 (next.config.mjs 참고).
 * 화면 사이 이동은 Next 가 알아서 붙여주지만,
 * 아래처럼 손으로 적는 주소는 직접 붙여야 한다. */
const 밑 = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata = {
  title: '귀항 도장',
  description: '오늘도 잘 다녀오시라고',
  manifest: `${밑}/manifest.webmanifest`,
  icons: { icon: `${밑}/icon-192.png`, apple: `${밑}/icon-192.png` },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0066FF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard — 앱 안에 넣어둔 파일에서 읽는다 (외부 요청 0건) */}
        <link rel="stylesheet" href={`${밑}/font/pretendard.css`} />
      </head>
      <body>
        <AppRouterCacheProvider>
          {/* 쓰고 있는 디자인 시스템 — 색·글꼴·부품을 여기서 공급한다 */}
          <ThemeProvider>{children}</ThemeProvider>
        </AppRouterCacheProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${밑}/sw.js',{scope:'${밑}/'}).catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
