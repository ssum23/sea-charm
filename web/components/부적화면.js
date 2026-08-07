'use client';

/* 오늘의 바다 부적 (PRD의 S)
 *
 * 부적 종이만은 디자인 시스템 색을 쓰지 않는다.
 * 디자인 시스템의 파랑은 이 종이의 목소리와 맞지 않는다.
 * 나머지(머리·버튼·설명)는 전부 디자인 시스템 그대로다.
 *
 * 문구는 ../app/부적.js 가 정한다. 이 파일은 그리기만 한다.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import 부적 from '@/lib/부적엔진';
import { judge } from '@/lib/판정엔진';
import 어종그림, { 그림있음 } from '@/lib/어종그림';
import 도장그림 from './도장그림';
import 화면틀 from './화면틀';
import { 풀이 as 물때풀이, 짧게 as 물때짧게 } from '@/lib/물때말';

const 생년키 = 'seacharm.birthyear.v1';
/* 어떤 부적까지 뽑아 봤는지 — 같은 부적을 다시 볼 때는 연출을 되풀이하지 않는다 */
const 뽑은것키 = 'seacharm.charmdrawn.v1';
const 행운키 = 'seacharm.luck.v1';
const 이력키 = 'seacharm.charms.v1';

/* 지난 부적을 몇 장까지 남기나.
   한 장이 보통 3~5일이니 40장이면 5~6개월쯤 된다. 그 이상은 볼 일이 없다. */
const 이력한도 = 40;

