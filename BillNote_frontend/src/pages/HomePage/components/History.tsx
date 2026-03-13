import NoteHistory from '@/pages/HomePage/components/NoteHistory.tsx'
import { useTaskStore } from '@/store/taskStore'
import { Clock, Download } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { Button } from '@/components/ui/button.tsx'
import BatchExportBar from '@/pages/HomePage/components/BatchExportBar.tsx'
const History = () => {
  const currentTaskId = useTaskStore(state => state.currentTaskId)
  const setCurrentTask = useTaskStore(state => state.setCurrentTask)
  const isBatchMode = useTaskStore(state => state.isBatchMode)
  const toggleBatchMode = useTaskStore(state => state.toggleBatchMode)
  return (
    <>
      <div className={'flex h-full w-full flex-col gap-4 px-2.5 py-1.5'}>
        {/*生成歷史    */}
        <div className="my-4 flex h-[40px] items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" />
            <h2 className="text-base font-medium text-neutral-900">生成歷史</h2>
          </div>

          {!isBatchMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleBatchMode}
              className="h-8"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              批量導出
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBatchMode}
              className="h-8"
            >
              取消
            </Button>
          )}
        </div>
        <ScrollArea className="w-full sm:h-[480px] md:h-[720px] lg:h-[92%]">
          {/*<div className="w-full flex-1 overflow-y-auto">*/}
          <NoteHistory onSelect={setCurrentTask} selectedId={currentTaskId} />
          {/*</div>*/}
        </ScrollArea>

        {/* 浮動操作欄 */}
        {isBatchMode && <BatchExportBar />}
      </div>
    </>
  )
}

export default History
