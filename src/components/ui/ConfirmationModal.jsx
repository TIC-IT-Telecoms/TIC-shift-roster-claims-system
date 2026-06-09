// src/components/ui/ConfirmationModal.jsx

/**
 * Generic confirmation dialog.
 *
 * Props:
 *   title        — Modal heading
 *   message      — Body text or JSX
 *   confirmText  — Label for the confirm button (default: "Confirm")
 *   confirmColor — Background color of the confirm button (default: "#006fd6")
 *   cancelText   — Label for cancel button (default: "Cancel")
 *   onConfirm    — Called when user clicks confirm
 *   onClose      — Called when user clicks cancel or ✕
 *   isPending    — Disables confirm button and shows loading label while true
 */
function ConfirmationModal({
  title       = 'Are you sure?',
  message     = '',
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  confirmColor = '#006fd6',
  onConfirm,
  onClose,
  isPending   = false,
}) {
  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      background:     'rgba(0,0,0,0.45)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      zIndex:         1100,
      padding:        16,
    }}>
      <div style={{
        background:   'white',
        borderRadius: 16,
        padding:      28,
        width:        '100%',
        maxWidth:     400,
        boxShadow:    '0 10px 40px rgba(0,95,180,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: '#1d2939', fontSize: 16 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#667085', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Message */}
        <p style={{ fontSize: 14, color: '#344054', margin: '0 0 24px', lineHeight: 1.5 }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              padding:      '10px 18px',
              border:       '1px solid #d0d5dd',
              borderRadius: 8,
              background:   'white',
              color:        '#344054',
              fontWeight:   700,
              cursor:       isPending ? 'not-allowed' : 'pointer',
              fontSize:     13,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              padding:      '10px 18px',
              background:   isPending ? '#94a3b8' : confirmColor,
              color:        'white',
              border:       'none',
              borderRadius: 8,
              fontWeight:   700,
              cursor:       isPending ? 'not-allowed' : 'pointer',
              fontSize:     13,
              minWidth:     100,
            }}
          >
            {isPending ? 'Processing…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;