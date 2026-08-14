'use client';

/* 모든 화면이 같은 머리·발을 쓰도록 한 겹 싸 둔다.
 * 화면이 넷이 되면서, 머리 모양을 고칠 때 네 군데를 고치는 일이 생겼다.
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 2026-08-13 — 화면 이동 규칙을 바꿨다 (사장님 「화면 이동이 불편한 것」)
 *
 *   전 (2026-08-06 결정)            지금
 *   ────────────────────           ────────────────────
 *   홈이 갈림길이다.                아래에 **탭바** 넷을 둔다.
 *   왼쪽 위 「‹ 홈」                 홈 · 부적 · 판정 · 기록
 *   발에 「다음 한 걸음」 하나        어디서든 한 번에 건너간다.
 *
 * 왜 바꾸나 — 전 규칙의 뜻은 옳았다(「어디로 갈지 고르게 되는」 것을 막는다).
 * 그런데 대가가 컸다. **부적을 보다가 판정에 가려면 홈을 찍고 다시 들어가야 했다.**
 * 배 위에서 두 번 누르는 것과 한 번 누르는 것은 다르다.
 * 탭바는 「고르게 만드는 것」이 아니라 **늘 같은 자리에 있는 것**이라 눈이 헤매지 않는다.
 * 네 칸이 화면마다 같은 자리에 있고, 지금 어디에 있는지도 같이 보인다.
 *
 * 🔵 그래서 「‹ 홈」과 「다음 한 걸음」은 뺐다 — 탭바가 그 일을 다 한다.
 *    같은 곳으로 가는 길이 셋이면 눈이 헤맨다(그건 옛 규칙에서 그대로 가져온다).
 *    `홈으로`·`다음` 을 아직 넘겨주는 화면이 있어도 그냥 무시한다 — 화면이 안 깨진다.
 * ─────────────────────────────────────────────────────────────
 */

import Link from 'next/link';
import { FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 어종그림정의 } from '@/lib/어종그림';
import { 날짜말 } from '@/lib/저장소';
import 아이콘 from './아이콘';

/* 탭바 넷 — 하루 순서대로 왼쪽에서 오른쪽 (나가기 전 부적 → 잡으면 판정 → 쌓이면 기록) */
const 탭들 = [
  { 이름: '홈', 주소: '/', 그림: '닻' },
  { 이름: '부적', 주소: '/charm', 그림: '부적' },
  /* 🔴 2026-08-13 — 「판정」이었는데 **사장님이 금어기를 어디서 보는지 못 찾으셨다.**
     두 글자로 줄이다 뜻이 날아갔다. 「가져가기」는 쓰지 않는다 —
     이 앱은 「가져가지 마세요」라고 말해야 할 때가 있는데, 그러면 이름이 반대로 읽힌다.
     「물어보기」는 명령이 아니고, 「애매하면 애매하다고 말한다」는 이 앱 태도와 맞는다 */
  { 이름: '물어보기', 주소: '/catch', 그림: '물고기' },
  { 이름: '기록', 주소: '/log', 그림: '기록' },
];

