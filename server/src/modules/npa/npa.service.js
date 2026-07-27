/**
 * Asset Quality & NPA Regulatory Provisioning Engine (RBI NBFC Norms)
 */

export function calculateAssetClassification(daysOverdue = 0, outstandingBalance = 0) {
  const dpd = parseInt(daysOverdue) || 0;
  const balance = parseFloat(outstandingBalance) || 0;

  if (dpd === 0) {
    return {
      classification: 'STANDARD',
      bucket: '0 DPD',
      provision_rate_pct: 0.40,
      provision_amount: Math.round(balance * 0.004)
    };
  } else if (dpd >= 1 && dpd <= 30) {
    return {
      classification: 'SMA_0',
      bucket: '1-30 DPD (SMA-0)',
      provision_rate_pct: 0.40,
      provision_amount: Math.round(balance * 0.004)
    };
  } else if (dpd >= 31 && dpd <= 60) {
    return {
      classification: 'SMA_1',
      bucket: '31-60 DPD (SMA-1)',
      provision_rate_pct: 0.40,
      provision_amount: Math.round(balance * 0.004)
    };
  } else if (dpd >= 61 && dpd <= 90) {
    return {
      classification: 'SMA_2',
      bucket: '61-90 DPD (SMA-2)',
      provision_rate_pct: 0.40,
      provision_amount: Math.round(balance * 0.004)
    };
  } else if (dpd >= 91 && dpd <= 180) {
    return {
      classification: 'NPA_SUBSTANDARD',
      bucket: '91-180 DPD (NPA Substandard)',
      provision_rate_pct: 15.00,
      provision_amount: Math.round(balance * 0.15)
    };
  } else {
    return {
      classification: 'NPA_DOUBTFUL',
      bucket: '180+ DPD (NPA Doubtful)',
      provision_rate_pct: 25.00,
      provision_amount: Math.round(balance * 0.25)
    };
  }
}
