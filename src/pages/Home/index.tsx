import React from 'react'
import { FileTree } from '~/components/App/FileTree'


const mockData = [
    {
        id: '1',
        name: 'React',
        type: 'folder',
        path: 'notes/react',

        children: [
            {
                id: '2',
                name: 'router.md',
                type: 'file',
                path: 'notes/react/router.md'
            }
        ]
    },

    {
        id: '3',
        name: 'todo.md',
        type: 'file',
        path: 'notes/todo.md'
    }
]


const Home: React.FC = () => {
    return (
        <div className="flex w-full h-full">
            {/*历史记录*/ }
            <aside
                className="
                w-64
                border-r
                h-full
            "
            >

                <FileTree
                    data={
                        mockData
                    }
                />

            </aside>

            <div>
                123
            </div>
            {/*    编辑区*/ }
        </div>
    )
}

export default Home