/* 귀항 도장 — 실제 도장처럼 찍힌 모양을 코드로 그린다.
 *
 * 왜 이게 필요한가 —
 * 「왜 내일 또 여는가」를 맡은 조각이 도장이다. 그런데 지금은 동그라미 안에
 * 「무사」라는 글자만 있어서, 모아도 모은 느낌이 안 났다.
 *
 * 「무사」는 뺐다 — 무사·무사히 같은 말은 낚시를 위험한 일처럼 보이게 한다.
 * 도장은 위험을 넘겼다는 증명이 아니라 다녀왔다는 표시다 (2026-08-06 제품 결정).
 * 도장은 모으는 재미가 전부인 물건이라 생김새가 기능이다.
 *
 * 규칙
 *  - 그림 파일이 아니라 코드다. 그림 파일을 받아오면 「외부 통신 0건」이 깨진다.
 *  - 도장은 매번 같은 도장이다. 진짜 도장이 그렇다.
 *    대신 찍히는 각도가 조금씩 다르다 — 손으로 찍으면 그렇게 된다.
 *  - 그 각도는 날짜에서 계산한다. 난수를 쓰면 화면을 다시 그릴 때마다 흔들린다.
 *  - 인주색은 부적 화면이 쓰는 것과 같은 색이다(`#9c3524`). 두 조각이 한 벌로 보인다.
 *  - 「놓아주세요」의 빨강과는 다른 색이다. 도장이 경고로 읽히면 안 된다.
 */

/* 부적 화면과 같은 인주색 */
export const 인주 = '#9c3524';

/* 손으로 찍은 것처럼 조금씩 기울인다.
   같은 날짜면 언제 봐도 같은 각도여야 하므로 날짜에서 뽑는다. */
function 기울기(날짜) {
  const 씨 = 날짜.getFullYear() * 372 + (날짜.getMonth() + 1) * 31 + 날짜.getDate();
  return ((씨 * 7) % 11) - 5; // -5도 ~ +5도
}

/* 번짐 무늬가 도장마다 같으면 줄지어 놓았을 때 복사한 것처럼 보인다.
   무늬의 씨앗도 날짜에서 뽑는다. */
function 번짐씨(날짜) {
  const 씨 = 날짜.getFullYear() + (날짜.getMonth() + 1) * 12 + 날짜.getDate();
  return 씨 % 90;
}

export default function 도장그림({ 날짜, 크기: 그림크기 = 56, 색깔 = 인주 }) {
  const d = 날짜 instanceof Date ? 날짜 : new Date(날짜);
  const 각 = 기울기(d);
  /* 무늬 이름표가 한 화면에서 겹치면 브라우저가 첫 번째 것만 쓴다.
     도장이 여러 개 놓이므로 날짜로 이름을 다르게 만든다. */
  const 이름표 = `도장번짐-${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
  const 씨 = 번짐씨(d);

  return (
    <svg
      viewBox="0 0 100 100"
      width={그림크기}
      height={그림크기}
      role="img"
      aria-label="귀항 도장 — 歸港"
      style={{ transform: `rotate(${각}deg)`, display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* 인주가 종이에 번진 것처럼 테두리를 살짝 흩는다 */}
        <filter id={이름표} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={씨} result="무늬" />
          <feDisplacementMap in="SourceGraphic" in2="무늬" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <g filter={`url(#${이름표})`} fill="none" stroke={색깔}>
        {/* 바깥 테두리 — 도장 몸통 */}
        <rect x="5" y="5" width="90" height="90" rx="10" strokeWidth="6" />
        {/* 안쪽 가는 테두리 */}
        <rect x="14" y="14" width="72" height="72" rx="5" strokeWidth="1.6" opacity="0.75" />
        {/* 두 글자를 나누는 가로선 — 아주 흐리게 */}
        <line x1="18" y1="50" x2="82" y2="50" strokeWidth="1" opacity="0.26" />
      </g>

      {/* 歸港 — 위에서 아래로. 옛 도장의 두 글자는 이렇게 읽는다.
          네 글자보다 두 글자가 훨씬 커져서 작게 놓아도 읽힌다 */}
      {/* 두 글자를 안쪽 테(14~86) 의 위·아래 반칸 정중앙에 놓는다.
          글자 아래끝 기준(baseline)으로 y 를 주면 위로 쏠려 보인다 —
          dominantBaseline="central" 로 글자 한가운데를 기준으로 잡는다
          (2026-08-06 「도장이 위쪽으로 쏠린다」 지적 반영) */}
      <g
        filter={`url(#${이름표})`}
        fill={색깔}
        fontSize="30"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <text x="50" y="32">歸</text>
        <text x="50" y="68">港</text>
      </g>
    </svg>
  );
}
