import { useEffect, useState } from "react"

const KEY = "novillo-dark-mode"

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(KEY)
    if (stored !== null) return stored === "true"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem(KEY, String(dark))
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}
