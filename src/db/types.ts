export type LanguageCode = string

export type PartOfSpeech =
  | 'noun'
  | 'pronoun_personal'
  | 'adjective'
  | 'verb'
  | 'adverb'
  | 'other'

export type NounGender = 'masc' | 'fem' | 'neut' | 'common_mf'

// とりあえず最小の活用タイプ（後で増やす前提で string に寄せる）
export type InflectionType =
  | 'verb_pres_act_-ω'
  | 'verb_pres_act_-γω_-χω_-χνω'
  | 'verb_pres_act_-πω_-φω_-βω_-εύω'
  | 'verb_pres_act_B1_-άω_-ησα'
  | 'verb_pres_act_B1_-άω_-εσα'
  | 'verb_pres_act_B1_-άω_-ασα'
  | 'verb_pres_act_B2_-ώ_-ησα'
  | 'verb_pres_act_B2_-ώ_-ασα'
  | 'verb_pres_act_B2_-ώ_-εσα'
  // 男性名詞（GreekNoteベースの最小セット）
  // -ος, -οι（アクセント位置で3分類。ただし(1)/(2)の区別はしない）
  | 'noun_masc_-ος_last'
  | 'noun_masc_-ος_penult'
  | 'noun_masc_-ος_antepenult'
  // -ας, -ες（アクセント/語尾ヒューリスティックで4分類）
  | 'noun_masc_-ας_penult'
  | 'noun_masc_-ας_antepenult'
  | 'noun_masc_-ας_disyllabic'
  | 'noun_masc_-ας_istas_ias'
  // -ης, -ες（2分類）
  | 'noun_masc_-ης_last'
  | 'noun_masc_-ης_penult'
  // -ης, -εις（2分類。-ηδες は判別困難なのでここへ寄せる）
  | 'noun_masc_-ης_-εις_last'
  | 'noun_masc_-ης_-εις_penult'

  // 女性名詞（主格単数の語尾で5パターン）
  | 'noun_fem_-α'
  | 'noun_fem_-ά'
  | 'noun_fem_-η'
  | 'noun_fem_-ος'
  | 'noun_fem_-ού'

  // 中性名詞（GreekNoteベース）
  // -ο, -α（アクセント移動の有無は見出し語だけでは確定できないため、生成側で複数候補を許容）
  | 'noun_2nd_neut_-ο'
  // -ος, -η（アクセント位置で挙動が変わる。生成側で複数候補を許容）
  | 'noun_2nd_neut_-ος'
  // -ι, -ια（属格で語尾にトノスが出る）
  | 'noun_neut_-ι'
  // -ί, -ιά（トノス常に語末）
  | 'noun_neut_-ί'
  // -υ（複数が -ια / -υα の2系統）
  | 'noun_neut_-υ_-ια'
  | 'noun_neut_-υ_-υα'
  // -μα, -ματα（音節数でアクセント移動が変わる）
  | 'noun_neut_-μα_2syll'
  | 'noun_neut_-μα_3plus'
  // -μο, -ματα（-μα(3音節以上)とほぼ同様）
  | 'noun_neut_-μο'
  | 'none'

export type Entry = {
  id?: number
  pos: PartOfSpeech
  meaningJaPrimary: string
  meaningJaVariants: string[]
  tags?: string[]
  memo?: string
  nounGender?: NounGender
  inflectionType?: InflectionType
  /**
   * 活用マトリックスの手動上書き（キーは最小ルール用）
   * - 動詞: v_1sg / v_2sg / v_3sg / v_1pl / v_2pl / v_3pl
   * - 名詞:
   *   - 単数: n_nom_sg / n_gen_sg / n_acc_sg
   *   - 複数: n_nom_pl / n_gen_pl / n_acc_pl
   * - 形容詞（最小）:
   *   - 単数: a_m_nom_sg / a_m_gen_sg / a_m_acc_sg / a_f_nom_sg / a_f_gen_sg / a_f_acc_sg / a_n_nom_sg / a_n_gen_sg / a_n_acc_sg
   *   - 複数: a_m_nom_pl / a_m_gen_pl / a_m_acc_pl / a_f_nom_pl / a_f_gen_pl / a_f_acc_pl / a_n_nom_pl / a_n_gen_pl / a_n_acc_pl
   */
  inflectionOverrides?: Partial<
    Record<
      | 'v_1sg'
      | 'v_2sg'
      | 'v_3sg'
      | 'v_1pl'
      | 'v_2pl'
      | 'v_3pl'
      | 'v_past_1sg'
      | 'v_past_2sg'
      | 'v_past_3sg'
      | 'v_past_1pl'
      | 'v_past_2pl'
      | 'v_past_3pl'
      | 'v_fut_1sg'
      | 'v_fut_2sg'
      | 'v_fut_3sg'
      | 'v_fut_1pl'
      | 'v_fut_2pl'
      | 'v_fut_3pl'
      | 'v_na_1sg'
      | 'v_na_2sg'
      | 'v_na_3sg'
      | 'v_na_1pl'
      | 'v_na_2pl'
      | 'v_na_3pl'
      | 'v_aor_past_1sg'
      | 'v_aor_past_2sg'
      | 'v_aor_past_3sg'
      | 'v_aor_past_1pl'
      | 'v_aor_past_2pl'
      | 'v_aor_past_3pl'
      | 'v_aor_fut_1sg'
      | 'v_aor_fut_2sg'
      | 'v_aor_fut_3sg'
      | 'v_aor_fut_1pl'
      | 'v_aor_fut_2pl'
      | 'v_aor_fut_3pl'
      | 'v_aor_na_1sg'
      | 'v_aor_na_2sg'
      | 'v_aor_na_3sg'
      | 'v_aor_na_1pl'
      | 'v_aor_na_2pl'
      | 'v_aor_na_3pl'
      | 'v_imp_2sg'
      | 'v_imp_2pl'
      | 'v_aor_imp_2sg'
      | 'v_aor_imp_2pl'
      | 'n_nom_sg'
      | 'n_gen_sg'
      | 'n_acc_sg'
      | 'n_nom_pl'
      | 'n_gen_pl'
      | 'n_acc_pl'
      | 'a_m_nom_sg'
      | 'a_m_gen_sg'
      | 'a_m_acc_sg'
      | 'a_f_nom_sg'
      | 'a_f_gen_sg'
      | 'a_f_acc_sg'
      | 'a_n_nom_sg'
      | 'a_n_gen_sg'
      | 'a_n_acc_sg'
      | 'a_m_nom_pl'
      | 'a_m_gen_pl'
      | 'a_m_acc_pl'
      | 'a_f_nom_pl'
      | 'a_f_gen_pl'
      | 'a_f_acc_pl'
      | 'a_n_nom_pl'
      | 'a_n_gen_pl'
      | 'a_n_acc_pl',
      string
    >
  >
  foreignLemma?: string
  foreignForms: string[]
  examples: ExamplePair[]
  related: string[]
  createdAt: number
  updatedAt: number
}

export type Settings = {
  id: 'singleton'
  /** アプリUIの表示言語（いまは保存のみ。翻訳対象はギリシャ語固定） */
  uiLanguage: 'ja' | 'en'
  tags: string[]
}

export type ExamplePair = {
  foreign: string
  ja: string
}

