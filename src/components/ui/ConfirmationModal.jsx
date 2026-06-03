import React from "react";

export default function ConfirmationModal({
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "#2563eb",
  isPending = false,
  onConfirm,
  onClose,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 10px 40px rgba(0,95,180,0.2)",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px",
            color: confirmColor,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: "#667085",
            marginBottom: 24,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            disabled={isPending}
            className="cancel-btn"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              padding: "10px 18px",
              background: confirmColor,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}