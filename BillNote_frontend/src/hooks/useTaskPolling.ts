import { useEffect, useRef } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { get_task_status } from '@/services/note.ts'
import toast from 'react-hot-toast'

export const useTaskPolling = (interval = 3000) => {
  const tasks = useTaskStore(state => state.tasks)
  const updateTaskContent = useTaskStore(state => state.updateTaskContent)

  const tasksRef = useRef(tasks)

  // 每次 tasks 更新，把最新的 tasks 同步进去
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    const timer = setInterval(async () => {
      const pendingTasks = tasksRef.current.filter(
        task => task.status != 'SUCCESS' && task.status != 'FAILED'
      )

      for (const task of pendingTasks) {
        try {
          console.log('🔄 正在轮询任务：', task.id)
          const res = await get_task_status(task.id)
          const { status, progress } = res
          const prevProgress = task.progress
          const progressChanged = JSON.stringify(progress || null) !== JSON.stringify(prevProgress || null)
          if (status && (status !== task.status || progressChanged)) {
            if (status === 'SUCCESS') {
              const { markdown, transcript, audio_meta } = res.result
              toast.success('笔记生成成功')
              updateTaskContent(task.id, {
                status,
                progress: undefined,
                markdown,
                transcript,
                audioMeta: audio_meta,
              })
            } else if (status === 'FAILED') {
              updateTaskContent(task.id, { status, progress: undefined })
              console.warn(`⚠️ 任务 ${task.id} 失败`)
            } else {
              updateTaskContent(task.id, { status, progress })
            }
          }
        } catch (e) {
          console.error('❌ 任务轮询失败：', e)
          // toast.error(`生成失败 ${e.message || e}`)
          updateTaskContent(task.id, { status: 'FAILED', progress: undefined })
        }
      }
    }, interval)

    return () => clearInterval(timer)
  }, [interval])
}
