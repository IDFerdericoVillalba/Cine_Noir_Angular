export interface Pelicula {
    id: number;
    titulo: string;
    genero: string;
    duracion: number | string;
    clasificacion: string;
    sinopsis?: string;
    poster?: string;
}

export interface Funcion {
    id: number;
    id_pelicula: number;
    fecha: string;
    hora: string;
    sala: string;
    precio: number;
    cupos_disponibles: number;
}

export interface AlimentoCompra {
    id_producto: number;
    nombre: string;
    categoria: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

export interface Compra {
    id: number;
    id_funcion: number;
    nombre_cliente: string;
    cantidad_boletos: number;
    total_pago: number;
    fecha_compra: string;
    // Datos extra que genera la taquilla (el backend decide si los guarda)
    email_cliente?: string;
    asientos_seleccionados?: string[];
    alimentos?: AlimentoCompra[];
    subtotal_entradas?: number;
    subtotal_alimentos?: number;
    metodo_pago?: string;
    estado_pago?: string;
}

export interface FuncionConPelicula extends Funcion {
    pelicula: Pelicula | { titulo: string; genero: string; duracion: string; clasificacion: string };
}

export interface CompraDetallada extends Compra {
    funcion: (Funcion & { pelicula?: Pelicula }) | null;
}

export interface Metricas {
    totalIngresos: number;
    totalBoletos: number;
    totalPeliculas: number;
    totalFunciones: number;
    cuposRestantes: number;
    promedioBoleto: number;
}
export interface Recibo {
    compra: Compra;
    funcion: Funcion;
    pelicula: Pelicula;
    seats: string[];
    alimentos: AlimentoCompra[];
    subEnt: number;
    subAli: number;
    pagoTxt: string;
}
