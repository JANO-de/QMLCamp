// =============================================================================
//  Sync settings. Fill these in to enable username + password accounts.
//  Leave them empty to keep the GitHub-token (gist) sign-in instead.
//  Both values come from Supabase: Project settings > API. The anon key is meant
//  to be public (it only works within the row-level security rules of setup.sql),
//  so it is safe to commit. NEVER put the "service_role" key here.
//  Full steps: supabase/README.md
// =============================================================================
window.QML_SYNC_CONFIG = {
  supabaseUrl: '', // e.g. 'https://abcdefgh.supabase.co'
  supabaseAnonKey: '', // the long "anon public" key
  // Leave emailDomain EMPTY (recommended, no domain needed): people sign in with their real
  // e-mail address and a password. Only set it if you own a domain with an MX record: then
  // people sign in with a username instead (stored as username@emailDomain; Supabase rejects
  // example.com and domains without mail records).
  emailDomain: '', // e.g. 'mydomain.com'
};
