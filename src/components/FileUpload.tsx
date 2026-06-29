import { useState, useCallback } from 'react';
import { type CardBrand, CARD_BRAND_LABELS } from '../types';

type BrandMode = 'auto' | CardBrand;

interface FileUploadProps {
  onUpload: (files: File[], cardBrand: CardBrand | 'auto') => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [brandMode, setBrandMode] = useState<BrandMode>('auto');
  const [dragOver, setDragOver] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const csvFiles = Array.from(fileList).filter((f) =>
        f.name.toLowerCase().endsWith('.csv')
      );
      if (csvFiles.length === 0) {
        alert('CSVファイルを選択してください');
        return;
      }
      onUpload(csvFiles, brandMode);
    },
    [brandMode, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-gray-800">CSV読み込み</h2>
        <span className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
          &#9660;
        </span>
      </button>

      {!collapsed && (<>

      <div className="mb-4 mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          カード銘柄
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setBrandMode('auto')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              brandMode === 'auto'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            自動判定
          </button>
          {(Object.entries(CARD_BRAND_LABELS) as [CardBrand, string][])
            .filter(([value]) => value !== 'manual')
            .map(([value, label]) => (
              <button
                key={value}
                onClick={() => setBrandMode(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  brandMode === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
        </div>
        {brandMode === 'auto' && (
          <p className="text-xs text-gray-400 mt-1">
            CSVの内容からカード銘柄を自動で判定します
          </p>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="text-gray-500 mb-2">
          CSVファイルをドラッグ&ドロップ（複数可）
        </div>
        <div className="text-gray-400 text-sm mb-3">または</div>
        <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium">
          ファイルを選択
          <input
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />
        </label>
      </div>

      </>)}
    </div>
  );
}
