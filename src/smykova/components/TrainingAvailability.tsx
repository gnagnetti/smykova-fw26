import { Fragment } from 'react';
import type { MergedProduct, OrderItem } from '../types';
import type { ModelTrainingData, TrainingLanguage } from '../data/trainingData';
import { mentionedVariants, sizeAvailabilityText, variantAvailability } from '../data/variantAvailability';

export function VariantSizes({ model, code, color, products, orders, lang }: { model: string; code: string; color: string; products: MergedProduct[]; orders: OrderItem[]; lang: TrainingLanguage }) {
  const info = variantAvailability(model, code, color, products, orders);
  return <span className="mt-2 block text-xs leading-relaxed text-foreground" data-variant-stock={`${model}:${code}`}>{sizeAvailabilityText(info, lang)}</span>;
}

export function TrainingText({ text, data, products, orders, lang }: { text: string; data: ModelTrainingData; products: MergedProduct[]; orders: OrderItem[]; lang: TrainingLanguage }) {
  const variants = [...mentionedVariants(text, data.modelName, data.colors), ...(data.referencedColors || []).filter((r) => text.toLowerCase().includes(r.model.toLowerCase())).flatMap((r) => mentionedVariants(text, r.model, r.colors))];
  return <Fragment>{text}{variants.map((v) => <span key={`${v.model}:${v.code}`} className="block mt-2 text-xs text-muted-foreground">{v.model} · {v.color} ({v.code})<VariantSizes {...v} products={products} orders={orders} lang={lang} /></span>)}</Fragment>;
}