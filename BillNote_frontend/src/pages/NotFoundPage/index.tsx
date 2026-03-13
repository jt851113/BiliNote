// src/pages/NotFoundPage.tsx
import NotFound from '@/components/Lottie/404.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useNavigate } from 'react-router-dom'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center text-gray-500">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">你好像走丟了哦！～～</h1>
        <p className="mb-4 text-lg">請檢查你的網址是否正確，或者點擊下方的按鈕返回首頁。</p>
        <Button onClick={() => navigate('/')} className="hover:underline">
          返回首頁
        </Button>
      </div>
      <div>
        <NotFound />
      </div>
    </div>
  )
}

export default NotFoundPage
