'use client';

/* 홈 — 출항/귀항 도장 (PRD의 T)
 * 쓰고 있는 디자인 시스템의 부품(Button·Card·Typography·FlexBox)을 그대로 쓰고,
 * 크기만 components/크기.js 값으로 올려 쓴다.
 */

import { useEffect, useState } from 'react';
/* 🔵 2026-08-13 — 홈에서 다른 화면으로 가는 큰 버튼이 탭바로 옮겨가 Link 가 필요 없어졌다 */
import { Button, Card, Divider, FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 키, 읽기, 쓰기, 날짜말, 시각말, 걸린시간 } from '@/lib/저장소';
import 도장그림, { 도장고르기, 아이디로, 도장가짓수 } from './도장그림';
import 부적 from '@/lib/부적엔진';
import { 이름과짧게 } from '@/lib/물때말';
import 화면틀 from './화면틀';
import 아이콘 from './아이콘';
import 도장찍기, { 넘김키 } from './도장찍기';
import 준비물 from './준비물';
import { 기준표확인, 바다모두, 잰때말, 쓸만한가 } from '@/lib/바깥층';

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
  /* 🔴 2026-08-13 — 버튼 안 이모지(⚓🏠)를 그린 아이콘으로 바꿨다.
     🔵 아이콘과 글자는 `<span>` 하나로 묶어 **가로로** 세운다.
     버튼 부품 자체의 방향을 바꾸려 했더니 안 먹었다 —
     부품이 속을 한 겹 더 싸고 있어서 우리 규칙이 거기까지 안 닿는다 */
  height: 크기.홈버튼높이,
  fontSize: 크기.홈버튼글씨,
  fontWeight: 700,
  borderRadius: 크기.버튼둥글기,
};

