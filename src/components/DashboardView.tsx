/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SuratMasuk, Proposal, LPJ, Agenda, User, WhatsAppLog } from '../types';
import {
  FileDown,
  FileUp,
  Award,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  Calendar,
  MessageSquare,
  Users,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  HelpCircle
} from 'lucide-react';

interface DashboardViewProps {
  suratMasuk: SuratMasuk[];
  proposals: Proposal[];
  lpjs: LPJ[];
  agenda: Agenda[];
  waLogs: WhatsAppLog[];
  user: User;
  setActiveTab: (tab: string) => void;
}

export default function DashboardView({
  suratMasuk,
  proposals,
  lpjs,
  agenda,
  waLogs,
  user,
  setActiveTab
}: DashboardViewProps) {
  // Compute Stats
  const totalSuratMasuk = suratMasuk.length;
  const totalSuratKeluar = 4; // Simulated baseline

  // Proposals
  const proposalMasuk = proposals.length;
  const proposalDisetujui = proposals.filter(p => p.status === 'Disetujui' || p.status === 'Dana Diproses' || p.status === 'Dana Cair' || p.status === 'Menunggu LPJ' || p.status === 'LPJ Diterima' || p.status === 'LPJ Diverifikasi' || p.status === 'Selesai').length;
  const proposalDitolak = proposals.filter(p => p.status === 'Ditolak').length;

  // Dana Cair
  const totalDanaCair = proposals
    .filter(p => p.status === 'Dana Cair' || p.status === 'Menunggu LPJ' || p.status === 'LPJ Diterima' || p.status === 'LPJ Diverifikasi' || p.status === 'Selesai')
    .reduce((sum, p) => sum + (p.nominal || 0), 0);

  // LPJ Stats
  const lpjMenunggu = lpjs.filter(l => l.status === 'Baru Masuk' || l.status === 'Diterima').length;
  const lpjDiterima = lpjs.filter(l => l.status === 'Diterima' || l.status === 'Sedang Diverifikasi').length;
  const lpjDirevisi = lpjs.filter(l => l.status === 'Perlu Revisi').length;
  const lpjDisetujui = lpjs.filter(l => l.status === 'Disetujui' || l.status === 'Diarsipkan').length;

  // Invitation
  const suratUndangan = suratMasuk.filter(s => s.jenisSurat === 'Undangan').length;

  // Calendar/Agenda
  const todayStr = new Date().toISOString().split('T')[0];
  const agendaHariIni = agenda.filter(a => a.tanggal === todayStr).length;
  
  // Agenda Minggu Ini (next 7 days)
  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);
  const agendaMingguIni = agenda.filter(a => {
    const d = new Date(a.tanggal);
    return d >= today && d <= next7Days;
  }).length;

  // Agenda Bulan Ini
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const agendaBulanIni = agenda.filter(a => {
    const d = new Date(a.tanggal);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Unprocessed Letters
  const suratBelumDiproses = suratMasuk.filter(s => s.status === 'Baru').length;

  // Notification Feed (recent updates)
  const recentWA = waLogs.slice(0, 4);

  // Mock monthly statistics for Chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const suratMasukChartData = [8, 12, 10, 15, 20, 24, 18, 0, 0, 0, 0, 0];
  const proposalChartData = [2, 4, 3, 5, 8, 12, 6, 0, 0, 0, 0, 0];
  
  // Format Currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 font-sans text-slate-700 max-w-7xl mx-auto" id="dashboard-view">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="dashboard-title-area">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Administrasi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau arus surat masuk, surat keluar, disposisi pimpinan, pencairan anggaran, dan LPJ Cabor KONI Jepara secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600 shadow-sm" id="dashboard-timezone">
          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
          <span>SISTEM AKTIF: 2026-07-01 UTC+7</span>
        </div>
      </div>

      {/* Role specific announcement banner */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white shadow-md flex items-center justify-between" id="dashboard-banner">
        <div className="space-y-1">
          <span className="bg-white/20 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Hak Akses Aktif: {user.role}
          </span>
          <h2 className="text-sm font-semibold mt-1">Sistem Informasi Administrasi Persuratan SIAP KONI Jepara</h2>
          <p className="text-xs text-blue-100 max-w-xl">
            {user.role === 'Pengurus Cabang Olahraga (Cabor)' 
              ? `Hai ${user.name}, Anda dapat mengajukan proposal pembinaan, mengunggah laporan pertanggungjawaban (LPJ), serta melacak status verifikasi dana di sini.`
              : `Selamat bertugas, ${user.name}. Gunakan menu navigasi di samping untuk memeriksa disposisi surat, menyetujui proposal, mencairkan dana, dan memverifikasi LPJ.`
            }
          </p>
        </div>
        <div className="hidden lg:block shrink-0 pr-4">
          <TrendingUp className="h-12 w-12 text-white/20" />
        </div>
      </div>

      {/* Primary KPI Widget Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="dashboard-kpi-grid">
        
        {/* Surat Masuk */}
        <div 
          onClick={() => setActiveTab('surat-masuk')}
          className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          id="kpi-surat-masuk"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Surat Masuk</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
              <FileDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{totalSuratMasuk}</h3>
            <p className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <span>{suratBelumDiproses} Baru</span>
              <span className="text-slate-400 font-normal">belum diproses</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition origin-left" />
        </div>

        {/* Proposals */}
        <div 
          onClick={() => setActiveTab('proposals')}
          className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          id="kpi-proposals"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Proposal</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{proposalMasuk}</h3>
            <p className="text-[10px] text-amber-600 mt-1 font-medium flex items-center gap-1">
              <span>{proposalDisetujui} Disetujui</span>
              <span className="text-slate-400 font-normal">• {proposalDitolak} Ditolak</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500 scale-x-0 group-hover:scale-x-100 transition origin-left" />
        </div>

        {/* Total Dana Cair */}
        <div 
          onClick={() => setActiveTab('proposals')}
          className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          id="kpi-dana-cair"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Dana Cair</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-slate-900 leading-none truncate" title={formatIDR(totalDanaCair)}>
              {formatIDR(totalDanaCair)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              Anggaran pembinaan terdistribusi
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition origin-left" />
        </div>

        {/* LPJ Status */}
        <div 
          onClick={() => setActiveTab('lpj')}
          className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          id="kpi-lpj"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-sans">Laporan (LPJ)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{lpjs.length}</h3>
            <p className="text-[10px] text-purple-600 mt-1 font-medium flex items-center gap-1 truncate">
              <span>{lpjMenunggu} Verif</span>
              <span className="text-slate-400 font-normal">• {lpjDirevisi} Revisi • {lpjDisetujui} OK</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500 scale-x-0 group-hover:scale-x-100 transition origin-left" />
        </div>

      </div>

      {/* Secondary mini dashboard widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-secondary-widgets">
        
        {/* Letters/Documents awaiting processing indicator */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4" id="dashboard-letters-progress">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Tindak Lanjut</h3>
          <div className="space-y-3">
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Surat Belum Diproses (Registrasi Baru)</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{suratBelumDiproses}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalSuratMasuk ? (suratBelumDiproses / totalSuratMasuk) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Proposal Menunggu Verifikasi</span>
                <span className="font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  {proposals.filter(p => p.status === 'Menunggu Verifikasi').length}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${proposalMasuk ? (proposals.filter(p => p.status === 'Menunggu Verifikasi').length / proposalMasuk) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">LPJ Perlu Revisi Cabor</span>
                <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{lpjDirevisi}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${lpjs.length ? (lpjDirevisi / lpjs.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Undangan Aktif Bulan Ini</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{suratUndangan}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: '50%' }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Agenda Events Summary Widget */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between" id="dashboard-agenda-progress">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Agenda Terjadwal</span>
              <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg">
                <div className="text-lg font-bold text-slate-950">{agendaHariIni}</div>
                <div className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">Hari Ini</div>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg">
                <div className="text-lg font-bold text-slate-950">{agendaMingguIni}</div>
                <div className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">Minggu Ini</div>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg">
                <div className="text-lg font-bold text-slate-950">{agendaBulanIni}</div>
                <div className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">Bulan Ini</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Lihat detail jadwal agenda & undangan</span>
            <button 
              onClick={() => setActiveTab('agenda')}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
            >
              <span>Kalender</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Alert Banner / LPJ Reminders for Dashboard */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden" id="dashboard-notif-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Notifikasi Sistem</span>
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
            </h3>
            
            <div className="space-y-2.5" id="notif-feed">
              <div className="flex gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <div>
                  <p className="font-semibold text-slate-850">WhatsApp pengingat LPJ terkirim otomatis</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">2026-06-28 09:05</p>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <div>
                  <p className="font-semibold text-slate-850">Pencairan Dana Pembinaan PSSI disetujui</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">2026-06-24 14:20</p>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <div>
                  <p className="font-semibold text-slate-850">Surat masuk SM-2026-0002 didisposisikan Ketua</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">2026-06-26 08:30</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Buka log komunikasi sekretariat</span>
            <button 
              onClick={() => setActiveTab('logs')}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
            >
              <span>Semua Log</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Visual Analytics / Charts Section built with pure responsive SVG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-charts-panel">
        
        {/* Monthly Documents Incoming vs Approved Trends */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm lg:col-span-8 space-y-4" id="monthly-analytics-chart">
          <div className="flex items-center justify-between pb-3 border-b border-slate-50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Grafik Administrasi Bulanan (Tahun 2026)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Tren pendaftaran surat masuk dan pengajuan proposal baru</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 bg-blue-500 rounded-sm" />
                <span>Surat Masuk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 bg-amber-500 rounded-sm" />
                <span>Proposal Cabor</span>
              </div>
            </div>
          </div>

          {/* Pure HTML/SVG Chart layout */}
          <div className="relative h-64 w-full" id="chart-svg-container">
            <svg viewBox="0 0 800 240" className="w-full h-full" id="chart-svg">
              {/* Grid Lines */}
              <line x1="50" y1="20" x2="780" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="70" x2="780" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="120" x2="780" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="170" x2="780" y2="170" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="50" y1="200" x2="780" y2="200" stroke="#e2e8f0" strokeWidth="1" />

              {/* Y-Axis Labels */}
              <text x="40" y="24" className="text-[10px] fill-slate-400 font-mono text-right" textAnchor="end">25</text>
              <text x="40" y="74" className="text-[10px] fill-slate-400 font-mono text-right" textAnchor="end">15</text>
              <text x="40" y="124" className="text-[10px] fill-slate-400 font-mono text-right" textAnchor="end">10</text>
              <text x="40" y="174" className="text-[10px] fill-slate-400 font-mono text-right" textAnchor="end">5</text>
              <text x="40" y="204" className="text-[10px] fill-slate-400 font-mono text-right" textAnchor="end">0</text>

              {/* Monthly bars for Surat Masuk and Proposal */}
              {months.map((m, idx) => {
                const xBase = 50 + idx * 60 + 10;
                
                // Scale factor for 200px max height corresponding to 25 units
                const scale = 180 / 25;
                const hSurat = suratMasukChartData[idx] * scale;
                const hProp = proposalChartData[idx] * scale;

                const ySurat = 200 - hSurat;
                const yProp = 200 - hProp;

                return (
                  <g key={m}>
                    {/* Background Bar Area */}
                    <rect x={xBase} y="20" width="40" height="180" fill="#f8fafc" rx="2" />
                    
                    {/* Surat Masuk Bar */}
                    {hSurat > 0 && (
                      <rect 
                        x={xBase + 4} 
                        y={ySurat} 
                        width="14" 
                        height={hSurat} 
                        fill="#3b82f6" 
                        rx="2"
                        className="transition duration-300 hover:fill-blue-600 cursor-pointer"
                      >
                        <title>{`Surat Masuk (${m}): ${suratMasukChartData[idx]}`}</title>
                      </rect>
                    )}

                    {/* Proposal Bar */}
                    {hProp > 0 && (
                      <rect 
                        x={xBase + 22} 
                        y={yProp} 
                        width="14" 
                        height={hProp} 
                        fill="#f59e0b" 
                        rx="2"
                        className="transition duration-300 hover:fill-amber-600 cursor-pointer"
                      >
                        <title>{`Proposal (${m}): ${proposalChartData[idx]}`}</title>
                      </rect>
                    )}

                    {/* X-Axis Month label */}
                    <text x={xBase + 20} y="220" className="text-[10px] fill-slate-500 font-semibold" textAnchor="middle">{m}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Quick status activity list feed */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm lg:col-span-4 flex flex-col justify-between" id="recent-activities-panel">
          <div>
            <div className="pb-3 border-b border-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Komunikasi WhatsApp Terbaru</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Log pesan notifikasi keluar otomatis</p>
            </div>

            <div className="mt-4 space-y-3.5" id="recent-wa-list">
              {recentWA.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-xs flex flex-col gap-1.5" id={`wa-log-item-${log.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 font-mono text-[10px]">{log.penerima}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      log.status === 'Berhasil' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium truncate">{log.perihal}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {new Date(log.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              ))}
              {recentWA.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Tidak ada pesan WhatsApp terkirim saat ini.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50">
            <button 
              onClick={() => setActiveTab('logs')}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1"
              id="dashboard-btn-logs"
            >
              <span>Semua Log & Audit Trail</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
