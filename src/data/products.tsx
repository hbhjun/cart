export interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    description: string;
}

export const products: Product[] = [
    {
        id: 1,
        name: "iPhone 15",
        price: 799,
        stock: 2,
        description: "A17 芯片驱动，支持超高清摄影和全天候电池续航。",
    },
    {
        id: 2,
        name: "MacBook Air",
        price: 1199,
        stock: 3,
        description: "搭载 Apple M2 芯片，轻薄便携，性能强劲。",
    },
    {
        id: 3,
        name: "AirPods Pro",
        price: 249,
        stock: 6,
        description: "主动降噪与通透模式，让你沉浸音乐又不失联系。",
    },
];
