# Accounts with Supabase (e-mail + password)

GitHub Pages only serves files, so accounts need a small backend. Supabase's free plan is enough:
it keeps the accounts (passwords are hashed by the server, never stored by this app) and a
database. The site talks to it directly from the browser; there is no server code to run.
No domain is needed: people sign in with their own e-mail address and a password.

## Set up (about 5 minutes)

1. Create a free project at <https://supabase.com>.
2. **SQL editor > New query**, paste `supabase/setup.sql`, **Run**.
3. **Authentication > Sign In / Providers > Email**: keep Email on and turn **off "Confirm email"**
   (see "E-mail limits" below for why), then **Save**.
4. **Authentication > URL Configuration**: set **Site URL** to your site, e.g.
   `https://YOURNAME.github.io/QMLCamp/` (the password-reset link opens this address).
5. **Project settings > API Keys**: copy the **Project URL** (base address only, nothing after `.co`)
   and the **Publishable key** (`sb_publishable_...`, or the legacy *anon public* key) into
   `js/sync-config.js`. Never use the secret / service_role key. Leave `emailDomain` empty.
6. Commit and push; hard-refresh the site.

## How it behaves

- Save 1.5 s after each change, on close/hide; pull on open, on focus and every 60 s.
- First sign-in on a device merges local and remote data; afterwards the newest save wins per item.
- Sign out removes the local copy on that device; the data stays on the server.
- **Forgot password?** in the dialog e-mails a reset link; it opens the site and asks for a new password.
- Until the config values are published, the sync button says accounts are not set up (there is no other sign-in).

## E-mail limits (read this)

Supabase's built-in mail sender is for testing: it only delivers to addresses that belong to
your Supabase **organization team** and sends at most **2 mails per hour**. Consequences:

- With **Confirm email off** (step 3) everybody can sign up and sign in, no mail needed.
  Nobody proves the address is theirs, which is fine for a small personal/study group.
- **Password reset mails** reach only team members (you) until you add a custom SMTP service
  (Authentication > Emails > SMTP Settings; services such as Brevo have free plans). Other users
  who forget their password cannot reset it until then; you can set a new one for them in
  Supabase under Authentication > Users.
- To invite a friend as a team member, add them in the organization's **Team** settings.

## Other limits

- The session (access + refresh token) is kept in that browser's localStorage, like any static-site login.
- Free projects pause after about a week without activity; open the dashboard to resume.
- Anyone can create accounts. Turn off **Allow new users to sign up** once your users exist.

## Optional: usernames instead of e-mail

If you own a domain with an MX record, set `emailDomain: 'yourdomain.com'` in `js/sync-config.js`
and people sign in with a username (stored as `username@yourdomain.com`; nothing is ever sent
there). Supabase rejects `example.com` and domains without mail records. No reset by e-mail then.
