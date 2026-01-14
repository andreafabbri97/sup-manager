-- Update create_booking RPC to accept manual equipment and packages separately
-- Expands packages server-side for availability check, then saves items separately
CREATE OR REPLACE FUNCTION create_booking(
  p_customer_name text,
  p_start timestamptz,
  p_end timestamptz,
  p_price numeric,
  p_package uuid DEFAULT NULL,
  p_equipment_items jsonb DEFAULT '[]'::jsonb,
  p_package_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  ei jsonb;
  pi jsonb;
  req_qty int;
  eq_id uuid;
  total_sups int;
  booked_qty int;
  avail int;
  v_booking_id uuid;
  rec record;
  pkg_rec record;
  merged_equipment jsonb;
  temp_eq jsonb;
BEGIN
  -- Validate basic times
  IF p_start IS NULL OR p_end IS NULL OR p_start >= p_end THEN
    RAISE EXCEPTION 'Invalid start/end time';
  END IF;

  -- Merge manual equipment with expanded package equipment for availability check
  merged_equipment := p_equipment_items;
  
  -- Expand packages into equipment
  FOR pi IN SELECT * FROM jsonb_array_elements(coalesce(p_package_items, '[]'::jsonb)) LOOP
    -- Get package equipment_items
    FOR pkg_rec IN 
      SELECT jsonb_array_elements(coalesce(package.equipment_items, '[]'::jsonb)) as pkg_eq
      FROM package 
      WHERE package.id = (pi->>'id')::uuid
    LOOP
      -- Add to merged_equipment
      eq_id := (pkg_rec.pkg_eq->>'id')::uuid;
      req_qty := COALESCE((pkg_rec.pkg_eq->>'quantity')::int, 1) * COALESCE((pi->>'quantity')::int, 1);
      
      -- Check if equipment already in merged_equipment and add quantity
      temp_eq := NULL;
      FOR ei IN SELECT * FROM jsonb_array_elements(merged_equipment) LOOP
        IF (ei->>'id')::uuid = eq_id THEN
          temp_eq := ei;
          EXIT;
        END IF;
      END LOOP;
      
      IF temp_eq IS NOT NULL THEN
        -- Update existing equipment quantity
        merged_equipment := (
          SELECT jsonb_agg(
            CASE 
              WHEN (elem->>'id')::uuid = eq_id 
              THEN jsonb_set(elem, '{quantity}', to_jsonb(COALESCE((elem->>'quantity')::int, 0) + req_qty))
              ELSE elem
            END
          )
          FROM jsonb_array_elements(merged_equipment) elem
        );
      ELSE
        -- Add new equipment
        merged_equipment := merged_equipment || jsonb_build_object('id', eq_id, 'quantity', req_qty)::jsonb;
      END IF;
    END LOOP;
  END LOOP;

  -- For each equipment in merged list, check availability
  FOR ei IN SELECT * FROM jsonb_array_elements(coalesce(merged_equipment, '[]'::jsonb)) LOOP
    eq_id := (ei->>'id')::uuid;
    req_qty := COALESCE((ei->>'quantity')::int, 1);

    -- Lock sup rows for this equipment to prevent race conditions
    total_sups := 0;
    FOR rec IN SELECT sup.id FROM sup WHERE sup.equipment_id = eq_id AND (sup.status IS NULL OR sup.status = 'available') FOR UPDATE LOOP
      total_sups := total_sups + 1;
    END LOOP;

    -- If no individual `sup` rows exist for this equipment, fall back to equipment.quantity
    IF total_sups = 0 THEN
      SELECT COALESCE(equipment.quantity, 0) INTO total_sups FROM equipment WHERE equipment.id = eq_id;
    END IF;

    -- Sum quantities already booked in overlapping bookings (considering merged equipment from existing bookings)
    -- We need to expand package_items from existing bookings too
    booked_qty := 0;
    FOR rec IN 
      SELECT 
        b.id as booking_id,
        b.equipment_items,
        b.package_items
      FROM booking b
      WHERE p_start < b.end_time AND b.start_time < p_end
    LOOP
      -- Add from equipment_items
      FOR ei IN SELECT * FROM jsonb_array_elements(coalesce(rec.equipment_items, '[]'::jsonb)) LOOP
        IF (ei->>'id')::uuid = eq_id THEN
          booked_qty := booked_qty + COALESCE((ei->>'quantity')::int, 1);
        END IF;
      END LOOP;
      
      -- Expand and add from package_items
      FOR pi IN SELECT * FROM jsonb_array_elements(coalesce(rec.package_items, '[]'::jsonb)) LOOP
        FOR pkg_rec IN 
          SELECT jsonb_array_elements(coalesce(package.equipment_items, '[]'::jsonb)) as pkg_eq
          FROM package 
          WHERE package.id = (pi->>'id')::uuid
        LOOP
          IF (pkg_rec.pkg_eq->>'id')::uuid = eq_id THEN
            booked_qty := booked_qty + (COALESCE((pkg_rec.pkg_eq->>'quantity')::int, 1) * COALESCE((pi->>'quantity')::int, 1));
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    avail := total_sups - booked_qty;
    IF req_qty > avail THEN
      RAISE EXCEPTION 'Disponibilità insufficiente per attrezzatura %: disponibili %, richiesti %', eq_id, avail, req_qty;
    END IF;
  END LOOP;

  -- If all checks pass, insert booking with separate equipment_items and package_items
  INSERT INTO booking(customer_name, start_time, end_time, price, package_id, equipment_items, package_items)
  VALUES (p_customer_name, p_start, p_end, p_price, p_package, p_equipment_items, p_package_items)
  RETURNING booking.id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id AS id;
END;
$$;
