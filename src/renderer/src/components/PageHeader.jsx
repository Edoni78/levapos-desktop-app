export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="levapos-page-header">
      <div>
        <h1 className="levapos-page-title">{title}</h1>
        {subtitle ? <p className="levapos-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="levapos-row">{actions}</div> : null}
    </div>
  )
}
