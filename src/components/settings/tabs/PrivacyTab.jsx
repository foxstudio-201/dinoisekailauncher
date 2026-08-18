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














 
















import { useState } from 'react'
import { useLang } from '../../../i18n/LangProvider'

const TOS_TEXT = `Chào mừng bạn đến với Dino Isekai. Bằng cách sử dụng phần mềm này, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu dưới đây. Vui lòng đọc kỹ trước khi tiếp tục sử dụng.

1. Chấp nhận điều khoản
Việc cài đặt, truy cập hoặc sử dụng Dino Isekai đồng nghĩa với việc bạn đồng ý bị ràng buộc bởi các Điều khoản Dịch vụ này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, bạn không được phép sử dụng phần mềm.

2. Giấy phép sử dụng
FoxStudio cấp cho bạn giấy phép cá nhân, không độc quyền, không thể chuyển nhượng và có thể thu hồi để sử dụng Dino Isekai cho mục đích cá nhân, phi thương mại. Bạn không được phép sao chép, sửa đổi, phân phối, bán hoặc cho thuê bất kỳ phần nào của phần mềm mà không có sự cho phép bằng văn bản của FoxStudio.

3. Tài khoản người dùng
Bạn chịu trách nhiệm duy trì tính bảo mật của tài khoản và mật khẩu của mình. FoxStudio không chịu trách nhiệm về bất kỳ tổn thất hoặc thiệt hại nào phát sinh từ việc bạn không bảo vệ thông tin tài khoản của mình. Bạn đồng ý thông báo ngay cho chúng tôi về bất kỳ hành vi sử dụng trái phép nào đối với tài khoản của bạn.

4. Hành vi bị cấm
Khi sử dụng Dino Isekai, bạn đồng ý không: (a) vi phạm bất kỳ luật hoặc quy định hiện hành nào; (b) sử dụng phần mềm để gian lận, hack hoặc can thiệp vào trải nghiệm của người chơi khác; (c) phân phối phần mềm độc hại hoặc mã độc; (d) cố gắng truy cập trái phép vào hệ thống hoặc mạng liên quan đến dịch vụ.

5. Quyền sở hữu trí tuệ
Tất cả nội dung, tính năng và chức năng của Dino Isekai, bao gồm nhưng không giới hạn ở văn bản, đồ họa, logo, biểu tượng và hình ảnh, đều là tài sản của FoxStudio và được bảo vệ bởi luật bản quyền, nhãn hiệu và các luật sở hữu trí tuệ khác.

6. Giới hạn trách nhiệm
Trong phạm vi tối đa được pháp luật cho phép, FoxStudio sẽ không chịu trách nhiệm về bất kỳ thiệt hại gián tiếp, ngẫu nhiên, đặc biệt, hậu quả hoặc trừng phạt nào, bao gồm mất lợi nhuận, dữ liệu, thiện chí, hoặc các tổn thất vô hình khác.

7. Thay đổi điều khoản
FoxStudio có quyền sửa đổi các điều khoản này bất cứ lúc nào. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi quan trọng nào bằng cách đăng thông báo trên trang web hoặc trong ứng dụng. Việc tiếp tục sử dụng phần mềm sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều khoản mới.

8. Chấm dứt
FoxStudio có quyền chấm dứt hoặc đình chỉ quyền truy cập của bạn vào Dino Isekai ngay lập tức, mà không cần thông báo trước, vì bất kỳ lý do gì, bao gồm nhưng không giới hạn ở việc bạn vi phạm các Điều khoản Dịch vụ này.

9. Luật điều chỉnh
Các Điều khoản này sẽ được điều chỉnh và giải thích theo luật pháp hiện hành, không tính đến các quy định về xung đột pháp luật.

10. Liên hệ
Nếu bạn có bất kỳ câu hỏi nào về các Điều khoản Dịch vụ này, vui lòng liên hệ với chúng tôi qua Discord hoặc GitHub của FoxStudio.`

