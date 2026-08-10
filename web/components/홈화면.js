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
import 도장그림, { 도장고르기, 아이디로, 도장가짓수 } from './도장그림';
import 부적 from '@/lib/부적엔진';
import { 이름과짧게 } from '@/lib/물때말';
import 화면틀 from './화면틀';
import 도장찍기, { 넘김키 } from './도장찍기';
import 준비물 from './준비물';

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
  /* 🔴 2026-08-10 — 지금 폰에 들어와 있는 판을 화면 맨 아래에 찍는다.
     고쳤는데 그대로일 때 **「안 고쳐진 것」과 「아직 안 들어온 것」**을 가르는 유일한 방법이다.
     이 글자만 알려주시면 새 판이 들어왔는지 바로 안다. */
  const [앱판, 앱판바꾸기] = useState('');
  useEffect(() => {
    let 살아있음 = true;
    /* 🔴 2026-08-10 (2) — 「저장 안 함」이 뜨던 것을 고친다.
     *
     * 전에는 `controller` 만 봤다. 그런데 **앱을 처음 열거나 새 판이 막 들어온 직후에는
     * 저장 장치가 아직 이 화면을 「맡기 전」이라 `controller` 가 비어 있다.**
     * 장치는 멀쩡히 살아 있는데 화면만 모르는 상태였다.
     *
     * 이제 ① 준비될 때까지 기다렸다가 ② 맡고 있든 아니든 **살아 있는 장치**에게 묻고
     * ③ 나중에 맡게 되면 그때 다시 묻는다. */
    function 물어보기() {
      try {
        const sw = navigator.serviceWorker;
        if (!sw) { 앱판바꾸기('저장 못 함'); return; }
        sw.ready
          .then((등록) => {
            const 상대 = sw.controller || 등록.active;
            if (!상대) { if (살아있음) 앱판바꾸기('아직'); return; }
            const 길 = new MessageChannel();
            길.port1.onmessage = (e) => {
              if (살아있음) 앱판바꾸기((e.data && e.data.판) || '?');
            };
            상대.postMessage({ 무엇: '판' }, [길.port2]);
          })
          .catch(() => { if (살아있음) 앱판바꾸기('?'); });
      } catch (e) { if (살아있음) 앱판바꾸기('?'); }
    }
    물어보기();
    let 떼기 = null;
    try {
      const sw = navigator.serviceWorker;
      if (sw) { sw.addEventListener('controllerchange', 물어보기); 떼기 = () => sw.removeEventListener('controllerchange', 물어보기); }
    } catch (e) {}
    return () => { 살아있음 = false; if (떼기) 떼기(); };
  }, []);

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
    /* 🔴 도장을 「지금」 정해서 기록에 같이 적어둔다 (2026-08-07).
       나중에 도장 목록을 손대도 **이미 받은 도장은 안 바뀐다.**
       한 번 받은 것이 바뀌면 모으는 물건이 아니게 된다 */
    const 돌아온때 = new Date();
    const 새기록 = [
      {
        out: 바다에.out,
        back: 돌아온때.toISOString(),
        도장: 도장고르기(돌아온때).아이디,
      },
      ...출항기록,
    ];
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
  /* 준비물 목록 — 나가기 전에 훑는 것이라 홈에 둔다 (2026-08-07 사장님 지시) */
  const [준비물열림, 준비물열림바꾸기] = useState(false);
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
      바닥글={앱판 ? `판 ${앱판}` : ''}
      /* 여기가 홈이다 — 되돌아갈 곳이 없다 */
      홈으로={false}
    >
      <>
        {준비물열림 ? (
          <준비물 닫기={() => 준비물열림바꾸기(false)} />
        ) : 도장열림 ? (
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
            /* 🔴 출항 칸이 화면을 너무 먹었다 — 위아래만 줄인다 (사장님 지시) */
            paddingTop: 12,
            paddingBottom: 12,
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
          /* 🔴 2026-08-07 — 갈색(#8b5a2b)이 앱 안에서 혼자 튀었다(사장님 「너무 똥색」).
              부적 종이의 노란 그림자와 같은 색으로 바꿔 한 가족으로 묶는다 */
          sx={{ ...버튼모양, backgroundColor: '#F2C14E', color: '#123039', textDecoration: 'none' }}
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

        {/* 🔴 2026-08-06 — 조과 기록을 큰 버튼으로 올렸다 (사장님 지시).
            전에는 「모은 도장」 옆의 작은 글자였다.
            **배에서 내려 집에 가서 볼 수도 있는 화면**이라, 홈에서 바로 갈 수 있어야 한다.
            작은 링크는 없앴다 — 같은 곳으로 가는 길이 둘이면 눈이 헤맨다 */}
        <Button
          as={Link}
          href="/log"
          variant="outlined"
          color="assistive"
          size="large"
          fullWidth
          sx={{ ...버튼모양, fontSize: 크기.홈본문, marginTop: -4, textDecoration: 'none' }}
        >
          📋 조과 기록
        </Button>
        {/* 🔴 준비물은 「나가기 전」에 쓰는 것이라 출항 가까이 두고 싶지만,
            홈 위쪽은 출항·귀항이 차지해야 한다(배 위에서 급하게 누르는 것). 그래서 여기다 */}
        <Button
          variant="outlined"
          color="assistive"
          size="large"
          fullWidth
          onClick={() => 준비물열림바꾸기(true)}
          sx={{ ...버튼모양, fontSize: 크기.홈본문, marginTop: -4 }}
        >
          🎒 준비물
        </Button>

        <Divider sx={{ marginTop: 6 }} />

        {/* 🔴 「몇 종을 모았나」를 같이 보여준다 (2026-08-07 사장님 지시).
            도장이 다 같으면 모을 이유가 없다. 종류가 몇 개인지 보여야 모으는 물건이 된다 */}
        <FlexBox justifyContent="space-between" alignItems="baseline">
          <Typography weight="bold" sx={{ fontSize: 크기.홈보조, color: 색.흐린글 }}>
            모은 도장
          </Typography>
          {준비 && 출항기록.length > 0 && (
            <Typography sx={{ fontSize: 크기.홈작게, color: 색.아주흐린글 }}>
              {모은종수(출항기록)}종 / {도장가짓수}종
            </Typography>
          )}
        </FlexBox>
        <도장들 목록={출항기록} 준비={준비} />
        </>
        )}
      </>
    </화면틀>
  );
}

