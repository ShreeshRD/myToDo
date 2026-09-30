import dayjs from 'dayjs';
import { reminderFireTime, dueReminders, msUntilNextReminder, reminderKey, reminderLabel } from '../lib/reminders';

const base = { id: 1, uuid: 'u1', name: 'Standup', taskDate: '2026-09-29', assignedTime: '10:00:00', complete: false };

describe('reminderFireTime', () => {
    it('subtracts the offset from the task time', () => {
        expect(reminderFireTime({ ...base, reminderMinutesBefore: 15 }).format('YYYY-MM-DD HH:mm')).toBe('2026-09-29 09:45');
        expect(reminderFireTime({ ...base, reminderMinutesBefore: 0 }).format('HH:mm')).toBe('10:00');
    });

    it('crosses midnight for "1 day before"', () => {
        expect(reminderFireTime({ ...base, reminderMinutesBefore: 1440 }).format('YYYY-MM-DD HH:mm')).toBe('2026-09-28 10:00');
    });

    it('accepts HH:mm without seconds', () => {
        expect(reminderFireTime({ ...base, assignedTime: '07:30', reminderMinutesBefore: 5 }).format('HH:mm')).toBe('07:25');
    });

    it('returns null without a reminder, a time, or when complete/deleted', () => {
        expect(reminderFireTime({ ...base, reminderMinutesBefore: null })).toBeNull();
        expect(reminderFireTime({ ...base, assignedTime: null, reminderMinutesBefore: 5 })).toBeNull();
        expect(reminderFireTime({ ...base, complete: true, reminderMinutesBefore: 5 })).toBeNull();
        expect(reminderFireTime({ ...base, deleted: true, reminderMinutesBefore: 5 })).toBeNull();
    });
});

describe('dueReminders', () => {
    const task = { ...base, reminderMinutesBefore: 10 }; // fires 09:50

    it('fires once the time has passed, within the grace window', () => {
        expect(dueReminders([task], dayjs('2026-09-29T09:49:00'), new Set())).toHaveLength(0);
        expect(dueReminders([task], dayjs('2026-09-29T09:50:30'), new Set())).toHaveLength(1);
        expect(dueReminders([task], dayjs('2026-09-29T11:00:00'), new Set())).toHaveLength(0);
    });

    it('skips reminders already fired', () => {
        const fired = new Set([reminderKey(task, reminderFireTime(task))]);
        expect(dueReminders([task], dayjs('2026-09-29T09:51:00'), fired)).toHaveLength(0);
    });

    it('fires again if the task time changes', () => {
        const fired = new Set([reminderKey(task, reminderFireTime(task))]);
        const moved = { ...task, assignedTime: '10:05:00' };
        expect(dueReminders([moved], dayjs('2026-09-29T09:55:10'), fired)).toHaveLength(1);
    });
});

describe('msUntilNextReminder', () => {
    it('returns the soonest future reminder', () => {
        const tasks = [
            { ...base, reminderMinutesBefore: 10 },
            { ...base, id: 2, uuid: 'u2', assignedTime: '09:40:00', reminderMinutesBefore: 0 },
        ];
        expect(msUntilNextReminder(tasks, dayjs('2026-09-29T09:30:00'))).toBe(10 * 60 * 1000);
        expect(msUntilNextReminder(tasks, dayjs('2026-09-29T12:00:00'))).toBeNull();
    });
});

it('labels offsets', () => {
    expect(reminderLabel(1440)).toBe('1 day before');
    expect(reminderLabel(45)).toBe('45 minutes before');
});
