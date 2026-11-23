'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import {
	getGoal,
	updateGoal,
	completeGoal,
	reopenGoal,
	getSkillOccurrences,
	logSkillOccurrence,
	updateSkillOccurrence,
	deleteSkillOccurrence,
} from '../service';
import Heatmap from './Heatmap';
import ConfirmDialog from './ConfirmDialog';

const RATING_OPTIONS = [1, 2, 3, 4, 5];

function OccurrenceRow({ occurrence, onSave, onDelete, disabled }) {
	const [date, setDate] = useState(occurrence.date ?? '');
	const [duration, setDuration] = useState(occurrence.durationMinutes != null ? String(occurrence.durationMinutes) : '');
	const [rating, setRating] = useState(occurrence.rating != null ? String(occurrence.rating) : '');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setDate(occurrence.date ?? '');
		setDuration(occurrence.durationMinutes != null ? String(occurrence.durationMinutes) : '');
		setRating(occurrence.rating != null ? String(occurrence.rating) : '');
	}, [occurrence.date, occurrence.durationMinutes, occurrence.rating]);

	const dirty = date !== (occurrence.date ?? '')
		|| duration !== (occurrence.durationMinutes != null ? String(occurrence.durationMinutes) : '')
		|| rating !== (occurrence.rating != null ? String(occurrence.rating) : '');

	const commit = async () => {
		if (!dirty || saving || disabled) return;
		setSaving(true);
		try {
			await onSave(occurrence.id, { date, durationMinutes: duration, rating });
		} finally {
			setSaving(false);
		}
	};

	return (
		<li className="occurrence-row">
			<input
				type="date"
				className="occurrence-date"
				aria-label="Occurrence date"
				value={date}
				onChange={(e) => setDate(e.target.value)}
				onBlur={commit}
				disabled={disabled || saving}
			/>
			<label className="occurrence-field">
				<span>min</span>
				<input
					type="number"
					min="1"
					step="1"
					className="occurrence-duration"
					value={duration}
					onChange={(e) => setDuration(e.target.value)}
					onBlur={commit}
					disabled={disabled || saving}
				/>
			</label>
			<label className="occurrence-field">
				<span>rating</span>
				<select
					className="occurrence-rating"
					value={rating}
					onChange={(e) => {
						setRating(e.target.value);
					}}
					onBlur={commit}
					disabled={disabled || saving}
				>
					<option value="" disabled>—</option>
					{RATING_OPTIONS.map((n) => (
						<option key={n} value={String(n)}>{n}</option>
					))}
				</select>
			</label>
			<button
				type="button"
				className="occurrence-delete"
				title="Delete occurrence"
				onClick={() => onDelete(occurrence)}
				disabled={disabled || saving}
			>
				×
			</button>
		</li>
	);
}

