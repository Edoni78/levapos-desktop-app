import { Card } from '../components/Card.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
import { sq } from '../locale/sq.js'

export function SettingsPage() {
  return (
    <div className="levapos-page">
      <PageHeader title={sq.settings.title} subtitle={sq.settings.subtitle} />
      <Card title={sq.settings.aboutTitle}>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li className="levapos-text-muted" style={{ marginBottom: 8 }}>{sq.settings.about1}</li>
          <li className="levapos-text-muted" style={{ marginBottom: 8 }}>{sq.settings.about2}</li>
          <li className="levapos-text-muted">{sq.settings.about3}</li>
        </ul>
      </Card>
      <Card title={sq.settings.securityTitle}>
        <p className="levapos-text-muted" style={{ margin: 0 }}>{sq.settings.securityBody}</p>
      </Card>
    </div>
  )
}
