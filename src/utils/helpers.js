/**
 * Format employee ID — EMP001, EMP002, etc.
 */
export const formatEmpId = (id) =>
  `EMP${String(id || "").padStart(3, "0")}`;

/**
 * Format currency in ZAR
 * formatZAR(1500) → "R1,500.00"
 */
export const formatZAR = (amount) =>
  `R${Number(amount || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

/**
 * Format hourly rate
 * formatRate(100) → "R100.00"
 */
export const formatRate = (rate) =>
  `R${Number(rate || 0).toFixed(2)}`;

/**
 * Format rate per hour
 * formatRatePerHour(100) → "R100.00 / hour"
 */
export const formatRatePerHour = (rate) =>
  `R${Number(rate || 0).toFixed(2)} / hour`;

/**
 * Capitalize first letter of a string
 * formatRole("admin") → "Admin"
 */
export const formatRole = (role) => {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * Format supervisor display
 * formatSupervisor({ name: "John", role: "admin" }) → "John (Administrator)"
 */
export const formatSupervisor = (supervisor) => {
  if (!supervisor) return "—";
  return `${supervisor.name}`;
};

/**
 * Format employment type with fallback
 */
export const formatEmploymentType = (type) => type || "—";

// ===================================================
// ===== DATE & TIME =====
// ===================================================

/**
 * Format date to South African locale
 * formatDate("2025-06-16") → "16 Jun 2025"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/**
 * Format datetime to South African locale
 * formatDateTime("2025-06-16T10:15:00") → "16 Jun 2025, 10:15"
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/**
 * Format shift time range
 * formatTime("06:00:00", "14:00:00") → "06:00 - 14:00"
 */
export const formatTime = (start, end) => {
  if (!start || !end) return "—";
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export const getTodayStr = () =>
  new Date().toISOString().split("T")[0];

/**
 * Get current month start as YYYY-MM-DD string
 */
export const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/**
 * Get week date range for a given offset
 * offset 0 = current week, -1 = last week, 1 = next week
 * Returns { start_date, end_date } both as YYYY-MM-DD
 */
export const getWeekRange = (offset = 0) => {
  const base = new Date();
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start_date: mon.toISOString().split("T")[0],
    end_date: sun.toISOString().split("T")[0],
  };
};

/**
 * Get all 7 dates in a week for a given offset as YYYY-MM-DD strings
 */
export const getWeekDates = (offset = 0) => {
  const base = new Date();
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
};

/**
 * Get month date range for a given offset
 * offset 0 = current month, -1 = last month, 1 = next month
 */
export const getMonthRange = (offset = 0) => {
  const d = new Date();
  const target = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const start = target.toISOString().split("T")[0];
  const end = new Date(
    target.getFullYear(), target.getMonth() + 1, 0
  ).toISOString().split("T")[0];
  return { start_date: start, end_date: end };
};

/**
 * Format date range label for display
 * formatRangeLabel("2025-05-12", "2025-05-18") → "12 May 2025 – 18 May 2025"
 */
export const formatRangeLabel = (startDate, endDate) => {
  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-ZA", {
      day: "2-digit", month: "short", year: "numeric",
    });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
};

/**
 * Format display date with weekday
 * formatDisplayDate("2025-05-12") → "Mon, 12 May 2025"
 */
export const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
};

/**
 * Get weekday name from date string
 * formatDay("2025-05-12") → "Monday"
 */
export const formatDay = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en", { weekday: "long" });

/**
 * Get short weekday + date label for table headers
 * formatHeader("2025-05-12") → { day: "Mon", date: "12 May" }
 */
export const formatHeader = (dateStr) => {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("en", { weekday: "short" }),
    date: d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }),
  };
};

/**
 * Check if a date string is today
 */
export const isToday = (dateStr) =>
  dateStr === getTodayStr();

// ===================================================
// ===== ROSTER =====
// ===================================================

export const getShiftLabel = (entry) => {
  if (!entry) return "—";
  if (entry.status === "Off") return "Off";
  // Derive short label from shift name — "Early", "Night", "Grave" etc.
  return entry.shift?.shift_name?.split(" ")[0] || "—";
};

export const getShiftTime = (entry) => {
  if (!entry || entry.status === "Off") return "—";
  return formatTime(entry.shift?.start_time, entry.shift?.end_time);
};

/**
 * Get CSS class name for a roster status
 */
export const getStatusClass = (status) => {
  if (status === "Off") return "status-off";
  if (status === "Holiday") return "status-approved";
  return "status-scheduled";
};

/**
 * Get shift cell config for admin roster grid
 * Returns { label, style }
 */
export const getShiftCell = (entry) => {
  if (!entry) return { label: "—", style: { color: "#d0d5dd" } };

  if (entry.is_public_holiday) {
  const shiftName =
    entry.shift?.shift_name?.split(" ")[0] || "Holiday";

  return {
    label:
      entry.status === "Off"
        ? "Holiday 🎉"
        : `${shiftName} 🎉`,
    style: {
      background: "#7a3aed",
      color: "#fff",
      padding: "5px 10px",
      borderRadius: 999,
      fontWeight: 700,
      fontSize: 12,
    },
  };
}

if (entry.status === "Off") {
  return {
    label: "Off",
    style: {
      background: "#ff0000",
      color: "#000000",
      padding: "5px 10px",
      borderRadius: 0,
      fontWeight: 500,
      fontSize: 12,
    },
  };
}

  const name = entry.shift?.shift_name || "";
  if (name.includes("Early")) return {
    label: "Early",
    style: { background: "#f7c7ac", color: "#000000", padding: "5px 10px", borderRadius: 0, fontWeight: 500, fontSize: 12 },
  };
  if (name.includes("Night")) return {
    label: "Night",
    style: { background: "#44b3e1", color: "#000000", padding: "5px 10px", borderRadius: 0, fontWeight: 500, fontSize: 12 },
  };
  if (name.includes("Grave")) return {
    label: "Grave",
    style: { background: "#ffc000", color: "#000000", padding: "5px 10px", borderRadius: 0, fontWeight: 500, fontSize: 12 },
  };

  return {
    label: name.split(" ")[0] || "—",
    style: { background: "#eaf4ff", color: "#006fd6", padding: "5px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  };
};

/**
 * Flatten roster data from grouped object or array
 * Sorts by roster_date ascending
 */
export const flattenRoster = (rosterData) => {
  if (!rosterData?.roster) return [];
  return Array.isArray(rosterData.roster)
    ? [...rosterData.roster].sort((a, b) => a.roster_date.localeCompare(b.roster_date))
    : Object.values(rosterData.roster).flat().sort((a, b) => a.roster_date.localeCompare(b.roster_date));
};

/**
 * Build team → date → entry map from roster data
 * Used in admin roster grid view
 */
export const buildTeamRosterMap = (rosterData) => {
  const map = {};
  if (!rosterData?.roster) return map;

  Object.values(rosterData.roster).flat().forEach((entry) => {
    const teamName = entry.employee?.team?.team_name;
    if (!teamName) return;
    const date = entry.roster_date;
    if (!map[teamName]) map[teamName] = {};
    if (!map[teamName][date]) map[teamName][date] = entry;
  });

  return map;
};

/**
 * Find next upcoming scheduled shift from roster list
 */
export const findNextShift = (rosterData) => {
  const todayStr = getTodayStr();
  const entries = flattenRoster(rosterData);
  return entries.find((r) => r.roster_date >= todayStr && r.status === "Scheduled") || null;
};

/**
 * Count scheduled shifts in a roster list
 */
export const countScheduled = (rosterData) =>
  flattenRoster(rosterData).filter((r) => r.status === "Scheduled").length;

// ===================================================
// ===== PAYROLL CALCULATIONS =====
// ===================================================

/**
 * Calculate earnings for a single claim
 */
// src/utils/helpers.js — replace calcClaimEarnings

/**
 * Calculate earnings for a single claim with grave shift holiday split support.
 *
 * @param {Object} claim        - Claim record
 * @param {number} hourlyRate   - Employee hourly rate
 * @param {Object} [shift]      - Optional shift record for grave split calculation
 * @param {boolean} [isNextDayHoliday] - Is the day after the claim date a holiday?
 */
export const calcClaimEarnings = (claim, hourlyRate, shift = null, isNextDayHoliday = false) => {
  const rate = Number(hourlyRate || 0);
  const hoursWorked = Number(claim.hours_worked || 0);
  const overtimeHrs = Number(claim.overtime_hours || 0);
  const isHoliday = claim.is_holiday;

  let holidayHours = 0;
  let normalHours = hoursWorked;

  if (isHoliday && shift) {
    // Use the precise split for grave shifts
    const startH = parseInt(shift.start_time?.split(':')[0] ?? 0, 10);
    const endH = parseInt(shift.end_time?.split(':')[0] ?? 0, 10);
    const totalShiftHours = shift.is_grave || endH < startH
      ? (24 - startH) + endH
      : endH - startH;

    if (totalShiftHours > 0) {
      const { holiday_hours: hh } = (() => {
        if (!shift.is_grave) {
          return { holiday_hours: isHoliday ? totalShiftHours : 0 };
        }
        // Grave shift split
        const hoursBeforeMidnight = 24 - startH;
        const hoursAfterMidnight = endH;
        if (isHoliday && isNextDayHoliday) return { holiday_hours: totalShiftHours };
        if (isHoliday) return { holiday_hours: hoursBeforeMidnight };
        if (isNextDayHoliday) return { holiday_hours: hoursAfterMidnight };
        return { holiday_hours: 0 };
      })();

      // Scale to actual hours worked (employee may work fewer than full shift)
      const ratio = hoursWorked / totalShiftHours;
      holidayHours = Math.min(hh * ratio, hoursWorked);
      normalHours = hoursWorked - holidayHours;
    }
  } else if (isHoliday) {
    // No shift detail available — treat all hours as holiday
    holidayHours = hoursWorked;
    normalHours = 0;
  }

  const normal = normalHours * rate;
  const overtime = overtimeHrs * rate * 1.5;
  const holiday = holidayHours * rate; // holiday pay = rate × holiday hours (base rate already included)

  return {
    normal,
    overtime,
    holiday,
    holiday_hours: holidayHours,
    normal_hours: normalHours,
    total: normal + overtime + holiday,
  };
};

/**
 * Calculate total earnings from an array of approved claims
 */
export const calcTotalEarnings = (claims, hourlyRate) =>
  (claims || []).reduce((sum, claim) => {
    const { total } = calcClaimEarnings(claim, hourlyRate);
    return sum + total;
  }, 0);

// ===================================================
// ===== AVATAR =====
// ===================================================

/**
 * Get initials from a full name
 * getInitials("John Doe") → "JD"
 */
export const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// ===================================================
// ===== EXPORT =====
// ===================================================

/**
 * Export data as a CSV file download
 */
export const exportCSV = (filename, headers, rows) => {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Export content as a printable PDF window
 */
export const exportPDF = (title, htmlContent) => {
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Open Sans', Arial, sans-serif; padding: 32px; color: #1d2939; }
          h1 { color: #005bbb; font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #667085; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #006fd6; color: white; padding: 10px 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; }
          tr:nth-child(even) td { background: #f4f8fd; }
          .badge { padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 11px; }
          .approved { background: #e8f8ef; color: #157347; }
          .pending { background: #fff3e5; color: #b54708; }
          .rejected { background: #fee4e2; color: #b42318; }
          .scheduled { background: #eaf4ff; color: #006fd6; }
          .off { background: #f2f4f7; color: #667085; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="sub">Generated on ${new Date().toLocaleDateString("en-ZA", { dateStyle: "full" })}</p>
        ${htmlContent}
      </body>
    </html>
  `);
  win.document.close();
  win.print();
};

const todayStr = getTodayStr();

export const resolveCurrentDay = (startDate, cycleLength) => {
  if (!startDate) return null;

  const start = new Date(startDate);
  const target = new Date(todayStr);

  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (target - start) / (1000 * 60 * 60 * 24)
  );

  if (diff < 0) return null;

  return (diff % cycleLength) + 1;
};

export const isActive = (startDate) =>
  startDate && startDate <= todayStr;