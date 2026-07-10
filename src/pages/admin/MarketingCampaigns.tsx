import { useEffect, useMemo, useState } from "react";
import { BarChart3, Megaphone, MousePointerClick, ShoppingBag, Users } from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

export default function AdminMarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void supabase.from("marketing_campaigns").select("id,title,description,status,target_city,target_audience,recipient_count,opened_count,clicked_count,converted_orders_count,created_at,restaurant:restaurants(name)").order("created_at", { ascending: false }).then(({ data }) => { setCampaigns(data || []); setLoading(false); }); }, []);
  const stats = useMemo(() => ({
    campaigns: campaigns.length,
    recipients: campaigns.reduce((sum, campaign) => sum + Number(campaign.recipient_count || 0), 0),
    opens: campaigns.reduce((sum, campaign) => sum + Number(campaign.opened_count || 0), 0),
    conversions: campaigns.reduce((sum, campaign) => sum + Number(campaign.converted_orders_count || 0), 0),
  }), [campaigns]);
  return <AdminShell title="Campagnes Weello+" subtitle="Performance réelle des notifications partenaires et conversions attribuées">
    <section className="grid gap-4 md:grid-cols-4">{[
      ["Campagnes", stats.campaigns, Megaphone, "text-weello-gold"],
      ["Clients touchés", stats.recipients, Users, "text-weello-cream"],
      ["Ouvertures", stats.opens, MousePointerClick, "text-weello-green"],
      ["Conversions", stats.conversions, ShoppingBag, "text-amber-300"],
    ].map(([label, value, Icon, color]) => <article key={String(label)} className="weello-card border-weello-gold/15 p-5"><Icon size={20} className={String(color)}/><p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">{label}</p><p className="mt-2 text-3xl font-serif italic text-weello-cream">{String(value)}</p></article>)}</section>
    {loading ? <div className="weello-card p-8 text-center text-weello-gray animate-pulse">Chargement des campagnes...</div> : campaigns.length === 0 ? <div className="weello-card p-5 text-sm text-weello-gray">Aucune campagne réelle.</div> : <section className="grid gap-4 xl:grid-cols-2">{campaigns.map((campaign) => {
      const openRate = campaign.recipient_count ? Math.round((Number(campaign.opened_count || 0) / Number(campaign.recipient_count)) * 100) : 0;
      return <article key={campaign.id} className="weello-card border-weello-gold/15 p-5"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><Megaphone size={18} className="mt-1 shrink-0 text-weello-gold"/><div><p className="text-sm font-medium text-weello-cream">{campaign.restaurant?.name || "Établissement"} · {campaign.title}</p><p className="mt-1 text-xs text-weello-gray">{campaign.description}</p><p className="mt-2 text-[10px] text-weello-gray">{campaign.target_city || "Toute ville"} · {campaign.target_audience} · {new Date(campaign.created_at).toLocaleString("fr-FR")}</p></div></div><span className="rounded-full border border-weello-gold/20 px-3 py-1 text-[10px] uppercase text-weello-gold">{campaign.status}</span></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-lg text-weello-cream">{campaign.recipient_count}</p><p className="text-[9px] text-weello-gray">Reçues</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-lg text-weello-cream">{openRate}%</p><p className="text-[9px] text-weello-gray">Ouverture</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-lg text-weello-cream">{campaign.converted_orders_count}</p><p className="text-[9px] text-weello-gray">Commandes</p></div></div></article>;
    })}</section>}
  </AdminShell>;
}
