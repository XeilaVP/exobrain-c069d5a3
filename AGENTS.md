# Architecture rules

- Represent overlay navigation as a note ID plus an optional checklist-item ID, with history preserving both; subtasks must edit the containing note's existing checklist rather than creating separate notes.
- Reuse TaskSheet for standalone subtask details with optional navigation and checklist labels so its existing in-note presentation remains compatible.
- Reuse TaskMetaControls and PriorityControl across view surfaces, saving note dates through setViewMembership and subtask metadata through the containing checklist; this keeps edits consistent without duplicating records.