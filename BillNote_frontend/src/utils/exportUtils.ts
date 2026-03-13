import JSZip from 'jszip'
import { Task } from '@/store/taskStore'
import toast from 'react-hot-toast'

/**
 * 獲取任務的 Markdown 內容
 */
function getTaskMarkdown(task: Task): string {
    if (typeof task.markdown === 'string') {
        return task.markdown
    }

    // 多版本情況：取最新版本
    if (Array.isArray(task.markdown) && task.markdown.length > 0) {
        const latest = task.markdown.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        return latest.content
    }

    return ''
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
}

/**
 * 統一的文件保存接口
 */
async function saveFile(
    content: string | Blob,
    suggestedName: string,
    mimeType: string
): Promise<void> {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })

    // 使用 File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const fileExtension = mimeType.includes('zip') ? '.zip' : '.md'
            const handle = await (window as any).showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: mimeType.includes('zip') ? 'ZIP Archive' : 'Markdown Files',
                        accept: { [mimeType]: [fileExtension] },
                    },
                ],
            })
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
            toast.success('檔案已保存')
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('保存失敗:', err)
                toast.error('保存失敗，請重試')
                throw err
            }
        }
    } else {
        // 降級方案：傳統下載
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = suggestedName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
        toast.success('檔案已下載')
    }
}

/**
 * 導出為合併的單一 Markdown 文件
 */
export const exportMerged = async (tasks: Task[]): Promise<void> => {
    if (tasks.length === 0) {
        toast.error('沒有可導出的任務')
        return
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const content = tasks
        .map(task => {
            const title = task.audioMeta.title || '未命名'
            const markdown = getTaskMarkdown(task)
            const createdAt = new Date(task.createdAt).toLocaleString('zh-CN')

            return `
---

## 【${title}】

**時間：** ${createdAt}  
**平台：** ${task.audioMeta.platform || task.formData.platform}  
**模型：** ${task.formData.model_name}  
**狀態：** ${task.status}

${markdown}
`
        })
        .join('\n\n')

    const finalContent = `# 合併筆記 - ${timestamp}

> 此文件包含 ${tasks.length} 個任務的筆記內容

${content}
`

    await saveFile(finalContent, `notes_merged_${timestamp}.md`, 'text/markdown')
}

/**
 * 導出為 ZIP 壓縮檔（每個任務獨立文件）
 */
export const exportAsZip = async (tasks: Task[]): Promise<void> => {
    if (tasks.length === 0) {
        toast.error('沒有可導出的任務')
        return
    }

    const zip = new JSZip()
    const timestamp = new Date().toISOString().split('T')[0]

    // 用於追踪重複文件名
    const fileNameCount = new Map<string, number>()

    tasks.forEach(task => {
        let title = sanitizeFilename(task.audioMeta.title || 'note')

        // 處理重複文件名
        if (fileNameCount.has(title)) {
            const count = fileNameCount.get(title)! + 1
            fileNameCount.set(title, count)
            title = `${title}_${count}`
        } else {
            fileNameCount.set(title, 1)
        }

        const markdown = getTaskMarkdown(task)
        const metadata = `# ${task.audioMeta.title || '未命名'}

**時間：** ${new Date(task.createdAt).toLocaleString('zh-CN')}  
**平台：** ${task.audioMeta.platform || task.formData.platform}  
**模型：** ${task.formData.model_name}  
**狀態：** ${task.status}

---

${markdown}
`

        zip.file(`${title}.md`, metadata)
    })

    try {
        const blob = await zip.generateAsync({ type: 'blob' })
        await saveFile(blob, `notes_${timestamp}.zip`, 'application/zip')
    } catch (error) {
        console.error('生成 ZIP 失敗:', error)
        toast.error('生成 ZIP 文件失敗')
        throw error
    }
}

/**
 * 導出到指定資料夾（每個任務獨立文件）
 */
export const exportToFolder = async (tasks: Task[]): Promise<void> => {
    if (tasks.length === 0) {
        toast.error('沒有可導出的任務')
        return
    }

    // 檢查瀏覽器是否支持 Directory Picker
    if (!('showDirectoryPicker' in window)) {
        toast.error('您的瀏覽器不支持此功能，請使用 Chrome 86+ 或 Edge 86+')
        return
    }

    try {
        // 讓用戶選擇資料夾
        const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
        })

        // 用於追踪重複文件名
        const fileNameCount = new Map<string, number>()
        let successCount = 0

        for (const task of tasks) {
            try {
                let title = sanitizeFilename(task.audioMeta.title || 'note')

                // 處理重複文件名
                if (fileNameCount.has(title)) {
                    const count = fileNameCount.get(title)! + 1
                    fileNameCount.set(title, count)
                    title = `${title}_${count}`
                } else {
                    fileNameCount.set(title, 1)
                }

                const markdown = getTaskMarkdown(task)
                const metadata = `# ${task.audioMeta.title || '未命名'}

**時間：** ${new Date(task.createdAt).toLocaleString('zh-CN')}  
**平台：** ${task.audioMeta.platform || task.formData.platform}  
**模型：** ${task.formData.model_name}  
**狀態：** ${task.status}

---

${markdown}
`

                // 創建文件
                const fileHandle = await dirHandle.getFileHandle(`${title}.md`, { create: true })
                const writable = await fileHandle.createWritable()
                await writable.write(metadata)
                await writable.close()

                successCount++
            } catch (error) {
                console.error(`保存文件失敗: ${task.audioMeta.title}`, error)
                // 繼續處理其他文件
            }
        }

        if (successCount === tasks.length) {
            toast.success(`成功導出 ${successCount} 個文件`)
        } else if (successCount > 0) {
            toast.success(`成功導出 ${successCount}/${tasks.length} 個文件`)
        } else {
            toast.error('導出失敗')
        }
    } catch (err: any) {
        if (err.name === 'AbortError') {
            // 用戶取消選擇資料夾
            return
        }
        console.error('導出到資料夾失敗:', err)
        toast.error('導出失敗，請重試')
        throw err
    }
}
