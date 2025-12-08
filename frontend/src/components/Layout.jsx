import { Link, useNavigate } from "react-router-dom";

export default function Layout({ children, user, setUser, setToken }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        setUser(null);
        setToken("");
        navigate("/");
    };

    return (
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
            <header className="flex items-center justify-between gap-2">
                <Link to="/" className="hover:opacity-80 transition">
                    <p className="text-sm text-slate-500">Peer-to-peer campus delivery</p>
                    <h1 className="text-2xl font-semibold text-slate-900">YaarFetch</h1>
                </Link>
                {user && (
                    <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-slate-600 hidden sm:block">
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p>{user.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <footer className="pb-4 text-center text-xs text-slate-500">
                Built for students to help each other move essentials across campus.
            </footer>
        </div>
    );
}
