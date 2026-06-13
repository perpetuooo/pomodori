import { motion } from "framer-motion";
import { DailyStat } from "../../lib/db";
import { formatStatsDuration } from "../../lib/timer";
import { Flame, Target, Clock } from "lucide-react";

interface StatsCardsProps {
  stats: DailyStat[];
  streak: number;
}

export function StatsCards({ stats, streak }: StatsCardsProps) {

  let currentStreakCount = 0;
  let maxStreak = 0;
  
  const sortedStats = [...stats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  for (let i = 0; i < sortedStats.length; i++) {
    if (sortedStats[i].pomodorosCompleted > 0) {
      if (i === 0) {
        currentStreakCount = 1;
      } else {
        const prevDate = new Date(sortedStats[i-1].date);
        const currDate = new Date(sortedStats[i].date);
        // Normalize to midnight UTC to avoid timezone issues
        const utc1 = Date.UTC(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
        const utc2 = Date.UTC(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
        const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreakCount++;
        } else if (diffDays > 1) {
          currentStreakCount = 1; 
        }
      }
      if (currentStreakCount > maxStreak) {
        maxStreak = currentStreakCount;
      }
    } else {
      currentStreakCount = 0; 
    }
  }

  let totalFocus = 0;
  let totalSessions = 0;
  let totalPauses = 0;

  stats.forEach((s) => {
    totalFocus += (s.totalFocusSeconds + s.overtimeFocusSeconds);
    totalSessions += s.pomodorosCompleted;
    totalPauses += s.pauseCount;
  });

  const daysWithSessions = stats.filter(s => s.pomodorosCompleted > 0).length;
  const avgSessions = daysWithSessions > 0 ? (totalSessions / daysWithSessions).toFixed(1) : "0";


  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}
    >
      <motion.div variants={item} style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Flame size={20} color="var(--focus-color)" />
          <span style={cardTitleStyle}>Current Streak</span>
        </div>
        <div style={cardValueStyle}>{streak} {streak === 1 ? 'day' : 'days'}</div>
        <div style={cardSubStyle}>Max: {maxStreak} {maxStreak === 1 ? 'day' : 'days'}</div>
      </motion.div>

      <motion.div variants={item} style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Target size={20} color="var(--short-break-color)" />
          <span style={cardTitleStyle}>Total Sessions</span>
        </div>
        <div style={cardValueStyle}>{totalSessions}</div>
        <div style={cardSubStyle}>Avg: {avgSessions} / day</div>
      </motion.div>

      <motion.div variants={item} style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Clock size={20} color="var(--long-break-color)" />
          <span style={cardTitleStyle}>Total Focus Time</span>
        </div>
        <div style={cardValueStyle}>{formatStatsDuration(totalFocus)}</div>
      </motion.div>

    </motion.div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px"
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "var(--text-secondary)",
  fontWeight: 600
};

const cardValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "var(--text-primary)"
};

const cardSubStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-secondary)",
  marginTop: "-4px"
};
