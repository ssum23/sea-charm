'use client';

/* 바다 도장 — 사진 위에 도장을 찍는다.
 *
 * 세 가지를 다 만든다. 어느 것이 맞는지 앉아서 정할 근거가 없어서다
 * (`10_사진구도` 실측 — 눈금이 사진에 나오는 비율이 층마다 5.6% / 19.0% / 0%).
 * 그래서 셋을 넣는 것은 기능이 아니라 **실험**이다. 사용자가 고른 결과가 답이 된다.
 *
 *   A 인증 배지 — 사진 아래에 띠를 깔고 정보를 얹는다. 자를 요구하지 않는다
 *   B 눈금 자국 — 사진 위에 눈금자를 겹쳐 물고기에 맞춘다
 *   C 두 점 재기 — 기준물과 물고기를 각각 두 번 눌러 길이를 역산한다
 *
 * 🔴 반드시 지키는 것
 *  1. 사진을 앱에 저장하지 않는다 (T5 · PRD §4-2). 내보내고 버린다.
 *  2. 판정을 안 거쳐도 찍을 수 있다 (T8). 그때는 판정 칸을 **아예 안 그린다** —
 *     빈칸을 남기면 그 빈칸이 「가져가도 됨」으로 읽힌다.
 *  3. 상세 주소를 절대 찍지 않는다 (PRD §0-5). 시·도까지만. 포인트는 낚시꾼의 자산이다.
 *  4. 외부 요청 0건. 지도도 글꼴도 받아오지 않는다. 글씨는 폰에 있는 글꼴로 그린다.
 *  5. B·C의 눈금·계산값을 판정에 **자동으로 넣지 않는다.** 실측이 아니다.
 *     C는 「이 길이로 판정해볼까요?」라고 묻고 사람이 누른다.
 *  6. 문구는 04_말투가이드_0.3 — 해요체. 느낌표·이모지 없음.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FlexBox, TextField, Typography } from '@montage-ui/core';
import { 크기, 색, 글꼴줄 } from './크기';
import { judge, 메타 } from '@/lib/판정엔진';
import { 읽기, 쓰기 } from '@/lib/저장소';

/* 최근 값을 기억한다 — 같은 배를 또 탄다. 두 번째부터는 누르기만 하면 된다 */
const 배키 = 'seacharm.boat.v1';
const 시도키 = 'seacharm.sido.v1';
/* 도장에 한 줄 더 — 사람이 아무거나 적는다 (2026-08-06 사장님 지시) */
const 메모키 = 'seacharm.stampmemo.v1';
/* 판정 화면에서 도장으로 넘어올 때 쓰는 임시 자리.
   sessionStorage 라서 창을 닫으면 사라진다 — 남겨둘 값이 아니다 */
export const 넘김키 = 'seacharm.stamp-handoff.v1';
/* C 가 어림한 길이를 판정 화면에 넘길 자리.
   🔴 자동으로 판정하지 않는다. 사람이 「이 길이로 판정해볼까요」를 눌렀을 때만 담긴다 */
export const 제안길이키 = 'seacharm.suggest-length.v1';

const 인주 = '#9c3524';

/* 도장 종류 */
const 종류 = [
  { 값: 'A', 이름: '인증 배지', 설명: '사진 아래에 날짜·장소·판정을 얹습니다' },
  { 값: 'C', 이름: '두 점 재기', 설명: '기준물과 물고기를 눌러 길이를 어림합니다' },
  { 값: 'B', 이름: '눈금 자국', 설명: '사진 위에 눈금자를 맞춰 함께 남깁니다' },
];

/* 기준물 — 낚시하는 사람이 사진에 이미 넣고 있는 것들 (10_사진구도 실측: 손 9장·그립 7장) */
const 기준물 = [
  { 이름: '손바닥 폭', cm: 10 },
  { 이름: '한 뼘', cm: 20 },
  { 이름: '담배갑 긴쪽', cm: 8.8 },
  { 이름: '신용카드', cm: 8.6 },
];

function 두자리(n) {
  return n < 10 ? '0' + n : String(n);
}

function 날짜글(d) {
  const 요일 = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}.${두자리(d.getMonth() + 1)}.${두자리(d.getDate())} (${요일})`;
}

function 시각글(d) {
  const h = d.getHours();
  const 오전오후 = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${오전오후} ${hh}:${두자리(d.getMinutes())}`;
}

/* ─────────────────────────────────────────────
   캔버스에 그리기
   ───────────────────────────────────────────── */

/* 내보내는 그림의 가로 크기. 너무 크면 폰에서 합성이 느리다 */
const 최대가로 = 1400;

/* 🔴 2026-08-10 — 폰이 통째로 죽던 진짜 원인 (사장님 「This page couldn't load」)
 *
 * 무엇이 문제였나 —
 * 자를 두 손가락으로 움직이면 손가락 **둘 다** 움직임을 알리므로 초당 백 번 넘게 다시 그린다.
 * 그때마다 이 함수가
 *   ① `cv.width = ...` 로 **캔버스를 새로 만들고**(크기를 넣는 순간 속이 통째로 새로 잡힌다)
 *   ② 아이폰 사진 원본(1200만 화소)을 **매번 줄여서** 다시 그렸다.
 * 이 둘은 한 번은 싼 일이지만 초당 백 번이면 아니다. 메모리가 쌓이다 **사파리가 화면을 죽인다.**
 * 🔴 이건 자바스크립트 오류가 아니라 **화면 담당 프로그램이 통째로 꺼지는 것**이라
 *    오류 울타리로는 못 막는다. 오류가 아니라 죽음이다.
 *
 * 고친 방법 —
 *   · 사진을 **한 번만** 줄여 딴 곳에 담아두고(`줄인사진`), 그다음부터는 그것만 베낀다
 *   · 캔버스 크기는 **달라질 때만** 손댄다. 같은 값을 다시 넣어도 속은 새로 잡힌다
 */
const 줄인사진들 = new WeakMap();

function 줄여두기(이미지) {
  const 있음 = 줄인사진들.get(이미지);
  if (있음) return 있음;
  const 배율 = Math.min(1, 최대가로 / 이미지.naturalWidth);
  const w = Math.max(1, Math.round(이미지.naturalWidth * 배율));
  const h = Math.max(1, Math.round(이미지.naturalHeight * 배율));
  const 작은 = document.createElement('canvas');
  작은.width = w;
  작은.height = h;
  작은.getContext('2d').drawImage(이미지, 0, 0, w, h);
  줄인사진들.set(이미지, 작은);
  return 작은;
}

function 바탕그리기(cv, 이미지) {
  const 작은 = 줄여두기(이미지);
  /* 🔴 같은 값이라도 다시 넣으면 캔버스가 새로 잡힌다. 달라질 때만 넣는다 */
  if (cv.width !== 작은.width) cv.width = 작은.width;
  if (cv.height !== 작은.height) cv.height = 작은.height;
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(작은, 0, 0);
  return ctx;
}

/* 폰에 있는 글꼴만 쓴다. 웹에서 받아오면 「외부 요청 0건」이 깨진다 */
/* 🔴 2026-08-10 — 둥근 네모를 직접 그린다.
 *
 * 전에는 `ctx.roundRect` 를 썼다. 이건 사파리 16.4(2023년 3월)부터 되는 기능이라
 * 그보다 오래된 아이폰에서는 **그 줄에서 오류가 나고 화면이 하얗게 된다.**
 * 배 위에서 쓰는 앱이라 폰이 낡았을 수 있다. 직접 그리면 어디서나 똑같이 된다. */
function 둥근네모(ctx, x, y, w, h, r) {
  const 반 = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + 반, y);
  ctx.lineTo(x + w - 반, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + 반);
  ctx.lineTo(x + w, y + h - 반);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 반, y + h);
  ctx.lineTo(x + 반, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 반);
  ctx.lineTo(x, y + 반);
  ctx.quadraticCurveTo(x, y, x + 반, y);
  ctx.closePath();
}

function 글꼴(크기, 굵게) {
  /* 🔴 2026-08-10 — 화면 글자와 **같은 글꼴**을 쓴다 (`크기.js` 의 `글꼴줄`).
     전에는 도장 글자만 따로 `-apple-system…` 을 써서 앱 글자와 모양이 달랐다. */
  return `${굵게 ? '700' : '400'} ${크기}px ${글꼴줄}`;
}