/* 몇 가지 도장을 모았나 — 같은 도장을 여러 번 받아도 한 가지로 센다 */
function 모은종수(목록) {
  const 본것 = new Set();
  for (const t of 목록) {
    if (!t || !t.back) continue;
    const 것 = 아이디로(t.도장) || 도장고르기(new Date(t.back));
    본것.add(것.아이디);
  }
  return 본것.size;
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
            {/* 기록에 적힌 도장을 먼저 쓰고, 없는 옛 기록은 날짜로 되찾는다 */}
            <도장그림 날짜={d} 크기={52} 도장={아이디로(t.도장) || 도장고르기(d)} />
            <Typography sx={{ fontSize: 크기.홈도장이름, color: 색.흐린글, textAlign: 'center', lineHeight: 1.3 }}>
              {String(d.getFullYear()).slice(2)}.{d.getMonth() + 1}.{d.getDate()}
            </Typography>
            {/* 그날 바다가 어땠는지 + 도장 글자를 한글로 */}
            <Typography
              sx={{ fontSize: 크기.홈도장날짜, color: 색.아주흐린글, marginTop: -3, textAlign: 'center', lineHeight: 1.35 }}
            >
              {이름과짧게(부적.물때(d).단계)} · {(아이디로(t.도장) || 도장고르기(d)).읽기}
            </Typography>
          </FlexBox>
        );
      })}
    </div>
  );
}
