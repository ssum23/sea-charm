/* 판정 엔진과 기준표는 여기에 복사해 두지 않는다.
 *
 * ../app/ 에 있는 원본을 그대로 가리킨다.
 * 복사본을 두면 어느 날 한쪽만 고쳐지고, 그 순간 판정이 틀린다.
 * 「틀리면 사람이 1천만원 이하 벌금을 문다」 — 시스템디자인 §4.
 *
 * 그러니 어종 기준을 고칠 곳은 언제나 app/species.json 한 군데다.
 */

import Judge from '../../app/judge.js';
import 기준표 from '../../app/species.json';

export const judge = Judge.만들기(기준표);
export const 메타 = 기준표.메타 || {};

/* 🔴 2026-08-10 — 어종 한 칸을 그대로 꺼내 쓸 수 있게 한다.
 *
 * 「헷갈림 주의」가 실제 후보의 금어기·금지체장을 봐야 하는데,
 * **그 값을 따로 베껴 적으면 언젠가 한쪽만 고쳐진다.** 원본을 그대로 가리킨다.
 * 이름과 별칭 둘 다로 찾는다 — 판정 엔진이 찾는 방식과 같다. */
export function 어종찾기(이름) {
  if (!이름) return null;
  const q = String(이름).trim();
  const 목록 = 기준표.어종 || [];
  for (const s of 목록) {
    if (s.이름 === q) return s;
    if ((s.별칭 || []).indexOf(q) !== -1) return s;
  }
  return null;
}
