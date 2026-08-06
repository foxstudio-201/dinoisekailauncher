/**
 * Dino Isekai — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * Source code : https://github.com/foxstudio-201/VoxelXLauncher
 * Website     : https://voxxelxclient.vercel.app
 *
 * NOTICE:
 *   - This software is provided as-is without warranty of any kind.
 *   - Do not redistribute or resell without explicit permission from FoxStudio.
 *   - If you use or reference this code, please credit FoxStudio.
 *   - Minecraft is a trademark of Mojang Studios / Microsoft. This project is not affiliated with Mojang.
 */

 /**
 * Dino Isekai — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * Source code : https://github.com/foxstudio-201/VoxelXLauncher
 * Website     : https://voxxelxclient.vercel.app
 *
 * NOTICE:
 *   - Dành cho mấy cháu cứ thích phỉ báng.
 *   - Launcher sử dụng ai đi kèm trong việc tạo, bản thân người tạo không tự nhận là code toàn bộ do có sự hỗ trợ của ai.
 *   - Giỏi giang thì tự code bằng năng lực của mình đang video làm toàn bộ từ đầu đến cuối, còn không làm được đừng có kích đểu ảnh hưởng đến người sử dụng.
 *   - Bạn chẳng phải là anh hùng mặc áo choàng đỏ mặc quần xịt như thằng trẻ trâu rồi lên mạng ra vẻ ta đây là người tốt, là anh hùng, là người bảo vệ công lý gì đâu :).
 *   - Vậy nên bớt ảo tưởng đi.
 *   - Nếu có sử dụng hoặc tham khảo code này, hãy ghi công cho FoxStudio.
 *   - Minecraft là một thương hiệu của Mojang Studios / Microsoft. Dự án này không liên kết với Mojang.
 */

import {
  PuzzlePiece,
  Package,
  Sparkle,
  PaintBrush,
  Database,
} from '@phosphor-icons/react'

const SUB_TABS = [
  { id: 'mod',          label: 'Mods',           Icon: PuzzlePiece },
  { id: 'modpack',      label: 'Modpacks',        Icon: Package     },
  { id: 'shader',       label: 'Shaders',         Icon: Sparkle     },
  { id: 'resourcepack', label: 'Resource Packs',  Icon: PaintBrush  },
  { id: 'datapack',     label: 'Data Packs',      Icon: Database    },
]

export default function TechnicSubTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {SUB_TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
            active === id
              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25'
              : 'text-white/35 hover:text-white/60 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Icon size={14} weight="duotone" />
          {label}
        </button>
      ))}
    </div>
  )
}

export { SUB_TABS }

