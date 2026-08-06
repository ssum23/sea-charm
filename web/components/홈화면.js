'use client';

/* 홈 — 출항/귀항 도장 (PRD의 T)
 * 쓰고 있는 디자인 시스템의 부품(Button·Card·Typography·FlexBox)을 그대로 쓰고,
 * 크기만 components/크기.js 값으로 올려 쓴다.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Divider, FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 키, 읽기, 쓰기, 날짜말, 시각말, 걸린시간 } from '@/lib/저장소';
import 도장그림 from './도장그림';
import 부적 from '@/lib/부적엔진';

const 버튼모양 = {
  height: 크기.버튼높이,
  fontSize: 크기.버튼글씨,
  fontWeight: 700,
  borderRadius: 크기.버튼둥글기,
};

export default function 홈화면() {
  /* 서버에서 미리 그릴 때와 브라우저에서 그릴 때가 달라지면 안 되므로
     기록은 브라우저에 올라온 뒤에 읽는다 */
  const [준비, 준비바꾸기] = useState(false);
  const [출항기록, 출항기록바꾸기] = useState([]);
  const [바다에, 바다에바꾸기] = useState(null);
  const [지금, 지금바꾸기] = useState(null);

  useEffect(() => {
    출항기록바꾸기(읽기(키.출항, []));
    바다에바꾸기(읽기(키.현재, null));
    지금바꾸기(new Date());
    준비바꾸기(true);
    const t = setInterval(() => 지금바꾸기(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  function 출항하기() {
    const c = { out: new Date().toISOString() };
    바다에바꾸기(c);
    쓰기(키.현재, c);
  }

  function 귀항하기() {
    const 새기록 = [{ out: 바다에.out, back: new Date().toISOString() }, ...출항기록];
    출항기록바꾸기(새기록);
    바다에바꾸기(null);
    쓰기(키.출항, 새기록);
    쓰기(키.현재, null);
  }

  function 취소하기() {
    바다에바꾸기(null);
    쓰기(키.현재, null);
  }

  function 알리기() {
    const 마지막 = 출항기록[0];
    if (!마지막) return;
    const d = new Date(마지막.back);
    const 글 = `잘 돌아왔습니다. ${날짜말(d)} ${시각말(d)} 귀항.`;
    if (navigator.share) navigator.share({ text: 글 }).catch(() => {});
    else window.location.href = 'sms:?&body=' + encodeURIComponent(글);
  }

  const 마지막 = 출항기록[0];
  const 나간시각 = 바다에 ? new Date(바다에.out) : null;

  /* 「가족에게 알리기」는 돌아온 직후에만 쓸모가 있다.
     늘 띄워두면 화면만 무거워지고, 다음 달에 봐도 남아 있으면 거슬린다.
     그래서 귀항한 지 3시간 안에만 작게 보인다. */
  const 알림창 = 3 * 60 * 60 * 1000;
  const 방금돌아옴 =
    !바다에 && 마지막 && 지금 && 지금 - new Date(마지막.back) < 알림창;

  return (
    <FlexBox flexDirection="column" sx={{ minHeight: '100dvh' }}>
      {/* 머리 */}
      <FlexBox
        flexDirection="column"
        gap={2}
        sx={{
          backgroundColor: 색.바탕,
          padding: `calc(env(safe-area-inset-top) + ${크기.여백}px) ${크기.여백}px ${크기.여백}px`,
        }}
      >
        <Typography sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>
          {준비 && 지금 ? 날짜말(지금) : ' '}
        </Typography>
        <Typography weight="bold" sx={{ fontSize: 크기.큰제목, letterSpacing: '-0.01em' }}>
          귀항 도장
        </Typography>
        <FlexBox alignItems="baseline" gap={8} sx={{ marginTop: 8 }}>
          <Typography weight="bold" sx={{ fontSize: 46, lineHeight: 1, color: 색.주 }}>
            {준비 ? 출항기록.length : 0}
          </Typography>
          <Typography sx={{ fontSize: 크기.본문, color: 색.흐린글 }}>
            번 돌아왔습니다
          </Typography>
        </FlexBox>
      </FlexBox>

      <FlexBox
        flexDirection="column"
        gap={크기.사이}
        sx={{ flex: 1, width: '100%', maxWidth: 560, margin: '0 auto', padding: 크기.여백 }}
      >
        {/* 지금 어디에 있는가 */}
        <Card
          sx={{
            backgroundColor: 색.바탕,
            borderRadius: 18,
            padding: 크기.여백,
            gap: 크기.사이,
            boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
          }}
        >
          <FlexBox flexDirection="column" alignItems="center" gap={6} sx={{ paddingTop: 4 }}>
            <Typography sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>지금</Typography>
            <Typography weight="bold" sx={{ fontSize: 24 }}>
              {바다에 ? '바다에 있습니다' : '뭍에 있습니다'}
            </Typography>
            <Typography align="center" sx={{ fontSize: 크기.보조, color: 색.흐린글, minHeight: 22 }}>
              {!준비
                ? ' '
                : 바다에 && 지금
                  ? `${시각말(나간시각)} 출항 · ${걸린시간(지금 - 나간시각)} 째`
                  : 마지막
                    ? `마지막 귀항 ${날짜말(new Date(마지막.back))}`
                    : ' '}
            </Typography>
          </FlexBox>

          {바다에 ? (
            <Button
              variant="solid"
              size="large"
              fullWidth
              onClick={귀항하기}
              sx={{ ...버튼모양, backgroundColor: 색.반전바탕, color: 색.반전글 }}
            >
              귀항
            </Button>
          ) : (
            <Button
              variant="solid"
              color="primary"
              size="large"
              fullWidth
              onClick={출항하기}
              sx={버튼모양}
            >
              출항
            </Button>
          )}

          {바다에 ? (
            <Button
              variant="outlined"
              color="assistive"
              size="large"
              fullWidth
              onClick={취소하기}
              sx={{ ...버튼모양, fontSize: 크기.본문, fontWeight: 500, color: 색.흐린글 }}
            >
              출항 기록 취소
            </Button>
          ) : (
            방금돌아옴 && (
              <FlexBox justifyContent="center" sx={{ paddingTop: 2 }}>
                <button
                  type="button"
                  onClick={알리기}
                  style={{
                    fontSize: 13,
                    color: 'var(--semantic-label-alternative)',
                    background: 'none',
                    border: 'none',
                    padding: '9px 10px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  가족에게 도착 알리기
                </button>
              </FlexBox>
            )
          )}
        </Card>

        {/* 하루 순서대로 — 출항 전에 부적 한 장, 잡으면 판정 */}
        <Button
          as={Link}
          href="/charm"
          variant="solid"
          size="large"
          fullWidth
          sx={{ ...버튼모양, backgroundColor: '#8b5a2b', color: 색.흰, textDecoration: 'none' }}
        >
          오늘의 바다 부적
        </Button>
        <Button
          as={Link}
          href="/catch"
          variant="solid"
          size="large"
          fullWidth
          sx={{ ...버튼모양, backgroundColor: 색.반전바탕, color: 색.반전글, textDecoration: 'none', marginTop: -4 }}
        >
          이거 가져가도 되나요
        </Button>
        <Typography align="center" sx={{ fontSize: 크기.보조, color: 색.아주흐린글, marginTop: -6 }}>
          출항 전에 한 장 · 잡으면 판정
        </Typography>

        <Divider sx={{ marginTop: 6 }} />

        <FlexBox justifyContent="space-between" alignItems="baseline">
          <Typography weight="bold" sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>
            모은 도장
          </Typography>
          <Link href="/log" style={{ textDecoration: 'none' }}>
            <Typography sx={{ fontSize: 크기.보조, color: 색.주 }}>확인한 물고기 ›</Typography>
          </Link>
        </FlexBox>
        <도장들 목록={출항기록} 준비={준비} />
      </FlexBox>

      <FlexBox
        justifyContent="center"
        sx={{ padding: `16px 20px calc(env(safe-area-inset-bottom) + 16px)` }}
      >
        <Typography sx={{ fontSize: 크기.작게, color: 색.아주흐린글 }}>
          기록은 이 기기 안에만 저장됩니다
        </Typography>
      </FlexBox>
    </FlexBox>
  );
}

function 도장들({ 목록, 준비 }) {
  if (!준비 || !목록.length) {
    return (
      <FlexBox
        justifyContent="center"
        alignItems="center"
        sx={{
          border: `1px dashed ${색.선}`,
          borderRadius: 14,
          padding: '30px 16px',
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: 크기.보조, color: 색.아주흐린글, lineHeight: 1.7 }}>
          아직 도장이 없습니다.
          <br />
          돌아오면 하나 찍힙니다.
        </Typography>
      </FlexBox>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
        gap: 12,
      }}
    >
      {목록.map((t, i) => {
        const d = new Date(t.back);
        return (
          <FlexBox
            key={i}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={5}
            sx={{
              aspectRatio: '1',
              backgroundColor: 색.바탕,
              border: `1px solid ${색.선}`,
              borderRadius: 14,
            }}
          >
            <도장그림 날짜={d} 크기={52} />
            <Typography sx={{ fontSize: 12, color: 색.흐린글 }}>
              {d.getMonth() + 1}.{d.getDate()}
            </Typography>
            {/* 그날 바다가 어땠는지 — 도장은 같아도 날은 다르다 */}
            <Typography sx={{ fontSize: 11, color: 색.아주흐린글, marginTop: -3 }}>
              {부적.물때(d).단계}
            </Typography>
          </FlexBox>
        );
      })}
    </div>
  );
}
