'use client';

/* 바다 도장 — 사진 위에 도장을 찍는다.
 *
 * 세 가지를 다 만든다. 어느 것이 맞는지 앉아서 정할 근거가 없어서다
 * (`10_사진구도` 실측 — 눈금이 사진에 나오는 비율이 층마다 5.6% / 19.0% / 0%).
 * 그래서 셋을 넣는 것은 기능이 아니라 **실험**이다. 사용자가 고른 결과가 답이 된다.
 *
 *   A 인증 배지 — 사진 아래에 띠를 깔고 정보를 얹는다. 자를 요구하지 않는다
 *   ~~B 눈금 자국~~ — 🔴 **2026-08-13 내렸다(사장님 결정). 코드도 지웠다.**
 *       🔵 되살리려면 `git show 5c5e104:web/components/도장찍기.js` — 거기 다 있다.
 *       폰에서 손을 따라오지 않고 버벅거리는 것을 **여덟 번 고쳤는데 여덟 번 다 부족했다.**
 *       컴퓨터에서는 22ms 로 빨랐고 숫자로 재봐도 셈은 맞았다(따라옴 0.241 · 늘임 1.00).
 *       🔵 **고치는 데 쓴 시간이 이 기능이 주는 값보다 커졌다.** 그래서 뺀다.
 *       깃 기록에 그대로 남아 있으므로 되살릴 수는 있다.
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
import 아이콘 from './아이콘';
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
  /* 🔴 2026-08-14 — 이름을 사람 말로 바꿨다.
     「인증 배지」·「두 점 재기」는 만든 사람의 말이지 쓰는 사람의 말이 아니다 */
  { 값: 'A', 이름: '정보 얹기', 설명: '사진 아래에 날짜·장소·판정을 얹습니다' },
  { 값: 'C', 이름: '길이 재기', 설명: '기준물과 물고기를 눌러 길이를 어림합니다' },
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

/* ─────────────────────────────────────────────
   화면
   ───────────────────────────────────────────── */

