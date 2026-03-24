/**
 * Auto-save annotation drafts to the server.
 *
 * Silently saves annotations on a debounced interval so they survive
 * server crashes. On mount, checks for an existing draft and exposes
 * banner state for the UI to offer restoration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Annotation, ImageAttachment } from '../types';
import { toShareable, toShareableImages, fromShareable, parseShareableImages } from '../utils/sharing';

const DEBOUNCE_MS = 500;

interface DraftData {
  a: unknown[];
  g?: unknown[];
  d?: (string | null)[];
  ts: number;
}

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

interface UseAnnotationDraftOptions {
  annotations: Annotation[];
  globalAttachments: ImageAttachment[];
  isApiMode: boolean;
  isSharedSession: boolean;
  submitted: boolean;
}

interface UseAnnotationDraftResult {
  draftBanner: { count: number; timeAgo: string } | null;
  restoreDraft: () => { annotations: Annotation[]; globalAttachments: ImageAttachment[] };
  dismissDraft: () => void;
}

export function useAnnotationDraft({
  annotations,
  globalAttachments,
  isApiMode,
  isSharedSession,
  submitted,
}: UseAnnotationDraftOptions): UseAnnotationDraftResult {
  const [draftBanner, setDraftBanner] = useState<{ count: number; timeAgo: string } | null>(null);
  const draftDataRef = useRef<DraftData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

  // Load draft on mount
  useEffect(() => {
    if (!isApiMode || isSharedSession) return;

    fetch('/api/draft')
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: DraftData | null) => {
        if (data?.a && Array.isArray(data.a) && data.a.length > 0) {
          draftDataRef.current = data;
          setDraftBanner({
            count: data.a.length,
            timeAgo: formatTimeAgo(data.ts || 0),
          });
        }
        hasMountedRef.current = true;
      })
      .catch(() => {
        hasMountedRef.current = true;
      });
  }, [isApiMode, isSharedSession]);

  // Debounced auto-save on annotation changes
  useEffect(() => {
    if (!isApiMode || isSharedSession || submitted) return;
    if (!hasMountedRef.current) return;
    if (annotations.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const diffContexts = annotations.map(a => a.diffContext || null);
      const hasDiffContexts = diffContexts.some(v => v !== null);
      const payload: DraftData = {
        a: toShareable(annotations) as unknown[],
        g: toShareableImages(globalAttachments) as unknown[] | undefined,
        ...(hasDiffContexts ? { d: diffContexts } : {}),
        ts: Date.now(),
      };

      fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silent failure — draft is best-effort
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [annotations, globalAttachments, isApiMode, isSharedSession, submitted]);

  const restoreDraft = useCallback(() => {
    const data = draftDataRef.current;
    setDraftBanner(null);
    draftDataRef.current = null;

    if (!data?.a) return { annotations: [], globalAttachments: [] };

    const restored = fromShareable(data.a as Parameters<typeof fromShareable>[0], data.d);
    const restoredGlobal = data.g ? (parseShareableImages(data.g as Parameters<typeof parseShareableImages>[0]) ?? []) : [];

    return { annotations: restored, globalAttachments: restoredGlobal };
  }, []);

  const dismissDraft = useCallback(() => {
    setDraftBanner(null);
    draftDataRef.current = null;

    fetch('/api/draft', { method: 'DELETE' }).catch(() => {
      // Silent failure
    });
  }, []);

  return { draftBanner, restoreDraft, dismissDraft };
}
