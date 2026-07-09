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
      <section className="p-6">
        <div className="text-sm text-gray-500 mb-4">Dashboard &gt; Notifications</div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Notifications</h2>
            <p className="text-gray-500 text-sm flex items-center">
              Your latest system updates.
              {unreadCount > 0 && (
                <span className="ml-2 bg-blue-600 hidden md:flex text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {unreadCount} new
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {readCount > 0 && (
              <button
                className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 disabled:opacity-50"
                onClick={() => clearRead.mutate()}
                disabled={clearRead.isPending}
              >
                {clearRead.isPending ? "Clearing..." : "Clear Read"}
              </button>
            )}
            {unreadCount > 0 && (
              <button
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? "Marking..." : "Mark All as Read"}
              </button>
            )}
          </div>
        </div>

        {/* ===== Filter Tabs ===== */}
        <div className="flex gap-6 border-b border-gray-200 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`pb-2 text-sm font-bold transition-colors ${filter === f
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
                }`}
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
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {isLoading ? (
            <p className="text-gray-500 text-sm py-6">Loading notifications...</p>
          ) : isError ? (
            <p className="text-red-600 text-sm py-6">
              Failed to load notifications. Please refresh.
            </p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🔔</div>
              <p className="text-base font-bold mb-1">
                {filter === "Unread" ? "All caught up!" : "No notifications"}
              </p>
              <p className="text-sm">
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
                  className={`flex items-start gap-3 p-4 mb-2 rounded-lg transition cursor-pointer ${read
                    ? "bg-white border-l-4 border-transparent"
                    : "bg-blue-50 border-l-4"
                    }`}
                  style={{ borderLeftColor: read ? "transparent" : config.color }}
                  onClick={() => handleClick(notif)}
                >
                  {/* Unread dot */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${read ? "bg-gray-300" : ""
                      }`}
                    style={{ background: read ? "#d0d5dd" : config.color }}
                  />

                  {/* Type icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: read ? "#f4f8fd" : config.bg,
                      border: `1px solid ${read ? "#e6edf5" : config.border}`,
                    }}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-bold mb-1 ${read ? "text-gray-700" : ""
                        }`}
                      style={{ color: read ? "#344054" : config.color }}
                    >
                      {notif.title}
                    </h4>
                    <p className="text-sm text-gray-600 truncate mb-1">
                      {notif.message}
                    </p>
                    <small className="text-gray-400">
                      {formatTime(notif.created_at)}
                      {isNavigable && !read && (
                        <span
                          className="ml-2 font-bold"
                          style={{ color: config.color }}
                        >
                          Tap to view →
                        </span>
                      )}
                    </small>
                  </div>

                  {/* Status pill + delete */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className="px-3 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: read ? "#f2f4f7" : config.bg,
                        color: read ? "#667085" : config.color,
                        border: `1px solid ${read ? "#e6edf5" : config.border}`,
                      }}
                    >
                      {read ? "Read" : "New"}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif.mutate(notif.notification_id);
                      }}
                      disabled={deleteNotif.isPending}
                      title="Delete notification"
                      className="text-gray-300 hover:text-red-600 text-sm"
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
