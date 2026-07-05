import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

type State = "loading" | "success" | "error";

export default function ActivatePrelaunch() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("Activation sécurisée de votre accès…");
  const [loginPath, setLoginPath] = useState("/auth/login");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      setMessage("Ce lien d’activation est invalide.");
      return;
    }

    void fetch("/api/prelaunch/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "L’activation a échoué.");
        const destination = typeof payload.loginPath === "string" ? payload.loginPath : "/auth/login";
        setLoginPath(destination);
        setState("success");
        setMessage("Votre accès Weello est activé. Vous allez être redirigé vers votre première connexion.");
        window.setTimeout(() => navigate(destination, { replace: true }), 2500);
      })
      .catch((error) => {
        setState("error");
        setMessage(error.message || "L’activation a échoué.");
      });
  }, [navigate, params]);

  const Icon = state === "loading" ? LoaderCircle : state === "success" ? CheckCircle2 : CircleAlert;

  return (
    <main className="min-h-screen bg-foodiz-black px-5 py-10 flex items-center justify-center">
      <section className="w-full max-w-lg foodiz-card p-8 sm:p-10 text-center">
        <div className="flex justify-center mb-8">
          <img src="/images/weello-wordmark.png" alt="Weello" className="w-72 max-w-full h-auto rounded-2xl" />
        </div>
        <div className="w-20 h-20 rounded-[1.7rem] border border-foodiz-gold/25 bg-foodiz-gold/10 mx-auto flex items-center justify-center text-foodiz-gold">
          <Icon size={36} className={state === "loading" ? "animate-spin" : ""} />
        </div>
        <h1 className="foodiz-title text-3xl mt-7">
          {state === "success" ? "Bienvenue chez Weello" : state === "error" ? "Activation impossible" : "Un instant…"}
        </h1>
        <p className="text-foodiz-gray mt-4 leading-relaxed">{message}</p>
        {state === "success" && (
          <Link to={loginPath} className="foodiz-btn inline-flex mt-8">Me connecter maintenant</Link>
        )}
        {state === "error" && (
          <Link to="/waitlist" className="foodiz-btn-outline inline-flex mt-8">Retour</Link>
        )}
      </section>
    </main>
  );
}
