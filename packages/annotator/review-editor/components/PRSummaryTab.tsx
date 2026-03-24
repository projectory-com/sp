import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { parseMarkdownToBlocks } from '@plannotator/ui/utils/parser';
import { renderInlineMarkdown } from '../utils/renderInlineMarkdown';
import type { PRContext } from '@plannotator/shared/pr-provider';
import type { PRMetadata } from '@plannotator/shared/pr-provider';

interface PRSummaryTabProps {
  context: PRContext;
  metadata: PRMetadata;
}

/** Check if content contains HTML tags that should be rendered natively. */
const HTML_TAG_RE = /<[a-z][a-z0-9]*[\s/>]/i;
const containsHtml = (text: string) => HTML_TAG_RE.test(text);

/** Sanitize HTML using DOMPurify — defense-in-depth for GitHub API content. */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'sub', 'sup', 'b', 'i', 'em', 'strong', 'br', 'hr', 'p', 'span',
      'del', 'ins', 'mark', 'small', 'abbr', 'kbd', 'var', 'samp',
      'details', 'summary', 'blockquote', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'div',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'rel', 'target', 'width', 'height', 'align'],
  });
}

/**
 * Render inline content — if it contains HTML tags, sanitize and render.
 * Otherwise use our markdown renderer.
 */
function renderContent(content: string): React.ReactNode {
  if (containsHtml(content)) {
    return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />;
  }
  return renderInlineMarkdown(content);
}

/** Render a simplified block-level markdown view (no annotation infrastructure). */
export function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdownToBlocks(markdown), [markdown]);

  return (
    <div className="space-y-2 text-xs text-foreground/90">
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${Math.min(block.level ?? 1, 6)}` as keyof JSX.IntrinsicElements;
            const sizes: Record<number, string> = {
              1: 'text-base font-bold',
              2: 'text-sm font-semibold',
              3: 'text-xs font-semibold',
            };
            return (
              <Tag key={block.id} className={`${sizes[block.level ?? 1] ?? 'text-xs font-medium'} text-foreground`}>
                {renderContent(block.content)}
              </Tag>
            );
          }
          case 'code':
            return (
              <pre key={block.id} className="bg-muted/50 rounded-md p-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                <code>{block.content}</code>
              </pre>
            );
          case 'list-item':
            return (
              <div key={block.id} className="flex gap-1.5" style={{ paddingLeft: (block.level ?? 0) * 12 }}>
                <span className="text-muted-foreground shrink-0">{block.checked !== undefined ? (block.checked ? '☑' : '☐') : '•'}</span>
                <span>{renderContent(block.content)}</span>
              </div>
            );
          case 'blockquote':
            return (
              <blockquote key={block.id} className="border-l-2 border-border pl-2 text-muted-foreground italic">
                {renderContent(block.content)}
              </blockquote>
            );
          case 'hr':
            return <hr key={block.id} className="border-border/50" />;
          default:
            if (!block.content) return null;
            // If the entire paragraph is HTML, sanitize and render
            if (containsHtml(block.content)) {
              return <div key={block.id} dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />;
            }
            return <p key={block.id}>{renderInlineMarkdown(block.content)}</p>;
        }
      })}
    </div>
  );
}

export const PRSummaryTab: React.FC<PRSummaryTabProps> = ({ context, metadata }) => {
  return (
    <div className="p-3 space-y-4">
      {/* PR title + state */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
            context.state === 'MERGED'
              ? 'bg-violet-500/15 text-violet-400'
              : context.state === 'CLOSED'
                ? 'bg-destructive/15 text-destructive'
                : context.isDraft
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-success/15 text-success'
          }`}>
            {context.isDraft ? 'Draft' : context.state}
          </span>
          <a
            href={metadata.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-foreground hover:text-primary transition-colors"
          >
            {metadata.title}
          </a>
        </div>

        <div className="text-[10px] text-muted-foreground font-mono">
          {metadata.author} wants to merge <code className="bg-muted px-1 rounded">{metadata.headBranch}</code> into <code className="bg-muted px-1 rounded">{metadata.baseBranch}</code>
        </div>
      </div>

      {/* Labels */}
      {context.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {context.labels.map((label) => (
            <span
              key={label.name}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}40`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Linked issues */}
      {context.linkedIssues.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Linked Issues
          </h3>
          {context.linkedIssues.map((issue) => (
            <a
              key={issue.url}
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" />
              </svg>
              #{issue.number}
              {issue.repo && <span className="text-muted-foreground text-[10px]">({issue.repo})</span>}
            </a>
          ))}
        </div>
      )}

      {/* PR body */}
      {context.body ? (
        <div className="space-y-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </h3>
          <MarkdownBody markdown={context.body} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No description provided.</p>
      )}
    </div>
  );
};
