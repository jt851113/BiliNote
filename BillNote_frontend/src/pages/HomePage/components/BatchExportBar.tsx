import { FC, useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Download } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import ExportDialog from './ExportDialog'
import { exportMerged, exportAsZip, exportToFolder } from '@/utils/exportUtils'
import toast from 'react-hot-toast'

const BatchExportBar: FC = () => {
    const [showDialog, setShowDialog] = useState(false)
    const selectedTaskIds = useTaskStore(state => state.selectedTaskIds)
    const getSelectedTasks = useTaskStore(state => state.getSelectedTasks)
    const selectAllTasks = useTaskStore(state => state.selectAllTasks)
    const clearSelection = useTaskStore(state => state.clearSelection)
    const tasks = useTaskStore(state => state.tasks)

    // 只統計成功的任務
    const successTasksCount = tasks.filter(t => t.status === 'SUCCESS').length

    const handleExport = () => {
        if (selectedTaskIds.length === 0) {
            toast.error('請先選擇要導出的任務')
            return
        }
        setShowDialog(true)
    }

    const handleConfirmExport = async (format: 'merged' | 'zip' | 'folder') => {
        const selectedTasks = getSelectedTasks()

        if (selectedTasks.length === 0) {
            toast.error('沒有選中的任務')
            return
        }

        try {
            if (format === 'merged') {
                await exportMerged(selectedTasks)
            } else if (format === 'zip') {
                await exportAsZip(selectedTasks)
            } else if (format === 'folder') {
                await exportToFolder(selectedTasks)
            }
        } catch (error) {
            // 錯誤已在 exportUtils 中處理
            console.error('導出失敗:', error)
        }
    }

    if (selectedTaskIds.length === 0) {
        return null
    }

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg">
                <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            已選擇 <strong className="text-primary">{selectedTaskIds.length}</strong> 個任務
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={selectAllTasks}
                                className="h-auto p-0"
                            >
                                全選 ({successTasksCount})
                            </Button>
                            <span className="text-neutral-300">|</span>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={clearSelection}
                                className="h-auto p-0"
                            >
                                清除
                            </Button>
                        </div>
                    </div>

                    <Button type="button" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        導出
                    </Button>
                </div>
            </div>

            <ExportDialog
                open={showDialog}
                onClose={() => setShowDialog(false)}
                onConfirm={handleConfirmExport}
                taskCount={selectedTaskIds.length}
            />
        </>
    )
}

export default BatchExportBar
