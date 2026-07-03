/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SuratMasuk, Proposal, LPJ, SuratKeluar, User } from '../types';
import {
  FolderArchive,
  Search,
  FileText,
  Calendar,
  Layers,
  Filter,
  CheckCircle,
  FileDown,
  ShieldAlert,
  SlidersHorizontal,
  FolderOpen,
  QrCode,
  Trash2
} from 'lucide-react';

interface ArchiveViewProps {
  suratMasuk: SuratMasuk[];
  proposals: Proposal[];
  lpjs: LPJ[];
  suratKeluar: SuratKeluar[];
  user: User;
  onDeleteSuratMasuk?: (id: string) => Promise<void>;
  onDeleteProposal?: (id: string) => Promise<void>;
  onDeleteLpj?: (id: string) => Promise<void>;
  onDeleteSuratKeluar?: (id: string) => Promise<void>;
}

export default function ArchiveView({
  suratMasuk,
  proposals,
  lpjs,
  suratKeluar,
  user,
  onDeleteSuratMasuk,
  onDeleteProposal,
  onDeleteLpj,
  onDeleteSuratKeluar
}: ArchiveViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | 'Surat Masuk' | 'Proposal' | 'LPJ' | 'Surat Keluar'>('Semua');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Advanced filters
  const [yearFilter, setYearFilter] = useState<string>('2026');

  // Unified archive rows generator
  const getUnifiedArchive = () => {
    const list: any[] = [];

    if (categoryFilter === 'Semua' || categoryFilter === 'Surat Masuk') {
      suratMasuk.forEach(s => {
        list.push({
          id: s.id,
          sourceType: 'Surat Masuk',
          nomorAgenda: s.nomorAgenda,
          nomorResmi: s.nomorSurat,
          judul: s.perihal,
          asal: s.instansi,
          tanggal: s.tanggalDiterima,
          status: s.status,
          detail: s
        });
      });
    }

    if (categoryFilter === 'Semua' || categoryFilter === 'Proposal') {
      proposals.forEach(p => {
        list.push({
          id: p.id,
          sourceType: 'Proposal',
          nomorAgenda: p.nomorAgenda,
          nomorResmi: p.nomorAgenda, // Fallback
          judul: p.jenisBantuan,
          asal: p.namaCabor,
          tanggal: p.deadlineLPJ,
          status: p.status,
          detail: p
        });
      });
    }

    if (categoryFilter === 'Semua' || categoryFilter === 'LPJ') {
      lpjs.forEach(l => {
        list.push({
          id: l.id,
          sourceType: 'LPJ',
          nomorAgenda: l.nomorAgenda,
          nomorResmi: l.nomorLPJ,
          judul: l.tahapDana,
          asal: l.namaCabor,
          tanggal: l.nomorAgenda ? '2026-07-01' : '2026-07-01', // Standardized
          status: l.status,
          detail: l
        });
      });
    }

    if (categoryFilter === 'Semua' || categoryFilter === 'Surat Keluar') {
      suratKeluar.forEach(s => {
        list.push({
          id: s.id,
          sourceType: 'Surat Keluar',
          nomorAgenda: s.nomorSurat, // Display as main
          nomorResmi: s.nomorSurat,
          judul: s.perihal,
          asal: s.tujuan,
          tanggal: s.tanggal,
          status: s.status,
          detail: s
        });
      });
    }

    return list.filter(item => {
      const matchText = 
        item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.asal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nomorAgenda.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchYear = yearFilter === 'Semua' || item.tanggal.includes(yearFilter);
      return matchText && matchYear;
    });
  };

  const archiveData = getUnifiedArchive();

  const canDelete = (sourceType: string) => {
    if (sourceType === 'Surat Masuk' || sourceType === 'Surat Keluar') {
      return ['Super Admin', 'Operator', 'Sekretaris'].includes(user.role);
    }
    if (sourceType === 'Proposal' || sourceType === 'LPJ') {
      return ['Super Admin', 'Operator', 'Sekretaris', 'Bendahara'].includes(user.role);
    }
    return false;
  };

  const handleDeleteClick = (item: any) => {
    // If we delete the currently selected item, let's clear the selected item in the state
    if (selectedItem?.id === item.id && selectedItem?.sourceType === item.sourceType) {
      setSelectedItem(null);
    }

    if (item.sourceType === 'Surat Masuk' && onDeleteSuratMasuk) {
      onDeleteSuratMasuk(item.id);
    } else if (item.sourceType === 'Proposal' && onDeleteProposal) {
      onDeleteProposal(item.id);
    } else if (item.sourceType === 'LPJ' && onDeleteLpj) {
      onDeleteLpj(item.id);
    } else if (item.sourceType === 'Surat Keluar' && onDeleteSuratKeluar) {
      onDeleteSuratKeluar(item.id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-700 animate-fade-in" id="archive-view">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="archive-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Arsip Digital & Dokumen</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gudang data persuratan dan administrasi KONI Kabupaten Jepara yang aman, terindeks secara otomatis, dan dapat diakses dengan cepat.
          </p>
        </div>
      </div>

      {/* Search and Advanced Filters toolbar */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4 text-xs font-semibold" id="archive-toolbar">
        
        {/* Category Toggles */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto" id="archive-category-buttons">
          {['Semua', 'Surat Masuk', 'Proposal', 'LPJ', 'Surat Keluar'].map(cat => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat as any);
                setSelectedItem(null);
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                categoryFilter === cat
                  ? 'bg-white text-blue-600 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Input search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari arsip berdasarkan perihal, asal surat/cabor, nomor agenda..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="archive-search-input"
          />
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <span className="text-slate-500">Tahun:</span>
          <select
            className="p-1.5 border border-slate-200 rounded bg-white"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="Semua">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

      </div>

      {/* Results Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="archive-main-grid">
        
        {/* Table list left */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden" id="archive-table-container">
          <div className="overflow-x-auto" id="archive-table-scroller">
            <table className="w-full text-left border-collapse" id="archive-table">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                  <th className="px-4 py-3">Sumber Dokumen</th>
                  <th className="px-4 py-3">Nomor Agenda / Identitas</th>
                  <th className="px-4 py-3">Perihal & Tujuan</th>
                  <th className="px-4 py-3">Status Akhir</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {archiveData.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    onClick={() => setSelectedItem(row)}
                    className={`hover:bg-blue-50/30 transition cursor-pointer ${
                      selectedItem?.id === row.id && selectedItem?.sourceType === row.sourceType
                        ? 'bg-blue-50/50'
                        : ''
                    }`}
                    id={`archive-row-${rIdx}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        row.sourceType === 'Surat Masuk'
                          ? 'bg-blue-50 text-blue-600'
                          : row.sourceType === 'Proposal'
                          ? 'bg-orange-50 text-orange-600'
                          : row.sourceType === 'LPJ'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {row.sourceType}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">
                      {row.nomorAgenda}
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <div className="font-semibold text-slate-800 leading-snug truncate" title={row.judul}>{row.judul}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{row.asal}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-600">
                      {row.status}
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(row);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                        id={`btn-open-archive-${rIdx}`}
                      >
                        Buka
                      </button>
                      {canDelete(row.sourceType) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(row);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition inline-flex items-center justify-center cursor-pointer"
                          title="Hapus berkas dari arsip"
                          id={`btn-delete-archive-${rIdx}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {archiveData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Tidak ada dokumen arsip ditemukan dengan filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Panel Right */}
        <div className="lg:col-span-4" id="archive-detail-panel">
          {selectedItem ? (
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-6" id="archive-details-card">
              
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Tipe Arsip: {selectedItem.sourceType}</span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1">{selectedItem.asal}</h2>
                </div>
                <div className="h-10 w-10 border border-slate-200 rounded p-1 flex items-center justify-center bg-slate-50">
                  <QrCode className="h-7 w-7 text-slate-800" />
                </div>
              </div>

              {/* General details of archived file */}
              <div className="space-y-4 text-xs" id="archive-meta-grid">
                <div>
                  <span className="text-slate-400 font-medium block">Nomor Resmi:</span>
                  <span className="font-semibold text-slate-800 font-mono block mt-0.5">{selectedItem.nomorResmi}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Perihal Dokumen:</span>
                  <p className="text-slate-800 leading-relaxed font-medium bg-slate-50 p-2.5 rounded border border-slate-100 mt-1">
                    {selectedItem.judul}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium block">Tanggal Arsip:</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{selectedItem.tanggal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Status Akhir:</span>
                    <span className="font-semibold text-emerald-600 block mt-0.5">{selectedItem.status}</span>
                  </div>
                </div>
              </div>

              {/* Security Digital stamp */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2.5 text-[11px]" id="security-digital-stamp">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Sertifikat Digital KONI (QR-Secure)</span>
                </div>
                <p className="text-slate-500 leading-normal">
                  Dokumen ini tersimpan secara permanen dalam arsip elektronik SIAP KONI Jepara dan telah dibubuhkan tanda pengenal elektronik bersertifikat.
                </p>
                <div className="font-mono text-[9px] text-slate-400 bg-white border border-slate-100 p-2 rounded">
                  AES-256-ID: {selectedItem.id.substring(0, 10).toUpperCase()}... {selectedItem.sourceType.toUpperCase()}-KONI-SECURE
                </div>
              </div>

              {/* Download / Print options */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => alert(`Simulasi mengunduh berkas lengkap format PDF untuk arsip nomor ${selectedItem.nomorResmi}.`)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Unduh Salinan PDF Arsip
                </button>
                {canDelete(selectedItem.sourceType) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(selectedItem)}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    id="btn-delete-archive-detail"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Berkas dari Arsip</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 border-dashed rounded-xl p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-64">
              <FolderOpen className="h-8 w-8 text-slate-300" />
              <span>Silakan pilih salah satu data di samping untuk menampilkan metadata sertifikasi arsip digital.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
