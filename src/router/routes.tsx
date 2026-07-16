import { RouteObject } from 'react-router'
import { Layouts } from '~/layouts'
import { lazyLoad } from '~/router/lazy.tsx'

export const routes: RouteObject[] = [
    {
        path: '/',
        element: <Layouts/>,
        children: [
            {
                index: true,
                element: lazyLoad(() => import('~/pages/Home'))
            }
        ]
    },
]