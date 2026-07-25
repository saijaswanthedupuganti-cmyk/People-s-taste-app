import { ArrowLeft } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const from = location.state?.from?.pathname ?? "/";

  if (!loading && user) return <Navigate to={from} replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-pt-surface-2 px-6">
      <button
        type="button"
        onClick={() => navigate("/")}
        aria-label="Go back"
        className="absolute left-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-pt-ink-soft transition-colors duration-150 hover:bg-pt-surface-3 hover:text-pt-ink md:left-6 md:top-6"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
      </button>

      <div className="w-full max-w-sm rounded-2xl border border-pt-border bg-white p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-display text-2xl font-semibold text-pt-ink">People's Taste</h1>
        <p className="mt-2 text-sm leading-relaxed text-pt-ink-soft">
          Who recommended what, where, when — and why should you trust them?
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-8 flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-full bg-pt-primary px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pt-primary-deep"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-3 flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-full text-sm font-medium text-pt-ink-soft transition-colors duration-150 hover:text-pt-ink"
        >
          Not now, go back
        </button>
      </div>
    </div>
  );
}
