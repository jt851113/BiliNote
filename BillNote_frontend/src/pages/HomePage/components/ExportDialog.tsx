import { FC, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { FileArchive, FileText, FolderOpen } from 'lucide-react'

interface ExportDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: (format: 'merged' | 'zip' | 'folder') => void
    taskCount: number
}

const ExportDialog: FC<ExportDialogProps> = ({ open, onClose, onConfirm, taskCount }) => {
    const [format, setFormat] = useState<'merged' | 'zip' | 'folder'>('merged')

    const handleConfirm = () => {
        onConfirm(format)
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>選擇導出格式</DialogTitle>
                    <DialogDescription>
                        您已選擇 <strong>{taskCount}</strong> 個任務，請選擇導出格式
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div
                        onClick={() => setFormat('merged')}
                        className={`flex cursor-pointer items-start space-x-3 rounded-lg border-2 p-4 transition-colors ${format === 'merged'
                            ? 'border-primary bg-primary/10'
                            : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">合併為單一文件</div>
                            <p className="text-sm text-muted-foreground">
                                所有筆記合併到一個 Markdown 文件，方便閱讀和編輯
                            </p>
                        </div>
                        <div
                            className={`h-5 w-5 shrink-0 rounded-full border-2 ${format === 'merged'
                                ? 'border-primary bg-primary'
                                : 'border-neutral-300'
                                }`}
                        >
                            {format === 'merged' && (
                                <div className="flex h-full w-full items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-white"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        onClick={() => setFormat('zip')}
                        className={`flex cursor-pointer items-start space-x-3 rounded-lg border-2 p-4 transition-colors ${format === 'zip'
                            ? 'border-primary bg-primary/10'
                            : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                            <FileArchive className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">分別導出為 ZIP</div>
                            <p className="text-sm text-muted-foreground">
                                每個筆記獨立文件，打包為 ZIP 壓縮檔，便於分享和歸檔
                            </p>
                        </div>
                        <div
                            className={`h-5 w-5 shrink-0 rounded-full border-2 ${format === 'zip'
                                ? 'border-primary bg-primary'
                                : 'border-neutral-300'
                                }`}
                        >
                            {format === 'zip' && (
                                <div className="flex h-full w-full items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-white"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        onClick={() => setFormat('folder')}
                        className={`flex cursor-pointer items-start space-x-3 rounded-lg border-2 p-4 transition-colors ${format === 'folder'
                            ? 'border-primary bg-primary/10'
                            : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <FolderOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">導出到指定資料夾</div>
                            <p className="text-sm text-muted-foreground">
                                每個筆記獨立文件，保存到同一個資料夾中
                            </p>
                        </div>
                        <div
                            className={`h-5 w-5 shrink-0 rounded-full border-2 ${format === 'folder'
                                ? 'border-primary bg-primary'
                                : 'border-neutral-300'
                                }`}
                        >
                            {format === 'folder' && (
                                <div className="flex h-full w-full items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-white"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        取消
                    </Button>
                    <Button type="button" onClick={handleConfirm}>
                        確認導出
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ExportDialog
