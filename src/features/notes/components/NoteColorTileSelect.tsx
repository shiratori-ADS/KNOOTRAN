import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type NoteColorOption = {
  label: string
  value: string
}

type Props = {
  label: string
  options: readonly NoteColorOption[]
  value: string
  onChange: (color: string) => void
  ariaLabel: string
  title?: string
  menuWidth?: number
  /** ラベル文言を noteToolbarLabel / noteTableToolbarSubLabel のどちらで出すか */
  labelClassName?: string
  groupClassName?: string
}

type MenuPos = { top: number; left: number }

function resolveOptionValue(current: string, options: readonly NoteColorOption[]): string {
  const cur = current.trim().toLowerCase().replace(/\s+/g, '')
  if (!cur) {
    const empty = options.find((o) => !o.value)
    return empty ? '' : (options[0]?.value ?? '')
  }

  for (const c of options) {
    if (!c.value) continue
    if (cur === c.value.toLowerCase()) return c.value
    const probe = document.createElement('span')
    probe.style.backgroundColor = c.value
    if (cur === probe.style.backgroundColor.trim().toLowerCase().replace(/\s+/g, '')) {
      return c.value
    }
  }
  return options[0]?.value ?? ''
}

export function NoteColorTileSelect({
  label,
  options,
  value,
  onChange,
  ariaLabel,
  title,
  menuWidth = 104,
  labelClassName = 'noteToolbarLabel',
  groupClassName = 'noteToolbarGroup',
}: Props) {
  const resolved = resolveOptionValue(value, options)
  const selected = options.find((c) => c.value === resolved) ?? options[0]
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0 })
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()

  function updateMenuPos() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 4
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8)
    const top = rect.bottom + gap
    setMenuPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPos()
  }, [open, menuWidth])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      updateMenuPos()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, menuWidth])

  if (!selected) return null

  return (
    <span className={`${groupClassName} noteColorPicker`} ref={rootRef}>
      <span className={labelClassName}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="noteColorTrigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={title ?? ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={selected.value ? 'noteColorTile' : 'noteColorTile isNone'}
          style={selected.value ? { backgroundColor: selected.value } : undefined}
          aria-hidden="true"
        >
          {selected.value ? null : '×'}
        </span>
        <span className="noteColorTriggerLabel">{selected.label}</span>
        <span className="noteColorChevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="noteColorMenu"
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              style={{ top: menuPos.top, left: menuPos.left, width: menuWidth, minWidth: menuWidth }}
            >
              {options.map((c) => {
                const active = c.value === resolved
                return (
                  <button
                    key={c.label}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'noteColorOption active' : 'noteColorOption'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(c.value)
                      setOpen(false)
                    }}
                  >
                    <span
                      className={c.value ? 'noteColorTile' : 'noteColorTile isNone'}
                      style={c.value ? { backgroundColor: c.value } : undefined}
                      aria-hidden="true"
                    >
                      {c.value ? null : '×'}
                    </span>
                    <span>{c.label}</span>
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
