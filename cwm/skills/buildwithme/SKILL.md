---
name: buildwithme
description: "활성 CWM 플랜의 미완료 Phase를 build-runner에 순차 위임해 구현+테스트+체크리스트 갱신까지 수행. compact handoff로 메인 컨텍스트 토큰 낭비를 줄인다."
user-invocable: true
argument-hint: (없음 — 활성 플랜 자동 감지)
---

# CWM buildwithme

활성 플랜(`.cwm/docs/plans/*/.status == active`)의 미완료 Phase를 찾아 `build-runner` subagent에 위임한다. 메인 컨텍스트에는 Phase별 짧은 YAML 요약만 남긴다.

## 절차

1. 프로젝트 루트 찾기: 현재 경로에서 위로 올라가며 `.cwm/.initialized` 확인.
2. 활성 플랜 찾기: `.cwm/docs/plans/*/.status` 중 값이 `active`인 첫 디렉터리.
3. 명령 결정:
   - `.cwm/config.yml`의 `build.test_cmd`, `build.lint_cmd`, `build.max_retries` 우선.
   - 없으면 매니페스트 추론: `package.json`→`npm test`, `pyproject.toml`/`pytest.ini`→`pytest`, `Cargo.toml`→`cargo test`, `go.mod`→`go test ./...`, `Makefile`→`make test`.
4. `CHECKLIST.md`에서 체크 안 된 Phase를 순서대로 처리.
5. 각 Phase마다 아래 compact handoff만 포함해 `build-runner` 호출.
6. agent가 `status: pass`면 해당 Phase 체크박스 `[x]` 처리. 실패면 사용자에게 요약과 선택지를 묻고 중단/재시도/스킵.
7. 모든 Phase가 통과하면 `.status`를 `complete`로 바꾸고 최종 요약.

## build-runner handoff template

```text
[buildwithme 위임]
active_plan: {ACTIVE_PLAN}
phase: {Phase 번호 + 이름}
phaseId: {Phase 식별자}
status: active
plan: {이 Phase에 필요한 PLAN.md 요약만}
currentPhase: {체크 안 된 세부 작업만}
blockers: {없으면 []}
paths:
  PLAN.md: {ACTIVE_PLAN}/PLAN.md
  CONTEXT.md: {ACTIVE_PLAN}/CONTEXT.md
  CHECKLIST.md: {ACTIVE_PLAN}/CHECKLIST.md
commands:
  lint_cmd: {있으면 값, 없으면 ""}
  test_cmd: {있으면 값, 없으면 ""}
  max_retries: {숫자}
rules:
  - 필요한 파일만 읽어라. PLAN/CONTEXT/CHECKLIST 전체를 반복 삽입하지 마라.
  - 반복 안내는 1회만 유지한다.
  - 긴 command output은 실패 원인/파일/라인/다음 조치만 3-5줄로 압축한다.
  - 반환은 아래 YAML만.
return_yaml:
  status: pass | fail
  phase: {Phase 번호}
  files_changed: []
  lint_result: pass | fail | skipped
  test_result: pass | fail | skipped
  retries_used: 0-{max_retries}
  failure_summary: ""
  next_steps: ""
```

## 입력 실패 처리

- `.cwm/.initialized` 없음: `/cwm:setupwithme 먼저 실행해주세요`
- 활성 플랜 없음: `/cwm:planwithme {작업명} 먼저 실행·승인해주세요`
- test/lint 명령 추론 실패: 사용자에게 명령을 물어보고 `.cwm/config.yml`에 저장.

## 체크리스트 갱신 규칙

- pass인 Phase와 그 하위 항목만 `[x]`로 바꾼다.
- fail/중단 Phase는 그대로 둔다.
- build-runner는 PLAN/CHECKLIST/.status를 직접 수정하지 않는다. buildwithme가 처리한다.

## 최종 출력

```text
✅ {작업명} 구현 + 테스트 완료
Phases: {완료}/{전체}
린트: {lint_cmd 또는 skipped}
테스트: {test_cmd 또는 skipped}
변경 파일: ...
.status → complete
```

## 토큰 최적화 기준

- Caveman 참고: 명령/지시문은 짧고 직접적으로.
- RTK 참고: verbose output은 context 진입 전에 압축.
- `scripts/token-compact.mjs`는 이 정책의 로컬 측정/검증 도구다.
