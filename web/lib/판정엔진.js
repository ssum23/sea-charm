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
