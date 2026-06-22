export interface Store {
  id: string;
  nome: string;
  luc?: string; // Limit Unit Code / Número da Loja
  responsavel: string;
  telefone: string;
  email: string;
  piso: string;
  ativa: boolean;
}

export interface NotificationHistory {
  data: string; // ISO String
  descricao: string;
  autor: string;
}

export interface Notification {
  id: string;
  lojaId: string; // FK -> Store
  tipo: string;
  titulo: string;
  descricao: string;
  dataEnvio: string; // ISO String
  dataVencimento: string; // ISO String
  dataResolucao: string | null; // ISO String or null
  status: 'Pendente' | 'Em Andamento' | 'Resolvida' | 'Vencida' | 'Cancelada';
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  fase?: string;
  evidenciaEntrega: string;
  observacoes: string;
  criadoPor: string;
  historico: NotificationHistory[];
  imagemNotificacao?: string;
  dataFoto?: string;
  motivo?: string;
}

export interface AppConfig {
  pisos: string[];
  categorias: string[];
  tiposNotificacao: string[];
}

export interface DatabaseState {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  categorias: string[];
  tiposNotificacao: string[];
}
