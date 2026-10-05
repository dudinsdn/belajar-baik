# AGENTS.md

## Purpose

This file defines the durable working rules for every agent operating in this
repository. Keep it stable. Product plans, stage details, curriculum mappings,
research notes, and other information that is expected to evolve belong in
`docs/`, not in this file.

## Product Direction

RuangTumbuh is a learner-first education application for Paket C equivalency
education. It must support flexible learning while giving tutors reliable ways
to plan, guide, assess, and verify learning.

All product decisions must preserve these principles:

1. The learner's next action, progress, feedback, and competency status must be
   easy to understand.
2. Tutor workflows must support meaningful guidance and assessment without
   turning learner needs into secondary concerns.
3. Curriculum, competency, assessment evidence, mastery, and SKK must remain
   traceable to one another.
4. Activity or time alone must never be treated as proof of competency or SKK
   achievement.
5. Real application states must never be disguised with unlabeled sample or
   fallback data.
6. Mobile access, accessibility, low-bandwidth use, and data-loss prevention
   are core requirements, not optional polish.

## Sources of Truth

Use the following precedence when requirements differ:

1. The user's current explicit instruction.
2. This `AGENTS.md` file for durable repository rules.
3. Approved documents in `docs/` for current product scope and stage details.
4. Existing tested behavior and versioned data contracts.
5. Assumptions, only when clearly stated and low-risk.

Before planning or implementing a stage, read the relevant files in `docs/`.
Do not silently expand one stage into later stages. When a document and the
implementation disagree, report the discrepancy before treating either as
authoritative.

Only update `AGENTS.md` when a durable repository-wide rule genuinely changes.
Put changing plans, decisions, mappings, checklists, and progress reports in
`docs/`.

## Scope and Change Control

- Inspect before editing.
- For audit or planning requests, report findings and an ordered plan before
  changing application source.
- Implement only the stage or outcome explicitly approved by the user.
- Do not bundle unrelated refactors, dependency upgrades, data changes, or UI
  redesigns into a requested feature.
- Do not deploy, publish, push, modify hosted data, or change external access
  unless the user explicitly requests it.
- Treat local development, local validation, Git commits, pushes, and
  deployment as separate actions.
- A request to commit authorizes a focused local commit only, not a push.
- Preserve user changes and unrelated untracked files.
- Never rewrite history or use destructive Git or filesystem operations without
  explicit authorization.

## Architecture Boundaries

Keep responsibilities separated:

- `app/`: pages, UI composition, client state, and API route handlers.
- `app/learning/`: learner and tutor presentation logic grouped by domain.
- `server/auth/`: identity, role, ownership, and authorization rules.
- `server/data/`: domain queries, mutations, and server-side invariants.
- `server/api/`: API response and error contracts.
- `db/schema/`: versioned database model.
- `drizzle/`: forward-only database migrations.
- `tests/`: focused automated tests.
- `scripts/`: bounded operational or end-to-end workflows.
- `docs/`: evolving product plans, curriculum mappings, decisions, and user
  flows.

Do not place authorization decisions only in the client. API routes must obtain
the current user and enforce role, ownership, class, and resource access before
reading or mutating protected data.

Do not duplicate domain rules across UI components and route handlers. Keep
validation and invariants on the server; the client may mirror them only to
improve usability.

## Curriculum and SKK Rules

- Curriculum structures must be versioned so a new mapping does not alter the
  historical record of an older cohort.
- Model the full traceability chain: program, level or competency package,
  subject, competency, module, activity, assessment, evidence, mastery, and
  SKK.
- Store the PKBM-approved SKK allocation as configuration or versioned data;
  do not hard-code regulatory totals into presentation components.
- Support face-to-face, tutorial, and independent learning as distinct modes.
- SKK award decisions require competency evidence and tutor validation.
- Score, completion, mastery, and SKK are different concepts and must remain
  separate in the data model and UI.
- Remedial work, enrichment, revisions, prior-learning recognition, and tutor
  overrides must retain reasons and history.
- Regulatory or curriculum claims must be checked against current primary
  sources before implementation.

## Data Integrity and Migrations

- D1 is authoritative for shared learning records. Browser storage is limited
  to non-authoritative preferences or an explicit offline queue.
