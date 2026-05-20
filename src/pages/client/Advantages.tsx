import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Sparkles,
  Truck,
  Store,
  ShoppingCart,
  Zap,
  Lock,
  ShieldCheck,
  Clock3,
  Flame,
  RefreshCw,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

type AdvantageCategory = "Livraison" | "Restaurants" | "Market / Courses" | "Boosters";

type UserProfile = {
  pointsBalance: number;
  favoriteCategory: "restaurant" | "market" | "night";
  city: string;
  inactiveDays: number;
  ordersCount: number;
  nightOrdersRate: number;
  marketOrdersRate: number;
  restaurantOrdersRate: number;
};

type Advantage = {
  id: string;
  title: string;
  description: string;
  category: AdvantageCategory;
  pointsCost: number;
  minOrderText?: string;
  badge: string;
  expiresAt: number;
  locked: boolean;
  iconKey: "delivery" | "restaurant" | "market" | "booster";
  rarity?: "Rare" | "Sélection" | "Nouveau";
};

type AdvantageTemplate = {
  id: string;
  title: string;
  description: string;
  category: AdvantageCategory;
  pointsCost: number;
  requiredPoints: number;
  maxRecommendedPoints?: number;
  minOrderText?: string;
  badge: string;
  iconKey: Advantage["iconKey"];
  tags: Array<"restaurant" | "market" | "night" | "inactive" | "service" | "delivery" | "booster">;
  rarity?: Advantage["rarity"];
};

const ROTATION_HOURS = 48;
const STORAGE_KEY_LOCKED = "foodiz_locked_advantage_v1";
const STORAGE_KEY_CYCLE = "foodiz_advantages_cycle_v1";
const STORAGE_KEY_SET = "foodiz_advantages_set_v1";

const USER_PROFILE: UserProfile = {
  pointsBalance: 1240,
  favoriteCategory: "restaurant",
  city: "Paris",
  inactiveDays: 3,
  ordersCount: 18,
  nightOrdersRate: 0.22,
  marketOrdersRate: 0.34,
  restaurantOrdersRate: 0.66,
};

const ICONS = {
  delivery: Truck,
  restaurant: Store,
  market: ShoppingCart,
  booster: Zap,
};

const CATEGORY_STYLES: Record<AdvantageCategory, string> = {
  Livraison: "bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/25",
  Restaurants: "bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/25",
  "Market / Courses": "bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/25",
  Boosters: "bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/25",
};

