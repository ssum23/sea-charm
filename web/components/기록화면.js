'use client';

/* 확인한 물고기 (PRD의 H)
 *
 * 데이터 색만은 디자인 시스템 팔레트를 그대로 쓰지 않는다.
 * CHANGES #77·#78에서 색약 검증을 거쳐 고른 두 색이 있고, 그게 이 화면의 근거다.
 * 기본 파랑(#0066FF)과 초록을 나란히 놓으면 그 검증이 무효가 된다.
 * 대신 색만으로 구분하지 않는다 — 글자로도 「가져감/놓아줌」을 적는다.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 키, 읽기, 쓰기 } from '@/lib/저장소';
import 화면틀 from './화면틀';

/* 색약 검증을 통과한 두 색 (#77·#78).
 * 정적 `기록.html` 에는 어두운 화면용 단계(#3987e5 / #199e70)도 있는데,
 * 여기는 아직 다크모드를 켜지 않아 밝은 화면용만 쓴다.
 * 다크모드를 켤 때 `light-dark()` 로 두 벌을 같이 넣어야 한다. */
const 데이터색 = { 가져감: '#2a78d6', 놓아줌: '#1baf7a' };

const 버튼모양 = {
  height: 크기.버튼높이,
  fontSize: 크기.버튼글씨,
  fontWeight: 700,
  borderRadius: 크기.버튼둥글기,
};

const 카드모양 = {
  backgroundColor: 색.바탕,
  borderRadius: 18,
  padding: 크기.여백,
  gap: 14,
  boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
};

const 가져감 = (c) => c.단계 === 1;

