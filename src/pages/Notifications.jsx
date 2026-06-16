import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import useNotifications from "../hooks/useNotifications";
import { useAuthStore } from "../store/authStore";

// ===== Notification type config =====
const TYPE_CONFIG = {
  claim_submitted: { icon: "📝", bg: "#fff3e5", color: "#b54708", border: "#fed7aa" },
  claim_approved: { icon: "✅", bg: "#e8f8ef", color: "#157347", border: "#bbf7d0" },
  claim_rejected: { icon: "❌", bg: "#fee4e2", color: "#b42318", border: "#fecaca" },
  claim_reset: { icon: "↺", bg: "#fff3e5", color: "#b54708", border: "#fed7aa" },
  roster_published: { icon: "📅", bg: "#eaf4ff", color: "#006fd6", border: "#bfdbfe" },
  holiday_alert: { icon: "🌟", bg: "#f1eaff", color: "#7a3aed", border: "#d8b4fe" },
  payslip_available: { icon: "💰", bg: "#e8f8ef", color: "#157347", border: "#bbf7d0" },
  system: { icon: "🔔", bg: "#f4f8fd", color: "#344054", border: "#e6edf5" },
};

// ===== Role-aware navigation =====
const NAV_MAP = {
  Admin: {
    claim: "/admin-claims",
    roster: "/admin-rosters",
    payroll: "/admin-payroll",
  },
  Employee: {
    claim: "/claims",
    roster: "/roster",
    payroll: "/payroll",
  },
};

// ===== Relative timestamp =====
const formatTime = (str) => {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;

  const diffMs = Date.now() - d.getTime();
  const diffM = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffM < 1) return "Just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;

  return d.toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const FILTERS = ["All", "Unread", "Read"];

function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.user?.user?.role;
  const [filter, setFilter] = useState("All");

  // ===== All data + mutations via shared hook =====
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markRead,
    markAllRead,
    deleteNotif,
    clearRead,
  } = useNotifications({ limit: 100 });

  const readCount = notifications.filter((n) => n.is_read).length;

  // ===== Filter =====
  const filtered = notifications.filter((n) => {
    if (filter === "Unread") return !n.is_read;
    if (filter === "Read") return n.is_read;
    return true;
  });

  // ===== Click: mark read + navigate =====
  const handleClick = (notif) => {
    if (!notif.is_read) markRead.mutate(notif.notification_id);
    const routes = NAV_MAP[role];
    const dest = routes[notif.reference_type];
    if (dest) navigate(dest);
  };

  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Notifications</div>

        <div className="page-title-row">
          <div>
            <h2>Notifications</h2>
            <p className="subtitle">
              Your latest system updates.
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 10, background: "#006fd6", color: "white",
                  padding: "2px 8px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                }}>
                  {unreadCount} new
                </span>
              )}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {readCount > 0 && (
              <button
                className="cancel-btn"
                onClick={() => clearRead.mutate()}
                disabled={clearRead.isPending}
              >
                {clearRead.isPending ? "Clearing..." : "Clear Read"}
              </button>
            )}
            {unreadCount > 0 && (
              <button
                className="primary-btn"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? "Marking..." : "Mark All as Read"}
              </button>
            )}
          </div>
        </div>

        {/* ===== Filter Tabs ===== */}
        <div className="claims-tabs" style={{ marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === "All" && ` (${notifications.length})`}
              {f === "Unread" && ` (${unreadCount})`}
              {f === "Read" && ` (${readCount})`}
            </button>
          ))}
        </div>

        {/* ===== Notification List ===== */}
        <div className="notification-card">
          {isLoading ? (
            <p style={{ color: "#667085", fontSize: 13, padding: "20px 0" }}>
              Loading notifications...
            </p>

          ) : isError ? (
            <p style={{ color: "#b42318", fontSize: 13, padding: "20px 0" }}>
              Failed to load notifications. Please refresh.
            </p>

          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#667085" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>
                {filter === "Unread" ? "All caught up!" : "No notifications"}
              </p>
              <p style={{ fontSize: 13, margin: 0 }}>
                {filter === "Unread"
                  ? "You have no unread notifications."
                  : "Notifications will appear here as activity occurs."}
              </p>
            </div>

          ) : (
            filtered.map((notif) => {
              const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const read = notif.is_read;
              const routes = NAV_MAP[role];
              const isNavigable = !!routes[notif.reference_type];

              return (
                <div
                  key={notif.notification_id}
                  className="notification-item"
                  style={{
                    background: read ? "white" : `${config.bg}99`,
                    cursor: isNavigable ? "pointer" : "default",
                    transition: "background 0.2s",
                    borderLeft: read ? "3px solid transparent" : `3px solid ${config.color}`,
                  }}
                  onClick={() => handleClick(notif)}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: read ? "#d0d5dd" : config.color,
                    marginTop: 8,
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }} />

                  {/* Type icon */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: read ? "#f4f8fd" : config.bg,
                    border: `1px solid ${read ? "#e6edf5" : config.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="notification-content" style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      color: read ? "#344054" : config.color,
                      fontWeight: read ? 600 : 800,
                      margin: "0 0 4px",
                    }}>
                      {notif.title}
                    </h4>
                    <p style={{
                      margin: "0 0 4px",
                      color: read ? "#667085" : "#344054",
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {notif.message}
                    </p>
                    <small style={{ color: "#98a2b3" }}>
                      {formatTime(notif.created_at)}
                      {isNavigable && !read && (
                        <span style={{ marginLeft: 8, color: config.color, fontWeight: 700 }}>
                          Tap to view →
                        </span>
                      )}
                    </small>
                  </div>

                  {/* Status pill + delete */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                    flexShrink: 0,
                  }}>
                    <span style={{
                      background: read ? "#f2f4f7" : config.bg,
                      color: read ? "#667085" : config.color,
                      border: `1px solid ${read ? "#e6edf5" : config.border}`,
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {read ? "Read" : "New"}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif.mutate(notif.notification_id);
                      }}
                      disabled={deleteNotif.isPending}
                      title="Delete notification"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d0d5dd",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "2px 4px",
                        borderRadius: 4,
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => (e.target.style.color = "#b42318")}
                      onMouseLeave={(e) => (e.target.style.color = "#d0d5dd")}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </Layout>
  );
}

export default Notifications;
