import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Megaphone } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminMarketingCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  useEffect(() => { void supabase.from("marketing_campaigns").select("id,title,description,status,target_city,target_audience,recipient_count,opened_count,converted_orders_count,created_at,restaurant:restaurants(name)").order("created_at", { ascending: false }).then(({ data }) => setCampaigns(data || [])); }, []);
  return <div className="min-h-screen bg-foodiz-black text-foodiz-cream"><header className="border-b border-foodiz-gold/10 bg-foodiz-card px-6 py-4"><div className="mx-auto flex max-w-6xl items-center gap-3"><button onClick={() => navigate("/admin")} className="text-foodiz-gold"><ChevronLeft size={20}/></button><h1 className="foodiz-title text-lg">Campagnes Foodiz+</h1></div></header><main className="mx-auto max-w-6xl space-y-3 p-6">{campaigns.length === 0 && <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucune campagne réelle.</div>}{campaigns.map((campaign) => <article key={campaign.id} className="foodiz-card p-4"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><Megaphone size={18} className="mt-1 shrink-0 text-foodiz-gold"/><div><p className="text-sm font-medium">{campaign.restaurant?.name || "Établissement"} · {campaign.title}</p><p className="mt-1 text-xs text-foodiz-gray">{campaign.description}</p><p className="mt-2 text-[10px] text-foodiz-gray">{campaign.target_city || "Toute ville"} · {campaign.target_audience} · {new Date(campaign.created_at).toLocaleString("fr-FR")}</p></div></div><div className="text-right"><p className="text-[10px] uppercase text-foodiz-gold">{campaign.status}</p><p className="mt-2 text-xs text-foodiz-cream">{campaign.opened_count}/{campaign.recipient_count} ouvertures</p><p className="mt-1 text-[10px] text-foodiz-gray">{campaign.converted_orders_count} conversion(s)</p></div></div></article>)}</main></div>;
}
