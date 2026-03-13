// 下载器 Cookie 设置表单（支持 YouTube 自动/手动切换）
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
  cookie: z.string().min(10, '请填写有效 Cookie'),
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
        toast.error('加载配置失败: ' + e)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const onSubmit = async () => {
    // 手动模式下校验 cookie
    if (!isAutoMode) {
      if (!cookie || cookie.trim().length < 10) {
        setCookieError('请填写有效 Cookie（至少 10 个字符）')
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
      toast.success('保存成功')
    } catch (e) {
      toast.error('保存失败')
    }
  }

  if (loading) return <div className="p-4">加载中...</div>

  return (
    <div className="max-w-xl p-4">
      <div className="flex flex-col gap-5">
        <div className="text-lg font-bold">设置 YouTube 下载器 Cookie</div>

        {/* Auto/Manual Switch */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {isAutoMode ? '🔄 自动模式' : '✋ 手动模式'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isAutoMode
                ? '自动从本机浏览器读取 Cookie（仅限本地运行）'
                : '手动粘贴 Cookie 字符串（适用于 Docker 部署）'}
            </span>
          </div>
          <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
        </div>

        {/* Auto Mode: Browser Selector */}
        {isAutoMode && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">浏览器</label>
            <Select value={browser} onValueChange={setBrowser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择浏览器" />
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
              请确保所选浏览器已登录 YouTube 账号
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
              placeholder="输入 Cookie"
            />
            {cookieError && (
              <p className="text-sm text-destructive">{cookieError}</p>
            )}
          </div>
        )}

        <Button onClick={onSubmit}>保存</Button>
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
        toast.error('加载 Cookie 失败: ' + e)
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
      toast.success('保存成功')
    } catch (e) {
      toast.error('保存失败')
    }
  }

  if (loading) return <div className="p-4">加载中...</div>

  return (
    <div className="max-w-xl p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="text-lg font-bold">
            设置{videoPlatforms.find(item => item.value === id)?.label}下载器 Cookie
          </div>

          <FormField
            control={form.control}
            name="cookie"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Cookie</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="输入 Cookie" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">保存</Button>
        </form>
      </Form>
    </div>
  )
}

// 主表单组件：根据平台自动选择
const DownloaderForm = () => {
  const { id } = useParams()

  if (id === 'youtube') {
    return <YouTubeForm />
  }

  return <GenericCookieForm />
}

export default DownloaderForm
