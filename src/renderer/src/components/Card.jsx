export function Card({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title ? (
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      )}
      {children}
    </div>
  )
}
