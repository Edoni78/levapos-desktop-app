import { Button as BpButton } from '@blueprintjs/core'

const variantMap = {
  primary: { intent: 'primary' },
  secondary: { outlined: true },
  danger: { intent: 'danger' },
  outline: { outlined: true },
  ghost: { minimal: true },
}

const sizeMap = {
  sm: 'small',
  md: undefined,
  lg: 'large',
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  ...rest
}) {
  const v = variantMap[variant] ?? variantMap.primary
  const bpSize = sizeMap[size]

  return (
    <BpButton
      type={type}
      disabled={disabled}
      className={className}
      intent={v.intent}
      minimal={v.minimal}
      outlined={v.outlined}
      large={bpSize === 'large'}
      small={bpSize === 'small'}
      {...rest}
    >
      {children}
    </BpButton>
  )
}
