/* 바깥층(2층) — 인터넷이 있을 때만 되는 것들
 *
 * 🔴 2026-08-13 사장님 결정 (`37_두층구조_0.1.md`)
 *
 *   1층 본체 — 금어기·금지체장 판정 · 길이 재기 · 부적 · 도장 · 조과기록
 *              **인터넷이 없어도 된다.** 배 위에서 열리는 것이 이 앱의 자리다.
 *   2층 곁가지 — 법령 확인 · 날씨·물때 · 포인트 지도 · 커뮤니티
 *              **인터넷이 있을 때만.**
 *
 * 🔴 못 박은 규칙 셋 —
 *   ① 인터넷이 없으면 2층은 **조용히 접힌다.** 빈 네모도, 도는 표시도, 「연결 실패」도 남기지 않는다.
 *      배 위에서 그런 게 남아 있으면 판정이 멀쩡히 되는데도 **「이 앱 안 되네」**가 된다.
 *   ② **판정 화면에는 2층을 섞지 않는다.** 섞는 순간 판정이 인터넷에 물린다.
 *   ③ **근거 없는 숫자를 만들지 않는다.** 자료가 없으면 그 칸은 아예 안 만든다.
 */
import { useEffect, useState } from 'react';

const 밑 = process.env.NEXT_PUBLIC_BASE_PATH || '';

/* 지금 인터넷이 있나 — 브라우저가 알려주는 것을 그대로 쓴다.
 * 🔵 이 값은 「선이 꽂혀 있나」에 가깝고 「진짜 통하나」는 아니다.
 *    그래서 이것만 믿지 않고, 실제로 불러보고 실패하면 없는 것으로 친다. */
export function 인터넷있나() {
  const [있나, 있나바꾸기] = useState(true);
  useEffect(() => {
    function 다시() { 있나바꾸기(typeof navigator === 'undefined' ? true : navigator.onLine !== false); }
    다시();
    window.addEventListener('online', 다시);
    window.addEventListener('offline', 다시);
    return () => {
      window.removeEventListener('online', 다시);
      window.removeEventListener('offline', 다시);
    };
  }, []);
  return 있나;
}

/* ① 법령 확인 — 내 앱의 기준표가 낡았나
 *
 * 왜 필요한가 —
 * 법이 바뀌어 우리가 기준표를 고쳐 올려도, **폰은 옛 저장분을 갖고 있어서 안 받을 수 있다.**
 * 그러면 그 사람은 **낡은 기준으로 판정을 받는다.** 이 앱에서 가장 위험한 일이다.
 * (2026-08-10 에 같은 일을 겪었다 — 고친 것이 폰에 하나도 안 들어가고 있었다)
 *
 * 어떻게 아나 —
 *   폰에 저장된 `판.json` 의 기준일  ←→  서버에 지금 올라가 있는 `판.json` 의 기준일
 * 두 개가 다르면 새 기준표가 나온 것이다.
 *
 * 🔴 기준표를 저절로 바꾸지 않는다. **알려주기만 한다.**
 *    검산을 안 거친 기준표로 판정하는 것이 낡은 기준표보다 위험하다.
 */
export function 기준표확인() {
  const [답, 답바꾸기] = useState(null);
  const 인터넷 = 인터넷있나();

  useEffect(() => {
    if (!인터넷) { 답바꾸기(null); return undefined; }
    let 살아있음 = true;

    async function 보기() {
      try {
        /* 폰에 저장된 것 — 저장분을 그대로 읽는다 */
        const 안 = await fetch(밑 + '/판.json').then((r) => (r.ok ? r.json() : null));
        /* 서버에 올라가 있는 것 — 🔴 저장분을 건너뛰고 새로 받아야 뜻이 있다 */
        const 밖 = await fetch(밑 + '/판.json?새로=' + Date.now(), { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null));
        if (!살아있음 || !안 || !밖) return;
        const 안기준 = String(안.기준일 || '');
        const 밖기준 = String(밖.기준일 || '');
        if (안기준 && 밖기준 && 안기준 !== 밖기준) {
          답바꾸기({ 종류: '기준표', 내것: 안기준, 새것: 밖기준 });
          return;
        }
        /* 기준표는 같은데 앱만 새 판이면 — 급하지 않으므로 조용한 알림으로 */
        if (안.판 && 밖.판 && 안.판 !== 밖.판) {
          답바꾸기({ 종류: '앱', 말: String(밖.말 || '') });
        }
      } catch (e) {
        /* 🔴 실패하면 아무것도 안 한다. 「연결 실패」를 화면에 남기지 않는다 */
      }
    }
    보기();
    return () => { 살아있음 = false; };
  }, [인터넷]);

  return 답;
}
