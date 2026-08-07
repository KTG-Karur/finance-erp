import React from 'react';

// A vector rubber-stamp seal — rendered on sanctioned/approved documents in place of
// the blank "Branch Seal & Stamp" box. Ink-red like a real authorization stamp, with a
// slight rotation so it reads as physically stamped rather than pre-printed form text.
export default function DigitalStampSeal({
  topText = 'KARUR THANGAMAYIL FINANCE',
  bottomText = 'AUTHORIZED SIGNATORY',
  centerText = 'SANCTIONED',
  date,
  size = 108,
  color = '#B91C1C',
  rotation = -10
}) {
  const cx = 60;
  const cy = 60;
  const outerR = 56;
  const innerR = 44;
  const topPathId = 'stampTopArc';
  const bottomPathId = 'stampBottomArc';

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{ transform: `rotate(${rotation}deg)`, display: 'block' }}
    >
      <defs>
        <path id={topPathId} d={`M ${cx - outerR + 6},${cy} a ${outerR - 6},${outerR - 6} 0 1 1 ${(outerR - 6) * 2 - 12},0`} fill="none" />
        <path id={bottomPathId} d={`M ${cx - outerR + 6},${cy} a ${outerR - 6},${outerR - 6} 0 1 0 ${(outerR - 6) * 2 - 12},0`} fill="none" />
      </defs>

      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={color} strokeWidth="2.5" opacity="0.9" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke={color} strokeWidth="1.2" opacity="0.75" />

      <text fontSize="8.2" fontWeight="700" letterSpacing="1" fill={color} opacity="0.9">
        <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
          {topText}
        </textPath>
      </text>

      <text fontSize="7" fontWeight="600" letterSpacing="1.5" fill={color} opacity="0.85">
        <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
          {bottomText}
        </textPath>
      </text>

      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontWeight="800" fill={color} letterSpacing="0.5">
        {centerText}
      </text>
      {date && (
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="7" fontWeight="600" fill={color} opacity="0.85">
          {date}
        </text>
      )}

      <circle cx={cx} cy={cy} r="2" fill={color} opacity="0.7" />
    </svg>
  );
}
