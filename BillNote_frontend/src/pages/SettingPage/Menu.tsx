import {
  BotMessageSquare,
  SquareChevronRight,
  Captions,
  HardDriveDownload,
  Wrench,
  Info,
} from 'lucide-react'
import MenuBar, { IMenuProps } from '@/pages/SettingPage/components/menuBar.tsx'

const Menu = () => {
  const menuList: IMenuProps[] = [
    {
      id: 'model',
      name: 'AI 模型設定',
      icon: <BotMessageSquare />,
      path: '/settings/model',
    },
    // TODO ：下一版本升级优化
    // {
    //   id: ' transcriber',
    //   name: '音频转译配置',
    //   icon: <Captions />,
    //   path: '/settings/transcriber',
    // },
    // //下載設定
    {
      id: 'download',
      name: '下載設定',
      icon: <HardDriveDownload />,
      path: '/settings/download',
    },
    // //其他配置
    // {
    //   id: 'prompt',
    //   name: '提示词設定',
    //   icon: <SquareChevronRight />,
    //   path: '/settings/prompt',
    // },
    {
      id: 'about',
      name: '關於',
      icon: <Info />,
      path: '/settings/about',
    },
    // {
    //   id: 'other',
    //   name: '其他配置',
    //   icon: <Wrench />,
    //   path: '/settings/other',
    // },
  ]
  return (
    <div className="flex h-full flex-col">
      <div className={'flex w-full flex-col gap-2'}>
        <div className="text-2xl font-medium">設定</div>
        <div className="text-sm font-light text-gray-800">全域設定與模型設定</div>
      </div>
      <div className="mt-6 flex-1">
        {menuList &&
          menuList.map(item => {
            return <MenuBar key={item.id} menuItem={item} />
          })}
      </div>
    </div>
  )
}
export default Menu
