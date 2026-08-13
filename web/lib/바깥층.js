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


/* ② 바다 정보 — 수온 · 파고 · 바람
 *
 * 어디서 오나 — 공공데이터포털(국립해양조사원 조위관측소 · 해양관측부이).
 * 🔴 앱이 직접 부르지 않는다. **중계를 거친다.**
 *   ① 인증키를 앱에 넣으면 깃허브에 공개되고 누구나 가져다 쓴다. 키는 중계에만 둔다.
 *   ② 브라우저가 공공데이터포털을 직접 부르면 막힌다(CORS).
 * 중계 코드는 `docs/38_바다중계_0.1.js` 에 있다.
 *
 * 🔴 주소가 비어 있으면 아무것도 안 한다 — 중계를 아직 안 세웠을 때 화면이 깨지지 않는다.
 * ⚠️ 환경값 이름은 영문이어야 한다 (64차에 겪었다 — 한글로 두면 셸이 못 읽는다).
 */
/* 🔵 2026-08-13 (고침) — 중계 서버를 새로 가입해서 두는 대신, **이미 쓰고 있는 깃허브**를 쓴다.
 *
 * 깃허브가 15분마다 공공데이터포털에서 받아 `data` 가지에 `바다.json` 으로 올려둔다
 * (`.github/workflows/바다.yml`). 앱은 그 파일을 그대로 읽는다.
 *
 * 🟢 이렇게 하면 —
 *   ① **인증키가 깃허브 비밀값에만 있다.** 앱에는 안 들어간다
 *   ② **브라우저가 막히지 않는다** — raw.githubusercontent.com 은 열려 있다(확인함)
 *   ③ **새로 가입할 곳이 없다**
 * 🔴 `main` 이 아니라 `data` 가지에 두는 이유 — `main` 에 올리면 배포가 다시 돌고
 *    판 번호가 바뀌어 **사용자가 15분마다 4MB를 다시 받는다.** */
const 자료주소 = 'https://raw.githubusercontent.com/ssum23/sea-charm/data/바다.json';

export function 바다정보(해역) {
  const [바다, 바다바꾸기] = useState(null);
  const 인터넷 = 인터넷있나();

  useEffect(() => {
    /* 🔴 셋 중 하나라도 없으면 아무것도 그리지 않는다 (`37_두층구조` 규칙 ①) */
    if (!해역 || !인터넷) { 바다바꾸기(null); return undefined; }
    let 살아있음 = true;
    /* 🔴 저장분을 건너뛰고 새로 받는다 — 낡은 수온을 보여주면 안 된다 */
    fetch(자료주소, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((전체) => {
        if (!살아있음 || !전체 || !전체.바다) return;
        const v = 전체.바다[해역];
        /* 🔴 수온도 파고도 없으면 빈 카드를 만들지 않는다 */
        if (!v || (v.수온 == null && v.파고 == null && v.풍속 == null)) return;
        바다바꾸기(v);
      })
      .catch(() => {});
    return () => { 살아있음 = false; };
  }, [해역, 인터넷]);

  return 바다;
}

/* 관측 시각을 사람 말로 — 🔴 「지금」이라고 말하지 않는다.
 * 관측소마다 마지막 관측 시각이 다르고, 며칠 지난 값이 섞여 있을 수 있다.
 * 우리는 **언제 잰 것인지 반드시 같이 말한다** (`PRD §0` 애매하면 애매하다고 말한다) */
export function 잰때말(글) {
  if (!글) return '';
  const t = new Date(String(글).replace(' ', 'T'));
  if (isNaN(t)) return '';
  const 분 = Math.floor((Date.now() - t.getTime()) / 60000);
  if (분 < 0) return '';
  if (분 < 90) return 분 + '분 전';
  const 시 = Math.floor(분 / 60);
  if (시 < 36) return 시 + '시간 전';
  return Math.floor(시 / 24) + '일 전';
}

/* 이 값을 보여줘도 되나 — 🔴 너무 오래된 것은 안 보여준다 */
export function 쓸만한가(글, 최대시간 = 12) {
  if (!글) return false;
  const t = new Date(String(글).replace(' ', 'T'));
  if (isNaN(t)) return false;
  return (Date.now() - t.getTime()) / 3600000 <= 최대시간;
}
