import React from 'react'
import { WindowControls } from './components/WindowControls'

type LayoutsProps = {
    children: React.ReactNode
}

export const Layouts: React.FC<LayoutsProps> = ({ children }) => {
    return (
        <main className="w-full h-full">
            <div data-tauri-drag-region={true} className="w-full flex justify-end items-center">
                <WindowControls></WindowControls>
            </div>
            { children }
        </main>
    )
}