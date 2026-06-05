import type { Brand, BrandCategory } from '@/types'

export const brandCategories: BrandCategory[] = [
  'Womenswear',
  'Footwear',
  'Accessories',
  'Contemporary',
]

// Only brands with real images
export const brands: Brand[] = [
  {
    name: 'UMA WANG',
    category: 'Womenswear',
    origin: 'China / London',
    detail: '儒雅禅意，解构主义。以材质与细节著称。',
    image: '/showroom/images/brands/uma-wang.png',
  },
  {
    name: 'MS MIN',
    category: 'Womenswear',
    origin: 'Xiamen',
    detail: '现代中国设计，东方哲学为底。',
    image: '/showroom/images/brands/ms-min.png',
  },
  {
    name: 'DEEPMOSS',
    category: 'Womenswear',
    origin: 'Xiamen',
    detail: '自然通感美学。理性与诗意交织。',
    image: '/showroom/images/brands/deepmoss.png',
  },
  {
    name: 'SHUSHU/TONG',
    category: 'Womenswear',
    origin: 'Shanghai',
    detail: '摩登又叛逆的少女感。甜美中的结构感。',
    image: '/showroom/images/brands/shushu-tong.png',
  },
  {
    name: 'YOEYYOU',
    category: 'Womenswear',
    origin: 'China',
    detail: '结构主义与实用主义的极致平衡。',
    image: '/showroom/images/brands/yoeyyou.png',
  },
  {
    name: 'RUOHAN',
    category: 'Womenswear',
    origin: 'New York / China',
    detail: '现代极简主义。适配多场景的永恒衣橱。',
    image: '/showroom/images/brands/ruohan.png',
  },
]
