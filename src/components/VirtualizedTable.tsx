import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface Column<T> {
  key: string;
  header: string;
  width?: string | number;
  render?: (item: T) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function VirtualizedTable<T extends { id?: string | number }>({
  data,
  columns,
  rowHeight = 48,
  maxHeight = 360,
  onRowClick,
  emptyMessage = 'No records found',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-[#111]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#111] shadow-xs">
      {/* Sticky Table Header */}
      <div className="flex items-center bg-neutral-50/80 dark:bg-[#161616] border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 select-none">
        {columns.map((col) => (
          <div
            key={col.key}
            style={{ width: col.width || `${100 / columns.length}%` }}
            className="px-4 py-3 shrink-0 uppercase tracking-wider"
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtualized Rows Container */}
      <div
        ref={parentRef}
        style={{
          height: `${Math.min(maxHeight, data.length * rowHeight)}px`,
          overflowY: 'auto',
          position: 'relative',
        }}
        className="w-full"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                onClick={() => onRowClick && onRowClick(item)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center border-b border-neutral-100 dark:border-neutral-800/60 text-xs text-neutral-800 dark:text-neutral-200 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40' : ''
                }`}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    style={{ width: col.width || `${100 / columns.length}%` }}
                    className="px-4 shrink-0 truncate"
                  >
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
        <span>Virtualized Row Buffer (60 FPS)</span>
        <span className="font-mono">{data.length} Total Records</span>
      </div>
    </div>
  );
}
