import type { ExploreCard, InspectionStep, Product } from '../types';

export const IMAGES = {
  logo: 'https://lh3.googleusercontent.com/aida/AEtjO1VOXNagpsFrICWmiTbOWuLsB5bG2Y4miKwXXygSH9jruLFlxj9sx56eUnBMn_shwAQEE1ZBI6QnrEcFH_d98bhrh4BV05mJhJnyQ7gUC_lJVdi5kuzFVyr7qacg8NQhpJ2auCeGtL0D1rh00-w5c672PrQ20kiFD68NOQvqC6HLysRobCY_nmffimDpxGzhLgaNzYIGTS-ll4PDrnSrWAJ7Lwaq0qQxEv7xlsjaYhzmk45WTC2NF4QyjA',
  profile:
    'https://lh3.googleusercontent.com/aida/AEtjO1XThamQfshHmydO60Wwsa5jRy2EEA9tmIoJlC0wlVkUonGH4ywqzynRuMO5o1AKDZ8b14Pb7dhBItqpYql3uyZ-kKsMDNjaoQToO9jrrWXaIGoyzNih-C_ODkNR9IxKElymn4Ep1d4VbaIgI-hRRPZGMFXjbzE6acEAx24D9ghqkmFfmaaAyYCkl4HK1B2_ptztZuFkDoYDgU-kGwh4tbV_6mqXtL-WxItK1kIhaLnEq4l_4WeQGIAS8w',
  inspector:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDBlCqpj6hQpzpyT0p3Pby5zrL2pX6YsXIJAnri6Y7LcXzDVGIWitHg8mCx99lSPejJTQ9SqPwooL42EQqiI0v3ulB-Fp0abf36ZmVvfSdmOEAPDJukiTY5zN_qHIv1Rz-l2KGmBCQlCFHfJHiBsg6oHK-Ye4HTk2nxO3aJX87Td8ec_RNzPMHINUrLzlqg3Yud6oqirbkehIvHvu92vB5mwxyI1nNUAT3rb6qIKtNLVUp4VB8r0nA',
  seller:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBrH-Ke1ilG47K1Pkiy_cqIo7qevgwEej85azS5TQvNWS1sTG-kAsKEJF1y5KCyDW0cCxU4jagMe8AowPXnz-yjX80XhphqmHVWxpA3U8o8dr2UAD13r6FKv-Ojl7xIOufha4LAvZbUJ5W-UuzqcATOdOh1FcbJD4dVxaCXWMga2Iw-cj--ld7rUYuco0bxDxcDHZJxhWaquEv-pMtil8sHyeiQqbRlUdA30aSCscNa32LunFasjeI',
};

const ryzenImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBiaJytSsqqyWzFaV1XrH1e11G2FyTqXzI9-UPyXhT2EJIMCWUkjjpPATeV-WeJ1EIXR7UsXfnZCurVrE2rSf2iGAjsVoFZG_akWwijR9PkyqJMX6gExUW-C7xtzu2E3ayIzvljOHNmXozGwvWDqKY394EFVUqTBRp4vMc6KzCNCmadi9_IEHRL_8tIeg35_rhADfH86-dTdkz-BRfQkosfNM_6cvESB8G-k9IuFF2exmrApJPixgg';
const galaxyImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB0s9foVZMYYd_VbKxSmewZVF77gUODCrlUWSkRUdLuOgzPOtROaJk3jchNcxBomyWQfDYtAB-K8yYLgJ3ZxyTFVmT3BCuD1b9rLs3eq6iEiwBtyX7RYalRJWfpc3XTnJcRellC8kKHN3xTERXyNzgQhUtopVLXQ0Q43NLuiQP-jM0hl-YatAKqwEb1WgvZPgyYqeWNIdnkbAyvPV25iZYJVl48YyKfObDrhwKHtOALHwCZPPcua_o';
const rtxImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB-UftjvauRRlC_2m1rzSqx28dlp7pgqVaUDgHVLh-XdxEFhF0JBDSrhdqBuTJmFmQ-S1TB4rJY7CeUPnsX1Bi7WYt33pRnvMRmRaHwxxAOXkKCJwMfe34c2soAmJpgdYllWEGDJuNA-vqMdycFcLBywcjFr0oOYclMy4loLeDsqa-DNyxizsD0HOXGfrRVgjrBiKbfIrGVecfchCKjk4IM28SGr2NiYuaXMvMiDmfSpkxM4EhsoQg';
const intelImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB9MM1vzTy0XpgyZOcNL97t87rg90jgH5QR8mVFHOr9Gd4Tw6dI8ikyVj6-p7er1_2mEt0Jm22Chpfn32QtTgqF66RWMvw2i7aTvGbHKWWFJeimhCHjQlYg4gwa1bEZmpMPv0g2CATtHRNQmEH2vJkbf16FIoNNL95AJJhQtT7giEiTdor4yuFa4AxfBvAwUjShuGosksCZ1GSglJ4EukaqOuPQidGthxGE9n1lc86FNEMn0rzw0bM';

