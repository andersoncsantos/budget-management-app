import {
  fromMajorUnits,
  formatMoney,
  parseMoneyInput,
  toMajorUnits,
} from '../shared/lib/money';

export const parseBRL = (value: string): number => {
  return toMajorUnits(parseMoneyInput(value, 'BRL'));
};

export const formatBRL = (value: number): string => {
  return formatMoney(fromMajorUnits(value, 'BRL'), { locale: 'pt-BR' });
};
