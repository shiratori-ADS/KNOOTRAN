import type { Entry } from '../../../db/types'
import { normalizeToken } from '../../../lib/normalize'
import { stripGreekTonos } from '../../../grammar/accent'
import {
  adjectiveMatrix,
  endingsByCell,
  nounMatrix,
  renderEndingRed,
  resolveNounTypeForMatrix,
  verbAoristMatrix,
  verbImperativeForms,
  verbMatrix,
} from '../wordbookHelpers'
import { inferNounInflectionTypeFromLemma } from '../../../grammar/infer'

export function InflectionSection({ selected }: { selected: Entry }) {
  if (!(selected.pos === 'verb' || selected.pos === 'noun' || selected.pos === 'adjective' || selected.pos === 'pronoun_interrogative'))
    return null

  const lemma = normalizeToken(selected.foreignLemma ?? '')
  if (!lemma) return <span className="subtle">見出し語が未入力です。</span>

  if (selected.pos === 'verb') {
    const isB1 = (t?: Entry['inflectionType']) =>
      t === 'verb_pres_act_B1_-άω_-ησα' ||
      t === 'verb_pres_act_B1_-άω_-εσα' ||
      t === 'verb_pres_act_B1_-άω_-ασα'
    const isB2 = (t?: Entry['inflectionType']) =>
      t === 'verb_pres_act_B2_-ώ_-ησα' || t === 'verb_pres_act_B2_-ώ_-ασα' || t === 'verb_pres_act_B2_-ώ_-εσα'
    const isAB = (t?: Entry['inflectionType']) => t === 'verb_pres_act_AB'
    const isBImperfect = (t?: Entry['inflectionType']) => isB1(t) || isB2(t) || isAB(t)

    const renderAoristEndingWithMarkerBlue = (form: string, endingsPlain: string[]) => {
      const s = form ?? ''
      if (!s.trim()) return s

      const parts = s.split(/\s+/g)
      const last = parts[parts.length - 1] ?? ''
      const lastPlain = stripGreekTonos(last)
      const sorted = [...endingsPlain].filter(Boolean).sort((a, b) => b.length - a.length)
      const hit = sorted.find((e) => lastPlain.endsWith(e) && lastPlain.length > e.length)
      if (!hit) return s

      const base = last.slice(0, last.length - hit.length)
      const suffix = last.slice(last.length - hit.length)

      // Γ2 アオリスト命令:
      // - 2単: κοιμήσου → 「ή」だけ青、残り「σου」は赤
      // - 2複: κοιμηθείτε → 「ηθ」を青、残り「ειτε」は赤
      if (selected.inflectionType === 'verb_pres_mid_Γ2_-άμαι') {
        const suffixPlain = stripGreekTonos(suffix)
        const head = parts.slice(0, -1).join(' ')
        if (suffixPlain === 'ησου') {
          const blue = suffix.slice(0, 1) // ή
          const red = suffix.slice(1) // σου
          return (
            <>
              {head ? `${head} ` : null}
              {base}
              <span className="endingMarker">{blue}</span>
              <span className="ending">{red}</span>
            </>
          )
        }
        if (suffixPlain === 'ηθειτε') {
          const blue = suffix.slice(0, 2) // ηθ
          const red = suffix.slice(2) // είτε
          return (
            <>
              {head ? `${head} ` : null}
              {base}
              <span className="endingMarker">{blue}</span>
              <span className="ending">{red}</span>
            </>
          )
        }
      }

      // 語尾直前の目印を青で強調（アオリストの目印）
      // - A: σ/ψ/ξ
      // - B1(-ησα): ησ
      // - Γ: στ / ηθ
      const basePlain = stripGreekTonos(base)
      const markerCandidates = ['ησ', 'ηθ', 'στ', 'σ', 'ψ', 'ξ']
      const hitMarker = markerCandidates.find((m) => basePlain.endsWith(m))
      const marker = hitMarker ? base.slice(-hitMarker.length) : ''
      const hasMarker = Boolean(hitMarker)
      const baseNoMarker = hasMarker ? base.slice(0, base.length - marker.length) : base

      const head = parts.slice(0, -1).join(' ')
      return (
        <>
          {head ? `${head} ` : null}
          {baseNoMarker}
          {hasMarker ? <span className="endingMarker">{marker}</span> : null}
          <span className="ending">{suffix}</span>
        </>
      )
    }

    const renderImperfectPastWithMarkerBlue = (form: string, endingsPlain: string[]) => {
      const s = form ?? ''
      if (!s.trim()) return s

      const parts = s.split(/\s+/g)
      const last = parts[parts.length - 1] ?? ''
      const lastPlain = stripGreekTonos(last)
      const sorted = [...endingsPlain].filter(Boolean).sort((a, b) => b.length - a.length)
      const hit = sorted.find((e) => lastPlain.endsWith(e) && lastPlain.length > e.length)
      if (!hit) return s

      const base = last.slice(0, last.length - hit.length)
      const suffix = last.slice(last.length - hit.length)

      // Β1未完了過去: ...ούσ + α/ες/...
      // AB未完了過去: ...γ + α/ες/...（例: έκαιγ-α, έκλαιγ-ες）
      const basePlain = stripGreekTonos(base)
      const isAB = selected.inflectionType === 'verb_pres_act_AB'
      const hasOus = !isAB && basePlain.endsWith('ουσ')
      const hasGamma = isAB && basePlain.endsWith('γ')
      const marker = hasOus ? base.slice(-3) : hasGamma ? base.slice(-1) : ''
      const baseNoMarker = hasOus ? base.slice(0, -3) : hasGamma ? base.slice(0, -1) : base

      const head = parts.slice(0, -1).join(' ')
      return (
        <>
          {head ? `${head} ` : null}
          {baseNoMarker}
          {hasOus || hasGamma ? <span className="endingMarker">{marker}</span> : null}
          <span className="ending">{suffix}</span>
        </>
      )
    }

    const renderPresentImpWithGammaMarkerBlue = (form: string, endingsPlain: string[]) => {
      const s = form ?? ''
      if (!s.trim()) return s

      const parts = s.split(/\s+/g)
      const last = parts[parts.length - 1] ?? ''
      const lastPlain = stripGreekTonos(last)
      const sorted = [...endingsPlain].filter(Boolean).sort((a, b) => b.length - a.length)
      const hit = sorted.find((e) => lastPlain.endsWith(e) && lastPlain.length > e.length)
      if (!hit) return s

      const base = last.slice(0, last.length - hit.length)
      const suffix = last.slice(last.length - hit.length)

      // AB継続命令2単: ...γ + ε（例: καίγ-ε, κλαίγ-ε, τρώγ-ε）
      const basePlain = stripGreekTonos(base)
      const hasGamma = selected.inflectionType === 'verb_pres_act_AB' && basePlain.endsWith('γ')
      const marker = hasGamma ? base.slice(-1) : ''
      const baseNoMarker = hasGamma ? base.slice(0, -1) : base

      const head = parts.slice(0, -1).join(' ')
      return (
        <>
          {head ? `${head} ` : null}
          {baseNoMarker}
          {hasGamma ? <span className="endingMarker">{marker}</span> : null}
          <span className="ending">{suffix}</span>
        </>
      )
    }

    const presEndings = (t?: Entry['inflectionType']) => {
      // Γ（中動態）: λέγομαι/λέγεσαι/λέγεται/λεγόμαστε/λέγεστε/λέγονται
      if (t === 'verb_pres_mid_Γ1_-ομαι') return ['ομαι', 'εσαι', 'εται', 'ομαστε', 'εστε', 'ονται']
      // stripGreekTonos 後の語尾で判定するため、-άμαι → αμαι（例: κοιμάμαι）
      if (t === 'verb_pres_mid_Γ2_-άμαι') return ['αμαι', 'ασαι', 'αται', 'ομαστε', 'αστε', 'ονται']
      // Β1（-άω）: ζητάω/ζητάς/ζητάει/ζητάμε/ζητάτε/ζητάνε
      if (
        t === 'verb_pres_act_B1_-άω_-ησα' ||
        t === 'verb_pres_act_B1_-άω_-εσα' ||
        t === 'verb_pres_act_B1_-άω_-ασα'
      )
        return ['αω', 'ας', 'αει', 'αμε', 'ατε', 'ανε']
      // ΑΒ（-ω だが現在の語尾が -εις ではないタイプ）
      if (t === 'verb_pres_act_AB') return ['ω', 'ς', 'ει', 'με', 'τε', 'ν', 'νε']
      // Β2（-ώ）: δημιουργώ/δημιουργείς/δημιουργεί/δημιουργούμε/δημιουργείτε/δημιουργούν
      // NOTE: stripGreekTonos 後の語尾で判定するため、-είτε → ειτε
      if (isB2(t)) return ['ω', 'εις', 'ει', 'ουμε', 'ειτε', 'ουν']
      return ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε']
    }
    const personLabel = (p: string) => {
      switch (p) {
        case '1sg':
          return '一単'
        case '2sg':
          return '二単'
        case '3sg':
          return '三単'
        case '1pl':
          return '一複'
        case '2pl':
          return '二複'
        case '3pl':
          return '三複'
        default:
          return ''
      }
    }
    // アオリストは「σ/ψ/ξ（目印）」を赤から外し、純粋な人称語尾だけを赤にする
    // 例: αγόρασα → α、αγόρασες → ες、θα αγοράσω → ω、αγόρασε → ε、αγοράστε → τε
    const aorPastEnds = (_s: string) => {
      // Γ: εργάστηκα / κοιμήθηκα は末尾を -ηκα 系として赤くする（目印は別途青）
      if (selected.inflectionType === 'verb_pres_mid_Γ1_-ομαι' || selected.inflectionType === 'verb_pres_mid_Γ2_-άμαι')
        return ['ηκα', 'ηκες', 'ηκε', 'ηκαμε', 'ηκατε', 'ηκαν']
      return ['α', 'ες', 'ε', 'αμε', 'ατε', 'αν']
    }
    const aorFutEnds = (s: string) => {
      if (selected.inflectionType !== 'verb_pres_act_AB') {
        // Γ の2複は -είτε（stripGreekTonos 後は ειτε）
        if (selected.inflectionType === 'verb_pres_mid_Γ1_-ομαι' || selected.inflectionType === 'verb_pres_mid_Γ2_-άμαι')
          return ['ω', 'εις', 'ει', 'ουμε', 'ειτε', 'ουν', 'ουνε']
        return ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε']
      }

      // ABでも、ακούω/καίω などの（Aタイプ相当の）語尾は通常の語尾セットで色付けしたい。
      // ここでは「語尾そのもの」で判定する（例: κάψεις は末尾が -εις で、"σω" 文字列では判定できない）。
      const last = stripGreekTonos((s ?? '').split(/\s+/g).slice(-1)[0] ?? '')
      const looksLikeRegularEndings =
        last.endsWith('εις') ||
        last.endsWith('ει') ||
        last.endsWith('ουμε') ||
        last.endsWith('ετε') ||
        last.endsWith('ουν') ||
        last.endsWith('ουνε')
      return looksLikeRegularEndings ? ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε'] : ['ω', 'ς', 'ει', 'με', 'τε', 'ν', 'νε']
    }
    const aorImpEnds = (_s: string) => {
      // Γ: 2単/2複の語尾を赤くする（stripGreekTonos後）
      if (selected.inflectionType === 'verb_pres_mid_Γ1_-ομαι') return ['ου', 'ειτε']
      if (selected.inflectionType === 'verb_pres_mid_Γ2_-άμαι') return ['ησου', 'ηθειτε']
      return ['ε', 'τε']
    }
    const o: any = selected.inflectionOverrides ?? {}
    const m = verbMatrix(lemma, selected.inflectionType)
    const a = verbAoristMatrix(lemma, selected.inflectionType)
    const imp = verbImperativeForms(lemma, selected.inflectionType)

    // 活用タイプ未対応でも、手入力（上書き）分は表示できるようにする
    if (!m) {
      const get = (k: string) => ((o?.[k] as string | undefined) ?? '').trim()
      const autoNaFromFuture = (s: string) => (s ? s.replace(/^θα\s+/, 'να ') : '')
      const hasAny = Object.keys(o).some((k) => k.startsWith('v_') && typeof o[k] === 'string' && (o[k] as string).trim())
      if (!hasAny) return <span className="subtle">この活用タイプは未対応です。</span>

      const rows = [
        { person: '1sg', label: '一単' },
        { person: '2sg', label: '二単' },
        { person: '3sg', label: '三単' },
        { person: '1pl', label: '一複' },
        { person: '2pl', label: '二複' },
        { person: '3pl', label: '三複' },
      ] as const

      return (
        <>
          <div className="subtle" style={{ marginBottom: 6 }}>
            <span className="matrixSectionTitle">アオリスト</span>
          </div>
          <div className="matrixWrap" style={{ marginBottom: 12 }}>
            <table className="matrix">
              <thead>
                <tr>
                  <th>区分</th>
                  <th>現在</th>
                  <th>過去</th>
                  <th>未来</th>
                  <th>να</th>
                  <th>命令</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pres = get(`v_${r.person}`)
                  const ap = get(`v_aor_past_${r.person}`)
                  const af = get(`v_aor_fut_${r.person}`)
                  const an = get(`v_aor_na_${r.person}`) || autoNaFromFuture(af)
                  const aorImpHere =
                    r.person === '2sg' ? get('v_aor_imp_2sg') : r.person === '2pl' ? get('v_aor_imp_2pl') : ''
                  return (
                    <tr key={`manual-aor-${r.person}`}>
                      <td>{r.label}</td>
                      <td className="mono greek">{pres}</td>
                      <td className="mono greek">{ap}</td>
                      <td className="mono greek">{af}</td>
                      <td className="mono greek">{an}</td>
                      <td className="mono greek">{aorImpHere}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="subtle" style={{ marginBottom: 6 }}>
            <span className="matrixSectionTitle">継続・繰返し</span>
          </div>
          <div className="matrixWrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th>区分</th>
                  <th>現在</th>
                  <th>過去</th>
                  <th>未来</th>
                  <th>να</th>
                  <th>命令</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pres = get(`v_${r.person}`)
                  const past = get(`v_past_${r.person}`)
                  const fut = get(`v_fut_${r.person}`)
                  const na = get(`v_na_${r.person}`) || autoNaFromFuture(fut)
                  const impHere = r.person === '2sg' ? get('v_imp_2sg') : r.person === '2pl' ? get('v_imp_2pl') : ''
                  return (
                    <tr key={`manual-${r.person}`}>
                      <td>{r.label}</td>
                      <td className="mono greek">{pres}</td>
                      <td className="mono greek">{past}</td>
                      <td className="mono greek">{fut}</td>
                      <td className="mono greek">{na}</td>
                      <td className="mono greek">{impHere}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )
    }
    return (
      <>
        {a && (
          <>
            <div className="subtle" style={{ marginBottom: 6 }}>
              <span className="matrixSectionTitle">アオリスト</span>
            </div>
            <div className="matrixWrap" style={{ marginBottom: 12 }}>
            <table className="matrix">
              <thead>
                <tr>
                  <th>区分</th>
                  <th>現在</th>
                  <th>過去</th>
                  <th>未来</th>
                  <th>να</th>
                  <th>命令</th>
                </tr>
              </thead>
              <tbody>
                {a.map((r) => {
                  const presKey = `v_${r.person}` as const
                  const apKey = `v_aor_past_${r.person}` as const
                  const afKey = `v_aor_fut_${r.person}` as const
                  const anKey = `v_aor_na_${r.person}` as const
                  const pres = (o[presKey] as string | undefined) ?? r.pres
                  const ap = (o[apKey] as string | undefined) ?? r.aorPast
                  const af = (o[afKey] as string | undefined) ?? r.aorFut
                  const an =
                    (o[anKey] as string | undefined) ??
                    (af ? af.replace(/^θα\s+/, 'να ') : undefined) ??
                    r.aorNa
                  const aorImp =
                    r.person === '2sg'
                      ? ((o.v_aor_imp_2sg as string | undefined) ?? imp?.aor2sg ?? '')
                      : r.person === '2pl'
                        ? ((o.v_aor_imp_2pl as string | undefined) ?? imp?.aor2pl ?? '')
                        : ''
                  return (
                    <tr key={`aor-${r.person}`}>
                      <td>{personLabel(r.person)}</td>
                      <td className="mono greek">{renderEndingRed(pres, presEndings(selected.inflectionType))}</td>
                      <td className="mono greek">{renderAoristEndingWithMarkerBlue(ap, aorPastEnds(ap))}</td>
                      <td className="mono greek">{renderAoristEndingWithMarkerBlue(af, aorFutEnds(af))}</td>
                      <td className="mono greek">{renderAoristEndingWithMarkerBlue(an, aorFutEnds(an))}</td>
                      <td className="mono greek">{aorImp ? renderAoristEndingWithMarkerBlue(aorImp, aorImpEnds(aorImp)) : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}

        <div className="subtle" style={{ marginBottom: 6 }}>
          <span className="matrixSectionTitle">継続・繰返し</span>
        </div>
        <div className="matrixWrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>区分</th>
                <th>現在</th>
                <th>過去</th>
                <th>未来</th>
                <th>να</th>
                <th>命令</th>
              </tr>
            </thead>
            <tbody>
              {m.map((r) => {
                const presKey = `v_${r.person}` as const
                const pastKey = `v_past_${r.person}` as const
                const futKey = `v_fut_${r.person}` as const
                const naKey = `v_na_${r.person}` as const
                const pres = (o[presKey] as string | undefined) ?? r.pres
                const past = (o[pastKey] as string | undefined) ?? r.past
                const fut = (o[futKey] as string | undefined) ?? r.fut
                const na =
                  (o[naKey] as string | undefined) ??
                  (fut ? fut.replace(/^θα\s+/, 'να ') : undefined) ??
                  r.na
                const presImp =
                  r.person === '2sg'
                    ? ((o.v_imp_2sg as string | undefined) ?? imp?.pres2sg ?? '')
                    : r.person === '2pl'
                      ? ((o.v_imp_2pl as string | undefined) ?? imp?.pres2pl ?? '')
                      : ''
                return (
                  <tr key={r.person}>
                    <td>{personLabel(r.person)}</td>
                    <td className="mono greek">{renderEndingRed(pres, presEndings(selected.inflectionType))}</td>
                    <td className="mono greek">
                      {isBImperfect(selected.inflectionType)
                        ? renderImperfectPastWithMarkerBlue(past, ['α', 'ες', 'ε', 'αμε', 'ατε', 'αν'])
                        : selected.inflectionType === 'verb_pres_mid_Γ1_-ομαι' || selected.inflectionType === 'verb_pres_mid_Γ2_-άμαι'
                          ? renderEndingRed(past, ['ομουν', 'οσουν', 'οταν', 'ομασταν', 'οσασταν', 'ονταν'])
                          : renderEndingRed(past, ['α', 'ες', 'ε', 'αμε', 'ατε', 'αν'])}
                    </td>
                    <td className="mono greek">{renderEndingRed(fut, presEndings(selected.inflectionType))}</td>
                    <td className="mono greek">{renderEndingRed(na, presEndings(selected.inflectionType))}</td>
                    <td className="mono greek">
                      {presImp
                        ? isB1(selected.inflectionType) && r.person === '2pl'
                          ? renderEndingRed(presImp, ['ατε'])
                          : isB1(selected.inflectionType) && r.person === '2sg'
                            ? renderEndingRed(presImp, ['α'])
                          : selected.inflectionType === 'verb_pres_mid_Γ1_-ομαι' && r.person === '2pl'
                            ? renderEndingRed(presImp, ['εστε'])
                          : selected.inflectionType === 'verb_pres_mid_Γ2_-άμαι' && r.person === '2pl'
                            ? renderEndingRed(presImp, ['αστε'])
                          : isB2(selected.inflectionType) && r.person === '2sg'
                            ? '-'
                          : isB2(selected.inflectionType) && r.person === '2pl'
                            ? renderEndingRed(presImp, ['ειτε'])
                          : selected.inflectionType === 'verb_pres_act_AB' && r.person === '2sg'
                            ? renderPresentImpWithGammaMarkerBlue(presImp, ['ε'])
                          : renderEndingRed(presImp, ['ε', 'ετε'])
                        : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  if (selected.pos === 'adjective' || selected.pos === 'pronoun_interrogative') {
    const a = adjectiveMatrix(lemma)
    const o = selected.inflectionOverrides ?? {}
    const hasOverrides = Object.keys(o).some((k) => k.startsWith('a_') && typeof (o as any)[k] === 'string' && (o as any)[k].trim())
    if (!a && !hasOverrides) return <span className="subtle">この形容詞/疑問詞タイプは未対応です。</span>

    const headers = a?.headers ?? ['男', '女', '中']
    const get = (k: keyof typeof o, fallback: string) => (((o as any)[k] as string | undefined) ?? fallback).toString()
    const row = (idx: number, col: number) => a?.rows?.[idx]?.cells?.[col] ?? ''
    const lemmaPlain = stripGreekTonos(lemma)
    const adjType =
      lemmaPlain === 'πολυς' ? 'adj_πολυς' : lemmaPlain.endsWith('υς') ? 'adj_-υς' : lemmaPlain.endsWith('ιος') ? 'adj_-ιος' : 'adj_-ος'
    const endingFor = (r: number, c: number): string => {
      if (adjType === 'adj_πολυς') {
        const map: string[][] = [
          ['υς', 'η', 'υ'],
          ['ου', 'ης', 'ου'],
          ['υ', 'η', 'υ'],
          ['οι', 'ες', 'α'],
          ['ων', 'ων', 'ων'],
          ['ους', 'ες', 'α'],
        ]
        return map[r]?.[c] ?? ''
      }
      if (adjType === 'adj_-υς') {
        // r: 0 sg-nom,1 sg-gen,2 sg-acc,3 pl-nom,4 pl-gen,5 pl-acc
        // c: 0 masc,1 fem,2 neut
        const map: string[][] = [
          ['υς', 'ια', 'υ'],
          ['ιου', 'ιας', 'ιου'],
          ['υ', 'ια', 'υ'],
          ['ιοι', 'ιες', 'ια'],
          ['ιων', 'ιων', 'ιων'],
          ['ιους', 'ιες', 'ια'],
        ]
        return map[r]?.[c] ?? ''
      }
      if (adjType === 'adj_-ιος') {
        // ποιος 系:
        // - 女単: ποια / ποιας / ποια（= α / ας / α を赤字にしたい）
        const map: string[][] = [
          ['ος', 'α', 'ο'],
          ['ου', 'ας', 'ου'],
          ['ο', 'α', 'ο'],
          ['οι', 'ες', 'α'],
          ['ων', 'ων', 'ων'],
          ['ους', 'ες', 'α'],
        ]
        return map[r]?.[c] ?? ''
      }
      // -ος
      const map: string[][] = [
        ['ος', 'η', 'ο'],
        ['ου', 'ης', 'ου'],
        ['ο', 'η', 'ο'],
        ['οι', 'ες', 'α'],
        ['ων', 'ων', 'ων'],
        ['ους', 'ες', 'α'],
      ]
      return map[r]?.[c] ?? ''
    }
    return (
      <div className="matrixWrap">
        <table className="matrix">
        <thead>
          <tr>
            <th></th>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>単数 ～は</td>
            <td className="mono greek">{renderEndingRed(get('a_m_nom_sg' as any, row(0, 0)), [endingFor(0, 0)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_f_nom_sg' as any, row(0, 1)), [endingFor(0, 1)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_n_nom_sg' as any, row(0, 2)), [endingFor(0, 2)])}</td>
          </tr>
          <tr>
            <td>単数 ～の</td>
            <td className="mono greek">{renderEndingRed(get('a_m_gen_sg' as any, row(1, 0)), [endingFor(1, 0)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_f_gen_sg' as any, row(1, 1)), [endingFor(1, 1)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_n_gen_sg' as any, row(1, 2)), [endingFor(1, 2)])}</td>
          </tr>
          <tr>
            <td>単数 ～を</td>
            <td className="mono greek">{renderEndingRed(get('a_m_acc_sg' as any, row(2, 0)), [endingFor(2, 0)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_f_acc_sg' as any, row(2, 1)), [endingFor(2, 1)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_n_acc_sg' as any, row(2, 2)), [endingFor(2, 2)])}</td>
          </tr>
          <tr>
            <td>複数 ～は</td>
            <td className="mono greek">{renderEndingRed(get('a_m_nom_pl' as any, row(3, 0)), [endingFor(3, 0)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_f_nom_pl' as any, row(3, 1)), [endingFor(3, 1)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_n_nom_pl' as any, row(3, 2)), [endingFor(3, 2)])}</td>
          </tr>
          <tr>
            <td>複数 ～の</td>
            <td className="mono greek">{renderEndingRed(get('a_m_gen_pl' as any, row(4, 0)), [endingFor(4, 0)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_f_gen_pl' as any, row(4, 1)), [endingFor(4, 1)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_n_gen_pl' as any, row(4, 2)), [endingFor(4, 2)])}</td>
          </tr>
          <tr>
            <td>複数 ～を</td>
            <td className="mono greek">{renderEndingRed(get('a_m_acc_pl' as any, row(5, 0)), [endingFor(5, 0)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_f_acc_pl' as any, row(5, 1)), [endingFor(5, 1)])}</td>
            <td className="mono greek">{renderEndingRed(get('a_n_acc_pl' as any, row(5, 2)), [endingFor(5, 2)])}</td>
          </tr>
        </tbody>
        </table>
      </div>
    )
  }

  if (selected.pos === 'noun' && selected.nounGender === 'common_mf') {
    const tMasc = inferNounInflectionTypeFromLemma(lemma, 'masc')
    const tFem = inferNounInflectionTypeFromLemma(lemma, 'fem')
    const nMasc = nounMatrix(lemma, tMasc)
    const nFem = nounMatrix(lemma, tFem)
    if (!nMasc && !nFem) return <span className="subtle">この活用タイプは未対応です。</span>
    const endsMasc = endingsByCell[tMasc] ?? undefined
    const endsFem = endingsByCell[tFem] ?? undefined

    const article = (g: 'masc' | 'fem' | 'neut', num: 'sg' | 'pl', kase: 'nom' | 'gen' | 'acc') => {
      if (kase === 'gen' && num === 'pl') return 'των'
      if (g === 'neut') return num === 'sg' ? 'το' : 'τα'
      if (g === 'masc') {
        if (kase === 'nom') return num === 'sg' ? 'ο' : 'οι'
        if (kase === 'gen') return 'του'
        return num === 'sg' ? 'τον' : 'τους'
      }
      // fem
      if (kase === 'nom') return num === 'sg' ? 'η' : 'οι'
      if (kase === 'gen') return 'της'
      return num === 'sg' ? 'την' : 'τις'
    }

    const rowLabel = (num: 'sg' | 'pl') => (num === 'sg' ? '単数' : '複数')

    const cellWithOverrides = (
      g: 'masc' | 'fem',
      num: 'sg' | 'pl',
      kase: 'nom' | 'gen' | 'acc',
      baseForm: string,
      ends?: typeof endsMasc,
    ) => {
      const ov =
        kase === 'nom'
          ? num === 'pl'
            ? selected.inflectionOverrides?.n_nom_pl
            : selected.inflectionOverrides?.n_nom_sg
          : kase === 'gen'
            ? num === 'pl'
              ? selected.inflectionOverrides?.n_gen_pl
              : selected.inflectionOverrides?.n_gen_sg
            : num === 'pl'
              ? selected.inflectionOverrides?.n_acc_pl
              : selected.inflectionOverrides?.n_acc_sg

      const form = ov ?? baseForm
      const display = `${article(g, num, kase)} ${form}`
      if (ov || !ends) return display
      if (kase === 'nom') return renderEndingRed(display, [num === 'pl' ? ends.nomPl : ends.nomSg])
      if (kase === 'gen') return renderEndingRed(display, [num === 'pl' ? ends.genPl : ends.genSg])
      return renderEndingRed(display, [num === 'pl' ? ends.accPl : ends.accSg])
    }
    return (
      <div className="mfStack">
        <div>
          <div className="subtle" style={{ marginBottom: 6 }}>
            男性
          </div>
          {nMasc ? (
            <table className="matrix">
              <thead>
                <tr>
                  <th></th>
                  {['～は', '～の', '～を'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nMasc.rows.map((r) => (
                  <tr key={r.number}>
                    <td>{rowLabel(r.number)}</td>
                    <td className="mono greek">{cellWithOverrides('masc', r.number, 'nom', r.forms.nom, endsMasc)}</td>
                    <td className="mono greek">{cellWithOverrides('masc', r.number, 'gen', r.forms.gen, endsMasc)}</td>
                    <td className="mono greek">{cellWithOverrides('masc', r.number, 'acc', r.forms.acc, endsMasc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="subtle">未対応です。</span>
          )}
        </div>

        <div>
          <div className="subtle" style={{ marginBottom: 6 }}>
            女性
          </div>
          {nFem ? (
            <table className="matrix">
              <thead>
                <tr>
                  <th></th>
                  {['～は', '～の', '～を'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nFem.rows.map((r) => (
                  <tr key={r.number}>
                    <td>{rowLabel(r.number)}</td>
                    <td className="mono greek">{cellWithOverrides('fem', r.number, 'nom', r.forms.nom, endsFem)}</td>
                    <td className="mono greek">{cellWithOverrides('fem', r.number, 'gen', r.forms.gen, endsFem)}</td>
                    <td className="mono greek">{cellWithOverrides('fem', r.number, 'acc', r.forms.acc, endsFem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="subtle">未対応です。</span>
          )}
        </div>
      </div>
    )
  }

  const nounType = resolveNounTypeForMatrix(selected, lemma)
  const n = nounMatrix(lemma, nounType)
  if (!n) return <span className="subtle">この活用タイプは未対応です。</span>
  const ends = endingsByCell[nounType] ?? undefined
  const g = selected.nounGender === 'fem' ? 'fem' : selected.nounGender === 'neut' ? 'neut' : 'masc'
  const article = (num: 'sg' | 'pl', kase: 'nom' | 'gen' | 'acc') => {
    if (kase === 'gen' && num === 'pl') return 'των'
    if (g === 'neut') return num === 'sg' ? 'το' : 'τα'
    if (g === 'masc') {
      if (kase === 'nom') return num === 'sg' ? 'ο' : 'οι'
      if (kase === 'gen') return 'του'
      return num === 'sg' ? 'τον' : 'τους'
    }
    // fem
    if (kase === 'nom') return num === 'sg' ? 'η' : 'οι'
    if (kase === 'gen') return 'της'
    return num === 'sg' ? 'την' : 'τις'
  }
  const rowLabel = (num: 'sg' | 'pl') => (num === 'sg' ? '単数' : '複数')
  return (
    <div className="matrixWrap">
      <table className="matrix">
      <thead>
        <tr>
          <th></th>
          {['～は', '～の', '～を'].map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {n.rows.map((r) => {
          const num = r.number
          const ovNom = num === 'pl' ? selected.inflectionOverrides?.n_nom_pl : selected.inflectionOverrides?.n_nom_sg
          const ovGen = num === 'pl' ? selected.inflectionOverrides?.n_gen_pl : selected.inflectionOverrides?.n_gen_sg
          const ovAcc = num === 'pl' ? selected.inflectionOverrides?.n_acc_pl : selected.inflectionOverrides?.n_acc_sg

          const cell = (kase: 'nom' | 'gen' | 'acc', form: string, ov?: string, ending?: string) => {
            const baseForm = ov ?? form
            const display = `${article(num, kase)} ${baseForm}`
            if (ov || !ends || !ending) return display
            return renderEndingRed(display, [ending])
          }

          return (
            <tr key={r.number}>
              <td>{rowLabel(r.number)}</td>
              <td className="mono greek">{cell('nom', r.forms.nom, ovNom, num === 'pl' ? ends?.nomPl : ends?.nomSg)}</td>
              <td className="mono greek">{cell('gen', r.forms.gen, ovGen, num === 'pl' ? ends?.genPl : ends?.genSg)}</td>
              <td className="mono greek">{cell('acc', r.forms.acc, ovAcc, num === 'pl' ? ends?.accPl : ends?.accSg)}</td>
            </tr>
          )
        })}
      </tbody>
      </table>
    </div>
  )
}