const ADVANTAGE_POOL: AdvantageTemplate[] = [
  {
    id: "delivery-1",
    title: "-1€ sur la livraison",
    description: "Réduction livraison sur 1 utilisation, jusqu’à 1€.",
    category: "Livraison",
    pointsCost: 100,
    requiredPoints: 100,
    badge: "1 utilisation",
    minOrderText: "Dès 12€ d’achat",
    iconKey: "delivery",
    tags: ["delivery"],
  },
  {
    id: "service-1",
    title: "Frais de service offerts",
    description: "Les frais de service sont offerts sur votre prochaine commande.",
    category: "Market / Courses",
    pointsCost: 200,
    requiredPoints: 200,
    badge: "Temporaire",
    minOrderText: "1 utilisation",
    iconKey: "market",
    tags: ["service", "market"],
  },
  {
    id: "restaurant-3",
    title: "-3€ commande restaurant",
    description: "Réduction restaurant plafonnée à 3€ sur une commande éligible.",
    category: "Restaurants",
    pointsCost: 300,
    requiredPoints: 300,
    badge: "1 utilisation",
    minOrderText: "Dès 18€ d’achat",
    iconKey: "restaurant",
    tags: ["restaurant"],
  },
  {
    id: "delivery-market",
    title: "Livraison market offerte",
    description: "Livraison offerte sur une commande market sélectionnée.",
    category: "Livraison",
    pointsCost: 320,
    requiredPoints: 280,
    badge: "Market boost",
    minOrderText: "Dès 20€ d’achat",
    iconKey: "delivery",
    tags: ["market", "delivery"],
    rarity: "Sélection",
  },
  {
    id: "restaurant-5",
    title: "-5€ commande restaurant",
    description: "Réduction premium sur votre prochaine commande restaurant.",
    category: "Restaurants",
    pointsCost: 500,
    requiredPoints: 500,
    badge: "Premium",
    minOrderText: "Dès 25€ d’achat",
    iconKey: "restaurant",
    tags: ["restaurant"],
  },
  {
    id: "market-4",
    title: "-4€ sur vos courses",
    description: "Avantage market temporaire, pensé pour vos commandes du quotidien.",
    category: "Market / Courses",
    pointsCost: 450,
    requiredPoints: 420,
    badge: "Courses",
    minOrderText: "Dès 25€ d’achat",
    iconKey: "market",
    tags: ["market"],
  },
  {
    id: "booster-night-x2",
    title: "x2 points après 22h",
    description: "Doublez vos points Foodiz sur une commande nocturne éligible.",
    category: "Boosters",
    pointsCost: 380,
    requiredPoints: 300,
    badge: "Nocturne",
    minOrderText: "Valable 1 commande",
    iconKey: "booster",
    tags: ["night", "booster"],
    rarity: "Rare",
  },
  {
    id: "dessert-8",
    title: "Dessert offert max 8€",
    description: "Un dessert offert dans la limite de 8€ sur sélection partenaire.",
    category: "Restaurants",
    pointsCost: 800,
    requiredPoints: 800,
    badge: "Gourmand",
    minOrderText: "Dès 22€ d’achat",
    iconKey: "restaurant",
    tags: ["restaurant"],
    rarity: "Sélection",
  },
  {
    id: "delivery-week",
    title: "Livraison offerte semaine",
    description: "Livraison offerte sur une commande en semaine, dans une limite cohérente.",
    category: "Livraison",
    pointsCost: 1200,
    requiredPoints: 1200,
    badge: "Semaine",
    minOrderText: "1 utilisation",
    iconKey: "delivery",
    tags: ["delivery"],
  },
  {
    id: "market-7",
    title: "-7€ sur vos courses",
    description: "Avantage market renforcé, ciblé sur les commandes à booster.",
    category: "Market / Courses",
    pointsCost: 900,
    requiredPoints: 900,
    badge: "Boost market",
    minOrderText: "Dès 40€ d’achat",
    iconKey: "market",
    tags: ["market"],
    rarity: "Nouveau",
  },
  {
    id: "back-user",
    title: "Bonus retour Foodiz",
    description: "Une offre spéciale pensée pour vous faire revenir au meilleur moment.",
    category: "Boosters",
    pointsCost: 260,
    requiredPoints: 180,
    badge: "Retour",
    minOrderText: "48h uniquement",
    iconKey: "booster",
    tags: ["inactive", "booster"],
    rarity: "Rare",
  },
  {
    id: "plate-15",
    title: "Plat offert max 15€",
    description: "Un plat offert jusqu’à 15€, réservé aux profils fidélité élevés.",
    category: "Restaurants",
    pointsCost: 2000,
    requiredPoints: 2000,
    badge: "Prestige",
    minOrderText: "Dès 35€ d’achat",
    iconKey: "restaurant",
    tags: ["restaurant"],
    rarity: "Rare",
  },
  {
    id: "big-order-15",
    title: "-15€ dès 50€",
    description: "Réduction exceptionnelle sur gros panier, strictement encadrée.",
    category: "Restaurants",
    pointsCost: 1500,
    requiredPoints: 1500,
    badge: "Grand panier",
    minOrderText: "Dès 50€ d’achat",
    iconKey: "restaurant",
    tags: ["restaurant", "booster"],
    rarity: "Sélection",
  },
  {
    id: "night-delivery-priority",
    title: "Livraison prioritaire de nuit",
    description: "Priorité sur un créneau nocturne éligible.",
    category: "Livraison",
    pointsCost: 420,
    requiredPoints: 300,
    badge: "Prioritaire",
    minOrderText: "Après 22h",
    iconKey: "delivery",
    tags: ["night", "delivery"],
  },
  {
    id: "weekend-bonus",
    title: "Bonus fidélité week-end",
    description: "+50% de points Foodiz sur votre prochaine commande du week-end.",
    category: "Boosters",
    pointsCost: 520,
    requiredPoints: 400,
    badge: "Week-end",
    minOrderText: "1 commande",
    iconKey: "booster",
    tags: ["booster"],
  },
];

