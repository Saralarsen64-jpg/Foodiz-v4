import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Send, Bot, HelpCircle } from "lucide-react";

type Message = {
  id: string;
  type: "bot" | "user";
  text: string;
  options?: string[];
  resolved?: boolean;
};

export default function HelpCenter() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      text: "Bonjour, je suis l'assistant intelligent Foodiz. Comment puis-je sublimer votre expérience aujourd'hui ?",
      options: ["Problème avec une commande", "Question sur mes points", "Devenir partenaire", "Autre chose"],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), type: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsBotTyping(true);

    setTimeout(() => {
      let botResponse: Message = { id: (Date.now() + 1).toString(), type: "bot", text: "" };
      const lowerText = text.toLowerCase();

      if (lowerText.includes("commande") || lowerText.includes("problème")) {
        botResponse.text = "Je comprends. S'agit-il d'un retard de livraison ou d'un article manquant dans votre commande ?";
        botResponse.options = ["Retard de livraison", "Article manquant / incorrect", "Qualité du plat"];
      } else if (lowerText.includes("retard")) {
        botResponse.text = "Avez-vous vérifié le suivi GPS dans l'onglet Commandes ? Si le livreur est déjà en approche, inutile d'ouvrir un ticket.";
        botResponse.options = ["Voir mes commandes", "Je veux quand même de l'aide"];
      } else if (lowerText.includes("voir mes commandes")) {
        botResponse.text = "Très bien, je vous redirige vers vos commandes.";
        botResponse.resolved = true;
        setTimeout(() => navigate("/client/orders"), 600);
      } else if (lowerText.includes("article manquant") || lowerText.includes("incorrect")) {
        botResponse.text = "Merci de préparer une photo des plats reçus et du ticket. Sans ces éléments, l'équipe ne pourra pas traiter votre demande.";
        botResponse.options = ["J'ai les photos", "Je vais revenir plus tard"];
      } else if (lowerText.includes("points") || lowerText.includes("avantages")) {
        botResponse.text = "Vos points sont crédités après validation de livraison par code client. Souhaitez-vous voir vos avantages ?";
        botResponse.options = ["Voir mes avantages", "Non merci"];
      } else if (lowerText.includes("voir mes avantages")) {
        botResponse.text = "Je vous redirige vers votre espace avantages Foodiz.";
        botResponse.resolved = true;
        setTimeout(() => navigate("/client/advantages"), 600);
      } else if (lowerText.includes("agent") || lowerText.includes("aide")) {
        botResponse.text = "Si votre besoin reste non résolu, utilisez la section 'Nous contacter'. J'ai déjà réduit les demandes inutiles grâce à vos réponses.";
        botResponse.options = ["Nous contacter", "Revenir à l'accueil aide"];
      } else if (lowerText.includes("nous contacter")) {
        botResponse.text = "Je vous redirige vers le contact support Foodiz.";
        botResponse.resolved = true;
        setTimeout(() => navigate("/client/account/help"), 600);
      } else {
        botResponse.text = "Je n'ai pas bien saisi. Pourriez-vous préciser votre demande ou choisir une solution rapide ?";
        botResponse.options = ["Où est ma commande ?", "Comment utiliser mes points ?", "Nous contacter"];
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsBotTyping(false);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex flex-col">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">Centre d'aide</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] space-y-2">
                <div className={`p-4 rounded-2xl text-sm ${msg.type === "user" ? "bg-foodiz-gold text-foodiz-black font-medium" : "bg-foodiz-card border border-foodiz-gold/20 text-foodiz-cream"}`}>
                  {msg.type === "bot" && <Bot size={14} className="mb-2 text-foodiz-gold" />}
                  {msg.text}
                </div>
                {msg.options && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSend(opt)}
                        className="text-[10px] px-3 py-1.5 rounded-full border border-foodiz-gold/30 text-foodiz-gold bg-foodiz-gold/5 hover:bg-foodiz-gold/10 transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-foodiz-card border border-foodiz-gold/10 p-4 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-foodiz-gold rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-foodiz-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-foodiz-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="foodiz-card p-4 bg-white/[0.02] border-foodiz-gold/10">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle size={16} className="text-foodiz-gold" />
              <h3 className="foodiz-title text-xs uppercase tracking-widest">Solutions rapides</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => handleSend("Où est ma commande ?")} className="text-left text-[11px] text-foodiz-gray p-2 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between">
                Où est ma commande ? <ChevronLeft size={12} className="rotate-180" />
              </button>
              <button onClick={() => handleSend("Comment utiliser mes points ?")} className="text-left text-[11px] text-foodiz-gray p-2 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between">
                Comment utiliser mes points ? <ChevronLeft size={12} className="rotate-180" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-foodiz-card border-t border-foodiz-gold/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="relative"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Décrivez votre situation..."
              className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-full py-3 pl-5 pr-12 text-sm text-foodiz-cream outline-none focus:border-foodiz-gold/50"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-foodiz-gold flex items-center justify-center text-foodiz-black">
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
