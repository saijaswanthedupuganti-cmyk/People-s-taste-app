import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logOut } = useAuth();

  return (
    <div className="min-h-screen bg-pt-surface px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl text-pt-ink">People's Taste</h1>
        <button onClick={logOut} className="text-sm text-pt-ink/60 hover:text-pt-ink">
          Sign out
        </button>
      </header>
      <p className="mt-6 text-pt-ink/70">
        Signed in as {user?.displayName ?? user?.email}. Home feed (leaderboard-backed) not built yet — Phase 1.
      </p>
    </div>
  );
}
