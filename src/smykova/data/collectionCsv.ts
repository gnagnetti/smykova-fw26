// @ts-nocheck -- imported code, written for a looser TypeScript config
import collectionAsset from '../static/collection.csv.asset.json';
import Papa from 'papaparse';
import type { ModelTrainingData } from './trainingData';

export interface CollectionRow {
  id: string;
  name: string;
  description: string;
  colors: { name: string; code: string; image: string | null }[];
  salesTips: string[];
  objections: { objection: string; response: string }[];
  stylingText: string;
}

let cache: Promise<CollectionRow[]> | null = null;

function parseColors(raw: string) {
  return (raw || '')
    .split(' | ')
    .map((part) => {
      const idx = part.indexOf(': ');
      const label = idx >= 0 ? part.slice(0, idx) : part;
      const url = idx >= 0 ? part.slice(idx + 2).trim() : '';
      const m = label.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      return {
        name: (m ? m[1] : label).trim(),
        code: m ? m[2].trim() : '',
        image: /^https?:\/\//.test(url) ? url : null,
      };
    })
    .filter((c) => c.name);
}

export function parseObjections(raw: string) {
  return (raw || '')
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^\[(.*?)\]\s*->\s*([\s\S]*)$/);
      return m ? { objection: m[1].trim(), response: m[2].trim() } : { objection: '', response: s };
    });
}

export function parseCollectionCsv(text: string): CollectionRow[] {
  const { data } = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, delimiter: ';', skipEmptyLines: true });
  return data.filter((r) => r['Nome Modello']?.trim()).map((r) => ({
    id: (r.ID || '').trim(), name: r['Nome Modello'].trim(),
    description: (r.Descrizione || '').trim(), colors: parseColors(r.Colori || ''),
    salesTips: (r['Consigli di Vendita'] || '').split(' | ').map((s) => s.trim()).filter(Boolean),
    objections: parseObjections(r['Gestione Obiezioni'] || ''),
    stylingText: r.Abbinamenti || r.Styling || r['Styling & Vetrine'] || '',
  }));
}

export function loadCollectionCsv(): Promise<CollectionRow[]> {
  if (!cache) {
    cache = fetch(collectionAsset.url)
      .then((r) => {
        if (!r.ok) throw new Error('Catalogo non disponibile');
        return r.text();
      })
      .then(parseCollectionCsv)
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

const norm = (s: string) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');

export function findCollectionRow(rows: CollectionRow[], modelName: string): CollectionRow | null {
  const n = norm(modelName);
  if (!n) return null;
  const exact = rows.find((r) => norm(r.name) === n);
  if (exact) return exact;
  const first = n.split(' ')[0];
  return rows.find((r) => norm(r.name) === first) || rows.find((r) => norm(r.name).split(' ')[0] === first) || null;
}

const all = <T,>(v: T) => ({ it: v, en: v, ru: v, pl: v });

export function trainingDataFromCsv(row: CollectionRow, fallbackImage?: string, rows: CollectionRow[] = []): ModelTrainingData {
  const firstImg = row.colors.find((c) => c.image)?.image || fallbackImage || '';
  const sources = [row.stylingText, row.description, ...row.salesTips, ...row.objections.map((o) => o.response)].filter(Boolean);
  const stylingLooks = sources.flatMap((source) => {
    const items = rows.filter((other) => other.id !== row.id && new RegExp(`\\b${other.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(source)).map((other) => {
      const match = source.match(new RegExp(`${other.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(?([0-9]{3,4})?`, 'i'));
      const code = match?.[1];
      const color = other.colors.find((c) => c.code === code);
      return { name: other.name, code, image: color?.image || other.colors.find((c) => c.image)?.image || '' };
    });
    return items.length || source === row.stylingText ? [{ title: items.map((i) => i.name).join(' · '), itemsListText: source, items }] : [];
  });
  return {
    modelName: row.name,
    referencedColors: rows.filter((r) => r.id !== row.id && stylingLooks.some((look) => look.items.some((i) => i.name === r.name))).map((r) => ({ model: r.name, colors: r.colors.map((c) => ({ code: c.code, name: all(c.name) })) })),
    modelId: `ID #${row.id}`,
    season: {
      it: 'Scheda di Formazione Autunno-Inverno 2026/2027',
      en: 'Training Materials Fall-Winter 2026/2027',
      ru: 'Учебные материалы Осень-Зима 2026/2027',
      pl: 'Materiały szkoleniowe Jesień-Zima 2026/2027',
    },
    heroImage: firstImg,
    hasTechnicalData: true,
    description: all(row.description),
    colors: row.colors.map((c) => ({
      name: all(c.name),
      code: c.code,
      image: c.image || firstImg,
    })),
    stylingLooks: all(stylingLooks),
    salesTips: all(row.salesTips),
    objections: all(row.objections),
  };
}
