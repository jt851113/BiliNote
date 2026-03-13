import { useTaskStore } from '@/store/taskStore'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { cn } from '@/lib/utils.ts'
import { Trash } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import PinyinMatch from 'pinyin-match'
import Fuse from 'fuse.js'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import LazyImage from "@/components/LazyImage.tsx";
import { FC, useState, useEffect } from 'react'

interface NoteHistoryProps {
  onSelect: (taskId: string) => void
  selectedId: string | null
}

const NoteHistory: FC<NoteHistoryProps> = ({ onSelect, selectedId }) => {
  const tasks = useTaskStore(state => state.tasks)
  const removeTask = useTaskStore(state => state.removeTask)
  const isBatchMode = useTaskStore(state => state.isBatchMode)
  const selectedTaskIds = useTaskStore(state => state.selectedTaskIds)
  const toggleTaskSelection = useTaskStore(state => state.toggleTaskSelection)
  // 确保baseURL没有尾部斜杠
  const baseURL = (String(import.meta.env.VITE_API_BASE_URL || 'api')).replace(/\/$/, '')
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const fuse = new Fuse(tasks, {
    keys: ['audioMeta.title'],
    threshold: 0.4 // 匹配精度（越低越严格）
  })
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rawSearch === '') return
      setSearch(rawSearch)
    }, 300) // 300ms 防抖

    return () => clearTimeout(timer)
  }, [rawSearch])
  const filteredTasks = search.trim()
    ? fuse.search(search).map(result => result.item)
    : tasks
  if (filteredTasks.length === 0) {
    return (
      <>
        <div className="mb-2">
          <input
            type="text"
            placeholder="搜尋筆記標題..."
            className="w-full rounded border border-neutral-300 px-3 py-1 text-sm outline-none focus:border-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 py-6 text-center">
          <p className="text-sm text-neutral-500">暫無紀錄</p>
        </div>
      </>

    )
  }


  return (
    <>
      <div className="mb-2">
        <input
          type="text"
          placeholder="搜尋筆記標題..."
          className="w-full rounded border border-neutral-300 px-3 py-1 text-sm outline-none focus:border-primary"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 overflow-hidden">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            onClick={() => {
              if (isBatchMode) {
                // 批量模式：只選擇成功的任務
                if (task.status === 'SUCCESS') {
                  toggleTaskSelection(task.id)
                }
              } else {
                // 普通模式：切換當前任務
                onSelect(task.id)
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col rounded-md border p-3 transition-all',
              // 批量模式下選中狀態：粗邊框 + 背景色 + 陰影
              isBatchMode && selectedTaskIds.includes(task.id) && 'border-[3px] border-primary bg-primary/5 shadow-md ring-2 ring-primary/20',
              // 批量模式下未選中狀態
              isBatchMode && !selectedTaskIds.includes(task.id) && 'border-neutral-200',
              // 普通模式下選中狀態
              !isBatchMode && selectedId === task.id && 'border-primary bg-primary-light',
              // 普通模式下未選中狀態
              !isBatchMode && selectedId !== task.id && 'border-neutral-200',
              // 禁用狀態
              isBatchMode && task.status !== 'SUCCESS' && 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className={cn('flex items-center gap-4')}
            >
              {/* 批量模式的 Checkbox */}
              {isBatchMode && (
                <Checkbox
                  checked={selectedTaskIds.includes(task.id)}
                  disabled={task.status !== 'SUCCESS'}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (task.status === 'SUCCESS') {
                      toggleTaskSelection(task.id)
                    }
                  }}
                  className="shrink-0"
                />
              )}

              {/* 封面图 */}
              {task.platform === 'local' ? (
                <img
                  src={
                    task.audioMeta.cover_url ? `${task.audioMeta.cover_url}` : '/placeholder.png'
                  }
                  alt="封面"
                  className="h-10 w-12 rounded-md object-cover"
                />
              ) : (
                <LazyImage

                  src={
                    task.audioMeta.cover_url
                      ? `${baseURL}/image_proxy?url=${encodeURIComponent(task.audioMeta.cover_url)}`
                      : '/placeholder.png'
                  }
                  alt="封面"
                />
              )}

              {/* 标题 + 状态 */}

              <div className="flex w-full items-center justify-between gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="line-clamp-2 max-w-[180px] flex-1 overflow-hidden text-sm text-ellipsis">
                        {task.audioMeta.title || '未命名筆記'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{task.audioMeta.title || '未命名筆記'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className={'mt-2 flex items-center justify-between text-[10px]'}>
              <div className="shrink-0">
                {task.status === 'SUCCESS' && (
                  <div className={'bg-primary w-10 rounded p-0.5 text-center text-white'}>
                    已完成
                  </div>
                )}
                {task.status !== 'SUCCESS' && task.status !== 'FAILED' ? (
                  <div className={'w-10 rounded bg-green-500 p-0.5 text-center text-white'}>
                    等待中
                  </div>
                ) : (
                  <></>
                )}
                {task.status === 'FAILED' && (
                  <div className={'w-10 rounded bg-red-500 p-0.5 text-center text-white'}>失敗</div>
                )}
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="small"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          removeTask(task.id)
                        }}
                        className="shrink-0"
                      >
                        <Trash className="text-muted-foreground h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>刪除</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/*<div className="shrink-0">*/}
              {/*  {task.status === 'SUCCESS' && <Badge variant="default">已完成</Badge>}*/}
              {/*  {task.status !== 'SUCCESS' && task.status === 'FAILED' && (*/}
              {/*    <Badge variant="outline">等待中</Badge>*/}
              {/*  )}*/}
              {/*  {task.status === 'FAILED' && <Badge variant="destructive">失敗</Badge>}*/}
              {/*</div>*/}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default NoteHistory
