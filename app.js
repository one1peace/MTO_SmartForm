// ════════════════════════════════════════
// 파싱 엔진
// ════════════════════════════════════════

let DATA = {};  // 파싱 결과 전역 저장
let MTO_LAYERS = []; // [{step, layer, tooling, seeds, comment}]

function onPasteInput() {
  const raw = document.getElementById('paste-input').value;
  if(!raw.trim()) {
    document.getElementById('parse-status').innerHTML = '대기 중 — 데이터를 붙여넣으면 자동 분석합니다.';
    document.getElementById('parsed-preview-area').style.display = 'none';
    return;
  }
  const {data, layers, count} = parseSource(raw);
  DATA = data;
  MTO_LAYERS = layers;

  // 인식 상태 표시
  document.getElementById('parse-status').innerHTML =
    `<span class="ok">✓ ${count}개 항목 인식 · MTO Layer ${layers.length}행</span>`;

  // KV 미리보기
  const kvList = document.getElementById('kv-list');
  kvList.innerHTML = '';
  Object.entries(data).forEach(([k,v]) => {
    if(!v) return;
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = `<span class="kv-key">${k}</span><span class="kv-val">${String(v).slice(0,60)}${String(v).length>60?'…':''}</span>`;
    kvList.appendChild(row);
  });
  layers.forEach((l,i) => {
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = `<span class="kv-key">Layer행 ${i+1}</span><span class="kv-val">${l.step} / ${l.layer}</span>`;
    kvList.appendChild(row);
  });

  document.getElementById('parsed-preview-area').style.display = 'block';
}

