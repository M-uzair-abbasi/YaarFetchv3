import { useState, useEffect } from "react";
import clsx from "clsx";
import OfferForm from "../components/OfferForm";
import ChatBox from "../components/ChatBox";

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

export default function FetcherView({ client, user, setMessage }) {
    const [orders, setOrders] = useState([]);
    const [myOffers, setMyOffers] = useState([]); // To know my active offer IDs
    const [loading, setLoading] = useState(false);
    const [showOfferForm, setShowOfferForm] = useState(false);

    // Fetch my active offers so we can see incoming requests for them
    const fetchMyOffers = async () => {
        try {
            const { data } = await client.get("/offers"); // Ideally endpoint filters by user, or we filter client side
            const mine = data.filter(o => o.fetcher_id === user.id);
            setMyOffers(mine);
            return mine;
        } catch (err) {
            console.error("Failed to fetch my offers");
            return [];
        }
    }

    const fetchOrders = async () => {
        try {
            // 1. Get Open Orders (Public Feed)
            const openRes = await client.get("/orders", { params: { status_filter: "open" } });
            let allOrders = openRes.data;

            // 2. Get Orders accepted by ME (Active Tasks)
            // This is hacky because we don't have a specific endpoint for "My Tasks" yet, 
            // but we can fetch all orders and filter client side for MVP or rely on listing all for now.
            // Better: fetch ALL orders and filter.
            const allRes = await client.get("/orders");

            // Combine and Dedup
            const relevant = allRes.data.filter(o =>
                o.status === "open" ||
                o.fetcher_id === user.id
            );

            setOrders(relevant);
        } catch (err) {
            setMessage("Unable to fetch orders", "error");
        }
    };

    useEffect(() => {
        fetchMyOffers();
        fetchOrders();
    }, []);

    const handleAccept = async (id) => {
        setLoading(true);
        try {
            await client.post(`/orders/${id}/accept`);
            setMessage("Order accepted! Check your tasks.", "success");
            fetchOrders();
        } catch (err) {
            setMessage(err.response?.data?.detail || "Unable to accept order", "error");
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
            setMessage(err.response?.data?.detail || "Unable to update status", "error");
        } finally {
            setLoading(false);
        }
    };

    const STATUS_OPTIONS = [
        { value: "picked_up", label: "Picked up" },
        { value: "delivered", label: "Delivered" },
    ];


    return (
        <div>
            {showOfferForm && (
                <OfferForm
                    client={client}
                    onClose={() => setShowOfferForm(false)}
                    onSuccess={() => {
                        setMessage("Offer posted successfully!", "success");
                        fetchMyOffers();
                    }}
                />
            )}

            <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
                <div>
                    <h2 className="text-xl font-bold">Going somewhere?</h2>
                    <p className="text-slate-300">Earn by delivering items on your way.</p>
                </div>
                <button
                    onClick={() => setShowOfferForm(true)}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow transition hover:bg-slate-100"
                >
                    Post a Delivery Offer
                </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Task Board</h2>
                <button onClick={fetchOrders} className="text-xs font-semibold text-slate-600 hover:text-slate-900">Refresh</button>
            </div>

            {orders.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No tasks available.
                </div>
            )}

            <div className="space-y-4">
                {orders.map((order) => {
                    const isMyTask = order.fetcher_id === user.id;
                    const isTargetedToMe = order.target_offer_id && myOffers.some(o => o.id === order.target_offer_id);

                    // Prioritize: My Tasks > Targeted to Me > Public Open
                    let borderColor = "border-slate-100";
                    if (isMyTask) borderColor = "border-emerald-200 ring-1 ring-emerald-100";
                    else if (isTargetedToMe) borderColor = "border-brand-200 ring-2 ring-brand-100";

                    if (isMyTask && (order.status === "delivered" || order.status === "cancelled")) return null; // Hide finished tasks from main view maybe? keeping simple

                    return (
                        <div
                            key={order.id}
                            className={clsx("flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition", borderColor)}
                        >
                            {isTargetedToMe && order.status === "open" && (
                                <div className="text-xs font-bold uppercase text-brand-600">
                                    ✨ Direct Request for your Trip!
                                </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="mb-1 inline-block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                        Dropoff: {order.dropoff_location}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900">{order.item}</h3>
                                    {order.instructions && (
                                        <p className="text-sm text-slate-600 mt-1">{order.instructions}</p>
                                    )}
                                </div>
                                <StatusPill status={order.status} />
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                                <div className="text-xs text-slate-500">
                                    Requester: <span className="font-medium text-slate-900">{order.requester_id}</span>
                                </div>

                                {/* Actions */}
                                {order.status === "open" && (
                                    <button
                                        onClick={() => handleAccept(order.id)}
                                        disabled={loading}
                                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                                    >
                                        Accept Job
                                    </button>
                                )}

                                {isMyTask && order.status !== "delivered" && (
                                    <div className="flex gap-2">
                                        {STATUS_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                disabled={order.status === opt.value || loading}
                                                onClick={() =>
                                                    handleStatusUpdate(order.id, opt.value)
                                                }
                                                className={clsx(
                                                    "rounded-lg px-2 py-1 text-xs font-bold transition border",
                                                    order.status === opt.value
                                                        ? "bg-slate-100 text-slate-700 border-transparent"
                                                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chat */}
                            {isMyTask && (
                                <ChatBox orderId={order.id} client={client} user={user} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
