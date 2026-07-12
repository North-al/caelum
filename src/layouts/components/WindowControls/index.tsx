import React from 'react'
import { Copy, Maximize, Minus, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window';
type WindowControlsProps = {}


const baseClass = `cursor-pointer p-3 flex items-center justify-center text-sm text-gray-500 transition duration-200`
const normalClass = `hover:bg-gray-100 dark:hover:bg-zinc-800`
const dangerClass = `hover:bg-red-500 hover:text-white dark:hover:bg-red-600`

export const WindowControls: React.FC<WindowControlsProps> = () => {

    const [isMaximized, setIsMaximized] = useState(false)

    useEffect(() => {
        const appWindow = getCurrentWindow()

        // 初始化状态
        appWindow.isMaximized().then(setIsMaximized)
        console.log(`WindowControls: isMaximized=${isMaximized}`)

        const unlistenPromise = appWindow.onResized(async () => {
            const maximized = await appWindow.isMaximized()
            setIsMaximized(maximized)
            console.log(`WindowControls: onResized: isMaximized=${maximized}`)
        })

        return () => {
            unlistenPromise.then(unlisten => unlisten())
        }
    }, [])


    const handleClickMaximize = async () => {
        const appWindow = getCurrentWindow()
        await appWindow.toggleMaximize();
        appWindow.isMaximized().then(setIsMaximized)
    }

    const handleClickMinus = async () => {
        await getCurrentWindow().minimize();
    }

    const handleClickClose = async () => {
        await getCurrentWindow().close();
    }


    return (
        <div className="flex items-center justify-end">
            <button
                className={`${baseClass} ${normalClass}`}
                title="最小化"
                onClick={handleClickMinus}
            >
                <Minus size={16} />
            </button>

            <button
                className={`${baseClass} ${normalClass}`}
                title={isMaximized ? "还原" : "最大化"}
                onClick={handleClickMaximize}
            >
                {/* 根据最大化状态动态切换图标 */}
                {isMaximized ? <Copy size={16} className="rotate-180" /> : <Maximize size={16} />}
            </button>

            <button
                className={`${baseClass} ${dangerClass}`}
                title="关闭"
                onClick={handleClickClose}
            >
                <X size={16} />
            </button>
        </div>
    )
}
