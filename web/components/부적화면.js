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
import 화면틀 from './화면틀';
import { 풀이 as 물때풀이, 짧게 as 물때짧게 } from '@/lib/물때말';

const 생년키 = 'seacharm.birthyear.v1';
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
function 이번물때행운(오늘) {
  const 날 = 부적.물때키(오늘);
  try {
    const v = JSON.parse(window.localStorage.getItem(행운키) || 'null');
    if (v && v.날 === 날 && v.색 && v.숫자) return v;
  } catch (e) {
    /* 못 읽으면 새로 뽑는다 */
  }
  const 새것 = 부적.행운뽑기();
  const 저장 = { 날, 색: 새것.색, 숫자: 새것.숫자 };
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

/* 부적 종이 색 — 디자인 시스템 팔레트 밖이다. 일부러 그렇게 둔다 */
const 종이 = {
  바탕: '#f4ecd8',
  글: '#5a4a38',
  진한글: '#3a2e21',
  갈색: '#8b5a2b',
  도장: '#9c3524',
  선: 'rgba(139,90,43,.28)',
};

const 버튼모양 = {
  height: 크기.버튼높이,
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
    const r = 부적.발급(생년 ? 생년 + '-01-01' : null, 지금, 이번물때행운(지금));
    결과바꾸기(r);
    이력남기기(r);
    이력바꾸기(이력읽기());
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
      바닥글="생년은 이 기기 안에만 저장됩니다"
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
          <>
            <부적종이 r={결과} 지금={지금} />

            <Typography sx={{ fontSize: 크기.작게, color: 색.아주흐린글, lineHeight: 1.75, padding: '0 4px' }}>
              <b style={{ color: 색.흐린글 }}>부적은 물때마다 한 장이에요.</b> 
              
              <b style={{ color: 색.흐린글 }}>  어획도 안전도 점치지 않습니다.</b>
            </Typography>

            {/* 부적을 받고 나면 할 일은 「나가기」다. 판정은 잡은 다음 일이라
                여기서 큰 버튼으로 재촉할 것이 아니다 — 아래 작은 링크로 남겨 뒀다.
                🔴 「항구로 돌아가기」였는데 다른 화면은 전부 「‹ 홈」이라 말이 갈렸다.
                   같은 곳을 두 이름으로 부르면 그게 바로 길을 잃는 자리다.
                   한 이름으로 맞춘다 (2026-08-06 지적 반영) */}
            <Button
              as={Link}
              href="/"
              variant="solid"
              size="large"
              fullWidth
              sx={{ ...버튼모양, backgroundColor: 색.반전바탕, color: 색.반전글, textDecoration: 'none' }}
            >
              홈으로 돌아가기
            </Button>
            <Button
              variant="outlined"
              color="assistive"
              size="large"
              fullWidth
              onClick={생년지우기}
              sx={{ ...버튼모양, fontSize: 크기.홈, fontWeight: 500, color: 색.흐린글 }}
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
        <span style={{ fontSize: 크기.보조, fontWeight: 700, color: 색.글 }}>
          지난 부적 {목록.length}장
        </span>
        <span style={{ fontSize: 크기.보조, color: 색.흐린글 }}>
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
                <span style={{ fontSize: 19, fontWeight: 700 }}>{x.도장}</span>
              </FlexBox>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 종이.진한글 }}>
                  {x.물때}
                  {물때짧게[x.물때] && (
                    <span style={{ fontWeight: 500, color: 종이.갈색, marginLeft: 6 }}>
                      · {물때짧게[x.물때]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: '#8a7660', marginTop: 1 }}>
                  {지난기간말(x)}
                </div>
                {x.띠말 && (
                  <div
                    style={{
                      fontSize: 13.5,
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
                    <span style={{ fontSize: 12.5, color: '#8a7660' }}>
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
function 부적종이({ r, 지금 }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 종이.바탕,
        color: 종이.글,
        border: '1px solid rgba(139,90,43,.35)',
        borderRadius: 18,
        padding: '26px 22px 22px',
        boxShadow: '0 2px 10px rgba(90,74,56,.14)',
        backgroundImage:
          'repeating-linear-gradient(0deg,rgba(139,90,43,.045) 0 1px,transparent 1px 26px),' +
          'repeating-linear-gradient(90deg,rgba(139,90,43,.045) 0 1px,transparent 1px 26px)',
        fontFamily: '"Nanum Myeongjo", -apple-system, "Apple SD Gothic Neo", serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: `1px solid ${종이.선}`,
          paddingBottom: 11,
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 12, letterSpacing: '.22em', color: 종이.갈색 }}>오 늘 의 바 다</span>
        <span style={{ fontSize: 12, color: 종이.갈색, textAlign: 'right', lineHeight: 1.6 }}>
          {기간말(r.구간)}
          {r.띠 && (
            <>
              <br />
              {r.띠}띠
            </>
          )}
        </span>
      </div>

      {/* 도장 */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          top: 64,
          width: 70,
          height: 70,
          borderRadius: '50%',
          border: `2.5px solid ${종이.도장}`,
          color: 종이.도장,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 31,
          fontWeight: 800,
          transform: 'rotate(-9deg)',
          opacity: 0.85,
        }}
      >
        {r.도장}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: '-.02em',
          lineHeight: 1.38,
          color: 종이.진한글,
          paddingRight: 74,
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      >
        {r.제목}
      </div>

      {/* 물때 이름과 뜻 — 제목만으로는 「조금」이 무슨 말인지 모른다 */}
      <div
        style={{
          marginTop: 9,
          paddingRight: 74,
          fontSize: 14.5,
          lineHeight: 1.6,
          color: 종이.갈색,
          wordBreak: 'keep-all',
        }}
      >
        <b style={{ color: 종이.진한글 }}>{r.물때}</b>
        {물때풀이[r.물때] ? ` · ${물때풀이[r.물때]}` : ''}
      </div>

      {r.띠말 && (
        <div
          style={{
            wordBreak: 'keep-all',
            marginTop: 20,
            padding: '15px 17px',
            background: 'rgba(139,90,43,.10)',
            borderLeft: `3px solid ${종이.갈색}`,
            borderRadius: '0 9px 9px 0',
            fontSize: 21,
            fontWeight: 700,
            color: '#4a3a28',
            lineHeight: 1.5,
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.06em',
              color: 종이.갈색,
              marginBottom: 7,
            }}
          >
            {r.띠}띠에게
          </span>
          {r.띠말}
        </div>
      )}

      {r.행운색 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <행운칸 이름="행운의 색">
            <i
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                marginRight: 7,
                verticalAlign: -2,
                border: '1px solid rgba(0,0,0,.18)',
                background: r.행운색.색,
              }}
            />
            {r.행운색.이름}
          </행운칸>
          <행운칸 이름="행운의 숫자">{r.행운숫자}</행운칸>
        </div>
      )}

      <div
        style={{
          wordBreak: 'keep-all',
          marginTop: 20,
          paddingTop: 14,
          borderTop: '1px solid rgba(139,90,43,.25)',
          fontSize: 13.5,
          color: '#7a6650',
          lineHeight: 1.7,
        }}
      >
        <b style={{ color: 종이.갈색 }}>왜 이 말인가</b>
        <br />
        {r.근거}
      </div>
    </div>
  );
}

