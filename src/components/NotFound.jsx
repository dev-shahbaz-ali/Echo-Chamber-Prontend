import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efeae2] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-black/5 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <h1
          className="mb-4 text-8xl font-black tracking-tighter text-[#25d366]"
          data-text="404"
        >
          404
        </h1>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">
          Lost in the Echo?
        </h2>
        <p className="mb-8 text-base leading-relaxed text-slate-500">
          The frequency you're looking for doesn't exist or has moved to a
          different chamber.
        </p>
        <button
          className="w-full rounded-xl bg-[#25d366] py-3 font-semibold text-white transition-colors hover:bg-[#1fb85a]"
          onClick={() => navigate("/")}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
