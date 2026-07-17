import {
    File,
    FolderOpen
} from 'lucide-react'

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '~/components/ui/collapsible'


import type {
    FileNode
} from './types'


interface Props {

    node: FileNode

    level?: number

}


export const FileTreeItem = ({
                                 node,
                                 level = 0
                             }: Props) => {


    const isFolder = node.type === 'folder'


    return (

        <div>

            {
                isFolder
                    ?

                    <Collapsible>

                        <CollapsibleTrigger
                            className="
                                flex
                                w-full
                                items-center
                                gap-2
                                h-8
                                px-2
                                hover:bg-accent
                                rounded
                            "
                            style={ {
                                paddingLeft:
                                    level * 16 + 8
                            } }
                        >

                            <FolderOpen
                                size={ 16 }
                            />

                            <span>
                                { node.name }
                            </span>


                        </CollapsibleTrigger>


                        <CollapsibleContent>

                            {
                                node.children?.map(
                                    child => (
                                        <FileTreeItem
                                            key={
                                                child.id
                                            }
                                            node={
                                                child
                                            }
                                            level={
                                                level + 1
                                            }
                                        />
                                    )
                                )
                            }


                        </CollapsibleContent>


                    </Collapsible>


                    :

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            h-8
                            px-2
                            hover:bg-accent
                            rounded
                            cursor-pointer
                        "
                        style={ {
                            paddingLeft:
                                level * 16 + 8
                        } }
                    >

                        <File
                            size={ 16 }
                        />

                        <span>
                            { node.name }
                        </span>

                    </div>
            }


        </div>

    )
}