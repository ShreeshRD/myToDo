import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { dueReminders, msUntilNextReminder } from '../lib/reminders';

const FIRED_KEY = 'reminders-fired';
const FIRED_TTL_MS = 3 * 24 * 60 * 60 * 1000;
// Safety net re-check; the main timer targets the next reminder exactly
const POLL_MS = 30 * 1000;

function loadFired() {
    try {
        const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
        const cutoff = Date.now() - FIRED_TTL_MS;
        return Object.fromEntries(Object.entries(raw).filter(([, at]) => at > cutoff));
    } catch {
        return {};
    }
}

function saveFired(fired) {
    try {
        localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
    } catch {
        // storage full or blocked: reminders may repeat, which is acceptable
    }
}

export function notificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

/**
 * Fires reminders for open tasks while the app is open in a tab: a system
 * notification when permitted, and always an in-app toast. Browsers cannot run
 * scheduled notifications for a closed tab without a push server, so the
 * Android app is the always-on reminder path.
 */
export default function useReminders(tasks, onOpenTask) {
    const [toasts, setToasts] = useState([]);
    // Lazy init runs on the client; the static export renders nothing reminder-related
    const [permission, setPermission] = useState(notificationPermission);
    const tasksRef = useRef(tasks);
    const openRef = useRef(onOpenTask);

    useEffect(() => {
        tasksRef.current = tasks;
        openRef.current = onOpenTask;
    }, [tasks, onOpenTask]);

    const dismiss = useCallback((key) => {
        setToasts(prev => prev.filter(t => t.key !== key));
    }, []);

    const check = useCallback(() => {
        const fired = loadFired();
        const due = dueReminders(tasksRef.current, dayjs(), new Set(Object.keys(fired)));
        if (due.length === 0) return;

        for (const reminder of due) {
            fired[reminder.key] = Date.now();
            const { task } = reminder;
            const when = dayjs(`2000-01-01T${task.assignedTime}`).format('h:mm A');
            const body = [when, task.category && task.category !== 'None' ? `#${task.category}` : null]
                .filter(Boolean).join(' · ');

            if (notificationPermission() === 'granted') {
                try {
                    const n = new Notification(task.name, { body, tag: reminder.key });
                    n.onclick = () => {
                        window.focus();
                        openRef.current?.(task);
                        n.close();
                    };
                } catch {
                    // some browsers only allow notifications from a service worker
                }
            }
        }
        saveFired(fired);
        setToasts(prev => [...prev, ...due.map(r => ({ key: r.key, task: r.task }))].slice(-4));
    }, []);

    // Timer aimed at the next reminder, re-armed whenever tasks change
    useEffect(() => {
        check();
        const next = msUntilNextReminder(tasks, dayjs());
        const exact = next !== null && next < 2 ** 31 - 1
            ? setTimeout(check, next + 250)
            : null;
        const poll = setInterval(check, POLL_MS);
        return () => {
            if (exact) clearTimeout(exact);
            clearInterval(poll);
        };
    }, [tasks, check]);

    const requestPermission = useCallback(async () => {
        if (notificationPermission() === 'unsupported') return;
        const result = await Notification.requestPermission();
        setPermission(result);
    }, []);

    return { toasts, dismiss, permission, requestPermission };
}
