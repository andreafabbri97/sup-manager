-- Create RPC to insert booking with availability checks per equipment
-- This function checks overlapping bookings and available SUP units (sup table),
-- then inserts the booking in a transaction. It raises an exception if availability is insufficient.

CREATE OR REPLACE FUNCTION create_booking(
  p_customer_name text,
  p_start timestamptz,
  p_end timestamptz,
  p_price numeric,
  p_package uuid DEFAULT NULL,
  p_equipment_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  ei jsonb;
  req_qty int;
  eq_id uuid;
  total_sups int;
  booked_qty int;
  avail int;
  v_booking_id uuid;
BEGIN
  -- Validate basic times
  IF p_start IS NULL OR p_end IS NULL OR p_start >= p_end THEN
    RAISE EXCEPTION 'Invalid start/end time';
  END IF;

  -- For each requested equipment item, check availability
  FOR ei IN SELECT * FROM jsonb_array_elements(coalesce(p_equipment_items, '[]'::jsonb)) LOOP
    eq_id := (ei->>'id')::uuid;
    req_qty := COALESCE((ei->>'quantity')::int, 1);

    -- Lock sup rows for this equipment to prevent race conditions
    SELECT COUNT(*) INTO total_sups FROM sup WHERE equipment_id = eq_id AND (status IS NULL OR status = 'available') FOR UPDATE;

    -- If no individual `sup` rows exist for this equipment, fall back to equipment.quantity
    IF total_sups = 0 THEN
      SELECT COALESCE(quantity, 0) INTO total_sups FROM equipment WHERE id = eq_id;
    END IF;

    -- Sum quantities already booked in overlapping bookings
    SELECT COALESCE(SUM( (je->>'quantity')::int ), 0) INTO booked_qty
    FROM booking b
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(b.equipment_items,'[]'::jsonb)) AS je
    WHERE (je->>'id') = eq_id::text
      AND p_start < b.end_time AND b.start_time < p_end;

    avail := total_sups - booked_qty;
    IF req_qty > avail THEN
      RAISE EXCEPTION 'Disponibilità insufficiente per attrezzatura %: disponibili %, richiesti %', eq_id, avail, req_qty;
    END IF;
  END LOOP;

  -- If all checks pass, insert booking
  INSERT INTO booking(customer_name, start_time, end_time, price, package_id, equipment_items)
  VALUES (p_customer_name, p_start, p_end, p_price, p_package, p_equipment_items)
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id;
END;
$$;