const PRIVACY_TEXT = `Chính sách Quyền riêng tư này mô tả cách Dino Isekai và FoxStudio thu thập, sử dụng và chia sẻ thông tin về bạn khi bạn sử dụng phần mềm của chúng tôi.

1. Thông tin chúng tôi thu thập
Chúng tôi có thể thu thập các loại thông tin sau:

a) Thông tin bạn cung cấp trực tiếp: Tên người dùng Minecraft, UUID tài khoản, loại tài khoản (Microsoft hoặc Offline), và các cài đặt tùy chỉnh của bạn trong launcher.

b) Thông tin thu thập tự động: Phiên bản launcher đang sử dụng, hệ điều hành và phiên bản, thông tin phần cứng cơ bản (RAM, CPU) để tối ưu hóa hiệu suất game, nhật ký lỗi và sự cố (crash logs) để cải thiện ổn định.

c) Thông tin từ bên thứ ba: Khi bạn đăng nhập bằng tài khoản Microsoft, chúng tôi nhận thông tin xác thực từ Microsoft theo chính sách của họ.

2. Cách chúng tôi sử dụng thông tin
Chúng tôi sử dụng thông tin thu thập được để: cung cấp, duy trì và cải thiện Dino Isekai; xử lý giao dịch và gửi thông báo liên quan; phản hồi các bình luận và câu hỏi; gửi thông tin kỹ thuật và cập nhật bảo mật; theo dõi và phân tích xu hướng sử dụng.

3. Chia sẻ thông tin
Chúng tôi không bán, trao đổi hoặc chuyển giao thông tin cá nhân của bạn cho bên thứ ba mà không có sự đồng ý của bạn, ngoại trừ: (a) các nhà cung cấp dịch vụ hỗ trợ hoạt động của chúng tôi; (b) khi được yêu cầu bởi pháp luật; (c) để bảo vệ quyền, tài sản hoặc sự an toàn của FoxStudio, người dùng hoặc công chúng.

4. Bảo mật dữ liệu
Chúng tôi thực hiện các biện pháp bảo mật hợp lý để bảo vệ thông tin của bạn khỏi truy cập trái phép, thay đổi, tiết lộ hoặc phá hủy. Tuy nhiên, không có phương thức truyền tải qua Internet hoặc lưu trữ điện tử nào là an toàn 100%.

5. Lưu trữ dữ liệu cục bộ
Dino Isekai lưu trữ dữ liệu tài khoản và cài đặt cục bộ trên máy tính của bạn tại thư mục %APPDATA%\.DinoIsekai. Bạn có toàn quyền kiểm soát dữ liệu này và có thể xóa bất cứ lúc nào.

6. Quyền của bạn
Bạn có quyền: truy cập thông tin cá nhân chúng tôi lưu giữ về bạn; yêu cầu chỉnh sửa thông tin không chính xác; yêu cầu xóa thông tin của bạn; phản đối việc xử lý thông tin của bạn; yêu cầu hạn chế xử lý thông tin của bạn.

7. Cookie và công nghệ theo dõi
Dino Isekai là ứng dụng desktop và không sử dụng cookie theo nghĩa truyền thống. Chúng tôi có thể sử dụng localStorage để lưu trữ cài đặt người dùng cục bộ.

8. Thay đổi chính sách
Chúng tôi có thể cập nhật Chính sách Quyền riêng tư này theo thời gian. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi quan trọng nào bằng cách đăng thông báo trong ứng dụng hoặc trên trang web của chúng tôi.

9. Liên hệ
Nếu bạn có câu hỏi về Chính sách Quyền riêng tư này hoặc muốn thực hiện quyền của mình, vui lòng liên hệ với chúng tôi qua Discord hoặc GitHub của FoxStudio.`

function PolicySection({ title, badge, badgeColor, content, agreedKey, agreed, onAgree, agreeLabel }) {
  return (
    <div className="mb-6">
      {}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs uppercase tracking-widest text-white/40">{title}</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      </div>

      {}
      <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden">
        <div
          className="p-4 overflow-y-auto text-xs text-white/50 leading-relaxed whitespace-pre-line"
          style={{ maxHeight: 200 }}
        >
          {content}
        </div>

        {}
        <div className="border-t border-white/5 px-4 py-3 flex items-center gap-3 bg-white/1">
          <button
            onClick={() => onAgree(agreedKey, !agreed)}
            className={`
              w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center
              transition-all duration-150
              ${agreed
                ? 'bg-violet-500 border-violet-500'
                : 'bg-transparent border-white/20 hover:border-white/40'
              }
            `}
            aria-checked={agreed}
            role="checkbox"
          >
            {agreed && (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            )}
          </button>
          <label
            onClick={() => onAgree(agreedKey, !agreed)}
            className="text-xs text-white/50 cursor-pointer select-none hover:text-white/70 transition-colors"
          >
            {agreeLabel}
          </label>
        </div>
      </div>
    </div>
  )
}

export default function PrivacyTab({ settings, onChange }) {
  const { t } = useLang()
  const agreedTos     = settings.agreedTos     ?? false
  const agreedPrivacy = settings.agreedPrivacy ?? false

  function handleAgree(key, value) {
    onChange({ [key]: value })
  }

  const bothAgreed = agreedTos && agreedPrivacy

  return (
    <div className="px-6 py-5">

      <PolicySection
        title={t('settings.privacy.tos')}
        badge="Terms of Service"
        badgeColor="bg-blue-500/15 text-blue-400"
        content={TOS_TEXT}
        agreedKey="agreedTos"
        agreed={agreedTos}
        onAgree={handleAgree}
        agreeLabel={t('settings.privacy.agreeWith', { title: t('settings.privacy.tos').toLowerCase() })}
      />

      <PolicySection
        title={t('settings.privacy.privacy')}
        badge="Privacy Policy"
        badgeColor="bg-purple-500/15 text-purple-400"
        content={PRIVACY_TEXT}
        agreedKey="agreedPrivacy"
        agreed={agreedPrivacy}
        onAgree={handleAgree}
        agreeLabel={t('settings.privacy.agreeWith', { title: t('settings.privacy.privacy').toLowerCase() })}
      />

      {}
      <div className={`
        rounded-xl border p-3 flex items-center gap-3 transition-all duration-300
        ${bothAgreed
          ? 'bg-violet-500/8 border-violet-500/20'
          : 'bg-white/3 border-white/5'
        }
      `}>
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          ${bothAgreed ? 'bg-violet-500/20' : 'bg-white/5'}
        `}>
          {bothAgreed ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-violet-400">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          )}
        </div>
        <div>
          <p className={`text-xs font-semibold ${bothAgreed ? 'text-violet-400' : 'text-white/30'}`}>
            {bothAgreed ? t('settings.privacy.agreedAll') : t('settings.privacy.notAgreedAll')}
          </p>
          <p className="text-[10px] text-white/25 mt-0.5">
            {bothAgreed ? t('settings.privacy.agreedAllDesc') : t('settings.privacy.notAgreedAllDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}

