export function parseRate(rate) {
  if (!rate || rate === 'Free' || rate === '') return 0;
  const match = rate.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[0]) : 0;
}

export function parseChapter99Rate(rateText) {
  if (!rateText) return 0;
  if (rateText === '70%') {
    return 70;
  }
  if (rateText.includes('applicable subheading + 25%') ||
      rateText.includes('The duty provided in the applicable subheading + 25%')) {
    return 25;
  }
  const match = rateText.match(/(\d+\.?\d*)%/);
  return match ? parseFloat(match[1]) : 0;
}