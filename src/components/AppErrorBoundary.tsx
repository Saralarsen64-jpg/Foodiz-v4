import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Last-resort UI for an unexpected client-side rendering error.
 * It deliberately sits above the router so no user ever sees a blank page.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep technical detail available to support without exposing it to users.
    console.error("Weello application rendering error", error, errorInfo);
  }

  private retry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-[#0E0F10] px-5 py-10 text-weello-cream flex items-center justify-center">
        <section className="w-full max-w-md rounded-[2rem] border border-weello-gold/20 bg-[#161719] p-7 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-weello-gold/10 text-weello-gold">
            <AlertTriangle size={26} aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-weello-gold">Weello</p>
          <h1 className="mt-2 text-2xl font-bold">Un écran a rencontré un problème</h1>
          <p className="mt-3 text-sm leading-6 text-weello-gray">
            Vos données et votre compte sont toujours en sécurité. Réessayez de charger votre espace.
          </p>
          <button type="button" onClick={this.retry} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-weello-cream px-4 py-3 font-bold text-weello-black transition hover:bg-white">
            <RefreshCw size={18} aria-hidden="true" /> Réessayer
          </button>
          <a href="/auth" className="mt-4 inline-block text-sm font-medium text-weello-gold hover:text-weello-cream">
            Retour à la connexion
          </a>
        </section>
      </main>
    );
  }
}
