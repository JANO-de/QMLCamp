# Username + password accounts (Supabase)

GitHub Pages only serves files, so accounts need a small backend. Supabase's free plan is enough:
it provides the user accounts (passwords are hashed by the server, never stored by this app) and a
database. The site talks to it directly from the browser; there is no server code to run.

## Set up (about 5 minutes)

1. Create a free project at <https://supabase.com> (any region, remember the database password).
2. **SQL editor > New query**, paste `supabase/setup.sql`, **Run**. This creates the `user_data`
   table and the rules that let each user read and write only their own row.
3. **Authentication > Providers > Email**: keep Email enabled and turn **off "Confirm email"**.
   (Usernames are mapped to made-up addresses such as `anna@qmlcamp.example.com`, so no mail can be
   delivered; confirmation would block every sign-up.) Optionally raise the minimum password length.
4. **Project settings > API**: copy the **Project URL** and the **anon public** key into
   `js/sync-config.js`. Never use the `service_role` key.
5. Commit and push. The sync button now offers *Sign in / Create account*.

## How it behaves

- Same save rules as before: 1.5 s after each change, on close/hide, pull on open, on focus and every 60 s.
- First sign-in on a device merges local and remote data; after that the newest save wins per item.
- Sign out removes the local copy on that device; the data stays on the server.
- Without the config values the app falls back to the GitHub-token (gist) sign-in.

## Limits to know

- **No password reset.** There is no e-mail on file, so a forgotten password cannot be recovered.
  (To support reset, collect a real e-mail instead of a username and enable confirmation.)
- The session (access + refresh token) is kept in that browser's localStorage, like any static-site login.
- Free projects pause after about a week without activity; open the dashboard to resume.
- Anyone can create accounts (public sign-up). Disable sign-ups in Supabase once your users exist if you want a closed group.
