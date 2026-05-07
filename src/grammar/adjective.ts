import type { Entry } from '../db/types'
import { normalizeToken } from '../lib/normalize'
import { stripGreekTonos } from './accent'

export type AdjectiveAutoForms = {
  a_m_nom_sg: string
  a_m_gen_sg: string
  a_m_acc_sg: string
  a_f_nom_sg: string
  a_f_gen_sg: string
  a_f_acc_sg: string
  a_n_nom_sg: string
  a_n_gen_sg: string
  a_n_acc_sg: string
  a_m_nom_pl: string
  a_m_gen_pl: string
  a_m_acc_pl: string
  a_f_nom_pl: string
  a_f_gen_pl: string
  a_f_acc_pl: string
  a_n_nom_pl: string
  a_n_gen_pl: string
  a_n_acc_pl: string
}

export function adjectiveMatrix(lemmaNorm: string) {
  const lemmaPlain = stripGreekTonos(lemmaNorm)

  // 最小対応:
  // - -ος: μεγάλος → μεγάλη / μεγάλο
  // - -ιος: ποιος → ποια / ποιο
  // - -ύς: βαθύς → βαθιά / βαθύ
  // - πολύς: πολλή / πολύ / πολλοί / πολλές / πολλά（不規則）

  if (lemmaPlain === 'πολυς') {
    return {
      headers: ['男', '女', '中'],
      rows: [
        { label: '単数 ～は', cells: ['πολύς', 'πολλή', 'πολύ'] },
        { label: '単数 ～の', cells: ['πολλού', 'πολλής', 'πολλού'] },
        { label: '単数 ～を', cells: ['πολύ', 'πολλή', 'πολύ'] },
        { label: '複数 ～は', cells: ['πολλοί', 'πολλές', 'πολλά'] },
        { label: '複数 ～の', cells: ['πολλών', 'πολλών', 'πολλών'] },
        { label: '複数 ～を', cells: ['πολλούς', 'πολλές', 'πολλά'] },
      ],
    }
  }

  if (lemmaPlain.endsWith('ιος')) {
    // -ιος の語幹は「-ος」を落とした形（例: ποιος → ποι-）
    const stem = lemmaNorm.slice(0, -2)
    return {
      headers: ['男', '女', '中'],
      rows: [
        { label: '単数 ～は', cells: [`${stem}ος`, `${stem}α`, `${stem}ο`] },
        { label: '単数 ～の', cells: [`${stem}ου`, `${stem}ας`, `${stem}ου`] },
        { label: '単数 ～を', cells: [`${stem}ο`, `${stem}α`, `${stem}ο`] },
        { label: '複数 ～は', cells: [`${stem}οι`, `${stem}ες`, `${stem}α`] },
        { label: '複数 ～の', cells: [`${stem}ων`, `${stem}ων`, `${stem}ων`] },
        { label: '複数 ～を', cells: [`${stem}ους`, `${stem}ες`, `${stem}α`] },
      ],
    }
  }

  if (lemmaPlain.endsWith('ος')) {
    const stem = lemmaNorm.slice(0, -2) // トノス保持
    return {
      headers: ['男', '女', '中'],
      rows: [
        { label: '単数 ～は', cells: [`${stem}ος`, `${stem}η`, `${stem}ο`] },
        { label: '単数 ～の', cells: [`${stem}ου`, `${stem}ης`, `${stem}ου`] },
        { label: '単数 ～を', cells: [`${stem}ο`, `${stem}η`, `${stem}ο`] },
        { label: '複数 ～は', cells: [`${stem}οι`, `${stem}ες`, `${stem}α`] },
        { label: '複数 ～の', cells: [`${stem}ων`, `${stem}ων`, `${stem}ων`] },
        { label: '複数 ～を', cells: [`${stem}ους`, `${stem}ες`, `${stem}α`] },
      ],
    }
  }

  if (lemmaPlain.endsWith('υς')) {
    const stem = lemmaNorm.slice(0, -2)
    return {
      headers: ['男', '女', '中'],
      rows: [
        { label: '単数 ～は', cells: [`${stem}ύς`, `${stem}ιά`, `${stem}ύ`] },
        { label: '単数 ～の', cells: [`${stem}ιού`, `${stem}ιάς`, `${stem}ιού`] },
        { label: '単数 ～を', cells: [`${stem}ύ`, `${stem}ιά`, `${stem}ύ`] },
        { label: '複数 ～は', cells: [`${stem}ιοί`, `${stem}ιές`, `${stem}ιά`] },
        { label: '複数 ～の', cells: [`${stem}ιών`, `${stem}ιών`, `${stem}ιών`] },
        { label: '複数 ～を', cells: [`${stem}ιούς`, `${stem}ιές`, `${stem}ιά`] },
      ],
    }
  }

  return null
}

