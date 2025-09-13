import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextValue = {
  isAuthenticated: boolean
  login: (token?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'auth_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignorar erros de armazenamento
    }
  }, [token])

  const login = useCallback(async (newToken?: string) => {
    // Em um app real, chame sua API e defina o token
    setToken(newToken ?? 'dummy-token')
  }, [])

  const logout = useCallback(async () => {
    setToken(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: Boolean(token), login, logout }),
    [token, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}

export default AuthContext
