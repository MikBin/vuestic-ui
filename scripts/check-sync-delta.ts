import { execSync } from 'child_process';

// Helper to run git commands synchronously
function runGit(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error: any) {
    throw new Error(error.stderr?.trim() || error.message);
  }
}

function run() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const branchIndex = args.indexOf('--branch') !== -1 ? args.indexOf('--branch') : args.indexOf('-b');
  const targetBranch = branchIndex !== -1 && args[branchIndex + 1] ? args[branchIndex + 1] : 'master';
  const noFetch = args.includes('--no-fetch') || args.includes('-n');

  console.log('🔄 Checking sync status against upstream...');

  // 1. Verify "upstream" remote exists
  try {
    runGit('git remote get-url upstream');
  } catch (e) {
    console.error('\n❌ \x1b[31mError: "upstream" remote is not configured.\x1b[0m');
    console.error('To keep in sync, you need to configure the original vuestic-ui repository as upstream:');
    console.error('  \x1b[36mgit remote add upstream https://github.com/epicmaxco/vuestic-ui.git\x1b[0m\n');
    process.exit(1);
  }

  // 2. Fetch from upstream unless disabled
  if (!noFetch) {
    console.log('📥 Fetching latest references from upstream...');
    try {
      runGit('git fetch upstream');
    } catch (error: any) {
      console.warn(`\n⚠️ \x1b[33mWarning: Failed to fetch from upstream: ${error.message}\x1b[0m`);
      console.warn('Proceeding with local cached refs...\n');
    }
  }

  // 3. Resolve target upstream branch ref
  const upstreamRef = `upstream/${targetBranch}`;
  try {
    runGit(`git rev-parse --verify ${upstreamRef}`);
  } catch (e) {
    console.error(`\n❌ \x1b[31mError: Upstream branch "${upstreamRef}" does not exist locally.\x1b[0m`);
    console.error('Please verify the branch name or run without --no-fetch to retrieve remote branches.');
    process.exit(1);
  }

  // 4. Resolve current branch
  let currentBranch = '';
  try {
    currentBranch = runGit('git branch --show-current');
  } catch (e) {
    try {
      currentBranch = runGit('git rev-parse --abbrev-ref HEAD');
    } catch (err) {
      currentBranch = 'HEAD (detached)';
    }
  }

  // 5. Query git delta (commits behind/ahead, files changed)
  let behindCommits: string[] = [];
  let aheadCommits: string[] = [];
  let changedFiles: string[] = [];

  try {
    const behindLogs = runGit(`git log HEAD..${upstreamRef} --oneline --format="%h - %an, %ar : %s"`);
    behindCommits = behindLogs ? behindLogs.split('\n') : [];
  } catch (e: any) {
    console.error(`❌ Error querying incoming commits: ${e.message}`);
  }

  try {
    const aheadLogs = runGit(`git log ${upstreamRef}..HEAD --oneline --format="%h - %an, %ar : %s"`);
    aheadCommits = aheadLogs ? aheadLogs.split('\n') : [];
  } catch (e: any) {
    console.error(`❌ Error querying local commits: ${e.message}`);
  }

  try {
    const diffOutput = runGit(`git diff --name-status HEAD...${upstreamRef}`);
    changedFiles = diffOutput ? diffOutput.split('\n') : [];
  } catch (e: any) {
    console.error(`❌ Error querying modified files: ${e.message}`);
  }

  // 6. Print the summary report
  console.log('\n================================================================');
  console.log(`🔍 Git Sync Status: \x1b[1m${currentBranch}\x1b[0m vs \x1b[1m${upstreamRef}\x1b[0m`);
  console.log('================================================================\n');

  if (behindCommits.length === 0) {
    console.log(`🟢 \x1b[32mUp to date! Your branch "${currentBranch}" is fully in sync with "${upstreamRef}".\x1b[0m\n`);
  } else {
    console.log(`🔴 \x1b[31mOut of sync! Your branch "${currentBranch}" is behind "${upstreamRef}" by ${behindCommits.length} commit(s).\x1b[0m\n`);

    console.log(`⬇️  \x1b[1mIncoming Commits (Upstream changes you don't have):\x1b[0m`);
    behindCommits.slice(0, 15).forEach(c => console.log(`   - ${c}`));
    if (behindCommits.length > 15) {
      console.log(`   ... and ${behindCommits.length - 15} more commits.`);
    }
    console.log('');

    if (changedFiles.length > 0) {
      console.log(`📂 \x1b[1mIncoming File Changes:\x1b[0m`);
      changedFiles.slice(0, 15).forEach(f => {
        const parts = f.split(/\s+/);
        const status = parts[0];
        const file = parts.slice(1).join(' ');
        let statusColored = status;
        if (status === 'M') statusColored = `\x1b[33mM\x1b[0m`; // Yellow Modification
        else if (status === 'A') statusColored = `\x1b[32mA\x1b[0m`; // Green Addition
        else if (status === 'D') statusColored = `\x1b[31mD\x1b[0m`; // Red Deletion
        console.log(`   [${statusColored}] ${file}`);
      });
      if (changedFiles.length > 15) {
        console.log(`   ... and ${changedFiles.length - 15} more files.`);
      }
      console.log('');
    }

    console.log('💡 \x1b[1mHow to merge upstream changes:\x1b[0m');
    console.log(`   git merge ${upstreamRef}`);
    console.log(`   (Or rebase: git rebase ${upstreamRef})\n`);
  }

  if (aheadCommits.length > 0) {
    console.log(`🔵 \x1b[36mAhead! Your branch "${currentBranch}" has ${aheadCommits.length} local commit(s) not in "${upstreamRef}":\x1b[0m`);
    aheadCommits.slice(0, 5).forEach(c => console.log(`   - ${c}`));
    if (aheadCommits.length > 5) {
      console.log(`   ... and ${aheadCommits.length - 5} more local commits.`);
    }
    console.log('');
  }
}

run();
