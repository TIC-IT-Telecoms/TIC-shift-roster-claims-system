function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination text-sm flex justify-center items-center gap-2 mt-4"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 20,
      }}
    >
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="text-xs px-2  hover:text-blue-600"
		style={{ width: 80, height: 30, borderRadius: 8 }}
      >
        ← Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border:
              currentPage === page
                ? "1px solid #006fd6"
                : "1px solid #d0d5dd",
            background:
              currentPage === page ? "#006fd6" : "#fff",
            color:
              currentPage === page ? "#fff" : "#344054",
            cursor: "pointer",
          }}
        >
          {page}
        </button>
      ))}

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="text-xs px-2 hover:text-blue-600"
		style={{ width: 80, height: 30, borderRadius: 8 }}
      >
        Next →
      </button>
    </div>
  );
}

export default Pagination;