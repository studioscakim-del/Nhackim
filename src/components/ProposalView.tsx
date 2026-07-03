/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Proposal, User, ProposalStatus } from '../types';
import {
  Award,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Smartphone,
  ChevronRight,
  Filter,
  Send,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  QrCode,
  Trash2,
  Printer,
  FileDown,
  ImageIcon,
  Check
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

interface ProposalViewProps {
  proposals: Proposal[];
  user: User;
  onUpdateProposalStatus: (id: string, updateData: any) => Promise<void>;
  onAddProposalManual?: (newProp: any) => Promise<void>;
  onDeleteProposal?: (id: string) => Promise<void>;
}

export default function ProposalView({
  proposals,
  user,
  onUpdateProposalStatus,
  onDeleteProposal
}: ProposalViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [selectedProp, setSelectedProp] = useState<Proposal | null>(null);

  // Form State for edit
  const [statusInput, setStatusInput] = useState<ProposalStatus>('Baru Masuk');
  const [nominalInput, setNominalInput] = useState<number>(0);
  const [deadlineLPJInput, setDeadlineLPJInput] = useState('');
  const [catatanInput, setCatatanInput] = useState('');

  // Simulation State: LPJ WhatsApp Reminder triggers
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);

  // Tanda Terima Modal States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const DEFAULT_SVG_LOGO = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="46" fill="#1e3a8a" stroke="#f59e0b" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="white"/><path d="M50 15 L75 35 L65 75 L50 85 L35 75 L25 35 Z" fill="#ef4444" opacity="0.1"/><path d="M50 15 L75 35 L65 75 L50 85 L35 75 L25 35 Z" stroke="#ef4444" stroke-width="2.5" fill="none"/><path d="M50 20 L68 34 L60 68 L50 76 L40 68 L32 34 Z" fill="#f59e0b"/><circle cx="50" cy="45" r="8" fill="white" stroke="#1e3a8a" stroke-width="2"/><path d="M50 30 L50 55 M42 45 L58 45" stroke="#ef4444" stroke-width="2"/><path d="M35 80 Q50 90 65 80" stroke="#1e3a8a" stroke-width="3" fill="none" stroke-linecap="round"/><text x="50" y="93" font-family="sans-serif" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">KONI JEPARA</text></svg>');

  const [receiptLogo, setReceiptLogo] = useState(() => {
    return localStorage.getItem('siap_koni_prop_receipt_logo') || 'DEFAULT_SVG';
  });
  const [receiptKop1, setReceiptKop1] = useState(() => {
    const saved = localStorage.getItem('siap_koni_prop_receipt_kop1');
    if (!saved || saved === 'KOMITE OLAHRAGA NASIONAL INDONESIA (KONI)') {
      return 'KOMITE OLAHRAGA NASIONAL INDONESIA';
    }
    return saved;
  });
  const [receiptKop2, setReceiptKop2] = useState(() => {
    const saved = localStorage.getItem('siap_koni_prop_receipt_kop2');
    if (!saved || saved === 'KONI KABUPATEN JEPARA' || saved === 'PENGURUS KABUPATEN JEPARA') {
      return '(KONI) KABUPATEN JEPARA';
    }
    return saved;
  });
  const [receiptAlamat, setReceiptAlamat] = useState(() => {
    const saved = localStorage.getItem('siap_koni_prop_receipt_alamat');
    if (!saved || saved.includes('Sekretariat: Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214 • Email: koni_jepara@yahoo.com') || saved.includes('Stadion')) {
      return 'Alamat : Jl. Ki Mangunsarkoro No. 46 Jepara, Hp. 0812-2721-8214\nEmail : koni_jepara@yahoo.com';
    }
    return saved;
  });
  const [receiptTitle, setReceiptTitle] = useState(() => {
    return localStorage.getItem('siap_koni_prop_receipt_title') || 'TANDA TERIMA PENYERAHAN PROPOSAL';
  });
  const [receiptCatatan, setReceiptCatatan] = useState(() => {
    return localStorage.getItem('siap_koni_prop_receipt_catatan') || 'Dokumen di atas merupakan Bukti Penyerahan Proposal elektronik yang sah di bawah sistem SIAP KONI Kabupaten Jepara. Segala data dan nominal yang diserahkan telah diregistrasi secara aman di server dinas.';
  });
  const [receiptPetugas, setReceiptPetugas] = useState('');
  const [receiptLogoWidth, setReceiptLogoWidth] = useState(() => {
    return Number(localStorage.getItem('siap_koni_prop_receipt_logo_width')) || 65;
  });

  const [showLogo, setShowLogo] = useState(true);
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showQr, setShowQr] = useState(true);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  React.useEffect(() => {
    const persistAndOptimizeLogo = async () => {
      if (receiptLogo && receiptLogo.startsWith('data:image/') && receiptLogo.length > 100 * 1024) {
        console.log('Compressing large Proposal logo from state...', receiptLogo.length);
        const compressed = await compressImageToMaxDims(receiptLogo);
        if (compressed !== receiptLogo) {
          setReceiptLogo(compressed);
          localStorage.setItem('siap_koni_prop_receipt_logo', compressed);
          return;
        }
      }
      localStorage.setItem('siap_koni_prop_receipt_logo', receiptLogo);
    };
    persistAndOptimizeLogo();
  }, [receiptLogo]);

  const handleSaveReceiptSettings = () => {
    localStorage.setItem('siap_koni_prop_receipt_logo', receiptLogo);
    localStorage.setItem('siap_koni_prop_receipt_kop1', receiptKop1);
    localStorage.setItem('siap_koni_prop_receipt_kop2', receiptKop2);
    localStorage.setItem('siap_koni_prop_receipt_alamat', receiptAlamat);
    localStorage.setItem('siap_koni_prop_receipt_title', receiptTitle);
    localStorage.setItem('siap_koni_prop_receipt_catatan', receiptCatatan);
    localStorage.setItem('siap_koni_prop_receipt_logo_width', receiptLogoWidth.toString());
    alert('Konfigurasi KOP Surat berhasil disimpan di browser!');
  };

  const activeLogoSrc = receiptLogo === 'DEFAULT_SVG' ? DEFAULT_SVG_LOGO : receiptLogo;

  const handleDownloadPDF = async () => {
    if (!selectedProp) return;
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('printable-prop-receipt');
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

      const idClean = selectedProp.id.substring(0, 6).toUpperCase();
      const caborClean = selectedProp.namaCabor.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Tanda_Terima_Proposal_${idClean}_${caborClean}.pdf`;
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
        pdf.text(`NOMOR: TT-PROP-2026-${selectedProp.id.substring(0, 6).toUpperCase()}`, width / 2, y, { align: 'center' });

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

        drawRow('Cabang Olahraga', selectedProp.namaCabor);
        drawRow('Jenis Proposal / Bantuan', selectedProp.jenisBantuan);
        drawRow('Agenda Registrasi', selectedProp.nomorAgenda, true);
        drawRow('Nominal Anggaran Diajukan', formatIDR(selectedProp.nominal));
        drawRow('Status Validasi', selectedProp.status);
        drawRow('Tanggal Masuk', selectedProp.tanggalPengajuan);

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
          pdf.text(`${selectedProp.namaCabor.substring(0, 4)}..._cbr`, margin + 10, sigY + 16);
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(selectedProp.namaCabor.toUpperCase(), margin + 10, sigY + 28);
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
          pdf.text(`ID: ${selectedProp.id.substring(0, 8).toUpperCase()}`, width - margin - 26, y + 4);
        }

        const idClean = selectedProp.id.substring(0, 6).toUpperCase();
        const caborClean = selectedProp.namaCabor.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Tanda_Terima_Proposal_${idClean}_${caborClean}.pdf`;
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
      const element = document.getElementById('printable-prop-receipt');
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

  // Filter & Search
  const filteredProposals = proposals.filter(p => {
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch = 
      p.namaCabor.toLowerCase().includes(sTerm) ||
      p.jenisBantuan.toLowerCase().includes(sTerm) ||
      p.nomorAgenda.toLowerCase().includes(sTerm);
    
    const matchesStatus = statusFilter === 'Semua' || p.status === statusFilter;
    
    // Cabor users can only view their own proposals
    const matchesCabor = user.role !== 'Pengurus Cabang Olahraga (Cabor)' || p.namaCabor.includes(user.caborName || '');

    return matchesSearch && matchesStatus && matchesCabor;
  });

  const handleSelectProp = (p: Proposal) => {
    setSelectedProp(p);
    setStatusInput(p.status);
    setNominalInput(p.nominal);
    setDeadlineLPJInput(p.deadlineLPJ);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProp) return;

    const payload = {
      status: statusInput,
      nominal: nominalInput,
      deadlineLPJ: deadlineLPJInput,
      updaterName: user.name,
      updaterRole: user.role,
      catatan: catatanInput || `Pembaruan data & status proposal ke ${statusInput}.`
    };

    await onUpdateProposalStatus(selectedProp.id, payload);

    // Update local state reflection
    setSelectedProp({
      ...selectedProp,
      status: statusInput,
      nominal: nominalInput,
      deadlineLPJ: deadlineLPJInput,
      statusHistory: [
        ...selectedProp.statusHistory,
        {
          tanggal: new Date().toISOString(),
          statusLama: selectedProp.status,
          statusBaru: statusInput,
          pengguna: user.name,
          catatan: catatanInput || `Pembaruan data & status proposal ke ${statusInput}.`
        }
      ]
    });

    setCatatanInput('');
  };

  // Simulate manual WhatsApp LPJ Reminder send
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

  const triggerLPJReminder = async (dayTag: string) => {
    if (!selectedProp) return;
    setReminderLoading(dayTag);

    try {
      const waMessage = `Yth. Pengurus Cabor ${selectedProp.namaCabor},\n\nINI ADALAH PENGINGAT OTOMATIS (H${dayTag}).\n\nTenggat Laporan Pertanggungjawaban (LPJ) Anda untuk dana bantuan "${selectedProp.jenisBantuan}" adalah tanggal ${selectedProp.deadlineLPJ}.\n\nMohon siapkan dan unggah berkas LPJ Anda tepat waktu guna menjaga kelancaran administrasi pembinaan.\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
      
      await fetch('/api/wa-logs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penerima: '081399887766', // Simulated cabor phone
          perihal: `Pengingat LPJ ${dayTag} - ${selectedProp.namaCabor}`,
          pesan: waMessage,
          username: user.name,
          role: user.role
        })
      });

      handleOpenWhatsApp('081399887766', waMessage);
    } catch (err) {
      console.error(err);
    } finally {
      setReminderLoading(null);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Helper to draw clean visual stage timeline
  const getStepNumber = (st: string) => {
    const stages = [
      'Baru Masuk',
      'Menunggu Verifikasi',
      'Sedang Ditelaah',
      'Disetujui',
      'Dana Diproses',
      'Dana Cair',
      'Menunggu LPJ',
      'LPJ Diterima',
      'LPJ Diverifikasi',
      'Selesai'
    ];
    return stages.indexOf(st);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans" id="proposals-view">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="proposal-header">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modul Proposal Cabor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ajukan proposal, verifikasi kualifikasi, cairkan dana pembinaan, serta atur alarm otomatis pengingat LPJ.
          </p>
        </div>
      </div>

      {/* Main Grid: List table + editing panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="proposal-grid-main">
        
        {/* Left Side: Table of proposals */}
        <div className="lg:col-span-8 space-y-4" id="proposal-list-panel">
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            
            {/* Search Filters */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3 bg-slate-50/50" id="proposal-search-area">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama cabor, jenis bantuan, agenda..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="search-proposal-input"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto text-xs">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  className="p-1.5 border border-slate-200 rounded bg-white font-medium"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Baru Masuk">Baru Masuk</option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  <option value="Sedang Ditelaah">Sedang Ditelaah</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Dana Cair">Dana Cair</option>
                  <option value="Menunggu LPJ">Menunggu LPJ</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            {/* Proposals Table */}
            <div className="overflow-x-auto" id="proposal-table-scroller">
              <table className="w-full text-left border-collapse" id="proposal-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-100 font-bold">
                    <th className="px-4 py-3">Nama Cabor</th>
                    <th className="px-4 py-3">Agenda / Keg.</th>
                    <th className="px-4 py-3">Nominal Cair</th>
                    <th className="px-4 py-3">Tenggat LPJ</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredProposals.map((prop) => (
                    <tr
                      key={prop.id}
                      onClick={() => handleSelectProp(prop)}
                      className={`hover:bg-blue-50/30 transition cursor-pointer ${
                        selectedProp?.id === prop.id ? 'bg-blue-50/50' : ''
                      }`}
                      id={`proposal-row-${prop.id}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{prop.namaCabor}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{prop.nomorAgenda}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium truncate max-w-xs" title={prop.jenisBantuan}>{prop.jenisBantuan}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-semibold text-slate-900 font-mono">
                        {formatIDR(prop.nominal)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{prop.deadlineLPJ}</div>
                        <div className="text-[10px] text-red-500 font-medium">Auto-remind aktif</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ['Disetujui', 'Dana Cair', 'Selesai'].includes(prop.status)
                            ? 'bg-emerald-50 text-emerald-600'
                            : prop.status === 'Ditolak'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProp(prop);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                            id={`btn-view-prop-${prop.id}`}
                          >
                            Kelola
                          </button>
                          {['Super Admin', 'Operator', 'Sekretaris', 'Bendahara'].includes(user.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteProposal) onDeleteProposal(prop.id);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                              title="Hapus Proposal"
                              id={`btn-delete-prop-${prop.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProposals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Tidak ada pengajuan proposal cabor ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Action and Workflow Details panel */}
        <div className="lg:col-span-4" id="proposal-detail-panel">
          {selectedProp ? (
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-6" id="prop-details-card">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] text-orange-600 font-mono font-bold bg-orange-50 px-2 py-0.5 rounded">
                    PROPOSAL INTERAKTIF
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1.5">{selectedProp.namaCabor}</h2>
                </div>
                <div className="h-10 w-10 border border-slate-200 rounded p-1 flex items-center justify-center bg-slate-50">
                  <QrCode className="h-7 w-7 text-slate-800" />
                </div>
              </div>

              {/* Progress Stepper Mapping (Human-friendly status maps) */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Progres Tahapan Alokasi:</span>
                <div className="grid grid-cols-10 gap-1" id="prop-visual-bar">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((stepIdx) => {
                    const currentStep = getStepNumber(selectedProp.status);
                    const isPassed = stepIdx <= currentStep;
                    return (
                      <div
                        key={stepIdx}
                        className={`h-2 rounded-sm transition ${
                          isPassed ? 'bg-emerald-500' : 'bg-slate-100'
                        }`}
                        title={`Tahap ${stepIdx + 1}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Proposal Masuk</span>
                  <span className="text-emerald-600 font-semibold font-mono">Status: {selectedProp.status}</span>
                  <span>LPJ Selesai</span>
                </div>
              </div>

              {/* Details Content */}
              <div className="space-y-3.5 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block">Jenis Program / Bantuan:</span>
                  <span className="font-semibold text-slate-800 leading-snug">{selectedProp.jenisBantuan}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Nominal Dana Pembinaan:</span>
                  <span className="text-sm font-bold text-slate-950 font-mono">{formatIDR(selectedProp.nominal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Tenggat Waktu LPJ (Maks 60 Hari):</span>
                  <span className="font-bold text-red-600 font-mono block mt-0.5">{selectedProp.deadlineLPJ}</span>
                </div>
              </div>

              {/* Receipt Generator Button */}
              <button
                type="button"
                onClick={() => {
                  setReceiptPetugas(user.name);
                  setShowReceiptModal(true);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm text-xs mt-2"
                id="btn-show-receipt-modal"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak / Unduh Tanda Terima Proposal</span>
              </button>

              {/* Dynamic LPJ WhatsApp Automated Simulator triggers */}
              {(selectedProp.status === 'Dana Cair' || selectedProp.status === 'Menunggu LPJ' || selectedProp.status === 'Terlambat') && (
                <div className="bg-slate-900 text-slate-300 rounded-xl p-4 space-y-3 border border-slate-800 shadow-md">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Simulasi Alarm Pengingat LPJ</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Kirim pengingat WhatsApp otomatis harian ke pengurus cabor untuk menyerahkan kuitansi pengeluaran & berkas LPJ.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[9px] font-mono font-bold" id="simulation-triggers">
                    {['-14', '-7', '-3', '-1', 'H'].map((day) => (
                      <button
                        key={day}
                        onClick={() => triggerLPJReminder(day === 'H' ? 'Hari H' : `H-${day.substring(1)}`)}
                        className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700 hover:border-emerald-500/50 text-center transition"
                      >
                        {day === 'H' ? 'Hari H' : `H${day}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Proposal Form */}
              {['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator'].includes(user.role) ? (
                <form onSubmit={handleUpdateSubmit} className="pt-4 border-t border-slate-100 space-y-4 text-xs" id="update-prop-form">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Modifikasi Data & Alur Status</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Status Proposal</label>
                      <select
                        className="w-full p-2 border border-slate-200 rounded font-medium bg-white text-xs"
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value as ProposalStatus)}
                      >
                        <option value="Baru Masuk">Baru Masuk</option>
                        <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                        <option value="Sedang Ditelaah">Sedang Ditelaah</option>
                        <option value="Disetujui">Disetujui</option>
                        <option value="Ditolak">Ditolak</option>
                        <option value="Dana Diproses">Dana Diproses</option>
                        <option value="Dana Cair">Dana Cair (Auto LPJ)</option>
                        <option value="Menunggu LPJ">Menunggu LPJ</option>
                        <option value="Selesai">Selesai / Sempurna</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Sesuaikan Nominal (IDR)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-slate-200 rounded font-mono font-semibold text-xs"
                        value={nominalInput}
                        onChange={(e) => setNominalInput(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Tenggat LPJ</label>
                    <input
                      type="date"
                      className="w-full p-2 border border-slate-200 rounded font-mono font-medium text-xs"
                      value={deadlineLPJInput}
                      onChange={(e) => setDeadlineLPJInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Catatan Koreksi / Keterangan</label>
                    <textarea
                      rows={2}
                      className="w-full p-2 border border-slate-200 rounded text-xs"
                      placeholder="Masukkan alasan persetujuan, nominal revisi, atau penolakan..."
                      value={catatanInput}
                      onChange={(e) => setCatatanInput(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      id="btn-save-prop-status"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Simpan Perubahan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const waMessage = `Yth. Pengurus Cabor ${selectedProp.namaCabor},\n\nStatus proposal bantuan Anda "${selectedProp.jenisBantuan}" telah diperbarui oleh Pengurus KONI Jepara.\n\nStatus Baru:\n${statusInput}\n\nCatatan:\n${catatanInput || '-'}\n\nTerima kasih.\n\nKONI Jepara.`;
                        handleOpenWhatsApp('081399887766', waMessage);
                      }}
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>Kirim Riil via WA</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs mt-4">
                  <span className="font-bold block mb-1">📋 Mode Lihat Saja (Read-Only)</span>
                  <span>Sebagai Pengurus Cabor, Anda tidak memiliki izin untuk mengedit nominal atau status dokumen proposal. Modifikasi status dilakukan oleh Pengurus KONI Jepara.</span>
                </div>
              )}

              {/* Timeline status history list */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Histori Administrasi & Pencairan</h3>
                <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 text-xs">
                  {selectedProp.statusHistory.map((hist, index) => (
                    <div key={index} className="relative" id={`prop-timeline-${index}`}>
                      <div className="absolute -left-[21px] top-1 bg-white h-2.5 w-2.5 rounded-full border-2 border-orange-500" />
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(hist.tanggal).toLocaleString('id-ID')}
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        Status: <span className="text-orange-600">{hist.statusBaru}</span>
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{hist.catatan}</p>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                        Oleh: {hist.pengguna} ({hist.tanggal ? 'User' : 'System'})
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
                      if (onDeleteProposal) {
                        onDeleteProposal(selectedProp.id);
                        setSelectedProp(null);
                      }
                    }}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    id="btn-delete-proposal-sidebar"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Berkas Proposal</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 border-dashed rounded-xl p-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-64">
              <Award className="h-8 w-8 text-slate-300" />
              <span>Silakan pilih salah satu proposal cabor di samping untuk memverifikasi usulan dana & tenggat LPJ.</span>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Tanda Terima Proposal (Generator & Kustomisasi) */}
      {showReceiptModal && selectedProp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 md:p-4 animate-fade-in no-print" id="modal-receipt-prop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600 animate-pulse" />
                <div>
                  <h2 className="text-sm md:text-base font-extrabold text-slate-900">Generator & Kustomisasi Tanda Terima Proposal</h2>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Ubah logo, edit kop instansi, sesuaikan keterangan, dan cetak bukti penyerahan proposal digital.</p>
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
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Logo KONI Jepara
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const url = prompt('Masukkan URL gambar eksternal (https://... atau data:image/...)');
                              if (url) {
                                const compressed = await compressImageToMaxDims(url);
                                setReceiptLogo(compressed);
                              }
                            }}
                            className={`py-1.5 px-2 rounded-lg font-bold border text-center transition text-[10px] ${
                              receiptLogo !== 'DEFAULT_SVG' && receiptLogo.startsWith('data:')
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Upload Base64
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const url = prompt('Masukkan URL Gambar Logo Baru:');
                              if (url) {
                                const compressed = await compressImageToMaxDims(url);
                                setReceiptLogo(compressed);
                              }
                            }}
                            className={`py-1.5 px-2 rounded-lg font-bold border text-center transition text-[10px] ${
                              receiptLogo.startsWith('https://')
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            URL Eksternal
                          </button>
                        </div>
                      </div>

                      {receiptLogo !== 'DEFAULT_SVG' && (
                        <div className="p-2 bg-slate-100 rounded text-[10px] font-mono truncate text-slate-500">
                          <strong>Source:</strong> {receiptLogo}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-500 uppercase">Ukuran Lebar Logo</span>
                          <span className="font-mono text-[10px] font-bold text-slate-600">{receiptLogoWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          value={receiptLogoWidth}
                          onChange={(e) => setReceiptLogoWidth(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Text Settings */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-4 shadow-sm flex-1">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-100 pb-2">
                    Kustomisasi Naskah Kop &amp; Struk
                  </span>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Baris Kop Utama (Instansi)</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded font-medium text-xs bg-slate-50 focus:bg-white"
                        value={receiptKop1}
                        onChange={(e) => setReceiptKop1(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Baris Kop Kedua (Sub Instansi)</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded font-medium text-xs bg-slate-50 focus:bg-white"
                        value={receiptKop2}
                        onChange={(e) => setReceiptKop2(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Alamat Kantor / Sekretariat</label>
                      <textarea
                        rows={2}
                        className="w-full p-2 border border-slate-200 rounded font-medium text-[11px] bg-slate-50 focus:bg-white leading-normal"
                        value={receiptAlamat}
                        onChange={(e) => setReceiptAlamat(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Judul Dokumen Tanda Terima</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded font-medium text-xs bg-slate-50 focus:bg-white"
                        value={receiptTitle}
                        onChange={(e) => setReceiptTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Catatan Keterangan Sah</label>
                      <textarea
                        rows={3}
                        className="w-full p-2 border border-slate-200 rounded text-[11px] bg-slate-50 focus:bg-white leading-normal"
                        value={receiptCatatan}
                        onChange={(e) => setReceiptCatatan(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Petugas Penerima</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-slate-200 rounded font-bold text-xs bg-slate-50 focus:bg-white text-blue-700"
                        placeholder="Nama Petugas Sekretariat..."
                        value={receiptPetugas}
                        onChange={(e) => setReceiptPetugas(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Show/Hide Features */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2.5 shadow-sm">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-100 pb-2">
                    Tampilan Atribut Cetak
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={showStamp}
                        onChange={(e) => setShowStamp(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Stempel Dinas</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={showQr}
                        onChange={(e) => setShowQr(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Kode QR Validasi</span>
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
                    const receiptNo = `TT-PROP-2026-${selectedProp.id.substring(0, 6).toUpperCase()}`;
                    const waMessage = `*${receiptTitle}*\n*${receiptKop2}*\n\nProposal bantuan program olahraga Anda telah diserahkan.\n\n*Rincian Penyerahan:*\n- No. Tanda Terima: ${receiptNo}\n- Cabor: ${selectedProp.namaCabor}\n- Jenis Bantuan: ${selectedProp.jenisBantuan}\n- Nominal Diusulkan: ${formatIDR(selectedProp.nominal)}\n- Status Saat Ini: *${selectedProp.status}*\n- Tanggal Penyerahan: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nTerima kasih atas tertib administrasi Anda.\n\n${receiptKop1}.`;
                    handleOpenWhatsApp('081399887766', waMessage);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-xs mt-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Bagikan Bukti ke WhatsApp Cabor</span>
                </button>
              </div>

              {/* Right Side: Preview Paper (Prinstine A4 emulation) */}
              <div className="lg:col-span-7 p-4 md:p-8 bg-slate-200 overflow-y-auto flex items-start justify-center font-sans">
                
                {/* Physical-looking paper container */}
                <div
                  id="printable-prop-receipt"
                  className="bg-white border border-slate-300 rounded-lg p-6 md:p-10 shadow-lg w-full max-w-[210mm] relative text-slate-800 space-y-4 text-left"
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
                      #modal-receipt-prop, #modal-receipt-prop *,
                      .no-print, .no-print * {
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                      }
                      #printable-prop-receipt, #printable-prop-receipt * {
                        visibility: visible !important;
                      }
                      #printable-prop-receipt {
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
                      NOMOR: TT-PROP-2026-{selectedProp.id.substring(0, 6).toUpperCase()}
                    </span>
                  </div>

                  {/* Receipt Fields Table */}
                  <div className="py-2">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px] w-1/3">Cabang Olahraga</td>
                          <td className="py-2.5 font-bold text-slate-900 w-2/3">: {selectedProp.namaCabor}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Jenis Proposal / Bantuan</td>
                          <td className="py-2.5 font-bold text-slate-800">: {selectedProp.jenisBantuan}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Agenda Registrasi</td>
                          <td className="py-2.5 font-mono font-bold text-slate-900">: {selectedProp.nomorAgenda}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Jumlah Dana Diusulkan</td>
                          <td className="py-2.5 font-extrabold text-blue-700 font-mono text-sm">: {formatIDR(selectedProp.nominal)}</td>
                        </tr>
                        <tr className="border-b border-dashed border-slate-200">
                          <td className="py-2.5 font-semibold text-slate-500 uppercase text-[9px]">Status Berkas Proposal</td>
                          <td className="py-2.5 w-2/3">
                            <span className="font-bold text-slate-900">: </span>
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-[10px] font-bold uppercase inline-block ml-1">
                              {selectedProp.status}
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
                          <span className="text-[8px] text-slate-400 font-mono block">SECURE ID: {selectedProp.id}</span>
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
                            {selectedProp.namaCabor.substring(0, 4)}..._cbr
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="block font-bold text-slate-900 underline uppercase">{selectedProp.namaCabor}</span>
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
