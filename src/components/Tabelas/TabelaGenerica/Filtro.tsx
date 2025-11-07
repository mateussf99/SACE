"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { Search, ListFilter, ChevronDown, CalendarPlus } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { ptBR } from "date-fns/locale/pt-BR"
import Select from "react-select"
import type { SingleValue } from "react-select"
import { CardHeader } from "@/components/ui/card"

export interface FiltroConfig<T extends object> {
  key: keyof T
  label: string
  type?: "date"
  options?: string[]
}

interface TabelaFiltroProps<T extends object> {
  filtros: FiltroConfig<T>[]
  globalFilter: string
  setGlobalFilter: (value: string) => void
  tempFilters: Record<string, string[]>
  setTempFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  tempDateRange?: [Date | null, Date | null]
  setTempDateRange?: React.Dispatch<React.SetStateAction<[Date | null, Date | null]>>
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  setAppliedDateRange?: React.Dispatch<React.SetStateAction<[Date | null, Date | null]>>
  uniqueValues: (key: keyof T) => string[]
  selectedCount?: number
  allSelected?: boolean
  toggleAllSelected?: () => void
  updateStatus?: (status: string) => void
}

export default function FiltroTabela<T extends object>({
    filtros,
    globalFilter,
    setGlobalFilter,
    tempFilters,
    setTempFilters,
    tempDateRange,
    setTempDateRange,
    setFilters,
    setAppliedDateRange,
    uniqueValues,

}: TabelaFiltroProps<T>) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

const resetFilter = (f: FiltroConfig<T>) =>
    f.type === "date"
        ? setTempDateRange?.([null, null])
        : setTempFilters(prev => ({ ...prev, [f.key as string]: [] }))

const renderFilterControl = (f: FiltroConfig<T>) =>
        f.type === "date" ? (
            <div className="flex gap-2">
                {[0, 1].map(i => (
                    <div key={i} className="flex flex-col w-full relative">
                        <span className="text-gray-600">{i === 0 ? "De" : "Até"}</span>
                        <div className="relative w-full">
                            <DatePicker
                                locale={ptBR}
                                selected={tempDateRange?.[i] ?? undefined}
                                onChange={d =>
                                    setTempDateRange?.(prev =>
                                        i === 0 ? [d, prev[1]] : [prev[0], d]
                                    )
                                }
                                selectsStart={i === 0}
                                selectsEnd={i === 1}
                                startDate={tempDateRange?.[0] ?? undefined}
                                endDate={tempDateRange?.[1] ?? undefined}
                                minDate={i === 1 ? tempDateRange?.[0] ?? undefined : undefined}
                                placeholderText="Dia/Mês/Ano"
                                dateFormat="dd/MM/yyyy"
                                className="w-full border border-gray-300 rounded px-2 py-1 pr-8"
                            />
                            <CalendarPlus className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <Select
                value={
                    tempFilters[f.key as string]?.[0]
                        ? { value: tempFilters[f.key as string]?.[0], label: tempFilters[f.key as string]?.[0] }
                        : null
                }
                onChange={(option: SingleValue<{ value: string; label: string }>) =>
                    setTempFilters(prev => ({
                        ...prev,
                        [f.key]: option ? [option.value] : [],
                    }))
                }
                options={
                    f.options
                        ? f.options.map(v => ({ value: v, label: v }))
                        : uniqueValues(f.key).map(v => ({ value: String(v), label: String(v) }))
                }
                placeholder={`Selecione ${f.label.toLowerCase()}`}
                styles={{
                    placeholder: base => ({ ...base, color: "#4B5563" }),
                    singleValue: base => ({ ...base, color: "#111827" }),
                    control: base => ({ ...base, height: 28, borderRadius: 12 }),
                }}
            />
        )


    return (
        <CardHeader className="flex p-0 items-center justify-between min-w-[170px] w-full">
                <>
                    <div className="flex items-center max-w-xs sm:max-w-sm 2xl:max-w-md flex-1 rounded-lg bg-blue-50  px-2">
                        <Search className="text-gray-400 w-4 h-4 mr-2" />
                        <Input
                            placeholder="Pesquisar"
                            className="flex-1 border-none focus-visible:ring-0 focus-visible:outline-none bg-transparent"
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                    </div>

                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex text-fluid-small border-blue-100 border-2 items-center ml-2 gap-2"
                            >
                                <ListFilter className="w-4 h-4" />
                                <span> Filtrar por</span>
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="text-fluid-small bg-white p-2 min-w-[280px] max-w-[350px]">
                            {filtros.map(f => (
                                <div key={String(f.key)} className="space-y-2 p-2 pb-5 border-b border-blue-100">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">{f.label}</span>
                                        <Button
                                            variant="outline"
                                            className="border-0 text-blue-600 hover:text-blue-900"
                                            onClick={() => resetFilter(f)}
                                        >
                                            Resetar
                                        </Button>
                                    </div>
                                    {renderFilterControl(f)}
                                </div>
                            ))}

                            <div className="flex text-fluid-small justify-between mt-3 p-2">
                                <Button
                                    variant="outline"
                                    className="border border-gray-300 hover:bg-gray-100"
                                    onClick={() => {
                                        const emptyFilters: Record<string, string[]> = {}
                                        filtros.forEach(f => {
                                           if (f.type !== "date") emptyFilters[f.key as string] = []
                                        })
                                        setTempFilters(emptyFilters)
                                        setTempDateRange?.([null, null])
                                    }}
                                >
                                    Resetar todos
                                </Button>
                                <Button
                                    variant="default"
                                    className="text-white bg-blue-900 hover:bg-blue-800"
                                    onClick={() => {
                                        setFilters({ ...tempFilters })
                                        setAppliedDateRange?.(tempDateRange ?? [null, null])
                                        setIsDropdownOpen(false)
                                    }}
                                >
                                    Aplicar
                                </Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
        </CardHeader>
    )
}
