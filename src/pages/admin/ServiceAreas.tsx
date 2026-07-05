import { useEffect, useMemo, useState } from "react";
import { Bike, MapPinned, RefreshCw, Store } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

type Area = {
  id: string;
  city: string;
  department_code?: string | null;
  region_name?: string | null;
  postal_codes: string[];
  status: "recruiting" | "preparing" | "pilot" | "open" | "paused" | "closed";
  delivery_radius_km: number;
  counts: {
    partnerApplications: number;
    approvedPartners: number;
    activeRestaurants: number;
    courierApplications: number;
    approvedCouriers: number;
    partnerDocumentsToReview?: number;
    courierDocumentsToReview?: number;
    documentsToReview?: number;
  };
};

async function serviceAreaRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/admin/service-areas", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Opération impossible.");
  return payload;
}

const statusLabels: Record<Area["status"], string> = {
  recruiting: "Recrutement",
  preparing: "Préparation",
  pilot: "Pilote",
  open: "Ouverte",
  paused: "En pause",
  closed: "Fermée",
};

export default function AdminServiceAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { status: Area["status"]; radius: number }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const payload = await serviceAreaRequest();
      setAreas(payload.areas || []);
      setDrafts(Object.fromEntries((payload.areas || []).map((area: Area) => [
        area.id,
        { status: area.status, radius: Number(area.delivery_radius_km) },
      ])));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (area: Area) => {
    const draft = drafts[area.id];
    if (!draft) return;
    setBusy(area.id);
    try {
      await serviceAreaRequest("POST", {
        areaId: area.id,
        status: draft.status,
        deliveryRadiusKm: draft.radius,
      });
      toast.success(`${area.city} mise à jour.`);
      await load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const totals = useMemo(() => ({
    cities: areas.length,
    pilot: areas.filter((area) => area.status === "pilot").length,
    open: areas.filter((area) => area.status === "open").length,
    recruiting: areas.filter((area) => area.status === "recruiting").length,
  }), [areas]);

  return (
    <AdminShell title="Villes Weello" subtitle="Déploiement national progressif, ville par ville">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Villes détectées", totals.cities],
          ["En recrutement", totals.recruiting],
          ["Pilotes", totals.pilot],
          ["Ouvertes", totals.open],
        ].map(([label, value]) => (
          <article key={label} className="foodiz-card p-5">
            <MapPinned size={19} className="text-foodiz-gold" />
            <p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{label}</p>
            <p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{value}</p>
          </article>
        ))}
      </section>

      <div className="flex justify-end">
        <button onClick={() => void load()} className="flex items-center gap-2 text-xs text-foodiz-gold"><RefreshCw size={15} />Actualiser</button>
      </div>

      {loading ? (
        <div className="foodiz-card animate-pulse p-8 text-center text-foodiz-gray">Classement des villes…</div>
      ) : areas.length === 0 ? (
        <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucune ville n’a encore été créée par une candidature professionnelle vérifiée.</div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {areas.map((area) => {
            const draft = drafts[area.id] || { status: area.status, radius: area.delivery_radius_km };
            return (
              <article key={area.id} className="foodiz-card border-foodiz-gold/15 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foodiz-cream">{area.city}</h2>
                    <p className="mt-1 text-xs text-foodiz-gray">
                      Département {area.department_code || "—"} · {area.postal_codes?.join(", ") || "code postal non renseigné"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${
                    area.status === "open" || area.status === "pilot"
                      ? "border-foodiz-green/20 bg-foodiz-green/5 text-foodiz-green"
                      : "border-foodiz-gold/20 bg-foodiz-gold/5 text-foodiz-gold"
                  }`}>{statusLabels[area.status]}</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/[0.02] p-4">
                    <Store size={16} className="text-foodiz-gold" />
                    <p className="mt-2 text-2xl text-foodiz-cream">{area.counts.approvedPartners}/{area.counts.partnerApplications}</p>
                    <p className="text-[9px] uppercase text-foodiz-gray">Partenaires validés / candidats</p>
                    <p className="mt-1 text-[10px] text-foodiz-green">{area.counts.activeRestaurants} établissement(s) actif(s)</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.02] p-4">
                    <Bike size={16} className="text-foodiz-gold" />
                    <p className="mt-2 text-2xl text-foodiz-cream">{area.counts.approvedCouriers}/{area.counts.courierApplications}</p>
                    <p className="text-[9px] uppercase text-foodiz-gray">Livreurs validés / candidats</p>
                  </div>
                </div>
                <div className={`mt-3 rounded-2xl border p-4 ${area.counts.documentsToReview ? "border-foodiz-red/20 bg-foodiz-red/5" : "border-white/5 bg-white/[0.02]"}`}>
                  <p className="text-[10px] uppercase tracking-widest text-foodiz-gray">Documents à traiter</p>
                  <p className={`mt-2 text-2xl font-serif italic ${area.counts.documentsToReview ? "text-foodiz-red" : "text-foodiz-cream"}`}>{area.counts.documentsToReview || 0}</p>
                  <p className="mt-1 text-[10px] text-foodiz-gray">
                    Partenaires {area.counts.partnerDocumentsToReview || 0} · Livreurs {area.counts.courierDocumentsToReview || 0}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                  <select value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [area.id]: { ...draft, status: event.target.value as Area["status"] } }))} className="rounded-xl border border-foodiz-gold/15 bg-black/30 px-3 py-3 text-xs text-foodiz-cream outline-none">
                    {(Object.keys(statusLabels) as Area["status"][]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                  </select>
                  <label className="rounded-xl border border-foodiz-gold/15 bg-black/30 px-3 py-2">
                    <span className="block text-[8px] uppercase text-foodiz-gray">Rayon livraison km</span>
                    <input type="number" min={1} max={100} step={0.5} value={draft.radius} onChange={(event) => setDrafts((current) => ({ ...current, [area.id]: { ...draft, radius: Number(event.target.value) } }))} className="mt-1 w-full bg-transparent text-xs text-foodiz-cream outline-none" />
                  </label>
                  <button disabled={busy === area.id} onClick={() => void save(area)} className="foodiz-btn px-4 py-3 text-xs disabled:opacity-40">Enregistrer</button>
                </div>
                {draft.status === "open" && (
                  <p className="mt-3 text-[10px] text-foodiz-gold">« Ouverte » autorise l’exploitation normale de la ville. Utilise « Pilote » pour les tests contrôlés.</p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
