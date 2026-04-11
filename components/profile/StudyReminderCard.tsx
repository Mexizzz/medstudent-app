'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_KEY = 'medstudy_reminder';

export function StudyReminderCard() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('20:00');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { enabled: e, time: t } = JSON.parse(stored);
      setEnabled(e);
      setTime(t ?? '20:00');
    }
  }, []);

  async function registerSw() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return reg;
    } catch { return null; }
  }

  async function scheduleReminder(t: string, reg: ServiceWorkerRegistration) {
    const [hour, minute] = t.split(':').map(Number);
    const now = new Date();
    const formatted = new Date();
    formatted.setHours(hour, minute, 0, 0);
    const timeLabel = formatted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    reg.active?.postMessage({ type: 'SCHEDULE_REMINDER', hour, minute, label: timeLabel });
  }

  async function handleToggle() {
    if (!supported) return;

    if (enabled) {
      setEnabled(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false, time }));
      toast.info('Study reminders turned off');
      return;
    }

    let perm = permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
      setPermission(perm);
    }

    if (perm !== 'granted') {
      toast.error('Notification permission denied. Enable it in your browser settings.');
      return;
    }

    const reg = await registerSw();
    if (!reg) { toast.error('Could not register service worker'); return; }

    setEnabled(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, time }));
    await scheduleReminder(time, reg);
    toast.success(`Reminder set for ${time} daily! 🔔`);
  }

  async function handleTimeChange(newTime: string) {
    setTime(newTime);
    if (enabled) {
      const reg = await registerSw();
      if (reg) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, time: newTime }));
        await scheduleReminder(newTime, reg);
        toast.success(`Reminder updated to ${newTime}`);
      }
    }
  }

  if (!supported) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-xl', enabled ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-muted')}>
              {enabled ? <Bell className="w-4 h-4 text-blue-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">Daily Study Reminder</p>
              <p className="text-xs text-muted-foreground">
                {enabled ? `Reminder set for ${time}` : 'Get a daily nudge to study'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              enabled ? 'bg-blue-500' : 'bg-muted border border-border'
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>

        {enabled && (
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Reminder time</label>
              <input
                type="time"
                value={time}
                onChange={e => handleTimeChange(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-red-500 mt-2">
            Notifications are blocked. Go to browser settings → Site settings → Notifications to allow them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
