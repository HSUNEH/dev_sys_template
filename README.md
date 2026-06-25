# CWM : Claude With Me

<p align="center">
  <img src="./assets/hero.png" alt="Claude With Me" width="600" />
</p>

<p align="center">
  Claude Code 플러그인으로 Plan-승인-개발 워크플로우를 제공하는 하네스.<br/>
  <strong>Claude와 함께 계획하고, 판단하세요!</strong><br/>
  (토큰 관리 최적화 for Claude Pro Users)
</p> 

---

## Installation

### 1. 마켓플레이스 등록 (최초 1회)

```
/plugin marketplace add https://github.com/HSUNEH/dev_sys_template
```

### 2. 플러그인 설치

```
/plugin install cwm
```

> ⚠️ **설치 후 반드시 Claude Code를 종료(`exit`)하고 다시 시작하세요.**<br/>
> `/reload-plugins`로는 skills가 인식되지 않습니다. 재시작 후 `/cwm:setupwithme`가 정상 동작합니다.

### 3. HUD 설치 (선택)

```
/cwm:custom_command
```

상태줄에 CWM 전용 HUD를 표시합니다:

```
📂 my-app | 🔀 main | ▓▓▓░░░░░░░ 28% | 🔧12 🤖2 ⚡3 | 📋 user-auth | ██░ 26m:65%
```

| 항목 | 설명 |
|------|------|
| `📂 my-app` | 현재 작업 폴더 |
| `🔀 main` | Git 브랜치 |
| `▓▓▓░░░░░░░ 28%` | 컨텍스트 사용량 |
| `🔧12 🤖2 ⚡3` | tool / agent / skill 호출 횟수 |
| `📋 user-auth` | 현재 활성 플랜 이름 (.cwm/docs/plans/ 기반) |
| `██░ 26m:65%` | 5h 리밋 (남은 시간 : 사용 퍼센티지) |

---

## 사용법

```
/cwm:setupwithme          ← 최초 1회, 프로젝트 초기화

    ┌─────────────────────────────────┐
    │  /cwm:planwithme {작업명}         │  ← 플랜 세우기
    │      ↓                          │
    │  승인 → /compact                 │  ← 계획 확정
    │      ↓                          │
    │  /cwm:buildwithme               │  ← Phase 단위 자동 구현
    │      ↓                          │
    │  완료 → 다음 작업                  │  ← 반복
    └─────────────────────────────────┘
```

### 1. 초기화 (최초 1회)

```
> /cwm:setupwithme
```

5단계 위저드로 `.cwm/config.yml`, 개발 매뉴얼, `CLAUDE.md`를 생성합니다.

### 2. planwithme → buildwithme 반복

```
> /cwm:planwithme 로그인-기능
→ PLAN.md, CONTEXT.md, CHECKLIST.md 생성
→ 승인 → /compact

> /cwm:buildwithme
→ 활성 플랜의 Phase 단위로 build-runner 에이전트에 위임
→ 컴팩트 handoff로 plan/currentPhase/blockers만 필수 보존
→ 구현 + 테스트 일괄 수행, CHECKLIST 자동 갱신
→ 완료 → /cwm:planwithme 다음-작업
```

> 💡 계획 확정 후에는 직접 구현하지 말고 `/cwm:buildwithme`로 위임하세요. build-runner가 Phase 단위로 나눠 구현·테스트·재시도까지 자동 처리합니다.
>
> 🪨 **Token optimization:** CWM은 Caveman(`JuliusBrussee/caveman`)의 짧은 명령 스타일과 RTK(`rtk-ai/rtk`)의 verbose output 압축 아이디어를 참고해 반복 prompt block을 dedupe하고, Phase handoff에는 `plan`, `currentPhase`, `blockers`, `phaseId`, `status`만 필수 보존합니다.

간단한 수정은 플랜 없이 바로 진행됩니다:

| 방법 | 예시 |
|------|------|
| 그냥 요청 | `이 변수 이름 바꿔줘` → 바로 진행 |
| `간단:` 접두어 | `간단: 로고 교체해줘` → 플랜 우회 |

> 플랜 없이 **3개+ 파일 수정** 시 plan-enforcer가 자동 차단합니다.

---

## 3계층 강제 시스템

| 계층 | 메커니즘 | 역할 |
|:---:|----------|------|
| 1 | **CLAUDE.md 규칙** | Claude가 큰 작업 전 자발적으로 "플랜 세울까요?" 물어봄 |
| 2 | **change-logger** | 모든 변경을 `.cwm/docs/logs/change-log.md`에 무출력으로 기록 |
| 3 | **plan-enforcer** | 플랜 없이 3개+ 파일 수정 시 차단 (PreToolUse, exit 2) |

> 모든 훅은 `/cwm:setupwithme`로 초기화된 프로젝트에서만 동작합니다.

### What You'll See

CWM 훅이 동작하면 상태줄에 표시됩니다:

