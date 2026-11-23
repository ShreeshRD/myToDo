'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../contexts/UIContext';
import { getGoals, createGoal, deleteGoal } from '../service';
import GoalDetail from './GoalDetail';
import ConfirmDialog from './ConfirmDialog';
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
	// ROADMAP: completed steps / total steps
	if (goal.roadmapTotal > 0) {
		return `${goal.roadmapCompleted} / ${goal.roadmapTotal} steps`;
	}
	return 'Roadmap';
}

/** Thin progress bar width 0–100; null when there is no target. */
export function goalProgressPercent(goal) {
	if (!goal) return null;
	if (goal.mode === 'METRIC') {
		if (goal.metricTarget == null || goal.metricTarget <= 0) return null;
		const pct = Math.round(((goal.metricCurrent ?? 0) / goal.metricTarget) * 100);
		return Math.min(100, Math.max(0, pct));
	}
	if (goal.mode === 'REPS') {
		if (goal.repsTarget == null || goal.repsTarget <= 0) return null;
		const pct = Math.round((goal.repsCount / goal.repsTarget) * 100);
		return Math.min(100, Math.max(0, pct));
	}
	if (goal.roadmapTotal > 0) {
		const pct = Math.round((goal.roadmapCompleted / goal.roadmapTotal) * 100);
		return Math.min(100, Math.max(0, pct));
	}
	return null;
}

function GoalCard({ goal, onOpen, onDelete }) {
	const percent = goalProgressPercent(goal);
	const isDone = goal.status === 'COMPLETED';
	return (
		<div className={`goal-card${isDone ? ' done' : ''}`}>
			<div className="goal-card-header">
				<button
					type="button"
					className="goal-card-open"
					onClick={() => onOpen(goal.id)}
				>
					<span className="goal-card-title">{goal.title}</span>
				</button>
				{isDone && <span className="goal-card-badge">Done</span>}
			</div>
			<button
				type="button"
				className="goal-card-body"
				onClick={() => onOpen(goal.id)}
			>
				<span className="goal-card-meta">
					<span className="goal-card-progress">{goalProgressLabel(goal)}</span>
					<span className="goal-card-tasks">
						{goal.linkedTotal} task{goal.linkedTotal === 1 ? '' : 's'}
					</span>
				</span>
				{percent != null && (
					<span className="goal-progress-track">
						<span className="goal-progress-fill" style={{ width: `${percent}%` }} />
					</span>
				)}
			</button>
			<button
				type="button"
				className="goal-card-delete"
				title="Delete goal"
				aria-label={`Delete goal ${goal.title}`}
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
	const [loadFailed, setLoadFailed] = useState(false);
	const [showCreate, setShowCreate] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [error, setError] = useState('');
	const [listError, setListError] = useState('');
	const [creating, setCreating] = useState(false);
	const [goalToDelete, setGoalToDelete] = useState(null);

	const refresh = useCallback(async () => {
		try {
			const rows = await getGoals();
			// Skills live only in the Skills view.
			setGoals((Array.isArray(rows) ? rows : []).filter((g) => g.kind !== 'SKILL'));
			setLoadFailed(false);
			setListError('');
		} catch (err) {
			console.error('getGoals failed:', err);
			setLoadFailed(true);
			setListError('Could not load goals');
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
		if (!title || creating) return;
		setCreating(true);
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
		} finally {
			setCreating(false);
		}
	};

	const confirmDeleteGoal = async () => {
		const goal = goalToDelete;
		setGoalToDelete(null);
		if (!goal) return;
		try {
			await deleteGoal(goal.id);
			if (selectedGoalId === goal.id) {
				closeGoal();
			}
			await refresh();
		} catch (err) {
			console.error('deleteGoal failed:', err);
			setListError(`Could not delete "${goal.title}"`);
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
					<button
						className="btn btn-primary"
						onClick={handleCreate}
						disabled={creating || !newTitle.trim()}
					>
						{creating ? 'Creating…' : 'Create'}
					</button>
					{error && <p className="myerror">{error}</p>}
				</div>
			)}

			{listError && <p className="myerror goals-list-error">{listError}</p>}

			{loading ? (
				<p className="goals-empty">Loading…</p>
			) : loadFailed ? (
				<div className="goals-empty">
					<p>{listError || 'Could not load goals'}</p>
					<button className="btn btn-secondary" onClick={() => { setLoading(true); refresh(); }}>
						Retry
					</button>
				</div>
			) : active.length === 0 && archived.length === 0 ? (
				<p className="goals-empty">No goals yet. Create one to track growth work.</p>
			) : (
				<>
					<div className="goals-grid">
						{active.map((goal) => (
							<GoalCard key={goal.id} goal={goal} onOpen={openGoal} onDelete={setGoalToDelete} />
						))}
					</div>
					{archived.length > 0 && (
						<>
							<h3 className="goals-section-title">Completed</h3>
							<div className="goals-grid archived">
								{archived.map((goal) => (
									<GoalCard key={goal.id} goal={goal} onOpen={openGoal} onDelete={setGoalToDelete} />
								))}
							</div>
						</>
					)}
				</>
			)}

			<ConfirmDialog
				open={goalToDelete != null}
				title={goalToDelete ? `Delete "${goalToDelete.title}"?` : ''}
				message="Linked tasks keep their long-term flag but lose the goal link."
				confirmLabel="Delete"
				onConfirm={confirmDeleteGoal}
				onCancel={() => setGoalToDelete(null)}
			/>
		</div>
	);
}

export default GoalsView;
