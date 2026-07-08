import { forwardRef } from 'react'
import { FormGroup, InputGroup } from '@blueprintjs/core'

export const Input = forwardRef(function Input(
  { label, id, className = '', error, onChange, onKeyDown, value, type, ...rest },
  ref,
) {
  const inputId = id ?? rest.name

  return (
    <FormGroup
      label={label || undefined}
      helperText={error || undefined}
      intent={error ? 'danger' : undefined}
      className="levapos-input-field"
    >
      <InputGroup
        inputRef={ref}
        id={inputId}
        className={className}
        intent={error ? 'danger' : undefined}
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        {...rest}
      />
    </FormGroup>
  )
})
