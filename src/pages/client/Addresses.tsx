import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, MapPin, Plus, Trash2, Home, Briefcase } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function AddressesPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Maison", full_address: "" });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('client_addresses').select('*').eq('user_id', user.id);
      if (data) setAddresses(data);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && newAddress.full_address) {
      await supabase.from('client_addresses').insert({ user_id: user.id, ...newAddress });
      setNewAddress({ label: "Maison", full_address: "" });
      setShowForm(false);
      fetchAddresses();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('client_addresses').delete().eq('id', id);
    fetchAddresses();
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
            <input type="text" placeholder="Adresse complète..." required value={newAddress.full_address} onChange={e => setNewAddress({...newAddress, full_address: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none" />
            <button type="submit" className="w-full foodiz-btn py-3 text-sm">Enregistrer l'adresse</button>
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
                  <p className="text-foodiz-gray text-xs">{addr.full_address}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(addr.id)} className="text-foodiz-gray hover:text-foodiz-red transition-colors p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}