"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  startCheckout,
  useCheckoutSession,
} from "@/lib/checkout/session-store";

const returnKey = "aui-setup-return-to";
const hintKey = "aui-setup-resume-hint";
const SetupNavigationContext = createContext({
  enterSetup: () => {},
  leaveSetup: () => {},
  resumeHint: false,
  dismissResumeHint: () => {},
});

const storedReturnTo = () => {
  try {
    const value = sessionStorage.getItem(returnKey);
    if (
      value?.startsWith("/") &&
      !value.startsWith("//") &&
      !value.startsWith("/shop/setup") &&
      !value.includes("\\")
    )
      return value;
  } catch {}
  return "/";
};

export function SetupNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useCheckoutSession();
  const [previousPath, setPreviousPath] = useState(pathname);
  const origin = useRef<{ href: string; useHistory: boolean } | null>(null);
  const [hintedSession, setHintedSession] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(hintKey);
    } catch {
      return null;
    }
  });
  const [resumeHint, setResumeHint] = useState(false);

  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    const showHint =
      previousPath === "/shop/setup" &&
      session !== null &&
      hintedSession !== session.id;
    setResumeHint(showHint);
    if (showHint) setHintedSession(session.id);
  }

  useEffect(() => {
    if (hintedSession === null) return;
    try {
      sessionStorage.setItem(hintKey, hintedSession);
    } catch {}
  }, [hintedSession]);

  const enterSetup = () => {
    const fromCart = window.location.pathname === "/shop/cart";
    const href = fromCart
      ? "/"
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;
    origin.current = { href, useHistory: !fromCart };
    try {
      sessionStorage.setItem(returnKey, href);
    } catch {}
    setResumeHint(false);
  };

  const leaveSetup = () => {
    if (origin.current?.useHistory) router.back();
    else router.replace(origin.current?.href ?? storedReturnTo());
    origin.current = null;
  };

  return (
    <SetupNavigationContext.Provider
      value={{
        enterSetup,
        leaveSetup,
        resumeHint: resumeHint && session !== null,
        dismissResumeHint: () => setResumeHint(false),
      }}
    >
      {children}
    </SetupNavigationContext.Provider>
  );
}

export const useSetupNavigation = () => useContext(SetupNavigationContext);

export function SetupLink({
  onNavigate,
  ...props
}: Omit<ComponentProps<typeof Link>, "href">) {
  const { enterSetup } = useSetupNavigation();
  return (
    <Link
      {...props}
      href="/shop/setup"
      onNavigate={(event) => {
        onNavigate?.(event);
        enterSetup();
      }}
    />
  );
}

/** Opens a setup session for the given products, or returns to the running one, and goes to it. */
export const useBeginSetup = () => {
  const router = useRouter();
  const { enterSetup } = useSetupNavigation();
  return (slugs: readonly string[]) => {
    startCheckout(slugs);
    enterSetup();
    router.push("/shop/setup");
  };
};
