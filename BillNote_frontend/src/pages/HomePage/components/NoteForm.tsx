/* NoteForm.tsx ---------------------------------------------------- */
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Info, Loader2, Plus } from 'lucide-react'
import { message, Alert } from 'antd'
import { generateNote } from '@/services/note.ts'
import { uploadFile } from '@/services/upload.ts'
import { useTaskStore } from '@/store/taskStore'
import { useModelStore } from '@/store/modelStore'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { noteStyles, noteFormats, videoPlatforms } from '@/constant/note.ts'
import { fetchModels } from '@/services/model.ts'
import { useNavigate } from 'react-router-dom'

/* -------------------- 校验 Schema -------------------- */
const formSchema = z
  .object({
    video_url: z.string().optional(),
    platform: z.string().nonempty('請選擇平台'),
    quality: z.enum(['fast', 'medium', 'slow']),
    screenshot: z.boolean().optional(),
    link: z.boolean().optional(),
    model_name: z.string().nonempty('請選擇模型'),
    format: z.array(z.string()).default([]),
    style: z.string().nonempty('請選擇筆記生成風格'),
    extras: z.string().optional(),
    video_understanding: z.boolean().optional(),
    video_interval: z.coerce.number().min(1).max(30).default(4).optional(),
    grid_size: z
      .tuple([z.coerce.number().min(1).max(10), z.coerce.number().min(1).max(10)])
      .default([3, 3])
      .optional(),
  })
  .superRefine(({ video_url, platform }, ctx) => {
    if (platform === 'local') {
      if (!video_url) {
        ctx.addIssue({ code: 'custom', message: '本地影片路徑不能為空', path: ['video_url'] })
      }
    }
    else {
      if (!video_url) {
        ctx.addIssue({ code: 'custom', message: '影片連結不能為空', path: ['video_url'] })
      }
      else {
        try {
          const url = new URL(video_url)
          if (!['http:', 'https:'].includes(url.protocol))
            throw new Error()
        }
        catch {
          ctx.addIssue({ code: 'custom', message: '請輸入正確的影片連結', path: ['video_url'] })
        }
      }
    }
  })

export type NoteFormValues = z.infer<typeof formSchema>

