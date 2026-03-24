// Based on plannotator by backnotprop (MIT OR Apache-2.0)

/**
 * sp-annotator CLI
 *
 * Three modes:
 *
 * 1. Annotate (`sp-annotator annotate <file.md>`):
 *    - Opens a markdown file in the annotation UI
 *    - Outputs structured JSON feedback to stdout
 *
 * 2. Review (`sp-annotator review <file.md> [--previous <old.md>]`):
 *    - Opens a markdown file with approve/feedback buttons
 *    - Outputs JSON with action (approved/feedback) to stdout
 *
 * 3. Diff (`sp-annotator diff [PR-URL]`):
 *    - Code review with git diff or PR diff
 *    - Outputs JSON with action (approved/feedback) to stdout
 *
 * Global flags:
 *   --browser <name>   Override which browser to open
 */

// Embed HTML at compile time (Bun import attribute)
// @ts-ignore - Bun import attribute for text
import planHtml from "../apps/plan-editor/dist/index.html" with { type: "text" };
const planHtmlContent = planHtml as unknown as string;

// @ts-ignore - Bun import attribute for text
import reviewHtml from "../apps/review-app/dist/index.html" with { type: "text" };
const reviewHtmlContent = reviewHtml as unknown as string;

import { startAnnotateServer } from "./server/annotate";
import { startReviewServer } from "./server/review";
import { getGitContext, runGitDiff } from "./server/git";
import {
  parsePRUrl,
  checkAuth,
  fetchPR,
  getCliName,
  getCliInstallUrl,
  getMRLabel,
  getMRNumberLabel,
  getDisplayRepo,
} from "./server/pr";
import { openBrowser } from "./server/browser";
import { resolveMarkdownFile } from "./server/resolve-file";
import path from "path";

const args = process.argv.slice(2);

// Global flag: --browser <name>
const browserIdx = args.indexOf("--browser");
if (browserIdx !== -1 && args[browserIdx + 1]) {
  process.env.PLANNOTATOR_BROWSER = args[browserIdx + 1];
  args.splice(browserIdx, 2);
}

