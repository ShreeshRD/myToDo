'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../contexts/UIContext';
import { getGoals, createGoal, deleteGoal } from '../service';
import SkillDetail from './SkillDetail';
import ConfirmDialog from './ConfirmDialog';
import '../styles/SkillsView.scss';

function SkillCard({ skill, onOpen, onDelete }) {
	const count = skill.occurrenceCount ?? 0;
	const isDone = skill.status === 'COMPLETED';
	return (
		<div
			className={`skill-card${isDone ? ' done' : ''}`}
			onClick={() => onOpen(skill.id)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => { if (e.key === 'Enter') onOpen(skill.id); }}
		>
			<div className="skill-card-header">
				<span className="skill-card-title">{skill.title}</span>
				{isDone && <span className="skill-card-badge">Done</span>}
			</div>
			<div className="skill-card-meta">
				<span className="skill-card-count">
					{count} occurrence{count === 1 ? '' : 's'}
				</span>
			</div>
			<button
				className="skill-card-delete"
				title="Delete skill"
				onClick={(e) => {
					e.stopPropagation();
					onDelete(skill);
				}}
			>
				×
			</button>
		</div>
	);
}

function SkillsView() {
	const { theme, selectedSkillId, openSkill, closeSkill } = useUI();
	const [skills, setSkills] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showCreate, setShowCreate] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [error, setError] = useState('');
	const [skillToDelete, setSkillToDelete] = useState(null);

	const refresh = useCallback(async () => {
		try {
			const rows = await getGoals();
			setSkills((Array.isArray(rows) ? rows : []).filter((g) => g.kind === 'SKILL'));
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
			const created = await createGoal(title, 'SKILL');
			setNewTitle('');
			setShowCreate(false);
			setError('');
			await refresh();
			if (created?.id != null) {
				openSkill(created.id);
			}
		} catch (err) {
			console.error('createGoal(skill) failed:', err);
			setError('Could not create skill');
		}
	};

	const confirmDeleteSkill = async () => {
		const skill = skillToDelete;
		setSkillToDelete(null);
		if (!skill) return;
		try {
			await deleteGoal(skill.id);
			if (selectedSkillId === skill.id) {
				closeSkill();
			}
			await refresh();
		} catch (err) {
			console.error('deleteGoal(skill) failed:', err);
		}
	};

	if (selectedSkillId != null) {
		return (
			<div className={`skills-view ${theme}`}>
				<SkillDetail
					skillId={selectedSkillId}
					onBack={closeSkill}
					onChanged={refresh}
				/>
			</div>
		);
	}

	const active = skills.filter((s) => s.status === 'ACTIVE');
	const archived = skills.filter((s) => s.status !== 'ACTIVE');

	return (
		<div className={`skills-view ${theme}`}>
			<div className="skills-header">
				<h2>Skills</h2>
				<button
					className="btn btn-primary skills-add-btn"
					onClick={() => setShowCreate((v) => !v)}
				>
					{showCreate ? 'Cancel' : '+ New Skill'}
				</button>
			</div>

			{showCreate && (
				<div className="skills-create-form">
					<input
						type="text"
						placeholder="Skill name..."
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
				<p className="skills-empty">Loading…</p>
			) : active.length === 0 && archived.length === 0 ? (
				<p className="skills-empty">No skills yet. Create one to log practice occurrences.</p>
			) : (
				<>
					<div className="skills-grid">
						{active.map((skill) => (
							<SkillCard key={skill.id} skill={skill} onOpen={openSkill} onDelete={setSkillToDelete} />
						))}
					</div>
					{archived.length > 0 && (
						<>
							<h3 className="skills-section-title">Completed</h3>
							<div className="skills-grid archived">
								{archived.map((skill) => (
									<SkillCard key={skill.id} skill={skill} onOpen={openSkill} onDelete={setSkillToDelete} />
								))}
							</div>
						</>
					)}
				</>
			)}

			<ConfirmDialog
				open={skillToDelete != null}
				title={skillToDelete ? `Delete "${skillToDelete.title}"?` : ''}
				message="This also removes every logged occurrence for this skill."
				confirmLabel="Delete"
				onConfirm={confirmDeleteSkill}
				onCancel={() => setSkillToDelete(null)}
			/>
		</div>
	);
}

export default SkillsView;
