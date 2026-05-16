import { Card as BpCard, H5 } from '@blueprintjs/core'

export function Card({ title, subtitle, children, className = '' }) {
  return (
    <BpCard className={className} elevation={1}>
      {(title || subtitle) && (
        <div className="levapos-mb-md">
          {title ? <H5 className="levapos-page-title" style={{ margin: 0 }}>{title}</H5> : null}
          {subtitle ? <p className="levapos-page-subtitle">{subtitle}</p> : null}
        </div>
      )}
      {children}
    </BpCard>
  )
}
