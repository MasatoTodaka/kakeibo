import { useState } from 'react';
import type { BankAccount } from '../types';
import { formatCurrency } from '../utils/aggregation';
import { NumericInput } from './NumericInput';

interface BankAccountPanelProps {
  accounts: BankAccount[];
  onSave: (accounts: BankAccount[]) => void;
}

let idSeq = 0;

export function BankAccountPanel({ accounts, onSave }: BankAccountPanelProps) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const handleAdd = () => {
    const balance = parseInt(newBalance.replace(/,/g, ''), 10);
    if (!newName.trim() || isNaN(balance)) return;
    const account: BankAccount = {
      id: `bank-${Date.now()}-${++idSeq}`,
      name: newName.trim(),
      balance,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    onSave([...accounts, account]);
    setNewName('');
    setNewBalance('');
  };

  const handleDelete = (id: string) => {
    onSave(accounts.filter((a) => a.id !== id));
  };

  const handleUpdateBalance = (id: string, value: string) => {
    const balance = parseInt(value.replace(/,/g, ''), 10);
    if (isNaN(balance)) return;
    onSave(
      accounts.map((a) =>
        a.id === id
          ? { ...a, balance, updatedAt: new Date().toISOString().slice(0, 10) }
          : a
      )
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">銀行口座残高</h2>
        <button
          onClick={() => setEditing(!editing)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {editing ? '完了' : '編集'}
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600">総残高</div>
          <div className="text-2xl font-bold text-blue-800">
            {formatCurrency(totalBalance)}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {accounts.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <div className="font-medium text-gray-900">{a.name}</div>
              <div className="text-xs text-gray-400">
                更新: {a.updatedAt}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editing ? (
                <>
                  <input
                    type="text"
                    defaultValue={a.balance.toLocaleString()}
                    onBlur={(e) => handleUpdateBalance(a.id, e.target.value)}
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    削除
                  </button>
                </>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(a.balance)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex gap-2 items-end pt-3 border-t border-gray-200">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">口座名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 三井住友銀行"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">残高</label>
            <NumericInput
              value={newBalance}
              onChange={setNewBalance}
              placeholder="例: 500000"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
          >
            追加
          </button>
        </div>
      )}

      {accounts.length === 0 && !editing && (
        <div className="text-center py-4 text-gray-400 text-sm">
          「編集」ボタンから口座を追加してください
        </div>
      )}
    </div>
  );
}
