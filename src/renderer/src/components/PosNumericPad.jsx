import { Button } from '@blueprintjs/core'
import { sq } from '../locale/sq.js'

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
    <div className="levapos-numpad" data-pos-keep-focus>
      <div className="levapos-text-xs" style={{ textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>
        {sq.numpad.title}
      </div>
      <div className="levapos-numpad-grid">
        {KEYS.map((row) => (
          <div key={row.join('')} className="levapos-numpad-row">
            {row.map((d) => (
              <Button
                key={d}
                type="button"
                className="levapos-numpad-key"
                data-pos-keep-focus
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onDigit(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        ))}
        <div className="levapos-numpad-row">
          <Button
            type="button"
            className="levapos-numpad-key"
            data-pos-keep-focus
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onDigit('.')}
          >
            .
          </Button>
          <Button
            type="button"
            className="levapos-numpad-key"
            data-pos-keep-focus
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onDigit('0')}
          >
            0
          </Button>
          <Button
            type="button"
            className="levapos-numpad-key"
            intent="warning"
            data-pos-keep-focus
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBackspace}
          >
            ⌫
          </Button>
        </div>
        <Button
          type="button"
          outlined
          fill
          large
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
