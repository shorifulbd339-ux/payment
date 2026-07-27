import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  LogOut,
  PlusCircle,
  Pencil,
  Trash2,
  Download,
  Search,
  Users,
  Banknote,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  User,
  Hash,
  Phone,
  MessageSquare,
  KeyRound
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { PaymentRecord } from '../types';

interface AdminDashboardProps {
  payments: PaymentRecord[];
  currentUser: FirebaseUser | null;
  isLoading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  payments,
  currentUser,
  isLoading,
}) => {
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Admin Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'gateway' | 'manual'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PaymentRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<PaymentRecord | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    customer_name: '',
    roll: '',
    amount: 1000,
    customer_phone: '',
    notes: '',
  });

      // Handle Login
      const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setIsAuthLoading(true);

        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          console.error('Login error:', err);
          // If user doesn't exist yet, try creating initial admin account with provided credentials
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              setAuthError('Invalid Firebase email or password. Please check credentials.');
            }
          } else {
            setAuthError(err.message || 'Authentication failed. Please try again.');
          }
        } finally {
          setIsAuthLoading(false);
        }
      };

      // Demo Admin Login helper
      const handleDemoAdminLogin = async () => {
        setAuthError(null);
        setIsAuthLoading(true);
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          setAuthError('Failed to access admin dashboard.');
        } finally {
          setIsAuthLoading(false);
        }
      };

  // Handle Logout
  const handleLogout = async () => {
    await signOut(auth);
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.trxid && p.trxid.toLowerCase().includes(searchTerm.toLowerCase()));

    const isManual = p.payment_method === 'Cash/Manual' || p.status === 'manual';
    if (filterMethod === 'manual') return matchesSearch && isManual;
    if (filterMethod === 'gateway') return matchesSearch && !isManual;
    return matchesSearch;
  });

  // Aggregate Stats
  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const manualCount = payments.filter((p) => p.payment_method === 'Cash/Manual' || p.status === 'manual').length;
  const gatewayCount = payments.length - manualCount;

  // Add Manual Record to Firestore
  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customer_name || !manualForm.roll || !manualForm.amount) {
      alert('Name, roll number, and amount are required.');
      return;
    }

    setIsActionLoading(true);
    try {
      const orderId = `MANUAL-${manualForm.roll}-${Date.now().toString(36).toUpperCase()}`;
      const newRecord: PaymentRecord = {
        order_id: orderId,
        reference_id: orderId,
        customer_name: manualForm.customer_name,
        roll: manualForm.roll,
        amount: Number(manualForm.amount),
        customer_phone: manualForm.customer_phone || 'N/A',
        trxid: `CASH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'manual',
        paid: true,
        payment_method: 'Cash/Manual',
        notes: manualForm.notes || 'Handed in cash to committee',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'payments', orderId), newRecord);

      setIsAddModalOpen(false);
      setManualForm({ customer_name: '', roll: '', amount: 1000, customer_phone: '', notes: '' });
    } catch (err) {
      console.error('Error adding record:', err);
      alert('Failed to save payment record.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Update Record in Firestore
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.id) return;

    setIsActionLoading(true);
    try {
      const docRef = doc(db, 'payments', editingRecord.id);
      await updateDoc(docRef, {
        customer_name: editingRecord.customer_name,
        roll: editingRecord.roll,
        amount: Number(editingRecord.amount),
        customer_phone: editingRecord.customer_phone,
        notes: editingRecord.notes || '',
        updatedAt: new Date().toISOString(),
      });

      setEditingRecord(null);
    } catch (err) {
      console.error('Error updating record:', err);
      alert('Failed to update payment record.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Record from Firestore
  const handleDeleteRecord = async () => {
    if (!deletingRecord || !deletingRecord.id) return;

    setIsActionLoading(true);
    try {
      await deleteDoc(doc(db, 'payments', deletingRecord.id));
      setDeletingRecord(null);
    } catch (err) {
      console.error('Error deleting record:', err);
      alert('Failed to delete payment record.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Roll', 'Name', 'Amount (BDT)', 'Trx ID', 'Phone', 'Payment Method', 'Notes', 'Date'];
    const rows = payments.map((p) => [
      p.roll,
      `"${p.customer_name.replace(/"/g, '""')}"`,
      p.amount,
      p.trxid || p.order_id,
      p.customer_phone || '',
      p.payment_method || 'ePay Gateway',
      `"${(p.notes || '').replace(/"/g, '""')}"`,
      p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Farewell_2026_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If NOT Logged In, Render Login UI
  if (!currentUser) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-white border border-[#E5E7EB] rounded-[32px] p-6 md:p-8 shadow-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#F0F2FF] border border-[#D0D7FF] flex items-center justify-center text-[#2D336B] mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6 text-[#2D336B]" />
          </div>
          <h3 className="text-2xl font-black text-[#1A1A1A]">Admin Portal Login</h3>
          <p className="text-xs text-[#71717A]">Sign in with registered Firebase credentials to view and manage payments</p>
        </div>

        {authError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Email Address</label>
            <input
              id="admin-email-input"
              type="email"
              required
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-2.5 text-[#1A1A1A] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#2D336B] focus:bg-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Password</label>
            <input
              id="admin-password-input"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-2.5 text-[#1A1A1A] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#2D336B] focus:bg-white text-sm"
            />
          </div>

          <button
            id="btn-admin-login"
            type="submit"
            disabled={isAuthLoading}
            className="w-full py-3 px-4 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Sign In as Admin</span>
          </button>
        </form>

        <div className="relative pt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E7EB]" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white px-2 text-[#A1A1AA] font-bold">OR</span>
          </div>
        </div>

        {/* Quick Demo Sign In */}
        <button
          id="btn-demo-admin-login"
          onClick={handleDemoAdminLogin}
          disabled={isAuthLoading}
          className="w-full py-2.5 px-4 rounded-2xl bg-[#F0F2FF] hover:bg-[#E0E5FF] border border-[#D0D7FF] text-[#2D336B] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <KeyRound className="w-4 h-4 text-[#2D336B]" />
          <span>Quick Demo Admin Login (Firebase Auth)</span>
        </button>
      </motion.div>
    );
  }

  // Logged-in Admin View
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#E5E7EB] rounded-[32px] p-6 md:p-8 shadow-sm space-y-6"
    >
      {/* Top Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F3F4F6]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F2FF] border border-[#D0D7FF] text-[#2D336B] text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Control Panel</span>
          </div>
          <h3 className="text-2xl font-black text-[#1A1A1A]">Fee Collection Management</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="py-2.5 px-3.5 rounded-2xl bg-[#F9FAFB] hover:bg-white border border-[#E5E7EB] text-[#1A1A1A] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#059669]" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-open-add-manual"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-3.5 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Cash Fee</span>
          </button>

          <button
            id="btn-admin-logout"
            onClick={handleLogout}
            className="p-2.5 rounded-2xl bg-[#F9FAFB] hover:bg-rose-50 border border-[#E5E7EB] text-[#71717A] hover:text-rose-600 transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#ECFDF5] border border-[#D1FAE5] p-4 rounded-2xl">
          <p className="text-[10px] text-[#059669] font-bold uppercase tracking-wider">Total Raised</p>
          <p className="text-xl font-extrabold text-[#059669] font-mono mt-1">৳ {totalCollected.toLocaleString()}</p>
        </div>

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 rounded-2xl">
          <p className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">Total Contributors</p>
          <p className="text-xl font-extrabold text-[#1A1A1A] font-mono mt-1">{payments.length} Students</p>
        </div>

        <div className="bg-[#F5F3FF] border border-[#DDD6FE] p-4 rounded-2xl">
          <p className="text-[10px] text-[#7C3AED] font-bold uppercase tracking-wider">Online (ePay)</p>
          <p className="text-xl font-extrabold text-[#7C3AED] font-mono mt-1">{gatewayCount} Students</p>
        </div>

        <div className="bg-[#F0F2FF] border border-[#D0D7FF] p-4 rounded-2xl">
          <p className="text-[10px] text-[#2D336B] font-bold uppercase tracking-wider">Cash / Manual</p>
          <p className="text-xl font-extrabold text-[#2D336B] font-mono mt-1">{manualCount} Students</p>
        </div>
      </div>

      {/* Controls: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3" />
          <input
            id="admin-search-input"
            type="text"
            placeholder="Search by Name, Roll, or Trx ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-10 pr-3 py-2 text-[#1A1A1A] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#2D336B] text-xs font-medium"
          />
        </div>

        <div className="flex bg-[#F9FAFB] p-1 rounded-2xl border border-[#E5E7EB] text-xs w-full sm:w-auto">
          <button
            onClick={() => setFilterMethod('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterMethod === 'all' ? 'bg-[#2D336B] text-white' : 'text-[#71717A] hover:text-[#1A1A1A]'
            }`}
          >
            All ({payments.length})
          </button>
          <button
            onClick={() => setFilterMethod('gateway')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterMethod === 'gateway' ? 'bg-[#2D336B] text-white' : 'text-[#71717A] hover:text-[#1A1A1A]'
            }`}
          >
            Online Gateway ({gatewayCount})
          </button>
          <button
            onClick={() => setFilterMethod('manual')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterMethod === 'manual' ? 'bg-[#2D336B] text-white' : 'text-[#71717A] hover:text-[#1A1A1A]'
            }`}
          >
            Cash Payment ({manualCount})
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-xs text-[#1A1A1A]">
          <thead className="bg-[#F9FAFB] text-[#71717A] uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
            <tr>
              <th className="py-3 px-4">Roll</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Method / Trx ID</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#A1A1AA]">
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id || p.order_id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#2D336B]">#{p.roll}</td>
                  <td className="py-3 px-4 font-bold text-[#1A1A1A]">{p.customer_name}</td>
                  <td className="py-3 px-4 font-mono text-[#059669] font-bold">৳ {p.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#F0F2FF] text-[11px] font-mono text-[#2D336B] font-semibold">
                      {p.payment_method || 'ePay Gateway'}
                    </span>
                    {p.trxid && <div className="text-[10px] text-[#71717A] font-mono mt-0.5">{p.trxid}</div>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#71717A]">{p.customer_phone || '-'}</td>
                  <td className="py-3 px-4 text-[11px] text-[#A1A1AA]">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingRecord(p)}
                        className="p-1.5 rounded-xl bg-[#F9FAFB] hover:bg-[#F0F2FF] text-[#2D336B] border border-[#E5E7EB] transition-all cursor-pointer"
                        title="Edit Record"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingRecord(p)}
                        className="p-1.5 rounded-xl bg-[#F9FAFB] hover:bg-rose-50 text-rose-600 border border-[#E5E7EB] transition-all cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Manual Record Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-[32px] p-6 shadow-xl relative"
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#F3F4F6]">
                <h4 className="font-bold text-[#1A1A1A] text-lg flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#2D336B]" />
                  <span>Add Cash Payment Record</span>
                </h4>
                <button onClick={() => setIsAddModalOpen(false)} className="text-[#A1A1AA] hover:text-[#1A1A1A] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualRecord} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={manualForm.customer_name}
                    onChange={(e) => setManualForm({ ...manualForm, customer_name: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Class Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={manualForm.roll}
                    onChange={(e) => setManualForm({ ...manualForm, roll: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Amount (BDT ৳) *</label>
                  <input
                    type="number"
                    required
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: Number(e.target.value) })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#059669] font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    placeholder="01712345678"
                    value={manualForm.customer_phone}
                    onChange={(e) => setManualForm({ ...manualForm, customer_phone: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid in cash to class committee"
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 rounded-2xl bg-[#F9FAFB] text-[#71717A] text-xs font-bold cursor-pointer hover:bg-[#E5E7EB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="flex-1 py-2.5 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save Record</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Record Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-[32px] p-6 shadow-xl relative"
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#F3F4F6]">
                <h4 className="font-bold text-[#1A1A1A] text-lg flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#2D336B]" />
                  <span>Edit Payment Record</span>
                </h4>
                <button onClick={() => setEditingRecord(null)} className="text-[#A1A1AA] hover:text-[#1A1A1A] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.customer_name}
                    onChange={(e) => setEditingRecord({ ...editingRecord, customer_name: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Class Roll Number</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.roll}
                    onChange={(e) => setEditingRecord({ ...editingRecord, roll: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Amount (BDT ৳)</label>
                  <input
                    type="number"
                    required
                    value={editingRecord.amount}
                    onChange={(e) => setEditingRecord({ ...editingRecord, amount: Number(e.target.value) })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#059669] font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={editingRecord.customer_phone || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, customer_phone: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    value={editingRecord.notes || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[#1A1A1A] text-xs focus:outline-none focus:ring-2 focus:ring-[#2D336B]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="flex-1 py-2.5 rounded-2xl bg-[#F9FAFB] text-[#71717A] text-xs font-bold cursor-pointer hover:bg-[#E5E7EB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="flex-1 py-2.5 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Update Record</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Record Confirmation Modal */}
      <AnimatePresence>
        {deletingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-[32px] p-6 shadow-xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#1A1A1A] text-lg">Confirm Delete?</h4>
              <p className="text-xs text-[#71717A]">
                Are you sure you want to permanently delete the payment record for <strong className="text-[#1A1A1A]">{deletingRecord.customer_name}</strong> (Roll: {deletingRecord.roll})?
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingRecord(null)}
                  className="flex-1 py-2.5 rounded-2xl bg-[#F9FAFB] text-[#71717A] text-xs font-bold cursor-pointer hover:bg-[#E5E7EB]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRecord}
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
