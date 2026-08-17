import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function padZero(num) {
  return String(num).padStart(2, '0');
}

function parseISODate(dateInput) {
  if (!dateInput) return null;
  const raw = typeof dateInput === 'object' && dateInput !== null
    ? (dateInput.target?.value ?? dateInput.value ?? '')
    : (typeof dateInput === 'string' ? dateInput : String(dateInput));
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month, day);
}

function formatISODate(date) {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const d = parseISODate(dateStr);
  if (!d) return '';
  const day = padZero(d.getDate());
  const month = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function getTodayISO() {
  const today = new Date();
  return formatISODate(today);
}

/**
 * SharedDatePicker — Canonical Finance ERP Custom Calendar & DatePicker
 *
 * Provides a single source of truth for date selections across the application.
 * Matches the canonical high-density light enterprise theme with emerald #15803D accents,
 * intuitive month/year navigation, quick presets, and complete keyboard/mouse usability.
 */
export default function SharedDatePicker({
  value = '',
  onChange,
  min = null,
  max = null,
  placeholder = 'Select date',
  disabled = false,
  required = false,
  name,
  id,
  className = '',
  style = {},
  buttonStyle = {},
  size = 'md', // 'sm' (32px) | 'md' (36px) | 'lg' (42px)
  align = 'left',
  clearable = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Height map based on size prop
  const heightMap = {
    sm: 32,
    md: 36,
    lg: 42
  };
  const triggerHeight = buttonStyle.height || heightMap[size] || 36;

  // Resolved current view year and month
  const parsedValue = useMemo(() => parseISODate(value), [value]);
  const initialDate = parsedValue || new Date();

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Sync view when value changes or when opened
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
    } else {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  }, [value, isOpen]);

  // Handle outside clicks to close the popover
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowYearPicker(false);
        setShowMonthPicker(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation (Escape to close)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setShowYearPicker(false);
        setShowMonthPicker(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Trigger change event with standard synthetic event shape
  const triggerChange = (newISOString) => {
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || '',
          value: newISOString,
          type: 'date'
        },
        currentTarget: {
          name: name || '',
          value: newISOString,
          type: 'date'
        },
        value: newISOString,
        toString: () => newISOString,
        valueOf: () => newISOString,
        stopPropagation: () => {},
        preventDefault: () => {}
      };
      // Call with synthetic event as 1st arg and string value as 2nd arg for universal compatibility
      onChange(syntheticEvent, newISOString);
    }
  };

  const handleSelectDate = (dateISO) => {
    triggerChange(dateISO);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    triggerChange('');
  };

  const handleSetToday = () => {
    const todayStr = getTodayISO();
    if (isDateDisabled(todayStr)) return;
    triggerChange(todayStr);
    setIsOpen(false);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Check if a date ISO string is disabled according to min/max
  const isDateDisabled = (isoStr) => {
    if (!isoStr) return false;
    if (min && isoStr < min) return true;
    if (max && isoStr > max) return true;
    return false;
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = `${prevY}-${padZero(prevM + 1)}-${padZero(d)}`;
      days.push({
        day: d,
        iso,
        isCurrentMonth: false,
        disabled: isDateDisabled(iso)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(d)}`;
      days.push({
        day: d,
        iso,
        isCurrentMonth: true,
        disabled: isDateDisabled(iso)
      });
    }

    // Next month filler days (to complete 42 grid cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = `${nextY}-${padZero(nextM + 1)}-${padZero(d)}`;
      days.push({
        day: d,
        iso,
        isCurrentMonth: false,
        disabled: isDateDisabled(iso)
      });
    }

    return days;
  }, [viewYear, viewMonth, min, max]);

  // Year list range (e.g. from minYear to maxYear or around viewYear)
  const yearsList = useMemo(() => {
    const currentY = new Date().getFullYear();
    const startY = currentY - 70;
    const endY = currentY + 15;
    const list = [];
    for (let y = endY; y >= startY; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const todayISO = getTodayISO();
  const displayLabel = value ? (formatDisplayDate(value) || value) : '';

  return (
    <div
      ref={containerRef}
      className={`shared-datepicker-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: style.width || '100%',
        minWidth: style.minWidth || 130,
        ...style
      }}
    >
      {/* Hidden input for standard HTML form accessibility */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={value || ''}
        required={required}
      />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setShowYearPicker(false);
            setShowMonthPicker(false);
          }
        }}
        style={{
          width: '100%',
          height: triggerHeight,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          background: disabled ? '#F8FAFC' : '#FFFFFF',
          border: isOpen
            ? '1px solid var(--brand-primary, #15803D)'
            : '1px solid #CBD5E1',
          borderRadius: 8,
          boxShadow: isOpen ? '0 0 0 3px rgba(21, 128, 61, 0.12)' : 'none',
          color: disabled ? '#94A3B8' : (value ? '#0F172A' : '#94A3B8'),
          fontSize: '0.8rem',
          fontWeight: value ? 500 : 400,
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          textAlign: 'left',
          ...buttonStyle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <CalendarIcon
            style={{
              width: 14,
              height: 14,
              color: isOpen || value ? 'var(--brand-primary, #15803D)' : '#94A3B8',
              flexShrink: 0,
              transition: 'color 0.15s ease'
            }}
          />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFeatureSettings: '"tnum"'
            }}
          >
            {displayLabel || placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear date"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#F1F5F9',
                color: '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
            >
              <X style={{ width: 10, height: 10 }} />
            </span>
          )}
        </div>
      </button>

      {/* Popover Calendar Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 9999,
            width: 280,
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #CBD5E1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            padding: '12px',
            animation: 'dropdownFadeIn 0.12s ease-out',
            boxSizing: 'border-box'
          }}
        >
          {/* Calendar Header (Month, Year & Prev/Next navigation) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Month Selector Toggle */}
              <button
                type="button"
                onClick={() => { setShowMonthPicker(prev => !prev); setShowYearPicker(false); }}
                style={{
                  border: 'none',
                  background: showMonthPicker ? 'var(--brand-primary-light, #F0FEF5)' : '#F8FAFC',
                  color: showMonthPicker ? 'var(--brand-primary, #15803D)' : '#0F172A',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {MONTH_NAMES[viewMonth]}
              </button>

              {/* Year Selector Toggle */}
              <button
                type="button"
                onClick={() => { setShowYearPicker(prev => !prev); setShowMonthPicker(false); }}
                style={{
                  border: 'none',
                  background: showYearPicker ? 'var(--brand-primary-light, #F0FEF5)' : '#F8FAFC',
                  color: showYearPicker ? 'var(--brand-primary, #15803D)' : '#0F172A',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {viewYear}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  border: 'none',
                  background: '#F8FAFC',
                  color: '#475569',
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>

              <button
                type="button"
                onClick={nextMonth}
                style={{
                  border: 'none',
                  background: '#F8FAFC',
                  color: '#475569',
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Month Fast-Picker Overlay */}
          {showMonthPicker && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                padding: '8px 0',
                maxHeight: 180,
                overflowY: 'auto'
              }}
            >
              {MONTH_SHORT.map((mName, idx) => (
                <button
                  key={mName}
                  type="button"
                  onClick={() => { setViewMonth(idx); setShowMonthPicker(false); }}
                  style={{
                    border: 'none',
                    padding: '8px 4px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: viewMonth === idx ? 700 : 500,
                    background: viewMonth === idx ? 'var(--brand-primary, #15803D)' : '#F8FAFC',
                    color: viewMonth === idx ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {mName}
                </button>
              ))}
            </div>
          )}

          {/* Year Fast-Picker Overlay */}
          {showYearPicker && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                padding: '8px 0',
                maxHeight: 180,
                overflowY: 'auto'
              }}
            >
              {yearsList.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                  style={{
                    border: 'none',
                    padding: '8px 4px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: viewYear === y ? 700 : 500,
                    background: viewYear === y ? 'var(--brand-primary, #15803D)' : '#F8FAFC',
                    color: viewYear === y ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Standard 7-Column Day Grid */}
          {!showMonthPicker && !showYearPicker && (
            <>
              {/* Day Name Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 2,
                  marginBottom: 4,
                  textAlign: 'center'
                }}
              >
                {DAY_NAMES.map(d => (
                  <div
                    key={d}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#94A3B8',
                      padding: '4px 0'
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 2
                }}
              >
                {calendarDays.map((item, idx) => {
                  const isSelected = value === item.iso;
                  const isToday = item.iso === todayISO;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => !item.disabled && handleSelectDate(item.iso)}
                      style={{
                        height: 30,
                        border: isToday && !isSelected ? '1px solid var(--brand-primary, #15803D)' : 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 700 : (isToday ? 600 : (item.isCurrentMonth ? 500 : 400)),
                        background: isSelected
                          ? 'var(--brand-primary, #15803D)'
                          : (isToday ? 'var(--brand-primary-light, #F0FEF5)' : 'transparent'),
                        color: isSelected
                          ? '#FFFFFF'
                          : (item.disabled
                            ? '#CBD5E1'
                            : (item.isCurrentMonth ? (isToday ? 'var(--brand-primary, #15803D)' : '#1E293B') : '#94A3B8')),
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !item.disabled) {
                          e.currentTarget.style.background = '#F1F5F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !item.disabled) {
                          e.currentTarget.style.background = isToday ? 'var(--brand-primary-light, #F0FEF5)' : 'transparent';
                        }
                      }}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Quick Footer Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid #F1F5F9'
            }}
          >
            <button
              type="button"
              onClick={handleSetToday}
              disabled={isDateDisabled(todayISO)}
              style={{
                border: 'none',
                background: 'transparent',
                color: isDateDisabled(todayISO) ? '#CBD5E1' : 'var(--brand-primary, #15803D)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: isDateDisabled(todayISO) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                padding: '2px 4px'
              }}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                border: 'none',
                background: '#F1F5F9',
                color: '#475569',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: 4,
                padding: '3px 8px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
