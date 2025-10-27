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
import { Button } from "@/components/ui/button"

interface ModalDetalhesProps<T> {
  id: number | null
  endpoint: string
  campos: (keyof T | string)[]
  open: boolean
  onOpenChange: (open: boolean) => void
  renderField?: (field: keyof T, value: T[keyof T]) => React.ReactNode
  fieldLabels?: Partial<Record<keyof T, string>>
  editableFields?: (keyof T)[]
  selectFields?: (keyof T)[]             // quais campos serão select
  selectOptions?: Partial<Record<keyof T, any[]>>
   nomeDoCampo?: string
 
}

export default function ModalDetalhes<T extends Record<string, any>>({
  id,
  endpoint,
  campos,
  open,
  onOpenChange,
  renderField,
  fieldLabels,
  editableFields = [],
  selectFields = [],
  selectOptions = {},
  nomeDoCampo,
  
}: ModalDetalhesProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [formData, setFormData] = useState<Partial<T>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)


  // Controle de novos valores para campos do tipo array
  const [novosValores, setNovosValores] = useState<Record<string, string>>({})

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

  const handleChange = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAplicar = async () => {
    if (!id || !data) return
    try {
      // Copia tudo que veio do GET

      const payload: Partial<T> = { ...data } // pega todos os valores do GET

      editableFields.forEach(f => {
        if (formData[f] !== undefined) payload[f] = formData[f] // sobrescreve apenas os editáveis
      })

      setLoading(true)
      const res = await api.put(`${endpoint}/${id}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      })
      console.log(res.data)
      setData(prev => prev ? { ...prev, ...payload } : prev)
      setModoEdicao(false)
      setFormData({})
      setNovosValores({})
      setMensagem({ tipo: 'sucesso', texto: 'Atualizado com sucesso!' })
    } catch (err) {
      console.error(err)
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar os dados.' })
    } finally {
      setLoading(false)
    }
  }

  const renderCampo = (campo: keyof T, valor: T[keyof T]) => {
    const isEditable = editableFields.includes(campo) && modoEdicao


    // Campos editáveis
    if (isEditable) {
      // Campos tipo array (listas)
      if (Array.isArray(valor)) {
        const arrayValue: any[] = formData[campo] ?? valor
        const novoValor = novosValores[campo as string] ?? ""

        const handleRemove = (index: number) => {
          const newArray = [...arrayValue]
          newArray.splice(index, 1)
          handleChange(campo, newArray)
        }

        const handleInsert = () => {
          if (!novoValor) return
          const newArray = [
            ...arrayValue,
            typeof valor[0] === "object" ? { ...valor[0], nome: novoValor } : novoValor
          ]
          handleChange(campo, newArray)
          setNovosValores(prev => ({ ...prev, [campo as string]: "" }))
        }

        return (
          <div className="flex flex-col w-full mb-2">
            <strong>{fieldLabels?.[campo] ?? String(campo)}:</strong>
            <div className="flex flex-wrap gap-2 mt-1">
              {arrayValue.map((item, index) => (
                <div key={index} className="flex items-center bg-gray-200 rounded px-2 py-1">
                  <span>
  {typeof item === "object" 
    ? item[nomeDoCampo as string] ?? JSON.stringify(item)
    : item
  }
</span>
                  <button
                    className="ml-1 text-red-600 hover:text-red-800"
                    onClick={() => handleRemove(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Inserir novo valor */}
            <div className="flex gap-2 mt-2">
              {selectFields?.includes(campo) ? (
                <select
                  value={novoValor}
                  onChange={e => setNovosValores(prev => ({ ...prev, [campo as string]: e.target.value }))}
                  className="border px-2 py-1 rounded flex-1"
                >
                  <option value="">Selecione...</option>
                  {selectOptions?.[campo]?.map((opt: string, i: number) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}

                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Novo item"
                  className="border px-2 py-1 rounded flex-1"
                  value={novoValor}
                  onChange={e => setNovosValores(prev => ({ ...prev, [campo as string]: e.target.value }))}
                />
              )}
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                onClick={handleInsert}
              >
                Inserir
              </button>
            </div>
          </div>
        )
      }

      // Input de texto normal
      return (
        <div className="flex flex-col w-full">
          <strong>{fieldLabels?.[campo] ?? String(campo)}:</strong>
          {selectFields?.includes(campo) ? (
            <select
              value={formData[campo] ?? valor ?? ""}
              onChange={e => handleChange(campo, e.target.value)}
              className="border px-2 py-1 rounded mt-1 w-full"
            >
              <option value="">Selecione...</option>
              {selectOptions?.[campo]?.map((opt: string, i: number) => (
                <option key={i} value={opt}>{opt}</option>
              ))}

            </select>
          ) : (
            <input
              type="text"
              className="border px-2 py-1 rounded mt-1 w-full"
              value={formData[campo] ?? valor ?? ""}
              onChange={e => handleChange(campo, e.target.value)}
            />
          )}

        </div>
      )
    }

    // Visualização apenas
    return renderField ? (
      renderField(campo, valor)
    ) : (
      <div>
        <strong>{fieldLabels?.[campo] ?? String(campo)}:</strong>{" "}
        {Array.isArray(valor)
          ? valor.map((v: any, i: number) => (
            <div key={i} className="ml-4">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </div>
          ))
          : String(valor ?? "Não informado")}
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // Resetar estado ao fechar
          setModoEdicao(false)
          setFormData({})
          setNovosValores({})
          setMensagem(null)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          {mensagem && (
            <div className={`py-2 px-3 rounded mb-2 text-sm ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {mensagem.texto}
            </div>
          )}

          <DialogTitle>Detalhes</DialogTitle>
          <DialogDescription>Informações do item selecionado.</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-gray-500 py-4">Carregando...</p>}
        {error && <p className="text-red-600 py-4">{error}</p>}

        {data && !loading && !error && (
          <div className="space-y-2 text-sm">

            {/* Campos não editáveis (em cima) */}
            {(() => {
              const naoEditaveis = campos.filter(c => !editableFields.includes(c as keyof T))
              const linhas: React.ReactNode[] = []
              for (let i = 0; i < naoEditaveis.length; i += 2) {
                linhas.push(
                  <div className="flex gap-10 mb-3" key={i}>
                    <div className="flex-1">{renderCampo(naoEditaveis[i] as keyof T, data[naoEditaveis[i]])}</div>
                    {naoEditaveis[i + 1] && (
                      <div className="flex-1">{renderCampo(naoEditaveis[i + 1] as keyof T, data[naoEditaveis[i + 1]])}</div>
                    )}
                  </div>
                )
              }
              return linhas
            })()}

            {/* Campos editáveis (embaixo) */}
            {(() => {
              const editaveis = campos.filter(c => editableFields.includes(c as keyof T))
              const linhas: React.ReactNode[] = []
              for (let i = 0; i < editaveis.length; i += 2) {
                const c1 = editaveis[i]
                const c2 = editaveis[i + 1]

                const isC1Array = Array.isArray(data[c1])
                const isC2Array = c2 ? Array.isArray(data[c2]) : false

                if (isC1Array) {
                  linhas.push(<div key={c1 as string} className="mb-2">{renderCampo(c1 as keyof T, data[c1])}</div>)
                  i--
                  continue
                }

                if (c2 && isC2Array) {
                  linhas.push(<div key={c2 as string} className="mb-2">{renderCampo(c2 as keyof T, data[c2])}</div>)
                  linhas.push(<div key={c1 as string} className="flex-1 mb-2">{renderCampo(c1 as keyof T, data[c1])}</div>)
                  i++
                  continue
                }

                linhas.push(
                  <div className="flex gap-10 mb-3" key={i}>
                    <div className="flex-1">{renderCampo(c1 as keyof T, data[c1])}</div>
                    {c2 && <div className="flex-1">{renderCampo(c2 as keyof T, data[c2])}</div>}
                  </div>
                )
              }
              return linhas
            })()}

            {/* Botões */}
            <div className="flex justify-end gap-2 mt-4">
              {!modoEdicao ? (
                <Button onClick={() => { setModoEdicao(true); setFormData({ ...data }) }}>Editar</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setModoEdicao(false); setFormData({}); setNovosValores({}) }}>Cancelar</Button>
                  <Button onClick={handleAplicar}>Aplicar</Button>
                </>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
