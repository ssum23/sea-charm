/* 아이콘 — 직접 그린 선 그림
 *
 * 🔴 2026-08-13 — 이모지(🧿🎣📸📋🎒)를 걷어내고 여기로 옮겼다 (사장님 「이모지 아이콘」 지적).
 *
 * 왜 바꾸나 —
 *  ① 이모지는 **폰마다 모양과 색이 다르다.** 아이폰의 🧿 는 파란 눈알이고 안드로이드는 다르다.
 *     노란 부적 버튼 위에 파란 눈알이 얹히면 그 버튼만 따로 논다.
 *  ② 이모지는 **글자**라서 색을 우리가 못 정한다. 선 그림은 `currentColor` 를 따라간다 —
 *     탭바에서 고른 칸은 주색, 안 고른 칸은 흐린 글색으로 저절로 갈린다.
 *  ③ 외부에서 받아오는 것이 없다 (PRD §0-10). 글자 몇 줄이 전부다.
 *
 * 쓰는 법 — <아이콘 이름="닻" 크기={22} />
 */

const 그림 = {
  /* 홈 — 닻. 「배가 머무는 곳」이라 홈과 결이 맞는다 */
  닻: (
    <>
      <circle cx="12" cy="4.6" r="2.1" />
      <path d="M12 6.7V21" />
      <path d="M8.2 9.4h7.6" />
      <path d="M4 13.6A8 8 0 0 0 20 13.6" />
      <path d="M4 13.6H6.4M20 13.6h-2.4" />
    </>
  ),
  /* 부적 — 눈 모양. 지금 쓰는 🧿 와 같은 뜻이고 색만 우리 것이 된다 */
  부적: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  /* 판정 — 물고기. 🔴 꼬리를 따로 그린다. 한 덩어리로 그리면
     22px 에서 꼬리가 뭉개져 눈알처럼 보인다 */
  물고기: (
    <>
      <path d="M21 12c0 2.9-3.3 5.3-7.4 5.3S6.2 14.9 6.2 12s3.3-5.3 7.4-5.3S21 9.1 21 12Z" />
      <path d="M6.2 12 2.6 8.1v7.8L6.2 12Z" />
      <circle cx="16.9" cy="10.5" r=".95" fill="currentColor" stroke="none" />
    </>
  ),
  /* 조과 기록 — 서류판 */
  기록: (
    <>
      <rect x="5" y="4.2" width="14" height="16.6" rx="2.4" />
      <path d="M9.2 3h5.6v3.1H9.2z" />
      <path d="M8.8 11.2h6.4M8.8 15.2h4.2" />
    </>
  ),
  사진: (
    <>
      <rect x="3" y="7.2" width="18" height="12.8" rx="3.2" />
      <circle cx="12" cy="13.6" r="3.5" />
      <path d="M8.4 7.2 9.8 4.8h4.4l1.4 2.4" />
    </>
  ),
  준비물: (
    <>
      <path d="M5.4 8.2h13.2l-1 11.6a1.6 1.6 0 0 1-1.6 1.4H8a1.6 1.6 0 0 1-1.6-1.4z" />
      <path d="M9 8.2V6a3 3 0 0 1 6 0v2.2" />
    </>
  ),
};

export default function 아이콘({ 이름, 크기 = 22, 굵기 = 1.7 }) {
  const 속 = 그림[이름];
  if (!속) return null;
  return (
    <svg
      width={크기}
      height={크기}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={굵기}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {속}
    </svg>
  );
}