function 이력읽기() {
  try {
    const v = JSON.parse(window.localStorage.getItem(이력키) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

/* 받은 부적을 기기에 남긴다.
 *
 * 왜 필요한가 — 지금은 화면을 벗어나면 그 부적이 사라진다.
 * 부적은 모으는 물건이고, 도장과 나란히 「지난 것」이 보여야 다시 열 이유가 된다.
 *
 * 한 물때에 한 장이므로 열쇠는 물때키다. 같은 물때를 다시 열면 덮어쓴다 —
 * 띠를 나중에 넣으면 그 물때 부적에도 띠말이 채워져야 하기 때문이다.
 * 서버로는 아무것도 보내지 않는다. 이 기기 안에만 있다.
 */
function 이력남기기(r) {
  if (!r || !r.물때키) return;
  const 한장 = {
    키: r.물때키,
    물때: r.물때,
    도장: r.도장,
    제목: r.제목,
    근거: r.근거,
    띠: r.띠,
    띠말: r.띠말,
    행운색: r.행운색,
    행운숫자: r.행운숫자,
    시작: r.구간?.시작 ? new Date(r.구간.시작).toISOString() : null,
    끝: r.구간?.끝 ? new Date(r.구간.끝).toISOString() : null,
  };
  try {
    const 목록 = 이력읽기().filter((x) => x.키 !== 한장.키);
    목록.unshift(한장);
    window.localStorage.setItem(이력키, JSON.stringify(목록.slice(0, 이력한도)));
  } catch (e) {
    /* 저장 공간이 꽉 찼거나 사생활 보호 모드 — 조용히 넘어간다 */
  }
}

/* 이번 물때 몫의 행운을 가져온다.
 *
 * 🔴 이게 없으면 부적이 깨진다.
 * `부적.js`의 `발급()`은 행운을 안 넘기면 그 자리에서 난수로 새로 뽑는다.
 * 화면이 뽑은 값을 저장해 다시 쓰지 않으면 열 때마다 색·숫자가 바뀐다.
 *
 * 단위는 「하루」가 아니라 **「물때」** 다 (CHANGES #92 — #87을 뒤집은 결정).
 * 사리·중간·조금이 바뀔 때 새 부적이 나오고, 한 구간(보통 3~5일)은 같은 것이 나온다.
 * 그래서 `하루키`가 아니라 `물때키`로 저장한다 — 정적 화면(`부적.html`)과 같은 키다.
 */
/* 🔴 2026-08-07 — 말을 거는 물고기를 **그때그때 제철인 어종 중에서** 고른다 (사장님 지시).
 *
 * 「지나가던 물고기」가 8월엔 갈치, 11월엔 대구가 된다. 그 달의 바다가 부적에 비친다.
 * 어종 순서는 낚시어선 어획 통계 41개월 실측이 정한다(`judge.상단목록`).
 *
 * 고르는 기준 셋 —
 *   ① 지금 제철일 것   ② 지금 금어기가 아닐 것   ③ 그림이 있을 것
 * 셋을 다 만족하는 게 하나도 없으면 물고기 없이 그린다. 빈자리를 억지로 채우지 않는다.
 */
function 오늘물고기고르기(오늘) {
  try {
    const 목록 = judge
      .상단목록(오늘, 12)
      .filter((s) => s.제철 && !s.금어기중 && 그림있음(s.이름))
      .map((s) => s.이름);
    if (!목록.length) return null;
    return 목록[Math.floor(Math.random() * 목록.length)];
  } catch (e) {
    return null;
  }
}

function 이번물때행운(오늘) {
  const 날 = 부적.물때키(오늘);
  try {
    const v = JSON.parse(window.localStorage.getItem(행운키) || 'null');
    /* 🔴 2026-08-07 — 자리·한마디가 없는 **옛 저장값**이면 새로 뽑는다.
       그게 없으면 열 때마다 한마디가 바뀌어 부적이 아니라 잡음이 된다.
       `물고기` 는 없어도 그냥 둔다 — 제철이 아닐 때는 원래 없을 수 있다 */
    if (v && v.날 === 날 && v.색 && v.숫자 && v.자리 && v.한마디) return v;
  } catch (e) {
    /* 못 읽으면 새로 뽑는다 */
  }
  const 새것 = 부적.행운뽑기();
  const 저장 = {
    날, 색: 새것.색, 숫자: 새것.숫자, 자리: 새것.자리, 한마디: 새것.한마디,
    물고기: 오늘물고기고르기(오늘),
  };
  try {
    window.localStorage.setItem(행운키, JSON.stringify(저장));
  } catch (e) {}
  return 저장;
}

/* 「이 물때가 3일 더 갑니다」 — 부적이 하루짜리가 아니라는 걸 알려준다.
 * 이게 없으면 다시 열었을 때 「왜 안 바뀌지」가 된다 (CHANGES #95) */
function 안내말(r) {
  if (!r) return ' ';
  const 남 = r.구간?.남은날 ?? 0;
  const 유효 = 남 > 0 ? `이 물때가 ${남}일 더 갑니다` : '오늘이 이 물때의 마지막 날이에요';
  /* 「조금」만 적으면 「조금(=약간)」으로 읽힌다. 짧은 풀이를 붙인다 */
  const 물때말 = 물때짧게[r.물때] ? `${r.물때}(${물때짧게[r.물때]})` : r.물때;
  return `${r.띠 ? r.띠 + '띠 · ' : ''}${물때말} · ${유효}`;
}

/* 부적 종이 머리에 찍는 유효 기간 */
function 기간말(g) {
  if (!g) return '';
  const 짧게 = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return g.길이 <= 1 ? 짧게(g.시작) : `${짧게(g.시작)} ~ ${짧게(g.끝)}`;
}

/* 부적 종이 색 — 디자인 시스템 팔레트 밖이다. 일부러 그렇게 둔다.
   🔴 2026-08-07 전면 교체 — 한지(갈색)에서 **밝은 바다색 + 굵은 테 + 노란 그림자**로.
   갈색은 앱 안에서 혼자 튀었다. 이름표 `갈색`은 뜻과 안 맞아 `강조`로 바꿨다 */
const 종이 = {
  바탕: '#ffffff',
  글: '#2E4A50',
  진한글: '#123039',
  강조: '#2C8098',          // 「오 늘 의 바 다」 같은 작은 글씨
  테: '#123039',            // 굵은 테두리 · 물때 딱지 바탕
  그림자: '#F2C14E',        // 노란 그림자 · 지느러미 · 도장 바탕
  물고기: '#7FCBE0',
  말풍선바탕: '#FFF7E0',
  말풍선글: '#6A4E0E',
  말풍선테: '#E0B84A',
  칸바탕: '#EEF6F8',
  도장: '#F2C14E',
  선: 'rgba(18,48,57,.18)',
};

const 버튼모양 = {
  height: 크기.부적버튼높이,
  fontSize: 크기.버튼글씨,
  fontWeight: 700,
  borderRadius: 크기.버튼둥글기,
};

export default function 부적화면() {
  const [준비, 준비바꾸기] = useState(false);
  const [생년, 생년바꾸기] = useState(null);
  const [입력, 입력바꾸기] = useState('');
  const [지금, 지금바꾸기] = useState(null);
  const [결과, 결과바꾸기] = useState(null);
  const [이력, 이력바꾸기] = useState([]);
  const [이력펼침, 이력펼침바꾸기] = useState(false);
  /* 🔴 뽑기 연출 — 켜져 있으면 통이 보이고, 꺼지면 부적이 보인다.
     물때가 바뀌거나 띠를 바꿔 **새 부적이 나올 때만** 켠다.
     같은 부적을 다시 보러 들어올 때마다 흔들면 그건 연출이 아니라 방해다 */
  const [뽑는중, 뽑는중바꾸기] = useState(false);

  useEffect(() => {
    const 오늘 = new Date();
    지금바꾸기(오늘);
    try {
      생년바꾸기(window.localStorage.getItem(생년키) || null);
    } catch (e) {
      /* 사생활 보호 모드 — 그냥 생년 없이 간다 */
    }
    준비바꾸기(true);
  }, []);

  /* 생년이 정해지거나 바뀔 때만 부적을 다시 발급한다.
     렌더마다 발급하면 행운이 계속 바뀐다 */
  useEffect(() => {
    if (!지금) return;
    const 몫 = 이번물때행운(지금);
    const r = 부적.발급(생년 ? 생년 + '-01-01' : null, 지금, 몫);
    r.물고기 = 몫.물고기 || null;
    결과바꾸기(r);
    이력남기기(r);
    이력바꾸기(이력읽기());

    /* ── 뽑기 연출을 켤 것인가 ──────────────────────────
       「이 부적을 이미 뽑아 봤나」로 정한다. 표시는 `물때키 + 띠`다 —
       물때가 바뀌면 새 부적이고, 띠를 넣어도 내용이 바뀌므로 다시 뽑는 게 맞다. */
    const 표 = String(r.물때키 || '') + '|' + String(r.띠 || '');
    let 이미봤나 = false;
    try { 이미봤나 = window.localStorage.getItem(뽑은것키) === 표; } catch (e) {}

    /* 🔴 「동작 줄이기」를 켠 사람에게는 연출을 아예 건너뛴다.
       안 움직이는 통을 1.4초 보여주는 건 그냥 기다리게 하는 것이다 */
    let 움직임싫음 = false;
    try {
      움직임싫음 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    if (이미봤나 || 움직임싫음) {
      뽑는중바꾸기(false);
      return;
    }

    뽑는중바꾸기(true);
    try { window.localStorage.setItem(뽑은것키, 표); } catch (e) {}

    /* 시간표 — 🔴 사람이 또 누르지 않는다. 저절로 넘어간다 (사장님 지시)
         0.00s  육각통이 흔들리기 시작
         0.60s  작은 구멍에서 막대가 솟기 시작
         1.15s  막대가 다 나와 第○番 이 보인다
         1.60s  부적 종이로 바뀐다 — 막대를 뽑는 데서 끝낸다 */
    const 시계 = setTimeout(() => 뽑는중바꾸기(false), 1600);
    return () => clearTimeout(시계);
  }, [생년, 지금]);

  const 생년물어야함 = 준비 && !생년 && 입력 !== '건너뜀';

  function 생년확정(y) {
    try {
      window.localStorage.setItem(생년키, String(y));
    } catch (e) {}
    생년바꾸기(String(y));
  }

  function 생년지우기() {
    try {
      window.localStorage.removeItem(생년키);
    } catch (e) {}
    생년바꾸기(null);
    입력바꾸기('');
  }

  return (
    <화면틀
      제목="오늘의 바다 부적"
      날짜={지금}
      안내={생년물어야함 ? '처음 한 번만 여쭙습니다' : 안내말(결과)}
      /* 하루 순서 — 출항 전에 부적, 잡으면 판정 */
      다음={{ 이름: '이거 가져가도 되나요', 주소: '/catch' }}
    >
      {생년물어야함 ? (
        <생년묻기
          입력={입력}
          입력바꾸기={입력바꾸기}
          확정={생년확정}
          건너뛰기={() => 입력바꾸기('건너뜀')}
        />
      ) : (
        결과 && (
          뽑는중 ? (
            <뽑기통 번호={부적번호(결과.물때키)} />
          ) : (
          <>
            <부적종이 r={결과} 지금={지금} />

            <Typography sx={{ fontSize: 크기.부적작게, color: 색.아주흐린글, lineHeight: 1.75, padding: '0 4px' }}>
              <b style={{ color: 색.흐린글 }}>부적은 물때마다 한 장이에요.</b> 
              
              <b style={{ color: 색.흐린글 }}>  어획도 안전도 점치지 않습니다.</b>
            </Typography>

            {/* 🔴 2026-08-07 — 여기 있던 「홈으로 돌아가기」 큰 버튼을 뺐다 (사장님 지적
                「홈으로 갈 수 있는 버튼 위치를 통일」).
                홈으로 가는 길은 **왼쪽 위 「‹ 홈」 하나**다. 화면마다 자리가 다르면
                눈으로 찾게 되고, 그게 「제각각」의 정체였다.
                같은 곳으로 가는 문이 한 화면에 둘이면 그것만으로 자리가 흔들린다. */}
            <Button
              variant="outlined"
              color="assistive"
              size="large"
              fullWidth
              onClick={생년지우기}
              sx={{ ...버튼모양, fontSize: 크기.부적홈, fontWeight: 500, color: 색.흐린글 }}
            >
              {결과.띠 ? '생년 다시 넣기' : '띠를 넣어 부적 받기'}
            </Button>

            {/* 지난 부적 — 이번 것 말고 예전 것. 접어둔다.
                펼쳐 놓으면 지금 부적보다 지난 것이 더 길어져서 화면이 뒤집힌다 */}
            <지난부적
              목록={이력.filter((x) => x.키 !== 결과.물때키)}
              펼침={이력펼침}
              펼치기={() => 이력펼침바꾸기(!이력펼침)}
            />
          </>
          )
        )
      )}
    </화면틀>
  );
}

/* ---------- 지난 부적 ---------- */

/* 위에 있는 기간말(구간)과 다른 것이다 — 이건 저장해 둔 부적 한 장을 받는다 */
function 지난기간말(x) {
  if (!x.시작) return '';
  const a = new Date(x.시작);
  const b = x.끝 ? new Date(x.끝) : a;
  const 짧게 = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return a.getTime() === b.getTime() ? 짧게(a) : `${짧게(a)} ~ ${짧게(b)}`;
}

function 지난부적({ 목록, 펼침, 펼치기 }) {
  if (!목록.length) return null;

  return (
    <div>
      <button
        type="button"
        onClick={펼치기}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '13px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 크기.부적보조, fontWeight: 700, color: 색.글 }}>
          지난 부적 {목록.length}장
        </span>
        <span style={{ fontSize: 크기.부적보조, color: 색.흐린글 }}>
          {펼침 ? '접기' : '펼치기'}
        </span>
      </button>

      {펼침 && (
        <FlexBox flexDirection="column" gap={9}>
          {목록.map((x) => (
            <FlexBox
              key={x.키}
              gap={12}
              alignItems="flex-start"
              sx={{
                background: 종이.바탕,
                border: '1px solid rgba(139,90,43,.28)',
                borderRadius: 13,
                padding: '13px 14px',
              }}
            >
              {/* 그 물때의 도장 글자 */}
              <FlexBox
                alignItems="center"
                justifyContent="center"
                sx={{
                  flex: '0 0 auto',
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  border: `1.8px solid ${종이.도장}`,
                  color: 종이.도장,
                }}
              >
                <span style={{ fontSize: 크기.부적도장, fontWeight: 700 }}>{x.도장}</span>
              </FlexBox>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 크기.부적띠이름, fontWeight: 700, color: 종이.진한글 }}>
                  {x.물때}
                  {물때짧게[x.물때] && (
                    <span style={{ fontWeight: 500, color: 종이.강조, marginLeft: 6 }}>
                      · {물때짧게[x.물때]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 크기.부적잔글씨, color: '#8a7660', marginTop: 1 }}>
                  {지난기간말(x)}
                </div>
                {x.띠말 && (
                  <div
                    style={{
                      fontSize: 크기.부적문구,
                      color: 종이.글,
                      lineHeight: 1.6,
                      marginTop: 3,
                      wordBreak: 'keep-all',
                    }}
                  >
                    {x.띠말}
                  </div>
                )}
                {x.행운색 && (
                  <FlexBox alignItems="center" gap={6} sx={{ marginTop: 6 }}>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: x.행운색.색,
                        border: '1px solid rgba(90,74,56,.3)',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 크기.부적잔글씨, color: '#8a7660' }}>
                      {x.행운색.이름} · {x.행운숫자}
                    </span>
                  </FlexBox>
                )}
              </div>
            </FlexBox>
          ))}
        </FlexBox>
      )}
    </div>
  );
}

/* ---------- 부적 종이 ---------- */
/* 🔴 2026-08-07 — 부적 겉모습을 새로 만들었다 (사장님·대표님 결정)
 *
 * 전에는 「한지 부적」이었다. 갈색이 앱 안에서 혼자 튀었고, 스크롤을 내려야 다 보였다.
 * 이제 **밝은 바다색 + 굵은 테 + 노란 그림자**다 — 뽑기 종이처럼 「받는 것」으로 보이게.
 *
 * 넣은 것 셋 (대표님 피드백)
 *   ① **물고기가 크게** — 이름만 있는 화면은 심심하다
 *   ② **지나가던 물고기 왈** — 물고기가 건네는 한마디. 장난기를 이게 만든다
 *   ③ **한 화면에 딱** — 스크롤 없이 다 보인다
 *
 * 🔴 넘지 않는 선 — 한마디는 **자리·행동·준비물**만 말한다.
 *    「이렇게 하면 더 잡힌다」는 말은 안 한다. `부적.js` 의 검산이 이걸 막는다.
 *    「지나가던 물고기 왈」이라는 꼬리표가 이게 농담임을 한 번 더 알린다.
 */
/* ─────────────────────────────────────────────
   뽑기 — 오미쿠지 (御神籤)

   🔴 2026-08-07 (2) 다시 만듦 — 처음 것은 「나무 컵에서 막대 뽑기」였다 (사장님 지적)

   찾아보고 나서 안 것 — 진짜 오미쿠지에는 우리가 빠뜨린 것이 셋 있었다.
   일본어 위키백과의 설명이 가장 정확하다:
     「みくじ棒と呼ばれる細長い棒の入った角柱あるいは円柱形の筒状の箱(みくじ筒、御神籤箱)を振り、
       棒を箱の**短辺の小さな穴**から一本取り出し」
     — 각기둥(대개 육각) 통을 흔들어, **짧은 면에 뚫린 작은 구멍**으로 막대 하나를 뽑는다

     ① **통은 위가 막혀 있고 구멍이 아주 작다.** 우리가 만든 건 입구가 뻥 뚫린 컵이었다.
        구멍이 작아야 「한 개만 나온다」가 성립한다. 이게 오미쿠지의 생김새 그 자체다.
     ② 통은 **육각기둥**이다. 원통이면 그냥 컵이다.
     ③ 막대에는 **한자 번호(第○番)**가 적혀 있다. 막대가 곧 운세가 아니라 **번호표**다.

   🔴 2026-08-07 (3) — **서랍 장면은 뺐다** (사장님 「과정이 너무 길어진다」).
      진짜 오미쿠지는 번호로 서랍을 열지만, 우리는 **막대를 뽑는 데서 끝낸다.**
      부적을 받으러 들어온 사람을 2.4초나 붙잡아 둘 이유가 없다.
      대신 **막대의 번호를 부적 종이에 그대로 적어** 둘을 이어 둔다 —
      서랍을 안 그려도 「내가 뽑은 그 번호의 종이」가 된다.

   흐름은 한 장면이다 —
     육각통을 흔든다 → 작은 구멍에서 막대가 솟는다 → 끝에 第○番 → 부적으로 바뀐다

   🔴 우리가 **가져오지 않은 것** — 大吉·凶 같은 **길흉 등급**이다.
      오미쿠지의 핵심이지만 우리 부적은 **좋고 나쁨을 점치지 않는다**(PRD §0-4).
      「凶」이 뜨는 순간 이 앱은 나쁜 운세를 말하는 앱이 된다. 형식만 빌리고 내용은 안 빌린다.

   🔴 사람이 두 번 누르지 않는다 (사장님 지시). 두 장면 다 저절로 넘어간다.
   그림은 코드다 — 그림 파일을 받아오면 「외부 통신 0건」이 깨진다(PRD §0-10).
   ───────────────────────────────────────────── */

/* 부적마다 번호를 하나 준다 — 진짜 오미쿠지의 「第○番」이다.
   물때가 같으면 번호도 같다(난수를 쓰면 볼 때마다 번호가 바뀐다).
   1~48번 — 신사에서 흔히 쓰는 범위다 */
export function 부적번호(물때키) {
  const 글 = String(물때키 || '');
  let h = 2166136261;
  for (let i = 0; i < 글.length; i++) {
    h = Math.imul(h ^ 글.charCodeAt(i), 16777619) >>> 0;
  }
  return (h % 48) + 1;
}

/* 1~48을 한자로 — 진짜 막대에는 아라비아 숫자가 아니라 한자가 적혀 있다 */
const 한자낱자 = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function 한자수(n) {
  if (n < 10) return 한자낱자[n];
  const 십 = Math.floor(n / 10);
  const 일 = n % 10;
  return (십 > 1 ? 한자낱자[십] : '') + '十' + (일 ? 한자낱자[일] : '');
}

/* ── 장면 1 — 육각통을 흔들어 막대를 뽑는다 ───────────────── */
function 뽑기통({ 번호 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: 330 }}>
      <svg
        className="통흔들"
        viewBox="0 0 160 260"
        width="200"
        height="325"
        role="img"
        aria-label="오미쿠지 통을 흔들어 막대를 뽑는 중"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* 육각기둥이라 앞면·옆면의 밝기가 다르다. 면마다 따로 칠한다 */}
          <linearGradient id="면앞" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c08a45" />
            <stop offset="55%" stopColor="#ae7738" />
            <stop offset="100%" stopColor="#9c672e" />
          </linearGradient>
          <linearGradient id="면왼" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7d4d20" />
            <stop offset="100%" stopColor="#96602a" />
          </linearGradient>
          <linearGradient id="면오" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a5527" />
            <stop offset="100%" stopColor="#633a14" />
          </linearGradient>
          <linearGradient id="막대결2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e8d2a8" />
            <stop offset="45%" stopColor="#f9efdb" />
            <stop offset="100%" stopColor="#d2b788" />
          </linearGradient>
        </defs>

        <ellipse cx="80" cy="246" rx="48" ry="7" fill="rgba(18,48,57,0.16)" />

        {/* 막대 — 통보다 먼저 그려 통 뒤에서 솟아 나오게 한다.
            🔴 실제 오미쿠지의 막대는 **번호표**다. 운세가 아니라 번호가 적힌다 —
            그 번호를 부적 종이에 그대로 옮겨 둘을 잇는다 */}
        <g className="막대나옴">
          <rect x="71" y="2" width="18" height="112" rx="7" fill="url(#막대결2)" />
          <rect x="71" y="2" width="18" height="14" rx="7" fill="#9c3524" />
          {/* 🔴 세로쓰기(`writingMode`)로 두면 글자가 한자리에 뭉쳐 뭉개진다.
              글자를 하나씩 따로 놓는다 — 어느 브라우저에서나 똑같이 나온다 */}
          {('第' + 한자수(번호) + '番').split('').map((글, i) => (
            <text
              key={i}
              x="80"
              y={27 + i * 10.6}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill="#7d4d20"
            >
              {글}
            </text>
          ))}
        </g>

        {/* ── 육각기둥 ── 앞면 하나 + 옆면 둘로 각을 만든다 */}
        <path d="M52 74 L108 74 L106 232 C106 236 96 238 80 238 C64 238 54 236 54 232 Z" fill="url(#면앞)" />
        <path d="M34 82 L52 74 L54 232 C48 231 38 228 36 224 Z" fill="url(#면왼)" />
        <path d="M126 82 L108 74 L106 232 C112 231 122 228 124 224 Z" fill="url(#면오)" />
        {/* 모서리 — 각이 서야 육각으로 보인다 */}
        <g stroke="rgba(50,26,6,0.4)" strokeWidth="1.2" fill="none">
          <path d="M52 74 L54 232" />
          <path d="M108 74 L106 232" />
        </g>
        {/* 나뭇결 */}
        <g stroke="rgba(255,236,205,0.15)" strokeWidth="1" fill="none">
          <path d="M62 92 C68 130 60 172 66 226" />
          <path d="M72 96 C77 134 70 178 75 228" />
          <path d="M90 90 C85 136 94 178 88 228" />
          <path d="M100 94 C96 132 103 174 98 226" />
        </g>
        <g stroke="rgba(60,32,10,0.18)" strokeWidth="1" fill="none">
          <path d="M44 100 C48 140 42 182 46 220" />
          <path d="M116 100 C112 140 118 182 114 220" />
        </g>

        {/* 🔴 2026-08-07 (3) — 쇠테 두 줄을 뺐다 (사장님 「저 두 줄은 정말 안 어울리고 별로」).
            쇠로 조인 통은 술통·물통이지 오미쿠지 통이 아니다.
            진짜 미쿠지 통은 **나무 그대로**다. 대신 판자 이음선과 나뭇결을 살려
            「나무」로 읽히게 한다 — 테를 두르는 건 손쉬운 장식일 뿐이었다 */}

        {/* 이름패 */}
        <g>
          <rect x="55" y="126" width="50" height="56" rx="6" fill="#f3e3c6"
                stroke="rgba(90,58,22,0.5)" strokeWidth="1.5" />
          <text x="80" y="147" textAnchor="middle" fontSize="13.5" fontWeight="800" fill="#7d4d20">오늘의</text>
          <text x="80" y="168" textAnchor="middle" fontSize="13.5" fontWeight="800" fill="#7d4d20">바 다</text>
        </g>

        {/* 🔴 윗면 — **막혀 있고 구멍이 아주 작다.** 여기가 오미쿠지의 얼굴이다.
            컵처럼 뻥 뚫려 있으면 막대가 한 개만 나올 이유가 없다 */}
        <path d="M34 82 L52 74 L108 74 L126 82 L108 90 L52 90 Z" fill="#b98446"
              stroke="rgba(60,32,10,0.45)" strokeWidth="1.2" strokeLinejoin="round" />
        <ellipse cx="80" cy="82" rx="10" ry="4.6" fill="#2f1b08" />
        <ellipse cx="80" cy="81" rx="10" ry="4.6" fill="none"
                 stroke="rgba(255,236,205,0.35)" strokeWidth="1.4" />
      </svg>

    </div>
  );
}

