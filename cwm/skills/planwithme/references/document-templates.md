# planwithme document templates

These templates are deliberately kept out of the hot-path `SKILL.md`. `planwithme` must still create the same four-file plan set under the project root discovered via `.cwm/.initialized`.

## PLAN.md

```markdown
# [작업명] 계획서

## 개요
- 목적 (한 줄)
- 범위 (영향 파일/모듈)
- 예상 단계 수

## 현재 상태 분석
- 기존 코드 구조
- 변경 필요 부분

## 구현 계획
### Phase 1: [단계명]
- 구체적 작업 내용
- 예상 변경 파일

### Phase 2: [단계명]
...

## 기술 선택
- 라이브러리/패턴 + 선택 이유

## 리스크
- 예상 문제 + 대응 방안
```

## CONTEXT.md

```markdown
# [작업명] 맥락 노트

## 결정 기록
| 결정 사항 | 선택지 | 최종 선택 | 이유 |
|-----------|--------|-----------|------|

## 참조 자료
- 관련 문서/URL
- 참고 코드 위치

## 제약 조건
- 기술적/비즈니스 제약

## 사용자 요구사항 원문
> (사용자 지시 그대로)
```

When `interviewwithme` was used, also include:
- Goal one-liner
- Scope / exclusions / constraints
- Acceptance checklist
- Decision table
- Interview Q&A summary
- Brief file link

## CHECKLIST.md

```markdown
# [작업명] 체크리스트

## 작업 목록
- [ ] Phase 1: [단계명]
  - [ ] 세부 작업 1
  - [ ] 세부 작업 2
- [ ] Phase 2: [단계명]
  - [ ] 세부 작업 1

## 컨텍스트 전환 체크
- [ ] 사용자 승인 완료
- [ ] /compact 안내 출력 완료

## 품질 체크
- [ ] 에러 처리 적용
- [ ] 보안 검토
- [ ] 테스트 작성/통과
```

## .status

Single keyword file:
- `pending` — generated, waiting for approval
- `active` — approved, implementation may start
- `complete` — done

```bash
echo "pending" > {PROJECT_ROOT}/.cwm/docs/plans/{YYMMDD}{NN}-{kebab-task}/.status
```