function 행운칸({ 이름, children }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(139,90,43,.07)',
        border: '1px solid rgba(139,90,43,.18)',
        borderRadius: 11,
        padding: '11px 12px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '.05em',
          color: 종이.갈색,
          marginBottom: 6,
        }}
      >
        {이름}
      </span>
      <span style={{ fontSize: 20, fontWeight: 800, color: '#4a3a28' }}>{children}</span>
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
        padding: 크기.여백,
        gap: 크기.사이,
        boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
      }}
    >
      <Typography weight="bold" sx={{ fontSize: 21 }}>
        몇 년생이신가요
      </Typography>
      <Typography sx={{ fontSize: 크기.보조, color: 색.흐린글, lineHeight: 1.7, marginTop: -6 }}>
        띠를 알면 부적의 말이 그 띠에 맞게 바뀌어요. 행운의 색과 숫자도 같이 나옵니다.
        <br />이 숫자는 이 기기 안에만 두고, 어디로도 보내지 않습니다.
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
                  fontSize: 46,
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
        <Typography weight="bold" sx={{ fontSize: 20, color: 색.흐린글, paddingBottom: 6 }}>
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
              fontSize: k === 'del' || k === 'ok' ? 16 : 크기.숫자판,
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
        sx={{ ...버튼모양, fontSize: 크기.본문, fontWeight: 500, color: 색.흐린글 }}
      >
        띠 없이 그냥 볼게요
      </Button>
    </Card>
  );
}
