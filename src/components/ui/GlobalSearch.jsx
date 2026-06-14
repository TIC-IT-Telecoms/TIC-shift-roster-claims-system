import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "../../api/employeeApi";
import { claimApi } from "../../api/claimApi";
import { teamApi } from "../../api/teamApi";
import { useAuthStore } from "../../store/authStore";
import { formatEmpId } from "../../utils/helpers";

function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.user?.user?.role || "Employee";
  const isAdmin = role === "Admin";

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const enabled = debounced.length >= 2;

  const { data: employees } = useQuery({
    queryKey: ["search-employees", debounced],
    queryFn: employeeApi.getAll,
    select: (d) => d.data,
    enabled: enabled && isAdmin,
    staleTime: 60_000,
  });

  const { data: teams } = useQuery({
    queryKey: ["search-teams", debounced],
    queryFn: teamApi.getAll,
    select: (d) => d.data,
    enabled: enabled && isAdmin,
    staleTime: 60_000,
  });

  const { data: claims } = useQuery({
    queryKey: ["search-claims", debounced],
    queryFn: () => (isAdmin ? claimApi.getAll({}) : claimApi.getMyClaims({})),
    select: (d) => d.data,
    enabled,
    staleTime: 30_000,
  });

  // ===== Build results =====
  const q = debounced.toLowerCase();
  const results = [];

  if (enabled) {
    (employees || [])
      .filter((e) => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || formatEmpId(e.employee_id).toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((e) => results.push({
        type: "Employee", icon: "👤",
        label: e.name, sub: `${formatEmpId(e.employee_id)} · ${e.team?.team_name || "No team"}`,
        action: () => navigate("/employees"),
      }));

    (teams || [])
      .filter((t) => t.team_name?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((t) => results.push({
        type: "Team", icon: "👥",
        label: t.team_name, sub: `${t.employees?.length || 0} members`,
        action: () => navigate("/teams"),
      }));

    (claims || [])
      .filter((c) => {
        const idStr = `clm${String(c.claim_id).padStart(4, "0")}`;
        return idStr.includes(q) || c.claim_date?.includes(q) || c.employee?.name?.toLowerCase().includes(q) || c.shift_type?.toLowerCase().includes(q);
      })
      .slice(0, 5)
      .forEach((c) => results.push({
        type: "Claim", icon: "📝",
        label: `#CLM${String(c.claim_id).padStart(4, "0")} — ${c.shift_type}`,
        sub: `${c.employee?.name ? c.employee.name + " · " : ""}${c.claim_date} · ${c.status}`,
        action: () => navigate(isAdmin ? "/admin-claims" : "/claims"),
      }));
  }

  const handleSelect = (r) => {
    r.action();
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="top-search" style={{ position: "relative" }}>
      <input
        placeholder="Search employees, shifts, claims, teams..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />

      {open && enabled && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "white", border: "1px solid #e6edf5", borderRadius: 10,
          boxShadow: "0 10px 30px rgba(0,95,180,0.12)", zIndex: 200,
          maxHeight: 360, overflowY: "auto",
        }}>
          {results.length === 0 ? (
            <p style={{ padding: "14px 16px", fontSize: 13, color: "#667085", margin: 0 }}>
              No results for "{debounced}"
            </p>
          ) : (
            results.map((r, i) => (
              <div
                key={i}
                onClick={() => handleSelect(r)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: i < results.length - 1 ? "1px solid #f4f8fd" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f8fd")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
              >
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2939", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#667085" }}>{r.sub}</div>
                </div>
                <span style={{ fontSize: 10, color: "#006fd6", fontWeight: 700, background: "#eaf4ff", padding: "2px 8px", borderRadius: 999 }}>
                  {r.type}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;