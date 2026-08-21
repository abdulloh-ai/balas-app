"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface TenantProfile {
  id: string;
  name: string;
  description: string | null;
  operatingHours: string | null;
  policies: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  createdAt: string;
}

interface OrderItemData {
  id: string;
  productName: string;
  price: number;
  quantity: number;
}

interface OrderData {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  status: "MENUNGGU_PEMBAYARAN" | "LUNAS" | "DIBATALKAN";
  createdAt: string;
  items: OrderItemData[];
}

interface EscalationData {
  id: string;
  reason: string;
  summary: string;
  status: "BELUM_SELESAI" | "SELESAI";
  createdAt: string;
  conversation?: {
    customerPhone: string;
    message: string;
  };
}

interface ReportSummary {
  period: string;
  totalRevenue: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  unresolvedEscalationsCount: number;
  lowStockThreshold: number;
  lowStockProducts: ProductItem[];
}

interface ChatMessage {
  id: string;
  sender: "PELANGGAN" | "AI" | "ADMIN";
  customerPhone: string;
  message: string;
  createdAt: string;
}

interface WASessionState {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED";
  qrCodeUrl: string | null;
  phoneNumber: string | null;
  error?: string | null;
}

export default function BusinessOwnerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "laporan" | "produk" | "pesanan" | "eskalasi" | "chat" | "wa" | "info"
  >("laporan");

  const [user, setUser] = useState<{ name: string; email: string; tenantId: string } | null>(null);
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [escalations, setEscalations] = useState<EscalationData[]>([]);

  // Report State
  const [reportPeriod, setReportPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [reports, setReports] = useState<ReportSummary>({
    period: "month",
    totalRevenue: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    unresolvedEscalationsCount: 0,
    lowStockThreshold: 5,
    lowStockProducts: [],
  });

  // WA Gateway State
  const [waState, setWaState] = useState<WASessionState>({
    status: "DISCONNECTED",
    qrCodeUrl: null,
    phoneNumber: null,
  });
  const [waConnecting, setWaConnecting] = useState(false);

  // Chat State Multi-Customer Inbox
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>("081234567890");
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [usingApiKey, setUsingApiKey] = useState<boolean | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Form State Profile Bisnis
  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    operatingHours: "",
    policies: "",
  });

  // Form State Tambah Produk Baru
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
  });

  const fetchProfileData = async () => {
    try {
      const res = await fetch("/api/business/profile");
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setTenant(data.tenant);
        setUser(data.user);
        setProfileForm({
          name: data.tenant.name || "",
          description: data.tenant.description || "",
          operatingHours: data.tenant.operatingHours || "",
          policies: data.tenant.policies || "",
        });
      }
    } catch (err) {
      router.push("/login");
    }
  };

  const fetchProductsData = async () => {
    try {
      const res = await fetch("/api/business/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsData = async (period = reportPeriod) => {
    try {
      const res = await fetch(`/api/business/reports?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Fetch reports error:", err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch("/api/business/chat");
      if (res.ok) {
        const data = await res.json();
        const convs: ChatMessage[] = data.conversations || [];
        setConversations(convs);

        if (convs.length > 0) {
          const uniquePhones = Array.from(new Set(convs.map((c) => c.customerPhone)));
          if (!uniquePhones.includes(selectedCustomerPhone)) {
            setSelectedCustomerPhone(uniquePhones[0]);
          }
        }
      }
    } catch (err) {
      console.error("Fetch chat history error:", err);
    }
  };

  const fetchOrdersData = async () => {
    try {
      const res = await fetch("/api/business/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    }
  };

  const fetchEscalationsData = async () => {
    try {
      const res = await fetch("/api/business/escalations");
      if (res.ok) {
        const data = await res.json();
        setEscalations(data.escalations || []);
      }
    } catch (err) {
      console.error("Fetch escalations error:", err);
    }
  };

  const fetchWAStatus = async () => {
    try {
      const res = await fetch("/api/business/wa-status");
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setWaState(data.state);
        }
      }
    } catch (err) {
      console.error("Fetch WA status error:", err);
    }
  };

  const handleConnectWA = async () => {
    setWaConnecting(true);
    try {
      const res = await fetch("/api/business/wa-connect", { method: "POST" });
      const data = await res.json();
      if (data.state) {
        setWaState(data.state);
      }
    } catch (err) {
      console.error("Connect WA error:", err);
    } finally {
      setWaConnecting(false);
    }
  };

  const handleDisconnectWA = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan sambungan WA HP toko Anda?")) return;
    setWaConnecting(true);
    try {
      const res = await fetch("/api/business/wa-disconnect", { method: "POST" });
      const data = await res.json();
      if (data.state) {
        setWaState(data.state);
      }
    } catch (err) {
      console.error("Disconnect WA error:", err);
    } finally {
      setWaConnecting(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
    fetchProductsData();
    fetchReportsData();
    fetchChatHistory();
    fetchOrdersData();
    fetchEscalationsData();
    fetchWAStatus();
  }, []);

  useEffect(() => {
    if (activeTab === "laporan") fetchReportsData(reportPeriod);
    if (activeTab === "chat") fetchChatHistory();
    if (activeTab === "pesanan") fetchOrdersData();
    if (activeTab === "eskalasi") fetchEscalationsData();
    if (activeTab === "wa") fetchWAStatus();
  }, [activeTab, reportPeriod]);

  // Polling status WA saat tab WA aktif
  useEffect(() => {
    let interval: any;
    if (activeTab === "wa" || waState.status === "QR_READY" || waState.status === "CONNECTING") {
      interval = setInterval(() => {
        fetchWAStatus();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTab, waState.status]);

  // Polling riwayat chat saat tab chat aktif
  useEffect(() => {
    let interval: any;
    if (activeTab === "chat") {
      interval = setInterval(() => {
        fetchChatHistory();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversations, selectedCustomerPhone, sendingChat]);

  const handleLogout = async () => {
    await fetch("/api/business/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setProfileLoading(true);

    try {
      const res = await fetch("/api/business/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil bisnis.");

      setMsg({ type: "success", text: "Info profil bisnis berhasil diperbarui!" });
      setTenant(data.tenant);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setProductLoading(true);

    try {
      const res = await fetch("/api/business/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan produk.");

      setMsg({ type: "success", text: `Produk "${data.product.name}" berhasil ditambahkan!` });
      setNewProduct({ name: "", price: "", stock: "", description: "" });
      fetchProductsData();
      fetchReportsData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setProductLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) return;

    setMsg(null);
    setDeleteLoadingId(id);

    try {
      const res = await fetch(`/api/business/products?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk.");

      setMsg({ type: "success", text: `Produk "${name}" berhasil dihapus.` });
      fetchProductsData();
      fetchReportsData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userText = chatInput.trim();
    setChatInput("");
    setSendingChat(true);

    const tempUserMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      sender: "PELANGGAN",
      customerPhone: selectedCustomerPhone,
      message: userText,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/business/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, customerPhone: selectedCustomerPhone }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsingApiKey(data.usingApiKey);
        fetchChatHistory();
        fetchProductsData();
        fetchOrdersData();
        fetchEscalationsData();
        fetchReportsData();
      } else {
        alert(data.error || "Gagal memproses pesan.");
      }
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setSendingChat(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: "LUNAS" | "DIBATALKAN") => {
    setActionLoadingId(orderId);
    setMsg(null);

    try {
      const res = await fetch("/api/business/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui pesanan.");

      setMsg({ type: "success", text: data.message });
      fetchOrdersData();
      fetchProductsData();
      fetchReportsData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveEscalation = async (escalationId: string) => {
    setActionLoadingId(escalationId);
    setMsg(null);

    try {
      const res = await fetch("/api/business/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escalationId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal meng-update eskalasi.");

      setMsg({ type: "success", text: data.message });
      fetchEscalationsData();
      fetchReportsData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingEscalationsCount = escalations.filter((e) => e.status === "BELUM_SELESAI").length;

  const uniqueCustomerPhones = Array.from(new Set(conversations.map((c) => c.customerPhone)));
  if (!uniqueCustomerPhones.includes("081234567890")) {
    uniqueCustomerPhones.unshift("081234567890");
  }

  const customerList = uniqueCustomerPhones.map((phone) => {
    const customerChats = conversations.filter((c) => c.customerPhone === phone);
    const lastChat = customerChats[customerChats.length - 1];

    const hasEscalation = escalations.some(
      (e) => e.status === "BELUM_SELESAI" && e.conversation?.customerPhone === phone
    );
    const hasOrder = orders.some((o) => o.customerPhone === phone);

    return {
      phone,
      lastMessage: lastChat ? lastChat.message : "Pesan pertama toko",
      lastTime: lastChat ? lastChat.createdAt : new Date().toISOString(),
      hasEscalation,
      hasOrder,
    };
  });

  const selectedConversations = conversations.filter(
    (c) => c.customerPhone === selectedCustomerPhone
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4 sm:p-6 text-[#1F2A24]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#B8863B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold">Memverifikasi Sesi Pemilik UMKM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1F2A24] p-4 sm:p-6 md:p-10 w-full overflow-x-hidden">
      {/* Header Dashboard UMKM */}
      <header className="max-w-7xl mx-auto mb-6 md:mb-8 pb-4 md:pb-6 border-b border-[#E2E0D8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8863B]"></span>
            <span className="text-[11px] sm:text-xs font-bold text-[#B8863B] uppercase tracking-wider">
              Lapis 2: Business Owner (UMKM)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1F2A24]">
            Dashboard {tenant?.name || "Toko"}
          </h1>
          <p className="text-[11px] sm:text-xs text-[#6B7570] mt-0.5">
            Pengelola: <span className="font-bold text-[#1F2A24]">{user?.name}</span> ({user?.email}) | Paket:{" "}
            <span className="font-semibold text-[#2F6A55]">{tenant?.subscriptionPlan}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleLogout} className="text-xs w-full sm:w-auto py-2">
            🚪 Keluar (Logout Toko)
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
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

        {/* Tab Navigation */}
        <div className="no-scrollbar flex border-b border-[#E2E0D8] gap-2 sm:gap-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("laporan")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === "laporan" ? "text-[#2F6A55]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            📊 Laporan Bisnis
            {activeTab === "laporan" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6A55] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("wa")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${
              activeTab === "wa" ? "text-[#2F6A55]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            <span>📲 Hubungkan WA (Scan QR)</span>
            <span
              className={`px-2 py-0.2 text-[9px] font-extrabold rounded-full ${
                waState.status === "CONNECTED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {waState.status === "CONNECTED" ? "CONNECTED" : "SCAN QR"}
            </span>
            {activeTab === "wa" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6A55] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("produk")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === "produk" ? "text-[#2F6A55]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            📦 Katalog & Stok ({products.length})
            {activeTab === "produk" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6A55] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("pesanan")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === "pesanan" ? "text-[#2F6A55]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            🛒 Daftar Pesanan ({orders.length})
            {activeTab === "pesanan" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6A55] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("eskalasi")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === "eskalasi" ? "text-[#B8483F]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            ⚠️ Perlu Perhatian ({pendingEscalationsCount})
            {pendingEscalationsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#B8483F] text-white text-[10px] rounded-full">
                {pendingEscalationsCount}
              </span>
            )}
            {activeTab === "eskalasi" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B8483F] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === "chat" ? "text-[#2F6A55]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            💬 Live Inbox & Simulasi ({uniqueCustomerPhones.length})
            {activeTab === "chat" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6A55] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("info")}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === "info" ? "text-[#2F6A55]" : "text-[#6B7570] hover:text-[#1F2A24]"
            }`}
          >
            ⚙️ Info Toko
            {activeTab === "info" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2F6A55] rounded-full"></span>
            )}
          </button>
        </div>

        {/* TAB REAL WHATSAPP WEB BAILYES SCANNER */}
        {activeTab === "wa" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card
              title="📲 Hubungkan WhatsApp Toko Fisik (Baileys Scanner)"
              subtitle="Sambungkan nomor HP WhatsApp toko Anda 100% aman via Scan Kode QR"
            >
              <div className="space-y-6 text-center py-4">
                {waState.status === "CONNECTED" && (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-4 text-emerald-900">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#2F6A55] flex items-center justify-center font-bold text-3xl mx-auto">
                      🟢
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold text-[#1F2A24]">
                        WhatsApp Toko Berhasil Terhubung!
                      </h3>
                      <p className="text-xs font-mono font-bold text-[#2F6A55] text-base">
                        Nomor HP: +{waState.phoneNumber || "628xxxxxxxx"}
                      </p>
                      <p className="text-xs text-[#6B7570] max-w-sm mx-auto pt-1">
                        AI Bot Balas kini aktif membalas seluruh chat pelanggan yang masuk ke nomor WhatsApp HP toko ini secara otomatis 24/7!
                      </p>
                    </div>

                    <Button
                      variant="danger"
                      onClick={handleDisconnectWA}
                      disabled={waConnecting}
                      className="px-6 py-2.5 text-xs font-bold rounded-xl"
                    >
                      {waConnecting ? "Memutuskan..." : "🔌 Putuskan Sambungan WA"}
                    </Button>
                  </div>
                )}

                {waState.status === "QR_READY" && waState.qrCodeUrl && (
                  <div className="p-6 bg-white rounded-3xl border border-[#2F6A55] ring-2 ring-[#2F6A55]/20 space-y-4 text-center">
                    <span className="px-3.5 py-1 bg-[#2F6A55]/10 text-[#2F6A55] text-xs font-bold rounded-full">
                      ✨ Kode QR WhatsApp Siap Di-scan
                    </span>

                    <div className="w-64 h-64 mx-auto p-3 bg-white rounded-2xl border border-[#E2E0D8] shadow-md flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={waState.qrCodeUrl}
                        alt="Kode QR WhatsApp Baileys"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>

                    <div className="bg-[#F5F3EE] p-4 rounded-2xl border border-[#E2E0D8] text-left text-xs space-y-2">
                      <p className="font-bold text-[#1F2A24]">Langkah Scan dari HP Anda:</p>
                      <ol className="list-decimal list-inside text-[#6B7570] space-y-1">
                        <li>Buka aplikasi WhatsApp di HP toko Anda</li>
                        <li>Klik menu Opsi (titik 3) ➔ pilih <strong>Perangkat Tertaut (Linked Devices)</strong></li>
                        <li>Klik <strong>Tautkan Perangkat (Link a Device)</strong></li>
                        <li>Arahkan kamera HP ke Kode QR di atas layar ini</li>
                      </ol>
                    </div>

                    <p className="text-[11px] text-[#6B7570] animate-pulse">
                      ⏳ Menunggu kamera HP meng-scan kode QR... (Status ter-refresh otomatis)
                    </p>
                  </div>
                )}

                {waState.status === "CONNECTING" && (
                  <div className="p-10 bg-white rounded-3xl border border-[#E2E0D8] text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#2F6A55] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-[#1F2A24]">
                      Sedang Membuat Kode QR & Menghubungkan ke WhatsApp Server...
                    </p>
                  </div>
                )}

                {waState.status === "DISCONNECTED" && (
                  <div className="p-8 bg-white rounded-3xl border border-[#E2E0D8] text-center space-y-6">
                    <div className="w-16 h-16 rounded-3xl bg-[#2F6A55]/10 text-[#2F6A55] flex items-center justify-center font-bold text-3xl mx-auto">
                      📲
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-extrabold text-[#1F2A24]">
                        WhatsApp HP Toko Belum Terhubung
                      </h3>
                      <p className="text-xs text-[#6B7570] max-w-sm mx-auto">
                        Klik tombol di bawah untuk memunculkan Kode QR WhatsApp Baileys dan mulai menyambungkan HP toko Anda.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleConnectWA}
                      disabled={waConnecting}
                      className="px-8 py-3.5 text-xs font-bold bg-[#2F6A55] text-white rounded-xl shadow-md hover:bg-[#265746]"
                    >
                      {waConnecting ? "Generasi Kode QR..." : "📲 Generasikan Kode QR WA Toko"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 1: LAPORAN BISNIS */}
        {activeTab === "laporan" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E0D8]">
              <div>
                <h3 className="font-extrabold text-sm text-[#1F2A24]">Ringkasan Laporan Performa Toko</h3>
                <p className="text-xs text-[#6B7570]">Dihitung secara real-time dari data transaksi pesanan & stok Anda</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs font-bold text-[#6B7570] whitespace-nowrap">Filter:</span>
                <div className="flex bg-[#F5F3EE] p-1 rounded-lg border border-[#E2E0D8] text-xs">
                  {[
                    { id: "today", label: "Hari Ini" },
                    { id: "week", label: "Minggu Ini" },
                    { id: "month", label: "Bulan Ini" },
                    { id: "all", label: "Semua" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setReportPeriod(p.id as any)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                        reportPeriod === p.id
                          ? "bg-[#2F6A55] text-white shadow-xs"
                          : "text-[#6B7570] hover:text-[#1F2A24]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#2F6A55] text-white rounded-2xl p-5 shadow-xs border border-[#2F6A55] flex flex-col justify-between">
                <span className="text-xs font-bold uppercase opacity-90 tracking-wider">Total Pendapatan Lunas</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
                  Rp {reports.totalRevenue.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-emerald-100 font-medium mt-1">
                  Dari {reports.paidOrdersCount} pesanan LUNAS ({reportPeriod})
                </p>
              </div>

              <Card className="bg-white border-[#E2E0D8]">
                <span className="text-xs font-bold text-[#B8863B] uppercase">Menunggu Pembayaran</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#B8863B] mt-1.5">{reports.pendingOrdersCount}</p>
                <p className="text-[11px] text-[#6B7570] mt-1">Pesanan belum dilunasi</p>
              </Card>

              <Card className="bg-white border-[#E2E0D8]">
                <span className="text-xs font-bold text-[#B8483F] uppercase">Eskalasi Pending</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#B8483F] mt-1.5">{reports.unresolvedEscalationsCount}</p>
                <p className="text-[11px] text-[#6B7570] mt-1">Butuh respon pemilik toko</p>
              </Card>

              <Card className="bg-white border-[#E2E0D8]">
                <span className="text-xs font-bold text-[#B8863B] uppercase">Stok Menipis (≤ 5)</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#B8863B] mt-1.5">{reports.lowStockProducts.length}</p>
                <p className="text-[11px] text-[#6B7570] mt-1">Produk perlu di-restok</p>
              </Card>
            </div>

            <Card title="⚠️ Daftar Produk Stok Menipis (Perlu Restok)" subtitle="Menampilkan produk dengan jumlah sisa stok ≤ 5 unit">
              {reports.lowStockProducts.length === 0 ? (
                <div className="border border-[#E2E0D8] rounded-xl p-6 text-center bg-[#F5F3EE]/50 my-2">
                  <p className="text-xs text-[#2F6A55] font-bold">✓ Seluruh produk toko Anda dalam jumlah stok aman (&gt; 5 unit).</p>
                </div>
              ) : (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                        <th className="py-3 px-3">Nama Produk</th>
                        <th className="py-3 px-3">Harga</th>
                        <th className="py-3 px-3">Sisa Stok Saat Ini</th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E0D8]">
                      {reports.lowStockProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#F5F3EE]/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-[#1F2A24]">{p.name}</td>
                          <td className="py-3 px-3 font-bold text-[#2F6A55]">Rp {p.price.toLocaleString("id-ID")}</td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-[#B8483F] bg-[#B8483F]/10 px-2 py-0.5 rounded-md border border-[#B8483F]/20">
                              {p.stock} Unit
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#B8863B]">
                            Restok Segera!
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: INFO BISNIS */}
        {activeTab === "info" && (
          <div className="max-w-2xl">
            <Card title="Pengaturan Info & Aturan Toko" subtitle="Data ini digunakan oleh AI Bot untuk menjawab pertanyaan pelanggan">
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs mt-2">
                <div>
                  <label className="block font-bold text-[#1F2A24] mb-1">Nama Bisnis UMKM *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F2A24] mb-1">Deskripsi Singkat Toko</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Toko kue PO dan kuliner rumahan..."
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F2A24] mb-1">Jam Operasional Toko</label>
                  <input
                    type="text"
                    placeholder="Contoh: Senin - Sabtu (08.00 - 20.00 WIB)"
                    value={profileForm.operatingHours}
                    onChange={(e) => setProfileForm({ ...profileForm, operatingHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F2A24] mb-1">Kebijakan Toko (Pengiriman / Pembayaran / Retur)</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Transfer BCA 12345678 a.n Rani. Pengiriman via GoSend jam 14.00 WIB..."
                    value={profileForm.policies}
                    onChange={(e) => setProfileForm({ ...profileForm, policies: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                  />
                </div>

                <Button variant="primary" type="submit" className="py-2.5 px-6 text-xs w-full sm:w-auto" disabled={profileLoading}>
                  {profileLoading ? "Menyimpan..." : "Simpan Perubahan Info Toko"}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* TAB 3: KATALOG & STOK PRODUK */}
        {activeTab === "produk" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <Card title="Tambah Produk Baru" subtitle="Input barang/jasa untuk dijual">
                <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs mt-2">
                  <div>
                    <label className="block font-bold text-[#1F2A24] mb-1">Nama Produk *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Frozen Beef Teriyaki 500g"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#1F2A24] mb-1">Harga (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="45000"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#1F2A24] mb-1">Stok Barang *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="10"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1F2A24] mb-1">Deskripsi Produk</label>
                    <textarea
                      rows={2}
                      placeholder="Deskripsi singkat varian/kemasan..."
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F5F3EE]/60 border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                    />
                  </div>

                  <Button variant="primary" type="submit" className="w-full text-xs py-2.5" disabled={productLoading}>
                    {productLoading ? "Menambahkan..." : "+ Tambah ke Katalog"}
                  </Button>
                </form>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card title="Daftar Katalog Produk Toko" subtitle="Hanya menampilkan produk milik UMKM ini">
                {products.length === 0 ? (
                  <div className="border border-[#E2E0D8] rounded-xl p-8 text-center bg-[#F5F3EE]/50 my-2">
                    <p className="text-xs text-[#6B7570]">Belum ada produk di katalog toko Anda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                          <th className="py-3 px-3">Produk</th>
                          <th className="py-3 px-3">Harga</th>
                          <th className="py-3 px-3">Stok</th>
                          <th className="py-3 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E0D8]">
                        {products.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F5F3EE]/40 transition-colors">
                            <td className="py-3 px-3 font-bold text-[#1F2A24]">
                              <div>{item.name}</div>
                              {item.description && (
                                <div className="text-[10px] text-[#6B7570] font-normal truncate max-w-[200px]">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#2F6A55]">
                              Rp {item.price.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                  item.stock <= 5
                                    ? "bg-[#B8863B]/10 text-[#B8863B]"
                                    : "bg-[#2F6A55]/10 text-[#2F6A55]"
                                }`}
                              >
                                {item.stock} Unit
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Button
                                variant="danger"
                                onClick={() => handleDeleteProduct(item.id, item.name)}
                                disabled={deleteLoadingId === item.id}
                                className="text-[11px] py-1 px-2.5 font-semibold"
                              >
                                {deleteLoadingId === item.id ? "..." : "Hapus"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* TAB 4: DAFTAR PESANAN */}
        {activeTab === "pesanan" && (
          <Card title="Daftar Pesanan Masuk (Order Management)" subtitle="Pesanan yang dicatat otomatis oleh Tool AI Bot">
            {orders.length === 0 ? (
              <div className="border border-[#E2E0D8] rounded-xl p-8 text-center bg-[#F5F3EE]/50 my-2">
                <p className="text-xs text-[#6B7570]">Belum ada pesanan masuk dari pelanggan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                      <th className="py-3 px-3">Waktu & Pelanggan</th>
                      <th className="py-3 px-3">Item Pesanan</th>
                      <th className="py-3 px-3">Total Harga</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Aksi Konfirmasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0D8]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#F5F3EE]/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#1F2A24]">
                          <div>{order.customerName || "Pelanggan WA"}</div>
                          <div className="text-[10px] text-[#6B7570] font-normal">
                            📱 {order.customerPhone || "-"} |{" "}
                            {new Date(order.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {order.items.map((i) => (
                              <div key={i.id} className="text-xs">
                                • <span className="font-semibold">{i.productName}</span> x{i.quantity} (Rp{" "}
                                {(i.price * i.quantity).toLocaleString("id-ID")})
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#2F6A55]">
                          Rp {order.totalAmount.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              order.status === "LUNAS"
                                ? "bg-[#2F6A55]/10 text-[#2F6A55]"
                                : order.status === "DIBATALKAN"
                                ? "bg-[#B8483F]/10 text-[#B8483F]"
                                : "bg-[#B8863B]/10 text-[#B8863B]"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          {order.status === "MENUNGGU_PEMBAYARAN" && (
                            <>
                              <Button
                                variant="primary"
                                onClick={() => handleOrderAction(order.id, "LUNAS")}
                                disabled={actionLoadingId === order.id}
                                className="text-[11px] py-1 px-2.5"
                              >
                                Tandai Lunas
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => handleOrderAction(order.id, "DIBATALKAN")}
                                disabled={actionLoadingId === order.id}
                                className="text-[11px] py-1 px-2.5"
                              >
                                Batalkan
                              </Button>
                            </>
                          )}
                          {order.status !== "MENUNGGU_PEMBAYARAN" && (
                            <span className="text-[11px] text-[#6B7570] italic">Selesai</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 5: PERLU PERHATIAN (ESKALASI) */}
        {activeTab === "eskalasi" && (
          <Card title="Daftar Eskalasi (Butuh Penanganan Owner)" subtitle="Catatan chat yang dialihkan otomatis oleh Tool AI Bot">
            {escalations.length === 0 ? (
              <div className="border border-[#E2E0D8] rounded-xl p-8 text-center bg-[#F5F3EE]/50 my-2">
                <p className="text-xs text-[#6B7570]">Tidak ada catatan eskalasi pending saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] text-[#6B7570] font-bold">
                      <th className="py-3 px-3">Waktu & Alasan</th>
                      <th className="py-3 px-3">Ringkasan Eskalasi</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0D8]">
                    {escalations.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F5F3EE]/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#1F2A24]">
                          <span className="px-2 py-0.5 bg-[#B8863B]/10 text-[#B8863B] rounded-md text-[10px] block w-max mb-1">
                            {item.reason}
                          </span>
                          <div className="text-[10px] text-[#6B7570] font-normal">
                            {new Date(item.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#1F2A24]">
                          <p className="font-semibold">{item.summary}</p>
                          {item.conversation && (
                            <p className="text-[11px] text-[#6B7570] mt-0.5 italic">
                              &quot;{item.conversation.message}&quot;
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              item.status === "SELESAI"
                                ? "bg-[#2F6A55]/10 text-[#2F6A55]"
                                : "bg-[#B8483F]/10 text-[#B8483F]"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.status === "BELUM_SELESAI" ? (
                            <Button
                              variant="primary"
                              onClick={() => handleResolveEscalation(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Tandai Selesai
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#6B7570] italic">Selesai</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 6: MULTI-CUSTOMER WHATSAPP LIVE INBOX & SIMULASI */}
        {activeTab === "chat" && (
          <div className="bg-white rounded-3xl border border-[#E2E0D8] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
            {/* SISI KIRI: DAFTAR KONTAK PELANGGAN (4 Cols) */}
            <div className="lg:col-span-4 border-r border-[#E2E0D8] bg-[#F5F3EE]/40 flex flex-col">
              <div className="p-4 border-b border-[#E2E0D8] bg-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm text-[#1F2A24]">Daftar Chat Pelanggan</h3>
                  <p className="text-[11px] text-[#6B7570]">({customerList.length} Kontak Terdaftar)</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="divide-y divide-[#E2E0D8] overflow-y-auto flex-1 max-h-[500px]">
                {customerList.map((cust) => {
                  const isSelected = cust.phone === selectedCustomerPhone;
                  return (
                    <div
                      key={cust.phone}
                      onClick={() => setSelectedCustomerPhone(cust.phone)}
                      className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-[#2F6A55]/10 border-l-4 border-[#2F6A55]"
                          : "hover:bg-[#E2E0D8]/40"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-[#2F6A55] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        👤
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="font-bold text-xs text-[#1F2A24] truncate">
                            {cust.phone === "081234567890" ? "Pelanggan Contoh (081234567890)" : cust.phone}
                          </span>
                          <span className="text-[10px] text-[#6B7570] shrink-0 font-mono">
                            {new Date(cust.lastTime).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#6B7570] truncate leading-tight">
                          {cust.lastMessage}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2">
                          {cust.hasEscalation && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full">
                              ⚠️ Butuh Perhatian
                            </span>
                          )}
                          {cust.hasOrder && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-[#2F6A55] text-[9px] font-bold rounded-full">
                              🛒 Ada Pesanan
                            </span>
                          )}
                          {!cust.hasEscalation && !cust.hasOrder && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-semibold rounded-full">
                              🤖 Dibalas AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SISI KANAN: AREA ISI PERCAKAPAN LENGKAP (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-[#EFEAE2]">
              {/* Header Obrolan */}
              <div className="bg-[#2F6A55] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-base">
                    📱
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">
                      Percakapan WA: {selectedCustomerPhone}
                    </h3>
                    <p className="text-[10px] text-emerald-100">
                      Auto AI Bot Active • Membalas Otomatis Dari Data Toko
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {usingApiKey === true && (
                    <span className="px-2.5 py-1 bg-emerald-700/80 text-emerald-100 text-[10px] font-semibold rounded-md">
                      ⚡ Gemini Live
                    </span>
                  )}
                  {usingApiKey === false && (
                    <span className="px-2.5 py-1 bg-amber-600/80 text-amber-100 text-[10px] font-semibold rounded-md">
                      💡 Smart Engine
                    </span>
                  )}
                </div>
              </div>

              {/* Area Chat Messages */}
              <div
                ref={chatScrollRef}
                className="h-[380px] sm:h-[430px] p-4 overflow-y-auto space-y-3 text-xs font-normal"
              >
                {selectedConversations.length === 0 ? (
                  <div className="text-center py-20 space-y-2 text-[#6B7570]">
                    <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center mx-auto text-xl shadow-xs">
                      💬
                    </div>
                    <p className="font-bold text-sm text-[#1F2A24]">
                      Belum ada riwayat pesan untuk nomor {selectedCustomerPhone}
                    </p>
                    <p className="text-xs max-w-xs mx-auto">
                      Tulis pesan di bawah ini untuk memulai obrolan simulasi dengan AI Bot toko.
                    </p>
                  </div>
                ) : (
                  selectedConversations.map((chat) => (
                    <div
                      key={chat.id}
                      className={`flex flex-col ${
                        chat.sender === "PELANGGAN" ? "items-start" : "items-end"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-xs whitespace-pre-wrap leading-relaxed ${
                          chat.sender === "PELANGGAN"
                            ? "bg-white text-[#1F2A24] rounded-tl-none border border-[#E2E0D8]"
                            : "bg-[#2F6A55] text-white rounded-tr-none"
                        }`}
                      >
                        <div className="text-[10px] opacity-70 mb-0.5 font-semibold">
                          {chat.sender === "PELANGGAN"
                            ? `Pelanggan (${chat.customerPhone})`
                            : `Admin AI (${tenant?.name})`}
                        </div>
                        <div>{chat.message}</div>
                        <div className="text-[9px] opacity-60 text-right mt-1 font-mono">
                          {new Date(chat.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {sendingChat && (
                  <div className="flex justify-end">
                    <div className="bg-[#2F6A55]/80 text-white rounded-2xl rounded-tr-none px-3.5 py-2 text-xs flex items-center gap-2 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-white animate-bounce delay-150"></span>
                      <span className="w-2 h-2 rounded-full bg-white animate-bounce delay-300"></span>
                      <span className="text-[10px]">AI Bot sedang membalas...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Send Input Chat */}
              <form
                onSubmit={handleSendChat}
                className="bg-white p-3 border-t border-[#E2E0D8] flex gap-2 items-center"
              >
                <input
                  type="text"
                  required
                  placeholder={`Kirim pesan simulasi sebagai ${selectedCustomerPhone}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-[#F5F3EE] border border-[#E2E0D8] rounded-xl text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6A55]"
                />
                <Button
                  variant="primary"
                  type="submit"
                  className="py-2.5 px-4 text-xs font-bold whitespace-nowrap bg-[#2F6A55] text-white rounded-xl"
                  disabled={sendingChat}
                >
                  {sendingChat ? "Kirim..." : "Kirim WA ➔"}
                </Button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
