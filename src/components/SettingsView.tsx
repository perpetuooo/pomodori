import { useEffect, useState, FormEvent } from "react";
import { Settings } from "../types";
import { loadSettings, saveSettings, db, DEFAULT_SETTINGS } from "../lib/db";
import socialMediaPreset from "../assets/presets/social_media.txt?raw";
import streamingPreset from "../assets/presets/streaming.txt?raw";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Bell, Settings as SettingsIcon, Shield, Trash2, Volume2, VolumeX, Download, Upload, Bug, Pencil, Play, Pause } from "lucide-react";
import { previewAlarm, stopPreview, DEFAULT_ALARMS } from "../lib/alerts";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocklistText, setBlocklistText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [customAlarms, setCustomAlarms] = useState<Array<{ id: string, name: string, filename: string }>>([]);
  const [activeSection, setActiveSection] = useState("timer");
  const [previewingAlarmId, setPreviewingAlarmId] = useState<string | null>(null);

  const [alarmModal, setAlarmModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    alarmId?: string;
    initialName: string;
    pendingFile?: File;
  }>({ open: false, mode: 'create', initialName: '' });
  const [alarmModalInput, setAlarmModalInput] = useState("");

  const [exportModal, setExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({ settings: true, dailyStats: true, audioFiles: true });

  useEffect(() => {
    document.documentElement.style.setProperty("--radius", "0.375rem");
  }, []);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading]);

  const loadAlarms = () => {
    db.audioFiles.toArray().then(files => {
      setCustomAlarms(files.map(f => ({ id: f.id, name: f.name, filename: f.filename || f.name })));
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

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audioUrl);
      if (audio.duration > 10) {
        setUploadError("Audio duration must be 10 seconds or less.");
        return;
      }

      setAlarmModalInput(file.name);
      setAlarmModal({ open: true, mode: 'create', initialName: file.name, pendingFile: file });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      setUploadError("Invalid audio file.");
    };
  };

  const handleAlarmModalConfirm = async () => {
    const name = alarmModalInput.trim();
    if (!name) return;

    if (alarmModal.mode === 'create' && alarmModal.pendingFile) {
      const id = Date.now().toString();
      try {
        await db.audioFiles.put({ id, name, filename: alarmModal.pendingFile.name, blob: alarmModal.pendingFile });
        setUploadSuccess("Custom alarm saved successfully!");
        loadAlarms();
        setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: id } });
        setTimeout(() => setUploadSuccess(""), 3000);
      } catch {
        setUploadError("Failed to save audio file.");
      }
    } else if (alarmModal.mode === 'edit' && alarmModal.alarmId) {
      await db.audioFiles.update(alarmModal.alarmId, { name });
      loadAlarms();
    }

    setAlarmModal(prev => ({ ...prev, open: false, pendingFile: undefined }));
  };

  const handleDeleteAlarm = async (id: string) => {
    await db.audioFiles.delete(id);
    if (settings.alarms?.activeCustomAlarmId === id) {
      setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: null } });
    }
    loadAlarms();
  };

  const handlePlayAlarm = (alarmId?: string) => {
    const id = alarmId ?? null;
    if (previewingAlarmId === id) {
      stopPreview();
      setPreviewingAlarmId(null);
    } else {
      const onEnd = () => setPreviewingAlarmId(null);
      stopPreview();
      previewAlarm(settings.alarms.volume, id, onEnd);
      setPreviewingAlarmId(id);
    }
  };

  const addPreset = (preset: string[]) => {
    const currentList = blocklistText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const combined = Array.from(new Set([...currentList, ...preset]));
    setBlocklistText(combined.join("\n"));
  };

  const handleExportConfirm = async () => {
    const exportObj: Record<string, unknown> = {};

    if (exportOptions.settings) {
      exportObj.settings = {
        ...settings,
        blocklist: blocklistText
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
      };
    }

    if (exportOptions.dailyStats) {
      exportObj.dailyStats = await db.dailyStats.toArray();
    }

    if (exportOptions.audioFiles) {
      const audioData = await db.audioFiles.toArray();
      exportObj.audioFiles = await Promise.all(audioData.map(async file => {
        const b64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file.blob);
        });
        return { id: file.id, name: file.name, filename: file.filename, blob: b64 };
      }));
    }

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pomodori_export.json";
    a.click();
    URL.revokeObjectURL(url);
    setExportModal(false);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const settingsToImport = json.settings as Settings | undefined;
        const statsToImport = json.dailyStats || [];
        const audioToImport: Array<{ id: string, name: string, filename?: string, blob: string }> = json.audioFiles || [];

        await db.transaction('rw', db.settings, db.dailyStats, db.audioFiles, async () => {
          if (settingsToImport) {
            await db.settings.put(settingsToImport);
          }

          for (const item of statsToImport) {
            await db.dailyStats.put(item);
          }

          for (const item of audioToImport) {
            const res = await fetch(item.blob);
            const blob = await res.blob();
            await db.audioFiles.put({ id: item.id, name: item.name, filename: item.filename || item.name, blob });
          }
        });

        if (settingsToImport) {
          setSettings(settingsToImport);
          setBlocklistText(settingsToImport.blocklist.join("\n"));
        }
        alert("Data imported successfully!");
      } catch {
        alert("Error importing data. Invalid file.");
      }
    };
    reader.readAsText(file);
  };

  const clearData = async () => {
    if (window.confirm("Are you sure you want to delete all statistics data? This cannot be undone.")) {
      await db.dailyStats.clear();
      alert("Statistics cleared.");
    }
  };

  const generateFakeData = async () => {
    if (!window.confirm("This will generate fake data for the last 60 days. Proceed?")) return;

    await db.transaction('rw', db.dailyStats, async () => {
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (Math.random() > 0.8) continue;

        const pomodoros = Math.floor(Math.random() * 8) + 1;
        const focusSeconds = pomodoros * 25 * 60;

        await db.dailyStats.put({
          date: dateStr,
          pomodorosCompleted: pomodoros,
          shortBreaksCompleted: pomodoros,
          longBreaksCompleted: Math.floor(pomodoros / 4),
          pauseCount: Math.floor(Math.random() * 5),
          totalFocusSeconds: focusSeconds,
          totalShortBreakSeconds: pomodoros * 5 * 60,
          totalLongBreakSeconds: Math.floor(pomodoros / 4) * 15 * 60,
          overtimeFocusSeconds: Math.floor(Math.random() * 600),
          overtimeShortBreakSeconds: Math.floor(Math.random() * 120),
          overtimeLongBreakSeconds: Math.floor(Math.random() * 300)
        });
      }
    });
    alert("Fake data generated successfully!");
  };
  const SOCIAL_MEDIA = socialMediaPreset.split("\n").map(l => l.trim()).filter(Boolean);
  const STREAMING = streamingPreset.split("\n").map(l => l.trim()).filter(Boolean);

  const getComponentClasses = () => "bg-black/20 rounded-md";

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <main className="min-h-screen relative font-['Plus_Jakarta_Sans'] text-foreground pb-24">
      {/* Table of Contents */}
      <aside className="fixed top-24 right-12 hidden lg:flex flex-col gap-3 w-48 z-50">
        <a href="#timer" className={`text-sm transition-all flex items-center gap-3 ${activeSection === 'timer' ? 'text-white font-bold translate-x-[-5px]' : 'text-muted-foreground hover:text-white'}`}>
          <Clock className="w-4 h-4" /> Durations
        </a>
        <a href="#alarms" className={`text-sm transition-all flex items-center gap-3 ${activeSection === 'alarms' ? 'text-white font-bold translate-x-[-5px]' : 'text-muted-foreground hover:text-white'}`}>
          <Bell className="w-4 h-4" /> Alerts & Sounds
        </a>
        <a href="#advanced" className={`text-sm transition-all flex items-center gap-3 ${activeSection === 'advanced' ? 'text-white font-bold translate-x-[-5px]' : 'text-muted-foreground hover:text-white'}`}>
          <SettingsIcon className="w-4 h-4" /> Advanced
        </a>
        <a href="#blocklist" className={`text-sm transition-all flex items-center gap-3 ${activeSection === 'blocklist' ? 'text-white font-bold translate-x-[-5px]' : 'text-muted-foreground hover:text-white'}`}>
          <Shield className="w-4 h-4" /> Blocklist
        </a>
      </aside>

      <div className="max-w-2xl mx-auto p-6 pt-12">
        <div className="flex items-center gap-3 mb-10">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-extrabold tracking-tight">Preferences</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section: Timer */}
          <section id="timer" className="scroll-mt-12">
            <Card className="bg-white/5 overflow-hidden relative">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">Durations</CardTitle>
                <CardDescription>Adjust the time for your focus sessions and breaks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="focus">Focus Duration (min)</Label>
                    <Input id="focus" type="number" min={1} value={settings.workDuration} onChange={e => setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })} className={`text-white ${getComponentClasses()}`} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortBreak">Short Break (min)</Label>
                    <Input id="shortBreak" type="number" min={1} value={settings.shortBreakDuration} onChange={e => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })} className={`text-white ${getComponentClasses()}`} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longBreak">Long Break (min)</Label>
                    <Input id="longBreak" type="number" min={1} value={settings.longBreakDuration} onChange={e => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 15 })} className={`text-white ${getComponentClasses()}`} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionsUntilLongBreak">Sessions until Long Break</Label>
                    <Input id="sessionsUntilLongBreak" type="number" min={1} value={settings.sessionsUntilLongBreak} onChange={e => setSettings({ ...settings, sessionsUntilLongBreak: parseInt(e.target.value) || 4 })} className={`text-white ${getComponentClasses()}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Alarms */}
          <section id="alarms" className="scroll-mt-12">
            <Card className="bg-white/5 overflow-hidden relative">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">Alerts & Sounds</CardTitle>
                <CardDescription>Manage how Pomodori notifies you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show system notifications when a session completes.</p>
                  </div>
                  <Switch checked={settings.notificationsEnabled} onCheckedChange={c => setSettings({ ...settings, notificationsEnabled: c })} />
                </div>

                <AnimatePresence>
                  {settings.notificationsEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between pl-6 py-2 ml-2 mt-2">
                        <div className="space-y-0.5">
                          <Label>Notify on Overtime</Label>
                          <p className="text-sm text-muted-foreground">Show system notifications even if Overtime mode is active.</p>
                        </div>
                        <Switch checked={settings.alarms.overtimeNotificationEnabled} onCheckedChange={c => setSettings({ ...settings, alarms: { ...settings.alarms, overtimeNotificationEnabled: c } })} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ring on Session Complete</Label>
                    <p className="text-sm text-muted-foreground">Play a sound when a timer finishes.</p>
                  </div>
                  <Switch checked={settings.alarms.ringOnComplete} onCheckedChange={c => setSettings({ ...settings, alarms: { ...settings.alarms, ringOnComplete: c } })} />
                </div>

                <AnimatePresence>
                  {settings.alarms.ringOnComplete && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between pl-6 py-2 ml-2 mt-2">
                        <div className="space-y-0.5">
                          <Label>Ring at 00:00 on Overtime</Label>
                          <p className="text-sm text-muted-foreground">Play a sound even if Overtime mode is active.</p>
                        </div>
                        <Switch checked={settings.alarms.overtimeRingEnabled} onCheckedChange={c => setSettings({ ...settings, alarms: { ...settings.alarms, overtimeRingEnabled: c } })} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`space-y-4 pt-4 ${!settings.alarms.soundEnabled ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, alarms: { ...settings.alarms, soundEnabled: !settings.alarms.soundEnabled } })}
                      className={`flex items-center gap-2 hover:text-foreground transition-colors ${!settings.alarms.soundEnabled ? 'text-muted-foreground' : ''}`}
                    >
                      {settings.alarms.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span>Alarm Volume</span>
                    </button>
                    <span className={`text-sm ${!settings.alarms.soundEnabled ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{Math.round(settings.alarms.volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[settings.alarms.volume]}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => setSettings({ ...settings, alarms: { ...settings.alarms, volume: v } })}
                    onValueCommit={([v]) => {
                      if (!settings.alarms.soundEnabled) return;
                      const onEnd = () => setPreviewingAlarmId(null);
                      stopPreview();
                      const alarmId = settings.alarms.activeCustomAlarmId ?? settings.alarms.activeDefaultAlarmId;
                      previewAlarm(v, alarmId, onEnd);
                      setPreviewingAlarmId(alarmId);
                    }}
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Default Alarms</Label>
                    <p className="text-sm text-muted-foreground">Choose a built-in alarm sound.</p>
                  </div>

                  <div className="space-y-2">
                    {DEFAULT_ALARMS.map(alarm => (
                      <div key={alarm.id} className={`flex items-center justify-between p-3 border ${getComponentClasses()}`}>
                        <Label className="flex items-center gap-3 cursor-pointer font-normal flex-1">
                          <input
                            type="radio"
                            name="activeAlarm"
                            className="accent-primary w-4 h-4"
                            checked={!settings.alarms.activeCustomAlarmId && settings.alarms.activeDefaultAlarmId === alarm.id}
                            onChange={() => setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: null, activeDefaultAlarmId: alarm.id } })}
                          />
                          {alarm.name}
                        </Label>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handlePlayAlarm(alarm.id)}>
                          {previewingAlarmId === alarm.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div>
                      <Label>Custom Alarms</Label>
                      <p className="text-sm text-muted-foreground">Upload your own sounds (max 10s, 2MB). You can store up to 3 alarms.</p>
                    </div>

                    <div className="space-y-2">
                      {customAlarms.map(alarm => (
                        <div key={alarm.id} className={`p-3 border group hover:brightness-125 transition-all ${getComponentClasses()}`}>
                          <div className="flex items-start gap-3">
                            <Label className="flex items-start gap-3 cursor-pointer font-normal flex-1 min-w-0">
                              <input type="radio" name="activeAlarm" className="accent-primary w-4 h-4 mt-0.5 shrink-0" checked={settings.alarms.activeCustomAlarmId === alarm.id} onChange={() => setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: alarm.id } })} />
                              <div className="min-w-0">
                                <span>{alarm.name}</span>
                                <p className="text-xs text-muted-foreground truncate">{alarm.filename}</p>
                              </div>
                            </Label>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handlePlayAlarm(alarm.id)}>
                                {previewingAlarmId === alarm.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setAlarmModalInput(alarm.name); setAlarmModal({ open: true, mode: 'edit', alarmId: alarm.id, initialName: alarm.name }); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteAlarm(alarm.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {customAlarms.length < 3 && (
                      <div className="pt-2">
                        <Input type="file" accept="audio/*" onChange={handleAudioUpload} className={`text-white cursor-pointer file:text-white file:bg-transparent file:border-0 file:font-semibold ${getComponentClasses()}`} />
                      </div>
                    )}
                    {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                    {uploadSuccess && <p className="text-sm text-green-500">{uploadSuccess}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Advanced */}
          <section id="advanced" className="scroll-mt-12">
            <Card className="bg-white/5 overflow-hidden relative">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">Advanced</CardTitle>
                <CardDescription>Extra features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Overtime Mode</Label>
                    <p className="text-sm text-muted-foreground">Keep counting up when a session finishes instead of stopping.</p>
                  </div>
                  <Switch checked={settings.overtimeEnabled} onCheckedChange={c => setSettings({ ...settings, overtimeEnabled: c })} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autostart Next Session</Label>
                    <p className="text-sm text-muted-foreground">Automatically start the next timer when the current one finishes.</p>
                  </div>
                  <Switch checked={settings.autoStartNextSession} onCheckedChange={c => setSettings({ ...settings, autoStartNextSession: c })} />
                </div>

                <div className="space-y-4 pt-4">
                  <Label>Data Management</Label>
                  <p className="text-sm text-muted-foreground">Import or export your settings, audio files and stats.</p>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setExportModal(true)} className="gap-2">
                      <Download className="w-4 h-4" /> Export Configuration
                    </Button>
                    <Button variant="outline" asChild>
                      <Label className="cursor-pointer gap-2">
                        <Upload className="w-4 h-4" /> Import Configuration
                        <input type="file" accept=".json" onChange={importData} className="hidden" />
                      </Label>
                    </Button>
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-4">
                    <Label>Statistics</Label>
                    <p className="text-sm text-muted-foreground">Clear your statistics data or generate debug data for testing.</p>
                    <div className="flex gap-4">
                      <Button type="button" variant="destructive" onClick={clearData} className="gap-2">
                        <Trash2 className="w-4 h-4" /> Clear All Statistics
                      </Button>
                      <Button type="button" variant="outline" onClick={generateFakeData} className="gap-2 text-yellow-500 hover:bg-yellow-500/10">
                        <Bug className="w-4 h-4" /> Generate Debug Data
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Blocklist */}
          <section id="blocklist" className="scroll-mt-12">
            <Card className="bg-white/5 overflow-hidden relative">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">Distraction Blocklist</CardTitle>
                <CardDescription>Enter domains to block during focus sessions (one per line). Example: facebook.com</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Quick add presets:</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => addPreset(SOCIAL_MEDIA)} className="h-8">Social Media</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => addPreset(STREAMING)} className="h-8">Streaming</Button>
                </div>
                <Textarea
                  rows={8}
                  value={blocklistText}
                  onChange={e => setBlocklistText(e.target.value)}
                  placeholder="twitter.com&#10;youtube.com&#10;..."
                  className={`font-mono resize-y text-white ${getComponentClasses()}`}
                />
              </CardContent>
            </Card>
          </section>

          {/* Save Button */}
          <div className="sticky bottom-6 flex justify-end z-40 mt-8">
            <Button type="submit" size="lg" className="min-w-[160px] bg-[var(--focus-color)] text-white hover:bg-[var(--focus-color)]/90 border-none shadow-xl relative overflow-hidden transition-all duration-300">
              <AnimatePresence mode="wait">
                {saved ? (
                  <motion.div key="saved" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2 font-bold">
                    <Check className="w-5 h-5" /> Saved Successfully!
                  </motion.div>
                ) : (
                  <motion.div key="save" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="font-bold">
                    Save Settings
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>

        </form>
      </div>

      <Dialog open={alarmModal.open} onOpenChange={open => { if (!open) setAlarmModal(prev => ({ ...prev, open: false, pendingFile: undefined })); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alarmModal.mode === 'create' ? 'Name Your Alarm' : 'Edit Alarm Name'}</DialogTitle>
            <DialogDescription>
              {alarmModal.mode === 'create'
                ? 'Choose a name for your custom alarm sound.'
                : 'Rename your custom alarm sound.'}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={alarmModalInput}
            onChange={e => setAlarmModalInput(e.target.value)}
            placeholder="Alarm name"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAlarmModalConfirm(); }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAlarmModal(prev => ({ ...prev, open: false, pendingFile: undefined }))}>Cancel</Button>
            <Button type="button" onClick={handleAlarmModalConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportModal} onOpenChange={setExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Configuration</DialogTitle>
            <DialogDescription>Select which data to include in the export file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4" checked={exportOptions.settings} onChange={e => setExportOptions({ ...exportOptions, settings: e.target.checked })} />
              <div>
                <span className="font-medium">Settings</span>
                <p className="text-xs text-muted-foreground">Timer durations, alarms config, blocklist, and preferences</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4" checked={exportOptions.dailyStats} onChange={e => setExportOptions({ ...exportOptions, dailyStats: e.target.checked })} />
              <div>
                <span className="font-medium">Daily Statistics</span>
                <p className="text-xs text-muted-foreground">Your pomodoro history and session data</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4" checked={exportOptions.audioFiles} onChange={e => setExportOptions({ ...exportOptions, audioFiles: e.target.checked })} />
              <div>
                <span className="font-medium">Custom Alarm Sounds</span>
                <p className="text-xs text-muted-foreground">Your uploaded alarm audio files</p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExportModal(false)}>Cancel</Button>
            <Button type="button" onClick={handleExportConfirm}>Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
