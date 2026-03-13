/* -------------------- 常量 -------------------- */
import {
  BiliBiliLogo,
  DouyinLogo,
  KuaishouLogo,
  LocalLogo,
  YoutubeLogo,
} from '@/components/Icons/platform.tsx'

export const noteFormats = [
  { label: '目錄', value: 'toc' },
  { label: '原片跳轉', value: 'link' },
  { label: '原片截圖', value: 'screenshot' },
  { label: 'AI 總結', value: 'summary' },
] as const

export const noteStyles = [
  { label: '精簡', value: 'minimal' },
  { label: '詳細', value: 'detailed' },
  { label: '教學', value: 'tutorial' },
  { label: '學術', value: 'academic' },
  { label: '小紅書', value: 'xiaohongshu' },
  { label: '生活向', value: 'life_journal' },
  { label: '任務導向', value: 'task_oriented' },
  { label: '商業風格', value: 'business' },
  { label: '會議紀要', value: 'meeting_minutes' },
] as const

export const videoPlatforms = [
  { label: '嗶哩嗶哩', value: 'bilibili', logo: BiliBiliLogo },
  { label: 'YouTube', value: 'youtube', logo: YoutubeLogo },
  { label: '抖音', value: 'douyin', logo: DouyinLogo },
  { label: '快手', value: 'kuaishou', logo: KuaishouLogo },
  { label: '本地影片', value: 'local', logo: LocalLogo },
] as const
