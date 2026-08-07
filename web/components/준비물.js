'use client';

/* 낚시 준비물 — 나가기 전에 한 번 훑는 목록 (2026-08-07 사장님 지시)
 *
 * 왜 이게 필요한가 —
 * 배낚시는 **한 번 나가면 되돌아올 수 없다.** 멀미약을 두고 오면 그날 하루가 끝나고,
 * 구명조끼는 목숨이 걸린 문제다. 그런데 챙길 것이 스물 몇 가지라 사람이 다 못 외운다.
 * 판정·부적·도장이 「바다에서」 쓰는 것이라면, 이건 **집을 나서기 전에** 쓰는 것이다.
 *
 * 규칙
 *  - 🔴 **어획을 말하지 않는다.** 「이 미끼를 쓰면 잘 문다」 같은 말은 없다(PRD §0-1).
 *    여기 적힌 것은 전부 **가져가는 물건**이지 「이렇게 하면 잡힌다」가 아니다.
 *  - 안전에 관한 것은 맨 위에 둔다. 목록 아래쪽은 잘 안 읽힌다.
 *  - 체크는 **이 기기 안에만** 남는다(PRD §0-7). 어디로도 보내지 않는다.
 *  - 사람마다 챙기는 것이 다르므로 **직접 더할 수 있게** 한다.
 *    목록을 우리가 다 정하려 들면 「내 것이 없는 목록」이 된다.
 *  - 그림 파일을 쓰지 않는다 — 외부 통신 0건(PRD §0-10).
 */

import { useEffect, useRef, useState } from 'react';
import { Button, Card, FlexBox, TextField, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 읽기, 쓰기 } from '@/lib/저장소';

/* 체크 상태와 직접 더한 것 — 기기 안에만 */
export const 준비물키 = 'seacharm.gear.v1';
export const 내것키 = 'seacharm.gearmine.v1';

/* 🔴 이름을 바꾸지 마라. 이름이 곧 체크의 열쇠다 — 바꾸면 체크가 다 풀린다.
   빼거나 더하는 것은 괜찮다. */
export const 준비물묶음 = [
  {
    이름: '몸을 지키는 것',
    설명: '이건 빠지면 되돌릴 수 없어요',
    것들: [
      '구명조끼',
      '미끄럼 안 나는 신발',
      '멀미약 (출항 30분 전)',
      '모자',
      '선글라스',
      '자외선 차단제',
      '장갑',
      '여벌 옷 · 우비',
      '수건',
    ],
  },
  {
    이름: '낚시 채비',
    것들: [
      '낚싯대',
      '릴',
      '원줄 · 목줄',
      '봉돌 · 바늘',
      '미끼',
      '가위 · 니퍼',
      '바늘 빼는 집게',
      '뜰채',
      '아이스박스',
      '얼음',
    ],
  },
  {
    이름: '먹고 마실 것',
    것들: ['물', '간식 · 도시락', '보온병'],
  },
  {
    이름: '그 밖에',
    설명: '자는 이 앱이 길이를 물어볼 때 씁니다',
    것들: [
      '자 (30cm 이상)',
      '휴대폰 방수팩',
      '보조 배터리',
      '신분증',
      '예약 확인',
      '쓰레기봉투',
    ],
  },
];

