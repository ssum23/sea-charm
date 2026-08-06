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
import { 크기, 색 } from './크기';
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

function 바탕그리기(cv, 이미지) {
  const 배율 = Math.min(1, 최대가로 / 이미지.naturalWidth);
  cv.width = Math.round(이미지.naturalWidth * 배율);
  cv.height = Math.round(이미지.naturalHeight * 배율);
  const ctx = cv.getContext('2d');
  ctx.drawImage(이미지, 0, 0, cv.width, cv.height);
  return ctx;
}

/* 폰에 있는 글꼴만 쓴다. 웹에서 받아오면 「외부 요청 0건」이 깨진다 */
function 글꼴(크기, 굵게) {
  return `${굵게 ? '700' : '400'} ${크기}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
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
  ctx.roundRect(-s / 2, -s / 2, s, s, r);
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
  그리기A(cv, 이미지, 정보);
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  const 단 = W / 100;

  function 선(점들, 색깔, 이름) {
    if (점들.length < 2) return;
    const [p, q] = 점들;
    const a = { x: p.x * W, y: p.y * H };
    const b = { x: q.x * W, y: q.y * H };
    ctx.save();
    ctx.strokeStyle = 색깔;
    ctx.lineWidth = 단 * 0.55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    [a, b].forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 단 * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = 색깔;
      ctx.fill();
    });
    if (이름) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.font = 글꼴(단 * 2.8, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const w = ctx.measureText(이름).width + 단 * 1.6;
      ctx.fillStyle = 'rgba(12,16,22,0.72)';
      ctx.beginPath();
      ctx.roundRect(mx - w / 2, my - 단 * 4.4, w, 단 * 3.9, 단 * 0.8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(이름, mx, my - 단 * 0.9);
    }
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  선(재기.기준점, 'rgba(255,255,255,0.9)', 재기.기준이름);
  선(재기.물고기점, '#ffd34d', 재기.어림 ? `약 ${재기.어림}cm` : null);
  return cv;
}

/* B — 눈금자를 겹친다.
   ★ 이건 「재는 것」이 아니라 「눈금이 보이는 사진을 만드는 것」이다.
      눈금 숫자를 판정에 넣지 않는다. */
function 그리기B(cv, 이미지, 정보, 눈금) {
  그리기A(cv, 이미지, 정보);
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  const 단 = W / 100;

  const 길이 = 눈금.길이 * W; // 화면 가로 대비 비율
  /* 🔴 2026-08-06 — 자를 더 얇고 더 투명하게 (사장님 지적).
     자가 두꺼우면 물고기를 덮는다. 자는 「재는 도구」가 아니라
     「눈금이 같이 찍힌 사진」을 만드는 장치다 — 사진이 주인공이다 */
  const 두께 = Math.max(단 * 3.4, 길이 * 0.052);
  const cx = 눈금.x * W;
  const cy = 눈금.y * H;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((눈금.각도 * Math.PI) / 180);

  /* 자 몸통 */
  ctx.fillStyle = 'rgba(250,248,242,0.55)';
  ctx.beginPath();
  ctx.roundRect(-길이 / 2, -두께 / 2, 길이, 두께, 두께 * 0.14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,44,52,0.22)';
  ctx.lineWidth = Math.max(1, 단 * 0.1);
  ctx.stroke();

  /* 눈금 — 0~60cm. 5cm마다 숫자 */
  const 최대 = 60;
  const 칸 = 길이 / 최대;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 최대; i++) {
    const x = -길이 / 2 + 칸 * i;
    const 긴 = i % 10 === 0;
    const 중 = i % 5 === 0;
    const h = 긴 ? 두께 * 0.5 : 중 ? 두께 * 0.34 : 두께 * 0.2;
    ctx.strokeStyle = 'rgba(28,32,40,0.8)';
    ctx.lineWidth = Math.max(1, 두께 * (긴 ? 0.045 : 0.03));
    ctx.beginPath();
    ctx.moveTo(x, -두께 / 2);
    ctx.lineTo(x, -두께 / 2 + h);
    ctx.stroke();
    if (중) {
      ctx.fillStyle = 'rgba(28,32,40,0.9)';
      ctx.font = 글꼴(두께 * 0.28, 긴);
      ctx.fillText(String(i), x, -두께 / 2 + h + 두께 * 0.04);
    }
  }
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
  const [기준cm, 기준cm바꾸기] = useState(10);
  const [기준이름, 기준이름바꾸기] = useState('손바닥 폭');
  const [기준점, 기준점바꾸기] = useState([]);
  const [물고기점, 물고기점바꾸기] = useState([]);
  const [무엇을찍나, 무엇을찍나바꾸기] = useState('기준');

  /* B — 눈금자 */
  const [눈금, 눈금바꾸기] = useState({ x: 0.5, y: 0.55, 길이: 0.8, 각도: 0 });

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
    무엇을찍나바꾸기('기준');
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
  useEffect(() => {
    if (!사진 || !캔버스.current) return;
    const cv = 캔버스.current;
    if (고른종류 === 'A') 그리기A(cv, 사진.이미지, 정보);
    else if (고른종류 === 'C')
      그리기C(cv, 사진.이미지, 정보, { 기준점, 물고기점, 기준이름, 어림 });
    else 그리기B(cv, 사진.이미지, 정보, 눈금);
  }, [사진, 고른종류, 정보, 기준점, 물고기점, 기준이름, 어림, 눈금]);

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
        저장됨바꾸기('저장했습니다');
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
    if (무엇을찍나 === '기준') {
      const 다음 = 기준점.length >= 2 ? [p] : [...기준점, p];
      기준점바꾸기(다음);
      if (다음.length === 2) 무엇을찍나바꾸기('물고기');
    } else {
      물고기점바꾸기(물고기점.length >= 2 ? [p] : [...물고기점, p]);
    }
  }

  /* 마지막에 찍은 점 하나만 지운다 — 잘못 눌렀을 때 처음부터 다시 하지 않아도 된다 */
  function 마지막점지우기() {
    if (무엇을찍나 === '물고기' && 물고기점.length > 0) {
      물고기점바꾸기(물고기점.slice(0, -1));
      return;
    }
    if (기준점.length > 0) {
      기준점바꾸기(기준점.slice(0, -1));
      무엇을찍나바꾸기('기준');
      return;
    }
    무엇을찍나바꾸기('기준');
  }

  /* 🔴 B — 자를 손가락으로 끌어 옮긴다 (사장님 지시).
     화살표 조절만으로는 물고기에 맞추기 어렵다. 끌어다 놓는 편이 빠르다.
     ⚠️ 끄는 동안 화면이 같이 밀리지 않게 `touchAction: 'none'` 을 준다 */
  const 끄는중 = useRef(false);
  function 끌기시작(e) {
    if (고른종류 !== 'B') return;
    끄는중.current = true;
    const p = 자리계산(e);
    if (p) 눈금바꾸기((전) => ({ ...전, x: p.x, y: p.y }));
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function 끄는동안(e) {
    if (!끄는중.current || 고른종류 !== 'B') return;
    const p = 자리계산(e);
    if (p) 눈금바꾸기((전) => ({ ...전, x: p.x, y: p.y }));
  }
  function 끌기끝() {
    끄는중.current = false;
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
            </div>

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
              <Typography sx={{ fontSize: 크기.도장작게, color: 색.주의, lineHeight: 1.7 }}>
                기준물과 물고기가 같은 바닥에 놓여 있어야 맞아요.
              </Typography>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                {기준물.map((k) => {
                  const 켜짐 = 기준이름 === k.이름;
                  return (
                    <button
                      key={k.이름}
                      type="button"
                      /* 🔴 한 번 더 누르면 선택이 풀린다 (2026-08-06 사장님 지시).
                         고른 뒤 마음이 바뀌었을 때 빠져나갈 길이 없었다 */
                      onClick={() => {
                        if (켜짐) {
                          기준이름바꾸기('기준물');
                          return;
                        }
                        기준이름바꾸기(k.이름);
                        기준cm바꾸기(k.cm);
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
                  value={String(기준cm)}
                  inputMode="decimal"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    기준cm바꾸기(Number.isFinite(v) ? v : 0);
                    기준이름바꾸기('기준물');
                  }}
                  sx={{ flex: 1 }}
                />
                <Typography sx={{ fontSize: 크기.도장작게, color: 색.흐린글 }}>cm</Typography>
              </FlexBox>

              <FlexBox flexDirection="column" gap={4}>
                <Typography sx={{ fontSize: 크기.도장보조, color: 색.글, lineHeight: 1.7 }}>
                  {무엇을찍나 === '기준'
                    ? `① 사진에서 ${기준이름}의 양 끝을 눌러주세요 (${기준점.length}/2)`
                    : `② 물고기의 머리와 꼬리를 눌러주세요 (${물고기점.length}/2)`}
                </Typography>
                {어림 != null && (
                  <Typography weight="bold" sx={{ fontSize: 크기.도장묶음 }}>
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

              <FlexBox gap={8}>
                <Button
                  variant="outlined"
                  color="assistive"
                  size="large"
                  fullWidth
                  onClick={() => {
                    기준점바꾸기([]);
                    물고기점바꾸기([]);
                    무엇을찍나바꾸기('기준');
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
                눈금을 물고기 머리~꼬리에 맞춰주세요. 이 눈금은{' '}
                <b style={{ color: 색.흐린글 }}>사진에 남기는 표시일 뿐이고 판정에는 쓰지 않습니다.</b>
              </Typography>
              <손잡이 이름="좌우" 값={눈금.x} 최소={0} 최대={1} 걸음={0.005}
                바꾸기={(v) => 눈금바꾸기({ ...눈금, x: v })} />
              <손잡이 이름="위아래" 값={눈금.y} 최소={0} 최대={1} 걸음={0.005}
                바꾸기={(v) => 눈금바꾸기({ ...눈금, y: v })} />
              <손잡이 이름="길이" 값={눈금.길이} 최소={0.2} 최대={1} 걸음={0.005}
                바꾸기={(v) => 눈금바꾸기({ ...눈금, 길이: v })} />
              <손잡이 이름="기울기" 값={눈금.각도} 최소={-90} 최대={90} 걸음={1}
                바꾸기={(v) => 눈금바꾸기({ ...눈금, 각도: v })} />
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
