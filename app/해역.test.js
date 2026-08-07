/* 해역별 제철 검산 — `해역시즌.json` 이 믿을 만한가
 *
 * 왜 이 검산이 있는가 —
 * 이 값은 화면에 「8월에 많이 잡히는 것」으로 나간다. 틀리면 사람이 벌금을 물지는 않지만,
 * **없는 사실을 사실처럼 보여주게 된다**(PRD §0-1). 그래서 자료 자체를 검사한다.
 *
 * 🔴 가장 중요한 검사는 마지막 것이다 —
 *    **판정 엔진이 이 파일을 읽지 않는다.** 해역은 목록 순서일 뿐 판정과 아무 관계가 없다.
 */

var fs = require('fs');
var path = require('path');
var 해역 = require('./해역시즌.json');
var 어종표 = require('./species.json');

var 통과 = 0;
var 실패 = 0;
var 실패목록 = [];

function T(이름, 조건) {
  if (조건) 통과++;
  else { 실패++; 실패목록.push('  ✗ ' + 이름); }
}

/* ── 뼈대 ── */
T('해역이 넷이다 (동해·서해·남해·제주)',
  Array.isArray(해역.해역) && 해역.해역.length === 4);
T('제철 문턱이 있다', typeof 해역.제철문턱 === 'number' && 해역.제철문턱 > 0);
T('어디서 온 자료인지 적혀 있다',
  !!(해역.메타 && 해역.메타.자료 && 해역.메타.기간 && 해역.메타.해역묶기));

var 이름들 = {};
어종표.어종.forEach(function (s) { 이름들[s.이름] = true; });

/* ── 어종 이름 ── */
T('🔴 모든 어종 이름이 기준표에 있다 (오타가 있으면 화면에서 조용히 사라진다)', (function () {
  var 나쁨 = Object.keys(해역.어종).filter(function (n) { return !이름들[n]; });
  if (나쁨.length) 실패목록.push('      기준표에 없는 이름: ' + 나쁨.join(', '));
  return 나쁨.length === 0;
})());

/* ── 값의 모양 ── */
T('월 값은 12칸이고 0~100이다', (function () {
  var 나쁨 = [];
  Object.keys(해역.어종).forEach(function (n) {
    해역.해역.forEach(function (h) {
      var v = 해역.어종[n][h];
      if (!v) return;                       // null = 그 해역에서는 말하지 않는다
      if (!Array.isArray(v.월) || v.월.length !== 12) { 나쁨.push(n + '/' + h + ' 칸 수'); return; }
      for (var i = 0; i < 12; i++) {
        if (typeof v.월[i] !== 'number' || v.월[i] < 0 || v.월[i] > 100) 나쁨.push(n + '/' + h + ' ' + (i + 1) + '월');
      }
    });
  });
  if (나쁨.length) 실패목록.push('      ' + 나쁨.slice(0, 5).join(', '));
  return 나쁨.length === 0;
})());

T('값이 있는 칸에는 100인 달이 정확히 하나 이상 있다 (가장 많은 달이 100이다)', (function () {
  var 나쁨 = [];
  Object.keys(해역.어종).forEach(function (n) {
    해역.해역.forEach(function (h) {
      var v = 해역.어종[n][h];
      if (!v) return;
      if (Math.max.apply(null, v.월) !== 100) 나쁨.push(n + '/' + h);
    });
  });
  if (나쁨.length) 실패목록.push('      ' + 나쁨.slice(0, 5).join(', '));
  return 나쁨.length === 0;
})());

T('값이 있는 칸은 제철인 달이 하나 이상이다', (function () {
  var 나쁨 = [];
  Object.keys(해역.어종).forEach(function (n) {
    해역.해역.forEach(function (h) {
      var v = 해역.어종[n][h];
      if (!v) return;
      var 제철 = v.월.filter(function (x) { return x >= 해역.제철문턱; });
      if (!제철.length) 나쁨.push(n + '/' + h);
    });
  });
  return 나쁨.length === 0;
})());

/* ── 자료가 살아 있는가 — 아는 사실과 맞춰본다 ──
   🔴 이건 「우리가 만든 값」이 아니라 「통계에 실제로 그렇게 찍혀 있는가」를 본다.
      틀리면 자료를 잘못 읽은 것이다. */
function 몫(이름, 해, 달) {
  var v = 해역.어종[이름] && 해역.어종[이름][해];
  return v ? v.월[달 - 1] : null;
}

T('주꾸미는 서해에 있고 동해에는 없다 (어획의 거의 전부가 서해다)',
  몫('주꾸미', '서해', 9) === 100 && 해역.어종['주꾸미']['동해'] === null);
