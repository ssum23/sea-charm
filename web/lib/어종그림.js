'use client';

/* 어종 그림 — 이름 옆에 붙는 작은 그림
 *
 * 왜 필요한가 — 이름만 늘어놓으면 82칸이 다 똑같아 보인다.
 * 배 위에서 젖은 손으로 훑을 때 **모양이 먼저 눈에 들어와야** 이름을 읽는 시간이 준다.
 * (2026-08-06 폰 점검: 「주꾸미 옆에 주꾸미 이모지같은거라도 있으면 안 심심할 것 같다」)
 *
 * 🔴 두 갈래다
 *   ① 이모지가 있는 35종 — 그대로 쓴다. 복어 🐡 · 문어 🐙 · 오징어 🦑 · 게 🦀 · 조개 🦪 · 해조 🌿
 *   ② 이모지가 없는 47종 — **직접 그린다.** 가자미도 갈치도 장어도 가오리도 이모지에 없다.
 *      전에는 전부 🐟 하나로 갔다 — 목록의 절반이 같은 그림이었다.
 *
 * 🔴 왜 그림 파일이 아니라 코드로 그리나
 *   그림 파일을 쓰면 인터넷에서 받아와야 하고, 그 순간 「외부 통신 0건」이 깨진다.
 *   바다에서 안 열리는 앱이 된다. 이모지도 **폰에 이미 있는 글꼴**이라 통신이 없다.
 *
 * 🔴 그리면서 지킨 것 (2026-08-06 사장님 지시)
 *   ① 얇은 선을 쓰지 않는다 — 20px 에서 사라진다
 *   ② 이모지와 그림체를 맞춘다 — 지느러미를 몸과 다른 색으로 · 등은 어둡고 배는 밝게 ·
 *      홍채(금테) · 등 광택 · 눈 반짝임 · 가슴지느러미와 배지느러미
 *   ③ **테두리를 또렷하게** — 이모지처럼 제 몸색을 어둡게 한 윤곽선을 두른다.
 *      검정이 아니라 그 물고기 색의 어두운 버전이라 튀지 않으면서 형태를 잡아준다.
 *      작아질수록 이게 형태를 살린다 — 병어와 농어가 갈리는 것도 이 선 덕이다
 *   ④ 20px 에서 지저분해지면 넣지 않는다 — 56px 에서 예뻐도 폰에서 뭉치면 없느니만 못하다
 *
 * 🔴 모양이 같은 것끼리 묶었다
 *   20px 칸에서는 가자미 5종이 어차피 구분되지 않는다.
 *   억지로 다르게 그리면 **틀린 그림**이 된다. 47종을 17가지로 덮는다.
 *
 * 🔴 이 그림은 판정에 쓰이지 않는다. 보기 좋으라고 붙이는 것뿐이다.
 *   어종을 이 그림으로 알아보게 하면 안 된다 — 생김새 확인은 「공식 자료와 견주기」가 한다.
 *   기준표에 없는 이름(사용자가 직접 적은 어종)에는 **아무것도 붙이지 않는다** —
 *   모르는 것에 물고기 그림을 붙이면 「이 앱이 안다」로 읽힌다(#22 「없음」과 「모름」).
 */

/* ---------- 이모지를 쓰는 어종 ---------- */
const 이모지표 = {
  감성돔: '🐠', 참돔: '🐠', 돌돔: '🐠', 벵에돔: '🐠',
  자리돔: '🐠', 옥돔: '🐠', 붉바리: '🐠', 놀래기: '🐠',
  복어: '🐡', 전어: '🐟', 꽃게: '🦀', 대게: '🦀',
  붉은대게: '🦀', 대하: '🦐', 소라: '🐚', 가리비: '🐚',
  전복류: '🦪', 오분자기: '🦪', 키조개: '🦪', 새조개: '🦪',
  코끼리조개: '🦪', 기수재첩: '🦪', 낙지: '🐙', 주꾸미: '🐙',
  참문어: '🐙', 대문어: '🐙', 살오징어: '🦑', 무늬오징어: '🦑',
  한치: '🦑', 화살오징어: '🦑', 갑오징어: '🦑', 해삼: '🥒',
  톳: '🌿', 우뭇가사리: '🌿', 넓미역: '🌿',
};

/* ---------- 직접 그리는 어종 → 어떤 모양을 쓰나 ---------- */
const 모양표 = {
  /* 볼락 */ 조피볼락: '볼락', 볼락: '볼락', 불볼락: '볼락', 개볼락: '볼락', 우럭볼락: '볼락', 쏨뱅이: '볼락', 망상어: '볼락', 능성어: '볼락',
  /* 가자미 */ 넙치: '가자미', 문치가자미: '가자미', 참가자미: '가자미', 용가자미: '가자미', 기름가자미: '가자미',
  /* 농어 */ 농어: '농어', 민어: '농어', 숭어: '농어', 보리멸: '농어', 쥐노래미: '농어', 임연수어: '농어', 도루묵: '농어',
  /* 방어 */ 방어: '방어', 부시리: '방어',
  /* 조기 */ 참조기: '조기', 부세: '조기', 보구치: '조기',
  /* 대구 */ 대구: '대구', 명태: '대구',
  /* 장어 */ 붕장어: '장어', 갯장어: '장어',
  /* 고등어 */ 고등어: '고등어', 삼치: '고등어', 전갱이: '고등어', 청어: '고등어',
  /* 꽁치 */ 꽁치: '꽁치', 학공치: '꽁치',
  /* 연어 */ 연어: '연어',
  /* 가오리 */ 가오리: '가오리', 참홍어: '가오리',
  /* 갈치 */ 갈치: '갈치',
  /* 쥐치 */ 말쥐치: '쥐치',
  /* 아귀 */ 아귀: '아귀', 삼세기: '아귀', 미거지: '아귀',
  /* 양태 */ 양태: '양태', 성대: '양태',
  /* 병어 */ 병어: '병어',
  /* 망둑어 */ 망둑어: '망둑어',
};

/* 그림 정의(색·모양)를 화면마다 새로 넣지 않고 **한 번만** 깔아둔다.
 * `화면틀.js` 가 모든 화면 맨 위에서 이걸 한 번 그린다.
 * 그래서 화면틀 안에 있는 어느 화면에서든 <어종그림 /> 을 그냥 쓸 수 있다.
 *
 * 통째로 넣는 이유 — 이 글자는 우리가 직접 적은 그림 정의뿐이고
 * 사용자가 넣은 값이 한 글자도 섞이지 않는다. 바깥에서 온 것이 없다. */
