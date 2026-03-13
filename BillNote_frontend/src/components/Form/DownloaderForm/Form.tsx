// 下載器 Cookie 設定表單（支援 YouTube 自動/手動切換）
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  getDownloaderCookie,
  updateDownloaderCookie,
  getDownloaderConfig,
  updateDownloaderConfig,
} from '@/services/downloader'
import { useParams } from 'react-router-dom'
import { videoPlatforms } from '@/constant/note.ts'

const SUPPORTED_BROWSERS = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Firefox', value: 'firefox' },
  { label: 'Edge', value: 'edge' },
  { label: 'Safari', value: 'safari' },
  { label: 'Brave', value: 'brave' },
  { label: 'Chromium', value: 'chromium' },
  { label: 'Opera', value: 'opera' },
  { label: 'Vivaldi', value: 'vivaldi' },
  { label: 'Whale', value: 'whale' },
] as const

const CookieSchema = z.object({
  cookie: z.string().min(10, '請填寫有效 Cookie'),
})

// YouTube 专用表单
const YouTubeForm = () => {
  const [loading, setLoading] = useState(true)
  const [isAutoMode, setIsAutoMode] = useState(true)
  const [browser, setBrowser] = useState('chrome')
  const [cookie, setCookie] = useState('')
  const [cookieError, setCookieError] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true)
      try {
        const res = await getDownloaderConfig('youtube')
        setIsAutoMode(res?.mode !== 'manual')
        setBrowser(res?.browser || 'chrome')
        setCookie(res?.cookie || '')
      } catch (e) {
        toast.error('載入設定失敗：' + e)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const onSubmit = async () => {
    // 手動模式下校验 cookie
    if (!isAutoMode) {
      if (!cookie || cookie.trim().length < 10) {
        setCookieError('請填寫有效 Cookie（至少 10 個字元）')
        return
      }
    }
    setCookieError('')

    try {
      await updateDownloaderConfig({
        platform: 'youtube',
        mode: isAutoMode ? 'auto' : 'manual',
        browser: isAutoMode ? browser : undefined,
        cookie: isAutoMode ? undefined : cookie,
      })
      toast.success('儲存成功')
    } catch (e) {
      toast.error('儲存失敗')
    }
  }

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="max-w-xl p-4">
      <div className="flex flex-col gap-5">
        <div className="text-lg font-bold">設定 YouTube 下載器 Cookie</div>

        {/* Auto/Manual Switch */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {isAutoMode ? '🔄 自動模式' : '✋ 手動模式'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isAutoMode
                ? '自動從本機瀏覽器讀取 Cookie（僅限本地運行）'
                : '手動貼上 Cookie 字串（適用於 Docker 部署）'}
            </span>
          </div>
          <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
        </div>

        {/* Auto Mode: Browser Selector */}
        {isAutoMode && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">瀏覽器</label>
            <Select value={browser} onValueChange={setBrowser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇瀏覽器" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_BROWSERS.map(b => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              請確保所選瀏覽器已登入 YouTube 帳號
            </p>
          </div>
        )}

        {/* Manual Mode: Cookie Input */}
        {!isAutoMode && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Cookie</label>
            <Input
              value={cookie}
              onChange={e => {
                setCookie(e.target.value)
                setCookieError('')
              }}
              placeholder="輸入 Cookie"
            />
            {cookieError && (
              <p className="text-sm text-destructive">{cookieError}</p>
            )}
          </div>
        )}

        <Button onClick={onSubmit}>儲存</Button>
      </div>
    </div>
  )
}

// 通用 Cookie 表单（B站、抖音、快手）
const GenericCookieForm = () => {
  const form = useForm({
    resolver: zodResolver(CookieSchema),
    defaultValues: { cookie: '' },
  })
  const { id } = useParams()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCookie = async () => {
      setLoading(true)
      try {
        const res = await getDownloaderCookie(id)
        const cookie = res?.cookie || ''
        form.reset({ cookie })
      } catch (e) {
        toast.error('載入 Cookie 失敗：' + e)
        form.reset({ cookie: '' })
      } finally {
        setLoading(false)
      }
    }

    if (id) loadCookie()
  }, [id])

  const onSubmit = async (values: { cookie: string }) => {
    try {
      await updateDownloaderCookie({
        platform: id!,
        cookie: String(values.cookie),
      })
      toast.success('儲存成功')
    } catch (e) {
      toast.error('儲存失敗')
    }
  }

  if (loading) return <div className="p-4">載入中...</div>

  return (
    <div className="max-w-xl p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="text-lg font-bold">
            設定{videoPlatforms.find(item => item.value === id)?.label}下載器 Cookie
          </div>

          <FormField
            control={form.control}
            name="cookie"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Cookie</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="輸入 Cookie" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">儲存</Button>
        </form>
      </Form>
    </div>
  )
}

// 主表單元件：根據平台自動選擇
const DownloaderForm = () => {
  const { id } = useParams()

  if (id === 'youtube') {
    return <YouTubeForm />
  }

  return <GenericCookieForm />
}

export default DownloaderForm
