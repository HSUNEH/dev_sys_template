# setupwithme templates

Templates moved out of the hot-path setup skill.

## CLAUDE.md template

````markdown
# CLAUDE.md

## 이 프로젝트
- **이름**: {프로젝트명}
- **설명**: {한 줄 설명}
- **기술 스택**: {스택}
- **패키지 매니저**: {매니저}

## CWM 작업 규칙

1. **활성 플랜(🟡)이 없을 때 코드를 수정하기 전에 반드시 사용자에게 확인**
   - 간단한 작업 → "바로 진행할게요" 확인 후 진행
   - 큰 작업 → "/cwm:planwithme 로 플랜을 세울까요?" 제안
2. **"간단:", "바로:" 접두어 → 확인 없이 즉시 진행**
3. **활성 플랜이 있으면 → PLAN.md/CHECKLIST.md 따라 진행**
4. **한 턴에 계획과 구현을 동시에 하지 않는다**

## 디렉토리 규칙

- **프로젝트 루트**: `.cwm/.initialized` 파일이 존재하는 디렉토리. 모든 CWM 파일 경로는 이 위치 기준의 절대 경로를 사용한다.
- **`cd` 금지**: Bash로 `cd`를 사용한 경우(git 작업 등) 반드시 프로젝트 루트로 돌아온다. 또는 절대 경로만 사용하여 CWD 변경 없이 작업한다.
- **파일 생성 시 절대 경로 필수**: `.cwm/docs/plans/...` 같은 상대 경로 대신 `/full/path/to/project/.cwm/docs/plans/...` 형태로 사용한다.

## 컨텍스트 관리

- **계획 → 구현 전환 시**: `{프로젝트 루트}/.cwm/docs/plans/{YYMMDD}{NN}-{작업명}/`의 PLAN.md, CHECKLIST.md를 파일에서 다시 읽고 시작
- **새 세션 또는 /compact 후 이어서**: 먼저 `.cwm/.initialized`로 프로젝트 루트를 찾고, `.cwm/docs/plans/` 아래에서 .status가 "active"인 플랜을 찾아 CHECKLIST.md의 미체크 항목부터 이어서 진행

## 필수 워크플로우

1. `/cwm:planwithme`로 3문서 생성
2. 사용자 승인 대기 → .status를 "active"로 변경
3. `/cwm:dev-manual`로 관련 챕터 참조
4. Phase 순서대로 구현, CHECKLIST.md 실시간 업데이트
5. 완료 시 .status를 "complete"로 변경

## 서브에이전트

- **websearchwithme**: 웹 리서치 전문. 디버깅·기술비교·베스트프랙티스 조사 시 Task로 위임
- **build-runner**: Phase 단위 구현+테스트+재시도 전문. buildwithme가 Phase마다 자동 위임해 메인 컨텍스트 오염 없이 실행
````

## Directory creation

```bash
mkdir -p {PROJECT_ROOT}/.cwm/docs/plans \
  {PROJECT_ROOT}/.cwm/docs/logs \
  {PROJECT_ROOT}/.cwm/docs/reports \
  {PROJECT_ROOT}/.cwm/dev-manual/chapters
```

## Completion marker

```bash
touch {PROJECT_ROOT}/.cwm/.initialized
```

## Initial plan skeleton

```text
.cwm/docs/plans/{YYMMDD}{NN}-{feature}/
├── PLAN.md
├── CONTEXT.md
├── CHECKLIST.md
└── .status          # pending
```

## config.yml fields to customize

- `keywords`: detected stack and project terms.
- `intents`: project-specific intent examples.
- `locations`: actual directories.
- `code_patterns`: detected language/framework patterns.
- `plan_enforcer.threshold`: Phase 3 value or default.
