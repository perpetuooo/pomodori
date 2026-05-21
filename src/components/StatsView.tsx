
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { StatsCards } from "./stats/StatsCards";
import { PomodoroHeatmap } from "./stats/PomodoroHeatmap";
import { DistributionCharts, TimeDistributionChart } from "./stats/DistributionCharts";
import { DayDetails } from "./stats/DayDetails";
import { ArrowLeft } from "lucide-react";

export function StatsView({ onBack }: { onBack: () => void }) {
  const stats = useLiveQuery(() => db.dailyStats.reverse().toArray());

  if (!stats) return <p style={{ textAlign: "center", marginTop: "40px" }}>Loading stats...</p>;

  let streak = 0;
  const todayDate = new Date();
  let tempDate = new Date(todayDate);

  for (let i = 0; i < stats.length; i++) {
    const statDate = new Date(stats[i].date);
    statDate.setMinutes(statDate.getMinutes() + statDate.getTimezoneOffset());

    const expectedYear = tempDate.getFullYear();
    const expectedMonth = String(tempDate.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(tempDate.getDate()).padStart(2, '0');
    const expectedStr = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    if (stats[i].date === expectedStr && stats[i].totalFocusSeconds > 0) {
      streak++;
      tempDate.setDate(tempDate.getDate() - 1);
    } else if (i === 0 && stats[i].date !== expectedStr) {
      tempDate.setDate(tempDate.getDate() - 1);
      const yestYear = tempDate.getFullYear();
      const yestMonth = String(tempDate.getMonth() + 1).padStart(2, '0');
      const yestDay = String(tempDate.getDate()).padStart(2, '0');
      const yestStr = `${yestYear}-${yestMonth}-${yestDay}`;
      if (stats[i].date === yestStr && stats[i].totalFocusSeconds > 0) {
        streak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }



  return (
    <div className="stats-view" style={{ textAlign: "left", padding: "20px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
        <button onClick={onBack} title="Back to Timer" style={{ padding: "8px", marginRight: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
          <ArrowLeft size={20} />
        </button>
      </div>

      <StatsCards stats={stats} streak={streak} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px", alignItems: "stretch" }}>
        <PomodoroHeatmap stats={stats} />
        <TimeDistributionChart stats={stats} />
      </div>

      <DistributionCharts stats={stats} />
      <DayDetails stats={stats} />
    </div>
  );
}
