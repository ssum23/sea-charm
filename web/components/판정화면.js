'use client';

/* 판정 — 어종 고르기 → 길이 재기 → 결과 (PRD의 G)
 *
 * 판정 자체는 lib/judge.js 가 한다. 이 파일은 화면만 그린다.
 * 시스템디자인 §4 「화면과 완전히 분리한다」를 지킨다 —
 * 여기서 판정 규칙을 흉내 내거나 결과를 고쳐 쓰지 않는다.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Chip, FlexBox, TextField, Typography } from '@montage-ui/core';
import { 크기, 색 } from './크기';
import { judge, 메타, 어종찾기 } from '@/lib/판정엔진';
import { 헷갈림주의, 은는 } from '@/lib/헷갈림';
import { 해역들, 이달몫, 해역제철, 해역에있나 } from '@/lib/해역';
import { 키, 읽기, 쓰기, 날짜말, 즐겨찾기최대, 최근최대 } from '@/lib/저장소';
import 어종그림 from '@/lib/어종그림';
import 재는법그림, { 재는법말 } from './재는법그림';
import 화면틀 from './화면틀';
import { 넘김키, 제안길이키 } from './도장찍기';

const 버튼모양 = {
  height: 크기.판정버튼높이,
  fontSize: 크기.판정버튼글씨,
  fontWeight: 700,
  borderRadius: 크기.버튼둥글기,
};

/* 재는 법의 글과 그림은 `재는법그림.js` 한 군데에만 둔다.
   글을 여기에도 적어두면 어느 날 한쪽만 고쳐지고 서로 다른 말을 한다. */

const 물고기말 = {
  1: '다 자랐어요.',
  3: '저 아직 어려요.',
  4: '곧 알을 낳아요.',
};

