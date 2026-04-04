import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface ComboBoxProps {
  options: Option[]
  value: string | string[]
  onChange: (value: any) => void
  placeholder?: string
  multiple?: boolean
  label?: string
}

export default function ComboBox({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Selecione...', 
  multiple = false,
  label
}: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (val: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(val)) {
        onChange(currentValues.filter(v => v !== val))
      } else {
        onChange([...currentValues, val])
      }
    } else {
      onChange(val)
      setIsOpen(false)
    }
    setSearch('')
  }

  const removeValue = (val: string) => {
    if (multiple && Array.isArray(value)) {
      onChange(value.filter(v => v !== val))
    }
  }

  const selectedLabels = multiple 
    ? options.filter(opt => Array.isArray(value) && value.includes(opt.value))
    : options.find(opt => opt.value === value)

  return (
    <div className="combobox-container" ref={containerRef}>
      {label && <label className="input-label">{label}</label>}
      <div 
        className={`combobox-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="combobox-values">
          {multiple && Array.isArray(value) && value.length > 0 ? (
            <div className="combobox-tags">
              {(selectedLabels as Option[]).map(opt => (
                <span key={opt.value} className="combobox-tag">
                  {opt.label}
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeValue(opt.value); }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className={(!value || (Array.isArray(value) && value.length === 0)) ? 'placeholder' : ''}>
              {(selectedLabels && !Array.isArray(selectedLabels)) 
                ? selectedLabels.label 
                : placeholder
              }
            </span>
          )}
        </div>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="combobox-dropdown animate-scale-in">
          <div className="combobox-search">
            <Search size={14} />
            <input 
              autoFocus
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="combobox-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = multiple 
                  ? (Array.isArray(value) && value.includes(opt.value))
                  : value === opt.value

                return (
                  <div 
                    key={opt.value} 
                    className={`combobox-option ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleSelect(opt.value); }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} />}
                  </div>
                )
              })
            ) : (
              <div className="combobox-no-options">Nenhum resultado</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
