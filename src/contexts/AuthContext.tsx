import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextValue = {
  isAuthenticated: boolean
  user: string | null
  accessLevel: string | null
  login: (token: string, username: string, accessLevel?: string | null) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_TOKEN_KEY = 'auth_token'
const STORAGE_USER_KEY = 'auth_user'
const STORAGE_ACCESS_LEVEL_KEY = 'auth_access_level'

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
  const [accessLevel, setAccessLevel] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_ACCESS_LEVEL_KEY)
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

  useEffect(() => {
    try {
      if (accessLevel) localStorage.setItem(STORAGE_ACCESS_LEVEL_KEY, accessLevel)
      else localStorage.removeItem(STORAGE_ACCESS_LEVEL_KEY)
    } catch {
      // ignorar erros de armazenamento
    }
  }, [accessLevel])

  const login = useCallback(async (newToken: string, username: string, newAccessLevel?: string | null) => {
    setToken(newToken)
    setUser(username)
    setAccessLevel(newAccessLevel ?? null)
  }, [])

  const logout = useCallback(async () => {
    setToken(null)
    setUser(null)
    setAccessLevel(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: Boolean(token), user, accessLevel, login, logout }),
    [token, user, accessLevel, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}

export default AuthContext