export default function 판정화면() {
  const [지금, 지금바꾸기] = useState(null);
  const [어종, 어종바꾸기] = useState(null);
  const [길이, 길이바꾸기] = useState('');
  const [지역, 지역바꾸기] = useState(null);

  /* 🔴 2026-08-07 — 「참문어는 길이라고 나옴」(사장님)
   *
   * 법에 크기 기준이 **없는** 어종은 우리가 재는 단위를 정해줄 근거가 없다.
   * 그런데 화면은 언제나 「길이(cm)」라고 물었다. 문어를 cm 로 재는 사람은 없다.
   * 사장님 결정 — **길이와 무게 중 사람이 고른다.**
   * 처음 열릴 때의 기본값만 어종에 맞춰 잡아준다(문어·낙지·주꾸미는 무게).
   *
   * 🔴 판정 규칙은 하나도 안 바뀐다. 기준이 있는 어종은 **법이 정한 단위를 그대로 쓰고**
   *    이 고르개는 아예 안 나온다. */
  const [잰단위, 잰단위바꾸기] = useState('cm');

  /* 🔴 2026-08-07 — 해역 (폰 점검 29번)
   * 「8월에 많이 잡히는 것」이 전국 기준이라 **서해 사람에게 갈치가, 동해 사람에게 주꾸미가** 떴다.
   * 실제로 주꾸미 어획은 **거의 전부 서해**다(40개월 실측). 고른 해역은 기기에 기억한다 —
   * 사람은 늘 같은 바다로 나간다. 🔴 판정에는 아무 영향이 없다. 목록 순서만 바뀐다. */
  const [해역, 해역바꾸기] = useState(null);   // null = 전국

  useEffect(() => {
    해역바꾸기(읽기(키.해역, null));
  }, []);

  function 해역고름(h) {
    const 다음 = 해역 === h ? null : h;   // 한 번 더 누르면 전국으로 돌아온다
    해역바꾸기(다음);
    쓰기(키.해역, 다음);
  }
  const [검색, 검색바꾸기] = useState('');
  const [결과, 결과바꾸기] = useState(null);
  const [기록수, 기록수바꾸기] = useState(null);
  /* 자주 잡는 어종(사용자가 별표로 고름) · 최근에 잡은 어종(기록에서 저절로) */
  const [즐겨, 즐겨바꾸기] = useState([]);
  const [최근, 최근바꾸기] = useState([]);

  /* 기록에서 최근에 잡은 어종 이름만 뽑는다. 같은 어종은 한 번만.
     기록은 새것이 앞에 쌓이므로(unshift) 앞에서부터 훑으면 그게 최근순이다. */
  function 최근계산(list) {
    const 본것 = [];
    (list || []).forEach((c) => {
      if (!c.어종) return;
      if (본것.indexOf(c.어종) === -1) 본것.push(c.어종);
    });
    return 본것.slice(0, 최근최대);
  }

  useEffect(() => {
    지금바꾸기(new Date());
    const list = 읽기(키.잡은것, []);
    기록수바꾸기(list.length);
    최근바꾸기(최근계산(list));
    즐겨바꾸기(읽기(키.즐겨찾기, []));
  }, []);

  /* 별표 켜기·끄기. 상한을 넘으면 **조용히 버리지 않고 알려준다** —
     말없이 사라지면 「눌렀는데 왜 안 되지」가 된다 */
  const [즐겨알림, 즐겨알림바꾸기] = useState('');
  function 즐겨토글(이름) {
    const 있음 = 즐겨.indexOf(이름) !== -1;
    if (있음) {
      const 다음 = 즐겨.filter((n) => n !== 이름);
      즐겨바꾸기(다음);
      쓰기(키.즐겨찾기, 다음);
      즐겨알림바꾸기('');
      return;
    }
    if (즐겨.length >= 즐겨찾기최대) {
      즐겨알림바꾸기(`즐겨찾기는 ${즐겨찾기최대}개까지예요. 하나를 빼고 다시 눌러주세요`);
      return;
    }
    const 다음 = 즐겨.concat([이름]);
    즐겨바꾸기(다음);
    쓰기(키.즐겨찾기, 다음);
    즐겨알림바꾸기('');
  }

  /* 🔴 해역을 고르면 **그 해역 자료로 다시 줄 세운다.**
     `judge.상단목록` 은 건드리지 않는다 — 엔진은 전국 기준 그대로 두고,
     화면에서 한 번 더 걸러 순서만 바꾼다. 판정 코드에 손대지 않는 길이다. */
  const 상단목록 = useMemo(() => {
    if (!지금) return [];
    /* 🔴 2026-08-07 (35차) — 전국일 때도 말을 맞춘다.
       엔진(`judge.상단목록`)은 제철을 **예/아니오**로 준다.
       화면은 33차부터 **'제철' · '많이' · null 세 가지 말**로 바뀌었다.
       전국 길에서 옮겨주지 않아 윗줄 「지금 제철은 …」이 **전국에서만 사라졌다.**
       (칸에 붙는 작은 딱지는 떴기 때문에 늦게 발견됐다)
       🔴 엔진은 건드리지 않는다 — 여기서 말만 바꿔 넘긴다. */
    if (!해역) {
      return judge.상단목록(지금, 8).map((s) => ({ ...s, 제철: s.제철 ? '제철' : null }));
    }

    const 달 = 지금.getMonth() + 1;
    return judge
      .상단목록(지금, 999)
      .map((s) => {
        const 몫 = 이달몫(s.이름, 해역, 달);
        return {
          ...s,
          제철: 해역제철(s.이름, 해역, 달),   // '제철' · '많이' · null
          몫: 몫 == null ? -1 : 몫,
          자료없음: !해역에있나(s.이름, 해역),
        };
      })
      /* 그 해역 자료가 없는 어종은 뒤로 보낸다 — 지우지는 않는다.
         「없다」가 아니라 「우리가 모른다」이기 때문이다 */
      .sort((a, b) => {
        if (a.자료없음 !== b.자료없음) return a.자료없음 ? 1 : -1;
        if (a.몫 !== b.몫) return b.몫 - a.몫;
        return a.인기 - b.인기;
      })
      .slice(0, 8);
  }, [지금, 해역]);

  const 검색결과 = useMemo(() => {
    const q = 검색.trim();
    if (!q) return [];
    return judge
      .어종목록()
      .filter((s) => s.이름.includes(q) || s.별칭.some((a) => a.includes(q)))
      .slice(0, 12);
  }, [검색]);

  /* 이 어종을 전에 얼마나 크게 잡았는지 — 칭찬 사다리에 쓰인다.
     🔴 2026-08-07 — **단위가 같은 기록끼리만** 견준다.
     참문어를 전에 cm 로 적어뒀다면 3,000g 과 견주면 안 된다.
     단위가 안 적힌 옛 기록은 cm 로 본다(#136 전에 쌓인 것들이다) */
  function 기록요약(이름, 단위) {
    const list = 읽기(키.잡은것, []);
    const 오늘 = new Date().toDateString();
    const 견줄단위 = 단위 || 'cm';
    let 역대 = null;
    let 오늘최대 = null;
    list.forEach((c) => {
      if (c.어종 !== 이름 || c.길이 == null) return;
      if ((c.단위 || 'cm') !== 견줄단위) return;
      if (역대 == null || c.길이 > 역대) 역대 = c.길이;
      if (new Date(c.시각).toDateString() === 오늘) {
        if (오늘최대 == null || c.길이 > 오늘최대) 오늘최대 = c.길이;
      }
    });
    return { 역대최고: 역대, 오늘최대: 오늘최대 };
  }

  function 판정하기(다음 = {}) {
    const 쓸어종 = 다음.어종 !== undefined ? 다음.어종 : 어종;
    const 쓸길이 = 다음.길이 !== undefined ? 다음.길이 : 길이;
    const 쓸지역 = 다음.지역 !== undefined ? 다음.지역 : 지역;
    const 쓸단위 = 다음.단위 !== undefined ? 다음.단위 : 잰단위;

    const r = judge({
      어종: 쓸어종,
      길이: 쓸길이 === '' ? null : Number(쓸길이),
      지역: 쓸지역,
      날짜: new Date(),
      기록: 기록요약(쓸어종, 쓸단위),
      /* 🔴 크기 기준이 없는 어종에서만 쓰인다 — 칭찬 상한을 cm/g 으로 나눈다.
         기준이 있는 어종은 법이 정한 단위를 쓰므로 엔진이 이 값을 보지 않는다 */
      단위: 쓸단위,
    });

    /* 아직 안 물어본 것만 묻는다. 이미 길이를 재봤는데 또 「길이」를 물으면
       (경계값) 화면을 되돌리지 않고 결과로 보낸다 — 말투 가이드 §3 */
    if (r.물음 === '길이' && 쓸길이 === '') {
      결과바꾸기({ ...r, 화면: '길이' });
      return;
    }
    if (r.물음 === '지역' && !쓸지역) {
      결과바꾸기({ ...r, 화면: '지역' });
      return;
    }

    결과바꾸기({ ...r, 화면: '결과' });

    /* 판정이 끝난 것만 남긴다. 「확실치 않아요」는 기록하지 않는다 */
    if (r.단계 !== 2) {
      const list = 읽기(키.잡은것, []);
      list.unshift({
        어종: 쓸어종,
        길이: 쓸길이 === '' ? null : Number(쓸길이),
        단위: r.기준?.단위 || 쓸단위 || 'cm',
        결과: r.결과,
        단계: r.단계,
        지역: 쓸지역,
        시각: new Date().toISOString(),
      });
      쓰기(키.잡은것, list.slice(0, 500));
      기록수바꾸기(list.length);
      최근바꾸기(최근계산(list));
    }
  }

  function 어종고름(이름) {
    어종바꾸기(이름);
    지역바꾸기(null);
    /* 🔴 법이 정한 단위가 있으면 그것이 이긴다. 없을 때만 어종에 맞는 기본값을 쓴다.
       (살오징어는 이름에 「오징어」가 들어가지만 법이 외투장 cm 로 정해뒀다) */
    const 미리 = judge({ 어종: 이름, 길이: null, 지역: null, 날짜: new Date() });
    const 첫단위 = 미리?.기준?.단위 || 기본단위(이름);
    잰단위바꾸기(첫단위);
    /* 도장 C 에서 「이 길이로 판정해볼까요」를 누르고 왔으면 그 값을 미리 넣어준다.
       🔴 자동으로 판정하지는 않는다 — 사람이 「판정하기」를 눌러야 답이 나온다.
       한 번 쓰면 지운다. 다음에 다른 물고기를 볼 때 따라오면 안 된다 */
    const 제안 = 읽기(제안길이키, null);
    if (제안 != null) {
      쓰기(제안길이키, null);
      길이바꾸기(String(제안));
      판정하기({ 어종: 이름, 길이: '', 지역: null, 단위: 첫단위 });
      return;
    }
    길이바꾸기('');
    판정하기({ 어종: 이름, 길이: '', 지역: null, 단위: 첫단위 });
  }

  function 처음부터() {
    어종바꾸기(null);
    길이바꾸기('');
    지역바꾸기(null);
    검색바꾸기('');
    결과바꾸기(null);
  }

  const 화면 = 결과?.화면 ?? '어종';

  /* 🔴 2026-08-06 폰 점검 — 「홈에 갔다 돌아왔더니 아까 누르던 숫자 6이 남아 있다」
   *
   * 폰 브라우저(특히 사파리)는 다른 화면에 갔다 돌아올 때 앞 화면을 새로 그리지 않고
   * **통째로 되살립니다.** 그래서 React 가 기억하던 숫자가 그대로 살아 있습니다.
   *
   * 이게 위험한 이유 — 다음 물고기를 재려던 사람이 **앞 물고기의 숫자로 판정**하게 된다.
   * 판정 규칙은 멀쩡한데 들어가는 값이 남의 것이면 답도 남의 것이다.
   *
   * 길이를 누르던 중이었을 때만 지운다. 결과를 보다가 잠깐 홈에 다녀온 사람의
   * 결과 화면까지 지워버리면 그건 그것대로 뺏는 것이다. */
  const 화면지금 = useRef(화면);
  useEffect(() => {
    화면지금.current = 화면;
  }, [화면]);
  useEffect(() => {
    function 되살아남(e) {
      if (!e.persisted) return;
      if (화면지금.current === '길이') 길이바꾸기('');
    }
    window.addEventListener('pageshow', 되살아남);
    return () => window.removeEventListener('pageshow', 되살아남);
  }, []);

  /* 「N짜」 — 낚시하는 사람이 크기를 부르는 말. 칭찬이 아니라 사실이다.
     안 쓰는 자리는 엔진이 정한다(30cm 미만·갈치·어류 아님·cm 아님 → null) */
  const 짜 = 화면 === '결과' && 길이 ? judge.짜(어종, Number(길이)) : null;
  const 제목 =
    화면 === '어종'
      ? '이거 가져가도 되나요'
      : 어종 +
        (화면 === '결과' && 길이 ? ` ${길이}${결과?.기준?.단위 || 잰단위 || 'cm'}` : '') +
        (짜 ? ` · ${짜}` : '');
  const 안내 =
    화면 === '어종'
      ? '먼저 무엇을 잡으셨는지 골라주세요'
      : 화면 === '길이'
        ? ((결과?.기준?.단위 || 잰단위) === 'g' ? '무게를 재서 눌러주세요' : '길이를 재서 눌러주세요')
        : 화면 === '지역'
          ? '어디서 잡으셨나요'
          : 지역
            ? `${지역} 기준`
            : '전국 기준';

  return (
    <화면틀
      제목={제목}
      탭="판정"
      날짜={지금}
      안내={안내}
      바닥글={
        기록수 ? `지금까지 ${기록수}마리 확인했어요` : ''
      }
      /* 하루 순서 — 판정이 쌓이면 기록이 된다 */
      다음={{ 이름: '조과 기록', 주소: '/log' }}
    >
      <>
        {화면 === '어종' && (
          <어종고르기
            지금={지금}
            해역={해역}
            해역고름={해역고름}
            상단목록={상단목록}
            검색={검색}
            검색바꾸기={검색바꾸기}
            검색결과={검색결과}
            어종고름={어종고름}
            즐겨={즐겨}
            즐겨토글={즐겨토글}
            즐겨알림={즐겨알림}
            최근={최근}
          />
        )}
        {화면 === '길이' && (
          <길이재기
            결과={결과}
            길이={길이}
            길이바꾸기={길이바꾸기}
            판정하기={판정하기}
            처음부터={처음부터}
            잰단위={잰단위}
            잰단위바꾸기={잰단위바꾸기}
          />
        )}
        {화면 === '지역' && (
          <지역고르기
            결과={결과}
            목록={메타.시도목록 || []}
            고름={(L) => {
              지역바꾸기(L);
              판정하기({ 지역: L });
            }}
            처음부터={처음부터}
          />
        )}
        {화면 === '결과' && (
          <결과보기
            결과={결과}
            어종={어종}
            길이={길이}
            짜={짜}
            잰단위={잰단위}
            처음부터={처음부터}
            길이넣기={() => 결과바꾸기({ ...결과, 화면: '길이' })}
            다시재기={() => {
              길이바꾸기('');
              결과바꾸기({ ...결과, 화면: '길이' });
            }}
          />
        )}
      </>
    </화면틀>
  );
}

