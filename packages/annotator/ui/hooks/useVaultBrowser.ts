/**
 * Vault Browser Hook
 *
 * Manages Obsidian vault file tree state for the sidebar vault tab.
 * Fetches the full tree from /api/reference/obsidian/files, tracks
 * expanded folders and the currently active file.
 */

import { useState, useCallback } from "react";
import type { VaultNode } from "../types";

export type { VaultNode };

export interface UseVaultBrowserReturn {
  tree: VaultNode[];
  isLoading: boolean;
  error: string | null;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  fetchTree: (vaultPath: string) => void;
  activeFile: string | null;
  setActiveFile: (path: string | null) => void;
}

export function useVaultBrowser(): UseVaultBrowserReturn {
  const [tree, setTree] = useState<VaultNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const fetchTree = useCallback(async (vaultPath: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reference/obsidian/files?vaultPath=${encodeURIComponent(vaultPath)}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to load vault");
        return;
      }

      setTree(data.tree);

      // Auto-expand root-level folders
      const rootFolders = (data.tree as VaultNode[])
        .filter((n) => n.type === "folder")
        .map((n) => n.path);
      setExpandedFolders(new Set(rootFolders));
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return {
    tree,
    isLoading,
    error,
    expandedFolders,
    toggleFolder,
    fetchTree,
    activeFile,
    setActiveFile,
  };
}