export const PRODUCTS: ExploreCard[] = [
  {
    id: 'TS-9482',
    category: 'PROCESADORES',
    breadcrumb: 'AMD RYZEN',
    tag: 'AM5',
    tagTone: 'emerald',
    grade: 'GRADO A+',
    gradeTone: 'primary',
    title: 'AMD Ryzen 7 7800X3D',
    subtitle: '8 Cores · 16 Hilos · 3D V-Cache 96MB',
    price: 340,
    currency: 'USD',
    escrow: 'Garantía Escrow',
    image: ryzenImage,
    verified: true,
    hoursOfUse: 320,
    reportedHoursOfUse: 350,
    usageType: 'Gaming',
    stressTest: 'Cinebench R23 30 min · pico 67°C · sin thermal throttle',
    conditionGrade: 'A+',
    sellerTier: 'secure',
    sellerName: 'TechLab Pro',
    intro: 'Procesador de escritorio verificado con inspección de pines y V-Cache.',
    telemetry: {
      kind: 'checklist',
      icon: 'task_alt',
      title: 'Inspección Pines & V-Cache OK',
      pts: '42/42 PTS',
      auditor: 'Auditor TechLab™',
      hash: '0x8F9B',
      satisfaction: '98% Satisfacción',
    },
  },
  {
    id: 'TS-4410',
    category: 'SMARTPHONES',
    breadcrumb: 'SAMSUNG GALAXY',
    tag: '256GB',
    tagTone: 'cyan',
    grade: 'ESTADO IMPECABLE',
    gradeTone: 'primary',
    title: 'Samsung Galaxy S23 Ultra',
    subtitle: 'Phantom Black · Libre Fabrica · S-Pen',
    escrow: 'Garantía Escrow',
    currency: 'USD',
    image: galaxyImage,
    verified: true,
    hoursOfUse: 0,
    reportedHoursOfUse: 0,
    usageType: 'Uso personal',
    stressTest: 'Batería 97% · panel AMOLED sin burn-in · 42/42 tests',
    conditionGrade: 'A+',
    sellerTier: 'secure',
    sellerName: 'TechLab Pro',
    intro: '256GB Almacenamiento • 8GB RAM • Phantom Black • Snapdragon 8 Gen 2 for Galaxy',
    gallery: [
      {
        uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKKw_JhJyOH5Ou8p7o9KwkJaeLZd76mnvN8UzdSwrQ_-WNoYmVaUCQKvV-HdLyqXD0oyYNiqIOhlEm4Ok2JinnR28DCdocJ-3yXf1mVDoJ1KKlfjQUQc6fIka4RXvIpHoAkD2bf2Bby98Sm55CSoOMM3HkF9uow2N2TPctEny6ZQ8Nii9yDBdRXhZwRnotyYkSLkO7TU9-wuzJykv9vCdHokg6RV7AJJkaFTc8GlU6xUIzWSKxNE0',
        label: 'FRONT',
        desc: 'Inspección macro: Chasis frontal',
      },
      {
        uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbrFPt0FEXZq42t_19UMIp_z-ez4a9_LBLnHGn4KN3lQFuHc2B2qxbmUkIykUXEAN_4A_tc3OVOLnAbA93uGgcyBT1h2-a8JMfPQO4lxV_cLoYxq9nPDNEE0d_tyLqYX37dzLXao3mCQLjDKJ8WTm9VSYja2bQVK1Z-YMT6ujA9OHCpQZFpCSC79uRdgz15Mj9N6C2CagMwgzshYWjJrYC1BhyAMrdhXxlPHNXzKqTWUeuSXKL3IE',
        label: 'FRONT',
        desc: 'Macro frontal: Pantalla Dynamic AMOLED 2X sin marcas',
      },
      {
        uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9bZ_9v_Mn5SXMCK_Yp0khWsjdu3MpiVjmyR5puAf4pBAipIMjT1RH_zCWzXdtrv8AbOdebG2TP6ko-bZiDDMa4Z56XWwq6deqKrQ6yeqSghKHC6Z0YDFwWPkjko8cdmHAYJkxEL0fpqJx0Sf07QLp0uVjHYza2GBuwFqU3SGyYo8tac3KdvqWT_YgY3TeCLXmObH_ayh8ue0VzvrFXMOJXzAnKbjnDu3vzgFjAs2u0hYOYZ_W5xM',
        label: 'LENTES',
        desc: 'Macro posterior: Módulos de cámara 200MP y 10x limpios',
      },
      {
        uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6SqZdTAzTe1cRkWvPWHjkETOKsljx_n2HT3DH4i_1Ymudz0UDAzAjez8H3L6zFfYdl4kBKoBsu_H3-R3Bl2M8Xxr-vQCOqJ13W-9DANOwCadl5lgOAd2AjWflbd8NpLts0TwKkE9NoeozftKYel_9f7Ykvs74vvYGrLDoOyh8W5M6nayJhOO22e-Ue9lyyrGSX6_BmvcdnJWAqh62wWgEWF_tcedY_Zub-CT3oGcN8vSOPbpSpLk',
        label: 'USB-C',
        desc: 'Macro puerto: Conector USB-C y altavoz estéreo limpios',
      },
      {
        uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1g6dc4fJCjWbsgGtgavdzxXkx9oY44L3L5fLMpCqLnhW2Um2N8jHbC_KT01Ln9RRjJVv733ZLMFzXzgG6-QVEMAAGtt-114TQsWyemO9zLiA6LocdeM_dVNBtOQh39b5ogRBwgU4vBsSUo2hmkSoJLRYkxByxhoeFjkBzkLyV6HHmekQFMIHLgKMLVu36-IXN3S-wQ6MWRPFxaUkQiQCIwrHolSVoE7z2FoMK7pBu9fePdTFwSLg',
        label: 'BISEL',
        desc: 'Macro bisel: Esquinas de aluminio Armor Aluminum sin golpes',
      },
    ],
    price: 649,
    originalPrice: 1199,
    saving: '-46% AHORRO',
    shipping: 'Envío prioritario con seguro total a domicilio incluido',
    report: {
      code: 'INSPECCIÓN #TS-89421 • AUDITADO HACE 6 HORAS',
      tests: '42/42 TEST PASADOS',
      battery: {
        label: 'SALUD REAL DE BATERÍA',
        value: '97% ÓPTIMA',
        percent: 97,
        subLeft: 'Ciclos verificados: 58 cargas',
        subRight: 'Voltaje de pico: 4.38V Nominal',
      },
      checklist: [
        {
          icon: 'screenshot_monitor',
          title: 'Pantalla Dynamic AMOLED 2X',
          status: 'CALIBRADA',
          desc: "Sin píxeles muertos, sin 'burn-in', tasa de refresco adaptativa 120Hz estable verificada con luxómetro digital.",
        },
        {
          icon: 'photo_camera',
          title: 'Sensores de Cámara 200MP + 10x Óptico',
          status: '100% LIMPIAS',
          desc: 'Enfoque láser y estabilización óptica (OIS) testeados en banco de vibración. Cero partículas internas de polvo.',
        },
        {
          icon: 'fingerprint',
          title: 'Placa Base, Sensores & Biometría',
          status: 'OPERATIVO',
          desc: 'Sensor ultrasónico de huella en pantalla y desbloqueo facial en milisegundos. Sensores giroscópicos certificados.',
        },
        {
          icon: 'lock_open',
          title: 'Estado Legal & Bloqueos',
          status: 'IMEI LIMPIO',
          desc: 'Homologado internacionalmente, libre para todas las compañías, Knox Warranty 0x0 sin manipulaciones de software.',
        },
      ],
      hash: 'HASH SHA-256: 8f42..c9a1',
    },
    seller: {
      name: 'Carlos M.',
      pro: true,
      since: 'Miembro desde 2021 • 142 ventas',
      rating: '4.9 / 5.0',
      positive: '99.2% positivo',
      avatar: IMAGES.seller,
    },
    specs: [
      ['PROCESADOR', 'Snapdragon 8 Gen 2 (4nm)'],
      ['PANTALLA', '6.8" QHD+ (3088 x 1440) 120Hz'],
      ['RESISTENCIA', 'IP68 (Probado en estanqueidad)'],
      ['PESO & TAMAÑO', '234g • 163.4 x 78.1 x 8.9 mm'],
    ],
    telemetry: {
      kind: 'battery',
      label: 'Salud Batería: 96%',
      value: '96%',
      percent: 96,
      subLeft: 'Panel AMOLED Sin Burn-in',
      subRight: 'Panel AMOLED Sin Burn-in',
    },
  },
  {
    id: 'TS-1193',
    category: 'TARJETAS GRÁFICAS',
    breadcrumb: 'NVIDIA',
    tag: '8GB GDDR6X',
    tagTone: 'primary',
    grade: 'STRESS TEST PASS',
    gradeTone: 'primary',
    title: 'RTX 3070 Ti FE',
    subtitle: 'Furmark Benchmark · Pasta Térmica Kryonaut',
    price: 380,
    currency: 'USD',
    escrow: 'Garantía Escrow',
    image: rtxImage,
    verified: true,
    hoursOfUse: 540,
    reportedHoursOfUse: 500,
    usageType: 'Gaming',
    stressTest: 'Furmark 45 min · pico 68°C · hot spot delta 11.4°C',
    conditionGrade: 'A',
    sellerTier: 'normal',
    sellerName: 'CyberMundo',
    intro: 'Tarjeta gráfica Founder Edition probada bajo Furmark con telemetría térmica.',
    telemetry: {
      kind: 'metrics',
      cells: [
        { icon: 'device_thermostat', tone: 'cyan', label: 'Carga Máxima', value: '68°C Estable' },
        { icon: 'speed', tone: 'emerald', label: 'Hot Spot Delta', value: '11.4°C Óptimo' },
      ],
    },
  },
  {
    id: 'TS-7721',
    category: 'PROCESADORES',
    breadcrumb: 'INTEL',
    tag: 'SELLADO',
    tagTone: 'primary',
    grade: 'SELLO ORIGINAL',
    gradeTone: 'secondary',
    title: 'Intel Core i5-13600K',
    subtitle: '14 Cores · LGA1700 · 5.1GHz Turbo Boost',
    price: 265,
    currency: 'USD',
    escrow: 'Garantía Escrow',
    image: intelImage,
    verified: false,
    hoursOfUse: null,
    reportedHoursOfUse: 100,
    usageType: 'Oficina',
    stressTest: '',
    conditionGrade: '',
    sellerTier: 'secure',
    sellerName: 'TechLab Pro',
    intro: 'Procesador sellado de fábrica con holograma Intel verificado.',
    telemetry: {
      kind: 'seal',
      icon: 'qr_code_scanner',
      text: 'Holograma Intel verificado por escaneo criptográfico',
    },
  },
  {
    id: 'TS-0301',
    category: 'PROCESADORES',
    breadcrumb: 'INTEL',
    tag: 'NUEVO',
    tagTone: 'blue',
    grade: 'PRODUCTO NUEVO',
    gradeTone: 'primary',
    title: 'Intel Core i5-14600K Sellado',
    subtitle: 'Nuevo · Sin uso · Sin abrir',
    price: 320,
    currency: 'USD',
    escrow: 'Garantía Escrow',
    image: intelImage,
    condition: 'new',
    sealed: true,
    verified: true,
    hoursOfUse: 0,
    reportedHoursOfUse: 0,
    usageType: 'Nuevo · sin uso',
    stressTest: 'Sello intacto · sin encendido previo',
    conditionGrade: '',
    sellerTier: 'secure',
    sellerName: 'TechLab Pro',
    intro: 'Nuevo, sin uso y sin sacar de la caja, con sello de fábrica.',
    telemetry: {
      kind: 'verified',
      hoursOfUse: 0,
      reportedHoursOfUse: 0,
      usageType: 'Nuevo · sin uso',
      stressTest: 'Sello intacto · sin encendido previo',
      conditionGrade: '',
    },
  },
].map((p) => ({
  ...p,
  escrowProtected: true,
  openComplaints: 0,
  priceFlag: 'normal' as const,
  sellerId: '',
  warranty:
    p.condition === 'new'
      ? { days: 120, extended: false, remainingDays: 120, label: 'Garantía TechShield 120 días' }
      : { days: 90, extended: false, remainingDays: 90, label: 'Garantía TechShield 90 días' },
  sellerStats:
    p.sellerTier === 'secure'
      ? { total: 3, positive: 3, complaints: 0, positivity: 100, identityVerified: true }
      : { total: 3, positive: 2, complaints: 0, positivity: 67, identityVerified: false },
})) as ExploreCard[];

