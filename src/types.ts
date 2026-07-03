/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'Super Admin'
  | 'Ketua KONI'
  | 'Sekretaris'
  | 'Bendahara'
  | 'Bidang'
  | 'Operator'
  | 'Pengurus Cabang Olahraga (Cabor)';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  caborName?: string; // only for Pengurus Cabang Olahraga
  email?: string;
  phone?: string;
  avatar?: string; // base64 or photo URL
}

export type JenisSuratMasuk =
  | 'Proposal'
  | 'Undangan'
  | 'Permohonan'
  | 'Edaran'
  | 'Pemberitahuan'
  | 'Lainnya';

export interface DisposisiTarget {
  target: 'Ketua' | 'Sekretaris' | 'Bendahara' | 'Bidang Pembinaan' | 'Bidang Organisasi';
  catatan?: string;
  rekomendasiAI?: boolean;
}

export interface StatusHistoryItem {
  tanggal: string;
  statusLama: string;
  statusBaru: string;
  pengguna: string;
  catatan: string;
}

export interface SuratMasuk {
  id: string;
  nomorAgenda: string; // SM-YYYY-XXXX
  nomorSurat: string;
  tanggalSurat: string;
  tanggalDiterima: string;
  instansi: string;
  pengirim: string;
  nomorWhatsApp: string;
  email: string;
  perihal: string;
  jenisSurat: JenisSuratMasuk;
  lampiranPdf?: string; // name of file
  lampiranFoto?: string; // base64 or link
  ocrContent?: string;
  ringkasanAI?: string[]; // Max 5 points
  disposisi?: DisposisiTarget[];
  disposisiRekomendasi?: string; // AI Disposisi Recommendation text
  status: 'Baru' | 'Didisposisikan' | 'Selesai';
  statusHistory: StatusHistoryItem[];
  qrCode?: string;
}

export type ProposalStatus =
  | 'Baru Masuk'
  | 'Menunggu Verifikasi'
  | 'Sedang Ditelaah'
  | 'Disetujui'
  | 'Ditolak'
  | 'Dana Diproses'
  | 'Dana Cair'
  | 'Menunggu LPJ'
  | 'LPJ Diterima'
  | 'LPJ Diverifikasi'
  | 'Selesai'
  | 'Terlambat';

export interface Proposal {
  id: string;
  suratMasukId?: string; // linked to Surat Masuk Proposal
  nomorAgenda: string;
  namaCabor: string;
  jenisBantuan: string;
  nominal: number;
  tanggal: string;
  deadlineLPJ: string; // YYYY-MM-DD
  status: ProposalStatus;
  statusHistory: StatusHistoryItem[];
  qrCode?: string;
}

export type LPJStatus =
  | 'Baru Masuk'
  | 'Diterima'
  | 'Sedang Diverifikasi'
  | 'Perlu Revisi'
  | 'Revisi Diterima'
  | 'Lengkap'
  | 'Disetujui'
  | 'Ditolak'
  | 'Diarsipkan';

export interface LPJ {
  id: string;
  nomorAgenda: string; // LPJ-YYYY-XXXX
  nomorLPJ: string;
  namaCabor: string;
  tahapDana: string;
  nominal: number;
  nomorWhatsApp?: string;
  uploadPdf?: string;
  uploadFoto?: string;
  catatan?: string;
  status: LPJStatus;
  statusHistory: StatusHistoryItem[];
  qrCode?: string;
}

export interface Agenda {
  id: string;
  suratMasukId?: string; // if from invitation
  namaAcara: string;
  penyelenggara: string;
  tempat: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;
  pengingatKirimStatus: {
    HMin7?: boolean;
    HMin3?: boolean;
    HMin1?: boolean;
    HariH?: boolean;
    SatuJam?: boolean;
  };
}

export interface SuratKeluar {
  id: string;
  nomorSurat: string; // Auto-generated SK-YYYY-XXXX
  tujuan: string;
  perihal: string;
  tanggal: string;
  lampiran?: string;
  penandatangan: 'Ketua' | 'Sekretaris' | 'Bendahara';
  status: 'Konsep' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditandatangani' | 'Dikirim';
  statusHistory: StatusHistoryItem[];
  qrCode?: string;
  tandaTanganDigital?: {
    signedBy: string;
    signedAt: string;
    signatureData?: string; // Simulated secure hash
  };
}

export interface WhatsAppLog {
  id: string;
  tanggal: string;
  penerima: string;
  perihal: string;
  pesan: string;
  status: 'Berhasil' | 'Gagal' | 'Pending';
}

export interface AuditLog {
  id: string;
  tanggal: string;
  username: string;
  role: UserRole;
  action: 'Login' | 'Tambah' | 'Edit' | 'Hapus' | 'Verifikasi' | 'Cetak' | 'Disposisi' | 'Kirim WA' | 'Export' | 'Backup' | 'Restore' | 'Tanda Tangan';
  details: string;
}

export interface BackupItem {
  id: string;
  filename: string;
  tanggal: string;
  ukuran: string;
}

export interface PinjamBarang {
  id: string;
  namaPeminjam: string;
  instansi: string;
  namaBarang: string;
  jumlah: number;
  tanggalPinjam: string;
  tanggalKembali: string;
  keterangan: string;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak' | 'Dikembalikan';
  noWhatsApp?: string;
  catatanPetugas?: string;
}