export default function 도장찍기({ 닫기, 판정 }) {
  const 길잡이 = useRouter();
  const [사진, 사진바꾸기] = useState(null); // { url, 이미지 }
  /* 🔴 2026-08-13 고침 — 사진에 찍히는 시각이 「사진을 고른 때」가 아니라
     「정보 칸을 마지막으로 고친 때」였다. `정보` 안에서 그때그때 `new Date()` 를
     불렀기 때문이다. 사진을 넣고 한참 뒤에 배 이름을 고치면 시각이 그때로 밀렸다.
     이제 사진을 고르는 순간의 시각을 여기 붙잡아 두고, 그것만 쓴다. */
  const [찍은때, 찍은때바꾸기] = useState(null);
  const [고른종류, 고른종류바꾸기] = useState('A');
  const [시도, 시도바꾸기] = useState('');
  const [배, 배바꾸기] = useState('');
  const [메모, 메모바꾸기] = useState('');
  const [저장됨, 저장됨바꾸기] = useState('');
  /* 🔴 2026-08-14 — 저장이 끝났는지. 전에는 **버튼 글자만** 「저장했습니다」로 바뀌어
     됐는지 안 됐는지 잘 안 보였다. 이제 화면 하나가 통째로 바뀐다 */
  const [저장끝, 저장끝바꾸기] = useState(false);

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
    찍은때바꾸기(new Date());
    기준점바꾸기([]);
    물고기점바꾸기([]);
    무엇을찍나바꾸기('물고기');
    기준칸열림바꾸기(false);
    저장됨바꾸기('');
    저장끝바꾸기(false);
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
    /* 🔴 사진을 고른 때. 아직 사진이 없으면(첫 그림) 지금 시각을 쓴다 */
    const 이제 = 찍은때 || new Date();
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
  }, [시도, 배, 메모, 판정, 찍은때]);

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
    /* 글꼴이 새로 왔으면 미리 그려둔 것들을 버린다 — 옛 글꼴로 그려져 있다 */
    if (글꼴왔나) 배경담아둔곳.delete(사진.이미지);
    if (그릴차례.current) cancelAnimationFrame(그릴차례.current);
    그릴차례.current = requestAnimationFrame(() => {
      그릴차례.current = 0;
      const cv = 캔버스.current;
      if (!cv) return;
      try {
        if (고른종류 === 'C')
          그리기C(cv, 사진.이미지, 정보, { 기준점, 물고기점, 기준이름, 어림 });
        else 그리기A(cv, 사진.이미지, 정보);
        그림오류바꾸기('');
      } catch (e) {
        그림오류바꾸기((e && e.message) || String(e));
        try { console.error('[도장 그리기]', e); } catch (e2) {}
      }
    });
    return () => {
      if (그릴차례.current) { cancelAnimationFrame(그릴차례.current); 그릴차례.current = 0; }
    };
  }, [사진, 고른종류, 정보, 기준점, 물고기점, 기준이름, 어림, 글꼴왔나]);

  function 기억하기() {
    쓰기(시도키, 시도);
    쓰기(배키, 배);
    쓰기(메모키, 메모);
  }


  function 내려받기() {
    if (!캔버스.current) return;
    기억하기();
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
        저장됨바꾸기('사진첩에 저장했어요');
        저장끝바꾸기(true);
          },
      'image/jpeg',
      0.92,
    );
  }

  async function 공유() {
    if (!캔버스.current) return;
    기억하기();
    캔버스.current.toBlob(
      async (blob) => {
        if (!blob) return;
        const f = new File([blob], '바다도장.jpg', { type: 'image/jpeg' });
        if (navigator.canShare?.({ files: [f] })) {
          try {
            await navigator.share({ files: [f] });
            저장됨바꾸기('보냈습니다');
            저장끝바꾸기(true);
          } catch (e) {
            /* 사용자가 그만둔 것 — 아무 말도 하지 않는다 */
          }
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
  function 자리계산(e, 담아둔사각형) {
    const cv = 캔버스.current;
    if (!cv) return null;
    /* 🔴 2026-08-10 (7) — 끄는 동안에는 **화면을 다시 재지 않는다.**
     *
     * 이 줄이 마지막까지 남아 있던 버벅거림의 진짜 자리였다.
     * `getBoundingClientRect()` 는 브라우저에게 **「지금 이게 화면 어디에 몇 픽셀로 있냐」**를
     * 묻는 것이고, 브라우저는 답하려고 **하던 계산을 그 자리에서 다 끝내야 한다.**
     * 손가락 알림마다 물었으니 600번 움직이면 **600번** 강제로 계산했다.
     * 그림을 아무리 안 그려도 이건 그대로 남는다.
     *
     * 끄는 동안에는 화면이 안 움직인다(가로 넘김을 막아뒀다). **한 번 재서 쓰면 된다.** */
    const r = 담아둔사각형 || cv.getBoundingClientRect();
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



  /* 지금 어느 걸음인가 — 위 막대 오른쪽에 적는다 */
  const 걸음이름 = !사진 || 저장끝 ? '' : 고른종류 === 'C' ? '길이 재기' : '얹을 것 고르기';

  /* 🔴 2026-08-14 전면 개편 — 네 걸음으로 갈랐다 (사장님 지시)
   *
   *   전                                   지금
   *   ────────────────────────            ────────────────────────
   *   사진을 고르면 카드 **네 장**이        ① 사진 고르기
   *   한 화면에 쌓였다.                     ② 정보 얹기
   *   저장 단추를 보려면 **끝까지 내려야**   ③ 길이 재기
   *   했다.                                ④ 저장한 뒤
   *
   * 🔴 저장 단추를 **아래에 고정**한다 — 배 위에서 한 손으로 쓰는 화면이다.
   * 🔴 「닫기」는 **왼쪽 위 한 자리**로 올렸다. 전에는 「그만두기」(첫 카드)와
   *    「닫기」(마지막 카드)가 따로 있었다 — 같은 일을 하는 길이 둘이면 눈이 헤맨다.
   * 🔴 화면 전체를 덮는다(탭바까지). 사진을 다루는 동안에는 다른 데로 갈 일이 없고,
   *    아래 단추와 탭바가 위아래로 겹치면 잘못 누른다.
   */
  return (
    <div style={덮개}>
      {/* 🔴 숨은 파일칸은 **여기 한 곳에만** 둔다. 전에는 두 곳에 같은 이름표로 있었다 */}
      <input
        ref={파일칸}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={사진골랐을때}
        style={{ display: 'none' }}
      />

      {/* ── 위 막대 ── 닫기는 늘 같은 자리 */}
      <div style={위막대}>
        <button type="button" onClick={닫기} aria-label="닫기" style={닫기단추}>
          <아이콘 이름="닫기" 크기={20} 굵기={2} />
        </button>
        <Typography weight="bold" sx={{ fontSize: 크기.도장제목 }}>
          바다 도장
        </Typography>
        {걸음이름 ? (
          <Typography sx={{ marginLeft: 'auto', fontSize: 크기.도장작게, color: 색.아주흐린글 }}>
            {걸음이름}
          </Typography>
        ) : null}
      </div>

      {/* ── 본문 ── */}
      <div style={본문}>
      {!사진 ? (
        /* ── ① 사진 고르기 ── */
        <div style={빈자리}>
          <span style={{ color: 색.아주흐린글 }}>
            <아이콘 이름="사진" 크기={46} 굵기={1.5} />
          </span>
          <Typography weight="bold" sx={{ fontSize: 크기.도장묶음, marginTop: 14 }}>
            물고기를 찍어주세요
          </Typography>
          <Typography align="center" sx={{ fontSize: 크기.도장보조, color: 색.흐린글, lineHeight: 1.7, marginTop: 8 }}>
            날짜와 장소를 얹어 한 장으로 만들어 드려요.
            <br />
            <b style={{ color: 색.글 }}>사진은 이 앱에 저장되지 않습니다.</b>
          </Typography>
        </div>
      ) : (
        <>
          {/* ── ④ 저장한 뒤 — 됐다는 것을 화면으로 말한다 ── */}
          {저장끝 && (
            <FlexBox flexDirection="column" alignItems="center" gap={6} sx={{ padding: '20px 0 14px' }}>
              <div style={동그라미}>
                <아이콘 이름="체크" 크기={30} 굵기={2.6} />
              </div>
              <Typography weight="bold" sx={{ fontSize: 크기.도장묶음, marginTop: 8 }}>
                {저장됨 || '사진첩에 저장했어요'}
              </Typography>
              <Typography align="center" sx={{ fontSize: 크기.도장보조, color: 색.흐린글, lineHeight: 1.7 }}>
                이 앱에는 남지 않습니다.
                <br />
                보내실 곳이 있으면 사진첩에서 꺼내 쓰세요.
              </Typography>
            </FlexBox>
          )}

          {/* ── 미리보기 ── */}
          <Card sx={{ ...카드, padding: 12, gap: 10 }}>
            <div
              ref={미리보기}
              onClick={눌렀을때}
              style={{
                position: 'relative',
                lineHeight: 0,
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 고른종류 === 'C' ? 'crosshair' : 'default',
              }}
            >
              <canvas ref={캔버스} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            {그림오류 && (
              <div style={{ fontSize: 12, color: 색.안됨, lineHeight: 1.6, padding: '0 2px' }}>
                그림을 그리다 걸렸어요. 아래 글자를 그대로 알려주시면 고칠 수 있습니다.
                <br />
                <b>{그림오류}</b>
              </div>
            )}

          </Card>

          {/* ── 무엇을 얹을까 — 두 칸 세그먼트 ──
              🔴 2026-08-14 — 전에는 3칸 격자에 항목이 둘이라 **단추가 왼쪽 2/3에 몰려** 있었다
              (눈금 자국 B 를 내리면서 칸 수를 안 고쳤다). 이제 둘이 반씩 나눠 갖는다 */}
          {!저장끝 && (
            <>
              <div style={세그}>
                {종류.map((t) => {
                  const 켜짐 = 고른종류 === t.값;
                  return (
                    <button
                      key={t.값}
                      type="button"
                      onClick={() => 고른종류바꾸기(t.값)}
                      style={{ ...세그칸, ...(켜짐 ? 세그켜짐 : null) }}
                    >
                      {t.이름}
                    </button>
                  );
                })}
              </div>
              {/* 🔴 2026-08-14 — 세그먼트 밑의 설명 한 줄을 뺐다.
                  「정보 얹기」·「길이 재기」라는 이름이 이미 그 말을 하고 있다 */}
            </>
          )}

          {/* ── ③ 길이 재기 ── */}
          {!저장끝 && 고른종류 === 'C' && (
            <Card sx={카드}>
              {/* ── 걸음 목록 ──────────────────────────────
                  🔴 2026-08-14 — 전에는 「① 물고기의 머리와 꼬리를 눌러주세요 (0/2)」
                  같은 **글 두 줄**이었다. 몇 개 찍었는지는 알려주지만
                  **지금 무엇을 눌러야 하는지**가 안 보였다.
                  이제 끝난 걸음에는 체크가 붙고, 할 차례인 걸음만 진해진다.

                  🔴 2026-08-07 — 물고기가 먼저다 (사장님 지적).
                  사람은 **물고기를 재려고** 이 화면에 들어온다. 재려는 것을 먼저 찍는다.
                  기준물은 「그래서 몇 cm냐」를 알기 위한 자일 뿐이라 나중이다. */}
              <FlexBox flexDirection="column" gap={0}>
                <걸음
                  번호={1}
                  말="물고기의 머리와 꼬리"
                  셈={`${물고기점.length} / 2`}
                  끝났나={물고기점.length === 2}
                  차례인가={물고기점.length < 2}
                />
                <걸음
                  번호={2}
                  말="기준이 될 물건의 양 끝"
                  셈={`${기준점.length} / 2`}
                  끝났나={기준점.length === 2}
                  차례인가={물고기점.length === 2 && 기준점.length < 2}
                />
                {어림 != null && (
                  <FlexBox flexDirection="column" alignItems="center" gap={2} sx={{ ...결과칸 }}>
                    <Typography weight="bold" sx={{ fontSize: 크기.도장버튼글씨, color: 색.주 }}>
                      약 {어림}cm
                    </Typography>
                    {/* 🔴 소수점을 쓰지 않는다. 실측이 아니라 어림이다 */}
                    <Typography sx={{ fontSize: 크기.도장작게, color: 색.흐린글 }}>
                      어림입니다. 실측이 아니에요
                    </Typography>
                  </FlexBox>
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
                    {/* 🔴 2026-08-14 — 세 줄이던 것을 한 줄로 줄였다 (사장님 「굳이 필요 없는
                        정보는 넣지 마」). 남긴 까닭은 하나 — **다 찍고 나서 알면 늦기 때문**이다.
                        기준물이 사진에 없으면 점만 남고 길이가 안 나온다 */}
                    기준물이 <b>사진에 같이, 같은 바닥에</b> 있어야 길이가 나와요
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

              {/* 🔴 「이 길이로 판정해볼까요」는 **아래 고정 단추**로 옮겼다.
                  화면에서 제일 중요한 한 걸음이라 늘 같은 자리에 있어야 한다 */}
              {(기준점.length > 0 || 물고기점.length > 0) && (
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
                  점 다시 찍기
                </Button>
              )}
            </Card>
          )}

          {/* ── ② 정보 얹기 ── */}
          {!저장끝 && 고른종류 !== 'C' && (
          <Card sx={카드}>
            <Typography weight="bold" sx={{ fontSize: 크기.도장보조, color: 색.흐린글 }}>
              도장에 넣을 것
            </Typography>
            {/* 🔴 2026-08-14 — 「비워도 찍힙니다 · 상세 주소는 안 넣습니다」를 뺐다.
                비워도 되는 것은 **비워보면 안다.** 상세 주소는 **우리가 안 받으면 그만**이다 */}

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
            ) : null}
            {/* 🔴 2026-08-14 — 판정이 없을 때 띄우던 안내문을 뺐다 (사장님 「굳이 필요 없는
                정보는 넣지 마」). **우리가 왜 그렇게 만들었는지는 쓰는 사람이 알 필요가 없다.**
                🔴 판정 칸을 안 그리는 규칙 자체는 그대로다 — `그리기A` 의 주석에 근거가 있다 */}
          </Card>
          )}
        </>
      )}
      </div>

      {/* ── 아래 고정 단추 ──
          🔴 2026-08-14 — 전에는 카드 네 장을 다 지나야 저장 단추가 나왔다.
          배 위에서 한 손으로 쓰는 화면이라 **늘 손 닿는 자리**에 있어야 한다.
          🔵 한 걸음에 **주 단추 하나**. 나머지는 흐리게 둔다 */}
      <div style={아래}>
        {!사진 ? (
          <Button variant="solid" color="primary" size="large" fullWidth
            onClick={() => 파일칸.current?.click()} sx={버튼}>
            <span style={단추속}><아이콘 이름="사진" 크기={20} /> 사진 찍기</span>
          </Button>
        ) : 저장끝 ? (
          <FlexBox gap={9}>
            <Button variant="outlined" color="assistive" size="large" fullWidth
              onClick={() => 파일칸.current?.click()}
              sx={{ ...버튼, fontSize: 크기.도장본문, fontWeight: 500 }}>
              <span style={단추속}><아이콘 이름="사진" 크기={18} /> 다시 찍기</span>
            </Button>
            <Button variant="solid" color="primary" size="large" fullWidth onClick={닫기} sx={버튼}>
              닫기
            </Button>
          </FlexBox>
        ) : 고른종류 === 'C' && 어림 != null ? (
          <FlexBox flexDirection="column" gap={2}>
            <Button variant="solid" color="primary" size="large" fullWidth
              onClick={() => {
                /* 🔴 자동으로 판정에 넣지 않는다. 사람이 눌러야 넘어간다 */
                쓰기(제안길이키, 어림);
                길잡이.push('/catch');
              }}
              sx={버튼}>
              이 길이로 판정해볼까요
            </Button>
            <Button variant="outlined" color="assistive" size="large" fullWidth onClick={공유}
              /* 🔴 `border:'none'` 만으로는 안 없어진다 — 부품이 `outlined` 로
                 **자기 테두리를 나중에 다시 그린다.** `&&` 로 한 단 세게 걸어 이긴다 */
              sx={{ ...버튼, height: 46, fontSize: 크기.도장보조, fontWeight: 500, color: 색.흐린글,
                    '&&': { border: 'none', boxShadow: 'none', backgroundColor: 'transparent' } }}>
              판정 없이 그냥 저장하기
            </Button>
          </FlexBox>
        ) : (
          <Button variant="solid" color="primary" size="large" fullWidth onClick={공유} sx={버튼}>
            <span style={단추속}><아이콘 이름="보내기" 크기={20} /> 사진첩에 저장 · 보내기</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/* 걸음 한 줄 — 끝난 것에는 체크, 지금 할 것만 진하게 */
function 걸음({ 번호, 말, 셈, 끝났나, 차례인가 }) {
  const 켜짐 = 끝났나 || 차례인가;
  return (
    <FlexBox alignItems="center" gap={10} sx={{ padding: '10px 0' }}>
      <span style={{ ...걸음번호, ...(켜짐 ? 걸음번호켜짐 : null) }}>
        {끝났나 ? <아이콘 이름="체크" 크기={13} 굵기={2.8} /> : 번호}
      </span>
      <Typography sx={{ fontSize: 크기.도장보조, fontWeight: 600, color: 켜짐 ? 색.글 : 색.아주흐린글 }}>
        {말}
      </Typography>
      <Typography sx={{ marginLeft: 'auto', fontSize: 크기.도장작게, fontWeight: 600, color: 차례인가 ? 색.주글 : 색.아주흐린글 }}>
        {셈}
      </Typography>
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

/* ── 이 화면만 쓰는 모양 ── */

/* 🔴 화면 전체를 덮는다 — 탭바까지. 사진을 다루는 동안에는 다른 데로 갈 일이 없고,
   아래 고정 단추와 탭바가 위아래로 겹치면 급할 때 잘못 누른다 */
const 덮개 = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 색.바탕뒤,
};

const 위막대 = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flex: '0 0 auto',
  backgroundColor: 색.바탕,
  borderBottom: `1px solid ${색.선}`,
  padding: `calc(env(safe-area-inset-top) + 10px) 14px 10px`,
};

const 닫기단추 = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  color: 색.흐린글,
  cursor: 'pointer',
  padding: 0,
  flex: '0 0 auto',
};

const 본문 = {
  flex: 1,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  display: 'flex',
  flexDirection: 'column',
  gap: 크기.사이,
  width: '100%',
  maxWidth: 560,
  margin: '0 auto',
  padding: 크기.여백,
};

const 아래 = {
  flex: '0 0 auto',
  backgroundColor: 색.바탕,
  borderTop: `1px solid ${색.선}`,
  padding: `12px ${크기.여백}px calc(env(safe-area-inset-bottom) + 14px)`,
};

/* 단추 안 아이콘과 글자를 가로로 세운다 — 안 묶으면 부품 기본값을 따라 세로로 쌓인다 */
const 단추속 = { display: 'inline-flex', alignItems: 'center', gap: 8 };

const 빈자리 = {
  border: `2px dashed ${색.선}`,
  borderRadius: 20,
  backgroundColor: 색.바탕,
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const 동그라미 = {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: 색.됨,
  color: 색.흰,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/* 두 칸 세그먼트 */
const 세그 = {
  display: 'flex',
  gap: 3,
  padding: 3,
  borderRadius: 12,
  backgroundColor: 색.채움,
};
const 세그칸 = {
  flex: 1,
  border: 'none',
  background: 'transparent',
  borderRadius: 9,
  padding: '10px 4px',
  fontFamily: 'inherit',
  fontSize: 크기.도장보조,
  fontWeight: 600,
  color: 색.흐린글,
  cursor: 'pointer',
};
const 세그켜짐 = {
  backgroundColor: 색.바탕,
  color: 색.글,
  fontWeight: 700,
  boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)',
};

const 걸음번호 = {
  width: 22,
  height: 22,
  borderRadius: 11,
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  backgroundColor: 색.채움,
  color: 색.흐린글,
};
const 걸음번호켜짐 = { backgroundColor: 색.주, color: 색.흰 };

const 결과칸 = {
  marginTop: 6,
  padding: '14px 12px',
  borderRadius: 16,
  backgroundColor: 색.채움,
};
