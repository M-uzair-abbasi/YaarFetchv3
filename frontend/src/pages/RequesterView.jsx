import { useState, useEffect } from "react";
import clsx from "clsx";

function Card({ children, className }) {
    return (
        <div className={clsx("rounded-2xl bg-white p-4 shadow-sm", className)}>
            {children}
        </div>
    );
}

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

export default function RequesterView({ client, user, setMessage }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [orderForm, setOrderForm] = useState({
        item: "",
        dropoff_location: "",
        instructions: "",
    });

    const fetchMyOrders = async () => {
        try {
            const { data } = await client.get("/orders");
            // Filter client-side for now to show only my relevant orders (as requester)
            // Ideally backend handles filtering, but reusing existing endpoint
            const myOrders = data.filter(o => o.requester_id === user.id);
            setOrders(myOrders);
        } catch (err) {
            console.error(err);
            setMessage("Unable to fetch orders", "error");
        }
    };

    useEffect(() => {
        fetchMyOrders();
    }, []);

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await client.post("/orders", orderForm);
            setOrderForm({ item: "", dropoff_location: "", instructions: "" });
            setMessage("Request posted successfully", "success");
            fetchMyOrders();
        } catch (err) {
            setMessage(err.response?.data?.detail || "Unable to create order", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        setLoading(true);
        try {
            await client.patch(`/orders/${id}/status`, { status });
            setMessage("Status updated", "success");
            fetchMyOrders();
        } catch (err) {
            setMessage(err.response?.data?.detail || "Unable to update status", "error");
        } finally {
            setLoading(false);
        }
    };


    const STATUS_OPTIONS = [
        { value: "open", label: "Open" },
        { value: "accepted", label: "Accepted" },
        { value: "picked_up", label: "Picked up" },
        { value: "delivered", label: "Delivered" },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                    Post a new request
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
                            rows={2}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                            placeholder="Budget, brand, call on arrival..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                        {loading ? "Posting..." : "Post request"}
                    </button>
                </form>
            </Card>

            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">My Requests</h2>
                    <button onClick={fetchMyOrders} className="text-xs font-semibold text-slate-600 hover:text-slate-900">Refresh</button>
                </div>

                {orders.length === 0 && (
                    <p className="text-slate-500 text-sm">You haven't posted any requests yet.</p>
                )}

                <div className="space-y-3">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">
                                        {order.item}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {order.dropoff_location}
                                    </p>
                                </div>
                                <StatusPill status={order.status} />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50 mt-1">
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        disabled={order.status === opt.value || loading}
                                        onClick={() =>
                                            handleStatusUpdate(order.id, opt.value)
                                        }
                                        className={clsx(
                                            "rounded-xl px-2 py-1 text-[10px] font-semibold transition border",
                                            order.status === opt.value
                                                ? "bg-slate-100 text-slate-700 border-transparent"
                                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
