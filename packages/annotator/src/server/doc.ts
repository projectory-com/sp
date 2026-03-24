// Based on plannotator by backnotprop (MIT OR Apache-2.0)

/**
 * Document route handler.
 *
 * Handles /api/doc -- serves linked markdown documents.
 */

import { resolve } from "path";
import { resolveMarkdownFile } from "./resolve-file";

/** Serve a linked markdown document. Resolves absolute, relative, or bare filename paths. */
export async function handleDoc(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const requestedPath = url.searchParams.get("path");
  if (!requestedPath) {
    return Response.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // If a base directory is provided, try resolving relative to it first
  // (used by annotate mode to resolve paths relative to the source file)
  const base = url.searchParams.get("base");
  if (base && !requestedPath.startsWith("/") && /\.mdx?$/i.test(requestedPath)) {
    const fromBase = resolve(base, requestedPath);
    try {
      const file = Bun.file(fromBase);
      if (await file.exists()) {
        const markdown = await file.text();
        return Response.json({ markdown, filepath: fromBase });
      }
    } catch {
      /* fall through to standard resolution */
    }
  }

  const projectRoot = process.cwd();
  const result = await resolveMarkdownFile(requestedPath, projectRoot);

  if (result.kind === "ambiguous") {
    return Response.json(
      {
        error: `Ambiguous filename '${result.input}': found ${result.matches.length} matches`,
        matches: result.matches,
      },
      { status: 400 },
    );
  }

  if (result.kind === "not_found") {
    return Response.json({ error: `File not found: ${result.input}` }, { status: 404 });
  }

  try {
    const markdown = await Bun.file(result.path).text();
    return Response.json({ markdown, filepath: result.path });
  } catch {
    return Response.json({ error: "Failed to read file" }, { status: 500 });
  }
}
