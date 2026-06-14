import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";

export default function DeliveryCurrent() {
  const navigate = useNavigate(); const { id } = useParams(); const [activeId, setActiveId] = useState<string | null>(id || null);
  useEffect(() => { if (id) return; (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("orders").select("id").eq("courier_id", user.id).in("status", ["pickup", "picked_up", "delivering"]).limit(1).maybeSingle(); setActiveId(data?.id || null); })(); }, [id]);
  useEffect(() => { if (activeId) navigate(`/courier/deliveries/${activeId}/tracking`, { replace: true }); }, [activeId, navigate]);
  return <CourierShell title="Course active" back="/courier"><div className="foodiz-card p-10 text-center"><MapPin size={46} className="mx-auto text-foodiz-gold" /><h2 className="foodiz-title text-2xl mt-4">Aucune course active</h2><p className="text-foodiz-gray text-sm mt-2 mb-6">Passez en ligne et choisissez une mission disponible.</p><button onClick={() => navigate("/courier/deliveries/available")} className="foodiz-btn w-full py-4 flex items-center justify-center gap-2"><Navigation size={18} /> Voir les courses</button></div></CourierShell>;
}
