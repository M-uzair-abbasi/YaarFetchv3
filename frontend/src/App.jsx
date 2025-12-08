import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import clsx from "clsx";

// Prefer production URL, then legacy base, then localhost for dev
const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "accepted", label: "Accepted" },
  { value: "picked_up", label: "Picked up" },
  { value: "delivered", label: "Delivered" },
];

function StatusPill({ status }) {
  const colors = {
    open: "bg-amber-100 text-amber-800",
    accepted: "bg-blue-100 text-blue-800",
    picked_up: "bg-indigo-100 text-indigo-800",
    delivered: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        colors[status] || "bg-slate-100 text-slate-800"
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function Info({ message, tone = "info" }) {
  if (!message) return null;
  const intent = {
    info: "bg-blue-50 text-blue-900 border-blue-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
  }[tone];
  return (
    <div className={clsx("rounded-xl border px-4 py-3 text-sm", intent)}>
      {message}
    </div>
  );
}

function Card({ children, className }) {
  return (
    <div className={clsx("rounded-2xl bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
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
  const [orders, setOrders] = useState([]);
  const [orderForm, setOrderForm] = useState({
    item: "",
    dropoff_location: "",
    instructions: "",
  });
  const [statusFilter, setStatusFilter] = useState("");
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

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token, statusFilter]);

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
        authMode === "login" ? "Welcome back!" : "Account created. Let's fetch.",
        "success"
      );
    } catch (err) {
      const detail = err.response?.data?.detail || "Unable to authenticate";
      setMessage(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const params = statusFilter ? { status_filter: statusFilter } : {};
      const { data } = await client.get("/orders", { params });
      setOrders(data);
    } catch (err) {
      const detail = err.response?.data?.detail || "Unable to fetch orders";
      setMessage(detail, "error");
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.post("/orders", orderForm);
      setOrderForm({ item: "", dropoff_location: "", instructions: "" });
      setMessage("Request posted", "success");
      fetchOrders();
    } catch (err) {
      const detail = err.response?.data?.detail || "Unable to create order";
      setMessage(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setLoading(true);
    try {
      await client.post(`/orders/${id}/accept`);
      setMessage("Order accepted", "success");
      fetchOrders();
    } catch (err) {
      const detail = err.response?.data?.detail || "Unable to accept order";
      setMessage(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setLoading(true);
    try {
      await client.patch(`/orders/${id}/status`, { status });
      setMessage("Status updated", "success");
      fetchOrders();
    } catch (err) {
      const detail = err.response?.data?.detail || "Unable to update status";
      setMessage(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  const isRequester = (order) => order.requester_id === user?.id;
  const isFetcher = (order) => order.fetcher_id === user?.id;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Peer-to-peer campus delivery</p>
          <h1 className="text-2xl font-semibold text-slate-900">YaarFetch</h1>
        </div>
        {user && (
          <div className="text-right text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p>{user.email}</p>
          </div>
        )}
      </header>

      <Info message={toast.message} tone={toast.tone} />

      {!token ? (
        <Card className="mt-2">
          <div className="mb-3 flex gap-3">
            <button
              className={clsx(
                "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition",
                authMode === "login"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              )}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={clsx(
                "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition",
                authMode === "register"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              )}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  required
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder="Your full name"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="you@campus.edu"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                placeholder="•••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              {loading
                ? "Working..."
                : authMode === "login"
                ? "Login"
                : "Create account"}
            </button>
          </form>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Post a request
              </h2>
              <form className="space-y-3" onSubmit={handleCreateOrder}>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Item needed
                  </label>
                  <input
                    required
                    value={orderForm.item}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, item: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="Snacks, groceries, etc."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Drop-off location
                  </label>
                  <input
                    required
                    value={orderForm.dropoff_location}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        dropoff_location: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="Gate, hostel, block..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Instructions (optional)
                  </label>
                  <textarea
                    value={orderForm.instructions}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, instructions: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="Budget, brand, call on arrival..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                >
                  {loading ? "Posting..." : "Post request"}
                </button>
              </form>
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Filters
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className={clsx(
                    "rounded-full px-3 py-1 text-sm font-medium",
                    statusFilter === ""
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  )}
                  onClick={() => setStatusFilter("")}
                >
                  All
                </button>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={clsx(
                      "rounded-full px-3 py-1 text-sm font-medium",
                      statusFilter === opt.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    )}
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Open requests
              </h2>
              <button
                onClick={fetchOrders}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
            {orders.length === 0 && (
              <p className="text-sm text-slate-500">
                No requests yet. Post one or refresh.
              </p>
            )}
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        Drop-off: {order.dropoff_location}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900">
                        {order.item}
                      </h3>
                      {order.instructions && (
                        <p className="text-sm text-slate-600">
                          {order.instructions}
                        </p>
                      )}
                    </div>
                    <StatusPill status={order.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Requester:
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {order.requester_id === user.id
                        ? "You"
                        : order.requester_id}
                    </span>
                    {order.fetcher_id && (
                      <>
                        <span className="font-semibold text-slate-700">
                          Fetcher:
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {order.fetcher_id === user.id
                            ? "You"
                            : order.fetcher_id}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === "open" && !isRequester(order) && (
                      <button
                        onClick={() => handleAccept(order.id)}
                        disabled={loading}
                        className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                      >
                        Accept
                      </button>
                    )}
                    {(isRequester(order) || isFetcher(order)) && (
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            disabled={order.status === opt.value || loading}
                            onClick={() =>
                              handleStatusUpdate(order.id, opt.value)
                            }
                            className={clsx(
                              "rounded-xl px-3 py-2 text-xs font-semibold shadow-sm",
                              order.status === opt.value
                                ? "bg-slate-100 text-slate-700"
                                : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <footer className="pb-4 text-center text-xs text-slate-500">
        Built for students to help each other move essentials across campus.
      </footer>
    </div>
  );
}

