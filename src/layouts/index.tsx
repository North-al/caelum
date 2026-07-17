import React from 'react'
import { WindowControls } from './components/WindowControls'
import { Outlet } from 'react-router'


export const Layouts: React.FC = () => {
    return (
        <main className="w-full h-full">
            <div data-tauri-drag-region={ true } className="w-full flex justify-end items-center">
                <WindowControls></WindowControls>
            </div>
            <main className="w-full h-[calc(100%-40px)]">
                <Outlet/>
            </main>
        </main>
    )
}