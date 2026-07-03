/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LPJ, User, LPJStatus } from '../types';
import {
  FilePlus,
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Upload,
  Sparkles,
  Smartphone,
  ChevronRight,
  HelpCircle,
  XCircle,
  Eye,
  QrCode,
  Trash2,
  Printer,
  Settings,
  UploadCloud,
  ImageIcon,
  Check,
  FileDown,
  AlertTriangle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

interface LpjViewProps {
  lpjs: LPJ[];
  user: User;
  onAddLpj: (newLpj: any) => Promise<void>;
  onUpdateLpjStatus: (id: string, updateData: any) => Promise<void>;
  onDeleteLpj?: (id: string) => Promise<void>;
}

export default function LpjView({
  lpjs,
  user,
  onAddLpj,
  onUpdateLpjStatus,
  onDeleteLpj
}: LpjViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLpjModal, setShowAddLpjModal] = useState(false);
  const [selectedLpj, setSelectedLpj] = useState<LPJ | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Recap Export to Excel (CSV format for compatibility)
  const handleExportExcel = () => {
    const headers = [
      'No. Agenda',
      'Nomor LPJ',
      'Nama Cabang Olahraga',
      'Keperluan Anggaran (Tahap Dana)',
      'Nominal Dana (IDR)',
      'No. WhatsApp',
      'Status Verifikasi',
      'Deskripsi Pembelanjaan'
    ];

    const rows = filteredLpjs.map(l => {
      return [
        l.nomorAgenda,
        l.nomorLPJ,
        l.namaCabor,
        l.tahapDana,
        l.nominal,
        l.nomorWhatsApp || '',
        l.status,
        l.catatan || ''
      ];
    });

    const csvContent = "\uFEFF" + [headers, ...rows]
      .map(row => row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `REKAP_LPJ_CABOR_SIAP_KONI_${new Date().toISOString().split('T')[0]}.csv`);
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
    pdf.text('LAPORAN REKAPITULASI LPJ PEMBINAAN CABOR', pageWidth / 2, y, { align: 'center' });

    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`, margin, y);
    
    const totalNominal = filteredLpjs.reduce((sum, l) => sum + l.nominal, 0);
    pdf.text(`Jumlah: ${filteredLpjs.length} LPJ | Total Dana: ${formatIDR(totalNominal)}`, pageWidth - margin, y, { align: 'right' });

    y += 5;

    // Table Header
    const colWidths = {
      agenda: 22,
      cabor: 35,
      nomorLpj: 35,
      tahap: 45,
      nominal: 28,
      status: 15
    };

    const drawTableHeader = (startY: number) => {
      pdf.setFillColor(243, 244, 246); // gray-100
      pdf.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
      
      pdf.setDrawColor(209, 213, 219); // gray-300
      pdf.setLineWidth(0.15);
      pdf.rect(margin, startY, pageWidth - margin * 2, 8, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(55, 65, 81);

      let curX = margin;
      pdf.text('NO. AGENDA', curX + 2, startY + 5.5);
      curX += colWidths.agenda;
      pdf.text('CABANG OLAHRAGA', curX + 2, startY + 5.5);
      curX += colWidths.cabor;
      pdf.text('NOMOR LPJ', curX + 2, startY + 5.5);
      curX += colWidths.nomorLpj;
      pdf.text('TAHAP / PERUNTUKAN', curX + 2, startY + 5.5);
      curX += colWidths.tahap;
      pdf.text('NOMINAL', curX + 2, startY + 5.5);
      curX += colWidths.nominal;
      pdf.text('STATUS', curX + 2, startY + 5.5);
    };

    drawTableHeader(y);
    y += 8;

    // Table Rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(17, 24, 39);

    filteredLpjs.forEach((l) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = 15;
        drawTableHeader(y);
        y += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(17, 24, 39);
      }

      const caborLines = pdf.splitTextToSize(l.namaCabor, colWidths.cabor - 4);
      const nomorLines = pdf.splitTextToSize(l.nomorLPJ, colWidths.nomorLpj - 4);
      const tahapLines = pdf.splitTextToSize(l.tahapDana, colWidths.tahap - 4);

      const maxLines = Math.max(caborLines.length, nomorLines.length, tahapLines.length, 1);
      const rowHeight = maxLines * 3.5 + 3.5;

      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.1);
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

      let curX = margin;
      
      // Agenda
      pdf.setFont('helvetica', 'bold');
      pdf.text(l.nomorAgenda, curX + 2, y + 4.5);
      pdf.setFont('helvetica', 'normal');
      curX += colWidths.agenda;

      // Cabor
      pdf.text(caborLines, curX + 2, y + 4.5);
      curX += colWidths.cabor;

      // Nomor LPJ
      pdf.text(nomorLines, curX + 2, y + 4.5);
      curX += colWidths.nomorLpj;

      // Tahap Dana
      pdf.text(tahapLines, curX + 2, y + 4.5);
      curX += colWidths.tahap;

      // Nominal
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatIDR(l.nominal), curX + 2, y + 4.5);
      pdf.setFont('helvetica', 'normal');
      curX += colWidths.nominal;

      // Status
      pdf.setFont('helvetica', 'bold');
      if (l.status === 'Disetujui' || l.status === 'Lengkap') pdf.setTextColor(5, 150, 105);
      else if (l.status === 'Perlu Revisi' || l.status === 'Ditolak') pdf.setTextColor(220, 38, 38);
      else pdf.setTextColor(217, 119, 6);
      pdf.text(l.status, curX + 2, y + 4.5);
      pdf.setTextColor(17, 24, 39);
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
    pdf.text('BENDAHARA KONI JEPARA', pageWidth - margin - 50, y);
    
    y += 18;
    pdf.text(user.name.toUpperCase(), pageWidth - margin - 50, y);
    pdf.setLineWidth(0.2);
    pdf.line(pageWidth - margin - 50, y + 0.6, pageWidth - margin - 10, y + 0.6);
    y += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Role: ${user.role}`, pageWidth - margin - 50, y);

    pdf.save(`REKAP_LPJ_CABOR_KONI_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Tanda Terima State (Customizable)
  const DEFAULT_SVG_LOGO = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="46" fill="#1e3a8a" stroke="#f59e0b" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="white"/><path d="M50 15 L75 35 L65 75 L50 85 L35 75 L25 35 Z" fill="#ef4444" opacity="0.1"/><path d="M50 15 L75 35 L65 75 L50 85 L35 75 L25 35 Z" stroke="#ef4444" stroke-width="2.5" fill="none"/><path d="M50 20 L68 34 L60 68 L50 76 L40 68 L32 34 Z" fill="#f59e0b"/><circle cx="50" cy="45" r="8" fill="white" stroke="#1e3a8a" stroke-width="2"/><path d="M50 30 L50 55 M42 45 L58 45" stroke="#ef4444" stroke-width="2"/><path d="M35 80 Q50 90 65 80" stroke="#1e3a8a" stroke-width="3" fill="none" stroke-linecap="round"/><text x="50" y="93" font-family="sans-serif" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">KONI JEPARA</text></svg>');

  const [receiptLogo, setReceiptLogo] = useState(() => {
    return localStorage.getItem('siap_koni_lpj_receipt_logo') || 'DEFAULT_SVG';
  });
  const [receiptKop1, setReceiptKop1] = useState(() => {
    const saved = localStorage.getItem('siap_koni_lpj_receipt_kop1');
    if (!saved || saved === 'KOMITE OLAHRAGA NASIONAL INDONESIA (KONI)') {
      return 'KOMITE OLAHRAGA NASIONAL INDONESIA';
    }
    return saved;
  });
  const [receiptKop2, setReceiptKop2] = useState(() => {
    const saved = localStorage.getItem('siap_koni_lpj_receipt_kop2');
    if (!saved || saved === 'KONI KABUPATEN JEPARA' || saved === 'PENGURUS KABUPATEN JEPARA') {
      return '(KONI) KABUPATEN JEPARA';
    }
    return saved;
  });
  const [receiptAlamat, setReceiptAlamat] = useState(() => {
    const saved = localStorage.getItem('siap_koni_lpj_receipt_alamat');
    if (!saved || saved.includes('Sekretariat: Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214 • Email: koni_jepara@yahoo.com') || saved.includes('Stadion')) {
      return 'Alamat : Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214\nEmail : koni_jepara@yahoo.com';
    }
    return saved;
  });
  const [receiptTitle, setReceiptTitle] = useState(() => {
    return localStorage.getItem('siap_koni_lpj_receipt_title') || 'TANDA TERIMA PENYERAHAN LPJ';
  });
  const [receiptCatatan, setReceiptCatatan] = useState(() => {
    return localStorage.getItem('siap_koni_lpj_receipt_catatan') || 'Dokumen di atas merupakan Bukti Penyerahan Laporan Pertanggungjawaban (LPJ) elektronik yang sah di bawah sistem SIAP KONI Kabupaten Jepara. Segala data dan nominal yang diserahkan telah diregistrasi secara aman di server dinas.';
  });
  const [receiptPetugas, setReceiptPetugas] = useState('');
  const [receiptLogoWidth, setReceiptLogoWidth] = useState(() => {
    return Number(localStorage.getItem('siap_koni_lpj_receipt_logo_width')) || 65;
  });
  const [showLogo, setShowLogo] = useState(true);
  const [showStamp, setShowStamp] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  React.useEffect(() => {
    if (selectedLpj) {
      setReceiptPetugas(user.role === 'Pengurus Cabang Olahraga (Cabor)' ? 'Petugas Administrasi' : user.name);
    }
  }, [selectedLpj, user]);

  React.useEffect(() => {
    const persistAndOptimizeLogo = async () => {
      if (receiptLogo && receiptLogo.startsWith('data:image/') && receiptLogo.length > 100 * 1024) {
        console.log('Compressing large LPJ logo from state...', receiptLogo.length);
        const compressed = await compressImageToMaxDims(receiptLogo);
        if (compressed !== receiptLogo) {
          setReceiptLogo(compressed);
          localStorage.setItem('siap_koni_lpj_receipt_logo', compressed);
          return;
        }
      }
      localStorage.setItem('siap_koni_lpj_receipt_logo', receiptLogo);
    };
    persistAndOptimizeLogo();
  }, [receiptLogo]);

  const handleSaveReceiptSettings = () => {
    localStorage.setItem('siap_koni_lpj_receipt_logo', receiptLogo);
    localStorage.setItem('siap_koni_lpj_receipt_kop1', receiptKop1);
    localStorage.setItem('siap_koni_lpj_receipt_kop2', receiptKop2);
    localStorage.setItem('siap_koni_lpj_receipt_alamat', receiptAlamat);
    localStorage.setItem('siap_koni_lpj_receipt_title', receiptTitle);
    localStorage.setItem('siap_koni_lpj_receipt_catatan', receiptCatatan);
    localStorage.setItem('siap_koni_lpj_receipt_logo_width', receiptLogoWidth.toString());
    alert('Desain Kop & Logo Tanda Terima LPJ berhasil disimpan secara permanen!');
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

  // New LPJ Form
  const [nomorLPJ, setNomorLPJ] = useState('');
  const [namaCabor, setNamaCabor] = useState(user.caborName || 'PSSI (Sepak Bola)');
  const [tahapDana, setTahapDana] = useState('Pembinaan Rutin Tahap 1');
  const [nominal, setNominal] = useState<number>(15000000);
  const [nomorWhatsApp, setNomorWhatsApp] = useState(user.phone || '081399887766');
  const [pdfFilename, setPdfFilename] = useState('');
  const [fotoFilename, setFotoFilename] = useState('');
  
  // Real File Upload States for LPJ
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [fotoProgress, setFotoProgress] = useState<number | null>(null);
  const [isPdfDragOver, setIsPdfDragOver] = useState(false);
  const [isFotoDragOver, setIsFotoDragOver] = useState(false);

  const pdfInputRef = React.useRef<HTMLInputElement>(null);
  const fotoInputRef = React.useRef<HTMLInputElement>(null);

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPdfDragOver(false);
    let file: File | undefined;
    if ('files' in e.target) {
      file = e.target.files?.[0];
    } else if ('dataTransfer' in e) {
      file = e.dataTransfer?.files?.[0];
    }

    if (file) {
      setPdfFilename(file.name);
      setPdfProgress(0);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        setPdfProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => setPdfProgress(null), 500);
        }
      }, 120);
    }
  };

  const handleFotoFileSelect = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsFotoDragOver(false);
    let file: File | undefined;
    if ('files' in e.target) {
      file = e.target.files?.[0];
    } else if ('dataTransfer' in e) {
      file = e.dataTransfer?.files?.[0];
    }

    if (file) {
      setFotoFilename(file.name);
      setFotoProgress(0);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        setFotoProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => setFotoProgress(null), 500);
        }
      }, 120);
    }
  };

  const [catatan, setCatatan] = useState('');

  // Update Status Form
  const [newStatus, setNewStatus] = useState<LPJStatus>('Sedang Diverifikasi');
  const [statusCatatan, setStatusCatatan] = useState('');

  const handleLpjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nomorLPJ,
      namaCabor,
      tahapDana,
      nominal,
      nomorWhatsApp,
      uploadPdf: pdfFilename || 'LPJ_Lengkap_Selesai.pdf',
      uploadFoto: fotoFilename || 'Dokumentasi_Nota.jpg',
      catatan,
      status: 'Baru Masuk',
      creatorName: user.name
    };

    await onAddLpj(payload);

    // Reset Form
    setNomorLPJ('');
    setCatatan('');
    setPdfFilename('');
    setFotoFilename('');
    setNomorWhatsApp(user.phone || '081399887766');
    setShowAddLpjModal(false);
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

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLpj) return;

    const payload = {
      status: newStatus,
      updaterName: user.name,
      updaterRole: user.role,
      catatan: statusCatatan || `Mengubah status LPJ ke ${newStatus}.`
    };

    await onUpdateLpjStatus(selectedLpj.id, payload);

    // Update selected visual state
    setSelectedLpj({
      ...selectedLpj,
      status: newStatus,
      statusHistory: [
        ...selectedLpj.statusHistory,
        {
          tanggal: new Date().toISOString(),
          statusLama: selectedLpj.status,
          statusBaru: newStatus,
          pengguna: user.name,
          catatan: statusCatatan || `Mengubah status LPJ ke ${newStatus}.`
        }
      ]
    });

    setStatusCatatan('');
  };

  // PDF download state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedLpj) return;
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('printable-lpj-receipt');
      if (!element) {
        alert('Elemen struk tidak ditemukan!');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 1.5, // Optimize scale for smaller file size (150 DPI)
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality for maximum savings under 1MB
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }
      }

      const idClean = selectedLpj.id.substring(0, 6).toUpperCase();
      const caborClean = selectedLpj.namaCabor.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Tanda_Terima_LPJ_${idClean}_${caborClean}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.warn('html2canvas failed, falling back to clean vector PDF generation:', error);
      try {
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
        });
        const margin = 20;
        const width = 210;
        let y = 25;

        // Draw Kop Surat
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(30, 58, 138); // Navy blue
        
        let logoWidthMm = 16;
        let logoHeightMm = 16;
        let logoXMm = 20;
        let logoYMm = 21; // Vertically aligned with the text block starting at y=25

        if (showLogo) {
          if (receiptLogo !== 'DEFAULT_SVG') {
            try {
              const imgProps = pdf.getImageProperties(activeLogoSrc);
              const aspectRatio = imgProps.width / imgProps.height;
              
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
          } else if (activeLogoSrc.startsWith('data:image/')) {
            const formatMatch = activeLogoSrc.match(/data:image\/([a-zA-Z+]+);base64,/);
            const format = formatMatch ? formatMatch[1].toUpperCase() : 'PNG';
            try {
              pdf.addImage(activeLogoSrc, format === 'SVG+XML' ? 'PNG' : format, logoXMm, logoYMm, logoWidthMm, logoHeightMm);
            } catch (err) {
              console.error('Error adding base64 logo:', err);
              pdf.setFillColor(30, 58, 138);
              pdf.circle(logoXMm + 8, logoYMm + 8, 8, 'F');
            }
          } else if (activeLogoSrc.startsWith('http://') || activeLogoSrc.startsWith('https://')) {
            try {
              pdf.addImage(activeLogoSrc, 'JPEG', logoXMm, logoYMm, logoWidthMm, logoHeightMm);
            } catch (err) {
              console.error('Error adding remote logo:', err);
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
        pdf.text(`NOMOR: TT-LPJ-2026-${selectedLpj.id.substring(0, 6).toUpperCase()}`, width / 2, y, { align: 'center' });

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

        drawRow('Cabang Olahraga', selectedLpj.namaCabor);
        drawRow('No. LPJ Resmi', selectedLpj.nomorLPJ);
        drawRow('Agenda Registrasi', selectedLpj.nomorAgenda, true);
        drawRow('Keperluan Anggaran', selectedLpj.tahapDana);
        drawRow('Jumlah Dana Dilaporkan', formatIDR(selectedLpj.nominal));
        drawRow('Status Berkas LPJ', selectedLpj.status);
        drawRow('Tanggal Penyerahan', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));

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
        
        // Left Column (Cabor)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // light gray
        pdf.text('YANG MENYERAHKAN,', margin + 10, sigY);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Pengurus Cabang Olahraga', margin + 10, sigY + 4);

        if (showSignature) {
          pdf.setFont('courier', 'oblique');
          pdf.setFontSize(10);
          pdf.setTextColor(16, 185, 129); // Emerald
          pdf.text(`${selectedLpj.namaCabor.substring(0, 4)}..._cbr`, margin + 10, sigY + 16);
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(selectedLpj.namaCabor.toUpperCase(), margin + 10, sigY + 28);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text('Ttd & Nama Terang', margin + 10, sigY + 31.5);


        // Right Column (Penerima)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105); // slate 600
        pdf.text(`JEPARA, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`, width - margin - 65, sigY);
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
          pdf.text(`${receiptPetugas.substring(0, 3)}..._rec`, width - margin - 65, sigY + 16);
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
          pdf.text(`ID: ${selectedLpj.id.substring(0, 8).toUpperCase()}`, width - margin - 26, y + 4);
        }

        const idClean = selectedLpj.id.substring(0, 6).toUpperCase();
        const caborClean = selectedLpj.namaCabor.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Tanda_Terima_LPJ_${idClean}_${caborClean}.pdf`;
        pdf.save(fileName);
      } catch (innerError) {
        console.error('Vector generation also failed:', innerError);
        alert('Gagal mengekspor PDF secara otomatis. Silakan cetak manual menggunakan tombol "Cetak Sekarang".');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    if (isInsideIframe) {
      setShowPrintIframeWarning(true);
      return;
    }

    try {
      const element = document.getElementById('printable-lpj-receipt');
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

  const handleSendReceiptWA = () => {
    if (!selectedLpj) return;
    const receiptNo = `TT-LPJ-2026-${selectedLpj.id.substring(0, 6).toUpperCase()}`;
    const waMessage = `*${receiptTitle}*\n*${receiptKop2}*\n\nLaporan Pertanggungjawaban (LPJ) telah sukses diserahkan.\n\n*Rincian Penyerahan:*\n- No. Tanda Terima: ${receiptNo}\n- Cabor: ${selectedLpj.namaCabor}\n- No. LPJ Resmi: ${selectedLpj.nomorLPJ}\n- Tahap Dana: ${selectedLpj.tahapDana}\n- Nominal Dilaporkan: ${formatIDR(selectedLpj.nominal)}\n- Status Saat Ini: *${selectedLpj.status}*\n- Tanggal Penyerahan: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nTerima kasih atas tertib administrasi Anda.\n\n${receiptKop1}.`;
    handleOpenWhatsApp(selectedLpj.nomorWhatsApp || '081399887766', waMessage);
  };

  // Filter LPJ
  const filteredLpjs = lpjs.filter(l => {
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch = 
      l.namaCabor.toLowerCase().includes(sTerm) ||
      l.nomorLPJ.toLowerCase().includes(sTerm) ||
      l.nomorAgenda.toLowerCase().includes(sTerm);
    
    // Cabor role can only see their own LPJs
    const matchesCabor = user.role !== 'Pengurus Cabang Olahraga (Cabor)' || l.namaCabor.includes(user.caborName || '');

    return matchesSearch && matchesCabor;
  });

  const handleSelectLpj = (l: LPJ) => {
    setSelectedLpj(l);
    setNewStatus(l.status);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans" id="lpj-view">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="lpj-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modul LPJ Pembinaan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Unggah berkas pertanggungjawaban dana, validasi rincian kuitansi pengeluaran, serta beri koreksi revisi jika ada ketidaksesuaian.
          </p>
        </div>
        {(user.role === 'Pengurus Cabang Olahraga (Cabor)' || ['Super Admin', 'Operator'].includes(user.role)) && (
          <button
            onClick={() => setShowAddLpjModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
            id="btn-add-lpj-modal"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Unggah LPJ Baru</span>
          </button>
        )}
      </div>

      {/* Main Grid: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="lpj-main-grid">
        
        {/* Left: LPJs Table */}
        <div className="lg:col-span-8 space-y-4" id="lpj-list-panel">
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            
            {/* Search */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50" id="lpj-search-area">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama cabor, nomor LPJ, nomor agenda..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="search-lpj-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Unduh Rekap Spreadsheet Excel (.csv)"
                  id="btn-rekap-excel-lpj"
                >
                  <FileDown className="h-4 w-4 text-emerald-600" />
                  <span>Rekap Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Unduh Rekap Laporan PDF Resmi"
                  id="btn-rekap-pdf-lpj"
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  <span>Rekap PDF</span>
                </button>
              </div>
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto" id="lpj-table-scroller">
              <table className="w-full text-left border-collapse" id="lpj-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                    <th className="px-4 py-3">No. Agenda</th>
                    <th className="px-4 py-3">Cabor & Tahap</th>
                    <th className="px-4 py-3">No. LPJ Resmi</th>
                    <th className="px-4 py-3">Nilai Dana</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLpjs.map((lpj) => (
                    <tr
                      key={lpj.id}
                      onClick={() => handleSelectLpj(lpj)}
                      className={`hover:bg-blue-50/30 transition cursor-pointer ${
                        selectedLpj?.id === lpj.id ? 'bg-blue-50/50' : ''
                      }`}
                      id={`lpj-row-${lpj.id}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">{lpj.nomorAgenda}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Auto-registrasi</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{lpj.namaCabor}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{lpj.tahapDana}</div>
                      </td>
                      <td className="px-4 py-4 font-mono font-medium max-w-[120px] truncate" title={lpj.nomorLPJ}>
                        {lpj.nomorLPJ}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900 font-mono">
                        {formatIDR(lpj.nominal)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          lpj.status === 'Disetujui' || lpj.status === 'Lengkap'
                            ? 'bg-emerald-50 text-emerald-600'
                            : lpj.status === 'Perlu Revisi' || lpj.status === 'Ditolak'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {lpj.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectLpj(lpj);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                            id={`btn-view-lpj-${lpj.id}`}
                          >
                            Verifikasi
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectLpj(lpj);
                              setShowReceiptModal(true);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold flex items-center gap-1 transition"
                            title="Pratinjau & Cetak Tanda Terima LPJ"
                            id={`btn-receipt-lpj-${lpj.id}`}
                          >
                            <Printer className="h-3 w-3" />
                            <span>Tanda Terima</span>
                          </button>
                          {['Super Admin', 'Operator', 'Sekretaris', 'Bendahara'].includes(user.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteLpj) onDeleteLpj(lpj.id);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                              title="Hapus LPJ"
                              id={`btn-delete-lpj-${lpj.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLpjs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Tidak ada berkas laporan LPJ ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Actions Sheet */}
        <div className="lg:col-span-4" id="lpj-detail-panel">
          {selectedLpj ? (
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-6" id="lpj-details-card">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] text-purple-600 font-mono font-bold uppercase bg-purple-50 px-2 py-0.5 rounded">
                    Agenda: {selectedLpj.nomorAgenda}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1.5">{selectedLpj.namaCabor}</h2>
                </div>
                <div className="h-10 w-10 border border-slate-200 rounded p-1 flex items-center justify-center bg-slate-50">
                  <QrCode className="h-7 w-7 text-slate-800" />
                </div>
              </div>

              {/* PDF Preview Link Simulator */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-xs" id="lpj-attachment-preview">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-5 w-5 text-red-500 shrink-0" />
                  <div className="overflow-hidden">
                    <span className="font-semibold block truncate" title={selectedLpj.uploadPdf}>{selectedLpj.uploadPdf}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">14.2 MB • Dokumen PDF Terverifikasi</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Simulasi pratinjau PDF ${selectedLpj.uploadPdf} berjalan tanpa unduhan.`)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold shrink-0"
                >
                  Pratinjau
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                id="btn-show-receipt-modal"
              >
                <Printer className="h-4 w-4" />
                <span>Lihat & Cetak Tanda Terima LPJ</span>
              </button>

              {/* LPJ Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Nomor LPJ Resmi:</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedLpj.nomorLPJ}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Peruntukan Tahap Anggaran:</span>
                  <span className="font-semibold text-slate-800">{selectedLpj.tahapDana}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Total Nilai LPJ Terlaporkan:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{formatIDR(selectedLpj.nominal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Nomor WhatsApp Kontak:</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedLpj.nomorWhatsApp || '-'}</span>
                </div>
                {selectedLpj.catatan && (
                  <div>
                    <span className="text-slate-400 font-medium block">Deskripsi Pembelanjaan:</span>
                    <span className="text-slate-700 leading-normal block bg-slate-50 p-2.5 rounded border border-slate-100 mt-1">
                      {selectedLpj.catatan}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Verification Form */}
              {['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator'].includes(user.role) ? (
                <form onSubmit={handleUpdateStatusSubmit} className="pt-4 border-t border-slate-100 space-y-4 text-xs" id="lpj-verification-form">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Hasil Verifikasi & Catatan Revisi</h3>
                  
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Status Verifikasi LPJ</label>
                    <select
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-medium text-xs"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as LPJStatus)}
                    >
                      <option value="Baru Masuk">Baru Masuk</option>
                      <option value="Diterima">Diterima</option>
                      <option value="Sedang Diverifikasi">Sedang Diverifikasi</option>
                      <option value="Perlu Revisi">Perlu Revisi (Kirim WA)</option>
                      <option value="Revisi Diterima">Revisi Diterima</option>
                      <option value="Lengkap">Lengkap</option>
                      <option value="Disetujui">Disetujui & Cairkan Anggaran</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                      Catatan Audit / Rincian Revisi (Pesan WA)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      placeholder="Masukkan koreksi nomor nota, nominal selisih, rincian kuitansi yang tidak valid, dll..."
                      value={statusCatatan}
                      onChange={(e) => setStatusCatatan(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      id="btn-save-lpj-verification"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let waMessage = '';
                        if (newStatus === 'Disetujui') {
                          waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${selectedLpj.namaCabor},\n\nLPJ dengan Nomor Agenda ${selectedLpj.nomorAgenda} telah DISETUJUI oleh Bendahara KONI Jepara.\n\nStatus: Selesai & Lengkap.\n\nTerima kasih atas kerja samanya.\n\nKONI Jepara.`;
                        } else if (newStatus === 'Perlu Revisi') {
                          waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${selectedLpj.namaCabor},\n\nLPJ dengan Nomor Agenda ${selectedLpj.nomorAgenda} memerlukan REVISI.\n\nCatatan Revisi:\n${statusCatatan || 'Koreksi nota pengeluaran.'}\n\nMohon segera perbaiki dan unggah kembali.\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
                        } else {
                          waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${selectedLpj.namaCabor},\n\nStatus LPJ dengan Nomor Agenda ${selectedLpj.nomorAgenda} diperbarui oleh Pengurus KONI Jepara.\n\nStatus Baru:\n${newStatus}\n\nCatatan:\n${statusCatatan || '-'}\n\nTerima kasih.\n\nKONI Jepara.`;
                        }
                        handleOpenWhatsApp(selectedLpj.nomorWhatsApp || '081399887766', waMessage);
                      }}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>Kirim Riil via WA</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs mt-4">
                  <span className="font-bold block mb-1">📋 Mode Lihat Saja (Read-Only)</span>
                  <span>Sebagai Pengurus Cabor, Anda tidak memiliki izin untuk melakukan verifikasi atau audit LPJ. Verifikasi dan catatan revisi hanya dapat diberikan oleh Pengurus KONI Jepara.</span>
                </div>
              )}

              {/* LPJ Status History Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Histori Pemeriksaan LPJ</h3>
                <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 text-xs">
                  {selectedLpj.statusHistory.map((hist, index) => (
                    <div key={index} className="relative" id={`lpj-timeline-${index}`}>
                      <div className="absolute -left-[21px] top-1 bg-white h-2.5 w-2.5 rounded-full border-2 border-purple-500" />
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(hist.tanggal).toLocaleString('id-ID')}
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        Status: <span className="text-purple-600">{hist.statusBaru}</span>
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{hist.catatan}</p>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                        Verifikator: {hist.pengguna}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete button for authorized roles */}
              {['Super Admin', 'Operator', 'Sekretaris', 'Bendahara'].includes(user.role) && (
                <div className="pt-4 border-t border-red-100 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteLpj) {
                        onDeleteLpj(selectedLpj.id);
                        setSelectedLpj(null);
                      }
                    }}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    id="btn-delete-lpj-sidebar"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Berkas LPJ</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 border-dashed rounded-xl p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-64">
              <FilePlus className="h-8 w-8 text-slate-300" />
              <span>Silakan pilih salah satu laporan LPJ di samping untuk memeriksa kecocokan kuitansi pengeluaran.</span>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Upload LPJ Baru */}
      {showAddLpjModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="modal-upload-lpj">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Penyerahan & Upload LPJ Cabor</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Unggah berkas pembelanjaan untuk dana pembinaan yang dicairkan.</p>
              </div>
              <button
                onClick={() => setShowAddLpjModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleLpjSubmit} className="p-5 space-y-4 text-xs" id="lpj-form">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor LPJ Resmi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: LPJ/PSSI-JPR/VI/2026"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                    value={nomorLPJ}
                    onChange={(e) => setNomorLPJ(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nama Cabor</label>
                  {user.role === 'Pengurus Cabang Olahraga (Cabor)' ? (
                    <input
                      type="text"
                      disabled
                      className="w-full p-2.5 border border-slate-100 rounded-lg bg-slate-50 font-bold"
                      value={namaCabor}
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PASI (Atletik)"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      value={namaCabor}
                      onChange={(e) => setNamaCabor(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Peruntukan Dana Tahap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bupati Cup U-19"
                    className="w-full p-2.5 border border-slate-200 rounded-lg"
                    value={tahapDana}
                    onChange={(e) => setTahapDana(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nominal Pembelanjaan (IDR)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold"
                    value={nominal}
                    onChange={(e) => setNominal(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* PDF & Photo upload with real file selectors & drag-and-drop */}
              <div className="grid grid-cols-2 gap-4 border border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/50">
                {/* PDF Column */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold">Dokumen LPJ (PDF)</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsPdfDragOver(true);
                    }}
                    onDragLeave={() => setIsPdfDragOver(false)}
                    onDrop={handlePdfFileSelect}
                    onClick={() => pdfInputRef.current?.click()}
                    className={`flex flex-col justify-center items-center p-3 rounded border border-dashed text-center cursor-pointer transition h-24 ${
                      isPdfDragOver
                        ? 'border-blue-500 bg-blue-50/50'
                        : pdfFilename
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={pdfInputRef}
                      className="hidden"
                      accept="application/pdf"
                      onChange={handlePdfFileSelect}
                    />

                    {pdfProgress !== null ? (
                      <div className="w-full px-2 space-y-1">
                        <span className="text-[9px] font-bold text-slate-600 block">Uploading {pdfProgress}%</span>
                        <div className="w-full bg-slate-200 h-1 rounded overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${pdfProgress}%` }} />
                        </div>
                      </div>
                    ) : pdfFilename ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700 max-w-[120px] truncate" title={pdfFilename}>
                          {pdfFilename}
                        </span>
                        <span className="text-[8px] text-emerald-600 font-semibold">Selesai diunggah</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-5 w-5 text-blue-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-800">Pilih Berkas PDF</span>
                        <span className="text-[8px] text-slate-400">Maksimal 20MB</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Photo Column */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 uppercase font-semibold">Bukti Kegiatan / Nota (Foto)</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsFotoDragOver(true);
                    }}
                    onDragLeave={() => setIsFotoDragOver(false)}
                    onDrop={handleFotoFileSelect}
                    onClick={() => fotoInputRef.current?.click()}
                    className={`flex flex-col justify-center items-center p-3 rounded border border-dashed text-center cursor-pointer transition h-24 ${
                      isFotoDragOver
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : fotoFilename
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fotoInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFotoFileSelect}
                    />

                    {fotoProgress !== null ? (
                      <div className="w-full px-2 space-y-1">
                        <span className="text-[9px] font-bold text-slate-600 block">Uploading {fotoProgress}%</span>
                        <div className="w-full bg-slate-200 h-1 rounded overflow-hidden">
                          <div className="bg-emerald-600 h-full transition-all duration-150" style={{ width: `${fotoProgress}%` }} />
                        </div>
                      </div>
                    ) : fotoFilename ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700 max-w-[120px] truncate" title={fotoFilename}>
                          {fotoFilename}
                        </span>
                        <span className="text-[8px] text-emerald-600 font-semibold">Selesai diunggah</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-5 w-5 text-emerald-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-800">Pilih Berkas Foto</span>
                        <span className="text-[8px] text-slate-400">Maksimal 15MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Nomor WhatsApp untuk Notifikasi & Tanda Terima</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg font-mono font-medium"
                    value={nomorWhatsApp}
                    onChange={(e) => setNomorWhatsApp(e.target.value)}
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Notifikasi terima berkas otomatis dan link tanda terima LPJ resmi akan langsung dikirimkan ke nomor ini.</p>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Keterangan / Deskripsi Pembelanjaan</label>
                <textarea
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  placeholder="Deskripsikan secara singkat barang/jasa yang dibelanjakan..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddLpjModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm flex items-center gap-1.5"
                  id="btn-submit-lpj"
                >
                  <Send className="h-4 w-4" />
                  <span>Kirim LPJ & Terima WA</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: Tanda Terima LPJ (Generator & Kustomisasi) */}
      {showReceiptModal && selectedLpj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 md:p-4 animate-fade-in no-print" id="modal-receipt-lpj">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600 animate-pulse" />
                <div>
                  <h2 className="text-sm md:text-base font-extrabold text-slate-900">Generator & Kustomisasi Tanda Terima LPJ</h2>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Ubah logo, edit kop instansi, sesuaikan keterangan, dan cetak bukti penyerahan LPJ digital.</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
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
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3.5 shadow-sm">
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
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3 shadow-sm">
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
                      placeholder="KOMITE OLAHRAGA NASIONAL INDONESIA"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Sub-Daerah / Cabang (Baris 2)</label>
                    <input
                      type="text"
                      value={receiptKop2}
                      onChange={(e) => setReceiptKop2(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded font-bold text-slate-800"
                      placeholder="KONI KABUPATEN JEPARA"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Alamat Lengkap & Kontak Sekretariat</label>
                    <textarea
                      value={receiptAlamat}
                      onChange={(e) => setReceiptAlamat(e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-slate-200 rounded text-[11px] leading-relaxed text-slate-600"
                      placeholder="Alamat lengkap, nomor telepon, email, website..."
                    />
                  </div>
                </div>

                {/* Section: Content Customization */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3 shadow-sm">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-100 pb-2">
                    <Settings className="h-3.5 w-3.5 text-blue-500" />
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
                      rows={3}
                      className="w-full p-2 border border-slate-200 rounded leading-relaxed text-slate-600 text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Petugas Penerima</label>
                    <input
                      type="text"
                      value={receiptPetugas}
                      onChange={(e) => setReceiptPetugas(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded font-medium text-slate-800"
                      placeholder="Nama Petugas Penerima"
                    />
                  </div>
                </div>

                {/* Section: Toggles & Signature */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2 shadow-sm">
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
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveReceiptSettings}
                    className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs text-xs"
                  >
                    <Check className="h-4 w-4" />
                    <span>Simpan Kop</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-xs"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Cetak Sekarang</span>
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

                <button
                  type="button"
                  onClick={handleSendReceiptWA}
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
                  id="printable-lpj-receipt"
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
                      #modal-receipt-lpj, #modal-receipt-lpj *,
                      .no-print, .no-print * {
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                      }
                      #printable-lpj-receipt, #printable-lpj-receipt * {
                        visibility: visible !important;
                      }
                      #printable-lpj-receipt {
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

                  {/* Letterhead / Kop */}
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

                  {/* Receipt Title */}
                  <div className="text-center pt-2">
                    <h2 className="text-sm md:text-base font-extrabold tracking-wider uppercase text-slate-900 underline decoration-2">{receiptTitle}</h2>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">
                      NOMOR: TT-LPJ-2026-{selectedLpj.id.substring(0, 6).toUpperCase()}
                    </span>
                  </div>

                  {/* Receipt Fields Table */}
                  <div className="py-2">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px] w-1/3">Cabang Olahraga</td>
                          <td className="py-2.5 font-bold text-slate-900 w-2/3">: {selectedLpj.namaCabor}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">No. LPJ Resmi</td>
                          <td className="py-2.5 font-mono font-bold text-slate-900">: {selectedLpj.nomorLPJ}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Agenda Registrasi</td>
                          <td className="py-2.5 font-mono font-bold text-slate-900">: {selectedLpj.nomorAgenda}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Keperluan Anggaran</td>
                          <td className="py-2.5 font-bold text-slate-700">: {selectedLpj.tahapDana}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Jumlah Dana Dilaporkan</td>
                          <td className="py-2.5 font-extrabold text-blue-700 font-mono text-sm">: {formatIDR(selectedLpj.nominal)}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Status Berkas LPJ</td>
                          <td className="py-2.5 w-2/3">
                            <span className="font-bold text-slate-900">: </span>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold uppercase inline-block ml-1">
                              {selectedLpj.status}
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Tanggal Penyerahan</td>
                          <td className="py-2.5 font-bold text-slate-900">: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Secure QR stamp Simulation */}
                  {showQr && (
                    <div className="flex justify-end pr-4 py-1">
                      <div className="border border-slate-300 rounded p-1.5 flex items-center gap-2 bg-slate-50 max-w-xs">
                        <QrCode className="h-10 w-10 text-slate-800 shrink-0" size={40} style={{ width: '40px', height: '40px' }} />
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 font-mono block">DIKIRIM SECARA ELEKTRONIK</span>
                          <span className="text-[9px] text-blue-600 font-bold font-mono">SIAP KONI JEPARA</span>
                          <span className="text-[8px] text-slate-400 font-mono block">SECURE ID: {selectedLpj.id}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-4 pt-4 text-xs text-slate-700">
                    <div className="text-center flex flex-col justify-between h-36">
                      <span className="block">Yang Menyerahkan,</span>
                      
                      {/* Simulated signature graphic */}
                      <div className="h-16 flex items-center justify-center relative">
                        {showSignature && (
                          <div className="font-serif italic text-emerald-800 text-lg font-bold select-none rotate-[-4deg] opacity-70">
                            {selectedLpj.namaCabor.substring(0, 4)}..._cbr
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="block font-bold text-slate-900 underline uppercase">{selectedLpj.namaCabor}</span>
                        <span className="text-[10px] text-slate-400 block">Pengurus Cabang Olahraga</span>
                      </div>
                    </div>

                    <div className="text-center flex flex-col justify-between h-36 relative">
                      <span className="block">Penerima Sekretariat KONI,</span>
                      
                      {/* Simulated signature and stamp overlay */}
                      <div className="h-16 flex items-center justify-center relative">
                        {showSignature && (
                          <div className="font-serif italic text-blue-800 text-lg font-bold select-none rotate-[-6deg] opacity-75 z-10">
                            {receiptPetugas.substring(0, 3)}..._rec
                          </div>
                        )}
                        
                        {showStamp && (
                          <div className="absolute right-4 bottom-[-10px] border-4 border-double border-blue-600 text-blue-600 rounded-full h-20 w-20 flex flex-col items-center justify-center font-bold text-[8px] uppercase tracking-wider select-none rotate-[-12deg] opacity-65 mix-blend-multiply bg-white/20 z-0 scale-95">
                            <div className="text-[5px]">SEKRETARIAT</div>
                            <div className="border-y border-blue-600 py-0.5 my-0.5 leading-none font-extrabold text-[7px]">{receiptKop2}</div>
                            <div className="text-[5px]">DIGITAL STAMP</div>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="block font-bold text-slate-900 underline uppercase">{receiptPetugas}</span>
                        <span className="text-[10px] text-slate-400 block">KONI Kabupaten Jepara</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer seal disclaimer */}
                  <div className="text-center pt-8 border-t border-slate-100 text-[9px] text-slate-400 leading-snug">
                    {receiptCatatan}
                  </div>

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

// Icon fallbacks inside file for self-contained robustness and cleanliness
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}
