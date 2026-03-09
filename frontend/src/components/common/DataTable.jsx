import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
export default function DataTable({ columns, data, keyExtractor, page = 1, totalPages = 1, onPageChange, onSort, loading, emptyMessage = 'No data found', }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');
    const handleSort = (key) => {
        const order = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortKey(key);
        setSortOrder(order);
        onSort?.(key, order);
    };
    return (_jsxs("div", { className: "overflow-hidden rounded-xl border border-dark-700", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "border-b border-dark-700 bg-dark-800/60 text-xs uppercase text-dark-400", children: _jsx("tr", { children: columns.map((col) => (_jsx("th", { className: clsx('px-4 py-3 font-semibold', col.className), children: col.sortable ? (_jsxs("button", { onClick: () => handleSort(col.key), className: "flex items-center gap-1 hover:text-white", children: [col.header, _jsx(ChevronUpDownIcon, { className: "h-3 w-3" })] })) : (col.header) }, col.key))) }) }), _jsx("tbody", { className: "divide-y divide-dark-700/50", children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "px-4 py-12 text-center text-dark-500", children: _jsx("div", { className: "mx-auto h-6 w-6 animate-spin rounded-full border-2 border-dark-600 border-t-primary-500" }) }) })) : data.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "px-4 py-12 text-center text-dark-500", children: emptyMessage }) })) : (data.map((row) => (_jsx("tr", { className: "transition-colors hover:bg-dark-800/40", children: columns.map((col) => (_jsx("td", { className: clsx('px-4 py-3 text-dark-200', col.className), children: col.render(row) }, col.key))) }, keyExtractor(row))))) })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between border-t border-dark-700 bg-dark-800/40 px-4 py-3", children: [_jsxs("span", { className: "text-xs text-dark-500", children: ["Page ", page, " of ", totalPages] }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { disabled: page <= 1, onClick: () => onPageChange?.(page - 1), className: "rounded-lg p-1.5 text-dark-400 hover:bg-dark-700 hover:text-white disabled:opacity-30", children: _jsx(ChevronLeftIcon, { className: "h-4 w-4" }) }), _jsx("button", { disabled: page >= totalPages, onClick: () => onPageChange?.(page + 1), className: "rounded-lg p-1.5 text-dark-400 hover:bg-dark-700 hover:text-white disabled:opacity-30", children: _jsx(ChevronRightIcon, { className: "h-4 w-4" }) })] })] }))] }));
}
