import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface SelectMenuOption<T extends string> {
  label: string
  leading?: ReactNode
  value: T
}

type SelectMenuPlacement = 'bottom-end' | 'right-end' | 'top-start'

interface SelectMenuProps<T extends string> {
  ariaLabel: string
  children: ReactNode
  className?: string
  menuClassName?: string
  onValueChange: (value: T) => void
  options: ReadonlyArray<SelectMenuOption<T>>
  placement?: SelectMenuPlacement
  title?: string
  triggerClassName?: string
  value: T
}

const placementClasses: Record<SelectMenuPlacement, string> = {
  'bottom-end': 'top-full right-0 mt-2',
  'right-end': 'bottom-0 left-full ml-2',
  'top-start': 'bottom-full left-0 mb-2',
}

export function SelectMenu<T extends string>({
  ariaLabel,
  children,
  className = '',
  menuClassName = '',
  onValueChange,
  options,
  placement = 'bottom-end',
  title,
  triggerClassName = '',
  value,
}: SelectMenuProps<T>) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, open])

  const openMenu = (index = selectedIndex) => {
    setActiveIndex(index)
    setOpen(true)
  }

  const closeMenu = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const selectOption = (option: SelectMenuOption<T>) => {
    onValueChange(option.value)
    closeMenu(true)
  }

  const moveActiveOption = (offset: number) => {
    setActiveIndex((current) => (current + offset + options.length) % options.length)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowDown' ? selectedIndex : options.length - 1)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      closeMenu()
    }
  }

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActiveOption(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActiveOption(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(true)
    } else if (event.key === 'Tab') {
      closeMenu()
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        title={title}
        className={triggerClassName}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        {children}
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 grid w-52 gap-1 rounded-panel border border-line bg-surface-raised p-1.5 shadow-panel ${placementClasses[placement]} ${menuClassName}`}
          onKeyDown={handleListboxKeyDown}
        >
          {options.map((option, index) => {
            const selected = option.value === value

            return (
              <button
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={index === activeIndex ? 0 : -1}
                className={`flex min-h-10 items-center gap-3 rounded-control px-3 text-left text-sm font-medium outline-none transition ${
                  selected
                    ? 'bg-brand-soft text-brand-text'
                    : 'text-ink hover:bg-surface-hover focus:bg-surface-hover'
                }`}
                onClick={() => selectOption(option)}
                onFocus={() => setActiveIndex(index)}
                onPointerMove={() => setActiveIndex(index)}
              >
                {option.leading}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected ? <CheckIcon /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
