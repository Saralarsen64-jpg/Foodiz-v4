import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle,
  CreditCard,
  LogOut,
  Megaphone,
  Menu,
  Save,
  ShieldAlert,
  UserCheck,
  ImagePlus,
  Loader,
} from "lucide-react";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";

type EstablishmentForm = {
  name: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  description: string;
};

const EMPTY_FORM: EstablishmentForm = {
  name: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  description: "",
};

export default function PartnerSettings() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [legacyBankAccount, setLegacyBankAccount] = useState<{ iban: string; holder_name: string } | null>(null);
  const [form, setForm] = useState<EstablishmentForm>(EMPTY_FORM);
  const [coverImage, setCoverImage] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/login?role=partner");
        return;
      }

      const [{ data: restaurant }, { data: bankAccount }] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id,name,phone,address,postal_code,city,description,cover_image")
          .eq("owner_id", user.id)
          .maybeSingle(),
        supabase
          .from("bank_accounts")
          .select("iban,holder_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (restaurant) {
        setRestaurantId(restaurant.id);
        setForm({
          name: restaurant.name || "",
          phone: restaurant.phone || "",
          address: restaurant.address || "",
          postalCode: restaurant.postal_code || "",
          city: restaurant.city || "",
          description: restaurant.description || "",
        });
        setCoverImage(restaurant.cover_image || "");
      }
      if (bankAccount?.iban) setLegacyBankAccount(bankAccount);
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const updateField = (field: keyof EstablishmentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!restaurantId || !form.name.trim() || !form.address.trim() || !form.postalCode.trim() || !form.city.trim()) {
      setMessage({ type: "error", text: "Renseignez le nom et l'adresse complète de l'établissement." });
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: restaurant } = await supabase.from("restaurants").select("siret").eq("id", restaurantId).single();
    const response = await fetch("/api/address-management", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        action: "save",
        ...form,
        siret: restaurant?.siret || "",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok
      ? { type: "success", text: "Informations et coordonnées de l'établissement mises à jour." }
      : { type: "error", text: payload.error || "Impossible d'enregistrer les modifications." });
    setSaving(false);
  };

  const uploadCover = async (file?: File) => {
    if (!file || !restaurantId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Utilisez une image JPG, PNG ou WebP de 5 Mo maximum." });
      return;
    }
    setUploadingCover(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${restaurantId}/cover/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("restaurant-media").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("restaurant-media").getPublicUrl(path);
      const { error: updateError } = await supabase.from("restaurants").update({ cover_image: data.publicUrl }).eq("id", restaurantId);
      if (updateError) throw updateError;
      setCoverImage(data.publicUrl);
      setMessage({ type: "success", text: "Photo de couverture mise à jour." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Upload impossible." });
    } finally {
      setUploadingCover(false);
    }
  };

  const maskedIban = legacyBankAccount?.iban
    ? `${legacyBankAccount.iban.slice(0, 4)} •••• •••• •••• ${legacyBankAccount.iban.slice(-4)}`
    : "";

  const menuItems = [
    { label: "Dashboard", icon: Activity, path: "/partner" },
    { label: "Commandes", icon: UserCheck, path: "/partner/orders/current" },
    { label: "Finances", icon: CreditCard, path: "/partner/payouts" },
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold md:hidden"><Menu size={22} /></button>
          <Logo size="md" />
          <div className="w-6" />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-foodiz-card border-r border-foodiz-gold/10 p-6 overflow-y-auto">
            <Logo size="md" className="mb-8" />
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all">
                  <item.icon size={18} className="text-foodiz-gold" /> {item.label}
                </button>
              ))}
              <button onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-red hover:bg-foodiz-red/5 transition-all mt-8">
                <LogOut size={18} /> Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="foodiz-title text-2xl text-foodiz-cream mb-2">Paramètres de l'établissement</h1>
        <p className="text-foodiz-gray text-sm mb-8">Mettez à jour les informations visibles et utilisées pour vos commandes.</p>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === "success" ? "bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20" : "bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20"}`}>
            {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-foodiz-gold/10">
            <div className="p-3 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20"><Building2 size={24} className="text-foodiz-gold" /></div>
            <div>
              <h2 className="text-lg font-bold text-foodiz-cream">Informations publiques</h2>
              <p className="text-xs text-foodiz-gray">Nom, contact et adresse de votre établissement.</p>
            </div>
          </div>

          {loading ? <p className="text-sm text-foodiz-gray">Chargement...</p> : (
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Photo de couverture</label>
                {coverImage && <img src={coverImage} alt="Couverture de l'établissement" className="h-52 w-full rounded-2xl border border-foodiz-gold/15 object-cover" />}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-foodiz-gold/30 bg-foodiz-gold/5 px-4 py-3 text-sm text-foodiz-gold hover:bg-foodiz-gold/10">
                  {uploadingCover ? <Loader size={17} className="animate-spin"/> : <ImagePlus size={17}/>}
                  {uploadingCover ? "Chargement..." : "Choisir une photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingCover} onChange={(event) => void uploadCover(event.target.files?.[0])} className="hidden" />
                </label>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Nom de l'établissement" value={form.name} onChange={(value) => updateField("name", value)} required />
                <Field label="Téléphone" value={form.phone} onChange={(value) => updateField("phone", value)} type="tel" />
              </div>
              <Field label="Adresse" value={form.address} onChange={(value) => updateField("address", value)} required />
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Code postal" value={form.postalCode} onChange={(value) => updateField("postalCode", value)} required />
                <Field label="Ville" value={form.city} onChange={(value) => updateField("city", value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Description</label>
                <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors resize-none" />
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={saving || !restaurantId} className="foodiz-btn flex items-center gap-2 px-8 py-3 disabled:opacity-50">
                  <Save size={18} /> {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          )}
        </form>

        <section className="foodiz-card p-6 mt-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20"><ShieldAlert size={23} className="text-foodiz-gold" /></div>
            <div>
              <h2 className="text-lg font-bold text-foodiz-cream">Versements bancaires</h2>
              {legacyBankAccount ? (
                <p className="text-sm text-foodiz-gray mt-2">Un ancien compte est enregistré pour {legacyBankAccount.holder_name || "votre établissement"} ({maskedIban}). Aucune nouvelle coordonnée bancaire n'est acceptée ici.</p>
              ) : (
                <p className="text-sm text-foodiz-gray mt-2">Aucun compte de versement n'est encore connecté.</p>
              )}
              <p className="text-xs text-foodiz-gray/70 mt-3">Les virements seront activés avec une connexion bancaire Stripe sécurisée. Tant que cette connexion n'est pas disponible, aucun virement automatique n'est annoncé.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">{label}</label>
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors" />
    </div>
  );
}