const 정의 = `<linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C7724C"/><stop offset=".5" stop-color="#9E4F31"/><stop offset="1" stop-color="#E8C3A4"/></linearGradient>
  <linearGradient id="fA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0A868"/><stop offset="1" stop-color="#CF7328"/></linearGradient>
  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E7C97"/><stop offset=".48" stop-color="#A9C2D6"/><stop offset=".62" stop-color="#F2F7FB"/><stop offset="1" stop-color="#CBD8E3"/></linearGradient>
  <linearGradient id="fB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FA9C0"/><stop offset="1" stop-color="#5F7B94"/></linearGradient>
  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E5E7E"/><stop offset=".45" stop-color="#5E96B8"/><stop offset=".6" stop-color="#F3F8FB"/><stop offset="1" stop-color="#D3E2EC"/></linearGradient>
  <linearGradient id="fC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D780"/><stop offset="1" stop-color="#DDA333"/></linearGradient>
  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9AE3E"/><stop offset=".5" stop-color="#E8C963"/><stop offset="1" stop-color="#F7EBC2"/></linearGradient>
  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C7A55"/><stop offset=".5" stop-color="#B7A176"/><stop offset="1" stop-color="#E6DCC2"/></linearGradient>
  <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E5636"/><stop offset=".55" stop-color="#9C7C4E"/><stop offset="1" stop-color="#DCC79C"/></linearGradient>
  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B4A63"/><stop offset=".42" stop-color="#4E7E9C"/><stop offset=".58" stop-color="#EFF6FA"/><stop offset="1" stop-color="#CFDDE7"/></linearGradient>
  <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B0567A"/><stop offset=".45" stop-color="#D2818F"/><stop offset="1" stop-color="#F3DCD8"/></linearGradient>
  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A5B6C8"/><stop offset="1" stop-color="#566677"/></linearGradient>
  <linearGradient id="gJ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CBD9E6"/><stop offset="1" stop-color="#8B9DB1"/></linearGradient>
  <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A6A45"/><stop offset=".5" stop-color="#A98A5F"/><stop offset="1" stop-color="#DFCEAE"/></linearGradient>
  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDA05A"/><stop offset=".55" stop-color="#B57334"/><stop offset="1" stop-color="#8B5420"/></linearGradient>
  <linearGradient id="fL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7BA61"/><stop offset="1" stop-color="#D2801F"/></linearGradient>
  <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7189A2"/><stop offset=".38" stop-color="#CBDCEA"/><stop offset=".6" stop-color="#F7FBFD"/><stop offset="1" stop-color="#AFC2D2"/></linearGradient>
  <linearGradient id="fM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE08D"/><stop offset="1" stop-color="#DFA836"/></linearGradient>
  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9C8C6C"/><stop offset=".55" stop-color="#7A6A4E"/><stop offset="1" stop-color="#D6C8A8"/></linearGradient>
  <symbol id="어종-볼락" viewBox="0 0 24 24">
    <g stroke="#5E2716" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.2 12 L23.8 7.2 C22.6 10.2 22.6 13.8 23.8 16.8 Z" fill="url(#fA)"/>
    <path d="M5.6 8.6 L7 4.8 L8.6 7.8 L10.4 4.4 L12 7.4 L14 4.8 L15.4 7.8 L17.4 6.6 L18 9.6 Z" fill="url(#fA)"/>
    <path d="M7.2 16 L8.4 19.4 L10.6 17 L12.4 19.6 L14 16.8 Z" fill="url(#fA)"/>
    <path d="M1.6 12 C2.4 8.2 6.2 5.8 11 5.8 C15.2 5.8 18.6 7.8 20 10.4 C20.5 11.4 20.5 12.6 20 13.6 C18.6 16.2 15.2 18.2 11 18.2 C6.2 18.2 2.4 15.8 1.6 12 Z" fill="url(#gA)"/></g>
    <path d="M2.6 14.4 C5 17 9.2 18.2 13.6 17.4 C9.6 18.6 4.8 17.6 2.6 14.4 Z" fill="#F6DCC4" opacity=".8"/>
    <path d="M6.4 7.2 C4.9 9.2 4.9 14.8 6.6 16.8 C5.2 14.2 5.2 9.8 6.4 7.2 Z" fill="#6B2F1E" opacity=".55"/>
    <ellipse cx="12.6" cy="10.2" rx="2.1" ry="1.5" fill="#6B2F1E" opacity=".45"/>
    <ellipse cx="16.2" cy="12.8" rx="1.7" ry="1.2" fill="#6B2F1E" opacity=".45"/>
    <ellipse cx="9.6" cy="13.6" rx="1.5" ry="1.1" fill="#6B2F1E" opacity=".4"/>
    <ellipse cx="9.4" cy="14.4" rx="2.4" ry="1.5" fill="url(#fA)" transform="rotate(20 9.4 14.4)"/>
    <path d="M4.6 8.2 C7.4 6.6 12.4 6.4 16.4 7.8 C12.6 7.2 7.8 7.6 5.2 9 Z" fill="#fff" opacity=".38"/><path d="M7.6 6.8 C6.6 9 6.6 15 7.8 17.2 C6.4 14.6 6.4 9.2 7.6 6.8 Z" fill="#fff" opacity=".2"/><path d="M11.6 16.4 L12.6 18.8 L14.2 17 Z" fill="url(#fA)"/><circle cx="4.6" cy="10.4" r="2.3" fill="#fff"/><circle cx="4.699999999999999" cy="10.5" r="1.79" fill="#E0A93A"/><circle cx="4.699999999999999" cy="10.5" r="1.20" fill="#1B1208"/><circle cx="4.02" cy="9.83" r="0.55" fill="#fff"/>
    <path d="M1.6 12.4 C2.2 12.9 3 13.2 3.8 13.2 C3 13.6 2.1 13.4 1.6 12.4 Z" fill="#6B2F1E" opacity=".7"/>
  </symbol>
  <symbol id="어종-가자미" viewBox="0 0 24 24">
    <g stroke="#6B3B0A" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="11.4" cy="12" rx="11.4" ry="9" fill="url(#fL)"/>
    <path d="M19.6 12 L24 6.6 C24 10.2 24 13.8 24 17.4 Z" fill="url(#fL)"/>
    <ellipse cx="11.1" cy="11.9" rx="9.1" ry="6.9" fill="url(#gL)"/></g>
    <path d="M3.4 14.8 C6.4 18.4 13.2 19.2 17.4 16.6 C14.2 19.2 6.4 19 3.4 14.8 Z" fill="#F7DCB0" opacity=".8"/>
    <circle cx="15.6" cy="13.4" r="1.65" fill="#77440F" opacity=".5"/>
    <circle cx="12.6" cy="16" r="1.2" fill="#77440F" opacity=".5"/>
    <circle cx="14" cy="9.4" r="1.3" fill="#77440F" opacity=".5"/>
    <path d="M2.4 8.4 C1.6 9.6 1.2 10.8 1 12 C1.6 10.6 2.4 9.4 3.4 8.4 Z" fill="#B96C10" opacity=".45"/><path d="M5.4 4.2 C4.4 4.8 3.6 5.6 2.9 6.4 C4 5.6 5.2 5 6.4 4.6 Z" fill="#B96C10" opacity=".4"/><path d="M12.6 3.2 C12.2 3.9 11.9 4.5 11.7 5.2 C12.4 4.4 13.2 3.8 14 3.4 Z" fill="#B96C10" opacity=".4"/><path d="M8 18.6 C8.6 19.4 9.4 20 10.2 20.4 C9.2 19.6 8.5 18.9 8 18.2 Z" fill="#B96C10" opacity=".4"/><circle cx="6.2" cy="9.4" r="2.35" fill="#fff"/><circle cx="6.3" cy="9.5" r="1.83" fill="#D9A83E"/><circle cx="6.3" cy="9.5" r="1.22" fill="#1B1208"/><circle cx="5.61" cy="8.81" r="0.56" fill="#fff"/>
    <circle cx="10.4" cy="8.2" r="2.35" fill="#fff"/><circle cx="10.5" cy="8.299999999999999" r="1.83" fill="#D9A83E"/><circle cx="10.5" cy="8.299999999999999" r="1.22" fill="#1B1208"/><circle cx="9.81" cy="7.61" r="0.56" fill="#fff"/>
  </symbol>
  <symbol id="어종-농어" viewBox="0 0 24 24">
    <g stroke="#2C4A63" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19 12 L23.8 7.6 C22.8 10.4 22.8 13.6 23.8 16.4 Z" fill="url(#fB)"/>
    <path d="M6.6 8.2 L8.2 5 L10 7.6 L12 4.8 L13.4 7.4 L15.6 5.4 L16.6 8.8 Z" fill="url(#fB)"/>
    <path d="M9 16.4 L10.2 19.4 L12.4 17.2 L13.6 19.6 L15 16.8 Z" fill="url(#fB)"/>
    <path d="M1.4 12 C2.6 9 6.4 6.6 11.4 6.6 C15.4 6.6 18.6 8.4 19.8 10.6 C20.2 11.4 20.2 12.6 19.8 13.4 C18.6 15.6 15.4 17.4 11.4 17.4 C6.4 17.4 2.6 15 1.4 12 Z" fill="url(#gB)"/></g>
    <path d="M2.6 13.8 C5.6 16.4 10.8 17.4 15.4 16.2 C11 17.6 5 16.8 2.6 13.8 Z" fill="#FAFDFF" opacity=".85"/>
    <path d="M6 8 C4.6 9.8 4.6 14.2 6.2 16 C4.9 13.6 4.9 10.2 6 8 Z" fill="#3D5A74" opacity=".5"/>
    <path d="M4.4 9 C7.6 7.6 13.2 7.4 17.4 8.8 C13.4 8.2 8 8.4 5 9.8 Z" fill="#fff" opacity=".42"/><ellipse cx="8.4" cy="13.8" rx="2.4" ry="1.4" fill="url(#fB)" transform="rotate(22 8.4 13.8)"/><path d="M11.4 15.8 L12.4 18 L13.8 16.4 Z" fill="url(#fB)"/><path d="M9 10.4 C9.8 11.2 9.8 12.8 9 13.6 M12 10.2 C12.8 11 12.8 12.8 12 13.6 M15 10.4 C15.8 11.2 15.8 12.6 15 13.4" stroke="#3D5A74" stroke-opacity=".28" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="4" cy="10.8" r="2.2" fill="#fff"/><circle cx="4.1" cy="10.9" r="1.72" fill="#D8B24A"/><circle cx="4.1" cy="10.9" r="1.14" fill="#1B1208"/><circle cx="3.45" cy="10.25" r="0.53" fill="#fff"/>
    <path d="M1.4 12.3 C2 12.8 2.8 13.1 3.6 13.1 C2.8 13.5 1.9 13.3 1.4 12.3 Z" fill="#3D5A74" opacity=".7"/>
  </symbol>
  <symbol id="어종-방어" viewBox="0 0 24 24">
    <g stroke="#173C57" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.6 12 L24 7.4 C22.9 10.4 22.9 13.6 24 16.6 Z" fill="url(#fC)"/>
    <path d="M8 8.4 C10.6 6.4 14 6.2 16.6 7.6 L16 9.4 C13.6 8.4 10.6 8.6 8.6 10 Z" fill="url(#fC)"/>
    <path d="M9 15.8 C11.4 17.4 14.4 17.6 16.6 16.4 L16 14.8 C14 15.8 11.4 15.6 9.6 14.4 Z" fill="url(#fC)"/>
    <path d="M1.2 12 C2.8 9.2 6.8 7 11.6 7 C15.8 7 19.2 8.6 20.4 10.6 C20.9 11.4 20.9 12.6 20.4 13.4 C19.2 15.4 15.8 17 11.6 17 C6.8 17 2.8 14.8 1.2 12 Z" fill="url(#gC)"/></g>
    <path d="M1.6 11.6 C6 10.4 14.2 10.2 20.2 11.4 C14 11 6 11.2 1.6 12 Z" fill="#E8C048" opacity=".9"/>
    <path d="M2.6 13.6 C5.8 16 11 17 15.6 15.8 C11.2 17.2 5 16.4 2.6 13.6 Z" fill="#FAFDFF" opacity=".8"/>
    <path d="M5.8 8.4 C4.4 10.2 4.4 13.8 6 15.6 C4.7 13.2 4.7 10.6 5.8 8.4 Z" fill="#1E4460" opacity=".5"/>
    <path d="M4.4 9.2 C7.8 7.8 13.6 7.8 18 9.2 C13.8 8.6 8.2 8.8 5 10 Z" fill="#fff" opacity=".4"/><ellipse cx="8.6" cy="13.6" rx="2.5" ry="1.4" fill="url(#fC)" transform="rotate(22 8.6 13.6)"/><path d="M11.8 15.6 L12.8 17.8 L14.2 16.2 Z" fill="url(#fC)"/><circle cx="3.9" cy="10.9" r="2.2" fill="#fff"/><circle cx="4.0" cy="11.0" r="1.72" fill="#E6C24E"/><circle cx="4.0" cy="11.0" r="1.14" fill="#1B1208"/><circle cx="3.35" cy="10.35" r="0.53" fill="#fff"/>
  </symbol>
  <symbol id="어종-조기" viewBox="0 0 24 24">
    <g stroke="#8A6410" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19 12 L23.6 7.4 C22.5 10.4 22.5 13.6 23.6 16.6 Z" fill="#E0A62E"/>
    <path d="M6.4 8 L8 4.8 L9.8 7.4 L11.8 4.6 L13.2 7.2 L15.4 5.2 L16.4 8.6 Z" fill="#E0A62E"/>
    <path d="M8.6 16.6 L9.8 19.6 L12 17.4 L13.4 19.8 L14.8 17 Z" fill="#E0A62E"/>
    <path d="M1.6 12 C2.6 8.8 6.4 6.4 11.2 6.4 C15.4 6.4 18.8 8.2 20 10.6 C20.4 11.4 20.4 12.6 20 13.4 C18.8 15.8 15.4 17.6 11.2 17.6 C6.4 17.6 2.6 15.2 1.6 12 Z" fill="url(#gD)"/></g>
    <path d="M2.6 14 C5.6 16.8 11 17.8 15.6 16.4 C11.2 18 5.2 17.2 2.6 14 Z" fill="#FDF6E0" opacity=".9"/>
    <path d="M6 7.8 C4.6 9.8 4.6 14.2 6.2 16.2 C4.9 13.8 4.9 10 6 7.8 Z" fill="#A57B18" opacity=".55"/>
    <path d="M4.8 8.8 C7.8 7.2 13 7 17.2 8.4 C13.2 7.8 8.2 8 5.4 9.6 Z" fill="#fff" opacity=".45"/><ellipse cx="8.6" cy="13.8" rx="2.4" ry="1.4" fill="#E0A62E" transform="rotate(22 8.6 13.8)"/><path d="M11.4 16 L12.4 18.4 L14 16.8 Z" fill="#E0A62E"/><path d="M9.4 10 C10.2 10.8 10.2 12.6 9.4 13.4 M12.4 9.8 C13.2 10.6 13.2 12.6 12.4 13.4 M15.4 10.2 C16.2 11 16.2 12.4 15.4 13.2" stroke="#A57B18" stroke-opacity=".3" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="4.2" cy="10.6" r="2.3" fill="#fff"/><circle cx="4.3" cy="10.7" r="1.79" fill="#D8A828"/><circle cx="4.3" cy="10.7" r="1.20" fill="#1B1208"/><circle cx="3.62" cy="10.03" r="0.55" fill="#fff"/>
  </symbol>
  <symbol id="어종-대구" viewBox="0 0 24 24">
    <g stroke="#544829" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.6 12 L23.8 8 C22.9 10.6 22.9 13.4 23.8 16 Z" fill="#8C7A55"/>
    <path d="M6.4 8.4 C8.6 6.8 11 6.4 13 7 L12.6 8.8 C10.8 8.4 8.8 8.8 7.4 9.8 Z" fill="#8C7A55"/>
    <path d="M13.8 7.6 C15.4 7.4 17 7.8 18 8.6 L17.4 10.2 C16.4 9.6 15.2 9.4 14.2 9.4 Z" fill="#8C7A55"/>
    <path d="M1.2 12.4 C1.8 9.4 5.4 6.8 10.4 6.8 C15 6.8 18.8 8.6 20.2 10.8 C20.6 11.5 20.6 12.5 20.2 13.2 C18.8 15.4 15 17.2 10.4 17.2 C5.4 17.2 1.8 15.2 1.2 12.4 Z" fill="url(#gE)"/></g>
    <path d="M2.4 14.4 C5.2 16.6 10 17.4 14.6 16.2 C10.2 17.8 4.6 17 2.4 14.4 Z" fill="#F6F0DE" opacity=".85"/>
    <circle cx="9.4" cy="9.4" r="1.3" fill="#6B5B38" opacity=".45"/>
    <circle cx="13.6" cy="11.2" r="1.1" fill="#6B5B38" opacity=".45"/>
    <circle cx="6.6" cy="12.4" r="1" fill="#6B5B38" opacity=".4"/>
    <path d="M1.6 14.4 C1.8 16.6 2.6 18 3.4 18.6 C2.4 18.4 1.4 16.8 1.2 14.6 Z" fill="#6B5B38"/>
    <path d="M4.2 8.8 C7 7.4 12.4 7.2 16.8 8.6 C12.6 8 7.6 8.2 4.8 9.6 Z" fill="#fff" opacity=".4"/><ellipse cx="8" cy="14.2" rx="2.4" ry="1.4" fill="#8C7A55" transform="rotate(24 8 14.2)"/><path d="M6.2 7.6 C5 9.6 5 14.4 6.4 16.4 C5.2 14 5.2 9.8 6.2 7.6 Z" fill="#6B5B38" opacity=".5"/><circle cx="4" cy="10.6" r="2.2" fill="#fff"/><circle cx="4.1" cy="10.7" r="1.72" fill="#C7A662"/><circle cx="4.1" cy="10.7" r="1.14" fill="#1B1208"/><circle cx="3.45" cy="10.05" r="0.53" fill="#fff"/>
  </symbol>
  <symbol id="어종-장어" viewBox="0 0 24 24">
    <g stroke="#463218" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M2.6 17.4 C4.4 10.8 12.8 14.6 20.4 5 L22.2 6.4 C14.4 17 5.4 12.8 4.6 18.6 Z" fill="#C9A362"/>
    <path d="M1.4 16.6 C1.2 14.8 2.4 13.6 4.4 13.8 C8.6 14.2 12.8 12.4 16.6 7.8 C18.2 5.9 19.6 3.8 20.8 1.8 C22 2.6 22.7 3.6 22.9 4.8 C21.5 7.6 19.7 10.2 17.5 12.6 C13.2 17.4 8.2 19.8 4 19.8 C2.4 19.8 1.5 18.2 1.4 16.6 Z" fill="url(#gF)"/></g>
    <path d="M2.2 17.8 C6 19.2 11.6 17.2 16.4 12.2 C12.2 18.4 6 20.4 2.4 19 Z" fill="#E9DBBE" opacity=".8"/>
    <path d="M20.8 1.8 L22.6 .6 L23.2 4.2 Z" fill="#C9A362"/>
    <path d="M4.6 15.6 C8.8 15.6 13.4 13 17.4 8 C13.8 14.2 8.8 17.2 4.8 17.2 Z" fill="#fff" opacity=".3"/><path d="M5.4 15 C4.8 15.8 4.9 17.2 5.6 17.9 C4.9 17.1 4.8 15.8 5.4 15 Z" fill="#5A4426" opacity=".6"/><circle cx="3.2" cy="16.4" r="1.9" fill="#fff"/><circle cx="3.3000000000000003" cy="16.5" r="1.48" fill="#C8A860"/><circle cx="3.3000000000000003" cy="16.5" r="0.99" fill="#1B1208"/><circle cx="2.73" cy="15.92" r="0.46" fill="#fff"/>
    <path d="M1.4 17.4 C2 17.9 2.8 18.1 3.4 18 C2.8 18.5 1.9 18.4 1.4 17.4 Z" fill="#5A4426" opacity=".7"/>
  </symbol>
  <symbol id="어종-고등어" viewBox="0 0 24 24">
    <g stroke="#0E2A38" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.4 12 L23.9 7.4 C22.8 10.4 22.8 13.6 23.9 16.6 Z" fill="url(#fB)"/>
    <path d="M8.4 8 L10 5.4 L11.6 7.6 L13.4 5.2 L14.6 7.6 Z" fill="url(#fB)"/>
    <path d="M9.6 16.2 L10.8 18.8 L12.6 16.8 L13.8 19 L15 16.6 Z" fill="url(#fB)"/>
    <path d="M1.2 12 C2.6 9.2 6.8 7 11.6 7 C15.8 7 19.2 8.6 20.4 10.6 C20.9 11.4 20.9 12.6 20.4 13.4 C19.2 15.4 15.8 17 11.6 17 C6.8 17 2.6 14.8 1.2 12 Z" fill="url(#gG)"/></g>
    <path d="M6 8.4 C6.8 9.2 7.6 9.2 8.4 8.4 C9.2 9.2 10 9.2 10.8 8.4 C11.6 9.2 12.4 9.2 13.2 8.4 C14 9.2 14.8 9.2 15.6 8.4 L16.4 9.4 C15.6 10.2 14.8 10.2 14 9.4 C13.2 10.2 12.4 10.2 11.6 9.4 C10.8 10.2 10 10.2 9.2 9.4 C8.4 10.2 7.6 10.2 6.8 9.4 Z" fill="#12303F" opacity=".55"/>
    <path d="M2.6 13.6 C5.8 16 11 17 15.6 15.8 C11.2 17.2 5 16.4 2.6 13.6 Z" fill="#FAFDFF" opacity=".85"/>
    <ellipse cx="8.4" cy="13.8" rx="2.4" ry="1.35" fill="url(#fB)" transform="rotate(22 8.4 13.8)"/><path d="M11.6 15.6 L12.6 17.8 L14 16.2 Z" fill="url(#fB)"/><path d="M5.6 9.6 C4.4 10.6 4.4 13.4 5.8 14.4 C4.8 12.6 4.8 11.2 5.6 9.6 Z" fill="#12303F" opacity=".45"/><circle cx="3.9" cy="10.9" r="2.2" fill="#fff"/><circle cx="4.0" cy="11.0" r="1.72" fill="#CDBF6E"/><circle cx="4.0" cy="11.0" r="1.14" fill="#1B1208"/><circle cx="3.35" cy="10.35" r="0.53" fill="#fff"/>
  </symbol>
  <symbol id="어종-꽁치" viewBox="0 0 24 24">
    <g stroke="#1E4862" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M18.6 12 L23.6 8 C22.6 10.6 22.6 13.4 23.6 16 Z" fill="url(#fB)"/>
    <path d="M11 9 L12.6 6.8 L14 8.8 Z" fill="url(#fB)"/>
    <path d="M11.6 15.2 L13 17.4 L14.4 15.4 Z" fill="url(#fB)"/>
    <path d="M4.6 12 C6.6 9.6 10.6 8.2 14.8 8.2 C17.4 8.2 19.4 9.2 20.2 10.6 C20.6 11.3 20.6 12.7 20.2 13.4 C19.4 14.8 17.4 15.8 14.8 15.8 C10.6 15.8 6.6 14.4 4.6 12 Z" fill="url(#gG)"/></g>
    <path d="M5.4 12.8 C8 14.8 12.4 15.8 16.8 15.2 C12.4 16.4 7.4 15.4 5.4 12.8 Z" fill="#FAFDFF" opacity=".85"/>
    <path d="M4.8 12.6 C3.6 12.9 1.8 13.3 .4 13.6 L.2 12.4 C1.8 12.1 3.4 11.9 4.8 11.6 Z" fill="#4E7E9C"/>
    <path d="M6 10.4 C9 9 14 8.8 18.4 9.8 C14.2 9.4 9.6 9.6 6.6 10.8 Z" fill="#fff" opacity=".4"/><ellipse cx="10.4" cy="13.6" rx="1.9" ry="1.1" fill="url(#fB)" transform="rotate(20 10.4 13.6)"/><path d="M9.2 10 C8.4 10.8 8.4 13.2 9.2 14 C8.4 12.8 8.4 11.2 9.2 10 Z" fill="#12303F" opacity=".45"/><circle cx="7.2" cy="11.2" r="1.95" fill="#fff"/><circle cx="7.3" cy="11.299999999999999" r="1.52" fill="#D8CE72"/><circle cx="7.3" cy="11.299999999999999" r="1.01" fill="#1B1208"/><circle cx="6.71" cy="10.71" r="0.47" fill="#fff"/>
  </symbol>
  <symbol id="어종-연어" viewBox="0 0 24 24">
    <g stroke="#743247" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.4 12 L23.9 7.4 C22.8 10.4 22.8 13.6 23.9 16.6 Z" fill="#C06A80"/>
    <path d="M8.6 8 L10.2 5.2 L11.8 7.4 L13.6 5 L14.8 7.4 Z" fill="#C06A80"/>
    <path d="M9.6 16.2 L10.8 18.8 L12.6 16.8 L13.8 19 L15 16.6 Z" fill="#C06A80"/>
    <path d="M1.2 12 C2.8 9.2 6.8 7 11.6 7 C15.8 7 19.2 8.6 20.4 10.6 C20.9 11.4 20.9 12.6 20.4 13.4 C19.2 15.4 15.8 17 11.6 17 C6.8 17 2.8 14.8 1.2 12 Z" fill="url(#gH)"/></g>
    <path d="M2 11.4 C6.6 10.2 14.6 10 20.4 11.2 C14.4 10.8 6.4 11 2 12 Z" fill="#E8909C" opacity=".85"/>
    <path d="M2.6 13.6 C5.8 16 11 17 15.6 15.8 C11.2 17.2 5 16.4 2.6 13.6 Z" fill="#FCF1EE" opacity=".85"/>
    <circle cx="8.6" cy="9.6" r=".95" fill="#7E3A50" opacity=".5"/>
    <circle cx="12.6" cy="9" r=".85" fill="#7E3A50" opacity=".5"/>
    <path d="M1.2 12.2 C2 12.9 3 13.3 3.9 13.3 C3 13.9 1.8 13.5 1.2 12.2 Z" fill="#7E3A50" opacity=".75"/>
    <path d="M4.6 9 C7.8 7.6 13.4 7.4 17.6 8.8 C13.6 8.2 8.2 8.4 5.2 9.8 Z" fill="#fff" opacity=".42"/><ellipse cx="8.6" cy="13.8" rx="2.4" ry="1.4" fill="#C06A80" transform="rotate(22 8.6 13.8)"/><path d="M11.6 15.8 L12.6 18 L14 16.4 Z" fill="#C06A80"/><path d="M6 8.8 C4.8 10.4 4.8 13.6 6.2 15.2 C5.2 13.2 5.2 10.6 6 8.8 Z" fill="#7E3A50" opacity=".45"/><circle cx="4.2" cy="10.7" r="2.15" fill="#fff"/><circle cx="4.3" cy="10.799999999999999" r="1.68" fill="#DFA070"/><circle cx="4.3" cy="10.799999999999999" r="1.12" fill="#1B1208"/><circle cx="3.66" cy="10.16" r="0.52" fill="#fff"/>
  </symbol>
  <symbol id="어종-가오리" viewBox="0 0 24 24">
    <g stroke="#33404E" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M12 2.4 C13.7 2.4 14.8 3.4 15.2 4.8 L23.4 10.8 C24.4 11.8 23.9 13.6 22.4 13.3 C18.8 12.6 15.4 13.6 12 16.6 C8.6 13.6 5.2 12.6 1.6 13.3 C.1 13.6 -.4 11.8 .6 10.8 L8.8 4.8 C9.2 3.4 10.3 2.4 12 2.4 Z" fill="url(#gI)"/></g>
    <path d="M12 4 C13.2 4 14 4.7 14.3 5.7 L21 10.5 C18 10.4 15 11.5 12 13.8 C9 11.5 6 10.4 3 10.5 L9.7 5.7 C10 4.7 10.8 4 12 4 Z" fill="url(#gJ)"/>
    <circle cx="5.9" cy="10.9" r="1.35" fill="#EDF3F8" opacity=".85"/>
    <circle cx="18.1" cy="10.9" r="1.35" fill="#EDF3F8" opacity=".85"/>
    <circle cx="9" cy="12.6" r=".95" fill="#EDF3F8" opacity=".75"/>
    <circle cx="15" cy="12.6" r=".95" fill="#EDF3F8" opacity=".75"/>
    <path d="M10.3 15.4 C10.9 18.6 11.3 21.4 11.4 23.8 L13.6 23.8 C13.6 20.8 13.9 18 14.3 15.1 Z" fill="url(#gI)"/>
    <path d="M12.6 19.4 C13 21.2 13.1 22.8 13.05 23.8 L13.6 23.8 C13.6 22.2 13.7 20.6 13.9 19 Z" fill="#3B4856"/>
    <path d="M12 5.2 C14.4 5.6 17.4 7.6 20 10.2 C17 8.4 14.4 7 12 6.6 Z" fill="#fff" opacity=".35"/><circle cx="12" cy="11.4" r="1.5" fill="none" stroke="#EDF3F8" stroke-opacity=".55" stroke-width="1.1"/><circle cx="9.5" cy="7.4" r="1.9" fill="#fff"/><circle cx="9.6" cy="7.5" r="1.48" fill="#CBD9E6"/><circle cx="9.6" cy="7.5" r="0.99" fill="#1B1208"/><circle cx="9.03" cy="6.93" r="0.46" fill="#fff"/>
    <circle cx="14.5" cy="7.4" r="1.9" fill="#fff"/><circle cx="14.6" cy="7.5" r="1.48" fill="#CBD9E6"/><circle cx="14.6" cy="7.5" r="0.99" fill="#1B1208"/><circle cx="14.03" cy="6.93" r="0.46" fill="#fff"/>
  </symbol>
  <symbol id="어종-갈치" viewBox="0 0 24 24">
    <g stroke="#4C6675" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M2.6 18.6 C4.6 11.2 13.4 15.8 20.6 4.6 L22.6 6 C15.4 18 5.6 13.6 4.8 20.2 Z" fill="url(#fM)"/>
    <path d="M1.2 17.6 C1 15.6 2.4 14.2 4.6 14.4 C9 14.8 13.4 13 17.4 8.2 C19 6.2 20.4 4 21.6 1.8 C22.9 2.6 23.6 3.6 23.8 4.8 C22.4 7.6 20.6 10.2 18.4 12.6 C13.8 17.6 8.4 20.2 3.8 20.2 C2.2 20.2 1.3 19.2 1.2 17.6 Z" fill="url(#gM)"/></g>
    <path d="M2.4 18.6 C6.6 20 12.4 18 17.4 12.8 C13 19.4 6.6 21.4 2.6 20 Z" fill="#66809A" opacity=".4"/>
    <path d="M3.6 15.2 C3 16.2 3.1 18 3.9 19 C3 18.2 2.8 16.1 3.6 15.2 Z" fill="#5A7490" opacity=".65"/>
    <path d="M21.6 1.8 L23.4 .4 L23.9 4.5 Z" fill="url(#fM)"/>
    <path d="M4.6 16.6 C8.8 16.4 13.6 13.6 18 8.4 C14.2 14.6 9 18 4.8 18 Z" fill="#fff" opacity=".5"/><ellipse cx="6" cy="17.4" rx="1.7" ry="1" fill="url(#fM)" transform="rotate(-32 6 17.4)"/><circle cx="3" cy="17.3" r="2.15" fill="#fff"/><circle cx="3.1" cy="17.400000000000002" r="1.68" fill="#C9D6E2"/><circle cx="3.1" cy="17.400000000000002" r="1.12" fill="#1B1208"/><circle cx="2.46" cy="16.76" r="0.52" fill="#fff"/>
  </symbol>
  <symbol id="어종-쥐치" viewBox="0 0 24 24">
    <g stroke="#453D26" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.2 12 L23.4 8.6 C22.6 10.8 22.6 13.2 23.4 15.4 Z" fill="#8E9B6E"/>
    <path d="M8.6 5.4 L9.6 1.4 L11 5.2 Z" fill="#8E9B6E"/>
    <path d="M11 6.6 C15 6.6 18.6 8.4 20 10.8 C20.4 11.4 20.4 12.6 20 13.2 C18.6 15.6 15 17.4 11 17.4 C6.6 17.4 3.2 15 2.6 12 C3.2 9 6.6 6.6 11 6.6 Z" fill="url(#gN)"/></g>
    <path d="M3.6 13.6 C6 16.2 10.6 17.2 15 16.2 C11 17.6 5.6 16.8 3.6 13.6 Z" fill="#F0E9D4" opacity=".85"/>
    <path d="M10.6 6.8 C9.2 9 9.2 15 10.8 17.2 C9.6 14.6 9.6 9.4 10.6 6.8 Z" fill="#5C5238" opacity=".45"/>
    <circle cx="14.4" cy="10" r="1.2" fill="#5C5238" opacity=".4"/>
    <circle cx="16.4" cy="13" r="1" fill="#5C5238" opacity=".4"/>
    <path d="M6 8.4 C9.4 7.2 14.4 7.6 18 9.4 C14.4 8.4 9.8 8.2 6.6 9.4 Z" fill="#fff" opacity=".35"/><ellipse cx="9" cy="14" rx="2.1" ry="1.2" fill="#8E9B6E" transform="rotate(20 9 14)"/><circle cx="5.4" cy="11" r="2" fill="#fff"/><circle cx="5.5" cy="11.1" r="1.56" fill="#C9C078"/><circle cx="5.5" cy="11.1" r="1.04" fill="#1B1208"/><circle cx="4.90" cy="10.50" r="0.48" fill="#fff"/>
    <path d="M2.6 12 C3.1 12.4 3.6 12.6 4.2 12.6 C3.6 13 2.9 12.8 2.6 12 Z" fill="#5C5238" opacity=".8"/>
  </symbol>
  <symbol id="어종-아귀" viewBox="0 0 24 24">
    <g stroke="#463822" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M18.8 13 L23.2 9.8 C22.6 11.6 22.6 14.4 23.2 16.2 Z" fill="#7C6A50"/>
    <path d="M2 12 C2.6 8.6 6.6 6 11.4 6 C16 6 19.4 8.6 20.2 11.6 C20.6 12.8 20 14.4 18.4 15 C15.6 16 12.6 16.6 9.4 16.6 C5.4 16.6 2.4 15 2 12 Z" fill="url(#gK)"/></g>
    <path d="M2 12.4 C4.4 15.2 9.4 16.8 14.6 16.4 C16.2 16.3 17.6 15.9 18.6 15.4 C15.6 17.4 10.4 18 6.2 16.6 C4 15.8 2.4 14.4 2 12.4 Z" fill="#5F4E36"/>
    <path d="M3 13.4 C5.4 15.4 9.6 16.6 14 16.4 C10 17.2 5.2 16.2 3 13.4 Z" fill="#F2E8D2" opacity=".7"/>
    <path d="M9.2 6.2 C9.4 4.4 10 3 10.8 2.2 C11 3.4 10.8 4.8 10.2 6.2 Z" fill="#7C6A50"/>
    <circle cx="10.9" cy="2.2" r="1.15" fill="#F6E6B4"/>
    <path d="M3.4 13.4 L4.4 15 L5.4 13.6 L6.4 15.2 L7.4 13.8 L8.4 15.4 L9.4 14 L10.4 15.4 L11.4 14.2 L12.4 15.6 L13.4 14.2" stroke="#FFF7E4" stroke-width="1.1" fill="none" stroke-linejoin="round"/><path d="M4 9 C7 7.4 12.4 7 16.6 8.4 C12.6 7.8 7.6 8 4.8 9.6 Z" fill="#fff" opacity=".3"/><circle cx="6.2" cy="9.8" r="2.15" fill="#fff"/><circle cx="6.3" cy="9.9" r="1.68" fill="#D9B65C"/><circle cx="6.3" cy="9.9" r="1.12" fill="#1B1208"/><circle cx="5.66" cy="9.26" r="0.52" fill="#fff"/>
    <circle cx="14" cy="9.6" r="1.3" fill="#5F4E36" opacity=".45"/>
    <circle cx="17" cy="11.6" r="1" fill="#5F4E36" opacity=".45"/>
  </symbol>
  <symbol id="어종-양태" viewBox="0 0 24 24">
    <g stroke="#60411E" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.6 12.4 L23.8 9 C23 11.2 23 13.6 23.8 15.8 Z" fill="#B8763C"/>
    <path d="M9 13.4 C11.6 13.4 14 15 15 17.4 C13 18.6 10 18.4 8 16.8 Z" fill="#B8763C"/>
    <path d="M8.6 9.6 L10.6 6.8 L12.6 9 L14.6 6.6 L15.6 9.6 Z" fill="#B8763C"/>
    <path d="M1.4 12.6 C2.2 10.4 5.4 9 10 9 C14.6 9 18.6 10 20.2 11.6 C20.8 12.2 20.8 13.2 20.2 13.8 C18.6 15.4 14.6 16.4 10 16.4 C5.4 16.4 2.2 14.8 1.4 12.6 Z" fill="url(#gK)"/></g>
    <path d="M2.4 13.8 C5 15.6 10 16.4 15 15.8 C10.4 17 4.6 16.2 2.4 13.8 Z" fill="#F2E8D2" opacity=".8"/>
    <circle cx="12.4" cy="11.2" r="1.1" fill="#5F4E36" opacity=".4"/>
    <circle cx="16" cy="12.4" r=".9" fill="#5F4E36" opacity=".4"/>
    <path d="M4.4 10.2 C7.6 9.2 13.4 9.2 18 10.4 C13.6 9.9 8.2 10 5.2 11 Z" fill="#fff" opacity=".35"/><ellipse cx="8" cy="14.6" rx="2.2" ry="1.2" fill="#B8763C" transform="rotate(18 8 14.6)"/><circle cx="8.8" cy="11.6" r=".9" fill="#5F4E36" opacity=".35"/><circle cx="4.2" cy="11.4" r="1.95" fill="#fff"/><circle cx="4.3" cy="11.5" r="1.52" fill="#D2A85E"/><circle cx="4.3" cy="11.5" r="1.01" fill="#1B1208"/><circle cx="3.71" cy="10.91" r="0.47" fill="#fff"/>
    <path d="M1.4 12.8 C2 13.2 2.8 13.4 3.4 13.4 C2.8 13.9 1.9 13.7 1.4 12.8 Z" fill="#5F4E36" opacity=".75"/>
  </symbol>
  <symbol id="어종-병어" viewBox="0 0 24 24">
    <g stroke="#2C4A63" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.4 12 L23.6 8 C22.4 10.6 22.4 13.4 23.6 16 Z" fill="url(#fB)"/>
    <path d="M8.6 6.4 C12 5.4 16 6.6 18.4 9 L16.8 10.4 C14.8 8.6 11.6 7.8 9 8.6 Z" fill="url(#fB)"/>
    <path d="M9 17.6 C12.4 18.6 16.2 17.4 18.6 15 L17 13.6 C15 15.4 11.8 16.2 9.4 15.4 Z" fill="url(#fB)"/>
    <path d="M11.4 6 C15.6 6 19.2 8.4 20.4 11 C20.8 11.6 20.8 12.4 20.4 13 C19.2 15.6 15.6 18 11.4 18 C6.6 18 2.4 15.2 1.6 12 C2.4 8.8 6.6 6 11.4 6 Z" fill="url(#gB)"/></g>
    <path d="M2.8 13.8 C5.4 16.4 10.6 17.6 15.4 16.4 C11 18 5.2 17 2.8 13.8 Z" fill="#FAFDFF" opacity=".85"/>
    <path d="M5.4 8.8 C8.6 7.4 14 7.4 18 9 C14 8.2 9 8.4 6 9.8 Z" fill="#fff" opacity=".45"/><ellipse cx="9" cy="13.4" rx="2.3" ry="1.3" fill="url(#fB)" transform="rotate(20 9 13.4)"/><path d="M6.8 8.8 C5.6 10.4 5.6 13.6 7 15.2 C6 13.2 6 10.6 6.8 8.8 Z" fill="#3D5A74" opacity=".4"/><circle cx="4.8" cy="10.8" r="2.05" fill="#fff"/><circle cx="4.8999999999999995" cy="10.9" r="1.60" fill="#C9BE7A"/><circle cx="4.8999999999999995" cy="10.9" r="1.07" fill="#1B1208"/><circle cx="4.29" cy="10.29" r="0.49" fill="#fff"/>
    <path d="M1.7 11.8 C2.2 12.2 2.8 12.4 3.4 12.4 C2.8 12.8 2 12.6 1.7 11.8 Z" fill="#3D5A74" opacity=".75"/>
  </symbol>
  <symbol id="어종-망둑어" viewBox="0 0 24 24">
    <g stroke="#52422A" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round">
    <path d="M19.6 13 L23.6 9.4 C22.8 11.6 22.8 14.4 23.6 16.6 Z" fill="#9C8558"/>
    <path d="M7.4 9.4 C9.6 7.8 13 7.6 15.4 8.8 L14.8 10.6 C12.8 9.6 10 9.8 8.4 11 Z" fill="#9C8558"/>
    <path d="M8 15.6 C10.4 15.4 12.8 16.4 14 18.4 C12 19.4 9.2 19 7.4 17.4 Z" fill="#9C8558"/>
    <path d="M2 13 C2.8 10.4 6 8.8 10.6 8.8 C15 8.8 18.8 10.2 20.2 12.2 C20.7 12.9 20.7 13.5 20.2 14.2 C18.8 16 15 17.4 10.6 17.4 C6 17.4 2.8 15.6 2 13 Z" fill="url(#gK)"/></g>
    <path d="M3 14.4 C5.6 16.4 10.6 17.4 15.4 16.6 C10.8 18 5.2 17 3 14.4 Z" fill="#F2E8D2" opacity=".8"/>
    <circle cx="13" cy="11.6" r="1.15" fill="#5F4E36" opacity=".4"/>
    <circle cx="16.6" cy="13" r=".95" fill="#5F4E36" opacity=".4"/>
    <path d="M5.2 10.4 C8.2 9.4 13.6 9.4 18 10.8 C13.8 10.1 8.8 10.2 6 11.2 Z" fill="#fff" opacity=".35"/><circle cx="9.6" cy="14" r=".95" fill="#5F4E36" opacity=".35"/><circle cx="4.8" cy="11.6" r="2.1" fill="#fff"/><circle cx="4.8999999999999995" cy="11.7" r="1.64" fill="#D2AE62"/><circle cx="4.8999999999999995" cy="11.7" r="1.09" fill="#1B1208"/><circle cx="4.27" cy="11.07" r="0.50" fill="#fff"/>
    <path d="M2 13.4 C2.7 13.9 3.5 14.1 4.2 14.1 C3.5 14.6 2.5 14.4 2 13.4 Z" fill="#5F4E36" opacity=".75"/>
  </symbol>`;

export function 어종그림정의() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: `<defs>${정의}</defs>` }}
    />
  );
}

export default function 어종그림({ 이름, 크기 = 20 }) {
  const 이모지 = 이모지표[이름];
  if (이모지) {
    return (
      <span aria-hidden="true" style={{ fontSize: 크기, lineHeight: 1 }}>
        {이모지}
      </span>
    );
  }
  const 모양 = 모양표[이름];
  if (!모양) return null;
  return (
    <svg width={크기} height={크기} aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <use href={`#어종-${모양}`} />
    </svg>
  );
}

/* 그림이 있는 어종인지 — 화면에서 자리를 비울지 정할 때 쓴다 */
export function 그림있음(이름) {
  return !!(이모지표[이름] || 모양표[이름]);
}
