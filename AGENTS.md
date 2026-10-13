# Architecture rules

- Represent overlay navigation as a note ID plus an optional checklist-item ID, with history preserving both; subtasks must edit the containing note's existing checklist rather than creating separate notes.
- Reuse TaskSheet for standalone subtask details with optional navigation and checklist labels so its existing in-note presentation remains compatible.
- Reuse TaskMetaControls and PriorityControl across view surfaces, saving note dates through setViewMembership and subtask metadata through the containing checklist; this keeps edits consistent without duplicating records.
- Derive planner entries from each note/subtask's own date, not legacy calendar membership; this prevents parent flags from hiding or removing independently dated subtasks.
- Reuse EditableChecklistText for plain-item editing while keeping drag, completion and delete controls outside its hit area; this prevents gesture conflicts.
- Reuse TaskDescription for checklist-note content and subtask notes, retaining the rich-text editor for existing HTML; this preserves descriptions without parallel fields.
- Validate transfer bundles with subtaskTransfer and transfer through move_checklist_subtask after draining serialized per-note saves, with checklist comparison and user ownership checks; this prevents partial moves and stale writes restoring the source.