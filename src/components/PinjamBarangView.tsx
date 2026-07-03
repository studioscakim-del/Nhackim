/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PinjamBarang, User } from '../types';
import {
  Package,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  Filter,
  User as UserIcon,
  HelpCircle,
  Check,
  ChevronRight
} from 'lucide-react';

interface PinjamBarangViewProps {
  peminjaman: PinjamBarang[];
  user: User;
  onAddPinjam: (newPinjam: any) => Promise<void>;
  onUpdateStatusPinjam: (id: string, status: string, catatanPetugas?: string) => Promise<void>;
  onDeletePinjam: (id: string) => Promise<void>;
  onSendWhatsApp?: (penerima: string, perihal: string, pesan: string) => Promise<void>;
}

export default function PinjamBarangView({
  peminjaman,
  user,
  onAddPinjam,
  onUpdateStatusPinjam,
  onDeletePinjam,
  onSendWhatsApp
}: PinjamBarangViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [namaPeminjam, setNamaPeminjam] = useState(user.role === 'Pengurus Cabang Olahraga (Cabor)' ? user.name : '');
  const [instansi, setInstansi] = useState(user.role === 'Pengurus Cabang Olahraga (Cabor)' ? (user.caborName || '') : '');
  const [namaBarang, setNamaBarang] = useState('Tenda Lipat KONI');
  const [customBarang, setCustomBarang] = useState('');
  const [jumlah, setJumlah] = useState(1);
  const [tanggalPinjam, setTanggalPinjam] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalKembali, setTanggalKembali] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [keterangan, setKeterangan] = useState('');
  const [noWhatsApp, setNoWhatsApp] = useState(user.phone || '');

  // Detail & Approval modal states
  const [selectedItem, setSelectedItem] = useState<PinjamBarang | null>(null);
  const [catatanPetugas, setCatatanPetugas] = useState('');

  const handleOpenWhatsApp = (phone: string, text: string) => {
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    const url = `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendWaNotification = async (item: PinjamBarang) => {
    if (!item.noWhatsApp) return;

    let actionWord = 'telah diperbarui';
    let statusText = item.status.toUpperCase();
    if (item.status === 'Disetujui') {
      actionWord = 'DISETUJUI oleh Sekretariat';
    } else if (item.status === 'Ditolak') {
      actionWord = 'DITOLAK oleh Sekretariat';
    } else if (item.status === 'Dikembalikan') {
      actionWord = 'DIKONFIRMASI TELAH DIKEMBALIKAN dengan baik';
    } else {
      actionWord = 'telah diterima oleh Sekretariat KONI Jepara (Status: MENUNGGU PERSETUJUAN)';
    }

    const waMessage = `Halo ${item.namaPeminjam},\n\nStatus pengajuan peminjaman barang Anda ${actionWord}.\n- Barang: ${item.namaBarang}\n- Jumlah: ${item.jumlah} Unit\n- Tanggal Pinjam: ${item.tanggalPinjam}\n- Tanggal Kembali: ${item.tanggalKembali}\n${item.catatanPetugas ? `- Catatan Petugas: ${item.catatanPetugas}\n` : ''}\nStatus Akhir: *${statusText}*.\n\nTerima kasih,\nSekretariat KONI Jepara`;

    if (onSendWhatsApp) {
      await onSendWhatsApp(item.noWhatsApp, `Notifikasi Peminjaman: ${item.namaBarang}`, waMessage);
    }
    handleOpenWhatsApp(item.noWhatsApp, waMessage);
  };

  const inventoryPresets = [
    'Tenda Lipat KONI',
    'Sound System Portable',
    'Proyektor & Screen',
    'Laptop Operasional',
    'Kursi Lipat',
    'Meja Lipat',
    'Aula Pertemuan Gedung KONI',
    'Kendaraan Operasional KONI',
    'Lainnya'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBarang = namaBarang === 'Lainnya' ? customBarang : namaBarang;

    const payload = {
      namaPeminjam: namaPeminjam.trim(),
      instansi: instansi.trim(),
      namaBarang: finalBarang.trim(),
      jumlah: Number(jumlah),
      tanggalPinjam,
      tanggalKembali,
      keterangan: keterangan.trim(),
      noWhatsApp: noWhatsApp.trim()
    };

    await onAddPinjam(payload);

    // Trigger manual WhatsApp Web Redirect
    if (noWhatsApp.trim()) {
      const waMessage = `Halo ${namaPeminjam.trim()},\n\nPengajuan peminjaman barang Anda telah diterima oleh Sekretariat KONI Jepara:\n- Barang: ${finalBarang.trim()}\n- Jumlah: ${jumlah} Unit\n- Tanggal Pinjam: ${tanggalPinjam}\n- Tanggal Kembali: ${tanggalKembali}\n- Keperluan: ${keterangan.trim() || '-'}\n\nStatus saat ini: *MENUNGGU PERSETUJUAN*.\n\nTerima kasih,\nSekretariat KONI Jepara`;
      handleOpenWhatsApp(noWhatsApp.trim(), waMessage);
    }

    // Reset Form
    setCustomBarang('');
    setKeterangan('');
    setShowAddModal(false);
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    await onUpdateStatusPinjam(itemId, newStatus, catatanPetugas);
    if (selectedItem && selectedItem.noWhatsApp) {
      const updatedItem = { ...selectedItem, status: newStatus, catatanPetugas };
      await handleSendWaNotification(updatedItem);
    }
    setSelectedItem(null);
    setCatatanPetugas('');
  };

  // Stats Counters
  const totalCount = peminjaman.length;
  const pendingCount = peminjaman.filter(p => p.status === 'Menunggu Persetujuan').length;
  const activeCount = peminjaman.filter(p => p.status === 'Disetujui').length;
  const returnedCount = peminjaman.filter(p => p.status === 'Dikembalikan').length;

  // Filter & Search logic
  const filteredData = peminjaman.filter((p) => {
    const matchesStatus = statusFilter === 'Semua' || p.status === statusFilter;
    const matchesSearch =
      p.namaPeminjam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.instansi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.keterangan.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Menunggu Persetujuan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <AlertCircle className="h-3 w-3" />
            <span>Menunggu</span>
          </span>
        );
      case 'Disetujui':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Check className="h-3 w-3" />
            <span>Disetujui</span>
          </span>
        );
      case 'Ditolak':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
            <XCircle className="h-3 w-3" />
            <span>Ditolak</span>
          </span>
        );
      case 'Dikembalikan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle className="h-3 w-3" />
            <span>Selesai / Kembali</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-700 animate-fade-in" id="pinjam-view-container">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="pinjam-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Peminjaman Barang & Prasarana</h1>
          <p className="text-xs text-slate-500 mt-1">
            Modul pengajuan peminjaman inventaris, prasarana olahraga, tenda, sound system, dan aula Sekretariat KONI Kabupaten Jepara.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          id="btn-add-pinjam"
        >
          <Plus className="h-4 w-4" />
          <span>Ajukan Peminjaman</span>
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="pinjam-stats">
        <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Peminjaman</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Menunggu Persetujuan</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sedang Dipinjam / Aktif</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telah Dikembalikan</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{returnedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="pinjam-filters-container">
        <div className="flex flex-wrap items-center gap-2" id="pinjam-status-filters">
          {['Semua', 'Menunggu Persetujuan', 'Disetujui', 'Ditolak', 'Dikembalikan'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {status === 'Semua' ? 'Semua' : status === 'Dikembalikan' ? 'Selesai' : status}
            </button>
          ))}
        </div>

        <div className="relative max-w-md w-full md:w-80">
          <input
            type="text"
            className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Cari peminjam, barang, keterangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List of Borrowings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="pinjam-list">
        {filteredData.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="bg-white border border-slate-150 hover:border-slate-300 rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between relative group"
            id={`pinjam-card-${item.id}`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.namaBarang}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono tracking-wider uppercase">
                    Jumlah: <span className="text-slate-700">{item.jumlah} Unit</span>
                  </p>
                </div>
                {getStatusBadge(item.status)}
              </div>

              <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">{item.namaPeminjam}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500 truncate">{item.instansi}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    {item.tanggalPinjam} s/d {item.tanggalKembali}
                  </span>
                </div>
              </div>

              {item.keterangan && (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded-lg line-clamp-2 mt-2">
                  "{item.keterangan}"
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-mono">ID: {item.id}</span>
              <span className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5">
                <span>Detail</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* Trash option for authorized personnel */}
            {['Super Admin', 'Operator'].includes(user.role) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePinjam(item.id);
                }}
                className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                title="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 italic text-xs">
            Tidak ada pengajuan peminjaman barang ditemukan.
          </div>
        )}
      </div>

      {/* DETAIL MODAL WITH APPROVAL CONTROLS */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-detail-pinjam">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-fade-in">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Rincian Pengajuan Peminjaman</h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">KODE: {selectedItem.id}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              
              <div className="bg-slate-50 p-3 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Status</span>
                  {getStatusBadge(selectedItem.status)}
                </div>
                <div className="border-t border-slate-200/60 my-1"></div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Barang / Fasilitas</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedItem.namaBarang} ({selectedItem.jumlah} Unit)</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Nama Peminjam</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedItem.namaPeminjam}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Cabor / Instansi</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedItem.instansi}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Mulai Pinjam</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedItem.tanggalPinjam}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Target Kembali</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedItem.tanggalKembali}</p>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Keperluan / Keterangan</span>
                  <p className="font-medium text-slate-600 mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {selectedItem.keterangan || '-'}
                  </p>
                </div>

                {selectedItem.noWhatsApp && (
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">WhatsApp Notifikasi</span>
                    <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-blue-500" />
                      <span>{selectedItem.noWhatsApp}</span>
                    </p>
                  </div>
                )}

                {selectedItem.catatanPetugas && (
                  <div className="bg-amber-50/30 border border-amber-100 p-2.5 rounded-lg">
                    <span className="text-amber-700 text-[10px] font-bold uppercase block">Catatan Sekretariat:</span>
                    <p className="font-medium text-slate-700 mt-0.5">{selectedItem.catatanPetugas}</p>
                  </div>
                )}
              </div>

              {/* ADMIN ACTION ZONE */}
              {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && selectedItem.status === 'Menunggu Persetujuan' && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">Tindakan Sekretariat (Persetujuan):</span>
                  
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Catatan Tambahan (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Masukkan catatan keputusan..."
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      value={catatanPetugas}
                      onChange={(e) => setCatatanPetugas(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedItem.id, 'Ditolak')}
                      className="py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition cursor-pointer"
                    >
                      Tolak Pengajuan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedItem.id, 'Disetujui')}
                      className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Setujui Peminjaman
                    </button>
                  </div>
                </div>
              )}

              {/* CONFIRM RETURN ZONE */}
              {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && selectedItem.status === 'Disetujui' && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">Konfirmasi Pengembalian:</span>
                  
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Catatan Kondisi Barang (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Dikembalikan dalam keadaan lengkap dan bersih."
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      value={catatanPetugas}
                      onChange={(e) => setCatatanPetugas(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedItem.id, 'Dikembalikan')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Konfirmasi Barang Kembali</span>
                  </button>
                </div>
              )}

               <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                {selectedItem.noWhatsApp && (
                  <button
                    type="button"
                    onClick={() => handleSendWaNotification(selectedItem)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm text-xs"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Kirim Notifikasi via WhatsApp</span>
                  </button>
                )}
                <div className="flex justify-between items-center gap-2">
                  {['Super Admin', 'Operator'].includes(user.role) ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePinjam(selectedItem.id);
                        setSelectedItem(null);
                      }}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Pengajuan</span>
                    </button>
                  ) : <div />}
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL: SUBMIT REQUEST */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-peminjaman-baru">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Form Pengajuan Peminjaman</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Isi rincian barang dan prasarana yang ingin dipinjam.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs" id="pinjam-form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nama Peminjam</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={namaPeminjam}
                    onChange={(e) => setNamaPeminjam(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Cabor / Instansi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PSSI Jepara / KONI Jepara"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={instansi}
                    onChange={(e) => setInstansi(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Pilih Barang</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs cursor-pointer"
                    value={namaBarang}
                    onChange={(e) => setNamaBarang(e.target.value)}
                  >
                    {inventoryPresets.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Jumlah Unit</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                  />
                </div>
              </div>

              {namaBarang === 'Lainnya' && (
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Masukkan Nama Barang</label>
                  <input
                    type="text"
                    required
                    placeholder="Tuliskan nama barang atau aula yang dipinjam..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={customBarang}
                    onChange={(e) => setCustomBarang(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Mulai Pinjam</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={tanggalPinjam}
                    onChange={(e) => setTanggalPinjam(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Pengembalian</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={tanggalKembali}
                    onChange={(e) => setTanggalKembali(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">No. WhatsApp Pemohon</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 08123456789 (untuk update persetujuan)"
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  value={noWhatsApp}
                  onChange={(e) => setNoWhatsApp(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Keterangan / Keperluan Peminjaman</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Digunakan untuk pameran, turnamen pencak silat, atau rapat pleno."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                  id="btn-submit-peminjaman"
                >
                  Kirim Pengajuan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
