import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import OfflineBanner from './OfflineBanner'
import SWPrompt from './SWPrompt'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <OfflineBanner />
      <div className="max-w-lg mx-auto">
        <Outlet />
      </div>
      <BottomNav />
      <SWPrompt />
    </div>
  )
}
