-- Make the deterministic advantage cycle authoritative and self-healing.

CREATE OR REPLACE FUNCTION public.publish_foodiz_advantage_cycle(proposals jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cycle uuid := gen_random_uuid();
  proposal jsonb;
  allowed_points integer[] := ARRAY[250, 500, 800, 1000, 1500, 2000];
  received_points integer[] := '{}';
  points_value integer;
  face_value integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('foodiz_advantage_rotation'));

  -- A valid deterministic cycle is the only condition that postpones rotation.
  IF EXISTS (
    SELECT 1 FROM public.advantage_catalog
    WHERE source = 'rules_engine'
      AND is_active = true
      AND cycle_id IS NOT NULL
      AND valid_until > now()
  ) THEN RETURN NULL; END IF;

  IF jsonb_typeof(proposals) <> 'array' OR jsonb_array_length(proposals) <> 6 THEN
    RAISE EXCEPTION 'A cycle must contain exactly six offers';
  END IF;

  FOR proposal IN SELECT value FROM jsonb_array_elements(proposals)
  LOOP
    points_value := (proposal ->> 'points_cost')::integer;
    face_value := (proposal ->> 'face_value_cents')::integer;
    IF NOT points_value = ANY(allowed_points) OR points_value = ANY(received_points) THEN
      RAISE EXCEPTION 'Invalid or duplicated points tier';
    END IF;
    IF face_value <> points_value THEN RAISE EXCEPTION 'Maximum value must equal points cost'; END IF;
    IF (proposal ->> 'category') NOT IN ('all', 'restaurant', 'market') THEN RAISE EXCEPTION 'Invalid category'; END IF;
    received_points := array_append(received_points, points_value);

    INSERT INTO public.advantage_catalog (
      cycle_id, template_key, title, description, points_cost, value_euros,
      valid_until, is_active, reward_type, face_value_cents,
      minimum_order_cents, discount_percent, source, generated_at,
      category, eligible_products, eligible_establishments
    ) VALUES (
      cycle,
      proposal ->> 'template_key',
      trim(proposal ->> 'title'),
      trim(proposal ->> 'description'),
      points_value,
      face_value::numeric / 100,
      now() + interval '48 hours',
      true,
      proposal ->> 'reward_type',
      face_value,
      (proposal ->> 'minimum_order_cents')::integer,
      0,
      'rules_engine',
      now(),
      proposal ->> 'category',
      coalesce(ARRAY(SELECT jsonb_array_elements_text(proposal -> 'eligible_products')::uuid), '{}'),
      coalesce(ARRAY(SELECT jsonb_array_elements_text(proposal -> 'eligible_establishments')::uuid), '{}')
    );
  END LOOP;

  -- Old manual, AI and expired cycles must never remain visible in the client catalog.
  UPDATE public.advantage_catalog
  SET is_active = false
  WHERE is_active = true AND cycle_id IS DISTINCT FROM cycle;

  INSERT INTO public.advantage_generation_runs (model_name, status, offer_count)
  VALUES ('foodiz-rule-engine-v2', 'success', 6);
  RETURN cycle;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_foodiz_advantage_cycle(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_foodiz_advantage_cycle(jsonb) TO service_role;
