/**
 * VaultBrowser — Obsidian vault file tree for the sidebar
 *
 * Displays a collapsible tree of markdown files from the user's Obsidian vault.
 * Clicking a file opens it in the main viewer for annotation.
 */

import React from "react";
import type { VaultNode } from "../../types";

interface VaultBrowserProps {
  vaultPath: string;
  tree: VaultNode[];
  isLoading: boolean;
  error: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (relativePath: string) => void;
  activeFile: string | null;
  onFetchTree: () => void;
}

const TreeNode: React.FC<{
  node: VaultNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  activeFile: string | null;
}> = ({ node, depth, expandedFolders, onToggleFolder, onSelectFile, activeFile }) => {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.type === "file" && node.path === activeFile;
  const paddingLeft = 8 + depth * 14;

  if (node.type === "folder") {
    return (
      <>
        <button
          onClick={() => onToggleFolder(node.path)}
          className="w-full flex items-center gap-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-sm"
          style={{ paddingLeft }}
        >
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-3 h-3 flex-shrink-0 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            onToggleFolder={onToggleFolder}
            onSelectFile={onSelectFile}
            activeFile={activeFile}
          />
        ))}
      </>
    );
  }

  // File node
  const displayName = node.name.replace(/\.md$/i, "");
  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full flex items-center gap-1.5 py-1 text-[11px] transition-colors rounded-sm ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:text-foreground hover:bg-muted/50"
      }`}
      style={{ paddingLeft: paddingLeft + 15 }}
      title={node.path}
    >
      <svg className="w-3 h-3 flex-shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate">{displayName}</span>
    </button>
  );
};

export const VaultBrowser: React.FC<VaultBrowserProps> = ({
  vaultPath,
  tree,
  isLoading,
  error,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  activeFile,
  onFetchTree,
}) => {
  const vaultName = vaultPath.split("/").pop() || "Vault";

  if (isLoading) {
    return (
      <div className="p-3 text-[11px] text-muted-foreground">
        Loading vault...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-[11px] text-destructive">{error}</div>
        <button
          onClick={onFetchTree}
          className="text-[10px] text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/30">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {vaultName}
        </div>
      </div>

      {/* Tree */}
      <div className="py-1 px-1">
        {tree.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-muted-foreground">
            No markdown files found
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              activeFile={activeFile}
            />
          ))
        )}
      </div>
    </div>
  );
};
