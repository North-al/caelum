import { ScrollArea } from '~/components/ui/scroll-area'


import { FileTreeItem } from './FileTreeItem'


import type { FileNode } from './types'


interface Props {

    data: FileNode[]

}


export const FileTree = ({
                             data
                         }: Props) => {


    return (

        <ScrollArea
            className="
                h-full
            "
        >

            <div
                className="
                    p-2
                "
            >

                {
                    data.map(
                        item => (
                            <FileTreeItem
                                key={
                                    item.id
                                }
                                node={
                                    item
                                }
                            />
                        )
                    )
                }


            </div>

        </ScrollArea>

    )

}