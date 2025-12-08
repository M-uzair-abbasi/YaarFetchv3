import { useState, useEffect, useRef } from "react";
import clsx from "clsx";

export default function ChatBox({ orderId, client, user }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const { data } = await client.get(`/chat/${orderId}/messages`);
            setMessages(data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [orderId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setLoading(true);
        try {
            await client.post(`/chat/${orderId}/messages`, { content: newMessage });
            setNewMessage("");
            fetchMessages();
        } catch (err) {
            alert("Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4 flex h-64 flex-col rounded-xl border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-2 bg-white rounded-t-xl">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Chat with {user.name}
                </h3>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
            >
                {messages.length === 0 && (
                    <p className="text-center text-xs text-slate-400">Start the conversation</p>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                        <div
                            key={msg.id}
                            className={clsx(
                                "flex flex-col max-w-[80%]",
                                isMe ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div
                                className={clsx(
                                    "rounded-2xl px-3 py-2 text-sm",
                                    isMe
                                        ? "bg-blue-500 text-white rounded-br-none"
                                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                                )}
                            >
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-2 bg-white rounded-b-xl">
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Type a message..."
                />
                <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
