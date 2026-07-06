import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db, getSettings } from '../../db/db'
import type { Entry, InflectionOverrideKey, InflectionType, NounGender, PartOfSpeech, Settings } from '../../db/types'
import { stripGreekTonos } from '../../grammar/accent'
import { adjectiveFormsForMatch } from '../../grammar/adjective'
import { inferNounInflectionTypeFromLemma, resolveNounInflectionType } from '../../grammar/infer'
import { collectNounTriGenderForms } from '../../grammar/nounTriGender'
import { personalPronounFormsForMatch } from '../../grammar/personalPronoun'
import { findEntryByNormalizedForeign } from '../../lib/entryForeignLookup'
import { normalizeForeignStorage, normalizeToken } from '../../lib/normalize'
import { formatExamplePairsText, parseExamplePairsText } from '../../lib/examples'
import {
  adjectiveAutoForms,
  interrogativeLemmaHasAdjectiveDeclension,
  nounAutoForms,
  personalPronounAutoForms,
  splitLines,
  verbAoristMatrix,
  verbImperativeForms,
  verbInflectionFamily,
  verbMatrix,
} from './wordbookHelpers'
import type { VerbInflectionFamily } from './wordbookHelpers'
import { markLocalDirty } from '../../lib/cloudAutoSync'

export function useWordbookController() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [items, setItems] = useState<Entry[]>([])
  const [selected, setSelected] = useState<Entry | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [filterPos, setFilterPos] = useState<PartOfSpeech | 'all'>('all')
  const [filterTag, setFilterTag] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  /** 空配列＝すべて。例: ['Α','Β'] は Α または Β で始まる語のみ */
  const [filterAlphas, setFilterAlphas] = useState<string[]>([])
  /** 品詞が名詞のときのみ有効。空配列＝すべて */
  const [filterNounGenders, setFilterNounGenders] = useState<NounGender[]>([])
  /** 品詞が動詞のときのみ有効。空配列＝すべて */
  const [filterVerbFamilies, setFilterVerbFamilies] = useState<VerbInflectionFamily[]>([])
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
  const [isMobile, setIsMobile] = useState(false)
  const selectedRef = useRef<Entry | null>(null)
  const selectedId = selected?.id

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

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
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      const current = selectedRef.current
      if (!current) {
        setIsEditing(false)
        setStatus('')
        return
      }
      setStatus('')
      setEditPos(current.pos)
      setEditNounGender(current.nounGender ?? 'masc')
      setEditInflectionType(current.inflectionType ?? 'none')
      setEditOverrides(current.inflectionOverrides ?? {})
      setEditMeaningJaText((current.meaningJaVariants ?? [current.meaningJaPrimary]).join('\n'))
      setEditForeignLemma(current.foreignLemma ?? '')
      setEditExamplesText(formatExamplePairsText(current.examples))
      setEditRelatedText((current.related ?? []).join('\n'))
      setEditTags(current.tags ?? [])
      setEditMemo(current.memo ?? '')
    })
    return () => {
      alive = false
    }
  }, [selectedId])

  const editLemmaNorm = useMemo(() => (editForeignLemma.trim() ? normalizeToken(editForeignLemma) : ''), [editForeignLemma])
  const editLemmaDisplay = useMemo(
    () => (editForeignLemma.trim() ? normalizeForeignStorage(editForeignLemma) : ''),
    [editForeignLemma],
  )

  const inferredEditNounType = useMemo(() => {
    if (!(editPos === 'noun' && editLemmaNorm)) return 'none'
    // 通性（男/女）は推定が1つに定まらないため、編集欄では代表として男性側を使う
    if (editNounGender === 'tri_gender') return 'none'
    const g = editNounGender === 'common_mf' ? 'masc' : editNounGender
    return inferNounInflectionTypeFromLemma(editLemmaNorm, g)
  }, [editPos, editLemmaNorm, editNounGender])

  const autoEditVerb = useMemo(() => {
    if (editPos !== 'verb') return null
    if (!editLemmaNorm) return null
    return verbMatrix(editLemmaDisplay, editInflectionType)
  }, [editPos, editLemmaNorm, editLemmaDisplay, editInflectionType])

  const autoEditAor = useMemo(() => {
    if (editPos !== 'verb') return null
    if (!editLemmaNorm) return null
    return verbAoristMatrix(editLemmaDisplay, editInflectionType)
  }, [editPos, editLemmaNorm, editLemmaDisplay, editInflectionType])

  const autoEditImp = useMemo(() => {
    if (editPos !== 'verb') return null
    if (!editLemmaNorm) return null
    return verbImperativeForms(editLemmaDisplay, editInflectionType)
  }, [editPos, editLemmaNorm, editLemmaDisplay, editInflectionType])

  const autoEditNoun = useMemo(() => {
    if (editPos !== 'noun') return null
    if (!editLemmaNorm) return null
    if (editNounGender === 'tri_gender') return null
    // 通性（男/女）は推定が1つに定まらないため、編集欄では代表として男性側を使う
    const g = editNounGender === 'common_mf' ? 'masc' : editNounGender
    return nounAutoForms(editLemmaDisplay, g, inferredEditNounType)
  }, [editPos, editLemmaNorm, editLemmaDisplay, editNounGender, inferredEditNounType])

  const autoEditAdj = useMemo(() => {
    if (!(editPos === 'adjective' || editPos === 'pronoun_interrogative')) return null
    if (!editLemmaNorm) return null
    if (editPos === 'pronoun_interrogative' && !interrogativeLemmaHasAdjectiveDeclension(editLemmaNorm)) return null
    return adjectiveAutoForms(editLemmaDisplay)
  }, [editPos, editLemmaNorm, editLemmaDisplay])

  const autoEditPp = useMemo(() => {
    if (editPos !== 'pronoun_personal') return null
    return personalPronounAutoForms()
  }, [editPos])

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
    [],
  )

  const alphaKeyForEntry = useCallback((e: Entry) => {
    const raw = (e.foreignLemma ?? e.foreignForms?.[0] ?? '').trim()
    if (!raw) return '#'
    const head = stripGreekTonos(raw.normalize('NFC')).trim()
    const first = (head[0] ?? '').toUpperCase()
    return greekLetters.has(first) ? first : '#'
  }, [greekLetters])

  const entryMatchesSearch = useCallback((e: Entry, queryRaw: string) => {
    const query = normalizeToken(queryRaw)
    if (!query) return true

    const queryPlain = stripGreekTonos(query)
    const foreignTargets = (() => {
      const lemmaNorm = normalizeToken(e.foreignLemma ?? '')
      const raw = [e.foreignLemma, ...(e.foreignForms ?? []), ...Object.values(e.inflectionOverrides ?? {})]

      if (lemmaNorm) {
        if (e.pos === 'verb') {
          const m = verbMatrix(lemmaNorm, e.inflectionType)
          const a = verbAoristMatrix(lemmaNorm, e.inflectionType)
          const imp = verbImperativeForms(lemmaNorm, e.inflectionType)
          if (m) raw.push(...m.flatMap((r) => [r.pres, r.past, r.fut, r.na]))
          if (a) raw.push(...a.flatMap((r) => [r.pres, r.aorPast, r.aorFut, r.aorNa]))
          if (imp) raw.push(imp.pres2sg, imp.pres2pl, imp.aor2sg, imp.aor2pl)
        }

        if (e.pos === 'noun') {
          if (e.nounGender === 'tri_gender') {
            raw.push(...collectNounTriGenderForms(e.inflectionOverrides))
          } else {
            const genders: NounGender[] =
              e.nounGender === 'common_mf' ? ['masc', 'fem'] : e.nounGender ? [e.nounGender] : []
            for (const gender of genders) {
              const type =
                e.nounGender === 'common_mf'
                  ? inferNounInflectionTypeFromLemma(lemmaNorm, gender)
                  : resolveNounInflectionType(e, lemmaNorm)
              const forms = nounAutoForms(lemmaNorm, gender, type)
              if (forms) raw.push(...Object.values(forms))
            }
          }
        }

        if (e.pos === 'adjective' || e.pos === 'pronoun_interrogative') {
          raw.push(...adjectiveFormsForMatch(e, lemmaNorm))
        }

        if (e.pos === 'pronoun_personal') {
          raw.push(...personalPronounFormsForMatch(e))
        }
      }

      return Array.from(new Set(raw.map((x) => normalizeToken(x ?? '')).filter(Boolean)))
    })()
    const meaningTargets = [e.meaningJaPrimary, ...(e.meaningJaVariants ?? [])]
      .map((x) => normalizeToken(x ?? ''))
      .filter(Boolean)

    return (
      foreignTargets.some((x) => x.includes(query) || stripGreekTonos(x).includes(queryPlain)) ||
      meaningTargets.some((x) => x.includes(query))
    )
  }, [])

  const sorted = useMemo(() => {
    const copy = [...items].filter((x) => {
      if (filterPos !== 'all' && x.pos !== filterPos) return false
      if (filterTag !== 'all' && !(x.tags ?? []).includes(filterTag)) return false
      if (!entryMatchesSearch(x, searchQuery)) return false
      if (filterAlphas.length > 0 && !filterAlphas.includes(alphaKeyForEntry(x))) return false
      if (filterPos === 'noun' && filterNounGenders.length > 0) {
        if (!x.nounGender || !filterNounGenders.includes(x.nounGender)) return false
      }
      if (filterPos === 'verb' && filterVerbFamilies.length > 0) {
        const fam = verbInflectionFamily(x.inflectionType)
        if (!fam || !filterVerbFamilies.includes(fam)) return false
      }
      return true
    })
    copy.sort((a, b) => (a.foreignLemma ?? '').localeCompare(b.foreignLemma ?? ''))
    return copy
  }, [
    items,
    filterPos,
    filterTag,
    searchQuery,
    filterAlphas,
    filterNounGenders,
    filterVerbFamilies,
    alphaKeyForEntry,
    entryMatchesSearch,
  ])

  async function onDelete(id?: number) {
    if (!id) return
    await db.entries.delete(id)
    markLocalDirty()
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
    const lemmaStored = editForeignLemma.trim() ? normalizeForeignStorage(editForeignLemma) : ''
    if (lemmaNorm === '') {
      setStatus('「登録する単語」は必須です。')
      return
    }

    const inferGenderForEdit =
      editNounGender === 'common_mf' ? 'masc' : editNounGender === 'tri_gender' ? undefined : editNounGender
    const inferredNounType =
      editPos === 'noun' && editNounGender !== 'tri_gender'
        ? inferNounInflectionTypeFromLemma(lemmaNorm, inferGenderForEdit)
        : 'none'
    const autoNoun =
      editPos === 'noun' && editNounGender !== 'tri_gender' && inferGenderForEdit
        ? nounAutoForms(lemmaNorm, inferGenderForEdit, inferredNounType)
        : null
    const autoVerb = editPos === 'verb' ? verbMatrix(lemmaNorm, editInflectionType) : null
    const autoAor = editPos === 'verb' ? verbAoristMatrix(lemmaNorm, editInflectionType) : null
    const autoImp = editPos === 'verb' ? verbImperativeForms(lemmaNorm, editInflectionType) : null

    const cleanOverrides = (() => {
      const o = { ...(editOverrides ?? {}) }
      const normEq = (a?: string, b?: string) => normalizeToken(a ?? '') === normalizeToken(b ?? '')
      const removeIfAuto = (k: InflectionOverrideKey, auto: string) => {
        const cur = o[k]
        if (cur && normEq(cur, auto)) delete o[k]
      }
      if (autoVerb) {
        for (const r of autoVerb) {
          removeIfAuto(`v_${r.person}`, r.pres)
          removeIfAuto(`v_past_${r.person}`, r.past)
          removeIfAuto(`v_fut_${r.person}`, r.fut)
          removeIfAuto(`v_na_${r.person}`, r.na)
        }
      }
      if (autoAor) {
        for (const r of autoAor) {
          removeIfAuto(`v_aor_past_${r.person}`, r.aorPast)
          removeIfAuto(`v_aor_fut_${r.person}`, r.aorFut)
          removeIfAuto(`v_aor_na_${r.person}`, r.aorNa)
        }
      }
      if (autoImp) {
        const isEditVerbB2 =
          editInflectionType === 'verb_pres_act_B2_-ώ_-ησα' ||
          editInflectionType === 'verb_pres_act_B2_-ώ_-ασα' ||
          editInflectionType === 'verb_pres_act_B2_-ώ_-εσα'
        if (!isEditVerbB2) {
          removeIfAuto('v_imp_2sg', autoImp.pres2sg)
          removeIfAuto('v_imp_2pl', autoImp.pres2pl)
          removeIfAuto('v_aor_imp_2sg', autoImp.aor2sg)
          removeIfAuto('v_aor_imp_2pl', autoImp.aor2pl)
        }
      }
      if (autoNoun) {
        ;(['n_nom_sg', 'n_nom_pl', 'n_acc_sg', 'n_acc_pl', 'n_gen_sg', 'n_gen_pl'] as const).forEach((k) => {
          removeIfAuto(k, autoNoun[k])
          const cur = o[k]
          if (cur && stripGreekTonos(cur) === stripGreekTonos(autoNoun[k])) delete o[k]
        })
      }
      if (editPos === 'pronoun_personal') {
        const autoPp = personalPronounAutoForms()
        for (const k of Object.keys(autoPp)) {
          const kk = k as keyof typeof autoPp
          removeIfAuto(kk, autoPp[kk])
        }
      }
      return o
    })()

    const overrideForms = Object.values(editOverrides ?? {})
      .map((x) => normalizeToken(x ?? ''))
      .filter(Boolean)
    const autoImperativeForms =
      editPos === 'verb' && autoImp
        ? [
            ...(autoVerb ? [autoImp.pres2sg, autoImp.pres2pl] : []),
            ...(autoAor ? [autoImp.aor2sg, autoImp.aor2pl] : []),
          ].map((x) => normalizeToken(x ?? '')).filter(Boolean)
        : []
    const mergedFormsBase = Array.from(new Set([lemmaStored, ...overrideForms, ...autoImperativeForms]))
    const mergedForms =
      editPos === 'pronoun_personal'
        ? Array.from(
            new Set([
              ...mergedFormsBase,
              ...Object.values(personalPronounAutoForms()).map((x) => normalizeToken(x ?? '')).filter(Boolean),
            ]),
          )
        : mergedFormsBase

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
      foreignLemma: lemmaStored ? lemmaStored : undefined,
      foreignForms: mergedForms,
      examples: parseExamplePairsText(editExamplesText),
      related: splitLines(editRelatedText),
      updatedAt: Date.now(),
    }

    await db.entries.put(updated)
    markLocalDirty()
    // 保存直後にUIへ即反映（DBのポーリングを待たない）
    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    setSelected(updated)
    setIsEditing(false)
    setStatus('保存しました。')
  }

  async function lookupRelated(termRaw: string) {
    const term = normalizeToken(termRaw)
    if (!term) return

    const byLemma = await findEntryByNormalizedForeign(term)
    if (byLemma?.id != null) {
      setSelected(byLemma)
      return
    }
    const byMeaning = await db.entries.where('meaningJaVariants').equals(term).first()
    if (byMeaning?.id != null) {
      setSelected(byMeaning)
      return
    }
  }

  const list = {
    filterPos,
    setFilterPos,
    filterTag,
    setFilterTag,
    searchQuery,
    setSearchQuery,
    filterAlphas,
    setFilterAlphas,
    filterNounGenders,
    setFilterNounGenders,
    filterVerbFamilies,
    setFilterVerbFamilies,
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
    autoEditPp,
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
    } as const,
  }
}

