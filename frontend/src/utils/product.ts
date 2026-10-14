import type { ApiProduct, ExploreCard } from '../types';

export function toExploreCard(api: ApiProduct): ExploreCard {
  const verified = api.verified === true;
  const isNew = api.condition === 'new';
  const grade = isNew
    ? 'PRODUCTO NUEVO'
    : api.conditionGrade
      ? `GRADO ${api.conditionGrade}`
      : verified
        ? 'CHECKEADO'
        : 'SIN CHECKEAR';
  const subtitle = isNew
    ? 'Nuevo · Sin uso · Sin abrir'
    : api.usageType && api.hoursOfUse
      ? `${api.usageType} · ${api.hoursOfUse} h verificadas`
      : api.usageType
        ? api.usageType
        : api.description;

  return {
    id: api.id,
    category: api.category,
    breadcrumb: api.brand ?? api.title.split(' ').slice(0, 2).join(' ').toUpperCase(),
    tag: isNew ? 'NUEVO' : api.conditionGrade ? `GRADO ${api.conditionGrade}` : verified ? 'CHECKEADO' : 'EN AUDITORÍA',
    tagTone: isNew ? 'blue' : verified ? 'emerald' : 'primary',
    grade,
    gradeTone: isNew ? 'primary' : verified ? 'secondary' : 'primary',
    title: api.title,
    subtitle,
    price: Number(api.price),
    currency: 'USD',
    escrow: 'Garantía Escrow',
    image: api.images?.[0] ?? '',
    gallery: (api.images ?? []).map((uri, i) => ({
      uri,
      label: `Foto ${i + 1}`,
      desc: `Imagen ${i + 1} del producto`,
    })),
    intro: api.description,
    condition: api.condition,
    sealed: api.sealed,
    stock: api.stock,
    broken: api.broken,
    brokenTag: api.brokenTag,
    repairPrice: api.repairPrice,
    verified,
    escrowProtected: api.escrowProtected,
    warranty: api.warranty,
    openComplaints: api.openComplaints,
    priceFlag: api.priceFlag,
    identityVerified: api.sellerStats?.identityVerified,
    hoursOfUse: api.hoursOfUse ?? null,
    reportedHoursOfUse: api.reportedHoursOfUse ?? null,
    usageType: api.usageType,
    stressTest: api.stressTest,
    conditionGrade: api.conditionGrade,
    brand: api.brand,
    model: api.model,
    averageRating: api.averageRating,
    reviewCount: api.reviewCount,
    sellerTier: api.securityTier,
    sellerStats: api.sellerStats,
    sellerName: api.seller?.name,
    sellerId: api.seller?.id,
    telemetry: isNew
      ? {
          kind: 'verified',
          hoursOfUse: 0,
          reportedHoursOfUse: 0,
          usageType: 'Nuevo · sin uso',
          stressTest: api.stressTest ?? 'Sello intacto · sin encendido previo',
          conditionGrade: api.conditionGrade,
        }
      : verified
        ? {
            kind: 'verified',
            hoursOfUse: api.hoursOfUse ?? null,
            reportedHoursOfUse: api.reportedHoursOfUse ?? null,
            usageType: api.usageType,
            stressTest: api.stressTest,
            conditionGrade: api.conditionGrade,
          }
        : {
            kind: 'unverified',
            reason: 'Producto pendiente de revisión y testeo en laboratorio TechShield.',
          },
  };
}