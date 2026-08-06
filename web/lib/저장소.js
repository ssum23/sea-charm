/* 기기 안 저장 — localStorage.
 * 서버로 아무것도 보내지 않는다 (시스템디자인 §1).
 * 키 이름의 .v1 은 나중에 모양이 바뀌어도 옛 기록을 덮어쓰지 않기 위한 것이다.
 */

export const 키 = {
  출항: 'seacharm.trips.v1',
  현재: 'seacharm.current.v1',
  잡은것: 'seacharm.catches.v1',
  /* 자주 잡는 어종. 사용자가 별표로 직접 고른다 (2026-08-06 폰 점검) */
  즐겨찾기: 'seacharm.favorites.v1',
};

/* 즐겨찾기와 「최근에 잡은 것」의 개수 상한.
 *
 * 🔴 왜 상한을 두는가 — 무한정 쌓이면 목록이 길어지고,
 *    **길어진 목록은 검색보다 느리다.** 짧아서 한눈에 들어올 때만 지름길이다.
 *    (2026-08-06 사장님 지시: 「무한정 하게 해줘선 안 됨」)
 *    숫자를 바꾸고 싶으면 여기만 고치면 된다. */
export const 즐겨찾기최대 = 6;
export const 최근최대 = 6;

export function 읽기(k, 기본값) {
  if (typeof window === 'undefined') return 기본값;
  try {
    const v = window.localStorage.getItem(k);
    return v ? JSON.parse(v) : 기본값;
  } catch (e) {
    return 기본값;
  }
}

export function 쓰기(k, v) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    /* 저장 공간이 꽉 찼거나 사생활 보호 모드 — 조용히 넘어간다 */
  }
}

const 요일 = ['일', '월', '화', '수', '목', '금', '토'];

export function 날짜말(d) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${요일[d.getDay()]})`;
}

export function 시각말(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const 오전오후 = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${오전오후} ${hh}:${m < 10 ? '0' + m : m}`;
}

export function 걸린시간(ms) {
  const 분 = Math.round(ms / 60000);
  const h = Math.floor(분 / 60);
  const m = 분 % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}
