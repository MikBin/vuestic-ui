# Sync Checker Design Spec

This document details the design of a local command-line script to check the delta between the current git fork of `vuestic-ui` and the upstream `epicmaxco/vuestic-ui` repository. The primary purpose is to help the developer decide whether they need to merge changes from upstream to keep their fork in sync.

## User Requirements

- **Command Type**: Local CLI command run via Node/npm.
- **Comparison Branch**: Default is `upstream/master` (production-tracking branch of Vuestic UI), but configurable.
- **Reporting Mode**: Information-only. Shows the delta (commits behind/ahead, changed files) and exits successfully.
- **Use Case**: Quick check before deciding to merge upstream changes.

## Proposed Implementation

### Files Modified/Created

- `[NEW] [check-sync-delta.ts](file:///d:/projects/vuestic-ui/scripts/check-sync-delta.ts)`: The main script file written in TypeScript.
- `[MODIFY] [package.json](file:///d:/projects/vuestic-ui/package.json)`: Add script mapping `"check-sync": "tsx scripts/check-sync-delta.ts"`.

### Command Line Interface

The script can be run using yarn or npm:
```bash
yarn check-sync [--branch <branch_name>] [--no-fetch]
# or
npm run check-sync -- [--branch <branch_name>] [--no-fetch]
```

#### CLI Options:
- `-b, --branch <branch_name>`: The remote branch to compare against. Defaults to `master` (which maps to remote ref `upstream/master`).
- `-n, --no-fetch`: Skip fetching from the `upstream` remote. Useful when offline or when fetches have already been done.

### Program Logic

1. **Verify Upstream Remote exists**:
   - Run `git remote get-url upstream`.
   - If it fails, report that the `upstream` remote is missing and give setup instructions:
     ```bash
     Error: "upstream" remote is not configured.
     Please run: git remote add upstream https://github.com/epicmaxco/vuestic-ui.git
     ```
2. **Fetch Upstream (Optional)**:
   - Unless `--no-fetch` is specified, run `git fetch upstream`.
3. **Resolve Branches**:
   - Get the current active branch: `git branch --show-current` (fallback to `git rev-parse --abbrev-ref HEAD`).
   - Get the target branch: CLI option `--branch` (default: `master`). Remote ref: `upstream/<branch_name>`.
4. **Get Commits Behind (Incoming)**:
   - Run `git log HEAD..upstream/<branch_name> --oneline --format="%h - %an, %ar : %s"`.
5. **Get Commits Ahead (Local Changes)**:
   - Run `git log upstream/<branch_name>..HEAD --oneline --format="%h - %an, %ar : %s"`.
6. **Get File Status Differences**:
   - Run `git diff --name-status HEAD...upstream/<branch_name>`.
7. **Present Information**:
   - Print current status summary.
   - List incoming commits if behind.
   - List incoming file changes (with statuses like A/M/D).
   - If behind, output a helpful tip on how to perform the merge.

## Verification Plan

### Automated Verification
- Run the script locally via `yarn check-sync`.
- Run with various branch options (e.g. `--branch develop`) and verify output.
- Run with `--no-fetch` to check offline speed.

### Manual Verification
- Verify the output formatting is clean and easy to read.
