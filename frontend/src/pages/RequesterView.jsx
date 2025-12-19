import { useState, useEffect } from "react";
import clsx from "clsx";
import ChatBox from "../components/ChatBox";

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
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [orderForm, setOrderForm] = useState({
        item: "",
        dropoff_location: "",
        instructions: "",
        target_offer_id: null,
    });
    const [selectedOffer, setSelectedOffer] = useState(null);

    const fetchMyOrders = async () => {
        try {
            const { data } = await client.get("/orders");
            const myOrders = data.filter(o => o.requester_id === user.id);
            setOrders(myOrders);
        } catch (err) {
            console.error(err);
            setMessage("Unable to fetch orders", "error");
        }
    };

    const fetchActiveOffers = async () => {
        try {
            const { data } = await client.get("/offers");
            setOffers(data.filter(o => o.fetcher_id !== user.id));
        } catch (err) {
            console.error("Unable to list offers");
        }
    }

    useEffect(() => {
        fetchMyOrders();
        fetchActiveOffers();
    }, []);

    const handleRequestFetcher = (offer) => {
        setSelectedOffer(offer);
        setOrderForm({
            ...orderForm,
            target_offer_id: offer.id,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...orderForm,
                target_fetcher_id: selectedOffer ? selectedOffer.fetcher_id : null
            };
            await client.post("/orders", payload);
            setOrderForm({ item: "", dropoff_location: "", instructions: "", target_offer_id: null });
            setSelectedOffer(null);
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
    const handleSubmitPayment = async (orderId, txnId) => {
        setLoading(true);
        try {
            await client.put(`/orders/${orderId}/payment`, { txn_id: txnId });
            setMessage("Payment details submitted", "success");
            fetchMyOrders();
        } catch (err) {
            setMessage(err.response?.data?.detail || "Unable to submit payment", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDelivery = async (orderId) => {
        setLoading(true);
        try {
            await client.patch(`/orders/${orderId}/status`, { status: "delivered" });
            setMessage("Delivery confirmed", "success");
            fetchMyOrders();
        } catch (err) {
            setMessage(err.response?.data?.detail || "Unable to confirm delivery", "error");
        } finally {
            setLoading(false);
        }
    }



    const STATUS_OPTIONS = [
        { value: "open", label: "Open" },
        { value: "accepted", label: "Accepted" },
        { value: "picked_up", label: "Picked up" },
        { value: "delivered", label: "Delivered" },
    ];

    return (
        <div className="grid gap-8 md:grid-cols-2 items-start">
            {/* LEFT COLUMN: Create Request & Active Fetchers */}
            <div className="space-y-8">
                <Card className={clsx("border-2 shadow-lg", selectedOffer ? "border-brand-500 ring-4 ring-brand-100" : "border-transparent")}>
                    <h2 className="mb-4 text-xl font-bold text-slate-900">
                        {selectedOffer ? `Requesting delivery from Finder` : "Post a new request"}
                    </h2>
                    {selectedOffer && (
                        <div className="mb-6 rounded-xl bg-brand-50 p-4 text-sm text-brand-900 border border-brand-100">
                            <div className="font-bold mb-1">Targeting Offer:</div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200">{selectedOffer.current_location}</span>
                                <span>&rarr;</span>
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200">{selectedOffer.destination}</span>
                            </div>
                            <button onClick={() => { setSelectedOffer(null); setOrderForm({ ...orderForm, target_offer_id: null }) }} className="block mt-3 text-xs font-bold underline text-brand-700 hover:text-brand-900">Cancel specific request</button>
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleCreateOrder}>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Item needed
                            </label>
                            <input
                                required
                                value={orderForm.item}
                                onChange={(e) =>
                                    setOrderForm({ ...orderForm, item: e.target.value })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none transition"
                                placeholder="Snacks, groceries, etc."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
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
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none transition"
                                placeholder="Gate, hostel, block..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Instructions (optional)
                            </label>
                            <textarea
                                value={orderForm.instructions}
                                onChange={(e) =>
                                    setOrderForm({ ...orderForm, instructions: e.target.value })
                                }
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none transition"
                                placeholder="Budget, brand, call on arrival..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 hover:shadow-xl active:translate-y-0.5"
                        >
                            {loading ? "Posting..." : selectedOffer ? "Send Request to Fetcher" : "Post to Public Feed"}
                        </button>
                    </form>
                </Card>

                {/* Active Fetchers List */}
                <div>
                    <h2 className="mb-4 text-xl font-bold text-slate-900">Active Fetchers Nearby</h2>
                    <div className="space-y-4">
                        {offers.length === 0 && (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
                                No active fetchers right now.
                            </div>
                        )}
                        {offers.map(offer => (
                            <div key={offer.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition cursor-default">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Available Now</span>
                                    <span className="text-xs font-bold text-slate-400">{offer.arrival_time}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg mb-1">{offer.current_location} &rarr; {offer.destination}</div>
                                        <p className="text-xs text-slate-500 font-medium">{offer.pickup_capability}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRequestFetcher(offer)}
                                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-slate-700 hover:scale-105 active:scale-95"
                                    >
                                        Request
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: My Orders */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">My Requests</h2>
                    <button onClick={fetchMyOrders} className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900">Refresh</button>
                </div>

                {orders.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                        You haven't posted any requests yet.
                    </div>
                )}

                <div className="space-y-4">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className={clsx("flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md",
                                order.status === "open" ? "bg-white" : "bg-slate-50/50"
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    {order.target_offer_id && (
                                        <span className="mb-2 inline-block rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">
                                            Direct Request
                                        </span>
                                    )}
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {order.item}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        To: <span className="font-medium text-slate-700">{order.dropoff_location}</span>
                                    </p>


                                    {/* Fetcher Info Display - SHOW CONTACT HERE IF ACCEPTED */}
                                    {order.fetcher_id && (
                                        <div className="mt-4 rounded-xl bg-emerald-50/50 border border-emerald-100 p-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Assigned Fetcher</div>
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                <div className="h-6 w-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">
                                                    {(order.fetcher_name || "F")[0]}
                                                </div>
                                                {order.fetcher_name || "Fetcher"}
                                            </div>
                                            {order.fetcher_contact && (
                                                <div className="mt-2 text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded border border-emerald-100 inline-block">
                                                    📞 {order.fetcher_contact}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <StatusPill status={order.status} />
                            </div>

                            {/* PAYMENT SECTION - Show if Accepted */}
                            {order.status === "accepted" && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                    <h4 className="mb-2 text-sm font-bold text-blue-900">Payment Required</h4>
                                    <p className="mb-4 text-xs text-blue-700">
                                        Please transfer the order amount to YaarFetch Escrow to proceed.
                                        <br />
                                        <span className="font-mono mt-1 block">
                                            Bank: HBL<br />
                                            Title: YaarFetch Pvt Ltd<br />
                                            Acct: 1234-5678-9012-3456<br />
                                            JazzCash: 0300-1234567
                                        </span>
                                    </p>

                                    {order.payment_sent ? (
                                        <div className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-800">
                                            <span>✓ Payment Details Sent (Txn: {order.txn_id})</span>
                                        </div>
                                    ) : (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const txn = e.target.elements.txn_id.value;
                                                handleSubmitPayment(order.id, txn);
                                            }}
                                            className="flex gap-2"
                                        >
                                            <input
                                                name="txn_id"
                                                required
                                                placeholder="Enter Transaction ID / Ref No."
                                                className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                Submit
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* DELIVERY CONFIRMATION - Show if Picked Up or Accepted (logic allows flow) */}
                            {(order.status === "picked_up" || order.status === "accepted") && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => handleConfirmDelivery(order.id)}
                                        disabled={loading}
                                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                                    >
                                        Delivery Received
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-1 hidden">

                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        disabled={order.status === opt.value || loading}
                                        onClick={() =>
                                            handleStatusUpdate(order.id, opt.value)
                                        }
                                        className={clsx(
                                            "rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition border",
                                            order.status === opt.value
                                                ? "bg-slate-200 text-slate-500 border-transparent cursor-not-allowed"
                                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {/* Chat Integration */}
                            {(order.status === "accepted" || order.status === "picked_up") && (
                                <ChatBox
                                    orderId={order.id}
                                    client={client}
                                    user={user}
                                    otherUserName={order.fetcher_name}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