function getCycleStart() {
  const saved = localStorage.getItem(STORAGE_KEY_CYCLE);
  const now = Date.now();
  const duration = ROTATION_HOURS * 60 * 60 * 1000;

  if (saved) {
    const parsed = Number(saved);
    if (!Number.isNaN(parsed) && now - parsed < duration) {
      return parsed;
    }
  }

  localStorage.setItem(STORAGE_KEY_CYCLE, String(now));
  localStorage.removeItem(STORAGE_KEY_SET);
  return now;
}

function scoreTemplate(template: AdvantageTemplate, profile: UserProfile) {
  let score = 0;

  if (profile.pointsBalance >= template.requiredPoints) score += 30;
  if (profile.pointsBalance >= template.pointsCost) score += 10;
  if (profile.pointsBalance < template.requiredPoints) score -= 50;

  if (template.tags.includes(profile.favoriteCategory)) score += 18;
  if (template.tags.includes("inactive") && profile.inactiveDays >= 14) score += 40;
  if (template.tags.includes("night") && profile.nightOrdersRate > 0.18) score += 18;
  if (template.tags.includes("market") && profile.marketOrdersRate > 0.25) score += 14;
  if (template.tags.includes("restaurant") && profile.restaurantOrdersRate > 0.45) score += 14;
  if (template.tags.includes("delivery")) score += 8;
  if (template.tags.includes("booster")) score += 6;

  if (profile.city === "Paris") score += 2;
  if (template.maxRecommendedPoints && profile.pointsBalance > template.maxRecommendedPoints) score -= 8;

  return score;
}

function generateAdvantages(profile: UserProfile, cycleStart: number): Advantage[] {
  const saved = localStorage.getItem(STORAGE_KEY_SET);
  const expiresAt = cycleStart + ROTATION_HOURS * 60 * 60 * 1000;

  if (saved) {
    const parsed = JSON.parse(saved) as Advantage[];
    return parsed.map((item) => ({ ...item, expiresAt }));
  }

  const sorted = [...ADVANTAGE_POOL]
    .map((template) => ({ template, score: scoreTemplate(template, profile) }))
    .sort((a, b) => b.score - a.score || a.template.pointsCost - b.template.pointsCost)
    .map(({ template }) => template);

  const picked: AdvantageTemplate[] = [];
  const categoriesUsed = new Set<AdvantageCategory>();

  for (const template of sorted) {
    if (picked.length >= 6) break;

    const shouldDiversify = !categoriesUsed.has(template.category) || picked.length < 3;
    const economicallySafe = template.pointsCost <= Math.max(profile.pointsBalance * 1.15, 200);

    if (shouldDiversify && economicallySafe) {
      picked.push(template);
      categoriesUsed.add(template.category);
    }
  }

  if (picked.length < 6) {
    for (const template of sorted) {
      if (picked.length >= 6) break;
      if (!picked.find((item) => item.id === template.id)) picked.push(template);
    }
  }

  const generated = picked
    .sort((a, b) => a.pointsCost - b.pointsCost)
    .map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      category: template.category,
      pointsCost: template.pointsCost,
      minOrderText: template.minOrderText,
      badge: template.badge,
      iconKey: template.iconKey,
      rarity: template.rarity,
      expiresAt,
      locked: false,
    }));

  localStorage.setItem(STORAGE_KEY_SET, JSON.stringify(generated));
  return generated;
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "Expire maintenant";
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `Expire dans ${totalHours}h ${minutes.toString().padStart(2, "0")}`;
}

