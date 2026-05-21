"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ProContextValue = {
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  proToken: string | null;
  setProToken: (token: string | null) => void;
};

const ProContext = createContext<ProContextValue>({
  isPro: false,
  setIsPro: () => {},
  proToken: null,
  setProToken: () => {},
});

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsProState] = useState(false);
  const [proToken, setProTokenState] = useState<string | null>(null);

  useEffect(() => {
    setIsProState(localStorage.getItem("isPro") === "true");
    setProTokenState(localStorage.getItem("pro-token"));
  }, []);

  function setIsPro(v: boolean) {
    setIsProState(v);
    localStorage.setItem("isPro", String(v));
  }

  function setProToken(token: string | null) {
    setProTokenState(token);
    if (token) localStorage.setItem("pro-token", token);
    else localStorage.removeItem("pro-token");
  }

  return (
    <ProContext.Provider value={{ isPro, setIsPro, proToken, setProToken }}>
      {children}
    </ProContext.Provider>
  );
}

export function useIsPro() {
  return useContext(ProContext).isPro;
}

export function useProToken() {
  return useContext(ProContext).proToken;
}
