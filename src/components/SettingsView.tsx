import { useEffect, useState, FormEvent } from "react";
import { Settings } from "../types";
import { loadSettings, saveSettings, db, DEFAULT_SETTINGS } from "../lib/db";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocklistText, setBlocklistText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    setUploadSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 2MB.");
      return;
    }

    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);

    audio.onloadedmetadata = async () => {
      URL.revokeObjectURL(audioUrl);
      if (audio.duration > 10) {
        setUploadError("Audio duration must be 10 seconds or less.");
        return;
      }

      try {
        await db.audioFiles.put({ id: "customAlarm", blob: file });
        setUploadSuccess("Custom alarm saved successfully!");
        setTimeout(() => setUploadSuccess(""), 3000);
      } catch (err) {
        setUploadError("Failed to save audio file.");
      }
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      setUploadError("Invalid audio file.");
    };
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
          <legend>Alarms & Notifications</legend>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={settings.alarms?.workEnabled ?? true} 
              onChange={e => setSettings({...settings, alarms: {...settings.alarms, workEnabled: e.target.checked}})} 
            />
            Ring on Focus complete
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={settings.alarms?.shortBreakEnabled ?? true} 
              onChange={e => setSettings({...settings, alarms: {...settings.alarms, shortBreakEnabled: e.target.checked}})} 
            />
            Ring on Short Break complete
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={settings.alarms?.longBreakEnabled ?? true} 
              onChange={e => setSettings({...settings, alarms: {...settings.alarms, longBreakEnabled: e.target.checked}})} 
            />
            Ring on Long Break complete
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={settings.alarms?.overtimeEnabled ?? true} 
              onChange={e => setSettings({...settings, alarms: {...settings.alarms, overtimeEnabled: e.target.checked}})} 
            />
            Ring exactly at 00:00 when Overtime Mode is active
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
            Alarm Volume:
            <input 
              type="range" 
              min="0" max="1" step="0.1" 
              value={settings.alarms?.volume ?? 0.5} 
              onChange={e => setSettings({...settings, alarms: {...settings.alarms, volume: parseFloat(e.target.value)}})} 
            />
          </label>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Custom Alarm Sound</span>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>Upload your own sound (max 10s, 2MB). Overrides the default alarm.</p>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} />
            {uploadError && <span style={{ color: "#e74c3c", fontSize: "0.85rem" }}>{uploadError}</span>}
            {uploadSuccess && <span style={{ color: "#2ecc71", fontSize: "0.85rem" }}>{uploadSuccess}</span>}
          </div>
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
