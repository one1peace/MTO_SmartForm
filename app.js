/* ══════════════════════════════════════
   MTO / OPC 양식 자동완성 — app.js
══════════════════════════════════════ */

// ── 초기 빈 행 ──
document.addEventListener('DOMContentLoaded', () => {
  addRow('opc', true);
  addRow('mto', true);

  // 붙여넣기 존 클릭 시 textarea 포커스
  document.getElementById('paste-zone').addEventListener('click', () => {
    document.getElementById('raw-input').focus();
  });
});

// ── 탭 전환 ──
function switchForm(type) {
  document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form-body').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + type).classList.add('active');
  document.getElementById('form-' + type).classList.add('active');
}

// ══════════════════════════════════════
//   PARSER — 표준데이터 텍스트 파싱
// ══════════════════════════════════════
function parseRaw(text) {
  const data = {
    device: '', process: '', newLib: '', baseLib: '', stream: '',
    purpose: '', tooler: '', dept: '', recn: '', mtoDate: '',
    tempRun: '', dbOwner: '', lvs: '', drc: '', lvl: '',
    tempPath: '', tempNote: '',
    maskRows: []
  };

  const lines = text.split('\n').map(l => l.replace(/\r/g, ''));
  let inMaskSection = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const parts = raw.split('\t').map(s => s.trim());
    const key = (parts[0] || '').replace(/"/g, '').trim().toLowerCase();
    const val = (parts[1] || '').trim();

    if (!key && !val) continue;

    // ── MTO 테이블 헤더 감지 ──
    if (
      key.includes('upload step') ||
      key.includes('mask id') ||
      (key.includes('mask') && key.includes('psm'))
    ) {
      inMaskSection = true;
      continue;
    }

    // ── MTO 테이블 데이터 행 ──
    if (inMaskSection) {
      // 새 섹션 헤더 또는 빈 행 → 종료
      if (!val && !parts[1]) { inMaskSection = false; continue; }
      if (key.startsWith('📚') || key.startsWith('📁') || key.startsWith('✅') || key.startsWith('⚠️') || key.startsWith('🗂') || key.startsWith('🎭')) {
        inMaskSection = false;
      } else if (parts[0]) {
        data.maskRows.push({
          maskId:  parts[0] || '',
          layer:   parts[1] || '',
          seeds:   parts[2] || '',
          comment: parts[3] || ''
        });
        continue;
      }
    }

    // ── 섹션 헤더 (이모지 포함) → 스킵 ──
    if (key.startsWith('📚') || key.startsWith('📁') || key.startsWith('✅') ||
        key.startsWith('⚠️') || key.startsWith('🗂') || key.startsWith('🎭') ||
        key.includes('verify') || key.includes('library') || key.includes('stream 경로')) {
      // 섹션명 행이지만 값이 있으면 파싱
    }

    // ── 키-값 매핑 ──
    if (key.includes('mto') && key.includes('date')) {
      data.mtoDate = val;
    } else if (key === '목적') {
      data.purpose = val;
    } else if (key === 'tooler') {
      data.tooler = val;
    } else if (key === 'device') {
      data.device = val;
    } else if (key === 'process') {
      data.process = val;
    } else if (key === '귀속부서') {
      data.dept = val;
    } else if (key === 'recn') {
      data.recn = val;
    } else if (key.includes('new lib')) {
      data.newLib = val;
    } else if (key.includes('base lib') && !key.includes('mask')) {
      data.baseLib = val;
    } else if (key.includes('stream') || key.includes('stream 경로')) {
      data.stream = val || (parts[1] || '');
    } else if ((key.includes('temp') || key.includes('내용')) && !key.includes('경로') && !key.includes('비고') && !inMaskSection) {
      data.tempRun = val;
    } else if (key.includes('db 작업') || key.includes('db작업') || key.includes('담당자')) {
      data.dbOwner = val;
    } else if (key === 'lvs 경로' || key === 'lvs') {
      data.lvs = val;
    } else if (key === 'drc 경로' || key === 'drc') {
      data.drc = val;
    } else if (key === 'lvl 경로' || key === 'lvl') {
      data.lvl = val;
    } else if (key.includes('temp') && key.includes('경로')) {
      data.tempPath = val;
    } else if (key.includes('temp') && key.includes('비고')) {
      data.tempNote = val;
    }
  }

  return data;
}

// ══════════════════════════════════════
//   FILL — 파싱 결과 → 양식 채우기
// ══════════════════════════════════════
function parseAndFill() {
  const raw = document.getElementById('raw-input').value.trim();
  if (!raw) { showToast('⚠️ 표준데이터를 먼저 붙여넣기 하세요.'); return; }

  const d = parseRaw(raw);

  // OPC
  setField('opc-device',   d.device,  'blue');
  setField('opc-process',  d.process, 'blue');
  setField('opc-newlib',   d.newLib,  'blue');
  setField('opc-purpose',  d.purpose, 'blue');
  setField('opc-date',     d.mtoDate, 'blue');

  // MTO
  setField('mto-device',   d.device,  'green');
  setField('mto-process',  d.process, 'green');
  setField('mto-purpose',  d.purpose, 'green');
  setField('mto-dept',     d.dept,    'green');
  setField('mto-recn',     d.recn,    'green');
  setField('mto-date',     d.mtoDate, 'green');

  // Mask rows
  const rows = d.maskRows.length > 0
    ? d.maskRows
    : [{ maskId: '', layer: '', seeds: '', comment: '' }];

  ['opc', 'mto'].forEach(type => {
    document.getElementById(type + '-mask-body').innerHTML = '';
    rows.forEach(r => addRow(type, false, r));
  });

  // 파싱 미리보기
  renderPreview(d);

  showToast('✅ 자동완성 완료! OPC / MTO 양식을 확인하세요.');
}

