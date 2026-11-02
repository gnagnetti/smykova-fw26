import type { MergedProduct, OrderItem } from '../types';
import type { ModelAvailabilityInfo } from './trainingData';

const normalize = (value: string) => (value || '').trim().toUpperCase().replace(/[.\s]+/g, ' ');
const colorKey = (value: string) => (value || '').trim().replace(/^0+(?=\d)/, '');

export function variantAvailability(model: string, code: string, color: string, products: MergedProduct[], orders: OrderItem[]): ModelAvailabilityInfo {
  const matchesModel = (name: string) => normalize(name) === normalize(model);
  const matchesColor = (item: { colorCode: string; color: string }) => code
    ? [item.colorCode, item.color].some((s) => (s || '').match(/\d{3,4}/g)?.some((n) => colorKey(n) === colorKey(code)))
    : Boolean(color) && normalize(item.color) === normalize(color);
  const modelProducts = products.filter((p) => matchesModel(p.styleName) || matchesModel(p.styleClean));
  const selected = modelProducts.filter(matchesColor);
  const selectedOrders = modelProducts.length ? [] : orders.filter((o) => matchesModel(o.styleName) && matchesColor(o) && o.status !== 'Cancelled');
  const sizeStock: Record<string, number> = {};
  let orderedQty = 0;
  let soldQty = 0;
  for (const p of selected) {
    if (p.isCancelled) continue;
    orderedQty += p.unitsOrdered;
    soldQty += p.unitsSold;
    for (const size of new Set([...Object.keys(p.sizesOrdered || {}), ...Object.keys(p.sizesSold || {})])) {
      sizeStock[size] = (sizeStock[size] || 0) + Math.max(0, (p.sizesOrdered[size] || 0) - (p.sizesSold[size] || 0));
    }
  }
  for (const o of selectedOrders) {
    orderedQty += o.unitsOrdered;
    for (const [size, qty] of Object.entries(o.sizes || {})) sizeStock[size] = (sizeStock[size] || 0) + Math.max(0, qty);
  }
  const stockRemaining = Math.max(0, orderedQty - soldQty);
  return { sizeStock, orderedQty, soldQty, stockRemaining, isOrdered: orderedQty > 0, isAvailable: stockRemaining > 0, isSoldOut: orderedQty > 0 && stockRemaining === 0 };
}

export function sizeAvailabilityText(info: ModelAvailabilityInfo, lang: string) {
  const label = { it: 'Disponibilità per taglia', en: 'Availability by size', ru: 'Наличие по размерам', pl: 'Dostępność wg rozmiaru' }[lang] || 'Disponibilità per taglia';
  const sizes = Object.entries(info.sizeStock || {}).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const empty = { it: 'Non ordinato · 0 pz', en: 'Not ordered · 0 pcs', ru: 'Не заказывалось · 0 шт.', pl: 'Nie zamówiono · 0 szt.' }[lang];
  const unknown = { it: 'Dettaglio taglie non disponibile', en: 'Size breakdown unavailable', ru: 'Нет данных по размерам', pl: 'Brak danych o rozmiarach' }[lang];
  return `${label}: ${sizes.length ? sizes.map(([s, q]) => `${s}: ${q}`).join(' · ') : info.isOrdered ? unknown : empty}`;
}