<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ponytail-rules -->

# Ponytail — Lazy Senior Dev Mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung of the ladder that holds:
1. **Does this need to be built at all?** (YAGNI)
2. **Does it already exist in this codebase?** Reuse the helper, util, or pattern that's already here, don't re-write it.
3. **Does the standard library already do this?** Use it.
4. **Does a native platform feature cover it?** Use it (`<input type="date">` over picker lib, CSS over JS, DB constraint over app code).
5. **Does an already-installed dependency solve it?** Use it.
6. **Can this be one line?** Make it one line.
7. **Only then:** write the minimum code that works.

The ladder runs after you understand the problem, not instead of it: read the task and the code it touches, trace the real flow end to end, then climb.

Bug fix = root cause, not symptom: grep every caller of the shared function you touch and fix it once at the source.

Skills available:
- `/ponytail` (or `ponytail [lite|full|ultra]`): Core lazy senior dev mode.
- `/ponytail-audit`: Whole-repo audit for over-engineering and bloat.
- `/ponytail-debt`: Harvest `ponytail:` comments into a debt ledger.
- `/ponytail-gain`: Display benchmark efficiency metrics.
- `/ponytail-help`: Quick reference card.
- `/ponytail-review`: Code review focused on removing unnecessary complexity.

<!-- END:ponytail-rules -->

<!-- BEGIN:graphify-rules -->

# Graphify — Codebase Knowledge Graph

This workspace supports Graphify for AST-based structural code analysis, community detection, and knowledge graph querying.

When `graphify-out/` or `graphify-out/graph.json` exists:
- For codebase or architecture questions, first run `graphify query "<question>"` (or `python -m graphify query "<question>"`).
- Use `graphify path "<A>" "<B>"` for shortest paths between concepts.
- Use `graphify explain "<concept>"` for focused symbol / concept explanation.
- If `graphify-out/wiki/index.md` exists, navigate it for architectural context.
- After modifying code files, run `graphify update .` to keep the graph current.

Skill available:
- `/graphify [path]`: Build or update the knowledge graph (`.agents/skills/graphify/SKILL.md`).

<!-- END:graphify-rules -->
