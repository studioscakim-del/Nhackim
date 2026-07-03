/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SuratKeluar, User } from '../types';
import {
  FileUp,
  Search,
  CheckCircle,
  FileText,
  Clock,
  Send,
  Printer,
  FileSpreadsheet,
  FileDown,
  Sparkles,
  QrCode,
  Lock,
  Signature,
  Trash2
} from 'lucide-react';

interface SuratKeluarViewProps {
  suratKeluar: SuratKeluar[];
  user: User;
  onAddSuratKeluar: (newSk: any) => Promise<void>;
  onUpdateSuratKeluarStatus: (id: string, updateData: any) => Promise<void>;
  onDeleteSuratKeluar?: (id: string) => Promise<void>;
}

export default function SuratKeluarView({
  suratKeluar,
  user,
  onAddSuratKeluar,
  onUpdateSuratKeluarStatus,
  onDeleteSuratKeluar
}: SuratKeluarViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedSk, setSelectedSk] = useState<SuratKeluar | null>(null);

  // Form State
  const [tujuan, setTujuan] = useState('');
  const [perihal, setPerihal] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [lampiran, setLampiran] = useState('');
  const [penandatangan, setPenandatangan] = useState<'Ketua' | 'Sekretaris' | 'Bendahara'>('Sekretaris');

  // Status/TTE State
  const [statusInput, setStatusInput] = useState<'Konsep' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditandatangani' | 'Dikirim'>('Konsep');
  const [catatanInput, setCatatanInput] = useState('');

  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tujuan,
      perihal,
      tanggal,
      lampiran: lampiran || 'Surat_Lampiran.pdf',
      penandatangan,
      status: 'Konsep',
      creatorName: user.name
    };

    await onAddSuratKeluar(payload);

    // Reset Form
    setTujuan('');
    setPerihal('');
    setLampiran('');
    setShowDraftModal(false);
  };

  const handleUpdateStatus = async (performSigning: boolean) => {
    if (!selectedSk) return;

    const payload = {
      status: statusInput,
      updaterName: user.name,
      updaterRole: user.role,
      catatan: catatanInput || `Mengubah status surat keluar menjadi ${statusInput}.`,
      performSigning
    };

    await onUpdateSuratKeluarStatus(selectedSk.id, payload);

    // Locally update select target
    const hash = performSigning ? `SHA256:${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}` : undefined;
    setSelectedSk({
      ...selectedSk,
      status: statusInput,
      tandaTanganDigital: performSigning ? {
        signedBy: `${user.name} (${user.role} KONI Jepara)`,
        signedAt: new Date().toISOString(),
        signatureData: hash
      } : selectedSk.tandaTanganDigital,
      statusHistory: [
        ...selectedSk.statusHistory,
        {
          tanggal: new Date().toISOString(),
          statusLama: selectedSk.status,
          statusBaru: statusInput,
          pengguna: user.name,
          catatan: catatanInput || `Pembaruan status ke ${statusInput}.`
        }
      ]
    });

    setCatatanInput('');
  };

  const filteredSk = suratKeluar.filter(s => {
    const sTerm = searchTerm.toLowerCase();
    return (
      s.nomorSurat.toLowerCase().includes(sTerm) ||
      s.tujuan.toLowerCase().includes(sTerm) ||
      s.perihal.toLowerCase().includes(sTerm)
    );
  });

  const handleSelectSk = (s: SuratKeluar) => {
    setSelectedSk(s);
    setStatusInput(s.status);
  };

  const exportDocument = (type: 'PDF' | 'Excel' | 'Word') => {
    if (!selectedSk) return;
    alert(`Mengekspor Dokumen "${selectedSk.nomorSurat}" ke format ${type}.\n\nStatus TTE: ${selectedSk.tandaTanganDigital ? 'TERVERIFIKASI SAH' : 'BELUM DITANDATANGANI'}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-700" id="surat-keluar-view">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="sk-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modul Surat Keluar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Konsep surat dinas, kelola proses persetujuan (approval) pimpinan, bubuhkan Tanda Tangan Elektronik (TTE) sah, serta ekspor dokumen ke format digital.
          </p>
        </div>
        {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
          <button
            onClick={() => setShowDraftModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
            id="btn-draft-sk"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Buat Draf Surat Keluar</span>
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sk-main-grid">
        
        {/* Left: Lists */}
        <div className="lg:col-span-8 space-y-4" id="sk-list-panel">
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            
            {/* Search filter */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50" id="sk-search-area">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nomor surat, tujuan, perihal..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="search-sk-input"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto" id="sk-table-scroller">
              <table className="w-full text-left border-collapse" id="sk-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                    <th className="px-4 py-3">No. Surat</th>
                    <th className="px-4 py-3">Tujuan Surat</th>
                    <th className="px-4 py-3">Perihal / Penandatangan</th>
                    <th className="px-4 py-3">TTE Status</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredSk.map((sk) => (
                    <tr
                      key={sk.id}
                      onClick={() => handleSelectSk(sk)}
                      className={`hover:bg-blue-50/30 transition cursor-pointer ${
                        selectedSk?.id === sk.id ? 'bg-blue-50/50' : ''
                      }`}
                      id={`sk-row-${sk.id}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-900 font-mono">
                        {sk.nomorSurat}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{sk.tujuan}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{sk.tanggal}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium truncate max-w-xs" title={sk.perihal}>{sk.perihal}</div>
                        <div className="text-[10px] text-blue-500 mt-0.5 font-semibold">Tanda Tangan: {sk.penandatangan}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {sk.tandaTanganDigital ? (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-100">
                            <Lock className="h-2.5 w-2.5 text-emerald-600" />
                            TTE VERIFIED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded font-semibold border border-slate-150">
                            PENDING SIGN
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sk.status === 'Ditandatangani' || sk.status === 'Dikirim'
                            ? 'bg-emerald-50 text-emerald-600'
                            : sk.status === 'Menunggu Persetujuan'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {sk.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSk(sk);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                            id={`btn-view-sk-${sk.id}`}
                          >
                            Kelola
                          </button>
                          {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteSuratKeluar) onDeleteSuratKeluar(sk.id);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                              title="Hapus Surat Keluar"
                              id={`btn-delete-sk-${sk.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSk.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Tidak ada berkas draf surat keluar ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Detailed sheet */}
        <div className="lg:col-span-4" id="sk-detail-panel">
          {selectedSk ? (
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-6" id="sk-details-card">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded">
                    SURAT KELUAR
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1.5">{selectedSk.nomorSurat}</h2>
                </div>
                <div className="h-10 w-10 border border-slate-200 rounded p-1 flex items-center justify-center bg-slate-50">
                  <QrCode className="h-7 w-7 text-slate-800" />
                </div>
              </div>

              {/* TTE Box Details */}
              {selectedSk.tandaTanganDigital ? (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Signature className="h-4.5 w-4.5 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Tanda Tangan Elektronik (TTE)</h3>
                  </div>
                  <div className="text-[11px] text-slate-700 space-y-1 font-mono">
                    <p><b>Penandatangan:</b> {selectedSk.tandaTanganDigital.signedBy}</p>
                    <p><b>Waktu TTE:</b> {new Date(selectedSk.tandaTanganDigital.signedAt).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-slate-400 break-all bg-white border border-slate-150 p-2 rounded mt-1">
                      {selectedSk.tandaTanganDigital.signatureData}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-4 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <span className="font-semibold text-slate-700">TTE Pengurus Belum Dibubuhkan</span>
                  <span>Memerlukan review dan otorisasi digital sesuai penandatangan terkait.</span>
                </div>
              )}

              {/* General details */}
              <div className="space-y-3.5 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block">Tujuan Surat:</span>
                  <span className="font-semibold text-slate-800 leading-normal block">{selectedSk.tujuan}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Perihal:</span>
                  <span className="font-semibold text-slate-800 leading-normal block mt-0.5">{selectedSk.perihal}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium block">Tanggal Surat:</span>
                    <span className="font-semibold text-slate-800">{selectedSk.tanggal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Lampiran:</span>
                    <span className="font-semibold text-slate-800 truncate block" title={selectedSk.lampiran}>{selectedSk.lampiran || 'Tidak ada'}</span>
                  </div>
                </div>
              </div>

              {/* TTE Signing Actions based on Roles & Match Penandatangan */}
              {['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator'].includes(user.role) ? (
                <div className="pt-4 border-t border-slate-100 space-y-3" id="tte-action-panel">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Otorisasi & Bubuhkan TTE</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Set Status Persetujuan</label>
                    <select
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value as any)}
                    >
                      <option value="Konsep">Konsep / Draf</option>
                      <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                      <option value="Disetujui">Disetujui (Siap TTE)</option>
                      <option value="Ditandatangani">Tanda Tangani Secara Elektronik (TTE)</option>
                      <option value="Dikirim">Kirim Surat ke Penerima</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Catatan Persetujuan</label>
                    <input
                      type="text"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                      placeholder="Masukkan catatan instruksi persetujuan..."
                      value={catatanInput}
                      onChange={(e) => setCatatanInput(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(statusInput === 'Ditandatangani')}
                      className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10.5px] transition text-center shadow-sm cursor-pointer"
                    >
                      {statusInput === 'Ditandatangani' ? 'Bubuhkan TTE Sah' : 'Simpan Status'}
                    </button>
                    <button
                      type="button"
                      onClick={() => exportDocument('PDF')}
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10.5px] transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Cetak PDF TTE</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs mt-4">
                  <span className="font-bold block mb-1">📋 Mode Lihat Saja (Read-Only)</span>
                  <span>Sebagai Pengurus Cabor, Anda tidak memiliki izin untuk mengotorisasi surat keluar atau membubuhkan TTE. Penandatanganan dokumen dilakukan oleh jajaran Ketua dan Sekretaris KONI Jepara.</span>
                </div>
              )}

              {/* Status History / Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Histori Approval & Penandatanganan</h3>
                <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 text-xs">
                  {selectedSk.statusHistory.map((hist, index) => (
                    <div key={index} className="relative" id={`sk-timeline-${index}`}>
                      <div className="absolute -left-[21px] top-1 bg-white h-2.5 w-2.5 rounded-full border-2 border-blue-500" />
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(hist.tanggal).toLocaleString('id-ID')}
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        Status: <span className="text-blue-600">{hist.statusBaru}</span>
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{hist.catatan}</p>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                        Oleh: {hist.pengguna}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete button for authorized roles */}
              {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
                <div className="pt-4 border-t border-red-100 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteSuratKeluar) {
                        onDeleteSuratKeluar(selectedSk.id);
                        setSelectedSk(null);
                      }
                    }}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    id="btn-delete-sk-sidebar"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Berkas Surat Keluar</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-64">
              <FileUp className="h-8 w-8 text-slate-300" />
              <span>Silakan pilih salah satu surat keluar di samping untuk menandatangani draf secara elektronik (TTE).</span>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Buat Draf Surat Keluar */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-sk-draft">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Buat Draf Surat Keluar Baru</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Konsep rincian draf persuratan untuk proses approval.</p>
              </div>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleDraftSubmit} className="p-5 space-y-4 text-xs" id="sk-draft-form">
              
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Penerima / Tujuan Surat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Seluruh Pengurus Cabang Olahraga KONI Jepara"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  value={tujuan}
                  onChange={(e) => setTujuan(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Perihal Surat Keluar Resmi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Undangan Koordinasi Penyusunan RKPD Keolahragaan 2026"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Surat</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Pejabat Penandatangan TTE</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                    value={penandatangan}
                    onChange={(e) => setPenandatangan(e.target.value as any)}
                  >
                    <option value="Ketua">Ketua KONI Jepara</option>
                    <option value="Sekretaris">Sekretaris KONI Jepara</option>
                    <option value="Bendahara">Bendahara KONI Jepara</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Simulasi Nama Berkas Lampiran</label>
                <input
                  type="text"
                  placeholder="Format_Undangan_Lengkap.pdf"
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  value={lampiran}
                  onChange={(e) => setLampiran(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                  id="btn-submit-sk-draft"
                >
                  Daftarkan Draf
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// Icon helper
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
