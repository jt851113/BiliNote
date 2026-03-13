import request from '@/utils/request.ts'

export const getDownloaderCookie = async (id: string) => {
  return await request.get('/get_downloader_cookie/' + id)
}

export const updateDownloaderCookie = async (data: { cookie: string; platform: any }) => {
  return await request.post('/update_downloader_cookie', data)
}

export interface DownloaderConfigPayload {
  platform: string
  mode: 'auto' | 'manual'
  browser?: string
  cookie?: string
}

export const getDownloaderConfig = async (platform: string) => {
  return await request.get('/get_downloader_config/' + platform)
}

export const updateDownloaderConfig = async (data: DownloaderConfigPayload) => {
  return await request.post('/update_downloader_config', data)
}
