# Repository Working Agreement

These instructions apply to all work in this repository.

## Branch Roles

- `main` is the production branch. Keep it deployable and do not commit feature
  or bug-fix work directly to it.
- `dev` is the integration branch for completed development work. Do not
  implement changes directly on `dev` unless the user explicitly requests an
  emergency integration fix.
- When a new concern needs a branch, create it from the latest `dev` branch.

## Working Branches

Before editing code, check whether an existing local or remote working branch
already matches the concern. Reuse that branch for all follow-up edits,
commits, and pushes for the same feature, bug fix, or other concern. Do not
create a new branch for every editing session or incremental code change.

Create a focused branch from `dev` only when no relevant working branch exists,
using one of these prefixes:

- `feature/<short-name>` for new functionality.
- `bugfix/<short-name>` for defect fixes.
- `hotfix/<short-name>` for urgent production fixes.
- `refactor/<short-name>` for behavior-preserving restructuring.
- `docs/<short-name>` for documentation-only changes.
- `test/<short-name>` for test-only changes.
- `chore/<short-name>` for maintenance and tooling.

Use lowercase kebab-case after the prefix. Keep one concern per branch, and
push all work for that concern to its relevant branch.

## GitHub Delivery Flow

1. Update local `dev` from `origin/dev`.
2. Check out the existing relevant working branch, or create one from `dev` if
   this is a new concern.
3. Implement and verify the change on that branch.
4. Commit the completed change to that working branch.
5. Push the working branch to GitHub and stop.

The repository owner reviews and merges all code. Agents must not merge,
auto-merge, rebase-and-merge, squash-and-merge, cherry-pick into `dev` or
`main`, or otherwise integrate a working branch. Do not open a pull request
unless the user explicitly requests one. Even when a pull request is requested,
leave it unmerged for the repository owner.

Never push feature, bug-fix, refactor, test, documentation, or maintenance
commits directly to `dev` or `main`. Urgent `hotfix/*` work may target `main`
only when explicitly authorized, and the agent must still leave the merge or
cherry-pick to the repository owner.

## Verification

Before committing or opening a pull request, run the checks relevant to the
change. For normal application changes, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Report any check that could not be run and the reason. Do not describe failing
or skipped checks as passing.

## Git Safety

- Preserve unrelated user changes already present in the working tree.
- Do not rewrite published history or force-push unless explicitly authorized.
- Do not commit secrets, `.env.local`, API keys, generated build output, or
  dependency directories.
- Use concise, imperative commit messages that describe the completed change.
- Push completed commits only to the relevant working branch.
- Never merge code in any form. The repository owner is responsible for all
  merges after review.
