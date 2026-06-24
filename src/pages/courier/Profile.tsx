import { useEffect, useState } from "react";
import { Bike, CalendarDays, CheckCircle2, Clock3, LogOut, Phone, Save, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";

const availabilitySlots = [
  { value: "matin", label: "Matin", detail: "7h – 11h" },
  { value: "midi", label: "Midi", detail: "11h – 14h" },
  { value: "apres_midi", label: "Après-midi", detail: "14h – 18h" },
  { value: "soiree", label: "Soirée", detail: "18h – 23h" },
  { value: "nuit", label: "Nuit", detail: "23h – 2h" },
  { value: "week_end", label: "Week-end", detail: "Sam. / Dim." },
];

const availabilityDays = [
  { value: "lundi", label: "Lun." },
  { value: "mardi", label: "Mar." },
  { value: "mercredi", label: "Mer." },
  { value: "jeudi", label: "Jeu." },
  { value: "vendredi", label: "Ven." },
  { value: "samedi", label: "Sam." },
  { value: "dimanche", label: "Dim." },
];

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

export default function CourierProfile() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("velo");
  const [slots, setSlots] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [flexible, setFlexible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: application }] = await Promise.all([
        supabase.from("profiles").select("full_name,phone").eq("id", user.id).single(),
        supabase
          .from("courier_applications")
          .select("vehicle_type,availability_slots,availability_days,availability_flexible")
          .eq("user_id", user.id)
          .single(),
      ]);
      setName(profile?.full_name || "");
      setPhone(profile?.phone || "");
      setVehicle(application?.vehicle_type || "velo");
      setSlots(Array.isArray(application?.availability_slots) ? application.availability_slots : []);
      setDays(Array.isArray(application?.availability_days) ? application.availability_days : []);
      setFlexible(Boolean(application?.availability_flexible));
    })();
  }, []);

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim() }).eq("id", user.id),
      supabase
        .from("courier_applications")
        .update({
          vehicle_type: vehicle,
          availability_slots: slots,
          availability_days: days,
          availability_flexible: flexible,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id),
    ]);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <CourierShell title="Mon profil" back="/courier">
      <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.15),rgba(17,17,17,0.97)_40%)] p-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] border border-foodiz-gold/20 bg-foodiz-gold/10 shadow-[0_0_40px_rgba(216,168,79,0.12)]">
          <UserRound size={34} className="text-foodiz-gold" />
        </div>
        <h2 className="foodiz-title mt-4 text-2xl">{name || "Livreur Foodiz"}</h2>
        <p className="mt-2 text-xs text-foodiz-gray">Votre identité professionnelle</p>
      </section>

      <section className="foodiz-card mt-4 space-y-4 p-5">
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-foodiz-gold">Nom complet</span>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
            <UserRound size={17} className="text-foodiz-gold" />
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-transparent py-4 text-foodiz-cream outline-none" />
          </div>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-foodiz-gold">Téléphone</span>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
            <Phone size={17} className="text-foodiz-gold" />
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full bg-transparent py-4 text-foodiz-cream outline-none" />
          </div>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-foodiz-gold">Véhicule</span>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
            <Bike size={17} className="text-foodiz-gold" />
            <select value={vehicle} onChange={(event) => setVehicle(event.target.value)} className="w-full bg-transparent py-4 text-foodiz-cream outline-none">
              <option className="bg-foodiz-card" value="velo">Vélo</option>
              <option className="bg-foodiz-card" value="scooter">Scooter</option>
              <option className="bg-foodiz-card" value="moto">Moto</option>
              <option className="bg-foodiz-card" value="voiture">Voiture</option>
              <option className="bg-foodiz-card" value="autre">Autre</option>
            </select>
          </div>
        </label>
      </section>

      <section className="foodiz-card mt-4 space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold">
            <Clock3 size={20} />
          </div>
          <div>
            <h2 className="foodiz-title text-xl">Mes disponibilités</h2>
            <p className="mt-1 text-xs leading-relaxed text-foodiz-gray">
              Ces préférences aideront Foodiz à proposer les courses au bon moment. Vous pourrez toujours vous mettre hors ligne.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-foodiz-gold/15 bg-foodiz-gold/[0.04] p-4 text-sm text-foodiz-cream">
          <input type="checkbox" checked={flexible} onChange={(event) => setFlexible(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#D8A84F]" />
          <span>
            <span className="block font-semibold">Je suis flexible</span>
            <span className="mt-1 block text-xs leading-relaxed text-foodiz-gray">Foodiz peut me proposer des créneaux en dehors de mes préférences si besoin.</span>
          </span>
        </label>

        <div>
          <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-foodiz-gold">
            <Clock3 size={14} /> Créneaux préférés
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availabilitySlots.map((slot) => {
              const selected = slots.includes(slot.value);
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setSlots((current) => toggleValue(current, slot.value))}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    selected ? "border-foodiz-gold bg-foodiz-gold/15 text-foodiz-cream" : "border-white/10 bg-white/[0.03] text-foodiz-gray"
                  }`}
                >
                  <span className="block text-xs font-semibold">{slot.label}</span>
                  <span className="mt-1 block text-[9px] opacity-70">{slot.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-foodiz-gold">
            <CalendarDays size={14} /> Jours souhaités
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {availabilityDays.map((day) => {
              const selected = days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setDays((current) => toggleValue(current, day.value))}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    selected ? "border-foodiz-gold bg-foodiz-gold/15 text-foodiz-cream" : "border-white/10 bg-white/[0.03] text-foodiz-gray"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={save} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4">
          {saved ? <><CheckCircle2 size={18} />Enregistré</> : <><Save size={18} />Enregistrer</>}
        </button>
      </section>

      <button onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-foodiz-red/20 bg-foodiz-red/5 p-4 text-foodiz-red">
        <LogOut size={17} />Se déconnecter
      </button>
    </CourierShell>
  );
}