/* 🔴 2026-08-10 (2) — 배경을 담아둔다 (사장님 「자가 아직 버벅거린다」)
 *
 * 자를 움직일 때마다 **사진 + 도장 띠 + 날짜·장소 글자 + 歸港 인장**을 통째로 다시 그렸다.
 * 그중 **글자 그리기가 제일 비싸다** — 폰에서는 글자 한 줄이 그림 한 장보다 무겁다.
 * 그런데 자를 움직이는 동안 **그 배경은 하나도 안 바뀐다.**
 *
 * 그래서 배경을 딴 곳에 한 번 그려 담아두고, 자를 움직일 때는 **그것만 통째로 베낀다.**
 * 사진이나 날짜·장소가 바뀔 때만 다시 만든다.
 * 🔴 마지막에 나오는 그림은 전과 한 픽셀도 다르지 않다 — 그리는 차례만 바꾼 것이다. */
const 배경담아둔곳 = new WeakMap();

function 배경가져오기(이미지, 정보) {
  const 열쇠 = JSON.stringify(정보);
  const 있음 = 배경담아둔곳.get(이미지);
  if (있음 && 있음.열쇠 === 열쇠) return 있음.판;
  const 작은 = 줄여두기(이미지);
  const 판 = document.createElement('canvas');
  판.width = 작은.width;
  판.height = 작은.height;
  그리기A(판, 이미지, 정보);
  배경담아둔곳.set(이미지, { 열쇠, 판 });
  return 판;
}

/* 담아둔 배경을 화면 캔버스에 깔아준다 */
function 배경깔기(cv, 이미지, 정보) {
  const 판 = 배경가져오기(이미지, 정보);
  if (cv.width !== 판.width) cv.width = 판.width;
  if (cv.height !== 판.height) cv.height = 판.height;
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(판, 0, 0);
  return ctx;
}

/* A — 사진 아래 띠 */
function 그리기A(cv, 이미지, 정보) {
  const ctx = 바탕그리기(cv, 이미지);
  const W = cv.width;
  const H = cv.height;
  const 단 = W / 100; // 사진 크기에 따라 글씨도 같이 커지게

  const 줄들 = [];
  줄들.push({ 글: `${정보.날짜} · ${정보.시각}`, 크기: 단 * 4.2, 굵게: true });
  const 아래 = [정보.시도, 정보.배].filter(Boolean).join(' · ');
  if (아래) 줄들.push({ 글: 아래, 크기: 단 * 3.5, 굵게: false });
  /* 사람이 직접 적은 한 줄 — 시·도와 배 다음에 온다 */
  if (정보.메모) 줄들.push({ 글: 정보.메모, 크기: 단 * 3.2, 굵게: false });

  /* 🔴 판정을 안 거쳤으면 이 줄을 아예 만들지 않는다. 빈칸을 남기지 않는다 */
  if (정보.판정) {
    줄들.push({
      글: [정보.판정.제목, 정보.판정.짜, 정보.판정.결과].filter(Boolean).join(' · '),
      크기: 단 * 3.8,
      굵게: true,
      색: 정보.판정.색,
    });
  }

  const 여백 = 단 * 3.4;
  const 줄간 = 단 * 1.5;
  const 띠높이 = 여백 * 2 + 줄들.reduce((a, l) => a + l.크기 + 줄간, -줄간);
  const 띠위 = H - 띠높이;

  /* 반투명 띠 — 사진이 완전히 가려지지 않게 */
  const 그라 = ctx.createLinearGradient(0, 띠위 - 단 * 2, 0, H);
  그라.addColorStop(0, 'rgba(12,16,22,0)');
  그라.addColorStop(0.25, 'rgba(12,16,22,0.62)');
  그라.addColorStop(1, 'rgba(12,16,22,0.82)');
  ctx.fillStyle = 그라;
  ctx.fillRect(0, 띠위 - 단 * 2, W, 띠높이 + 단 * 2);

  let y = 띠위 + 여백;
  ctx.textBaseline = 'top';
  줄들.forEach((l) => {
    ctx.font = 글꼴(l.크기, l.굵게);
    ctx.fillStyle = l.색 || '#ffffff';
    ctx.fillText(l.글, 여백, y);
    y += l.크기 + 줄간;
  });

  도장찍기_그림(ctx, W - 여백, 띠위 + 띠높이 / 2, 단 * 7);
  return cv;
}

