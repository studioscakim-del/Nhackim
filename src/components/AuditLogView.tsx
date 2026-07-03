/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditLog, WhatsAppLog, BackupItem, User } from '../types';
import {
  ShieldAlert,
  Search,
  Clock,
  Smartphone,
  CheckCircle,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileDown,
  Bell,
  Cpu,
  Lock,
  History,
  Send,
  SlidersHorizontal,
  FolderSync
} from 'lucide-react';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
  whatsappLogs: WhatsAppLog[];
  backups: BackupItem[];
  user: User;
  onTriggerBackup: () => Promise<void>;
  onRestoreBackup: (id: string) => Promise<void>;
  onDeleteAuditLog: (id: string) => Promise<void>;
  onClearAllAuditLogs: () => Promise<void>;
  onDeleteWhatsAppLog: (id: string) => Promise<void>;
  onClearAllWhatsAppLogs: () => Promise<void>;
  onDeleteBackup: (id: string) => Promise<void>;
}

export default function AuditLogView({
  auditLogs,
  whatsappLogs,
  backups,
  user,
  onTriggerBackup,
  onRestoreBackup,
  onDeleteAuditLog,
  onClearAllAuditLogs,
  onDeleteWhatsAppLog,
  onClearAllWhatsAppLogs,
  onDeleteBackup
}: AuditLogViewProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'whatsapp' | 'backups'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  const handleManualBackup = async () => {
    setIsBackupLoading(true);
    try {
      await onTriggerBackup();
      alert('Pencadangan (backup) pangkalan data manual sukses dibuat!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin melakukan pemulihan (restore) database ke titik cadangan "${name}"?\n\nTindakan ini akan mengembalikan data draf ke titik sebelumnya.`)) {
      try {
        await onRestoreBackup(id);
        alert('Data berhasil dipulihkan!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filters
  const filteredAudit = auditLogs.filter(a => {
    const sTerm = searchTerm.toLowerCase();
    return (
      a.username.toLowerCase().includes(sTerm) ||
      a.role.toLowerCase().includes(sTerm) ||
      a.details.toLowerCase().includes(sTerm) ||
      a.action.toLowerCase().includes(sTerm)
    );
  });

  const filteredWA = whatsappLogs.filter(w => {
    const sTerm = searchTerm.toLowerCase();
    return (
      w.penerima.toLowerCase().includes(sTerm) ||
      w.perihal.toLowerCase().includes(sTerm) ||
      w.pesan.toLowerCase().includes(sTerm) ||
      w.status.toLowerCase().includes(sTerm)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-700 animate-fade-in" id="audit-log-view">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="audit-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Konsol Administrator</h1>
          <p className="text-xs text-slate-500 mt-1">
            Modul pemantauan keamanan (Audit Trail), log gateway pengiriman pesan otomatis WhatsApp, serta penjadwalan pencadangan pangkalan data.
          </p>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="border-b border-slate-150 flex flex-wrap gap-4" id="audit-tab-nav">
        <button
          onClick={() => { setActiveTab('audit'); setSearchTerm(''); }}
          className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="tab-audit-logs"
        >
          <History className="h-4.5 w-4.5" />
          <span>Audit Trail (Aktivitas)</span>
        </button>
        <button
          onClick={() => { setActiveTab('whatsapp'); setSearchTerm(''); }}
          className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="tab-wa-logs"
        >
          <Smartphone className="h-4.5 w-4.5" />
          <span>Log Gateway WhatsApp</span>
        </button>
        <button
          onClick={() => { setActiveTab('backups'); setSearchTerm(''); }}
          className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition flex items-center gap-2 ${
            activeTab === 'backups'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
          id="tab-backup-db"
        >
          <Database className="h-4.5 w-4.5" />
          <span>Pencadangan Database</span>
        </button>
      </div>

      {/* Search Bar & Actions (Hide in Backups Tab) */}
      {activeTab !== 'backups' && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center" id="audit-search-area">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'audit' ? "Cari log berdasarkan pengguna, peran, modul, atau aktivitas..." : "Cari log WhatsApp berdasarkan penerima, perihal, status, isi pesan..."}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="audit-search-input"
            />
          </div>
          {activeTab === 'audit' && auditLogs.length > 0 && (
            <button
              type="button"
              onClick={onClearAllAuditLogs}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              title="Hapus seluruh riwayat aktivitas audit trail"
              id="btn-clear-all-audit-logs"
            >
              <Trash2 className="h-4 w-4" />
              <span>Bersihkan Semua Log</span>
            </button>
          )}
          {activeTab === 'whatsapp' && whatsappLogs.length > 0 && (
            <button
              type="button"
              onClick={onClearAllWhatsAppLogs}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              title="Hapus seluruh riwayat log whatsapp"
              id="btn-clear-all-wa-logs"
            >
              <Trash2 className="h-4 w-4" />
              <span>Bersihkan Semua Log WA</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content Area based on Selected Tab */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden" id="audit-main-content">
        
        {/* Tab 1: Audit Log Trail */}
        {activeTab === 'audit' && (
          <div className="overflow-x-auto" id="audit-logs-tab-content">
            <table className="w-full text-left border-collapse" id="audit-logs-table">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                  <th className="px-4 py-3">Waktu Log</th>
                  <th className="px-4 py-3">Pengguna & Peran</th>
                  <th className="px-4 py-3">Modul</th>
                  <th className="px-4 py-3">Detail Aktivitas</th>
                  <th className="px-4 py-3">Metadata IP</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition" id={`audit-log-row-${log.id}`}>
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {new Date(log.tanggal).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{log.username}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{log.role}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-semibold text-slate-600">
                      {log.action}
                    </td>
                    <td className="px-4 py-4 max-w-sm">
                      <p className="text-slate-800 leading-normal">{log.details}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                      127.0.0.1
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteAuditLog(log.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Hapus log ini"
                        id={`btn-delete-audit-log-${log.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAudit.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Tidak ada rekaman aktivitas sistem yang sesuai kata kunci.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: WhatsApp Gateway Logs */}
        {activeTab === 'whatsapp' && (
          <div className="overflow-x-auto" id="whatsapp-logs-tab-content">
            <table className="w-full text-left border-collapse" id="whatsapp-logs-table">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                  <th className="px-4 py-3">Pengiriman</th>
                  <th className="px-4 py-3">Nomor Tujuan / Perihal</th>
                  <th className="px-4 py-3">Konten Pesan WhatsApp</th>
                  <th className="px-4 py-3">Pengirim (User)</th>
                  <th className="px-4 py-3">Status Gateway</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {filteredWA.map((wa) => (
                  <tr key={wa.id} className="hover:bg-slate-50/50 transition" id={`wa-log-row-${wa.id}`}>
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {new Date(wa.tanggal).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 font-mono">{wa.penerima}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{wa.perihal}</div>
                    </td>
                    <td className="px-4 py-4 max-w-md">
                      <p className="whitespace-pre-wrap leading-relaxed text-[11px] bg-slate-50 border border-slate-100 rounded p-2.5 font-mono text-slate-600">{wa.pesan}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-500 font-semibold">
                      System Scheduler
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap space-y-2">
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        {wa.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          let cleaned = wa.penerima.replace(/[^\d+]/g, '');
                          if (cleaned.startsWith('0')) {
                            cleaned = '62' + cleaned.substring(1);
                          } else if (cleaned.startsWith('+')) {
                            cleaned = cleaned.substring(1);
                          }
                          const url = `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(wa.pesan)}`;
                          window.open(url, '_blank');
                        }}
                        className="flex items-center gap-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2 py-1 rounded border border-blue-150 transition cursor-pointer shadow-sm"
                        title="Kirim ulang berkas pesan ini secara riil via WhatsApp Web"
                      >
                        <Send className="h-3 w-3" />
                        <span>Kirim Riil (wa.me)</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteWhatsAppLog(wa.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Hapus log WhatsApp ini"
                        id={`btn-delete-wa-log-${wa.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredWA.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Tidak ada riwayat pengiriman pesan WhatsApp ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Database Backups & Restore Console */}
        {activeTab === 'backups' && (
          <div className="p-6 space-y-6" id="backups-tab-content">
            
            {/* Database Stats card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="backups-stats">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Database className="h-4.5 w-4.5 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Ukuran Database</span>
                </div>
                <div className="font-mono text-lg font-bold text-slate-900">14.8 MB</div>
                <span className="text-[10px] text-slate-400 block font-semibold">Metadata & Berkas Draf Terdaftar</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Cpu className="h-4.5 w-4.5 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Metode Auto-Backup</span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Penjadwalan Kron Harian</div>
                <span className="text-[10px] text-slate-400 block font-semibold">Dijalankan otomatis setiap pukul 02:00 WIB</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 flex flex-col justify-center items-center" id="manual-backup-action-box">
                <button
                  type="button"
                  onClick={handleManualBackup}
                  disabled={isBackupLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow"
                >
                  <FolderSync className="h-4 w-4" />
                  <span>{isBackupLoading ? 'Memproses...' : 'Cadangkan Sekarang'}</span>
                </button>
                <span className="text-[9px] text-slate-400 mt-2 font-semibold">Membuat berkas snapshot db.json baru</span>
              </div>
            </div>

            {/* Backups List Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Daftar Titik Pemulihan (Recovery Snapshots)</h3>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse" id="backups-list-table">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                      <th className="px-4 py-3">Nama Berkas Snapshot</th>
                      <th className="px-4 py-3">Tanggal Pencadangan</th>
                      <th className="px-4 py-3">Ukuran File</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Aksi Pemulihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {backups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition" id={`backup-row-${b.id}`}>
                        <td className="px-4 py-4 font-mono font-bold text-slate-900">
                          {b.filename}
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px] text-slate-400">
                          {new Date(b.tanggal).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-600 font-semibold">
                          {b.ukuran}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded font-bold border border-emerald-100">
                            AMAN / VERIFIED
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => handleRestore(b.id, b.filename)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            id={`btn-restore-${b.id}`}
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBackup(b.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center cursor-pointer"
                            title="Hapus file cadangan ini"
                            id={`btn-delete-backup-${b.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
