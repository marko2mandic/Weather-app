import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface HouseholdRow {
  id: string
  name: string
  warmth_offset: number
  sand_factor: number
  child_birth: string | null // 'YYYY-MM-DD'
  places_radius_km: number
  updated_at: string
}

const HOUSEHOLD_COLS = 'id,name,warmth_offset,sand_factor,child_birth,places_radius_km,updated_at'
export interface Member {
  user_id: string
  email: string
  joined_at: string
}
export interface Invite {
  email: string
  created_at: string
}
export interface RemoteFeedback {
  id: number
  user_id: string | null
  kind: 'dress' | 'sand' | 'tip'
  value: string
  context: Record<string, number | string>
  created_at: string
}

const FEEDBACK_LIMIT = 30

/** Auth session + the shared household (tuning, members, invites, feedback log), kept live via Realtime. */
export function useHousehold() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [household, setHousehold] = useState<HouseholdRow | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [feedback, setFeedback] = useState<RemoteFeedback[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = session?.user.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    if (!userId) {
      setHousehold(null)
      setMembers([])
      setInvites([])
      setFeedback([])
      return
    }
    setLoading(true)
    try {
      // Joins the household automatically if someone invited this email.
      const claim = await supabase.rpc('claim_invite')
      if (claim.error) throw claim.error
      const { data: h, error: hErr } = await supabase.from('households').select(HOUSEHOLD_COLS).maybeSingle()
      if (hErr) throw hErr
      setHousehold(h)
      if (h) {
        const [m, i, f] = await Promise.all([
          supabase.from('household_members').select('user_id,email,joined_at').order('joined_at'),
          supabase.from('household_invites').select('email,created_at').eq('household_id', h.id).order('created_at'),
          supabase.from('feedback').select('id,user_id,kind,value,context,created_at').order('created_at', { ascending: false }).limit(FEEDBACK_LIMIT),
        ])
        if (m.error || i.error || f.error) throw m.error ?? i.error ?? f.error
        setMembers(m.data)
        setInvites(i.data)
        setFeedback(f.data as RemoteFeedback[])
      }
      setError(null)
    } catch (e) {
      setError(message(e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  // Refresh when the app comes back to the foreground (phones suspend websockets).
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // Live: the other parent's feedback and tuning changes show up immediately.
  const householdId = household?.id
  useEffect(() => {
    if (!householdId) return
    const channel = supabase
      .channel(`household-${householdId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` }, (p) =>
        setHousehold(p.new as HouseholdRow),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback', filter: `household_id=eq.${householdId}` }, (p) => {
        const row = p.new as RemoteFeedback
        setFeedback((f) => [row, ...f.filter((x) => x.id !== row.id)].slice(0, FEEDBACK_LIMIT))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId])

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(message(e))
      throw e
    }
  }, [])

  const sendCode = (email: string) =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, emailRedirectTo: location.origin + import.meta.env.BASE_URL },
      })
      if (error) throw error
    })

  const verifyCode = (email: string, token: string) =>
    run(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' })
      if (error) throw error
    })

  const signOut = () => run(async () => void (await supabase.auth.signOut()))

  const create = (name: string, warmth: number, sand: number) =>
    run(async () => {
      const { error } = await supabase.rpc('create_household', { p_name: name, p_warmth: warmth, p_sand: sand })
      if (error) throw error
      await load()
    })

  const invite = (email: string) =>
    run(async () => {
      if (!household) return
      const { error } = await supabase.from('household_invites').insert({ household_id: household.id, email: email.trim().toLowerCase() })
      if (error) throw error
      await load()
    })

  const cancelInvite = (email: string) =>
    run(async () => {
      if (!household) return
      const { error } = await supabase.from('household_invites').delete().eq('household_id', household.id).eq('email', email)
      if (error) throw error
      await load()
    })

  const updateSettings = useCallback(
    async (fields: Partial<Pick<HouseholdRow, 'child_birth' | 'places_radius_km' | 'name'>>) => {
      const id = household?.id
      if (!id) return
      setHousehold((h) => (h ? { ...h, ...fields } : h))
      const { data, error } = await supabase.from('households').update(fields).eq('id', id).select(HOUSEHOLD_COLS).single()
      if (error) {
        setError(message(error))
        load()
        return
      }
      setHousehold(data)
    },
    [household?.id, load],
  )

  /** Optimistically apply locally, then let the server (the source of truth) confirm. */
  const applyFeedback = useCallback(
    async (kind: RemoteFeedback['kind'], value: string, context: Record<string, number | string>, optimistic: Pick<HouseholdRow, 'warmth_offset' | 'sand_factor'>) => {
      setHousehold((h) => (h ? { ...h, ...optimistic } : h))
      const { data, error } = await supabase.rpc('apply_feedback', { p_kind: kind, p_value: value, p_context: context })
      if (error) {
        setError(message(error))
        load()
        return
      }
      setHousehold(data as HouseholdRow)
    },
    [load],
  )

  return {
    ready,
    session,
    email: session?.user.email ?? null,
    userId,
    household,
    members,
    invites,
    feedback,
    loading,
    error,
    reload: load,
    sendCode,
    verifyCode,
    signOut,
    create,
    invite,
    cancelInvite,
    applyFeedback,
    updateSettings,
  }
}

export type HouseholdApi = ReturnType<typeof useHousehold>

function message(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message)
  return 'Something went wrong'
}
