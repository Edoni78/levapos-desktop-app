import { forwardRef } from 'react'
import { FormGroup, InputGroup } from '@blueprintjs/core'

export const Input = forwardRef(function Input(
  { label, id, className = '', error, ...rest },
  ref,
) {
  const inputId = id ?? rest.name

  return (
    <FormGroup label={label || undefined} helperText={error || undefined} intent={error ? 'danger' : undefined}>
      <InputGroup
        inputRef={ref}
        id={inputId}
        className={className}
        intent={error ? 'danger' : undefined}
        {...rest}
      />
    </FormGroup>
  )
})