export function adjectiveAutoForms(lemmaNorm: string): AdjectiveAutoForms | null {
  const m = adjectiveMatrix(lemmaNorm)
  if (!m) return null
  const rows = m.rows
  const sgNom = rows[0]?.cells ?? []
  const sgGen = rows[1]?.cells ?? []
  const sgAcc = rows[2]?.cells ?? []
  const plNom = rows[3]?.cells ?? []
  const plGen = rows[4]?.cells ?? []
  const plAcc = rows[5]?.cells ?? []
  return {
    a_m_nom_sg: sgNom[0] ?? '',
    a_f_nom_sg: sgNom[1] ?? '',
    a_n_nom_sg: sgNom[2] ?? '',
    a_m_gen_sg: sgGen[0] ?? '',
    a_f_gen_sg: sgGen[1] ?? '',
    a_n_gen_sg: sgGen[2] ?? '',
    a_m_acc_sg: sgAcc[0] ?? '',
    a_f_acc_sg: sgAcc[1] ?? '',
    a_n_acc_sg: sgAcc[2] ?? '',
    a_m_nom_pl: plNom[0] ?? '',
    a_f_nom_pl: plNom[1] ?? '',
    a_n_nom_pl: plNom[2] ?? '',
    a_m_gen_pl: plGen[0] ?? '',
    a_f_gen_pl: plGen[1] ?? '',
    a_n_gen_pl: plGen[2] ?? '',
    a_m_acc_pl: plAcc[0] ?? '',
    a_f_acc_pl: plAcc[1] ?? '',
    a_n_acc_pl: plAcc[2] ?? '',
  }
}

function withPlain(forms: string[]) {
  return Array.from(new Set(forms.flatMap((f) => [f, stripGreekTonos(f)])))
}

function maybeAddFinalN(form: string): string[] {
  const plain = stripGreekTonos(form)
  // 疑問形容詞的な語（ποιο(ν), πόσο(ν)）の「-ν」を許容
  if (plain.endsWith('ο')) return [form, `${form}ν`]
  return [form]
}

export function adjectiveFormsForMatch(entry: Entry, lemmaNorm: string): string[] {
  const o: any = entry.inflectionOverrides ?? {}
  const hasOverrides = Object.keys(o).some((k) => k.startsWith('a_') && typeof o[k] === 'string' && o[k].trim())
  if (hasOverrides) {
    const all = Object.keys(o)
      .filter((k) => k.startsWith('a_'))
      .map((k) => normalizeToken(o[k] ?? ''))
      .filter(Boolean)
    // 上書きが「ポιον」等の場合もあるので strip 形も併用
    return withPlain(all)
  }

  const a = adjectiveAutoForms(lemmaNorm)
  if (!a) return []

  const base = Object.values(a).map((x) => normalizeToken(x ?? '')).filter(Boolean)

  // a_m_acc_sg は -ν が付くことがあるので両方許容
  const accMasc = normalizeToken(a.a_m_acc_sg)
  const accMascVariants = accMasc ? maybeAddFinalN(accMasc) : []

  const all = Array.from(new Set([...base.filter((x) => x !== accMasc), ...accMascVariants]))
  return withPlain(all)
}

export function adjectiveMatchesToken(tokenNorm: string, entry: Entry): boolean {
  const lemmaNorm = normalizeToken(entry.foreignLemma ?? '')
  if (!lemmaNorm) return false
  const forms = adjectiveFormsForMatch(entry, lemmaNorm)
  return forms.includes(tokenNorm)
}

