/* ─── LiveNotes ───
 * Markdown textarea for quick session notes.
 * - Bold & List buttons.
 * - Real-time preview mode.
 * - Autosave with 1.5s debounce.
 * - Save status indicator (Saved / Saving...).
 */

import { useState, useEffect, useRef } from 'react';
import { Bold, List, Eye, Edit2 } from 'lucide-react';

interface LiveNotesProps {
  notes: string;
  onSave: (notes: string) => Promise<void>;
  // Key to detect task/subtask changes and reload the notes
  entityKey: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function LiveNotes({ notes, onSave, entityKey }: LiveNotesProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Sync with prop when entity changes (e.g. task switch)
  useEffect(() => {
    setLocalNotes(notes || '');
    setSaveStatus('idle');
  }, [notes, entityKey]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const triggerSave = (value: string) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    setSaveStatus('saving');

    debounceRef.current = window.setTimeout(async () => {
      try {
        await onSave(value);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
      }
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalNotes(val);
    triggerSave(val);
  };

  const insertMarkdown = (syntax: 'bold' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    let insertedText = '';
    let newCursorPos = start;

    if (syntax === 'bold') {
      const selectedText = text.substring(start, end);
      insertedText = `**${selectedText || 'chữ đậm'}**`;
      newCursorPos = start + 2 + (selectedText ? selectedText.length : 7);
    } else if (syntax === 'list') {
      const needsNewLine = start > 0 && text[start - 1] !== '\n';
      insertedText = `${needsNewLine ? '\n' : ''}- `;
      newCursorPos = start + insertedText.length;
    }

    const newValue = text.substring(0, start) + insertedText + text.substring(end);
    setLocalNotes(newValue);
    triggerSave(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Simple and safe markdown parser
  const renderMarkdown = (text: string) => {
    if (!text.trim()) {
      return (
        <p className="text-sm italic" style={{ color: '#9CA3AF' }}>
          Không có nội dung.
        </p>
      );
    }

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h5 class="text-sm font-bold mt-2 mb-1" style="color: #243024">$1</h5>');
    html = html.replace(/^## (.*$)/gim, '<h6 class="text-base font-bold mt-3 mb-1" style="color: #243024">$1</h6>');
    html = html.replace(/^# (.*$)/gim, '<h4 class="text-lg font-bold mt-4 mb-2" style="color: #243024">$1</h4>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet Lists
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        let res = '';
        if (!inList) {
          inList = true;
          res += '<ul class="list-disc pl-5 my-1" style="color: #243024">';
        }
        res += `<li>${content}</li>`;
        return res;
      } else {
        let res = '';
        if (inList) {
          inList = false;
          res += '</ul>';
        }
        res += line ? `<p class="my-1 min-h-[1rem]" style="color: #243024">${line}</p>` : '<div class="h-2"></div>';
        return res;
      }
    });

    if (inList) {
      processedLines.push('</ul>');
    }

    return (
      <div
        className="text-sm leading-relaxed whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: processedLines.join('\n') }}
      />
    );
  };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col min-h-[280px]"
      style={{
        background: '#FFFFFF',
        border: '1px solid #D9E6D9',
      }}
    >
      {/* Header toolbar */}
      <div className="flex justify-between items-center pb-3 border-b mb-3" style={{ borderColor: '#E8F5E8' }}>
        <span className="text-sm font-semibold" style={{ color: '#243024' }}>
          Ghi chú phiên
        </span>
        <div className="flex items-center gap-1.5">
          {!isPreview && (
            <>
              <button
                type="button"
                onClick={() => insertMarkdown('bold')}
                className="p-1.5 rounded-lg hover:bg-[#F4FAF4] transition-colors"
                style={{ color: '#5F6E5F' }}
                title="Chữ đậm"
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('list')}
                className="p-1.5 rounded-lg hover:bg-[#F4FAF4] transition-colors"
                style={{ color: '#5F6E5F' }}
                title="Danh sách gạch đầu dòng"
              >
                <List size={16} />
              </button>
              <div className="w-[1px] h-4 mx-1" style={{ background: '#D9E6D9' }} />
            </>
          )}

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-[#F4FAF4] transition-colors"
            style={{ color: '#5FAF6E' }}
          >
            {isPreview ? (
              <>
                <Edit2 size={12} /> Soạn thảo
              </>
            ) : (
              <>
                <Eye size={12} /> Xem trước
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor or Preview */}
      <div className="flex-1 flex flex-col relative">
        {isPreview ? (
          <div className="flex-1 p-3 overflow-y-auto max-h-60 rounded-xl bg-[#F4FAF4]" style={{ border: '1px solid #E8F5E8' }}>
            {renderMarkdown(localNotes)}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={localNotes}
            onChange={handleChange}
            placeholder="Ghi nhanh ý tưởng hoặc kết quả đạt được trong phiên này..."
            className="flex-1 w-full text-sm p-3 focus:outline-none resize-none bg-transparent"
            style={{
              color: '#243024',
              minHeight: 140,
            }}
          />
        )}

        {/* Save Status Indicator */}
        <div className="absolute bottom-0 right-0 text-[11px] font-medium" style={{ color: '#5F6E5F' }}>
          {saveStatus === 'saving' && <span className="animate-pulse">Đang lưu...</span>}
          {saveStatus === 'saved' && <span style={{ color: '#5FAF6E' }}>Đã lưu ✓</span>}
          {saveStatus === 'error' && <span style={{ color: '#C1644C' }}>Lỗi lưu ghi chú ✕</span>}
        </div>
      </div>
    </div>
  );
}
