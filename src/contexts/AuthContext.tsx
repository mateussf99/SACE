import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextValue = {
  isAuthenticated: boolean
  user: string | null
  login: (token: string, username: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_TOKEN_KEY = 'auth_token'
const STORAGE_USER_KEY = 'auth_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY)
    } catch {
      return null
    }
  })
  const [user, setUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_USER_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token)
      else localStorage.removeItem(STORAGE_TOKEN_KEY)
    } catch {
      // ignorar erros de armazenamento
    }
  }, [token])
  
  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_USER_KEY, user)
      else localStorage.removeItem(STORAGE_USER_KEY)
    } catch {
      // ignorar erros de armazenamento
    }
  }, [user])

  const login = useCallback(async (newToken: string, username: string) => {
    setToken(newToken)
    setUser(username)
  }, [])

  const logout = useCallback(async () => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: Boolean(token), user, login, logout }),
    [token, user, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}

export default AuthContext
