"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { SessionPage, type SessionData } from "@/components/session-page";
import { apiFetch, type ApiError } from "@/lib/api";

type Address = {
  address_id?: string | null;
  street_num?: string;
  street_name?: string;
  zipcode?: string;
  city?: string;
  state?: string;
};

type Vendor = {
  business_name?: string;
  customer_service_phone_number?: string;
  address?: Address;
};

type PaymentMethod = {
  card_type: string;
  masked_number: string;
  expiration: string;
};

type ProfileResponse = {
  role: string;
  user: { email: string };
  profile: Record<string, string | number | null>;
  address: Address;
  vendor?: Vendor | null;
  payment_methods: PaymentMethod[];
};

type PasswordErrors = Record<string, string>;
type ProfileErrors = Record<string, string>;

function PasswordStrengthMeter({ password }: { password: string }) {
  const score = useMemo(() => {
    let total = 0;
    if (password.length >= 8) total += 25;
    if (/[A-Z]/.test(password)) total += 25;
    if (/\d/.test(password)) total += 25;
    if (/[^A-Za-z0-9]/.test(password)) total += 25;
    return total;
  }, [password]);

  const label =
    score >= 100
      ? "Strong"
      : score >= 75
        ? "Good"
        : score >= 50
          ? "Fair"
          : score >= 25
            ? "Weak"
            : "Password strength will appear as you type.";

  const color =
    score >= 100
      ? "bg-emerald-500"
      : score >= 75
        ? "bg-sky-500"
        : score >= 50
          ? "bg-amber-500"
          : "bg-rose-500";

  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function buildFormState(data: ProfileResponse) {
  return {
    email: data.user.email,
    first_name: String(data.profile.first_name ?? ""),
    last_name: String(data.profile.last_name ?? ""),
    phone: String(data.profile.phone ?? ""),
    age: String(data.profile.age ?? ""),
    major: String(data.profile.major ?? ""),
    annual_income: String(data.profile.annual_income ?? ""),
    street_num: data.address.street_num ?? "",
    street_name: data.address.street_name ?? "",
    zipcode: data.address.zipcode ?? "",
    city: data.address.city ?? "",
    state: data.address.state ?? "",
    bank_routing_number: String(data.profile.bank_routing_number ?? ""),
    bank_account_number: String(data.profile.bank_account_number ?? ""),
    position: String(data.profile.position ?? ""),
    department: String(data.profile.department ?? ""),
    business_name: String(data.vendor?.business_name ?? ""),
    customer_service_phone_number: String(
      data.vendor?.customer_service_phone_number ?? "",
    ),
    vendor_street_num: data.vendor?.address?.street_num ?? "",
    vendor_street_name: data.vendor?.address?.street_name ?? "",
    vendor_zipcode: data.vendor?.address?.zipcode ?? "",
    vendor_city: data.vendor?.address?.city ?? "",
    vendor_state: data.vendor?.address?.state ?? "",
  };
}

function ProfileContent({ session }: { session: SessionData }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [savedForm, setSavedForm] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    apiFetch<ProfileResponse>("/api/profile")
      .then((data) => {
        const nextForm = buildFormState(data);
        setProfile(data);
        setForm(nextForm);
        setSavedForm(nextForm);
      })
      .catch(() => {
        setProfileMessage("Unable to load profile data.");
      });
  }, []);

  async function lookupZip(value: string, prefix = "") {
    if (!value) {
      setForm((current) => ({
        ...current,
        [`${prefix}city`]: "",
        [`${prefix}state`]: "",
      }));
      return;
    }

    try {
      const result = await apiFetch<{ city: string; state: string }>(
        `/api/zipcode/${encodeURIComponent(value)}`,
      );
      setForm((current) => ({
        ...current,
        [`${prefix}city`]: result.city,
        [`${prefix}state`]: result.state,
      }));
    } catch {
      setForm((current) => ({
        ...current,
        [`${prefix}city`]: "",
        [`${prefix}state`]: "",
      }));
    }
  }

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "zipcode") {
      void lookupZip(value);
    }
    if (name === "vendor_zipcode") {
      void lookupZip(value, "vendor_");
    }
  }

  function resetProfileForm() {
    setForm(savedForm);
    setProfileErrors({});
    setProfileMessage(null);
  }

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileErrors({});
    setProfileMessage(null);

    try {
      const result = await apiFetch<{ success: boolean; profile: ProfileResponse }>(
        "/api/profile",
        {
          method: "PUT",
          body: JSON.stringify(form),
        },
      );
      const nextForm = buildFormState(result.profile);
      setProfile(result.profile);
      setForm(nextForm);
      setSavedForm(nextForm);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      const apiError = err as ApiError;
      setProfileErrors(apiError.errors ?? {});
      setProfileMessage(apiError.error ?? null);
    }
  }

  function resetPasswordForm() {
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setPasswordErrors({});
    setPasswordMessage(null);
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordMessage(null);

    try {
      await apiFetch<{ success: boolean }>("/api/profile/change-password", {
        method: "POST",
        body: JSON.stringify(passwordForm),
      });
      resetPasswordForm();
      setPasswordMessage("Password updated successfully.");
    } catch (err) {
      const apiError = err as ApiError;
      setPasswordErrors(apiError.errors ?? {});
      setPasswordMessage(apiError.error ?? null);
    }
  }

  if (!profile) {
    return (
      <AppShell email={session.email} role={session.role}>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          Loading profile...
        </div>
      </AppShell>
    );
  }

  const role = profile.role;

  return (
    <AppShell email={session.email} role={session.role}>
      <div className="space-y-8">
        <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Account Settings
            </p>
            <h1 className="text-4xl font-semibold text-[#1e3a5f]">User Profile</h1>
            <p className="text-sm text-slate-500">
              {form.first_name || "Unknown"} {form.last_name || ""} | {profile.user.email}
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Profile Details</h2>
            <p className="mt-2 text-sm text-slate-500">
              To change your email address, please submit a request to HelpDesk.
            </p>
          </div>

          {profileMessage ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {profileMessage}
            </div>
          ) : null}

          <form onSubmit={submitProfile} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email" value={form.email} readOnly />
              <Field label="Role" value={role} readOnly />
              <Field
                label="First Name"
                value={form.first_name}
                onChange={(value) => updateField("first_name", value)}
                error={profileErrors.first_name}
              />
              <Field
                label="Last Name"
                value={form.last_name}
                onChange={(value) => updateField("last_name", value)}
                error={profileErrors.last_name}
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="123-456-7890"
                error={profileErrors.phone}
              />
              {role === "helpdesk" ? (
                <>
                  <Field
                    label="Position"
                    value={form.position}
                    onChange={(value) => updateField("position", value)}
                  />
                  <Field
                    label="Department"
                    value={form.department}
                    onChange={(value) => updateField("department", value)}
                  />
                  <Field
                    label="Staff ID"
                    value={String(profile.profile.staff_id ?? "Not assigned")}
                    readOnly
                  />
                </>
              ) : null}
              {role !== "helpdesk" ? (
                <>
                  <Field
                    label="Age"
                    value={form.age}
                    onChange={(value) => updateField("age", value)}
                    error={profileErrors.age}
                  />
                  <Field
                    label="Major"
                    value={form.major}
                    onChange={(value) => updateField("major", value)}
                    error={profileErrors.major}
                  />
                </>
              ) : null}
              {role === "bidder" ? (
                <Field
                  label="Annual Income"
                  value={form.annual_income}
                  onChange={(value) => updateField("annual_income", value)}
                  error={profileErrors.annual_income}
                />
              ) : null}
            </div>

            {role !== "helpdesk" ? (
              <SectionTitle title="Address" subtitle="City and state are derived from zipcode." />
            ) : null}
            {role !== "helpdesk" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Street Number"
                  value={form.street_num}
                  onChange={(value) => updateField("street_num", value)}
                  error={profileErrors.street_num}
                />
                <Field
                  label="Street Name"
                  value={form.street_name}
                  onChange={(value) => updateField("street_name", value)}
                  error={profileErrors.street_name}
                />
                <Field
                  label="Zipcode"
                  value={form.zipcode}
                  onChange={(value) => updateField("zipcode", value)}
                  error={profileErrors.zipcode}
                />
                <Field label="City" value={form.city} readOnly />
                <Field label="State" value={form.state} readOnly />
              </div>
            ) : null}

            {role === "seller" ? (
              <>
                <SectionTitle
                  title="Banking"
                  subtitle="Routing and account details are editable, with masked summaries shown below."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Routing Number"
                    value={form.bank_routing_number}
                    onChange={(value) => updateField("bank_routing_number", value)}
                    error={profileErrors.bank_routing_number}
                  />
                  <Field
                    label="Account Number"
                    value={form.bank_account_number}
                    onChange={(value) => updateField("bank_account_number", value)}
                    error={profileErrors.bank_account_number}
                  />
                  <Field
                    label="Balance"
                    value={String(profile.profile.balance ?? 0)}
                    readOnly
                  />
                </div>

                {profile.vendor ? (
                  <>
                    <SectionTitle
                      title="Vendor Details"
                      subtitle="Vendor-only fields are shown when you have an approved vendor profile."
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Business Name"
                        value={form.business_name}
                        onChange={(value) => updateField("business_name", value)}
                        error={profileErrors.business_name}
                      />
                      <Field
                        label="Customer Service Phone"
                        value={form.customer_service_phone_number}
                        onChange={(value) =>
                          updateField("customer_service_phone_number", value)
                        }
                        error={profileErrors.customer_service_phone_number}
                      />
                      <Field
                        label="Business Street Number"
                        value={form.vendor_street_num}
                        onChange={(value) => updateField("vendor_street_num", value)}
                        error={profileErrors.vendor_street_num}
                      />
                      <Field
                        label="Business Street Name"
                        value={form.vendor_street_name}
                        onChange={(value) => updateField("vendor_street_name", value)}
                        error={profileErrors.vendor_street_name}
                      />
                      <Field
                        label="Business Zipcode"
                        value={form.vendor_zipcode}
                        onChange={(value) => updateField("vendor_zipcode", value)}
                        error={profileErrors.vendor_zipcode}
                      />
                      <Field label="Business City" value={form.vendor_city} readOnly />
                      <Field label="Business State" value={form.vendor_state} readOnly />
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-[#334d6e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263c57]"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={resetProfileForm}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        {role === "bidder" ? (
          <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
            <SectionTitle title="Payment Methods" subtitle="Stored as masked display values only." />
            <div className="grid gap-4">
              {profile.payment_methods.length ? (
                profile.payment_methods.map((method) => (
                  <div
                    key={`${method.card_type}-${method.masked_number}`}
                    className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{method.card_type}</p>
                      <p className="text-sm text-slate-500">{method.masked_number}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      Expires {method.expiration}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No credit cards are on file.</p>
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <SectionTitle
            title="Change Password"
            subtitle="Use at least 8 characters with an uppercase letter, a number, and a special character."
          />

          {passwordMessage ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {passwordMessage}
            </div>
          ) : null}

          <form onSubmit={submitPassword} className="grid gap-4 md:grid-cols-3">
            <Field
              label="Current Password"
              value={passwordForm.current_password}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, current_password: value }))
              }
              error={passwordErrors.current_password}
              type="password"
            />
            <div className="space-y-2">
              <Field
                label="New Password"
                value={passwordForm.new_password}
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, new_password: value }))
                }
                error={passwordErrors.new_password}
                type="password"
              />
              <PasswordStrengthMeter password={passwordForm.new_password} />
            </div>
            <Field
              label="Confirm Password"
              value={passwordForm.confirm_password}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, confirm_password: value }))
              }
              error={passwordErrors.confirm_password}
              type="password"
            />
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-[#334d6e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263c57]"
              >
                Update Password
              </button>
              <button
                type="button"
                onClick={resetPasswordForm}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  readOnly = false,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  readOnly?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
          readOnly
            ? "border-slate-200 bg-slate-100 text-slate-500"
            : "border-slate-200 bg-slate-50 text-slate-900 focus:border-[#334d6e] focus:bg-white focus:ring-4 focus:ring-[#334d6e]/10"
        }`}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-t border-slate-200 pt-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function ProfilePage() {
  return <SessionPage>{(session) => <ProfileContent session={session} />}</SessionPage>;
}