function parseSource(raw) {
  const lines = raw.split('\n').map(l => l.split('\t').map(c => c.trim()));
  const data = {};
  const layers = [];

  // 헤더 감지 패턴 (스킵할 행)
  const skipPat = /^[🗂📚📁⚠️✅🎭※\s#\-=]+/;

  // MTO 레이어 섹션 감지 상태
  let inMtoLayer = false;

  lines.forEach(cols => {
    const full = cols.join('\t');
    const c0 = cols[0]||'', c1 = cols[1]||'', c2 = cols[2]||'', c3 = cols[3]||'';

    // 빈 행 스킵
    if(cols.every(c=>!c)) return;

    // 이모지/헤더 행 스킵
    if(skipPat.test(c0) && !c1) return;

    // MTO 레이어 헤더 행 감지
    const fullLower = full.toLowerCase();
    if(fullLower.includes('upload step') && fullLower.includes('layer')) {
      inMtoLayer = true; return;
    }

    // 섹션 제목 행 스킵 (📁 Base Stream 경로 등)
    if(/^[\u{1F000}-\u{1FFFF}]/u.test(c0)) return;

    // MTO 레이어 데이터 행
    if(inMtoLayer) {
      // 빈 행이면 섹션 종료
      if(!c0 && !c1) { inMtoLayer = false; return; }
      // Step / Layer / Tooling / SEEDS / Comment
      if(c0 || c1) {
        layers.push({
          step: c0, layer: c1, tooling: c2, seeds: c3,
          comment: cols[4]||''
        });
      }
      return;
    }

    // ── 키-값 파싱 ──
    const key = c0.replace(/"/g,'').replace(/\n/g,' ').trim();
    const keyN = key.toLowerCase().replace(/[\s_\-\.]/g,'');

    // 2열 구조 (key | val) 또는 4열 (k|v|k|v)
    const tryMatch = (k, v) => {
      const kn = k.toLowerCase().replace(/[\s_\-\.·"]/g,'');
      if(!kn) return;

      if(kn.includes('device'))                               data.device      = v;
      else if(kn.includes('process'))                        data.process     = v;
      else if(kn==='recn')                                   { if(!data.recn) data.recn = v; }
      else if(kn.includes('귀속부서'))                        data.dept        = v;
      else if(kn.includes('tooler'))                         data.tooler      = v;
      else if(kn.includes('mtodate'))                        data.mtoDate     = v;
      else if(kn.includes('목적')||kn.includes('업로드사유')) data.purpose     = v;
      // Library
      else if(kn.includes('baselib'))                        data.baseLib     = v;
      else if(kn.includes('newlib'))                         data.newLib      = v;
      else if(kn.includes('basemaskset'))                    data.baseMaskSet = v;
      else if(kn.includes('newmaskset'))                     data.newMaskSet  = v;
      else if(kn.includes('truthtable'))                     data.truthTable  = v;
      else if(kn.includes('pcellversion')||kn.includes('pcell')) data.pcellVer = v;
      // Stream
      else if(kn.includes('stream경로')||kn.includes('stream')) data.stream   = v;
      // TEMP RUNSET / RULE FILE 섹션 (LVS / DRC rule — 짧은 경로값)
      else if(kn==='lvs')  { if(!data.lvsPath) data.lvsRule = v; else data.lvsPath = v; }
      else if(kn==='drc')  { if(!data.drcPath) data.drcRule = v; else data.drcPath = v; }
      // VERIFY 섹션
      else if(kn.includes('db작업')||kn.includes('담당자'))   data.dbWorker    = v;
      else if(kn.includes('lvs경로'))                         data.lvsPath     = v;
      else if(kn.includes('drc경로'))                         data.drcPath     = v;
      else if(kn.includes('lvl경로')||kn.includes('lvl'))     data.lvlPath     = v;
      else if(kn.includes('lvstemp')||kn.includes('lvstemp경로')) data.lvsTempPath = v;
      else if(kn.includes('drctemp')||kn.includes('drctemp경로')) data.drcTempPath = v;
      else if(kn.includes('verify특이사항'))                   data.verifyNote  = v;
      else if(kn.includes('temp')&&kn.includes('내용'))        data.tempContent = v;
      else if(kn.includes('temp비고'))                         data.tempNote    = v;
      // OPC 전용
      else if(kn.includes('설계teg')||kn.includes('teg변경')) data.teg         = v;
      else if(kn.includes('history'))                         data.history     = v;
      else if(kn.includes('진행률'))                           data.progress    = v;
      else if(kn.includes('uploaddate'))                      data.uploadDate  = v;
      // Mask 단독 행 (lib 아래 들여쓰기)
      else if(kn==='mask'||kn.includes('maskset')) {
        if(!data.baseMaskSet) data.baseMaskSet = v;
        else if(!data.newMaskSet) data.newMaskSet = v;
      }
    };

    // col0/col1 쌍
    tryMatch(c0, c1);
    // col2/col3 쌍 (4열 구조)
    if(c2) tryMatch(c2, c3);

    // Base/New MaskSet 행 특별처리 (들여쓰기 행: c0 공백, c1에 값)
    if(!c0 && c1 && data.baseLib && !data.baseMaskSet) data.baseMaskSet = c1;
    else if(!c0 && c1 && data.newLib && !data.newMaskSet) data.newMaskSet = c1;
    // "Mask" 키워드 행 직접 감지
    if(key.toLowerCase().includes('mask') && !key.toLowerCase().includes('mask id')) {
      const val = c1||c2||c3;
      if(!data.baseMaskSet) data.baseMaskSet = val;
      else if(!data.newMaskSet) data.newMaskSet = val;
    }
  });

  // Base → New Step 자동계산
  if(!data.newStep && data.baseLib && data.newLib) {
    // lib명에서 step 추출 (예: L89_S14 → L90_S15)
    const bm = data.baseLib.match(/_([A-Z]\d+_[A-Z]\d+[A-Za-z]?)_/);
    const nm = data.newLib.match(/_([A-Z]\d+_[A-Z]\d+[A-Za-z]?)_/);
    if(bm) data.baseStep = bm[1];
    if(nm) data.newStep  = nm[1];
  }

  const count = Object.values(data).filter(v=>v).length;
  return {data, layers, count};
}

// ════════════════════════════════════════
// 이메일 테이블 빌더
// ════════════════════════════════════════
const CLR = {
  opc:{hd:'#1565C0',catA:'#E3EAF8',catB:'#E3EAF8',rowA:'#F8FAFF',rowB:'#F0F4FC',sub:'#1976D2',subTx:'#ffffff'},
  mto:{hd:'#3D7A60',catA:'#E8F5EF',catB:'#E8F5EF',rowA:'#F6FCF9',rowB:'#EEF9F4',sub:'#4A8A70',subTx:'#ffffff'},
};

function esc(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

function buildTable(form, rows) {
  const c = CLR[form];
  const title = form==='opc'?'<span style="font-size:20px;vertical-align:middle;margin-right:6px;">🔬</span><span style="font-size:15px;vertical-align:middle;">OPC</span>':`${waferSvg}<span style="font-size:15px;vertical-align:middle;">MTO</span>`;

  // 대분류 그룹핑
  const groups=[];let cur=null,items=[];
  rows.forEach(r=>{
    const cat = r.cat;
    if(cat!==cur){if(cur!==null)groups.push({cat:cur,items});cur=cat;items=[];}
    items.push(r);
  });
  if(cur!==null)groups.push({cat:cur,items});

  // 컬럼 구조: 대분류 | 소분류1 | 값1 | 소분류2 | 값2  (총 5열)
  let h = `<table style="border-collapse:collapse;width:100%;max-width:720px;font-family:Arial,'Malgun Gothic',sans-serif;font-size:14px;border:1px solid #BDC6D8;">`;
  h += `<tr><td colspan="5" style="background:${c.hd};color:#fff;padding:10px 16px;text-align:center;font-size:15px;font-weight:900;letter-spacing:0.5px;">${title}</td></tr>`;

  groups.forEach((g,gi)=>{
    const ev=gi%2===0;
    const catBg=ev?c.catA:c.catB, rowBg=ev?c.rowA:c.rowB;
    const rs = g.items.length;  // OPC/MTO 단일 대분류 — 전체 행 rowspan

    g.items.forEach((row,ii)=>{
      const isLast=(ii===g.items.length-1)&&(gi===groups.length-1);
      const bd = isLast?'none':'1px solid #c0c8e0';
      const isHdr  = row.isHeader;  // Mask ID/Layer 헤더행
      const isLayer = row.isLayer;  // 실제 레이어 데이터행
      const hdrBg  = '#e0e8f8';
      const sub1bg = isHdr ? hdrBg : rowBg;
      const sub2bg = isHdr ? hdrBg : rowBg;

      h += '<tr>';

      // ── 대분류 셀 (첫 행만 rowspan, 레이어행은 빈 셀로 한 칸 밀기) ──
      if(ii===0){
        const catDisplay = (g.cat||'').replace(/\n/g,'<br>');
        h += `<td rowspan="${rs}" style="background:${catBg};color:#1a2060;padding:7px 11px;font-weight:900;font-size:14px;vertical-align:middle;text-align:center;border-right:2px solid #BDC6D8;border-bottom:${bd};white-space:pre-line;min-width:56px;">${catDisplay}</td>`;
      }

      // ── 헤더 행 (Step/Layer 컬럼 타이틀) — 대분류 rowspan 셀 아래에 종속 ──
      if(isHdr){
        // 대분류 셀 없음(rowspan에 포함됨) — 소분류 자리에 Step 타이틀
        h += `<td style="background:${c.hd};color:#fff;padding:7px 11px;text-align:center;border-right:1px solid rgba(255,255,255,0.25);border-bottom:${bd};font-weight:900;text-align:center;font-size:14px;">${esc(row.sub)}</td>`;
        if(form==='opc'){
          // OPC 헤더: Step | Layer | PSM layer (각 1칸, 센터 정렬)
          const v1 = esc(row.val1);
          h += `<td style="background:${c.hd};color:#fff;padding:7px 11px;text-align:center;border-right:1px solid rgba(255,255,255,0.25);border-bottom:${bd};font-weight:900;text-align:center;font-size:14px;">${v1||''}</td>`;
          h += `<td colspan="2" style="background:#4527A0;color:#fff;padding:7px 11px;text-align:center;border-bottom:${bd};font-weight:900;text-align:center;font-size:14px;">PSM layer</td>`;
        } else {
          // MTO: Layer / SEEDS Verification / 특이사항 Comment (센터 정렬)
          const v1 = esc(row.val1);
          h += `<td style="background:${c.hd};color:#fff;padding:7px 11px;text-align:center;border-right:1px solid rgba(255,255,255,0.25);border-bottom:${bd};font-weight:900;text-align:center;font-size:14px;">${v1||''}</td>`;
          h += `<td style="background:#4A7A62;color:#fff;padding:7px 11px;text-align:center;border-right:1px solid rgba(255,255,255,0.25);border-bottom:${bd};font-weight:900;text-align:center;font-size:14px;">${esc(row.sub2||'')}</td>`;
          h += `<td style="background:${c.hd};color:#fff;padding:7px 11px;text-align:center;border-bottom:${bd};font-weight:900;text-align:center;font-size:14px;">${esc(row.val2||'')}</td>`;
        }
        h += '</tr>';
        return;
      }

      // ── 레이어 데이터 행 — 대분류 rowspan 셀 아래 종속, 대분류 셀 없음 ──
      if(isLayer){
        // Step 값 (소분류 자리)
        h += `<td style="background:${rowBg};color:#111;padding:7px 11px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};font-weight:600;">${esc(row.sub)}</td>`;
        if(form==='opc'){
          // OPC 데이터: Layer | PSM layer 빈칸(색칠, 1칸 병합)
          const v1 = esc(row.val1);
          h += `<td style="background:#fff;color:#111;padding:7px 11px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};word-break:break-all;">${v1||'<span style="color:#bbb;">—</span>'}</td>`;
          h += `<td colspan="2" style="background:#EDE7F6;border-bottom:${bd};border-left:1px solid #B39DDB;"></td>`;
        } else {
          // MTO: Layer / SEEDS(색칠) / 특이사항(색칠)
          const v1 = esc(row.val1);
          const seedsVal = esc(row.sub2||'');
          const commentVal = esc(row.val2||'');
          h += `<td style="background:#fff;color:#111;padding:7px 11px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};word-break:break-all;">${v1||'<span style="color:#bbb;">—</span>'}</td>`;
          h += `<td style="background:#3dd68c;color:#0a3d25;padding:7px 11px;text-align:center;border-right:1px solid #2ab87a;border-bottom:${bd};font-weight:600;text-align:center;">${seedsVal||''}</td>`;
          h += `<td style="background:#E6F9F1;color:#0f4a30;padding:7px 11px;text-align:center;border-bottom:${bd};word-break:break-all;">${commentVal||''}</td>`;
        }
        h += '</tr>';
        return;
      }

      // ── 일반 행 ──
      const v1 = esc(row.val1);
      if(row.wideVal){
        // wideVal 행: 소분류 | 값(colspan 3) — Verify 특이사항은 파란색
        const isVerify = row.sub === 'Verify 특이사항';
        const subBg  = isVerify ? '#0277BD' : c.sub;
        const subClr = '#ffffff';
        const valBg  = isVerify ? '#E1F5FE' : '#fff';
        const valClr = isVerify ? '#01579B' : '#111';
        h += `<td style="background:${subBg};color:${subClr};padding:7px 12px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};font-weight:700;font-size:14px;">${esc(row.sub)}</td>`;
        h += `<td colspan="3" style="background:${valBg};color:${valClr};padding:7px 12px;text-align:center;border-bottom:${bd};word-break:break-all;line-height:1.4;font-size:14px;">${v1||''}</td>`;
      } else {
        // 일반 행: 소분류1(진한배경+흰글씨) | 값1(흰배경) | 소분류2(진한배경+흰글씨) | 값2(흰배경)
        h += `<td style="background:${c.sub};color:${c.subTx};padding:7px 12px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};font-weight:700;font-size:14px;">${esc(row.sub)}</td>`;
        h += `<td style="background:#fff;color:#111;padding:7px 12px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};word-break:break-all;line-height:1.4;font-size:14px;">${v1||''}</td>`;
        h += `<td style="background:${row.sub2 ? c.sub : '#fff'};color:${row.sub2 ? c.subTx : '#111'};padding:7px 12px;text-align:center;border-right:1px solid #BDC6D8;border-bottom:${bd};font-weight:${row.sub2?'700':'400'};font-size:14px;">${esc(row.sub2||'')}</td>`;
        const v2 = esc(row.val2);
        h += `<td style="background:#fff;color:#111;padding:7px 12px;text-align:center;border-bottom:${bd};word-break:break-all;line-height:1.4;font-size:14px;">${v2||''}</td>`;
      }
      h += '</tr>';
    });
  });
  h += '</table>';
  return h;
}

// ════════════════════════════════════════
// 양식 생성
// ════════════════════════════════════════
function generate() {
  const raw = document.getElementById('paste-input').value;
  if(!raw.trim()){showToast('데이터를 먼저 붙여넣어 주세요.','warn');return;}

  const {data, layers} = parseSource(raw);
  DATA = data; MTO_LAYERS = layers;

  const d = data;

  // ── 진행률 자동계산: layer 개수 기준 ──
  const layerCount = layers.length;
  const autoProgress = layerCount > 0 ? `${layerCount}/${layerCount} (100%)` : (d.progress||'');

  // ── OPC 양식 ──
  const opcRows = [
    {cat:'OPC', sub:'Device',       val1:d.device||'',  sub2:'Process',     val2:d.process||''},
    {cat:'OPC', sub:'New Lib.',      val1:d.newLib||'',  sub2:'',            val2:'', wideVal:true},
    {cat:'OPC', sub:'목적',          val1:d.purpose||'', sub2:'',            val2:'', wideVal:true},
    {cat:'OPC', sub:'설계 TEG변경',  val1:d.teg||'',     sub2:'History',     val2:d.history||'LINK'},
    {cat:'OPC', sub:'진행률',        val1:autoProgress,  sub2:'Upload Date', val2:d.uploadDate||''},
  ];
  if(layers.length>0) {
    opcRows.push({cat:'OPC', sub:'Step', val1:'Layer', sub2:'', val2:'', isHeader:true});
    layers.forEach(l => {
      opcRows.push({cat:'OPC', sub:l.step, val1:l.layer, sub2:'', val2:'', isLayer:true});
    });
    opcRows.push({cat:'OPC', sub:'Verify 특이사항', val1:d.verifyNote||'', sub2:'', val2:'', wideVal:true});
  }

  // ── MTO 양식 ──
  const mtoRows = [
    {cat:'MTO', sub:'Device',    val1:d.device||'',   sub2:'Process',   val2:d.process||''},
    {cat:'MTO', sub:'목적',      val1:d.purpose||'',  sub2:'',          val2:'', wideVal:true},
    {cat:'MTO', sub:'귀속부서',  val1:d.dept||'DRAM 설계팀', sub2:'RECN', val2:d.recn||''},
    {cat:'MTO', sub:'진행률',    val1:autoProgress,   sub2:'MTO Date',  val2:d.mtoDate||''},
  ];
  if(layers.length>0) {
    mtoRows.push({cat:'MTO', sub:'Step', val1:'Layer', sub2:'SEEDS Verification', val2:'특이사항 Comment', isHeader:true});
    layers.forEach(l => {
      mtoRows.push({cat:'MTO', sub:l.step, val1:l.layer, sub2:l.seeds||'', val2:l.comment||'', isLayer:true});
    });
  }

  document.getElementById('tbl-opc').innerHTML = buildTable('opc', opcRows);
  document.getElementById('tbl-mto').innerHTML = buildTable('mto', mtoRows);

  document.getElementById('right-empty').style.display  = 'none';
  document.getElementById('right-result').style.display = 'block';
  showToast('OPC · MTO 양식 생성 완료!','ok');
}

// ════════════════════════════════════════
// 복사
// ════════════════════════════════════════
async function copyTable(form) {
  const el = document.getElementById('tbl-'+form);
  if(!el||!el.innerHTML){showToast('표가 없습니다.','warn');return;}
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([el.innerHTML],{type:'text/html'}),
      'text/plain':new Blob([el.innerText], {type:'text/plain'}),
    })]);
    showToast(form.toUpperCase()+' 표 복사 완료! 이메일에 붙여넣기 하세요.','ok');
  } catch(e) {
    const sel=window.getSelection(),r=document.createRange();
    r.selectNodeContents(el);sel.removeAllRanges();sel.addRange(r);
    document.execCommand('copy');sel.removeAllRanges();
    showToast(form.toUpperCase()+' 복사 완료!','ok');
  }
}

