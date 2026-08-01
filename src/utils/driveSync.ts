import type { Transaction, ClassificationRule, BankAccount, IncomeEntry } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

export interface SyncData {
  version: 1;
  savedAt: number;
  transactions: Transaction[];
  rules: ClassificationRule[];
  bankAccounts: BankAccount[];
  incomeEntries: IncomeEntry[];
  importedHashes: string[];
}

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'kakeibo-data.json';
const CLIENT_ID_KEY = 'kakeibo_google_client_id';
const MODIFIED_AT_KEY = 'kakeibo_local_modified_at';
const AUTO_CONNECT_KEY = 'kakeibo_drive_auto_connect';

let accessToken: string | null = null;
let fileId: string | null = null;

export class DriveAuthError extends Error {}

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}

export function setClientId(id: string): void {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

export function getAutoConnect(): boolean {
  return localStorage.getItem(AUTO_CONNECT_KEY) === '1';
}

export function setAutoConnect(enabled: boolean): void {
  if (enabled) localStorage.setItem(AUTO_CONNECT_KEY, '1');
  else localStorage.removeItem(AUTO_CONNECT_KEY);
}

export function getLocalModifiedAt(): number {
  const v = localStorage.getItem(MODIFIED_AT_KEY);
  return v ? Number(v) : 0;
}

export function setLocalModifiedAt(ts: number): void {
  localStorage.setItem(MODIFIED_AT_KEY, String(ts));
}

export function hasToken(): boolean {
  return accessToken !== null;
}

export function clearToken(): void {
  accessToken = null;
  fileId = null;
}

let gisPromise: Promise<any> | null = null;

function loadGis(): Promise<any> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google.accounts.oauth2);
      else reject(new Error('Google Identity Servicesの読み込みに失敗しました'));
    };
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Google Identity Servicesの読み込みに失敗しました'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

// silent=true: 過去に許可済みならポップアップなしでトークン再取得を試みる
export async function requestAccessToken(clientId: string, silent: boolean): Promise<boolean> {
  const oauth2 = await loadGis();
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };
    try {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp: any) => {
          if (resp?.access_token) {
            accessToken = resp.access_token;
            done(true);
          } else {
            done(false);
          }
        },
        error_callback: () => done(false),
      });
      client.requestAccessToken({ prompt: silent ? '' : 'consent' });
      // サイレント時に応答が返らないケースのタイムアウト
      if (silent) setTimeout(() => done(false), 15000);
    } catch {
      done(false);
    }
  });
}

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!accessToken) throw new DriveAuthError('未接続です');
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (res.status === 401 || res.status === 403) {
    accessToken = null;
    throw new DriveAuthError('Googleドライブへの認証が切れました');
  }
  if (!res.ok) {
    throw new Error(`Google Drive APIエラー (${res.status})`);
  }
  return res;
}

export async function fetchRemote(): Promise<SyncData | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=${q}`
  );
  const json = await res.json();
  const file = json.files?.[0];
  if (!file) {
    fileId = null;
    return null;
  }
  fileId = file.id;
  const res2 = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );
  try {
    return (await res2.json()) as SyncData;
  } catch {
    return null;
  }
}

export async function uploadRemote(data: SyncData): Promise<void> {
  const body = JSON.stringify(data);
  if (fileId) {
    await driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      }
    );
    return;
  }
  const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
  const boundary = 'kakeibo_sync_boundary';
  const multipart =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${body}\r\n` +
    `--${boundary}--`;
  const res = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    }
  );
  const json = await res.json();
  fileId = json.id;
}