function 부적종이({ r, 지금 }) {
  return (
    <div
      /* 🔴 2026-08-07 — 「뽑기통에서 뽑는 듯한 흔들림」(사장님 지시).
         부적을 받는 순간 카드가 한 번 흔들리고 멈춘다. 0.7초, 딱 한 번.
         움직임을 싫어하는 설정(운영체제의 「동작 줄이기」)을 켠 사람에게는 안 흔들린다 —
         멀미가 나는 사람이 있고, 배 위에서는 더 그렇다 */
      className="부적뽑기"
      style={{
        position: 'relative',
        background: 종이.바탕,
        color: 종이.글,
        border: `3px solid ${종이.테}`,
        borderRadius: 22,
        padding: '15px 14px 14px',
        /* 노란 그림자 — 뽑기 종이처럼 살짝 떠 보이게 */
        boxShadow: `5px 5px 0 ${종이.그림자}`,
        fontFamily: 'inherit',
      }}
    >
      {/* 머리 — 왼쪽에 이름, 오른쪽에 물때 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 크기.부적종이머리, letterSpacing: '.16em', color: 종이.강조 }}>오 늘 의 바 다</span>
        {/* 🔴 뽑기에서 나온 막대의 번호와 **같은 번호**다.
            진짜 오미쿠지도 막대 번호로 그 번호의 종이를 받는다.
            번호가 이어져야 「내가 뽑은 그 종이」가 된다 */}
        <span style={{ fontSize: 크기.부적유효, color: 종이.강조, opacity: .75, marginLeft: 'auto', marginRight: 6 }}>
          {'第 ' + 한자수(부적번호(r.물때키)) + ' 番'}
        </span>
        <span
          style={{
            fontSize: 크기.부적물때표,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 999,
            background: 종이.테,
            color: 종이.그림자,
            flex: '0 0 auto',
          }}
        >
          {r.물때}
        </span>
      </div>

      <div
        style={{
          fontSize: 크기.부적제목,
          fontWeight: 800,
          lineHeight: 1.34,
          letterSpacing: '-.025em',
          color: 종이.진한글,
        }}
      >
        {r.제목}
      </div>

      {/* 지나가던 물고기 왈 — 점선 말풍선.
          🔴 2026-08-07 (2) — 물고기는 **주인공이 아니라 요소**다 (사장님 지적).
          큰 그림을 가운데 두던 것을 없애고, 말하는 사람 자리에 작게 붙였다.
          어종은 **그때그때 제철인 것 중에서** 뽑는다 — 8월엔 갈치, 11월엔 대구가 말을 건다 */}
      {r.한마디 && (
        <div
          style={{
            marginTop: 11,
            borderRadius: 16,
            padding: '11px 13px',
            background: 종이.말풍선바탕,
            border: `2px dashed ${종이.말풍선테}`,
            color: 종이.말풍선글,
            fontSize: 크기.부적한마디,
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          “{r.한마디}”
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 크기.부적말한이,
              fontWeight: 600,
              opacity: 0.75,
              marginTop: 4,
            }}
          >
            —
            {r.물고기 && <어종그림 이름={r.물고기} 크기={16} />}
            지나가던 {r.물고기 || '물고기'} 왈
          </span>
        </div>
      )}

      {/* 오늘의 자리 · 행운의 색과 숫자 — 둘 다 재미로 보는 것이다 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 10 }}>
        <행운칸 이름="오늘의 자리">{r.자리 || '아무 자리나'}</행운칸>
        {r.행운색 ? (
          <행운칸 이름="행운의 색 · 숫자">
            <i
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                marginRight: 6,
                verticalAlign: -1,
                border: '1px solid rgba(0,0,0,.18)',
                background: r.행운색.색,
              }}
            />
            {r.행운색.이름} · {r.행운숫자}
          </행운칸>
        ) : (
          <행운칸 이름="행운의 색 · 숫자">띠를 넣으면 나와요</행운칸>
        )}
      </div>

      {r.띠말 && (
        <div style={{ fontSize: 크기.부적띠말, lineHeight: 1.6, marginTop: 10 }}>{r.띠말}</div>
      )}

      <div style={{ fontSize: 크기.부적근거, color: '#6E8A93', lineHeight: 1.6, marginTop: 8 }}>
        {r.근거}
      </div>

      {/* 발 — 유효 기간과 「재미로 보는 것」, 그리고 도장 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginTop: 12 }}>
        <div style={{ fontSize: 크기.부적유효, color: '#7C949B', lineHeight: 1.5 }}>
          {기간말(r.구간)}
          <br />
          <b>재미로 보는 것이에요</b>
        </div>
        {/* 🔴 2026-08-07 — 낚싯대 이모지를 뺐다 (사장님 「부적 이모지 별로임」).
            대신 **오늘 다녀오면 받게 될 귀항 도장**을 그려 넣는다.
            ① 이모지는 폰마다 그림이 달라 종이 부적과 따로 논다. 이건 우리가 그린 것이다.
            ② 부적과 도장이 **한 벌로 보인다** — 「나가서 돌아오면 이 도장」이 한 장에 있다. */}
        <div style={{ flex: '0 0 auto' }}>
          <도장그림 날짜={지금} 크기={46} 색깔={종이.도장} />
        </div>
      </div>
    </div>
  );
}