export default function 준비물({ 닫기 }) {
  const [체크, 체크바꾸기] = useState({});
  const [내것, 내것바꾸기] = useState([]);
  const [새것, 새것바꾸기] = useState('');
  const [준비, 준비바꾸기] = useState(false);

  /* 🔴 첫 그림은 서버에서도 그려지므로 여기서 읽으면 화면이 어긋난다.
     화면에 붙은 뒤에 읽는다 */
  useEffect(() => {
    체크바꾸기(읽기(준비물키, {}) || {});
    내것바꾸기(읽기(내것키, []) || []);
    준비바꾸기(true);
  }, []);

  function 누름(이름) {
    const 다음 = { ...체크, [이름]: !체크[이름] };
    if (!다음[이름]) delete 다음[이름];
    체크바꾸기(다음);
    쓰기(준비물키, 다음);
  }

  function 더하기() {
    const 글 = 새것.trim();
    if (!글) return;
    if (내것.indexOf(글) !== -1 || 준비물묶음.some((g) => g.것들.indexOf(글) !== -1)) {
      새것바꾸기('');
      return; /* 이미 있는 것은 또 넣지 않는다 */
    }
    const 다음 = [...내것, 글];
    내것바꾸기(다음);
    쓰기(내것키, 다음);
    새것바꾸기('');
  }

  function 내것지우기(이름) {
    const 다음 = 내것.filter((x) => x !== 이름);
    내것바꾸기(다음);
    쓰기(내것키, 다음);
    const c = { ...체크 };
    delete c[이름];
    체크바꾸기(c);
    쓰기(준비물키, c);
  }

  function 전부풀기() {
    체크바꾸기({});
    쓰기(준비물키, {});
  }

  const 모든것 = [
    ...준비물묶음.flatMap((g) => g.것들),
    ...내것,
  ];
  const 챙긴수 = 모든것.filter((x) => 체크[x]).length;
  const 남은수 = 모든것.length - 챙긴수;

  const 카드 = {
    backgroundColor: 색.바탕,
    borderRadius: 18,
    padding: 크기.카드여백,
    gap: 크기.사이,
    boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
  };

  return (
    <FlexBox flexDirection="column" gap={크기.사이}>
      <Card sx={카드}>
        <FlexBox justifyContent="space-between" alignItems="baseline">
          <Typography weight="bold" sx={{ fontSize: 크기.도장제목 }}>
            준비물
          </Typography>
          <Typography sx={{ fontSize: 크기.홈작게, color: 색.아주흐린글 }}>
            {준비 ? `${챙긴수} / ${모든것.length}` : ''}
          </Typography>
        </FlexBox>
        <Typography sx={{ fontSize: 크기.도장보조, color: 색.흐린글, lineHeight: 1.7 }}>
          {!준비
            ? ' '
            : 남은수 === 0
              ? '다 챙기셨어요. 잘 다녀오세요.'
              : `아직 ${남은수}가지 남았어요.`}
        </Typography>
      </Card>

      {준비물묶음.map((묶음) => (
        <Card key={묶음.이름} sx={카드}>
          <FlexBox flexDirection="column" gap={2}>
            <Typography weight="bold" sx={{ fontSize: 크기.도장묶음 }}>
              {묶음.이름}
            </Typography>
            {묶음.설명 && (
              <Typography sx={{ fontSize: 크기.도장작게, color: 색.주의, lineHeight: 1.6 }}>
                {묶음.설명}
              </Typography>
            )}
          </FlexBox>
          <FlexBox flexDirection="column" gap={0}>
            {묶음.것들.map((이름) => (
              <칸 key={이름} 이름={이름} 켜짐={!!체크[이름]} 누름={() => 누름(이름)} />
            ))}
          </FlexBox>
        </Card>
      ))}

      <Card sx={카드}>
        <Typography weight="bold" sx={{ fontSize: 크기.도장묶음 }}>
          내가 챙기는 것
        </Typography>
        <Typography sx={{ fontSize: 크기.도장작게, color: 색.아주흐린글, lineHeight: 1.6 }}>
          사람마다 챙기는 것이 다릅니다. 여기에 더해두면 다음에도 남아 있어요.
          {내것.length > 0 && <><br />지울 것은 <b>왼쪽으로 미세요</b>.</>}
        </Typography>
        {내것.length > 0 && (
          <FlexBox flexDirection="column" gap={0}>
            {내것.map((이름) => (
              <칸
                key={이름}
                이름={이름}
                켜짐={!!체크[이름]}
                누름={() => 누름(이름)}
                지우기={() => 내것지우기(이름)}
              />
            ))}
          </FlexBox>
        )}
        <FlexBox gap={8} alignItems="center">
          <TextField
            value={새것}
            placeholder="예 · 손전등"
            onChange={(e) => 새것바꾸기(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') 더하기();
            }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            color="assistive"
            size="large"
            onClick={더하기}
            sx={{ height: 46, borderRadius: 12, fontSize: 크기.도장보조, flex: '0 0 auto' }}
          >
            더하기
          </Button>
        </FlexBox>
      </Card>

      <Button
        variant="outlined"
        color="assistive"
        size="large"
        fullWidth
        onClick={전부풀기}
        sx={{
          height: 46,
          borderRadius: 크기.버튼둥글기,
          fontSize: 크기.도장보조,
          fontWeight: 500,
          color: 색.흐린글,
        }}
      >
        체크 전부 풀기
      </Button>
      <Button
        variant="solid"
        color="primary"
        size="large"
        fullWidth
        onClick={닫기}
        sx={{ height: 크기.버튼높이, borderRadius: 크기.버튼둥글기, fontSize: 크기.버튼글씨 }}
      >
        닫기
      </Button>
    </FlexBox>
  );
}

/* 한 줄 — 배 위에서 장갑 낀 손으로 누른다. 줄 전체가 버튼이다.
 *
 * 🔴 2026-08-07 (사장님 지적)
 *   ① 줄간격을 촘촘하게 — 28가지가 화면을 너무 길게 먹었다.
 *   ② 지우기는 **왼쪽으로 미는 것**으로 한다.
 *      - 처음엔 꾹 누르기로 했다가 바꿨다. 꾹 누르기는 **눌렀는지 아닌지 안 보인다** —
 *        손가락을 떼기 전까지 아무 일도 안 일어나서 「되나?」 하고 한 번 더 누르게 된다.
 *        미는 것은 **미는 만큼 빨간 칸이 드러나** 지금 무엇이 일어나는지 손이 안다.
 *      - 80px 넘게 밀어야 지워진다. 덜 밀면 제자리로 돌아온다.
 *      - 🔴 세로로 긁는 것과 부딪히면 안 된다. `touch-action: pan-y` 로
 *        **세로는 화면에 양보하고 가로만 우리가 가져간다.**
 *      - 🔴 확인 창(alert)은 쓰지 않는다. 화면이 멈춘다.
 */
function 칸({ 이름, 켜짐, 누름, 지우기 }) {
  const [밀림, 밀림바꾸기] = useState(0);
  const [끄는중, 끄는중바꾸기] = useState(false);
  const 시작점 = useRef(null);
  const 가로인가 = useRef(null);
  const 밀었나 = useRef(false);

  const 문턱 = 80;

  function 시작(e) {
    if (!지우기) return;
    시작점.current = { x: e.clientX, y: e.clientY };
    가로인가.current = null;
    밀었나.current = false;
  }

  function 움직임(e) {
    if (!지우기 || !시작점.current) return;
    const dx = e.clientX - 시작점.current.x;
    const dy = e.clientY - 시작점.current.y;
    /* 처음 몇 픽셀로 가로인지 세로인지 정한다. 한 번 정하면 안 바꾼다 */
    if (가로인가.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      가로인가.current = Math.abs(dx) > Math.abs(dy);
      if (가로인가.current) 끄는중바꾸기(true);
    }
    if (!가로인가.current) return;
    /* 오른쪽으로는 안 밀린다. 왼쪽으로만, 그리고 끝에서는 뻑뻑해진다 */
    const 왼쪽 = Math.min(0, dx);
    밀림바꾸기(왼쪽 < -문턱 ? -문턱 + (왼쪽 + 문턱) * 0.25 : 왼쪽);
    if (Math.abs(dx) > 8) 밀었나.current = true;
  }

  function 끝(e) {
    if (!지우기) return;
    const 밀린만큼 = 밀림;
    시작점.current = null;
    가로인가.current = null;
    끄는중바꾸기(false);
    if (밀린만큼 <= -문턱) {
      /* 지우기 전에 끝까지 밀어 보낸다 — 사라지는 것이 보여야 한다 */
      밀림바꾸기(-320);
      setTimeout(() => 지우기(), 160);
    } else {
      밀림바꾸기(0);
    }
  }

  const 지울참 = 밀림 <= -문턱;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        touchAction: 지우기 ? 'pan-y' : 'auto',
      }}
    >
      {/* 뒤에 깔리는 빨간 칸 — 미는 만큼 드러난다 */}
      {지우기 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 14,
            background: 색.안됨,
            color: 색.흰,
            fontSize: 크기.도장작게,
            fontWeight: 700,
            opacity: 밀림 < 0 ? 1 : 0,
          }}
        >
          {지울참 ? '놓으면 지워집니다' : '지우기'}
        </div>
      )}

      <button
        type="button"
        onClick={() => { if (밀었나.current) { 밀었나.current = false; return; } 누름(); }}
        onPointerDown={시작}
        onPointerMove={움직임}
        onPointerUp={끝}
        onPointerCancel={끝}
        onPointerLeave={(e) => { if (시작점.current) 끝(e); }}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '7px 2px',
          border: 'none',
          background: 색.바탕,
          fontFamily: 'inherit',
          fontSize: 크기.도장본문,
          textAlign: 'left',
          cursor: 'pointer',
          color: 켜짐 ? 색.아주흐린글 : 색.글,
          transform: `translateX(${밀림}px)`,
          transition: 끄는중 ? 'none' : 'transform .18s ease',
          WebkitTouchCallout: 'none',
        }}
      >
        {/* 네모 칸 — 코드로 그린다. 이모지를 쓰면 폰마다 모양이 다르다 */}
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            flex: '0 0 auto',
            borderRadius: 8,
            border: `2px solid ${켜짐 ? 색.됨 : 색.선}`,
            background: 켜짐 ? 색.됨 : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {켜짐 && (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span style={{ textDecoration: 켜짐 ? 'line-through' : 'none' }}>{이름}</span>
      </button>
    </div>
  );
}
