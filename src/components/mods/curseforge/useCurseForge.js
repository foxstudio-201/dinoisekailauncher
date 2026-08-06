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

import { useState, useEffect, useCallback, useRef } from 'react'

const isElectron = typeof window !== 'undefined' && window.electronAPI
const LIMIT = 20

export function useCurseForgeSearch(filters) {
  const [results, setResults] = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const offsetRef             = useRef(0)
  const abortRef              = useRef(false)
  const loadingRef            = useRef(false)

  const fetchPage = useCallback(async (offset, append) => {
    if (!isElectron) return
    if (loadingRef.current) return
    loadingRef.current = true
    abortRef.current = false
    setLoading(true)
    setError(null)

    try {
      const data = await window.electronAPI.curseforgeSearch({
        ...filters,
        limit: LIMIT,
        offset,
      })
      if (abortRef.current) return
      if (data?.error) { setError(data.error); return }

      const hits = data.hits || []
      if (append) {
        setResults(prev => {

          const existing = new Set(prev.map(r => r.project_id))
          const newHits = hits.filter(h => !existing.has(h.project_id))
          return [...prev, ...newHits]
        })
      } else {
        setResults(hits)
      }
      setTotal(data.total_hits || 0)
      offsetRef.current = offset + hits.length
    } catch (err) {
      if (!abortRef.current) setError(err.message)
    } finally {
      if (!abortRef.current) setLoading(false)
      loadingRef.current = false
    }
  }, [
    filters.query,
    filters.projectType,
    filters.sortBy,
    JSON.stringify(filters.gameVersions),
    JSON.stringify(filters.loaders),
    JSON.stringify(filters.categories),
  ])

  useEffect(() => {
    abortRef.current = true
    loadingRef.current = false
    offsetRef.current = 0
    setResults([])
    setTotal(0)
    setError(null)

    const t = setTimeout(() => {
      abortRef.current = false
      fetchPage(0, false)
    }, 10)

    return () => {
      clearTimeout(t)
      abortRef.current = true
    }
  }, [
    filters.query,
    filters.projectType,
    filters.sortBy,
    JSON.stringify(filters.gameVersions),
    JSON.stringify(filters.loaders),
    JSON.stringify(filters.categories),
  ])

  const loadMore = useCallback(() => {
    if (loadingRef.current) return
    fetchPage(offsetRef.current, true)
  }, [fetchPage])

  const hasMore = results.length < total

  return { results, total, loading, error, loadMore, hasMore }
}

export function useCurseForgeProject(idOrSlug) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!idOrSlug || !isElectron) return
    setLoading(true)
    setError(null)
    window.electronAPI.curseforgeGetProject(idOrSlug)
      .then(data => {
        if (data?.error) setError(data.error)
        else setProject(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [idOrSlug])

  return { project, loading, error }
}

export function useCurseForgeVersions(idOrSlug, filters = {}) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!idOrSlug || !isElectron) return
    setLoading(true)
    setError(null)
    window.electronAPI.curseforgeGetVersions(idOrSlug, filters)
      .then(data => {
        if (data?.error) setError(data.error)
        else setVersions(Array.isArray(data) ? data : [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [idOrSlug, JSON.stringify(filters)])

  return { versions, loading, error }
}

export function useCurseForgeInstall() {
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress]     = useState(null)
  const [error, setError]           = useState(null)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    if (!isElectron) return
    const unsub = window.electronAPI.onCurseForgeInstallProgress(p => setProgress(p))
    return unsub
  }, [])

  const install = useCallback(async (opts) => {
    if (!isElectron) return
    setInstalling(true)
    setError(null)
    setDone(false)
    setProgress(null)
    try {
      const result = await window.electronAPI.curseforgeInstall(opts)
      if (result?.error) setError(result.error)
      else setDone(true)
      return result
    } catch (err) {
      setError(err.message)
    } finally {
      setInstalling(false)
    }
  }, [])

  const reset = useCallback(() => {
    setInstalling(false)
    setProgress(null)
    setError(null)
    setDone(false)
  }, [])

  return { install, installing, progress, error, done, reset }
}

