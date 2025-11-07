"use client"

import { useEffect, useState } from "react"
import { type Table as ReactTable } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CardFooter } from "@/components/ui/card"

interface TabelaPaginacaoProps<T extends object> {
  table: ReactTable<T>
}

export default function TabelaPaginacao<T extends object>({
  table,
}: TabelaPaginacaoProps<T>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const mq = window.matchMedia("(max-width: 640px)")
    const update = () => setIsMobile(mq.matches)

    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const renderPages = () => {
    const pages: (number | string)[] = []

    if (pageCount <= 3) {
      for (let i = 0; i < pageCount; i++) pages.push(i)
    } else if (isMobile) {
      const start = Math.max(0, pageIndex - 1)
      const end = Math.min(pageCount - 1, pageIndex + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    } else {
      pages.push(0)
      if (pageIndex > 2) pages.push("...")
      for (
        let i = Math.max(1, pageIndex - 1);
        i <= Math.min(pageCount - 2, pageIndex + 1);
        i++
      ) {
        pages.push(i)
      }
      if (pageIndex < pageCount - 3) pages.push("...")
      pages.push(pageCount - 1)
    }

    return pages.map((p, idx) =>
      p === "..."
        ? (
          <span key={`dots-${idx}`} className="px-2 select-none">
            …
          </span>
        ) : (
          <Button
            key={p}
            size="icon"
            variant="outline"
            className={cn(
              "h-5 w-7 sm:h-7 sm:w-10 2xl:h-9 2xl:w-12 text-sm 2xl:text-base border-blue-200 truncate",
              p === pageIndex && "bg-blue-100"
            )}
            onClick={() => table.setPageIndex(Number(p))}
          >
            <span title={`Página ${Number(p) + 1}`}>{Number(p) + 1}</span>
          </Button>
        )
    )
  }

  return (
    <CardFooter className="flex items-center p-0 justify-between text-sm xl:text-base text-muted-foreground min-w-[180px] text-gray-900">
      <div>
        <span className="hidden text-fluid-small md:inline text-gray-900">
          Linhas por página:{" "}
        </span>
        <select
          className="border text border-blue-200 rounded px-1 py-1"
          value={pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
        >
          {[5, 10, 25, 50].map(n => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="ml-2 hidden text-sm 2xl:text-base sm:inline">
          {pageIndex * pageSize + 1}-
          {Math.min((pageIndex + 1) * pageSize, totalRows)} de {totalRows}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-fluid-small text-gray-800 hidden sm:inline">
          Página:
        </span>

        <Button
          size="icon"
          variant="outline"
          className="h-5 w-5 sm:h-7 sm:w-7 2xl:h-9 2xl:w-9 border-none"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {renderPages()}

        <Button
          size="icon"
          variant="outline"
          className="h-5 w-5 sm:h-7 sm:w-7 2xl:h-9 2xl:w-9 border-none"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </CardFooter>
  )
}
