"use client"

import { useState, useEffect } from "react"
import { api } from "@/services/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ModalDetalhesProps<T> {
  id: number | null
  endpoint: string
  campos: (keyof T | string)[]
  open: boolean
  onOpenChange: (open: boolean) => void
  renderField?: (field: keyof T, value: T[keyof T]) => React.ReactNode
  fieldLabels?: Partial<Record<keyof T, string>>
}


export default function ModalDetalhes<T extends Record<string, any>>({
  id,
  endpoint,
  campos,
  open,
  onOpenChange,
  renderField,
  fieldLabels,
}: ModalDetalhesProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`${endpoint}/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` }
        })
        setData(res.data)
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados")
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, endpoint])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Detalhes</DialogTitle>
          <DialogDescription>Informações do item selecionado.</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-gray-500 py-4">Carregando...</p>}
        {error && <p className="text-red-600 py-4">{error}</p>}

        {data && !loading && !error && (
          <div className="space-y-2 text-sm">
            {campos.map((campo) => {
              const value = data[campo]
              const label = fieldLabels?.[campo] ?? String(campo)

              return (
                <div key={String(campo)}>
                  {renderField
                    ? renderField(campo, value)
                    : (
                      <>
                        <strong>{label}:</strong>{" "}
                        {Array.isArray(value)
                          ? (value as any[]).map((v, i) => (
                            <div key={i} className="ml-4">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </div>
                          ))
                          : String(value ?? "Não informado")}
                      </>
                    )
                  }
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
