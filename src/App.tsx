/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, SuratMasuk, Proposal, LPJ, Agenda, SuratKeluar, WhatsAppLog, AuditLog, BackupItem, PinjamBarang } from './types';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import EditProfileModal from './components/EditProfileModal';
import DashboardView from './components/DashboardView';
import SuratMasukView from './components/SuratMasukView';
import ProposalView from './components/ProposalView';
import LpjView from './components/LpjView';
import AgendaView from './components/AgendaView';
import PinjamBarangView from './components/PinjamBarangView';
import SuratKeluarView from './components/SuratKeluarView';
import ArchiveView from './components/ArchiveView';
import AuditLogView from './components/AuditLogView';
import { Bell, RefreshCw, Cpu, Database, Award, Shield, AlertTriangle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Administrative core states
  const [suratMasuk, setSuratMasuk] = useState<SuratMasuk[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [lpjs, setLpjs] = useState<LPJ[]>([]);
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [peminjaman, setPeminjaman] = useState<PinjamBarang[]>([]);
  const [suratKeluar, setSuratKeluar] = useState<SuratKeluar[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<BackupItem[]>([]);

  // State for beautiful in-app confirmation modal (works safely inside sandboxed iframe)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // State for interactive notification dropdown
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Dynamically calculate live real-time notifications based on current data
  const notifications = React.useMemo(() => {
    const list: Array<{ type: 'surat' | 'proposal' | 'lpj' | 'agenda'; message: string; time: string }> = [];
    
    // 1. Pending Surat Masuk
    const pendingSurat = suratMasuk.filter(s => s.statusDisposisi === 'Belum Disposisi');
    if (pendingSurat.length > 0) {
      list.push({
        type: 'surat',
        message: `${pendingSurat.length} Surat Masuk baru membutuhkan Disposisi.`,
        time: 'Perlu Tindakan'
      });
    }

    // 2. Pending Proposals
    const pendingProps = proposals.filter(p => p.statusVerifikasi === 'Menunggu Verifikasi');
    if (pendingProps.length > 0) {
      list.push({
        type: 'proposal',
        message: `${pendingProps.length} Proposal Cabor baru sedang mengantre untuk Verifikasi Sekretaris.`,
        time: 'Perlu Tindakan'
      });
    }

    // 3. Pending LPJs
    const pendingLpjs = lpjs.filter(l => l.statusVerifikasi === 'Menunggu Verifikasi');
    if (pendingLpjs.length > 0) {
      list.push({
        type: 'lpj',
        message: `${pendingLpjs.length} Laporan Pertanggungjawaban (LPJ) menunggu verifikasi Bendahara.`,
        time: 'Perlu Tindakan'
      });
    }

    // 4. Coming Agenda
    const activeAgendas = agenda.slice(0, 2);
    activeAgendas.forEach(ag => {
      list.push({
        type: 'agenda',
        message: `Agenda Rapat: ${ag.perihal} dijadwalkan pada ${ag.tanggal}.`,
        time: 'Mendatang'
      });
    });

    // Default system notification if nothing pending
    if (list.length === 0) {
      list.push({
        type: 'surat',
        message: 'Selamat datang kembali! Seluruh sinkronisasi data SIAP KONI berjalan normal.',
        time: 'Baru saja'
      });
    }

    return list;
  }, [suratMasuk, proposals, lpjs, agenda]);

  // Fetch all administrative datasets
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [smRes, propRes, lpjRes, agRes, skRes, waRes, auditRes, backupRes, pjRes] = await Promise.all([
        fetch('/api/surat-masuk'),
        fetch('/api/proposals'),
        fetch('/api/lpj'),
        fetch('/api/agenda'),
        fetch('/api/surat-keluar'),
        fetch('/api/wa-logs'),
        fetch('/api/audit-logs'),
        fetch('/api/backups'),
        fetch('/api/pinjam-barang')
      ]);

      const [sm, prop, lpj, ag, sk, wa, audit, backup, pj] = await Promise.all([
        smRes.json(),
        propRes.json(),
        lpjRes.json(),
        agRes.json(),
        skRes.json(),
        waRes.json(),
        auditRes.json(),
        backupRes.json(),
        pjRes.json()
      ]);

      setSuratMasuk(sm || []);
      setProposals(prop || []);
      setLpjs(lpj || []);
      setAgenda(ag || []);
      setSuratKeluar(sk || []);
      setWhatsappLogs(wa || []);
      setAuditLogs(audit || []);
      setBackups(backup || []);
      setPeminjaman(pj || []);
    } catch (err) {
      console.error('Error loading SIAP KONI data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Auth logout helper
  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  // Surat Masuk Actions
  const handleAddSuratMasuk = async (newDoc: any) => {
    try {
      const res = await fetch('/api/surat-masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSuratStatus = async (id: string, updatePayload: any) => {
    try {
      const res = await fetch(`/api/surat-masuk/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Proposals Actions
  const handleUpdateProposalStatus = async (id: string, updatePayload: any) => {
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // LPJ Actions
  const handleAddLpj = async (newLpj: any) => {
    try {
      const res = await fetch('/api/lpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLpj)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLpjStatus = async (id: string, updatePayload: any) => {
    try {
      const res = await fetch(`/api/lpj/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Agenda Actions
  const handleAddAgenda = async (newAgenda: any) => {
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgenda)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAgenda = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Agenda Rapat',
      message: 'Apakah Anda yakin ingin membatalkan dan menghapus agenda rapat ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/agenda/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Pinjam Barang Actions
  const handleAddPinjam = async (newPinjam: any) => {
    try {
      const res = await fetch('/api/pinjam-barang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPinjam)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatusPinjam = async (id: string, status: string, catatanPetugas?: string) => {
    try {
      const res = await fetch(`/api/pinjam-barang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          catatanPetugas,
          username: user?.name,
          role: user?.role
        })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePinjam = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Data Peminjaman',
      message: 'Apakah Anda yakin ingin menghapus data permohonan peminjaman ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/pinjam-barang/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user?.name,
              role: user?.role
            })
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleSendWhatsApp = async (penerima: string, perihal: string, pesan: string) => {
    try {
      const res = await fetch('/api/wa-logs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penerima,
          perihal,
          pesan,
          username: user?.name,
          role: user?.role
        })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Surat Keluar Actions
  const handleAddSuratKeluar = async (newSk: any) => {
    try {
      const res = await fetch('/api/surat-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSk)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSuratKeluarStatus = async (id: string, updatePayload: any) => {
    try {
      const res = await fetch(`/api/surat-keluar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSuratMasuk = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Surat Masuk',
      message: 'Apakah Anda yakin ingin menghapus data surat masuk ini? Seluruh data proposal yang terhubung juga akan dihapus.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/surat-masuk/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user?.name, role: user?.role })
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteProposal = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Proposal Cabor',
      message: 'Apakah Anda yakin ingin menghapus data proposal ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/proposals/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user?.name, role: user?.role })
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteLpj = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Berkas LPJ',
      message: 'Apakah Anda yakin ingin menghapus data LPJ ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/lpj/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user?.name, role: user?.role })
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteSuratKeluar = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Surat Keluar',
      message: 'Apakah Anda yakin ingin menghapus data surat keluar ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/surat-keluar/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user?.name, role: user?.role })
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // System actions (Backups)
  const handleTriggerBackup = async () => {
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.name,
          role: user?.role
        })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    const backupItem = backups.find(b => b.id === id);
    if (!backupItem) return;

    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: backupItem.filename,
          username: user?.name,
          role: user?.role
        })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAuditLog = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Log Aktivitas',
      message: 'Apakah Anda yakin ingin menghapus data log aktivitas ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/audit-logs/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleClearAllAuditLogs = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Bersihkan Semua Log Aktivitas',
      message: 'Apakah Anda yakin ingin menghapus seluruh log aktivitas sistem? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/audit-logs', {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteWhatsAppLog = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Log WhatsApp',
      message: 'Apakah Anda yakin ingin menghapus data log pesan WhatsApp ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/wa-logs/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleClearAllWhatsAppLogs = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Bersihkan Semua Log WhatsApp',
      message: 'Apakah Anda yakin ingin menghapus seluruh log pengiriman WhatsApp? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/wa-logs', {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteBackup = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Cadangan Database',
      message: 'Apakah Anda yakin ingin menghapus berkas cadangan database ini secara permanen dari server?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/backups/${id}?username=${encodeURIComponent(user?.name || '')}&role=${encodeURIComponent(user?.role || '')}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchAllData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const handleUpdateProfile = async (updatedUser: User): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Optional: update audit logs or refresh general data
          await fetchAllData();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error updating user profile:', err);
      return false;
    }
  };

  // Authentication gate
  if (!user) {
    return <AuthModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex selection:bg-blue-500 selection:text-white" id="siap-koni-layout">
      
      {/* Navigation Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onEditProfile={() => setIsEditProfileOpen(true)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={user}
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={handleUpdateProfile}
      />

      {/* Main Content Space */}
      <main className="flex-1 pl-64 min-h-screen flex flex-col relative" id="main-content-canvas">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-150 bg-white flex items-center justify-between px-8 sticky top-0 z-20" id="top-navbar">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase bg-slate-100 px-2 py-1 rounded text-slate-500 flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-blue-500" />
              Sistem Terintegrasi
            </span>
          </div>

          <div className="flex items-center gap-5" id="navbar-actions">
            <button
              onClick={fetchAllData}
              className={`p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition ${
                loading ? 'animate-spin text-blue-500' : ''
              }`}
              title="Perbarui Data Riwayat"
              id="btn-sync-data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Notification system alert */}
            <div className="relative" id="badge-notifications-container">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                title="Pemberitahuan Sistem"
                id="btn-bell-notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  {/* Invisible overlay to dismiss the dropdown when clicking outside */}
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-150 py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-150" id="notifications-dropdown">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Notifikasi SIAP KONI</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} Baru
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map((notif, idx) => (
                        <div key={idx} className="px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 flex gap-2.5 items-start">
                          <div className="mt-1">
                            {notif.type === 'surat' && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                            {notif.type === 'proposal' && <div className="h-2 w-2 rounded-full bg-amber-500" />}
                            {notif.type === 'lpj' && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                            {notif.type === 'agenda' && <div className="h-2 w-2 rounded-full bg-purple-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-700 font-medium leading-normal">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">{notif.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          setActiveTab('logs');
                        }}
                        className="w-full text-center text-[10px] font-bold text-blue-600 hover:text-blue-800 transition py-1 cursor-pointer"
                      >
                        Lihat Semua Log Aktivitas
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mini User Tag */}
            <div className="flex items-center gap-2.5 border-l border-slate-150 pl-4 cursor-pointer" onClick={() => setIsEditProfileOpen(true)} title="Klik untuk edit profil">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-6.5 w-6.5 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-6.5 w-6.5 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[10px] flex items-center justify-center border border-blue-150 uppercase">
                  {user.name.substring(0, 2)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-none mb-0.5">{user.name}</span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase w-fit leading-none">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* View Router */}
        <div className="p-8 flex-1 bg-slate-50" id="view-router-canvas">
          {loading && suratMasuk.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-slate-400 text-xs">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              <span>Memuat data administrasi SIAP KONI...</span>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  suratMasuk={suratMasuk}
                  proposals={proposals}
                  lpjs={lpjs}
                  agenda={agenda}
                  waLogs={whatsappLogs}
                  user={user}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'surat-masuk' && (
                <SuratMasukView
                  suratMasuk={suratMasuk}
                  user={user}
                  onAddSurat={handleAddSuratMasuk}
                  onUpdateStatus={handleUpdateSuratStatus}
                  onDeleteSurat={handleDeleteSuratMasuk}
                />
              )}

              {activeTab === 'proposals' && (
                <ProposalView
                  proposals={proposals}
                  user={user}
                  onUpdateProposalStatus={handleUpdateProposalStatus}
                  onDeleteProposal={handleDeleteProposal}
                />
              )}

              {activeTab === 'lpj' && (
                <LpjView
                  lpjs={lpjs}
                  user={user}
                  onAddLpj={handleAddLpj}
                  onUpdateLpjStatus={handleUpdateLpjStatus}
                  onDeleteLpj={handleDeleteLpj}
                />
              )}

              {activeTab === 'agenda' && (
                <AgendaView
                  agenda={agenda}
                  user={user}
                  onAddAgenda={handleAddAgenda}
                  onDeleteAgenda={handleDeleteAgenda}
                  onSendWhatsApp={handleSendWhatsApp}
                />
              )}

              {activeTab === 'pinjam-barang' && (
                <PinjamBarangView
                  peminjaman={peminjaman}
                  user={user}
                  onAddPinjam={handleAddPinjam}
                  onUpdateStatusPinjam={handleUpdateStatusPinjam}
                  onDeletePinjam={handleDeletePinjam}
                  onSendWhatsApp={handleSendWhatsApp}
                />
              )}

              {activeTab === 'surat-keluar' && (
                <SuratKeluarView
                  suratKeluar={suratKeluar}
                  user={user}
                  onAddSuratKeluar={handleAddSuratKeluar}
                  onUpdateSuratKeluarStatus={handleUpdateSuratKeluarStatus}
                  onDeleteSuratKeluar={handleDeleteSuratKeluar}
                />
              )}

              {activeTab === 'arsip' && (
                <ArchiveView
                  suratMasuk={suratMasuk}
                  proposals={proposals}
                  lpjs={lpjs}
                  suratKeluar={suratKeluar}
                  user={user}
                  onDeleteSuratMasuk={handleDeleteSuratMasuk}
                  onDeleteProposal={handleDeleteProposal}
                  onDeleteLpj={handleDeleteLpj}
                  onDeleteSuratKeluar={handleDeleteSuratKeluar}
                />
              )}

              {activeTab === 'logs' && (
                <AuditLogView
                  auditLogs={auditLogs}
                  whatsappLogs={whatsappLogs}
                  backups={backups}
                  user={user}
                  onTriggerBackup={handleTriggerBackup}
                  onRestoreBackup={handleRestoreBackup}
                  onDeleteAuditLog={handleDeleteAuditLog}
                  onClearAllAuditLogs={handleClearAllAuditLogs}
                  onDeleteWhatsAppLog={handleDeleteWhatsAppLog}
                  onClearAllWhatsAppLogs={handleClearAllWhatsAppLogs}
                  onDeleteBackup={handleDeleteBackup}
                />
              )}

              {activeTab === 'system' && (
                <AuditLogView
                  auditLogs={auditLogs}
                  whatsappLogs={whatsappLogs}
                  backups={backups}
                  user={user}
                  onTriggerBackup={handleTriggerBackup}
                  onRestoreBackup={handleRestoreBackup}
                  onDeleteAuditLog={handleDeleteAuditLog}
                  onClearAllAuditLogs={handleClearAllAuditLogs}
                  onDeleteWhatsAppLog={handleDeleteWhatsAppLog}
                  onClearAllWhatsAppLogs={handleClearAllWhatsAppLogs}
                  onDeleteBackup={handleDeleteBackup}
                />
              )}
            </>
          )}
        </div>

      </main>

      {/* Custom Confirmation Modal for Secure Iframe Operations */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100" id="dialog-confirm-backdrop">
          <div className="bg-white rounded-2xl border border-slate-150 max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col items-center text-center" id="dialog-confirm-content">
            <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1.5">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{confirmDialog.message}</p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                id="btn-confirm-cancel"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
                id="btn-confirm-approve"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
