import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * SharedDropdown — Canonical Finance ERP Dropdown & Select Component
 *
 * Provides single source of truth for dropdowns across all forms, filters, and modals.
 * Implements the exact canonical Loan page dropdown aesthetic with full accessibility,
 * theme matching, searchable options, and robust validation integration.
 */
export default function SharedDropdown({
  label,
  value,
  onChange,
  options = [],
  placeholder = '— Select —',
  disabled = false,
  required = false,
  error = null,
  helperText = null,
  name,
  id,
  className = '',
  style = {},
  buttonStyle = {},
  menuStyle = {},
  size = 'md', // 'sm' (32px) | 'md' (36px) | 'lg' (42px)
  align = 'left', // 'left' | 'right'
  searchable = false,
  clearable = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuCoords, setMenuCoords] = useState(null);
  const dropdownRef = useRef(null);
  const triggerBtnRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  // The popover used to be `position: absolute` inside this component's own
  // wrapper — fine standalone, but every modal in this app wraps its fields in
  // an `overflow-y: auto` scroll container, which clips or mis-stacks an
  // absolutely positioned descendant instead of letting it float freely above
  const updateMenuCoords = () => {
    const rect = triggerBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 220;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const width = rect.width;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setMenuCoords({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? viewportHeight - rect.top + 4 : undefined,
      openUpward,
      left: Math.max(8, left),
      right: window.innerWidth - rect.right,
      width: Math.min(width, window.innerWidth - 16),
      maxWidth: Math.max(width, Math.min(480, window.innerWidth - 16))
    });
  };

  useLayoutEffect(() => {
    if (isOpen) updateMenuCoords();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onReposition = () => updateMenuCoords();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [isOpen]);

  // Height map based on size prop
  const heightMap = {
    sm: 32,
    md: 36,
    lg: 42
  };
  const triggerHeight = buttonStyle.height || heightMap[size] || 36;

  // Flatten and normalize options (supports `{ value, label, group, badge }`, strings, numbers, or grouped arrays)
  const { normalizedOptions, isGrouped } = useMemo(() => {
    let grouped = false;
    const flat = [];

    (options || []).forEach(item => {
      if (!item) return;
      if (typeof item === 'object' && Array.isArray(item.options)) {
        grouped = true;
        const groupLabel = item.group || item.label || '';
        item.options.forEach(subItem => {
          if (typeof subItem === 'object' && subItem !== null) {
            flat.push({
              value: subItem.value,
              label: subItem.label ?? String(subItem.value),
              group: groupLabel,
              badge: subItem.badge || null,
              disabled: Boolean(subItem.disabled)
            });
          } else {
            flat.push({
              value: subItem,
              label: String(subItem),
              group: groupLabel,
              badge: null,
              disabled: false
            });
          }
        });
      } else if (typeof item === 'object' && item !== null && 'value' in item) {
        flat.push({
          value: item.value,
          label: item.label ?? String(item.value),
          group: item.group || null,
          badge: item.badge || null,
          disabled: Boolean(item.disabled)
        });
      } else {
        flat.push({
          value: item,
          label: String(item),
          group: null,
          badge: null,
          disabled: false
        });
      }
    });

    return { normalizedOptions: flat, isGrouped: grouped };
  }, [options]);

  // Filter options if searchable or search query is active
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(opt =>
      String(opt.label).toLowerCase().includes(q) ||
      String(opt.value).toLowerCase().includes(q) ||
      (opt.group && String(opt.group).toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Determine if search bar should automatically appear (explicit searchable prop OR > 8 options)
  const showSearch = searchable || normalizedOptions.length >= 8;

  // Focus search input when opening dropdown
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, showSearch]);

  // Click outside & Escape key listeners
  useEffect(() => {
    function handleClickOutside(e) {
      const insideTrigger = dropdownRef.current && dropdownRef.current.contains(e.target);
      const insideMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Extract primitive value from value prop if passed as event object
  const rawValue = typeof value === 'object' && value !== null
    ? (value.target?.value ?? value.value ?? '')
    : (value ?? '');

  // Find currently selected option
  const selectedOption = normalizedOptions.find(opt => 
    String(opt.value).toLowerCase() === String(rawValue).toLowerCase() ||
    String(opt.label).toLowerCase() === String(rawValue).toLowerCase()
  );
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Selection handler providing universal compatibility for both e.target.value and direct value listeners
  const handleSelect = (val, opt) => {
    if (disabled || opt?.disabled) return;
    const primitiveVal = (typeof val === 'object' && val !== null) ? (val.target?.value ?? val.value ?? '') : val;
    const synthesizedEvent = {
      target: {
        name,
        id,
        value: primitiveVal
      },
      currentTarget: {
        name,
        id,
        value: primitiveVal
      },
      value: primitiveVal,
      toString: () => String(primitiveVal),
      valueOf: () => primitiveVal
    };

    // If caller expects `onChange(value)` or `onChange(e)`
    if (typeof onChange === 'function') {
      onChange(synthesizedEvent, primitiveVal, opt);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    handleSelect('', null);
  };

  const hasError = Boolean(error);
  const borderColor = hasError
    ? '#EF4444'
    : isOpen
      ? 'var(--brand-primary, #15803D)'
      : '#CBD5E1';

  return (
    <div
      ref={dropdownRef}
      className={`shared-dropdown-root ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: style.width || '100%',
        minWidth: style.minWidth || 120,
        fontFamily: 'inherit',
        ...style
      }}
    >
      {/* Optional Label */}
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: hasError ? '#DC2626' : '#475569',
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}

      {/* Hidden input for native HTML form validity */}
      {required && (
        <input
          tabIndex={-1}
          required={required}
          value={value ?? ''}
          onChange={() => {}}
          style={{
            opacity: 0,
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: 1,
            height: 1,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Dropdown Trigger Button */}
      <button
        ref={triggerBtnRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          height: triggerHeight,
          padding: '0 10px 0 12px',
          background: disabled ? '#F8FAFC' : '#FFFFFF',
          border: `1px solid ${borderColor}`,
          borderRadius: 7,
          fontSize: '0.8rem',
          fontWeight: selectedOption ? 500 : 400,
          color: disabled ? '#94A3B8' : (selectedOption ? '#0F172A' : '#64748B'),
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen
            ? `0 0 0 3px ${hasError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(var(--brand-primary-rgb, 21, 128, 61), 0.16)'}`
            : '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          ...buttonStyle
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
            flex: 1
          }}
        >
          {displayLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
                borderRadius: '50%',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <X style={{ width: 13, height: 13 }} />
            </span>
          )}

          <ChevronDown
            style={{
              width: 14,
              height: 14,
              color: isOpen ? 'var(--brand-primary, #15803D)' : '#64748B',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease, color 0.15s ease'
            }}
          />
        </div>
      </button>

      {/* Floating Dropdown Popover — portaled to document.body so it can never be
          clipped or mis-stacked by a modal's `overflow-y: auto` field container */}
      {isOpen && menuCoords && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed',
            ...(menuCoords.openUpward ? { bottom: menuCoords.bottom } : { top: menuCoords.top }),
            ...(align === 'right' ? { right: menuCoords.right } : { left: menuCoords.left }),
            zIndex: 2147483000,
            width: menuCoords.width,
            minWidth: menuCoords.width,
            maxWidth: menuCoords.maxWidth || 480,
            maxHeight: 240,
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
            padding: 4,
            animation: 'fadeIn 0.12s ease-out',
            boxSizing: 'border-box',
            scrollbarWidth: 'thin',
            ...menuStyle
          }}
        >
          {/* Optional Search Box */}
          {showSearch && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: '#FFFFFF',
                padding: '4px 4px 6px',
                borderBottom: '1px solid #F1F5F9',
                marginBottom: 4,
                zIndex: 1
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Search
                  style={{
                    position: 'absolute',
                    left: 8,
                    width: 13,
                    height: 13,
                    color: '#94A3B8',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 28,
                    padding: '0 8px 0 26px',
                    fontSize: '0.75rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: 5,
                    outline: 'none',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary, #15803D)')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>
              No matching options
            </div>
          ) : (
            (() => {
              let lastGroup = null;
              return filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const showGroupHeader = isGrouped && opt.group && opt.group !== lastGroup;
                if (showGroupHeader) lastGroup = opt.group;

                return (
                  <React.Fragment key={`${opt.value}-${idx}`}>
                    {showGroupHeader && (
                      <div
                        style={{
                          padding: '6px 8px 3px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#94A3B8'
                        }}
                      >
                        {opt.group}
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value, opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: isSelected ? 'var(--brand-primary, #15803D)' : 'transparent',
                        color: opt.disabled ? '#CBD5E1' : isSelected ? '#FFFFFF' : '#334155',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 600 : 500,
                        textAlign: 'left',
                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.12s ease',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !opt.disabled) {
                          e.currentTarget.style.background = 'var(--brand-primary-light, #F0FEF5)';
                          e.currentTarget.style.color = 'var(--brand-primary-hover, #0E5327)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !opt.disabled) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#334155';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#64748B',
                              fontWeight: 600
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check style={{ width: 13, height: 13, flexShrink: 0 }} />}
                    </button>
                  </React.Fragment>
                );
              });
            })()
          )}
        </div>,
        document.body
      )}

      {/* Error or Helper text */}
      {hasError ? (
        <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 500 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
