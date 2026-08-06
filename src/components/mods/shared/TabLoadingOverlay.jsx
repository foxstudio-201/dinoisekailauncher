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

export default function TabLoadingOverlay({ visible }) {
  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{
        background: 'rgba(10,10,10,0.12)',
        backdropFilter: 'blur(6px)',
        animation: 'tab-overlay-in 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes tab-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Reuse splash logo keyframes — scaled down */
        @keyframes tab-tl {
          0%,100% { transform: translate(-10px,-10px) rotate(0deg)   scale(1);   opacity:.9; }
          15%      { transform: translate(-22px,-22px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%      { transform: translate(-22px,-22px) rotate(360deg) scale(1.1); opacity:1;  }
          65%      { transform: translate(-10px,-10px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes tab-tr {
          0%,100% { transform: translate( 10px,-10px) rotate(0deg)   scale(1);   opacity:.9; }
          15%      { transform: translate( 22px,-22px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%      { transform: translate( 22px,-22px) rotate(360deg) scale(1.1); opacity:1;  }
          65%      { transform: translate( 10px,-10px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes tab-bl {
          0%,100% { transform: translate(-10px, 10px) rotate(0deg)   scale(1);   opacity:.9; }
          15%      { transform: translate(-22px, 22px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%      { transform: translate(-22px, 22px) rotate(360deg) scale(1.1); opacity:1;  }
          65%      { transform: translate(-10px, 10px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes tab-br {
          0%,100% { transform: translate( 10px, 10px) rotate(0deg)   scale(1);   opacity:.9; }
          15%      { transform: translate( 22px, 22px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%      { transform: translate( 22px, 22px) rotate(360deg) scale(1.1); opacity:1;  }
          65%      { transform: translate( 10px, 10px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes tab-glow {
          0%,100% { opacity:0.2; transform:scale(1);   }
          15%      { opacity:0.7; transform:scale(1.6); }
          50%      { opacity:0.7; transform:scale(1.6); }
          65%      { opacity:0.2; transform:scale(1);   }
        }
      `}</style>

      {}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ animation: 'tab-glow 3s ease-in-out infinite' }}
        >
          <div className="w-16 h-16 bg-violet-500/25 rounded-full blur-2xl" />
        </div>

        {}
        <div className="absolute rounded-lg" style={{
          width: 18, height: 18,
          background: '#a78bfa',
          boxShadow: '0 0 10px #a78bfa99',
          animation: 'tab-tl 3s ease-in-out 0s infinite',
        }} />
        <div className="absolute rounded-lg" style={{
          width: 18, height: 18,
          background: '#8b5cf6',
          boxShadow: '0 0 10px #8b5cf699',
          animation: 'tab-tr 3s ease-in-out 0.06s infinite',
        }} />
        <div className="absolute rounded-lg" style={{
          width: 18, height: 18,
          background: '#7c3aed',
          boxShadow: '0 0 10px #7c3aed99',
          animation: 'tab-bl 3s ease-in-out 0.12s infinite',
        }} />
        <div className="absolute rounded-lg" style={{
          width: 18, height: 18,
          background: '#a78bfa',
          boxShadow: '0 0 10px #a78bfa99',
          animation: 'tab-br 3s ease-in-out 0.18s infinite',
        }} />
      </div>
    </div>
  )
}

