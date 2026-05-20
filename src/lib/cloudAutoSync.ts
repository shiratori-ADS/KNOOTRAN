import { supabase } from './supabaseClient'
import { buildLocalPayload, restoreFromPayload, type BackupPayloadV1 } from './backupPayload'
import type { Entry } from '../db/types'
import { db } from '../db/db'

type CloudRow = { data: BackupPayloadV1; updated_at: string | null }

let dirtySince: number | null = null
let pushTimer: number | null = null
let loopTimer: number | null = null
let currentUserId: string | null = null

function metaKey(userId: string) {
  return `knootran_cloud_meta_v1:${userId}`
}

type CloudMeta = {
  lastPulledAt?: number
  lastPushedAt?: number
  lastAppliedRemoteUpdatedAt?: string
}

function loadMeta(userId: string): CloudMeta {
  try {
    const raw = localStorage.getItem(metaKey(userId))
    return raw ? (JSON.parse(raw) as CloudMeta) : {}
  } catch {
    return {}
  }
}

function saveMeta(userId: string, patch: Partial<CloudMeta>) {
  const cur = loadMeta(userId)
  const next = { ...cur, ...patch }
  localStorage.setItem(metaKey(userId), JSON.stringify(next))
}

export function markLocalDirty() {
  dirtySince = dirtySince ?? Date.now()
  notifySyncListeners()
}

export function isCloudConfigured(): boolean {
  return supabase != null
}

export type CloudSyncStatus = {
  configured: boolean
  loggedIn: boolean
  email: string | null
  hasLocalChanges: boolean
  localEntryCount: number
  cloudEntryCount: number | null
  cloudUpdatedAt: string | null
  lastPushedAt: number | null
  lastPulledAt: number | null
}

export type CloudPullConflict = {
  localEntryCount: number
  cloudEntryCount: number
  cloudUpdatedAt: string | null
}

type SyncListener = () => void
const syncListeners = new Set<SyncListener>()

export function subscribeCloudSync(listener: SyncListener): () => void {
  syncListeners.add(listener)
  return () => syncListeners.delete(listener)
}

function notifySyncListeners() {
  for (const fn of syncListeners) fn()
}

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error('クラウド同期が未設定です（.env に Supabase の URL/キーが必要です）。')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const userId = data.session?.user?.id
  if (!userId) throw new Error('ログインしていません。')
  return userId
}

export async function getCloudSyncStatus(): Promise<CloudSyncStatus> {
  if (!supabase) {
    const local = await localSnapshotSummary()
    return {
      configured: false,
      loggedIn: false,
      email: null,
      hasLocalChanges: dirtySince != null,
      localEntryCount: local.entryCount,
      cloudEntryCount: null,
      cloudUpdatedAt: null,
      lastPushedAt: null,
      lastPulledAt: null,
    }
  }

  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id ?? null
  const email = data.session?.user?.email ?? null
  const local = await localSnapshotSummary()
  const meta = userId ? loadMeta(userId) : {}

  let cloudEntryCount: number | null = null
  let cloudUpdatedAt: string | null = null
  if (userId) {
    try {
      const cloud = await fetchCloud(userId)
      if (cloud) {
        cloudUpdatedAt = cloud.updated_at
        cloudEntryCount = Array.isArray(cloud.data.entries) ? cloud.data.entries.length : 0
      }
    } catch {
      // オフライン等
    }
  }

  return {
    configured: true,
    loggedIn: !!userId,
    email,
    hasLocalChanges: dirtySince != null,
    localEntryCount: local.entryCount,
    cloudEntryCount,
    cloudUpdatedAt,
    lastPushedAt: meta.lastPushedAt ?? null,
    lastPulledAt: meta.lastPulledAt ?? null,
  }
}

export async function detectCloudPullConflict(): Promise<CloudPullConflict | null> {
  if (!supabase) return null
  const userId = await requireUserId()
  if (dirtySince == null) return null

  const cloud = await fetchCloud(userId)
  if (!cloud) return null

  const meta = loadMeta(userId)
  if (cloud.updated_at && meta.lastAppliedRemoteUpdatedAt === cloud.updated_at) return null

  const cloudEntries = Array.isArray(cloud.data.entries) ? cloud.data.entries : []
  const local = await localSnapshotSummary()
  if (local.entryCount === 0) return null
  if (cloudEntries.length === 0) return null

  return {
    localEntryCount: local.entryCount,
    cloudEntryCount: cloudEntries.length,
    cloudUpdatedAt: cloud.updated_at,
  }
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('クラウド同期が未設定です。')
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  notifySyncListeners()
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('クラウド同期が未設定です。')
  const { error } = await supabase.auth.signUp({ email: email.trim(), password })
  if (error) throw error
  notifySyncListeners()
}

export async function signOutCloud() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  notifySyncListeners()
}

