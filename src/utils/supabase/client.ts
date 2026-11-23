import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "https://swxnpzppeuvnlzupixwd.supabase.co";

const supabaseKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_Py_kcGTyltYxwxrCdmSLeg_zSxMYF_e";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