export default function AdvantagesPage() {
  const navigate = useNavigate();
  const [cycleStart, setCycleStart] = useState<number>(() => getCycleStart());
  const [now, setNow] = useState(Date.now());
  const [lockedAdvantageId, setLockedAdvantageId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY_LOCKED));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      const duration = ROTATION_HOURS * 60 * 60 * 1000;
      if (Date.now() - cycleStart >= duration) {
        const next = Date.now();
        localStorage.setItem(STORAGE_KEY_CYCLE, String(next));
        localStorage.removeItem(STORAGE_KEY_SET);
        setCycleStart(next);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cycleStart]);

  const advantages = useMemo(() => {
    const generated = generateAdvantages(USER_PROFILE, cycleStart);
    return generated.map((adv) => ({
      ...adv,
      locked: lockedAdvantageId === adv.id,
    }));
  }, [cycleStart, lockedAdvantageId]);

  const lockedAdvantage = advantages.find((adv) => adv.locked) || null;
  const renewableAdvantages = advantages.filter((adv) => !adv.locked);

  const handleLock = (advantage: Advantage) => {
    if (USER_PROFILE.pointsBalance < advantage.pointsCost) return;

    if (lockedAdvantageId && lockedAdvantageId !== advantage.id) {
      const confirmed = window.confirm("Vous avez déjà un avantage verrouillé. Voulez-vous le remplacer par celui-ci ?");
      if (!confirmed) return;
    }

    localStorage.setItem(STORAGE_KEY_LOCKED, advantage.id);
    setLockedAdvantageId(advantage.id);
  };

  const handleUnlock = () => {
    localStorage.removeItem(STORAGE_KEY_LOCKED);
    setLockedAdvantageId(null);
  };

  const nextRotationIn = Math.max(cycleStart + ROTATION_HOURS * 60 * 60 * 1000 - now, 0);

  return (
    <div className="animate-fade-in-up">
      <button
        onClick={() => navigate("/client/account")}
        className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"
      >
        <ChevronLeft size={18} />
        Retour
      </button>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="foodiz-title text-2xl">Mes avantages</h1>
          <p className="text-foodiz-gray text-xs mt-1">
            Sélection dynamique Foodiz renouvelée toutes les 48h.
          </p>
        </div>
        <div className="text-right">
          <div className="text-foodiz-gold text-2xl font-bold font-serif">{USER_PROFILE.pointsBalance}</div>
          <div className="text-foodiz-gray text-[10px]">points disponibles</div>
        </div>
      </div>

      <div
        className="foodiz-card p-5 mb-6 relative overflow-hidden border-foodiz-gold/20"
        style={{
          background:
            "linear-gradient(135deg, rgba(216,168,79,0.12), rgba(10,10,10,0.95) 35%, rgba(10,10,10,1) 100%)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35), 0 0 30px rgba(216,168,79,0.08)",
        }}
      >
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#D8A84F] to-transparent opacity-70" />
        <div className="absolute -top-10 right-0 w-32 h-32 rounded-full bg-foodiz-gold/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-foodiz-gold/12 border border-foodiz-gold/25 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <GoldIcon icon={Sparkles} size={18} />
            </div>
            <div>
              <p className="text-foodiz-cream text-sm font-medium">Moteur d’avantages intelligent</p>
              <p className="text-foodiz-gray text-xs mt-1 leading-relaxed max-w-[220px]">
                Vos offres sont adaptées à vos points, vos habitudes et aux campagnes Foodiz en cours.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-foodiz-gold text-xs font-semibold flex items-center gap-1 justify-end">
              <RefreshCw size={12} />
              Rotation live
            </div>
            <div className="text-foodiz-cream text-xs mt-1">{formatRemaining(nextRotationIn)}</div>
          </div>
        </div>
      </div>

      {lockedAdvantage && (
        <div
          className="foodiz-card p-5 mb-6 border-foodiz-gold/35 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(216,168,79,0.14), rgba(17,17,17,0.95) 30%, rgba(10,10,10,1) 100%)",
            boxShadow: "0 22px 60px rgba(0,0,0,0.4), 0 0 36px rgba(216,168,79,0.1)",
          }}
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#E0B45C] to-transparent" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/15 border border-foodiz-gold/30 flex items-center justify-center shrink-0">
              <GoldIcon icon={Lock} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase bg-foodiz-gold/20 text-foodiz-gold border border-foodiz-gold/25">
                  Verrouillé
                </span>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[lockedAdvantage.category]}`}>
                  {lockedAdvantage.category}
                </span>
              </div>
              <h2 className="foodiz-title text-lg">{lockedAdvantage.title}</h2>
              <p className="text-foodiz-gray text-xs mt-1 leading-relaxed">{lockedAdvantage.description}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-foodiz-gold/10 text-foodiz-cream/80">
                  {lockedAdvantage.pointsCost} pts utilisés
                </span>
                {lockedAdvantage.minOrderText && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-foodiz-gold/10 text-foodiz-cream/80">
                    {lockedAdvantage.minOrderText}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleUnlock}
            className="mt-4 w-full py-3 rounded-xl border border-foodiz-gold/25 text-foodiz-gold text-sm font-medium hover:border-foodiz-gold/45 transition-all"
          >
            Remplacer mon avantage verrouillé
          </button>
        </div>
      )}

      <div className="space-y-4">
        {renewableAdvantages.map((advantage) => {
          const isAffordable = USER_PROFILE.pointsBalance >= advantage.pointsCost;
          const remaining = Math.max(advantage.expiresAt - now, 0);
          const progress = Math.max(0, Math.min(100, (remaining / (ROTATION_HOURS * 60 * 60 * 1000)) * 100));
          const Icon = ICONS[advantage.iconKey];

          return (
            <div
              key={advantage.id}
              className={`w-full foodiz-card p-5 relative overflow-hidden transition-all duration-500 ${
                isAffordable ? "hover:border-foodiz-gold/40 hover:-translate-y-0.5" : "opacity-55"
              }`}
              style={{
                background:
                  "linear-gradient(145deg, rgba(216,168,79,0.06), rgba(17,17,17,0.98) 24%, rgba(10,10,10,1) 100%)",
                boxShadow: isAffordable
                  ? "0 18px 45px rgba(0,0,0,0.28), 0 0 18px rgba(216,168,79,0.05)"
                  : "0 12px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div className="absolute -top-10 right-0 w-28 h-28 rounded-full bg-foodiz-gold/6 blur-3xl" />
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#D8A84F] to-transparent opacity-50" />

              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <GoldIcon icon={Icon} size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_STYLES[advantage.category]}`}>
                          {advantage.category}
                        </span>
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-foodiz-gold/10 text-foodiz-cream/75">
                          {advantage.badge}
                        </span>
                        {advantage.rarity && (
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-foodiz-gold/16 border border-foodiz-gold/20 text-foodiz-gold">
                            {advantage.rarity}
                          </span>
                        )}
                      </div>
                      <h3 className="foodiz-title text-base pr-2">{advantage.title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-foodiz-gold text-lg font-bold font-serif">{advantage.pointsCost}</div>
                      <div className="text-foodiz-gray text-[10px]">points</div>
                    </div>
                  </div>

                  <p className="text-xs text-foodiz-gray leading-relaxed">{advantage.description}</p>

                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {advantage.minOrderText && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-foodiz-gold/10 text-foodiz-cream/80">
                        {advantage.minOrderText}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-foodiz-gold/10 text-foodiz-cream/80">
                      {USER_PROFILE.city}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="text-foodiz-gray flex items-center gap-1">
                        <Clock3 size={11} className="text-foodiz-gold" />
                        {formatRemaining(remaining)}
                      </span>
                      <span className="text-foodiz-gold/85">Rotation 48h</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-foodiz-gold/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-foodiz-gold/55 to-foodiz-gold transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleLock(advantage)}
                    disabled={!isAffordable}
                    className={`mt-4 w-full py-3 rounded-xl text-sm font-medium transition-all ${
                      isAffordable
                        ? "bg-foodiz-gold text-foodiz-black hover:brightness-110 shadow-[0_10px_28px_rgba(216,168,79,0.18)]"
                        : "bg-white/5 text-foodiz-gray border border-foodiz-gold/10 cursor-not-allowed"
                    }`}
                  >
                    {isAffordable ? "Débloquer et verrouiller" : "Points insuffisants"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="foodiz-card mt-6 p-4 border-foodiz-gold/15 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center shrink-0">
            <GoldIcon icon={ShieldCheck} size={16} />
          </div>
          <div>
            <p className="text-foodiz-cream text-sm font-medium">Règles Foodiz</p>
            <p className="text-foodiz-gray text-xs mt-1 leading-relaxed">
              Un seul avantage peut être verrouillé à la fois. Les autres offres tournent automatiquement toutes les 48h selon votre profil, vos usages et les campagnes Foodiz.
            </p>
          </div>
        </div>
      </div>

      {!lockedAdvantage && (
        <div className="foodiz-card mt-4 p-4 border-foodiz-gold/15 bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center shrink-0">
              <GoldIcon icon={Flame} size={16} />
            </div>
            <div>
              <p className="text-foodiz-cream text-sm font-medium">Conseil Foodiz</p>
              <p className="text-foodiz-gray text-xs mt-1 leading-relaxed">
                Verrouillez maintenant l’offre qui vous plaît le plus pour la conserver après la rotation. Sinon, elle peut disparaître automatiquement lors du prochain renouvellement.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