/* 바깥으로 나가는 링크. 새 창에서 열고, 나가는 표시를 붙인다.
   `rel="noreferrer"` — 우리 주소를 상대 쪽에 알려주지 않는다 */
function 바깥링크({ 주소, 이름 }) {
  return (
    <a
      href={주소}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: 'underline',
        textUnderlineOffset: 3,
        fontSize: 크기.판정바깥링크,
        color: 색.흐린글,
        display: 'inline-block',
        padding: '4px 0',
      }}
    >
      {이름}
    </a>
  );
}

/* 어종 한 칸 — 즐겨찾기·최근·제철이 **모두 이 한 칸을 쓴다**.
 *
 * 🔴 2026-08-06 (2) 폰 점검 — 별표가 안 눌리고 길이 재기로 들어가던 결함
 *    전에는 별표를 **버튼 안에** 넣었다. `<button>` 안에 누를 수 있는 것을 또 넣는 것은
 *    **HTML 규칙 위반**이라, 폰 브라우저가 안쪽 것을 무시하고 **바깥 버튼을 눌러버린다.**
 *    그래서 별표를 눌러도 즐겨찾기가 아니라 길이 재기로 들어갔다.
 *    이제 별표를 **버튼 바깥의 형제**로 두고, 버튼 위에 겹쳐 올린다. 서로 남남이 된다.
 *
 * 🔴 한 줄에 3개 — 스크롤을 덜 내리게 (사장님 지시)
 *    전에는 2열 × 78px 이라 여덟 칸이 화면을 다 먹었다.
 *    제철·금어기 표시는 **글자로 남긴다.** 색만으로 알리면 색약인 사람에게 안 보인다(#77·#78).
 */
