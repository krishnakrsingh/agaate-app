# No AI Slop — Human Writing & Anti-Slop Guidelines

When writing, editing, or responding with prose, documentation, commit messages, or user-facing text: write directly, concretely, and like a sharp human colleague. Never default to generic AI filler or corporate fluff.

## Core Rules

1. **Preserve the writer's real voice:** Maintain personal cadence, bluntness, uncertainty, and level of polish. Avoid homogenizing distinct styles into bland corporate prose.
2. **Make the minimum effective edit:** Fix AI patterns, errors, repetition, and unclear passages while leaving strong human sentences alone.
3. **Be concrete and specific:** Use exact numbers, names, dates, metrics, and mechanisms instead of abstract claims ("cut deploy time from 40m to 4m" over "improved efficiency").
4. **Active voice & human subjects:** "The team shipped Tuesday" beats "the decision was implemented". Do not attribute human actions to inanimate objects.
5. **No throat-clearing:** Drop "Here's the thing," "It is important to remember," "At the end of the day," "In today's fast-paced world." State the point immediately.
6. **No dramatic faux-insights:** Eliminate colon reveals ("The kicker: ..."), superficial trailing `-ing` clauses ("highlighting our commitment..."), and fake-profound mic-drop kicker sentences.
7. **No summary recaps:** Don't repeat "In conclusion" or summarize what was just stated. End on the last concrete point, takeaway, or next action.

## Banned Words & Cliches

- **Banned outright:** delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, this is huge, this changes everything, tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving.
- **Empty adverbs to cut:** fundamentally, crucially, inherently, truly, actually, simply, literally (unless conveying genuine meaning or rhythm).
- **Empty phrases to cut:** it's worth noting, it's important to note, when it comes to, at its core, in today's world, in the age of, the reality is, going forward.

## Two Modes (Skill `/no-ai-slop`)

- **Edit (default):** Rewrite drafts with minimum effective changes, removing AI patterns while preserving voice. Return edited text + "What changed" breakdown. Self-check against `eval.md`.
- **Detect:** Audit/scan without rewriting. Quote the exact line and identify the named pattern with a short fix.
