/* ============================================================
   NIFIO BOOKS — Supabase public configuration

   These two values are the Supabase "Project URL" and the
   "anon / public" API key, found in your Supabase project under
   Project Settings -> API. They are DESIGNED to be public: they
   ship in frontend JavaScript and are safe to commit to this
   repository. They grant no access by themselves — every table
   and storage bucket is locked down by Row Level Security until
   a policy explicitly allows an operation (see supabase/schema.sql).

   Never put the "service_role" key here or anywhere in this
   project. It bypasses Row Level Security entirely and must only
   ever be used from a trusted server, which this static site does
   not have.

   Until you replace the placeholders below with your real project
   values, auth.js detects the placeholders and keeps the entire
   login/profile UI hidden — the rest of the site is unaffected.
   ============================================================ */

export const SUPABASE_URL = "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
