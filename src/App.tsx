import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  limit,
  isOfflineMode,
  retryConnection,
  getDoc,
} from './firebase';
import { seedDatabaseIfEmpty } from './dbSeeder';
import {
  User,
  Complaint,
  ComplaintCategory,
  PriorityLevel,
  UserRole,
  ApprovalStatus,
  getRoleDisplayName,
  AppNotification,
} from './types';
import {
  Wrench,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Users,
  MapPin,
  Sparkles,
  Filter,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Settings,
  ClipboardList,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  BookOpen,
  Wifi,
  Lightbulb,
  Building,
  Activity,
  History,
  FileSpreadsheet,
  Sun,
  Moon,
  Bell,
  BellRing,
  Check,
  CheckCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import ChatBotWidget from './components/ChatBotWidget';
import StudentComplaintForm from './components/StudentComplaintForm';
import StudentAboutUs from './components/StudentAboutUs';

// Tech staff list for Admins to assign
const TECHNICIANS = [
  'Campus Plumber',
  'Campus Electrician',
  'IT Network Support',
  'Campus Carpenter',
  'Sanitation Crew',
  'Classroom Support Tech',
  'Security Coordinator',
];

interface UserSettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

function UserSettingsModal({ currentUser, onClose, onUpdateUser }: UserSettingsModalProps) {
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Drag-and-Drop + Manual File Upload for Avatar
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, GIF).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size is too large. Max allowed size is 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setAvatarUrl(reader.result as string);
        setError('');
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    let passwordToUpdate = currentUser.password;
    if (newPassword || currentPassword || confirmPassword) {
      if (currentPassword !== currentUser.password) {
        setError('Current password is incorrect.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password confirmation does not match.');
        return;
      }
      passwordToUpdate = newPassword;
    }

    try {
      setIsSubmitting(true);
      const userQuery = query(collection(db, 'users'), where('id', '==', currentUser.id), limit(1));
      const userSnap = await getDocs(userQuery);
      if (userSnap.empty) {
        setError('User record not found in database.');
        return;
      }
      
      const userDocRef = doc(db, 'users', userSnap.docs[0].id);
      const updatedData: Partial<User> = {
        email: email.trim(),
        avatarUrl: avatarUrl.trim(),
        password: passwordToUpdate,
      };

      await updateDoc(userDocRef, updatedData);
      
      const updatedUser: User = {
        ...currentUser,
        email: email.trim(),
        avatarUrl: avatarUrl.trim(),
        password: passwordToUpdate,
      };

      onUpdateUser(updatedUser);
      setSuccess('Account updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center gap-2">
            <Settings className="text-teal-400" size={18} />
            <h2 className="font-bold text-sm text-white font-mono uppercase tracking-wider">Account Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <XCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Read-only Name / Username */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
            <div>
              <span className="block text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono mb-0.5">Full Name</span>
              <span className="text-xs text-slate-300 font-semibold">{currentUser.name}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono mb-0.5">User ID / Username</span>
              <span className="text-xs text-slate-300 font-mono">{currentUser.id}</span>
            </div>
            <div className="col-span-2 text-[8px] text-slate-500 font-mono leading-normal mt-1 border-t border-slate-800/30 pt-1.5">
              * Username and full name are locked by campus administration and cannot be changed.
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 font-mono"
              required
              placeholder="Enter your email address"
            />
          </div>

          {/* Profile Photo Upload */}
          <div className="space-y-2 border-t border-slate-800/40 pt-4">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
              Profile Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-800/60">
              {/* Current Preview or initials */}
              <div className="shrink-0">
                {avatarUrl ? (
                  <div className="relative group">
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-teal-500/50"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-400 transition-all shadow-md cursor-pointer text-[10px] w-4 h-4 flex items-center justify-center"
                      title="Remove image"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-xs text-slate-500 font-mono font-bold uppercase">
                    No Photo
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="flex-1 w-full">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-teal-500 bg-teal-500/5'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850/10'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <ImageIcon size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-[11px] font-medium text-slate-300">
                    Drag & drop image here, or <span className="text-teal-400 font-semibold underline">browse</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Supports PNG, JPG, GIF (Max 2MB)</p>
                </div>
              </div>
            </div>

            {/* Direct Image URL option */}
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-slate-500 tracking-wider uppercase font-mono">
                Or enter absolute image URL directly:
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-2 text-[10px] focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Password Change (Optional) */}
          <div className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">Change Password</span>
              <span className="text-[8px] text-slate-500 font-mono uppercase">Leave blank to keep current</span>
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 pr-10 text-xs focus:outline-none focus:border-teal-500 font-mono"
                  placeholder="Enter current password to authorize change"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 pr-10 text-xs focus:outline-none focus:border-teal-500 font-mono"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 pr-10 text-xs focus:outline-none focus:border-teal-500 font-mono"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-slate-800/80 pt-4 flex gap-3 justify-end bg-slate-900/50 p-4 -mx-6 -mb-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all font-mono uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 font-mono uppercase tracking-wider cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const triggerNotification = async (notifData: {
  title: string;
  message: string;
  type: 'new_complaint' | 'status_change' | 'rejection';
  complaintId: string;
  userId?: string;
  roleTarget?: 'admin' | 'committee' | 'all';
}) => {
  try {
    const newNotif = {
      title: notifData.title,
      message: notifData.message,
      type: notifData.type,
      complaintId: notifData.complaintId,
      createdAt: Date.now(),
      userId: notifData.userId || '',
      roleTarget: notifData.roleTarget || '',
      readBy: [],
    };
    await addDoc(collection(db, 'notifications'), newNotif);
  } catch (err) {
    console.error('Error triggering notification:', err);
  }
};

// --- LOG RETENTION / AUTO-DELETE ---
// Admin can configure how long resolved complaint logs are kept for
// (settings/log_retention). Since this is a client-only app with no server
// cron job, the cleanup runs opportunistically: once per app load, at most
// once per hour, for whichever user happens to open the app while a policy
// is active. Uses each complaint's createdAt as the age reference (the
// data model doesn't currently track a separate "resolvedAt" timestamp).
const LOG_RETENTION_DOC_ID = 'log_retention';
const LOG_RETENTION_MIN_RUN_GAP_MS = 60 * 60 * 1000; // don't re-run more than once/hour

interface LogRetentionSettings {
  id: string;
  enabled: boolean;
  intervalDays: number;
  lastRunAt?: number;
}

async function runLogAutoCleanupIfDue() {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', LOG_RETENTION_DOC_ID));
    if (!settingsSnap.exists()) return;
    const settings = settingsSnap.data() as LogRetentionSettings;
    if (!settings || !settings.enabled || !settings.intervalDays || settings.intervalDays <= 0) return;

    const lastRunAt = settings.lastRunAt || 0;
    if (Date.now() - lastRunAt < LOG_RETENTION_MIN_RUN_GAP_MS) return;

    const cutoff = Date.now() - settings.intervalDays * 24 * 60 * 60 * 1000;
    const resolvedSnap = await getDocs(query(collection(db, 'complaints'), where('status', '==', 'resolved')));
    const toDelete = resolvedSnap.docs
      .map((d: any) => d.data() as Complaint)
      .filter((c: Complaint) => c.createdAt < cutoff);

    await Promise.allSettled(
      toDelete.map(async (c) => {
        await deleteDoc(doc(db, 'complaints', c.id));
        const logsSnap = await getDocs(query(collection(db, 'maintenance_logs'), where('complaintId', '==', c.id)));
        await Promise.allSettled(logsSnap.docs.map((d: any) => deleteDoc(doc(db, 'maintenance_logs', d.id))));
      })
    );

    await setDoc(doc(db, 'settings', LOG_RETENTION_DOC_ID), { ...settings, lastRunAt: Date.now() });
  } catch (err) {
    // Never let auto-cleanup errors block the app from loading.
    console.warn('Log auto-cleanup skipped due to an error:', err);
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentActiveTab, setStudentActiveTab] = useState<'dashboard' | 'file' | 'assistant' | 'about' | 'manage_accounts' | 'create_account' | 'resolve' | 'approving' | 'assignment' | 'logs'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [appReady, setAppReady] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(isOfflineMode());
  const [retryingConnection, setRetryingConnection] = useState(false);

  const handleRetryConnection = async () => {
    if (retryingConnection) return;
    setRetryingConnection(true);
    try {
      await retryConnection();
    } finally {
      setRetryingConnection(false);
    }
  };
  
  // Sidebar Minimization State
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(() => {
    return localStorage.getItem('smart_campus_sidebar_minimized') === 'true';
  });

  const toggleSidebarMinimize = () => {
    setIsSidebarMinimized(prev => {
      const newVal = !prev;
      localStorage.setItem('smart_campus_sidebar_minimized', String(newVal));
      return newVal;
    });
  };

  // Account Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleStatusChange = () => {
      setOfflineFallback(isOfflineMode());
    };
    window.addEventListener('firestore-offline-status-changed', handleStatusChange);
    return () => {
      window.removeEventListener('firestore-offline-status-changed', handleStatusChange);
    };
  }, []);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('smart_campus_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('smart_campus_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // Firestore States
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Notifications States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<string>(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: string }[]>([]);
  const hasInitializedNotificationsRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const addToast = (title: string, message: string, type: string) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPermission(permission);
      return permission;
    }
    return 'unsupported';
  };

  const filteredNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(notif => {
      if (notif.userId && notif.userId === currentUser.id) return true;
      if (notif.roleTarget) {
        if (notif.roleTarget === 'all') return true;
        if (notif.roleTarget === currentUser.role) return true;
      }
      return false;
    });
  }, [notifications, currentUser]);

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return filteredNotifications.filter(notif => !notif.readBy.includes(currentUser.id)).length;
  }, [filteredNotifications, currentUser]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      const notif = notifications.find(n => n.id === notificationId);
      if (notif && !notif.readBy.includes(currentUser.id)) {
        await updateDoc(notifRef, {
          readBy: [...notif.readBy, currentUser.id]
        });
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const unreadNotifs = filteredNotifications.filter(n => !n.readBy.includes(currentUser.id));
      for (const notif of unreadNotifs) {
        const notifRef = doc(db, 'notifications', notif.id);
        await updateDoc(notifRef, {
          readBy: [...notif.readBy, currentUser.id]
        });
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Listen to Notifications in real-time
  useEffect(() => {
    if (!currentUser || currentUser.firstLogin) return;

    const q = query(collection(db, 'notifications'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as AppNotification;
        const notif = { ...data, id: docSnap.id };
        list.push(notif);

        // Instant notification check for current session
        const isTargeted = 
          (notif.userId && notif.userId === currentUser.id) ||
          (notif.roleTarget && (notif.roleTarget === 'all' || notif.roleTarget === currentUser.role));

        if (isTargeted && !seenNotificationIdsRef.current.has(notif.id)) {
          seenNotificationIdsRef.current.add(notif.id);

          const isRecent = Date.now() - notif.createdAt < 15000;
          if (isRecent && hasInitializedNotificationsRef.current) {
            // Visual float toast
            addToast(notif.title, notif.message, notif.type);
            // Native desktop push
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(notif.title, { body: notif.message });
              } catch (e) {
                console.warn('Native notification failed', e);
              }
            }
          }
        }
      });

      list.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(list);
      hasInitializedNotificationsRef.current = true;
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => {
      unsubscribe();
      hasInitializedNotificationsRef.current = false;
    };
  }, [currentUser]);

  const adminApprovedQueueCount = useMemo(() => {
    return allComplaints.filter((c) => c.approvalStatus === 'approved' && c.status !== 'resolved').length;
  }, [allComplaints]);

  // Seed DB and restore session on mount
  useEffect(() => {
    async function init() {
      try {
        await seedDatabaseIfEmpty();
        
        // Opportunistically run the admin-configured log retention cleanup
        // (no-op if no policy has been set, or it's not due yet).
        runLogAutoCleanupIfDue();

        // Restore session if present
        const savedSession = localStorage.getItem('smart_campus_user');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            // Re-fetch latest from Firestore to ensure freshness
            const userDocSnap = await getDocs(query(collection(db, 'users'), where('id', '==', parsed.id), limit(1)));
            if (!userDocSnap.empty) {
              const freshUser = userDocSnap.docs[0].data() as User;
              setCurrentUser(freshUser);
            } else {
              localStorage.removeItem('smart_campus_user');
            }
          } catch (e) {
            localStorage.removeItem('smart_campus_user');
          }
        }
      } catch (err) {
        console.error('Initial setup error:', err);
      } finally {
        setLoading(false);
        setAppReady(true);
      }
    }
    init();
  }, []);

  // Listen to Users (Admins and Committees see all, Students see none/only themselves)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'student') return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc: any) => {
        usersList.push(doc.data() as User);
      });
      setAllUsers(usersList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to Complaints securely (Partition based on role)
  useEffect(() => {
    if (!currentUser || currentUser.firstLogin) return;

    let q;
    if (currentUser.role === 'student') {
      // Secure constraint: Students can ONLY query their own complaints
      q = query(
        collection(db, 'complaints'),
        where('studentId', '==', currentUser.id)
      );
    } else {
      // Admins and Approval Committee can query all complaints
      q = query(collection(db, 'complaints'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Complaint[] = [];
      snapshot.forEach((doc: any) => {
        list.push({ ...doc.data(), id: doc.id } as Complaint);
      });
      // Sort in-memory to avoid compound index requirements
      list.sort((a, b) => b.createdAt - a.createdAt);
      setAllComplaints(list);
    }, (error) => {
      console.error('Error fetching complaints: ', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('smart_campus_user');
    setCurrentUser(null);
    setAuthError('');
  };

  const handleStudentSubmitComplaint = async (complaintData: any) => {
    if (!currentUser) return;
    const newComplaint = {
      studentId: currentUser.id,
      studentName: currentUser.name,
      category: complaintData.category,
      location: complaintData.location,
      description: complaintData.description,
      priority: complaintData.priority,
      imageUrl: complaintData.imageUrl || '',
      createdAt: Date.now(),
      approvalStatus: 'pending',
      status: 'pending',
      targetAuthority: complaintData.targetAuthority,
    };
    const docRef = await addDoc(collection(db, 'complaints'), newComplaint);

    // Trigger Admin and Committee Notifications
    await triggerNotification({
      title: '🚨 New Complaint Submitted',
      message: `${currentUser.name} submitted a ${complaintData.priority} priority ${complaintData.category} complaint at ${complaintData.location}.`,
      type: 'new_complaint',
      complaintId: docRef.id,
      roleTarget: 'admin',
    });

    await triggerNotification({
      title: '📋 Review Required',
      message: `A new ${complaintData.category} complaint is pending approval for ${complaintData.targetAuthority || 'review'}.`,
      type: 'new_complaint',
      complaintId: docRef.id,
      roleTarget: 'committee',
    });

    setStudentActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" id="global-spinner"></div>
        <p className="text-teal-400 font-medium animate-pulse">Initializing Smart Campus Systems...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative">
      {/* Offline Fallback Banner */}
      {offlineFallback && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex flex-wrap items-center justify-center gap-2 text-xs text-amber-400 font-medium font-mono z-50">
          <AlertTriangle size={14} className="animate-pulse text-amber-500 shrink-0" />
          <span className="text-center">Cloud database connection is slow/offline. Operating in local-first secure sandbox.</span>
          <button
            id="retry-connection-btn"
            onClick={handleRetryConnection}
            disabled={retryingConnection}
            className="ml-2 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-amber-300 hover:text-amber-200 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {retryingConnection ? 'Retrying…' : 'Retry Connection'}
          </button>
        </div>
      )}

      {/* Floating Theme Toggle (Only for non-logged-in views like Login) */}
      {!currentUser && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 text-xs text-slate-300 font-semibold shadow-lg hover:border-slate-700 transition-all cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} className="text-amber-400" />
                <span className="text-[11px] font-semibold text-slate-400">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-indigo-400" />
                <span className="text-[11px] font-semibold text-slate-400">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* HEADER NAVBAR */}
      {currentUser && (
        <header className="bg-slate-900 border-b border-slate-800 py-3 px-6 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2 rounded-xl text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Wrench size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Smart Campus <span className="text-teal-400 text-[10px] px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-md font-extrabold uppercase font-mono tracking-wider">CMS</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">Complaint & Maintenance Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Notification Bell & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={`p-2 rounded-xl border transition-all relative flex items-center justify-center cursor-pointer ${
                  showNotificationsDropdown 
                    ? 'bg-slate-850 border-teal-500/50 text-teal-400 shadow-md shadow-teal-500/5' 
                    : 'bg-slate-850/60 border-slate-800 hover:border-slate-750 text-slate-300 hover:text-white'
                }`}
                title="Notifications"
                id="notification-bell-btn"
              >
                {unreadCount > 0 ? (
                  <BellRing size={16} className="text-teal-400 animate-bounce" />
                ) : (
                  <Bell size={16} />
                )}
                
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-mono font-black rounded-full h-4.5 min-w-4.5 px-1 flex items-center justify-center border border-slate-900 shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Card */}
              {showNotificationsDropdown && (
                <>
                  {/* Backdrop overlay to click away */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setShowNotificationsDropdown(false)}
                  />
                  
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-850 rounded-2xl shadow-2xl z-50 p-4 flex flex-col gap-3 animate-fade-in text-left">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-300">Campus Alerts</span>
                        {unreadCount > 0 && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-md">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            handleMarkAllAsRead();
                          }}
                          className="text-[10px] font-mono font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Mark all notifications as read"
                        >
                          <CheckCheck size={12} />
                          <span>Clear All</span>
                        </button>
                      )}
                    </div>

                    {/* Browser Notifications Permission Bar */}
                    <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 bg-slate-800 rounded-lg text-slate-400 shrink-0">
                          <Bell size={12} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[10px] font-bold text-slate-300 font-sans">System Alerts</h4>
                          <p className="text-[9px] text-slate-555 truncate font-mono">
                            {browserNotificationPermission === 'granted' 
                              ? 'Desktop notifications live' 
                              : browserNotificationPermission === 'denied' 
                              ? 'Notifications blocked by browser' 
                              : 'Request browser notifications'}
                          </p>
                        </div>
                      </div>
                      
                      {browserNotificationPermission === 'default' && (
                        <button
                          onClick={requestNotificationPermission}
                          className="px-2 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 text-[9px] font-black uppercase font-mono rounded-lg transition-all cursor-pointer shadow-sm shadow-teal-500/10 shrink-0"
                        >
                          Allow
                        </button>
                      )}
                    </div>

                    {/* Notification Feed List */}
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-8 text-center">
                          <Bell size={24} className="mx-auto text-slate-700 mb-2" />
                          <p className="text-xs font-medium text-slate-500">All caught up! No recent notifications.</p>
                        </div>
                      ) : (
                        filteredNotifications.map((notif) => {
                          const isUnread = !notif.readBy.includes(currentUser.id);
                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleMarkAsRead(notif.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 relative overflow-hidden group ${
                                isUnread 
                                  ? 'bg-slate-850/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 shadow-sm' 
                                  : 'bg-slate-900/40 border-slate-900/60 hover:border-slate-850 opacity-60 hover:opacity-100'
                              }`}
                            >
                              {/* Unread marker bar */}
                              {isUnread && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500" />
                              )}

                              {/* Notification Icon based on Type */}
                              <div className="shrink-0 mt-0.5">
                                {notif.type === 'new_complaint' && (
                                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 flex items-center justify-center">
                                    <Plus size={14} />
                                  </div>
                                )}
                                {notif.type === 'status_change' && (
                                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/10 flex items-center justify-center">
                                    <CheckCircle2 size={14} />
                                  </div>
                                )}
                                {notif.type === 'rejection' && (
                                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/10 flex items-center justify-center">
                                    <XCircle size={14} />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className={`text-[11px] font-bold truncate font-sans ${
                                    isUnread ? 'text-white' : 'text-slate-400'
                                  }`}>
                                    {notif.title}
                                  </h4>
                                  <span className="text-[8px] font-mono text-slate-500 whitespace-nowrap">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5 leading-relaxed break-words">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-teal-500/40 object-cover bg-slate-900 shadow-inner"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-teal-400 border border-slate-700 font-mono">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="hidden md:flex flex-col text-right">
              <div className="text-sm font-semibold text-slate-200">{currentUser.name}</div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 font-mono uppercase">
                {currentUser.role === 'admin' && <ShieldCheck size={12} className="text-rose-400" />}
                {currentUser.role === 'committee' && (currentUser.authority === 'teachers' || currentUser.id === 'staff') && <UserCheck size={12} className="text-indigo-400" />}
                {currentUser.role === 'committee' && !(currentUser.authority === 'teachers' || currentUser.id === 'staff') && <UserCheck size={12} className="text-amber-400" />}
                {currentUser.role === 'student' && <Users size={12} className="text-emerald-400" />}
                {currentUser.role === 'management' && <Wrench size={12} className="text-violet-400" />}
                {getRoleDisplayName(currentUser)} {currentUser.admissionNo ? `| ${currentUser.admissionNo}` : ''}
              </div>
            </div>

          </div>
        </header>
      )}

      {/* CORE SCREENS ROUTER */}
      <main className="flex-1 flex flex-col relative">
        {!currentUser ? (
          <LoginScreen onLoginSuccess={setCurrentUser} error={authError} setError={setAuthError} />
        ) : (
          <>
            <div className="flex-1 flex flex-col md:flex-row relative">
              {/* Responsive Left Sidebar */}
              <aside className={`w-full bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 font-sans transition-all duration-300 ${
                isSidebarMinimized ? 'md:w-20' : 'md:w-64'
              }`}>
                {/* Top: Branding / Navigation Title */}
                <div className="flex flex-col">
                  <div className="p-4 border-b border-slate-800/60 hidden md:flex items-center justify-between">
                    {!isSidebarMinimized && (
                      <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase">Navigation Menu</span>
                    )}
                    <button
                      onClick={toggleSidebarMinimize}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                      title={isSidebarMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                      {isSidebarMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                  </div>

                  {/* Navigation Items */}
                  <nav className={`p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible ${
                    isSidebarMinimized ? 'md:items-center' : ''
                  }`}>
                    {currentUser.role !== 'admin' && (
                      <button
                        onClick={() => setStudentActiveTab('dashboard')}
                        title={isSidebarMinimized ? "Dashboard" : ""}
                        className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                          isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                        } ${
                          studentActiveTab === 'dashboard'
                            ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                        }`}
                      >
                        <LayoutDashboard size={14} />
                        {!isSidebarMinimized && <span>Dashboard</span>}
                      </button>
                    )}

                    {currentUser.role === 'student' && (
                      <button
                        onClick={() => setStudentActiveTab('file')}
                        title={isSidebarMinimized ? "Complaint File" : ""}
                        className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap relative ${
                          isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                        } ${
                          studentActiveTab === 'file'
                            ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                        }`}
                      >
                        <Plus size={14} className="stroke-[2.5]" />
                        {!isSidebarMinimized && <span>Complaint File</span>}
                        {!isSidebarMinimized && <span className="absolute right-3.5 w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse hidden md:block"></span>}
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <>
                        <button
                          onClick={() => setStudentActiveTab('dashboard')}
                          title={isSidebarMinimized ? "Analytics Dashboard" : ""}
                          className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                            isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                          } ${
                            studentActiveTab === 'dashboard'
                              ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                          }`}
                        >
                          <TrendingUp size={14} />
                          {!isSidebarMinimized && <span>Analytics Dashboard</span>}
                        </button>

                        <button
                          onClick={() => setStudentActiveTab('assignment')}
                          title={isSidebarMinimized ? "Assign Repair Staff" : ""}
                          className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap relative ${
                            isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                          } ${
                            studentActiveTab === 'assignment'
                              ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                          }`}
                        >
                          <Wrench size={14} />
                          {!isSidebarMinimized && <span>Assign Repair Staff</span>}
                          {adminApprovedQueueCount > 0 && (
                            <span className={`bg-rose-500 text-white font-bold rounded-full flex items-center justify-center shrink-0 ${
                              isSidebarMinimized 
                                ? 'absolute top-1 right-1 text-[8px] w-3.5 h-3.5' 
                                : 'ml-auto text-[9px] w-4 h-4'
                            }`}>
                              {adminApprovedQueueCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => setStudentActiveTab('manage_accounts')}
                          title={isSidebarMinimized ? "Manage Accounts" : ""}
                          className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                            isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                          } ${
                            studentActiveTab === 'manage_accounts'
                              ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                          }`}
                        >
                          <Users size={14} />
                          {!isSidebarMinimized && <span>Manage Accounts</span>}
                        </button>

                        <button
                          onClick={() => setStudentActiveTab('logs')}
                          title={isSidebarMinimized ? "Maintenance Logs" : ""}
                          className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                            isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                          } ${
                            studentActiveTab === 'logs'
                              ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                          }`}
                        >
                          <FileSpreadsheet size={14} />
                          {!isSidebarMinimized && <span>Maintenance Logs</span>}
                        </button>
                      </>
                    )}

                    {(currentUser.role === 'management' || (currentUser.role === 'committee' && (currentUser.authority === 'teachers' || currentUser.id === 'staff'))) && (
                      <button
                        onClick={() => setStudentActiveTab('resolve')}
                        title={isSidebarMinimized ? "Resolve" : ""}
                        className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                          isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                        } ${
                          studentActiveTab === 'resolve'
                            ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                        }`}
                      >
                        <Wrench size={14} />
                        {!isSidebarMinimized && <span>Resolve</span>}
                      </button>
                    )}

                    {(currentUser.role === 'committee' && !(currentUser.authority === 'teachers' || currentUser.id === 'staff')) && (
                      <button
                        onClick={() => setStudentActiveTab('approving')}
                        title={isSidebarMinimized ? "Approving" : ""}
                        className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                          isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                        } ${
                          studentActiveTab === 'approving'
                            ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                        }`}
                      >
                        <ShieldCheck size={14} />
                        {!isSidebarMinimized && <span>Approving</span>}
                      </button>
                    )}

                    <button
                      onClick={() => setStudentActiveTab('assistant')}
                      title={isSidebarMinimized ? "FixIt Assistant" : ""}
                      className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap relative ${
                        isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                      } ${
                        studentActiveTab === 'assistant'
                          ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                      }`}
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      {!isSidebarMinimized && <span>FixIt Assistant</span>}
                      {!isSidebarMinimized && <span className="absolute right-3.5 px-1.5 py-0.2 bg-teal-500/10 border border-teal-500/20 text-[8px] font-extrabold rounded font-mono text-teal-400 uppercase hidden md:block animate-pulse">AI</span>}
                    </button>

                    <button
                      onClick={() => setStudentActiveTab('about')}
                      title={isSidebarMinimized ? "About Us" : ""}
                      className={`flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full text-left whitespace-nowrap ${
                        isSidebarMinimized ? 'md:justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                      } ${
                        studentActiveTab === 'about'
                          ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-md shadow-teal-500/5'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                      }`}
                    >
                      <BookOpen size={14} />
                      {!isSidebarMinimized && <span>About Us</span>}
                    </button>
                  </nav>
                </div>

                {/* Bottom: User Profile Info, Theme Toggle, Settings Cog, & Logout */}
                <div className={`p-4 border-t border-slate-800/80 bg-slate-950/20 hidden md:flex flex-col gap-2.5 ${
                  isSidebarMinimized ? 'items-center px-2' : ''
                }`}>
                  {/* Account Card */}
                  <div className={`flex items-center bg-slate-850/30 p-2 rounded-xl border border-slate-800/50 relative ${
                    isSidebarMinimized ? 'justify-center w-full' : 'gap-2 w-full animate-fade-in'
                  }`}>
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-lg object-cover bg-slate-900 border border-slate-850 shrink-0 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold text-xs uppercase font-mono shrink-0 shadow-sm">
                        {currentUser.name.slice(0, 2)}
                      </div>
                    )}

                    {!isSidebarMinimized ? (
                      <>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[10px] font-bold text-white truncate font-sans">{currentUser.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-teal-500/15 text-teal-400 px-1 rounded border border-teal-500/10">
                              {currentUser.role}
                            </span>
                            <span className="text-[8px] text-slate-500 font-mono truncate">
                              {currentUser.id}
                            </span>
                          </div>
                        </div>
                        {/* Settings Button next to account info */}
                        <button
                          onClick={() => setIsSettingsOpen(true)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-teal-400 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Account Settings"
                        >
                          <Settings size={14} />
                        </button>
                      </>
                    ) : (
                      /* Minimal mode floating/absolute settings badge */
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="absolute -right-1.5 -top-1.5 p-1 bg-slate-800 border border-slate-700 hover:text-teal-400 hover:border-teal-500/35 rounded-full text-slate-400 transition-all cursor-pointer flex items-center justify-center"
                        title="Account Settings"
                      >
                        <Settings size={10} />
                      </button>
                    )}
                  </div>

                  {/* Settings, Theme, Logout Row */}
                  {!isSidebarMinimized ? (
                    <div className="flex items-center gap-1.5 w-full mt-1 pt-1.5 border-t border-slate-800/40 animate-fade-in">
                      <button
                        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                        className="flex-1 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 flex items-center justify-center gap-1 transition-all text-[9px] font-bold font-mono uppercase cursor-pointer"
                        title="Toggle Dark/Light Mode"
                      >
                        {theme === 'dark' ? <Sun size={11} className="text-amber-400" /> : <Moon size={11} className="text-indigo-400" />}
                        <span>Theme</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex-1 py-1.5 bg-slate-850 hover:bg-rose-950/20 text-slate-300 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-950 flex items-center justify-center gap-1 transition-all text-[9px] font-bold font-mono uppercase cursor-pointer"
                      >
                        <LogOut size={11} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 w-full mt-1 pt-1.5 border-t border-slate-800/40">
                      <button
                        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                        className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 flex items-center justify-center transition-all cursor-pointer"
                        title="Toggle Dark/Light Mode"
                      >
                        {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-400" />}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="p-1.5 bg-slate-850 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-950 flex items-center justify-center transition-all cursor-pointer"
                        title="Log Out"
                      >
                        <LogOut size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col relative min-h-[500px]">
                {studentActiveTab === 'dashboard' && (
                  <>
                    {currentUser.role === 'student' && (
                      <StudentDashboard currentUser={currentUser} complaints={allComplaints} setActiveTab={setStudentActiveTab} />
                    )}
                    {currentUser.role === 'committee' && !(currentUser.authority === 'teachers' || currentUser.id === 'staff') && (
                      <CommitteeDashboard currentUser={currentUser} complaints={allComplaints} forcedTab="dashboard" />
                    )}
                    {currentUser.role === 'committee' && (currentUser.authority === 'teachers' || currentUser.id === 'staff') && (
                      <ManagementDashboard currentUser={currentUser} complaints={allComplaints} forcedTab="dashboard" />
                    )}
                    {currentUser.role === 'admin' && (
                      <AdminDashboard currentUser={currentUser} complaints={allComplaints} users={allUsers} forcedTab="analytics" />
                    )}
                    {currentUser.role === 'management' && (
                      <ManagementDashboard currentUser={currentUser} complaints={allComplaints} forcedTab="dashboard" />
                    )}
                  </>
                )}
                {studentActiveTab === 'manage_accounts' && currentUser.role === 'admin' && (
                  <AdminDashboard currentUser={currentUser} complaints={allComplaints} users={allUsers} forcedTab="users" />
                )}
                {studentActiveTab === 'create_account' && currentUser.role === 'admin' && (
                  <AdminDashboard currentUser={currentUser} complaints={allComplaints} users={allUsers} forcedTab="create_account" />
                )}
                {studentActiveTab === 'assignment' && currentUser.role === 'admin' && (
                  <AdminDashboard currentUser={currentUser} complaints={allComplaints} users={allUsers} forcedTab="assignment" />
                )}
                {studentActiveTab === 'logs' && currentUser.role === 'admin' && (
                  <AdminDashboard currentUser={currentUser} complaints={allComplaints} users={allUsers} forcedTab="logs" />
                )}
                {studentActiveTab === 'resolve' && (
                  <ManagementDashboard currentUser={currentUser} complaints={allComplaints} forcedTab="resolve" />
                )}
                {studentActiveTab === 'approving' && (
                  <CommitteeDashboard currentUser={currentUser} complaints={allComplaints} forcedTab="approving" />
                )}
                {studentActiveTab === 'file' && (
                  <StudentComplaintForm currentUser={currentUser} onComplaintSubmitted={handleStudentSubmitComplaint} />
                )}
                {studentActiveTab === 'assistant' && (
                  <div className="flex-1 h-[calc(100vh-140px)] min-h-[550px] p-4 md:p-6 max-w-4xl mx-auto w-full">
                    <ChatBotWidget embedMode={true} />
                  </div>
                )}
                {studentActiveTab === 'about' && (
                  <StudentAboutUs />
                )}

                {/* Floating AI Chat Bot available on other tabs */}
                {studentActiveTab !== 'assistant' && (
                  <ChatBotWidget embedMode={false} />
                )}
              </div>
            </div>

            {/* MANDATORY PASSWORD CHANGE OVERLAY IF FIRST LOGIN */}
            {currentUser.firstLogin && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative animate-fade-in">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center bg-teal-500/10 text-teal-400 p-3 rounded-2xl mb-3 border border-teal-500/20">
                      <Lock size={32} className="stroke-[2.5]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Security Mandate</h2>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      First-time login detected. You must change your default password to protect account integrity before accessing the system.
                    </p>
                  </div>
                  
                  <PasswordChangeScreen
                    currentUser={currentUser}
                    onPasswordChanged={(updatedUser) => {
                      setCurrentUser(updatedUser);
                      localStorage.setItem('smart_campus_user', JSON.stringify(updatedUser));
                    }}
                    embedMode={true}
                  />
                </div>
              </div>
            )}
            {/* ACCOUNT SETTINGS MODAL */}
            {isSettingsOpen && (
              <UserSettingsModal
                currentUser={currentUser}
                onClose={() => setIsSettingsOpen(false)}
                onUpdateUser={(updatedUser) => {
                  setCurrentUser(updatedUser);
                  localStorage.setItem('smart_campus_user', JSON.stringify(updatedUser));
                }}
              />
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 px-6 text-center text-slate-500 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            &copy; 2026 Smart Campus Digitization Initiative. All rights reserved.
          </div>
          <div className="flex gap-4 font-mono text-[11px] text-slate-400">
            <span>Digital Transformation</span>
            <span>&bull;</span>
            <span>Student Welfare</span>
            <span>&bull;</span>
            <span>Smart Campus FixIt MVP</span>
          </div>
        </div>
      </footer>

      {/* Floating Toast Alerts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-teal-500/40 p-4 rounded-xl shadow-2xl flex gap-3 animate-fade-in relative overflow-hidden"
          >
            {/* Background accent line */}
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-teal-500" />
            
            <div className="shrink-0 text-teal-400">
              <BellRing size={18} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white font-sans">{toast.title}</h4>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-normal">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="shrink-0 text-slate-500 hover:text-white transition-colors cursor-pointer text-xs font-mono font-bold self-start"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================
   1. LOGIN SCREEN COMPONENT
   ========================================== */
interface LoginProps {
  onLoginSuccess: (user: User) => void;
  error: string;
  setError: (err: string) => void;
}

function LoginScreen({ onLoginSuccess, error, setError }: LoginProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Sign Up / Registration States
  const [isSignUp, setIsSignUp] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAdmissionNo, setRegAdmissionNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Profile Photo Upload States
  const [regAvatarUrl, setRegAvatarUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, GIF).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size is too large. Max allowed size is 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setRegAvatarUrl(reader.result as string);
        setError('');
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError('Please enter both your Admission Number/ID and password.');
      return;
    }

    setAuthSubmitting(true);
    setError('');

    try {
      // Find the user document in Firestore users collection
      const q = query(collection(db, 'users'), where('id', '==', loginId.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Fallback: If the database is completely empty (due to a previous connection timeout/cold start), seed it now and retry
        const totalUsersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        if (totalUsersSnap.empty) {
          console.log('No users found in database. Attempting on-demand seeding...');
          await seedDatabaseIfEmpty();
          const retrySnap = await getDocs(query(collection(db, 'users'), where('id', '==', loginId.trim())));
          if (!retrySnap.empty) {
            const userDoc = retrySnap.docs[0].data() as User;
            if (userDoc.password !== password) {
              setError('Invalid password. First-time students: Use dh@admission_no (e.g. dh@545)');
              setAuthSubmitting(false);
              return;
            }
            localStorage.setItem('smart_campus_user', JSON.stringify(userDoc));
            onLoginSuccess(userDoc);
            return;
          }
        }
        setError('No account found with this ID/Admission Number.');
        setAuthSubmitting(false);
        return;
      }

      const userDoc = snap.docs[0].data() as User;

      if (userDoc.password !== password) {
        setError('Invalid password. First-time students: Use dh@admission_no (e.g. dh@545)');
        setAuthSubmitting(false);
        return;
      }

      // Successful authentication
      localStorage.setItem('smart_campus_user', JSON.stringify(userDoc));
      onLoginSuccess(userDoc);
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regAdmissionNo.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all the required registration details.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setAuthSubmitting(true);

      // Check if user already exists
      const userQuery = query(collection(db, 'users'), where('id', '==', regAdmissionNo.trim()));
      const snap = await getDocs(userQuery);
      if (!snap.empty) {
        setError('An account with this ID or Admission Number already exists.');
        setAuthSubmitting(false);
        return;
      }

      // Create user document
      const newUser: User = {
        id: regAdmissionNo.trim(),
        admissionNo: regAdmissionNo.trim(),
        name: regName.trim(),
        email: regEmail.trim(),
        avatarUrl: regAvatarUrl.trim(),
        role: 'student',
        password: regPassword,
        firstLogin: false, // chosen by them
        isNew: true, // mark as newly registered for admin dismissal
        status: 'newly_created',
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      
      // Auto login
      localStorage.setItem('smart_campus_user', JSON.stringify(newUser));
      onLoginSuccess(newUser);
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to create account. Please check your network connection.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleToggleSignUp = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setRegAvatarUrl('');
  };

  return (
    <div className="flex-1 flex min-h-[calc(100vh-65px)] bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center p-4 sm:p-6 lg:p-8 z-10 gap-8 lg:gap-16">
        {/* Left Side: Illustration & Branding */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center text-left space-y-8 pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles size={12} className="text-amber-400" />
              Digital Campus &bull; Transparent Maintenance
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.1] font-sans">
              Smart Campus <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">Complaint System</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              A high-fidelity college initiative designed to expedite dorm repairs, classroom troubleshooting, and infrastructure tracking with full stakeholder accountability.
            </p>
          </div>

          {/* Interactive Illustration Grid */}
          <div className="relative p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="grid grid-cols-2 gap-4 relative">
              {/* Stat 1 */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-lg">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white font-mono">98.4%</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Resolution Rate</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white font-mono">24 Mins</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Avg Review Time</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white font-mono">100%</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Verified Solvers</div>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
                  <Wrench size={18} />
                </div>
                <div>
                  <div className="text-lg font-bold text-white font-mono">4.9 / 5</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Student Rating</div>
                </div>
              </div>
            </div>

            {/* Simulated Live Feed Item */}
            <div className="mt-4 p-3 bg-slate-950/50 border border-slate-850 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Dorm 3 Electrical issue assigned to staff...</span>
              </div>
              <span className="text-slate-500 text-[10px]">Just now</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-500 text-xs font-mono">
            <div>&copy; 2026 Smart Campus</div>
            <div>&bull;</div>
            <div>Hackathon Project</div>
          </div>
        </div>

        {/* Right Side: Glassmorphism Login Card */}
        <div className="lg:col-span-6 flex justify-center w-full">
          <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none"></div>
            
            {/* Logo and Headings */}
            <div className="text-center mb-6 animate-fade-in">
              <div className="inline-flex items-center justify-center bg-teal-500/10 text-teal-400 p-3.5 rounded-2xl mb-3 border border-teal-500/20 shadow-inner">
                {isSignUp ? <UserPlus size={32} className="stroke-[2.5]" /> : <Wrench size={32} className="stroke-[2.5]" />}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {isSignUp ? 'Create Account' : 'Access Portal'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isSignUp ? 'Fill in your details to register as a student.' : 'Enter your Admission Number/ID and password to continue.'}
              </p>
            </div>

            {/* Info alerts */}
            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2 items-start animate-fade-in" id="login-error">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isSignUp ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
                    Admission No / Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="e.g. 2024CS045 or admin1"
                      className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono shadow-inner"
                      required
                      id="login-username-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl pl-3.5 pr-10 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono shadow-inner"
                      required
                      id="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Box */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Remember my session</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-teal-500/10 hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="login-submit-btn"
                >
                  {authSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Access Portal</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                <div className="border-t border-slate-800/80 pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSignUp}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold font-mono tracking-wide uppercase transition-all cursor-pointer"
                  >
                    Don't have an account? Create one now
                  </button>
                </div>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-teal-500 transition-all font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    value={regAdmissionNo}
                    onChange={(e) => setRegAdmissionNo(e.target.value)}
                    placeholder="e.g. 2024CS045"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">
                    * This will be your login username.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. john@campus.edu"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono"
                    required
                  />
                </div>

                {/* Profile Photo Option during registration */}
                <div className="space-y-2 border-t border-slate-800/40 pt-3">
                  <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase font-mono">
                    Profile Photo (Optional)
                  </label>
                  <div className="flex items-center gap-3 bg-slate-950/20 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="shrink-0">
                      {regAvatarUrl ? (
                        <div className="relative">
                          <img
                            src={regAvatarUrl}
                            alt="Avatar Preview"
                            className="w-12 h-12 rounded-full object-cover border-2 border-teal-500/50"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setRegAvatarUrl('')}
                            className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-400 transition-all shadow-md cursor-pointer text-[10px] w-4 h-4 flex items-center justify-center animate-fade-in"
                            title="Remove photo"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800/60 border-2 border-dashed border-slate-700/60 flex items-center justify-center text-[10px] text-slate-500 font-mono font-bold uppercase text-center leading-tight">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border border-dashed rounded-xl p-2 text-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-teal-500 bg-teal-500/5'
                            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850/10'
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <ImageIcon size={14} className="mx-auto text-slate-400 mb-0.5" />
                        <p className="text-[10px] font-medium text-slate-300">
                          Drag & drop or <span className="text-teal-400 font-semibold underline">browse</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={regAvatarUrl}
                    onChange={(e) => setRegAvatarUrl(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                      Password
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-teal-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-teal-500/10 hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase font-mono tracking-wider mt-2"
                >
                  {authSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Register & Login</span>
                      <UserPlus size={16} />
                    </>
                  )}
                </button>

                <div className="border-t border-slate-800/80 pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSignUp}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold font-mono tracking-wide uppercase transition-all cursor-pointer"
                  >
                    Already have an account? Log in
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}

/* ==========================================
   2. FORCED PASSWORD CHANGE SCREEN
   ========================================== */
interface PasswordChangeProps {
  currentUser: User;
  onPasswordChanged: (updatedUser: User) => void;
  embedMode?: boolean;
}

function PasswordChangeScreen({ currentUser, onPasswordChanged, embedMode = false }: PasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Strength Validations
  const isMinLength = newPassword.length >= 6;
  const hasLetterAndNumber = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const isNotDefault = newPassword !== `${currentUser.id}@dh` && newPassword !== `dh@${currentUser.id}`;
  const isMatching = newPassword === confirmPassword && confirmPassword !== '';

  const isFormValid = isMinLength && hasLetterAndNumber && isNotDefault && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        password: newPassword,
        firstLogin: false,
      });

      // Update local state in App
      onPasswordChanged({
        ...currentUser,
        password: newPassword,
        firstLogin: false,
      });
    } catch (err) {
      console.error('Password update error:', err);
      setError('Failed to update password. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  if (embedMode) {
    return (
      <div className="text-left animate-fade-in">
        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 transition-all font-mono"
              required
              id="new-password-input-embed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 transition-all font-mono"
              required
              id="confirm-password-input-embed"
            />
          </div>

          {/* Validation Checklist */}
          <div className="bg-slate-950 border border-slate-850/85 p-3 rounded-xl space-y-1.5 text-[11px] text-slate-400">
            <div className="font-bold text-[9px] text-slate-400 tracking-wider uppercase font-mono mb-1">
              Password Requirements:
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isMinLength ? 'bg-teal-400' : 'bg-slate-700'}`}></div>
              <span className={isMinLength ? 'text-slate-300 font-medium' : ''}>At least 6 characters long</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${hasLetterAndNumber ? 'bg-teal-400' : 'bg-slate-700'}`}></div>
              <span className={hasLetterAndNumber ? 'text-slate-300 font-medium' : ''}>Contains both letters and numbers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isNotDefault ? 'bg-teal-400' : 'bg-slate-700'}`}></div>
              <span className={isNotDefault ? 'text-slate-300 font-medium' : ''}>Cannot be default password</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isMatching ? 'bg-teal-400' : 'bg-slate-700'}`}></div>
              <span className={isMatching ? 'text-slate-300 font-medium' : ''}>Passwords match exactly</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isFormValid
                ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
            }`}
            id="password-change-btn-embed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save & Enter Dashboard'
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-6 md:p-8 z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl mb-3 border border-emerald-500/20">
            <Lock size={32} className="stroke-[2.5]" />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Security Checkpoint</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            First-time login detected. You must change your default password to protect account integrity.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
              required
              id="new-password-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
              required
              id="confirm-password-input"
            />
          </div>

          {/* Validation Checklist */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-[11px] text-slate-300 tracking-wider uppercase font-mono mb-1">
              Password Requirements:
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isMinLength ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
              <span className={isMinLength ? 'text-slate-300 font-medium' : ''}>At least 6 characters long</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${hasLetterAndNumber ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
              <span className={hasLetterAndNumber ? 'text-slate-300 font-medium' : ''}>Contains both letters and numbers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isNotDefault ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
              <span className={isNotDefault ? 'text-slate-300 font-medium' : ''}>Cannot be default password</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isMatching ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
              <span className={isMatching ? 'text-slate-300 font-medium' : ''}>Passwords match exactly</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isFormValid
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
            }`}
            id="password-change-btn"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ==========================================
   3. STUDENT DASHBOARD
   ========================================== */
interface StudentDashboardProps {
  currentUser: User;
  complaints: Complaint[];
  setActiveTab?: (tab: 'dashboard' | 'file' | 'assistant' | 'about') => void;
}

function StudentDashboard({ currentUser, complaints, setActiveTab }: StudentDashboardProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Search/Filters for student's own history
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ApprovalStatus | 'resolved'>('All');

  // Filter student's own complaints list
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch =
        c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'All') return matchSearch;
      if (statusFilter === 'resolved') return matchSearch && c.status === 'resolved';
      return matchSearch && c.approvalStatus === statusFilter && c.status !== 'resolved';
    });
  }, [complaints, searchTerm, statusFilter]);

  // Total metrics of student
  const metrics = useMemo(() => {
    return {
      total: complaints.length,
      pending: complaints.filter((c) => c.approvalStatus === 'pending').length,
      approved: complaints.filter((c) => c.approvalStatus === 'approved' && c.status !== 'resolved').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
      rejected: complaints.filter((c) => c.approvalStatus === 'rejected').length,
    };
  }, [complaints]);

  return (
    <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* COLUMN 1: YOUR COMPLAINTS HISTORY (4 COLS) */}
      <div className="xl:col-span-6 flex flex-col gap-4">
        
        {/* Student metrics strip */}
        <div className="grid grid-cols-4 gap-2 bg-slate-900 border border-slate-850 p-4 rounded-2xl">
          <div className="text-center">
            <div className="text-lg md:text-xl font-bold text-white">{metrics.total}</div>
            <div className="text-[9px] text-slate-400 font-medium font-mono uppercase tracking-wider mt-0.5">Filed</div>
          </div>
          <div className="text-center border-l border-slate-800/80">
            <div className="text-lg md:text-xl font-bold text-amber-400">{metrics.pending}</div>
            <div className="text-[9px] text-slate-400 font-medium font-mono uppercase tracking-wider mt-0.5">Pending</div>
          </div>
          <div className="text-center border-l border-slate-800/80">
            <div className="text-lg md:text-xl font-bold text-teal-400">{metrics.approved}</div>
            <div className="text-[9px] text-slate-400 font-medium font-mono uppercase tracking-wider mt-0.5">Approved</div>
          </div>
          <div className="text-center border-l border-slate-800/80">
            <div className="text-lg md:text-xl font-bold text-emerald-400">{metrics.resolved}</div>
            <div className="text-[9px] text-slate-400 font-medium font-mono uppercase tracking-wider mt-0.5">Resolved</div>
          </div>
        </div>

        {/* Complaints List Panel */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[450px]">
          <div className="p-4 border-b border-slate-800/80 flex flex-col gap-3">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
                <History size={15} className="text-teal-400" />
                My Complaints
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time resolution timeline</p>
            </div>

            {/* Search */}
            <div className="relative w-full">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search my tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-teal-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Tab Filters */}
          <div className="bg-slate-950/40 px-3 py-2 border-b border-slate-800/80 flex flex-wrap gap-1">
            {(['All', 'pending', 'approved', 'rejected', 'resolved'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider transition-all ${
                  statusFilter === filter
                    ? 'bg-teal-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'pending' ? 'Pending' : filter === 'approved' ? 'Approved' : filter}
              </button>
            ))}
          </div>

          {/* Tickets list */}
          <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-slate-800/50">
            {filteredComplaints.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <ClipboardList size={28} className="mx-auto mb-2 text-slate-600" />
                <p className="text-[10px] font-semibold uppercase tracking-wider font-mono">No tickets found</p>
                <p className="text-[10px] text-slate-400 mt-1">Submit a new maintenance request on the right</p>
              </div>
            ) : (
              filteredComplaints.map((comp) => {
                const isSelected = selectedComplaint?.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComplaint(isSelected ? null : comp)}
                    className={`p-3.5 transition-all hover:bg-slate-850/50 cursor-pointer flex justify-between items-start gap-3 ${
                      isSelected ? 'bg-slate-850 border-l-2 border-teal-500' : ''
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-extrabold bg-slate-800 text-teal-300 px-1.5 py-0.2 rounded font-mono uppercase">
                          {comp.category}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                          <MapPin size={9} className="text-slate-500" /> {comp.location}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-300 line-clamp-2 leading-normal">
                        {comp.description}
                      </p>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {new Date(comp.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`text-[8px] font-extrabold font-mono uppercase px-1 py-0.2 rounded border ${
                          comp.priority === 'High'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : comp.priority === 'Medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}
                      >
                        {comp.priority}
                      </span>

                      {comp.status === 'resolved' ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-extrabold font-mono uppercase px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 size={8} /> Resolved
                        </span>
                      ) : comp.approvalStatus === 'rejected' ? (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-extrabold font-mono uppercase px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <XCircle size={8} /> Rejected
                        </span>
                      ) : comp.status === 'in progress' ? (
                        <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[8px] font-extrabold font-mono uppercase px-1.5 py-0.2 rounded-full flex items-center gap-0.5 animate-pulse">
                          <Clock size={8} /> In Progress
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-extrabold font-mono uppercase px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Clock size={8} /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 3: LOG FORM & DETAILS DRAWER (4 COLS) */}
      <div className="xl:col-span-6 flex flex-col gap-4">
        
        {/* COMPLAINT DETAILS COMPONENT */}
        {selectedComplaint ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 text-[10px] font-mono bg-slate-950 hover:bg-slate-850 px-2.5 py-1 border border-slate-800 rounded-md transition-all cursor-pointer"
            >
              Log a Complaint
            </button>
            
            <div>
              <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider mb-1 flex items-center gap-1.5">
                <Activity size={15} className="text-teal-400" />
                Ticket Details
              </h3>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest text-teal-400 font-bold">
                ID: {selectedComplaint.id}
              </p>
            </div>

            {/* Context warning for other student's ticket */}
            {selectedComplaint.studentId !== currentUser.id ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-indigo-400 text-[10px] flex gap-2 items-start font-mono">
                <Wrench size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block uppercase mb-0.5">CAMPUS COMMUNITY TICKET</span>
                  <span>This ticket was raised by another student ({selectedComplaint.studentName}) and approved for repair. You are watching public progress in real time.</span>
                </div>
              </div>
            ) : (
              selectedComplaint.approvalStatus === 'approved' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-[10px] flex gap-2 items-center font-mono">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>Your ticket is approved & under active repair. View is read-only.</span>
                </div>
              )
            )}

            {/* Photo preview */}
            {selectedComplaint.imageUrl && (
              <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                <img
                  src={selectedComplaint.imageUrl}
                  alt="Incident Report"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-500 font-mono text-[8px] uppercase tracking-wider mb-0.5">Category</div>
                  <div className="font-semibold text-white">{selectedComplaint.category}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-mono text-[8px] uppercase tracking-wider mb-0.5">Location</div>
                  <div className="font-semibold text-white truncate">{selectedComplaint.location}</div>
                </div>
              </div>

              {selectedComplaint.targetAuthority && (
                <div className="pt-2 border-t border-slate-900 grid grid-cols-1 text-xs">
                  <div>
                    <div className="text-slate-500 font-mono text-[8px] uppercase tracking-wider mb-0.5">Assigned Target Authority</div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase inline-block mt-0.5 ${
                      selectedComplaint.targetAuthority === 'teachers'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
                        : 'bg-violet-500/10 text-violet-400 border border-violet-500/25'
                    }`}>
                      {selectedComplaint.targetAuthority === 'teachers' ? '👨‍🏫 Teachers' : '🏢 Management Committee'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="text-slate-500 font-mono text-[8px] uppercase tracking-wider mb-0.5">Full Description</div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-900">
                <div>
                  <div className="text-slate-500 font-mono text-[8px] uppercase tracking-wider mb-0.5">Priority Level</div>
                  <div className="font-semibold text-white">{selectedComplaint.priority}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-mono text-[8px] uppercase tracking-wider mb-0.5">Date Submitted</div>
                  <div className="font-semibold text-white">
                    {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Status updates / workflow timeline */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Activity size={12} className="text-teal-400" /> Resolution Workflow Status
              </h4>

              <div className="space-y-4 relative pl-4 border-l border-slate-800">
                {/* Step 1: Submission */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/25"></div>
                  <div className="text-xs font-bold text-slate-200">Complaint Logged</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Filed securely with verified details.
                  </div>
                </div>

                {/* Step 2: Approval Committee Decision */}
                <div className="relative">
                  <div
                    className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${
                      selectedComplaint.approvalStatus === 'pending'
                        ? 'bg-slate-700 animate-pulse'
                        : selectedComplaint.approvalStatus === 'approved'
                        ? 'bg-emerald-500 shadow-md'
                        : 'bg-rose-500 shadow-md'
                    }`}
                  ></div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    Approval Committee Evaluation
                    {selectedComplaint.approvalStatus === 'pending' && (
                      <span className="text-[8px] font-bold font-mono uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 py-0.2 rounded">Pending</span>
                    )}
                  </div>
                  
                  {selectedComplaint.approvalStatus === 'approved' && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Approved. Forwarded to Campus Resolver for technician assignment.
                    </div>
                  )}

                  {selectedComplaint.approvalStatus === 'rejected' && (
                    <div className="mt-1 bg-rose-500/10 border border-rose-500/20 p-2 text-[10px] text-rose-300">
                      <div className="font-semibold text-[8px] uppercase tracking-wider font-mono mb-0.5 text-rose-400">Rejection Reason:</div>
                      {selectedComplaint.rejectionReason || 'No reason was provided by reviewers.'}
                    </div>
                  )}
                </div>

                {/* Step 3: Admin Assignment & Repair */}
                {selectedComplaint.approvalStatus === 'approved' && (
                  <div className="relative">
                    <div
                      className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${
                        selectedComplaint.status === 'pending'
                          ? 'bg-slate-700 animate-pulse'
                          : selectedComplaint.status === 'in progress'
                          ? 'bg-sky-500 animate-pulse'
                          : 'bg-emerald-500'
                      }`}
                    ></div>
                    <div className="text-xs font-bold text-slate-200">
                      Repair Execution & Logistics
                    </div>
                    {selectedComplaint.assignedStaff && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Assigned technician: <span className="text-white font-semibold font-mono">{selectedComplaint.assignedStaff}</span>
                      </div>
                    )}
                    <div className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">
                      STATUS: {selectedComplaint.status}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* NO TICKET SELECTED PLACEHOLDER */
          <div className="bg-slate-900/50 border border-slate-850 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 py-16 h-full min-h-[300px]">
            <Wrench size={32} className="text-slate-600 animate-pulse" />
            <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">No Ticket Selected</h4>
            <p className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed">
              Select any ticket from your history list on the left to track its live status, approval details, and tech assignment workflow.
            </p>
            <div className="h-px bg-slate-800 w-12 my-1"></div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab('file')}
                className="py-1.5 px-4 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-teal-300 border border-teal-500/20 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                + File New Ticket
              </button>
            )}
          </div>
        )}
        {false && (
          <div className="hidden">
            <div>
              <div>
                <h3>
                  Log a Maintenance Complaint
                </h3>
                <p>
                  Logged with verified campus student identity
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================
   4. APPROVAL COMMITTEE DASHBOARD
   ========================================== */
interface CommitteeDashboardProps {
  currentUser: User;
  complaints: Complaint[];
  forcedTab?: 'dashboard' | 'approving';
}

function CommitteeDashboard({ currentUser, complaints, forcedTab = 'dashboard' }: CommitteeDashboardProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [targetAuthorityOverride, setTargetAuthorityOverride] = useState<'teachers' | 'management'>('management');

  // Synchronize targetAuthorityOverride when selected complaint changes
  useEffect(() => {
    if (selectedComplaint) {
      setTargetAuthorityOverride(selectedComplaint.targetAuthority || 'management');
    }
  }, [selectedComplaint]);

  // Filter complaints based on committee member's authority if present
  const myComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (currentUser.authority) {
        return c.targetAuthority === currentUser.authority;
      }
      return true;
    });
  }, [complaints, currentUser.authority]);

  // Active pending review complaints
  const pendingQueue = useMemo(() => {
    return myComplaints.filter((c) => c.approvalStatus === 'pending');
  }, [myComplaints]);

  // History of completed reviews
  const reviewedQueue = useMemo(() => {
    return myComplaints.filter((c) => c.approvalStatus !== 'pending');
  }, [myComplaints]);

  // Stats
  const metrics = useMemo(() => {
    return {
      pending: pendingQueue.length,
      approved: myComplaints.filter((c) => c.approvalStatus === 'approved').length,
      rejected: myComplaints.filter((c) => c.approvalStatus === 'rejected').length,
    };
  }, [myComplaints, pendingQueue]);

  // Submitting student's history helper
  const [studentHistory, setStudentHistory] = useState<Complaint[]>([]);
  useEffect(() => {
    if (!selectedComplaint) {
      setStudentHistory([]);
      return;
    }
    // Filter complaints from this same student to detect spam/duplicates
    const history = complaints.filter(
      (c) => c.studentId === selectedComplaint.studentId && c.id !== selectedComplaint.id
    );
    setStudentHistory(history);
  }, [selectedComplaint, complaints]);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedComplaint) return;
    if (decision === 'rejected' && !rejectionReason.trim()) {
      setError('A rejection reason is strictly mandatory to provide constructive feedback.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const complaintRef = doc(db, 'complaints', selectedComplaint.id);
      
      const updateData: Partial<Complaint> = {
        approvalStatus: decision,
      };

      if (decision === 'approved') {
        updateData.targetAuthority = targetAuthorityOverride;
      } else if (decision === 'rejected') {
        updateData.rejectionReason = rejectionReason.trim();
      }

      await updateDoc(complaintRef, updateData);

      // Trigger student and admin/committee notifications
      if (decision === 'approved') {
        await triggerNotification({
          title: '✅ Complaint Approved',
          message: `Your complaint about "${selectedComplaint.category}" was approved and forwarded to the maintenance division.`,
          type: 'status_change',
          complaintId: selectedComplaint.id,
          userId: selectedComplaint.studentId,
        });

        // Inform admin that this is ready for staff assignment
        await triggerNotification({
          title: '🛠️ Ticket Ready for Assignment',
          message: `Complaint for "${selectedComplaint.category}" at "${selectedComplaint.location}" has been approved and requires staff assignment.`,
          type: 'status_change',
          complaintId: selectedComplaint.id,
          roleTarget: 'admin',
        });
      } else if (decision === 'rejected') {
        await triggerNotification({
          title: '❌ Complaint Rejected',
          message: `Your complaint about "${selectedComplaint.category}" was rejected. Reason: ${rejectionReason.trim()}`,
          type: 'rejection',
          complaintId: selectedComplaint.id,
          userId: selectedComplaint.studentId,
        });
      }

      // Create Review Log entry
      const reviewId = 'rev_' + Date.now();
      await setDoc(doc(db, 'committee_reviews', reviewId), {
        id: reviewId,
        complaintId: selectedComplaint.id,
        committeeMemberId: currentUser.id,
        committeeMemberName: currentUser.name,
        decision,
        reason: decision === 'rejected' ? rejectionReason.trim() : 'Approved and forwarded to maintenance',
        timestamp: Date.now(),
      });

      // Clear state and select next in queue if any
      const currentIndex = pendingQueue.findIndex((c) => c.id === selectedComplaint.id);
      const nextTicket =
        pendingQueue.length > 1
          ? pendingQueue[currentIndex + 1] || pendingQueue[currentIndex - 1]
          : null;

      setSelectedComplaint(nextTicket);
      setRejectionReason('');
      setShowRejectForm(false);
    } catch (err) {
      console.error('Error recording review:', err);
      setError('Failed to log review. Check database connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (forcedTab === 'dashboard') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Committee metrics display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center shadow-md">
            <div className="text-4xl font-black text-amber-400">{metrics.pending}</div>
            <div className="text-xs font-bold font-mono uppercase text-slate-400 mt-2">Tickets Awaiting Review</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Legitimacy filter queue</p>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center shadow-md">
            <div className="text-4xl font-black text-emerald-400">{metrics.approved}</div>
            <div className="text-xs font-bold font-mono uppercase text-slate-400 mt-2">Approved Tickets</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Passed to repair dispatch</p>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center shadow-md">
            <div className="text-4xl font-black text-rose-400">{metrics.rejected}</div>
            <div className="text-xs font-bold font-mono uppercase text-slate-400 mt-2">Rejected Tickets</div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Flagged as invalid/spam</p>
          </div>
        </div>

        {/* History of Completed Reviews */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl min-h-[400px] flex flex-col">
          <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/20">
            <div>
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-400" /> My Completed Reviews History
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Audit log of tickets resolved/scrutinized by you</p>
            </div>
            <span className="bg-teal-500/15 border border-teal-500/20 text-teal-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
              {reviewedQueue.length} Tickets
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-850">
            {reviewedQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <ShieldCheck size={36} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs font-bold font-mono uppercase text-slate-400">No review actions taken yet</p>
                <p className="text-[10px] text-slate-500 mt-1">When you approve or reject tickets, they will display here</p>
              </div>
            ) : (
              reviewedQueue.map((comp) => (
                <div key={comp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/10 transition-all">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
                        {comp.category}
                      </span>
                      <span className="text-xs font-bold text-slate-200">#{comp.id.substring(7, 12)}...</span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <MapPin size={10} /> {comp.location}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      "{comp.description}"
                    </p>
                    {comp.rejectionReason && (
                      <p className="text-[10px] text-rose-400 font-mono bg-rose-950/20 px-2 py-1 rounded border border-rose-950/30">
                        Rejection Reason: {comp.rejectionReason}
                      </p>
                    )}
                    <div className="text-[9px] text-slate-500 font-mono">
                      Logged by {comp.studentName} &bull; Reviewed on {new Date(comp.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end gap-1.5 shrink-0 text-right">
                    <span
                      className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                        comp.approvalStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {comp.approvalStatus}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Routed to: {comp.targetAuthority === 'teachers' ? 'Staff/Teachers' : 'Management'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: ACTIVE QUEUES (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        
        {/* Committee metrics display */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-850 p-4 rounded-2xl text-center">
          <div>
            <div className="text-2xl font-black text-amber-400">{metrics.pending}</div>
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase mt-0.5">Pending Review</div>
          </div>
          <div className="border-l border-slate-800/80">
            <div className="text-2xl font-black text-emerald-400">{metrics.approved}</div>
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase mt-0.5">Approved</div>
          </div>
          <div className="border-l border-slate-800/80">
            <div className="text-2xl font-black text-rose-400">{metrics.rejected}</div>
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase mt-0.5">Rejected</div>
          </div>
        </div>

        {/* Pending Review Queue list */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[350px]">
          <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/20">
            <div>
              <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                Pending Review Queue
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Screen complaints to prevent system misuse</p>
            </div>
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-full">
              {pendingQueue.length} Tickets
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[450px] divide-y divide-slate-800/50">
            {pendingQueue.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500/80" />
                <p className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">Queue completely clear</p>
                <p className="text-[11px] text-slate-400 mt-1">All submitted campus complaints are reviewed!</p>
              </div>
            ) : (
              pendingQueue.map((comp) => {
                const isSelected = selectedComplaint?.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setSelectedComplaint(comp);
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    className={`p-4 transition-all hover:bg-slate-850/50 cursor-pointer flex justify-between items-start gap-3 ${
                      isSelected ? 'bg-slate-850 border-l-2 border-amber-400' : ''
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-extrabold bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded font-mono uppercase">
                          {comp.category}
                        </span>
                        {comp.targetAuthority && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                            comp.targetAuthority === 'teachers'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                              : 'bg-violet-500/10 text-violet-400 border border-violet-500/10'
                          }`}>
                            To: {comp.targetAuthority}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-300 truncate font-mono">
                          {comp.studentName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium line-clamp-1">
                        {comp.description}
                      </p>
                      <div className="text-[9px] text-slate-500 font-mono">
                        Location: {comp.location} &bull; Filed {new Date(comp.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        comp.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : comp.priority === 'Medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                      }`}
                    >
                      {comp.priority}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE REVIEW PANEL (7 COLS) */}
      <div className="lg:col-span-7">
        {selectedComplaint ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col gap-4 shadow-xl animate-fade-in relative">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base uppercase font-mono tracking-wide">
                  Complaint Verification Panel
                </h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  TICKET ID: {selectedComplaint.id}
                </p>
              </div>

              <span className="bg-slate-950 text-amber-400 border border-slate-850 px-2.5 py-1 rounded-lg text-xs font-mono uppercase">
                STATUS: PENDING REVIEW
              </span>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo Evidence if present */}
              {selectedComplaint.imageUrl ? (
                <div className="w-full h-48 md:h-full min-h-[160px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                  <img
                    src={selectedComplaint.imageUrl}
                    alt="Evidence Photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-44 rounded-xl border border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-600">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-xs font-mono uppercase font-bold tracking-wider">No Photo Evidence Attached</span>
                </div>
              )}

              {/* Text info fields */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="space-y-1">
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Submitting Student</div>
                  <div className="text-sm font-bold text-white">{selectedComplaint.studentName}</div>
                  <div className="text-[10px] text-teal-400 font-mono">{selectedComplaint.studentId}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Category</div>
                    <div className="font-semibold text-slate-200">{selectedComplaint.category}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Location</div>
                    <div className="font-semibold text-slate-200">{selectedComplaint.location}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 grid grid-cols-1 text-xs">
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider font-bold mb-1.5">Route To Authority</div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setTargetAuthorityOverride('teachers')}
                        className={`px-3 py-2 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                          targetAuthorityOverride === 'teachers'
                            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-md'
                            : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                        }`}
                      >
                        👨‍🏫 Staff (Teachers)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetAuthorityOverride('management')}
                        className={`px-3 py-2 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                          targetAuthorityOverride === 'management'
                            ? 'bg-violet-500/15 text-violet-400 border-violet-500/30 shadow-md'
                            : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                        }`}
                      >
                        🏢 Management
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Priority</div>
                    <span className="text-xs font-bold text-white">{selectedComplaint.priority}</span>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Timestamp</div>
                    <div className="font-semibold text-slate-300">
                      {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">Student Description</div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                "{selectedComplaint.description}"
              </p>
            </div>

            {/* ANTI-SPAM / DUPLICATE IDENTIFICATION: Student Complaint history */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-teal-400 mb-2 flex items-center gap-1.5">
                <History size={12} /> Student Historical Trust Factor
              </h4>
              
              {studentHistory.length === 0 ? (
                <p className="text-[10px] text-emerald-400 font-medium">
                  &bull; This is the student's first registered complaint. No duplicate tickets flagged.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400">
                    &bull; Student has filed <span className="text-white font-bold">{studentHistory.length} other complaints</span> previously:
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 divide-y divide-slate-900 pr-1 text-[10px] font-mono">
                    {studentHistory.map((h) => (
                      <div key={h.id} className="pt-1.5 flex justify-between gap-2">
                        <span className="text-slate-300 truncate font-semibold">
                          #{h.id.substring(7, 12)}... [{h.category}] at {h.location}
                        </span>
                        <span
                          className={
                            h.approvalStatus === 'approved'
                              ? 'text-emerald-400'
                              : h.approvalStatus === 'rejected'
                              ? 'text-rose-400 font-bold'
                              : 'text-amber-400'
                          }
                        >
                          {h.approvalStatus.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DECISION TRIGGER BOX */}
            <div className="border-t border-slate-800/80 pt-4 space-y-3">
              {showRejectForm ? (
                <div className="space-y-3 bg-slate-950 border border-slate-850 p-4 rounded-xl animate-fade-in">
                  <label className="block text-[10px] font-bold text-rose-400 tracking-wider uppercase font-mono">
                    Provide Mandatory Rejection Reason
                  </label>
                  <textarea
                    placeholder="e.g. Duplicate report. Insufficient details provided to dispatch staff. Out of campus jurisdiction..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-rose-500 font-mono"
                    required
                  ></textarea>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason('');
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !rejectionReason.trim()}
                      onClick={() => handleDecision('rejected')}
                      className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Disapprove / Reject Ticket
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDecision('approved')}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Approve & Forward to Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 min-h-[400px] flex flex-col justify-center items-center">
            <ShieldCheck size={44} className="text-slate-700 mb-3" />
            <p className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400">Review Board Desk</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Select a pending campus complaint from the queue on the left to evaluate legitimacy and assign decision.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================
   4.5 CAMPUS MANAGEMENT DASHBOARD
   ========================================== */
interface ManagementDashboardProps {
  currentUser: User;
  complaints: Complaint[];
  forcedTab?: 'dashboard' | 'resolve';
}

function ManagementDashboard({ currentUser, complaints, forcedTab = 'dashboard' }: ManagementDashboardProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [progressNotes, setProgressNotes] = useState('');
  const [assignedStaffInput, setAssignedStaffInput] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Synchronize assignedStaffInput when selected complaint changes
  useEffect(() => {
    if (selectedComplaint) {
      setAssignedStaffInput(selectedComplaint.assignedStaff || '');
    } else {
      setAssignedStaffInput('');
    }
  }, [selectedComplaint]);

  // Only approved complaints relevant to this resolver
  const approvedComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (c.approvalStatus !== 'approved') return false;
      if (currentUser.role === 'committee' && currentUser.authority === 'teachers') {
        return c.targetAuthority === 'teachers';
      }
      if (currentUser.role === 'management') {
        return c.targetAuthority === 'management';
      }
      return true;
    });
  }, [complaints, currentUser]);

  // Search and status filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'pending' | 'in progress' | 'resolved'>('All');

  const filteredComplaints = useMemo(() => {
    return approvedComplaints.filter((c) => {
      const matchesSearch =
        c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'All') return matchesSearch;
      return matchesSearch && c.status === statusFilter;
    });
  }, [approvedComplaints, searchTerm, statusFilter]);

  const metrics = useMemo(() => {
    return {
      total: approvedComplaints.length,
      pending: approvedComplaints.filter((c) => c.status === 'pending').length,
      progress: approvedComplaints.filter((c) => c.status === 'in progress').length,
      resolved: approvedComplaints.filter((c) => c.status === 'resolved').length,
    };
  }, [approvedComplaints]);

  const handleUpdateProgress = async (e: React.FormEvent, newStatus: 'in progress' | 'resolved') => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setUpdatingTicket(true);
    setError('');
    setSuccess('');

    try {
      const complaintRef = doc(db, 'complaints', selectedComplaint.id);
      
      const updateData: Partial<Complaint> = {
        status: newStatus,
        assignedStaff: assignedStaffInput.trim() || '',
      };

      await updateDoc(complaintRef, updateData);

      // Trigger student notification on status change
      await triggerNotification({
        title: newStatus === 'resolved' ? '🎉 Complaint Resolved' : '🛠️ Repair Work In Progress',
        message: newStatus === 'resolved'
          ? `Your complaint about "${selectedComplaint.category}" has been successfully resolved! Notes: ${progressNotes.trim() || 'Verified completed.'}`
          : `Your complaint about "${selectedComplaint.category}" is now being worked on. Assigned technician: ${assignedStaffInput.trim() || 'Desk Resolver'}.`,
        type: 'status_change',
        complaintId: selectedComplaint.id,
        userId: selectedComplaint.studentId,
      });

      // Create a maintenance log
      const logId = 'log_' + Date.now();
      await setDoc(doc(db, 'maintenance_logs', logId), {
        id: logId,
        complaintId: selectedComplaint.id,
        staffName: assignedStaffInput.trim() || currentUser.name,
        repairNotes: progressNotes.trim() || (newStatus === 'resolved' ? 'Issue resolved and verified by resolver.' : 'Progress recorded: active resolution underway.'),
        completionDate: Date.now(),
      });

      // Update local selection
      setSelectedComplaint({
        ...selectedComplaint,
        status: newStatus,
        assignedStaff: assignedStaffInput.trim() || '',
      });

      setSuccess(`Ticket marked as ${newStatus} successfully!`);
      setProgressNotes('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Failed to update complaint progress. Try again.');
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Delete a resolved ticket's log record (available to Staff & Management)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const handleDeleteResolvedLog = async (e: React.MouseEvent, complaintId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this resolved log record permanently? This cannot be undone.')) {
      return;
    }
    setDeletingLogId(complaintId);
    try {
      await deleteDoc(doc(db, 'complaints', complaintId));
      const logsQuery = query(collection(db, 'maintenance_logs'), where('complaintId', '==', complaintId));
      const logsSnapshot = await getDocs(logsQuery);
      await Promise.allSettled(logsSnapshot.docs.map((d: any) => deleteDoc(doc(db, 'maintenance_logs', d.id))));
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint(null);
      }
    } catch (err) {
      console.error('Error deleting resolved log:', err);
      setError('Could not delete this log record.');
    } finally {
      setDeletingLogId(null);
    }
  };

  if (forcedTab === 'dashboard') {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
        
        {/* Quick metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl shadow-md">
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Total Handled Complaints</div>
            <div className="text-3xl font-black text-white mt-1">{metrics.total}</div>
            <div className="text-[10px] text-teal-400 font-mono mt-0.5">Assigned to my queue</div>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl shadow-md">
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Awaiting Action</div>
            <div className="text-3xl font-black text-amber-400 mt-1">{metrics.pending}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Tickets pending response</div>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl shadow-md">
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Active Resolution</div>
            <div className="text-3xl font-black text-sky-400 mt-1">{metrics.progress}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Work in progress</div>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl shadow-md">
            <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Successfully Resolved</div>
            <div className="text-3xl font-black text-emerald-400 mt-1">{metrics.resolved}</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Frictionless closure</div>
          </div>
        </div>

        {/* Complaints list */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl min-h-[400px] flex flex-col">
          <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/20">
            <div>
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <Wrench size={16} className="text-teal-400" /> Handling Complaints Registry
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Database of complaints routed under my authority</p>
            </div>

            {/* Filter / Search bar */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-850 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-teal-500 font-mono w-40"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-850 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="All">All Status</option>
                <option value="pending">Pending</option>
                <option value="in progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-850">
            {filteredComplaints.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Wrench size={36} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs font-bold font-mono uppercase text-slate-400">No matching tickets</p>
                <p className="text-[10px] text-slate-500 mt-1">There are no complaints found matching the current search parameters.</p>
              </div>
            ) : (
              filteredComplaints.map((comp) => (
                <div key={comp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/10 transition-all">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
                        {comp.category}
                      </span>
                      <span className="text-xs font-bold text-slate-200">#{comp.id.substring(7, 12)}...</span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <MapPin size={10} /> {comp.location}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      "{comp.description}"
                    </p>
                    <div className="text-[9px] text-slate-500 font-mono">
                      Logged by {comp.studentName} &bull; Filed on {new Date(comp.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end gap-1.5 shrink-0 text-right">
                    <span
                      className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                        comp.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : comp.status === 'in progress'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {comp.status}
                    </span>
                    {comp.assignedStaff && (
                      <span className="text-[9px] text-slate-400 font-mono">Technician: {comp.assignedStaff}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: APPROVED COMPLAINTS QUEUE (7 COLS) */}
      <div className="lg:col-span-7 flex flex-col gap-4 animate-fade-in">
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 bg-slate-900 border border-slate-850 p-4 rounded-2xl shadow-lg">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-black text-white">{metrics.total}</div>
            <div className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider mt-1">Approved</div>
          </div>
          <div className="text-center border-l border-slate-800/80">
            <div className="text-xl md:text-2xl font-black text-amber-400">{metrics.pending}</div>
            <div className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider mt-1">Pending Action</div>
          </div>
          <div className="text-center border-l border-slate-800/80">
            <div className="text-xl md:text-2xl font-black text-sky-400">{metrics.progress}</div>
            <div className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider mt-1">In Progress</div>
          </div>
          <div className="text-center border-l border-slate-800/80">
            <div className="text-xl md:text-2xl font-black text-emerald-400">{metrics.resolved}</div>
            <div className="text-[9px] text-slate-400 font-bold font-mono uppercase tracking-wider mt-1">Resolved</div>
          </div>
        </div>

        {/* List Card */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[440px] shadow-lg">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/20">
            <div>
              <h3 className="font-extrabold text-white text-sm tracking-tight flex items-center gap-2">
                <Wrench size={16} className="text-teal-400" />
                {currentUser.role === 'management' ? 'MANAGEMENT SERVICE QUEUE' : 'STAFF RESOLVER QUEUE'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {currentUser.role === 'management' 
                  ? 'Approved complaints awaiting management resolution updates'
                  : 'Approved complaints awaiting staff resolution updates'}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-48 shrink-0">
              <input
                type="text"
                placeholder="Search approved..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-3 pr-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-950/40 px-4 py-2 border-b border-slate-800/80 flex flex-wrap gap-1">
            {(['All', 'pending', 'in progress', 'resolved'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold font-mono uppercase tracking-wider transition-all ${
                  statusFilter === filter
                    ? 'bg-teal-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* List queue */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 max-h-[500px]">
            {filteredComplaints.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <ClipboardList size={36} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs font-bold font-mono uppercase text-slate-400">No approved complaints found</p>
                <p className="text-[10px] text-slate-500 mt-1">Filters or search queries returned zero records</p>
              </div>
            ) : (
              filteredComplaints.map((comp) => {
                const isSelected = selectedComplaint?.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComplaint(isSelected ? null : comp)}
                    className={`p-4 transition-all hover:bg-slate-850/50 cursor-pointer flex justify-between items-start gap-4 ${
                      isSelected ? 'bg-slate-850 border-l-2 border-teal-500' : ''
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black bg-slate-850 text-teal-300 px-1.5 py-0.5 rounded border border-slate-750 font-mono uppercase">
                          {comp.category}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <MapPin size={10} /> {comp.location}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {comp.description}
                      </p>
                      <div className="text-[9px] text-slate-500 font-mono">
                        Submitted by {comp.studentName} ({comp.studentId}) &bull; {new Date(comp.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${
                        comp.priority === 'High' ? 'bg-rose-500/15 text-rose-400' : comp.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {comp.priority}
                      </span>

                      {comp.status === 'resolved' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-extrabold font-mono uppercase px-1.5 py-0.5 rounded">
                            Resolved
                          </span>
                          <button
                            onClick={(e) => handleDeleteResolvedLog(e, comp.id)}
                            disabled={deletingLogId === comp.id}
                            title="Delete this log record"
                            id={`delete-resolved-log-${comp.id}`}
                            className="p-1 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white rounded-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : comp.status === 'in progress' ? (
                        <span className="bg-sky-500/15 text-sky-400 text-[9px] font-extrabold font-mono uppercase px-1.5 py-0.5 rounded animate-pulse">
                          In Progress
                        </span>
                      ) : (
                        <span className="bg-amber-500/15 text-amber-400 text-[9px] font-extrabold font-mono uppercase px-1.5 py-0.5 rounded">
                          Approved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: ACTION PANEL & DETAILED TICKET (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col gap-4 animate-fade-in">
        {selectedComplaint ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative animate-fade-in">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 text-[10px] font-mono bg-slate-950 px-2 py-0.5 border border-slate-800 rounded"
            >
              Close
            </button>

            <div>
              <h3 className="font-extrabold text-white text-sm font-mono uppercase tracking-wider mb-0.5">Approved Ticket</h3>
              <p className="text-[10px] text-teal-400 font-mono uppercase tracking-wider">ID: {selectedComplaint.id}</p>
            </div>

            {selectedComplaint.imageUrl && (
              <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <img src={selectedComplaint.imageUrl} alt="Complaint Report" className="w-full h-full object-cover animate-fade-in" />
              </div>
            )}

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-slate-500 text-[9px] font-mono uppercase">Category</div>
                  <div className="font-bold text-white mt-0.5">{selectedComplaint.category}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[9px] font-mono uppercase">Location</div>
                  <div className="font-bold text-white mt-0.5">{selectedComplaint.location}</div>
                </div>
              </div>

              <div>
                <div className="text-slate-500 text-[9px] font-mono uppercase">Description</div>
                <p className="text-slate-300 leading-relaxed mt-0.5 italic">"{selectedComplaint.description}"</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                <div>
                  <div className="text-slate-500 text-[9px] font-mono uppercase">Student Contact</div>
                  <div className="font-bold text-teal-400 mt-0.5">{selectedComplaint.studentName} ({selectedComplaint.studentId})</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[9px] font-mono uppercase">Current Status</div>
                  <div className="font-bold text-white mt-0.5 uppercase font-mono text-[10px] tracking-wider">{selectedComplaint.status}</div>
                </div>
              </div>
            </div>

            {/* ERROR & SUCCESS */}
            {error && <div className="p-3 bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs rounded-xl font-mono animate-fade-in">{error}</div>}
            {success && <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl font-mono animate-fade-in">{success}</div>}

            {/* ACTION PANEL FOR RESOLVERS */}
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  Assigned Staff / Technician (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technician Name - leave empty if none"
                  value={assignedStaffInput}
                  onChange={(e) => setAssignedStaffInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 font-mono mb-2"
                />

                <h4 className="text-[10px] font-black font-mono uppercase tracking-wider text-teal-400">
                  Update Progress Note & Status
                </h4>
                <p className="text-[10px] text-slate-400">
                  Log your current repair progress notes. The logged updates will instantly populate audit records.
                </p>

                <textarea
                  placeholder="Enter dynamic progress / repair details (e.g. Swapped damaged piping, replacement component arrived)..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 font-mono"
                ></textarea>
              </div>

              <div className="flex flex-col gap-2">
                {selectedComplaint.status !== 'resolved' && (
                  <button
                    type="button"
                    disabled={updatingTicket}
                    onClick={(e) => handleUpdateProgress(e, 'in progress')}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-sky-400 border border-slate-800 hover:border-sky-500/50 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all"
                  >
                    Note Active Progress (Set In-Progress)
                  </button>
                )}

                {selectedComplaint.status !== 'resolved' ? (
                  <button
                    type="button"
                    disabled={updatingTicket}
                    onClick={(e) => handleUpdateProgress(e, 'resolved')}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Mark as Resolved (Show Resolved)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase font-mono tracking-wider flex items-center justify-center gap-1.5 opacity-90 cursor-default"
                  >
                    <CheckCircle2 size={14} /> Resolved (Green Button)
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 min-h-[440px] flex flex-col justify-center items-center">
            <Wrench size={40} className="text-slate-700 mb-3 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 font-black">
              {currentUser.role === 'management' ? 'Management Inspector Control' : 'Staff Resolver Control'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Select an approved complaint ticket from the service queue to log maintenance milestones and finalize resolution tracking.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

/* ==========================================
   5. ADMINISTRATOR DASHBOARD
   ========================================== */
interface AdminDashboardProps {
  currentUser: User;
  complaints: Complaint[];
  users: User[];
  forcedTab?: 'analytics' | 'assignment' | 'users' | 'logs' | 'manage_accounts' | 'create_account';
}

function AdminDashboard({ currentUser, complaints, users, forcedTab }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'assignment' | 'users' | 'logs' | 'manage_accounts' | 'create_account'>('analytics');

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);
  
  // States
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [assignedStaff, setAssignedStaff] = useState(TECHNICIANS[0]);
  const [customStaffName, setCustomStaffName] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [error, setError] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Log auto-delete retention settings
  const [retentionIntervalDays, setRetentionIntervalDays] = useState<number>(0); // 0 = Never / disabled
  const [savingRetention, setSavingRetention] = useState(false);
  const [retentionSaved, setRetentionSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'log_retention'));
        if (snap.exists()) {
          const data = snap.data() as { enabled: boolean; intervalDays: number };
          setRetentionIntervalDays(data.enabled ? data.intervalDays : 0);
        }
      } catch (err) {
        console.warn('Could not load log retention settings:', err);
      }
    })();
  }, []);

  const handleSaveRetention = async (days: number) => {
    setSavingRetention(true);
    setRetentionSaved(false);
    try {
      await setDoc(doc(db, 'settings', 'log_retention'), {
        id: 'log_retention',
        enabled: days > 0,
        intervalDays: days,
        lastRunAt: 0, // reset so the new policy is applied on the next load
      });
      setRetentionIntervalDays(days);
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 3000);
    } catch (err) {
      console.error('Error saving log retention settings:', err);
      setError('Could not save the auto-delete schedule.');
    } finally {
      setSavingRetention(false);
    }
  };

  const syncStaffState = (staffVal: string) => {
    if (!staffVal) {
      setAssignedStaff(TECHNICIANS[0]);
      setCustomStaffName('');
    } else if (TECHNICIANS.includes(staffVal)) {
      setAssignedStaff(staffVal);
      setCustomStaffName('');
    } else {
      setAssignedStaff('Other');
      setCustomStaffName(staffVal);
    }
  };

  const activeSelectedComplaint = useMemo(() => {
    if (!selectedComplaint) return null;
    return complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint;
  }, [selectedComplaint, complaints]);

  useEffect(() => {
    setShowAssignForm(false);
    if (selectedComplaint) {
      const active = complaints.find((c) => c.id === selectedComplaint.id) || selectedComplaint;
      syncStaffState(active.assignedStaff || '');
    }
  }, [selectedComplaint, complaints]);

  // Account creation form
  const [newName, setNewName] = useState('');
  const [newAdmissionNo, setNewAdmissionNo] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'staff' | 'approval' | 'management' | 'admin'>('student');
  const [userSuccess, setUserSuccess] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'newly_created'>('all');
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);

  // Filter queues
  const approvedQueue = useMemo(() => {
    return complaints.filter((c) => c.approvalStatus === 'approved' && c.status !== 'resolved');
  }, [complaints]);

  const resolvedLogs = useMemo(() => {
    return complaints.filter((c) => c.status === 'resolved');
  }, [complaints]);

  const newlyCreatedCount = useMemo(() => {
    return users.filter((u) => u.isNew === true || u.status === 'newly_created').length;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((usr) => {
      if (userFilter === 'newly_created') {
        return usr.isNew === true || usr.status === 'newly_created';
      }
      return true;
    });
  }, [users, userFilter]);

  // Recalculate charts dataset
  const chartsData = useMemo(() => {
    // 1. Category breakdown
    const categories: { [key: string]: number } = {};
    complaints.forEach((c) => {
      categories[c.category] = (categories[c.category] || 0) + 1;
    });
    const categoryData = Object.keys(categories).map((k) => ({
      name: k,
      Complaints: categories[k],
    }));

    // 2. Status distribution
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const progress = complaints.filter((c) => c.status === 'in progress').length;
    const pendingReview = complaints.filter((c) => c.approvalStatus === 'pending').length;
    const approvedWaiting = complaints.filter((c) => c.approvalStatus === 'approved' && c.status === 'pending').length;
    const rejected = complaints.filter((c) => c.approvalStatus === 'rejected').length;

    const statusData = [
      { name: 'Pending Review', value: pendingReview, color: '#f59e0b' },
      { name: 'Approved (Waiting)', value: approvedWaiting, color: '#38bdf8' },
      { name: 'In Progress', value: progress, color: '#0ea5e9' },
      { name: 'Resolved', value: resolved, color: '#10b981' },
      { name: 'Rejected', value: rejected, color: '#f43f5e' },
    ].filter((item) => item.value > 0);

    return { categoryData, statusData };
  }, [complaints]);

  // Admin Actions: Assign Staff or Resolve
  const handleAssignment = async (e: React.FormEvent, type: 'assign' | 'resolve') => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const finalStaff = assignedStaff === 'Other' ? customStaffName.trim() : assignedStaff;
    if (!finalStaff) {
      setError('Please select or specify a valid staff name.');
      return;
    }

    setUpdatingTicket(true);
    setError('');

    try {
      const complaintRef = doc(db, 'complaints', selectedComplaint.id);
      
      const updateData: Partial<Complaint> = {
        assignedStaff: finalStaff,
        status: type === 'resolve' ? 'resolved' : 'in progress',
      };

      await updateDoc(complaintRef, updateData);

      // Trigger student notification on status or staff assignment change
      await triggerNotification({
        title: type === 'resolve' ? '🎉 Complaint Resolved' : '🛠️ Staff Assigned',
        message: type === 'resolve'
          ? `Your complaint about "${selectedComplaint.category}" has been resolved by ${finalStaff}. Notes: ${repairNotes.trim() || 'Verified completed.'}`
          : `Your complaint about "${selectedComplaint.category}" has been assigned to ${finalStaff} and is now in progress.`,
        type: 'status_change',
        complaintId: selectedComplaint.id,
        userId: selectedComplaint.studentId,
      });

      // Log maintenance action if resolved
      if (type === 'resolve') {
        const logId = 'log_' + Date.now();
        await setDoc(doc(db, 'maintenance_logs', logId), {
          id: logId,
          complaintId: selectedComplaint.id,
          staffName: finalStaff,
          repairNotes: repairNotes.trim() || 'Repairs completed. Tested and fully functional.',
          completionDate: Date.now(),
        });
      }

      setRepairNotes('');
      if (type === 'resolve') {
        setSelectedComplaint(null);
      } else {
        setShowAssignForm(false);
      }
    } catch (err) {
      console.error('Error updating assignment:', err);
      setError('Could not update complaint ticket.');
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Admin Actions: Provision User Account
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = newAdmissionNo.trim();
    if (!newName.trim() || !newEmail.trim() || !targetId) {
      setError('Please fill in name, email, and ID/admission number.');
      return;
    }

    setError('');
    setUserSuccess(false);

    try {
      // Default password: "dh@id" or "id@dh"
      const defaultPassword = `dh@${targetId}`;

      const newUser: User = {
        id: targetId,
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole === 'staff' || newRole === 'approval' ? 'committee' : (newRole === 'admin' ? 'admin' : (newRole === 'management' ? 'management' : 'student')),
        password: defaultPassword,
        firstLogin: newRole === 'student', // Force password change only for student accounts
      };

      if (newRole === 'student') {
        newUser.admissionNo = targetId;
      }
      if (newRole === 'staff') {
        newUser.authority = 'teachers';
      }

      await setDoc(doc(db, 'users', targetId), newUser);

      // Clean form fields
      setNewName('');
      setNewAdmissionNo('');
      setNewEmail('');
      setUserSuccess(true);
      setTimeout(() => setUserSuccess(false), 5000);
    } catch (err) {
      console.error('Error provisioning user:', err);
      setError('Failed to provision account in Firestore.');
    }
  };

  // Admin Actions: Delete User Account
  const handleConfirmDelete = async (userId: string) => {
    try {
      setError('');
      await deleteDoc(doc(db, 'users', userId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Could not delete user account.');
    }
  };

  // Admin Actions: Verify User Account (approved & no longer new)
  const handleVerifyUser = async (userId: string) => {
    try {
      setError('');
      await updateDoc(doc(db, 'users', userId), {
        isNew: false,
        status: 'verified'
      });
    } catch (err) {
      console.error('Error verifying user:', err);
      setError('Could not verify user account.');
    }
  };

  // Admin Actions: Dismiss User Account (rejects/deletes newly created student registration)
  const handleConfirmDismiss = async (userId: string) => {
    try {
      setError('');
      await deleteDoc(doc(db, 'users', userId));
      setConfirmDismissId(null);
    } catch (err) {
      console.error('Error dismissing user:', err);
      setError('Could not dismiss user account.');
    }
  };

  // Admin Actions: Delete Specific Maintenance Log
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const handleDeleteSpecificLog = async (complaintId: string) => {
    if (!window.confirm("Are you sure you want to delete this maintenance log record? This will permanently delete the ticket and its audit logs.")) {
      return;
    }
    setDeletingLogId(complaintId);
    try {
      setError('');
      await deleteDoc(doc(db, 'complaints', complaintId));

      // Query and delete matching maintenance_logs
      const logsQuery = query(collection(db, 'maintenance_logs'), where('complaintId', '==', complaintId));
      const logsSnapshot = await getDocs(logsQuery);
      for (const d of logsSnapshot.docs) {
        await deleteDoc(doc(db, 'maintenance_logs', d.id));
      }
    } catch (err) {
      console.error('Error deleting maintenance log:', err);
      setError('Could not delete the maintenance log. Please try again.');
    } finally {
      setDeletingLogId(null);
    }
  };

  // Admin Actions: Clear All Maintenance Logs
  const [clearingLogs, setClearingLogs] = useState(false);
  const handleClearAllLogs = async () => {
    if (!window.confirm("Are you sure you want to clear ALL resolved maintenance logs? This action is permanent and irreversible.")) {
      return;
    }
    setClearingLogs(true);
    setError('');
    // Run deletions in parallel per-log rather than one giant sequential
    // await chain, and use allSettled so one failed record doesn't abort
    // the rest of the batch (which is what made "Clear All Logs" look
    // like it silently did nothing if any single delete failed).
    const results = await Promise.allSettled(
      resolvedLogs.map(async (log) => {
        await deleteDoc(doc(db, 'complaints', log.id));
        const logsQuery = query(collection(db, 'maintenance_logs'), where('complaintId', '==', log.id));
        const logsSnapshot = await getDocs(logsQuery);
        await Promise.allSettled(
          logsSnapshot.docs.map((d: any) => deleteDoc(doc(db, 'maintenance_logs', d.id)))
        );
      })
    );
    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      console.error('Some logs failed to clear:', results.filter((r) => r.status === 'rejected'));
      setError(`Cleared ${results.length - failedCount} of ${results.length} logs. ${failedCount} could not be deleted — please retry.`);
    }
    setClearingLogs(false);
  };

  // Quick statistics totals
  const totalReports = complaints.length;
  const approvedPercentage = totalReports > 0
    ? Math.round((complaints.filter((c) => c.approvalStatus === 'approved').length / totalReports) * 100)
    : 0;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-5">
      
      {/* ERROR DISPLAY */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Total Filed Complaints</div>
              <div className="text-3xl font-black text-white mt-1">{totalReports}</div>
              <div className="text-[10px] text-teal-400 font-mono mt-0.5">Digitized Ticket Streams</div>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Committee Approval Rate</div>
              <div className="text-3xl font-black text-amber-400 mt-1">{approvedPercentage}%</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Filter out malicious reports</div>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Active Repair Queue</div>
              <div className="text-3xl font-black text-sky-400 mt-1">
                {complaints.filter((c) => c.status === 'in progress').length}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Currently being resolved</div>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Total Completed Repairs</div>
              <div className="text-3xl font-black text-emerald-400 mt-1">
                {resolvedLogs.length}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Frictionless closure</div>
            </div>
          </div>

          {/* Recharts Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Category Breakdown (8 cols) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col min-h-[350px]">
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <BookOpen size={16} className="text-teal-400" /> Maintenance Reports by Category
              </h3>

              <div className="flex-1 min-h-[250px]">
                {chartsData.categoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No data logged yet to display charts.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" />
                      <XAxis dataKey="name" stroke="var(--slate-500)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--slate-500)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--slate-900)', borderColor: 'var(--slate-800)', color: 'var(--slate-100)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Bar dataKey="Complaints" fill="var(--teal-500)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Status Breakdown (4 cols) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col min-h-[350px]">
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Activity size={16} className="text-teal-400" /> Status Distribution
              </h3>

              <div className="flex-1 min-h-[180px] flex items-center justify-center relative">
                {chartsData.statusData.length === 0 ? (
                  <div className="text-slate-500 text-xs">No reports yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartsData.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartsData.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--slate-900)', borderColor: 'var(--slate-800)', color: 'var(--slate-100)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Status legends custom */}
              <div className="mt-4 space-y-1.5 text-[10px] font-mono">
                {chartsData.statusData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-bold text-white">{item.value} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PENDING ASSIGNMENT */}
      {activeTab === 'assignment' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          {/* Approved Queue list */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/20">
              <div>
                <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList size={16} className="text-teal-400" />
                  Staff Assignment Queue
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Approved complaints needing repairs</p>
              </div>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-full">
                {approvedQueue.length} Ready
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-slate-800/50">
              {approvedQueue.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500/80" />
                  <p className="text-xs font-bold uppercase tracking-wider font-mono text-slate-300">All Repairs Dispatched</p>
                  <p className="text-[11px] text-slate-400 mt-1">There are no approved complaints awaiting technicians!</p>
                </div>
              ) : (
                approvedQueue.map((comp) => {
                  const isSelected = selectedComplaint?.id === comp.id;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        setSelectedComplaint(comp);
                        syncStaffState(comp.assignedStaff || '');
                      }}
                      className={`p-4 transition-all hover:bg-slate-850/50 cursor-pointer flex justify-between items-start gap-3 ${
                        isSelected ? 'bg-slate-850 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-extrabold bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase">
                            {comp.category}
                          </span>
                          {comp.targetAuthority && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                              comp.targetAuthority === 'teachers'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                                : 'bg-violet-500/10 text-violet-400 border border-violet-500/10'
                            }`}>
                              To: {comp.targetAuthority}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {comp.location}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 line-clamp-1 leading-relaxed">
                          {comp.description}
                        </p>
                        <div className="text-[9px] text-slate-500 font-mono">
                          Approved by reviewers &bull; Logged by {comp.studentName}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-bold font-mono px-1 py-0.5 rounded border uppercase ${
                            comp.priority === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : comp.priority === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          }`}
                        >
                          {comp.priority}
                        </span>

                        <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-mono uppercase px-1 py-0.2 font-semibold">
                          {comp.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Assignment controls */}
          <div className="lg:col-span-7">
            {activeSelectedComplaint ? (
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col gap-4 shadow-xl animate-fade-in">
                
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider">
                      Staff Logistics Desk
                    </h3>
                    <p className="text-[10px] text-teal-400 font-mono font-bold">
                      TICKET ID: {activeSelectedComplaint.id}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="text-[10px] font-mono text-slate-400 hover:text-slate-200 bg-slate-950 px-2 py-0.8 rounded border border-slate-850"
                  >
                    Cancel
                  </button>
                </div>

                {/* Complaint Info Block */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2.5 text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div>
                      <span className="text-slate-500 block uppercase">Category</span>
                      <span className="text-white font-bold text-xs">{activeSelectedComplaint.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase">Campus Location</span>
                      <span className="text-white font-bold text-xs">{activeSelectedComplaint.location}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-mono text-[9px] block uppercase">Student Complaint</span>
                    <p className="text-slate-200 font-medium">"{activeSelectedComplaint.description}"</p>
                  </div>
                </div>

                {/* Assignment Controls */}
                {activeSelectedComplaint.assignedStaff && !showAssignForm ? (
                  /* Display Assigned Staff Name & Add Option */
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in">
                    <div>
                      <span className="text-slate-500 font-mono text-[9px] block uppercase font-bold tracking-wider">Assigned Staff / Technician</span>
                      <span className="text-teal-400 font-mono font-extrabold text-sm flex items-center gap-2 mt-1">
                        <Wrench size={14} className="animate-pulse" />
                        {activeSelectedComplaint.assignedStaff}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAssignForm(true)}
                      className="px-3.5 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 hover:border-teal-500/40 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>+ Add Staff</span>
                    </button>
                  </div>
                ) : (
                  /* Form to Assign Staff */
                  <form onSubmit={(e) => handleAssignment(e, 'assign')} className="space-y-4 animate-fade-in bg-slate-950/20 p-4 rounded-xl border border-slate-850/60">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                          {activeSelectedComplaint.assignedStaff ? 'Reassign / Add New Staff' : 'Assign Specialized Technician'}
                        </label>
                        {activeSelectedComplaint.assignedStaff && (
                          <button
                            type="button"
                            onClick={() => setShowAssignForm(false)}
                            className="text-[9px] font-mono text-slate-400 hover:text-white cursor-pointer underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <select
                        value={assignedStaff}
                        onChange={(e) => setAssignedStaff(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-teal-500 font-mono"
                      >
                        {TECHNICIANS.map((staff) => (
                          <option key={staff} value={staff}>
                            {staff}
                          </option>
                        ))}
                        <option value="Other">Other / Custom Staff Name...</option>
                      </select>

                      {assignedStaff === 'Other' && (
                        <div className="space-y-1.5 mt-2.5 animate-fade-in">
                          <label className="block text-[10px] font-bold text-teal-400 tracking-wider uppercase font-mono">
                            Type Staff / Person Name
                          </label>
                          <input
                            type="text"
                            value={customStaffName}
                            onChange={(e) => setCustomStaffName(e.target.value)}
                            placeholder="Enter custom name (e.g. John Doe, External Agent)"
                            className="w-full bg-slate-950 border border-teal-500/30 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-teal-500 font-mono"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={updatingTicket}
                        className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-teal-400 border border-slate-800 hover:border-teal-500/50 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        {updatingTicket ? 'Updating...' : (activeSelectedComplaint.assignedStaff ? 'Update / Reassign Staff' : 'Assign Staff & Set In-Progress')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Resolve directly box */}
                <div className="border-t border-slate-800 pt-4 mt-1 space-y-3">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-rose-400">
                    Close Out Ticket (Resolve Problem)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    If repairs are finished, log notes and close the ticket. The submitting student will receive instant feedback.
                  </p>

                  <textarea
                    placeholder="Enter technician log notes (e.g. Swapped the damaged wire, faucet valve replaced completely)..."
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 font-mono"
                  ></textarea>

                  <button
                    type="button"
                    disabled={updatingTicket}
                    onClick={(e) => handleAssignment(e as any, 'resolve')}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                  >
                    <CheckCircle2 size={16} /> Mark Ticket as Resolved & Closed
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 min-h-[400px] flex flex-col justify-center items-center">
                <Wrench size={44} className="text-slate-700 mb-3" />
                <p className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 font-black">Staff Assignment Center</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Select an approved campus ticket from the queue on the left to allocate campus technicians or close/resolve maintenance tasks.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB CONTENT: CREATE ACCOUNT ONLY */}
      {activeTab === 'create_account' && (
        <div className="max-w-xl mx-auto w-full bg-slate-900 border border-slate-850 p-6 rounded-2xl flex flex-col gap-4 shadow-xl animate-fade-in">
          <div>
            <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <UserPlus size={18} className="text-teal-400" />
              Register New Account
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Automatically configures profiles and default credentials for chosen roles
            </p>
          </div>

          {userSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2 items-start animate-fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>Account created! {newRole === 'student' ? 'A mandatory password change is required on their first login.' : ''} Default password: dh@ID</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                Account Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="approval">Approval (Committee)</option>
                <option value="management">Management</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Amit Kumar"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                Official Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. amit.kumar@college.edu"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                {newRole === 'student' ? 'College Admission Number' : 'Account User ID / Username'}
              </label>
              <input
                type="text"
                placeholder={newRole === 'student' ? 'e.g. 2024CS101' : 'e.g. staff_amit'}
                value={newAdmissionNo}
                onChange={(e) => setNewAdmissionNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                required
              />
              <span className="text-[9px] text-slate-500 mt-1 block font-mono">
                * Default Password will be set as: <span className="text-teal-400">dh@{newAdmissionNo.trim() || 'ID'}</span>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-wider cursor-pointer"
            >
              Create Account
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: MANAGE ACCOUNTS ONLY */}
      {activeTab === 'manage_accounts' && (
        <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl min-h-[400px] flex flex-col animate-fade-in">
          <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/20">
            <div>
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-teal-400" /> Registered Accounts List
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Database of verified campus users</p>
            </div>
            <span className="bg-teal-500/15 border border-teal-500/20 text-teal-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
              {users.length} Users Total
            </span>
          </div>

          {/* Sub-tab segmented filter */}
          <div className="bg-slate-950/40 px-4 py-2.5 border-b border-slate-800/80 flex justify-between items-center gap-4">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  userFilter === 'all'
                    ? 'bg-teal-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850/20'
                }`}
              >
                All Accounts
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('newly_created')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 relative ${
                  userFilter === 'newly_created'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850/20'
                }`}
              >
                <span>Newly Created Accounts</span>
                {newlyCreatedCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black font-mono ${
                    userFilter === 'newly_created' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {newlyCreatedCount}
                  </span>
                )}
              </button>
            </div>
            {userFilter === 'newly_created' && (
              <span className="text-[10px] text-amber-400/95 font-mono italic hidden sm:inline">
                * Review and Dismiss new registrations if they are spam
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[550px] divide-y divide-slate-850">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users size={36} className="mx-auto mb-2 text-slate-700 animate-pulse" />
                <p className="text-xs font-bold font-mono uppercase text-slate-400">No matching accounts found</p>
                <p className="text-[10px] text-slate-500 mt-1">There are no accounts in this segment category.</p>
              </div>
            ) : (
              filteredUsers.map((usr) => (
                <div key={usr.id} className="p-4 flex justify-between items-center gap-4 hover:bg-slate-850/20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    {usr.avatarUrl ? (
                      <img
                        src={usr.avatarUrl}
                        alt={usr.name}
                        className="w-8 h-8 rounded-full border border-teal-500/40 object-cover bg-slate-900 shadow-inner shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-teal-400 border border-slate-700 shrink-0 font-mono">
                        {usr.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{usr.name}</span>
                        <span className="text-[9px] font-mono text-slate-500">ID: {usr.id}</span>
                        {(usr.isNew || usr.status === 'newly_created') && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold font-mono uppercase px-1.5 py-0.2 rounded animate-pulse">
                            New Registration
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{usr.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {usr.admissionNo && (
                      <span className="bg-slate-950 border border-slate-850 text-slate-400 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded">
                        {usr.admissionNo}
                      </span>
                    )}

                    <span
                      className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase ${
                        getRoleDisplayName(usr) === 'Administrator'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : getRoleDisplayName(usr) === 'Approval'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : getRoleDisplayName(usr) === 'Staff'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : getRoleDisplayName(usr) === 'Management'
                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {getRoleDisplayName(usr)}
                    </span>

                    {/* Newly Created Accounts Verification and Dismissal Actions */}
                    {usr.id !== currentUser.id && (usr.isNew || usr.status === 'newly_created') && (
                      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-850">
                        {confirmDismissId === usr.id ? (
                          <div className="flex items-center gap-1 animate-fade-in">
                            <button
                              onClick={() => handleConfirmDismiss(usr.id)}
                              className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                              title="Confirm account dismissal"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDismissId(null)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleVerifyUser(usr.id)}
                              className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded border border-emerald-500/20 hover:border-transparent text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                              title="Verify/Keep Student Account"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => setConfirmDismissId(usr.id)}
                              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded border border-rose-500/20 hover:border-transparent text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                              title="Dismiss and Delete Student Account"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Standard Delete Account Button */}
                    {usr.id !== currentUser.id && !(usr.isNew || usr.status === 'newly_created') && (
                      <div className="flex items-center gap-1.5 ml-1">
                        {confirmDeleteId === usr.id ? (
                          <div className="flex items-center gap-1 animate-fade-in">
                            <button
                              onClick={() => handleConfirmDelete(usr.id)}
                              className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                              title="Confirm account deletion"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(usr.id)}
                            className="p-1.5 bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-center"
                            title="Delete user account"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MANAGE ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Create new accounts form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-850 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div>
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <UserPlus size={18} className="text-teal-400" />
                Register New Account
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Automatically configures profiles and default credentials for chosen roles
              </p>
            </div>

            {userSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2 items-start animate-fade-in">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>Account created! {newRole === 'student' ? 'A mandatory password change is required on their first login.' : ''} Default password: dh@ID</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                  Account Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="approval">Approval (Committee)</option>
                  <option value="management">Management</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hashir Ahmad"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. hashir.a@college.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <div className="animate-fade-in">
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 font-mono">
                  {newRole === 'student' ? 'College Admission Number' : 'Account User ID / Username'}
                </label>
                <input
                  type="text"
                  placeholder={newRole === 'student' ? 'e.g. 2024CS101' : 'e.g. staff_amit'}
                  value={newAdmissionNo}
                  onChange={(e) => setNewAdmissionNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
                <span className="text-[9px] text-slate-500 mt-1 block font-mono">
                  * Default Password will be set as: <span className="text-teal-400">dh@{newAdmissionNo.trim() || 'ID'}</span>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-wider cursor-pointer"
              >
                Create Account
              </button>
            </form>
          </div>

          {/* List of registered accounts */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/20">
              <div>
                <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-teal-400" /> Registered Accounts List
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Database of verified campus users</p>
              </div>
              <span className="bg-teal-500/15 border border-teal-500/20 text-teal-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                {users.length} Users Total
              </span>
            </div>

            {/* Sub-tab segmented filter */}
            <div className="bg-slate-950/40 px-4 py-2 border-b border-slate-800/80 flex justify-between items-center gap-4">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setUserFilter('all')}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    userFilter === 'all'
                      ? 'bg-teal-500 text-slate-950 font-extrabold shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850/20'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilter('newly_created')}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 relative ${
                    userFilter === 'newly_created'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850/20'
                  }`}
                >
                  <span>Newly Created</span>
                  {newlyCreatedCount > 0 && (
                    <span className={`px-1 py-0.2 rounded-full text-[8px] font-black font-mono ${
                      userFilter === 'newly_created' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                    }`}>
                      {newlyCreatedCount}
                    </span>
                  )}
                </button>
              </div>
              {userFilter === 'newly_created' && (
                <span className="text-[9px] text-amber-400/90 font-mono italic hidden xl:inline">
                  * Dismiss if spam
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-slate-850">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Users size={32} className="mx-auto mb-2 text-slate-700 animate-pulse" />
                  <p className="text-xs font-bold font-mono uppercase text-slate-400">No matching accounts</p>
                </div>
              ) : (
                filteredUsers.map((usr) => (
                  <div key={usr.id} className="p-4 flex justify-between items-center gap-4 hover:bg-slate-850/20 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      {usr.avatarUrl ? (
                        <img
                          src={usr.avatarUrl}
                          alt={usr.name}
                          className="w-8 h-8 rounded-full border border-teal-500/40 object-cover bg-slate-900 shadow-inner shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-teal-400 border border-slate-700 shrink-0 font-mono">
                          {usr.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{usr.name}</span>
                          <span className="text-[9px] font-mono text-slate-500">ID: {usr.id}</span>
                          {(usr.isNew || usr.status === 'newly_created') && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold font-mono uppercase px-1 py-0.2 rounded animate-pulse">
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{usr.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {usr.admissionNo && (
                        <span className="bg-slate-950 border border-slate-850 text-slate-400 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded">
                          {usr.admissionNo}
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase ${
                          getRoleDisplayName(usr) === 'Administrator'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : getRoleDisplayName(usr) === 'Approval'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : getRoleDisplayName(usr) === 'Staff'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : getRoleDisplayName(usr) === 'Management'
                            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {getRoleDisplayName(usr)}
                      </span>

                      {/* Newly Created Actions */}
                      {usr.id !== currentUser.id && (usr.isNew || usr.status === 'newly_created') && (
                        <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-850">
                          {confirmDismissId === usr.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button
                                onClick={() => handleConfirmDismiss(usr.id)}
                                className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                                title="Confirm account dismissal"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDismissId(null)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleVerifyUser(usr.id)}
                                className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded border border-emerald-500/20 hover:border-transparent text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                                title="Verify/Keep Account"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => setConfirmDismissId(usr.id)}
                                className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded border border-rose-500/20 hover:border-transparent text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                                title="Dismiss Account"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Standard Delete Account Button */}
                      {usr.id !== currentUser.id && !(usr.isNew || usr.status === 'newly_created') && (
                        <div className="flex items-center gap-1.5 ml-1">
                          {confirmDeleteId === usr.id ? (
                            <div className="flex items-center gap-1 animate-fade-in">
                              <button
                                onClick={() => handleConfirmDelete(usr.id)}
                                className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                                title="Confirm account deletion"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold font-mono transition-all uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(usr.id)}
                              className="p-1.5 bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-center"
                              title="Delete user account"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: MAINTENANCE LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-xl min-h-[400px] flex flex-col">
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-teal-400" /> Campus Maintenance Audit Records
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Chronological list of resolved complaints and repair actions</p>
            </div>
            {resolvedLogs.length > 0 && (
              <button
                onClick={handleClearAllLogs}
                disabled={clearingLogs}
                id="clear-all-logs-btn"
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-[10px] font-mono font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} />
                <span>{clearingLogs ? 'Clearing…' : 'Clear All Logs'}</span>
              </button>
            )}
          </div>

          {/* Auto-Delete Schedule (admin-only) */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-[11px] font-bold text-slate-300 font-mono uppercase tracking-wider">Auto-Delete Schedule</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Automatically remove resolved logs older than the selected interval. Runs when the app is opened.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                id="log-retention-select"
                value={retentionIntervalDays}
                onChange={(e) => handleSaveRetention(Number(e.target.value))}
                disabled={savingRetention}
                className="bg-slate-850 border border-slate-800 text-slate-200 text-[10px] font-mono font-bold uppercase rounded-xl px-3 py-2 outline-none focus:border-teal-500/50 disabled:opacity-50"
              >
                <option value={0}>Never (Keep Forever)</option>
                <option value={7}>Weekly (7 days)</option>
                <option value={30}>Monthly (30 days)</option>
                <option value={90}>Quarterly (90 days)</option>
                <option value={365}>Yearly (365 days)</option>
              </select>
              {retentionSaved && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Saved
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-800/50">
            {resolvedLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileSpreadsheet size={36} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs font-bold font-mono uppercase text-slate-400">No completed repairs logged yet</p>
                <p className="text-[10px] text-slate-500 mt-1">Logs populate automatically as technicians resolve complaints</p>
              </div>
            ) : (
              resolvedLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/20 transition-all">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">#{log.id.substring(7, 12)}... [{log.category}]</span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <MapPin size={10} /> {log.location}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium italic">
                      "Repair Action: {log.description}"
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Logged by {log.studentName} &bull; Resolved on {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400 font-mono">RESOLVED</div>
                      {log.assignedStaff && (
                        <div className="text-[10px] text-slate-400 font-mono font-semibold">{log.assignedStaff}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSpecificLog(log.id)}
                      disabled={deletingLogId === log.id}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center self-end md:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete specific log record"
                      id={`delete-log-${log.id}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating Gemini Chatbot Widget */}
      <ChatBotWidget />
    </div>
  );
}
