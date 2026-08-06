/* 크기 한 곳 모음
 *
 * 쓰고 있는 디자인 시스템이 정한 기본 크기는 배 위에서 쓰기엔 작다
 * (디자인 시스템 최대 버튼 = 높이 48px · 글씨 16px).
 * 시스템디자인 §5 「젖은 손·흔들리는 배 / 글씨 크게, 버튼 크게」에 맞춰
 * 중간 크기(60px · 20px)로 올려 쓴다.
 *
 * 크기를 바꾸고 싶으면 이 파일의 숫자만 고치면 된다.
 * 색과 글꼴은 건드리지 않는다 — 그건 디자인 시스템 것을 그대로 쓴다.
 */

export const 크기 = {
  버튼높이: 60,
  버튼글씨: 30,
  버튼둥글기: 14,

  큰제목: 26,   // 화면 제목
  결과글씨: 45, // 「가져가도 돼요」 같은 판정 한 줄
  본문: 23,
  보조: 15,
  작게: 10,

  숫자판: 26,   // 길이 입력 키패드 숫자
  여백: 20,
  사이: 14,
};

/* 디자인 시스템 색을 이름으로 부르기 위한 모음.
 * 값을 직접 쓰지 않고 디자인 시스템이 정한 CSS 변수를 가리킨다 —
 * 디자인 시스템이 색을 바꾸면 여기도 따라 바뀐다. */
export const 색 = {
  주: 'var(--semantic-primary-normal)',
  글: 'var(--semantic-label-normal)',
  흐린글: 'var(--semantic-label-alternative)',
  아주흐린글: 'var(--semantic-label-assistive)',
  바탕: 'var(--semantic-background-normal-normal)',
  바탕뒤: 'var(--semantic-background-normal-alternative)',
  선: 'var(--semantic-line-solid-normal)',
  됨: 'var(--semantic-status-positive)',
  주의: 'var(--semantic-status-cautionary)',
  안됨: 'var(--semantic-status-negative)',
  흰: 'var(--semantic-static-white)',

  /* 바탕과 반대되는 덩어리 — 「검은 버튼」에 쓴다.
     밝은 화면에선 검정, 어두운 화면에선 흰색으로 저절로 뒤집힌다.
     여기에 label-normal 을 쓰면 어두운 화면에서 흰 바탕에 흰 글씨가 된다. */
  반전바탕: 'var(--semantic-inverse-background)',
  반전글: 'var(--semantic-inverse-label)',
  반전주: 'var(--semantic-inverse-primary)',
  채움: 'var(--semantic-fill-normal)',
};
