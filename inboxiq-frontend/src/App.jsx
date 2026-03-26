import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

/**
 * Main App Component with basic routing and auth capture
 */
function App() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState({ token: null, email: null });

  useEffect(() => {
    // 1. Check URL for tokens (post-login redirect)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const urlEmail = params.get("email");

    if (urlToken && urlEmail) {
      localStorage.setItem("token", urlToken);
      localStorage.setItem("email", urlEmail);
      setAuth({ token: urlToken, email: urlEmail });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(false);
      return;
    }

    // 2. Check LocalStorage
    const storedToken = localStorage.getItem("token");
    const storedEmail = localStorage.getItem("email");

    if (storedToken && storedEmail) {
      setAuth({ token: storedToken, email: storedEmail });
    }

    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  const isAuthenticated = !!auth.token;

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
