CREATE OR REPLACE FUNCTION public.move_checklist_subtask(_source_id uuid, _target_id uuid, _item_id text, _source_checklist jsonb, _target_checklist jsonb)
RETURNS SETOF public.notes LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE s public.notes; t public.notes; root jsonb; bundle jsonb;
BEGIN
 IF auth.uid() IS NULL OR _source_id = _target_id THEN RAISE EXCEPTION 'Invalid destination'; END IF;
 PERFORM id FROM public.notes WHERE id IN (_source_id, _target_id) ORDER BY id FOR UPDATE;
 SELECT * INTO s FROM public.notes WHERE id = _source_id AND user_id = auth.uid();
 SELECT * INTO t FROM public.notes WHERE id = _target_id AND user_id = auth.uid();
 IF s.id IS NULL OR t.id IS NULL OR s.note_type <> 'checklist' OR t.note_type <> 'checklist' THEN RAISE EXCEPTION 'Invalid destination'; END IF;
 IF s.checklist IS DISTINCT FROM _source_checklist OR t.checklist IS DISTINCT FROM _target_checklist THEN RAISE EXCEPTION 'Lists changed; retry'; END IF;
 SELECT value INTO root FROM jsonb_array_elements(s.checklist) WHERE value->>'id' = _item_id;
 IF root IS NULL OR COALESCE(root->>'parentId','') <> '' OR COALESCE(root->>'style','task') = 'bullet' THEN RAISE EXCEPTION 'Invalid subtask'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(s.checklist) c WHERE c->>'parentId' IN (SELECT x->>'id' FROM jsonb_array_elements(s.checklist) x WHERE x->>'parentId' = _item_id)) THEN RAISE EXCEPTION 'Unsupported checklist levels'; END IF;
 SELECT jsonb_agg(value ORDER BY ord) INTO bundle FROM jsonb_array_elements(s.checklist) WITH ORDINALITY AS e(value,ord) WHERE value->>'id' = _item_id OR value->>'parentId' = _item_id;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(t.checklist) a JOIN jsonb_array_elements(bundle) b ON a->>'id' = b->>'id') THEN RAISE EXCEPTION 'Duplicate item'; END IF;
 UPDATE public.notes SET checklist = COALESCE((SELECT jsonb_agg(value ORDER BY ord) FROM jsonb_array_elements(s.checklist) WITH ORDINALITY e(value,ord) WHERE value->>'id' <> _item_id AND COALESCE(value->>'parentId','') <> _item_id),'[]'::jsonb) WHERE id = s.id;
 UPDATE public.notes SET checklist = t.checklist || bundle WHERE id = t.id;
 RETURN QUERY SELECT * FROM public.notes WHERE id IN (s.id,t.id);
END $$;
REVOKE ALL ON FUNCTION public.move_checklist_subtask(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_checklist_subtask(uuid,uuid,text,jsonb,jsonb) TO authenticated;