/* 인재채용 쪽 스크립트: 채용 공고 목록(마감 시각 기준 접수중 · D-n · 마감)과 외부 링크 화살표
   careers.html · careers-en.html 공용(문구는 KA.EN으로). site.js(KA) 뒤 · scroll-fx.js 앞, 동기로 채워야 등장 순서가 같음 */
(()=>{
  'use strict';
  const {EXT,EN,fmtDate}=window.KA;
  document.getElementById('extA').innerHTML=EXT;document.getElementById('extB').innerHTML=EXT;
  /* [공고 번호, 게시일, 마감(KST), [국문 제목, 구분], [영문 제목, 구분]] — innerHTML로 넣으므로 &amp; 그대로 */
  const J=[
    [128731,'2026.09.17','2026.10.06 17:00',['대한항공 항공우주 무인기 임무장비 조작사 모집','경력'],['UAV Mission Payload Operator','Experienced']],
    [128859,'2026.09.23','2026.10.01 23:59',['2026년 대한항공 항공우주 동계 일경험 인턴 모집(체험형)','인턴 · 신입'],['2026 Aerospace Winter Internship (Work Experience)','Intern · Entry-level']],
    [106854,'2026.04.14','2026.10.31 23:59',['항공우주 연구개발인력 상시모집','연구개발 · 신입/경력'],['Aerospace R&amp;D Engineers (Rolling Recruitment)','R&amp;D · Entry-level / Experienced']],
    [128413,'2026.09.15','2026.09.28 16:00',['2027년 대한항공 신입사원 모집','신입 · 대한항공 전사'],['2027 Korean Air New Graduate Recruitment','Entry-level · Company-wide']],
    [128422,'2026.09.15','2026.09.28 16:00',['2027년 대한항공 전문인력(신입/경력) 모집','신입/경력 · 대한항공 전사'],['2027 Korean Air Specialist Recruitment (Entry-level / Experienced)','Entry-level / Experienced · Company-wide']],
    [119159,'2026.06.18','2026.09.23 13:35',['항공우주 무인기 AI 전문인력 상시모집','연구개발 · 신입/경력'],['UAV AI Specialists (Rolling Recruitment)','R&amp;D · Entry-level / Experienced']]
  ];
  const T=EN?{today:'Closes today',open:'Open · D-',closed:'Closed',go:'View posting'}:{today:'오늘 마감',open:'접수중 · D-',closed:'접수마감',go:'공고 보기'};
  /* 기간: 국문 2026.09.17 ~ 2026.10.06 17:00 · 영문 Sep 17, 2026 – Oct 6, 2026 17:00 KST */
  const fd=s=>fmtDate(s,{loose:true});   /* 영문에서만 부름: '-' · '.' 모두 받고, 형식이 아니면 원문 그대로 */
  const now=new Date();const end=s=>new Date(s.replace(/\./g,'-').replace(' ','T')+':00+09:00');
  const row=([id,a,b,ko,en])=>{const [t,ty]=EN?en:ko,e=end(b),open=e>now,dd=Math.ceil((e-now)/864e5);
    return `<a class="job row row-d${open?'':' closed'}" href="https://koreanair.recruiter.co.kr/career/jobs/${id}" target="_blank" rel="noopener">`
      +`<span class="st"><i></i>${open?(dd<=0?T.today:T.open+dd):T.closed}</span><span class="t">${t}</span>`
      +`<span class="ty">${ty}<br>${EN?`${fd(a)} – ${fd(b)} ${b.slice(11)} KST`:`${a} ~ ${b}`}</span><span class="go">${T.go} <span class="arw">${EXT}</span></span></a>`};
  document.getElementById('jobList').innerHTML=J.map(row).join('');
})();
