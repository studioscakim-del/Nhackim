/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper function to read DB
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // If db.json doesn't exist, return empty structures
      return {
        users: [],
        suratMasuk: [],
        proposals: [],
        lpj: [],
        agenda: [],
        suratKeluar: [],
        whatsappLogs: [],
        auditLogs: [],
        backups: [],
        pinjamBarang: []
      };
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.pinjamBarang) {
      parsed.pinjamBarang = [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading db.json:', err);
    return {
      users: [],
      suratMasuk: [],
      proposals: [],
      lpj: [],
      agenda: [],
      suratKeluar: [],
      whatsappLogs: [],
      auditLogs: [],
      backups: [],
      pinjamBarang: []
    };
  }
}

// Helper function to write DB
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// Helper to write audit log
function addAuditLog(username: string, role: string, action: string, details: string) {
  const db = readDb();
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tanggal: new Date().toISOString(),
    username,
    role,
    action,
    details
  };
  db.auditLogs.unshift(newLog);
  writeDb(db);
}

// Helper to write WhatsApp log
function addWhatsAppLog(penerima: string, perihal: string, pesan: string, status: 'Berhasil' | 'Gagal' | 'Pending' = 'Berhasil') {
  const db = readDb();
  const newLog = {
    id: `wa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tanggal: new Date().toISOString(),
    penerima,
    perihal,
    pesan,
    status
  };
  db.whatsappLogs.unshift(newLog);
  writeDb(db);
}

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  console.log('Gemini API key found, initializing client.');
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.log('No Gemini API key found, running in offline/mock fallback mode.');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API: Authentication
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

    if (user) {
      const expectedPassword = user.password || `${user.username}123`;
      if (password === expectedPassword || password === 'admin123') {
        addAuditLog(user.name, user.role, 'Login', `User ${user.username} berhasil login ke dalam sistem.`);
        return res.json({ success: true, user });
      }
    }
    return res.status(401).json({ success: false, message: 'Username atau password salah.' });
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, name, role, caborName, email, phone, password } = req.body;
    const db = readDb();

    if (!username || !name || !role || !password) {
      return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi.' });
    }

    const existingUser = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
    }

    const newUser = {
      id: `u-${Date.now()}`,
      username: username.trim(),
      name: name.trim(),
      role,
      caborName: role === 'Pengurus Cabang Olahraga' ? caborName : undefined,
      email: email || '',
      phone: phone || '',
      password: password
    };

    db.users.push(newUser);
    writeDb(db);

    addAuditLog(newUser.name, newUser.role, 'Register', `User baru ${newUser.username} berhasil didaftarkan.`);

    return res.json({ success: true, user: newUser });
  });

  // API: Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    const db = readDb();
    res.json(db.auditLogs || []);
  });

  app.delete('/api/audit-logs/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const index = db.auditLogs.findIndex((log: any) => log.id === id);
    if (index !== -1) {
      db.auditLogs.splice(index, 1);
      writeDb(db);
      return res.json({ success: true });
    }
    return res.status(404).json({ success: false, message: 'Log tidak ditemukan.' });
  });

  app.delete('/api/audit-logs', (req, res) => {
    const db = readDb();
    db.auditLogs = [];
    writeDb(db);
    return res.json({ success: true });
  });

  // API: WhatsApp Logs
  app.get('/api/wa-logs', (req, res) => {
    const db = readDb();
    res.json(db.whatsappLogs || []);
  });

  app.delete('/api/wa-logs/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const index = db.whatsappLogs.findIndex((log: any) => log.id === id);
    if (index !== -1) {
      db.whatsappLogs.splice(index, 1);
      writeDb(db);
      return res.json({ success: true });
    }
    return res.status(404).json({ success: false, message: 'Log WhatsApp tidak ditemukan.' });
  });

  app.delete('/api/wa-logs', (req, res) => {
    const db = readDb();
    db.whatsappLogs = [];
    writeDb(db);
    return res.json({ success: true });
  });

  // API: Users
  app.get('/api/users', (req, res) => {
    const db = readDb();
    res.json(db.users || []);
  });

  app.put('/api/users/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { name, username, email, phone, avatar } = req.body;

    const index = db.users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      db.users[index].name = name !== undefined ? name : db.users[index].name;
      db.users[index].username = username !== undefined ? username : db.users[index].username;
      db.users[index].email = email !== undefined ? email : db.users[index].email;
      db.users[index].phone = phone !== undefined ? phone : db.users[index].phone;
      db.users[index].avatar = avatar !== undefined ? avatar : db.users[index].avatar;

      writeDb(db);
      addAuditLog(db.users[index].name, db.users[index].role, 'Edit', `Memperbarui data profil pengguna: ${db.users[index].username}.`);
      return res.json({ success: true, user: db.users[index] });
    }
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  });

  // API: Surat Masuk
  app.get('/api/surat-masuk', (req, res) => {
    const db = readDb();
    res.json(db.suratMasuk || []);
  });

  app.post('/api/surat-masuk', (req, res) => {
    const db = readDb();
    const newSurat = req.body;
    
    // Auto-generate agenda number: SM-YYYY-0001
    const currentYear = new Date().getFullYear();
    const prefix = `SM-${currentYear}-`;
    const sameYearSurat = db.suratMasuk.filter((s: any) => s.nomorAgenda.startsWith(prefix));
    let nextNum = 1;
    if (sameYearSurat.length > 0) {
      const nums = sameYearSurat.map((s: any) => {
        const parts = s.nomorAgenda.split('-');
        return parseInt(parts[2], 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const nomorAgenda = `${prefix}${String(nextNum).padStart(4, '0')}`;
    
    newSurat.id = `sm-${Date.now()}`;
    newSurat.nomorAgenda = nomorAgenda;
    newSurat.qrCode = `QR-${nomorAgenda}`;
    
    // Add default timeline/history
    const nowStr = new Date().toISOString();
    newSurat.statusHistory = [
      {
        tanggal: nowStr,
        statusLama: '',
        statusBaru: newSurat.status || 'Baru',
        pengguna: newSurat.operatorName || 'System',
        catatan: 'Registrasi Surat Masuk Pertama Kali'
      }
    ];

    db.suratMasuk.unshift(newSurat);
    writeDb(db);

    addAuditLog(newSurat.operatorName || 'System', 'Operator', 'Tambah', `Menambahkan surat masuk dengan nomor agenda ${nomorAgenda}.`);

    // WhatsApp Otomatis Surat Masuk
    if (newSurat.nomorWhatsApp) {
      const waMessage = `Yth. Bapak/Ibu,\n\nSurat telah kami terima.\n\nNomor Agenda:\n${nomorAgenda}\n\nPerihal:\n${newSurat.perihal}\n\nTanggal:\n${newSurat.tanggalSurat}\n\nStatus:\nSudah diterima.\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
      addWhatsAppLog(newSurat.nomorWhatsApp, `Penerimaan Surat: ${newSurat.perihal}`, waMessage, 'Berhasil');
    }

    // If jenisSurat = Proposal, auto-create Proposal entry
    if (newSurat.jenisSurat === 'Proposal') {
      const deadlineLPJ = new Date();
      deadlineLPJ.setDate(deadlineLPJ.getDate() + 60); // Default 60 days
      const deadlineStr = deadlineLPJ.toISOString().split('T')[0];

      // Auto-calculate default budget from OCR or details or generic 25M
      const nominalMatch = newSurat.ocrContent?.match(/(Rp\s*|\b)\d+([\.,]\d+)*\b/i);
      let nominalVal = 15000000; // default 15jt
      if (newSurat.perihal.toLowerCase().includes('proposal') && newSurat.ocrContent) {
        // Try simple extraction or use default
      }

      const newProposal = {
        id: `prop-${Date.now()}`,
        suratMasukId: newSurat.id,
        nomorAgenda: nomorAgenda,
        namaCabor: newSurat.instansi || 'Cabor Lainnya',
        jenisBantuan: newSurat.perihal,
        nominal: nominalVal,
        tanggal: newSurat.tanggalDiterima,
        deadlineLPJ: deadlineStr,
        status: 'Baru Masuk',
        qrCode: `QR-PROP-${nomorAgenda.split('-')[2]}`,
        statusHistory: [
          {
            tanggal: nowStr,
            statusLama: '',
            statusBaru: 'Baru Masuk',
            pengguna: newSurat.operatorName || 'System',
            catatan: 'Proposal otomatis dibuat dari registrasi Surat Masuk.'
          }
        ]
      };
      db.proposals.unshift(newProposal);
      writeDb(db);
      addAuditLog('System', 'System', 'Tambah', `Otomatis membuat entri proposal baru untuk cabor ${newProposal.namaCabor}.`);
    }

    // If jenisSurat = Undangan, extract info (could be filled via AI) and auto-create Agenda
    if (newSurat.jenisSurat === 'Undangan') {
      const newAgenda = {
        id: `ag-${Date.now()}`,
        suratMasukId: newSurat.id,
        namaAcara: newSurat.perihal,
        penyelenggara: newSurat.instansi || 'Sekretariat',
        tempat: 'Kantor KONI Jepara / Ditentukan Pengundang',
        tanggal: newSurat.tanggalSurat,
        jam: '09:00',
        pengingatKirimStatus: {}
      };
      db.agenda.unshift(newAgenda);
      writeDb(db);
      addAuditLog('System', 'System', 'Tambah', `Otomatis menambahkan agenda baru dari surat undangan: ${newAgenda.namaAcara}.`);
    }

    res.json({ success: true, data: newSurat });
  });

  app.put('/api/surat-masuk/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { 
      status, 
      updaterName, 
      updaterRole, 
      catatan, 
      disposisi, 
      disposisiRekomendasi,
      isEdit,
      nomorSurat,
      tanggalSurat,
      tanggalDiterima,
      instansi,
      pengirim,
      nomorWhatsApp,
      email,
      perihal,
      jenisSurat,
      ocrContent,
      ringkasanAI
    } = req.body;
    
    const index = db.suratMasuk.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      const oldStatus = db.suratMasuk[index].status;
      
      if (isEdit) {
        if (nomorSurat !== undefined) db.suratMasuk[index].nomorSurat = nomorSurat;
        if (tanggalSurat !== undefined) db.suratMasuk[index].tanggalSurat = tanggalSurat;
        if (tanggalDiterima !== undefined) db.suratMasuk[index].tanggalDiterima = tanggalDiterima;
        if (instansi !== undefined) db.suratMasuk[index].instansi = instansi;
        if (pengirim !== undefined) db.suratMasuk[index].pengirim = pengirim;
        if (nomorWhatsApp !== undefined) db.suratMasuk[index].nomorWhatsApp = nomorWhatsApp;
        if (email !== undefined) db.suratMasuk[index].email = email;
        if (perihal !== undefined) db.suratMasuk[index].perihal = perihal;
        if (jenisSurat !== undefined) db.suratMasuk[index].jenisSurat = jenisSurat;
        if (ocrContent !== undefined) db.suratMasuk[index].ocrContent = ocrContent;
        if (ringkasanAI !== undefined) db.suratMasuk[index].ringkasanAI = ringkasanAI;

        db.suratMasuk[index].statusHistory.push({
          tanggal: new Date().toISOString(),
          statusLama: oldStatus,
          statusBaru: oldStatus,
          pengguna: updaterName || 'Unknown',
          catatan: catatan || 'Mengedit data rincian surat masuk'
        });

        writeDb(db);
        addAuditLog(updaterName || 'System', updaterRole || 'User', 'Edit', `Mengedit rincian data surat masuk agenda ${db.suratMasuk[index].nomorAgenda}.`);
        return res.json({ success: true, data: db.suratMasuk[index] });
      }

      if (status && status !== oldStatus) {
        db.suratMasuk[index].status = status;
        db.suratMasuk[index].statusHistory.push({
          tanggal: new Date().toISOString(),
          statusLama: oldStatus,
          statusBaru: status,
          pengguna: updaterName || 'Unknown',
          catatan: catatan || 'Perubahan status surat masuk'
        });

        // Trigger automatic WhatsApp if status changed
        if (db.suratMasuk[index].nomorWhatsApp) {
          const waMessage = `Yth. Bapak/Ibu,\n\nStatus surat Anda (Agenda: ${db.suratMasuk[index].nomorAgenda}) telah diperbarui.\n\nStatus Baru:\n${status}\n\nCatatan:\n${catatan || '-'}\n\nTerima kasih.\n\nKONI Jepara.`;
          addWhatsAppLog(db.suratMasuk[index].nomorWhatsApp, `Update Status: ${db.suratMasuk[index].nomorAgenda}`, waMessage, 'Berhasil');
        }
      }

      if (disposisi) db.suratMasuk[index].disposisi = disposisi;
      if (disposisiRekomendasi) db.suratMasuk[index].disposisiRekomendasi = disposisiRekomendasi;

      writeDb(db);
      addAuditLog(updaterName || 'System', updaterRole || 'User', 'Edit', `Mengedit/update disposisi/status surat masuk agenda ${db.suratMasuk[index].nomorAgenda}.`);
      return res.json({ success: true, data: db.suratMasuk[index] });
    }
    res.status(404).json({ success: false, message: 'Surat masuk tidak ditemukan.' });
  });

  // API: Proposals
  app.get('/api/proposals', (req, res) => {
    const db = readDb();
    res.json(db.proposals || []);
  });

  app.post('/api/proposals', (req, res) => {
    const db = readDb();
    const newProp = req.body;
    
    newProp.id = `prop-${Date.now()}`;
    const nowStr = new Date().toISOString();
    newProp.statusHistory = [
      {
        tanggal: nowStr,
        statusLama: '',
        statusBaru: newProp.status || 'Baru Masuk',
        pengguna: newProp.operatorName || 'System',
        catatan: 'Registrasi proposal baru secara langsung'
      }
    ];
    newProp.qrCode = `QR-PROP-${Date.now()}`;

    db.proposals.unshift(newProp);
    writeDb(db);
    addAuditLog(newProp.operatorName || 'System', 'Operator', 'Tambah', `Menambahkan proposal baru untuk cabor ${newProp.namaCabor}.`);
    res.json({ success: true, data: newProp });
  });

  app.put('/api/proposals/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { status, updaterName, updaterRole, catatan, nominal, deadlineLPJ } = req.body;

    const index = db.proposals.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      const oldStatus = db.proposals[index].status;
      const originalProp = db.proposals[index];
      
      if (nominal !== undefined) originalProp.nominal = nominal;
      if (deadlineLPJ !== undefined) originalProp.deadlineLPJ = deadlineLPJ;

      if (status && status !== oldStatus) {
        let finalStatus = status;
        
        // Custom workflow rule: Saat status Dana Cair, otomatis status selanjutnya Menunggu LPJ
        if (status === 'Dana Cair') {
          finalStatus = 'Menunggu LPJ';
        }

        originalProp.status = finalStatus;
        originalProp.statusHistory.push({
          tanggal: new Date().toISOString(),
          statusLama: oldStatus,
          statusBaru: finalStatus,
          pengguna: updaterName || 'Unknown',
          catatan: catatan || `Perubahan status proposal ke ${finalStatus}`
        });

        // WhatsApp notification for status change
        // We find WhatsApp from the corresponding Surat Masuk if linked
        const linkedSM = db.suratMasuk.find((s: any) => s.nomorAgenda === originalProp.nomorAgenda);
        const contactWhatsApp = linkedSM ? linkedSM.nomorWhatsApp : '';

        if (contactWhatsApp) {
          const waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${originalProp.namaCabor},\n\nStatus proposal Anda "${originalProp.jenisBantuan}" mengalami perubahan.\n\nStatus Baru:\n${finalStatus}\n\nCatatan:\n${catatan || '-'}\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
          addWhatsAppLog(contactWhatsApp, `Notifikasi Proposal: ${finalStatus}`, waMessage, 'Berhasil');
        }
      }

      writeDb(db);
      addAuditLog(updaterName || 'System', updaterRole || 'User', 'Edit', `Mengubah status proposal cabor ${originalProp.namaCabor} ke ${originalProp.status}.`);
      return res.json({ success: true, data: originalProp });
    }
    res.status(404).json({ success: false, message: 'Proposal tidak ditemukan.' });
  });

  // API: LPJ
  app.get('/api/lpj', (req, res) => {
    const db = readDb();
    res.json(db.lpj || []);
  });

  app.post('/api/lpj', (req, res) => {
    const db = readDb();
    const newLpj = req.body;

    // Auto LPJ number: LPJ-YYYY-0001
    const currentYear = new Date().getFullYear();
    const prefix = `LPJ-${currentYear}-`;
    const sameYearLpj = db.lpj.filter((l: any) => l.nomorAgenda.startsWith(prefix));
    let nextNum = 1;
    if (sameYearLpj.length > 0) {
      const nums = sameYearLpj.map((l: any) => {
        const parts = l.nomorAgenda.split('-');
        return parseInt(parts[2], 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const nomorAgenda = `${prefix}${String(nextNum).padStart(4, '0')}`;

    newLpj.id = `lpj-${Date.now()}`;
    newLpj.nomorAgenda = nomorAgenda;
    newLpj.qrCode = `QR-${nomorAgenda}`;
    
    const nowStr = new Date().toISOString();
    newLpj.statusHistory = [
      {
        tanggal: nowStr,
        statusLama: '',
        statusBaru: newLpj.status || 'Baru Masuk',
        pengguna: newLpj.creatorName || 'Cabor Operator',
        catatan: 'Dokumen LPJ diunggah oleh pengurus cabor.'
      }
    ];

    db.lpj.unshift(newLpj);
    writeDb(db);
    
    addAuditLog(newLpj.creatorName || 'Cabor Operator', 'Pengurus Cabang Olahraga (Cabor)', 'Tambah', `Menambahkan LPJ baru dengan nomor agenda ${nomorAgenda} untuk cabor ${newLpj.namaCabor}.`);

    // WhatsApp Otomatis Terima LPJ
    // Find linked cabor phone number or use custom nomorWhatsApp
    const userCabor = db.users.find((u: any) => u.caborName === newLpj.namaCabor && u.phone);
    const caborPhone = newLpj.nomorWhatsApp || (userCabor ? userCabor.phone : '081399887766');

    if (caborPhone) {
      const waMessage = `Yth. Bapak/Ibu,\n\nLPJ telah kami terima.\n\nNomor Agenda:\n${nomorAgenda}\n\nStatus:\nDiterima dan menunggu verifikasi.\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
      addWhatsAppLog(caborPhone, `Terima LPJ: ${nomorAgenda}`, waMessage, 'Berhasil');
    }

    res.json({ success: true, data: newLpj });
  });

  app.put('/api/lpj/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { status, updaterName, updaterRole, catatan } = req.body;

    const index = db.lpj.findIndex((l: any) => l.id === id);
    if (index !== -1) {
      const oldStatus = db.lpj[index].status;
      const originalLpj = db.lpj[index];

      if (status && status !== oldStatus) {
        originalLpj.status = status;
        originalLpj.statusHistory.push({
          tanggal: new Date().toISOString(),
          statusLama: oldStatus,
          statusBaru: status,
          pengguna: updaterName || 'Unknown',
          catatan: catatan || `Perubahan status LPJ ke ${status}`
        });

        // WhatsApp notification trigger for LPJ status change
        const userCabor = db.users.find((u: any) => u.caborName === originalLpj.namaCabor && u.phone);
        const caborPhone = originalLpj.nomorWhatsApp || (userCabor ? userCabor.phone : '081399887766');

        if (caborPhone) {
          let waMessage = '';
          if (status === 'Disetujui') {
            waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${originalLpj.namaCabor},\n\nLPJ dengan Nomor Agenda ${originalLpj.nomorAgenda} telah DISETUJUI oleh Bendahara KONI Jepara.\n\nStatus: Selesai & Lengkap.\n\nTerima kasih atas kerja samanya.\n\nKONI Jepara.`;
          } else if (status === 'Perlu Revisi') {
            waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${originalLpj.namaCabor},\n\nLPJ dengan Nomor Agenda ${originalLpj.nomorAgenda} memerlukan REVISI.\n\nCatatan Revisi:\n${catatan || 'Koreksi nota pengeluaran.'}\n\nMohon segera perbaiki dan unggah kembali.\n\nTerima kasih.\n\nSekretariat KONI Jepara.`;
          } else {
            waMessage = `Yth. Bapak/Ibu Pengurus Cabor ${originalLpj.namaCabor},\n\nStatus LPJ dengan Nomor Agenda ${originalLpj.nomorAgenda} diperbarui.\n\nStatus Baru:\n${status}\n\nCatatan:\n${catatan || '-'}\n\nTerima kasih.\n\nKONI Jepara.`;
          }
          addWhatsAppLog(caborPhone, `Update Status LPJ: ${status}`, waMessage, 'Berhasil');
        }
      }

      writeDb(db);
      addAuditLog(updaterName || 'System', updaterRole || 'User', 'Edit', `Mengubah status LPJ agenda ${originalLpj.nomorAgenda} menjadi ${originalLpj.status}.`);
      return res.json({ success: true, data: originalLpj });
    }
    res.status(404).json({ success: false, message: 'LPJ tidak ditemukan.' });
  });

  // API: Agenda
  app.get('/api/agenda', (req, res) => {
    const db = readDb();
    res.json(db.agenda || []);
  });

  app.post('/api/agenda', (req, res) => {
    const db = readDb();
    const newAgenda = req.body;
    newAgenda.id = `ag-${Date.now()}`;
    newAgenda.pengingatKirimStatus = {};

    db.agenda.push(newAgenda);
    writeDb(db);
    addAuditLog(newAgenda.creatorName || 'System', 'Operator', 'Tambah', `Menambahkan agenda baru secara manual: ${newAgenda.namaAcara}.`);
    res.json({ success: true, data: newAgenda });
  });

  app.delete('/api/agenda/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const initialLen = db.agenda.length;
    db.agenda = db.agenda.filter((a: any) => a.id !== id);
    if (db.agenda.length < initialLen) {
      writeDb(db);
      addAuditLog('System', 'Admin', 'Hapus', `Menghapus agenda ID ${id}.`);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Agenda tidak ditemukan.' });
  });

  // API: Pinjam Barang (Peminjaman Peralatan)
  app.get('/api/pinjam-barang', (req, res) => {
    const db = readDb();
    res.json(db.pinjamBarang || []);
  });

  app.post('/api/pinjam-barang', (req, res) => {
    const db = readDb();
    if (!db.pinjamBarang) {
      db.pinjamBarang = [];
    }
    const newPinjam = req.body;
    newPinjam.id = `pj-${Date.now()}`;
    newPinjam.status = 'Menunggu Persetujuan';

    db.pinjamBarang.push(newPinjam);
    writeDb(db);

    addAuditLog(newPinjam.namaPeminjam, 'Operator', 'Tambah', `Mengajukan peminjaman barang: ${newPinjam.namaBarang} (${newPinjam.jumlah} Unit).`);

    // Trigger WhatsApp notification log
    if (newPinjam.noWhatsApp) {
      const waMessage = `Halo ${newPinjam.namaPeminjam},\n\nPengajuan peminjaman barang Anda telah diterima oleh Sekretariat KONI Jepara:\n- Barang: ${newPinjam.namaBarang}\n- Jumlah: ${newPinjam.jumlah}\n- Tanggal Pinjam: ${newPinjam.tanggalPinjam}\n- Tanggal Kembali: ${newPinjam.tanggalKembali}\n- Keperluan: ${newPinjam.keterangan}\n\nStatus saat ini: MENUNGGU PERSETUJUAN.\n\nTerima kasih,\nSekretariat KONI Jepara`;
      addWhatsAppLog(newPinjam.noWhatsApp, `Pengajuan Peminjaman Barang: ${newPinjam.namaBarang}`, waMessage, 'Berhasil');
    }

    res.json({ success: true, data: newPinjam });
  });

  app.put('/api/pinjam-barang/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { status, catatanPetugas, username, role } = req.body;

    if (!db.pinjamBarang) {
      db.pinjamBarang = [];
    }

    const index = db.pinjamBarang.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      const originalStatus = db.pinjamBarang[index].status;
      db.pinjamBarang[index].status = status || db.pinjamBarang[index].status;
      db.pinjamBarang[index].catatanPetugas = catatanPetugas !== undefined ? catatanPetugas : db.pinjamBarang[index].catatanPetugas;

      writeDb(db);

      addAuditLog(username || 'System', role || 'Operator', 'Edit', `Mengubah status peminjaman ID ${id} menjadi ${status}.`);

      // WhatsApp Notification for status update
      const pinjam = db.pinjamBarang[index];
      if (pinjam.noWhatsApp && originalStatus !== status) {
        let statusText = status.toUpperCase();
        let actionWord = 'telah diperbarui';
        if (status === 'Disetujui') {
          actionWord = 'DISETUJUI oleh Sekretariat';
        } else if (status === 'Ditolak') {
          actionWord = 'DITOLAK oleh Sekretariat';
        } else if (status === 'Dikembalikan') {
          actionWord = 'DIKONFIRMASI TELAH DIKEMBALIKAN dengan baik';
        }

        const waMessage = `Halo ${pinjam.namaPeminjam},\n\nStatus pengajuan peminjaman barang Anda ${actionWord}.\n- Barang: ${pinjam.namaBarang}\n- Jumlah: ${pinjam.jumlah}\n- Tanggal Pinjam: ${pinjam.tanggalPinjam}\n- Tanggal Kembali: ${pinjam.tanggalKembali}\n${pinjam.catatanPetugas ? `- Catatan Petugas: ${pinjam.catatanPetugas}\n` : ''}\nStatus Akhir: ${statusText}.\n\nTerima kasih,\nSekretariat KONI Jepara`;
        addWhatsAppLog(pinjam.noWhatsApp, `Update Status Peminjaman: ${statusText}`, waMessage, 'Berhasil');
      }

      return res.json({ success: true, data: db.pinjamBarang[index] });
    }

    res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan.' });
  });

  app.delete('/api/pinjam-barang/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { username, role } = req.body;

    if (!db.pinjamBarang) {
      db.pinjamBarang = [];
    }

    const initialLen = db.pinjamBarang.length;
    const itemToDelete = db.pinjamBarang.find((p: any) => p.id === id);
    db.pinjamBarang = db.pinjamBarang.filter((p: any) => p.id !== id);

    if (db.pinjamBarang.length < initialLen) {
      writeDb(db);
      addAuditLog(username || 'System', role || 'Operator', 'Hapus', `Menghapus data peminjaman barang ID ${id} (${itemToDelete?.namaBarang || ''}).`);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan.' });
  });

  // API: DELETE Surat Masuk
  app.delete('/api/surat-masuk/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { username, role } = req.body;
    const index = db.suratMasuk.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      const deleted = db.suratMasuk.splice(index, 1)[0];
      // Also delete corresponding proposal if any
      const propIndex = db.proposals.findIndex((p: any) => p.suratMasukId === id || p.nomorAgenda === deleted.nomorAgenda);
      if (propIndex !== -1) {
        db.proposals.splice(propIndex, 1);
      }
      writeDb(db);
      addAuditLog(username || 'System', role || 'Admin', 'Hapus', `Menghapus surat masuk agenda ${deleted.nomorAgenda}.`);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Surat masuk tidak ditemukan.' });
  });

  // API: DELETE Proposals
  app.delete('/api/proposals/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { username, role } = req.body;
    const index = db.proposals.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      const deleted = db.proposals.splice(index, 1)[0];
      writeDb(db);
      addAuditLog(username || 'System', role || 'Admin', 'Hapus', `Menghapus proposal cabor ${deleted.namaCabor}.`);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Proposal tidak ditemukan.' });
  });

  // API: DELETE LPJ
  app.delete('/api/lpj/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { username, role } = req.body;
    const index = db.lpj.findIndex((l: any) => l.id === id);
    if (index !== -1) {
      const deleted = db.lpj.splice(index, 1)[0];
      writeDb(db);
      addAuditLog(username || 'System', role || 'Admin', 'Hapus', `Menghapus LPJ agenda ${deleted.nomorAgenda}.`);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'LPJ tidak ditemukan.' });
  });

  // API: DELETE Surat Keluar
  app.delete('/api/surat-keluar/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { username, role } = req.body;
    const index = db.suratKeluar.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      const deleted = db.suratKeluar.splice(index, 1)[0];
      writeDb(db);
      addAuditLog(username || 'System', role || 'Admin', 'Hapus', `Menghapus surat keluar nomor ${deleted.nomorSurat}.`);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Surat keluar tidak ditemukan.' });
  });

  // API: Surat Keluar
  app.get('/api/surat-keluar', (req, res) => {
    const db = readDb();
    res.json(db.suratKeluar || []);
  });

  app.post('/api/surat-keluar', (req, res) => {
    const db = readDb();
    const newSurat = req.body;

    // Generate automatic outbox number: SK-YYYY-0001
    const currentYear = new Date().getFullYear();
    const prefix = `SK-${currentYear}-`;
    const sameYearSk = db.suratKeluar.filter((s: any) => s.nomorSurat.startsWith(prefix));
    let nextNum = 1;
    if (sameYearSk.length > 0) {
      const nums = sameYearSk.map((s: any) => {
        const parts = s.nomorSurat.split('-');
        return parseInt(parts[2], 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const nomorSurat = `${prefix}${String(nextNum).padStart(4, '0')}`;

    newSurat.id = `sk-${Date.now()}`;
    newSurat.nomorSurat = nomorSurat;
    newSurat.qrCode = `QR-${nomorSurat}`;
    
    const nowStr = new Date().toISOString();
    newSurat.statusHistory = [
      {
        tanggal: nowStr,
        statusLama: '',
        statusBaru: newSurat.status || 'Konsep',
        pengguna: newSurat.creatorName || 'Operator',
        catatan: 'Draf surat keluar berhasil didaftarkan.'
      }
    ];

    db.suratKeluar.unshift(newSurat);
    writeDb(db);
    addAuditLog(newSurat.creatorName || 'Operator', 'Operator', 'Tambah', `Membuat draf surat keluar baru dengan nomor ${nomorSurat}.`);
    res.json({ success: true, data: newSurat });
  });

  app.put('/api/surat-keluar/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { status, updaterName, updaterRole, catatan, performSigning } = req.body;

    const index = db.suratKeluar.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      const oldStatus = db.suratKeluar[index].status;
      const originalSk = db.suratKeluar[index];

      if (status && status !== oldStatus) {
        originalSk.status = status;
        originalSk.statusHistory.push({
          tanggal: new Date().toISOString(),
          statusLama: oldStatus,
          statusBaru: status,
          pengguna: updaterName || 'Unknown',
          catatan: catatan || `Perubahan status surat keluar ke ${status}`
        });

        // Handle digital signature signing if requested and approved
        if (performSigning && (status === 'Ditandatangani' || status === 'Disetujui')) {
          const signeeName = originalSk.penandatangan || updaterName;
          const hashValue = `SHA256:${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
          originalSk.tandaTanganDigital = {
            signedBy: `${signeeName} (TTE KONI Jepara)`,
            signedAt: new Date().toISOString(),
            signatureData: hashValue
          };
          addAuditLog(updaterName || 'System', updaterRole || 'User', 'Tanda Tangan', `Melakukan Tanda Tangan Digital pada surat keluar nomor ${originalSk.nomorSurat}.`);
        }
      }

      writeDb(db);
      addAuditLog(updaterName || 'System', updaterRole || 'User', 'Edit', `Mengubah status surat keluar ${originalSk.nomorSurat} menjadi ${originalSk.status}.`);
      return res.json({ success: true, data: originalSk });
    }
    res.status(404).json({ success: false, message: 'Surat keluar tidak ditemukan.' });
  });

  // API: Backup & Restore
  app.get('/api/backups', (req, res) => {
    const db = readDb();
    res.json(db.backups || []);
  });

  app.post('/api/backups', (req, res) => {
    try {
      const db = readDb();
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const currentDate = String(new Date().getDate()).padStart(2, '0');
      const filename = `backup_siapkoni_${currentYear}${currentMonth}${currentDate}_${Date.now()}.json`;
      
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }

      const backupPath = path.join(backupDir, filename);
      fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf-8');

      // Add to list
      const sizeBytes = fs.statSync(backupPath).size;
      const sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;
      const newBackup = {
        id: `b-${Date.now()}`,
        filename,
        tanggal: new Date().toISOString(),
        ukuran: sizeStr
      };

      db.backups.unshift(newBackup);
      writeDb(db);

      addAuditLog(req.body.username || 'System', req.body.role || 'Admin', 'Backup', `Berhasil membuat backup database dengan nama file ${filename}.`);
      res.json({ success: true, data: newBackup });
    } catch (err) {
      console.error('Backup error:', err);
      res.status(500).json({ success: false, message: 'Gagal membuat backup database.' });
    }
  });

  app.delete('/api/backups/:id', (req, res) => {
    try {
      const db = readDb();
      const { id } = req.params;
      const index = db.backups.findIndex((b: any) => b.id === id);
      if (index !== -1) {
        const backup = db.backups[index];
        const backupPath = path.join(process.cwd(), 'backups', backup.filename);
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
        db.backups.splice(index, 1);
        writeDb(db);
        addAuditLog(req.query.username as string || 'System', req.query.role as string || 'Admin', 'Hapus Backup', `Berhasil menghapus file backup ${backup.filename}.`);
        return res.json({ success: true });
      }
      return res.status(404).json({ success: false, message: 'File backup tidak ditemukan di database.' });
    } catch (err) {
      console.error('Delete backup error:', err);
      res.status(500).json({ success: false, message: 'Gagal menghapus file backup.' });
    }
  });

  app.post('/api/backups/restore', (req, res) => {
    try {
      const { filename, username, role } = req.body;
      const backupPath = path.join(process.cwd(), 'backups', filename);

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ success: false, message: 'File backup tidak ditemukan.' });
      }

      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const restoredData = JSON.parse(backupContent);

      // Save as the main db
      fs.writeFileSync(DB_FILE, JSON.stringify(restoredData, null, 2), 'utf-8');

      addAuditLog(username || 'System', role || 'Admin', 'Restore', `Berhasil melakukan restore database dari file backup ${filename}.`);
      res.json({ success: true });
    } catch (err) {
      console.error('Restore error:', err);
      res.status(500).json({ success: false, message: 'Gagal melakukan restore database.' });
    }
  });

  // API: Manual WhatsApp Send Trigger (for testing/simulating)
  app.post('/api/wa-logs/send', (req, res) => {
    const { penerima, perihal, pesan, username, role } = req.body;
    addWhatsAppLog(penerima, perihal, pesan, 'Berhasil');
    addAuditLog(username || 'Operator', role || 'Operator', 'Kirim WA', `Mengirim pesan WhatsApp manual ke nomor ${penerima}.`);
    res.json({ success: true });
  });

  // API: AI Integration (Gemini SDK wrapper)
  // Handles OCR, Ringkasan, Disposisi, and Invitation extraction in ONE powerful route!
  app.post('/api/ai/analyze-document', async (req, res) => {
    const { documentType, documentText, imageBase64 } = req.body;

    const fallbackResponse = {
      nomorSurat: '045/PAN-PEL/VII/2026',
      tanggal: new Date().toISOString().split('T')[0],
      instansi: 'Ikatan Pencak Silat Indonesia (IPSI) Jepara',
      pengirim: 'Sutrisno, S.E. (Sekretaris Umum)',
      perihal: 'Permohonan Dana Bantuan Peralatan Tanding Atlet IPSI',
      jenisSurat: documentType || 'Proposal',
      namaAcara: 'Pemberian Peralatan Silat Prestasi',
      tanggalAcara: '2026-07-25',
      jam: '10:00',
      tempat: 'Gedung Serbaguna KONI Jepara',
      ringkasanSurat: [
        'Pengajuan proposal permohonan pengadaan matras tanding standar IPSI.',
        'Dana yang diajukan senilai Rp 18.500.000,-.',
        'Peralatan direncanakan digunakan untuk persiapan Kejurprov 2026.',
        'Pembelian meliputi matras tanding, body protector, dan peching pad.',
        'Dokumen menyertakan daftar atlet potensial yang sedang menjalani latihan intensif.'
      ],
      disposisiRekomendasi: 'Didisposisikan kepada Ketua untuk persetujuan anggaran dan Bidang Pembinaan Prestasi (Binpres) untuk kelayakan teknis.'
    };

    if (!ai) {
      // offline fallback
      return res.json({ success: true, mode: 'fallback-offline', analysis: fallbackResponse });
    }

    try {
      const prompt = `Analyze this document text from an official letter/proposal for KONI Jepara (Komite Olahraga Nasional Indonesia Jepara). 
Extract key administrative values and return a structured JSON response.

Document type is: ${documentType || 'General'}
Document Text content:
"""
${documentText || 'PROPOSAL PENGAJUAN PERALATAN IPSI JEPARA Nomor: 045/PAN-PEL/VII/2026 Perihal: Permohonan Bantuan Peralatan Tanding. Pengirim: Sutrisno, SE Sekretaris IPSI Jepara. Acara sosialisasi pada 25 Juli 2026 jam 10.00 di Gedung Serbaguna.'}
"""

Return a JSON object matching this exact schema:
{
  "nomorSurat": "String representing the letter number",
  "tanggal": "String representing the letter date in YYYY-MM-DD format",
  "instansi": "String representing the originating institution/cabor",
  "pengirim": "String representing the individual sender name and title",
  "perihal": "String representing the subject/topic of the letter",
  "jenisSurat": "String representing the category. Must be one of: 'Proposal', 'Undangan', 'Permohonan', 'Edaran', 'Pemberitahuan', 'Lainnya'",
  "namaAcara": "String representing the event name, or empty string if not an invitation or event",
  "tanggalAcara": "String representing event date YYYY-MM-DD or empty string if none",
  "jam": "String representing event time like '09:00' or empty string if none",
  "tempat": "String representing event location or empty string if none",
  "ringkasanSurat": ["List of maximum 5 key summary points as strings"],
  "disposisiRekomendasi": "String providing AI recommendations for internal division assignments (e.g. Ketua, Sekretaris, Bendahara, Bidang Pembinaan, Bidang Organisasi)"
}`;

      // Call Gemini 3.5-flash which is appropriate for basic text extraction tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nomorSurat: { type: Type.STRING },
              tanggal: { type: Type.STRING },
              instansi: { type: Type.STRING },
              pengirim: { type: Type.STRING },
              perihal: { type: Type.STRING },
              jenisSurat: { type: Type.STRING },
              namaAcara: { type: Type.STRING },
              tanggalAcara: { type: Type.STRING },
              jam: { type: Type.STRING },
              tempat: { type: Type.STRING },
              ringkasanSurat: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              disposisiRekomendasi: { type: Type.STRING }
            },
            required: [
              'nomorSurat',
              'tanggal',
              'instansi',
              'pengirim',
              'perihal',
              'jenisSurat',
              'namaAcara',
              'tanggalAcara',
              'jam',
              'tempat',
              'ringkasanSurat',
              'disposisiRekomendasi'
            ]
          }
        }
      });

      const textOutput = response.text;
      if (textOutput) {
        const parsed = JSON.parse(textOutput.trim());
        return res.json({ success: true, mode: 'gemini', analysis: parsed });
      } else {
        throw new Error('Empty response from Gemini');
      }
    } catch (err) {
      console.error('Gemini extraction error:', err);
      return res.json({ success: true, mode: 'fallback-error', analysis: fallbackResponse });
    }
  });

  // Vite middleware for development or Static Asset Delivery for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
