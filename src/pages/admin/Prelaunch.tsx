import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, Download, LoaderCircle, Mail, RefreshCw, Store, Users } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  role: "client" | "livreur" | "partenaire";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  created_at: string;
  partner?: { establishment_name?: string } | { establishment_name?: string }[] | null;
};

type Payload = {
  profiles: Profile[];
  counts: { total: number; clients: number; drivers: number; partners: number };
};

const roleLabels = { client: "Client", livreur: "Livreur", partenaire: "Partenaire" };
const statusLabels: Record<string, string> = {
  prelaunch_pending: "En attente",
  launch_email_sent: "Accès envoyé",
  activated: "Activé",
  rejected: "Refusé",
};

async function authorizedFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
  });
}

export default function AdminPrelaunch() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authorizedFetch("/api/admin/prelaunch");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Chargement impossible");
      setData(payload);
    } catch (error: any) {
      toast.error(error.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const cards = useMemo(() => [
    { label: "Total", value: data?.counts.total || 0, icon: Users },
    { label: "Clients", value: data?.counts.clients || 0, icon: Users },
    { label: "Livreurs", value: data?.counts.drivers || 0, icon: Bike },
    { label: "Partenaires", value: data?.counts.partners || 0, icon: Store },
  ], [data]);

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Rôle", "Prénom", "Nom", "Établissement", "Email", "Téléphone", "Ville", "Statut", "Date"],
      ...(data?.profiles || []).map((profile) => {
        const partner = Array.isArray(profile.partner) ? profile.partner[0] : profile.partner;
        return [
          roleLabels[profile.role],
          profile.first_name,
          profile.last_name,
          partner?.establishment_name || "",
          profile.email,
          profile.phone,
          profile.city,
          statusLabels[profile.status] || profile.status,
          new Date(profile.created_at).toLocaleString("fr-FR"),
        ];
      }),
    ];
    const csv = rows.map((row) => row.map(escape).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `foodiz-preinscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendLaunchAccess = async () => {
    if (!window.confirm("Envoyer les accès de lancement aux profils en attente ?")) return;
    setSending(true);
    try {
      const response = await authorizedFetch("/api/admin/prelaunch/send-launch-access", { method: "POST" });
      const payload = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(payload.error || "Envoi impossible");
      toast.success(`${payload.sent} accès envoyé(s)${payload.failed ? `, ${payload.failed} échec(s)` : ""}.`);
      await load();
    } catch (error: any) {
      toast.error(error.message || "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell
      title="Pré-lancement"
      subtitle="Pré-inscriptions, activation et ouverture contrôlée de Foodiz"
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <article key={card.label} className="foodiz-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[.18em] text-foodiz-gray">{card.label}</p>
              <card.icon size={19} className="text-foodiz-gold" />
            </div>
            <p className="foodiz-title text-4xl mt-5">{card.value}</p>
          </article>
        ))}
      </div>

      <section className="foodiz-card overflow-hidden">
        <div className="p-5 border-b border-foodiz-gold/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="foodiz-title text-xl">Liste d’attente</h2>
            <p className="text-xs text-foodiz-gray mt-1">Données Auth reliées et consentements enregistrés.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load()} className="foodiz-btn-outline !px-4 !py-2.5 flex items-center gap-2">
              <RefreshCw size={16} /> Actualiser
            </button>
            <button onClick={exportCsv} className="foodiz-btn-outline !px-4 !py-2.5 flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
            <button disabled={sending} onClick={() => void sendLaunchAccess()} className="foodiz-btn !px-4 !py-2.5 flex items-center gap-2 disabled:opacity-50">
              {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
              Envoyer les accès
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-14 flex justify-center"><LoaderCircle className="animate-spin text-foodiz-gold" /></div>
        ) : !data?.profiles.length ? (
          <div className="p-14 text-center text-foodiz-gray">Aucune pré-inscription pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="text-left text-[10px] uppercase tracking-[.16em] text-foodiz-gold bg-white/[.02]">
                <tr>
                  <th className="px-5 py-4">Profil</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Ville</th>
                  <th className="px-5 py-4">Téléphone</th>
                  <th className="px-5 py-4">Inscription</th>
                  <th className="px-5 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foodiz-gold/10">
                {data.profiles.map((profile) => {
                  const partner = Array.isArray(profile.partner) ? profile.partner[0] : profile.partner;
                  return (
                    <tr key={profile.id} className="hover:bg-white/[.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{profile.first_name} {profile.last_name}</p>
                        <p className="text-xs text-foodiz-gold mt-1">
                          {roleLabels[profile.role]}{partner?.establishment_name ? ` · ${partner.establishment_name}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-foodiz-gray">{profile.email}</td>
                      <td className="px-5 py-4">{profile.city}</td>
                      <td className="px-5 py-4 text-foodiz-gray">{profile.phone}</td>
                      <td className="px-5 py-4 text-foodiz-gray">{new Date(profile.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-foodiz-gold/20 bg-foodiz-gold/5 px-3 py-1 text-xs text-foodiz-gold">
                          {statusLabels[profile.status] || profile.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
