/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Camera, X, Check, RefreshCw, AlertCircle, Phone, Mail, User as UserIcon } from 'lucide-react';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => Promise<boolean>;
}

export default function EditProfileModal({ user, isOpen, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setUsername(user.username);
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1.5MB for Base64 efficiency)
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Ukuran foto terlalu besar. Maksimum 1.5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setError('');
    };
    reader.onerror = () => {
      setError('Gagal membaca file foto.');
    };
    reader.readAsDataURL(file);
  };

  // Quick Preset Avatars (Sports gradient avatars)
  const presets = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue Sport
    'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Green Sport
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber Sport
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'  // Pink Sport
  ];

  const handlePresetSelect = (gradient: string) => {
    // Generate a simple SVG-based canvas or CSS gradient avatar
    // For simplicity and aesthetic appeal, let's generate a SVG avatar with the user's initials
    const initials = name.substring(0, 2).toUpperCase() || 'US';
    const svgStr = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(%23grad)"/><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${gradient.match(/#[0-9a-fA-F]+/g)?.[0] || '#3b82f6'}"/><stop offset="100%" style="stop-color:${gradient.match(/#[0-9a-fA-F]+/g)?.[1] || '#1d4ed8'}"/></linearGradient></defs><text x="50%" y="55%" font-size="36" font-family="sans-serif" font-weight="bold" fill="white" dominant-baseline="middle" text-anchor="middle">${initials}</text></svg>`;
    setAvatar(svgStr);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!username.trim()) {
      setError('Username tidak boleh kosong.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updatedUser: User = {
        ...user,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatar
      };

      const isSuccess = await onSave(updatedUser);
      if (isSuccess) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError('Gagal memperbarui profil di server.');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" id="edit-profile-backdrop">
      <div 
        className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        id="edit-profile-modal-container"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50" id="edit-profile-header">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ubah Profil & Foto</h3>
            <p className="text-[11px] text-slate-400">Sesuaikan informasi akun personal Anda</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition"
            id="edit-profile-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5" id="edit-profile-form">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs font-medium animate-shake" id="profile-error-banner">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-xs font-bold" id="profile-success-banner">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Profil berhasil diperbarui!</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 py-2" id="profile-avatar-section">
            <div className="relative group">
              <div 
                className="w-24 h-24 rounded-full border-2 border-blue-500/20 shadow-md flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                id="profile-avatar-preview"
                title="Pilih foto dari berkas"
              >
                {avatar ? (
                  <img src={avatar} alt="Foto Profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 font-mono">
                    <span className="text-2xl font-bold uppercase">{name.substring(0, 2) || 'US'}</span>
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-150">
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">Ganti Foto</span>
                </div>
              </div>

              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="absolute -top-1 -right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition"
                  title="Hapus foto profil"
                  id="btn-remove-avatar"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              id="avatar-file-input"
            />

            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-medium">Unggah foto pribadi atau pilih warna inisial olahraga:</span>
              <div className="flex gap-2 justify-center mt-2" id="preset-avatars">
                {presets.map((gradient, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(gradient)}
                    className="h-6 w-6 rounded-full border border-slate-200 transition hover:scale-110 flex items-center justify-center text-[8px] font-bold text-white shadow-xs"
                    style={{ background: gradient }}
                    title={`Pilih tema olahraga ${idx + 1}`}
                  >
                    {name.substring(0, 1).toUpperCase() || 'U'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4" id="profile-form-fields">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition"
                placeholder="cth: Dr. H. Mulyono, M.Pd."
                required
                id="input-profile-name"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold text-slate-800 transition bg-slate-50/50"
                placeholder="cth: mulyono_koni"
                required
                id="input-profile-username"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition"
                placeholder="cth: mulyono@koni-jepara.or.id"
                id="input-profile-email"
              />
            </div>

            {/* WhatsApp Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                No. WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition"
                placeholder="cth: 08123456789"
                id="input-profile-phone"
              />
            </div>

            {/* Role & Cabor (Readonly) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Hak Akses</span>
                <span className="text-[11px] font-bold text-slate-700">{user.role}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Cabang Olahraga</span>
                <span className="text-[11px] font-bold text-slate-700 truncate block">
                  {user.caborName || 'KONI Pusat'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100" id="profile-action-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-lg transition"
              id="btn-cancel-profile"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
              id="btn-submit-profile"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
