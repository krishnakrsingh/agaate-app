# Agaate Architecture Docs — README

Read in this order:

1. `CURRENT_ARCHITECTURE.md` — what exists today (evidence, not inference).
2. `TARGET_ARCHITECTURE.md` — the modular monolith we are strangling toward.
3. `DOMAIN_MAP.md` — real business domains derived from schema + routes + imports.
4. `MODULE_BOUNDARIES.md` — who owns what; current vs target source of truth.
5. `DEPENDENCY_MAP.md` — allowed/forbidden edges + measured coupling.
6. `CANONICAL_DOMAIN_TERMS.md` — one vocabulary; farm vs estate settled here.
7. `ARCHITECTURE_RULES.md` — enforceable rules + how they are checked.
8. `MIGRATION_PLAN.md` + `MIGRATION_STATUS.md` — order, risk, checkpoints.
9. `ADDING_A_FEATURE.md` — mandatory follow-along guide for new engineers.
10. `ADR/` — decisions with reasons and rejected alternatives.

Principle for all docs: **URL != business != role**.
`src/app/` answers "what URL is this?". `src/modules/` answers
"what business capability is this?". Roles cut ACROSS modules.
