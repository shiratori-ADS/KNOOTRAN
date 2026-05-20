import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  detectCloudPullConflict,
  getCloudSyncStatus,
  isCloudConfigured,
  pullFromCloudNow,
  pushToCloudNow,
  subscribeCloudSync,
  type CloudPullConflict,
  type CloudSyncStatus,
} from '../lib/cloudAutoSync'

function formatTs(ms: number | null): string {
  if (ms == null) return '—'
  try {
    return new Date(ms).toLocaleString('ja-JP')
  } catch {
    return '—'
  }
}

function formatIso(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ja-JP')
  } catch {
    return iso
  }
}

export function CloudSyncPanel({ onDataRestored }: { onDataRestored?: () => void }) {
  const { email } = useAuth()
  const [status, setStatus] = useState<CloudSyncStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [pullConflict, setPullConflict] = useState<CloudPullConflict | null>(null)

  const refresh = useCallback(async () => {
    try {
      const s = await getCloudSyncStatus()
      setStatus(s)
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeCloudSync(() => {
      void refresh()
    })
  }, [refresh])

  useEffect(() => {
    const t = window.setInterval(() => void refresh(), 8000)
    return () => window.clearInterval(t)
  }, [refresh])

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setMessage('')
    setBusy(true)
    try {
      return await fn()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessage(msg)
      return undefined
    } finally {
      setBusy(false)
    }
  }

  async function onPush() {
    await run(async () => {
      await pushToCloudNow()
      setMessage('クラウドへ保存しました。')
      await refresh()
    })
  }

  async function doPull() {
    await run(async () => {
      await pullFromCloudNow()
      setMessage('クラウドから復元しました。')
      onDataRestored?.()
      await refresh()
    })
  }

  async function onPullClick() {
    setMessage('')
    try {
      const conflict = await detectCloudPullConflict()
      if (conflict) {
        setPullConflict(conflict)
        return
      }
      const ok = window.confirm(
        'クラウドの内容で、この端末の単語帳を上書きします。\n\n続行しますか？',
      )
      if (!ok) return
      await doPull()
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }

  if (!isCloudConfigured()) {
    return (
      <p className="help">
        クラウド同期を使うには <code>.env</code> に Supabase の URL と anon キーを設定してください。ログインは{' '}
        <strong>設定画面ではなくアプリ起動時</strong>に行います。
      </p>
    )
  }

  const s = status

  return (
    <>
      <p className="help" style={{ marginTop: 0 }}>
        アカウント: <span className="mono">{email ?? s?.email ?? '—'}</span>
        。変更は数秒以内に自動でクラウドへ保存されます。
      </p>

      <ul className="help" style={{ margin: '0 0 12px', paddingLeft: 18 }}>
        <li>
          この端末: {s?.localEntryCount ?? '—'} 件
          {s?.hasLocalChanges ? '（未同期の変更あり）' : ''}
        </li>
        <li>
          クラウド: {s?.cloudEntryCount != null ? `${s.cloudEntryCount} 件` : '取得できませんでした'}
          {s?.cloudUpdatedAt ? `（更新: ${formatIso(s.cloudUpdatedAt)}）` : ''}
        </li>
        <li>最終アップロード: {formatTs(s?.lastPushedAt ?? null)}</li>
        <li>最終ダウンロード: {formatTs(s?.lastPulledAt ?? null)}</li>
      </ul>

      <div className="row wrap">
        <button type="button" className="primary" disabled={busy} onClick={() => void onPush()}>
          今すぐクラウドへ保存
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => void onPullClick()}>
          クラウドから復元
        </button>
      </div>

      <details className="help" style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer' }}>競合（データの食い違い）について</summary>
        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
          {`複数のブラウザ・端末で同時に編集すると、どちらの内容を正とするか曖昧になります。
「クラウドから復元」で未同期の変更があるときは確認ダイアログが出ます。
最後にクラウドへ保存した内容が残ります（単語ごとのマージはしません）。`}
        </div>
      </details>

      {message ? (
        <div className="status" role="status" aria-live="polite" style={{ marginTop: 10 }}>
          {message}
        </div>
      ) : null}

      {pullConflict ? (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="同期の競合"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPullConflict(null)
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>同期の競合</h3>
            <p className="help" style={{ whiteSpace: 'pre-wrap' }}>
              {`この端末に未同期の変更があります（${pullConflict.localEntryCount} 件）。
クラウドには別の内容（${pullConflict.cloudEntryCount} 件${
                pullConflict.cloudUpdatedAt ? `、${formatIso(pullConflict.cloudUpdatedAt)} 更新` : ''
              }）があります。`}
            </p>
            <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" disabled={busy} onClick={() => setPullConflict(null)}>
                キャンセル
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setPullConflict(null)
                  void onPush()
                }}
              >
                この端末をクラウドへ送る
              </button>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => {
                  setPullConflict(null)
                  void doPull()
                }}
              >
                クラウドで上書き
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
