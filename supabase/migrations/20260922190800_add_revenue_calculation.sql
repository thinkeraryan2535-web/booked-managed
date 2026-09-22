-- Function to get current Indian Financial Year label (Apr-Mar)
CREATE OR REPLACE FUNCTION public.get_current_fy_label()
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  current_date date := CURRENT_DATE;
  year_start integer;
  year_end integer;
BEGIN
  -- Indian FY starts April 1st
  IF EXTRACT(MONTH FROM current_date) >= 4 THEN
    year_start := EXTRACT(YEAR FROM current_date);
    year_end := year_start + 1;
  ELSE
    year_start := EXTRACT(YEAR FROM current_date) - 1;
    year_end := EXTRACT(YEAR FROM current_date);
  END IF;
  
  RETURN year_start || '-' || LPAD((year_end % 100)::text, 2, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_fy_label() TO authenticated;

-- Function to calculate total revenue for a specific FY
CREATE OR REPLACE FUNCTION public.get_fy_revenue(fy_label_param text)
RETURNS TABLE (
  fy_label text,
  total_revenue numeric,
  booking_count bigint
) LANGUAGE sql STABLE AS $$
  SELECT 
    fy_label_param as fy_label,
    COALESCE(SUM(total_budget), 0) as total_revenue,
    COUNT(*) as booking_count
  FROM public.bookings
  WHERE fy_label = fy_label_param;
$$;

GRANT EXECUTE ON FUNCTION public.get_fy_revenue(text) TO authenticated;

-- Function to get current FY revenue
CREATE OR REPLACE FUNCTION public.get_current_fy_revenue()
RETURNS TABLE (
  fy_label text,
  total_revenue numeric,
  booking_count bigint
) LANGUAGE sql STABLE AS $$
  SELECT * FROM public.get_fy_revenue(public.get_current_fy_label());
$$;

GRANT EXECUTE ON FUNCTION public.get_current_fy_revenue() TO authenticated;

-- View for revenue breakdown by booking
CREATE OR REPLACE VIEW public.revenue_breakdown AS
SELECT 
  b.id,
  b.client_name,
  b.event_type,
  b.event_date,
  b.total_budget,
  b.fy_label,
  b.status,
  b.created_at
FROM public.bookings b
ORDER BY b.event_date DESC;

GRANT SELECT ON public.revenue_breakdown TO authenticated;

-- View for FY summary (all financial years)
CREATE OR REPLACE VIEW public.fy_revenue_summary AS
SELECT 
  fy_label,
  COUNT(*) as booking_count,
  SUM(total_budget) as total_revenue,
  MIN(event_date) as earliest_event,
  MAX(event_date) as latest_event
FROM public.bookings
GROUP BY fy_label
ORDER BY fy_label DESC;

GRANT SELECT ON public.fy_revenue_summary TO authenticated;
