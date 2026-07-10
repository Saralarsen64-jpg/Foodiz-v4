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
  driver?: {
    siret?: string;
    vehicle_type?: string;
    availability?: string;
    availability_slots?: string[];
    availability_days?: string[];
    availability_flexible?: boolean;
  } | {
    siret?: string;
    vehicle_type?: string;
    availability?: string;
    availability_slots?: string[];
    availability_days?: string[];
    availability_flexible?: boolean;
  }[] | null;
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
      ["Rôle", "Prénom", "Nom", "Établissement", "SIRET livreur", "Véhicule", "Créneaux livreur", "Jours livreur", "Flexible", "Email", "Téléphone", "Ville", "Statut", "Date"],
      ...(data?.profiles || []).map((profile) => {
        const partner = Array.isArray(profile.partner) ? profile.partner[0] : profile.partner;
        const driver = Array.isArray(profile.driver) ? profile.driver[0] : profile.driver;
        return [
          roleLabels[profile.role],
          profile.first_name,
          profile.last_name,
          partner?.establishment_name || "",
          driver?.siret || "",
          driver?.vehicle_type || "",
          driver?.availability_slots?.join(", ") || driver?.availability || "",
          driver?.availability_days?.join(", ") || "",
          driver?.availability_flexible ? "oui" : "non",
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
    link.download = `weello-preinscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
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
      subtitle="Pré-inscriptions, activation et ouverture contrôlée de Weello"
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <article key={card.label} className="weello-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[.18em] text-weello-gray">{card.label}</p>
              <card.icon size={19} className="text-weello-gold" />
            </div>
            <p className="weello-title text-4xl mt-5">{card.value}</p>
          </article>
        ))}
      </div>

      <section className="weello-card overflow-hidden">
        <div className="p-5 border-b border-weello-gold/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="weello-title text-xl">Liste d’attente</h2>
            <p className="text-xs text-weello-gray mt-1">Données Auth reliées et consentements enregistrés.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load()} className="weello-btn-outline !px-4 !py-2.5 flex items-center gap-2">
              <RefreshCw size={16} /> Actualiser
            </button>
            <button onClick={exportCsv} className="weello-btn-outline !px-4 !py-2.5 flex items-center gap-2">
              <Download size={16} /> Export CSV
            </button>
            <button disabled={sending} onClick={() => void sendLaunchAccess()} className="weello-btn !px-4 !py-2.5 flex items-center gap-2 disabled:opacity-50">
              {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
              Envoyer les accès
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-14 flex justify-center"><LoaderCircle className="animate-spin text-weello-gold" /></div>
        ) : !data?.profiles.length ? (
          <div className="p-14 text-center text-weello-gray">Aucune pré-inscription pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="text-left text-[10px] uppercase tracking-[.16em] text-weello-gold bg-white/[.02]">
                <tr>
                  <th className="px-5 py-4">Profil</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Ville</th>
                  <th className="px-5 py-4">Téléphone</th>
                  <th className="px-5 py-4">Inscription</th>
                  <th className="px-5 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-weello-gold/10">
                {data.profiles.map((profile) => {
                  const partner = Array.isArray(profile.partner) ? profile.partner[0] : profile.partner;
                  const driver = Array.isArray(profile.driver) ? profile.driver[0] : profile.driver;
                  return (
                    <tr key={profile.id} className="hover:bg-white/[.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{profile.first_name} {profile.last_name}</p>
                        <p className="text-xs text-weello-gold mt-1">
                          {roleLabels[profile.role]}{partner?.establishment_name ? ` · ${partner.establishment_name}` : ""}
                        </p>
                        {driver?.siret && (
                          <p className="text-[11px] text-weello-gray mt-1">
                            SIRET {driver.siret} · {driver.vehicle_type || "véhicule à préciser"}
                          </p>
                        )}
                        {driver && (driver.availability_slots?.length || driver.availability_days?.length || driver.availability_flexible) && (
                          <p className="text-[11px] text-weello-gray mt-1">
                            Dispos : {driver.availability_flexible ? "flexible · " : ""}
                            {driver.availability_slots?.join(", ") || driver.availability || "créneaux à préciser"}
                            {driver.availability_days?.length ? ` · ${driver.availability_days.join(", ")}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-weello-gray">{profile.email}</td>
                      <td className="px-5 py-4">{profile.city}</td>
                      <td className="px-5 py-4 text-weello-gray">{profile.phone}</td>
                      <td className="px-5 py-4 text-weello-gray">{new Date(profile.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-weello-gold/20 bg-weello-gold/5 px-3 py-1 text-xs text-weello-gold">
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
