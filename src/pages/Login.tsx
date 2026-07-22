import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-pt-surface px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-3xl text-pt-ink">People's Taste</h1>
        <p className="mt-2 text-sm text-pt-ink/70">
          Who recommended what, where, when — and why should you trust them?
        </p>
        <button
          onClick={signInWithGoogle}
          className="mt-8 w-full rounded-lg bg-pt-primary px-4 py-3 font-medium text-white transition hover:bg-pt-primary-deep"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
