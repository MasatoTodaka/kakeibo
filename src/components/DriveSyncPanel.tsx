import { useState, useEffect, useRef, useCallback } from 'react';
import type { Transaction, ClassificationRule, BankAccount, IncomeEntry } from '../types';
import { loadImportedHashes } from '../utils/storage';
import {
  type SyncData,
  DriveAuthError,
  getClientId,
  setClientId,
  getAutoConnect,
  setAutoConnect,
  getLocalModifiedAt,
  setLocalModifiedAt,
  hasToken,
  clearToken,
  preloadGis,
  requestAccessToken,
  fetchRemote,
  uploadRemote,
} from '../utils/driveSync';

interface DriveSyncPanelProps {
  transactions: Transaction[];
  rules: ClassificationRule[];
  bankAccounts: BankAccount[];
  incomeEntries: IncomeEntry[];
  onApplyRemote: (data: SyncData) => void;
}

type SyncStatus = 'disconnected' | 'connecting' | 'syncing' | 'synced' | 'error' | 'auth-expired';

const STATUS_LABELS: Record<SyncStatus, string> = {
  disconnected: '未接続',
  connecting: '接続中...',
  syncing: '同期中...',
  synced: '同期済み',
  error: '同期エラー',
  'auth-expired': '再接続が必要',
};

export function DriveSyncPanel({
  transactions,
  rules,
  bankAccounts,
  incomeEntries,
  onApplyRemote,
}: DriveSyncPanelProps) {
  const [clientId, setClientIdState] = useState(getClientId());
  const [clientIdInput, setClientIdInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 最新データを同期処理から参照するためのref
  const dataRef = useRef({ transactions, rules, bankAccounts, incomeEntries });
  dataRef.current = { transactions, rules, bankAccounts, incomeEntries };

  const applyingRemoteRef = useRef(false);
  const firstRenderRef = useRef(true);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef = useRef(false);

  const buildPayload = useCallback((savedAt: number): SyncData => {
    const d = dataRef.current;
    return {
      version: 1,
      savedAt,
      transactions: d.transactions,
      rules: d.rules,
      bankAccounts: d.bankAccounts,
      incomeEntries: d.incomeEntries,
      importedHashes: loadImportedHashes(),
    };
  }, []);

  const doUpload = useCallback(async () => {
    if (!hasToken()) return;
    setStatus('syncing');
    try {
      const savedAt = getLocalModifiedAt() || Date.now();
      await uploadRemote(buildPayload(savedAt));
      setStatus('synced');
      setLastSync(new Date());
      setErrorMsg(null);
    } catch (e) {
      if (e instanceof DriveAuthError) {
        connectedRef.current = false;
        setStatus('auth-expired');
      } else {
        setErrorMsg(e instanceof Error ? e.message : '同期に失敗しました');
        setStatus('error');
      }
    }
  }, [buildPayload]);

  // 接続直後の同期: リモートとローカルの新しい方を採用
  const initialSync = useCallback(async () => {
    setStatus('syncing');
    try {
      const remote = await fetchRemote();
      const localModified = getLocalModifiedAt();
      if (remote && remote.savedAt > localModified) {
        applyingRemoteRef.current = true;
        onApplyRemote(remote);
        setLocalModifiedAt(remote.savedAt);
      } else {
        const savedAt = localModified || Date.now();
        setLocalModifiedAt(savedAt);
        await uploadRemote(buildPayload(savedAt));
      }
      connectedRef.current = true;
      setStatus('synced');
      setLastSync(new Date());
      setErrorMsg(null);
    } catch (e) {
      connectedRef.current = false;
      if (e instanceof DriveAuthError) {
        setStatus('auth-expired');
      } else {
        setErrorMsg(e instanceof Error ? e.message : '同期に失敗しました');
        setStatus('error');
      }
    }
  }, [buildPayload, onApplyRemote]);

  const handleConnect = useCallback(
    async (silent: boolean) => {
      const id = getClientId();
      if (!id) return;
      setErrorMsg(null);
      if (!id.endsWith('.apps.googleusercontent.com')) {
        setErrorMsg('クライアントIDの形式が正しくありません（末尾が .apps.googleusercontent.com のIDを貼り付けてください）');
        setStatus('error');
        return;
      }
      setStatus('connecting');
      const error = await requestAccessToken(id, silent);
      if (error) {
        if (!silent) setErrorMsg(error);
        setStatus(silent ? 'auth-expired' : 'disconnected');
        return;
      }
      setAutoConnect(true);
      await initialSync();
    },
    [initialSync]
  );

  const handleDisconnect = useCallback(() => {
    clearToken();
    setAutoConnect(false);
    connectedRef.current = false;
    setStatus('disconnected');
    setLastSync(null);
  }, []);

  // ページ読み込み時にスクリプトを事前読み込みし、設定済みなら自動再接続
  useEffect(() => {
    if (getClientId()) {
      preloadGis();
      if (getAutoConnect()) handleConnect(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // データ変更を検知して接続中なら自動アップロード（更新時刻はstorage.tsの保存時に記録される）
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    if (connectedRef.current && hasToken()) {
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
      uploadTimerRef.current = setTimeout(() => doUpload(), 2500);
    }
  }, [transactions, rules, bankAccounts, incomeEntries, doUpload]);

  const handleSaveClientId = () => {
    if (!clientIdInput.trim()) return;
    setClientId(clientIdInput);
    setClientIdState(clientIdInput.trim());
    setShowSettings(false);
    preloadGis();
  };

  const connected = status === 'synced' || status === 'syncing';

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between px-3">
        <span className="text-xs text-slate-500">Googleドライブ同期</span>
        <span
          className={`text-xs ${
            status === 'synced'
              ? 'text-emerald-400'
              : status === 'error' || status === 'auth-expired'
                ? 'text-red-400'
                : 'text-slate-400'
          }`}
        >
          {STATUS_LABELS[status]}
          {status === 'synced' && lastSync
            ? ` ${lastSync.getHours()}:${String(lastSync.getMinutes()).padStart(2, '0')}`
            : ''}
        </span>
      </div>

      {errorMsg && (
        <p className="px-3 text-xs text-red-400 break-words">{errorMsg}</p>
      )}

      {!clientId || showSettings ? (
        <div className="px-3 space-y-1.5">
          <input
            type="text"
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            placeholder="OAuthクライアントID"
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleSaveClientId}
              className="flex-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-xs text-white"
            >
              保存
            </button>
            {clientId && (
              <button
                onClick={() => setShowSettings(false)}
                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-300"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      ) : connected ? (
        <div className="space-y-0.5">
          <button
            onClick={() => doUpload()}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            今すぐ同期
          </button>
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            接続解除
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          <button
            onClick={() => handleConnect(false)}
            disabled={status === 'connecting' || status === 'syncing'}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {status === 'auth-expired' ? 'ドライブに再接続' : 'ドライブに接続'}
          </button>
          <button
            onClick={() => {
              setClientIdInput(clientId);
              setShowSettings(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            クライアントID設定
          </button>
        </div>
      )}
    </div>
  );
}
