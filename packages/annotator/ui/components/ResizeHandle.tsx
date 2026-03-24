import React from 'react';
import type { ResizeHandleProps as BaseProps } from '../hooks/useResizablePanel';

interface Props extends BaseProps {
  className?: string;
  /** Which side of the content the handle is on — extends touch area away from content */
  side?: 'left' | 'right';
}

export const ResizeHandle: React.FC<Props> = ({
  isDragging,
  onMouseDown,
  onTouchStart,
  onDoubleClick,
  className,
  side,
}) => (
  <div
    className={`relative w-0 cursor-col-resize flex-shrink-0 group z-10${className ? ` ${className}` : ''}`}
  >
    {/* Visible track — 4px wide, centered on the zero-width layout box */}
    <div className={`absolute inset-y-0 -left-0.5 -right-0.5 transition-colors ${
      isDragging ? 'bg-primary/50' : 'group-hover:bg-border'
    }`} />
    {/* Wider touch area — extends outward from content to avoid covering scrollbar */}
    <div
      className={`absolute inset-y-0 ${
        side === 'left' ? 'right-0 -left-2' :
        side === 'right' ? 'left-0 -right-2' :
        '-inset-x-2'
      }`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
    />
  </div>
);
