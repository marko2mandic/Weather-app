/**
 * Feature switches.
 *
 * FAMILY_SHARING: email sign-in + shared family space (Supabase). Parked for now: the app works
 * fully on its own, with settings and learning kept on each phone. To turn it back on, set this to
 * true and add {{ .Token }} to the Magic Link + Confirm signup email templates in Supabase.
 */
export const FAMILY_SHARING = false
