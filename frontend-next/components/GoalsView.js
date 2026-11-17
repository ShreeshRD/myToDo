'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../contexts/UIContext';
import { getGoals, createGoal, deleteGoal } from '../service';
import GoalDetail from './GoalDetail';
import '../styles/GoalsView.scss';

/** Compact progress label shared by cards, strip, and detail header. */
export function goalProgressLabel(goal) {
	if (!goal) return '';
	if (goal.mode === 'METRIC') {
		const current = goal.metricCurrent ?? 0;
		if (goal.metricTarget != null) {
			const unit = goal.metricUnit ? ` ${goal.metricUnit}` : '';
			return `${current} / ${goal.metricTarget}${unit}`;
		}
		const unit = goal.metricUnit ? ` ${goal.metricUnit}` : '';
		return `${current}${unit}`;
	}
	if (goal.mode === 'REPS') {
		if (goal.repsTarget != null) {
			return `${goal.repsCount} / ${goal.repsTarget} reps`;
		}
		return `${goal.repsCount} rep${goal.repsCount === 1 ? '' : 's'}`;
	}
	// ROADMAP progress arrives with Step 8; fall back to linked-task ratio.
	if (goal.linkedTotal > 0) {
		return `${goal.linkedCompleted} / ${goal.linkedTotal}`;
	}
	return 'Roadmap';
}

/** Thin progress bar width 0–100; null when there is no target. */
export function goalProgressPercent(goal) {
	if (!goal) return null;
	if (goal.mode === 'METRIC') {
		if (goal.metricTarget == null || goal.metricTarget <= 0) return null;
		return Math.min(100, Math.round(((goal.metricCurrent ?? 0) / goal.metricTarget) * 100));
	}
	if (goal.mode === 'REPS') {
		if (goal.repsTarget == null || goal.repsTarget <= 0) return null;
		return Math.min(100, Math.round((goal.repsCount / goal.repsTarget) * 100));
	}
	if (goal.linkedTotal > 0) {
		return Math.min(100, Math.round((goal.linkedCompleted / goal.linkedTotal) * 100));
	}
	return null;
}

function GoalCard({ goal, onOpen, onDelete }) {
	const percent = goalProgressPercent(goal);
	const isDone = goal.status === 'COMPLETED';
	return (
		<div
			className={`goal-card${isDone ? ' done' : ''}`}
			onClick={() => onOpen(goal.id)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => { if (e.key === 'Enter') onOpen(goal.id); }}
		>
			<div className="goal-card-header">
				<span className="goal-card-title">{goal.title}</span>
				{isDone && <span className="goal-card-badge">Done</span>}
			</div>
			<div className="goal-card-meta">
				<span className="goal-card-progress">{goalProgressLabel(goal)}</span>
				<span className="goal-card-tasks">
					{goal.linkedTotal} task{goal.linkedTotal === 1 ? '' : 's'}
				</span>
			</div>
			{percent != null && (
				<div className="goal-progress-track">
					<div className="goal-progress-fill" style={{ width: `${percent}%` }} />
				</div>
			)}
			<button
				className="goal-card-delete"
				title="Delete goal"
				onClick={(e) => {
					e.stopPropagation();
					onDelete(goal);
				}}
			>
				×
			</button>
		</div>
	);
}

function GoalsView() {
	const { theme, selectedGoalId, openGoal, closeGoal } = useUI();
	const [goals, setGoals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showCreate, setShowCreate] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [error, setError] = useState('');

	const refresh = useCallback(async () => {
		try {
			const rows = await getGoals();
			setGoals(Array.isArray(rows) ? rows : []);
		} catch (err) {
			console.error('getGoals failed:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(refresh, 0);
		return () => clearTimeout(timer);
	}, [refresh]);

	const handleCreate = async () => {
		const title = newTitle.trim();
		if (!title) return;
		try {
			const created = await createGoal(title);
			setNewTitle('');
			setShowCreate(false);
			setError('');
			await refresh();
			if (created?.id != null) {
				openGoal(created.id);
			}
		} catch (err) {
			console.error('createGoal failed:', err);
			setError('Could not create goal');
		}
	};

	const handleDelete = async (goal) => {
		const ok = window.confirm(
			`Delete "${goal.title}"? Linked tasks keep their long-term flag but lose the goal link.`
		);
		if (!ok) return;
		try {
			await deleteGoal(goal.id);
			if (selectedGoalId === goal.id) {
				closeGoal();
			}
			await refresh();
		} catch (err) {
			console.error('deleteGoal failed:', err);
		}
	};

	// Detail mode: a goal is open.
	if (selectedGoalId != null) {
		return (
			<div className={`goals-view ${theme}`}>
				<GoalDetail
					goalId={selectedGoalId}
					onBack={closeGoal}
					onChanged={refresh}
				/>
			</div>
		);
	}

	const active = goals.filter((g) => g.status === 'ACTIVE');
	const archived = goals.filter((g) => g.status !== 'ACTIVE');

	return (
		<div className={`goals-view ${theme}`}>
			<div className="goals-header">
				<h2>Goals</h2>
				<button
					className="btn btn-primary goals-add-btn"
					onClick={() => setShowCreate((v) => !v)}
				>
					{showCreate ? 'Cancel' : '+ New Goal'}
				</button>
			</div>

			{showCreate && (
				<div className="goals-create-form">
					<input
						type="text"
						placeholder="Goal title..."
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleCreate();
							if (e.key === 'Escape') {
								setShowCreate(false);
								setNewTitle('');
							}
						}}
						maxLength={255}
						autoFocus
					/>
					<button className="btn btn-primary" onClick={handleCreate}>Create</button>
					{error && <p className="myerror">{error}</p>}
				</div>
			)}

			{loading ? (
				<p className="goals-empty">Loading…</p>
			) : active.length === 0 && archived.length === 0 ? (
				<p className="goals-empty">No goals yet. Create one to track growth work.</p>
			) : (
				<>
					<div className="goals-grid">
						{active.map((goal) => (
							<GoalCard key={goal.id} goal={goal} onOpen={openGoal} onDelete={handleDelete} />
						))}
					</div>
					{archived.length > 0 && (
						<>
							<h3 className="goals-section-title">Completed</h3>
							<div className="goals-grid archived">
								{archived.map((goal) => (
									<GoalCard key={goal.id} goal={goal} onOpen={openGoal} onDelete={handleDelete} />
								))}
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
}

export default GoalsView;
