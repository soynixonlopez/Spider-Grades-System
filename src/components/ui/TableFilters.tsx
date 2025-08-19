import React, { useState } from 'react';
import { Filter, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterConfig {
  name: string;
  type: 'text' | 'select' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface TableFiltersProps {
  filters: Record<string, string>;
  onFilterChange: (field: string, value: string) => void;
  onClearFilters: () => void;
  filterConfigs: FilterConfig[];
  sortConfig?: SortConfig;
  onSortChange?: (field: string) => void;
  totalItems: number;
  filteredItems: number;
  title?: string;
}

export function TableFilters({
  filters,
  onFilterChange,
  onClearFilters,
  filterConfigs,
  sortConfig,
  onSortChange,
  totalItems,
  filteredItems,
  title = 'Filtros y Búsqueda'
}: TableFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Header compacto */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredItems} de {totalItems} elementos
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                Filtros activos
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
              hasActiveFilters 
                ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/20 dark:text-primary-300' 
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

             {/* Panel de filtros expandible */}
       {isExpanded && (
         <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
           <div className="pt-4">
                           <div className="flex justify-center">
                <div className="flex items-end gap-6">
                  {filterConfigs.map((config) => (
                    <div key={config.name} className="flex-shrink-0">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {config.name}
                      </label>
                      {config.type === 'select' ? (
                                                 <select
                           value={filters[config.name.toLowerCase()] || ''}
                           onChange={(e) => onFilterChange(config.name.toLowerCase(), e.target.value)}
                           className="w-48 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                         >
                          <option value="">Todos</option>
                          {config.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                                                 <input
                           type={config.type}
                           placeholder={config.placeholder || `Buscar...`}
                           value={filters[config.name.toLowerCase()] || ''}
                           onChange={(e) => onFilterChange(config.name.toLowerCase(), e.target.value)}
                           className="w-48 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                         />
                      )}
                    </div>
                  ))}
                </div>
              </div>
           </div>
         </div>
       )}
    </div>
  );
}

export function SortableHeader({
  field,
  label,
  currentSort,
  onSort
}: {
  field: string;
  label: string;
  currentSort?: SortConfig;
  onSort?: (field: string) => void;
}) {
  if (!onSort) {
    return (
      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
        {label}
      </th>
    );
  }

  const isActive = currentSort?.field === field;
  const isAsc = currentSort?.direction === 'asc';

  return (
    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
      <button
        onClick={() => onSort(field)}
        className="flex items-center space-x-1 hover:text-primary-600 transition-colors"
      >
        <span>{label}</span>
        <ArrowUpDown className={`h-4 w-4 ${isActive ? 'text-primary-600' : ''}`} />
      </button>
    </th>
  );
}
