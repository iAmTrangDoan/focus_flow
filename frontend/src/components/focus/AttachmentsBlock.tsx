/* ─── AttachmentsBlock ───
 * Drag and drop / click file uploader.
 * - Enforces 10MB limit and file count limit (max 5).
 * - Supported file types: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG.
 * - Displays upload progress/error with peach theme colors.
 * - Uses Cloudinary for secure file storage.
 */

import React, { useState, useRef } from 'react';
import { Paperclip, FileText, Image, X, Loader2 } from 'lucide-react';
import type { Attachment } from '../../services/focus.service';

interface AttachmentsBlockProps {
  attachments: Attachment[];
  onUpload: (file: File) => Promise<Attachment>;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}

export function AttachmentsBlock({
  attachments,
  onUpload,
  onDelete,
  disabled = false,
}: AttachmentsBlockProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'];

  const validateAndUpload = async (file: File) => {
    setErrorMsg(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      setErrorMsg('Định dạng không được hỗ trợ. Chỉ nhận PDF, DOC, DOCX, TXT, PNG, JPG, JPEG.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Dung lượng tối đa là 10MB.');
      return;
    }

    if (attachments.length >= 5) {
      setErrorMsg('Đã đạt giới hạn tối đa 5 tài liệu.');
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể upload file.';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled || uploading) return;

    if (e.target.files && e.target.files[0]) {
      void validateAndUpload(e.target.files[0]);
    }
  };

  const triggerInput = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) {
      return <Image size={14} className="text-[#5FAF6E]" />;
    }
    return <FileText size={14} className="text-[#4A7FB8]" />;
  };

  const getFileName = (name: string): string => {
    if (name.length <= 15) return name;
    const ext = name.split('.').pop() || '';
    const base = name.substring(0, 10);
    return `${base}...${ext}`;
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#FFFFFF',
        border: '1px solid #D9E6D9',
      }}
    >
      <span className="text-sm font-semibold block mb-3" style={{ color: '#243024' }}>
        Tài liệu đính kèm
      </span>

      {/* Upload area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragActive ? 'bg-[#F4FAF4]' : 'bg-transparent'
        }`}
        style={{
          borderColor: dragActive ? 'var(--color-primary)' : '#D9E6D9',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          disabled={disabled || uploading}
          accept=".pdf,.doc,.docx,.txt,image/*"
        />

        {uploading ? (
          <Loader2 className="animate-spin mb-2 text-[#5FAF6E]" size={24} />
        ) : (
          <Paperclip className="mb-2 text-[#5F6E5F]" size={24} />
        )}

        <p className="text-xs font-semibold text-center leading-normal" style={{ color: '#243024' }}>
          {uploading ? 'Đang upload tài liệu...' : 'Kéo thả hoặc click để upload tài liệu liên quan'}
        </p>

        <p className="text-[10px] mt-1 text-center" style={{ color: '#5F6E5F' }}>
          PDF, DOCX, TXT, PNG, JPG — tối đa 10MB/file
        </p>
      </div>

      {/* Error message */}
      {errorMsg && (
        <p className="text-xs font-medium mt-2 leading-relaxed" style={{ color: '#C1644C' }}>
          {errorMsg}
        </p>
      )}

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg border text-xs font-medium max-w-[200px]"
              style={{
                background: '#F4FAF4',
                borderColor: '#D9E6D9',
              }}
            >
              {getFileIcon(file.fileType)}
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate"
                style={{ color: '#243024' }}
                title={file.fileName}
              >
                {getFileName(file.fileName)}
              </a>
              <span className="text-[9px] shrink-0" style={{ color: '#5F6E5F' }}>
                ({formatSize(file.fileSize)})
              </span>
              <button
                type="button"
                onClick={() => onDelete(file.id)}
                disabled={disabled}
                className="p-0.5 rounded-full hover:bg-gray-200 transition-colors ml-auto shrink-0"
                style={{ color: '#5F6E5F' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
