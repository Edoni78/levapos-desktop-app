import { Card } from '../components/Card.jsx'
import { PageHeader } from '../components/PageHeader.jsx'
import { sq } from '../locale/sq.js'

export function SettingsPage() {
  return (
    <div className="levapos-page levapos-settings-page">
      <PageHeader title={sq.settings.title} subtitle={sq.settings.subtitle} />

      <Card title={sq.settings.shortcutsTitle}>
        <table className="levapos-settings-shortcuts">
          <tbody>
            {sq.settings.shortcuts.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  <kbd className="levapos-settings-kbd">{row.key}</kbd>
                </th>
                <td>{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title={sq.settings.guideTitle}>
        <ol className="levapos-settings-steps">
          {sq.settings.guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>

      <Card title={sq.settings.tipsTitle}>
        <ul className="levapos-settings-tips">
          {sq.settings.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
