import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import RequesterView from "./pages/RequesterView";
import FetcherView from "./pages/FetcherView";

// Prefer production URL, then legacy base, then localhost for dev
const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

function Info({ message, tone = "info" }) {
  if (!message) return null;
  const intent = {
    info: "bg-blue-50 text-blue-900 border-blue-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
  }[tone];
  return (
    <div className={clsx("fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg", intent)}>
      {message}
    </div>
  );
}

function AuthScreen({ setAuthMode, authMode, authForm, setAuthForm, handleAuthSubmit, loading }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">YaarFetch</h1>
          <p className="text-slate-500">Campus delivery made simple.</p>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            className={clsx(
              "flex-1 rounded-lg px-4 py-2 text-sm font-bold transition",
              authMode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            className={clsx(
              "flex-1 rounded-lg px-4 py-2 text-sm font-bold transition",
              authMode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setAuthMode("register")}
          >
            Register
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleAuthSubmit}>
          {authMode === "register" && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Name
              </label>
              <input
                required
                value={authForm.name}
                onChange={(e) =>
                  setAuthForm({ ...authForm, name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium focus:border-slate-900 focus:bg-white focus:outline-none"
                placeholder="Your full name"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              type="email"
              required
              value={authForm.email}
              onChange={(e) =>
                setAuthForm({ ...authForm, email: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium focus:border-slate-900 focus:bg-white focus:outline-none"
              placeholder="you@campus.edu"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={authForm.password}
              onChange={(e) =>
                setAuthForm({ ...authForm, password: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium focus:border-slate-900 focus:bg-white focus:outline-none"
              placeholder="•••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 hover:shadow-xl"
          >
            {loading
              ? "Working..."
              : authMode === "login"
                ? "Login"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "info" });

  const client = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE,
        headers: token
          ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
          : { "Content-Type": "application/json" },
      }),
    [token]
  );

  const setMessage = (message, tone = "info") => {
    setToast({ message, tone });
    if (message) {
      setTimeout(() => setToast({ message: "", tone }), 3500);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "register"
          ? authForm
          : { email: authForm.email, password: authForm.password };
      const { data } = await axios.post(`${API_BASE}${endpoint}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      setToken(data.access_token);
      setUser(data.user);
      setMessage(
        authMode === "login" ? "Welcome back!" : "Account created.",
        "success"
      );
    } catch (err) {
      const detail = err.response?.data?.detail || "Unable to authenticate";
      setMessage(detail, "error");
    } finally {
      setLoading(false);
    }
  };


  if (!token) {
    return (
      <>
        <AuthScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          handleAuthSubmit={handleAuthSubmit}
          loading={loading}
        />
        <Info message={toast.message} tone={toast.tone} />
      </>
    )
  }

  return (
    <>
      <Layout user={user} setUser={setUser} setToken={setToken}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/requester" element={<RequesterView client={client} user={user} setMessage={setMessage} />} />
          <Route path="/fetcher" element={<FetcherView client={client} user={user} setMessage={setMessage} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Info message={toast.message} tone={toast.tone} />
    </>
  );
}
