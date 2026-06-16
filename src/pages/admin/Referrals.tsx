import { useEffect, useMemo, useState } from "react";
import { Crown, Gift, Users } from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void (async () => {
    const [{ data: refData }, { data: topData }] = await Promise.all([
      supabase.from("referrals").select("parrain_id,filleul_id,status,reward_cents,created_at,profiles_parrain:profiles!referrals_parrain_id_fkey(full_name,email),profiles_filleul:profiles!referrals_filleul_id_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name,email,referral_count").gt("referral_count", 0).order("referral_count", { ascending: false }).limit(12),
    ]);
    setReferrals(refData || []); setTopReferrers(topData || []); setLoading(false);
  })(); }, []);

  const stats = useMemo(() => ({
    total: referrals.length,
    completed: referrals.filter((ref) => ref.status === "completed").length,
    rewards: referrals.reduce((sum, ref) => sum + Number(ref.reward_cents || 0), 0),
  }), [referrals]);
  const statCards = [
    { label: "Parrainages", value: stats.total, Icon: Users },
    { label: "Complétés", value: stats.completed, Icon: Gift },
    { label: "Top ambassadeurs", value: topReferrers.length, Icon: Crown },
  ];

  return <AdminShell title="Parrainages" subtitle="Ambassadeurs, filleuls et récompenses réellement enregistrées">
    <section className="grid gap-4 md:grid-cols-3">{statCards.map(({ label, value, Icon }) => <article key={label} className="foodiz-card border-foodiz-gold/15 p-5"><Icon size={20} className="text-foodiz-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{label}</p><p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{value}</p></article>)}</section>
    {topReferrers.length > 0 && <section className="foodiz-card border-foodiz-gold/20 p-5"><h2 className="foodiz-title mb-4 text-lg">Ambassadeurs</h2><div className="grid gap-3 md:grid-cols-3">{topReferrers.map((user) => <article key={user.email} className="rounded-2xl border border-foodiz-gold/15 bg-foodiz-black p-4"><p className="font-semibold text-foodiz-cream">{user.full_name || user.email}</p><p className="mt-1 text-[10px] text-foodiz-gray">{user.email}</p><p className="mt-3 text-xl font-serif italic text-foodiz-gold">{user.referral_count || 0}</p></article>)}</div></section>}
    {loading ? <div className="foodiz-card p-8 text-foodiz-gray animate-pulse">Chargement...</div> : <section className="foodiz-card overflow-hidden"><div className="border-b border-foodiz-gold/10 p-5"><h2 className="foodiz-title text-lg">Historique</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[0.02] text-foodiz-gold"><tr><th className="px-5 py-3">Parrain</th><th>Filleul</th><th>Date</th><th>Statut</th></tr></thead><tbody className="divide-y divide-white/5">{referrals.map((ref, index) => <tr key={`${ref.parrain_id}-${ref.filleul_id}-${index}`}><td className="px-5 py-4"><p className="text-foodiz-cream">{ref.profiles_parrain?.full_name || "-"}</p><p className="text-[10px] text-foodiz-gray">{ref.profiles_parrain?.email}</p></td><td><p className="text-foodiz-cream">{ref.profiles_filleul?.full_name || "-"}</p><p className="text-[10px] text-foodiz-gray">{ref.profiles_filleul?.email}</p></td><td className="text-foodiz-gray">{new Date(ref.created_at).toLocaleDateString("fr-FR")}</td><td><span className="rounded-full border border-foodiz-green/20 px-2 py-1 text-[10px] uppercase text-foodiz-green">{ref.status}</span></td></tr>)}</tbody></table></div></section>}
  </AdminShell>;
}