function 행운칸({ 이름, children }) {
  return (
    <div style={{ flex: 1, borderRadius: 13, padding: '8px 10px', background: 종이.칸바탕 }}>
      <div style={{ fontSize: 크기.부적행운말, color: 종이.강조 }}>{이름}</div>
      <div style={{ fontSize: 크기.부적행운, fontWeight: 800, marginTop: 2, color: 종이.진한글 }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 생년 묻기 — 딱 한 번 ---------- */
function 생년묻기({ 입력, 입력바꾸기, 확정, 건너뛰기 }) {
  const 올해 = new Date().getFullYear();
  const 값 = Number(입력);
  const 쓸수있음 = 입력.length === 4 && 값 >= 1900 && 값 <= 올해;

  function 누름(k) {
    if (k === 'del') 입력바꾸기(입력.slice(0, -1));
    else if (k === 'ok') {
      if (쓸수있음) 확정(입력);
    } else if (입력.length < 4) 입력바꾸기(입력 + k);
  }

  return (
    <Card
      sx={{
        backgroundColor: 색.바탕,
        borderRadius: 18,
        padding: 크기.카드여백,
        gap: 크기.사이,
        boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
      }}
    >
      <Typography weight="bold" sx={{ fontSize: 크기.부적물음 }}>
        몇 년생이신가요
      </Typography>
      <Typography sx={{ fontSize: 크기.부적보조, color: 색.흐린글, lineHeight: 1.7, marginTop: -6 }}>
        띠를 알면 부적의 말이 그 띠에 맞게 바뀌어요. 행운의 색과 숫자도 같이 나옵니다.
      </Typography>

      {/* 네 자리를 각각 한 칸으로 보여준다.
          🔴 전에는 `입력.padEnd(4, '0')` 이었다 — 「2」·「20」·「200」·「2000」이
          화면에 전부 「2000」으로 똑같이 나왔다. 몇 자를 눌렀는지 알 수가 없었다.
          지금은 누른 자리만 숫자가 서고, 안 누른 자리는 빈 밑줄로 남는다.
          (2026-08-06 수민님이 잡은 결함) */}
      <FlexBox alignItems="flex-end" justifyContent="center" gap={9} sx={{ padding: '6px 0 2px' }}>
        <FlexBox alignItems="flex-end" gap={8}>
          {[0, 1, 2, 3].map((칸) => (
            <div key={칸} style={{ width: 36 }}>
              <div
                style={{
                  fontSize: 크기.부적띠고르기,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-.02em',
                  textAlign: 'center',
                  /* 안 누른 자리도 자리는 차지해야 칸이 안 움직인다 */
                  color: 입력[칸] ? 색.글 : 'transparent',
                }}
              >
                {입력[칸] || '0'}
              </div>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  marginTop: 4,
                  background: 입력[칸] ? 색.주 : 색.선,
                }}
              />
            </div>
          ))}
        </FlexBox>
        <Typography weight="bold" sx={{ fontSize: 크기.부적묶음제목, color: 색.흐린글, paddingBottom: 6 }}>
          년
        </Typography>
      </FlexBox>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((k) => (
          <Button
            key={k}
            variant="outlined"
            color="assistive"
            size="large"
            fullWidth
            disabled={k === 'ok' && !쓸수있음}
            onClick={() => 누름(k)}
            sx={{
              height: 64,
              borderRadius: 13,
              fontSize: k === 'del' || k === 'ok' ? 16 : 크기.부적숫자판,
              fontWeight: 700,
              color: k === 'del' || k === 'ok' ? 색.흐린글 : 색.글,
            }}
          >
            {k === 'del' ? '지우기' : k === 'ok' ? '확인' : k}
          </Button>
        ))}
      </div>

      <Button
        variant="solid"
        color="primary"
        size="large"
        fullWidth
        disabled={!쓸수있음}
        onClick={() => 확정(입력)}
        sx={버튼모양}
      >
        부적 받기
      </Button>
      <Button
        variant="outlined"
        color="assistive"
        size="large"
        fullWidth
        onClick={건너뛰기}
        sx={{ ...버튼모양, fontSize: 크기.부적본문, fontWeight: 500, color: 색.흐린글 }}
      >
        띠 없이 그냥 볼게요
      </Button>
    </Card>
  );
}
