# 一括登録テンプレ（案B: 品詞ごとに別シート）

Excel / Googleスプレッドシートで **タブ（シート）を分けて入力**し、最後にTSV/CSVとしてエクスポートして取り込む想定のテンプレです。

現時点のアプリは **JSONバックアップのインポート**のみ対応なので、このテンプレは「入力フォーマット案（設計）」です。
次の実装で、このTSV/CSVをアプリにアップロードして一括登録できるようにします。

## 使い方（Googleスプレッドシート）

1. 新しいスプレッドシートを作成
2. タブを作り、各 `import-template_B_*.tsv` を開いて内容を全コピー
3. スプレッドシートのA1に貼り付け
4. `ファイル > ダウンロード > タブ区切り形式(.tsv)`（タブごとに出力）

## ルール

- **必須**: `foreignLemma`, `pos`, `meaningJa`
- `meaningJa` は複数OK（`;` 区切り）
- `tags` は複数OK（`,` 区切り）
- `examples` は複数行OK（`foreign<TAB>ja` を `\\n` で連結）
  - 例: `Πονάει το κεφάλι μου.\t頭が痛い。\\nΑγοράζω μήλο.\tりんごを買う。`
- 活用は **入力した分だけ** `inflectionOverrides` に入れる（空欄OK）

## シート構成

- `import-template_B_words.tsv`: 共通項目（全品詞）
- `import-template_B_verbs.tsv`: 動詞（活用上書き）
- `import-template_B_nouns.tsv`: 名詞（性＋活用上書き）
- `import-template_B_adjectives.tsv`: 形容詞/疑問詞（活用上書き）
- `import-template_B_others.tsv`: 副詞/前置詞/接続詞/その他（必要なら備考用）

