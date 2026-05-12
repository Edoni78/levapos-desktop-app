import { Card } from '../components/Card.jsx'
import { sq } from '../locale/sq.js'

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{sq.settings.title}</h1>
        <p className="text-sm text-slate-600">{sq.settings.subtitle}</p>
      </div>
      <Card title={sq.settings.aboutTitle}>
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
          <li>{sq.settings.about1}</li>
          <li>{sq.settings.about2}</li>
          <li>{sq.settings.about3}</li>
        </ul>
      </Card>
      <Card title={sq.settings.securityTitle}>
        <p className="text-sm text-slate-700">{sq.settings.securityBody}</p>
      </Card>
    </div>
  )
}
