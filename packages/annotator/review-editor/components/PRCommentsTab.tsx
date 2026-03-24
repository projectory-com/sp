import React, { useMemo } from 'react';
import type { PRContext, PRComment, PRReview } from '@plannotator/shared/pr-provider';
import { MarkdownBody } from './PRSummaryTab';

interface PRCommentsTabProps {
  context: PRContext;
}

type TimelineEntry =
  | { kind: 'comment'; data: PRComment }
  | { kind: 'review'; data: PRReview };

const REVIEW_STATE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED: { bg: 'bg-success/15', text: 'text-success', label: 'Approved' },
  CHANGES_REQUESTED: { bg: 'bg-destructive/15', text: 'text-destructive', label: 'Changes Requested' },
  COMMENTED: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Commented' },
  DISMISSED: { bg: 'bg-muted', text: 'text-muted-foreground/60', label: 'Dismissed' },
};

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';

  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const PRCommentsTab: React.FC<PRCommentsTabProps> = ({ context }) => {
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...context.comments.map((c): TimelineEntry => ({ kind: 'comment', data: c })),
      ...context.reviews
        .filter((r) => r.state !== 'COMMENTED' || r.body)
        .map((r): TimelineEntry => ({ kind: 'review', data: r })),
    ];

    entries.sort((a, b) => {
      const timeA = a.kind === 'comment' ? a.data.createdAt : a.data.submittedAt;
      const timeB = b.kind === 'comment' ? b.data.createdAt : b.data.submittedAt;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });

    return entries;
  }, [context.comments, context.reviews]);

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-4">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-xs text-muted-foreground">No comments on this PR.</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {timeline.map((entry) => {
        if (entry.kind === 'review') {
          const review = entry.data;
          const style = REVIEW_STATE_STYLES[review.state] ?? REVIEW_STATE_STYLES.COMMENTED;

          return (
            <div key={review.id} className="rounded-lg border border-border/50 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-foreground">
                    {review.author || 'unknown'}
                  </span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/50">
                  {formatRelativeTime(review.submittedAt)}
                </span>
              </div>
              {review.body && (
                <div className="text-xs text-foreground/80 mt-1 review-comment-markdown">
                  <MarkdownBody markdown={review.body} />
                </div>
              )}
            </div>
          );
        }

        const comment = entry.data;
        return (
          <div key={comment.id} className="rounded-lg border border-border/50 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-foreground">
                {comment.author || 'unknown'}
              </span>
              <span className="text-[10px] text-muted-foreground/50">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <div className="text-xs text-foreground/80 review-comment-markdown">
              <MarkdownBody markdown={comment.body} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
