"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface BusinessOwnerInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface TenantItem {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "TRIAL" | "MENUNGGU_VERIFIKASI";
  paymentStatus: "SUDAH_BAYAR" | "BELUM_BAYAR" | "MENUNGGU_VERIFIKASI";
  lastPaidAt: string;
  startDate: string;
  createdAt: string;
  businessOwners: BusinessOwnerInfo[];
}

interface StatsData {
  totalTenants: number;
  activeTenantsCount: number;
  paidTenantsCount: number;
  unpaidTenantsCount: number;
  mrr: number;
}

const PLAN_PRICES: Record<string, number> = {
  STARTER: 149000,
  PRO: 299000,
  ENTERPRISE: 699000,
  BALAS: 199000,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [activeTab, setActiveTab] = useState<"pendingVerification" | "allTenants">("pendingVerification");

  const [stats, setStats] = useState<StatsData>({
    totalTenants: 0,
    activeTenantsCount: 0,
    paidTenantsCount: 0,
    unpaidTenantsCount: 0,
    mrr: 0,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    operatingHours: "",
    policies: "",
    subscriptionPlan: "STARTER",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setTenants(data.tenants || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch tenants error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // LOGOUT HANDLER: REDIRECT TO HOME LANDING PAGE (/)
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handleVerifyTenant = async (id: string) => {
    setVerifyingId(id);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/tenants/${id}/verify`, {
        method: "PATCH",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memverifikasi tenant.");

      setMsg({ type: "success", text: data.message });
      fetchTenants();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftarkan tenant.");
      }

      setMsg({ type: "success", text: data.message });

      setFormData({
        name: "",
        description: "",
        operatingHours: "",
        policies: "",
        subscriptionPlan: "STARTER",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
      });

      fetchTenants();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingVerificationTenants = tenants.filter(
    (t) =>
      t.paymentStatus === "MENUNGGU_VERIFIKASI" ||
      t.subscriptionStatus === "MENUNGGU_VERIFIKASI"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4 text-[#1F2A24]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#2F6A55] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold">Memuat Dashboard Super Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] p-4 sm:p-6 md:p-10 w-full overflow-x-hidden">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-6 md:mb-8 pb-4 md:pb-6 border-b border-[#E2E0D8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F6A55]"></span>
            <span className="text-[11px] sm:text-xs font-bold text-[#2F6A55] uppercase tracking-wider">
              Lapis 1: Platform Owner (Super Admin)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1F2A24]">
            Dashboard Balas SaaS
          </h1>
          <p className="text-[11px] sm:text-xs text-[#6B7570] mt-0.5">
            Verifikasi Pembayaran Pendaftaran Mandiri UMKM & Status Langganan
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleLogout} className="text-xs w-full sm:w-auto py-2">
            🚪 Keluar (Logout Admin)
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E2E0D8]">
            <span className="text-xs font-bold text-amber-800 uppercase">Menunggu Verifikasi</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1.5">
              {pendingVerificationTenants.length}
            </p>
            <p className="text-[11px] text-amber-800 font-semibold mt-1">Pendaftaran mandiri baru</p>
          </Card>

          <Card className="bg-white border-[#E2E0D8]">
            <span className="text-xs font-bold text-[#2F6A55] uppercase">Tenant Aktif</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#2F6A55] mt-1.5">{stats.activeTenantsCount}</p>
            <p className="text-[11px] text-[#2F6A55] font-semibold mt-1">Sudah Diverifikasi & Bayar</p>
          </Card>

          <Card className="bg-white border-[#E2E0D8]">
            <span className="text-xs font-bold text-[#6B7570] uppercase">Total Tenant</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1F2A24] mt-1.5">{stats.totalTenants}</p>
            <p className="text-[11px] text-[#6B7570] mt-1">Terdaftar di database</p>
          </Card>

          <div className="bg-[#2F6A55] text-white rounded-2xl p-5 shadow-xs border border-[#2F6A55] flex flex-col justify-between">
            <span className="text-xs font-bold uppercase opacity-90 tracking-wider">Pendapatan MRR Bulanan</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
              Rp {stats.mrr.toLocaleString("id-ID")}
            </p>
            <p className="text-[11px] text-emerald-100 font-medium mt-1">Dari tenant aktif berlangganan</p>
          </div>
        </div>

        {/* Notification Toast */}
        {msg && (
          <div
            className={`p-3.5 sm:p-4 rounded-xl text-xs font-semibold flex justify-between items-center ${
              msg.type === "success"
                ? "bg-[#2F6A55]/10 text-[#2F6A55] border border-[#2F6A55]/20"
                : "bg-[#B8483F]/10 text-[#B8483F] border border-[#B8483F]/20"
            }`}
          >
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="font-bold text-base leading-none pl-2">
              ×
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E2E0D8] gap-4">
          <button
            onClick={() => setActiveTab("pendingVerification")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "pendingVerification"
                ? "border-[#2F6A55] text-[#2F6A55]"
                : "border-transparent text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            <span>⏳ Menunggu Verifikasi Pembayaran</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
              {pendingVerificationTenants.length} Baru
            </span>
          </button>

          <button
            onClick={() => setActiveTab("allTenants")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "allTenants"
                ? "border-[#2F6A55] text-[#2F6A55]"
                : "border-transparent text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            🏪 Daftar Seluruh Tenant UMKM ({tenants.length})
          </button>
        </div>

        {/* TAB 1: MENUNGGU VERIFIKASI PEMBAYARAN */}
        {activeTab === "pendingVerification" ? (
          <Card
            title="Daftar Pendaftaran Baru (Menunggu Verifikasi Pembayaran)"
            subtitle="Pendaftaran mandiri dari /daftar yang membutuhkan persetujuan manual setelah pembayaran diterima"
          >
            {pendingVerificationTenants.length === 0 ? (
              <div className="border border-[#E2E0D8] rounded-xl p-8 text-center bg-[#F5F3EE]/50 my-2">
                <p className="text-xs text-[#6B7570]">
                  Tidak ada pendaftaran baru yang menunggu verifikasi saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                      <th className="py-3 px-3">Tanggal Daftar</th>
                      <th className="py-3 px-3">Nama Toko / Bisnis</th>
                      <th className="py-3 px-3">Nama Pemilik / PIC</th>
                      <th className="py-3 px-3">Email Login</th>
                      <th className="py-3 px-3">Nomor WhatsApp</th>
                      <th className="py-3 px-3">Paket Dipilih</th>
                      <th className="py-3 px-3 text-right">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0D8]">
                    {pendingVerificationTenants.map((t) => {
                      const owner = t.businessOwners[0];
                      const waNumber = owner?.phone || "-";
                      const cleanWA = waNumber.replace(/[^0-9]/g, "");

                      return (
                        <tr key={t.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 px-3 text-[#6B7570]">
                            {new Date(t.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#1F2A24]">{t.name}</td>
                          <td className="py-3 px-3 font-semibold text-[#2F6A55]">
                            {owner ? owner.name : "-"}
                          </td>
                          <td className="py-3 px-3 font-mono text-[#6B7570]">
                            {owner ? owner.email : "-"}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">
                            {cleanWA !== "-" ? (
                              <a
                                href={`https://wa.me/${cleanWA}?text=Halo%20${encodeURIComponent(
                                  owner?.name || "Pemilik UMKM"
                                )},%20pembayaran%20pendaftaran%20toko%20${encodeURIComponent(
                                  t.name
                                )}%20di%20Balas%20SaaS%20sudah%20kami%20terima.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2F6A55] underline flex items-center gap-1"
                              >
                                💬 {waNumber}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#2F6A55]">{t.subscriptionPlan}</span>
                            <div className="text-[10px] text-[#6B7570]">
                              Rp {(PLAN_PRICES[t.subscriptionPlan] || 199000).toLocaleString("id-ID")}/bln
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="primary"
                              disabled={verifyingId === t.id}
                              onClick={() => handleVerifyTenant(t.id)}
                              className="text-[11px] py-1.5 px-3 bg-[#2F6A55] text-white font-bold rounded-xl shadow-xs hover:bg-[#265746]"
                            >
                              {verifyingId === t.id ? "Memverifikasi..." : "✓ Verifikasi & Aktifkan"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          /* TAB 2: DAFTAR SELURUH TENANT */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Form Pendaftaran Tenant Manual (1 Col) */}
            <div>
              <Card title="Pendaftaran Tenant Manual" subtitle="Daftarkan UMKM baru secara langsung">
                <form onSubmit={handleCreateTenant} className="space-y-3.5 text-xs mt-2">
                  <div className="pb-2 border-b border-[#E2E0D8]">
                    <span className="font-bold text-[#2F6A55] uppercase text-[10px] tracking-wider block mb-2">
                      1. Data Bisnis UMKM
                    </span>

                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-[#1F2A24] mb-1">Nama Bisnis *</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Berkah Snack & Frozen"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1F2A24] mb-1">Paket Berlangganan</label>
                        <select
                          value={formData.subscriptionPlan}
                          onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                        >
                          <option value="BALAS">BALAS (Rp 199.000 / bln)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="font-bold text-[#2F6A55] uppercase text-[10px] tracking-wider block mb-2">
                      2. Akun Pemilik (Business Owner)
                    </span>

                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-[#1F2A24] mb-1">Nama Pemilik UMKM *</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Bu Rina"
                          value={formData.ownerName}
                          onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1F2A24] mb-1">Email Login UMKM *</label>
                        <input
                          type="email"
                          required
                          placeholder="rina@berkahsnack.id"
                          value={formData.ownerEmail}
                          onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1F2A24] mb-1">Password Login UMKM *</label>
                        <input
                          type="text"
                          required
                          placeholder="password123"
                          value={formData.ownerPassword}
                          onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                        />
                      </div>
                    </div>
                  </div>

                  <Button variant="primary" type="submit" className="w-full py-2.5 text-xs font-bold mt-2" disabled={submitting}>
                    {submitting ? "Mendaftarkan..." : "+ Daftarkan Tenant & Pemilik"}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Tabel Daftar Semua Tenant (2 Cols) */}
            <div className="lg:col-span-2">
              <Card title="Daftar Seluruh Tenant UMKM" subtitle="Status keaktifan & billing seluruh tenant">
                {tenants.length === 0 ? (
                  <div className="border border-[#E2E0D8] rounded-xl p-8 text-center bg-[#F5F3EE]/50 my-2">
                    <p className="text-xs text-[#6B7570]">Belum ada tenant yang terdaftar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                          <th className="py-3 px-3">Tenant & Pemilik</th>
                          <th className="py-3 px-3">Paket</th>
                          <th className="py-3 px-3">Status Langganan</th>
                          <th className="py-3 px-3">Status Pembayaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E0D8]">
                        {tenants.map((item) => {
                          const owner = item.businessOwners[0];
                          return (
                            <tr key={item.id} className="hover:bg-[#F5F3EE]/40 transition-colors">
                              <td className="py-3 px-3 font-bold text-[#1F2A24]">
                                <div>{item.name}</div>
                                <div className="text-[10px] text-[#6B7570] font-normal">
                                  Pemilik: {owner ? `${owner.name} (${owner.email})` : "Belum ada"}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-bold text-[#2F6A55]">{item.subscriptionPlan}</span>
                                <div className="text-[10px] text-[#6B7570]">
                                  Rp {(PLAN_PRICES[item.subscriptionPlan] || 199000).toLocaleString("id-ID")}/bln
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    item.subscriptionStatus === "ACTIVE"
                                      ? "bg-[#2F6A55]/10 text-[#2F6A55]"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {item.subscriptionStatus}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    item.paymentStatus === "SUDAH_BAYAR"
                                      ? "bg-[#2F6A55]/10 text-[#2F6A55] border border-[#2F6A55]/30"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {item.paymentStatus === "SUDAH_BAYAR" ? "✓ SUDAH BAYAR" : "⏳ MENUNGGU VERIFIKASI"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