export default function 화면틀({
  제목,
  날짜,
  안내,
  큰숫자,
  /* 숫자 **앞**에 붙는 말 — 「총」 · 「오늘」 · 「최근 1주일」 */
  큰숫자앞말,
  큰숫자말,
  바닥글,
  /* 지금 어느 탭인가 — '홈' · '부적' · '판정' · '기록' */
  탭,
  /* 제목 아래 한 줄로 합쳐 보여줄 말. 주면 큰 숫자 자리를 대신한다 */
  요약,
  /* 🔵 옛 규칙에서 쓰던 것. 아직 넘겨주는 화면이 있어 받아만 두고 안 쓴다 */
  홈으로,
  다음,
  children,
}) {
  return (
    <FlexBox
      flexDirection="column"
      sx={{ minHeight: '100dvh', backgroundColor: 색.바탕뒤 }}
    >
      {/* 어종 그림의 색·모양 정의를 화면마다 **한 번만** 깔아둔다.
          여기 있으면 이 틀을 쓰는 네 화면 어디서든 <어종그림 /> 을 그냥 쓸 수 있다.
          눈에 보이지 않는다 — 크기 0 이다 */}
      <어종그림정의 />

      {/* 머리 — 흰 바탕. 아래 본문은 회색 바탕이라 여기서 한 번 갈린다 */}
      <FlexBox
        flexDirection="column"
        gap={2}
        sx={{
          backgroundColor: 색.바탕,
          borderBottom: `1px solid ${색.선}`,
          padding: `calc(env(safe-area-inset-top) + ${크기.여백}px) ${크기.여백}px ${크기.카드여백}px`,
        }}
      >
        {/* 🔴 2026-08-13 — 머리가 세 줄(날짜/제목/큰 숫자)이라 화면 위를 많이 먹었다
            (사장님 「이거 있는 부분 좀 별로다」). `요약` 을 주면 **제목 아래 한 줄**로 합친다.
            날짜도 그 줄에 같이 들어간다 — 두 줄이 한 줄이 된다 */}
        {요약 ? null : (
          <Typography sx={{ fontSize: 크기.머리날짜, color: 색.흐린글 }}>
            {날짜 ? 날짜말(날짜) : ' '}
          </Typography>
        )}
        <Typography weight="bold" sx={{ fontSize: 크기.머리제목, letterSpacing: '-0.01em' }}>
          {제목}
        </Typography>
        {요약 ? (
          <Typography sx={{ fontSize: 크기.머리날짜, color: 색.흐린글, marginTop: 4 }}>
            {(날짜 ? 날짜말(날짜) + ' · ' : '') + 요약}
          </Typography>
        ) : null}

        {요약 ? null : 큰숫자 != null ? (
          <FlexBox alignItems="baseline" gap={8} sx={{ marginTop: 8 }}>
            {큰숫자앞말 && (
              <Typography sx={{ fontSize: 크기.머리큰숫자말, color: 색.흐린글 }}>{큰숫자앞말}</Typography>
            )}
            <Typography weight="bold" sx={{ fontSize: 크기.머리큰숫자, lineHeight: 1, color: 색.주 }}>
              {큰숫자}
            </Typography>
            <Typography sx={{ fontSize: 크기.머리큰숫자말, color: 색.흐린글 }}>{큰숫자말}</Typography>
          </FlexBox>
        ) : 안내 ? (
          <Typography sx={{ fontSize: 크기.머리안내, color: 색.흐린글, marginTop: 6 }}>{안내}</Typography>
        ) : null}
      </FlexBox>

      {/* 본문 */}
      <FlexBox
        flexDirection="column"
        gap={크기.사이}
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          padding: 크기.여백,
          /* 🔴 탭바가 마지막 줄을 가리지 않게 그만큼 비워둔다 */
          paddingBottom: `calc(${크기.탭높이}px + env(safe-area-inset-bottom) + 16px)`,
        }}
      >
        {children}
      </FlexBox>

      {/* 발 — 바닥글은 탭바 바로 위에 */}
      {바닥글 ? (
        <Typography
          align="center"
          sx={{
            fontSize: 크기.바닥글,
            color: 색.아주흐린글,
            padding: `0 20px 10px`,
            marginBottom: `calc(${크기.탭높이}px + env(safe-area-inset-bottom))`,
          }}
        >
          {바닥글}
        </Typography>
      ) : null}

      {/* ── 탭바 ── 늘 같은 자리, 늘 네 칸 */}
      <nav
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          backgroundColor: 색.바탕,
          borderTop: `1px solid ${색.선}`,
          padding: `8px 4px calc(env(safe-area-inset-bottom) + 8px)`,
        }}
      >
        {탭들.map((t) => {
          const 여기 = 탭 === t.이름;
          return (
            <Link
              key={t.이름}
              href={t.주소}
              aria-current={여기 ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '2px 0',
                textDecoration: 'none',
                /* 🔴 12px 라벨이라 진한 쪽(색.주글)을 쓴다 — 대비 5.3:1 */
                color: 여기 ? 색.주글 : 색.아주흐린글,
              }}
            >
              <아이콘 이름={t.그림} 크기={크기.탭아이콘} />
              <span
                style={{
                  fontSize: 크기.탭글씨,
                  fontWeight: 여기 ? 700 : 500,
                  letterSpacing: '-0.02em',
                }}
              >
                {t.이름}
              </span>
            </Link>
          );
        })}
      </nav>
    </FlexBox>
  );
}
