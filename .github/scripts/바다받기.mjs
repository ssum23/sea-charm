/* 바다 정보(수온·파고·바람)를 받아서 작은 파일 하나로 만든다.
 *
 * 🔴 왜 여기서 받나 — 앱이 직접 부르면 두 가지가 막힌다.
 *   ① **인증키가 공개된다.** 우리 앱은 서버가 없어 코드가 통째로 폰에 내려간다.
 *   ② **브라우저가 공공데이터포털을 직접 못 부른다**(CORS).
 * 그래서 깃허브가 대신 받아서 파일로 만들어 둔다. 키는 깃허브 비밀값에만 있다.
 *
 * 🔴 이 파일은 `data` 가지에만 올린다. `main` 에 올리면 앱이 통째로 다시 배포되고
 *    판 번호가 바뀌어 **사용자들이 4MB를 다시 받는다.** 15분마다 그러면 안 된다.
 */
import fs from 'node:fs';

/* 🔴 2026-08-13 (고침) — 한 곳만 보면 안 된다.
 *
 * 처음에는 해역마다 관측소를 **하나씩만** 정해뒀는데, 첫 실행에서 드러났다 —
 *   · 인천항·여수항 부이는 값을 **아예 안 줬다**
 *   · 속초·중문 해수욕장 부이는 **어젯밤 값**이었다(13시간 전)
 *   · 그래서 **파고가 어디에도 안 떴고, 동해는 카드가 통째로 안 떴다**
 *
 * 🟢 그래서 해역마다 **여러 곳을 물어보고 가장 최근 것**을 쓴다.
 *    한 곳이 쉬어도 다른 곳이 받쳐준다. 값이 없으면 그 칸을 안 만드는 원칙은 그대로다. */
const 관측소 = {
  서해: {
    수온: [['DT_0001', '인천'], ['DT_0043', '영흥도'], ['DT_0018', '군산'], ['DT_0050', '태안']],
    부이: [['TW_0076', '인천항'], ['TW_0069', '대천해수욕장'], ['TW_0072', '군산항'], ['TW_0082', '태안항'], ['TW_0079', '상왕등도']],
  },
  동해: {
    수온: [['DT_0012', '속초'], ['DT_0006', '묵호'], ['DT_0091', '포항'], ['DT_0011', '후포'], ['DT_0057', '동해항']],
    부이: [['TW_0093', '속초해수욕장'], ['TW_0094', '망상해수욕장'], ['TW_0091', '낙산해수욕장'], ['TW_0095', '고래불해수욕장'], ['KG_0101', '울릉도북동']],
  },
  남해: {
    수온: [['DT_0016', '여수'], ['DT_0014', '통영'], ['DT_0005', '부산'], ['DT_0027', '완도'], ['DT_0061', '삼천포']],
    부이: [['TW_0083', '여수항'], ['TW_0084', '통영항'], ['TW_0087', '부산항'], ['TW_0078', '완도항'], ['KG_0025', '남해동부'], ['TW_0062', '해운대해수욕장']],
  },
  제주: {
    수온: [['DT_0004', '제주'], ['DT_0010', '서귀포'], ['DT_0022', '성산포'], ['DT_0023', '모슬포'], ['DT_0021', '추자도']],
    부이: [['TW_0075', '중문해수욕장'], ['KG_0021', '제주남부'], ['KG_0028', '제주해협']],
  },
};

/* 관측일시를 견줄 수 있는 숫자로 — 못 읽으면 0(가장 오래된 것으로 친다) */
function 언제(글) {
  if (!글) return 0;
  const t = new Date(String(글).replace(' ', 'T') + (String(글).length <= 16 ? ':00' : ''));
  return isNaN(t) ? 0 : t.getTime();
}

const 키 = process.env.DATA_GO_KR_KEY || '';
if (!키) { console.log('[바다] 인증키가 없습니다 — 건너뜁니다.'); process.exit(0); }

const 밑 = 'https://apis.data.go.kr/1192136';
const 공통 = `serviceKey=${encodeURIComponent(키)}&type=json&min=60&pageNo=1&numOfRows=24`;

/* 🔴 2026-08-13 (고침) — 실패 이유를 **삼키지 않는다.**
 *
 * 처음에는 실패하면 조용히 null 을 돌려줬는데, 그 바람에 자료가 통째로 비었을 때
 * **왜 비었는지 알 수가 없었다.** 오늘 자에서 배운 것과 같다 — 추측하지 말고 재야 한다.
 * 이제 상태와 답의 앞부분을 로그에 찍는다. 실패해도 나머지는 계속 돈다. */