async function copyAll() {
  const opc = document.getElementById('tbl-opc');
  const mto = document.getElementById('tbl-mto');
  if(!opc.innerHTML){showToast('먼저 양식을 생성하세요.','warn');return;}
  const html = opc.innerHTML + '<br><br>' + mto.innerHTML;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html],{type:'text/html'}),
      'text/plain':new Blob([opc.innerText+'\n\n'+mto.innerText],{type:'text/plain'}),
    })]);
    showToast('OPC + MTO 표 복사 완료! 이메일에 붙여넣기 하세요.','ok');
  } catch(e) {showToast('복사 실패 — 개별 복사를 이용해 주세요.','warn');}
}

function clearAll() {
  document.getElementById('paste-input').value = '';
  document.getElementById('parse-status').innerHTML = '대기 중 — 데이터를 붙여넣으면 자동 분석합니다.';
  document.getElementById('parsed-preview-area').style.display='none';
  document.getElementById('right-empty').style.display='block';
  document.getElementById('right-result').style.display='none';
  document.getElementById('tbl-opc').innerHTML='';
  document.getElementById('tbl-mto').innerHTML='';
  DATA={}; MTO_LAYERS=[];
}

function showToast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=(type==='ok'?'✓ ':'⚠ ')+msg;
  t.className='toast '+type+' show';
  setTimeout(()=>t.classList.remove('show'),3200);
}


// ════════════════════════════════════════
// 파싱 엔진
// ════════════════════════════════════════

let DATA = {};  // 파싱 결과 전역 저장
let MTO_LAYERS = []; // [{step, layer, tooling, seeds, comment}]
