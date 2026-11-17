export interface Producto {
    id: number;
    categoria: string;
    nombre: string;
    descripcion: string;
    precio: number;
    emoji: string;
    imagen: string;
}

export interface LineaCarrito {
    producto: Producto;
    qty: number;
    subtotal: number;
}

export const CINE_CONTACTO = { emailTaquilla: 'taquilla@cinemanoir.com' };

/** Póster y sinopsis por id de película (la BD no los guarda). */
export const PELICULAS_EXTRA: Record<number, { poster: string; sinopsis: string }> = {
    1: {
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZKNXDg1wdru_ie_tbxpRUgXY5Qs-0xCnLMUeG_AIHdw&s=10',
        sinopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia.'
    },
    2: {
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQr--RgPLZ2CO9L5-qvjhHIln8ZFUeOUNqKP5CdWgTq4g&s=10',
        sinopsis: 'Miles Morales es catapultado a través del Multiverso, donde se encuentra con un equipo de Spider-Gente encargadas de proteger su existencia.'
    },
    3: {
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-kJIS4-L9mTLDZdaP-De1Kw14Pb031aLYWGsQXIu7-w&s=10',
        sinopsis: 'La historia del científico estadounidense J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica en el Proyecto Manhattan.'
    },
    4: {
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkzvxcVZfHxjGBCA1CQLWmJ9DNMRTgppx0X46iWU6N8g&s=10',
        sinopsis: 'Riley entra en la adolescencia y el cuartel general sufre una repentina demolición para hacer espacio a nuevas emociones: ¡Ansiedad y más!'
    },
    5: {
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSOQt-P644Ie3PrM50P74ai2GSg97RKjJdEeMqNI1KzQ&s=10',
        sinopsis: 'Los investigadores paranormales Ed y Lorraine Warren abordan un último y aterrador caso que desafía todas sus experiencias anteriores.'
    },
    6: {
        poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsbVSt2DR6QOUBlIHBdfsTgYF6q8UaVlEQPBm4y8Rj9w&s=10',
        sinopsis: 'Un apático Wade Wilson se esfuerza por llevar una vida civilizada hasta que la TVA lo recluta para salvar su universo junto a Wolverine.'
    }
};

