import { Outlet } from 'react-router'
import { ThemeSync } from '~/components/App/ThemeSync'

export const Layouts = () => {
  return (
    <main className="h-full w-full">
      <ThemeSync />
      <Outlet />
    </main>
  )
}