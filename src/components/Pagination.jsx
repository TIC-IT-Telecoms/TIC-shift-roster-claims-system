// src/components/Pagination.jsx

const btnBase = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  width:          32,
  height:         32,
  borderRadius:   7,
  border:         '1px solid #e6edf5',
  fontSize:       13,
  fontWeight:     700,
  cursor:         'pointer',
  transition:     'all 0.15s',
};

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Show at most 5 page buttons, centred on current page
  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pages = getPages();

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>

      {/* First */}
      {pages[0] > 1 && (
        <>
          <button
            style={{ ...btnBase, background: 'white', color: '#344054' }}
            onClick={() => onPageChange(1)}
          >
            1
          </button>
          {pages[0] > 2 && (
            <span style={{ color: '#667085', fontSize: 13, padding: '0 2px' }}>…</span>
          )}
        </>
      )}

      {/* Page buttons */}
      {pages.map((page) => (
        <button
          key={page}
          style={{
            ...btnBase,
            background: page === currentPage ? '#006fd6' : 'white',
            color:      page === currentPage ? 'white'    : '#344054',
            border:     page === currentPage
              ? '1px solid #006fd6'
              : '1px solid #e6edf5',
          }}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      {/* Last */}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span style={{ color: '#667085', fontSize: 13, padding: '0 2px' }}>…</span>
          )}
          <button
            style={{ ...btnBase, background: 'white', color: '#344054' }}
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Prev / Next */}
      <button
        style={{
          ...btnBase,
          background: currentPage === 1 ? '#f4f8fd' : 'white',
          color:      currentPage === 1 ? '#d0d5dd' : '#344054',
          cursor:     currentPage === 1 ? 'not-allowed' : 'pointer',
          marginLeft:  4,
        }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </button>
      <button
        style={{
          ...btnBase,
          background: currentPage === totalPages ? '#f4f8fd' : 'white',
          color:      currentPage === totalPages ? '#d0d5dd' : '#344054',
          cursor:     currentPage === totalPages ? 'not-allowed' : 'pointer',
        }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </button>
    </div>
  );
}

export default Pagination;