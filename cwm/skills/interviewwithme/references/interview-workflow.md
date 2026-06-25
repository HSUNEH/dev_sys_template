# interviewwithme workflow details

This reference holds verbose details moved out of the hot-path `interviewwithme/SKILL.md`.

## Dimensions

| Dimension | Weight | Code-work interpretation | General interpretation |
|---|---:|---|---|
| Goal | 0.40 | What should be built; concrete output | Purpose/result is one sentence |
| Scope | 0.30 | Files/modules/constraints/non-goals | Boundaries/includes/excludes/constraints |
| Acceptance | 0.30 | Testable done criteria | How the user will judge “done” |

Score each dimension 0.0-1.0:

- 0.9+: clear enough to act.
- 0.6-0.9: mostly clear, minor questions.
- 0.3-0.6: assumptions remain.
- 0.0-0.3: direction unclear.

## Suggested opening

```text
📋 요구사항을 조금 더 명확히 하겠습니다. 몇 가지 여쭤볼게요.
```

## Question styles

| Dimension | Question style |
|---|---|
| Goal | “X라고 했는데, 구체적으로 어떤 결과를 원하세요?” |
| Scope | “기존 Y를 확장하나요, 별도 기능인가요?” / “Z는 포함하나요?” |
| Acceptance | “완료됐다는 걸 어떻게 확인할까요?” / “이런 동작이면 OK인가요?” |

Round header, if useful:

```text
Round {n} | Targeting: {weakest dimension} | 현재 명확성: {rough label, no numeric score}
```

## End choices

When sufficiently clear:

```text
요구사항이 충분히 명확해졌습니다. 어떻게 할까요?
- 이제 브리프 생성 (권장)
- 한 가지 더 묻기
- 취소
```

## Brief path algorithm

```bash
PROJECT_ROOT=$(pwd)
while [ "$PROJECT_ROOT" != "/" ]; do
  [ -f "$PROJECT_ROOT/.cwm/.initialized" ] && break
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[ -f "$PROJECT_ROOT/.cwm/.initialized" ] || PROJECT_ROOT=$(pwd)

DATE=$(date +%y%m%d)
BRIEFS_DIR="$PROJECT_ROOT/.cwm/docs/briefs"
mkdir -p "$BRIEFS_DIR"
LAST=$(ls "$BRIEFS_DIR" 2>/dev/null \
  | grep -E "^${DATE}[0-9]{2}-" \
  | sed -E "s/^${DATE}([0-9]{2})-.*/\1/" \
  | sort -n | tail -1)
NN=$(printf "%02d" $((10#${LAST:-0} + 1)))
```

## Brief template

```markdown
# 요구사항 브리프: {topic}

_작성일: YYYY-MM-DD | 라운드: N | 최종 모호도: X%_

## 원 질의
> {user request}

## 명확화된 요구사항

### Goal (0.XX)
{one sentence goal}

### Scope (0.XX)
- 포함: {...}
- 제외: {...}
- 제약: {...}

### Acceptance (0.XX)
- [ ] {checkable criterion 1}
- [ ] {checkable criterion 2}

## 인터뷰 기록
| R | 질문 | 답변 | 움직인 차원 |
|---|---|---|---|
| 1 | ... | ... | Goal 0.6 → 0.9 |

## 결정 사항
| 결정 | 선택지 | 최종 | 근거 |
|---|---|---|---|
| ... | ... | ... | ... |

## 드러난 가정
- {...}
```

## Standalone final message

```text
📄 브리프 저장: .cwm/docs/briefs/{YYMMDD}{NN}-{topic}.md
최종 명확성: Goal {g} / Scope {s} / Acceptance {a}
모호도: {X}%
```
