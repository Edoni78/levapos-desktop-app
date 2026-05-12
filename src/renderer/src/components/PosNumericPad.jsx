import { sq } from '../locale/sq.js'
import { Button } from './Button.jsx'

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
]

/**
 * @param {{
 *   onDigit: (d: string) => void
 *   onClear: () => void
 *   onBackspace: () => void
 * }} props
 */
export function PosNumericPad({ onDigit, onClear, onBackspace }) {
  return (
    <div
      className="select-none rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-4 shadow-inner"
      data-pos-keep-focus
    >
      <div className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        {sq.numpad.title}
      </div>
      <div className="mx-auto grid max-w-[280px] gap-2">
        {KEYS.map((row) => (
          <div key={row.join('')} className="grid grid-cols-3 gap-2">
            {row.map((d) => (
              <button
                key={d}
                type="button"
                data-pos-keep-focus
                className="flex h-14 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-md ring-1 ring-slate-200/80 transition hover:bg-emerald-50 hover:text-emerald-900 active:scale-[0.97] active:shadow-inner"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onDigit(d)}
              >
                {d}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            data-pos-keep-focus
            className="flex h-14 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-700 shadow-md ring-1 ring-slate-200/80 transition hover:bg-slate-50 active:scale-[0.97]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onDigit('.')}
          >
            .
          </button>
          <button
            type="button"
            data-pos-keep-focus
            className="flex h-14 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-md ring-1 ring-slate-200/80 transition hover:bg-emerald-50 hover:text-emerald-900 active:scale-[0.97]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            data-pos-keep-focus
            className="flex h-14 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-900 shadow-md ring-1 ring-amber-200/80 transition hover:bg-amber-100 active:scale-[0.97]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBackspace}
          >
            ⌫
          </button>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full font-semibold"
          data-pos-keep-focus
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
        >
          {sq.numpad.clearField}
        </Button>
      </div>
    </div>
  )
}