function 어종칸({ 이름, 제철, 금어기중, 즐겨짐, 고름, 즐겨토글 }) {
  return (
    <div style={{ position: 'relative' }}>
      <Button
        variant="outlined"
        color="assistive"
        size="large"
        fullWidth
        onClick={() => 고름(이름)}
        sx={{
          height: '100%',
          minHeight: 크기.어종칸높이,
          padding: '8px 4px',
          borderRadius: 크기.버튼둥글기,
        }}
      >
        {/* 🔴 2026-08-13 — 세로 가운데를 맞춘다 (사장님 「박스 안 글씨 가운데 맞춤」).
            칸마다 꼬리표(「제철」·「금어기?」)가 있는 것과 없는 것이 섞여 있어서,
            한 줄에 키가 다른 칸이 나란히 서면 **글씨가 위로 쏠려 들쭉날쭉했다.**
            `height:100%` + `justifyContent:center` 로 어느 칸이든 가운데 선다 */}
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            width: '100%',
            height: '100%',
            minWidth: 0,
          }}
        >
          {/* 어종 그림 — 이모지가 있으면 이모지, 없으면 직접 그린 그림.
              그림 정의는 `화면틀.js` 가 화면마다 한 번만 깔아둔다 */}
          <어종그림 이름={이름} 크기={20} />
          <span
            style={{
              fontSize: 크기.판정어종이름,
              fontWeight: 700,
              color: 색.글,
              lineHeight: 1.2,
              /* 이름이 잘리느니 줄바꿈한다 — 「조피볼락」이 「조피볼…」이 되면 못 읽는다 */
              wordBreak: 'keep-all',
              textAlign: 'center',
            }}
          >
            {이름}
          </span>
          {금어기중 ? (
            <span style={{ fontSize: 크기.판정꼬리표, fontWeight: 700, color: 색.안됨, lineHeight: 1.2 }}>
              금어기?
            </span>
          ) : 제철 ? (
            /* 🔴 두 가지다 —
               「제철」 통계와 낚시 전문지가 **둘 다** 그 달을 가리킨다
               「많이」 통계만 가리킨다. 그래도 **사실**이라 숨기지 않는다 */
            <span
              style={{
                fontSize: 크기.판정꼬리표,
                fontWeight: 700,
                color: 제철 === '많이' ? 색.흐린글 : 색.됨글,
                lineHeight: 1.2,
              }}
            >
              {제철 === '많이' ? '많이' : '제철'}
            </span>
          ) : null}
        </span>
      </Button>

      {/* 별표는 버튼 **바깥**이다. 버튼 위에 겹쳐만 놓는다 */}
      <span
        role="button"
        aria-label={즐겨짐 ? '자주 잡는 것에서 빼기' : '자주 잡는 것에 넣기'}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          즐겨토글(이름);
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          display: 'inline-flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          padding: '5px 6px 0 0',
          width: 34,
          height: 30,
          fontSize: 크기.판정별표,
          lineHeight: 1,
          cursor: 'pointer',
          color: 즐겨짐 ? 'var(--semantic-status-cautionary)' : 색.아주흐린글,
        }}
      >
        {즐겨짐 ? '★' : '☆'}
      </span>
    </div>
  );
}

/* 세 줄이 다 같은 모양이 되도록 한 겹 더 싼다 */
function 어종줄({ 제목, 목록, 즐겨, 고름, 즐겨토글 }) {
  if (!목록 || 목록.length === 0) return null;
  return (
    <FlexBox flexDirection="column" gap={8}>
      <Typography weight="bold" sx={{ fontSize: 크기.판정보조, color: 색.흐린글 }}>
        {제목}
      </Typography>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {목록.map((s) => {
          const 이름 = typeof s === 'string' ? s : s.이름;
          return (
            <어종칸
              key={이름}
              이름={이름}
              제철={typeof s === 'string' ? false : s.제철}
              금어기중={typeof s === 'string' ? false : s.금어기중}
              즐겨짐={(즐겨 || []).indexOf(이름) !== -1}
              고름={고름}
              즐겨토글={즐겨토글}
            />
          );
        })}
      </div>
    </FlexBox>
  );
}

