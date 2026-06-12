import { useEffect, useMemo, useState } from 'react'
import { db, getSettings } from '../db/db'
import type { Entry, Settings as SettingsType, UiLanguage } from '../db/types'
import { parseExcelImportB } from '../lib/excelImportB'
import { markLocalDirty } from '../lib/cloudAutoSync'
import { normalizeToken } from '../lib/normalize'
import { CloudSyncPanel } from '../components/CloudSyncPanel'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function Settings() {
  const [view, setView] = useState<'home' | 'language' | 'tags' | 'bulkImport' | 'cloud'>('home')
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('ja')
  const [tagsText, setTagsText] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [excelStatus, setExcelStatus] = useState('')
  const [excelErrors, setExcelErrors] = useState<Array<{ rowNumber: number; foreignLemma: string; message: string }> | null>(null)
  const [excelPendingEntries, setExcelPendingEntries] = useState<Entry[] | null>(null)
  const [excelDuplicates, setExcelDuplicates] = useState<Array<{ foreignLemma: string; existingId: number }> | null>(null)
  /** Excel取り込みでタグ設定へ自動追加した内容の説明（同一画面に残す） */
  const [excelImportTagNotice, setExcelImportTagNotice] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setUiLanguage(s.uiLanguage)
    })
  }, [])

  const tags = useMemo(() => {
    return (settings?.tags ?? []).map((t) => t.trim()).filter(Boolean)
  }, [settings?.tags])

  function resetStatuses() {
    setStatus('')
    setExcelStatus('')
    setExcelImportTagNotice(null)
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
    markLocalDirty()
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
    markLocalDirty()
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
    markLocalDirty()
    setSelectedTag('')
    setStatus('タグを削除しました。')
  }

  async function confirmRemoveTag(tag: string) {
    const usedCount = await db.entries.where('tags').equals(tag).count()
    if (usedCount > 0) {
      window.alert(
        `タグ「${tag}」は単語に使用されているため削除できません（${usedCount}件）。\n\n単語側のタグを先に外してください。`,
      )
      return false
    }
    return window.confirm(`タグ「${tag}」を削除しますか？\n\n（このタグは単語には使用されていません）\n\n続行しますか？`)
  }

  /** Excel一括登録の各行タグのうち、タグ設定に無いものを設定へ追加。追加したタグ名を返す */
  async function mergeTagsFromExcelEntries(entries: Entry[]): Promise<string[]> {
    const current = settings ?? (await getSettings())
    const existing = new Set((current.tags ?? []).map((t) => t.trim()).filter(Boolean))
    const fromImport = new Set<string>()
    for (const e of entries) {
      for (const raw of e.tags ?? []) {
        const x = String(raw).trim().replace(/\s+/g, ' ')
        if (x) fromImport.add(x)
      }
    }
    const missing = [...fromImport].filter((t) => !existing.has(t)).sort((a, b) => a.localeCompare(b))
    if (missing.length === 0) return []

    const nextTags = Array.from(new Set([...(current.tags ?? []), ...missing])).sort((a, b) => a.localeCompare(b))
    const next: SettingsType = { ...current, tags: nextTags }
    await db.settings.put(next)
    setSettings(next)
    markLocalDirty()
    return missing
  }

  async function onImportExcelB(file: File | null) {
    if (!file) return
    setExcelStatus('')
    setExcelErrors(null)
    setExcelPendingEntries(null)
    setExcelDuplicates(null)
    setExcelImportTagNotice(null)

    try {
      const buf = await file.arrayBuffer()
      const parsed = parseExcelImportB(buf)
      if (!parsed.ok) {
        setExcelErrors(parsed.errors)
        return
      }

      const entries = parsed.entries

      const addedTags = await mergeTagsFromExcelEntries(entries)
      const tagNoticeMsg =
        addedTags.length > 0
          ? `タグ設定にない名前がExcelのタグ欄に含まれていました。次のタグを追加しました：${addedTags.join('、')}`
          : null
      if (tagNoticeMsg) setExcelImportTagNotice(tagNoticeMsg)

      // 重複チェック（正規化して同一語なら重複。見出しの大文字小文字の違いは同一とみなす）
      const allExisting = await db.entries.toArray()
      const normToId = new Map<string, number>()
      for (const ex of allExisting) {
        const id = ex.id
        if (id == null) continue
        const primary = normalizeToken(ex.foreignLemma ?? ex.foreignForms?.[0] ?? '')
        if (primary) normToId.set(primary, id)
        for (const f of ex.foreignForms ?? []) {
          const fn = normalizeToken(f)
          if (fn && !normToId.has(fn)) normToId.set(fn, id)
        }
      }

      const dups = entries
        .map((e) => {
          const n = normalizeToken(e.foreignLemma ?? '')
          const id = normToId.get(n)
          return id != null ? { foreignLemma: e.foreignLemma ?? '', existingId: id } : null
        })
        .filter(Boolean) as Array<{ foreignLemma: string; existingId: number }>

      if (dups.length) {
        setExcelPendingEntries(entries)
        setExcelDuplicates(dups)
        return
      }

      // 重複なし → そのまま登録
      if (tagNoticeMsg) setModalMessage(tagNoticeMsg)
      await db.entries.bulkAdd(entries)
      markLocalDirty()
      setExcelStatus(`一括登録しました（${entries.length}件）。`)
    } catch (e: unknown) {
      setExcelStatus(`Excelの読み込みに失敗しました: ${errorMessage(e)}`)
    }
  }

  async function applyExcelImport(mode: 'overwrite' | 'skip') {
    const entries = excelPendingEntries
    const dups = excelDuplicates
    if (!entries || !dups) return
    setExcelStatus('')

    const dupSet = new Set(dups.map((d) => d.foreignLemma))
    const toInsert = entries.filter((e) => !dupSet.has(e.foreignLemma ?? ''))
    const toDup = entries.filter((e) => dupSet.has(e.foreignLemma ?? ''))

    try {
      await db.transaction('rw', db.entries, async () => {
        if (toInsert.length) {
          await db.entries.bulkAdd(toInsert)
        }
        if (toDup.length) {
          if (mode === 'overwrite') {
            const byLemma = new Map(dups.map((d) => [d.foreignLemma, d.existingId]))
            const updates: Entry[] = toDup.map((e) => ({ ...e, id: byLemma.get(e.foreignLemma ?? '') }))
            await db.entries.bulkPut(updates)
          }
          // skip の場合は何もしない
        }
      })

      const imported = toInsert.length + (mode === 'overwrite' ? toDup.length : 0)
      const skipped = mode === 'skip' ? toDup.length : 0
      markLocalDirty()
      setExcelStatus(`一括登録しました（登録/上書き: ${imported}件、スキップ: ${skipped}件）。`)
    } catch (e: unknown) {
      setExcelStatus(`一括登録に失敗しました: ${errorMessage(e)}`)
    } finally {
      setExcelPendingEntries(null)
      setExcelDuplicates(null)
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
                setView('bulkImport')
              }}
            >
              一括登録
            </button>
            <button
              className="secondary"
              onClick={() => {
                resetStatuses()
                setView('cloud')
              }}
            >
              クラウド同期
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
            <select value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value as UiLanguage)}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="el">Ελληνικά</option>
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
                  void (async () => {
                    const ok = await confirmRemoveTag(selectedTag)
                    if (!ok) return
                    await onRemoveTag(selectedTag)
                  })()
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

      {view === 'cloud' && (
        <div className="card">
          <h3>クラウド同期</h3>
          <CloudSyncPanel
            onDataRestored={() => {
              void getSettings().then((s) => {
                setSettings(s)
                setUiLanguage(s.uiLanguage)
              })
            }}
          />
        </div>
      )}


      {view === 'bulkImport' && (
        <div className="card">
          <h3>一括登録（Excel）</h3>
          <div className="row wrap">
            <button
              className="secondary"
              type="button"
              onClick={() => {
                const href = `${import.meta.env.BASE_URL}template.xlsx`
                const a = document.createElement('a')
                a.href = href
                a.download = 'template.xlsx'
                document.body.appendChild(a)
                a.click()
                a.remove()
              }}
            >
              テンプレートをダウンロード
            </button>
            <label className="chipButton mono" style={{ cursor: 'pointer' }}>
              Excelをアップロード
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                onChange={(e) => void onImportExcelB(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="status" role="status" aria-live="polite">
              {excelStatus}
            </div>
          </div>
          {excelImportTagNotice ? (
            <div className="help" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
              {excelImportTagNotice}
            </div>
          ) : null}
          <div className="help">
            `word/noun/adjective/verb` シートを持つテンプレのExcelを想定します。名詞・形容詞/疑問詞・動詞は対応シートに行が無い場合エラーになります。
          </div>
        </div>
      )}

      {/* Excel不足エラー一覧 */}
      {excelErrors && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="一括登録エラー"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExcelErrors(null)
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>一括登録エラー</div>
            <div className="help" style={{ marginBottom: 8 }}>
              word の「何行目の何が不足か」を一覧表示します。
            </div>
            <div style={{ maxHeight: '55svh', overflowY: 'auto' }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {excelErrors.slice(0, 200).map((x, i) => (
                  <li key={`${x.rowNumber}-${x.foreignLemma}-${i}`}>
                    {x.rowNumber ? `word:${x.rowNumber}行 ` : ''}
                    {x.foreignLemma ? `（${x.foreignLemma}） ` : ''}
                    {x.message}
                  </li>
                ))}
              </ul>
              {excelErrors.length > 200 && <div className="help">（先頭200件のみ表示）</div>}
            </div>
            <div className="row wrap" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="primary" onClick={() => setExcelErrors(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel重複確認 */}
      {excelDuplicates && excelPendingEntries && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="重複単語の確認"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setExcelPendingEntries(null)
              setExcelDuplicates(null)
            }
          }}
        >
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>重複単語が見つかりました</div>
            {excelImportTagNotice ? (
              <div className="help" style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                {excelImportTagNotice}
              </div>
            ) : null}
            <div className="help" style={{ marginBottom: 8 }}>
              既に単語帳に存在するlemmaです。上書き/スキップ/キャンセルを選んでください。
            </div>
            <div style={{ maxHeight: '45svh', overflowY: 'auto' }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {excelDuplicates.slice(0, 200).map((d) => (
                  <li key={`${d.existingId}-${d.foreignLemma}`}>{d.foreignLemma}</li>
                ))}
              </ul>
              {excelDuplicates.length > 200 && <div className="help">（先頭200件のみ表示）</div>}
            </div>
            <div className="row wrap" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                className="secondary"
                onClick={() => {
                  setExcelPendingEntries(null)
                  setExcelDuplicates(null)
                  setExcelStatus('キャンセルしました。')
                }}
              >
                キャンセル
              </button>
              <button className="secondary" onClick={() => void applyExcelImport('skip')}>
                スキップ
              </button>
              <button className="primary" onClick={() => void applyExcelImport('overwrite')}>
                上書き
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

