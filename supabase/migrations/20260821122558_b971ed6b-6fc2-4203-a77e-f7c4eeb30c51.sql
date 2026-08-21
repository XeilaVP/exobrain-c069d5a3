ALTER TABLE public.note_versions
  ADD COLUMN IF NOT EXISTS pos_x numeric,
  ADD COLUMN IF NOT EXISTS pos_y numeric;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brain_pos_x numeric,
  ADD COLUMN IF NOT EXISTS brain_pos_y numeric;

CREATE OR REPLACE FUNCTION public.snapshot_note_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.restoring_note', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.note_versions (
      note_id, user_id, title, content, checklist, source, event_type,
      category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
      pos_dx, pos_dy, pos_x, pos_y, icon, color
    )
    VALUES (
      OLD.id, OLD.user_id, OLD.title, OLD.content, OLD.checklist, 'user', 'delete',
      OLD.category_id, OLD.parent_note_id, COALESCE(OLD.linked_note_ids, '{}'::uuid[]),
      OLD.note_type, OLD.is_collapsed, OLD.pos_dx, OLD.pos_dy, OLD.pos_x, OLD.pos_y, OLD.icon, OLD.color
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF ROW(
        NEW.title, NEW.content, NEW.checklist, NEW.category_id, NEW.parent_note_id,
        NEW.linked_note_ids, NEW.note_type, NEW.is_collapsed, NEW.icon, NEW.color
      ) IS NOT DISTINCT FROM ROW(
        OLD.title, OLD.content, OLD.checklist, OLD.category_id, OLD.parent_note_id,
        OLD.linked_note_ids, OLD.note_type, OLD.is_collapsed, OLD.icon, OLD.color
      ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.note_versions (
      note_id, user_id, title, content, checklist, source, event_type,
      category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
      pos_dx, pos_dy, pos_x, pos_y, icon, color
    )
    VALUES (
      OLD.id, OLD.user_id, OLD.title, OLD.content, OLD.checklist, 'user', 'edit',
      OLD.category_id, OLD.parent_note_id, COALESCE(OLD.linked_note_ids, '{}'::uuid[]),
      OLD.note_type, OLD.is_collapsed, OLD.pos_dx, OLD.pos_dy, OLD.pos_x, OLD.pos_y, OLD.icon, OLD.color
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_note_version(_note_id uuid, _version_id uuid)
 RETURNS notes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  target_version public.note_versions%ROWTYPE;
  current_note public.notes%ROWTYPE;
  restored_note public.notes%ROWTYPE;
BEGIN
  SELECT * INTO target_version
  FROM public.note_versions
  WHERE id = _version_id AND note_id = _note_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found or not accessible'; END IF;

  SELECT * INTO current_note FROM public.notes WHERE id = _note_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Original note not found'; END IF;

  INSERT INTO public.note_versions (
    note_id, user_id, title, content, checklist, source, event_type,
    category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
    pos_dx, pos_dy, pos_x, pos_y, icon, color, restored_from_version_id
  )
  VALUES (
    current_note.id, current_note.user_id, current_note.title, current_note.content,
    current_note.checklist, 'restore', 'pre_restore', current_note.category_id,
    current_note.parent_note_id, COALESCE(current_note.linked_note_ids, '{}'::uuid[]),
    current_note.note_type, current_note.is_collapsed, current_note.pos_dx,
    current_note.pos_dy, current_note.pos_x, current_note.pos_y, current_note.icon, current_note.color, _version_id
  );

  PERFORM set_config('app.restoring_note', 'on', true);

  UPDATE public.notes
  SET
    title = target_version.title,
    content = target_version.content,
    checklist = target_version.checklist,
    parent_note_id = CASE
      WHEN target_version.parent_note_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.notes p
        WHERE p.id = target_version.parent_note_id AND p.user_id = auth.uid()
      ) THEN target_version.parent_note_id
      ELSE NULL
    END,
    linked_note_ids = COALESCE((
      SELECT array_agg(linked_id)
      FROM unnest(COALESCE(target_version.linked_note_ids, '{}'::uuid[])) linked_id
      WHERE EXISTS (
        SELECT 1 FROM public.notes ln
        WHERE ln.id = linked_id AND ln.user_id = auth.uid()
      )
    ), '{}'::uuid[]),
    note_type = COALESCE(target_version.note_type, current_note.note_type, 'text'),
    is_collapsed = COALESCE(target_version.is_collapsed, current_note.is_collapsed, true),
    pos_dx = target_version.pos_dx,
    pos_dy = target_version.pos_dy,
    pos_x = COALESCE(target_version.pos_x, current_note.pos_x),
    pos_y = COALESCE(target_version.pos_y, current_note.pos_y),
    icon = target_version.icon,
    color = COALESCE(target_version.color, current_note.color),
    updated_at = now()
  WHERE id = _note_id AND user_id = auth.uid()
  RETURNING * INTO restored_note;

  RETURN restored_note;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recover_deleted_note_version(_version_id uuid)
 RETURNS notes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  target_version public.note_versions%ROWTYPE;
  recovered_note public.notes%ROWTYPE;
BEGIN
  SELECT * INTO target_version
  FROM public.note_versions
  WHERE id = _version_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found or not accessible'; END IF;

  INSERT INTO public.notes (
    user_id, category_id, parent_note_id, title, content, checklist,
    linked_note_ids, note_type, is_collapsed, pos_dx, pos_dy, pos_x, pos_y, icon, color
  )
  VALUES (
    target_version.user_id,
    NULL,
    CASE
      WHEN target_version.parent_note_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.notes p
        WHERE p.id = target_version.parent_note_id AND p.user_id = auth.uid()
      ) THEN target_version.parent_note_id
      ELSE NULL
    END,
    COALESCE(target_version.title, 'Nota recuperada'),
    target_version.content,
    target_version.checklist,
    COALESCE((
      SELECT array_agg(linked_id)
      FROM unnest(COALESCE(target_version.linked_note_ids, '{}'::uuid[])) linked_id
      WHERE EXISTS (
        SELECT 1 FROM public.notes ln
        WHERE ln.id = linked_id AND ln.user_id = auth.uid()
      )
    ), '{}'::uuid[]),
    COALESCE(target_version.note_type, 'text'),
    COALESCE(target_version.is_collapsed, true),
    target_version.pos_dx,
    target_version.pos_dy,
    target_version.pos_x,
    target_version.pos_y,
    target_version.icon,
    target_version.color
  )
  RETURNING * INTO recovered_note;

  INSERT INTO public.note_versions (
    note_id, user_id, title, content, checklist, source, event_type,
    category_id, parent_note_id, linked_note_ids, note_type, is_collapsed,
    pos_dx, pos_dy, pos_x, pos_y, icon, color, restored_from_version_id
  )
  VALUES (
    recovered_note.id, recovered_note.user_id, recovered_note.title, recovered_note.content,
    recovered_note.checklist, 'restore', 'recover_deleted', recovered_note.category_id,
    recovered_note.parent_note_id, COALESCE(recovered_note.linked_note_ids, '{}'::uuid[]),
    recovered_note.note_type, recovered_note.is_collapsed, recovered_note.pos_dx,
    recovered_note.pos_dy, recovered_note.pos_x, recovered_note.pos_y, recovered_note.icon,
    recovered_note.color, _version_id
  );

  RETURN recovered_note;
END;
$function$;