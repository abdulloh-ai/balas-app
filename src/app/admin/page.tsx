"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface BusinessOwnerInfo {
  id: string;
  name: string;
  email: string;
}

interface TenantItem {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "TRIAL";
  paymentStatus: "SUDAH_BAYAR" | "BELUM_BAYAR";
  lastPaidAt: string;
  startDate: string;
  createdAt: string;
  businessOwners: BusinessOwnerInfo[];
}

interface DemoRequestItem {
  id: string;
  name: string;
  businessName: string;
  whatsapp: string;
  status: "PENDING" | "CONTACTED";
  createdAt: string;
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
};

export default function AdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [demoRequests, setDemoRequests] = useState<DemoRequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<"tenants" | "demoRequests">("tenants");

  const [stats, setStats] = useState<StatsData>({
    totalTenants: 0,
    activeTenantsCount: 0,
    paidTenantsCount: 0,
    unpaidTenantsCount: 0,
    mrr: 0,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [lastCreatedOwner, setLastCreatedOwner] = useState<{
    name: string;
    email: string;
    rawPassword: string;
  } | null>(null);

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
        router.push("/admin/login");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setTenants(data.tenants || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Fetch tenants error:", err);
    }
  };

  const fetchDemoRequests = async () => {
    try {
      const res = await fetch("/api/admin/demo-requests");
      const data = await res.json();
      if (res.ok) {
        setDemoRequests(data.demoRequests || []);
      }
    } catch (err) {
      console.error("Fetch demo requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchDemoRequests();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLastCreatedOwner(null);
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
      setLastCreatedOwner(data.createdOwner);

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

  const handleTogglePayment = async (id: string, currentPayment: string) => {
    setTogglingId(id);
    setMsg(null);
    const newStatus = currentPayment === "SUDAH_BAYAR" ? "BELUM_BAYAR" : "SUDAH_BAYAR";

    try {
      const res = await fetch(`/api/admin/tenants/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status pembayaran.");

      setMsg({ type: "success", text: data.message });
      fetchTenants();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleDemoStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "CONTACTED" ? "PENDING" : "CONTACTED";
    try {
      const res = await fetch("/api/admin/demo-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: data.message });
        fetchDemoRequests();
      }
    } catch (err) {
      console.error("Toggle demo status error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4 text-[#1F2A24]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#2F6A55] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold">Memuat Dashboard Super Admin Platform Owner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] p-4 sm:p-6 md:p-10 w-full overflow-x-hidden">
      {/* Header Dashboard Super Admin */}
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
            Manajemen Seluruh UMKM Berlangganan, Permintaan Demo, & Status Billing (MRR)
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
            <span className="text-xs font-bold text-[#6B7570] uppercase">Total Tenant UMKM</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1F2A24] mt-1.5">{stats.totalTenants}</p>
            <p className="text-[11px] text-[#6B7570] mt-1">Terdaftar di platform</p>
          </Card>

          <Card className="bg-white border-[#E2E0D8]">
            <span className="text-xs font-bold text-[#2F6A55] uppercase">Tenant Aktif</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#2F6A55] mt-1.5">{stats.activeTenantsCount}</p>
            <p className="text-[11px] text-[#2F6A55] font-semibold mt-1">
              {stats.paidTenantsCount} Sudah Bayar Bulan Ini
            </p>
          </Card>

          <Card className="bg-white border-[#E2E0D8]">
            <span className="text-xs font-bold text-[#B8863B] uppercase">Permintaan Demo</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#B8863B] mt-1.5">{demoRequests.length}</p>
            <p className="text-[11px] text-[#B8863B] font-semibold mt-1">Masuk dari Landing Page</p>
          </Card>

          <div className="bg-[#2F6A55] text-white rounded-2xl p-5 shadow-xs border border-[#2F6A55] flex flex-col justify-between">
            <span className="text-xs font-bold uppercase opacity-90 tracking-wider">Pendapatan MRR Bulanan</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
              Rp {stats.mrr.toLocaleString("id-ID")}
            </p>
            <p className="text-[11px] text-emerald-100 font-medium mt-1">Estimasi pendapatan dari paket aktif</p>
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

        {/* Tab Switcher: Tenants vs DemoRequests */}
        <div className="flex border-b border-[#E2E0D8] gap-4">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "tenants"
                ? "border-[#2F6A55] text-[#2F6A55]"
                : "border-transparent text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            🏪 Daftar Tenant UMKM ({tenants.length})
          </button>
          <button
            onClick={() => setActiveTab("demoRequests")}
            className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "demoRequests"
                ? "border-[#2F6A55] text-[#2F6A55]"
                : "border-transparent text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            <span>📩 Permintaan Demo Landing Page</span>
            <span className="px-2 py-0.5 bg-[#B8863B]/10 text-[#B8863B] rounded-full text-[10px] font-extrabold">
              {demoRequests.filter((r) => r.status === "PENDING").length} Baru
            </span>
          </button>
        </div>

        {activeTab === "tenants" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Form Pendaftaran Tenant Baru (1 Col) */}
            <div>
              <Card title="Pendaftaran Tenant Manual" subtitle="Daftarkan UMKM baru beserta akun pemiliknya">
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
                          <option value="STARTER">STARTER (Rp 149.000 / bln)</option>
                          <option value="PRO">PRO (Rp 299.000 / bln)</option>
                          <option value="ENTERPRISE">ENTERPRISE (Rp 699.000 / bln)</option>
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

            {/* Tabel Daftar Semua Tenant & Status Pembayaran Billing (2 Cols) */}
            <div className="lg:col-span-2">
              <Card title="Daftar Tenant & Status Billing Bulanan" subtitle="Kelola keaktifan dan pencatatan pembayaran langganan bulanan">
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
                          <th className="py-3 px-3 text-right">Aksi</th>
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
                                  Rp {(PLAN_PRICES[item.subscriptionPlan] || 0).toLocaleString("id-ID")}/bln
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    item.subscriptionStatus === "ACTIVE"
                                      ? "bg-[#2F6A55]/10 text-[#2F6A55]"
                                      : "bg-[#B8483F]/10 text-[#B8483F]"
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
                                      : "bg-[#B8483F]/10 text-[#B8483F] border border-[#B8483F]/30"
                                  }`}
                                >
                                  {item.paymentStatus === "SUDAH_BAYAR" ? "✓ SUDAH BAYAR" : "⚠️ BELUM BAYAR"}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right">
                                <Button
                                  variant={item.paymentStatus === "SUDAH_BAYAR" ? "outline" : "primary"}
                                  onClick={() => handleTogglePayment(item.id, item.paymentStatus)}
                                  disabled={togglingId === item.id}
                                  className="text-[10px] py-1 px-2 block w-full text-center"
                                >
                                  {item.paymentStatus === "SUDAH_BAYAR" ? "Tandai Belum Bayar" : "Tandai Sudah Bayar"}
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
            </div>
          </div>
        ) : (
          /* TAB 2: TABEL DAFTAR PERMINTAAN DEMO (FORM LANDING PAGE) */
          <Card title="Daftar Permintaan Demo (Landing Page Form)" subtitle="Daftar calon UMKM yang mengisi form kontak dari landing page publik">
            {demoRequests.length === 0 ? (
              <div className="border border-[#E2E0D8] rounded-xl p-8 text-center bg-[#F5F3EE]/50 my-2">
                <p className="text-xs text-[#6B7570]">Belum ada permintaan demo yang masuk dari landing page.</p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                      <th className="py-3 px-3">Tanggal Masuk</th>
                      <th className="py-3 px-3">Nama Pemohon</th>
                      <th className="py-3 px-3">Nama Bisnis / Toko</th>
                      <th className="py-3 px-3">Nomor WhatsApp</th>
                      <th className="py-3 px-3">Status Tindak Lanjut</th>
                      <th className="py-3 px-3 text-right">Aksi Manual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0D8]">
                    {demoRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F5F3EE]/40 transition-colors">
                        <td className="py-3 px-3 text-[#6B7570]">
                          {new Date(req.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#1F2A24]">{req.name}</td>
                        <td className="py-3 px-3 text-[#2F6A55] font-semibold">{req.businessName}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1F2A24]">
                          <a
                            href={`https://wa.me/${req.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2F6A55] underline flex items-center gap-1"
                          >
                            <span>💬</span> {req.whatsapp}
                          </a>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              req.status === "CONTACTED"
                                ? "bg-[#2F6A55]/10 text-[#2F6A55]"
                                : "bg-[#B8863B]/10 text-[#B8863B]"
                            }`}
                          >
                            {req.status === "CONTACTED" ? "✓ Sudah Dihubungi" : "⏳ Menunggu Follow Up"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant={req.status === "CONTACTED" ? "outline" : "primary"}
                            onClick={() => handleToggleDemoStatus(req.id, req.status)}
                            className="text-[10px] py-1 px-2.5"
                          >
                            {req.status === "CONTACTED" ? "Tandai Belum Dihubungi" : "Tandai Sudah Dihubungi"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
