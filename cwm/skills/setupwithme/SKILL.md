---
name: setupwithme
description: "CWM 프로젝트 초기화 위저드. 비전 수집, 기술 분석, 워크플로우 설정, 초기 계획, 환경 파일 생성을 단계별로 수행한다."
user-invocable: true
---

# CWM setupwithme

`/cwm:setupwithme`는 프로젝트에 CWM 작업 환경을 초기화한다. 기존 프로젝트면 먼저 파일을 분석하고, 신규 프로젝트면 필요한 질문만 한다. 각 Phase는 사용자 확인 후 다음으로 넘어간다.

## Core rules

1. Phase별 진행. 확인 전 다음 Phase로 넘어가지 않는다.
2. 감지 가능한 것은 먼저 분석하고 묻지 않는다.
3. Phase 5 완료 전 코드 구현 금지.
4. “기본” 답변은 감지된 기술 스택 관례를 적용.
5. `.cwm/.initialized` 생성은 마지막에만 한다.

## Phases

### Phase 1 — Project vision

수집:
- 프로젝트 이름
- 한 문장 설명
- 현재 상태: 신규/기존
- 핵심 기능 3-5개
- 첫 번째로 만들 기능

정리 후 사용자 확인.

### Phase 2 — Technical environment

기존 프로젝트: 먼저 분석.
- package.json / pyproject.toml / go.mod
- 디렉토리 구조
- lint/test 설정
- tsconfig / Dockerfile / 기존 코드 패턴

신규 프로젝트: 언어, 프레임워크, DB, 패키지 매니저, 테스트, 린터를 묻는다.

### Phase 3 — Workflow settings

특별 규칙만 묻고 기본값을 허용한다.
- naming/import/coding convention
- error/auth/security pattern
- git branch strategy
- plan-enforcer threshold

### Phase 4 — Initial development plan

Phase 1의 첫 기능으로 pending plan 생성:

```text
.cwm/docs/plans/{YYMMDD}{NN}-{feature}/
├── PLAN.md
├── CONTEXT.md
├── CHECKLIST.md
└── .status  # pending
```

계획 요약을 보여주고 승인 요청. 이 승인은 “구현 시작”이 아니라 계획 승인이다.

### Phase 5 — Apply environment

생성/갱신:
- `.cwm/config.yml`
- `.cwm/dev-manual/chapters/01~06.md`
- root `CLAUDE.md`
- `.cwm/docs/plans`, `.cwm/docs/logs`, `.cwm/docs/reports`
- `.cwm/.initialized`

구체 템플릿은 `references/setup-templates.md`와 `references/setup-workflow.md`를 사용한다.

## Required outputs

- `.cwm/config.yml`: stack keywords, intents, locations, code_patterns, `plan_enforcer.threshold`.
- `.cwm/dev-manual/chapters/01-project-overview.md`
- `.cwm/dev-manual/chapters/02-coding-standards.md`
- `.cwm/dev-manual/chapters/03-architecture.md`
- `.cwm/dev-manual/chapters/04-error-handling.md`
- `.cwm/dev-manual/chapters/05-security.md`
- `.cwm/dev-manual/chapters/06-testing.md`
- `CLAUDE.md`
- initial pending plan directory
- `.cwm/.initialized`

## Final message

```text
✅ CWM 세팅 완료
생성된 파일: .cwm/config.yml, .cwm/dev-manual/chapters/, CLAUDE.md, .cwm/docs/plans/{first-feature}/
다음 단계: 계획 승인 → .status active → /cwm:buildwithme
```

## Safety

- 기존 파일을 덮어쓸 때는 기존 내용을 읽고 필요한 경우 보존/병합한다.
- 기존 프로젝트에서 의존성 설치나 대규모 리팩터링을 setup 중 수행하지 않는다.
- Phase 4/5 산출물 경로는 프로젝트 루트 기준 절대 경로로 처리한다.
