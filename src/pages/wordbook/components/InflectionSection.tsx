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
  if (!(selected.pos === 'verb' || selected.pos === 'noun' || selected.pos === 'adjective')) return null

  const lemma = normalizeToken(selected.foreignLemma ?? '')
  if (!lemma) return <span className="subtle">見出し語が未入力です。</span>

  if (selected.pos === 'verb') {
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
    const aorPastEnds = (s: string) => (stripGreekTonos(s).endsWith('σα') ? ['σα', 'σες', 'σε', 'σαμε', 'σατε', 'σαν'] : ['α', 'ες', 'ε', 'αμε', 'ατε', 'αν'])
    const aorFutEnds = (s: string) =>
      stripGreekTonos(s).endsWith('σω') || stripGreekTonos(s).endsWith('σεις') || stripGreekTonos(s).endsWith('σει')
        ? ['σω', 'σεις', 'σει', 'σουμε', 'σετε', 'σουν']
        : ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε']
    const aorImpEnds = (s: string) =>
      stripGreekTonos(s).endsWith('σε') || stripGreekTonos(s).endsWith('στε')
        ? ['σε', 'στε']
        : stripGreekTonos(s).endsWith('ξε') || stripGreekTonos(s).endsWith('ξτε') || stripGreekTonos(s).endsWith('ψε') || stripGreekTonos(s).endsWith('ψτε')
          ? ['ξε', 'ξτε', 'ψε', 'ψτε']
          : []
    const m = verbMatrix(lemma, selected.inflectionType)
    const a = verbAoristMatrix(lemma, selected.inflectionType)
    const imp = verbImperativeForms(lemma, selected.inflectionType)
    if (!m) return <span className="subtle">この活用タイプは未対応です。</span>
    const o: any = selected.inflectionOverrides ?? {}
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
                  const an = (o[anKey] as string | undefined) ?? r.aorNa
                  const aorImp =
                    r.person === '2sg'
                      ? ((o.v_aor_imp_2sg as string | undefined) ?? imp?.aor2sg ?? '')
                      : r.person === '2pl'
                        ? ((o.v_aor_imp_2pl as string | undefined) ?? imp?.aor2pl ?? '')
                        : ''
                  return (
                    <tr key={`aor-${r.person}`}>
                      <td>{personLabel(r.person)}</td>
                      <td className="mono greek">{renderEndingRed(pres, ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε'])}</td>
                      <td className="mono greek">{renderEndingRed(ap, aorPastEnds(ap))}</td>
                      <td className="mono greek">{renderEndingRed(af, aorFutEnds(af))}</td>
                      <td className="mono greek">{renderEndingRed(an, aorFutEnds(an))}</td>
                      <td className="mono greek">{aorImp ? renderEndingRed(aorImp, aorImpEnds(aorImp)) : ''}</td>
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
                const na = (o[naKey] as string | undefined) ?? r.na
                const presImp =
                  r.person === '2sg'
                    ? ((o.v_imp_2sg as string | undefined) ?? imp?.pres2sg ?? '')
                    : r.person === '2pl'
                      ? ((o.v_imp_2pl as string | undefined) ?? imp?.pres2pl ?? '')
                      : ''
                return (
                  <tr key={r.person}>
                    <td>{personLabel(r.person)}</td>
                    <td className="mono greek">{renderEndingRed(pres, ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε'])}</td>
                    <td className="mono greek">{renderEndingRed(past, ['α', 'ες', 'ε', 'αμε', 'ατε', 'αν'])}</td>
                    <td className="mono greek">{renderEndingRed(fut, ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε'])}</td>
                    <td className="mono greek">{renderEndingRed(na, ['ω', 'εις', 'ει', 'ουμε', 'ετε', 'ουν', 'ουνε'])}</td>
                    <td className="mono greek">{presImp ? renderEndingRed(presImp, ['ε', 'ετε']) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  if (selected.pos === 'adjective') {
    const a = adjectiveMatrix(lemma)
    const o = selected.inflectionOverrides ?? {}
    const hasOverrides = Object.keys(o).some((k) => k.startsWith('a_') && typeof (o as any)[k] === 'string' && (o as any)[k].trim())
    if (!a && !hasOverrides) return <span className="subtle">この形容詞タイプは未対応です（いまは -ος のみ）。</span>

    const headers = a?.headers ?? ['男', '女', '中']
    const get = (k: keyof typeof o, fallback: string) => (((o as any)[k] as string | undefined) ?? fallback).toString()
    const row = (idx: number, col: number) => a?.rows?.[idx]?.cells?.[col] ?? ''
    const lemmaPlain = stripGreekTonos(lemma)
    const adjType = lemmaPlain.endsWith('υς') ? 'adj_-υς' : 'adj_-ος'
    const endingFor = (r: number, c: number): string => {
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

