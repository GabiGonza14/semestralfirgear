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
      'https://images.unsplash.com/photo-1596357395217-80de13130e92?auto=format&fit=crop&w=900&q=80',
    description:
      'Set de 5 niveles de resistencia para entrenamiento funcional en casa o gimnasio.',
    isActive: true,
    featured: true,
  },
  {
    id: 'p2',
    categoryId: 'c2',
    name: 'Mancuerna Ajustable 12kg',
    category: 'Pesas',
    price: 89.5,
    stock: 12,
    image:
      'https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=900&q=80',
    description:
      'Peso ajustable para sesiones de fuerza progresiva con agarre antideslizante.',
    isActive: true,
    featured: true,
  },
  {
    id: 'p3',
    categoryId: 'c3',
    name: 'Guantes Grip Max',
    category: 'Guantes',
    price: 24.75,
    stock: 56,
    image:
      'https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?auto=format&fit=crop&w=900&q=80',
    description:
      'Guantes transpirables con soporte de muneca para levantamiento y cross training.',
    isActive: true,
    featured: true,
  },
  {
    id: 'p4',
    categoryId: 'c4',
    name: 'Botella Sport 1L',
    category: 'Botellas',
    price: 18.99,
    stock: 88,
    image:
      'https://images.unsplash.com/photo-1595231776515-ddffb1f4eb73?auto=format&fit=crop&w=900&q=80',
    description:
      'Botella termica para mantener hidratacion fria por hasta 12 horas.',
    isActive: true,
  },
  {
    id: 'p5',
    categoryId: 'c5',
    name: 'Mat Pro Antideslizante',
    category: 'Colchonetas',
    price: 39.0,
    stock: 27,
    image:
      'https://images.unsplash.com/photo-1571019613576-2b22c76fd955?auto=format&fit=crop&w=900&q=80',
    description:
      'Colchoneta de alta densidad para yoga, movilidad y entrenamiento de piso.',
    isActive: true,
  },
  {
    id: 'p6',
    categoryId: 'c6',
    name: 'Cuerda de Velocidad Carbon',
    category: 'Accesorios',
    price: 19.99,
    stock: 63,
    image:
      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80',
    description:
      'Cuerda liviana para cardio de alto rendimiento con ajuste rapido de largo.',
    isActive: true,
  },
]
