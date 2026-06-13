import { useState } from "react";
import { motion } from "framer-motion";
import { DailyStat } from "../../lib/db";
import { formatStatsDuration, formatDateDDMMYY } from "../../lib/timer";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PomodoroHeatmapProps {
  stats: DailyStat[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PomodoroHeatmap({ stats }: PomodoroHeatmapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const maxPomodoros = Math.max(1, ...stats.map(s => s.pomodorosCompleted));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const statForDay = stats.find(s => s.date === dateStr);
    
    const count = statForDay ? statForDay.pomodorosCompleted : 0;
    const focusTime = statForDay ? (statForDay.totalFocusSeconds + statForDay.overtimeFocusSeconds) : 0;
    const intensity = count > 0 ? Math.max(0.2, count / maxPomodoros) : 0;

    days.push({
      dateStr,
      dateFormatted: formatDateDDMMYY(d),
      dayNumber: day,
      count,
      focusTime,
      intensity
    });
  }

  return (
    <motion.div 
      id="heatmap-card-container"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay: 0.2 }}
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "12px",
        padding: "20px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        position: "relative"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>Heatmap</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={handlePrevMonth} style={{ padding: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "14px", fontWeight: 600, minWidth: "120px", textAlign: "center", color: "var(--text-primary)" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={handleNextMonth} style={{ padding: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 24px)", gap: "8px", textAlign: "center" }}>
          {WEEK_DAYS.map(wd => (
            <div key={wd} style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>{wd.charAt(0)}</div>
          ))}
          
          {days.map((dayObj, index) => {
            if (!dayObj) {
              return <div key={`empty-${index}`} style={{ width: "24px", height: "24px" }} />;
            }

            return (
              <div
                key={dayObj.dateStr}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  background: dayObj.intensity > 0 ? "var(--focus-color)" : "rgba(255, 255, 255, 0.05)",
                  opacity: dayObj.intensity > 0 ? dayObj.intensity + 0.1 : 1,
                  transition: "transform 0.1s ease",
                  cursor: "pointer",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.15)";

                  const tooltip = document.getElementById("heatmap-tooltip");
                  const card = document.getElementById("heatmap-card-container");
                  if (tooltip && card) {
                    tooltip.style.display = "block";
                    tooltip.innerHTML = `
                      <div style="font-weight: 600; margin-bottom: 4px;">${dayObj.dateFormatted}</div>
                      <div>${dayObj.count} sessions</div>
                      <div style="color: var(--focus-color)">Focus: ${formatStatsDuration(dayObj.focusTime)}</div>
                    `;

                    const cellRect = e.currentTarget.getBoundingClientRect();
                    const cardRect = card.getBoundingClientRect();
                    const relLeft = cellRect.left - cardRect.left + cellRect.width / 2;
                    const relTop  = cellRect.top  - cardRect.top;
                    tooltip.style.left = `${relLeft - 48}px`;
                    tooltip.style.top  = `${relTop - 78}px`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  const tooltip = document.getElementById("heatmap-tooltip");
                  if (tooltip) {
                    tooltip.style.display = "none";
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "24px", fontSize: "12px", color: "var(--text-secondary)" }}>
        <span style={{ marginRight: "4px" }}>Less</span>
        <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.05)" }} />
        <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: "var(--focus-color)", opacity: 0.3 }} />
        <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: "var(--focus-color)", opacity: 0.5 }} />
        <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: "var(--focus-color)", opacity: 0.8 }} />
        <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: "var(--focus-color)", opacity: 1.1 }} />
        <span style={{ marginLeft: "4px" }}>More</span>
      </div>

      <div
        id="heatmap-tooltip"
        style={{
          display: "none",
          position: "absolute",
          background: "var(--bg-color)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "12px",
          color: "var(--text-primary)",
          pointerEvents: "none",
          zIndex: 50,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}
      />
    </motion.div>
  );
}
