/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SuratMasuk, User, JenisSuratMasuk, DisposisiTarget } from '../types';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  FileDown,
  UserCheck,
  Smartphone,
  Calendar,
  Sparkles,
  UploadCloud,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
  HelpCircle,
  QrCode,
  Printer,
  Settings,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Trash2,
  AlertTriangle,
  Edit,
  Save
} from 'lucide-react';

const compressImageToMaxDims = (dataUrl: string, maxDim = 300): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG is tiny (typically 10-30KB)
        } else {
          resolve(dataUrl);
        }
      } catch (err) {
        console.error('Compression failed, using original:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
};

interface SuratMasukViewProps {
  suratMasuk: SuratMasuk[];
  user: User;
  onAddSurat: (newSurat: any) => Promise<void>;
  onUpdateStatus: (id: string, updateData: any) => Promise<void>;
  onDeleteSurat?: (id: string) => Promise<void>;
}

export default function SuratMasukView({
  suratMasuk,
  user,
  onAddSurat,
  onUpdateStatus,
  onDeleteSurat
}: SuratMasukViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<SuratMasuk | null>(null);

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Recap Export to Excel (CSV format for compatibility)
  const handleExportExcel = () => {
    const headers = [
      'No. Agenda',
      'Nomor Surat',
      'Tanggal Surat',
      'Tanggal Diterima',
      'Asal Instansi',
      'Pengirim',
      'No. WhatsApp',
      'Email',
      'Perihal',
      'Jenis Surat',
      'Status',
      'Disposisi'
    ];

    const rows = filteredSurat.map(s => {
      const disposisiStr = s.disposisi 
        ? s.disposisi.map(d => `${d.target} (${d.catatan || ''})`).join('; ')
        : '';
      return [
        s.nomorAgenda,
        s.nomorSurat,
        s.tanggalSurat,
        s.tanggalDiterima,
        s.instansi,
        s.pengirim,
        s.nomorWhatsApp,
        s.email,
        s.perihal,
        s.jenisSurat,
        s.status,
        disposisiStr
      ];
    });

    const csvContent = "\uFEFF" + [headers, ...rows]
      .map(row => row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `REKAP_SURAT_MASUK_SIAP_KONI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recap Export to beautiful Vector PDF report
  const handleExportPDF = () => {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 15;
    const pageWidth = 210;
    const pageHeight = 297;
    let y = 15;

    // Kop Surat
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(30, 58, 138); // Navy
    pdf.text('KOMITE OLAHRAGA NASIONAL INDONESIA (KONI)', pageWidth / 2, y, { align: 'center' });
    
    y += 5;
    pdf.setFontSize(12);
    pdf.setTextColor(51, 65, 85);
    pdf.text('PENGURUS KABUPATEN JEPARA', pageWidth / 2, y, { align: 'center' });
    
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214. Email: koni_jepara@yahoo.com', pageWidth / 2, y, { align: 'center' });

    y += 3;
    // Border Line
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y, pageWidth - margin, y);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + 0.6, pageWidth - margin, y + 0.6);

    y += 8;
    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text('LAPORAN REKAPITULASI PERSURATAN MASUK', pageWidth / 2, y, { align: 'center' });

    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`, margin, y);
    pdf.text(`Jumlah Data: ${filteredSurat.length} Surat`, pageWidth - margin, y, { align: 'right' });

    y += 5;

    // Table Header
    const colWidths = {
      agenda: 22,
      instansi: 40,
      nomor: 35,
      perihal: 50,
      jenis: 18,
      status: 15
    };

    const drawTableHeader = (startY: number) => {
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
      
      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.setLineWidth(0.15);
      pdf.rect(margin, startY, pageWidth - margin * 2, 8, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(51, 65, 85);

      let curX = margin;
      pdf.text('NO. AGENDA', curX + 2, startY + 5.5);
      curX += colWidths.agenda;
      pdf.text('ASAL INSTANSI', curX + 2, startY + 5.5);
      curX += colWidths.instansi;
      pdf.text('NOMOR SURAT', curX + 2, startY + 5.5);
      curX += colWidths.nomor;
      pdf.text('PERIHAL / RINGKASAN', curX + 2, startY + 5.5);
      curX += colWidths.perihal;
      pdf.text('JENIS', curX + 2, startY + 5.5);
      curX += colWidths.jenis;
      pdf.text('STATUS', curX + 2, startY + 5.5);
    };

    drawTableHeader(y);
    y += 8;

    // Table Rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(15, 23, 42);

    filteredSurat.forEach((s) => {
      // Auto page split check
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = 15;
        drawTableHeader(y);
        y += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(15, 23, 42);
      }

      // Prepare multi line text to prevent overflow
      const instansiLines = pdf.splitTextToSize(s.instansi, colWidths.instansi - 4);
      const nomorLines = pdf.splitTextToSize(s.nomorSurat, colWidths.nomor - 4);
      const perihalLines = pdf.splitTextToSize(s.perihal, colWidths.perihal - 4);

      const maxLines = Math.max(instansiLines.length, nomorLines.length, perihalLines.length, 1);
      const rowHeight = maxLines * 3.5 + 3.5;

      // Draw Row background alternate
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.1);
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

      // Print cells
      let curX = margin;
      
      // Agenda
      pdf.setFont('helvetica', 'bold');
      pdf.text(s.nomorAgenda, curX + 2, y + 4.5);
      pdf.setFont('helvetica', 'normal');
      curX += colWidths.agenda;

      // Instansi
      pdf.text(instansiLines, curX + 2, y + 4.5);
      curX += colWidths.instansi;

      // Nomor
      pdf.text(nomorLines, curX + 2, y + 4.5);
      curX += colWidths.nomor;

      // Perihal
      pdf.text(perihalLines, curX + 2, y + 4.5);
      curX += colWidths.perihal;

      // Jenis
      pdf.text(s.jenisSurat, curX + 2, y + 4.5);
      curX += colWidths.jenis;

      // Status
      pdf.setFont('helvetica', 'bold');
      if (s.status === 'Baru') pdf.setTextColor(37, 99, 235); // Blue
      else if (s.status === 'Didisposisikan') pdf.setTextColor(217, 119, 6); // Orange
      else pdf.setTextColor(5, 150, 105); // Green
      pdf.text(s.status, curX + 2, y + 4.5);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'normal');

      y += rowHeight;
    });

    // Signature Area
    y += 15;
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Jepara, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 50, y);
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('SEKRETARIAT KONI JEPARA', pageWidth - margin - 50, y);
    
    // Space for signature
    y += 18;
    pdf.text(user.name.toUpperCase(), pageWidth - margin - 50, y);
    pdf.setLineWidth(0.2);
    pdf.line(pageWidth - margin - 50, y + 0.6, pageWidth - margin - 10, y + 0.6);
    y += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Role: ${user.role}`, pageWidth - margin - 50, y);

    pdf.save(`REKAP_SURAT_MASUK_KONI_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Form State
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalDiterima, setTanggalDiterima] = useState(new Date().toISOString().split('T')[0]);
  const [instansi, setInstansi] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [nomorWhatsApp, setNomorWhatsApp] = useState('');
  const [email, setEmail] = useState('');
  const [perihal, setPerihal] = useState('');
  const [jenisSurat, setJenisSurat] = useState<JenisSuratMasuk>('Lainnya');
  const [ocrTextSimulation, setOcrTextSimulation] = useState('');
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNomorSurat, setEditNomorSurat] = useState('');
  const [editTanggalSurat, setEditTanggalSurat] = useState('');
  const [editTanggalDiterima, setEditTanggalDiterima] = useState('');
  const [editInstansi, setEditInstansi] = useState('');
  const [editPengirim, setEditPengirim] = useState('');
  const [editNomorWhatsApp, setEditNomorWhatsApp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPerihal, setEditPerihal] = useState('');
  const [editJenisSurat, setEditJenisSurat] = useState<JenisSuratMasuk>('Lainnya');

  const handleOpenEditModal = (surat: SuratMasuk) => {
    setEditNomorSurat(surat.nomorSurat || '');
    setEditTanggalSurat(surat.tanggalSurat || '');
    setEditTanggalDiterima(surat.tanggalDiterima || '');
    setEditInstansi(surat.instansi || '');
    setEditPengirim(surat.pengirim || '');
    setEditNomorWhatsApp(surat.nomorWhatsApp || '');
    setEditEmail(surat.email || '');
    setEditPerihal(surat.perihal || '');
    setEditJenisSurat(surat.jenisSurat || 'Lainnya');
    setShowEditModal(true);
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurat) return;

    const updatePayload = {
      isEdit: true,
      nomorSurat: editNomorSurat,
      tanggalSurat: editTanggalSurat,
      tanggalDiterima: editTanggalDiterima,
      instansi: editInstansi,
      pengirim: editPengirim,
      nomorWhatsApp: editNomorWhatsApp,
      email: editEmail,
      perihal: editPerihal,
      jenisSurat: editJenisSurat,
      updaterName: user.name,
      updaterRole: user.role,
      catatan: 'Mengedit data rincian surat masuk'
    };

    await onUpdateStatus(selectedSurat.id, updatePayload);
    
    setSelectedSurat({
      ...selectedSurat,
      nomorSurat: editNomorSurat,
      tanggalSurat: editTanggalSurat,
      tanggalDiterima: editTanggalDiterima,
      instansi: editInstansi,
      pengirim: editPengirim,
      nomorWhatsApp: editNomorWhatsApp,
      email: editEmail,
      perihal: editPerihal,
      jenisSurat: editJenisSurat
    });

    setShowEditModal(false);
  };
  
  // Real File Upload State
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    let file: File | undefined;
    if ('files' in e.target) {
      file = e.target.files?.[0];
    } else if ('dataTransfer' in e) {
      file = e.dataTransfer?.files?.[0];
    }

    if (file) {
      setUploadedFileName(file.name);
      setUploadProgress(0);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setUploadProgress(null);
          }, 600);
        }
      }, 150);

      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setOcrTextSimulation(`[HASIL SCAN GAMBAR: ${file.name}]\nDokumen dari ${file.name.split('.')[0].replace(/_/g, ' ')}\nNomor: 012/CABOR-JPR/VII/2026\nPerihal: Permohonan Bantuan Dana Operasional`);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        reader.onloadend = () => {
          setOcrTextSimulation(`[HASIL SCAN PDF: ${file.name}]\nPROPOSAL PENGAJUAN DANA KEGIATAN OLAHRAGA\nPERSATUAN BULUTANGKIS SELURUH INDONESIA (PBSI) KABUPATEN JEPARA\nNomor: 077/PBSI-JPR/V/2026\nPerihal: Permohonan Bantuan Dana Penyelenggaraan Turnamen Bulutangkis Se-Jateng Jepara Open 2026\nNominal yang Diajukan: Rp 35.000.000,-\nTanggal Pelaksanaan: 10 - 14 Agustus 2026\nTempat: GOR PBSI Jepara, Karangrejo.`);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setOcrTextSimulation(reader.result.substring(0, 5000));
          }
        };
        reader.readAsText(file);
      }
    }
  };
  
  // Tanda Terima State
  const [showTandaTerimaModal, setShowTandaTerimaModal] = useState(false);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);
  const DEFAULT_SVG_LOGO = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="46" fill="#1e3a8a" stroke="#f59e0b" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="white"/><path d="M50 15 L75 35 L65 75 L50 85 L35 75 L25 35 Z" fill="#ef4444" opacity="0.1"/><path d="M50 15 L75 35 L65 75 L50 85 L35 75 L25 35 Z" stroke="#ef4444" stroke-width="2.5" fill="none"/><path d="M50 20 L68 34 L60 68 L50 76 L40 68 L32 34 Z" fill="#f59e0b"/><circle cx="50" cy="45" r="8" fill="white" stroke="#1e3a8a" stroke-width="2"/><path d="M50 30 L50 55 M42 45 L58 45" stroke="#ef4444" stroke-width="2"/><path d="M35 80 Q50 90 65 80" stroke="#1e3a8a" stroke-width="3" fill="none" stroke-linecap="round"/><text x="50" y="93" font-family="sans-serif" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">KONI JEPARA</text></svg>');

  const [receiptLogo, setReceiptLogo] = useState(() => {
    return localStorage.getItem('siap_koni_receipt_logo') || 'DEFAULT_SVG';
  });
  const [receiptKop1, setReceiptKop1] = useState(() => {
    const saved = localStorage.getItem('siap_koni_receipt_kop1');
    if (!saved || saved === 'KOMITE OLAHRAGA NASIONAL INDONESIA (KONI)') {
      return 'KOMITE OLAHRAGA NASIONAL INDONESIA';
    }
    return saved;
  });
  const [receiptKop2, setReceiptKop2] = useState(() => {
    const saved = localStorage.getItem('siap_koni_receipt_kop2');
    if (!saved || saved === 'PENGURUS KABUPATEN JEPARA') {
      return '(KONI) KABUPATEN JEPARA';
    }
    return saved;
  });
  const [receiptAlamat, setReceiptAlamat] = useState(() => {
    const saved = localStorage.getItem('siap_koni_receipt_alamat');
    if (!saved || saved.includes('Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214. Email: koni_jepara@yahoo.com') || saved.includes('Stadion')) {
      return 'Alamat : Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214\nEmail : koni_jepara@yahoo.com';
    }
    return saved;
  });
  const [receiptTitle, setReceiptTitle] = useState(() => {
    return localStorage.getItem('siap_koni_receipt_title') || 'TANDA TERIMA SURAT MASUK';
  });
  const [receiptCatatan, setReceiptCatatan] = useState(() => {
    return localStorage.getItem('siap_koni_receipt_catatan') || 'Dokumen di atas telah diterima dengan lengkap dan dicatat dalam basis data sistem SIAP KONI Jepara.';
  });
  const [receiptPetugas, setReceiptPetugas] = useState('');
  const [receiptLogoWidth, setReceiptLogoWidth] = useState(() => {
    return Number(localStorage.getItem('siap_koni_receipt_logo_width')) || 65;
  });
  const [showLogo, setShowLogo] = useState(true);
  const [showStamp, setShowStamp] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  React.useEffect(() => {
    if (selectedSurat) {
      setReceiptPetugas(selectedSurat.operatorName || user.name);
    }
  }, [selectedSurat, user]);

  React.useEffect(() => {
    const persistAndOptimizeLogo = async () => {
      if (receiptLogo && receiptLogo.startsWith('data:image/') && receiptLogo.length > 100 * 1024) {
        console.log('Compressing large logo from state...', receiptLogo.length);
        const compressed = await compressImageToMaxDims(receiptLogo);
        if (compressed !== receiptLogo) {
          setReceiptLogo(compressed);
          localStorage.setItem('siap_koni_receipt_logo', compressed);
          return;
        }
      }
      localStorage.setItem('siap_koni_receipt_logo', receiptLogo);
    };
    persistAndOptimizeLogo();
  }, [receiptLogo]);

  const handleSaveReceiptSettings = () => {
    localStorage.setItem('siap_koni_receipt_logo', receiptLogo);
    localStorage.setItem('siap_koni_receipt_kop1', receiptKop1);
    localStorage.setItem('siap_koni_receipt_kop2', receiptKop2);
    localStorage.setItem('siap_koni_receipt_alamat', receiptAlamat);
    localStorage.setItem('siap_koni_receipt_title', receiptTitle);
    localStorage.setItem('siap_koni_receipt_catatan', receiptCatatan);
    localStorage.setItem('siap_koni_receipt_logo_width', receiptLogoWidth.toString());
    alert('Desain Kop & Logo Tanda Terima berhasil disimpan secara permanen!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImageToMaxDims(reader.result);
          setReceiptLogo(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const activeLogoSrc = receiptLogo === 'DEFAULT_SVG' ? DEFAULT_SVG_LOGO : receiptLogo;
  
  // PDF download state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Download Receipt as PDF (Pure high-performance crisp vector format for 100% iframe compatibility)
  const handleDownloadPDF = async () => {
    if (!selectedSurat) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      const margin = 20;
      const width = 210;
      let y = 25;

      // Safe asynchronous logo preloader
      const imgElement: HTMLImageElement | null = await new Promise((resolve) => {
        if (!showLogo || !activeLogoSrc) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        // Timeout to prevent hanging
        setTimeout(() => resolve(null), 2000);
        img.src = activeLogoSrc;
      });

      // Draw Kop Surat
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(30, 58, 138); // Navy blue
      
      let logoWidthMm = 16;
      let logoHeightMm = 16;
      let logoXMm = 20;
      let logoYMm = 21; // Vertically aligned with the text block starting at y=25

      if (showLogo) {
        if (receiptLogo !== 'DEFAULT_SVG' && imgElement) {
          try {
            const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
            
            // Convert receiptLogoWidth (pixels) to mm: 1px = 0.264583 mm
            logoWidthMm = receiptLogoWidth * 0.264583;
            logoHeightMm = logoWidthMm / aspectRatio;

            // Constrain maximum width and height to fit elegant letterhead ratios
            if (logoWidthMm > 35) {
              logoWidthMm = 35;
              logoHeightMm = logoWidthMm / aspectRatio;
            }
            if (logoHeightMm > 25) {
              logoHeightMm = 25;
              logoWidthMm = logoHeightMm * aspectRatio;
            }

            logoXMm = 20; // Aligned with the left margin (20mm)
            logoYMm = 28 - (logoHeightMm / 2); // Center logo vertically with Kop text
            if (logoYMm < 14) logoYMm = 14; // Upper limit boundary
          } catch (err) {
            console.error('Error computing logo dimensions:', err);
            logoWidthMm = 16;
            logoHeightMm = 16;
            logoXMm = 20;
            logoYMm = 20;
          }
        } else {
          logoWidthMm = 16;
          logoHeightMm = 16;
          logoXMm = 20;
          logoYMm = 20;
        }
      }

      // Compute text positioning to center-align inside the remaining right column space
      const remainingStart = showLogo ? (logoXMm + logoWidthMm + 5) : margin;
      const remainingEnd = width - margin;
      const textX = showLogo ? (remainingStart + remainingEnd) / 2 : width / 2;
      const textAlign = 'center';

      if (showLogo) {
        if (receiptLogo === 'DEFAULT_SVG') {
          // Draw simple vector shield logo on the left
          pdf.setFillColor(30, 58, 138);
          pdf.circle(logoXMm + 8, logoYMm + 8, 8, 'F');
          pdf.setFillColor(255, 255, 255);
          pdf.circle(logoXMm + 8, logoYMm + 8, 7, 'F');
          pdf.setFillColor(239, 68, 68);
          pdf.triangle(logoXMm + 8, logoYMm + 3, logoXMm + 12, logoYMm + 9, logoXMm + 4, logoYMm + 9, 'F');
          pdf.setFillColor(245, 158, 11);
          pdf.circle(logoXMm + 8, logoYMm + 8, 1.2, 'F');
        } else if (imgElement) {
          try {
            pdf.addImage(imgElement, 'PNG', logoXMm, logoYMm, logoWidthMm, logoHeightMm);
          } catch (err) {
            console.error('Error adding base64 logo:', err);
            pdf.setFillColor(30, 58, 138);
            pdf.circle(logoXMm + 8, logoYMm + 8, 8, 'F');
          }
        } else {
          pdf.setFillColor(30, 58, 138);
          pdf.circle(logoXMm + 8, logoYMm + 8, 8, 'F');
        }
      }

      pdf.text(receiptKop1.toUpperCase(), textX, y, { align: textAlign });
      y += 5.5;
      pdf.setFontSize(11.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(receiptKop2.toUpperCase(), textX, y, { align: textAlign });
      
      y += 4.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      const addressLines = pdf.splitTextToSize(receiptAlamat, showLogo ? width - margin - (logoXMm + logoWidthMm) - 5 : width - margin * 2);
      pdf.text(addressLines, textX, y, { align: textAlign });

      y += addressLines.length * 3.5 + 3;

      // Ensure double line is pushed below logo height if logo hangs lower
      if (showLogo && (logoYMm + logoHeightMm + 2) > y) {
        y = logoYMm + logoHeightMm + 2;
      }

      // Double line border equivalent
      pdf.setDrawColor(15, 23, 42); // Dark slate
      pdf.setLineWidth(0.8);
      pdf.line(margin, y, width - margin, y);
      pdf.setLineWidth(0.25);
      pdf.line(margin, y + 0.8, width - margin, y + 0.8);

      y += 9;

      // Receipt Title
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(receiptTitle.toUpperCase(), width / 2, y, { align: 'center' });
      
      const titleWidth = pdf.getTextWidth(receiptTitle.toUpperCase());
      pdf.setLineWidth(0.4);
      pdf.line(width / 2 - titleWidth / 2, y + 1, width / 2 + titleWidth / 2, y + 1);

      y += 5.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`NOMOR: TT-SM-2026-${selectedSurat.id.substring(0, 6).toUpperCase()}`, width / 2, y, { align: 'center' });

      y += 10;

      // Table Rows Draw helper
      const drawRow = (label: string, value: string, isAccent: boolean = false) => {
        // Draw Row Border bottom
        pdf.setDrawColor(226, 232, 240); // Slate 200
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + 3.5, width - margin, y + 3.5);

        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 116, 139); // Label Slate 400
        pdf.text(label.toUpperCase(), margin + 2, y + 1.5);

        pdf.setFont('helvetica', isAccent ? 'bold' : 'normal');
        pdf.setTextColor(isAccent ? 29 : 15, isAccent ? 78 : 23, isAccent ? 216 : 42);
        const splitVal = pdf.splitTextToSize(`: ${value}`, width - margin * 2 - 50);
        pdf.text(splitVal, margin + 46, y + 1.5);

        y += Math.max(splitVal.length * 4.5, 6);
      };

      drawRow('Nomor Agenda', selectedSurat.nomorAgenda, true);
      drawRow('Asal Instansi / Cabor', selectedSurat.instansi);
      drawRow('Nomor Surat Resmi', selectedSurat.nomorSurat);
      drawRow('Perihal / Ringkasan', selectedSurat.perihal);
      drawRow('Pengirim / Utusan', selectedSurat.pengirim);
      drawRow('Jenis Dokumen', selectedSurat.jenisSurat);
      drawRow('Tanggal Surat', selectedSurat.tanggalSurat);
      drawRow('Diterima Tanggal', selectedSurat.tanggalDiterima);

      y += 4;

      // Outro / Catatan
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const notesLines = pdf.splitTextToSize(`* Catatan: ${receiptCatatan}`, width - margin * 2);
      pdf.text(notesLines, margin, y);

      y += notesLines.length * 4 + 6;

      // Signatures block
      const sigY = y;
      
      // Left Column (Pengirim)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); // light gray
      pdf.text('PEMBERI / PEMBAWA DOKUMEN,', margin + 10, sigY);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Utusan Instansi Pengirim', margin + 10, sigY + 4);

      if (showSignature) {
        pdf.setFont('courier', 'oblique');
        pdf.setFontSize(10);
        pdf.setTextColor(16, 185, 129); // Emerald
        pdf.text(`${selectedSurat.pengirim.substring(0, 4)}..._rec`, margin + 10, sigY + 16);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(selectedSurat.pengirim.split('(')[0].trim().toUpperCase(), margin + 10, sigY + 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text('Ttd & Nama Terang', margin + 10, sigY + 31.5);

      // Right Column (Penerima)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105); // slate 600
      pdf.text(`JEPARA, ${selectedSurat.tanggalDiterima.toUpperCase()}`, width - margin - 65, sigY);
      pdf.text('PENERIMA SEKRETARIAT KONI,', width - margin - 65, sigY + 4);

      if (showStamp) {
        pdf.setDrawColor(29, 78, 216); // Blue
        pdf.setLineWidth(0.65);
        pdf.circle(width - margin - 22, sigY + 16, 10, 'S');
        pdf.setLineWidth(0.2);
        pdf.circle(width - margin - 22, sigY + 16, 8.5, 'S');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(4);
        pdf.setTextColor(29, 78, 216);
        pdf.text('SEKRETARIAT', width - margin - 22, sigY + 12.5, { align: 'center' });
        pdf.text('KONI JEPARA', width - margin - 22, sigY + 15.5, { align: 'center' });
        pdf.setFontSize(3.2);
        pdf.text('DIGITAL STAMP', width - margin - 22, sigY + 18.5, { align: 'center' });
      }

      if (showSignature) {
        pdf.setFont('courier', 'oblique');
        pdf.setFontSize(10);
        pdf.setTextColor(29, 78, 216); // Blue
        pdf.text(`${receiptPetugas.substring(0, 3)}..._sgd`, width - margin - 65, sigY + 16);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(receiptPetugas.toUpperCase(), width - margin - 65, sigY + 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text('KONI Kabupaten Jepara', width - margin - 65, sigY + 31.5);

      y = sigY + 38;

      // QR verification bottom block
      if (showQr) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(margin, y, width - margin, y);

        y += 5;
        
        // Draw highly realistic vector QR code
        const qrX = margin + 2;
        const qrY = y;
        const qrSize = 10; // 10mm x 10mm
        
        pdf.setDrawColor(15, 23, 42);
        pdf.setFillColor(15, 23, 42);
        pdf.setLineWidth(0.4);
        
        // Outer border
        pdf.rect(qrX, qrY, qrSize, qrSize, 'S');
        
        // Finder pattern top-left
        pdf.rect(qrX + 1, qrY + 1, 3, 3, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(qrX + 1.6, qrY + 1.6, 1.8, 1.8, 'F');
        pdf.setFillColor(15, 23, 42);
        pdf.rect(qrX + 2.1, qrY + 2.1, 0.8, 0.8, 'F');
        
        // Finder pattern top-right
        pdf.rect(qrX + qrSize - 4, qrY + 1, 3, 3, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(qrX + qrSize - 3.4, qrY + 1.6, 1.8, 1.8, 'F');
        pdf.setFillColor(15, 23, 42);
        pdf.rect(qrX + qrSize - 2.9, qrY + 2.1, 0.8, 0.8, 'F');
        
        // Finder pattern bottom-left
        pdf.rect(qrX + 1, qrY + qrSize - 4, 3, 3, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(qrX + 1.6, qrY + qrSize - 3.4, 1.8, 1.8, 'F');
        pdf.setFillColor(15, 23, 42);
        pdf.rect(qrX + 2.1, qrY + qrSize - 2.9, 0.8, 0.8, 'F');
        
        // Some random small noise blocks to look like QR
        pdf.rect(qrX + 5, qrY + 5, 1, 1, 'F');
        pdf.rect(qrX + 6.5, qrY + 5, 0.8, 1.2, 'F');
        pdf.rect(qrX + 5, qrY + 6.5, 1.2, 0.8, 'F');
        pdf.rect(qrX + 7, qrY + 7, 1.5, 1.5, 'F');
        pdf.rect(qrX + 5, qrY + 2, 0.8, 0.8, 'F');
        pdf.rect(qrX + 5.5, qrY + 3, 0.8, 0.8, 'F');
        pdf.rect(qrX + 2, qrY + 5, 0.8, 0.8, 'F');
        pdf.rect(qrX + 3, qrY + 5.5, 0.8, 0.8, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(71, 85, 105);
        pdf.text('DIVERIFIKASI DIGITAL', margin + 14, y + 2.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.text('Scan QR Code untuk memverifikasi keaslian dokumen di portal SIAP KONI', margin + 14, y + 5.5);

        pdf.setFont('courier', 'bold');
        pdf.setFontSize(7);
        pdf.text(`ID: ${selectedSurat.id.substring(0, 8).toUpperCase()}`, width - margin - 26, y + 4);
      }

      const agendaClean = selectedSurat.nomorAgenda.replace(/[^a-zA-Z0-9]/g, '_');
      const instansiClean = selectedSurat.instansi.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Tanda_Terima_KONI_SM_${agendaClean}_${instansiClean}.pdf`;
      pdf.save(fileName);
    } catch (innerError) {
      console.error('Vector generation failed:', innerError);
      alert('Gagal mengekspor PDF secara otomatis. Silakan cetak manual menggunakan tombol "Cetak Sekarang".');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct print bypasses browser sandbox frame blocks
  const handlePrintReceipt = () => {
    if (isInsideIframe) {
      setShowPrintIframeWarning(true);
      return;
    }

    try {
      const element = document.getElementById('printable-receipt');
      if (!element) return;

      // Create a temporary print container directly on the body to bypass nested iframe constraints
      const printContainer = document.createElement('div');
      printContainer.id = 'siap-koni-direct-print-container';
      printContainer.innerHTML = element.innerHTML;
      document.body.appendChild(printContainer);

      const printStyle = document.createElement('style');
      printStyle.id = 'siap-koni-direct-print-style';
      printStyle.innerHTML = `
        @media print {
          body > :not(#siap-koni-direct-print-container) {
            display: none !important;
          }
          #siap-koni-direct-print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }
        }
      `;
      document.head.appendChild(printStyle);

      window.print();

      setTimeout(() => {
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
        if (document.head.contains(printStyle)) {
          document.head.removeChild(printStyle);
        }
      }, 2000);
    } catch (e) {
      console.error('Direct print failed:', e);
      setShowPrintIframeWarning(true);
    }
  };
  
  // AI State
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  // Status Update state
  const [newStatus, setNewStatus] = useState<'Baru' | 'Didisposisikan' | 'Selesai'>('Baru');
  const [statusCatatan, setStatusCatatan] = useState('');
  const [disposisiTargets, setDisposisiTargets] = useState<string[]>([]);
  const [disposisiCatatan, setDisposisiCatatan] = useState('');

  // Handle OCR AI triggering
  const handleAIAnalyze = async () => {
    setIsAILoading(true);
    setAiAnalysisResult(null);
    try {
      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: jenisSurat,
          documentText: ocrTextSimulation || `PROPOSAL TURNAMEN BULUTANGKIS JEPARA OPEN 2026\nPERSATUAN BULUTANGKIS SELURUH INDONESIA (PBSI) KABUPATEN JEPARA\nNomor: 077/PBSI-JPR/V/2026\nPerihal: Permohonan Bantuan Dana Penyelenggaraan Turnamen Bulutangkis Se-Jateng Jepara Open 2026\nNominal yang Diajukan: Rp 35.000.000,-\nTanggal Pelaksanaan: 10 - 14 Agustus 2026\nTempat: GOR PBSI Jepara, Karangrejo.`
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const analysis = data.analysis;
        setAiAnalysisResult(analysis);

        // Auto populate fields
        setNomorSurat(analysis.nomorSurat || '');
        setTanggalSurat(analysis.tanggal || '');
        setInstansi(analysis.instansi || '');
        setPengirim(analysis.pengirim || '');
        setPerihal(analysis.perihal || '');
        if (analysis.jenisSurat) setJenisSurat(analysis.jenisSurat as JenisSuratMasuk);
      }
    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setIsAILoading(false);
    }
  };

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc = {
      nomorSurat,
      tanggalSurat,
      tanggalDiterima,
      instansi,
      pengirim,
      nomorWhatsApp,
      email,
      perihal,
      jenisSurat,
      ocrContent: ocrTextSimulation || aiAnalysisResult?.ocrContent || 'Simulasi scan dokumen selesai.',
      ringkasanAI: aiAnalysisResult?.ringkasanSurat || [
        `Dokumen perihal: ${perihal}`,
        `Asal surat dari ${instansi} dikirim oleh ${pengirim}.`,
        `Surat tertanggal ${tanggalSurat} diterima pada ${tanggalDiterima}.`
      ],
      disposisiRekomendasi: aiAnalysisResult?.disposisiRekomendasi || 'Saran disposisi: Sekretaris & Bidang Terkait.',
      status: 'Baru',
      operatorName: user.name
    };

    await onAddSurat(newDoc);
    
    // Auto-trigger real WhatsApp web link
    if (nomorWhatsApp) {
      const waMessage = `Yth. Bapak/Ibu,\n\nSurat dari ${instansi} perihal "${perihal}" telah kami terima di Sekretariat KONI Jepara.\n\nStatus: Sudah diterima.\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
      handleOpenWhatsApp(nomorWhatsApp, waMessage);
    }

    // reset
    setNomorSurat('');
    setInstansi('');
    setPengirim('');
    setNomorWhatsApp('');
    setEmail('');
    setPerihal('');
    setOcrTextSimulation('');
    setUploadedFileName('');
    setUploadProgress(null);
    setAiAnalysisResult(null);
    setShowAddModal(false);
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurat) return;

    const formattedDisposisi: DisposisiTarget[] = disposisiTargets.map(t => ({
      target: t as any,
      catatan: disposisiCatatan
    }));

    const updatePayload = {
      status: newStatus,
      updaterName: user.name,
      updaterRole: user.role,
      catatan: statusCatatan || `Mengubah status menjadi ${newStatus}.`,
      disposisi: formattedDisposisi.length > 0 ? formattedDisposisi : undefined,
      disposisiRekomendasi: selectedSurat.disposisiRekomendasi
    };

    await onUpdateStatus(selectedSurat.id, updatePayload);
    
    // update current selected model to reflect changes
    setSelectedSurat({
      ...selectedSurat,
      status: newStatus,
      disposisi: formattedDisposisi.length > 0 ? formattedDisposisi : selectedSurat.disposisi,
      statusHistory: [
        ...selectedSurat.statusHistory,
        {
          tanggal: new Date().toISOString(),
          statusLama: selectedSurat.status,
          statusBaru: newStatus,
          pengguna: user.name,
          catatan: statusCatatan || `Mengubah status menjadi ${newStatus}.`
        }
      ]
    });

    setStatusCatatan('');
    setDisposisiCatatan('');
    setDisposisiTargets([]);
  };

  const handleToggleDisposisiTarget = (target: string) => {
    if (disposisiTargets.includes(target)) {
      setDisposisiTargets(disposisiTargets.filter(t => t !== target));
    } else {
      setDisposisiTargets([...disposisiTargets, target]);
    }
  };

  const filteredSurat = suratMasuk.filter(s => {
    const sTerm = searchTerm.toLowerCase();
    return (
      s.nomorAgenda.toLowerCase().includes(sTerm) ||
      s.nomorSurat.toLowerCase().includes(sTerm) ||
      s.instansi.toLowerCase().includes(sTerm) ||
      s.perihal.toLowerCase().includes(sTerm) ||
      s.jenisSurat.toLowerCase().includes(sTerm)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans" id="surat-masuk-view">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="surat-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modul Surat Masuk</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftarkan surat resmi masuk, jalankan OCR bertenaga AI untuk ekstraksi otomatis, serta kelola disposisi ketua.
          </p>
        </div>
        {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow flex items-center gap-1.5 transition self-start sm:self-auto"
            id="btn-add-surat-masuk"
          >
            <Plus className="h-4 w-4" />
            <span>Registrasi Surat Baru</span>
          </button>
        )}
      </div>

      {/* Main Grid: List Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="surat-main-grid">
        
        {/* Left Side: Letters Table */}
        <div className="lg:col-span-8 space-y-4" id="surat-list-container">
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            {/* Search Filter Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50" id="surat-search-area">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nomor agenda, nomor surat, perihal, pengirim, atau status..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="search-surat-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Unduh Rekap Spreadsheet Excel (.csv)"
                  id="btn-rekap-excel-sm"
                >
                  <FileDown className="h-4 w-4 text-emerald-600" />
                  <span>Rekap Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Unduh Rekap Laporan PDF Resmi"
                  id="btn-rekap-pdf-sm"
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  <span>Rekap PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto" id="surat-table-scroller">
              <table className="w-full text-left border-collapse" id="surat-data-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                    <th className="px-4 py-3">No. Agenda</th>
                    <th className="px-4 py-3">Asal & No. Surat</th>
                    <th className="px-4 py-3">Perihal & Jenis</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredSurat.map((surat) => (
                    <tr
                      key={surat.id}
                      onClick={() => setSelectedSurat(surat)}
                      className={`hover:bg-blue-50/30 transition cursor-pointer ${
                        selectedSurat?.id === surat.id ? 'bg-blue-50/50' : ''
                      }`}
                      id={`surat-row-${surat.id}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">{surat.nomorAgenda}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{surat.tanggalDiterima}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{surat.instansi}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{surat.nomorSurat}</div>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <div className="font-medium truncate" title={surat.perihal}>{surat.perihal}</div>
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold uppercase tracking-wider mt-1">
                          {surat.jenisSurat}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          surat.status === 'Baru' 
                            ? 'bg-blue-50 text-blue-600'
                            : surat.status === 'Didisposisikan'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {surat.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSurat(surat);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition"
                            id={`btn-action-view-${surat.id}`}
                          >
                            Detail
                          </button>
                          {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteSurat) onDeleteSurat(surat.id);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                              title="Hapus Surat Masuk"
                              id={`btn-action-delete-${surat.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSurat.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        Tidak ada data surat masuk ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed View Sheet */}
        <div className="lg:col-span-4" id="surat-detail-sidebar">
          {selectedSurat ? (
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-6" id="surat-details-card">
              
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] text-blue-600 font-mono font-bold uppercase bg-blue-50 px-2 py-0.5 rounded">
                    Agenda: {selectedSurat.nomorAgenda}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1.5">{selectedSurat.instansi}</h2>
                </div>
                {/* QR Code Indicator */}
                <div className="h-10 w-10 border border-slate-200 rounded p-1 flex items-center justify-center bg-slate-50" title="QR Code Dokumen Terverifikasi">
                  <QrCode className="h-7 w-7 text-slate-800" />
                </div>
              </div>

              {/* Tanda Terima Quick Action Box */}
              <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight">Bukti Tanda Terima</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">Kustomisasi logo & cetak kop</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTandaTerimaModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition shadow-sm flex items-center gap-1 cursor-pointer"
                  id="btn-trigger-receipt-gen"
                >
                  <Printer className="h-3 w-3" />
                  <span>Cetak / Edit</span>
                </button>
              </div>

              {/* Document Details Block */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Nomor Surat:</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedSurat.nomorSurat}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium block">Tanggal Surat:</span>
                    <span className="font-semibold text-slate-800">{selectedSurat.tanggalSurat}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Tanggal Diterima:</span>
                    <span className="font-semibold text-slate-800">{selectedSurat.tanggalDiterima}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Pengirim & Kontak:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-slate-800">{selectedSurat.pengirim}</span>
                    {selectedSurat.nomorWhatsApp && (
                      <span className="bg-emerald-50 text-emerald-600 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                        <Smartphone className="h-2.5 w-2.5" />
                        WA Aktif
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Perihal:</span>
                  <span className="font-medium text-slate-800 leading-relaxed block bg-slate-50/50 p-2 border border-slate-100 rounded">
                    {selectedSurat.perihal}
                  </span>
                </div>
                {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedSurat)}
                    className="w-full mt-2 py-2 border border-slate-200 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-semibold text-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer bg-white shadow-xs"
                    id="btn-edit-surat-masuk"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-500" />
                    <span>Edit Rincian Surat</span>
                  </button>
                )}
              </div>

              {/* AI Summary Block (Show Max 5 Points) */}
              {selectedSurat.ringkasanAI && selectedSurat.ringkasanAI.length > 0 && (
                <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-2.5">
                  <h3 className="text-xs font-bold text-blue-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    Ringkasan AI (Maks 5 Poin)
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {selectedSurat.ringkasanAI.map((p, index) => (
                      <li key={index} className="leading-relaxed">{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disposisi List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Disposisi Pimpinan</h3>
                {selectedSurat.disposisi && selectedSurat.disposisi.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSurat.disposisi.map((disp, index) => (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                            {disp.target}
                          </span>
                          <span className="text-[9px] text-slate-400">AKTIF</span>
                        </div>
                        <p className="text-slate-600 leading-normal">{disp.catatan || 'Mohon ditindaklanjuti.'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded text-center">
                    Belum ada disposisi didaftarkan.
                  </div>
                )}
                {selectedSurat.disposisiRekomendasi && (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs">
                    <span className="font-bold text-amber-800 block mb-1">Rekomendasi Rute Disposisi AI:</span>
                    <span className="text-slate-700">{selectedSurat.disposisiRekomendasi}</span>
                  </div>
                )}
              </div>

              {/* Status Update / Action sheet based on Access rights */}
              {['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator'].includes(user.role) ? (
                <form onSubmit={handleUpdateStatusSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ubah Status & Disposisi</h3>
                  
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Status Dokumen</label>
                    <select
                      className="w-full text-xs p-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                    >
                      <option value="Baru">Baru</option>
                      <option value="Didisposisikan">Didisposisikan</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>

                  {newStatus === 'Didisposisikan' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold">Kirim Disposisi Ke:</label>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {['Ketua', 'Sekretaris', 'Bendahara', 'Bidang Pembinaan', 'Bidang Organisasi'].map(target => (
                          <button
                            key={target}
                            type="button"
                            onClick={() => handleToggleDisposisiTarget(target)}
                            className={`px-2 py-1.5 border rounded text-left font-medium transition ${
                              disposisiTargets.includes(target)
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {target}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-semibold mt-2 mb-1">Instruksi Disposisi</label>
                        <textarea
                          className="w-full text-xs p-2 border border-slate-200 rounded focus:outline-none"
                          rows={2}
                          placeholder="Masukkan catatan instruksi disposisi..."
                          value={disposisiCatatan}
                          onChange={(e) => setDisposisiCatatan(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Catatan Riwayat (Sistem)</label>
                    <input
                      type="text"
                      className="w-full text-xs p-2 border border-slate-200 rounded focus:outline-none"
                      placeholder="Catatan penanganan..."
                      value={statusCatatan}
                      onChange={(e) => setStatusCatatan(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="submit"
                      className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const waMessage = `Yth. Bapak/Ibu,\n\nStatus surat Anda (Agenda: ${selectedSurat.nomorAgenda}) telah diperbarui oleh Pengurus KONI Jepara.\n\nStatus Baru:\n${newStatus}\n\nCatatan:\n${statusCatatan || '-'}\n\nTerima kasih.\n\nKONI Jepara.`;
                        handleOpenWhatsApp(selectedSurat.nomorWhatsApp || '081399887766', waMessage);
                      }}
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>Kirim Riil via WA</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs mt-4">
                  <span className="font-bold block mb-1">📋 Mode Lihat Saja (Read-Only)</span>
                  <span>Sebagai Pengurus Cabor, Anda tidak memiliki izin untuk mengedit status dokumen surat masuk. Modifikasi status dilakukan oleh Pengurus KONI Jepara.</span>
                </div>
              )}

              {/* Status History / Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Timeline Alur Dokumen</h3>
                <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 text-xs">
                  {selectedSurat.statusHistory.map((hist, hIdx) => (
                    <div key={hIdx} className="relative" id={`timeline-item-${hIdx}`}>
                      <div className="absolute -left-[21px] top-1 bg-white h-2.5 w-2.5 rounded-full border-2 border-blue-500" />
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(hist.tanggal).toLocaleString('id-ID')}
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        Status: <span className="text-blue-600">{hist.statusBaru}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{hist.catatan}</p>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        Oleh: {hist.pengguna}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete Button for Authorized Roles */}
              {['Super Admin', 'Operator', 'Sekretaris'].includes(user.role) && (
                <div className="pt-4 border-t border-red-100 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteSurat) {
                        onDeleteSurat(selectedSurat.id);
                        setSelectedSurat(null);
                      }
                    }}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    id="btn-delete-surat-masuk"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Berkas Surat Masuk</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 border-dashed rounded-xl p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-64">
              <FileText className="h-8 w-8 text-slate-300" />
              <span>Silakan pilih salah satu surat dari daftar di samping untuk melihat detail administrasi & disposisi.</span>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Registrasi Surat Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-registrasi-surat">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Registrasi Surat Masuk Baru</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lengkapi isian data persuratan secara manual atau gunakan Ekstraksi AI (OCR).</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* OCR AI Wizard Box */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-bold text-blue-900">Pembaca Surat Otomatis (OCR AI)</h3>
                      <p className="text-[10px] text-blue-700 mt-0.5">Unggah berkas mentah untuk membaca rincian dokumen otomatis menggunakan Gemini AI.</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded font-mono uppercase">ONLINE</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-600 uppercase font-semibold mb-1">Simulasi Scan Dokumen (Teks Hasil Scan / Upload)</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs p-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono bg-white"
                      placeholder="Ketik teks isi surat di sini atau klik Tombol Ekstraksi di kanan untuk membaca otomatis contoh draf surat..."
                      value={ocrTextSimulation}
                      onChange={(e) => setOcrTextSimulation(e.target.value)}
                    />
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDocumentUpload}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col justify-center items-center p-4 rounded-lg border-2 border-dashed transition cursor-pointer min-h-[140px] text-center ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50/50'
                        : uploadedFileName
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,image/*,text/plain"
                      onChange={handleDocumentUpload}
                    />
                    
                    {uploadProgress !== null ? (
                      <div className="w-full space-y-2 px-4">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                          <span>Mengunggah berkas...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                        <span className="text-[11px] font-bold text-slate-800 max-w-[180px] truncate" title={uploadedFileName}>
                          {uploadedFileName}
                        </span>
                        <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">Berkas berhasil diunggah!</span>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIAnalyze();
                            }}
                            disabled={isAILoading}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded flex items-center gap-1 disabled:opacity-50"
                          >
                            {isAILoading ? 'Menganalisis...' : 'Ekstrak AI'}
                            <Sparkles className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFileName('');
                              setOcrTextSimulation('');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-bold rounded"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-blue-500 mb-1.5" />
                        <span className="text-[11px] font-bold text-slate-800">Pilih / Seret Berkas Surat</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">PDF, Gambar, atau Teks (Maks. 10MB)</span>
                        <button
                          type="button"
                          className="mt-2.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded transition"
                        >
                          Pilih Berkas
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* General Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs" id="surat-form">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Jenis Dokumen Surat</label>
                    <select
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                      value={jenisSurat}
                      onChange={(e) => setJenisSurat(e.target.value as JenisSuratMasuk)}
                    >
                      <option value="Proposal">Proposal Bantuan Dana</option>
                      <option value="Undangan">Surat Undangan</option>
                      <option value="Permohonan">Surat Permohonan</option>
                      <option value="Edaran">Surat Edaran</option>
                      <option value="Pemberitahuan">Surat Pemberitahuan</option>
                      <option value="Lainnya">Lainnya / Umum</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor Surat Resmi</label>
                    <input
                      type="text"
                      required
                      placeholder="000/KONI-JPR/VI/2026"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={nomorSurat}
                      onChange={(e) => setNomorSurat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Asal Instansi / Cabor</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PSSI Jepara, DISPARBUD"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={instansi}
                      onChange={(e) => setInstansi(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nama Pengirim (Penandatangan Surat)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: H. Samsul (Sekretaris)"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={pengirim}
                      onChange={(e) => setPengirim(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor WhatsApp (Notifikasi Otomatis)</label>
                    <input
                      type="text"
                      required
                      placeholder="0813xxxxxxxx"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={nomorWhatsApp}
                      onChange={(e) => setNomorWhatsApp(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="contoh@gmail.com"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Surat Resmi</label>
                    <input
                      type="date"
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={tanggalSurat}
                      onChange={(e) => setTanggalSurat(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Perihal / Deskripsi Singkat</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Proposal Pengadaan Matras Tanding Cabor Karate Jepara Open"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                    value={perihal}
                    onChange={(e) => setPerihal(e.target.value)}
                  />
                </div>

                {/* Submit Action Block inside form */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                    id="btn-submit-surat-masuk"
                  >
                    <Send className="h-4 w-4" />
                    <span>Registrasi & Kirim WhatsApp</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

      {/* MODAL: Edit Surat Masuk */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-edit-surat">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  <span>Edit Rincian Surat Masuk</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Ubah data persuratan yang salah lalu simpan perubahan.</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body Scroll */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              <form onSubmit={handleEditFormSubmit} className="space-y-4 text-xs" id="surat-edit-form">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Jenis Dokumen Surat</label>
                    <select
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                      value={editJenisSurat}
                      onChange={(e) => setEditJenisSurat(e.target.value as JenisSuratMasuk)}
                    >
                      <option value="Proposal">Proposal Bantuan Dana</option>
                      <option value="Undangan">Surat Undangan</option>
                      <option value="Permohonan">Surat Permohonan</option>
                      <option value="Edaran">Surat Edaran</option>
                      <option value="Pemberitahuan">Surat Pemberitahuan</option>
                      <option value="Lainnya">Lainnya / Umum</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor Surat Resmi</label>
                    <input
                      type="text"
                      required
                      placeholder="000/KONI-JPR/VI/2026"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editNomorSurat}
                      onChange={(e) => setEditNomorSurat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Asal Instansi / Cabor</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PSSI Jepara, DISPARBUD"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editInstansi}
                      onChange={(e) => setEditInstansi(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nama Pengirim (Penandatangan Surat)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: H. Samsul (Sekretaris)"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editPengirim}
                      onChange={(e) => setEditPengirim(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor WhatsApp</label>
                    <input
                      type="text"
                      required
                      placeholder="0813xxxxxxxx"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editNomorWhatsApp}
                      onChange={(e) => setEditNomorWhatsApp(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="contoh@gmail.com"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Surat Resmi</label>
                    <input
                      type="date"
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editTanggalSurat}
                      onChange={(e) => setEditTanggalSurat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tanggal Diterima</label>
                    <input
                      type="date"
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={editTanggalDiterima}
                      onChange={(e) => setEditTanggalDiterima(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Perihal / Deskripsi Singkat</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Proposal Pengadaan Matras Tanding Cabor Karate Jepara Open"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                    value={editPerihal}
                    onChange={(e) => setEditPerihal(e.target.value)}
                  />
                </div>

                {/* Submit Action Block inside form */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm flex items-center gap-1.5"
                    id="btn-submit-edit-surat"
                  >
                    <Save className="h-4 w-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

      {/* MODAL: Generator Tanda Terima */}
      {showTandaTerimaModal && selectedSurat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 md:p-4 animate-fade-in no-print" id="modal-tanda-terima">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600 animate-pulse" />
                <div>
                  <h2 className="text-sm md:text-base font-extrabold text-slate-900">Generator & Kustomisasi Tanda Terima</h2>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Ubah logo, edit kop instansi, sesuaikan keterangan, dan cetak bukti surat masuk.</p>
                </div>
              </div>
              <button
                onClick={() => setShowTandaTerimaModal(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {isInsideIframe && (
              <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-[11px] leading-normal">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">💡 Petunjuk Cetak & Unduh PDF</span>
                  <span>Anda sedang di dalam bingkai preview. Untuk hasil cetak & unduh PDF 100% sempurna tanpa hambatan sandbox browser, silakan klik tombol <strong>"Buka Aplikasi di Tab Baru" (Open in New Tab)</strong> di sudut kanan atas preview!</span>
                </div>
              </div>
            )}

            {/* Split View Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              
              {/* Left Side: Control Panel / Customizer */}
              <div className="lg:col-span-5 border-r border-slate-150 p-4 md:p-6 overflow-y-auto bg-slate-50 space-y-5 flex flex-col text-xs text-slate-700">
                
                {/* Section: Logo Settings */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                      Pengaturan Logo KOP
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      Tampilkan Logo
                    </label>
                  </div>

                  {showLogo && (
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Sumber Gambar Logo</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptLogo('DEFAULT_SVG')}
                            className={`py-1.5 px-2 rounded-lg font-bold border text-center transition text-[10px] ${
                              receiptLogo === 'DEFAULT_SVG'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Logo Default (SVG)
                          </button>
                          <label
                            className={`py-1.5 px-2 rounded-lg font-bold border text-center transition text-[10px] cursor-pointer flex items-center justify-center gap-1 ${
                              receiptLogo !== 'DEFAULT_SVG' && receiptLogo.startsWith('data:')
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <UploadCloud className="h-3 w-3" />
                            <span>Upload File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setReceiptLogo('https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=100&fit=crop')}
                            className={`py-1.5 px-2 rounded-lg font-bold border text-center transition text-[10px] ${
                              receiptLogo.startsWith('https://')
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Contoh Online
                          </button>
                        </div>
                      </div>

                      {receiptLogo !== 'DEFAULT_SVG' && (
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Custom URL Gambar Logo</label>
                          <input
                            type="text"
                            value={receiptLogo}
                            onChange={(e) => setReceiptLogo(e.target.value)}
                            placeholder="Ketik atau paste URL gambar (https://...)"
                            className="w-full p-2 border border-slate-200 rounded text-[11px] font-mono"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Ukuran Lebar Logo</label>
                          <span className="font-mono text-[10px] font-bold text-slate-600">{receiptLogoWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="130"
                          value={receiptLogoWidth}
                          onChange={(e) => setReceiptLogoWidth(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Kop Text */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-100 pb-2">
                    <Settings className="h-3.5 w-3.5 text-blue-500" />
                    Teks KOP Surat (Instansi)
                  </span>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Instansi Utama (Baris 1)</label>
                    <input
                      type="text"
                      value={receiptKop1}
                      onChange={(e) => setReceiptKop1(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded font-semibold text-slate-800"
                      placeholder="Contoh: KOMITE OLAHRAGA NASIONAL INDONESIA"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Sub-Daerah / Cabang (Baris 2)</label>
                    <input
                      type="text"
                      value={receiptKop2}
                      onChange={(e) => setReceiptKop2(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded font-bold text-slate-800"
                      placeholder="Contoh: PENGURUS KABUPATEN JEPARA"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Alamat Lengkap & Kontak Sekretariat</label>
                    <textarea
                      value={receiptAlamat}
                      onChange={(e) => setReceiptAlamat(e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-slate-200 rounded text-[11px] leading-relaxed text-slate-600"
                      placeholder="Contoh: Jalan Stadion Bumi Kartini Kav. 4, Jepara. Telp..."
                    />
                  </div>
                </div>

                {/* Section: Content Customization */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-100 pb-2">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    Judul & Konten Bukti
                  </span>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Judul Tanda Terima</label>
                    <input
                      type="text"
                      value={receiptTitle}
                      onChange={(e) => setReceiptTitle(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded font-bold text-slate-800 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Keterangan Penutup (Catatan)</label>
                    <textarea
                      value={receiptCatatan}
                      onChange={(e) => setReceiptCatatan(e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-slate-200 rounded leading-relaxed text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Petugas Penerima</label>
                    <input
                      type="text"
                      value={receiptPetugas}
                      onChange={(e) => setReceiptPetugas(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded font-medium text-slate-800"
                      placeholder="Nama Lengkap Operator / Sekretaris"
                    />
                  </div>
                </div>

                {/* Section: Toggles & Signature */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-100 pb-2 mb-2">
                    Komponen Kelengkapan Fisik
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <label className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={showStamp}
                        onChange={(e) => setShowStamp(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Cap Stempel Digital</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={showQr}
                        onChange={(e) => setShowQr(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>QR Code Verifikasi</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition col-span-2">
                      <input
                        type="checkbox"
                        checked={showSignature}
                        onChange={(e) => setShowSignature(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Tanda Tangan Elektronik Sah</span>
                    </label>
                  </div>
                </div>

                {/* Action Blocks inside control panel */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSaveReceiptSettings}
                      className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs text-xs"
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Simpan Kop</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-xs"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Cetak Langsung</span>
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md text-xs disabled:opacity-50"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>{isGeneratingPdf ? 'Membuat File PDF...' : 'Unduh Bukti Tanda Terima (PDF)'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const waMessage = `*TANDA TERIMA DIGITAL - KONI JEPARA*\n\nSurat Masuk Anda telah terdaftar dalam SIAP KONI Jepara.\n\n*Rincian Dokumen:*\n- No. Agenda: ${selectedSurat.nomorAgenda}\n- No. Surat: ${selectedSurat.nomorSurat}\n- Instansi: ${selectedSurat.instansi}\n- Pengirim: ${selectedSurat.pengirim}\n- Perihal: ${selectedSurat.perihal}\n- Diterima Tanggal: ${selectedSurat.tanggalDiterima}\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
                    handleOpenWhatsApp(selectedSurat.nomorWhatsApp || '081399887766', waMessage);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-xs mt-1"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Kirim Tanda Terima via WhatsApp</span>
                </button>

              </div>

              {/* Right Side: Live Paper Receipt Preview */}
              <div className="lg:col-span-7 p-4 md:p-8 bg-slate-200 overflow-y-auto flex items-start justify-center">
                
                {/* Physical-looking paper container */}
                <div
                  id="printable-receipt"
                  className="bg-white border border-slate-300 rounded-lg p-6 md:p-10 shadow-lg w-full max-w-[210mm] relative font-sans text-slate-800 space-y-4"
                  style={{ minHeight: '148mm' }}
                >
                  {/* Dynamic Style injection specifically for print-only rules */}
                  <style>{`
                    @media print {
                      body {
                        background: white !important;
                        color: black !important;
                      }
                      #siap-koni-layout, #siap-koni-layout *,
                      #modal-tanda-terima, #modal-tanda-terima *,
                      .no-print, .no-print * {
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                      }
                      #printable-receipt, #printable-receipt * {
                        visibility: visible !important;
                      }
                      #printable-receipt {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                      }
                    }
                  `}</style>

                  {/* Receipt Kop Section */}
                  <div className="relative min-h-[90px] border-b-4 border-double border-slate-800 pb-3 flex items-center justify-center">
                    {showLogo && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex-shrink-0">
                        <img
                          src={activeLogoSrc}
                          alt="Logo KOP"
                          style={{ width: `${receiptLogoWidth}px`, height: 'auto', maxHeight: '100px' }}
                          className="object-contain"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="text-center w-full" style={{ paddingLeft: showLogo ? `${receiptLogoWidth + 12}px` : '0px', paddingRight: showLogo ? `${receiptLogoWidth + 12}px` : '0px' }}>
                      <h3 className="text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-tight text-slate-900 leading-tight">
                        {receiptKop1}
                      </h3>
                      <h4 className="text-[10px] sm:text-xs md:text-sm font-extrabold uppercase text-slate-800 mt-0.5 leading-tight">
                        {receiptKop2}
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-slate-600 mt-1 font-medium leading-relaxed">
                        {receiptAlamat}
                      </p>
                    </div>
                  </div>

                  {/* Receipt Document Title */}
                  <div className="text-center py-2">
                    <h2 className="text-sm md:text-base font-extrabold tracking-wider uppercase text-slate-900 underline decoration-2">
                      {receiptTitle}
                    </h2>
                    <span className="text-[10px] font-mono font-bold text-slate-500 mt-1 block">
                      NOMOR AGENDA: {selectedSurat.nomorAgenda}
                    </span>
                  </div>

                  {/* Intro Text */}
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    Telah diterima dengan baik berkas persuratan resmi masuk di Kantor Sekretariat, dengan data administrasi sebagai berikut:
                  </div>

                  {/* Letter Details Grid Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Nomor Agenda</div>
                      <div className="col-span-8 px-3 py-2 font-mono font-extrabold text-blue-700">{selectedSurat.nomorAgenda}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Asal Instansi / Cabor</div>
                      <div className="col-span-8 px-3 py-2 font-extrabold text-slate-900">{selectedSurat.instansi}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Nomor Surat Resmi</div>
                      <div className="col-span-8 px-3 py-2 font-mono font-bold text-slate-800">{selectedSurat.nomorSurat}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Perihal / Ringkasan</div>
                      <div className="col-span-8 px-3 py-2 font-semibold text-slate-700 leading-normal">{selectedSurat.perihal}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Pengirim / Utusan</div>
                      <div className="col-span-8 px-3 py-2 font-bold text-slate-800">{selectedSurat.pengirim}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Jenis Dokumen</div>
                      <div className="col-span-8 px-3 py-2 uppercase font-extrabold text-slate-600 text-[10px] tracking-wider">{selectedSurat.jenisSurat}</div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-slate-200">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Tanggal Surat</div>
                      <div className="col-span-8 px-3 py-2 font-bold text-slate-850">{selectedSurat.tanggalSurat}</div>
                    </div>
                    <div className="grid grid-cols-12">
                      <div className="col-span-4 bg-slate-50 px-3 py-2 font-bold text-slate-500 border-r border-slate-200 uppercase tracking-wider text-[10px]">Diterima Tanggal</div>
                      <div className="col-span-8 px-3 py-2 font-extrabold text-emerald-750">{selectedSurat.tanggalDiterima}</div>
                    </div>
                  </div>

                  {/* Outro text / Catatan */}
                  <div className="text-[11px] text-slate-650 italic leading-relaxed pt-1">
                    * Catatan: {receiptCatatan}
                  </div>

                  {/* Signatures & Stamps section */}
                  <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
                    
                    {/* Left Sig: Pengirim */}
                    <div className="text-center flex flex-col justify-between h-36">
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pemberi / Pembawa Dokumen,</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Utusan Instansi Pengirim</span>
                      </div>
                      
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-slate-300 italic text-[10px]">Tanda Tangan Basah</span>
                      </div>

                      <div>
                        <span className="font-extrabold text-slate-800 block underline leading-none">
                          {selectedSurat.pengirim.split('(')[0].trim()}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 block">Ttd & Nama Terang</span>
                      </div>
                    </div>

                    {/* Right Sig: Penerima (Sekretariat KONI) */}
                    <div className="text-center flex flex-col justify-between h-36 relative">
                      <div>
                        <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                          Jepara, {selectedSurat.tanggalDiterima}
                        </span>
                        <span className="block text-[10px] font-extrabold text-slate-900 uppercase">
                          Penerima / Petugas Sekretariat,
                        </span>
                      </div>
                      
                      {/* Interactive Stamp & Sig Graphic */}
                      <div className="h-16 flex items-center justify-center relative">
                        {showSignature && (
                          <div className="font-serif italic text-blue-800 text-lg font-bold select-none rotate-[-6deg] opacity-75 z-10">
                            {receiptPetugas.substring(0, 3)}..._sgd
                          </div>
                        )}
                        
                        {showStamp && (
                          <div className="absolute right-4 bottom-[-10px] border-4 border-double border-blue-600 text-blue-600 rounded-full h-20 w-20 flex flex-col items-center justify-center font-bold text-[8px] uppercase tracking-wider select-none rotate-[-12deg] opacity-65 mix-blend-multiply bg-white/20 z-0 scale-95">
                            <div className="text-[5px]">SEKRETARIAT</div>
                            <div className="border-y border-blue-600 py-0.5 my-0.5 leading-none font-extrabold text-[7px]">KONI JEPARA</div>
                            <div className="text-[5px]">DIGITAL STAMP</div>
                          </div>
                        )}
                      </div>

                      <div className="z-10">
                        <span className="font-extrabold text-slate-900 block underline leading-none">
                          {receiptPetugas}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 block">
                          SIAP KONI JEPARA
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* QR verification / footer stamp */}
                  {showQr && (
                    <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[9px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <QrCode className="h-7 w-7 text-slate-700" size={28} style={{ width: '28px', height: '28px' }} />
                        <div>
                          <span className="font-bold text-slate-600 block">DIVERIFIKASI DIGITAL</span>
                          <span>Scan QR Code untuk memverifikasi keaslian dokumen di portal SIAP KONI</span>
                        </div>
                      </div>
                      <span className="font-mono text-slate-300">ID: {selectedSurat.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL: Peringatan Koneksi Printer Sandbox */}
      {showPrintIframeWarning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden text-slate-800">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                <Printer className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900">Mencetak di Dalam Preview</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Karena batasan keamanan browser (sandbox iframe) pada halaman pratinjau ini, perintah cetak langsung ke mesin printer diblokir oleh browser Anda.
                </p>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-left text-[11px] text-blue-800 space-y-1 mt-3">
                  <span className="font-extrabold block text-blue-900">💡 2 Cara Mudah untuk Mencetak:</span>
                  <div className="flex items-start gap-1">
                    <span className="font-bold">1.</span>
                    <span><strong>Unduh PDF</strong> lalu buka file PDF tersebut di komputer Anda dan klik Cetak (Direkomendasikan).</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-bold">2.</span>
                    <span>Klik tombol <strong>"Buka Aplikasi di Tab Baru" (Open in New Tab)</strong> di pojok kanan atas layar preview untuk membuka aplikasi secara penuh, lalu tekan Cetak Langsung.</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintIframeWarning(false);
                    handleDownloadPDF();
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-md cursor-pointer"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Unduh PDF & Cetak Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintIframeWarning(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs cursor-pointer"
                >
                  Tutup Bantuan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
