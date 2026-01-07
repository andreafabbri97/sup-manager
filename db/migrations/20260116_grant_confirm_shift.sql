-- Migration: Grant execute on confirm_shift RPC so PostgREST/Supabase exposes it

GRANT EXECUTE ON FUNCTION public.confirm_shift(uuid) TO authenticated;

-- If you still see "Could not find the function ... in the schema cache" after applying this, open the Supabase dashboard and refresh the API schema (Settings → Database → Refresh) or re-deploy the API schema cache.
