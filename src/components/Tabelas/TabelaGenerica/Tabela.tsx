"use client"

import { type Table as ReactTable, flexRender } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { CardContent } from "@/components/ui/card"
interface TabelaProps<TData extends object> {
    table: ReactTable<TData>
}

export default function Tabela<TData extends object>({ table }: TabelaProps<TData>) {
    return (
        <CardContent className="p-0 min-w-[320px] overflow-x-auto w-full">
            <div className="w-full overflow-x-auto">
                <Table className="text-fluid-large min-w-max">
                    {/* Cabeçalho */}
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} >
                                {headerGroup.headers.map(header => (
                                    <TableHead
                                        key={header.id}
                                        className=" font-semibold text-gray-700 border-b border-blue-100"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : header.column.id === "select"
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    {/* Corpo */}
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? "selected" : undefined}
                                    className={` ${row.getIsSelected() ? "bg-blue-50" : ""} border-b border-blue-100`}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className={cn(

                                            "max-w-[110px] sm:max-w-[150px] lg:max-w-[180px] xl:max-w-[200px] 2xl:max-w-[240px]  text-gray-800 px-1 xl:px-3 py-2"

                                        )}>
                                            <div className="overflow-x-hidden truncate whitespace-nowrap block  py-2"
                                                ref={el => {
                                                    if (el) el.setAttribute("title", el.innerText)
                                                }}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={table.getAllColumns().length}
                                    className="h-24 text-center text-gray-500"
                                >
                                    Nenhum registro encontrado
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    )
}