/* ---------- 1. 어종 고르기 ---------- */
function 어종고르기({ 상단목록, 검색, 검색바꾸기, 검색결과, 어종고름, 지금, 즐겨, 즐겨토글, 즐겨알림, 최근, 해역, 해역고름 }) {
  const 달 = (지금 || new Date()).getMonth() + 1;
  /* 지금 목록에 올라온 것 중 제철인 것만 이름을 뽑아 한 줄로 알려준다.
     「왜 이 여덟 개가 여기 있나」에 답이 된다 */
  /* 「제철」(두 자료가 함께 가리킴)만 이름을 부른다.
     「많이」는 목록 배지로만 보인다 — 한 줄에 다 넣으면 힘을 실을 것과 아닌 것이 섞인다 */
  const 제철들 = 상단목록.filter((s) => s.제철 === '제철' && !s.금어기중).map((s) => s.이름);
  const 많이들 = 상단목록.filter((s) => s.제철 === '많이' && !s.금어기중).map((s) => s.이름);
  const 금어기들 = 상단목록.filter((s) => s.금어기중).map((s) => s.이름);

  /* 즐겨찾기에 이미 있는 것은 최근에서 뺀다 — 같은 이름이 두 줄에 나오면 자리만 먹는다 */
  const 최근만 = (최근 || []).filter((n) => (즐겨 || []).indexOf(n) === -1);

  return (
    <Card sx={{ backgroundColor: 색.바탕, borderRadius: 18, padding: 크기.카드여백, gap: 크기.사이, boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)' }}>
      {/* 🔴 2026-08-06 — 「지금 제철은…」 설명 두 줄을 **맨 위로** 올렸다.
          전에는 목록 제목과 칸 사이에 끼어 있어, 제목과 칸이 서로 떨어져 보였다.
          이 두 줄은 「이 달에 뭐가 잡히나」를 훑는 글이라 **맨 처음에 읽는 것이 맞다** */}
      {/* 🔴 2026-08-14 — 이 세 줄이 11px 이었다 (사장님 「글자가 작은 것 같다」).
          🔵 여기 **금어기가 적혀 있다** — 이 화면에서 제일 먼저 읽어야 할 줄인데
          앱에서 가장 작은 글씨로 적혀 있었다. 「배 위·노안」 규칙과 정면으로 어긋난다.
          13.5px 로 올리고, 색도 「아주 흐린 글」에서 「흐린 글」로 한 단 진하게 한다 */}
      <Typography sx={{ fontSize: 크기.판정안내, color: 색.흐린글, lineHeight: 1.7 }}>
        {제철들.length > 0 && (
          <>
            지금 제철은 <b style={{ color: 색.됨글 }}>{제철들.join(' · ')}</b>
          </>
        )}
        {제철들.length > 0 && 금어기들.length > 0 && <br />}
        {금어기들.length > 0 && (
          <>
            지금 금어기일 수 있는 것은 <b style={{ color: 색.안됨 }}>{금어기들.join(' · ')}</b>
          </>
        )}
        {제철들.length === 0 && 많이들.length > 0 && (
          <>
            {해역 || '지금'} 많이 잡히는 것은 <b style={{ color: 색.글 }}>{많이들.slice(0, 5).join(' · ')}</b>
          </>
        )}
        {제철들.length === 0 && 많이들.length === 0 && 금어기들.length === 0 &&
          (해역 ? `${해역} 낚시어선 어획 통계 40개월 실측 순서예요` : '낚시어선 어획 통계 41개월 실측 순서예요')}
        {(제철들.length > 0 || 금어기들.length > 0) && 해역 && (
          <>
            <br />
            <span style={{ color: 색.아주흐린글 }}>{해역} 낚시어선 어획 40개월 기준이에요</span>
          </>
        )}
      </Typography>

      {/* 🔴 2026-08-07 — 어느 바다로 나가시나요 (폰 점검 29번)
          한 번 고르면 기억한다. 한 번 더 누르면 전국으로 돌아온다.
          🔴 이건 **목록 순서만** 바꾼다 — 판정은 전국 기준 그대로다 */}
      <FlexBox gap={5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 크기.판정작게, color: 색.아주흐린글, flex: '0 0 auto' }}>
          어느 바다
        </Typography>
        {해역들.map((h) => {
          const 켜짐 = 해역 === h;
          return (
            <button
              key={h}
              type="button"
              onClick={() => 해역고름 && 해역고름(h)}
              style={{
                flex: 1,
                minWidth: 52,
                padding: '7px 4px',
                borderRadius: 9,
                fontFamily: 'inherit',
                fontSize: 크기.판정꼬리표,
                fontWeight: 켜짐 ? 700 : 500,
                cursor: 'pointer',
                border: `1px solid ${켜짐 ? 'transparent' : 색.선}`,
                background: 켜짐 ? 색.반전바탕 : 'transparent',
                color: 켜짐 ? 색.반전글 : 색.흐린글,
              }}
            >
              {h}
            </button>
          );
        })}
      </FlexBox>

      {/* 🔴 2026-08-06 폰 점검 — 검색을 맨 위로 올렸다.
          전에는 여덟 칸 아래에 있어서, 목록에 없는 어종을 잡은 사람은
          **화면을 내려야 검색이 있다는 걸 알았다.**

          🔴 (2) 돋보기가 안 보이던 이유 — 글자 칸이 제 배경을 깔면서 돋보기를 덮었다.
             `zIndex` 로 글자 칸 **위에** 올린다. 손가락은 통과시킨다(`pointerEvents:none`) */}
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 15,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 색.아주흐린글,
            lineHeight: 0,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.6" cy="8.6" r="5.6" stroke="currentColor" strokeWidth="1.8" />
            <line x1="12.9" y1="12.9" x2="17.4" y2="17.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <TextField
          value={검색}
          onChange={(e) => 검색바꾸기(e.target.value)}
          placeholder="어종 찾기"
          height={54}
          sx={{
            fontSize: 크기.판정본문,
            '& input': { paddingLeft: '40px' },
            '& .MuiInputBase-input': { paddingLeft: '40px' },
          }}
        />
      </div>

      {검색.trim() && 검색결과.length === 0 && (
        <FlexBox flexDirection="column" gap={10}>
          <Typography sx={{ fontSize: 크기.판정보조, color: 색.흐린글, lineHeight: 1.6 }}>
            그런 이름은 기준표에 없어요. 그대로 두고 아래에서 그냥 물어보셔도 됩니다.
          </Typography>
          <Button
            variant="outlined"
            color="assistive"
            size="large"
            fullWidth
            onClick={() => 어종고름(검색.trim())}
            sx={버튼모양}
          >
            그래도 물어보기
          </Button>
        </FlexBox>
      )}

      <어종줄
        제목="찾은 것"
        목록={검색결과}
        즐겨={즐겨}
        고름={어종고름}
        즐겨토글={즐겨토글}
      />

      {/* 🔴 「그날 잡는 물고기 종류는 비슷한데 매번 검색해야 한다」(폰 점검)
          지름길 두 줄을 제철 목록 **위에** 둔다.
            ① 자주 잡는 것 — 별표(☆)로 사람이 직접 고른 것
            ② 최근에 잡은 것 — 기록에서 저절로
          둘 다 개수 상한이 있다. 길어지면 훑는 것보다 검색이 빨라져 지름길이 아니게 된다 */}
      <어종줄
        제목="자주 잡는 것"
        목록={즐겨}
        즐겨={즐겨}
        고름={어종고름}
        즐겨토글={즐겨토글}
      />
      <어종줄
        제목="최근에 잡은 것"
        목록={최근만}
        즐겨={즐겨}
        고름={어종고름}
        즐겨토글={즐겨토글}
      />

      {즐겨알림 && (
        <Typography sx={{ fontSize: 크기.판정보조, color: 색.주의, lineHeight: 1.6 }}>
          {즐겨알림}
        </Typography>
      )}

      {/* 설명은 맨 위로 갔고, 여기엔 제목만 남는다 — 칸 바로 위에 붙는다 */}
      <Typography weight="bold" sx={{ fontSize: 크기.판정보조, color: 색.흐린글, marginBottom: -4 }}>
        {달}월에 많이 잡히는 것
      </Typography>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {상단목록.map((s) => (
          <어종칸
            key={s.이름}
            이름={s.이름}
            제철={s.제철}
            금어기중={s.금어기중}
            즐겨짐={(즐겨 || []).indexOf(s.이름) !== -1}
            고름={어종고름}
            즐겨토글={즐겨토글}
          />
        ))}
      </div>

      <Typography sx={{ fontSize: 크기.판정작게, color: 색.아주흐린글, lineHeight: 1.6 }}>
        오른쪽 위 ☆를 누르면 「자주 잡는 것」에 올라가요
      </Typography>
    </Card>
  );
}

