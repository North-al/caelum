import { createBrowserRouter, RouterProvider } from 'react-router'

import { routes } from './routes'

export const router = createBrowserRouter(routes)

export const AppRouter = () => {
    return <RouterProvider router={router} />
}