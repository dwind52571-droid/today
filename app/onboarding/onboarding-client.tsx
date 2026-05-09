"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export function OnboardingClient() {
  const router = useRouter();
  const [screen, setScreen] = useState<"intro" | "login">("intro");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWithEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSupabaseConfig()) {
      setError("Supabase is not configured.");
      return;
    }

    setIsLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Unable to continue.");
      setIsLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <section className="-mx-5 flex min-h-dvh flex-1 overflow-hidden bg-[#050506] px-8 text-white">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto h-56 max-w-[430px] bg-[radial-gradient(circle_at_50%_100%,rgba(50,215,75,0.28),rgba(50,215,75,0.08)_30%,transparent_66%)] blur-2xl" />

      <AnimatePresence mode="wait">
        {screen === "intro" ? (
          <motion.div
            key="intro"
            className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center pb-[calc(88px+env(safe-area-inset-bottom))] pt-14"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h1 className="text-[68px] font-semibold leading-none tracking-normal text-white drop-shadow-[0_10px_28px_rgba(255,255,255,0.08)]">
                Today<span className="text-[#32D74B]">.</span>
              </h1>
              <p className="mt-8 text-[27px] font-medium leading-none text-white/72">
                Keep going.
              </p>
              <p className="mt-8 max-w-[260px] text-[17px] font-normal leading-7 text-white/68">
                Track your body,
                <br />
                one day at a time.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen("login")}
              className="h-[66px] w-full max-w-[333px] rounded-full bg-[#32D74B] text-[18px] font-semibold text-black shadow-[0_0_48px_rgba(50,215,75,0.34)] transition active:scale-[0.985]"
            >
              Continue
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center px-3 pb-[calc(72px+env(safe-area-inset-bottom))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="w-full -translate-y-12 space-y-11 text-center">
              <h1 className="text-[48px] font-semibold leading-none tracking-normal text-white">
                Continue
              </h1>

              <div className="space-y-4">
                <form
                  onSubmit={signInWithEmail}
                  className="mx-auto w-full max-w-[350px] space-y-3"
                >
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    className="h-[58px] w-full rounded-[22px] border border-white/13 bg-white/[0.075] px-5 text-[17px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none placeholder:text-white/36"
                  />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    className="h-[58px] w-full rounded-[22px] border border-white/13 bg-white/[0.075] px-5 text-[17px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none placeholder:text-white/36"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="h-[66px] w-full rounded-full bg-[#32D74B] text-[18px] font-semibold text-black shadow-[0_0_48px_rgba(50,215,75,0.26)] transition active:scale-[0.985] disabled:opacity-50"
                  >
                    Continue
                  </button>
                </form>

                {error ? (
                  <p className="text-[13px] font-medium text-white/40">{error}</p>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