/* 법에 기준이 없는 어종의 **처음 단위**.
   낚시하는 사람이 그 어종을 부를 때 쓰는 단위를 따른다.
   🔴 판정에는 쓰이지 않는다. 사람이 언제든 바꿀 수 있는 기본값일 뿐이다. */
const 무게로세는것 = ['문어', '낙지', '주꾸미', '오징어', '한치', '해삼'];
function 기본단위(이름) {
  return 무게로세는것.some((k) => String(이름 || '').includes(k)) ? 'g' : 'cm';
}

/* ---------- 2. 길이 재기 ---------- */
function 길이재기({ 결과, 길이, 길이바꾸기, 판정하기, 처음부터, 잰단위, 잰단위바꾸기 }) {
  const 기준 = 결과?.기준 || {};
  /* 법이 정한 단위가 있으면 그것을 쓴다. 없을 때만 사람이 고른 것을 쓴다 */
  const 고를수있나 = !기준.단위;
  const 단위 = 기준.단위 || 잰단위 || 'cm';
  const 그림 = 재는법말(기준.기준, 단위);
  const 안내 = 그림
    ? 그림.말
    : 기준.기준
      ? `${기준.기준}으로 재세요`
      : 단위 === 'g'
        ? '무게를 그램으로 재주세요'
        : '길이를 재주세요';

  function 누름(k) {
    if (k === 'del') 길이바꾸기(길이.slice(0, -1));
    else if (k === '.') {
      if (!길이.includes('.') && 길이) 길이바꾸기(길이 + '.');
    } else if (길이.length < 5) 길이바꾸기(길이 + k);
  }

  const 누를수있음 = !!길이 && Number(길이) > 0;

  return (
    <Card sx={{ backgroundColor: 색.바탕, borderRadius: 18, padding: 크기.카드여백, gap: 크기.사이, boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)' }}>
      <FlexBox
        sx={{
          backgroundColor: 'var(--semantic-fill-alternative)',
          borderRadius: 12,
          padding: '14px 16px',
        }}
      >
        <Typography sx={{ fontSize: 크기.판정보조, color: 색.흐린글, lineHeight: 1.6 }}>
          <b style={{ color: 색.글 }}>
            {기준.기준 || (단위 === 'g' ? '무게' : '길이')}
          </b>{' '}
          — {안내}
          {그림?.주의 && (
            <>
              <br />
              {그림.주의}
            </>
          )}
        </Typography>
      </FlexBox>

      {/* 🔴 법에 기준이 없는 어종만 — 길이로 잴지 무게로 잴지 사람이 고른다.
          기준이 있는 어종에는 이 줄이 아예 안 나온다. 법이 이미 정해놨기 때문이다 */}
      {고를수있나 && (
        <FlexBox gap={7} alignItems="center">
          <Typography sx={{ fontSize: 크기.판정작게, color: 색.아주흐린글, flex: '0 0 auto' }}>
            무엇으로 잴까요
          </Typography>
          {[
            { 값: 'cm', 말: '길이 cm' },
            { 값: 'g', 말: '무게 g' },
          ].map((o) => {
            const 켜짐 = 단위 === o.값;
            return (
              <button
                key={o.값}
                type="button"
                onClick={() => 잰단위바꾸기 && 잰단위바꾸기(o.값)}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 10,
                  fontFamily: 'inherit',
                  fontSize: 크기.판정꼬리표,
                  fontWeight: 켜짐 ? 700 : 500,
                  cursor: 'pointer',
                  border: `1px solid ${켜짐 ? 'transparent' : 색.선}`,
                  background: 켜짐 ? 색.반전바탕 : 'transparent',
                  color: 켜짐 ? 색.반전글 : 색.흐린글,
                }}
              >
                {o.말}
              </button>
            );
          })}
        </FlexBox>
      )}

      {/* 어디서 어디까지 재는지 그림으로 — 갈치 항문장이 여기서 갈린다 */}
      {그림 && (
        <div style={{ color: 색.글, padding: '2px 0 0' }}>
          <재는법그림 기준={기준.기준} 단위={단위} 색={색} 글없이 />
        </div>
      )}

      <FlexBox alignItems="baseline" justifyContent="center" gap={4} sx={{ padding: '10px 0 2px' }}>
        <Typography
          weight="bold"
          sx={{
            fontSize: 크기.판정길이숫자,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: 길이 ? 색.글 : 색.아주흐린글,
          }}
        >
          {길이 || '0'}
        </Typography>
        <Typography weight="bold" sx={{ fontSize: 크기.판정길이단위, color: 색.흐린글 }}>
          {단위}
        </Typography>
      </FlexBox>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
          <Button
            key={k}
            variant="outlined"
            color="assistive"
            size="large"
            fullWidth
            onClick={() => 누름(k)}
            sx={{
              height: 64,
              borderRadius: 13,
              fontSize: k === 'del' ? 16 : 크기.판정숫자판,
              fontWeight: 700,
              color: k === 'del' || k === '.' ? 색.흐린글 : 색.글,
            }}
          >
            {k === 'del' ? '지우기' : k}
          </Button>
        ))}
      </div>

      <Button
        variant="solid"
        color="primary"
        size="large"
        fullWidth
        disabled={!누를수있음}
        onClick={() => 판정하기({ 길이 })}
        sx={버튼모양}
      >
        판정하기
      </Button>
      <Button
        variant="outlined"
        color="assistive"
        size="large"
        fullWidth
        onClick={처음부터}
        sx={{ ...버튼모양, fontSize: 크기.판정본문, fontWeight: 500, color: 색.흐린글 }}
      >
        어종 다시 고르기
      </Button>
    </Card>
  );
}

