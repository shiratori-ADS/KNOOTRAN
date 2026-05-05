import { useEffect, useMemo, useState } from 'react'
import { db, getSettings } from '../../db/db'
import type { Entry, InflectionType, NounGender, PartOfSpeech, Settings } from '../../db/types'
import { stripGreekTonos } from '../../grammar/accent'
import { inferNounInflectionTypeFromLemma } from '../../grammar/infer'
import { normalizeToken } from '../../lib/normalize'
import { formatExamplePairsText, parseExamplePairsText } from '../../lib/examples'
import { adjectiveAutoForms, nounAutoForms, splitLines, verbAoristMatrix, verbImperativeForms, verbMatrix } from './wordbookHelpers'

export function useWordbookController() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [items, setItems] = useState<Entry[]>([])
  const [selected, setSelected] = useState<Entry | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [filterPos, setFilterPos] = useState<PartOfSpeech | 'all'>('all')
  const [filterTag, setFilterTag] = useState<string | 'all'>('all')
  const [filterAlpha, setFilterAlpha] = useState<string | 'all'>('all')
  const [editPos, setEditPos] = useState<PartOfSpeech>('noun')
  const [editNounGender, setEditNounGender] = useState<NounGender>('masc')
  const [editInflectionType, setEditInflectionType] = useState<InflectionType>('none')
  const [editOverrides, setEditOverrides] = useState<Entry['inflectionOverrides']>({})
  const [editMeaningJaText, setEditMeaningJaText] = useState('')
  const [editForeignLemma, setEditForeignLemma] = useState('')
  const [editExamplesText, setEditExamplesText] = useState('')
  const [editRelatedText, setEditRelatedText] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editMemo, setEditMemo] = useState('')
  const [status, setStatus] = useState('')
  const [lookupStatus, setLookupStatus] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      const all = await db.entries.orderBy('updatedAt').reverse().toArray()
      if (!alive) return
      setItems(all)
      if (selected?.id) {
        const fresh = all.find((x) => x.id === selected.id) ?? null
        setSelected(fresh)
      }
    }
    load()
    const id = window.setInterval(load, 800)
    return () => {
      alive = false
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!selected) {
      setIsEditing(false)
      setStatus('')
      setLookupStatus('')
      return
    }
    setStatus('')
    setLookupStatus('')
    setEditPos(selected.pos)
    setEditNounGender(selected.nounGender ?? 'masc')
    setEditInflectionType(selected.inflectionType ?? 'none')
    setEditOverrides(selected.inflectionOverrides ?? {})
    setEditMeaningJaText((selected.meaningJaVariants ?? [selected.meaningJaPrimary]).join('\n'))
    setEditForeignLemma(selected.foreignLemma ?? '')
    setEditExamplesText(formatExamplePairsText(selected.examples))
    setEditRelatedText((selected.related ?? []).join('\n'))
    setEditTags(selected.tags ?? [])
    setEditMemo(selected.memo ?? '')
  }, [selected?.id])

  const editLemmaNorm = useMemo(() => (editForeignLemma.trim() ? normalizeToken(editForeignLemma) : ''), [editForeignLemma])

  const inferredEditNounType = useMemo(() => {
    if (!(editPos === 'noun' && editLemmaNorm)) return 'none'
    // 通性（男/女）は推定が1つに定まらないため、編集欄では代表として男性側を使う
    const g = editNounGender === 'common_mf' ? 'masc' : editNounGender
    return inferNounInflectionTypeFromLemma(editLemmaNorm, g)
  }, [editPos, editLemmaNorm, editNounGender])

  const autoEditVerb = useMemo(() => {
    if (editPos !== 'verb') return null
    if (!editLemmaNorm) return null
    return verbMatrix(editLemmaNorm, editInflectionType)
  }, [editPos, editLemmaNorm, editInflectionType])

  const autoEditAor = useMemo(() => {
    if (editPos !== 'verb') return null
    if (!editLemmaNorm) return null
    return verbAoristMatrix(editLemmaNorm, editInflectionType)
  }, [editPos, editLemmaNorm, editInflectionType])

  const autoEditImp = useMemo(() => {
    if (editPos !== 'verb') return null
    if (!editLemmaNorm) return null
    return verbImperativeForms(editLemmaNorm, editInflectionType)
  }, [editPos, editLemmaNorm, editInflectionType])

  const autoEditNoun = useMemo(() => {
    if (editPos !== 'noun') return null
    if (!editLemmaNorm) return null
    // 通性（男/女）は推定が1つに定まらないため、編集欄では代表として男性側を使う
    const g = editNounGender === 'common_mf' ? 'masc' : editNounGender
    return nounAutoForms(editLemmaNorm, g, inferredEditNounType)
  }, [editPos, editLemmaNorm, editNounGender, inferredEditNounType])

  const autoEditAdj = useMemo(() => {
    if (editPos !== 'adjective') return null
    if (!editLemmaNorm) return null
    return adjectiveAutoForms(editLemmaNorm)
  }, [editPos, editLemmaNorm])

  const tagOptions = useMemo(() => (settings?.tags ?? []).slice().sort((a, b) => a.localeCompare(b)), [settings?.tags])

  function toggleEditTag(t: string) {
    setEditTags((prev) => {
      const cur = prev ?? []
      return cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    })
  }

  const greekLetters = useMemo(
    () =>
      new Set([
        'Α',
        'Β',
        'Γ',
        'Δ',
        'Ε',
        'Ζ',
        'Η',
        'Θ',
        'Ι',
        'Κ',
        'Λ',
        'Μ',
        'Ν',
        'Ξ',
        'Ο',
        'Π',
        'Ρ',
        'Σ',
        'Τ',
        'Υ',
        'Φ',
        'Χ',
        'Ψ',
        'Ω',
      ]),
    []
  )

  function alphaKeyForEntry(e: Entry) {
    const raw = (e.foreignLemma ?? e.foreignForms?.[0] ?? '').trim()
    if (!raw) return '#'
    const head = stripGreekTonos(raw.normalize('NFC')).trim()
    const first = (head[0] ?? '').toUpperCase()
    return greekLetters.has(first) ? first : '#'
  }

  const sorted = useMemo(() => {
    const copy = [...items].filter((x) => {
      if (filterPos !== 'all' && x.pos !== filterPos) return false
      if (filterTag !== 'all' && !(x.tags ?? []).includes(filterTag)) return false
      if (filterAlpha !== 'all' && alphaKeyForEntry(x) !== filterAlpha) return false
      return true
    })
    copy.sort((a, b) => (a.foreignLemma ?? '').localeCompare(b.foreignLemma ?? ''))
    return copy
  }, [items, filterPos, filterTag, filterAlpha])

  async function onDelete(id?: number) {
    if (!id) return
    await db.entries.delete(id)
    setSelected(null)
  }

  async function onSaveEdit() {
    setStatus('')
    if (!selected?.id) return

    const meaningsRaw = splitLines(editMeaningJaText)
    const meanings = Array.from(new Set(meaningsRaw.map(normalizeToken))).filter(Boolean)
    if (meanings.length === 0) {
      setStatus('「意味（日本語）」は必須です。')
      return
    }

    const lemmaNorm = editForeignLemma.trim() ? normalizeToken(editForeignLemma) : ''
    if (lemmaNorm === '') {
      setStatus('「登録する単語」は必須です。')
      return
    }

    const inferGenderForEdit = editNounGender === 'common_mf' ? 'masc' : editNounGender
    const inferredNounType = editPos === 'noun' ? inferNounInflectionTypeFromLemma(lemmaNorm, inferGenderForEdit) : 'none'
    const autoNoun = editPos === 'noun' ? nounAutoForms(lemmaNorm, inferGenderForEdit, inferredNounType) : null
    const autoVerb = editPos === 'verb' ? verbMatrix(lemmaNorm, editInflectionType) : null
    const autoAor = editPos === 'verb' ? verbAoristMatrix(lemmaNorm, editInflectionType) : null
    const autoImp = editPos === 'verb' ? verbImperativeForms(lemmaNorm, editInflectionType) : null

    const cleanOverrides = (() => {
      const o = { ...(editOverrides ?? {}) }
      const normEq = (a?: string, b?: string) => normalizeToken(a ?? '') === normalizeToken(b ?? '')
      if (autoVerb) {
        for (const r of autoVerb) {
          const presKey = `v_${r.person}` as const
          const pastKey = `v_past_${r.person}` as const
          const futKey = `v_fut_${r.person}` as const
          const naKey = `v_na_${r.person}` as const

          const curPres = (o as any)[presKey]
          if (curPres && normEq(curPres, r.pres)) delete (o as any)[presKey]

          const curPast = (o as any)[pastKey]
          if (curPast && normEq(curPast, r.past)) delete (o as any)[pastKey]

          const curFut = (o as any)[futKey]
          if (curFut && normEq(curFut, r.fut)) delete (o as any)[futKey]

          const curNa = (o as any)[naKey]
          if (curNa && normEq(curNa, r.na)) delete (o as any)[naKey]
        }
      }
      if (autoAor) {
        for (const r of autoAor) {
          const apKey = `v_aor_past_${r.person}` as const
          const afKey = `v_aor_fut_${r.person}` as const
          const anKey = `v_aor_na_${r.person}` as const

          const curAp = (o as any)[apKey]
          if (curAp && normEq(curAp, r.aorPast)) delete (o as any)[apKey]

          const curAf = (o as any)[afKey]
          if (curAf && normEq(curAf, r.aorFut)) delete (o as any)[afKey]

          const curAn = (o as any)[anKey]
          if (curAn && normEq(curAn, r.aorNa)) delete (o as any)[anKey]
        }
      }
      if (autoImp) {
        const curPres2sg = (o as any).v_imp_2sg
        if (curPres2sg && normEq(curPres2sg, autoImp.pres2sg)) delete (o as any).v_imp_2sg
        const curPres2pl = (o as any).v_imp_2pl
        if (curPres2pl && normEq(curPres2pl, autoImp.pres2pl)) delete (o as any).v_imp_2pl
        const curAor2sg = (o as any).v_aor_imp_2sg
        if (curAor2sg && normEq(curAor2sg, autoImp.aor2sg)) delete (o as any).v_aor_imp_2sg
        const curAor2pl = (o as any).v_aor_imp_2pl
        if (curAor2pl && normEq(curAor2pl, autoImp.aor2pl)) delete (o as any).v_aor_imp_2pl
      }
      if (autoNoun) {
        ;(['n_nom_sg', 'n_nom_pl', 'n_acc_sg', 'n_acc_pl', 'n_gen_sg', 'n_gen_pl'] as const).forEach((k) => {
          const cur = (o as any)[k]
          if (cur && normEq(cur, (autoNoun as any)[k])) delete (o as any)[k]
        })
      }
      return o
    })()

    const overrideForms = Object.values(editOverrides ?? {})
      .map((x) => normalizeToken(x ?? ''))
      .filter(Boolean)
    const mergedForms = Array.from(new Set([lemmaNorm, ...overrideForms]))

    const updated: Entry = {
      ...selected,
      pos: editPos,
      nounGender: editPos === 'noun' ? editNounGender : undefined,
      inflectionType: editPos === 'verb' ? editInflectionType : editPos === 'noun' ? inferredNounType : 'none',
      inflectionOverrides: cleanOverrides,
      meaningJaPrimary: meanings[0],
      meaningJaVariants: meanings,
      tags: editTags ?? [],
      memo: editMemo ?? '',
      foreignLemma: lemmaNorm ? lemmaNorm : undefined,
      foreignForms: mergedForms,
      examples: parseExamplePairsText(editExamplesText),
      related: splitLines(editRelatedText),
      updatedAt: Date.now(),
    }

    await db.entries.put(updated)
    // 保存直後にUIへ即反映（DBのポーリングを待たない）
    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    setSelected(updated)
    setIsEditing(false)
    setStatus('保存しました。')
  }

  async function lookupRelated(termRaw: string) {
    setLookupStatus('')
    const term = normalizeToken(termRaw)
    if (!term) return

    const byLemma = await db.entries.where('foreignLemma').equals(term).first()
    if (byLemma?.id != null) {
      setSelected(byLemma)
      return
    }
    const byForm = await db.entries.where('foreignForms').equals(term).first()
    if (byForm?.id != null) {
      setSelected(byForm)
      return
    }
    const byMeaning = await db.entries.where('meaningJaVariants').equals(term).first()
    if (byMeaning?.id != null) {
      setSelected(byMeaning)
      return
    }
    setLookupStatus(`「${termRaw}」は単語帳に未登録です。`)
  }

  const list = {
    filterPos,
    setFilterPos,
    filterTag,
    setFilterTag,
    filterAlpha,
    setFilterAlpha,
    tagOptions,
    sorted,
    totalCount: items.length,
    onSelect: setSelected,
  } as const

  const detailViewProps = selected
    ? ({
        selected,
        isMobile,
        status,
        lookupStatus,
        onBackToList: () => setSelected(null),
        onEdit: () => setIsEditing(true),
        onDelete: () => {
          void onDelete(selected.id)
        },
        onLookupRelated: (term: string) => {
          void lookupRelated(term)
        },
      } as const)
    : null

  const edit = {
    editForeignLemma,
    setEditForeignLemma,
    editPos,
    setEditPos,
    editInflectionType,
    setEditInflectionType,
    editNounGender,
    setEditNounGender,
    editMeaningJaText,
    setEditMeaningJaText,
    editOverrides,
    setEditOverrides,
    autoEditVerb,
    autoEditAor,
    autoEditImp,
    autoEditNoun,
    autoEditAdj,
    editExamplesText,
    setEditExamplesText,
    editRelatedText,
    setEditRelatedText,
    tagOptions,
    editTags,
    toggleEditTag,
    editMemo,
    setEditMemo,
    status,
    onSave: onSaveEdit,
    onCancel: () => {
      setIsEditing(false)
      setStatus('')
    },
  } as const

  return {
    layout: { isMobile } as const,
    selection: { selected, setSelected } as const,
    mode: { isEditing, setIsEditing } as const,
    list,
    detailViewProps,
    edit,
    actions: { onDelete, onSaveEdit, lookupRelated } as const,
    state: {
      settings,
      items,
      status,
      setStatus,
      lookupStatus,
    } as const,
  }
}

