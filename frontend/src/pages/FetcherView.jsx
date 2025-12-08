import { useState, useEffect } from "react";
import clsx from "clsx";
import OfferForm from "../components/OfferForm";

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
    const [loading, setLoading] = useState(false);
    const [showOfferForm, setShowOfferForm] = useState(false);

    const fetchOpenOrders = async () => {
        try {
            const { data } = await client.get("/orders", { params: { status_filter: "open" } });
            setOrders(data);
        } catch (err) {
            setMessage("Unable to fetch open orders", "error");
        }
    };

    useEffect(() => {
        fetchOpenOrders();
    }, []);

    const handleAccept = async (id) => {
        setLoading(true);
        try {
            await client.post(`/orders/${id}/accept`);
            setMessage("Order accepted! Check your tasks.", "success");
            fetchOpenOrders();
        } catch (err) {
            setMessage(err.response?.data?.detail || "Unable to accept order", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {showOfferForm && (
                <OfferForm
                    client={client}
                    onClose={() => setShowOfferForm(false)}
                    onSuccess={() => {
                        setMessage("Offer posted successfully!", "success");
                        // Maybe refresh offers if we displayed them
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
                <h2 className="text-lg font-semibold text-slate-900">Open Requests Nearby</h2>
                <button onClick={fetchOpenOrders} className="text-xs font-semibold text-slate-600 hover:text-slate-900">Refresh</button>
            </div>

            {orders.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No open requests right now.
                </div>
            )}

            <div className="space-y-4">
                {orders.map((order) => {
                    const isMyOrder = order.requester_id === user.id;
                    return (
                        <div
                            key={order.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                        >
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

                            <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-slate-500">
                                    Requested by <span className="font-medium text-slate-900">{order.requester_id}</span>
                                </div>
                                {!isMyOrder && (
                                    <button
                                        onClick={() => handleAccept(order.id)}
                                        disabled={loading}
                                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                                    >
                                        Accept
                                    </button>
                                )}
                                {isMyOrder && (
                                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">Your Request</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