function SkillDetail({ skillId, onBack, onChanged }) {
	const [skill, setSkill] = useState(null);
	const [occurrences, setOccurrences] = useState([]);
	const [loading, setLoading] = useState(true);
	const [titleDraft, setTitleDraft] = useState('');
	const [error, setError] = useState('');
	const [formDate, setFormDate] = useState(() => dayjs().format('YYYY-MM-DD'));
	const [formDuration, setFormDuration] = useState('');
	const [formRating, setFormRating] = useState('');
	const [formError, setFormError] = useState('');
	const [logging, setLogging] = useState(false);
	const [toDelete, setToDelete] = useState(null);
	const latestRefreshId = useRef(0);
	// Last title synchronized from the server — draft equal to this is clean.
	const syncedTitleRef = useRef('');

	const refresh = useCallback(async () => {
		const requestId = ++latestRefreshId.current;
		try {
			const [s, rows] = await Promise.all([getGoal(skillId), getSkillOccurrences(skillId)]);
			if (requestId !== latestRefreshId.current) return;
			setSkill(s);
			setOccurrences(Array.isArray(rows) ? rows : []);
			const serverTitle = s.title ?? '';
			// Replace only a clean draft; keep actual unsaved edits.
			setTitleDraft((prev) => (prev === syncedTitleRef.current ? serverTitle : prev));
			syncedTitleRef.current = serverTitle;
			setError('');
		} catch (err) {
			console.error('SkillDetail load failed:', err);
			if (requestId !== latestRefreshId.current) return;
			setError('Could not load skill');
		} finally {
			if (requestId === latestRefreshId.current) setLoading(false);
		}
	}, [skillId]);

	useEffect(() => {
		syncedTitleRef.current = '';
		setTitleDraft('');
		const timer = setTimeout(refresh, 0);
		return () => clearTimeout(timer);
	}, [refresh]);

	const saveTitle = async () => {
		const trimmed = titleDraft.trim();
		if (!skill || trimmed === skill.title) return;
		if (!trimmed) {
			setTitleDraft(skill.title);
			return;
		}
		const submitted = trimmed;
		try {
			const updated = await updateGoal(skillId, { title: submitted });
			setSkill(updated);
			// Apply response only if the draft still matches what we submitted.
			setTitleDraft((prev) => (prev.trim() === submitted ? (updated.title ?? submitted) : prev));
			syncedTitleRef.current = updated.title ?? submitted;
			setError('');
			onChanged?.();
		} catch (err) {
			console.error('updateGoal failed:', err);
			setError('Save failed');
		}
	};

	const handleLog = async () => {
		const duration = formDuration.trim();
		const rating = formRating.trim();
		if (!duration || !rating) {
			setFormError('Duration and rating are both required.');
			return;
		}
		setLogging(true);
		try {
			await logSkillOccurrence(skillId, {
				date: formDate || dayjs().format('YYYY-MM-DD'),
				durationMinutes: duration,
				rating,
			});
			setFormDuration('');
			setFormRating('');
			setFormDate(dayjs().format('YYYY-MM-DD'));
			setFormError('');
			await refresh();
			onChanged?.();
		} catch (err) {
			console.error('logSkillOccurrence failed:', err);
			const message = err?.response?.data?.message
				|| err?.response?.data?.error
				|| 'Could not log occurrence';
			setFormError(typeof message === 'string' ? message : 'Could not log occurrence');
		} finally {
			setLogging(false);
		}
	};

	const handleSaveOccurrence = async (id, fields) => {
		try {
			await updateSkillOccurrence(id, fields);
			await refresh();
			// Set mutation error after refresh so a successful reload cannot clear it.
			setError('');
			onChanged?.();
		} catch (err) {
			console.error('updateSkillOccurrence failed:', err);
			await refresh();
			setError('Could not update occurrence');
		}
	};

	const confirmDeleteOccurrence = async () => {
		const row = toDelete;
		setToDelete(null);
		if (!row) return;
		try {
			await deleteSkillOccurrence(row.id);
			await refresh();
			onChanged?.();
		} catch (err) {
			console.error('deleteSkillOccurrence failed:', err);
			setError('Could not delete occurrence');
		}
	};

	const handleComplete = async () => {
		try {
			const updated = await completeGoal(skillId);
			setSkill(updated);
			await refresh();
			onChanged?.();
		} catch (err) {
			console.error('completeGoal failed:', err);
		}
	};

	const handleReopen = async () => {
		try {
			const updated = await reopenGoal(skillId);
			setSkill(updated);
			await refresh();
			onChanged?.();
		} catch (err) {
			console.error('reopenGoal failed:', err);
		}
	};

	// Heatmap input: one entry per occurrence on its date.
	const tasksByDate = useMemo(() => {
		const map = {};
		occurrences.forEach((o) => {
			if (!o.date) return;
			if (!map[o.date]) map[o.date] = [];
			map[o.date].push(o);
		});
		return map;
	}, [occurrences]);

	const totalMinutes = useMemo(
		() => occurrences.reduce((sum, o) => sum + (o.durationMinutes || 0), 0),
		[occurrences]
	);

	if (loading) {
		return <div className="skill-detail"><p className="skills-empty">Loading…</p></div>;
	}
	if (!skill) {
		return (
			<div className="skill-detail">
				<button className="skill-back" onClick={onBack}>← Skills</button>
				<p className="skills-empty">{error || 'Skill not found'}</p>
			</div>
		);
	}

	const isDone = skill.status === 'COMPLETED';
	const count = occurrences.length;

	return (
		<div className="skill-detail">
			<div className="skill-detail-top">
				<button className="skill-back" onClick={onBack}>← Skills</button>
				{isDone ? (
					<button className="btn btn-secondary" onClick={handleReopen}>Reopen</button>
				) : (
					<button className="btn btn-primary" onClick={handleComplete}>Mark complete</button>
				)}
			</div>

			<label htmlFor="skill-title-input" className="skill-title-label">Skill name</label>
			<input
				id="skill-title-input"
				type="text"
				className="skill-title-input"
				aria-label="Skill name"
				value={titleDraft}
				onChange={(e) => setTitleDraft(e.target.value)}
				onBlur={saveTitle}
				onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
				maxLength={255}
			/>

			<div className="skill-stats">
				<div className="skill-stat">
					<span className="skill-stat-number">{count}</span>
					<span className="skill-stat-caption">all-time occurrence{count === 1 ? '' : 's'}</span>
				</div>
				<div className="skill-stat">
					<span className="skill-stat-number">{totalMinutes}</span>
					<span className="skill-stat-caption">total minutes</span>
				</div>
			</div>

			<div className="skill-heatmap-panel">
				<h3>This month</h3>
				<Heatmap tasksByDate={tasksByDate} />
			</div>

			<div className="skill-log-panel">
				<h3>+1 occurrence</h3>
				<div className="skill-log-form">
					<label>
						Date
						<input
							type="date"
							value={formDate}
							onChange={(e) => setFormDate(e.target.value)}
							disabled={logging}
						/>
					</label>
					<label>
						Duration (min)
						<input
							type="number"
							min="1"
							step="1"
							placeholder="e.g. 25"
							value={formDuration}
							onChange={(e) => setFormDuration(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') handleLog(); }}
							disabled={logging}
						/>
					</label>
					<label>
						Rating (1–5)
						<select
							value={formRating}
							onChange={(e) => setFormRating(e.target.value)}
							disabled={logging}
						>
							<option value="" disabled>—</option>
							{RATING_OPTIONS.map((n) => (
								<option key={n} value={String(n)}>{n}</option>
							))}
						</select>
					</label>
					<button
						className="btn btn-primary"
						onClick={handleLog}
						disabled={logging || !formDuration.trim() || !formRating.trim()}
					>
						{logging ? 'Logging…' : 'Log'}
					</button>
				</div>
				{formError && <p className="myerror">{formError}</p>}
			</div>

			{error && <p className="myerror">{error}</p>}

			<div className="skill-occurrences">
				<h3>Occurrences</h3>
				{count === 0 ? (
					<p className="skills-empty">No occurrences yet. Log your first practice session above.</p>
				) : (
					<ul className="occurrence-list">
						{occurrences.map((o) => (
							<OccurrenceRow
								key={o.id}
								occurrence={o}
								onSave={handleSaveOccurrence}
								onDelete={setToDelete}
								disabled={isDone}
							/>
						))}
					</ul>
				)}
			</div>

			<ConfirmDialog
				open={toDelete != null}
				title="Delete this occurrence?"
				message={toDelete
					? `${toDelete.date} · ${toDelete.durationMinutes} min · rating ${toDelete.rating}`
					: ''}
				confirmLabel="Delete"
				onConfirm={confirmDeleteOccurrence}
				onCancel={() => setToDelete(null)}
			/>
		</div>
	);
}

export default SkillDetail;
