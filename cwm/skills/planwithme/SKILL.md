---
name: planwithme
description: "개발 계획 수립 및 3문서 자동 생성. 새 작업 시작 전 반드시 실행하여 PLAN.md, CONTEXT.md, CHECKLIST.md + .status 파일을 생성한다."
user-invocable: true
---

# CWM 계획 관리

모든 개발 작업은 **계획 수립 → 승인 → 실행** 순서를 따른다. 이 스킬의 hot path는 루트 탐색, 모호도 판단, 4파일 생성, 승인 대기/승인 처리만 담당한다. 긴 템플릿과 예시는 상대 링크로 분리했다:

- [문서 템플릿](references/document-templates.md)
- [모호도·순번·승인 흐름 상세](references/workflow-details.md)

## 1. 프로젝트 루트 결정 (필수)

플랜 생성/조회/승인 처리 전에 **항상** 현재 CWD부터 상위로 올라가며 `.cwm/.initialized`를 찾는다. 찾은 디렉토리가 `PROJECT_ROOT`이고, 모든 플랜 경로는 이 절대 경로 기준이다.

```bash
PROJECT_ROOT=$(pwd)
while [ "$PROJECT_ROOT" != "/" ]; do
  [ -f "$PROJECT_ROOT/.cwm/.initialized" ] && break
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[ -f "$PROJECT_ROOT/.cwm/.initialized" ] || echo "ERROR: .cwm not initialized"
```

금지:
- 상대 경로만으로 `.cwm/docs/plans/...` 파일을 만들지 않는다.
- CWM 플러그인 소스 디렉토리 안에 플랜을 만들지 않는다.
- `.cwm/.initialized`를 못 찾으면 `/cwm:setupwithme` 실행을 안내한다.
- Bash 작업 중 `cd` 했다면 플랜 파일 조작 전 루트를 재확인하거나 절대 경로를 사용한다.

## 2. 실행 흐름

1. 사용자 작업 지시를 받는다.
2. 내부에서 Goal/Scope/Acceptance 모호도를 채점한다.
   - 임계값: `ambiguity > 0.20`이면 직접 질문하지 말고 `Skill("cwm:interviewwithme", args="<원 요청 그대로>")`에 위임한다.
   - 채점식, 취소 처리, 예시는 [workflow-details.md](references/workflow-details.md#ambiguity-scoring)를 따른다.
3. 명확한 요청 또는 interview 결과를 기반으로 기존 코드/구조를 조사하고 구현 전략을 세운다.
4. `{PROJECT_ROOT}/.cwm/docs/plans/{YYMMDD}{NN}-{kebab-task}/` 아래 4파일을 생성한다.
5. 계획 요약을 표시하고 **반드시 멈춘다**. 승인 전 코드 작성 금지.
6. 사용자가 승인하면 `.status → active`, 체크리스트 승인 항목 갱신, `/compact` 안내 후 다시 멈춘다.

## 3. 생성 파일 계약

항상 같은 폴더에 다음 4파일을 만든다:

```text
{PROJECT_ROOT}/.cwm/docs/plans/{YYMMDD}{NN}-{kebab-task}/
├── PLAN.md
├── CONTEXT.md
├── CHECKLIST.md
└── .status
```

문서 내용은 [document-templates.md](references/document-templates.md)를 따른다.

필수 계약:
- `PLAN.md`: 목적, 범위, 현재 상태 분석, Phase별 구현 계획, 기술 선택, 리스크.
- `CONTEXT.md`: 결정 기록, 참조 자료, 제약 조건, 사용자 원문. interview 결과가 있으면 Goal/Scope/Acceptance/결정/Q&A/브리프 링크도 통합.
- `CHECKLIST.md`: Phase 작업 목록, `사용자 승인 완료`, `/compact 안내 출력 완료`, 품질 체크.
- `.status`: 처음에는 정확히 `pending`.

폴더명은 `YYMMDD{NN}-{kebab-task}`이다. `YYMMDD`는 `date +%y%m%d`, `NN`은 오늘 생성된 같은 prefix의 최대 순번 + 1(2자리 zero-pad). 계산 예시는 [workflow-details.md](references/workflow-details.md#plan-folder-naming)를 따른다.

## 4. 승인 대기 hard stop

4파일 생성 후 다음 의미의 메시지를 출력하고 멈춘다:

- `📋 계획 수립 완료 — 검토 요청`
- 생성된 `.cwm/docs/plans/{YYMMDD}{NN}-{작업명}/`와 4파일 목록
- Phase 요약
- `검토 후 승인해주세요. 승인 전까지 코드를 작성하지 않습니다.`

정확한 출력 예시는 [workflow-details.md](references/workflow-details.md#approval-wait-output)를 참고한다.

**이 메시지 출력 후 같은 턴에서 절대 금지:**
- 코드 파일 읽기/수정
- Bash 실행
- 구현 시작

## 5. 승인 처리

사용자가 `확인`, `승인`, `진행`, `좋아`, `ㅇㅇ`, `ㄱㄱ`, `ok`, `go` 등으로 동의하면:

1. `.cwm/.initialized` 기준으로 `PROJECT_ROOT`를 다시 결정한다.
2. 해당 플랜의 `.status`를 `active`로 바꾼다.
3. `CHECKLIST.md`의 `사용자 승인 완료`를 체크한다.
4. `/compact` 안내를 출력하고 `CHECKLIST.md`의 `/compact 안내 출력 완료`도 체크한다.
5. 안내 출력 후 같은 턴에서 도구를 호출하지 않는다.

정확한 안내 문구는 [workflow-details.md](references/workflow-details.md#approval-handling)를 따른다.

## 6. 승인 이후 구현 재개

사용자가 다음 턴 또는 `/compact` 후 돌아오면:

1. `PROJECT_ROOT`를 다시 결정한다.
2. `{PROJECT_ROOT}/.cwm/docs/plans/`에서 `.status`가 `active`인 플랜을 찾는다.
3. 해당 `PLAN.md`와 `CHECKLIST.md`를 파일에서 다시 읽는다. 대화 히스토리에 의존하지 않는다.
4. `/cwm:dev-manual`로 관련 챕터를 참조한다.
5. Phase 1부터 순서대로 구현하고, 이미 체크된 항목은 건너뛴다.
6. 세부 작업 완료 시 `CHECKLIST.md`를 갱신한다.

모든 Phase 완료 시 `.status`를 `complete`로 바꾸고 완료를 보고한다. 상세 문구는 [workflow-details.md](references/workflow-details.md#resume--implementation-start)를 따른다.

## 중요 규칙

1. 계획 먼저 — 코드 한 줄 전에 3문서부터.
2. 승인 필수 — 승인 전 같은 턴에서 코드 작성 금지.
3. `.status`로 추적 — `pending` / `active` / `complete`.
4. 실시간 갱신 — `CHECKLIST.md` 계속 업데이트.
5. 맥락 보존 — 새 세션에서도 `.cwm/docs/plans/`를 읽으면 이어서 가능.