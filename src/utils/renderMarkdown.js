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














 
















import { marked } from './marked.esm.js'

marked.setOptions({ breaks: true, gfm: true })

const markedParse = (src) => marked.parse(src)

function restoreNewlines(md) {

  const placeholders = []
  let protected_md = md.replace(/!\[[^\]]*\]\([^)]*\)|\[[^\]]*\]\([^)]*\)/g, (match) => {
    const idx = placeholders.length
    placeholders.push(match)
    return `\x00PLACEHOLDER${idx}\x00`
  })

  protected_md = protected_md

    .replace(/([^\n])(#{1,6} )/g, '$1\n\n$2')

    .replace(/([^\n\-\*\+])(\n?[\*\-\+] )/g, '$1\n$2')

    .replace(/([^\n])(\n?\d+\. )/g, '$1\n$2')

    .replace(/([^\n])(> )/g, '$1\n\n$2')

    .replace(/([^\n])(---+|===+)(\s)/g, '$1\n\n$2$3')

    .replace(/\n{4,}/g, '\n\n\n')

  protected_md = protected_md.replace(/\x00PLACEHOLDER(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx)])

  return protected_md
}

export function renderMarkdown(content) {
  if (!content) return ''

  if (/<[a-z][\s\S]*>/i.test(content)) {
    return sanitize(content)
  }

  const lineCount = (content.match(/\n/g) || []).length
  const charCount = content.length

  const processed = (lineCount < charCount / 200) ? restoreNewlines(content) : content

  const html = markedParse(processed)
  return sanitize(html)
}

function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer" ')
    .replace(/<img\b/gi, '<img onerror="this.style.display=\'none\'" ')
}

