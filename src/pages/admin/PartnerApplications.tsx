import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PartnerApplicationRow = {
  id: string;
  user_id: string;
  city: string | null;
  status: string | null;
  created_at: string | null;
  profiles?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export default function AdminPartnerApplicationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PartnerApplicationRow[]>([]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("partner_applications")
      .select("id,user_id,city,status,created_at,profiles:profiles!partner_applications_user_id_fkey(first_name,last_name,email,phone)")
      .order("created_at", { ascending: false });

    if (data) setItems(data as any);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const update = async (item: PartnerApplicationRow, status: "validated" | "missing_documents") => {
    await supabase.from("partner_applications").update({ status }).eq("id", item.id);
    await supabase.from("profiles").update({ status }).eq("id", item.user_id);
    if (status === "validated") {
      await supabase.from("restaurants").update({ status: "active" }).eq("owner_id", item.user_id);
    }
    await loadItems();
  };

  return (
    <div className="min-h-screen bg-foodiz-black text-foodiz-cream">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Validation partenaires</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6 space-y-3">
        {items.length === 0 && <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucune demande partenaire.</div>}
        {items.map((a) => {
          const fullName = [a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(" ");
          return (
            <div key={a.id} className="foodiz-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{fullName || a.profiles?.email || "Partenaire"}</p>
                <p className="text-[10px] text-foodiz-gray mt-1">{a.city || "Ville non précisée"} · {a.profiles?.phone || "Téléphone non précisé"}</p>
                <p className="text-[10px] text-foodiz-gold/70 mt-1 uppercase">Statut : {a.status || "pending"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => update(a, 'validated')} className="p-2 rounded-xl bg-foodiz-gold text-foodiz-black"><CheckCircle2 size={16} /></button>
                <button onClick={() => update(a, 'missing_documents')} className="p-2 rounded-xl bg-white/5 text-foodiz-gray border border-white/10"><AlertCircle size={16} /></button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