```
 ⠋ CWM: plan check              ← Edit/Write 전 플랜 확인 중
 ⠋ CWM: logging                 ← 변경사항 자동 기록 중
 ⠋ CWM: quality check           ← 세션 종료 시 품질 검사 중
```

플랜 없이 3개 이상 파일을 수정하면 차단됩니다:

```
⛔ [CWM] 플랜 없이 3개 파일을 수정하려 합니다

  /cwm:planwithme {작업명}  → 플랜을 먼저 세우세요
  "간단: {요청}"            → 플랜 없이 계속 진행
```

세션 종료 시 이슈가 있으면 알려줍니다:

```
⚠️ [CWM] 2 issues found — fix directly

[ESLint] src/auth.ts:
  12:5  error  'token' is defined but never used
[Security] src/db.ts:
  8: const password = "admin123"
```

---

## 플랜 상태 관리

`.status` 파일로 안정적 관리:

```
.cwm/docs/plans/{작업명}/
├── PLAN.md          # 구현 계획
├── CONTEXT.md       # 결정 근거
├── CHECKLIST.md     # 작업 추적
└── .status          # pending → active → complete
```

---

## Features

### Skills

| 명령어 | 설명 |
|--------|------|
| `/cwm:setupwithme` | 프로젝트 초기화 5단계 위저드 |
| `/cwm:planwithme` | 3문서 + .status 생성, 승인 워크플로우 (모호한 요청은 interviewwithme로 자동 위임) |
| `/cwm:interviewwithme` | 요구사항 명확화 Socratic Q&A (3차원 채점 + 브리프 생성, 단독·위임 호환) |
| `/cwm:buildwithme` | 활성 플랜을 Phase 단위로 build-runner 에이전트에 위임, 구현+테스트 일괄 수행 |
| `/cwm:dev-manual` | 작업 유형별 개발 매뉴얼 챕터 참조 |
| `/cwm:custom_command` | CWM HUD 설치 (상태줄에 플랜 상태 표시) |
| `/cwm:patch-ralph-loop` | `ralph-loop` stop-hook 세션 격리 버그 로컬 패치 (업스트림 수정 전까지) |

### Hooks

| Hook | Event | Description |
|------|-------|-------------|
| plan-enforcer | PreToolUse | 플랜 없이 3개+ 파일 수정 시 차단 |
| change-logger | PostToolUse | 모든 변경사항 자동 기록 |
| completion-checker | Stop | 세션 종료 시 린트/타입/보안 검사 |

### Agents

| 에이전트 | 역할 | 언제 쓰이는가 |
|----------|------|--------------|
| **websearchwithme** | 웹 리서치 전문 (facet 분해 + 다중 쿼리 변형 + 병렬 검색 + 구조화 리포트) | 디버깅·기술비교·베스트프랙티스 조사 |
| **build-runner** | Phase 단위 구현+테스트+재시도 전문 | buildwithme가 Phase마다 자동 위임 |

#### websearchwithme 동작

```
질의 → Facet 분해 (2-5개) → 쿼리 변형 (각 3-5개) → 병렬 WebSearch/WebFetch
     → 신뢰도 계층 분류 (공식 > GitHub > SO/HN > 블로그)
     → Executive Summary / Findings / Sources / Recommendations 리포트
     → .cwm/docs/research/{YYMMDD}-{주제}.md 저장
     → active 플랜 있으면 CONTEXT.md에 링크 추가
```

**트리거 예시:**
- 에러 디버깅: `"Next.js 14 streaming SSR 끊김 원인 찾아줘"`
- 기술 비교: `"Prisma vs Drizzle, PostgreSQL 기준으로 비교"`
- 베스트 프랙티스: `"JWT refresh token rotation 패턴 조사"`

**출력 규칙:**
- 모든 주장에 URL 인용 + 날짜 스탬프
- 상충 정보 숨기지 않음
- 공식 문서 우선, 검증 불가 항목은 "확인 필요" 태그

---

## Project Structure (after setup)

```
your-project/
├── .cwm/
│   ├── config.yml                  Hook 동작 설정
│   ├── dev-manual/chapters/        개발 가이드 (6챕터)
│   ├── docs/
│   │   ├── plans/{작업명}/         계획 문서 (PLAN, CONTEXT, CHECKLIST, .status)
│   │   ├── logs/change-log.md     변경 이력
│   │   └── research/              웹 리서치 리포트
│   ├── state/                     훅 내부 상태
│   └── .initialized               초기화 완료 마커
└── CLAUDE.md                       CWM 워크플로우 규칙
```

---

## Configuration

`.cwm/config.yml`에서 설정 변경 가능:

```yaml
plan_enforcer:
  threshold: 3              # 플랜 없이 수정 가능한 파일 수

completion_check:
  threshold_immediate_fix: 3 # 즉시 수정 권장 이슈 수
  threshold_review_recommend: 4 # 별도 검토 권장 이슈 수

general:
  require_plan: true         # 플랜 강제 글로벌 토글
```

---

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- `jq` (hooks에서 사용, 없으면 hooks 자동 스킵)

---

## License

MIT
