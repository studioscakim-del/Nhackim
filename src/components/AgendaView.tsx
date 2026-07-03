/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agenda, User } from '../types';
import { jsPDF } from 'jspdf';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Bell,
  Check,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Printer,
  Share2
} from 'lucide-react';

interface AgendaViewProps {
  agenda: Agenda[];
  user: User;
  onAddAgenda: (newAgenda: any) => Promise<void>;
  onDeleteAgenda: (id: string) => Promise<void>;
  onSendWhatsApp?: (penerima: string, perihal: string, pesan: string) => Promise<void>;
}

export default function AgendaView({
  agenda,
  user,
  onAddAgenda,
  onDeleteAgenda,
  onSendWhatsApp
}: AgendaViewProps) {
  const [viewType, setViewType] = useState<'Bulanan' | 'Mingguan' | 'Harian'>('Bulanan');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [namaAcara, setNamaAcara] = useState('');
  const [penyelenggara, setPenyelenggara] = useState('');
  const [tempat, setTempat] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jam, setJam] = useState('09:00');

  // Month navigation for monthly view
  const [currentDate, setCurrentDate] = useState(new Date('2026-07-01')); // Aligned with metadata mock date

  // WhatsApp states
  const [selectedWaAgenda, setSelectedWaAgenda] = useState<Agenda | null>(null);
  const [waNumber, setWaNumber] = useState('');
  const [showWaModal, setShowWaModal] = useState(false);

  // Month names for reports
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Helper to print a single agenda item
  const handlePrintSingleAgenda = (item: Agenda) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('KOMITE OLAHRAGA NASIONAL INDONESIA', width / 2, 17, { align: 'center' });
    doc.text('(KONI)', width / 2, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.text('KABUPATEN JEPARA', width / 2, 27, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Alamat : Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214', width / 2, 31, { align: 'center' });
    doc.text('Email : koni_jepara@yahoo.com', width / 2, 35, { align: 'center' });
    
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, width - margin, 38);
    doc.setLineWidth(0.15);
    doc.line(margin, 39.5, width - margin, 39.5);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('RINCIAN AGENDA KEGIATAN RESMI', width / 2, 50, { align: 'center' });

    // Details Box
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, 57, width - margin * 2, 60, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, 57, width - margin * 2, 60, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    
    doc.text('NAMA KEGIATAN:', margin + 5, 65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const splitTitle = doc.splitTextToSize(item.namaAcara, width - margin * 2 - 10);
    doc.text(splitTitle, margin + 5, 70);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('PENYELENGGARA:', margin + 5, 84);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(item.penyelenggara, margin + 5, 87);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('WAKTU & TEMPAT:', margin + 5, 97);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Hari, Tanggal : ${item.tanggal}`, margin + 5, 102);
    doc.text(`Waktu         : ${item.jam} WIB s/d Selesai`, margin + 5, 107);
    doc.text(`Tempat        : ${item.tempat}`, margin + 5, 112);

    // Footer Stamp
    const sigY = 135;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Sekretariat KONI Kabupaten Jepara', width - margin - 65, sigY);
    doc.setFont('helvetica', 'normal');
    doc.text('Penerbit Agenda Resmi', width - margin - 65, sigY + 5);

    // Stamp
    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(0.5);
    doc.circle(width - margin - 25, sigY + 18, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4);
    doc.setTextColor(29, 78, 216);
    doc.text('SEKRETARIAT', width - margin - 25, sigY + 16, { align: 'center' });
    doc.text('KONI JEPARA', width - margin - 25, sigY + 19, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Staf Administrasi Sekretariat', width - margin - 65, sigY + 32);

    // Save
    doc.save(`Agenda_${item.tanggal}_${item.namaAcara.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  // Helper to print all agendas for the current month
  const handlePrintAllAgenda = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('KOMITE OLAHRAGA NASIONAL INDONESIA', width / 2, 17, { align: 'center' });
    doc.text('(KONI)', width / 2, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.text('KABUPATEN JEPARA', width / 2, 27, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Alamat : Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214', width / 2, 31, { align: 'center' });
    doc.text('Email : koni_jepara@yahoo.com', width / 2, 35, { align: 'center' });
    
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, width - margin, 38);
    doc.setLineWidth(0.15);
    doc.line(margin, 39.5, width - margin, 39.5);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN REKAPITULASI AGENDA KEGIATAN', width / 2, 47, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode Bulan: ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`, width / 2, 52, { align: 'center' });

    // Table of Agenda items
    let y = 62;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, width - margin * 2, 8, 'F');
    doc.rect(margin, y, width - margin * 2, 8, 'S');
    doc.text('No', margin + 2, y + 5.5);
    doc.text('Tanggal & Jam', margin + 10, y + 5.5);
    doc.text('Agenda / Acara', margin + 45, y + 5.5);
    doc.text('Tempat & Penyelenggara', margin + 115, y + 5.5);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const sortedAgenda = [...agenda].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    sortedAgenda.forEach((ev, idx) => {
      // Draw grid row
      doc.rect(margin, y, width - margin * 2, 12, 'S');
      doc.text(String(idx + 1), margin + 2, y + 7);
      doc.text(`${ev.tanggal}\n${ev.jam} WIB`, margin + 10, y + 5);
      
      const splitAcara = doc.splitTextToSize(ev.namaAcara, 65);
      doc.text(splitAcara, margin + 45, y + 5);

      const splitTempat = doc.splitTextToSize(`${ev.tempat}\nOleh: ${ev.penyelenggara}`, 50);
      doc.text(splitTempat, margin + 115, y + 5);

      y += 12;
    });

    if (sortedAgenda.length === 0) {
      doc.rect(margin, y, width - margin * 2, 15, 'S');
      doc.text('Tidak ada agenda terjadwal pada periode ini.', width / 2, y + 9, { align: 'center' });
      y += 15;
    }

    // Save
    doc.save(`Rekap_Agenda_${monthNames[currentDate.getMonth()]}_${currentDate.getFullYear()}.pdf`);
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      namaAcara,
      penyelenggara,
      tempat,
      tanggal,
      jam,
      creatorName: user.name
    };

    await onAddAgenda(payload);

    // Reset
    setNamaAcara('');
    setPenyelenggara('');
    setTempat('');
    setShowAddModal(false);
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Generate Calendar Days list
  const totalDays = daysInMonth(currentDate);
  const startOffset = startDayOfMonth(currentDate);
  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(i);
  }

  // Helper to check if event exists on a date
  const getEventsForDate = (dayNum: number) => {
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return agenda.filter(a => a.tanggal === formattedDate);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-700" id="agenda-view-container">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="agenda-view-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda Kegiatan & Kalender</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau jadwal koordinasi KONI, rapat dinas, parade olahraga, dan program pembinaan cabor Jepara secara terpadu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintAllAgenda}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            id="btn-print-rekap-agenda"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Rekap Bulanan</span>
          </button>
          {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
              id="btn-add-agenda"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Agenda Manual</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Calendar Board + Events Listing with reminder statuses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="agenda-grid">
        
        {/* Left column: Calendar Grid */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-4" id="agenda-calendar-board">
          
          {/* Calendar header controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="calendar-controls">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                id="btn-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-slate-900 min-w-[120px] text-center uppercase tracking-wide">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                id="btn-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* View type togglers */}
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1 text-[11px] font-semibold" id="view-type-toggles">
              {['Bulanan', 'Mingguan', 'Harian'].map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type as any)}
                  className={`px-3 py-1 rounded-md transition ${
                    viewType === type
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Table body */}
          {viewType === 'Bulanan' ? (
            <div className="space-y-1" id="monthly-view-board">
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center font-mono font-bold text-[10px] text-slate-400 uppercase tracking-wider py-1.5 border-b border-slate-100">
                <div>Min</div>
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div>Sab</div>
              </div>

              {/* Date cells grid */}
              <div className="grid grid-cols-7 gap-1 text-xs" id="calendar-cells">
                {calendarDays.map((day, cellIdx) => {
                  const dayEvents = day ? getEventsForDate(day) : [];
                  const isToday = day === 1 && currentDate.getMonth() === 6 && currentDate.getFullYear() === 2026; // Simulated current date 1 July 2026

                  return (
                    <div
                      key={cellIdx}
                      className={`min-h-[75px] border border-slate-50 p-1.5 rounded-lg flex flex-col justify-between transition ${
                        day ? 'bg-white' : 'bg-slate-50/40 opacity-50'
                      } ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50/10' : ''}`}
                    >
                      {day ? (
                        <>
                          <span className={`font-mono font-bold ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                            {day}
                          </span>
                          <div className="space-y-1 mt-1">
                            {dayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-semibold rounded truncate"
                                title={ev.namaAcara}
                              >
                                {ev.jam} {ev.namaAcara}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl" id="non-monthly-view-placeholder">
              <span>Pratinjau tampilan {viewType} sedang dioptimalkan. Gunakan tampilan <b>Bulanan</b> untuk visual koordinasi agenda lengkap secara komprehensif.</span>
            </div>
          )}
        </div>

        {/* Right column: Event agenda feed + notifications */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-5" id="agenda-list-feed">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Daftar Agenda Terdekat</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Seluruh daftar kegiatan resmi terjadwal</p>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1" id="agenda-items-list">
            {agenda.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-col gap-2 relative group"
                id={`agenda-item-card-${item.id}`}
              >
                {/* Trash/delete action for admin roles */}
                {['Super Admin', 'Operator'].includes(user.role) && (
                  <button
                    onClick={() => onDeleteAgenda(item.id)}
                    className="absolute top-3.5 right-3 text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    title="Hapus Agenda"
                    id={`btn-delete-agenda-${item.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <h4 className="font-bold text-slate-900 leading-snug pr-6">{item.namaAcara}</h4>
                <div className="space-y-1 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-medium">{item.tanggal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-medium">{item.jam} WIB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-medium truncate" title={item.tempat}>{item.tempat}</span>
                  </div>
                </div>

                {/* Alarm automatic indicator mapping */}
                <div className="bg-white border border-slate-100 rounded-lg p-2.5 mt-1 text-[10px] space-y-1.5" id="agenda-alarms">
                  <span className="font-bold text-slate-500 block">Jalur Pengingat Otomatis (WA & Email):</span>
                  <div className="flex flex-wrap gap-1 text-[8px] font-mono font-bold uppercase text-center">
                    <span className={`px-1 py-0.5 rounded ${item.pengingatKirimStatus.HMin7 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>H-7</span>
                    <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">H-3</span>
                    <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">H-1</span>
                    <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Hari H</span>
                    <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">1 Jam</span>
                  </div>
                </div>

                {/* Print and WhatsApp Share Actions */}
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handlePrintSingleAgenda(item)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center gap-1 cursor-pointer font-bold"
                    title="Cetak Rincian Kegiatan Resmi ke PDF"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWaAgenda(item);
                      setWaNumber('');
                      setShowWaModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition inline-flex items-center gap-1 cursor-pointer font-bold"
                    title="Kirim Rincian Kegiatan Resmi via WhatsApp"
                  >
                    <Share2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Kirim WA</span>
                  </button>
                </div>
              </div>
            ))}
            {agenda.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Belum ada agenda kegiatan resmi.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: Tambah Agenda Manual */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-agenda">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Registrasi Agenda Manual</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Tambahkan jadwal kegiatan resmi pengurus KONI Jepara.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs" id="agenda-form">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nama Acara / Rapat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Koordinasi Anggaran Tahunan 2026"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  value={namaAcara}
                  onChange={(e) => setNamaAcara(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Penyelenggara / Penanggung Jawab</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bidang Pembinaan & Binpres KONI"
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  value={penyelenggara}
                  onChange={(e) => setPenyelenggara(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tempat Acara</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ruang Rapat Pimpinan KONI Jepara"
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Acara</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Waktu Pelaksanaan</label>
                  <input
                    type="time"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                  id="btn-submit-agenda"
                >
                  Simpan Agenda
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: Kirim WA Agenda */}
      {showWaModal && selectedWaAgenda && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-wa-agenda">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-fade-in">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Kirim Agenda via WhatsApp</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Kirimkan rincian agenda ini langsung ke pengurus atau panitia.</p>
              </div>
              <button
                onClick={() => {
                  setShowWaModal(false);
                  setSelectedWaAgenda(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor WhatsApp Penerima</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 08123456789"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Pratinjau Pesan WA</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono whitespace-pre-line leading-relaxed select-all">
                  {`*SIAP KONI JEPARA - NOTIFIKASI AGENDA*

Kepada Yth. Pengurus/Rekan,
Berikut rincian koordinasi kegiatan resmi KONI Jepara:

- Acara: ${selectedWaAgenda.namaAcara}
- Penyelenggara: ${selectedWaAgenda.penyelenggara}
- Tanggal: ${selectedWaAgenda.tanggal}
- Waktu: ${selectedWaAgenda.jam} WIB
- Tempat: ${selectedWaAgenda.tempat}

Diharapkan kehadiran Bapak/Ibu tepat waktu. Terima kasih.
Sekretariat KONI Kabupaten Jepara`}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowWaModal(false);
                    setSelectedWaAgenda(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!waNumber.trim()) {
                      alert('Harap masukkan nomor WhatsApp penerima.');
                      return;
                    }
                    const message = `*SIAP KONI JEPARA - NOTIFIKASI AGENDA*\n\nKepada Yth. Pengurus/Rekan,\nBerikut rincian koordinasi kegiatan resmi KONI Jepara:\n\n- Acara: ${selectedWaAgenda.namaAcara}\n- Penyelenggara: ${selectedWaAgenda.penyelenggara}\n- Tanggal: ${selectedWaAgenda.tanggal}\n- Waktu: ${selectedWaAgenda.jam} WIB\n- Tempat: ${selectedWaAgenda.tempat}\n\nDiharapkan kehadiran Bapak/Ibu tepat waktu. Terima kasih.\nSekretariat KONI Kabupaten Jepara`;
                    
                    if (onSendWhatsApp) {
                      await onSendWhatsApp(waNumber.trim(), `Notifikasi Agenda: ${selectedWaAgenda.namaAcara}`, message);
                    }
                    
                    setShowWaModal(false);
                    setSelectedWaAgenda(null);
                    alert(`Agenda berhasil dikirimkan via WhatsApp Gateway ke nomor ${waNumber}.`);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  <Share2 className="h-4 w-4 text-white" />
                  <span>Kirim Pesan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
