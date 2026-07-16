import React, { lazy, Suspense } from 'react'

import { PageLoading } from '~/components/PageLoading'

/**
 * React Router 页面懒加载
 *
 * 自动包裹 Suspense
 * 以后所有页面统一通过 lazyLoad 导入
 */
export const lazyLoad = (
    loader: () => Promise<{ default: React.ComponentType }>
) => {

    const Component = lazy(loader)

    return (
        <Suspense fallback={ <PageLoading/> }>
            <Component/>
        </Suspense>
    )

}