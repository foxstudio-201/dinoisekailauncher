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
const url = 'https://www.technicpack.net/modpack/the-1122-pack.1406454'
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
  .then(r => r.text())
  .then(html => {
    
    const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
    console.log('og:description:', ogDesc ? ogDesc[1] : 'not found')

    
    const metaDesc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
    console.log('meta description:', metaDesc ? metaDesc[1] : 'not found')

    
    const packDesc = html.match(/class="[^"]*pack[^"]*description[^"]*"[^>]*>([\s\S]{0,500})/i)
    console.log('pack-description class:', packDesc ? packDesc[0].slice(0, 300) : 'not found')

    
    const dataDesc = html.match(/data-description="([^"]{0,500})"/i)
    console.log('data-description:', dataDesc ? dataDesc[1] : 'not found')

    
    console.log('\nPage size:', html.length)
    console.log('Has ng-app:', html.includes('ng-app'))
    console.log('Has angular:', html.toLowerCase().includes('angular'))
    console.log('First 500 chars of body:', html.slice(html.indexOf('<body'), html.indexOf('<body') + 500))
  })