export default function 홈화면() {
  /* 🔴 2026-08-10 — 지금 폰에 들어와 있는 판을 화면 맨 아래에 찍는다.
     고쳤는데 그대로일 때 **「안 고쳐진 것」과 「아직 안 들어온 것」**을 가르는 유일한 방법이다.
     이 글자만 알려주시면 새 판이 들어왔는지 바로 안다. */
  /* 🔴 2026-08-10 (3) — 판을 **파일에서 읽는다.**
   *
   * 저장 장치에 말을 걸어 묻던 방식은 `판 ?` 이 떴다 — 아직 화면을 맡기 전이거나
   * 옛 장치가 붙어 있으면 답이 안 온다. 이제 빌드가 `판.json` 을 만들고,
   * 그 파일은 **미리 받아두는 목록에 같이 들어간다.** 그래서 이걸 읽으면
   * **폰에 실제로 저장돼 있는 판**이 그대로 나온다. 말을 걸 필요가 없다. */
  const [앱판, 앱판바꾸기] = useState('');
  useEffect(() => {
    let 살아있음 = true;
    const 밑 = process.env.NEXT_PUBLIC_BASE_PATH || '';
    fetch(밑 + '/판.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((v) => {
        if (!살아있음) return;
        const 판 = String((v && v.판) || '?').slice(0, 24);
        const 말 = String((v && v.말) || '').slice(0, 60);
        /* 커밋 말이 있으면 그걸 앞에 둔다 — 사람이 알아보는 건 번호가 아니라 말이다 */
        앱판바꾸기(말 ? 말 + ' · ' + 판 : 판);
      })
      .catch(() => { if (살아있음) 앱판바꾸기('못 읽음'); });
    return () => { 살아있음 = false; };
  }, []);

  /* 🔵 2026-08-13 — 바깥층(2층). 인터넷이 있을 때만 값이 들어온다.
     없으면 `null` 이고, 아래에서 아무것도 그리지 않는다 (`37_두층구조` 규칙 ①) */
  const 바깥소식 = 기준표확인();

  /* 🔵 2026-08-13 — 바다 정보(수온·파고·바람). 판정 화면에서 고른 해역을 따른다.
     🔴 해역을 안 고르셨거나 · 인터넷이 없거나 · 중계가 없으면 `null` 이고 아무것도 안 그린다 */
  /* 🔴 2026-08-13 (고침) — **홈에서 바로 고른다** (사장님 「들어가서 바다를 선택해야 보는 건 너무 불편해」).
     전에는 판정 화면까지 들어갔다 나와야 카드가 떴다. 아무도 그렇게 안 한다. */
  const [고른해역, 고른해역바꾸기] = useState(null);
  useEffect(() => { 고른해역바꾸기(읽기(키.해역, null)); }, []);
  const 바다모음 = 바다모두();
  const 바다 = (고른해역 && 바다모음) ? 바다모음[고른해역] : null;
  /* 🔴 파고·바람은 24시간까지, 수온은 12시간까지 (부이가 들쭉날쭉해서) */
  const 수온보임 = 바다 && 바다.수온 != null && 쓸만한가(바다.수온잰때);
  const 파고보임 = 바다 && 바다.파고 != null && 쓸만한가(바다.바다잰때, 24);
  const 바람보임 = 바다 && 바다.풍속 != null && 쓸만한가(바다.바다잰때, 24);
  /* 인터넷이 있고 자료가 있으면 카드를 띄운다 — 해역을 안 고르셨어도 고르는 칸은 보여드린다 */
  const 바다보임 = !!바다모음;

  function 해역고르기(이름) {
    const 새것 = 고른해역 === 이름 ? null : 이름;
    고른해역바꾸기(새것);
    쓰기(키.해역, 새것);
  }

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
      /* 🔴 2026-08-13 — 제목이 「홈」이었다. 탭바에 「홈」이 이미 있어 두 번 말하는 셈이고,
         제목 자리는 「여기가 무엇을 하는 곳인가」를 말해야 한다. 앱 이름을 쓴다 */
      제목="귀항 도장"
      탭="홈"
      날짜={준비 && 지금 ? 지금 : null}
      /* 🔴 2026-08-13 — 큰 숫자를 세우지 않고 제목 아래 한 줄로 (사장님 선택) */
      요약={`${준비 ? 출항기록.length : 0}번 다녀왔습니다`}
      바닥글={앱판 || ''}
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
        {/* 🔵 바깥층 알림 — 인터넷이 있고, 알릴 것이 실제로 있을 때만 뜬다.
            🔴 없으면 자리를 아예 차지하지 않는다. 빈 네모도 도는 표시도 남기지 않는다 */}
        {바깥소식 && (
          <Card
            sx={{
              backgroundColor: 바깥소식.종류 === '기준표' ? 색.바탕 : 'transparent',
              border: 바깥소식.종류 === '기준표' ? `2px solid ${색.안됨}` : `1px solid ${색.선}`,
              borderRadius: 14,
              padding: '11px 13px',
              marginBottom: 10,
            }}
          >
            {바깥소식.종류 === '기준표' ? (
              <>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 색.안됨, lineHeight: 1.5 }}>
                  기준표가 새로 나왔어요
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 색.흐린글, lineHeight: 1.65, marginTop: 3 }}>
                  이 앱에 든 것은 {바깥소식.내것} 기준입니다. 새로 나온 것은 {바깥소식.새것} 기준이에요.
                  <br />
                  인터넷이 되는 곳에서 앱을 한 번 닫았다 열면 새로 받습니다.
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: 색.흐린글, lineHeight: 1.6 }}>
                새 판이 나왔어요{바깥소식.말 ? ' — ' + 바깥소식.말 : ''}. 앱을 한 번 닫았다 열면 받습니다.
              </Typography>
            )}
          </Card>
        )}

        {/* 🔵 바다 정보 — 인터넷이 있고 값이 최근 것일 때만 뜬다.
            🔴 「지금 몇 도」라고 말하지 않는다. **언제 잰 것인지 같이 적는다** */}
        {바다보임 && (
          <Card sx={{ backgroundColor: 색.바탕, border: `1px solid ${색.선}`, borderRadius: 14, padding: '11px 13px', marginBottom: 10 }}>
            {/* 🔵 해역 고르기 — 한 번 누르면 바로 바뀐다. 다시 누르면 접힌다 */}
            <FlexBox sx={{ gap: 6, flexWrap: 'wrap', marginBottom: 바다 ? 8 : 0 }}>
              {['서해', '동해', '남해', '제주'].map((이름) => {
                const 고름 = 고른해역 === 이름;
                /* 🔴 자료가 안 들어온 바다는 흐리게 — 눌러도 보여줄 게 없다 */
                const 있음 = !!(바다모음 && 바다모음[이름]);
                return (
                  <button
                    key={이름}
                    type="button"
                    onClick={() => 해역고르기(이름)}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      fontWeight: 고름 ? 700 : 500,
                      padding: '6px 13px',
                      borderRadius: 999,
                      border: `1px solid ${고름 ? 색.반전바탕 : 색.선}`,
                      backgroundColor: 고름 ? 색.반전바탕 : 'transparent',
                      color: 고름 ? 색.반전글 : (있음 ? 색.흐린글 : 색.아주흐린글),
                    }}
                  >
                    {이름}
                  </button>
                );
              })}
            </FlexBox>

            {/* 🔴 안 고르셨으면 숫자를 지어내지 않는다. 한 줄로 안내만 한다 */}
            {!고른해역 && (
              <Typography sx={{ fontSize: 12.5, color: 색.아주흐린글, marginTop: 8, lineHeight: 1.5 }}>
                바다를 고르시면 수온과 파고를 보여드려요
              </Typography>
            )}

            {고른해역 && !(수온보임 || 파고보임 || 바람보임) && (
              <Typography sx={{ fontSize: 12.5, color: 색.아주흐린글, lineHeight: 1.5 }}>
                {고른해역} 자료가 아직 안 들어왔어요
              </Typography>
            )}

            {(수온보임 || 파고보임 || 바람보임) && (
              <>
                <FlexBox sx={{ gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  {수온보임 && (
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: 색.글 }}>
                      수온 {바다.수온}℃
                    </Typography>
                  )}
                  {파고보임 && (
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: 색.글 }}>
                      파고 {바다.파고}m
                    </Typography>
                  )}
                  {바람보임 && (
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: 색.글 }}>
                      바람 {바다.풍속}m/s
                    </Typography>
                  )}
                </FlexBox>
                {/* 🔴 「지금 몇 도」라고 말하지 않는다 — 언제 어디서 잰 것인지 반드시 같이 적는다.
                    수온과 파고는 잰 곳도 잰 때도 다를 수 있어 따로 적는다 */}
                {수온보임 && (
                  <Typography sx={{ fontSize: 11.5, color: 색.아주흐린글, marginTop: 4, lineHeight: 1.5 }}>
                    수온 {바다.수온잰곳} 관측 · {잰때말(바다.수온잰때)}
                  </Typography>
                )}
                {(파고보임 || 바람보임) && (
                  <Typography sx={{ fontSize: 11.5, color: 색.아주흐린글, marginTop: 2, lineHeight: 1.5 }}>
                    파고 {바다.바다잰곳} 관측 · {잰때말(바다.바다잰때)}
                  </Typography>
                )}
              </>
            )}
          </Card>
        )}

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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <아이콘 이름="집" 크기={22} /> 귀항
              </span>
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <아이콘 이름="닻" 크기={22} /> 출항
              </span>
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

        {/* ── 빠른 동작 둘 ──────────────────────────────────
            🔴 2026-08-13 — 큰 버튼 다섯 줄을 걷어냈다 (사장님 「버튼이 줄줄이 쌓인 것」).
            부적·판정·기록은 **아래 탭바**로 갔다 — 홈을 거칠 필요가 없어졌다.
            여기 남는 둘은 탭바에 없는 것이고, 둘 다 **이 화면 안에서 열리는 칸**이다.
            🔵 사진은 잡은 뒤에, 준비물은 나가기 전에 쓴다. 둘 다 홈에서 시작한다 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <빠른칸 그림="사진" 이름="사진 찍기" 누르기={() => { 도장판정바꾸기(null); 도장열림바꾸기(true); }} />
          <빠른칸 그림="준비물" 이름="준비물" 누르기={() => 준비물열림바꾸기(true)} />
        </div>

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

/* 홈의 빠른 동작 한 칸 — 그림 하나에 이름 하나.
   🔴 이모지를 안 쓴다. 폰마다 모양이 달라지고 색을 우리가 못 정한다 */
function 빠른칸({ 그림, 이름, 누르기 }) {
  return (
    <button
      type="button"
      onClick={누르기}
      style={{
        appearance: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '15px 8px',
        borderRadius: 16,
        border: `1px solid ${색.선}`,
        backgroundColor: 색.바탕,
        color: 색.글,
        fontSize: 크기.홈본문,
        fontWeight: 600,
        letterSpacing: '-0.01em',
      }}
    >
      <span style={{ color: 색.흐린글 }}>
        <아이콘 이름={그림} 크기={24} />
      </span>
      {이름}
    </button>
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