/* ---------- 3. 지역 묻기 ---------- */
function 지역고르기({ 결과, 목록, 고름, 처음부터 }) {
  return (
    <Card sx={{ backgroundColor: 색.바탕, borderRadius: 18, padding: 크기.카드여백, gap: 크기.사이, boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)' }}>
      <FlexBox
        sx={{
          backgroundColor: 'var(--semantic-fill-alternative)',
          borderRadius: 12,
          padding: '14px 16px',
        }}
      >
        <Typography sx={{ fontSize: 크기.판정보조, color: 색.흐린글, lineHeight: 1.6 }}>
          {결과?.이유}. 잡은 곳을 골라주시면 그 지역 기준으로 봅니다
        </Typography>
      </FlexBox>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
        {목록.map((L) => (
          <Button
            key={L}
            variant="outlined"
            color="assistive"
            size="large"
            fullWidth
            onClick={() => 고름(L)}
            sx={{ height: 58, borderRadius: 12, fontSize: 크기.판정본문, fontWeight: 600 }}
          >
            {L}
          </Button>
        ))}
      </div>

      <Button
        variant="outlined"
        color="assistive"
        size="large"
        fullWidth
        onClick={처음부터}
        sx={{ ...버튼모양, fontSize: 크기.판정본문, fontWeight: 500, color: 색.흐린글 }}
      >
        처음부터
      </Button>
    </Card>
  );
}

/* ---------- 4. 결과 ---------- */
function 결과보기({ 결과, 어종, 길이, 짜, 처음부터, 다시재기, 길이넣기, 잰단위 }) {
  /* 🔴 2026-08-10 — 「혹시 다른 고기 아니세요?」 한 줄.
   *
   * 어종을 잘못 고르면 금어기와 금지체장이 통째로 바뀐다.
   * 5월에 감성돔을 참돔으로 고르면 「가져가도 됩니다」가 뜨는데 **실제로는 위반이다.**
   * 길이를 아무리 잘 재도 못 막는 오류라, **말로 한 번 짚어주는 것 말고 방법이 없다.**
   *
   * 🔴 판정은 바꾸지 않는다. 결과·단계·순서 그대로고 아래에 한 줄이 붙을 뿐이다.
   * 🔴 「가져가도 됩니다」일 때만 띄운다 — 놓아주라고 나온 판정에는 덧붙일 이유가 없다.
   * 🔴 그리고 **정말 뒤집힐 때만** 띄운다(오늘 금어기이거나, 잰 길이가 그 기준 이하일 때).
   *    자주 뜨면 사람이 안 읽는다. */
  const 헷갈림 = 결과 && 결과.단계 === 1
    ? 헷갈림주의({
        고른어종: 어종,
        길이: 길이 === '' || 길이 == null ? null : Number(길이),
        날짜: new Date(),
        어종찾기,
      })
    : [];
  const r = 결과;
  const 색깔 = r.단계 === 1 ? 색.됨 : r.단계 === 2 ? 색.주의 : 색.안됨;

  return (
    <>
      <Card sx={{ backgroundColor: 색.바탕, borderRadius: 18, padding: 크기.여백, gap: 12, boxShadow: 'var(--semantic-elevation-shadow-normal-xsmall)' }}>
        {r.단계 === 4 && (
          <FlexBox
            sx={{
              alignSelf: 'flex-start',
              backgroundColor: 색.안됨,
              borderRadius: 999,
              padding: '6px 14px',
            }}
          >
            <Typography weight="bold" sx={{ fontSize: 크기.판정금어기배지, color: 색.흰 }}>
              지금은 금어기
            </Typography>
          </FlexBox>
        )}

        {r.칭찬 && (
          <Typography weight="bold" sx={{ fontSize: 크기.판정칭찬, color: 색.됨 }}>
            {r.칭찬}
          </Typography>
        )}

        <Typography
          weight="bold"
          sx={{ fontSize: 크기.판정결과, lineHeight: 1.25, letterSpacing: '-0.025em', color: 색깔 }}
        >
          {r.결과}
        </Typography>

        <Typography sx={{ fontSize: 크기.판정본문, color: 색.흐린글, lineHeight: 1.65 }}>
          {r.이유}
        </Typography>

        {헷갈림.length > 0 && (
          <FlexBox
            flexDirection="column"
            gap={4}
            sx={{
              backgroundColor: 'var(--semantic-fill-alternative)',
              borderLeft: `3px solid ${색.주의}`,
              borderRadius: 10,
              padding: '11px 13px',
            }}
          >
            {헷갈림.map((h) => (
              <Typography
                key={h.실제 + h.종류}
                sx={{ fontSize: 크기.판정보조, color: 색.글, lineHeight: 1.6 }}
              >
                혹시 <b>{h.실제}</b>{은는(h.실제).slice(h.실제.length)} 아니시죠? {h.말}
              </Typography>
            ))}
            <Typography sx={{ fontSize: 크기.판정작게, color: 색.아주흐린글, lineHeight: 1.55 }}>
              생김새가 비슷해 자주 헷갈리는 것만 알려드립니다. 맞게 고르셨으면 그냥 넘기세요.
            </Typography>
          </FlexBox>
        )}

        {물고기말[r.단계] && (
          <FlexBox
            sx={{
              backgroundColor: 'var(--semantic-fill-alternative)',
              borderRadius: 12,
              padding: '13px 15px',
            }}
          >
            <Typography sx={{ fontSize: 크기.판정보조, color: 색.흐린글 }}>
              “{물고기말[r.단계]}”
            </Typography>
          </FlexBox>
        )}

        {r.주의?.length > 0 && (
          <FlexBox flexDirection="column" gap={5}>
            {r.주의.map((m, i) => (
              <Typography key={i} sx={{ fontSize: 크기.판정보조, color: 색.주의, lineHeight: 1.6 }}>
                · {m}
              </Typography>
            ))}
          </FlexBox>
        )}

        {/* 벌금 안내는 금어기(4)뿐 아니라 금지체장 미달(3)에도 붙는다.
            둘 다 같은 수산자원관리법 제65조제2호 대상이다 — 한쪽만 알려주면
            「길이가 모자란 건 괜찮겠지」로 읽힌다 */}
        {(r.단계 === 3 || r.단계 === 4) && r.근거?.위반시 && (
          <FlexBox
            sx={{
              backgroundColor: 'var(--semantic-fill-normal)',
              borderRadius: 12,
              padding: '13px 15px',
            }}
          >
            <Typography weight="bold" sx={{ fontSize: 크기.판정보조, color: 색.안됨, lineHeight: 1.6 }}>
              어기면 {r.근거.위반시} (과태료 아님)
              <br />
              수산자원관리법 제65조제2호
            </Typography>
          </FlexBox>
        )}

        <div style={{ borderTop: `1px solid ${색.선}`, paddingTop: 13, marginTop: 4 }}>
          <Typography sx={{ fontSize: 크기.판정작게, color: 색.아주흐린글, lineHeight: 1.7 }}>
            {r.근거?.법령} · {r.근거?.기준일} 기준
            <br />이 판정은 참고 정보예요. 최종 책임은 잡은 사람에게 있어요.
          </Typography>

          {/* 🔴 공식 자료는 앱 안에 넣지 않고 링크로만 연다.
              국립수산과학원 자료는 항목마다 공공누리 유형이 다르고(제1~제4),
              제2·제4유형은 상업적 이용 금지, 제3·제4유형은 변형 금지다.
              사진을 앱에 넣으려면 항목별로 유형을 확인하고 허락을 받아야 한다.
              그래서 「인터넷이 있을 때만 열리는 링크」로 둔다 —
              이러면 앱 자체의 「외부 요청 0건」은 그대로 지켜진다.
              (누르지 않으면 아무것도 받아오지 않는다) */}
          <FlexBox flexDirection="column" gap={7} sx={{ marginTop: 12 }}>
            {/* 「인터넷이 있을 때만 열립니다」를 뺐다 — 밑줄 친 글은 누르면 링크로 간다는 걸
                누구나 안다. 링크면 인터넷이 필요한 것도 안다. 과한 친절은 글만 늘린다
                (2026-08-06 지적 반영) */}
            <Typography sx={{ fontSize: 크기.판정작게, color: 색.흐린글, lineHeight: 1.7 }}>
              생김새가 헷갈리면 공식 자료와 견줘보세요.
            </Typography>
            <FlexBox flexWrap="wrap" gap={14}>
              <바깥링크
                주소={`https://www.google.com/search?q=${encodeURIComponent(
                  (어종 || '') + ' 국립수산과학원 수산생물도감',
                )}&tbm=isch`}
                이름="사진으로 견주기"
              />
              <바깥링크
                주소="https://www.nifs.go.kr/frcenter/"
                이름="수산과학원 자료실"
              />
              <바깥링크
                주소="https://www.law.go.kr/법령/수산자원관리법시행령"
                이름="법령 원문"
              />
            </FlexBox>
          </FlexBox>
        </div>
      </Card>

      {/* 판정 결과를 그대로 들고 도장으로 간다.
          도장은 홈에 있다 — 한글 주소를 새로 만들면 정적 내보내기가 깨진다(CHANGES #98) */}
      <Button
        as={Link}
        href="/"
        variant="solid"
        color="primary"
        size="large"
        fullWidth
        onClick={() => {
          try {
            window.sessionStorage.setItem(
              넘김키,
              JSON.stringify({
                어종: 어종 || null,
                길이: 길이 === '' || 길이 == null ? null : Number(길이),
                단위: r.기준?.단위 || 잰단위 || 'cm',
                짜: 짜 || null,
                결과: r.결과,
                단계: r.단계,
              }),
            );
          } catch (e) {}
        }}
        sx={{ ...버튼모양, textDecoration: 'none' }}
      >
        사진 찍어 도장 남기기
      </Button>
      {/* 🔴 2026-08-06 폰 점검 — 버튼 순서를 바꿨다.
          「다른 물고기 보기」가 가운데 있어서 **이 물고기에서 더 할 일**과
          **다음 물고기로 넘어가기**가 섞여 있었다.
          이제 이 물고기에서 할 일을 먼저 다 두고, 넘어가기를 맨 끝에 둔다. */}

      {r.단계 === 2 && r.기준 && (
        <Button
          variant="outlined"
          color="assistive"
          size="large"
          fullWidth
          onClick={다시재기}
          sx={버튼모양}
        >
          길이 다시 재기
        </Button>
      )}

      {/* 크기 제한이 없는 어종은 길이를 묻지 않는다 — 물어볼 이유가 없다.
          그래도 기록에 남기고 싶을 수 있으니 「원하면 넣기」로 열어둔다.
          판정 결과는 길이를 넣어도 바뀌지 않는다(기준이 없으니까).
          물음표를 붙였다 — 묻는 말인데 마침표도 물음표도 없어 명령처럼 읽혔다 */}
      {r.단계 === 1 && !r.기준 && (길이 === '' || 길이 == null) && (
        <Button
          variant="outlined"
          color="assistive"
          size="large"
          fullWidth
          onClick={길이넣기}
          sx={{ ...버튼모양, fontSize: 크기.판정본문, fontWeight: 500 }}
        >
          길이도 기록해둘까요?
        </Button>
      )}

      <Button
        variant="outlined"
        color="assistive"
        size="large"
        fullWidth
        onClick={처음부터}
        sx={{ ...버튼모양, fontSize: 크기.판정본문, fontWeight: 500 }}
      >
        다른 물고기 보기
      </Button>
    </>
  );
}