export const CATEGORIES = [
  { icon: 'memory', label: 'Procesadores', active: true },
  { icon: 'developer_board', label: 'Tarjetas Gráficas', active: false },
  { icon: 'smartphone', label: 'Smartphones', active: false },
  { icon: 'storage', label: 'RAM & M.2 NVMe', active: false },
  { icon: 'laptop_chromebook', label: 'Laptops Gamer', active: false },
];

export const INSPECTION_STEPS: InspectionStep[] = [
  {
    title: 'Pago confirmado y fondos en custodia',
    meta: '14:10',
    desc: 'El valor total fue resguardado mediante smart-escrow TechShield.',
    state: 'done',
  },
  {
    title: 'Recepción en Centro Técnico TechShield',
    meta: 'Ayer',
    desc: 'Paquete recepcionado sin roturas en Hub Logístico Norte con código de precinto intacto.',
    state: 'done',
  },
  {
    title: 'Inspección Técnica de Silicio & VRM',
    meta: 'En Curso',
    desc: 'Auditando integridad física y estabilidad térmica bajo carga continua.',
    state: 'active',
    icon: 'biotech',
    percent: '85%',
    checkpoints: [
      {
        icon: 'verified',
        title: 'Pines PGA / Socket AM4',
        meta: 'Microscopio 40x: 0 desviaciones',
        status: 'approved',
      },
      {
        icon: 'thermostat',
        title: 'Stress Cinebench R23 (30 min)',
        meta: 'Pico 67°C • Sin thermal throttle',
        status: 'approved',
      },
      {
        icon: 'qr_code_scanner',
        title: 'Número de Serie & Autenticidad',
        meta: 'IHS original • Silicio AMD verificado',
        status: 'approved',
      },
      {
        icon: 'sync',
        title: 'Test de Fases VRM Motherboard',
        meta: 'Prueba con carga sostenida 120W',
        status: 'running',
      },
    ],
  },
  {
    title: 'Sellado Antiestático & Precinto Criptográfico',
    meta: 'Pendiente',
    desc: 'Empaque en bolsa ESD blindada con sticker de garantía no removible.',
    state: 'pending',
    icon: 'inventory_2',
  },
  {
    title: 'Despacho Asegurado a tu Domicilio',
    meta: 'Est. Mañana',
    desc: 'Envío prioritario con seguro total anti-siniestro por $310 USD.',
    state: 'pending',
    icon: 'local_shipping',
  },
];

export const DETAIL_PRODUCT: Product = PRODUCTS[1];

export const findProduct = (id?: string): ExploreCard =>
  PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];