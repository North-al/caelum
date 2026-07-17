export type FileNodeType = 'folder' | 'file'


export interface FileNode {

    id: string

    name: string

    type: FileNodeType

    path: string

    children?: FileNode[]

}