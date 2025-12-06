export function check232Applicability(item, allItems) {
  const is232Related = item.footnotes?.some(f =>
    f.value?.includes('subchapter III, chapter 99') ||
    f.value?.includes('note 16') ||
    f.value?.includes('note 19')
  ) ?? false;

  if (!is232Related && item.statisticalSuffix) {
    const parentHts = item.htsno.split('.').slice(0, -1).join('.');
    const parentItem = allItems.find(i => i.htsno === parentHts);
    if (parentItem) {
      return check232Applicability(parentItem, allItems);
    }
  }
  return is232Related;
}
