# setupwithme workflow details

Verbose workflow details moved out of the hot-path `setupwithme/SKILL.md`.

## Opening message

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 CWM 프로젝트 초기화를 시작합니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5단계를 거쳐 개발 환경을 세팅합니다:
  Phase 1  프로젝트 비전        ← 지금
  Phase 2  기술 환경
  Phase 3  워크플로우 설정
  Phase 4  초기 개발 계획
  Phase 5  환경 세팅 적용
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Phase 1 questions

```text
📋 Phase 1: 프로젝트에 대해 알려주세요
1. 프로젝트 이름은?
2. 한 문장으로 설명하면?
3. 현재 상태는? (아이디어 단계 / 기존 프로젝트에 적용)
4. 핵심 기능 3~5개
5. 첫 번째로 만들고 싶은 기능은?
```

## Phase 2 analysis targets

```text
package.json / pyproject.toml / go.mod    → 기술 스택
디렉토리 구조                              → 레이아웃
.eslintrc / prettier / biome.json          → 린터
tsconfig.json                              → 언어 설정
테스트 파일                                 → 테스트 프레임워크
Dockerfile                                 → 배포 환경
기존 코드 샘플                              → 네이밍/패턴 추론
```

New project questions:

```text
📋 Phase 2: 기술 환경
1. 언어: TypeScript / JavaScript / Python / Go / 기타
2. 프레임워크: Next.js / React / FastAPI / Express / 기타
3. DB: PostgreSQL / MongoDB / MySQL / SQLite / 없음
4. 패키지 매니저: npm / yarn / pnpm / pip / poetry
5. 테스트: Jest / Vitest / Pytest / 없음
6. 린터: ESLint+Prettier / Biome / Ruff / 없음
```

## Phase 3 questions

```text
📋 Phase 3: 개발 워크플로우
특별한 규칙이 있는 것만 답해주세요. 없으면 "기본".

[코딩 규칙]
1. 네이밍: camelCase / snake_case / 기본
2. import 순서: 특별한 규칙 있으면
3. 코딩 컨벤션: 있으면 설명

[에러 처리 & 보안]
4. 에러 처리 패턴: 커스텀 에러 / Result 패턴 / 기본
5. 인증 방식: JWT / Session / OAuth / 없음

[프로세스]
6. Git 브랜치 전략: GitHub Flow / trunk-based / 기본
7. plan-enforcer 임계값: 기본 3파일 / 원하는 숫자
```

## Dev manual chapter mapping

| Chapter | Source info |
|---|---|
| 01 project-overview | Phase 1 + Phase 2 |
| 02 coding-standards | Phase 3 + Phase 2 |
| 03 architecture | Phase 2 + Phase 1 |
| 04 error-handling | Phase 3 + Phase 2 |
| 05 security | Phase 3 + Phase 2 |
| 06 testing | Phase 2 + Phase 3 |

Chapter writing rules:
- Be concrete.
- Include code examples when useful.
- Include DO / DON'T examples.
- Match the project's detected stack.

## Completion message

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CWM 세팅 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
생성된 파일:
  .cwm/config.yml
  .cwm/dev-manual/chapters/
  CLAUDE.md
  .cwm/docs/plans/{첫기능}/
다음 단계:
  1. 초기 계획을 승인하면 구현을 시작합니다
  2. 새 작업은 /cwm:planwithme 로 플랜을 먼저 세우세요
  3. /cwm:dev-manual 로 개발 매뉴얼을 참조하세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
