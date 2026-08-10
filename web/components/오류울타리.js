'use client';

/* 오류 울타리 — 화면 하나가 넘어져도 앱 전체가 하얘지지 않게 막는다.
 *
 * 왜 필요한가 (2026-08-10 사장님 지적) —
 * 「자 화면에서 앱이 꺼지거나 하얀 화면이 된다」는 일이 폰에서만 났다.
 * 컴퓨터에서는 재현되지 않아 **원인을 볼 방법이 없었다.**
 * 리액트는 그리는 도중 오류가 나면 **화면을 통째로 지운다** — 그게 하얀 화면이다.
 *
 * 🔴 이 울타리가 하는 일은 둘이다.
 *   ① 하얀 화면 대신 **「무엇이 잘못됐는지」를 글로 보여준다.**
 *      다음에 같은 일이 나면 그 글만 알려주시면 원인을 바로 안다.
 *   ② 홈으로 돌아가는 길을 남긴다. 앱을 껐다 켜지 않아도 된다.
 *
 * 🔴 판정에는 손대지 않는다. 이건 화면이 넘어졌을 때의 안전망일 뿐이다.
 */

import { Component } from 'react';

export default class 오류울타리 extends Component {
  constructor(props) {
    super(props);
    this.state = { 넘어짐: null };
  }

  static getDerivedStateFromError(err) {
    return { 넘어짐: err };
  }

  componentDidCatch(err, 정보) {
    /* 화면에 보여줄 것과 별개로 콘솔에도 남긴다 */
    try { console.error('[오류울타리]', err, 정보 && 정보.componentStack); } catch (e) {}
  }

  render() {
    if (!this.state.넘어짐) return this.props.children;
    const e = this.state.넘어짐;
    const 말 = (e && (e.message || String(e))) || '알 수 없는 오류';
    return (
      <div style={{ padding: 24, lineHeight: 1.7, wordBreak: 'keep-all' }}>
        <p style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px' }}>
          이 화면에 문제가 생겼어요
        </p>
        <p style={{ fontSize: 14, color: '#5b6166', margin: '0 0 16px' }}>
          앱이 잘못된 것이지 사장님이 잘못 누르신 게 아닙니다.
          <br />
          아래 글자를 그대로 알려주시면 고칠 수 있습니다.
        </p>
        <pre
          style={{
            fontSize: 12, background: '#f5f8fa', border: '1px solid #e4e9ed',
            borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', margin: '0 0 18px', color: '#a8332b',
          }}
        >
          {말}
        </pre>
        <a href="/" style={{ fontSize: 16, color: '#0f4c81', textDecoration: 'none' }}>‹ 홈으로</a>
      </div>
    );
  }
}
