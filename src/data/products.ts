import type { Product } from '../types'

export const products: Product[] = [
  {
    id: 'p1',
    categoryId: 'c1',
    name: 'Banda Elastica Pro Set',
    category: 'Bandas',
    price: 29.99,
    stock: 34,
    image:
      '/uploads/products/kit-de-mancuernas-para-pesas-20-kg-1776876019385.webp',
    images: [
      '/uploads/products/kit-de-mancuernas-para-pesas-20-kg-1776876019385.webp',
    ],
    sizes: [],
    description:
      'Set de 5 niveles de resistencia para entrenamiento funcional en casa o gimnasio.',
    isActive: true,
    featured: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 29.99,
  },
  {
    id: 'p2',
    categoryId: 'c2',
    name: 'Mancuerna Ajustable 12kg',
    category: 'Pesas',
    price: 89.5,
    stock: 12,
    image:
      '/uploads/products/kit-de-mancuernas-de-musculacion-de-10-kg-1776876263786.webp',
    images: [
      '/uploads/products/kit-de-mancuernas-de-musculacion-de-10-kg-1776876263786.webp',
    ],
    sizes: [],
    description:
      'Peso ajustable para sesiones de fuerza progresiva con agarre antideslizante.',
    isActive: true,
    featured: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 89.5,
  },
  {
    id: 'p3',
    categoryId: 'c3',
    name: 'Guantes Grip Max',
    category: 'Guantes',
    price: 24.75,
    stock: 56,
    image:
      '/uploads/products/mancuerna-1777335111876.png',
    images: ['/uploads/products/mancuerna-1777335111876.png'],
    sizes: [
      { label: 'S', stock: 18 },
      { label: 'M', stock: 22 },
      { label: 'L', stock: 16 },
    ],
    description:
      'Guantes transpirables con soporte de muñeca para levantamiento y cross training.',
    isActive: true,
    featured: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 24.75,
  },
  {
    id: 'p4',
    categoryId: 'c4',
    name: 'Botella Sport 1L',
    category: 'Botellas',
    price: 18.99,
    stock: 88,
    image:
      '/uploads/products/masajeador-manual-roll-on-1776877368773.webp',
    images: [
      '/uploads/products/masajeador-manual-roll-on-1776877368773.webp',
    ],
    sizes: [],
    description:
      'Botella térmica para mantener hidratación fría por hasta 12 horas.',
    isActive: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 18.99,
  },
  {
    id: 'p5',
    categoryId: 'c5',
    name: 'Mat Pro Antideslizante',
    category: 'Colchonetas',
    price: 39.0,
    stock: 27,
    image:
      '/uploads/products/rodillo-de-masaje-liso-1776877329260.webp',
    images: [
      '/uploads/products/rodillo-de-masaje-liso-1776877329260.webp',
    ],
    sizes: [],
    description:
      'Colchoneta de alta densidad para yoga, movilidad y entrenamiento de piso.',
    isActive: true,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 39.0,
  },
  {
    id: 'p6',
    categoryId: 'c6',
    name: 'Cuerda de Velocidad Carbon',
    category: 'Accesorios',
    price: 19.99,
    stock: 63,
    image:
      '/uploads/products/cuerda-para-saltar-de-cross-training-de-velocidad-negra-speed-rope-1776876773477.webp',
    images: [
      '/uploads/products/cuerda-para-saltar-de-cross-training-de-velocidad-negra-speed-rope-1776876773477.webp',
    ],
    sizes: [],
    description:
      'Cuerda liviana para cardio de alto rendimiento con ajuste rápido de largo.',
    isActive: true,
    hasDiscount: true,
    discountPercentage: 25,
    discountAmount: 5,
    finalPrice: 14.99,
  },
]
