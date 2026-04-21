import Link from "next/link";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const backendAction = "/backend/login";

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const error = normalizeSearchValue(resolvedParams.error);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e7f1ff_0%,#f7fbff_100%)] px-6 py-10 text-slate-800">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full gap-10 rounded-[2rem] bg-white/70 p-6 shadow-[0_30px_90px_rgba(51,77,110,0.15)] ring-1 ring-white/70 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div className="flex flex-col justify-between gap-8 rounded-[1.6rem] bg-[#1f3f63] p-8 text-white">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-100/80">
                NittanyAuction
              </p>
              <div className="space-y-4">
                <h1 className="max-w-lg text-4xl font-semibold leading-tight md:text-5xl">
                  Sign in to manage auctions, profile details, and support requests.
                </h1>
                <p className="max-w-xl text-base leading-7 text-blue-50/80 md:text-lg">
                  The current login route is preserved, and the frontend now grows on top of the
                  FastAPI session/API layer without breaking existing routing.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-2xl font-semibold">Buyer</p>
                <p className="mt-2 text-sm text-blue-100/80">
                  Review profile details, payment methods, and support history.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-2xl font-semibold">Seller</p>
                <p className="mt-2 text-sm text-blue-100/80">
                  Track banking information, balance, vendor settings, and requests.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-2xl font-semibold">HelpDesk</p>
                <p className="mt-2 text-sm text-blue-100/80">
                  Claim and resolve tickets from a shared team queue.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-[1.6rem] border border-slate-200 bg-white p-8 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
              <div className="mb-8 space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Account Access
                </p>
                <h2 className="text-3xl font-semibold text-slate-900">Login</h2>
                <p className="text-sm leading-6 text-slate-500">
                  Use your seeded LSU account from the backend dataset. Successful login still
                  lands on <code>/dashboard</code>.
                </p>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <form method="post" action={backendAction} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="Enter email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#334d6e] focus:bg-white focus:ring-4 focus:ring-[#334d6e]/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#334d6e] focus:bg-white focus:ring-4 focus:ring-[#334d6e]/10"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#334d6e] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#263c57]"
                >
                  Sign in
                </button>
              </form>

              <div className="mt-6 text-sm text-slate-500">
                Need access to support flows after login? Visit{" "}
                <Link href="/requests" className="font-medium text-[#334d6e]">
                  Requests
                </Link>{" "}
                or{" "}
                <Link href="/helpdesk" className="font-medium text-[#334d6e]">
                  HelpDesk
                </Link>
                .
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
