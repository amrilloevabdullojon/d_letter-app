'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Upload,
  Loader2,
  FileText,
  Trash2,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from '@/lib/constants'
import { FilePreviewModal } from './FilePreviewModal'

interface FileInfo {
  id: string
  name: string
  url: string
  size?: number | null
  mimeType?: string | null
  status?: string | null
  uploadError?: string | null
}

interface FileUploadProps {
  letterId: string
  files: FileInfo[]
  onFilesChange: () => void
}

const isPreviewable = (file: FileInfo) => {
  const mimeType = file.mimeType || ''
  const name = file.name.toLowerCase()
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    name.endsWith('.pdf') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.gif') ||
    name.endsWith('.webp')
  )
}

const getFileIcon = (file: FileInfo) => {
  const mimeType = file.mimeType || ''
  const name = file.name.toLowerCase()
  if (
    mimeType.startsWith('image/') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.gif') ||
    name.endsWith('.webp')
  ) {
    return ImageIcon
  }
  return FileText
}

export function FileUpload({ letterId, files, onFilesChange }: FileUploadProps) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [syncingFileId, setSyncingFileId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasPendingFiles = files.some((file) => file.status && file.status !== 'READY')

  const handlePreview = useCallback((file: FileInfo) => {
    setPreviewFile(file)
  }, [])

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null)
  }, [])

  const handleNavigatePreview = useCallback((file: FileInfo) => {
    setPreviewFile(file)
  }, [])

  useEffect(() => {
    if (!hasPendingFiles || !isVisible) return
    const timer = setTimeout(() => {
      onFilesChange()
    }, 5000)
    return () => clearTimeout(timer)
  }, [hasPendingFiles, isVisible, onFilesChange])

  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(document.visibilityState === 'visible')
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleUpload = async (file: File) => {
    // Проверка размера файла на клиенте
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_LABEL}`)
      return
    }

    setUploading(true)
    const toastId = toast.loading('Загрузка файла...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('letterId', letterId)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.status === 413) {
        toast.error('Файл слишком большой (413)')
        return
      }

      const data = await res.json()

      if (data.success) {
        toast.success('Файл загружен', { id: toastId })
        onFilesChange()
      } else {
        toast.error(data.error || 'Ошибка загрузки', { id: toastId })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Ошибка загрузки файла', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Удалить этот файл?')) return

    setDeleting(fileId)

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Файл удалён')
        onFilesChange()
      } else {
        toast.error('Ошибка удаления')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Ошибка удаления файла')
    } finally {
      setDeleting(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusLabel = (status?: string | null) => {
    if (!status || status === 'READY') return null
    if (status === 'PENDING_SYNC') return 'Ожидает синхронизации'
    if (status === 'UPLOADING') return 'Загрузка...'
    if (status === 'FAILED') return 'Ошибка синхронизации'
    return '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441'
  }

  const handleRetrySync = async (fileId: string) => {
    setSyncingFileId(fileId)
    const toastId = toast.loading('Синхронизируем файл...')
    try {
      const res = await fetch(`/api/files/sync?fileId=${fileId}`, { method: 'POST' })
      if (res.ok) {
        toast.success('Синхронизация запущена', { id: toastId })
        onFilesChange()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || 'Не удалось синхронизировать файл', { id: toastId })
      }
    } catch (error) {
      console.error('Retry sync error:', error)
      toast.error('Ошибка синхронизации', { id: toastId })
    } finally {
      setSyncingFileId(null)
    }
  }

  return (
    <div className="panel panel-soft panel-glass rounded-2xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Файлы</h3>

      {/* Upload zone */}
      <div
        className={`rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="text-gray-400">Загрузка...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-500" />
            <p className="text-gray-400">
              Перетащите файл сюда или{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-400 underline hover:text-emerald-300"
              >
                выберите
              </button>
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG (макс. 10 MB)
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file)
            const canPreview = isPreviewable(file)
            return (
              <div
                key={file.id}
                className="panel-soft panel-glass group flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <button
                      onClick={() =>
                        canPreview
                          ? handlePreview(file)
                          : window.open(`/api/files/${file.id}`, '_blank')
                      }
                      className="block truncate text-left text-white transition hover:text-emerald-400"
                      title={file.name}
                    >
                      {file.name}
                    </button>
                    {file.status && file.status !== 'READY' && (
                      <span
                        className={`text-xs ${
                          file.status === 'FAILED'
                            ? 'text-red-300'
                            : file.status === 'PENDING_SYNC'
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                        }`}
                        title={file.uploadError || undefined}
                      >
                        {getStatusLabel(file.status)}
                      </span>
                    )}
                    {file.size && (
                      <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  {(file.status === 'FAILED' || file.status === 'PENDING_SYNC') && (
                    <button
                      onClick={() => handleRetrySync(file.id)}
                      disabled={syncingFileId === file.id}
                      className="p-2 text-gray-400 transition hover:text-emerald-400 disabled:opacity-50"
                      title="Повторить синхронизацию"
                    >
                      {syncingFileId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {canPreview && (
                    <button
                      onClick={() => handlePreview(file)}
                      className="p-2 text-gray-400 opacity-0 transition hover:text-emerald-400 group-hover:opacity-100"
                      title="Просмотр"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <a
                    href={`/api/files/${file.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 transition hover:text-white"
                    title="Открыть в новой вкладке"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deleting === file.id}
                    className="p-2 text-gray-400 transition hover:text-red-400 disabled:opacity-50"
                    title="Удалить"
                  >
                    {deleting === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {files.length === 0 && !uploading && (
        <p className="mt-4 text-center text-gray-500">Нет прикреплённых файлов</p>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        files={files.filter(isPreviewable)}
        onClose={handleClosePreview}
        onNavigate={handleNavigatePreview}
      />
    </div>
  )
}
