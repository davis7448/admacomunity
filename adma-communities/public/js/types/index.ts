// Tipos para ADMA Communities

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  comunidadId?: string;
  rol: 'admin' | 'lider' | 'usuario';
  createdAt: Date;
}

export interface Comunidad {
  id: string;
  nombre: string;
  descripcion?: string;
  liderId: string;
  membresia: string[];
  createdAt: Date;
}

export interface Reto {
  id: string;
  titulo: string;
  descripcion: string;
  comunidadId: string;
  premio?: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'activo' | 'completado' | 'cancelado';
}

export interface Inscripcion {
  id: string;
  usuarioId: string;
  retoId: string;
  comunidadId: string;
  fecha: Date;
  estado: 'activa' | 'completada' | 'cancelada';
}

export interface Venta {
  id: string;
  comunidadId: string;
  usuarioId: string;
  producto: string;
  cantidad: number;
  precio: number;
  total: number;
  fecha: Date;
}

export interface CacheData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