function 시각말(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const 오전오후 = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${오전오후} ${hh}:${m < 10 ? '0' + m : m}`;
}

export default function 기록화면() {
  const [준비, 준비바꾸기] = useState(false);
  const [목록, 목록바꾸기] = useState([]);
  const [지금, 지금바꾸기] = useState(null);
  const [되돌릴것, 되돌릴것바꾸기] = useState(null);
  const [복사됨, 복사됨바꾸기] = useState(false);

  useEffect(() => {
    목록바꾸기(읽기(키.잡은것, []));
    지금바꾸기(new Date());
    준비바꾸기(true);
  }, []);

  /* 지우기는 되돌릴 수 있게 둔다 — 손이 젖은 채로 잘못 누르는 일이 생긴다 */
  useEffect(() => {
    if (!되돌릴것) return;
    const t = setTimeout(() => 되돌릴것바꾸기(null), 8000);
    return () => clearTimeout(t);
  }, [되돌릴것]);

  function 지우기(i) {
    const 새목록 = 목록.slice();
    const 뺀것 = 새목록.splice(i, 1)[0];
    목록바꾸기(새목록);
    쓰기(키.잡은것, 새목록);
    되돌릴것바꾸기({ 자리: i, 것: 뺀것 });
  }

  function 되돌리기() {
    if (!되돌릴것) return;
    const 새목록 = 목록.slice();
    새목록.splice(되돌릴것.자리, 0, 되돌릴것.것);
    목록바꾸기(새목록);
    쓰기(키.잡은것, 새목록);
    되돌릴것바꾸기(null);
  }

  function csv() {
    const 줄 = ['어종,측정값,단위,판정,지역,시각'];
    목록.forEach((c) => {
      줄.push(
        [
          (c.어종 || '').replaceAll(',', ' '),
          typeof c.길이 === 'number' ? c.길이 : '',
          typeof c.길이 === 'number' ? c.단위 || 'cm' : '',
          가져감(c) ? '가져감' : '놓아줌',
          c.지역 || '',
          c.시각 || '',
        ].join(','),
      );
    });
    return 줄.join('\n');
  }

  function 내려받기() {
    const blob = new Blob(['﻿' + csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download =
      'sea-charm_기록_' +
      d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') +
      '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function 복사() {
    try {
      await navigator.clipboard.writeText(csv());
      복사됨바꾸기(true);
      setTimeout(() => 복사됨바꾸기(false), 1800);
    } catch (e) {
      /* 복사가 막힌 브라우저 — 파일로 내려받으면 된다 */
    }
  }

  const 감 = 목록.filter(가져감).length;
  const 놓 = 목록.length - 감;
  const 방생률 = 목록.length ? Math.round((놓 / 목록.length) * 100) : 0;

  return (
    <화면틀
      제목="확인한 물고기"
      날짜={지금}
      큰숫자={준비 ? 목록.length : 0}
      큰숫자말="마리를 판정했습니다"
      바닥글="이 기록은 이 기기 안에만 있습니다. 서버로 보내지 않습니다"
      이동={[
        { 이름: '오늘의 바다 부적', 주소: '/charm' },
        { 이름: '이거 가져가도 되나요', 주소: '/catch' },
        { 이름: '무사 귀항 도장', 주소: '/' },
      ]}
    >
      {!준비 ? null : !목록.length ? (
        <>
          <FlexBox
            justifyContent="center"
            alignItems="center"
            sx={{
              border: `1px dashed ${색.선}`,
              borderRadius: 14,
              padding: '32px 16px',
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: 크기.본문, color: 색.아주흐린글, lineHeight: 1.75 }}>
              아직 판정한 물고기가 없습니다.
              <br />
              「이거 가져가도 되나요」에서 한 마리 확인하면 여기 쌓입니다.
            </Typography>
          </FlexBox>
          <Button
            as={Link}
            href="/catch"
            variant="solid"
            color="primary"
            size="large"
            fullWidth
            sx={{ ...버튼모양, textDecoration: 'none' }}
          >
            물고기 판정하러 가기
          </Button>
        </>
      ) : (
        <>
          {/* 숫자 셋 */}
          <Card sx={카드모양}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 11 }}>
              <숫자칸 값={감} 이름="가져감" 점={데이터색.가져감} />
              <숫자칸 값={놓} 이름="놓아줌" 점={데이터색.놓아줌} />
              <숫자칸 값={`${방생률}%`} 이름="방생률" />
            </div>
          </Card>

          {/* 어종별 */}
          <Card sx={카드모양}>
            <Typography weight="bold" sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>
              어종별 — 많이 본 순서
            </Typography>
            <FlexBox gap={16}>
              <범례 색깔={데이터색.가져감} 이름="가져감" />
              <범례 색깔={데이터색.놓아줌} 이름="놓아줌" />
            </FlexBox>
            <어종별막대 목록={목록} />
          </Card>

          {/* 목록 */}
          <Card sx={카드모양}>
            <Typography weight="bold" sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>
              기록 — 최근 것부터
            </Typography>
            <div>
              {목록.slice(0, 60).map((c, i) => {
                const t = 가져감(c);
                return (
                  <FlexBox
                    key={i}
                    alignItems="flex-start"
                    justifyContent="space-between"
                    gap={10}
                    sx={{ padding: '13px 0', borderBottom: `1px solid ${색.선}` }}
                  >
                    <FlexBox flexDirection="column" gap={3} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 크기.본문 }}>
                        <b>{c.어종}</b>
                        {typeof c.길이 === 'number' && c.길이 > 0
                          ? ` ${c.길이}${c.단위 || 'cm'}`
                          : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 색.아주흐린글 }}>
                        {시각말(c.시각)}
                        {c.지역 ? ` · ${c.지역}` : ''}
                      </Typography>
                    </FlexBox>

                    {/* 색만으로 구분하지 않는다 — 글자로도 적는다 */}
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 999,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        background: t ? 데이터색.가져감 : 데이터색.놓아줌,
                      }}
                    >
                      {t ? '가져감' : '놓아줌'}
                    </span>

                    <button
                      onClick={() => 지우기(i)}
                      style={{
                        flexShrink: 0,
                        border: 0,
                        background: 'transparent',
                        color: 색.아주흐린글,
                        fontSize: 13,
                        padding: '4px 2px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      지우기
                    </button>
                  </FlexBox>
                );
              })}
            </div>
            {목록.length > 60 && (
              <Typography sx={{ fontSize: 크기.작게, color: 색.아주흐린글, lineHeight: 1.7 }}>
                아래 {목록.length - 60}건은 화면에만 안 보이고 그대로 남아 있습니다
              </Typography>
            )}
          </Card>

          {/* 내보내기 */}
          <Card sx={카드모양}>
            <Typography weight="bold" sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>
              내보내기
            </Typography>
            <Typography sx={{ fontSize: 크기.작게, color: 색.아주흐린글, lineHeight: 1.7 }}>
              표 계산 프로그램에서 열 수 있는 형태로 저장합니다.{' '}
              <b style={{ color: 색.흐린글 }}>
                이 앱은 아무것도 서버로 보내지 않으니, 옮기려면 직접 내보내야 합니다.
              </b>
            </Typography>
            <Button
              variant="solid"
              size="large"
              fullWidth
              onClick={내려받기}
              sx={{ ...버튼모양, backgroundColor: 색.반전바탕, color: 색.반전글 }}
            >
              파일로 내려받기
            </Button>
            <Button
              variant="outlined"
              color="assistive"
              size="large"
              fullWidth
              onClick={복사}
              sx={{ ...버튼모양, fontSize: 크기.본문 }}
            >
              {복사됨 ? '복사했습니다' : '글자로 복사하기'}
            </Button>
          </Card>

          <Typography sx={{ fontSize: 크기.작게, color: 색.아주흐린글, lineHeight: 1.75, padding: '0 4px' }}>
            여기 쌓이는 <b style={{ color: 색.흐린글 }}>길이</b>와{' '}
            <b style={{ color: 색.흐린글 }}>놓아준 기록</b>은 국가 통계에 없는 것입니다. 나라는
            낚시어선이 가져온 마릿수와 무게만 셉니다.
          </Typography>
        </>
      )}

      {되돌릴것 && (
        <FlexBox
          alignItems="center"
          gap={14}
          sx={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
            backgroundColor: 색.반전바탕,
            color: 색.반전글,
            borderRadius: 999,
            padding: '13px 20px',
            boxShadow: 'var(--semantic-elevation-shadow-normal-large)',
            zIndex: 10,
          }}
        >
          <Typography sx={{ fontSize: 14.5, color: 색.반전글 }}>한 건 지웠습니다</Typography>
          <button
            onClick={되돌리기}
            style={{
              border: 0,
              background: 'transparent',
              color: 색.반전주,
              fontWeight: 700,
              fontSize: 14.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            되돌리기
          </button>
        </FlexBox>
      )}
    </화면틀>
  );
}

function 숫자칸({ 값, 이름, 점 }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', color: 색.글 }}>
        {점 && (
          <i
            style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              borderRadius: '50%',
              marginRight: 6,
              verticalAlign: 'middle',
              background: 점,
            }}
          />
        )}
        {값}
      </div>
      <div style={{ fontSize: 12.5, color: 색.아주흐린글, marginTop: 4 }}>{이름}</div>
    </div>
  );
}

function 범례({ 색깔, 이름 }) {
  return (
    <span style={{ fontSize: 13, color: 색.흐린글 }}>
      <i
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 3,
          marginRight: 6,
          verticalAlign: 'middle',
          background: 색깔,
        }}
      />
      {이름}
    </span>
  );
}

function 어종별막대({ 목록 }) {
  const 종 = {};
  목록.forEach((c) => {
    const k = c.어종 || '(모름)';
    if (!종[k]) 종[k] = { 이름: k, 감: 0, 놓: 0, 길이: [], 단위: 'cm' };
    if (가져감(c)) 종[k].감++;
    else 종[k].놓++;
    if (typeof c.길이 === 'number' && c.길이 > 0) {
      종[k].길이.push(c.길이);
      if (c.단위) 종[k].단위 = c.단위;
    }
  });
  const 종목록 = Object.values(종).map((s) => ({ ...s, 합: s.감 + s.놓 }));
  종목록.sort((a, b) => b.합 - a.합);
  const 최대 = 종목록[0]?.합 || 1;

  return (
    <div>
      {종목록.map((s) => (
        <div key={s.이름} style={{ marginBottom: 15 }}>
          <FlexBox justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: 6 }}>
            <Typography weight="bold" sx={{ fontSize: 15 }}>
              {s.이름} {s.합}마리
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 색.아주흐린글 }}>
              {s.길이.length ? `최고 ${Math.max(...s.길이)}${s.단위 || 'cm'}` : '길이 기록 없음'}
            </Typography>
          </FlexBox>
          <div style={{ display: 'flex', height: 20, gap: 2, width: `${((s.합 / 최대) * 100).toFixed(1)}%` }}>
            {s.감 > 0 && <막대 몫={s.감} 색깔={데이터색.가져감} 처음 끝={s.놓 === 0} />}
            {s.놓 > 0 && <막대 몫={s.놓} 색깔={데이터색.놓아줌} 처음={s.감 === 0} 끝 />}
          </div>
        </div>
      ))}
    </div>
  );
}

function 막대({ 몫, 색깔, 처음, 끝 }) {
  return (
    <div
      style={{
        flex: 몫,
        minWidth: 3,
        height: '100%',
        background: 색깔,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: '20px',
        borderRadius: `${처음 ? 4 : 0}px ${끝 ? 4 : 0}px ${끝 ? 4 : 0}px ${처음 ? 4 : 0}px`,
      }}
    >
      {몫 >= 2 ? 몫 : ''}
    </div>
  );
}