async function 불러오기(주소, 이름) {
  try {
    const r = await fetch(주소);
    const 글 = await r.text();
    if (!r.ok) {
      console.log(`  [실패] ${이름} — HTTP ${r.status} ${글.slice(0, 160).replace(/\s+/g, ' ')}`);
      return null;
    }
    try {
      return JSON.parse(글);
    } catch (e) {
      /* 🔴 공공데이터포털은 오류일 때 json 을 달라 해도 xml 로 답한다.
         그래서 「글자를 못 읽었다」가 아니라 **무슨 오류인지**를 찍어야 한다 */
      console.log(`  [오류] ${이름} — ${글.slice(0, 220).replace(/\s+/g, ' ')}`);
      return null;
    }
  } catch (e) {
    console.log(`  [못감] ${이름} — ${e.message}`);
    return null;
  }
}

/* 잠깐 쉬기 — 한꺼번에 스무 개를 던지면 막힐 수 있다 */
const 쉬기 = (ms) => new Promise((r) => setTimeout(r, ms));

/* 마지막 한 줄 = 가장 최근 관측값 */
function 마지막(답) {
  const 목록 = 답 && 답.body && 답.body.items && 답.body.items.item;
  if (!목록) return null;
  const 줄들 = Array.isArray(목록) ? 목록 : [목록];
  return 줄들.length ? 줄들[줄들.length - 1] : null;
}

const 결과 = { 만든때: new Date().toISOString(), 바다: {} };

/* 여러 곳을 한꺼번에 물어보고 **가장 최근 것** 하나를 고른다 */
/* 🔴 하나씩 차례로 부른다. 한꺼번에 던지면 막힌다.
 *    이미 최근 것(세 시간 안쪽)을 찾으면 **거기서 멈춘다** — 부르는 횟수를 아낀다 */
async function 가장최근(주소들) {
  const 모은것 = [];
  for (const [코드, 이름] of 주소들) {
    const 길 = 코드.startsWith('DT_')
      ? 'surveyWaterTemp/GetSurveyWaterTempApiService'
      : 'twRecent/GetTWRecentApiService';
    const 답 = await 불러오기(`${밑}/${길}?${공통}&obsCode=${코드}`, 이름);
    const 줄 = 마지막(답);
    if (줄) {
      모은것.push({ 줄, 이름 });
      if (Date.now() - 언제(줄.obsrvnDt) < 3 * 3600 * 1000) break;
    }
    await 쉬기(250);
  }
  모은것.sort((a, b) => 언제(b.줄.obsrvnDt) - 언제(a.줄.obsrvnDt));
  return 모은것[0] || null;
}

for (const [바다, 곳] of Object.entries(관측소)) {
  console.log(`[바다] ── ${바다} ──`);
  const 수온것 = await 가장최근(곳.수온);
  const 부이것 = await 가장최근(곳.부이);

  /* 🔴 값이 없으면 그 칸을 아예 안 만든다. 「-」나 0 을 지어내지 않는다 */
  const 한바다 = {};
  if (수온것 && 수온것.줄.wtem != null) {
    한바다.수온 = Number(수온것.줄.wtem);
    한바다.수온잰곳 = 수온것.이름;
    한바다.수온잰때 = 수온것.줄.obsrvnDt || '';
  }
  if (부이것) {
    const b = 부이것.줄;
    if (b.wvhgt != null) 한바다.파고 = Number(b.wvhgt);
    if (b.wspd != null) 한바다.풍속 = Number(b.wspd);
    /* 조위관측소가 쉬면 부이 수온으로 대신한다 — 더 최근일 때만 */
    if (b.wtem != null && (한바다.수온 == null || 언제(b.obsrvnDt) > 언제(한바다.수온잰때))) {
      한바다.수온 = Number(b.wtem);
      한바다.수온잰곳 = 부이것.이름;
      한바다.수온잰때 = b.obsrvnDt || '';
    }
    if (한바다.파고 != null || 한바다.풍속 != null) {
      한바다.바다잰곳 = 부이것.이름;
      한바다.바다잰때 = b.obsrvnDt || '';
    }
  }
  if (Object.keys(한바다).length) 결과.바다[바다] = 한바다;
  console.log(`[바다] ${바다}`, JSON.stringify(한바다));
}

fs.mkdirSync('바다자료', { recursive: true });
fs.writeFileSync('바다자료/바다.json', JSON.stringify(결과), 'utf8');
console.log('[바다] 바다자료/바다.json 만들었습니다 —', Object.keys(결과.바다).length, '개 바다');
