/* Optional cloud sync. Leave empty for a fully local, private app.
   To enable free login + backup across devices:
   1. Create a project at https://supabase.com (free tier)
   2. Run supabase/schema.sql in the SQL editor
   3. Paste Project URL and anon public key below (they are safe to publish;
      row-level security keeps every user's rows private to their login).   */
window.APP_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
