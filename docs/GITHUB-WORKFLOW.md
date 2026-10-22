# GitHub workflow and repository map

## Source of truth

- The live VPS is the operational source of truth for behavior and deployed content.
- GitHub is the version-control and review workspace, but its current branches may not include VPS-only commits or uncommitted changes.
- Do not assume that `main`, the newest commit, or a branch with a promising name matches production.
- Never overwrite the VPS with GitHub or deploy/restart services without explicit approval.

## Working branch

Current working branch: `fix/student-panel-design-alignment-20261020`

This is the current GitHub work branch, **not a guarantee that it exactly matches the VPS**. Before any merge or deployment, compare the branch against the actual VPS commit and worktree state.

## Pull requests currently retained for review

- [#46 — Admin design and live dashboard summary](https://github.com/Reza28Trade/shamseh-app/pull/46): keep for comparison against the approved VPS dashboard and audit-log state.
- [#57 — Protected course content](https://github.com/Reza28Trade/shamseh-app/pull/57): keep for security review, build validation, and rollout checks (FFmpeg, cache/storage, reverse-proxy headers, permissions, and end-to-end playback).

Older/overlapping proposals have been closed to reduce noise. Closing a PR does not delete its branch, commits, or code. Reopen only after a concrete need is identified and its diff has been checked against the VPS.

## Branch hygiene rules

1. Use the existing working branch unless there is an explicit reason and approval to create another.
2. Do not merge a PR only because CI passes; review its changed files and compare with VPS.
3. Do not delete branches until their unique commits have been checked against the VPS and retained PRs.
4. Avoid duplicate branches for the same visual change or feature. Prefer one focused PR per independently reviewable change.
5. Keep experiments and abandoned alternatives out of the default branch.
6. Before database-related changes, verify Prisma schema, migration history, and the actual database state.
7. Preserve untracked VPS assets and uploaded content, including `storage/`, PDF.js assets, and fonts.
8. Treat build success as necessary but not sufficient: test the relevant user workflow and responsive UI.
9. Do not commit secrets, `.env` files, database dumps, uploads, build output, or server-specific credentials.
10. Document meaningful decisions and deployment prerequisites in the PR.

## Safe cleanup order

1. Record the VPS branch, commit, local changes, untracked files, and a verified backup.
2. Compare the VPS state with the GitHub working branch.
3. Categorize branches as: required, useful unique work, superseded duplicate, or unknown.
4. Close superseded PRs first; this preserves history.
5. Delete only branches proven redundant and only after their unique changes are preserved elsewhere.
6. Keep the default branch unchanged until a reviewed, tested, VPS-aligned baseline is confirmed.

## Known limitation

The GitHub working branch and the VPS have previously diverged, with VPS-only commits reported. Therefore this document deliberately does not declare any branch to be an exact production snapshot. Reconfirm the live VPS commit before future cleanup, merging, or deployment.
