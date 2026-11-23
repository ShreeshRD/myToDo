'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useUI } from '../contexts/UIContext';
import { useTasks } from '../contexts/TaskContext';
import {
	getGoal,
	updateGoal,
	completeGoal,
	reopenGoal,
	getGoalTasks,
	addRoadmapStep,
	reorderRoadmap,
	updateTaskFields,
	updateField,
	deleteTask,
} from '../service';
import { goalProgressLabel, goalProgressPercent } from './GoalsView';
import CustomCheckbox from './CustomCheckbox';
import ConfirmDialog from './ConfirmDialog';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { RiCheckboxCircleFill, RiCheckboxBlankCircleLine } from 'react-icons/ri';

const MODE_OPTIONS = [
	{ value: 'METRIC', label: 'Metric' },
	{ value: 'ROADMAP', label: 'Roadmap' },
	{ value: 'REPS', label: 'Reps' },
];

/** Undated incomplete steps are a hidden draft outside ROADMAP mode. */
function isHiddenDraftStep(goal, task) {
	if (!goal || goal.mode === 'ROADMAP') return false;
	return task.roadmapOrder != null && !task.taskDate && !task.complete;
}

function RoadmapStepRow({ step, index, isDone, onRename, onToggle, onSchedule, onDelete }) {
	const [nameDraft, setNameDraft] = useState(step.name ?? '');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setNameDraft(step.name ?? '');
	}, [step.name]);

	const commitName = async () => {
		const trimmed = nameDraft.trim();
		if (!trimmed || trimmed === step.name) {
			setNameDraft(step.name ?? '');
			return;
		}
		setSaving(true);
		try {
			const okResult = await onRename(step.id, trimmed);
			if (okResult === false) {
				setNameDraft(step.name ?? '');
			} else {
				setNameDraft(trimmed);
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<Draggable draggableId={step.id.toString()} index={index} isDragDisabled={isDone}>
			{(provided, snapshot) => (
				<li
					ref={provided.innerRef}
					{...provided.draggableProps}
					className={`roadmap-step${step.complete ? ' done' : ''}${snapshot.isDragging ? ' dragging' : ''}`}
				>
					{/* Drag handle: the dots are the affordance, so the handle
					    lives here instead of on the whole row (which would make
					    the inputs feel grabby). */}
					<span
						className={`roadmap-step-handle${isDone ? ' disabled' : ''}`}
						{...provided.dragHandleProps}
						aria-hidden={!provided.dragHandleProps}
					>
						<DragIndicatorIcon />
					</span>
					<CustomCheckbox
						checked={step.complete}
						onChange={() => onToggle(step)}
						disabled={isDone}
						icon={<RiCheckboxBlankCircleLine className="checkbox_icon_unchecked" />}
						checkedIcon={<RiCheckboxCircleFill className="checkbox_icon_checked" />}
					/>
					<input
						type="text"
						className="roadmap-step-name"
						value={nameDraft}
						onChange={(e) => setNameDraft(e.target.value)}
						onBlur={commitName}
						onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
						disabled={isDone || saving}
						maxLength={255}
					/>
					<input
						type="date"
						className="roadmap-step-date"
						value={step.taskDate ?? ''}
						onChange={(e) => onSchedule(step.id, e.target.value || null)}
						disabled={isDone}
						title={step.taskDate ? 'Scheduled — clear to return to backlog' : 'Backlog — pick a date to schedule'}
					/>
					<button
						type="button"
						className="roadmap-step-delete"
						title="Delete step"
						onClick={() => onDelete(step)}
						disabled={isDone}
					>
						×
					</button>
				</li>
			)}
		</Draggable>
	);
}

function GoalDetail({ goalId, onBack, onChanged }) {
	const { theme } = useUI();
	const { openDetail, fetchTasks } = useTasks();
	const [goal, setGoal] = useState(null);
	const [tasks, setTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [titleDraft, setTitleDraft] = useState('');
	const [metricCurrent, setMetricCurrent] = useState('');
	const [metricTarget, setMetricTarget] = useState('');
	const [metricUnit, setMetricUnit] = useState('');
	const [repsTarget, setRepsTarget] = useState('');
	const [error, setError] = useState('');
	const [newStepName, setNewStepName] = useState('');
	const [newStepDate, setNewStepDate] = useState('');
	const [stepToDelete, setStepToDelete] = useState(null);
	const [addingStep, setAddingStep] = useState(false);
	const latestRefreshId = useRef(0);

	const refresh = useCallback(async () => {
		const requestId = ++latestRefreshId.current;
		try {
			const [g, linked] = await Promise.all([getGoal(goalId), getGoalTasks(goalId)]);
			if (requestId !== latestRefreshId.current) return;
			setGoal(g);
			setTasks(Array.isArray(linked) ? linked : []);
			// Preserve dirty drafts; clean fields still track server state.
			setTitleDraft((prev) => (!prev || prev === (g.title ?? '') ? (g.title ?? '') : prev));
			setMetricCurrent((prev) => (!prev && prev !== '0' ? (g.metricCurrent != null ? String(g.metricCurrent) : '') : prev));
			setMetricTarget((prev) => (!prev ? (g.metricTarget != null ? String(g.metricTarget) : '') : prev));
			setMetricUnit((prev) => (!prev ? (g.metricUnit ?? '') : prev));
			setRepsTarget((prev) => (!prev ? (g.repsTarget != null ? String(g.repsTarget) : '') : prev));
			setError('');
		} catch (err) {
			console.error('GoalDetail load failed:', err);
			if (requestId !== latestRefreshId.current) return;
			setError('Could not load goal');
		} finally {
			if (requestId === latestRefreshId.current) setLoading(false);
		}
	}, [goalId]);

	useEffect(() => {
		// Switching goals resets drafts so stale edits cannot carry over.
		setTitleDraft('');
		setMetricCurrent('');
		setMetricTarget('');
		setMetricUnit('');
		setRepsTarget('');
		setError('');
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
		const updated = await patch({ title: trimmed });
		if (updated) setTitleDraft(updated.title ?? trimmed);
	};

	const saveMetricField = async (field, value) => {
		const updated = await patch({ [field]: value === '' ? 'null' : value });
		if (!updated) return;
		if (field === 'metricCurrent') setMetricCurrent(updated.metricCurrent != null ? String(updated.metricCurrent) : '');
		if (field === 'metricTarget') setMetricTarget(updated.metricTarget != null ? String(updated.metricTarget) : '');
		if (field === 'metricUnit') setMetricUnit(updated.metricUnit ?? '');
		if (field === 'repsTarget') setRepsTarget(updated.repsTarget != null ? String(updated.repsTarget) : '');
	};

	const handleModeSwitch = async (mode) => {
		if (!goal || goal.mode === mode) return;
		await patch({ mode });
		// Mode switch never deletes steps; reload so draft vs visible is correct.
		await refresh();
	};

	const handleComplete = async () => {
		try {
			const updated = await completeGoal(goalId);
			setGoal(updated);
			await refresh();
			onChanged?.();
			fetchTasks?.();
			setError('');
		} catch (err) {
			console.error('completeGoal failed:', err);
			setError('Could not complete goal — it was not changed');
		}
	};

	const handleReopen = async () => {
		try {
			const updated = await reopenGoal(goalId);
			setGoal(updated);
			await refresh();
			onChanged?.();
			setError('');
		} catch (err) {
			console.error('reopenGoal failed:', err);
			setError('Could not reopen goal — it was not changed');
		}
	};

	const roadmapSteps = React.useMemo(() => {
		return tasks
			.filter((t) => t.roadmapOrder != null)
			.sort((a, b) => (a.roadmapOrder ?? 0) - (b.roadmapOrder ?? 0));
	}, [tasks]);

	const handleAddStep = async () => {
		const name = newStepName.trim();
		if (!name || addingStep) return;
		setAddingStep(true);
		try {
			await addRoadmapStep(goalId, name, newStepDate || null);
			setNewStepName('');
			setNewStepDate('');
			setError('');
			await refresh();
			onChanged?.();
			fetchTasks?.();
		} catch (err) {
			console.error('addRoadmapStep failed:', err);
			setError('Could not add step');
		} finally {
			setAddingStep(false);
		}
	};

	const handleRenameStep = async (id, name) => {
		try {
			await updateTaskFields(id, { taskName: name });
			setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
			onChanged?.();
			fetchTasks?.();
			setError('');
			return true;
		} catch (err) {
			console.error('rename step failed:', err);
			setError('Could not rename step');
			await refresh();
			return false;
		}
	};

	const handleToggleStep = async (step) => {
		if (goal?.status === 'COMPLETED') return;
		try {
			const result = await updateField(step.id, 'complete', String(!step.complete));
			const warning = result?.warning || null;
			await refresh();
			// Apply mutation feedback after reconciliation so refresh cannot clear it.
			setError(warning || '');
			onChanged?.();
			fetchTasks?.();
		} catch (err) {
			console.error('toggle step failed:', err);
			setError('Could not update step');
		}
	};

	const handleScheduleStep = async (id, date) => {
		try {
			// patch keeps ID stable; "null" returns the step to backlog.
			await updateTaskFields(id, { taskDate: date ?? 'null' });
			await refresh();
			onChanged?.();
			fetchTasks?.();
		} catch (err) {
			console.error('schedule step failed:', err);
			setError('Could not schedule step');
		}
	};

	const confirmDeleteStep = async () => {
		const step = stepToDelete;
		setStepToDelete(null);
		if (!step) return;
		try {
			await deleteTask(step.id);
			await refresh();
			onChanged?.();
			fetchTasks?.();
		} catch (err) {
			console.error('delete step failed:', err);
			setError('Could not delete step');
		}
	};

	const handleStepDragEnd = async (result) => {
		const { source, destination } = result;
		if (!destination || source.droppableId !== destination.droppableId) return;
		if (source.index === destination.index) return;

		const ordered = [...roadmapSteps];
		const [moved] = ordered.splice(source.index, 1);
		ordered.splice(destination.index, 0, moved);

		// Optimistic reorder so the list feels immediate.
		const withOrders = ordered.map((t, i) => ({ ...t, roadmapOrder: i + 1 }));
		setTasks((prev) => {
			const byId = new Map(withOrders.map((t) => [t.id, t]));
			return prev.map((t) => byId.get(t.id) ?? t);
		});

		try {
			await reorderRoadmap(goalId, ordered.map((t) => t.id));
			await refresh();
			onChanged?.();
		} catch (err) {
			console.error('reorder roadmap failed:', err);
			setError('Could not reorder steps');
			await refresh();
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
	const isRoadmap = goal.mode === 'ROADMAP';

	// Steps live in the roadmap panel when ROADMAP is active; elsewhere they
	// are normal linked tasks unless they are a hidden undated draft.
	const linkedNonSteps = tasks.filter((t) => {
		if (t.roadmapOrder == null) return true;
		return !isRoadmap && !isHiddenDraftStep(goal, t);
	});
	const activeTasks = linkedNonSteps.filter((t) => !t.complete);
	const doneTasks = linkedNonSteps.filter((t) => t.complete);

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

			<div className="goal-mode-switch" role="group" aria-label="Progress mode">
				{MODE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						aria-pressed={goal.mode === opt.value}
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
					{isRoadmap ? 'All steps done — mark this goal complete?' : 'Target met — mark this goal complete?'}
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

				{isRoadmap && (
					<p className="goal-roadmap-hint">
						No date = backlog (hidden from day lists). Dated steps appear in Today/Upcoming and can be dragged between days.
					</p>
				)}
			</div>

			{error && <p className="myerror">{error}</p>}

			{isRoadmap && (
				<div className="goal-roadmap">
					<h3>Roadmap steps</h3>
					<div className="roadmap-add-form">
						<input
							type="text"
							placeholder="New step…"
							value={newStepName}
							onChange={(e) => setNewStepName(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
							disabled={isDone}
							maxLength={255}
						/>
						<input
							type="date"
							value={newStepDate}
							onChange={(e) => setNewStepDate(e.target.value)}
							disabled={isDone}
							title="Optional date — leave empty for backlog"
						/>
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleAddStep}
							disabled={isDone || addingStep || !newStepName.trim()}
						>
							{addingStep ? 'Adding…' : 'Add step'}
						</button>
					</div>

					{roadmapSteps.length === 0 ? (
						<p className="goals-empty">No steps yet. Add the first one above.</p>
					) : (
						<DragDropContext onDragEnd={handleStepDragEnd}>
							<Droppable droppableId="roadmap-steps">
								{(provided) => (
									<ul
										className="roadmap-list"
										ref={provided.innerRef}
										{...provided.droppableProps}
									>
										{roadmapSteps.map((step, index) => (
											<RoadmapStepRow
												key={step.id}
												step={step}
												index={index}
												isDone={isDone}
												onRename={handleRenameStep}
												onToggle={handleToggleStep}
												onSchedule={handleScheduleStep}
												onDelete={setStepToDelete}
											/>
										))}
										{provided.placeholder}
									</ul>
								)}
							</Droppable>
						</DragDropContext>
					)}
				</div>
			)}

			<div className="goal-tasks">
				<h3>{isRoadmap ? 'Other linked tasks' : 'Linked tasks'}</h3>
				{linkedNonSteps.length === 0 ? (
					<p className="goals-empty">
						{isRoadmap
							? 'No other tasks linked to this goal.'
							: 'No tasks yet — pick this goal in the task popup to link one.'}
					</p>
				) : (
					<>
						<ul className="goal-task-list">
							{activeTasks.map((t) => (
								<li key={t.id}>
									<button type="button" className="goal-task-open" onClick={() => openDetail(t)}>
										<span className="goal-task-name">{t.name}</span>
										<span className="goal-task-date">{t.taskDate ?? 'Backlog'}</span>
									</button>
								</li>
							))}
						</ul>
						{doneTasks.length > 0 && (
							<>
								<h4 className="goal-tasks-subhead">Completed</h4>
								<ul className="goal-task-list done">
									{doneTasks.map((t) => (
										<li key={t.id}>
											<button type="button" className="goal-task-open" onClick={() => openDetail(t)}>
												<span className="goal-task-name">{t.name}</span>
												<span className="goal-task-date">{t.taskDate ?? '—'}</span>
											</button>
										</li>
									))}
								</ul>
							</>
						)}
					</>
				)}
			</div>

			<ConfirmDialog
				open={stepToDelete != null}
				title={stepToDelete ? `Delete "${stepToDelete.name}"?` : ''}
				message="This removes the step from the roadmap. Dated steps also leave the day lists."
				confirmLabel="Delete"
				onConfirm={confirmDeleteStep}
				onCancel={() => setStepToDelete(null)}
			/>
		</div>
	);
}

export default GoalDetail;