export async function pushToCloudNow(): Promise<void> {
  const userId = await requireUserId()
  await pushCloud(userId)
  notifySyncListeners()
}

export async function pullFromCloudNow(): Promise<void> {
  const userId = await requireUserId()
  const cloud = await fetchCloud(userId)
  if (!cloud) throw new Error('クラウドに保存データがありません。')
  const cloudEntries = Array.isArray(cloud.data.entries) ? cloud.data.entries : []
  if (cloudEntries.length === 0) throw new Error('クラウドに保存データがありません。')

  await restoreFromPayload(cloud.data)
  saveMeta(userId, { lastPulledAt: Date.now(), lastAppliedRemoteUpdatedAt: cloud.updated_at ?? undefined })
  dirtySince = null
  notifySyncListeners()
}

async function localSnapshotSummary(): Promise<{ entryCount: number; maxEntryUpdatedAt: number }> {
  const entries = await db.entries.toArray()
  const maxEntryUpdatedAt = entries.reduce((m: number, e: Entry) => Math.max(m, e.updatedAt ?? 0), 0)
  return { entryCount: entries.length, maxEntryUpdatedAt }
}

async function fetchCloud(userId: string): Promise<CloudRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_state').select('data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data?.data) return null
  return { data: data.data as BackupPayloadV1, updated_at: (data as any).updated_at ?? null }
}

async function pushCloud(userId: string) {
  if (!supabase) return
  const payload = await buildLocalPayload()
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() })
  if (error) throw error
  dirtySince = null
  saveMeta(userId, { lastPushedAt: Date.now() })
  notifySyncListeners()
}

async function pullIfSafe(userId: string) {
  const meta = loadMeta(userId)
  const cloud = await fetchCloud(userId)
  if (!cloud) return

  // 既に適用済みなら何もしない
  if (cloud.updated_at && meta.lastAppliedRemoteUpdatedAt === cloud.updated_at) return

  const cloudEntries: any[] = Array.isArray((cloud.data as any)?.entries) ? ((cloud.data as any).entries as any[]) : []
  const local = await localSnapshotSummary()

  // ローカルが空でクラウドにデータがある → 自動復元してOK
  if (local.entryCount === 0 && cloudEntries.length > 0) {
    await restoreFromPayload(cloud.data)
    saveMeta(userId, { lastPulledAt: Date.now(), lastAppliedRemoteUpdatedAt: cloud.updated_at ?? undefined })
    dirtySince = null
    notifySyncListeners()
    return
  }

  // ローカルに未プッシュ変更がある場合は、上書き復元せず「ローカル優先」で後でpushする
  if (dirtySince != null) return

  // 念のため：クラウドが空でローカルにデータがある場合は自動削除しない
  if (cloudEntries.length === 0) return

  await restoreFromPayload(cloud.data)
  saveMeta(userId, { lastPulledAt: Date.now(), lastAppliedRemoteUpdatedAt: cloud.updated_at ?? undefined })
  dirtySince = null
  notifySyncListeners()
}

function schedulePush(userId: string) {
  if (pushTimer != null) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    void (async () => {
      try {
        // 変更が無ければpushしない
        if (dirtySince == null) return
        await pushCloud(userId)
        notifySyncListeners()
      } catch {
        // 通信失敗等は次のループでリトライ
      }
    })()
  }, 1500)
}

export function startCloudAutoSync() {
  if (!supabase) return () => {}

  let stopped = false

  async function startForSession() {
    const { data } = await supabase!.auth.getSession()
    const userId = data.session?.user?.id ?? null
    currentUserId = userId
    if (!userId) return

    // 起動時は「安全にpullできるならpull」
    try {
      await pullIfSafe(userId)
      notifySyncListeners()
    } catch {
      // 無視（オフライン等）
    }

    if (loopTimer != null) window.clearInterval(loopTimer)
    loopTimer = window.setInterval(() => {
      if (stopped) return
      if (!currentUserId) return
      // dirtyならpush（デバウンス）
      if (dirtySince != null) schedulePush(currentUserId)
      // たまにクラウド側更新も確認（dirtyでなければpull）
      void (async () => {
        try {
          if (dirtySince != null) return
          await pullIfSafe(currentUserId!)
          notifySyncListeners()
        } catch {
          // 無視
        }
      })()
    }, 5000)
  }

  void startForSession()

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    currentUserId = session?.user?.id ?? null
    if (!currentUserId) {
      if (loopTimer != null) window.clearInterval(loopTimer)
      loopTimer = null
      return
    }
    void startForSession()
    notifySyncListeners()
  })

  return () => {
    stopped = true
    sub.subscription.unsubscribe()
    if (pushTimer != null) window.clearTimeout(pushTimer)
    if (loopTimer != null) window.clearInterval(loopTimer)
    pushTimer = null
    loopTimer = null
    currentUserId = null
  }
}

