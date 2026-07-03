/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Key, Eye, EyeOff, UserPlus, LogIn, User as UserIcon, Mail, Phone, Trophy } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthModal({ onLoginSuccess }: AuthModalProps) {
  // Common states
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login Form States
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Register Form States
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Operator');
  const [regCaborName, setRegCaborName] = useState('');

  const rolesList: UserRole[] = [
    'Super Admin',
    'Ketua KONI',
    'Sekretaris',
    'Bendahara',
    'Bidang',
    'Operator'
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('Login berhasil! Selamat datang kembali.');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1000);
      } else {
        setError(data.message || 'Kombinasi Username dan Password salah.');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal menghubungi server. Pastikan server aktif.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regUsername.trim() || !regName.trim() || !regPassword.trim()) {
      setError('Username, Nama Lengkap, dan Password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword,
          name: regName.trim(),
          role: regRole,
          email: regEmail.trim(),
          phone: regPhone.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('Akun berhasil dibuat! Menyiapkan login Anda...');
        // Automatically login the user upon registration success
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1500);
      } else {
        setError(data.message || 'Gagal mendaftarkan akun baru.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi server saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-blue-500 selection:text-white" id="login-container">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-12 border border-slate-100" id="login-card">
        
        {/* Left column: Branding / Info */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 text-white flex flex-col justify-between" id="login-branding">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SIAP KONI</h1>
              <p className="text-xs text-blue-100 mt-1 uppercase tracking-widest font-semibold font-mono">
                Koni Kabupaten Jepara
              </p>
            </div>
          </div>

          <div className="my-8 space-y-3 text-sm text-blue-100">
            <p className="leading-relaxed">
              Sistem Informasi Administrasi Persuratan, Proposal, LPJ, Agenda, dan Disposisi Terintegrasi.
            </p>
            <div className="pt-2 border-t border-white/10 text-xs font-mono text-blue-200 space-y-1">
              <p>● Standar Keamanan JWT + RBAC</p>
              <p>● OCR & Ringkasan AI Terintegrasi</p>
              <p>● WhatsApp Notification Engine</p>
              <p>● Backup & Restore Otomatis</p>
            </div>
          </div>

          <div className="text-xs text-blue-300">
            © 2026 Sekretariat KONI Jepara. All rights reserved.
          </div>
        </div>

        {/* Right column: Form */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center overflow-y-auto max-h-[90vh] md:max-h-none" id="login-form-area">
          
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {isRegister ? 'Buat Akun SIAP KONI' : 'Selamat Datang Kembali'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister 
                ? 'Daftarkan akun baru Anda untuk mengakses modul administrasi.' 
                : 'Silakan masuk menggunakan akun kredensial terdaftar Anda.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-150 text-red-600 rounded-lg text-xs font-medium" id="auth-error">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-lg text-xs font-medium" id="auth-success">
              {success}
            </div>
          )}

          {/* LOGIN FORM */}
          {!isRegister && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" id="login-form">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                    placeholder="Masukkan username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    id="input-username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    id="input-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    id="btn-toggle-pass"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                id="btn-login"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
              </button>

              <div className="pt-4 text-center">
                <span className="text-xs text-slate-500">Belum memiliki akun? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer hover:underline"
                  id="btn-switch-to-register"
                >
                  Buat Akun Baru
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {isRegister && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3" id="register-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                      placeholder="Username untuk login"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      id="input-reg-username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                      placeholder="Buat sandi aman"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      id="input-reg-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      id="btn-toggle-reg-pass"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                    placeholder="Nama lengkap beserta gelar"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    id="input-reg-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Email (Opsional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                      placeholder="contoh@domain.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      id="input-reg-email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    No. WhatsApp (Opsional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition font-medium"
                      placeholder="Contoh: 08123456789"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      id="input-reg-phone"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Hak Akses (Role)
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium transition cursor-pointer"
                    value={regRole}
                    onChange={(e) => {
                      const selectedRole = e.target.value as UserRole;
                      setRegRole(selectedRole);
                    }}
                    id="select-reg-role"
                  >
                    {rolesList.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer mt-2"
                id="btn-register"
              >
                <UserPlus className="h-4 w-4" />
                {loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Baru'}
              </button>

              <div className="pt-4 text-center">
                <span className="text-xs text-slate-500">Sudah memiliki akun? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer hover:underline"
                  id="btn-switch-to-login"
                >
                  Masuk ke Akun
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
