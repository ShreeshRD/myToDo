'use client'

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/UIContext';
import '../styles/ConfirmDialog.css';

/**
 * In-app confirmation dialog (same family as PushTaskPopup): backdrop click
 * and Escape cancel; Enter is intentionally not bound so a stray keypress
 * can never confirm a destructive action.
 */
function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
	const { theme } = useUI();

	useEffect(() => {
		if (!open) return undefined;
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onCancel();
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [open, onCancel]);

	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<div className={`confirm-backdrop ${theme}`} onMouseDown={onCancel}>
			<div
				className={`confirm-card ${theme}`}
				role="alertdialog"
				aria-modal="true"
				aria-label={title}
				onMouseDown={(event) => event.stopPropagation()}
			>
				<h3 className="confirm-title">{title}</h3>
				{message && <p className="confirm-message">{message}</p>}
				<div className="confirm-actions">
					<button type="button" className="confirm-cancel" onClick={onCancel} autoFocus>
						Cancel
					</button>
					<button type="button" className="confirm-accept" onClick={onConfirm}>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
}

export default ConfirmDialog;
