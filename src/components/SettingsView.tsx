import { useEffect, useState, FormEvent } from "react";
import { Settings } from "../types";
import { loadSettings, saveSettings, db, DEFAULT_SETTINGS } from "../lib/db";
import socialMediaPreset from "../assets/presets/social_media.txt?raw";
import streamingPreset from "../assets/presets/streaming.txt?raw";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocklistText, setBlocklistText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [customAlarms, setCustomAlarms] = useState<Array<{ id: string, name: string }>>([]);

  useEffect(() => {
    const load = () => {
      loadSettings().then((loaded) => {
        setSettings(loaded);
        setBlocklistText(loaded.blocklist.join("\n"));
        setLoading(false);
      });
    };
    load();
    loadAlarms();

    const isExtension = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;
    if (isExtension) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.settings) {
          setSettings(changes.settings.newValue as Settings);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const loadAlarms = () => {
    db.audioFiles.toArray().then(files => {
      setCustomAlarms(files.map(f => ({ id: f.id, name: f.name })));
    });
  };

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

    if (customAlarms.length >= 3) {
      setUploadError("Maximum of 3 custom alarms allowed.");
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

      const alarmName = prompt("Enter a name for this alarm:", file.name) || file.name;
      const id = Date.now().toString();

      try {
        await db.audioFiles.put({ id, name: alarmName, blob: file });
        setUploadSuccess("Custom alarm saved successfully!");
        loadAlarms();
        setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: id } });
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

  const handleDeleteAlarm = async (id: string) => {
    await db.audioFiles.delete(id);
    if (settings.alarms?.activeCustomAlarmId === id) {
      setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: null } });
    }
    loadAlarms();
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

  const SOCIAL_MEDIA = socialMediaPreset.split("\n").map(l => l.trim()).filter(Boolean);
  const STREAMING = streamingPreset.split("\n").map(l => l.trim()).filter(Boolean);

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
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.autoStartNextSession}
              onChange={e => setSettings({ ...settings, autoStartNextSession: e.target.checked })}
            />
            Autostart next session automatically
          </label>
        </fieldset>

        <fieldset style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <legend>Alarms & Notifications</legend>
          
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={e => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
            />
            Enable Notifications
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.alarms.ringOnComplete}
              onChange={e => setSettings({ ...settings, alarms: { ...settings.alarms, ringOnComplete: e.target.checked } })}
            />
            Ring on session complete
          </label>

          {settings.alarms.ringOnComplete && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginLeft: "1.5rem", fontSize: "0.9rem", opacity: 0.9 }}>
              <input
                type="checkbox"
                checked={settings.alarms.overtimeRingEnabled}
                onChange={e => setSettings({ ...settings, alarms: { ...settings.alarms, overtimeRingEnabled: e.target.checked } })}
              />
              Ring at 00:00 on Overtime Mode
            </label>
          )}

          <label style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
            Alarm Volume:
            <input
              type="range"
              min="0" max="1" step="0.1"
              value={settings.alarms?.volume ?? 0.5}
              onChange={e => setSettings({ ...settings, alarms: { ...settings.alarms, volume: parseFloat(e.target.value) } })}
            />
          </label>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Custom Alarm Sound</span>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>Upload your own sounds (max 10s, 2MB). You can store up to 3 alarms.</p>

            {customAlarms.map(alarm => (
              <div key={alarm.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flex: 1 }}>
                  <input
                    type="radio"
                    name="activeAlarm"
                    checked={settings.alarms?.activeCustomAlarmId === alarm.id}
                    onChange={() => setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: alarm.id } })}
                  />
                  {alarm.name}
                </label>
                <button type="button" onClick={() => handleDeleteAlarm(alarm.id)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", background: "#e74c3c", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>Delete</button>
              </div>
            ))}

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.5rem" }}>
              <input
                type="radio"
                name="activeAlarm"
                checked={!settings.alarms?.activeCustomAlarmId}
                onChange={() => setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: null } })}
              />
              Default Alarm
            </label>

            {customAlarms.length < 3 && (
              <input type="file" accept="audio/*" onChange={handleAudioUpload} />
            )}
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
