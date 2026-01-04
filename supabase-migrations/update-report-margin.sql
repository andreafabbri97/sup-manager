-- Update report_margin to include revenue_invoiced (sum of prices for bookings where invoiced = true)
CREATE OR REPLACE FUNCTION report_margin(start_date date, end_date date)
RETURNS TABLE(metric text, value numeric)
LANGUAGE sql
AS $$
  WITH rev AS (
    SELECT COALESCE(SUM(price),0) AS revenue
    FROM booking
    WHERE start_time::date BETWEEN start_date AND end_date
  ),
  rev_inv AS (
    SELECT COALESCE(SUM(price),0) AS revenue_invoiced
    FROM booking
    WHERE start_time::date BETWEEN start_date AND end_date AND invoiced = true
  ),
  exp AS (
    SELECT COALESCE(SUM(amount),0) AS expenses
    FROM expense
    WHERE date BETWEEN start_date AND end_date
  )
  SELECT 'revenue'::text AS metric, (SELECT revenue FROM rev) AS value
  UNION ALL
  SELECT 'revenue_invoiced'::text, (SELECT revenue_invoiced FROM rev_inv)
  UNION ALL
  SELECT 'expenses'::text, (SELECT expenses FROM exp)
  UNION ALL
  SELECT 'margin'::text, (SELECT revenue - expenses FROM rev, exp);
$$;

-- End migration
