// =============================================================================
//  Sync settings. Fill these in to enable username + password accounts.
//  While they are empty, the sync button shows "Accounts are not set up yet".
//  Both values come from Supabase: Project settings > API. The anon key is meant
//  to be public (it only works within the row-level security rules of setup.sql),
//  so it is safe to commit. NEVER put the "service_role" key here.
//  Full steps: supabase/README.md
// =============================================================================
window.QML_SYNC_CONFIG = {
  supabaseUrl: 'https://ribghdmmmpzchhvuizqa.supabase.co/',
  supabaseAnonKey: 'sb_publishable_GPw2Draq1AiQ-7KtQNJ7_Q_oD9xg0ZT',
  emailDomain: '',
};
