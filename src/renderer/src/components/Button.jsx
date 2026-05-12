export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
    secondary:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-300',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base min-h-[48px]',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