/* -------------------- 可复用子组件 -------------------- */
const SectionHeader = ({ title, tip }: { title: string; tip?: string }) => (
  <div className="my-3 flex items-center justify-between">
    <h2 className="block">{title}</h2>
    {tip && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="hover:text-primary h-4 w-4 cursor-pointer text-neutral-400" />
          </TooltipTrigger>
          <TooltipContent className="text-xs">{tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
)

const CheckboxGroup = ({
  value = [],
  onChange,
  disabledMap,
}: {
  value?: string[]
  onChange: (v: string[]) => void
  disabledMap: Record<string, boolean>
}) => (
  <div className="flex flex-wrap space-x-1.5">
    {noteFormats.map(({ label, value: v }) => (
      <label key={v} className="flex items-center space-x-2">
        <Checkbox
          checked={value.includes(v)}
          disabled={disabledMap[v]}
          onCheckedChange={checked =>
            onChange(checked ? [...value, v] : value.filter(x => x !== v))
          }
        />
        <span>{label}</span>
      </label>
    ))}
  </div>
)

/* -------------------- 主组件 -------------------- */
const NoteForm = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  /* ---- 全局状态 ---- */
  const { addPendingTask, currentTaskId, setCurrentTask, getCurrentTask, retryTask, isBatchMode, toggleBatchMode } =
    useTaskStore()
  const { loadEnabledModels, modelList, showFeatureHint, setShowFeatureHint } = useModelStore()

  /* ---- 表单 ---- */
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: 'bilibili',
      quality: 'medium',
      model_name: modelList[0]?.model_name || '',
      style: 'minimal',
      video_interval: 4,
      grid_size: [3, 3],
      format: [],
    },
  })
  const currentTask = getCurrentTask()

  /* ---- 派生状态（只 watch 一次，提高性能） ---- */
  const platform = useWatch({ control: form.control, name: 'platform' }) as string
  const videoUnderstandingEnabled = useWatch({ control: form.control, name: 'video_understanding' })
  const editing = currentTask && currentTask.id

  const goModelAdd = () => {
    navigate("/settings/model");
  };
  /* ---- 副作用 ---- */
  useEffect(() => {
    loadEnabledModels()

    return
  }, [])
  useEffect(() => {
    if (!currentTask) return
    const { formData } = currentTask

    console.log('currentTask.formData.platform:', formData.platform)

    form.reset({
      platform: formData.platform || 'bilibili',
      video_url: formData.video_url || '',
      model_name: formData.model_name || modelList[0]?.model_name || '',
      style: formData.style || 'minimal',
      quality: formData.quality || 'medium',
      extras: formData.extras || '',
      screenshot: formData.screenshot ?? false,
      link: formData.link ?? false,
      video_understanding: formData.video_understanding ?? false,
      video_interval: formData.video_interval ?? 4,
      grid_size: formData.grid_size ?? [3, 3],
      format: formData.format ?? [],
    })
  }, [
    // 当下面任意一个变了，就重新 reset
    currentTaskId,
    // modelList 用来兜底 model_name
    modelList.length,
    // 还要加上 formData 的各字段，或者直接 currentTask
    currentTask?.formData,
  ])

  /* ---- 帮助函数 ---- */
  const isGenerating = () => !['SUCCESS', 'FAILED', undefined].includes(getCurrentTask()?.status)
  const generating = isGenerating()
  const handleFileUpload = async (file: File, cb: (url: string) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    setIsUploading(true)
    setUploadSuccess(false)

    try {

      const data = await uploadFile(formData)
      cb(data.url)
      setUploadSuccess(true)
    } catch (err) {
      console.error('上傳失敗:', err)
      // message.error('上傳失敗，請重試')
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (values: NoteFormValues) => {
    console.log('Not even go here')

    // 如果處於批量模式，退出批量模式
    if (isBatchMode) {
      toggleBatchMode()
    }

    const payload: NoteFormValues = {
      ...values,
      provider_id: modelList.find(m => m.model_name === values.model_name)!.provider_id,
      task_id: currentTaskId || '',
    }
    if (currentTaskId) {
      retryTask(currentTaskId, payload)
      return
    }

    // message.success('已提交任务')
    const data = await generateNote(payload)
    addPendingTask(data.task_id, values.platform, payload)
  }
  const onInvalid = (errors: FieldErrors<NoteFormValues>) => {
    console.warn('表单校验失敗：', errors)
    // message.error('请完善所有必填项后再提交')
  }
  const handleCreateNew = () => {
    // 如果處於批量模式，退出批量模式
    if (isBatchMode) {
      toggleBatchMode()
    }

    // 🔁 这里清空当前任务状态
    // 比如调用 resetCurrentTask() 或者 navigate 到一个新页面
    setCurrentTask(null)
  }
  const FormButton = () => {
    const label = generating ? '正在生成…' : editing ? '重新生成' : '生成筆記'

    return (
      <div className="flex gap-2">
        <Button
          type="submit"
          className={!editing ? 'w-full' : 'w-2/3' + ' bg-primary'}
          disabled={generating}
        >
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {label}
        </Button>

        {editing && (
          <Button type="button" variant="outline" className="w-1/3" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            新建筆記
          </Button>
        )}
      </div>
    )
  }

  /* -------------------- 渲染 -------------------- */
  return (
    <div className="h-full w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          {/* 顶部按钮 */}
          <FormButton></FormButton>

          {/* 影片連結 & 平台 */}
          <SectionHeader title="影片連結" tip="支援 B 站、YouTube 等平台" />
          <div className="flex gap-2">
            {/* 平台选择 */}

            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <Select
                    disabled={!!editing}
                    value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {videoPlatforms?.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4">{p.logo()}</div>
                            <span>{p.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage style={{ display: 'none' }} />
                </FormItem>
              )}
            />
            {/* 链接输入 / 上传框 */}
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem className="flex-1">
                  {platform === 'local' ? (
                    <>
                      <Input disabled={!!editing} placeholder="請輸入本地影片路徑" {...field} />
                    </>
                  ) : (
                    <Input disabled={!!editing} placeholder="請輸入影片網站連結" {...field} />
                  )}
                  <FormMessage style={{ display: 'none' }} />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="video_url"
            render={({ field }) => (
              <FormItem className="flex-1">
                {platform === 'local' && (
                  <>
                    <div
                      className="hover:border-primary mt-2 flex h-40 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 transition-colors"
                      onDragOver={e => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={e => {
                        e.preventDefault()
                        const file = e.dataTransfer.files?.[0]
                        if (file) handleFileUpload(file, field.onChange)
                      }}
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'video/*'
                        input.onchange = e => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleFileUpload(file, field.onChange)
                        }
                        input.click()
                      }}
                    >
                      {isUploading ? (
                        <p className="text-center text-sm text-blue-500">上傳中，請稍候…</p>
                      ) : uploadSuccess ? (
                        <p className="text-center text-sm text-green-500">上傳成功！</p>
                      ) : (
                        <p className="text-center text-sm text-gray-500">
                          拖曳檔案到這裡上傳 <br />
                          <span className="text-xs text-gray-400">或點擊選擇檔案</span>
                        </p>
                      )}
                    </div>
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            {/* 模型選擇 */}
            {

              modelList.length > 0 ? (<FormField
                className="w-full"
                control={form.control}
                name="model_name"
                render={({ field }) => (
                  <FormItem>
                    <SectionHeader title="模型選擇" tip="不同模型效果不同，建議自行測試" />
                    <Select
                      onOpenChange={() => {
                        loadEnabledModels()
                      }}
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full min-w-0 truncate">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modelList.map(m => (
                          <SelectItem key={m.id} value={m.model_name}>
                            {m.model_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />) : (
                <FormItem>
                  <SectionHeader title="模型選擇" tip="不同模型效果不同，建議自行測試" />
                  <Button type={'button'} variant={
                    'outline'
                  } onClick={() => { goModelAdd() }}>請先新增模型</Button>
                  <FormMessage />
                </FormItem>
              )
            }

            {/* 筆記風格 */}
            <FormField
              className="w-full"
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <SectionHeader title="筆記風格" tip="選擇生成筆記的呈現風格" />
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full min-w-0 truncate">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {noteStyles.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* 影片理解 */}
          <SectionHeader title="影片理解" tip="將影片截圖發給多模態模型輔助分析" />
          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="video_understanding"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>啟用</FormLabel>
                    <Checkbox
                      checked={videoUnderstandingEnabled}
                      onCheckedChange={v => form.setValue('video_understanding', v)}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* 采样间隔 */}
              <FormField
                control={form.control}
                name="video_interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>取樣間隔（秒）</FormLabel>
                    <Input disabled={!videoUnderstandingEnabled} type="number" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 拼图大小 */}
              <FormField
                control={form.control}
                name="grid_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>拼圖尺寸（列 × 行）</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Input
                        disabled={!videoUnderstandingEnabled}
                        type="number"
                        value={field.value?.[0] || 3}
                        onChange={e => field.onChange([+e.target.value, field.value?.[1] || 3])}
                        className="w-16"
                      />
                      <span>x</span>
                      <Input
                        disabled={!videoUnderstandingEnabled}
                        type="number"
                        value={field.value?.[1] || 3}
                        onChange={e => field.onChange([field.value?.[0] || 3, +e.target.value])}
                        className="w-16"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Alert
              closable
              type="error"
              message={
                <div>
                  <strong>提示：</strong>
                  <p>影片理解功能必須使用多模態模型。</p>
                </div>
              }
              className="text-sm"
            />
          </div>

          {/* 筆記格式 */}
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <SectionHeader title="筆記格式" tip="選擇要包含的筆記元素" />
                <CheckboxGroup
                  value={field.value}
                  onChange={field.onChange}
                  disabledMap={{
                    link: platform === 'local',
                    screenshot: !videoUnderstandingEnabled,
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 備註 */}
          <FormField
            control={form.control}
            name="extras"
            render={({ field }) => (
              <FormItem>
                <SectionHeader title="備註" tip="可在 Prompt 結尾附加自訂說明" />
                <Textarea placeholder="筆記需要羅列出 xxx 關鍵點…" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  )
}

export default NoteForm
