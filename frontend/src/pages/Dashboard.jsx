import clsx from "clsx";
import { Link } from "react-router-dom";

function ActionCard({ title, description, to, colorClass }) {
    return (
        <Link
            to={to}
            className={clsx(
                "flex flex-col justify-center gap-2 rounded-3xl p-8 shadow-sm transition hover:scale-[1.02] hover:shadow-md",
                colorClass
            )}
        >
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-lg opacity-90">{description}</p>
        </Link>
    );
}

export default function Dashboard() {
    return (
        <div className="grid h-full flex-1 gap-6 py-8 md:grid-cols-2">
            <ActionCard
                title="I Need Something"
                description="Post a request and get it delivered."
                to="/requester"
                colorClass="bg-brand-500 text-white"
            />
            {/* Note: brand-500 might not be defined if not in tailwind config default, using slate-900 as fallback style if needed, but assuming brand-500 from previous App.jsx Context */}

            <ActionCard
                title="I Can Fetch"
                description="Browse requests and earn by delivering."
                to="/fetcher"
                colorClass="bg-emerald-500 text-white"
            />
        </div>
    );
}
