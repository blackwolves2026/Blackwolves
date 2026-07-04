"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

interface WalletContextValue {
  wallet: number
  setWallet: (value: number) => void
  updateWallet: (updater: (value: number) => number) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ initialBalance, children }: { initialBalance: number; children: React.ReactNode }) {
  const [wallet, setWallet] = useState(initialBalance)

  const updateWallet = useCallback((updater: (value: number) => number) => {
    setWallet((current) => updater(current))
  }, [])

  const value = useMemo(
    () => ({ wallet, setWallet, updateWallet }),
    [wallet, updateWallet],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
