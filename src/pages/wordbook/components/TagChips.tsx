export function TagChips({
  tagOptions,
  selectedTags,
  onToggle,
}: {
  tagOptions: string[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}) {
  return (
    <>
      {tagOptions.length ? (
        <div className="chips">
          {tagOptions.map((t) => {
            const selected = (selectedTags ?? []).includes(t)
            return (
              <button
                key={t}
                type="button"
                className="chipButton mono"
                aria-pressed={selected}
                onClick={() => onToggle(t)}
                style={{
                  borderColor: selected ? 'var(--accent-border)' : undefined,
                  background: selected ? 'var(--accent-bg)' : undefined,
                }}
                title="タップでON/OFF"
              >
                {t}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="subtle">（タグが未設定です。「設定」→「タグ設定」で追加してください）</div>
      )}
    </>
  )
}

