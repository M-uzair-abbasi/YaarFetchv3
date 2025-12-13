import { useState } from "react";
import clsx from "clsx";

export default function OfferForm({ client, onClose, onSuccess, initialData = null }) {
    const isEditMode = !!initialData;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        current_location: initialData?.current_location || "",
        destination: initialData?.destination || "",
        arrival_time: initialData?.arrival_time || "",
        pickup_capability: initialData?.pickup_capability || "",
        contact_number: initialData?.contact_number || "",
        estimated_delivery_time: initialData?.estimated_delivery_time || "",
        delivery_charge: initialData?.delivery_charge || "",
        notes: initialData?.notes || "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert charge to number if present
            const payload = {
                ...formData,
                delivery_charge: formData.delivery_charge ? Number(formData.delivery_charge) : null,
            };

            if (isEditMode) {
                await client.patch(`/offers/${initialData.id}`, payload);
            } else {
                await client.post("/offers", payload);
            }

            onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error(err);
            alert(`Failed to ${isEditMode ? "update" : "post"} offer: ` + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 min-h-screen z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{isEditMode ? "Edit Offer" : "Post Delivery Offer"}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200"
                    >
                        Close
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ... (inputs remain same, state is handled) ... */}
                    {/* Only showing the button change here since inputs bind to state which is already handled */}
                    {/* Wait, replace_file_content replaces a contiguous block. I need to include the inputs if I use a large range. */}
                    {/* Minimizing range. */}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Current Location</label>
                            <input
                                required
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="e.g. Library"
                                value={formData.current_location}
                                onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Destination</label>
                            <input
                                required
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="e.g. H-12 Hostels"
                                value={formData.destination}
                                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Arrival Time</label>
                            <input
                                required
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="e.g. 5:00 PM"
                                value={formData.arrival_time}
                                onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Est. Delivery Time</label>
                            <input
                                required
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="e.g. 15 mins"
                                value={formData.estimated_delivery_time}
                                onChange={(e) => setFormData({ ...formData, estimated_delivery_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Pickup Capability</label>
                        <input
                            required
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="e.g. Can pick up snacks from Cafe"
                            value={formData.pickup_capability}
                            onChange={(e) => setFormData({ ...formData, pickup_capability: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Contact Number</label>
                            <input
                                required
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="0300-1234567"
                                value={formData.contact_number}
                                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Delivery Charge (Optional)</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Amount in PKR"
                                value={formData.delivery_charge}
                                onChange={(e) => setFormData({ ...formData, delivery_charge: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Extra Notes</label>
                        <textarea
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Any other details..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        {loading ? "Working..." : isEditMode ? "Save Changes" : "Post Offer"}
                    </button>
                </form>
            </div>
        </div>
    );
}
