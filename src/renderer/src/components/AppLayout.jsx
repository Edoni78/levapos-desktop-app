import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'

export function AppLayout() {
  return (
    <div className="levapos-app">
      <Sidebar />
      <div className="levapos-main">
        <TopBar />
        <main className="levapos-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
