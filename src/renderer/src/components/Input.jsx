import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  { label, id, className = '', error, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  return (
    <label className="block w-full">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
        {...rest}
      />
      {error ? <p className="mt-1 text-sm text-rose-600">{error}</p> : null}
    </label>
  )
})
