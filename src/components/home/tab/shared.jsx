/**
 * Dino Isekai — Minecraft Launcher
 * Shared utilities, icons, and small UI components for ProfileSettingsPanel tabs.
 */

import { useState, useRef } from 'react'
import {
  PuzzlePiece,
  GlobeHemisphereWest,
  SunDim,
  Package,
  Gear,
  Folder,
  ArrowLeft,
  Trash,
  Check,
  SpinnerGap,
  FileCode,
  List,
  SquaresFour,
  MagnifyingGlass,
  X,
  CloudArrowUp,
  PlugsConnected,
} from '@phosphor-icons/react'

export const isElectron = typeof window !== 'undefined' && window.electronAPI

export function formatBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const Icons = {
  settings:      <Gear size={16} weight="duotone" />,
  world:         <GlobeHemisphereWest size={16} weight="duotone" />,
  mod:           <PuzzlePiece size={16} weight="duotone" />,
  shader:        <SunDim size={16} weight="duotone" />,
  resourcepack:  <Package size={16} weight="duotone" />,
  files:         <Folder size={16} weight="duotone" />,
  server:        <PlugsConnected size={16} weight="duotone" />,
  trash:         <Trash size={14} weight="duotone" />,
  check:         <Check size={12} weight="duotone" />,
  spin:          <SpinnerGap size={16} weight="duotone" className="animate-spin" />,
  java:          <FileCode size={16} weight="duotone" />,
  back:          <ArrowLeft size={16} weight="duotone" />,
  list:          <List size={14} weight="duotone" />,
  grid:          <SquaresFour size={14} weight="duotone" />,
  search:        <MagnifyingGlass size={14} weight="duotone" />,
  close:         <X size={12} weight="duotone" />,
  cloudUpload:   <CloudArrowUp size={40} weight="duotone" />,
}

export function LoadingState({ text = 'Đang tải...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <SpinnerGap size={24} weight="duotone" className="animate-spin text-violet-400/40" />
      <p className="text-xs text-white/30">{text}</p>
    </div>
  )
}

export function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-white/20">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm text-white/40 font-medium">{title}</p>
        {desc && <p className="text-xs text-white/20 mt-1">{desc}</p>}
      </div>
    </div>
  )
}

export function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/60'}`}
        title="Danh sách"
      >
        {Icons.list}
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/60'}`}
        title="Lưới"
      >
        {Icons.grid}
      </button>
    </div>
  )
}

// Ô tìm kiếm dùng chung cho các tab (mods/shaders/resourcepacks/worlds).
export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-0">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
        {Icons.search}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-white/80 placeholder-white/25 outline-none focus:border-white/15 focus:bg-white/8 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-all"
          tabIndex={-1}
        >
          {Icons.close}
        </button>
      )}
    </div>
  )
}

// Reusable drag-and-drop wrapper for mod/shader/resourcepack tabs.
export function DropZoneWrapper({ children, onDrop, accept, color = 'green' }) {
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

  const colorMap = {
    green:  { border: 'border-violet-500/50',  bg: 'bg-violet-500/5',  text: 'text-violet-400',  ring: 'ring-violet-500/20'  },
    yellow: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/5', text: 'text-yellow-400', ring: 'ring-yellow-500/20' },
    purple: { border: 'border-purple-500/50', bg: 'bg-purple-500/5', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  }
  const c = colorMap[color] || colorMap.green

  function handleDragEnter(e) {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setDragging(true)
  }
  function handleDragLeave(e) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }
  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  function handleDrop(e) {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (!files.length) return
    // Lọc theo extension — nếu không có accept thì cho qua hết
    const filtered = accept
      ? files.filter(f => accept.some(ext => f.name.toLowerCase().endsWith(ext)))
      : files
    // Luôn gọi onDrop với toàn bộ files đã drop (handler trong tab tự filter thêm)
    if (files.length) onDrop(filtered.length ? filtered : files)
  }

  return (
    <div
      className={`relative flex flex-col h-full transition-all duration-150 ${dragging ? `ring-2 ${c.ring} rounded-xl` : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div className={`absolute inset-0 z-20 rounded-xl border-2 border-dashed ${c.border} ${c.bg} flex flex-col items-center justify-center gap-3 pointer-events-none`}>
          <span className={`${c.text} opacity-70`}>{Icons.cloudUpload}</span>
          <p className={`text-sm font-semibold ${c.text}`}>Thả file vào đây</p>
          {accept && <p className="text-xs text-white/30">{accept.join(', ')}</p>}
        </div>
      )}
    </div>
  )
}