- Never show sample content as if it were a learner's real record.
- Prefer explicit loading, empty, partial, stale, and error states.
- Preserve historical assessment, grading, feedback, mastery, and SKK records.
- Schema changes require a forward migration, updated schema definitions, and
  focused tests.
- Do not edit an already-applied migration to change production history.
- Destructive migrations, bulk data rewrites, reseeding, and hosted database
  operations require explicit user approval and a recovery plan.
- Every important state transition must record enough information to identify
  what changed, when, and by whom.

## Authentication and Roles

- Production identity and application authorization are separate gates.
- A user allowed to open the Site is not automatically authorized for an
  application role or resource.
- Local `.dev.vars` represents one simulated identity per server process. It is
  development configuration, not an application login system.
- Never expose development authentication in production.
- Treat learner, tutor, and administrator capabilities explicitly. Do not route
  an unsupported role through another role's UI.
- Default to denying access when identity, role, enrollment, class assignment,
  or record ownership is uncertain.

## UI and Accessibility

- Use Indonesian that is concise, direct, and appropriate for warga belajar.
- Give each screen one clear primary purpose and next action.
- Preserve semantic headings, labels, keyboard access, visible focus, skip
  navigation, live status messages, and meaningful error feedback.
- Use radio controls for single-answer questions and checkboxes only for
  multiple-answer questions.
- Do not rely on color alone to communicate state.
- Keep interactive targets suitable for touch and test relevant mobile widths.
- Respect reduced-motion preferences.
- Avoid dead buttons, misleading counts, static notification badges, and
  controls that imply persistence when no server write occurs.
- Do not call a UI complete until its important states and interactions have
  been verified in a rendered browser.

## Local Runtime

- Use port `3000` for the local development server.
- Before starting a server, check whether port `3000` already has the intended
  project process. Reuse it when appropriate.
- Run development with a strict port setting. If port `3000` is occupied by an
  unrelated process, stop and report the conflict; never silently move to
  another port.
- Do not start a hidden duplicate server.
- When changing the local simulated role, stop the server, update the local
  identity configuration, restart on port `3000`, and verify `/api/v1/me`.
- Keep development servers running only when the user needs them, and clearly
  report their status.

## Verification Standard

Match validation to the risk of the change and report each evidence category
separately.

Minimum checks for application changes normally include:

1. Formatting check.
2. Lint.
3. TypeScript check.
4. Focused unit or integration tests.
5. Database schema check when relevant.
6. Production build.
7. API/runtime verification when relevant.
8. Rendered browser verification for user-visible behavior.
9. `git diff --check` and a final worktree review.

Do not claim more than was tested. Explicitly distinguish:

- static or configuration inspection;
- unit tests;
- local D1/API integration;
- browser behavior;
- cross-role end-to-end behavior;
- hosted database or identity behavior;
- deployment or external integration.

End-to-end scripts that rewrite fixtures, switch `.dev.vars`, reseed D1, or
start additional servers must not be run while the user's visible development
server is active unless the user approves the disruption and port behavior is
controlled.

## Security and Privacy

- Validate all untrusted input on the server.
- Enforce least privilege and resource ownership for every protected query and
  mutation.
- Do not return answer keys before an assessment is completed.
- Do not log secrets, authentication headers, sensitive learner data, or full
  private submissions unnecessarily.
- Keep secrets in ignored environment files; never commit them.
- Review production dependency advisories before release.
- Do not apply forced or breaking dependency fixes without reviewing their
  compatibility and rerunning the full validation set.

## Documentation

The `docs/` directory is the normal place for information that evolves,
including:

- roadmap stages and completion status;
- curriculum and SKK mappings;
- architecture decisions;
- product and user flows;
- validation records;
- operational runbooks;
- deployment readiness notes.

Documentation must describe verified behavior accurately. Mark proposed,
local-only, hosted, and production-verified states distinctly. Do not update a
roadmap checkbox merely because code exists; its stated acceptance criteria
must also be validated.

## Completion and Handoff

Before calling work complete:

- confirm the requested scope was delivered and later stages were not pulled
  in accidentally;
- identify changed files and any migration or local-state effects;
- report checks that passed, checks that failed, and checks not run;
- confirm whether the worktree contains unrelated or untracked files;
- state whether anything was committed, pushed, published, or deployed;
- leave the local server and simulated role in the state requested by the user.
