import { useLiveQuery } from "dexie-react-hooks";
import { db, DailyStat } from "../lib/db";
import { formatClock } from "../lib/timer";

export function StatsView() {
  const stats = useLiveQuery(() => db.dailyStats.reverse().toArray());

  if (!stats) return <p>Loading stats...</p>;

  let streak = 0;
  const todayDate = new Date();
  let tempDate = new Date(todayDate);

  for (let i = 0; i < stats.length; i++) {
    const statDate = new Date(stats[i].date);
    // Add timezone offset to prevent date shifting bugs
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

  const exportData = async () => {
    const statsData = await db.dailyStats.toArray();
    const audioData = await db.audioFiles.toArray();
    
    // Convert blobs to base64 for JSON serialization
    const audioFilesB64 = await Promise.all(audioData.map(async file => {
      const b64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file.blob);
      });
      return { id: file.id, name: file.name, blob: b64 };
    }));

    const exportObj = {
      dailyStats: statsData,
      audioFiles: audioFilesB64
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pomodori_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const statsToImport = json.dailyStats || [];
        const audioToImport: Array<{id: string, name: string, blob: string}> = json.audioFiles || [];

        await db.transaction('rw', db.dailyStats, db.audioFiles, async () => {
          for (const item of statsToImport) {
            await db.dailyStats.put(item);
          }
          
          for (const item of audioToImport) {
            const res = await fetch(item.blob);
            const blob = await res.blob();
            await db.audioFiles.put({ id: item.id, name: item.name, blob });
          }
        });
        alert("Data imported successfully!");
      } catch (err) {
        alert("Error importing data. Invalid file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="stats-view" style={{ textAlign: "left", padding: "10px", maxHeight: "400px", overflowY: "auto" }}>
      <h2>Statistics</h2>

      <div style={{ marginBottom: "1rem", padding: "10px", background: "rgba(0,0,0,0.05)", borderRadius: "8px" }}>
        <strong>Streak: {streak} days</strong>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button onClick={exportData} style={{ fontSize: "0.8rem", padding: "4px 8px" }}>Export JSON</button>
        <label style={{ fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer", background: "#eee", border: "1px solid #ccc", borderRadius: "4px", color: "black" }}>
          Import
          <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
        </label>
      </div>

      {stats.length === 0 && <p>No data recorded yet.</p>}

      {stats.map((s: DailyStat) => (
        <div key={s.date} style={{ marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
          <h3 style={{ margin: "0 0 5px 0" }}>{s.date}</h3>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem" }}>
            <li>Focus: {formatClock(s.totalFocusSeconds)}</li>
            <li>Pomodoros: {s.pomodorosCompleted}</li>
            <li>Short Breaks: {s.shortBreaksCompleted}</li>
            <li>Long Breaks: {s.longBreaksCompleted}</li>
            <li>Interruptions (Pause): {s.pauseCount}</li>
          </ul>
        </div>
      ))}
    </div>
  );
}
