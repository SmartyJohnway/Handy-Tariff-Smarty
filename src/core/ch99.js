export function findChapter99References(footnotes, column) {
  const refs = [];
  let has232Note = false;

  footnotes?.forEach(f => {
    if (f.columns?.includes(column)) {
      if (
        f.value.includes('note 16') ||
        f.value.includes('subchapter III, chapter 99')
      ) {
        has232Note = true;
      }
      const matches = f.value.match(/99\d{2}\.\d{2}\.\d{2}/g) || [];
      refs.push(...matches);
    }
  });

  return { refs, has232Note };
}