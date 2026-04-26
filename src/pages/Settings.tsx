import { useEffect, useMemo, useState } from 'react'
import { db, getSettings } from '../db/db'
import type { Entry, Settings as SettingsType } from '../db/types'
import { normalizeToken } from '../lib/normalize'
import { supabase } from '../lib/supabaseClient'

export function Settings() {
  const [view, setView] = useState<'home' | 'language' | 'tags' | 'backup'>('home')
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [uiLanguage, setUiLanguage] = useState<'ja' | 'en'>('ja')
  const [tagsText, setTagsText] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [ioStatus, setIoStatus] = useState('')
  const [cloudStatus, setCloudStatus] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setUiLanguage(s.uiLanguage)
    })
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const tags = useMemo(() => {
    return (settings?.tags ?? []).map((t) => t.trim()).filter(Boolean)
  }, [settings?.tags])

  function resetStatuses() {
    setStatus('')
    setIoStatus('')
    setCloudStatus('')
  }

  async function buildLocalPayload() {
    const s = await getSettings()
    const entries = await db.entries.toArray()
    const payload = {
      kind: 'known-only-translate-backup',
      version: 1,
      exportedAt: Date.now(),
      settings: s,
      entries,
    } as const
    return payload
  }

  async function restoreFromPayload(raw: any) {
    if (!raw || raw.kind !== 'known-only-translate-backup' || raw.version !== 1) {
      throw new Error('バックアップ形式が不正です。')
    }
    const nextSettings: SettingsType | null =
      raw.settings && raw.settings.id === 'singleton' ? (raw.settings as SettingsType) : null
    const nextEntries: Entry[] = Array.isArray(raw.entries) ? (raw.entries as Entry[]) : []

    if (!nextSettings) {
      throw new Error('settingsが不正です。')
    }

    const normalizedEntries: Entry[] = nextEntries.map((e) => {
      const lemma = normalizeToken(e.foreignLemma ?? '')
      const forms = Array.isArray(e.foreignForms)
        ? Array.from(new Set(e.foreignForms.map((f) => normalizeToken(f ?? '')).filter(Boolean)))
        : lemma
          ? [lemma]
          : []
      return {
        ...e,
        foreignLemma: lemma ? lemma : undefined,
        foreignForms: forms,
      }
    })

    await db.transaction('rw', db.entries, db.settings, async () => {
      await db.entries.clear()
      await db.settings.clear()
      const patchedSettings: SettingsType = {
        id: 'singleton',
        uiLanguage: (nextSettings as any).uiLanguage === 'en' ? 'en' : 'ja',
        tags: Array.isArray((nextSettings as any).tags) ? (nextSettings as any).tags : [],
      }
      await db.settings.put(patchedSettings)
      await db.entries.bulkPut(normalizedEntries)
    })

    const patchedSettings: SettingsType = {
      id: 'singleton',
      uiLanguage: (nextSettings as any).uiLanguage === 'en' ? 'en' : 'ja',
      tags: Array.isArray((nextSettings as any).tags) ? (nextSettings as any).tags : [],
    }
    setSettings(patchedSettings)
    setUiLanguage(patchedSettings.uiLanguage)
    return normalizedEntries.length
  }

  async function onSave() {
    setStatus('')
    if (uiLanguage !== 'ja') {
      setModalMessage('日本語以外の表示言語は今後対応予定です。')
      return
    }
    const next: SettingsType = { id: 'singleton', uiLanguage, tags: settings?.tags ?? [] }
    await db.settings.put(next)
    setSettings(next)
    setStatus('保存しました。')
  }

  async function onAddTag() {
    setStatus('')
    const raw = tagsText.trim()
    if (!raw) return
    const nextTag = raw.replace(/\s+/g, ' ')
    const current = settings ?? (await getSettings())
    if ((current.tags ?? []).includes(nextTag)) {
      setModalMessage('そのタグは既に登録済みです。')
      return
    }
    const nextTags = Array.from(new Set([...(current.tags ?? []), nextTag])).sort((a, b) => a.localeCompare(b))
    const next: SettingsType = { ...current, tags: nextTags }
    await db.settings.put(next)
    setSettings(next)
    setTagsText('')
    setSelectedTag(nextTag)
    setStatus('タグを追加しました。')
  }

  async function onRemoveTag(tag: string) {
    setStatus('')
    const current = settings ?? (await getSettings())
    const nextTags = (current.tags ?? []).filter((t) => t !== tag)
    const next: SettingsType = { ...current, tags: nextTags }
    await db.settings.put(next)
    setSettings(next)
    setSelectedTag('')
    setStatus('タグを削除しました。')
  }

  async function onExportJson() {
    setIoStatus('')
    try {
      const payload = await buildLocalPayload()

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `known-only-translate-backup-${ts}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setIoStatus(`エクスポートしました（${payload.entries.length}件）。`)
    } catch (e: any) {
      setIoStatus(`エクスポートに失敗しました: ${e?.message ?? String(e)}`)
    }
  }

  async function onImportJson(file: File | null) {
    if (!file) return
    setIoStatus('')
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const nextEntries: Entry[] = Array.isArray(raw?.entries) ? (raw.entries as Entry[]) : []
      const ok = window.confirm(
        `インポートすると現在の単語帳データを全て上書きします（削除→復元）。\n\nインポート件数: ${nextEntries.length}\n\n続行しますか？`,
      )
      if (!ok) return
      const n = await restoreFromPayload(raw)
      setIoStatus(`インポートしました（${n}件）。`)
    } catch (e: any) {
      setIoStatus(`インポートに失敗しました: ${e?.message ?? String(e)}`)
    }
  }

  async function onSignUp() {
    setCloudStatus('')
    if (!supabase) {
      setCloudStatus('Supabaseが未設定です（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）。')
      return
    }
    const email = authEmail.trim()
    const password = authPassword
    if (!email || !password) {
      setCloudStatus('メールアドレスとパスワードを入力してください。')
      return
    }
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setCloudStatus(`サインアップに失敗しました: ${error.message}`)
      return
    }
    setCloudStatus('サインアップしました。確認メールが有効な場合はメールを確認してください。')
  }

  async function onSignIn() {
    setCloudStatus('')
    if (!supabase) {
      setCloudStatus('Supabaseが未設定です（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）。')
      return
    }
    const email = authEmail.trim()
    const password = authPassword
    if (!email || !password) {
      setCloudStatus('メールアドレスとパスワードを入力してください。')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setCloudStatus(`ログインに失敗しました: ${error.message}`)
      return
    }
    setAuthPassword('')
    setCloudStatus('ログインしました。')
  }

  async function onSignOut() {
    setCloudStatus('')
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      setCloudStatus(`ログアウトに失敗しました: ${error.message}`)
      return
    }
    setCloudStatus('ログアウトしました。')
  }

  async function onCloudSave() {
    setCloudStatus('')
    if (!supabase) {
      setCloudStatus('Supabaseが未設定です（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）。')
      return
    }
    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes.user) {
      setCloudStatus('先にログインしてください。')
      return
    }

    try {
      const payload = await buildLocalPayload()
      const ok = window.confirm(
        `クラウドへ保存します（上書き）。\n\n保存件数: ${payload.entries.length}\n\n続行しますか？`,
      )
      if (!ok) return

      const { error } = await supabase
        .from('user_state')
        .upsert({ user_id: userRes.user.id, data: payload, updated_at: new Date().toISOString() })

      if (error) {
        setCloudStatus(`クラウド保存に失敗しました: ${error.message}`)
        return
      }
      setCloudStatus(`クラウドへ保存しました（${payload.entries.length}件）。`)
    } catch (e: any) {
      setCloudStatus(`クラウド保存に失敗しました: ${e?.message ?? String(e)}`)
    }
  }

  async function onCloudRestore() {
    setCloudStatus('')
    if (!supabase) {
      setCloudStatus('Supabaseが未設定です（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）。')
      return
    }
    const { data: userRes } = await supabase.auth.getUser()
    if (!userRes.user) {
      setCloudStatus('先にログインしてください。')
      return
    }

    try {
      const { data, error } = await supabase.from('user_state').select('data, updated_at').eq('user_id', userRes.user.id).maybeSingle()
      if (error) {
        setCloudStatus(`クラウド取得に失敗しました: ${error.message}`)
        return
      }
      if (!data?.data) {
        setCloudStatus('クラウドに保存データがありません。')
        return
      }
      const nextEntries: Entry[] = Array.isArray((data.data as any)?.entries) ? ((data.data as any).entries as Entry[]) : []
      const ok = window.confirm(
        `クラウドから復元します（上書き：削除→復元）。\n\n復元件数: ${nextEntries.length}\n\nクラウド更新日時: ${data.updated_at ?? '不明'}\n\n続行しますか？`,
      )
      if (!ok) return

      const n = await restoreFromPayload(data.data)
      setCloudStatus(`クラウドから復元しました（${n}件）。`)
    } catch (e: any) {
      setCloudStatus(`クラウド復元に失敗しました: ${e?.message ?? String(e)}`)
    }
  }

  return (
    <section className="page">
      <h2>設定</h2>
      {modalMessage && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="メッセージ"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMessage(null)
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>メッセージ</h3>
            <div className="output" style={{ marginBottom: 12 }}>
              {modalMessage}
            </div>
            <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="primary" onClick={() => setModalMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {view === 'home' && (
        <div className="card">
          <div style={{ display: 'grid', gap: 10 }}>
            <button
              className="secondary"
              onClick={() => {
                resetStatuses()
                setView('language')
              }}
            >
              表示言語
            </button>
            <button
              className="secondary"
              onClick={() => {
                resetStatuses()
                setView('tags')
              }}
            >
              タグ設定
            </button>
            <button
              className="secondary"
              onClick={() => {
                resetStatuses()
                setView('backup')
              }}
            >
              バックアップ
            </button>
          </div>
        </div>
      )}

      {view !== 'home' && (
        <div className="row wrap" style={{ marginBottom: 6 }}>
          <button
            className="secondary"
            onClick={() => {
              resetStatuses()
              setView('home')
            }}
          >
            戻る
          </button>
        </div>
      )}

      {view === 'language' && (
        <div className="card">
          <h3>表示言語</h3>
          <label className="field">
            <span className="label">アプリの表示言語</span>
            <select value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value as 'ja' | 'en')}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </label>

          <div className="row">
            <button className="primary" onClick={onSave}>
              保存
            </button>
            <div className="status" role="status" aria-live="polite">
              {status}
            </div>
          </div>
        </div>
      )}

      {view === 'tags' && (
        <div className="card">
          <h3>タグ設定</h3>
          <label className="field">
            <span className="label">タグを追加</span>
            <div className="row wrap tagFieldRow">
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="例：動物 / 乗り物"
                style={{ flex: '1 1 320px', minWidth: 0 }}
              />
              <button className="primary" onClick={onAddTag}>
                追加
              </button>
            </div>
            <span className="help">ここで追加したタグが「登録」「単語帳のフィルター」で選べます。</span>
          </label>

          <label className="field" style={{ marginTop: 12 }}>
            <span className="label">現在のタグ</span>
            <div className="row wrap tagFieldRow">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                disabled={tags.length === 0}
                style={{ flex: '1 1 320px', minWidth: 0 }}
              >
                <option value="">{tags.length ? '選択してください' : '（なし）'}</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="danger"
                disabled={!selectedTag}
                onClick={() => {
                  if (!selectedTag) return
                  const ok = window.confirm(
                    `タグ「${selectedTag}」を削除しますか？\n\n※単語に付いているタグ（entries.tags）は削除されません。`,
                  )
                  if (!ok) return
                  void onRemoveTag(selectedTag)
                }}
              >
                削除
              </button>
            </div>
          </label>

          <div className="status" role="status" aria-live="polite">
            {status}
          </div>
        </div>
      )}

      {view === 'backup' && (
        <div className="card">
          <h3>バックアップ（JSON）</h3>
          <div className="row wrap">
            <button className="primary" onClick={onExportJson}>
              エクスポート
            </button>
            <label className="chipButton mono" style={{ cursor: 'pointer' }}>
              インポート（上書き）
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => onImportJson(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="status" role="status" aria-live="polite">
              {ioStatus}
            </div>
          </div>
          <div className="help">
            エクスポートは「単語帳（entries）」と「設定（settings: タグ/表示言語名）」を1つのJSONに保存します。インポートは既存データを削除して復元します。
          </div>

          <hr style={{ margin: '16px 0' }} />

          <h3>クラウド同期（Supabase）</h3>
          {!supabase && (
            <div className="help" style={{ marginBottom: 8 }}>
              Supabase未設定です。Vercel（またはローカル）で環境変数 `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。
            </div>
          )}

          <div className="row wrap" style={{ alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 260px', minWidth: 0 }}>
              <span className="label">メール</span>
              <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="field" style={{ flex: '1 1 220px', minWidth: 0 }}>
              <span className="label">パスワード</span>
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" />
            </label>
          </div>

          <div className="row wrap" style={{ marginTop: 8 }}>
            <button className="secondary" onClick={onSignUp} disabled={!supabase}>
              サインアップ
            </button>
            <button className="primary" onClick={onSignIn} disabled={!supabase}>
              ログイン
            </button>
            <button className="secondary" onClick={onSignOut} disabled={!supabase || !userEmail}>
              ログアウト
            </button>
            <div className="status" role="status" aria-live="polite">
              {userEmail ? `ログイン中: ${userEmail}` : '未ログイン'}
            </div>
          </div>

          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="primary" onClick={onCloudSave} disabled={!supabase || !userEmail}>
              クラウドへ保存（上書き）
            </button>
            <button className="secondary" onClick={onCloudRestore} disabled={!supabase || !userEmail}>
              クラウドから復元（上書き）
            </button>
            <div className="status" role="status" aria-live="polite">
              {cloudStatus}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

