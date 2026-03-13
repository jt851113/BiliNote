import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
}

 function BackendInitDialog({ open }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin w-5 h-5" />
            後端正在初始化中…
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground mt-2">請稍候，系統正在啟動後端服務，出現報錯屬於正常現象</p>
      </DialogContent>
    </Dialog>
  )
}
export default BackendInitDialog