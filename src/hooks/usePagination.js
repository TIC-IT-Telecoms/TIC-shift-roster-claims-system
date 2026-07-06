import { useState, useMemo, useEffect } from 'react';

/**
 * Client-side pagination hook.
 *
 * @param {Array}  data      - Full dataset to paginate
 * @param {number} pageSize  - Rows per page (default 10)
 * @returns {{ currentPage, setCurrentPage, resetPage, totalPages, paginatedData, pageSize, startIndex, endIndex }}
 */
const usePagination = (data = [], pageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Auto-clamp if data shrinks below current page
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const startIndex = data.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, data.length);

  return {
    currentPage: safePage,
    setCurrentPage,
    resetPage: () => setCurrentPage(1),
    totalPages,
    paginatedData,
    pageSize,
    startIndex,
    endIndex,
  };
};

export default usePagination;