/** Póster de respaldo (SVG) cuando una portada no carga o la película es nueva. */
export function generatePosterSvg(title: string, genre: string): string {
    const t = title.replace(/[<>&"]/g, '').toUpperCase();
    const g = genre.replace(/[<>&"]/g, '').toUpperCase();
    const words = t.split(' ');
    const mid = Math.ceil(words.length / 2);
    const [l1, l2] = words.length > 2 && t.length > 16
        ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
        : [t, ''];

    const titulo = l2
        ? `<text x="250" y="475" font-family="Oswald,sans-serif" font-size="34" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="2">${l1}</text>
       <text x="250" y="515" font-family="Oswald,sans-serif" font-size="34" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="2">${l2}</text>`
        : `<text x="250" y="495" font-family="Oswald,sans-serif" font-size="36" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="2">${l1}</text>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1917"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
    <rect width="500" height="750" fill="url(#g)"/>
    <rect x="20" y="20" width="460" height="710" fill="none" stroke="#27272a" stroke-width="2"/>
    <rect x="28" y="28" width="444" height="694" fill="none" stroke="#e50914" stroke-opacity=".6"/>
    <text x="250" y="85" font-family="Oswald,sans-serif" font-size="11" font-weight="700" fill="#e50914" text-anchor="middle" letter-spacing="4">★ SELECCIÓN OFICIAL ★</text>
    <circle cx="250" cy="270" r="95" fill="#09090b" stroke="#27272a" stroke-width="2"/>
    <circle cx="250" cy="270" r="75" fill="none" stroke="#e50914" stroke-width="1.5" stroke-dasharray="6 6"/>
    <polygon points="226,230 288,270 226,310" fill="#fff"/>
    ${titulo}
    <text x="250" y="555" font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#e50914" text-anchor="middle" letter-spacing="5">// ${g} //</text>
  </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRODUCTOS_CINE: Producto[] = [
    // Combos
    { id: 101, categoria: 'Combos', nombre: 'Combo Clásico', descripcion: 'Crispetas grandes + gaseosa de 22 oz.', precio: 24000, emoji: '🍿', imagen: '' },
    { id: 102, categoria: 'Combos', nombre: 'Combo Pareja', descripcion: 'Crispetas grandes + 2 gaseosas de 22 oz.', precio: 32000, emoji: '🍿', imagen: '' },
    { id: 103, categoria: 'Combos', nombre: 'Combo Familiar', descripcion: '2 crispetas grandes + 4 gaseosas + nachos con queso.', precio: 58000, emoji: '🍿', imagen: '' },
    // Crispetas
    { id: 111, categoria: 'Crispetas', nombre: 'Crispetas Pequeñas', descripcion: 'Con mantequilla y sal.', precio: 11000, emoji: '🍿', imagen: '' },
    { id: 112, categoria: 'Crispetas', nombre: 'Crispetas Medianas', descripcion: 'Con mantequilla y sal.', precio: 15000, emoji: '🍿', imagen: '' },
    { id: 113, categoria: 'Crispetas', nombre: 'Crispetas Grandes', descripcion: 'Ideal para compartir.', precio: 18000, emoji: '🍿', imagen: '' },
    { id: 114, categoria: 'Crispetas', nombre: 'Crispetas de Caramelo', descripcion: 'Dulces y crocantes, tamaño grande.', precio: 20000, emoji: '🍯', imagen: '' },
    // Bebidas
    { id: 121, categoria: 'Bebidas', nombre: 'Gaseosa 16 oz', descripcion: 'Elige tu sabor en la confitería.', precio: 8000, emoji: '🥤', imagen: '' },
    { id: 122, categoria: 'Bebidas', nombre: 'Gaseosa 22 oz', descripcion: 'Elige tu sabor en la confitería.', precio: 10000, emoji: '🥤', imagen: '' },
    { id: 123, categoria: 'Bebidas', nombre: 'Agua', descripcion: 'Botella de 600 ml.', precio: 6000, emoji: '💧', imagen: '' },
    { id: 124, categoria: 'Bebidas', nombre: 'Limonada Natural', descripcion: 'Recién preparada, 16 oz.', precio: 9000, emoji: '🍋', imagen: '' },
    { id: 125, categoria: 'Bebidas', nombre: 'Café', descripcion: 'Café caliente de la casa.', precio: 6500, emoji: '☕', imagen: '' },
    // Snacks
    { id: 131, categoria: 'Snacks', nombre: 'Nachos con Queso', descripcion: 'Totopos con salsa de queso cheddar.', precio: 14000, emoji: '🧀', imagen: '' },
    { id: 132, categoria: 'Snacks', nombre: 'Hot Dog', descripcion: 'Salchicha, pan artesanal y salsas.', precio: 13000, emoji: '🌭', imagen: '' },
    { id: 133, categoria: 'Snacks', nombre: 'Papas Fritas', descripcion: 'Porción mediana con sal.', precio: 10000, emoji: '🍟', imagen: '' },
    // Dulces
    { id: 141, categoria: 'Dulces', nombre: 'Chocolatina', descripcion: 'Barra de chocolate con leche.', precio: 5000, emoji: '🍫', imagen: '' },
    { id: 142, categoria: 'Dulces', nombre: 'Gomitas', descripcion: 'Bolsa de gomitas surtidas.', precio: 6500, emoji: '🍬', imagen: '' },
    { id: 143, categoria: 'Dulces', nombre: 'Chocolates Surtidos', descripcion: 'Bolsa de confites de chocolate.', precio: 7000, emoji: '🍫', imagen: '' }
];