/* 오른쪽 아래 인장 — 歸港 두 자 */
function 도장찍기_그림(ctx, 우, 중심y, 크기) {
  const s = 크기;
  const x = 우 - s;
  const y = 중심y - s / 2;
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.strokeStyle = 인주;
  ctx.fillStyle = 인주;
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = s * 0.075;
  const r = s * 0.1;
  ctx.beginPath();
  둥근네모(ctx, -s / 2, -s / 2, s, s, r);
  ctx.stroke();
  ctx.font = 글꼴(s * 0.34, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('歸', 0, -s * 0.19);
  ctx.fillText('港', 0, s * 0.19);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/* C — 두 점 재기. 누른 자리에 표시를 남기고 어림한 길이를 적는다 */
function 그리기C(cv, 이미지, 정보, 재기) {
  const ctx = 배경깔기(cv, 이미지, 정보);
  const W = cv.width;
  const H = cv.height;
  const 단 = W / 100;

  /* 🔴 2026-08-07 — 점 하나만 찍었을 때 아무것도 안 보이던 것 (사장님 지적)
     전에는 점이 **둘 다 찍혀야** 선을 그렸고, 점 자체도 그 안에서만 그렸다.
     그래서 처음 한 번 눌렀을 때 화면이 그대로여서 **눌린 건지 아닌지 알 수 없었다.**
     이제 점은 찍는 즉시 그린다. 번호(①②)도 같이 붙인다 — 어느 쪽을 먼저 찍었는지 보인다. */
  function 점찍기(점들, 색깔, 이름) {
    if (!점들 || !점들.length) return;
    const 자리 = 점들.map((p) => ({ x: p.x * W, y: p.y * H }));

    ctx.save();
    /* 두 점이 다 있으면 잇는 선 */
    if (자리.length === 2) {
      ctx.strokeStyle = 색깔;
      ctx.lineWidth = 단 * 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(자리[0].x, 자리[0].y);
      ctx.lineTo(자리[1].x, 자리[1].y);
      ctx.stroke();
    }

    /* 점 — 찍는 즉시 보인다. 사진이 밝든 어둡든 보이게 흰 테를 두른다 */
    자리.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 단 * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 색깔;
      ctx.fill();
      ctx.lineWidth = 단 * 0.4;
      ctx.strokeStyle = 'rgba(20,24,30,0.85)';
      ctx.stroke();
      /* 번호 */
      ctx.font = 글꼴(단 * 2.0, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(20,24,30,0.95)';
      ctx.fillText(String(i + 1), c.x, c.y + 단 * 0.05);
    });

    /* 이름표 — 두 점이 다 있을 때만 */
    if (자리.length === 2 && 이름) {
      const mx = (자리[0].x + 자리[1].x) / 2;
      const my = (자리[0].y + 자리[1].y) / 2;
      ctx.font = 글꼴(단 * 2.8, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const w = ctx.measureText(이름).width + 단 * 1.6;
      ctx.fillStyle = 'rgba(12,16,22,0.72)';
      ctx.beginPath();
      둥근네모(ctx, mx - w / 2, my - 단 * 4.4, w, 단 * 3.9, 단 * 0.8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(이름, mx, my - 단 * 0.9);
    }
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  /* 🔴 물고기를 먼저 찍는다 (2026-08-07 사장님 지시) — 그래서 물고기를 먼저 그린다 */
  점찍기(재기.물고기점, '#ffd34d', 재기.어림 ? `약 ${재기.어림}cm` : null);
  점찍기(재기.기준점, 'rgba(255,255,255,0.92)', 재기.기준이름);
  return cv;
}

/* B — 눈금자를 겹친다.
   ★ 이건 「재는 것」이 아니라 「눈금이 보이는 사진을 만드는 것」이다.
      눈금 숫자를 판정에 넣지 않는다.

   🔴 2026-08-07 — 줄자처럼 다시 그렸다 (사장님 지시)
     ① **10cm마다 빨간 선**. 줄자가 그렇게 생겼다. 5cm는 검정, 1cm는 가늘게.
     ② 두께를 조금 키웠다 — 빨간 눈금과 숫자가 같이 들어가야 한다.
     ③ (2차) 양 끝 손잡이는 **뺐다** — 아래를 보라. */

/* 자의 양 끝이 사진 위 어디인지 — 화면과 그림이 같은 계산을 쓴다 */
export function 자양끝(눈금, W, H) {
  const 라디안 = (눈금.각도 * Math.PI) / 180;
  const 반 = (눈금.길이 * W) / 2;
  const cx = 눈금.x * W;
  const cy = 눈금.y * H;
  const dx = Math.cos(라디안) * 반;
  const dy = Math.sin(라디안) * 반;
  return { a: { x: cx - dx, y: cy - dy }, b: { x: cx + dx, y: cy + dy } };
}

/* 🔴 2026-08-10 (4) — 자를 **미리 그려두고 통째로 얹는다** (사장님 「아직도 많이 버벅거린다」)
 *
 * 그때까지 남아 있던 것 —
 * 자 하나를 그리는 데 **선을 61번 따로 그었다**(0~60cm 눈금). 여기에 글자까지 얹었다.
 * 컴퓨터에서는 이게 22ms 였지만 **폰은 선 하나하나가 다 비용**이다.
 * 그리고 자를 옮기거나 돌리는 동안 **자 그림 자체는 하나도 안 바뀐다** — 자리만 바뀐다.
 *
 * 그래서 자를 딴 곳에 **한 번 그려두고**, 화면에는 **통째로 한 번 얹는다.**
 * 옮기기·돌리기는 얹는 자리만 바꾸면 되므로 **선을 다시 그을 일이 없다.**
 * 길이가 바뀔 때만 다시 그리되, 8칸 단위로 끊어 자잘한 다시 그리기를 막는다.
 *
 * 손을 떼면 `빠르게` 가 꺼지고 **숫자까지 넣어 또렷하게** 다시 그린다 — 저장되는 그림은 그것이다.
 */
const 자그려둔곳 = { 열쇠: null, 판: null };

function 자만들기(길이, 두께, 빠르게) {
  const 열쇠 = Math.round(길이 / 8) * 8 + '|' + Math.round(두께) + '|' + (빠르게 ? 'ㅃ' : 'ㄲ');
  if (자그려둔곳.열쇠 === 열쇠 && 자그려둔곳.판) return 자그려둔곳.판;

  const 여백 = Math.ceil(두께 * 1.2);
  const 판 = document.createElement('canvas');
  판.width = Math.max(1, Math.ceil(길이) + 여백 * 2);
  판.height = Math.max(1, Math.ceil(두께) + 여백 * 2);
  const g = 판.getContext('2d');
  const ox = 여백;
  const oy = 여백;

  /* 자 몸통 */
  g.fillStyle = 'rgba(250,248,242,0.55)';
  둥근네모(g, ox, oy, 길이, 두께, 두께 * 0.14);
  g.fill();
  g.strokeStyle = 'rgba(40,44,52,0.22)';
  g.lineWidth = Math.max(1, 두께 * 0.03);
  g.stroke();

  /* 🔴 눈금 — 전에는 61번 따로 그었다. 이제 **빨간 것과 검은 것 두 뭉치**로 모아
     각각 한 번에 긋는다. 그리는 횟수가 61 → 2 로 준다. 모양은 똑같다 */
  const 최대 = 60;
  const 칸 = 길이 / 최대;
  const 빨강 = [];
  const 검정 = [];
  for (let i = 0; i <= 최대; i++) {
    const x = ox + 칸 * i;
    const 열 = i % 10 === 0;
    const 다섯 = i % 5 === 0;
    const h = 열 ? 두께 * 0.56 : 다섯 ? 두께 * 0.36 : 두께 * 0.2;
    (열 ? 빨강 : 검정).push([x, oy, oy + h]);
  }
  const 뭉치긋기 = (칸들, 색, 굵기) => {
    if (!칸들.length) return;
    g.strokeStyle = 색;
    g.lineWidth = Math.max(1, 굵기);
    g.beginPath();
    for (const [x, y0, y1] of 칸들) { g.moveTo(x, y0); g.lineTo(x, y1); }
    g.stroke();
  };
  뭉치긋기(검정, 'rgba(28,32,40,0.8)', 두께 * 0.03);
  뭉치긋기(빨강, 'rgba(200,42,34,0.95)', 두께 * 0.06);

  /* 숫자는 손을 뗐을 때만 — 글자가 제일 비싸다 */
  if (!빠르게) {
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (let i = 0; i <= 최대; i += 5) {
      const x = ox + 칸 * i;
      const 열 = i % 10 === 0;
      const h = 열 ? 두께 * 0.56 : 두께 * 0.36;
      g.fillStyle = 열 ? 'rgba(200,42,34,0.95)' : 'rgba(28,32,40,0.9)';
      g.font = 글꼴(두께 * (열 ? 0.32 : 0.26), 열);
      g.fillText(String(i), x, oy + h + 두께 * 0.03);
    }
  }

  자그려둔곳.열쇠 = 열쇠;
  자그려둔곳.판 = 판;
  자그려둔곳.여백 = 여백;
  return 판;
}

/* 🔴 2026-08-10 (5) — **사진과 자를 아예 떼어놓는다** (사장님 제안)
 *
 * 여기까지 온 길 — 캔버스 새로 잡기를 없애고(51차), 배경을 담아두고(52차),
 * 리액트를 비켜가고(53차), 자를 미리 그려뒀다(56차). **그래도 폰에서는 버벅였다.**
 * 남아 있던 것은 하나다 — **자가 1픽셀 움직일 때마다 사진 위에 다시 얹고 있었다.**
 * 사진이 1400×1050 이면 그것만으로 한 장에 147만 화소를 매번 새로 칠한 셈이다.
 *
 * 이제 자를 **사진 위에 뜬 딴 장**에 그린다. 그리고 옮기기·돌리기·크기는
 * **그림이 아니라 CSS 로** 한다(`transform`). 브라우저는 이걸 화면 담당 장치가 처리해서
 * **다시 칠하는 일이 아예 없다.** 손가락을 아무리 빨리 움직여도 그리는 일은 0이다.
 *
 * 🔴 저장할 때는 원래대로 **한 장에 정확히 다시 그려서** 내보낸다 — 나오는 그림은 전과 같다.
 */
function 자캔버스그리기(자cv, 사진cv, 눈금, 빠르게) {
  const W = 사진cv.width;
  const 단 = W / 100;
  const 길이 = 눈금.길이 * W;
  const 두께 = Math.max(단 * 3.8, 길이 * 0.058);
  const 판 = 자만들기(길이, 두께, !!빠르게);
  if (자cv.width !== 판.width) 자cv.width = 판.width;
  if (자cv.height !== 판.height) 자cv.height = 판.height;
  const g = 자cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 자cv.width, 자cv.height);
  g.drawImage(판, 0, 0);
  return { 길이, 두께, 판너비: 판.width, 판높이: 판.height };
}

/* 자를 어디에 어떻게 얹을지 — CSS 한 줄로 만든다 */
function 자자리(자cv, 사진cv, 눈금) {
  if (!자cv || !사진cv || !사진cv.width) return null;
  const 보임너비 = 사진cv.getBoundingClientRect().width;
  if (!보임너비) return null;
  const 배 = 보임너비 / 사진cv.width;          // 화면에 보이는 크기와 그림 크기의 비
  const 왼 = 눈금.x * 사진cv.width * 배 - (자cv.width * 배) / 2;
  const 위 = 눈금.y * 사진cv.height * 배 - (자cv.height * 배) / 2;
  return {
    width: 자cv.width * 배 + 'px',
    height: 자cv.height * 배 + 'px',
    transform: `translate(${왼}px, ${위}px) rotate(${눈금.각도}deg)`,
  };
}

function 그리기B(cv, 이미지, 정보, 눈금, 빠르게) {
  const ctx = 배경깔기(cv, 이미지, 정보);
  const W = cv.width;
  const H = cv.height;
  const 단 = W / 100;

  const 길이 = 눈금.길이 * W;
  /* 자가 두꺼우면 물고기를 덮는다. 자는 「재는 도구」가 아니라
     「눈금이 같이 찍힌 사진」을 만드는 장치다 — 사진이 주인공이다 */
  const 두께 = Math.max(단 * 3.8, 길이 * 0.058);

  const 판 = 자만들기(길이, 두께, !!빠르게);
  const 여백 = 자그려둔곳.여백;

  ctx.save();
  ctx.translate(눈금.x * W, 눈금.y * H);
  ctx.rotate((눈금.각도 * Math.PI) / 180);
  /* 미리 그려둔 자를 통째로 한 번 얹는다 — 이 한 줄이 전부다 */
  ctx.drawImage(판, -길이 / 2 - 여백, -두께 / 2 - 여백);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  return cv;
}

/* ─────────────────────────────────────────────
   화면
   ───────────────────────────────────────────── */

export default function 도장찍기({ 닫기, 판정 }) {
  const 길잡이 = useRouter();
  const [사진, 사진바꾸기] = useState(null); // { url, 이미지 }
  const [고른종류, 고른종류바꾸기] = useState('A');
  const [시도, 시도바꾸기] = useState('');
  const [배, 배바꾸기] = useState('');
  const [메모, 메모바꾸기] = useState('');
  const [저장됨, 저장됨바꾸기] = useState('');

  /* C — 두 점 재기 */
  /* 🔴 2026-08-07 — 「기준물 지우기가 잘 안 된다」(사장님)
   *   전에는 이 칸이 **숫자만** 담고 있었다. 그래서 지우려고 숫자를 다 지우면
   *   `Number('')` 이 0 이 되어 칸에 **곧바로 「0」이 다시 나타났다.**
   *   지워지지 않는 것처럼 보이고, 그 뒤로 「012」 같은 값이 만들어졌다.
   *   이제 칸은 **사람이 친 글자 그대로** 담는다. 비우면 비어 있는다.
   *   계산에 쓰는 숫자는 여기서 따로 뽑는다. */
  const [기준칸, 기준칸바꾸기] = useState('10');
  const 기준cm = (() => {
    const v = Number(기준칸);
    return Number.isFinite(v) && v > 0 ? v : 0;
  })();
  const [기준이름, 기준이름바꾸기] = useState('손바닥 폭');
  const [기준점, 기준점바꾸기] = useState([]);
  const [물고기점, 물고기점바꾸기] = useState([]);
  /* 🔴 2026-08-07 — **물고기를 먼저 찍는다** (사장님 지적).
     전에는 기준물부터 찍게 했는데, 사람은 물고기를 재려고 이 화면에 들어온다.
     재려는 것을 먼저 찍고, 「그래서 몇 cm냐」를 알기 위해 기준물을 나중에 찍는 게 순서다. */
  const [무엇을찍나, 무엇을찍나바꾸기] = useState('물고기');
  /* 기준물 칸은 접혀 있다가 물고기 두 점을 다 찍으면 저절로 펼쳐진다 */
  const [기준칸열림, 기준칸열림바꾸기] = useState(false);

  /* B — 눈금자 */
  const [눈금, 눈금바꾸기] = useState({ x: 0.5, y: 0.55, 길이: 0.8, 각도: 0 });
  /* 🔴 2026-08-10 (3) — 손으로 끄는 동안에는 화면 부품을 다시 만들지 않는다
   *   (사장님 「슬라이더는 괜찮은데 두 손가락은 너무 버벅거린다」)
   *
   * 왜 슬라이더는 괜찮고 손가락은 느렸나 —
   * 슬라이더는 알림이 드물게 오지만, **두 손가락은 손가락마다** 알림이 와서 초당 백 번이 넘는다.
   * 그때마다 `눈금바꾸기`(리액트 상태 바꾸기)를 불렀고, 리액트는 그때마다
   * **이 화면 부품 전체를 다시 만들었다.** 그림은 이미 한 장에 한 번으로 줄여놨지만
   * **부품 다시 만들기는 그대로 초당 백 번**이었다. 남은 버벅거림은 여기였다.
   *
   * 고친 방법 — 끄는 동안에는 자 값을 **그릇(`눈금손`)에만** 담고 리액트를 안 건드린다.
   * 그림은 그 그릇을 보고 그린다. **손을 떼는 순간 딱 한 번** 리액트에 알린다.
   * 그래야 슬라이더 눈금도 자를 따라와 있다. */
  const 눈금손 = useRef(눈금);

  const 캔버스 = useRef(null);
  const 파일칸 = useRef(null);
  const 미리보기 = useRef(null);

  useEffect(() => {
    시도바꾸기(읽기(시도키, '') || '');
    배바꾸기(읽기(배키, '') || '');
    메모바꾸기(읽기(메모키, '') || '');
  }, []);

  /* 사진은 브라우저 메모리에만 둔다. 창을 닫으면 사라진다 */
  useEffect(() => {
    return () => {
      if (사진?.url) URL.revokeObjectURL(사진.url);
    };
  }, [사진]);

  function 사진골랐을때(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const 이미지 = new Image();
    이미지.onload = () => 사진바꾸기({ url, 이미지 });
    이미지.src = url;
    기준점바꾸기([]);
    물고기점바꾸기([]);
    무엇을찍나바꾸기('물고기');
    기준칸열림바꾸기(false);
    저장됨바꾸기('');
  }

  const 어림 = useMemo(() => {
    if (기준점.length < 2 || 물고기점.length < 2 || !사진) return null;
    const W = 사진.이미지.naturalWidth;
    const H = 사진.이미지.naturalHeight;
    const 길이 = (p) => {
      const dx = (p[1].x - p[0].x) * W;
      const dy = (p[1].y - p[0].y) * H;
      return Math.hypot(dx, dy);
    };
    const 기준픽셀 = 길이(기준점);
    if (기준픽셀 < 4) return null;
    /* 기준 길이 칸이 비어 있으면 계산하지 않는다 — 0cm 로 나누면 엉뚱한 값이 나온다 */
    if (!(기준cm > 0)) return null;
    const cm = (길이(물고기점) / 기준픽셀) * 기준cm;
    /* 🔴 소수점을 쓰지 않는다. 어림수로 보여준다 — 실측이 아니기 때문이다 */
    return Math.round(cm);
  }, [기준점, 물고기점, 기준cm, 사진]);

  const 정보 = useMemo(() => {
    const 이제 = new Date();
    return {
      날짜: 날짜글(이제),
      시각: 시각글(이제),
      시도: 시도,
      배: 배,
      메모: 메모,
      /* 🔴 판정을 안 거쳐 왔으면 null. 캔버스에서 그 줄을 아예 그리지 않는다 */
      판정: 판정
        ? {
            제목: [판정.어종, 판정.길이 != null ? `${판정.길이}${판정.단위 || 'cm'}` : null]
              .filter(Boolean)
              .join(' '),
            짜: 판정.짜 || null,
            결과: 판정.결과,
            색: 판정.단계 === 1 ? '#7ee2a8' : 판정.단계 === 2 ? '#ffd34d' : '#ff9a8b',
          }
        : null,
    };
  }, [시도, 배, 메모, 판정]);

  /* 미리보기 다시 그리기 */
  /* 🔴 2026-08-10 — 그리다 넘어져도 화면이 하얘지지 않게 감싼다.
     그림 한 장 못 그리는 것과 앱이 죽는 것은 무게가 다르다.
     오류가 나면 앞 그림이 그대로 남고, 무슨 오류였는지 아래에 글로 뜬다. */
  const [그림오류, 그림오류바꾸기] = useState('');
  /* 🔴 글꼴은 조각으로 나뉘어 **뒤에서 천천히** 온다(`sw.js`). 캔버스는 화면과 달라서
     글꼴이 늦게 와도 **저절로 다시 그려지지 않는다** — 그러면 도장 글자만 폰 기본 글꼴로 남는다.
     글꼴이 다 오면 한 번 더 그리게 표시를 바꾼다. */
  const [글꼴왔나, 글꼴왔나바꾸기] = useState(false);
  useEffect(() => {
    let 살아있음 = true;
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (살아있음) 글꼴왔나바꾸기(true); });
      }
    } catch (e) {}
    return () => { 살아있음 = false; };
  }, []);
  const 그릴차례 = useRef(0);
  useEffect(() => {
    if (!사진 || !캔버스.current) return;
    /* 🔴 2026-08-10 — 화면 한 장에 한 번만 그린다.
       두 손가락으로 자를 움직이면 손가락 둘 다 움직임을 알려 초당 백 번 넘게 들어온다.
       그때마다 그리면 폰이 못 버틴다. `requestAnimationFrame` 은 화면이 실제로 바뀌는
       때(보통 초당 60번)에 딱 한 번만 부른다 — 중간 것들은 저절로 버려진다. */
    눈금손.current = 눈금;
    /* 글꼴이 새로 왔으면 미리 그려둔 것들을 버린다 — 옛 글꼴로 그려져 있다 */
    if (글꼴왔나) { 자그려둔곳.열쇠 = null; 배경담아둔곳.delete(사진.이미지); }
    if (그릴차례.current) cancelAnimationFrame(그릴차례.current);
    그릴차례.current = requestAnimationFrame(() => {
      그릴차례.current = 0;
      const cv = 캔버스.current;
      if (!cv) return;
      try {
        if (고른종류 === 'A') 그리기A(cv, 사진.이미지, 정보);
        else if (고른종류 === 'C')
          그리기C(cv, 사진.이미지, 정보, { 기준점, 물고기점, 기준이름, 어림 });
        else {
          /* 🔴 B — 사진에는 **자를 안 얹는다.** 사진은 배경만 깔고 끝.
             자는 위에 뜬 딴 장에 그리고, 자리는 CSS 로 맞춘다 */
          배경깔기(cv, 사진.이미지, 정보);
          자맞추기(끄는중.current);
        }
        그림오류바꾸기('');
      } catch (e) {
        그림오류바꾸기((e && e.message) || String(e));
        try { console.error('[도장 그리기]', e); } catch (e2) {}
      }
    });
    return () => {
      if (그릴차례.current) { cancelAnimationFrame(그릴차례.current); 그릴차례.current = 0; }
    };
  }, [사진, 고른종류, 정보, 기준점, 물고기점, 기준이름, 어림, 눈금, 글꼴왔나]);

  function 기억하기() {
    쓰기(시도키, 시도);
    쓰기(배키, 배);
    쓰기(메모키, 메모);
  }

  /* 🔴 저장·보내기 직전에 자를 사진에 **정확히** 한 번 얹는다.
     화면에서는 떼어놨지만 나가는 그림은 전과 똑같아야 한다.
     (끝나면 다시 떼어놓는다 — 안 그러면 자가 두 겹으로 보인다) */
  function 합쳐두기() {
    const cv = 캔버스.current;
    if (!cv || !사진 || 고른종류 !== 'B') return;
    try { 그리기B(cv, 사진.이미지, 정보, 눈금손.current, false); } catch (e) {}
  }
  function 다시떼기() {
    const cv = 캔버스.current;
    if (!cv || !사진 || 고른종류 !== 'B') return;
    try { 배경깔기(cv, 사진.이미지, 정보); 자맞추기(false); } catch (e) {}
  }

  function 내려받기() {
    if (!캔버스.current) return;
    기억하기();
    합쳐두기();
    캔버스.current.toBlob(
      (blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const 이제 = new Date();
        a.href = URL.createObjectURL(blob);
        a.download = `바다도장_${이제.getFullYear()}${두자리(이제.getMonth() + 1)}${두자리(
          이제.getDate(),
        )}_${두자리(이제.getHours())}${두자리(이제.getMinutes())}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        저장됨바꾸기('저장했습니다');
        다시떼기();
      },
      'image/jpeg',
      0.92,
    );
  }

  async function 공유() {
    if (!캔버스.current) return;
    기억하기();
    합쳐두기();
    캔버스.current.toBlob(
      async (blob) => {
        if (!blob) return;
        const f = new File([blob], '바다도장.jpg', { type: 'image/jpeg' });
        if (navigator.canShare?.({ files: [f] })) {
          try {
            await navigator.share({ files: [f] });
            저장됨바꾸기('보냈습니다');
          } catch (e) {
            /* 사용자가 그만둔 것 — 아무 말도 하지 않는다 */
          }
          다시떼기();
        } else {
          내려받기();
        }
      },
      'image/jpeg',
      0.92,
    );
  }

  /* 🔴 2026-08-06 — 누른 자리가 엉뚱한 데 찍히던 것 (사장님 지적)
   *
   * 전에는 **캔버스를 감싼 바깥 상자**를 재서 자리를 계산했다.
   * 그 상자는 캔버스와 크기가 같을 때도 있고 아닐 때도 있다 — 다르면 그만큼 어긋난다.
   * 이제 **캔버스 자체를 재서** 계산한다. 어긋날 자리가 없다.
   *
   * 그리고 화면 밖으로 벗어난 값은 0~1 안으로 잘라 넣는다.
   * 손가락이 가장자리에 살짝 걸치면 1.02 같은 값이 나와 사진 밖에 점이 찍혔다. */
  function 자리계산(e) {
    const cv = 캔버스.current;
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const 자르기 = (v) => Math.min(1, Math.max(0, v));
    return {
      x: 자르기((e.clientX - r.left) / r.width),
      y: 자르기((e.clientY - r.top) / r.height),
    };
  }

  /* C — 미리보기를 눌러 점을 찍는다 */
  function 눌렀을때(e) {
    if (고른종류 !== 'C') return;
    const p = 자리계산(e);
    if (!p) return;
    if (무엇을찍나 === '물고기') {
      const 다음 = 물고기점.length >= 2 ? [p] : [...물고기점, p];
      물고기점바꾸기(다음);
      /* 물고기를 다 찍으면 기준물 차례로 넘어가고, 접혀 있던 칸이 열린다 */
      if (다음.length === 2) {
        무엇을찍나바꾸기('기준');
        기준칸열림바꾸기(true);
      }
    } else {
      기준점바꾸기(기준점.length >= 2 ? [p] : [...기준점, p]);
    }
  }

  /* 마지막에 찍은 점 하나만 지운다 — 잘못 눌렀을 때 처음부터 다시 하지 않아도 된다 */
  /* 마지막에 찍은 점 하나만 지운다 — 잘못 눌렀을 때 처음부터 다시 하지 않아도 된다.
     지우는 순서는 찍은 순서의 반대다: 기준물 → 물고기 */
  function 마지막점지우기() {
    if (무엇을찍나 === '기준' && 기준점.length > 0) {
      기준점바꾸기(기준점.slice(0, -1));
      return;
    }
    if (물고기점.length > 0) {
      물고기점바꾸기(물고기점.slice(0, -1));
      무엇을찍나바꾸기('물고기');
      return;
    }
    무엇을찍나바꾸기('물고기');
  }

  /* 🔴 B — 자를 손으로 다룬다 (2026-08-07 두 번째 개편, 사장님 지시)
   *
   * 지금까지 두 번 틀렸다 —
   *   ① 처음엔 **아무 데나 누르면 자가 그 자리로 순간이동**했다. 스치기만 해도 날아갔다.
   *   ② 그래서 **양 끝에 손잡이**를 달아 끌게 했더니, 사장님 말 — 「끝을 잡고 늘리는
   *      형식은 이상하다」. 맞다. 자를 그렇게 쓰는 앱은 없다.
   *
   * 이제 **지도 앱과 같은 방식**이다. 사람들이 이미 손에 익힌 방식이라 배울 게 없다.
   *   - **손가락 하나** → 자를 끌어 옮긴다 (잡은 지점 그대로. 순간이동 없음)
   *   - **손가락 둘** → 벌리면 길어지고, 오므리면 짧아지고, 비틀면 기울어진다
   *   - 손잡이는 없앴다. 손잡이가 있으면 「저기만 잡아야 하나」로 읽힌다
   *
   * 어떻게 아나 — 화면에 닿아 있는 손가락을 `누른손가락` 에 모아두고 그 수로 가른다.
   * 두 번째 손가락이 닿는 순간의 **거리·각도·자 상태**를 기준점으로 저장해두고,
   * 그 뒤로는 「기준점 대비 얼마나 벌어졌나/돌았나」만 본다.
   */
  const 누른손가락 = useRef(new Map());
  const 한손기준 = useRef(null);
  const 두손기준 = useRef(null);
  /* 손이 자에 닿아 있는 동안인가 — 그동안은 숫자를 건너뛰어 가볍게 그린다 */
  const 끄는중 = useRef(false);
  /* 사진 위에 뜬 딴 장 — 자만 여기 그린다 */
  const 자캔버스 = useRef(null);
  const 그린길이 = useRef(-1);

  function 점px(e) {
    const cv = 캔버스.current;
    const p = 자리계산(e);
    if (!cv || !p) return null;
    return { x: p.x * cv.width, y: p.y * cv.height, W: cv.width, H: cv.height };
  }

  /* 두 손가락 사이의 거리와 각도 */
  function 두손재기() {
    const [a, b] = Array.from(누른손가락.current.values());
    return {
      거리: Math.hypot(a.x - b.x, a.y - b.y),
      각도: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      가운데: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  /* 자를 그리고(필요할 때만) 자리를 잡는다 */
  function 자맞추기(빠르게) {
    const 자cv = 자캔버스.current;
    const 사진cv = 캔버스.current;
    if (!자cv || !사진cv || !사진cv.width) return;
    자캔버스그리기(자cv, 사진cv, 눈금손.current, 빠르게);
    자리잡기();
  }

  /* 🔴 여기가 이번 고침의 핵심 — 옮기기·돌리기는 **CSS 한 줄**로만 한다.
     그림을 다시 그리는 일이 **아예 없다.** 손가락이 아무리 빨라도 비용이 안 는다. */
  function 자리잡기() {
    const 자cv = 자캔버스.current;
    const 사진cv = 캔버스.current;
    const 자리 = 자자리(자cv, 사진cv, 눈금손.current);
    if (!자리) return;
    자cv.style.width = 자리.width;
    자cv.style.height = 자리.height;
    자cv.style.transform = 자리.transform;
  }

  /* 끄는 동안 — 자리만 바꾼다. 그리기는 안 한다 */
  function 손으로그리기() {
    if (그릴차례.current) return;
    그릴차례.current = requestAnimationFrame(() => {
      그릴차례.current = 0;
      /* 길이가 눈에 띄게 바뀌었을 때만 자를 다시 그린다. 그 밖에는 자리만 */
      const 사진cv = 캔버스.current;
      if (!사진cv || !사진cv.width) return;
      const 이번길이 = Math.round((눈금손.current.길이 * 사진cv.width) / 8) * 8;
      if (이번길이 !== 그린길이.current) {
        그린길이.current = 이번길이;
        try { 자맞추기(true); return; } catch (e) {}
      }
      자리잡기();
    });
  }

  function 끌기시작(e) {
    if (고른종류 !== 'B') return;
    const p = 점px(e);
    if (!p) return;
    누른손가락.current.set(e.pointerId, p);
    끄는중.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}

    if (누른손가락.current.size === 1) {
      /* 잡은 지점과 자 가운데의 거리를 기억해 둔다 = 순간이동하지 않는다 */
      한손기준.current = { dx: p.x - 눈금손.current.x * p.W, dy: p.y - 눈금손.current.y * p.H };
      두손기준.current = null;
    } else if (누른손가락.current.size === 2) {
      const m = 두손재기();
      두손기준.current = { ...m, 길이: 눈금손.current.길이, 각도자: 눈금손.current.각도, x: 눈금손.current.x, y: 눈금손.current.y };
      한손기준.current = null;
    }
  }

  function 끄는동안(e) {
    if (고른종류 !== 'B') return;
    if (!누른손가락.current.has(e.pointerId)) return;
    const p = 점px(e);
    if (!p) return;
    누른손가락.current.set(e.pointerId, p);

    /* ── 손가락 둘 — 크기와 기울기 ── */
    if (누른손가락.current.size >= 2 && 두손기준.current) {
      const 지금 = 두손재기();
      const 기준 = 두손기준.current;
      if (기준.거리 < 1) return;
      const 배 = 지금.거리 / 기준.거리;
      const 돈각 = 지금.각도 - 기준.각도;
      /* 두 손가락 가운데가 움직인 만큼 자도 따라 옮긴다 — 손에 붙어 있는 느낌이 난다 */
      const 옮김x = 지금.가운데.x - 기준.가운데.x;
      const 옮김y = 지금.가운데.y - 기준.가운데.y;
      눈금손.current = {
        x: Math.min(1, Math.max(0, 기준.x + 옮김x / p.W)),
        y: Math.min(1, Math.max(0, 기준.y + 옮김y / p.H)),
        길이: Math.min(1.8, Math.max(0.15, 기준.길이 * 배)),
        각도: Math.round(((기준.각도자 + 돈각 + 540) % 360) - 180),
      };
      손으로그리기();
      return;
    }

    /* ── 손가락 하나 — 옮기기 ── */
    if (누른손가락.current.size === 1) {
      /* 🔴 2026-08-10 — 그릇을 **먼저 꺼내 놓고** 쓴다 (`null is not an object` 사고)
       *
       * 52차에는 이 자리에서 `눈금바꾸기((전) => ... 한손기준.current.dx ...)` 를 썼다.
       * 리액트는 그 안의 함수를 **바로 돌리지 않고 나중에** 돌린다. 그 「나중」 사이에
       * **두 번째 손가락이 닿아 `한손기준.current` 를 비워버리면**, 리액트가 뒤늦게
       * 그 함수를 돌릴 때 **없는 것에서 `dx` 를 꺼내다 넘어졌다.**
       * 앞에서 `한손기준.current` 가 있는지 봤는데도 소용이 없었다 — **볼 때와 쓸 때가 달랐다.**
       *
       * 그래서 규칙을 하나 둔다 — **그릇(ref) 은 먼저 이름에 담아 놓고, 그 이름만 쓴다.**
       * 담는 순간과 쓰는 순간 사이에 아무 일도 끼어들 수 없다. */
      const 기준 = 한손기준.current;
      if (!기준) return;
      눈금손.current = {
        ...눈금손.current,
        x: Math.min(1, Math.max(0, (p.x - 기준.dx) / p.W)),
        y: Math.min(1, Math.max(0, (p.y - 기준.dy) / p.H)),
      };
      손으로그리기();
    }
  }

  function 끌기끝(e) {
    if (e && e.pointerId != null) 누른손가락.current.delete(e.pointerId);
    else 누른손가락.current.clear();
    두손기준.current = null;
    /* 두 손가락 중 하나만 떼면 남은 하나로 계속 옮길 수 있게 기준을 다시 잡는다 */
    if (누른손가락.current.size === 1) {
      const cv = 캔버스.current;
      const [남은] = Array.from(누른손가락.current.values());
      if (cv && 남은) 한손기준.current = { dx: 남은.x - 눈금손.current.x * cv.width, dy: 남은.y - 눈금손.current.y * cv.height };
    } else {
      한손기준.current = null;
    }
    /* 손이 다 떨어지면 그때 한 번만 리액트에 알린다 —
       그 한 번이 다시 그리기(숫자까지)와 슬라이더 눈금 맞추기를 같이 한다 */
    if (누른손가락.current.size === 0) {
      끄는중.current = false;
      눈금바꾸기(눈금손.current);
    }
  }

  return (
    <FlexBox flexDirection="column" gap={크기.사이}>
      {/* ── 1. 사진 넣기 ── */}
      {!사진 ? (
        <Card sx={카드}>
          <Typography weight="bold" sx={{ fontSize: 크기.도장제목 }}>
            바다 도장
          </Typography>
          <Typography sx={{ fontSize: 크기.도장보조, color: 색.흐린글, lineHeight: 1.7 }}>
            물고기를 찍으면 날짜와 장소등 정보를 얹어 한 장으로 만들어 드려요.
            <br />
            <b style={{ color: 색.글 }}>사진은 이 앱에 저장되지 않습니다.</b> 
          </Typography>
          <input
            ref={파일칸}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={사진골랐을때}
            style={{ display: 'none' }}
          />
          <Button
            variant="solid"
            color="primary"
            size="large"
            fullWidth
            onClick={() => 파일칸.current?.click()}
            sx={버튼}
          >
            사진 찍기
          </Button>
          <Button
            variant="outlined"
            color="assistive"
            size="large"
            fullWidth
            onClick={닫기}
            sx={{ ...버튼, fontSize: 크기.도장본문, fontWeight: 500, color: 색.흐린글 }}
          >
            그만두기
          </Button>
        </Card>
      ) : (
        <>
          {/* ── 2. 미리보기 ── */}
          <Card sx={{ ...카드, padding: 12, gap: 10 }}>
            <div
              ref={미리보기}
              onClick={눌렀을때}
              onPointerDown={끌기시작}
              onPointerMove={끄는동안}
              onPointerUp={끌기끝}
              onPointerCancel={끌기끝}
              onPointerLeave={끌기끝}
              style={{
                position: 'relative',
                lineHeight: 0,
                borderRadius: 12,
                overflow: 'hidden',
                touchAction: 고른종류 === 'B' ? 'none' : 'auto',
                cursor: 고른종류 === 'C' ? 'crosshair' : 고른종류 === 'B' ? 'grab' : 'default',
              }}
            >
              <canvas ref={캔버스} style={{ width: '100%', height: 'auto', display: 'block' }} />
              {/* 🔴 자만 뜨는 딴 장. 손가락은 밑에 있는 상자가 받는다(`pointerEvents: none`).
                  `transformOrigin` 을 가운데로 두어야 자 한가운데를 축으로 돈다.
                  `willChange` 는 브라우저에게 「이건 자주 움직인다」고 미리 알리는 것이다 */}
              <canvas
                ref={자캔버스}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  display: 고른종류 === 'B' ? 'block' : 'none',
                  pointerEvents: 'none',
                  transformOrigin: 'center center',
                  willChange: 'transform',
                }}
              />
            </div>

            {그림오류 && (
              <div style={{ fontSize: 12, color: 색.안됨, lineHeight: 1.6, padding: '0 2px' }}>
                그림을 그리다 걸렸어요. 아래 글자를 그대로 알려주시면 고칠 수 있습니다.
                <br />
                <b>{그림오류}</b>
              </div>
            )}

            {/* 종류 고르기 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {종류.map((t) => {
                const 켜짐 = 고른종류 === t.값;
                return (
                  <button
                    key={t.값}
                    type="button"
                    onClick={() => 고른종류바꾸기(t.값)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 10,
                      fontFamily: 'inherit',
                      fontSize: 크기.도장설명,
                      fontWeight: 켜짐 ? 700 : 500,
                      cursor: 'pointer',
                      border: `1px solid ${켜짐 ? 'transparent' : 색.선}`,
                      background: 켜짐 ? 색.반전바탕 : 'transparent',
                      color: 켜짐 ? 색.반전글 : 색.흐린글,
                    }}
                  >
                    {t.이름}
                  </button>
                );
              })}
            </div>
            <Typography sx={{ fontSize: 크기.도장작게, color: 색.아주흐린글, lineHeight: 1.6 }}>
              {종류.find((t) => t.값 === 고른종류)?.설명}
            </Typography>
          </Card>

          {/* ── 3. 종류별 조작 ── */}
          {고른종류 === 'C' && (
            <Card sx={카드}>
              <Typography weight="bold" sx={{ fontSize: 크기.도장보조, color: 색.흐린글 }}>
                두 점 재기
              </Typography>

              {/* ── ① 물고기 먼저 ──────────────────────────────
                  🔴 2026-08-07 — 순서를 뒤집었다 (사장님 지적).
                  사람은 **물고기를 재려고** 이 화면에 들어온다. 재려는 것을 먼저 찍는다.
                  기준물은 「그래서 몇 cm냐」를 알기 위한 자일 뿐이라 나중이다. */}
              <FlexBox flexDirection="column" gap={4}>
                <Typography sx={{ fontSize: 크기.도장보조, color: 색.글, lineHeight: 1.7 }}>
                  <b>① 물고기</b>의 머리와 꼬리를 눌러주세요{' '}
                  <span style={{ color: 색.흐린글 }}>({물고기점.length}/2)</span>
                </Typography>
                <Typography sx={{ fontSize: 크기.도장보조, color: 물고기점.length === 2 ? 색.글 : 색.아주흐린글, lineHeight: 1.7 }}>
                  <b>② 기준이 될 물건</b>의 양 끝을 눌러주세요{' '}
                  <span style={{ color: 색.흐린글 }}>({기준점.length}/2)</span>
                </Typography>
                {어림 != null && (
                  <Typography weight="bold" sx={{ fontSize: 크기.도장묶음, marginTop: 2 }}>
                    약 {어림}cm
                  </Typography>
                )}
                {(기준점.length > 0 || 물고기점.length > 0) && (
                  <button
                    type="button"
                    onClick={마지막점지우기}
                    style={{
                      alignSelf: 'flex-start',
                      border: 'none',
                      background: 'transparent',
                      padding: '4px 0',
                      fontFamily: 'inherit',
                      fontSize: 크기.도장설명,
                      color: 색.흐린글,
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      cursor: 'pointer',
                    }}
                  >
                    방금 찍은 점 지우기
                  </button>
                )}
              </FlexBox>

              {/* ── ② 기준물 — 접어둔다 ────────────────────────
                  🔴 사장님 「기준물 점찍기가 있는 건 좋은데 좀 방해되는 것 같기도 하다」.
                  없앨 수는 없다(이게 없으면 cm 를 못 낸다). 대신 **처음엔 접어두고**,
                  물고기 두 점을 다 찍으면 그때 저절로 펼쳐진다. */}
              {!기준칸열림 ? (
                <button
                  type="button"
                  onClick={() => 기준칸열림바꾸기(true)}
                  style={{
                    alignSelf: 'flex-start', border: 'none', background: 'transparent',
                    padding: '2px 0', fontFamily: 'inherit', fontSize: 크기.도장설명,
                    color: 색.흐린글, textDecoration: 'underline', textUnderlineOffset: 3,
                    cursor: 'pointer',
                  }}
                >
                  기준이 될 물건 고르기 ▾
                </button>
              ) : (
                <FlexBox flexDirection="column" gap={크기.사이}>
                  <Typography sx={{ fontSize: 크기.도장작게, color: 색.주의, lineHeight: 1.7 }}>
                    기준물과 물고기가 <b>같은 바닥에 놓여 있어야</b> 맞아요.
                    {/* 🔴 2026-08-10 (사장님 물음 「기준물이 없으면?」)
                        기준물을 안 찍으면 길이가 아예 안 나온다. 점 두 개만 남는다.
                        그걸 다 찍고 나서 알면 늦다 — 미리 알려준다. */}
                    <br />
                    사진에 <b>기준물이 안 나왔으면 길이는 안 나옵니다.</b> 점만 남습니다.
                    다음부터는 <b>손이나 지갑을 물고기 옆에 같이</b> 찍어주세요.
                  </Typography>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                    {기준물.map((k) => {
                      const 켜짐 = 기준이름 === k.이름;
                      return (
                        <button
                          key={k.이름}
                          type="button"
                          /* 한 번 더 누르면 선택이 풀린다. 숫자도 같이 비운다 —
                             풀었는데 숫자가 남아 있으면 「안 지워졌다」로 보인다 */
                          onClick={() => {
                            if (켜짐) {
                              기준이름바꾸기('기준물');
                              기준칸바꾸기('');
                              return;
                            }
                            기준이름바꾸기(k.이름);
                            기준칸바꾸기(String(k.cm));
                          }}
                          style={{
                            padding: '10px 6px',
                            borderRadius: 10,
                            fontFamily: 'inherit',
                            fontSize: 크기.도장설명,
                            fontWeight: 켜짐 ? 700 : 500,
                            cursor: 'pointer',
                            border: `1px solid ${켜짐 ? 'transparent' : 색.선}`,
                            background: 켜짐 ? 색.반전바탕 : 'transparent',
                            color: 켜짐 ? 색.반전글 : 색.흐린글,
                          }}
                        >
                          {k.이름} {k.cm}cm
                        </button>
                      );
                    })}
                  </div>

                  <FlexBox alignItems="center" gap={9}>
                    <Typography sx={{ fontSize: 크기.도장작게, color: 색.흐린글 }}>직접 넣기</Typography>
                    <TextField
                      value={기준칸}
                      inputMode="decimal"
                      placeholder="숫자"
                      onChange={(e) => {
                        /* 숫자·점만 받는다. 비우는 것도 그대로 둔다 */
                        const 글 = e.target.value.replace(/[^0-9.]/g, '');
                        기준칸바꾸기(글);
                        기준이름바꾸기('기준물');
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Typography sx={{ fontSize: 크기.도장작게, color: 색.흐린글 }}>cm</Typography>
                    {기준칸 !== '' && (
                      <button
                        type="button"
                        aria-label="기준 길이 지우기"
                        onClick={() => {
                          기준칸바꾸기('');
                          기준이름바꾸기('기준물');
                        }}
                        style={{
                          width: 34, height: 34, borderRadius: 17, flex: '0 0 auto',
                          border: `1px solid ${색.선}`, background: 'transparent',
                          color: 색.흐린글, fontFamily: 'inherit', fontSize: 16, cursor: 'pointer',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </FlexBox>
                </FlexBox>
              )}

              <FlexBox gap={8}>
                <Button
                  variant="outlined"
                  color="assistive"
                  size="large"
                  fullWidth
                  onClick={() => {
                    기준점바꾸기([]);
                    물고기점바꾸기([]);
                    무엇을찍나바꾸기('물고기');
                    기준칸열림바꾸기(false);
                  }}
                  sx={{ ...버튼, height: 46, fontSize: 크기.도장보조, fontWeight: 500 }}
                >
                  다시 찍기
                </Button>
                {어림 != null && (
                  <Button
                    variant="outlined"
                    color="assistive"
                    size="large"
                    fullWidth
                    onClick={() => {
                      /* 🔴 자동으로 판정에 넣지 않는다. 사람이 눌러야 넘어간다 */
                      쓰기(제안길이키, 어림);
                      길잡이.push('/catch');
                    }}
                    sx={{ ...버튼, height: 46, fontSize: 크기.도장보조, fontWeight: 700 }}
                  >
                    이 길이로 판정해볼까요
                  </Button>
                )}
              </FlexBox>
            </Card>
          )}

          {고른종류 === 'B' && (
            <Card sx={카드}>
              <Typography weight="bold" sx={{ fontSize: 크기.도장보조, color: 색.흐린글 }}>
                눈금 자국
              </Typography>
              <Typography sx={{ fontSize: 크기.도장작게, color: 색.아주흐린글, lineHeight: 1.7 }}>
                <b style={{ color: 색.흐린글 }}>손가락 하나로 끌면 옮겨지고, 두 손가락으로 벌리면 길어집니다.</b>{' '}
                비틀면 기울어져요. 이 눈금은 사진에 남기는 표시일 뿐이고 판정에는 쓰지 않습니다.
              </Typography>
              {/* 🔴 손잡이(막대)는 「미세 조정」으로만 남긴다.
                  좌우·위아래는 손으로 끄는 편이 훨씬 빠르므로 없앴다 —
                  같은 일을 하는 길이 둘이면 눈이 헤맨다 */}
              <손잡이 이름="길이" 값={눈금.길이} 최소={0.15} 최대={1.6} 걸음={0.005}
                바꾸기={(v) => 눈금바꾸기({ ...눈금, 길이: v })} />
              <손잡이 이름="기울기" 값={눈금.각도} 최소={-180} 최대={180} 걸음={1}
                바꾸기={(v) => 눈금바꾸기({ ...눈금, 각도: v })} />
              <button
                type="button"
                onClick={() => 눈금바꾸기({ x: 0.5, y: 0.55, 길이: 0.8, 각도: 0 })}
                style={{
                  alignSelf: 'flex-start', border: 'none', background: 'transparent',
                  padding: '4px 0', fontFamily: 'inherit', fontSize: 크기.도장설명,
                  color: 색.흐린글, textDecoration: 'underline', textUnderlineOffset: 3,
                  cursor: 'pointer',
                }}
              >
                자 자리 되돌리기
              </button>
            </Card>
          )}

          {/* ── 4. 정보 ── */}
          <Card sx={카드}>
            <Typography weight="bold" sx={{ fontSize: 크기.도장보조, color: 색.흐린글 }}>
              도장에 넣을 것
            </Typography>
            <Typography sx={{ fontSize: 크기.도장작게, color: 색.아주흐린글, lineHeight: 1.7 }}>
              비워도 도장은 찍힙니다.{' '}
              <b style={{ color: 색.흐린글 }}>상세 주소는 넣지 않습니다 — 포인트는 그 사람 것입니다.</b>
            </Typography>

            <FlexBox flexWrap="wrap" gap={6}>
              {(메타.시도목록 || []).map((s) => {
                const 켜짐 = 시도 === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => 시도바꾸기(켜짐 ? '' : s)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      fontFamily: 'inherit',
                      fontSize: 크기.도장설명,
                      fontWeight: 켜짐 ? 700 : 500,
                      cursor: 'pointer',
                      border: `1px solid ${켜짐 ? 'transparent' : 색.선}`,
                      background: 켜짐 ? 색.반전바탕 : 'transparent',
                      color: 켜짐 ? 색.반전글 : 색.흐린글,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </FlexBox>

            <TextField
              value={배}
              placeholder="대박호 · 안흥항"
              onChange={(e) => 배바꾸기(e.target.value)}
            />

            {/* 🔴 자유롭게 적는 칸 (2026-08-06 사장님 지시).
                시·도와 배 다음 줄에 그대로 찍힌다.
                🔴 상세 주소는 여기에도 적지 않는 게 좋다 — PRD §0-5(포인트 비공개) */}
            <TextField
              value={메모}
              placeholder="한마디 — 첫 출조 · 아들과 함께"
              onChange={(e) => 메모바꾸기(e.target.value)}
            />

            {판정 ? (
              <FlexBox
                flexDirection="column"
                gap={2}
                sx={{ background: 'var(--semantic-fill-alternative)', borderRadius: 11, padding: '12px 14px' }}
              >
                <Typography sx={{ fontSize: 크기.도장작게, color: 색.아주흐린글 }}>판정 결과</Typography>
                <Typography weight="bold" sx={{ fontSize: 크기.도장본문 }}>
                  {[정보.판정.제목, 정보.판정.짜, 정보.판정.결과].filter(Boolean).join(' · ')}
                </Typography>
              </FlexBox>
            ) : (
              <Typography sx={{ fontSize: 크기.도장작게, color: 색.아주흐린글, lineHeight: 1.7 }}>
                판정을 거치지 않고 찍었으니 <b style={{ color: 색.흐린글 }}>판정 칸은 넣지 않습니다.</b>{' '}
                빈칸을 남기면 「가져가도 됨」으로 읽힐 수 있어서예요.
              </Typography>
            )}
          </Card>

          {/* ── 5. 내보내기 ── */}
          <Card sx={카드}>
            <Button variant="solid" size="large" fullWidth onClick={공유}
              sx={{ ...버튼, backgroundColor: 색.반전바탕, color: 색.반전글 }}>
              {저장됨 || '사진첩에 저장 · 보내기'}
            </Button>
            <Button variant="outlined" color="assistive" size="large" fullWidth
              onClick={() => 파일칸.current?.click()}
              sx={{ ...버튼, fontSize: 크기.도장본문, fontWeight: 500 }}>
              다시 찍기
            </Button>
            <input
              ref={파일칸}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={사진골랐을때}
              style={{ display: 'none' }}
            />
            <Button variant="outlined" color="assistive" size="large" fullWidth onClick={닫기}
              sx={{ ...버튼, fontSize: 크기.도장본문, fontWeight: 500, color: 색.흐린글, border: 'none' }}>
              닫기
            </Button>
          </Card>
        </>
      )}
    </FlexBox>
  );
}

function 손잡이({ 이름, 값, 최소, 최대, 걸음, 바꾸기 }) {
  return (
    <FlexBox alignItems="center" gap={10}>
      <Typography sx={{ fontSize: 크기.도장작게, color: 색.흐린글, width: 44, flex: '0 0 auto' }}>
        {이름}
      </Typography>
      <input
        type="range"
        min={최소}
        max={최대}
        step={걸음}
        value={값}
        onChange={(e) => 바꾸기(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--semantic-primary-normal)' }}
      />
    </FlexBox>
  );
}

const 카드 = {
  backgroundColor: 색.바탕,
  borderRadius: 18,
  padding: 크기.여백,
  gap: 12,
  boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
};

const 버튼 = {
  height: 크기.도장버튼높이,
  fontSize: 크기.도장버튼글씨,
  fontWeight: 700,
  borderRadius: 크기.버튼둥글기,
};
