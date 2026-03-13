import React, { FC, useRef, useState } from 'react'
import { SlidersHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'

import { Link } from 'react-router-dom'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { ScrollArea } from "@/components/ui/scroll-area.tsx"
import type { ImperativePanelHandle } from 'react-resizable-panels'
import logo from '@/assets/icon.svg'

interface IProps {
  NoteForm: React.ReactNode
  Preview: React.ReactNode
  History: React.ReactNode
}

const HomeLayout: FC<IProps> = ({ NoteForm, Preview, History }) => {
  const [, setShowSettings] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const panelRef = useRef<ImperativePanelHandle>(null)

  const toggleSidebar = () => {
    const panel = panelRef.current
    if (!panel) return
    if (isCollapsed) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* 左边表单 */}
        <ResizablePanel
          ref={panelRef}
          defaultSize={23}
          minSize={10}
          maxSize={35}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
        >
          <aside className="flex h-full flex-col overflow-hidden border-r border-neutral-200 bg-white">
            <header className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl">
                  <img src={logo} alt="logo" className="h-full w-full object-contain" />
                </div>
                <div className="text-2xl font-bold text-gray-800">BiliNote</div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger onClick={() => setShowSettings(true)}>
                      <Link to={'/settings'}>
                        <SlidersHorizontal className="text-muted-foreground hover:text-primary cursor-pointer" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>全局配置</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleSidebar}
                        className="text-muted-foreground hover:text-primary cursor-pointer rounded-md p-1 transition-colors hover:bg-neutral-100"
                      >
                        <PanelLeftClose className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>收合側邊欄</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </header>
            <ScrollArea className="flex-1 overflow-auto">
              <div className=' p-4' >{NoteForm}</div>
            </ScrollArea>
          </aside>
        </ResizablePanel>

        {/* 左侧面板与中间面板之间的分隔条 + 展开按钮 */}
        <ResizableHandle />
        {isCollapsed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex h-full w-8 items-center justify-center border-r border-neutral-200 bg-white text-muted-foreground transition-colors hover:bg-neutral-50 hover:text-primary"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>展開側邊欄</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 中间历史 */}
        <ResizablePanel defaultSize={16} minSize={10} maxSize={30}>
          <aside className="flex h-full flex-col overflow-hidden border-r border-neutral-200 bg-white">
            <ScrollArea className="flex-1 overflow-auto">
              <div className="">{History}</div>
            </ScrollArea>
          </aside>
        </ResizablePanel>

        <ResizableHandle />

        {/* 右边预览 */}
        <ResizablePanel defaultSize={61} minSize={30}>
          <main className="flex h-full flex-col overflow-hidden bg-white p-6">{Preview}</main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default HomeLayout
