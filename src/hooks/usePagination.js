import { useState, useEffect } from "react";

export default function usePagination(
  data = [],
  pageSize = 10
) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalPages = Math.ceil(
    data.length / pageSize
  );

  const paginatedData = data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData,
    pageSize,
  };
}