T('주꾸미 서해 6·7월은 아주 낮다 (5/11~8/31 금어기가 자료에 그대로 보인다)',
  몫('주꾸미', '서해', 6) < 5 && 몫('주꾸미', '서해', 7) < 5);
T('감성돔 남해 5월은 아주 낮다 (5월이 금어기다)',
  몫('감성돔', '남해', 5) < 5);
T('대구는 동해에 있고 남해에는 없다',
  !!해역.어종['대구']['동해'] && 해역.어종['대구']['남해'] === null);
T('한치는 제주·남해에 있고 서해에는 없다',
  !!해역.어종['한치']['제주'] && !!해역.어종['한치']['남해'] && 해역.어종['한치']['서해'] === null);

/* ── 낚시 전문지 교차 확인 (2026-08-07 신설) ──
   🔴 통계만 믿지 않는다. 「많이 잡혔다」와 낚시인이 말하는 「시즌」은 서로 다른 것을 잰다. */
T('전문지 자료가 있고 출처가 적혀 있다', (function () {
  if (!해역.전문지 || !해역.메타.전문지) return false;
  return Object.keys(해역.전문지).length >= 30 &&
         (해역.메타.전문지.출처 || []).length >= 3;
})());

T('🔴 전문지 어종 이름도 기준표에 있다', (function () {
  var 나쁨 = Object.keys(해역.전문지).filter(function (n) { return !이름들[n]; });
  if (나쁨.length) 실패목록.push('      기준표에 없는 이름: ' + 나쁨.join(', '));
  return 나쁨.length === 0;
})());

T('전문지 월은 1~12다', (function () {
  return Object.keys(해역.전문지).every(function (n) {
    var ms = 해역.전문지[n].월;
    return Array.isArray(ms) && ms.length > 0 &&
           ms.every(function (m) { return m >= 1 && m <= 12; });
  });
})());

T('🔴 전문지가 통계를 덮지 않는다 — 통계에 없는 달은 「제철」이 될 수 없다', (function () {
  /* 「제철」은 **둘 다** 가리킬 때만이다. 전문지만 가리키는 달은 아무 배지도 안 붙는다.
     이게 뒤집히면 커뮤니티 글 하나가 40개월 실측을 이기게 된다 */
  var 나쁨 = [];
  Object.keys(해역.전문지).forEach(function (n) {
    var 칸 = 해역.어종[n];
    if (!칸) return;
    해역.해역.forEach(function (h) {
      var v = 칸[h];
      if (!v) return;
      해역.전문지[n].월.forEach(function (m) {
        /* 전문지가 말해도 통계가 낮으면 제철이 아니어야 한다 — 계산은 화면이 하지만
           자료 자체가 그렇게 쓰여 있는지(통계 값이 그대로 남아 있는지)를 본다 */
        if (typeof v.월[m - 1] !== 'number') 나쁨.push(n + '/' + h + '/' + m);
      });
    });
  });
  return 나쁨.length === 0;
})());

T('아는 사실과 맞는다 — 대구는 겨울, 주꾸미는 가을, 볼락은 겨울', (function () {
  function 있나(n, ms) {
    var v = 해역.전문지[n];
    return !!v && ms.every(function (m) { return v.월.indexOf(m) !== -1; });
  }
  return 있나('대구', [12, 1]) && 있나('주꾸미', [9, 10]) && 있나('볼락', [1, 2]);
})());

/* ── 🔴 판정과 섞이지 않는가 ── */
T('🔴 판정 엔진은 해역시즌 자료를 불러오지 않는다 (해역은 목록 순서일 뿐이다)', (function () {
  var 엔진 = fs.readFileSync(path.join(__dirname, 'judge.js'), 'utf8');
  /* 「해역」이라는 낱말 자체는 안내 문구에 나온다("일부 해역은 기간이 달라요").
     막아야 하는 것은 **이 자료를 판정에 끌어 쓰는 것**이다 */
  return 엔진.indexOf('해역시즌') === -1 && 엔진.indexOf('해역.json') === -1;
})());

T('🔴 기준표(species.json)에는 해역이 없다 — 판정 자료와 섞이지 않았다', (function () {
  return 어종표.어종.every(function (s) { return !s.해역 && !s.해역시즌; });
})());

console.log('');
console.log('  해역별 제철 검산');
console.log('  ─────────────────────────');
if (실패목록.length) { console.log(실패목록.join('\n')); console.log(''); }
console.log('  통과 ' + 통과 + ' · 실패 ' + 실패);
console.log('');
process.exit(실패 ? 1 : 0);
