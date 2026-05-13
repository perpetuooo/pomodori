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

import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Bell, Settings as SettingsIcon, Shield, Trash2, Volume2 } from "lucide-react";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocklistText, setBlocklistText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [customAlarms, setCustomAlarms] = useState<Array<{ id: string, name: string }>>([]);

  const [activeSection, setActiveSection] = useState("timer");

  useEffect(() => {
    // Apply soft radius
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

    const combined = Array.from(new Set([...currentList, ...preset]));
    setBlocklistText(combined.join("\n"));
  };

  const SOCIAL_MEDIA = socialMediaPreset.split("\n").map(l => l.trim()).filter(Boolean);
  const STREAMING = streamingPreset.split("\n").map(l => l.trim()).filter(Boolean);

  const getComponentClasses = () => "bg-black/20 border-white/10 backdrop-blur-sm rounded-md"; // Revertido para os boxes

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <main className="min-h-screen relative font-sans text-foreground pb-24">
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
            <Card className="bg-white/5 border-white/10 overflow-hidden relative">
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
            <Card className="bg-white/5 border-white/10 overflow-hidden relative">
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
                      <div className="flex items-center justify-between pl-6 py-2 border-l-2 border-white/10 ml-2 mt-2">
                        <div className="space-y-0.5">
                          <Label>Ring at 00:00 on Overtime</Label>
                          <p className="text-sm text-muted-foreground">Play a sound even if Overtime mode is active.</p>
                        </div>
                        <Switch checked={settings.alarms.overtimeRingEnabled} onCheckedChange={c => setSettings({ ...settings, alarms: { ...settings.alarms, overtimeRingEnabled: c } })} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Alarm Volume</Label>
                    <span className="text-sm text-muted-foreground">{Math.round(settings.alarms.volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[settings.alarms.volume]}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => setSettings({ ...settings, alarms: { ...settings.alarms, volume: v } })}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <Label>Custom Alarm Sounds</Label>
                  <p className="text-sm text-muted-foreground">Upload your own sounds (max 10s, 2MB). You can store up to 3 alarms.</p>

                  <div className="space-y-2">
                    <div className={`flex items-center justify-between p-3 border ${getComponentClasses()}`}>
                      <Label className="flex items-center gap-3 cursor-pointer font-normal flex-1">
                        <input type="radio" name="activeAlarm" className="accent-primary w-4 h-4" checked={!settings.alarms.activeCustomAlarmId} onChange={() => setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: null } })} />
                        Default Alarm
                      </Label>
                    </div>

                    {customAlarms.map(alarm => (
                      <div key={alarm.id} className={`flex items-center justify-between p-3 border group hover:brightness-125 transition-all ${getComponentClasses()}`}>
                        <Label className="flex items-center gap-3 cursor-pointer font-normal flex-1">
                          <input type="radio" name="activeAlarm" className="accent-primary w-4 h-4" checked={settings.alarms.activeCustomAlarmId === alarm.id} onChange={() => setSettings({ ...settings, alarms: { ...settings.alarms, activeCustomAlarmId: alarm.id } })} />
                          {alarm.name}
                        </Label>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteAlarm(alarm.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
              </CardContent>
            </Card>
          </section>

          {/* Section: Advanced */}
          <section id="advanced" className="scroll-mt-12">
            <Card className="bg-white/5 border-white/10 overflow-hidden relative">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">Advanced Modes</CardTitle>
                <CardDescription>Extra features to power up your workflow.</CardDescription>
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
              </CardContent>
            </Card>
          </section>

          {/* Section: Blocklist */}
          <section id="blocklist" className="scroll-mt-12">
            <Card className="bg-white/5 border-white/10 overflow-hidden relative">
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
                  placeholder="twitter.com&#10;youtube.com"
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
    </main>
  );
}
