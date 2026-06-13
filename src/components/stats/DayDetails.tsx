import { useState } from "react";
import { motion } from "framer-motion";
import { DailyStat } from "../../lib/db";
import { formatStatsDuration, formatDateDDMMYY } from "../../lib/timer";
import { Trophy, Calendar, Search } from "lucide-react";

interface DayDetailsProps {
  stats: DailyStat[];
}

type SortKey = "date-desc" | "date-asc" | "sessions-desc" | "focus-desc";

const cardStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  padding: "20px",
  borderRadius: "12px",
};

export function DayDetails({ stats }: DayDetailsProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [onlyActive, setOnlyActive] = useState(false);

  const topDays = [...stats]
    .sort((a, b) => b.pomodorosCompleted - a.pomodorosCompleted)
    .slice(0, 5);

  let filtered = [...stats];

  if (onlyActive) {
    filtered = filtered.filter((s) => s.pomodorosCompleted > 0);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((s) =>
      formatDateDDMMYY(s.date).toLowerCase().includes(q)
    );
  }

  switch (sort) {
    case "date-desc":
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      break;
    case "date-asc":
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;
    case "sessions-desc":
      filtered.sort((a, b) => b.pomodorosCompleted - a.pomodorosCompleted);
      break;
    case "focus-desc":
      filtered.sort(
        (a, b) =>
          b.totalFocusSeconds + b.overtimeFocusSeconds -
          (a.totalFocusSeconds + a.overtimeFocusSeconds)
      );
      break;
  }

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "date-desc", label: "Newest" },
    { key: "date-asc", label: "Oldest" },
    { key: "sessions-desc", label: "Most Sessions" },
    { key: "focus-desc", label: "Most Focus" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: 0.1 }}
        style={cardStyle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Trophy size={20} color="var(--focus-color)" />
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>Top Productive Days</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
          {topDays.map((day, i) => (
            <div
              key={day.date}
              style={{
                padding: "12px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",

              }}
            >
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.05em" }}>
                #{i + 1}
              </div>
              <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "13px" }}>
                {formatDateDDMMYY(day.date)}
              </div>
              <div style={{ color: "var(--focus-color)", fontWeight: "bold", fontSize: "18px", lineHeight: 1 }}>
                {day.pomodorosCompleted}
                <span style={{ fontSize: "11px", fontWeight: "normal", color: "var(--text-secondary)", marginLeft: "3px" }}>
                  sess
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                {formatStatsDuration(day.totalFocusSeconds + day.overtimeFocusSeconds)}
              </div>
            </div>
          ))}
          {topDays.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", gridColumn: "1 / -1", margin: 0 }}>
              No data yet.
            </p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          <Calendar size={20} color="var(--text-primary)" />
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)", flexShrink: 0 }}>History</h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginLeft: "auto",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "8px",
              padding: "5px 10px",
            }}
          >
            <Search size={13} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
                width: "120px",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginRight: "2px" }}>Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              style={{
                fontSize: "11px",
                padding: "3px 10px",
                borderRadius: "20px",
                background: sort === opt.key ? "var(--focus-color)" : "rgba(255,255,255,0.07)",
                color: sort === opt.key ? "#fff" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                height: "24px",
              }}
            >
              {opt.label}
            </button>
          ))}

          <button
            onClick={() => setOnlyActive((v) => !v)}
            style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "20px",
              background: onlyActive ? "var(--short-break-color)" : "rgba(255,255,255,0.07)",
              color: onlyActive ? "#fff" : "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
              marginLeft: "auto",
              transition: "all 0.15s ease",
              height: "24px",
            }}
          >
            Active days only
          </button>
        </div>

        <div className="custom-scrollbar" style={{ maxHeight: "280px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ position: "sticky", top: 0, background: "rgba(43,34,31,0.97)", zIndex: 1 }}>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "8px 10px", fontWeight: "normal" }}>Date</th>
                <th style={{ padding: "8px 10px", fontWeight: "normal" }}>Focus Time</th>
                <th style={{ padding: "8px 10px", fontWeight: "normal" }}>Sessions</th>
                <th style={{ padding: "8px 10px", fontWeight: "normal" }}>Breaks (S/L)</th>
                <th style={{ padding: "8px 10px", fontWeight: "normal" }}>Pauses</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((day) => (
                <tr
                  key={day.date}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 10px", color: "var(--text-primary)" }}>{formatDateDDMMYY(day.date)}</td>
                  <td style={{ padding: "10px 10px", color: "var(--focus-color)" }}>
                    {formatStatsDuration(day.totalFocusSeconds + day.overtimeFocusSeconds)}
                  </td>
                  <td style={{ padding: "10px 10px" }}>{day.pomodorosCompleted}</td>
                  <td style={{ padding: "10px 10px" }}>{day.shortBreaksCompleted} / {day.longBreaksCompleted}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text-secondary)" }}>{day.pauseCount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center", padding: "24px 0", margin: 0 }}>
              No records found.
            </p>
          )}
        </div>

        <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-secondary)", textAlign: "right" }}>
          {filtered.length} day{filtered.length !== 1 ? "s" : ""} shown
        </div>
      </motion.div>
    </div>
  );
}
