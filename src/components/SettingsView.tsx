import { useEffect, useState, FormEvent } from "react";
import { Settings } from "../types";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "../lib/db";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocklistText, setBlocklistText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettings(loaded);
      setBlocklistText(loaded.blocklist.join("\n"));
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newBlocklist = blocklistText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const updatedSettings = { ...settings, blocklist: newBlocklist };
    await saveSettings(updatedSettings);
    setSettings(updatedSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addPreset = (preset: string[]) => {
    const currentList = blocklistText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Combine without duplicates
    const combined = Array.from(new Set([...currentList, ...preset]));
    setBlocklistText(combined.join("\n"));
  };

  const SOCIAL_MEDIA = ["facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com", "reddit.com", "linkedin.com", "snapchat.com", "pinterest.com"];
  const STREAMING = ["youtube.com", "netflix.com", "twitch.tv", "hulu.com", "primevideo.com", "disneyplus.com", "max.com", "spotify.com"];
  if (loading) return <div>Loading settings...</div>;

  return (
    <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <h1>Pomodori Settings</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <fieldset style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <legend>Timer Durations (minutes)</legend>

          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Focus Duration:
            <input
              type="number"
              min={1}
              value={settings.workDuration}
              onChange={e => setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Short Break Duration:
            <input
              type="number"
              min={1}
              value={settings.shortBreakDuration}
              onChange={e => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Long Break Duration:
            <input
              type="number"
              min={1}
              value={settings.longBreakDuration}
              onChange={e => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 15 })}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Sessions until Long Break:
            <input
              type="number"
              min={1}
              value={settings.sessionsUntilLongBreak}
              onChange={e => setSettings({ ...settings, sessionsUntilLongBreak: parseInt(e.target.value) || 4 })}
            />
          </label>
        </fieldset>

        <fieldset style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <legend>Advanced Mode</legend>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.overtimeEnabled}
              onChange={e => setSettings({ ...settings, overtimeEnabled: e.target.checked })}
            />
            Enable Overtime Mode
          </label>
        </fieldset>

        <fieldset style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <legend>Blocklist</legend>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
            Enter domains to block during focus sessions (one per line). Example: facebook.com
          </p>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0.5rem 0", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem" }}>Add Presets:</span>
            <button type="button" onClick={() => addPreset(SOCIAL_MEDIA)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Social Media</button>
            <button type="button" onClick={() => addPreset(STREAMING)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Streaming</button>
          </div>

          <textarea
            rows={10}
            value={blocklistText}
            onChange={e => setBlocklistText(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", fontFamily: "monospace" }}
            placeholder="twitter.com&#10;youtube.com"
          />
        </fieldset>

        <button type="submit" style={{ padding: "0.75rem", fontSize: "1rem", marginTop: "1rem" }}>
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </form>
    </main>
  );
}
