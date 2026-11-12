"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import type { SellerOnboardingStateDto } from "@/server/seller/seller-onboarding.service";
import { SellerWelcomeGuideModal } from "./seller-welcome-guide-modal";

interface SellerOnboardingContextValue {
  onboarding: SellerOnboardingStateDto | null;
  isAuthorizedSeller: boolean;
  loading: boolean;
  modalOpen: boolean;
  activeStep: 1 | 2 | 3 | 4;
  openWelcomeGuide: (startStep?: 1 | 2 | 3 | 4) => void;
  closeWelcomeGuide: () => void;
}

const SellerOnboardingContext = createContext<SellerOnboardingContextValue>({
  onboarding: null,
  isAuthorizedSeller: false,
  loading: false,
  modalOpen: false,
  activeStep: 1,
  openWelcomeGuide: () => undefined,
  closeWelcomeGuide: () => undefined,
});

function clampUiStep(step: number | undefined): 1 | 2 | 3 | 4 {
  if (step === 2 || step === 3 || step === 4) return step;
  return 1;
}

export function SellerOnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending: sessionPending } = useSession();
  const sessionUser = session?.user as
    | { id?: string; role?: string; isPlatformAdmin?: boolean }
    | undefined;

  const isMerchantCandidate = Boolean(
    !sessionPending &&
      sessionUser?.id &&
      !sessionUser.isPlatformAdmin &&
      sessionUser.role === "MERCHANT"
  );

  const [onboarding, setOnboarding] = useState<SellerOnboardingStateDto | null>(null);
  const [isAuthorizedSeller, setIsAuthorizedSeller] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const autoShownForUserRef = useRef<string | null>(null);

  const isSellerWorkspaceRoute =
    pathname === "/seller" || pathname.startsWith("/seller/");

  const loading = Boolean(
    sessionPending ||
      (isMerchantCandidate && sessionUser?.id && checkedUserId !== sessionUser.id)
  );

  useEffect(() => {
    let cancelled = false;

    if (!isMerchantCandidate || !sessionUser?.id) {
      setOnboarding(null);
      setIsAuthorizedSeller(false);
      setCheckedUserId(null);
      setModalOpen(false);
      autoShownForUserRef.current = null;
      return;
    }

    const userId = sessionUser.id;

    fetch("/api/seller/onboarding", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setIsAuthorizedSeller(false);
          setOnboarding(null);
          setModalOpen(false);
          return;
        }
        if (!res.ok) {
          // Fail-open cleanly: never block Seller Workspace if persistence is unavailable
          setIsAuthorizedSeller(true);
          return;
        }
        const data = (await res.json()) as { onboarding?: SellerOnboardingStateDto };
        if (cancelled || !data.onboarding) return;
        setIsAuthorizedSeller(true);
        setOnboarding(data.onboarding);
      })
      .catch(() => {
        // Non-blocking fallback
        if (!cancelled) {
          setIsAuthorizedSeller(true);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckedUserId(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [isMerchantCandidate, sessionUser?.id]);

  useEffect(() => {
    if (
      !isAuthorizedSeller ||
      !onboarding?.shouldAutoShow ||
      !isSellerWorkspaceRoute ||
      !sessionUser?.id
    ) {
      return;
    }
    if (autoShownForUserRef.current === sessionUser.id) {
      return;
    }
    autoShownForUserRef.current = sessionUser.id;
    setActiveStep(clampUiStep(onboarding.lastViewedStep));
    setModalOpen(true);
  }, [isAuthorizedSeller, isSellerWorkspaceRoute, onboarding, sessionUser?.id]);

  const persistAction = useCallback(
    async (payload: {
      action: "VIEW_STEP" | "SKIP" | "COMPLETE" | "REOPEN";
      step?: number;
      source?: string;
    }) => {
      try {
        const res = await fetch("/api/seller/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { onboarding?: SellerOnboardingStateDto };
        if (data.onboarding) {
          setOnboarding(data.onboarding);
        }
      } catch {
        // Persistence errors must never trap the user in the modal or block navigation.
      }
    },
    []
  );

  const openWelcomeGuide = useCallback(
    (startStep: 1 | 2 | 3 | 4 = 1) => {
      if (!isMerchantCandidate || !isAuthorizedSeller) return;
      setActiveStep(startStep);
      setModalOpen(true);
      void persistAction({ action: "REOPEN", step: startStep, source: "profile_menu" });
    },
    [isAuthorizedSeller, isMerchantCandidate, persistAction]
  );

  const closeWelcomeGuide = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSelectStep = useCallback(
    (nextStep: 1 | 2 | 3 | 4) => {
      setActiveStep(nextStep);
      void persistAction({ action: "VIEW_STEP", step: nextStep });
    },
    [persistAction]
  );

  const handleSkip = useCallback(() => {
    setModalOpen(false);
    setSaving(true);
    void persistAction({ action: "SKIP", step: activeStep }).finally(() => {
      setSaving(false);
    });
  }, [activeStep, persistAction]);

  const handleFinish = useCallback(() => {
    setModalOpen(false);
    setSaving(true);
    void persistAction({ action: "COMPLETE", step: 4 }).finally(() => {
      setSaving(false);
    });
  }, [persistAction]);

  return (
    <SellerOnboardingContext.Provider
      value={{
        onboarding,
        isAuthorizedSeller,
        loading,
        modalOpen,
        activeStep,
        openWelcomeGuide,
        closeWelcomeGuide,
      }}
    >
      {children}
      {isMerchantCandidate && isAuthorizedSeller && (
        <SellerWelcomeGuideModal
          open={modalOpen}
          step={activeStep}
          saving={saving}
          onSelectStep={handleSelectStep}
          onSkip={handleSkip}
          onFinish={handleFinish}
        />
      )}
    </SellerOnboardingContext.Provider>
  );
}

export function useSellerOnboarding() {
  return useContext(SellerOnboardingContext);
}
