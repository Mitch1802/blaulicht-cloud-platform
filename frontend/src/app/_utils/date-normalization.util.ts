export const normalizeDateInput = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  const stringValue = String(value).trim();
  if (stringValue === '') {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(stringValue)) {
    const [day, month, year] = stringValue.split('.');
    return `${year}-${month}-${day}`;
  }

  if (stringValue.includes('T')) {
    const isoDate = stringValue.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
  }

  const parsed = new Date(stringValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return '';
};
