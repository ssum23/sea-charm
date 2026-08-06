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
import { 이름과짧게 } from '@/lib/물때말';
import 화면틀 from './화면틀';
import 도장찍기, { 넘김키 } from './도장찍기';

/* 테두리 없는 버튼 — 「출항 기록 취소」·「가족에게 알리기」에 쓴다.
   홈에 네모난 버튼이 줄줄이 쌓이면 무엇이 중요한지 안 보인다.
   높이는 같게 둬서 눌렀을 때 아래 버튼이 밀려 내려가지 않는다 */
/* 🔴 2026-08-06 — `border: 'none'` 만으로는 테두리가 안 없어졌다.
   버튼이 `variant="outlined"` 로 **자기 테두리를 나중에 다시 그린다.**
   `&&` 로 우리 쪽 규칙을 한 단계 세게 걸어 이긴다 */
const 테없는버튼 = {
  height: 크기.홈버튼높이,
  fontSize: 크기.홈본문,
  fontWeight: 500,
  borderRadius: 크기.버튼둥글기,
  '&&': {
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
  },
};

const 버튼모양 = {
  height: 크기.홈버튼높이,
  fontSize: 크기.홈버튼글씨,
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

  /* 바다 도장 — 판정을 안 거쳐도 찍을 수 있다 (T8).
     판정 화면에서 넘어온 경우에는 판정 정보를 갖고 열린다 */
  const [도장열림, 도장열림바꾸기] = useState(false);
  const [도장판정, 도장판정바꾸기] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.sessionStorage.getItem(넘김키);
      if (v) {
        도장판정바꾸기(JSON.parse(v));
        도장열림바꾸기(true);
        /* 한 번 쓰면 지운다. 다음에 홈을 열 때 또 뜨면 안 된다 */
        window.sessionStorage.removeItem(넘김키);
      }
    } catch (e) {}
  }, []);

  /* 「가족에게 알리기」는 돌아온 직후에만 쓸모가 있다.
     늘 띄워두면 화면만 무거워지고, 다음 달에 봐도 남아 있으면 거슬린다.
     그래서 귀항한 지 3시간 안에만 작게 보인다. */
  const 알림창 = 3 * 60 * 60 * 1000;
  const 방금돌아옴 =
    !바다에 && 마지막 && 지금 && 지금 - new Date(마지막.back) < 알림창;

  return (
    <화면틀
      제목="홈"
      날짜={준비 && 지금 ? 지금 : null}
      큰숫자={준비 ? 출항기록.length : 0}
      큰숫자말="번 다녀왔습니다"
      바닥글="기록은 이 기기 안에만 저장됩니다"
      /* 여기가 홈이다 — 되돌아갈 곳이 없다 */
      홈으로={false}
    >
      <>
        {도장열림 ? (
          <도장찍기
            판정={도장판정}
            닫기={() => {
              도장열림바꾸기(false);
              도장판정바꾸기(null);
            }}
          />
        ) : (
        <>
        {/* 지금 어디에 있는가 */}
        <Card
          sx={{
            backgroundColor: 색.바탕,
            borderRadius: 18,
            padding: 크기.카드여백,
            gap: 크기.사이,
            boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
          }}
        >
          <FlexBox flexDirection="column" alignItems="center" gap={6} sx={{ paddingTop: 4 }}>
            <Typography sx={{ fontSize: 크기.홈보조, color: 색.흐린글 }}>지금</Typography>
            <Typography weight="bold" sx={{ fontSize: 크기.홈도장수 }}>
              {바다에 ? '바다에 있습니다' : '뭍에 있습니다'}
            </Typography>
            <Typography align="center" sx={{ fontSize: 크기.홈보조, color: 색.흐린글, minHeight: 22 }}>
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
            /* 출항은 파랑(시작), 귀항은 초록(무사히 마침).
               전에는 귀항이 검정이었는데 「이거 가져가도 되나요」도 검정이라
               한 화면에 검정 버튼이 둘이었다. 검정은 하나만 남긴다.
               초록은 이 앱에서 「됐다」는 뜻으로 이미 쓰고 있다 —
               「가져가도 돼요」와 같은 결이다 (2026-08-06 지적 반영) */
            <Button
              variant="solid"
              size="large"
              fullWidth
              onClick={귀항하기}
              sx={{ ...버튼모양, backgroundColor: 색.됨, color: 색.흰 }}
            >
              🏠 귀항
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
              ⚓ 출항
            </Button>
          )}

          {/* 🔴 이 자리는 상태에 따라 내용이 바뀌지만 **높이는 늘 같다**.
              「출항」을 눌렀을 때 아래 버튼들이 아래로 밀려 내려가면
              방금 누른 손가락이 다른 버튼을 누르게 된다 (배 위에서는 위험하다).
              그래서 비어 있어도 자리를 지킨다 */}
          <FlexBox
            justifyContent="center"
            alignItems="center"
            sx={{ height: 크기.홈버튼높이, flex: '0 0 auto' }}
          >
            {바다에 ? (
            <Button
              variant="outlined"
              color="assistive"
              size="large"
              fullWidth
              onClick={취소하기}
              sx={{ ...테없는버튼, color: 색.흐린글 }}
            >
              출항 기록 취소
            </Button>
          ) : (
            방금돌아옴 && (
              <Button
                variant="outlined"
                color="assistive"
                size="large"
                fullWidth
                onClick={알리기}
                sx={{ ...테없는버튼, color: 색.흐린글 }}
              >
                도착 알리기
              </Button>
            )
          )}
          </FlexBox>
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
          🧿 오늘의 바다 부적
        </Button>
        <Button
          as={Link}
          href="/catch"
          variant="solid"
          size="large"
          fullWidth
          sx={{ ...버튼모양, backgroundColor: 색.반전바탕, color: 색.반전글, textDecoration: 'none', marginTop: -4 }}
        >
          🎣 이거 가져가도 되나요
        </Button>
        <Button
          variant="outlined"
          color="assistive"
          size="large"
          fullWidth
          onClick={() => {
            도장판정바꾸기(null);
            도장열림바꾸기(true);
          }}
          sx={{ ...버튼모양, fontSize: 크기.홈본문, marginTop: -4 }}
        >
          📸 사진 찍기
        </Button>


        <Divider sx={{ marginTop: 6 }} />

        <FlexBox justifyContent="space-between" alignItems="baseline">
          <Typography weight="bold" sx={{ fontSize: 크기.홈보조, color: 색.흐린글 }}>
            모은 도장
          </Typography>
          <Link href="/log" style={{ textDecoration: 'none' }}>
            <Typography weight="bold" sx={{ fontSize: 크기.홈본문, color: 색.주 }}>
              조과 기록 ›
            </Typography>
          </Link>
        </FlexBox>
        <도장들 목록={출항기록} 준비={준비} />
        </>
        )}
      </>
    </화면틀>
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
        <Typography sx={{ fontSize: 크기.홈보조, color: 색.아주흐린글, lineHeight: 1.7 }}>
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
            <Typography sx={{ fontSize: 크기.홈도장이름, color: 색.흐린글, textAlign: 'center', lineHeight: 1.3 }}>
              {String(d.getFullYear()).slice(2)}.{d.getMonth() + 1}.{d.getDate()}
            </Typography>
            {/* 그날 바다가 어땠는지 — 도장은 같아도 날은 다르다 */}
            <Typography
              sx={{ fontSize: 크기.홈도장날짜, color: 색.아주흐린글, marginTop: -3, textAlign: 'center', lineHeight: 1.35 }}
            >
              {이름과짧게(부적.물때(d).단계)}
            </Typography>
          </FlexBox>
        );
      })}
    </div>
  );
}
