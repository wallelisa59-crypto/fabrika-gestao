import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dcozdjabrjuhiqbmdhkn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjb3pkamFicmp1aGlxYm1kaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDExNTcsImV4cCI6MjA5NTExNzE1N30.5D4bPxdguPCBBlKmW4bBX2veXEox01UEIli6VmAJWiA";

export const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string) || SUPABASE_URL,
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || SUPABASE_ANON_KEY
);
