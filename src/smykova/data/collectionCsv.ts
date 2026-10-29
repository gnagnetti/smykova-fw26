// @ts-nocheck -- imported code, written for a looser TypeScript config
import collectionAsset from '../static/collection.csv.asset.json';
import { parseCsvString } from '../utils/excelParser';
import type { ModelTrainingData } from './trainingData';

export interface CollectionRow {
  id: string;
  name: string;
  description: string;
  colors: { name: string; code: string; image: string | null }[];
  salesTips: string[];
  objections: { objection: string; response: string }[];
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

function parseObjections(raw: string) {
  return (raw || '')
    .split('||')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^\[(.*?)\]\s*->\s*([\s\S]*)$/);
      return m ? { objection: m[1].trim(), response: m[2].trim() } : { objection: s, response: '' };
    });
}

export function loadCollectionCsv(): Promise<CollectionRow[]> {
  if (!cache) {
    cache = fetch(collectionAsset.url)
      .then((r) => r.text())
      .then((text) => {
        const rows = parseCsvString(text.replace(/^\uFEFF/, ''), ';');
        return rows
          .slice(1)
          .filter((r) => r && r[1])
          .map((r) => ({
            id: String(r[0] || '').trim(),
            name: String(r[1] || '').trim(),
            description: String(r[2] || '').trim(),
            colors: parseColors(String(r[3] || '')),
            salesTips: String(r[4] || '')
              .split(' | ')
              .map((s) => s.trim())
              .filter(Boolean),
            objections: parseObjections(String(r[5] || '')),
          }));
      })
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

export function trainingDataFromCsv(row: CollectionRow, fallbackImage?: string): ModelTrainingData {
  const firstImg = row.colors.find((c) => c.image)?.image || fallbackImage || '';
  return {
    modelName: row.name,
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
    stylingLooks: all([]),
    salesTips: all(row.salesTips),
    objections: all(row.objections),
  };
}
