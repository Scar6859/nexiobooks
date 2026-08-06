"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/avatars";
import { initialsFromName } from "@/lib/profile";
import { normalizeEmail } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import Avatar from "@/components/Avatar";
import FancySelect from "@/components/FancySelect";
import { SCHOOLS } from "@/lib/constants";
import { Camera } from "lucide-react";

export default function ProfileForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [school, setSchool] = useState(profile.school ?? SCHOOLS[0]);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState(email);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function onAvatarSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const url = await uploadAvatar(supabase, profile.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(url);
      setProfileMsg("Profile photo updated.");
      router.refresh();
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Could not upload photo.");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErr(null);
    setProfileMsg(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      setProfileErr("Display name is required.");
      setSavingProfile(false);
      return;
    }
    if (!trimmedPhone) {
      setProfileErr("Phone number is required.");
      setSavingProfile(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: trimmedName,
        phone: trimmedPhone,
        school,
        initials: initialsFromName(trimmedName),
      })
      .eq("id", profile.id);

    if (error) {
      setProfileErr(error.message);
      setSavingProfile(false);
      return;
    }

    setProfileMsg("Profile saved.");
    setSavingProfile(false);
    router.refresh();
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailErr(null);
    setEmailMsg(null);

    const next = normalizeEmail(newEmail);
    if (!next) {
      setEmailErr("Enter a valid email.");
      setSavingEmail(false);
      return;
    }
    if (next === normalizeEmail(email)) {
      setEmailErr("That is already your current email.");
      setSavingEmail(false);
      return;
    }

    const { error } = await supabase.auth.updateUser(
      { email: next },
      {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile")}`,
      },
    );

    if (error) {
      setEmailErr(error.message);
      setSavingEmail(false);
      return;
    }

    setEmailMsg(
      `Confirmation link sent to ${next}. Your email updates after you confirm it.`,
    );
    setSavingEmail(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordErr(null);
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordErr("New password must be at least 6 characters.");
      setSavingPassword(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords do not match.");
      setSavingPassword(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setPasswordErr("Current password is incorrect.");
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordErr(error.message);
      setSavingPassword(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("Password updated.");
    setSavingPassword(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Profile</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Display name, phone, school, and photo.
        </p>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative rounded-full"
            aria-label="Change profile photo"
          >
            <Avatar
              name={fullName}
              initials={profile.initials}
              src={avatarUrl}
              size="lg"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-semibold text-[var(--gold-muted)] hover:underline"
            >
              Change photo
            </button>
            <p className="mt-1 text-xs text-[var(--muted)]">JPG, PNG, WebP, or GIF · up to 5MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onAvatarSelected(e.target.files)}
          />
        </div>

        <form onSubmit={saveProfile} className="mt-5 space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Display name"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            placeholder="Phone number"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          <FancySelect
            label="School"
            value={school}
            onChange={setSchool}
            options={SCHOOLS}
            required
          />
          {profileErr && <p className="text-sm text-red-600">{profileErr}</p>}
          {profileMsg && (
            <p className="text-sm text-[var(--gold-muted)]">{profileMsg}</p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="btn-navy px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Email</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Changing email sends a confirmation link to the new address.
        </p>
        <form onSubmit={saveEmail} className="mt-4 space-y-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          {emailErr && <p className="text-sm text-red-600">{emailErr}</p>}
          {emailMsg && (
            <p className="text-sm text-[var(--gold-muted)]">{emailMsg}</p>
          )}
          <button
            type="submit"
            disabled={savingEmail}
            className="btn-navy px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {savingEmail ? "Sending..." : "Update email"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Password</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Confirm with your current password, then enter the new one twice.
        </p>
        <form onSubmit={savePassword} className="mt-4 space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Current password"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="New password"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gold-muted)]"
          />
          {passwordErr && <p className="text-sm text-red-600">{passwordErr}</p>}
          {passwordMsg && (
            <p className="text-sm text-[var(--gold-muted)]">{passwordMsg}</p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className="btn-navy px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {savingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
