'use client';

/* 모든 화면이 같은 머리·발을 쓰도록 한 겹 싸 둔다.
 * 화면이 넷이 되면서, 머리 모양을 고칠 때 네 군데를 고치는 일이 생겼다.
 */

import Link from 'next/link';
import { FlexBox, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { 날짜말 } from '@/lib/저장소';

export default function 화면틀({ 제목, 날짜, 안내, 큰숫자, 큰숫자말, 바닥글, 이동 = [], children }) {
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
          {날짜 ? 날짜말(날짜) : ' '}
        </Typography>
        <Typography weight="bold" sx={{ fontSize: 크기.큰제목, letterSpacing: '-0.01em' }}>
          {제목}
        </Typography>

        {큰숫자 != null ? (
          <FlexBox alignItems="baseline" gap={8} sx={{ marginTop: 8 }}>
            <Typography weight="bold" sx={{ fontSize: 46, lineHeight: 1, color: 색.주 }}>
              {큰숫자}
            </Typography>
            <Typography sx={{ fontSize: 크기.본문, color: 색.흐린글 }}>{큰숫자말}</Typography>
          </FlexBox>
        ) : 안내 ? (
          <Typography sx={{ fontSize: 크기.보조, color: 색.흐린글, marginTop: 6 }}>{안내}</Typography>
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
        gap={12}
        sx={{ padding: `16px 20px calc(env(safe-area-inset-bottom) + 16px)` }}
      >
        {바닥글 && (
          <Typography align="center" sx={{ fontSize: 크기.작게, color: 색.아주흐린글 }}>
            {바닥글}
          </Typography>
        )}
        {이동.length > 0 && (
          <FlexBox flexWrap="wrap" justifyContent="center" gap={16}>
            {이동.map((m) => (
              <Link key={m.주소} href={m.주소} style={{ textDecoration: 'none' }}>
                <Typography sx={{ fontSize: 크기.보조, color: 색.흐린글 }}>{m.이름} ›</Typography>
              </Link>
            ))}
          </FlexBox>
        )}
      </FlexBox>
    </FlexBox>
  );
}
