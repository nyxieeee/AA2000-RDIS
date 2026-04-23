import { useState } from 'react';
import { User as UserIcon, Mail, Shield, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function Profile() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);

  const [firstName, setFirstName] = useState(user?.firstName || user?.username || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return null;

  const saveProfile = async () => {
    setProfileError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);

    const ok = await updateProfile({ firstName, lastName, email });
    if (ok) setProfileMessage('Profile updated successfully.');
    else setProfileError('Failed to update profile.');

    setIsSavingProfile(false);
  };

  const savePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    setIsSavingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error || 'Failed to update password.');
    }
    setIsSavingPassword(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[--text-primary]">Profile</h1>
        <p className="text-[--text-muted] mt-1">Manage your account information and security settings.</p>
      </div>

      <section className="bg-[--bg-surface] border border-[--border-default] rounded-xl p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-[--text-primary] mb-5">Account Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm text-[--text-secondary] mb-1">Username</label>
            <div className="relative">
              <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={user.username || user.firstName || '-'}
                readOnly
                className="w-full rounded-lg border border-[--border-default] bg-[--bg-raised] pl-9 pr-3 py-2 text-sm text-[--text-primary] opacity-80"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[--text-secondary] mb-1">Account ID</label>
            <div className="relative">
              <Shield className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={user.accountId || user.id || '-'}
                readOnly
                className="w-full rounded-lg border border-[--border-default] bg-[--bg-raised] pl-9 pr-3 py-2 text-sm text-[--text-primary] opacity-80"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[--text-secondary] mb-1">First Name</label>
            <div className="relative">
              <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[--text-secondary] mb-1">Last Name</label>
            <div className="relative">
              <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[--text-secondary] mb-1">Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[--text-secondary] mb-1">Role</label>
            <div className="relative">
              <Shield className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={user.role}
                readOnly
                className="w-full rounded-lg border border-[--border-default] bg-[--bg-raised] pl-9 pr-3 py-2 text-sm text-[--text-primary] opacity-80"
              />
            </div>
          </div>
        </div>

        {(profileMessage || profileError) && (
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${profileError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {profileError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {profileError || profileMessage}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={isSavingProfile}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      <section className="bg-[--bg-surface] border border-[--border-default] rounded-xl p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-[--text-primary] mb-5">Change Password</h2>
        <div className="space-y-4">
          <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
          <PasswordField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} />
        </div>

        {(passwordMessage || passwordError) && (
          <div className={`mt-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${passwordError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {passwordError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {passwordError || passwordMessage}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={savePassword}
            disabled={isSavingPassword}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-black disabled:opacity-60"
          >
            {isSavingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </section>
    </div>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-[--text-secondary] mb-1">{label}</label>
      <div className="relative">
        <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
