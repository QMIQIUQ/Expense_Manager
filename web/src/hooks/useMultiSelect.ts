import { useState, useCallback } from 'react';

export function useMultiSelect<T extends { id?: string }>() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    const allIds = new Set(items.map((item) => item.id!).filter(Boolean));
    setSelectedIds(allIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    isSelectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectedIds,
    setIsSelectionMode
  };
}
