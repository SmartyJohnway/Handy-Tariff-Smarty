import { parseRate, parseChapter99Rate } from './rate-parse.js';
import { findChapter99References } from './ch99.js';

export function calculateTotalRates(item, allItems) {
  if (!Array.isArray(allItems)) return { generalTotal: 0, otherTotal: 0 };

  const baseGeneralRate = parseRate(item.general);
  const baseOtherRate = parseRate(item.other);

  const { refs: generalRefs, has232Note: hasGeneral232Note } = findChapter99References(item.footnotes, 'general');
  const { refs: otherRefs } = findChapter99References(item.footnotes, 'other');

  let additionalGeneralRate = 0;
  let additionalOtherRate = 0;

  generalRefs.forEach(ref => {
    const chapter99Item = allItems.find(i => i.htsno === ref);
    if (chapter99Item?.general) {
      if (chapter99Item.general.includes('applicable subheading + 25%') ||
          chapter99Item.general.includes('The duty provided in the applicable subheading + 25%')) {
        additionalGeneralRate = Math.max(additionalGeneralRate, 25);
      } else {
        const rate = parseChapter99Rate(chapter99Item.general);
        additionalGeneralRate = Math.max(additionalGeneralRate, rate);
      }
    }
  });

  otherRefs.forEach(ref => {
    const chapter99Item = allItems.find(i => i.htsno === ref);
    if (chapter99Item?.other) {
      const rate = parseChapter99Rate(chapter99Item.other);
      additionalOtherRate += rate;
    }
  });

  let totalGeneralRate = baseGeneralRate + additionalGeneralRate;
  let totalOtherRate = baseOtherRate + additionalOtherRate;

  if (hasGeneral232Note) {
    const general232Item = allItems.find(i => i.htsno === '9903.91.01');
    if (general232Item) {
      totalGeneralRate = 25 + additionalGeneralRate;
    }
    const other232Item = allItems.find(i => i.htsno === '9903.90.09');
    if (other232Item) {
      totalOtherRate = baseOtherRate + 70 + additionalOtherRate;
    }
  }

  return {
    generalTotal: totalGeneralRate,
    otherTotal: totalOtherRate,
    hasAdditionalDuty: hasGeneral232Note || additionalGeneralRate > 0 || additionalOtherRate > 0
  };
}

export function formatRate(rate) {
  return rate === 0 ? 'Free' : rate + '%';
}