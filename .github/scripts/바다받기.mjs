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

const 관측소 = {
  서해: { 수온: 'DT_0001', 수온이름: '인천', 부이: 'TW_0076', 부이이름: '인천항' },
  동해: { 수온: 'DT_0012', 수온이름: '속초', 부이: 'TW_0093', 부이이름: '속초해수욕장' },
  남해: { 수온: 'DT_0016', 수온이름: '여수', 부이: 'TW_0083', 부이이름: '여수항' },
  제주: { 수온: 'DT_0004', 수온이름: '제주', 부이: 'TW_0075', 부이이름: '중문해수욕장' },
};

const 키 = process.env.DATA_GO_KR_KEY || '';
if (!키) { console.log('[바다] 인증키가 없습니다 — 건너뜁니다.'); process.exit(0); }

const 밑 = 'https://apis.data.go.kr/1192136';
const 공통 = `serviceKey=${encodeURIComponent(키)}&type=json&min=60&pageNo=1&numOfRows=24`;

async function 불러오기(주소) {
  try {
    const r = await fetch(주소);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

/* 마지막 한 줄 = 가장 최근 관측값 */
function 마지막(답) {
  const 목록 = 답 && 답.body && 답.body.items && 답.body.items.item;
  if (!목록) return null;
  const 줄들 = Array.isArray(목록) ? 목록 : [목록];
  return 줄들.length ? 줄들[줄들.length - 1] : null;
}

const 결과 = { 만든때: new Date().toISOString(), 바다: {} };

for (const [바다, 곳] of Object.entries(관측소)) {
  const [수온답, 부이답] = await Promise.all([
    불러오기(`${밑}/surveyWaterTemp/GetSurveyWaterTempApiService?${공통}&obsCode=${곳.수온}`),
    불러오기(`${밑}/twRecent/GetTWRecentApiService?${공통}&obsCode=${곳.부이}`),
  ]);
  const 수온줄 = 마지막(수온답);
  const 부이줄 = 마지막(부이답);

  /* 🔴 값이 없으면 그 칸을 아예 안 만든다. 「-」나 0 을 지어내지 않는다 */
  const 한바다 = {};
  if (수온줄 && 수온줄.wtem != null) {
    한바다.수온 = Number(수온줄.wtem);
    한바다.수온잰곳 = 곳.수온이름;
    한바다.수온잰때 = 수온줄.obsrvnDt || '';
  }
  if (부이줄) {
    if (부이줄.wvhgt != null) 한바다.파고 = Number(부이줄.wvhgt);
    if (부이줄.wspd != null) 한바다.풍속 = Number(부이줄.wspd);
    if (한바다.수온 == null && 부이줄.wtem != null) {
      한바다.수온 = Number(부이줄.wtem);
      한바다.수온잰곳 = 곳.부이이름;
      한바다.수온잰때 = 부이줄.obsrvnDt || '';
    }
    if (한바다.파고 != null || 한바다.풍속 != null) {
      한바다.바다잰곳 = 곳.부이이름;
      한바다.바다잰때 = 부이줄.obsrvnDt || '';
    }
  }
  if (Object.keys(한바다).length) 결과.바다[바다] = 한바다;
  console.log(`[바다] ${바다}`, JSON.stringify(한바다));
}

fs.mkdirSync('바다자료', { recursive: true });
fs.writeFileSync('바다자료/바다.json', JSON.stringify(결과), 'utf8');
console.log('[바다] 바다자료/바다.json 만들었습니다 —', Object.keys(결과.바다).length, '개 바다');
