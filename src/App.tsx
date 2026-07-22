import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Search from "./pages/Search";
import RecommendationDetail from "./pages/RecommendationDetail";
import RestaurantProfile from "./pages/RestaurantProfile";
import PublicProfile from "./pages/PublicProfile";
import Post from "./pages/Post";
import Saved from "./pages/Saved";
import Profile from "./pages/Profile";

// Visitors (no account) can browse everything — Post/Saved/Profile are the only
// gated routes (§7 User Roles, Principle #4: never block core value behind login).
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/rec/:id" element={<RecommendationDetail />} />
            <Route path="/place/:id" element={<RestaurantProfile />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route
              path="/post"
              element={
                <ProtectedRoute>
                  <Post />
                </ProtectedRoute>
              }
            />
            <Route
              path="/saved"
              element={
                <ProtectedRoute>
                  <Saved />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
