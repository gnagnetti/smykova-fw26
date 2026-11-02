import { describe, expect, it } from 'vitest';
import { variantAvailability, mentionedVariants } from './variantAvailability';
import { parseCollectionCsv, trainingDataFromCsv } from './collectionCsv';
import type { MergedProduct, OrderItem } from '../types';

const product = (code: string, ordered: Record<string, number>, sold: Record<string, number> = {}) => ({ styleName: 'Lisella', styleClean: 'LISELLA', colorCode: code, color: code, sizesOrdered: ordered, sizesSold: sold, unitsOrdered: Object.values(ordered).reduce((a, b) => a + b, 0), unitsSold: Object.values(sold).reduce((a, b) => a + b, 0) } as MergedProduct);

describe('Training catalog and variant stock', () => {
  it('shows available quantities per size only for the mentioned color', () => {
    const result = variantAvailability('Lisella', '4618', '', [product('4618', { '40': 3, '42': 2 }, { '40': 1, '42': 2 }), product('4614', { '40': 9 })], []);
    expect(result.sizeStock).toEqual({ '40': 2, '42': 0 });
    expect(result.stockRemaining).toBe(2);
  });
  it('does not restore sold stock from orders when a color has no merged stock', () => {
    const orders = [{ styleName: 'Lisella', colorCode: '4614', color: '', sizes: { '40': 9 }, unitsOrdered: 9 } as OrderItem];
    expect(variantAvailability('Lisella', '4614', '', [product('4618', { '40': 1 })], orders).sizeStock).toEqual({});
  });
  it('uses order sizes only if merged model data is absent, ignoring cancelled orders', () => {
    const orders = [{ styleName: 'Lisella', colorCode: '4618', color: '', sizes: { '40': 3 }, unitsOrdered: 3 }, { styleName: 'Lisella', colorCode: '4618', color: '', sizes: { '40': 9 }, unitsOrdered: 9, status: 'Cancelled' }] as OrderItem[];
    expect(variantAvailability('Lisella', '4618', '', [], orders).sizeStock).toEqual({ '40': 3 });
  });
  it('keeps objections and pairings from CSV including multiline fields', () => {
    const csv = 'ID;Nome Modello;Descrizione;Colori;Consigli di Vendita;Gestione Obiezioni;Abbinamenti\n1;Lisella;"Testo\nsu due righe";Verde (4614): https://example.com/l.jpg;Consiglio;[Domanda] -> Risposta;Linosa 3286\n2;Linosa;Descrizione;Viola (3286): https://example.com/a.jpg;;;';
    const rows = parseCollectionCsv(csv);
    const data = trainingDataFromCsv(rows[0], '', rows);
    expect(data.description.ru).toBe('Testo\nsu due righe');
    expect(data.objections.ru).toEqual([{ objection: 'Domanda', response: 'Risposta' }]);
    expect(data.stylingLooks.ru[0].items).toEqual([{ name: 'Linosa', code: '3286', image: 'https://example.com/a.jpg' }]);
  });
  it('preserves unstructured objections rather than inventing question/response divisions', () => {
    const rows = parseCollectionCsv('ID;Nome Modello;Descrizione;Colori;Consigli di Vendita;Gestione Obiezioni\n1;Lisella;;;;"Obiezione e risposta intrecciate"');
    expect(rows[0].objections).toEqual([{ objection: '', response: 'Obiezione e risposta intrecciate' }]);
  });
  it('detects color mentions for size availability', () => {
    expect(mentionedVariants('Scegli 4618', 'Lisella', [{ code: '4618', name: { it: 'Melanzana' } }, { code: '4614', name: { it: 'Verde' } }])).toEqual([{ model: 'Lisella', code: '4618', color: 'Melanzana' }]);
  });
});