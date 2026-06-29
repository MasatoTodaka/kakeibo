import { useState } from 'react';
import type { ClassificationRule, ExpenseType } from '../types';
import { CATEGORIES } from '../config/classificationRules';

interface RuleEditorProps {
  rules: ClassificationRule[];
  onSaveRules: (rules: ClassificationRule[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function RuleEditor({
  rules,
  onSaveRules,
  isOpen,
  onClose,
}: RuleEditorProps) {
  const [editRules, setEditRules] = useState<ClassificationRule[]>(rules);
  const [newPattern, setNewPattern] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newType, setNewType] = useState<ExpenseType>('variable');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newPattern.trim()) return;
    setEditRules([
      ...editRules,
      { pattern: newPattern.trim(), category: newCategory, expenseType: newType },
    ]);
    setNewPattern('');
  };

  const handleDelete = (index: number) => {
    setEditRules(editRules.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSaveRules(editRules);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            分類ルール設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                パターン（支払先に含まれる文字列）
              </label>
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="例: NETFLIX"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                カテゴリ
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                分類
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ExpenseType)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">固定費</option>
                <option value="variable">変動費</option>
              </select>
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              追加
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600">パターン</th>
                <th className="text-left py-2 text-gray-600">カテゴリ</th>
                <th className="text-left py-2 text-gray-600">分類</th>
                <th className="text-right py-2 text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {editRules.map((rule, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 font-mono text-xs">{rule.pattern}</td>
                  <td className="py-1.5">{rule.category}</td>
                  <td className="py-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rule.expenseType === 'fixed'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {rule.expenseType === 'fixed' ? '固定費' : '変動費'}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => handleDelete(i)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            保存して再分類
          </button>
        </div>
      </div>
    </div>
  );
}
