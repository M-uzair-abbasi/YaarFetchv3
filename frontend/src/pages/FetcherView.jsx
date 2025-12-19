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
    const [myOffers, setMyOffers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showOfferForm, setShowOfferForm] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);

    const fetchMyOffers = async () => {
        try {
            const { data } = await client.get("/offers");
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
            const openRes = await client.get("/orders", { params: { status_filter: "open" } });
            const allRes = await client.get("/orders"); // To get assigned tasks

            // Combine and Dedup: Open orders OR orders assigned to me
            // Filter out my own requests (failsafe)
            const relevant = allRes.data.filter(o =>
                (o.status === "open" && o.requester_id !== user.id) ||
                o.fetcher_id === user.id
            );

            // Remove duplicates if any (simple ID check)
            const unique = [...new Map(relevant.map(item => [item.id, item])).values()];
            setOrders(unique);
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

        const handleSubmitPayout = async (orderId, details) => {
            setLoading(true);
            try {
                await client.put(`/orders/${orderId}/payout-details`, details);
                setMessage("Payout details submitted", "success");
                fetchOrders();
            } catch (err) {
                setMessage(err.response?.data?.detail || "Unable to submit payout", "error");
            } finally {
                setLoading(false);
            }
        };


        const handleDeleteOffer = async (id) => {
            if (!window.confirm("Are you sure you want to delete this offer?")) return;
            try {
                await client.delete(`/offers/${id}`);
                setMessage("Offer deleted successfully", "success");
                fetchMyOffers();
            } catch (err) {
                setMessage("Failed to delete offer", "error");
            }
        };

        const STATUS_OPTIONS = [
            { value: "picked_up", label: "Picked up" },
            { value: "delivered", label: "Delivered" },
        ];

        return (
            <div className="space-y-8">
                {(showOfferForm || editingOffer) && (
                    <OfferForm
                        client={client}
                        initialData={editingOffer}
                        onClose={() => {
                            setShowOfferForm(false);
                            setEditingOffer(null);
                        }}
                        onSuccess={() => {
                            setMessage(`Offer ${editingOffer ? "updated" : "posted"} successfully!`, "success");
                            fetchMyOffers();
                        }}
                    />
                )}

                {/* Header / Offer Prompt */}
                <div className="flex items-center justify-between rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
                    <div>
                        <h2 className="text-2xl font-bold">Going somewhere?</h2>
                        <p className="mt-1 text-slate-400">Post an offer to pick up items for others.</p>
                    </div>
                    <button
                        onClick={() => setShowOfferForm(true)}
                        className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-50 hover:scale-105 active:scale-95"
                    >
                        + Post Delivery Offer
                    </button>
                </div>

                {/* MY OFFERS SECTION */}
                {myOffers.length > 0 && (
                    <div>
                        <h2 className="mb-4 text-xl font-bold text-slate-900">Your Active Offers</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {myOffers.map(offer => (
                                <div key={offer.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-800 text-lg">{offer.current_location} &rarr; {offer.destination}</div>
                                            <div className="text-sm text-slate-500 mt-1">Arrival: {offer.arrival_time}</div>
                                            <div className="text-xs text-slate-400 mt-2">{offer.pickup_capability}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingOffer(offer)}
                                                className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOffer(offer.id)}
                                                className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TASKS LIST */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Task Board (Deliveries)</h2>
                        <button onClick={fetchOrders} className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900">Refresh Board</button>
                    </div>

                    {orders.length === 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                            No delivery tasks available right now.
                        </div>
                    )}

                    <div className="grid gap-4">
                        {orders.map((order) => {
                            const isMyTask = order.fetcher_id === user.id;
                            const isTargetedToMe = order.target_offer_id && myOffers.some(o => o.id === order.target_offer_id);

                            let borderColor = "border-slate-100";
                            if (isMyTask) borderColor = "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30";
                            else if (isTargetedToMe) borderColor = "border-brand-500 ring-1 ring-brand-200 bg-brand-50/30";

                            // Hide completed tasks ONLY if payout is already processed or pending (so they can verify)
                            // Actually, hide if payout_status is set (meaning they claimed it)
                            // If status is delivered BUT payout_status is null/undefined, we MUST SHOW IT so they can claim.
                            if (isMyTask && order.status === "delivered" && order.payout_status) return null;

                            return (
                                <div
                                    key={order.id}
                                    className={clsx("group relative flex flex-col gap-4 rounded-3xl border p-6 shadow-sm transition-all hover:shadow-md", borderColor)}
                                >
                                    {isTargetedToMe && order.status === "open" && (
                                        <div className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                                            Direct Request
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                    Dropoff: {order.dropoff_location}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">{order.item}</h3>
                                            {order.instructions && (
                                                <p className="mt-1 text-sm text-slate-600">{order.instructions}</p>
                                            )}
                                            {/* Requester Info */}
                                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                    {(order.requester_name || order.requester_id)[0].toUpperCase()}
                                                </div>
                                                <span>{order.requester_name || "Unknown Requester"}</span>
                                                {order.requester_contact && (
                                                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                        {order.requester_contact}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <StatusPill status={order.status} />
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                        <div className="flex gap-2">
                                            {order.status === "open" && (
                                                <button
                                                    onClick={() => handleAccept(order.id)}
                                                    disabled={loading}
                                                    className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-emerald-200 shadow-lg transition hover:bg-emerald-600 hover:shadow-xl active:translate-y-0.5"
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
                                                            onClick={() => handleStatusUpdate(order.id, opt.value)}
                                                            className={clsx(
                                                                "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                                                                order.status === opt.value
                                                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                            )}
                                                        >
                                                            Mark {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* PAYOUT SECTION - Show if Delivered and is My Task */}
                                    {
                                        isMyTask && order.status === "delivered" && !order.payout_status && (
                                            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                                <h4 className="mb-2 text-sm font-bold text-emerald-900">Claim Your Payout</h4>
                                                <p className="mb-3 text-xs text-emerald-700">Order delivered! Enter your details to receive payment (75%).</p>

                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        const details = {
                                                            bank_name: e.target.elements.bank_name.value,
                                                            account_number: e.target.elements.account_number.value,
                                                            account_title: e.target.elements.account_title.value,
                                                        };
                                                        handleSubmitPayout(order.id, details);
                                                    }}
                                                    className="space-y-2"
                                                >
                                                    <input name="bank_name" required placeholder="Bank Name / Wallet" className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-xs" />
                                                    <div className="flex gap-2">
                                                        <input name="account_number" required placeholder="Account Number" className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs" />
                                                        <input name="account_title" required placeholder="Account Title" className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs" />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                                    >
                                                        Submit Payout Details
                                                    </button>
                                                </form>
                                            </div>
                                        )
                                    }

                                    {
                                        isMyTask && order.payout_status === "PENDING" && (
                                            <div className="mt-4 rounded-xl bg-slate-100 p-3 text-center text-xs font-bold text-slate-500 border border-slate-200">
                                                Payout Pending Processing...
                                            </div>
                                        )
                                    }


                                    {
                                        isMyTask && (
                                            <ChatBox
                                                orderId={order.id}
                                                client={client}
                                                user={user}
                                                otherUserName={order.requester_name}
                                            />
                                        )
                                    }
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div >
        );
    }
