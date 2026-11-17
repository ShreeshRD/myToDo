'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../contexts/UIContext';
import { useTasks } from '../contexts/TaskContext';
import {
	getGoal,
	updateGoal,
	completeGoal,
	reopenGoal,
	getGoalTasks,
} from '../service';
import { goalProgressLabel, goalProgressPercent } from './GoalsView';

const MODE_OPTIONS = [
	{ value: 'METRIC', label: 'Metric' },
	{ value: 'REPS', label: 'Reps' },
];

function GoalDetail({ goalId, onBack, onChanged }) {
	const { theme } = useUI();
	const { openDetail } = useTasks();
	const [goal, setGoal] = useState(null);
	const [tasks, setTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [titleDraft, setTitleDraft] = useState('');
	const [metricCurrent, setMetricCurrent] = useState('');
	const [metricTarget, setMetricTarget] = useState('');
	const [metricUnit, setMetricUnit] = useState('');
	const [repsTarget, setRepsTarget] = useState('');
	const [error, setError] = useState('');

	const refresh = useCallback(async () => {
		try {
			const [g, linked] = await Promise.all([getGoal(goalId), getGoalTasks(goalId)]);
			setGoal(g);
			setTasks(Array.isArray(linked) ? linked : []);
			setTitleDraft(g.title ?? '');
			setMetricCurrent(g.metricCurrent != null ? String(g.metricCurrent) : '');
			setMetricTarget(g.metricTarget != null ? String(g.metricTarget) : '');
			setMetricUnit(g.metricUnit ?? '');
			setRepsTarget(g.repsTarget != null ? String(g.repsTarget) : '');
			setError('');
		} catch (err) {
			console.error('GoalDetail load failed:', err);
			setError('Could not load goal');
		} finally {
			setLoading(false);
		}
	}, [goalId]);

	useEffect(() => {
		const timer = setTimeout(refresh, 0);
		return () => clearTimeout(timer);
	}, [refresh]);

	const patch = async (fields) => {
		try {
			const updated = await updateGoal(goalId, fields);
			setGoal(updated);
			setError('');
			onChanged?.();
			return updated;
		} catch (err) {
			console.error('updateGoal failed:', err);
			setError('Save failed');
			return null;
		}
	};

	const saveTitle = async () => {
		const trimmed = titleDraft.trim();
		if (!goal || trimmed === goal.title) return;
		if (!trimmed) {
			setTitleDraft(goal.title);
			return;
		}
		await patch({ title: trimmed });
	};

	const saveMetricField = async (field, value) => {
		await patch({ [field]: value === '' ? 'null' : value });
	};

	const handleModeSwitch = async (mode) => {
		if (!goal || goal.mode === mode) return;
		await patch({ mode });
	};

	const handleComplete = async () => {
		try {
			const updated = await completeGoal(goalId);
			setGoal(updated);
			onChanged?.();
		} catch (err) {
			console.error('completeGoal failed:', err);
		}
	};

	const handleReopen = async () => {
		try {
			const updated = await reopenGoal(goalId);
			setGoal(updated);
			onChanged?.();
		} catch (err) {
			console.error('reopenGoal failed:', err);
		}
	};

	if (loading) {
		return <div className="goal-detail"><p className="goals-empty">Loading…</p></div>;
	}
	if (!goal) {
		return (
			<div className="goal-detail">
				<button className="goal-back" onClick={onBack}>← Goals</button>
				<p className="goals-empty">{error || 'Goal not found'}</p>
			</div>
		);
	}

	const percent = goalProgressPercent(goal);
	const isDone = goal.status === 'COMPLETED';
	const activeTasks = tasks.filter((t) => !t.complete);
	const doneTasks = tasks.filter((t) => t.complete);

	return (
		<div className="goal-detail">
			<div className="goal-detail-top">
				<button className="goal-back" onClick={onBack}>← Goals</button>
				{isDone ? (
					<button className="btn btn-secondary" onClick={handleReopen}>Reopen</button>
				) : (
					<button className="btn btn-primary" onClick={handleComplete}>Mark complete</button>
				)}
			</div>

			<input
				type="text"
				className="goal-title-input"
				value={titleDraft}
				onChange={(e) => setTitleDraft(e.target.value)}
				onBlur={saveTitle}
				onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
				maxLength={255}
			/>

			<div className="goal-mode-switch" role="tablist" aria-label="Progress mode">
				{MODE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						role="tab"
						aria-selected={goal.mode === opt.value}
						className={`goal-mode-btn${goal.mode === opt.value ? ' active' : ''}`}
						onClick={() => handleModeSwitch(opt.value)}
						disabled={isDone}
					>
						{opt.label}
					</button>
				))}
			</div>

			{goal.targetMet && !isDone && (
				<div className="goal-nudge">
					Target met — mark this goal complete?
					<button className="btn btn-primary" onClick={handleComplete}>Complete</button>
				</div>
			)}

			<div className="goal-progress-panel">
				<div className="goal-progress-label">{goalProgressLabel(goal)}</div>
				{percent != null && (
					<div className="goal-progress-track large">
						<div className="goal-progress-fill" style={{ width: `${percent}%` }} />
					</div>
				)}

				{goal.mode === 'METRIC' && (
					<div className="goal-metric-editor">
						<label>
							Current
							<input
								type="number"
								step="any"
								value={metricCurrent}
								onChange={(e) => setMetricCurrent(e.target.value)}
								onBlur={() => saveMetricField('metricCurrent', metricCurrent)}
								disabled={isDone}
							/>
						</label>
						<span className="goal-metric-sep">/</span>
						<label>
							Target
							<input
								type="number"
								step="any"
								value={metricTarget}
								onChange={(e) => setMetricTarget(e.target.value)}
								onBlur={() => saveMetricField('metricTarget', metricTarget)}
								disabled={isDone}
							/>
						</label>
						<label>
							Unit
							<input
								type="text"
								value={metricUnit}
								placeholder="km, pages…"
								onChange={(e) => setMetricUnit(e.target.value)}
								onBlur={() => saveMetricField('metricUnit', metricUnit)}
								disabled={isDone}
							/>
						</label>
					</div>
				)}

				{goal.mode === 'REPS' && (
					<div className="goal-reps-editor">
						<div className="goal-reps-count">
							<span className="goal-reps-number">{goal.repsCount}</span>
							<span className="goal-reps-caption">
								completed task{goal.repsCount === 1 ? '' : 's'}
								{goal.repsTarget != null ? ` of ${goal.repsTarget}` : ''}
							</span>
						</div>
						<label>
							Target (optional)
							<input
								type="number"
								min="0"
								value={repsTarget}
								placeholder="—"
								onChange={(e) => setRepsTarget(e.target.value)}
								onBlur={() => saveMetricField('repsTarget', repsTarget)}
								disabled={isDone}
							/>
						</label>
					</div>
				)}
			</div>

			{error && <p className="myerror">{error}</p>}

			<div className="goal-tasks">
				<h3>Linked tasks</h3>
				{tasks.length === 0 ? (
					<p className="goals-empty">
						No tasks yet — pick this goal in the task popup to link one.
					</p>
				) : (
					<>
						<ul className="goal-task-list">
							{activeTasks.map((t) => (
								<li key={t.id} onClick={() => openDetail(t)}>
									<span className="goal-task-name">{t.name}</span>
									<span className="goal-task-date">{t.taskDate}</span>
								</li>
							))}
						</ul>
						{doneTasks.length > 0 && (
							<>
								<h4 className="goal-tasks-subhead">Completed</h4>
								<ul className="goal-task-list done">
									{doneTasks.map((t) => (
										<li key={t.id} onClick={() => openDetail(t)}>
											<span className="goal-task-name">{t.name}</span>
											<span className="goal-task-date">{t.taskDate}</span>
										</li>
									))}
								</ul>
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}

export default GoalDetail;
