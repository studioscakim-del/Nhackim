/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from '../types';
import {
  LayoutDashboard,
  FileDown,
  FilePlus,
  Award,
  Calendar,
  FileUp,
  Archive,
  Activity,
  Database,
  LogOut,
  MapPin,
  ShieldAlert,
  UserCog,
  Package
} from 'lucide-react';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, onEditProfile }: SidebarProps) {
  // Navigation tabs based on roles
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator', 'Pengurus Cabang Olahraga (Cabor)'] },
    { id: 'surat-masuk', label: 'Surat Masuk', icon: FileDown, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bidang', 'Operator'] },
    { id: 'proposals', label: 'Proposal Bantuan', icon: Award, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator', 'Pengurus Cabang Olahraga (Cabor)'] },
    { id: 'lpj', label: 'Laporan (LPJ)', icon: FilePlus, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Operator', 'Pengurus Cabang Olahraga (Cabor)'] },
    { id: 'agenda', label: 'Agenda & Kalender', icon: Calendar, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bidang', 'Operator'] },
    { id: 'pinjam-barang', label: 'Pinjam Barang', icon: Package, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator', 'Pengurus Cabang Olahraga (Cabor)'] },
    { id: 'surat-keluar', label: 'Surat Keluar', icon: FileUp, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Operator'] },
    { id: 'arsip', label: 'Arsip Digital', icon: Archive, roles: ['Super Admin', 'Ketua KONI', 'Sekretaris', 'Bendahara', 'Bidang', 'Operator', 'Pengurus Cabang Olahraga (Cabor)'] },
    { id: 'logs', label: 'Aktivitas & WA', icon: Activity, roles: ['Super Admin', 'Sekretaris', 'Operator'] },
    { id: 'system', label: 'Sistem & Backup', icon: Database, roles: ['Super Admin', 'Operator'] }
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed top-0 left-0 border-r border-slate-800 z-30" id="sidebar-container">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-950" id="sidebar-header">
        <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/10">
          K
        </div>
        <div>
          <h2 className="text-white font-bold tracking-tight text-sm">SIAP KONI</h2>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Jepara</span>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="p-4 mx-3 my-4 bg-slate-850/60 rounded-xl border border-slate-800 flex flex-col gap-2" id="sidebar-user-card">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs uppercase overflow-hidden shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user.name.substring(0, 2)
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <h3 className="text-white font-semibold text-xs truncate" title={user.name}>{user.name}</h3>
            <p className="text-[10px] text-blue-400 font-medium truncate mt-0.5">{user.role}</p>
          </div>
        </div>
        {user.caborName && (
          <div className="text-[10px] bg-slate-800 text-blue-300 px-2 py-1 rounded font-medium border border-slate-750 text-center truncate">
            {user.caborName}
          </div>
        )}
        <button
          onClick={onEditProfile}
          className="mt-1.5 w-full text-center text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white py-1.5 rounded-lg font-bold border border-slate-750 transition flex items-center justify-center gap-1.5"
          id="btn-sidebar-edit-profile"
        >
          <UserCog className="h-3.5 w-3.5 text-blue-400" />
          <span>Edit Profil & Foto</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" id="sidebar-navigation">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
              id={`sidebar-link-${item.id}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-2" id="sidebar-footer">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition group"
          id="sidebar-btn-logout"
        >
          <LogOut className="h-4 w-4 shrink-0 text-red-400 group-hover:text-red-300" />
          <span>Keluar Sistem</span>
        </button>
        <div className="text-[10px] text-slate-500 text-center font-mono py-1 border-t border-slate-850">
          v1.2.0 (Stable)
        </div>
      </div>
    </aside>
  );
}
