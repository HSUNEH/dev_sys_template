---
name: interviewwithme
description: "범용 요구사항 명확화 스킬. 모호한 요청을 Goal/Scope/Acceptance로 채점하고 한 번에 한 질문씩 인터뷰해 브리프를 만든다."
user-invocable: true
argument-hint: <명확화할 주제 또는 요청>
---

# CWM interviewwithme

모호한 요청을 바로 실행하지 말고 `Goal / Scope / Acceptance` 기준으로 명확화한 뒤 브리프를 저장한다. 단독 호출 가능하며 `planwithme`가 자동 위임할 수도 있다.

## Hot-path contract

- 적용: 코드 작업, 문서 기획, 아이디어 정리 등 요구사항 명확화 전반.
- 채점: `ambiguity = 1 - (goal*0.40 + scope*0.30 + acceptance*0.30)`.
- 종료 기준: `ambiguity <= 0.20` 또는 최대 5라운드.
- 질문: 라운드당 1개만. 가장 낮은 차원을 겨냥. 코드/파일로 확인 가능한 내용은 먼저 Read/Grep.
- 사용자에게 내부 점수 숫자는 노출하지 않는다.
- 취소 시 incomplete brief를 저장하고 `cancelled` 반환.

## Procedure

1. 프로젝트 루트 찾기: 위로 올라가며 `.cwm/.initialized`; 없으면 현재 경로를 루트로 사용.
2. 원 요청을 G/S/A로 내부 채점.
3. `ambiguity <= 0.20`이면 인터뷰 생략 후 브리프 생성.
4. 아니면 최대 5라운드:
   - `AskUserQuestion`으로 2-4개 선택지 + Other.
   - 한 번에 한 질문만.
   - 답변 후 재채점.
   - 충분히 명확해지면 “브리프 생성 / 한 가지 더 / 취소” 선택.
5. `.cwm/docs/briefs/{YYMMDD}{NN}-{topic}.md` 생성. 취소/미완료는 `-incomplete.md`.
6. 단독 호출이면 브리프 경로와 요약을 출력. `planwithme` 위임이면 구조화 데이터를 반환.

## Brief content

브리프에는 반드시 포함한다:

- 원 질의
- Goal 한 문장
- Scope: 포함 / 제외 / 제약
- Acceptance 체크리스트
- 인터뷰 기록
- 결정 사항
- 드러난 가정
- 최종 모호도와 차원별 점수는 문서에는 기록 가능하되, 대화 중에는 숫자를 과도하게 노출하지 않는다.

세부 템플릿과 질문 예시는 `references/interview-workflow.md` 참고.

## Return to planwithme

`planwithme` 위임 시 다음 구조로 인계한다:

- Goal → `PLAN.md` 개요
- Scope → `PLAN.md` 범위 + `CONTEXT.md` 제약
- Acceptance → `CHECKLIST.md` 품질 체크
- 결정 사항 → `CONTEXT.md` 결정 기록
- 인터뷰 기록 → `CONTEXT.md` “인터뷰 기록 (interviewwithme)”
- 브리프 링크 → `CONTEXT.md` 참조 자료

## Hard rules

1. 라운드당 2개 이상 질문 금지.
2. 코드/파일에서 확인 가능한 것을 사용자에게 묻지 말 것.
3. 5라운드 초과 금지. 넘으면 현재 수준으로 진행할지 묻기.
4. 임계값 미달인데 조용히 완료 처리 금지.
5. `Skill("cwm:interviewwithme", args="<원 요청>")` 호환성을 유지한다.
