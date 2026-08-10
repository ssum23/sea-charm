/* 헷갈림 표 검산 — 이 표가 기준표와 어긋나지 않는가
 *
 * 왜 검산이 필요한가 —
 * 이 표는 `species.json` 의 금지체장·금어기를 **베껴 적은 것이 아니라 참조한 결과**다.
 * 그런데 법이 바뀌어 기준이 바뀌면, **「기준이 높아진다」는 판단 자체가 틀린 말이 된다.**
 * 그때 조용히 틀린 안내가 나가지 않도록, 여기서 걸리게 한다.
 *
 * 🔴 이 표는 판정을 바꾸지 않는다. 그래도 사람에게 보이는 말이므로 틀리면 안 된다.
 */
var fs = require('fs');
var path = require('path');

var 기준표 = JSON.parse(fs.readFileSync(path.join(__dirname, 'species.json'), 'utf8'));
var 헷 = JSON.parse(fs.readFileSync(path.join(__dirname, '헷갈림.json'), 'utf8'));

var 통과 = 0, 실패 = 0, 실패목록 = [];
function T(이름, 참인가) {
  if (참인가) 통과++;
  else { 실패++; 실패목록.push('  ✗ ' + 이름); }
}
function 찾기(이름) {
  for (var i = 0; i < 기준표.어종.length; i++) {
    if (기준표.어종[i].이름 === 이름) return 기준표.어종[i];
  }
  return null;
}
function 체장(이름) {
  var s = 찾기(이름);
  return s && s.금지체장 ? s.금지체장.값 : null;
}
function 금어기있나(이름) {
  var s = 찾기(이름);
  return !!(s && (s.금어기 || []).length);
}

/* ① 표에 나오는 어종이 모두 기준표에 있어야 한다 */
var 모든이름 = [];
Object.keys(헷.쌍).forEach(function (고른) {
  모든이름.push(고른);
  헷.쌍[고른].forEach(function (x) { 모든이름.push(x.실제); });
});
T('표에 나오는 어종이 모두 기준표에 있다', 모든이름.every(function (n) { return !!찾기(n); }));

/* ② 「기준이 높아진다」가 실제로 높은가 */
T('🔴 「기준 높아짐」 표시가 기준표와 맞는다', Object.keys(헷.쌍).every(function (고른) {
  return 헷.쌍[고른].every(function (x) {
    if (!x.기준높아짐) return true;
    var a = 체장(x.실제), b = 체장(고른);
    return a != null && b != null && a > b;
  });
}));

/* ③ 「금어기를 놓친다」가 실제로 그런가 — 실제 종엔 금어기가 있고 고른 종엔 없어야 한다 */
T('🔴 「금어기 놓침」 표시가 기준표와 맞는다', Object.keys(헷.쌍).every(function (고른) {
  return 헷.쌍[고른].every(function (x) {
    if (!x.금어기놓침) return true;
    return 금어기있나(x.실제) && !금어기있나(고른);
  });
}));

/* ④ 위험하지 않은 조합이 섞여 들어오지 않았는가 */
T('위험하지 않은 조합은 표에 없다', Object.keys(헷.쌍).every(function (고른) {
  return 헷.쌍[고른].every(function (x) { return x.금어기놓침 || x.기준높아짐; });
}));

/* ⑤ 문턱 아래 조합이 들어오지 않았는가 — 잡음이 안내로 나가면 안 된다 */
T('문턱(1%) 아래 조합은 표에 없다', Object.keys(헷.쌍).every(function (고른) {
  return 헷.쌍[고른].every(function (x) { return x.비율 >= 헷.메타.문턱; });
}));

/* ⑥ 자기 자신을 가리키지 않는다 */
T('고른 어종과 실제 어종이 같은 줄은 없다', Object.keys(헷.쌍).every(function (고른) {
  return 헷.쌍[고른].every(function (x) { return x.실제 !== 고른; });
}));

/* ⑦ 🔴 가장 중요한 것 — 감성돔↔참돔이 빠지지 않았는가.
      이게 빠지면 5월에 「가져가도 됩니다」가 그대로 나간다 */
T('🔴 참돔을 골랐을 때 감성돔 주의가 들어 있다', (function () {
  var l = 헷.쌍['참돔'] || [];
  return l.some(function (x) { return x.실제 === '감성돔' && x.금어기놓침; });
})());

console.log('');
console.log('  헷갈림 표 검산');
console.log('  ─────────────────────────');
if (실패) console.log(실패목록.join('\n'));
console.log('  통과 ' + 통과 + ' · 실패 ' + 실패);
console.log('');
if (실패) process.exit(1);
