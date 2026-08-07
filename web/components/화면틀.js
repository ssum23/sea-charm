'use client';

/* 모든 화면이 같은 머리·발을 쓰도록 한 겹 싸 둔다.
 * 화면이 넷이 되면서, 머리 모양을 고칠 때 네 군데를 고치는 일이 생겼다.
 *
 * 화면 이동 규칙 — 홈을 가운데 둔다 (2026-08-06 제품 결정)
 *
 *        ┌──────── 홈 ────────┐        홈이 갈림길이다.
 *        │  부적 · 판정 · 촬영 │        다른 화면끼리는 서로 안 가리킨다.
 *        │  기록 · 출항/귀항   │
 *        └────────────────────┘
 *
 *  - 홈이 아닌 모든 화면은 **왼쪽 위 같은 자리**에 「‹ 홈」이 있다.
 *    자리가 항상 같아야 눈으로 찾지 않고 손이 먼저 간다.
 *  - 발에는 「다음 한 걸음」 **하나만** 둔다. 하루 순서대로 이어진다 —
 *    부적 → 판정 → 기록. 셋 다 나열하면 어디로 가야 할지 고르게 되고,
 *    그게 「엉켜 있다」는 느낌의 정체였다.
 *  - 그래서 다른 화면으로 갈 때는 항상 홈을 한 번 거친다. 길을 잃을 자리가 없다.
 */

import Link from 'next/link';
import { FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 어종그림정의 } from '@/lib/어종그림';
import { 날짜말 } from '@/lib/저장소';

export default function 화면틀({
  제목,
  날짜,
  안내,
  큰숫자,
  /* 숫자 **앞**에 붙는 말 — 「총」 · 「오늘」 · 「최근 1주일」 */
  큰숫자앞말,
  큰숫자말,
  바닥글,
  /* 홈이면 false. 그 밖에는 왼쪽 위에 「‹ 홈」이 붙는다 */
  홈으로 = true,
  /* 하루 순서상 다음 한 걸음. { 이름, 주소 } 하나만 받는다 */
  다음,
  children,
}) {
  return (
    <FlexBox flexDirection="column" sx={{ minHeight: '100dvh' }}>
      {/* 어종 그림의 색·모양 정의를 화면마다 **한 번만** 깔아둔다.
          여기 있으면 이 틀을 쓰는 네 화면 어디서든 <어종그림 /> 을 그냥 쓸 수 있다.
          눈에 보이지 않는다 — 크기 0 이다 */}
      <어종그림정의 />
      {/* 머리 */}
      <FlexBox
        flexDirection="column"
        gap={2}
        sx={{
          backgroundColor: 색.바탕,
          padding: `calc(env(safe-area-inset-top) + ${크기.여백}px) ${크기.여백}px ${크기.카드여백}px`,
        }}
      >
        {/* 머리 한 줄 — 왼쪽 「‹ 홈」, 오른쪽 「다음 한 걸음」.
            2026-08-06 폰 점검: 왼쪽 위가 비어 보이고, 다음으로 가려면 화면을 끝까지
            내려야 했다. 발에 있는 것과 **같은 곳으로 가는 같은 링크**를 하나 더 둔 것이라
            「어디로 갈지 고르게 되는」 문제(위 주석)는 생기지 않는다. */}
        {(홈으로 || 다음) && (
          <FlexBox justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
            {홈으로 ? (
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Typography sx={{ fontSize: 크기.머리홈, color: 색.흐린글, padding: '2px 0' }}>
                  ‹ 홈
                </Typography>
              </Link>
            ) : (
              <span />
            )}
            {다음 ? (
              <Link href={다음.주소} style={{ textDecoration: 'none' }}>
                <Typography sx={{ fontSize: 크기.머리다음, color: 색.흐린글, padding: '2px 0' }}>
                  {다음.이름} ›
                </Typography>
              </Link>
            ) : (
              <span />
            )}
          </FlexBox>
        )}
        <Typography sx={{ fontSize: 크기.머리날짜, color: 색.흐린글 }}>
          {날짜 ? 날짜말(날짜) : ' '}
        </Typography>
        <Typography weight="bold" sx={{ fontSize: 크기.머리제목, letterSpacing: '-0.01em' }}>
          {제목}
        </Typography>

        {큰숫자 != null ? (
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
        sx={{ flex: 1, width: '100%', maxWidth: 560, margin: '0 auto', padding: 크기.여백 }}
      >
        {children}
      </FlexBox>

      {/* 발 */}
      <FlexBox
        flexDirection="column"
        alignItems="center"
        gap={8}
        sx={{ padding: `12px 20px calc(env(safe-area-inset-bottom) + 12px)` }}
      >
        {바닥글 && (
          <Typography align="center" sx={{ fontSize: 크기.바닥글, color: 색.아주흐린글 }}>
            {바닥글}
          </Typography>
        )}
        {/* 다음 한 걸음 하나만. 여러 개를 늘어놓지 않는다 */}
        {다음 && (
          <Link href={다음.주소} style={{ textDecoration: 'none' }}>
            <Typography sx={{ fontSize: 크기.바닥다음, color: 색.흐린글 }}>{다음.이름} ›</Typography>
          </Link>
        )}
      </FlexBox>
    </FlexBox>
  );
}