function setField(id, value, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value || '';
  el.classList.remove('auto-filled', 'auto-filled-green');
  if (value) {
    el.classList.add(color === 'green' ? 'auto-filled-green' : 'auto-filled');
  }
}

function renderPreview(d) {
  const preview = document.getElementById('parsed-preview');
  const grid = document.getElementById('preview-grid');
  const entries = [
    ['Device',    d.device],
    ['Process',   d.process],
    ['목적',      d.purpose],
    ['New lib.',  d.newLib],
    ['MTO Date',  d.mtoDate],
    ['귀속부서',  d.dept],
    ['RECN',      d.recn],
    ['Mask 행수', d.maskRows.length ? d.maskRows.length + '행' : '0'],
  ].filter(([, v]) => v);

  grid.innerHTML = entries.map(([k, v]) => `
    <div class="preview-item">
      <span class="preview-key">${k}</span>
      <span class="preview-val">${v}</span>
    </div>
  `).join('');

  preview.style.display = entries.length ? 'block' : 'none';
}

// ══════════════════════════════════════
//   TABLE ROWS
// ══════════════════════════════════════
function addRow(type, empty = false, data = {}) {
  const tbody = document.getElementById(type + '-mask-body');
  const tr = document.createElement('tr');
  const filled = data.maskId ? ' auto-filled' : '';

  tr.innerHTML = `
    <td><input type="text" class="mono${filled}" value="${esc(data.maskId||'')}" placeholder="예) 3.2EH"></td>
    <td><input type="text" class="mono${filled}" value="${esc(data.layer||'')}"  placeholder="예) NORMAL_VTN"></td>
    <td><input type="text" class="${filled}"     value="${esc(data.seeds||'')}"  placeholder="O / X" style="width:90px"></td>
    <td><input type="text"                        value="${esc(data.comment||'')}" placeholder="특이사항"></td>
    <td><button class="btn-del-row" onclick="this.closest('tr').remove()" title="행 삭제">✕</button></td>
  `;
  tbody.appendChild(tr);
}

function esc(str) {
  return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ══════════════════════════════════════
//   COPY
// ══════════════════════════════════════
function copyForm(type) {
  let text = '';

  if (type === 'opc') {
    const rows = collectTableRows('opc-mask-body');
    text = [
      'DB\tDevice\t' + g('opc-device') + '\tProcess\t' + g('opc-process'),
      '\tNew Lib.\t' + g('opc-newlib') + '\t\t',
      'OPC\t목적\t' + g('opc-purpose') + '\t\t',
      '\t설계 TEG변경\t' + g('opc-teg') + '\tHistory\t' + g('opc-history'),
      '\t진행률\t' + g('opc-progress') + '\tUpload Date\t' + g('opc-date'),
      '\tMask ID (PSM 포함)\tLayer\tSEEDS Verification\t특이사항 Comment',
      ...rows
    ].join('\n');
  } else {
    const rows = collectTableRows('mto-mask-body');
    text = [
      'DB\tDevice\t' + g('mto-device') + '\tProcess\t' + g('mto-process'),
      'MTO\t목적\t' + g('mto-purpose') + '\t\t',
      '\t귀속부서\t' + g('mto-dept') + '\tRECN\t' + g('mto-recn'),
      '\t진행률\t' + g('mto-progress') + '\tMTO Date\t' + g('mto-date'),
      '\tMask ID (PSM 포함)\tLayer\tSEEDS Verification\t특이사항 Comment',
      ...rows
    ].join('\n');
  }

  navigator.clipboard.writeText(text)
    .then(() => showToast('📋 ' + (type === 'opc' ? 'OPC' : 'MTO') + ' 양식이 복사되었습니다!'))
    .catch(() => showToast('⚠️ 복사 실패. 수동으로 복사해 주세요.'));
}

function g(id) {
  return (document.getElementById(id) || {}).value || '';
}

function collectTableRows(tbodyId) {
  return Array.from(document.querySelectorAll('#' + tbodyId + ' tr')).map(tr => {
    const inputs = tr.querySelectorAll('input');
    return '\t' + Array.from(inputs).map(i => i.value).join('\t');
  });
}

// ══════════════════════════════════════
//   RESET
// ══════════════════════════════════════
function resetForm(type) {
  const ids = type === 'opc'
    ? ['opc-device','opc-process','opc-newlib','opc-purpose','opc-teg','opc-history','opc-progress','opc-date']
    : ['mto-device','mto-process','mto-purpose','mto-dept','mto-recn','mto-progress','mto-date'];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.classList.remove('auto-filled', 'auto-filled-green');
    }
  });

  document.getElementById(type + '-mask-body').innerHTML = '';
  addRow(type, true);
}

function clearAll() {
  document.getElementById('raw-input').value = '';
  document.getElementById('parsed-preview').style.display = 'none';
  resetForm('opc');
  resetForm('mto');
}

// ══════════════════════════════════════
//   TOAST
// ══════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}
