import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, MapPin, Plus, Trash2, Home, Briefcase, CheckCircle2, Loader } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import toast from "react-hot-toast";

export default function AddressesPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Maison",
    address: "",
    postalCode: "",
    city: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("client_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (data) setAddresses(data);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée.");
      const response = await fetch("/api/address-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "save",
          ...newAddress,
          makeDefault: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Adresse invalide.");
      setNewAddress({ label: "Maison", address: "", postalCode: "", city: "" });
      setShowForm(false);
      toast.success("Adresse vérifiée et utilisée pour vos livraisons.");
      await fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Impossible d'enregistrer l'adresse.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/address-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ action: "delete", addressId: id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Suppression impossible.");
    }
  };

  const setDefault = async (id: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/address-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ action: "set_default", addressId: id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      toast.success("Adresse de livraison sélectionnée.");
      await fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Sélection impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mes Adresses</h1>
          <button onClick={() => setShowForm(!showForm)} className="text-foodiz-gold"><Plus size={24} /></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <form onSubmit={handleAdd} className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/30 space-y-3 animate-fade-in-up">
            <select value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none">
              <option value="Maison">Maison</option>
              <option value="Travail">Travail</option>
              <option value="Autre">Autre</option>
            </select>
            <input type="text" placeholder="Numéro et rue" required value={newAddress.address} onChange={e => setNewAddress({...newAddress, address: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" inputMode="numeric" placeholder="Code postal" required value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none" />
              <input type="text" placeholder="Ville" required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none" />
            </div>
            <p className="text-[10px] leading-relaxed text-foodiz-gray">L'adresse est vérifiée côté serveur avant d'être utilisée pour calculer la livraison.</p>
            <button type="submit" disabled={saving} className="w-full foodiz-btn py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader size={15} className="animate-spin" />}
              Vérifier et utiliser cette adresse
            </button>
          </form>
        )}

        {addresses.length === 0 ? (
          <div className="text-center py-10 text-foodiz-gray text-sm">Aucune adresse enregistrée.</div>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className="foodiz-card p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold">
                  <GoldIcon icon={addr.label === 'Maison' ? Home : addr.label === 'Travail' ? Briefcase : MapPin} size={18} />
                </div>
                <div>
                  <p className="text-foodiz-cream text-sm font-bold">{addr.label}</p>
                  <p className="text-foodiz-gray text-xs">{[addr.address_line || addr.full_address, addr.postal_code, addr.city].filter(Boolean).join(", ")}</p>
                  {addr.is_default && <p className="mt-1 flex items-center gap-1 text-[10px] text-foodiz-green"><CheckCircle2 size={11}/>Adresse de livraison active</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!addr.is_default && <button disabled={saving} onClick={() => setDefault(addr.id)} className="rounded-lg px-2 py-1 text-[10px] text-foodiz-gold hover:bg-foodiz-gold/10">Utiliser</button>}
                <button disabled={addr.is_default} onClick={() => handleDelete(addr.id)} className="text-foodiz-gray hover:text-foodiz-red transition-colors p-2 disabled:opacity-20" title={addr.is_default ? "Choisissez une autre adresse avant de supprimer celle-ci" : "Supprimer"}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
