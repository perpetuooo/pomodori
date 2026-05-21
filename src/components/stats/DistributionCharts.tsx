import { motion } from "framer-motion";
import { DailyStat } from "../../lib/db";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { formatStatsDuration, formatDateDDMMYY } from "../../lib/timer";

interface DistributionChartsProps {
  stats: DailyStat[];
}

const chartCardStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
};

export function TimeDistributionChart({ stats }: DistributionChartsProps) {
  let normalFocus = 0;
  let overtimeFocus = 0;
  let normalBreak = 0;
  let overtimeBreak = 0;

  stats.forEach((s) => {
    normalFocus += Math.max(0, s.totalFocusSeconds - s.overtimeFocusSeconds);
    overtimeFocus += s.overtimeFocusSeconds;
    normalBreak += Math.max(
      0,
      s.totalShortBreakSeconds +
        s.totalLongBreakSeconds -
        (s.overtimeShortBreakSeconds + s.overtimeLongBreakSeconds)
    );
    overtimeBreak += s.overtimeShortBreakSeconds + s.overtimeLongBreakSeconds;
  });

  const timeData = [
    { name: "Normal Focus", value: normalFocus, color: "#E8433F" },
    { name: "Overtime Focus", value: overtimeFocus, color: "#5D4FB5" },
    { name: "Normal Break", value: normalBreak, color: "#3A9E5F" },
    { name: "Overtime Break", value: overtimeBreak, color: "#A855F7" },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: "var(--bg-color)",
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        >
          <p style={{ margin: 0, color: data.color, fontWeight: 600 }}>
            {data.name}
          </p>
          <p style={{ margin: 0, color: "var(--text-primary)" }}>
            {formatStatsDuration(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: 0.15 }}
      style={{ ...chartCardStyle, display: "flex", flexDirection: "column" }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: "16px",
          color: "var(--text-primary)",
          textAlign: "center",
        }}
      >
        Time Distribution
      </h3>

      <div style={{ height: "220px", flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={timeData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={95}
              stroke="none"
            >
              {timeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {timeData.length === 0 && (
        <p style={{ margin: "16px 0 0", color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" }}>
          No data yet.
        </p>
      )}
    </motion.div>
  );
}

export function DistributionCharts({ stats }: DistributionChartsProps) {

  let totalPomodoros = 0;
  let totalPauses = 0;

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyDistribution = weekDays.map((day) => ({ name: day, sessions: 0 }));

  stats.forEach((s) => {
    totalPomodoros += s.pomodorosCompleted;
    totalPauses += s.pauseCount;

    const [y, m, d] = s.date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = dateObj.getDay();
    weeklyDistribution[dayOfWeek].sessions += s.pomodorosCompleted;
  });

  const trendData = [...stats]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14)
    .map((s) => ({
      date: formatDateDDMMYY(s.date).slice(0, 5), // DD/MM
      focusSeconds: s.totalFocusSeconds + s.overtimeFocusSeconds,
    }));

  const productivityScore =
    totalPomodoros > 0
      ? Math.round((totalPomodoros / (totalPomodoros + totalPauses)) * 100)
      : 0;

  const prodData = [
    { name: "Score", value: productivityScore, fill: "#3A80C0" },
    {
      name: "Remaining",
      value: 100 - productivityScore,
      fill: "rgba(255,255,255,0.05)",
    },
  ];

  const TrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "var(--bg-color)",
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "12px",
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: 0,
              color: "var(--focus-color)",
              fontWeight: 600,
            }}
          >
            {formatStatsDuration(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        marginBottom: "32px",
      }}
    >

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: 0.2 }}
        style={{ ...chartCardStyle, gridColumn: "1 / -1" }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "16px",
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          Focus Trend (14 days)
        </h3>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="focusSeconds"
                stroke="var(--focus-color)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: 0.3 }}
        style={chartCardStyle}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "16px",
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          Weekly Rhythm (Sessions)
        </h3>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyDistribution}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-secondary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  background: "var(--bg-color)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "var(--focus-color)",
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="sessions" fill="#3A80C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: 0.4 }}
        style={{
          ...chartCardStyle,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--text-primary)", textAlign: "center" }}>
          Productivity Score
        </h3>

        <div style={{ height: "200px", width: "100%", position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={prodData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={true}
              >
                {prodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "32px",
              fontWeight: "bold",
              color: "var(--text-primary)",
            }}
          >
            {productivityScore}%
          </div>
        </div>

        <p style={{
          margin: "12px 0 0",
          fontSize: "10px",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          opacity: 0.65,
          alignSelf: "flex-start",
        }}>
          Score = (Sessions / (Sessions + Pauses)) × 100
        </p>
      </motion.div>
    </div>
  );
}
