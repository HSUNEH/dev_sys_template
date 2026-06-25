# planwithme workflow details

## Ambiguity scoring

Score internally only; do not expose numeric scores to the user.

| Dimension | Weight | Signal |
|---|---:|---|
| Goal | 0.40 | One-sentence purpose and clear output |
| Scope | 0.30 | Impacted files/modules/dependencies/exclusions are known |
| Acceptance | 0.30 | Completion can be tested or checked |

`ambiguity = 1 - (goal * 0.40 + scope * 0.30 + acceptance * 0.30)`

If ambiguity is `> 0.20`, delegate instead of asking directly:

```text
Skill("cwm:interviewwithme", args="<원 요청 그대로>")
```

Example decisions:
- `로그인 기능 만들어줘` → ambiguous → delegate to `interviewwithme`
- `src/auth/login.ts의 bcrypt 10→12` → specific → create the plan directly

If `interviewwithme` returns `cancelled`, stop and say:

```text
📋 인터뷰가 취소되었습니다. 요청을 다시 명확히 해서 알려주시면 계획을 세우겠습니다.
```

## Plan folder naming

Create plans at:

```text
{PROJECT_ROOT}/.cwm/docs/plans/{YYMMDD}{NN}-{kebab-task}/
├── PLAN.md
├── CONTEXT.md
├── CHECKLIST.md
└── .status
```

`NN` is the next two-digit sequence for today's `YYMMDD` prefix:

```bash
DATE=$(date +%y%m%d)
TARGET_DIR="$PROJECT_ROOT/.cwm/docs/plans"
LAST=$(ls "$TARGET_DIR" 2>/dev/null \
  | grep -E "^${DATE}[0-9]{2}-" \
  | sed -E "s/^${DATE}([0-9]{2})-.*/\1/" \
  | sort -n | tail -1)
NN=$(printf "%02d" $((10#${LAST:-0} + 1)))
FOLDER="${DATE}${NN}-${KEBAB_NAME}"
```

Notes:
- If no folder exists for today, use `NN=01`.
- `10#${LAST:-0}` prevents `08`/`09` from being parsed as octal.
- Older `YYMMDD-{name}` folders do not match this pattern and can coexist.

## Approval wait output

After writing all four files, summarize and stop:

```text
📋 계획 수립 완료 — 검토 요청

📂 .cwm/docs/plans/{YYMMDD}{NN}-{작업명}/
  ├── PLAN.md       ← 전체 구현 계획
  ├── CONTEXT.md    ← 결정 근거
  ├── CHECKLIST.md  ← 작업 체크리스트
  └── .status       ← pending

[계획 요약]
  Phase 1: {단계1}
  Phase 2: {단계2}
  ...

⏸️ 검토 후 승인해주세요. 승인 전까지 코드를 작성하지 않습니다.
```

Hard stop after this message: do not read/modify code files and do not run Bash until the user replies.

## Approval handling

When the user approves with `확인`, `승인`, `진행`, `좋아`, `ㅇㅇ`, `ㄱㄱ`, `ok`, `go`, etc.:

1. Re-discover `PROJECT_ROOT` via `.cwm/.initialized`.
2. Set `.status` to `active`.
3. Check `사용자 승인 완료` in `CHECKLIST.md`.
4. Print the compact handoff message below and stop again.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 계획이 승인되었습니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 .cwm/docs/plans/{YYMMDD}{NN}-{작업명}/.status → active

컨텍스트를 정리하면 더 원활합니다.

👉 /compact 후 "계속" 이라고 입력하세요.
   (바로 진행하려면 "계속 진행" 이라고 입력하세요)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then check `/compact 안내 출력 완료` in `CHECKLIST.md`. Do not call tools after this message in the same turn.

## Resume / implementation start

When the user returns after approval or `/compact`:
1. Re-discover `PROJECT_ROOT` via `.cwm/.initialized`.
2. Find the active plan under `{PROJECT_ROOT}/.cwm/docs/plans/`.
3. Re-read that plan's `PLAN.md` and `CHECKLIST.md` from disk; do not rely on chat history.
4. Use `/cwm:dev-manual` for related chapters.
5. Implement phases in order, skipping already checked items.
6. Update `CHECKLIST.md` as each subtask completes.

When all phases are done:

```bash
echo "complete" > {PROJECT_ROOT}/.cwm/docs/plans/{YYMMDD}{NN}-{작업명}/.status
```

Then report:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ {작업명} 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.cwm/docs/plans/{YYMMDD}{NN}-{작업명}/.status → complete
```