if (args[0] === "annotate") {
  // ============================================
  // ANNOTATE MODE: feedback only, no approve
  // ============================================

  let filePath = args[1];
  if (!filePath) {
    console.error("Usage: sp-annotator annotate <file.md>");
    process.exit(1);
  }

  // Strip @ prefix if present (Claude Code file reference syntax)
  if (filePath.startsWith("@")) {
    filePath = filePath.slice(1);
  }

  const projectRoot = process.cwd();
  const resolved = await resolveMarkdownFile(filePath, projectRoot);

  if (resolved.kind === "ambiguous") {
    console.error(
      `Ambiguous filename "${resolved.input}" — found ${resolved.matches.length} matches:`,
    );
    for (const match of resolved.matches) {
      console.error(`  ${match}`);
    }
    process.exit(1);
  }
  if (resolved.kind === "not_found") {
    console.error(`File not found: ${resolved.input}`);
    process.exit(1);
  }

  const absolutePath = resolved.path;
  console.error(`Resolved: ${absolutePath}`);
  const markdown = await Bun.file(absolutePath).text();

  const server = await startAnnotateServer({
    markdown,
    filePath: absolutePath,
    origin: "claude-code",
    htmlContent: planHtmlContent,
    onReady: (url, _isRemote, _port) => {
      console.error(`Annotate server ready at ${url}`);
    },
  });

  await openBrowser(server.url);
  const result = await server.waitForDecision();
  await Bun.sleep(1500);
  server.stop();

  // JSON output to stdout
  console.log(
    JSON.stringify({
      mode: "annotate",
      file: absolutePath,
      feedback: result.feedback || "",
      annotations: result.annotations || [],
    }),
  );
  process.exit(0);
} else if (args[0] === "review") {
  // ============================================
  // REVIEW MODE: annotate with approve/feedback
  // ============================================

  let filePath = args[1];
  if (!filePath) {
    console.error("Usage: sp-annotator review <file.md> [--previous <old.md>]");
    process.exit(1);
  }

  // Strip @ prefix if present
  if (filePath.startsWith("@")) {
    filePath = filePath.slice(1);
  }

  // Parse --previous flag (reserved for future diff view)
  const prevIdx = args.indexOf("--previous");
  let _previousContent: string | null = null;
  if (prevIdx !== -1 && args[prevIdx + 1]) {
    const prevPath = path.resolve(args[prevIdx + 1]);
    _previousContent = await Bun.file(prevPath)
      .text()
      .catch(() => null);
  }

  const projectRoot = process.cwd();
  const resolved = await resolveMarkdownFile(filePath, projectRoot);

  if (resolved.kind !== "found") {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const absolutePath = resolved.path;
  const markdown = await Bun.file(absolutePath).text();

  // Use annotate server — the plan-editor UI handles feedback submission
  const server = await startAnnotateServer({
    markdown,
    filePath: absolutePath,
    origin: "claude-code",
    htmlContent: planHtmlContent,
    onReady: (url, _isRemote, _port) => {
      console.error(`Review server ready at ${url}`);
    },
  });

  await openBrowser(server.url);
  const result = await server.waitForDecision();
  await Bun.sleep(1500);
  server.stop();

  // JSON output — distinguish approve vs feedback
  const isApproved =
    !result.feedback && (!result.annotations || result.annotations.length === 0);
  console.log(
    JSON.stringify({
      mode: "review",
      action: isApproved ? "approved" : "feedback",
      file: absolutePath,
      annotations: result.annotations || [],
      globalComments: [],
      formattedFeedback: result.feedback || "",
    }),
  );
  process.exit(0);
} else if (args[0] === "diff") {
  // ============================================
  // DIFF MODE: code review with git diff or PR
  // ============================================

  const urlArg = args[1];
  const isPRMode = urlArg?.startsWith("http://") || urlArg?.startsWith("https://");

  let rawPatch: string;
  let gitRef: string;
  let diffError: string | undefined;
  let gitContext: Awaited<ReturnType<typeof getGitContext>> | undefined;
  let prMetadata: Awaited<ReturnType<typeof fetchPR>>["metadata"] | undefined;

  if (isPRMode) {
    // --- PR Review Mode ---
    const prRef = parsePRUrl(urlArg);
    if (!prRef) {
      console.error(`Invalid PR/MR URL: ${urlArg}`);
      console.error("Supported formats:");
      console.error("  GitHub: https://github.com/owner/repo/pull/123");
      console.error("  GitLab: https://gitlab.com/group/project/-/merge_requests/42");
      process.exit(1);
    }

    const cliName = getCliName(prRef);
    const cliUrl = getCliInstallUrl(prRef);

    try {
      await checkAuth(prRef);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("ENOENT")) {
        console.error(
          `${cliName === "gh" ? "GitHub" : "GitLab"} CLI (${cliName}) is not installed.`,
        );
        console.error(`Install it from ${cliUrl}`);
      } else {
        console.error(msg);
      }
      process.exit(1);
    }

    console.error(
      `Fetching ${getMRLabel(prRef)} ${getMRNumberLabel(prRef)} from ${getDisplayRepo(prRef)}...`,
    );
    try {
      const pr = await fetchPR(prRef);
      rawPatch = pr.rawPatch;
      gitRef = `${getMRLabel(prRef)} ${getMRNumberLabel(prRef)}`;
      prMetadata = pr.metadata;
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Failed to fetch PR");
      process.exit(1);
    }
  } else {
    // --- Local Review Mode ---
    gitContext = await getGitContext();
    const diffResult = await runGitDiff("uncommitted", gitContext.defaultBranch);
    rawPatch = diffResult.patch;
    gitRef = diffResult.label;
    diffError = diffResult.error;
  }

  const server = await startReviewServer({
    rawPatch,
    gitRef,
    error: diffError,
    origin: "claude-code",
    diffType: isPRMode ? undefined : "uncommitted",
    gitContext,
    prMetadata,
    htmlContent: reviewHtmlContent,
    onReady: (url, _isRemote, _port) => {
      console.error(`Diff review server ready at ${url}`);
    },
  });

  await openBrowser(server.url);
  const result = await server.waitForDecision();
  await Bun.sleep(1500);
  server.stop();

  if (result.approved) {
    console.log(
      JSON.stringify({
        mode: "diff",
        action: "approved",
        feedback: "",
        annotations: [],
      }),
    );
  } else {
    console.log(
      JSON.stringify({
        mode: "diff",
        action: "feedback",
        feedback: result.feedback || "",
        annotations: result.annotations || [],
      }),
    );
  }
  process.exit(0);
} else {
  console.error("Usage: sp-annotator <command> [options]");
  console.error("");
  console.error("Commands:");
  console.error("  annotate <file.md>                       Annotate a markdown file");
  console.error("  review <file.md> [--previous <old.md>]   Review with approve/feedback");
  console.error("  diff [PR-URL]                            Code review (git diff or PR)");
  console.error("");
  console.error("Global options:");
  console.error("  --browser <name>                         Override browser to open");
  process.exit(1);
}
