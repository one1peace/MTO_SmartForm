# MTO / OPC 양식 자동완성

> Samsung DS DRAM 설계팀 — MTO 표준데이터 → OPC / MTO 양식 자동완성 도구

🔗 **Live Site**: `https://one1peace.github.io/MTO_smartForm/`

---

## 사용법

1. **표준데이터 입력** — MTO 표준 폼 전체를 복사하여 좌측 텍스트 박스에 붙여넣기
2. **⚡ 자동완성 실행** 클릭
3. 우측 **OPC 양식 / MTO 양식** 탭에서 자동완성 결과 확인
4. 빈 항목 직접 수정 후 **📋 복사** 버튼으로 클립보드 복사
5. 사내 시스템에 붙여넣기

---

## GitHub Pages 배포 방법

1. GitHub에서 새 Repository 생성 (예: `MTO_OPC_Form`)
2. 이 폴더의 파일 3개를 업로드:
   - `index.html`
   - `style.css`
   - `app.js`
3. Repository → **Settings** → **Pages**
4. Source: `Deploy from a branch` → Branch: `main` → `/root` → **Save**
5. 잠시 후 `https://<username>.github.io/<repo-name>/` 접속

---

## 파일 구조

```
MTO_OPC_Form/
├── index.html   # 메인 페이지
├── style.css    # 스타일 (다크 테마)
├── app.js       # 파싱 & 자동완성 로직
└── README.md
```

---

## 표준데이터 매핑

| 표준데이터 항목 | OPC 양식 | MTO 양식 |
|---|---|---|
| Device | ✅ | ✅ |
| Process | ✅ | ✅ |
| 목적 | ✅ | ✅ |
| New lib. | ✅ | — |
| MTO Date | Upload Date | MTO Date |
| 귀속부서 | — | ✅ |
| RECN | — | ✅ |
| Mask ID / Layer (MTO 테이블) | ✅ | ✅ |
