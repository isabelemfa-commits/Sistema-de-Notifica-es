import { Store, Notification, DatabaseState } from './types';

export const DEFAULT_PISOS = [
  "L1",
  "L2",
  "L3",
  "L4"
];

export const DEFAULT_CATEGORIAS = [
  "Moda",
  "Alimentação",
  "Serviços",
  "Entretenimento",
  "Âncora",
  "Outro"
];

export const DEFAULT_TIPOS_NOTIFICACAO = [
  "Advertência",
  "Cobrança",
  "Exigência Operacional",
  "Comunicado",
  "Notificação Extrajudicial",
  "Outro"
];

// Helper to calculate relative ISO string dates
const getRelativeDateISO = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export function generateMockData(): DatabaseState {
  const stores: Store[] = [
    { id: "store-1", nome: "C&A", luc: "LUC L1-01", responsavel: "Mariana Costa", telefone: "(11) 98877-6611", email: "gerencia.ca@shoppingsaopaulo.com.br", piso: "L1", ativa: true },
    { id: "store-2", nome: "McDonald's", luc: "LUC AL-25", responsavel: "Felipe Almeida", telefone: "(11) 97766-5544", email: "mcdonalds.shopping@fastfood.com.br", piso: "L3", ativa: true },
    { id: "store-3", nome: "Renner", luc: "LUC L2-05", responsavel: "Juliana Mendes", telefone: "(11) 96655-4433", email: "renner.mall@renner.com.br", piso: "L2", ativa: true },
    { id: "store-4", nome: "O Boticário", luc: "LUC T-15", responsavel: "Carla Souza", telefone: "(11) 95544-3322", email: "oboticario.loja@boticario.com.br", piso: "L1", ativa: true },
    { id: "store-5", nome: "Lojas Americanas", luc: "LUC T-01", responsavel: "Ricardo Santos", telefone: "(11) 94433-2211", email: "sac.americanas@americanas.com.br", piso: "L1", ativa: true },
    { id: "store-6", nome: "Zara", luc: "LUC L3-12", responsavel: "Helena Rostova", telefone: "(11) 93322-1100", email: "zara.manager@zara.com", piso: "L3", ativa: true },
    { id: "store-7", nome: "Cacau Show", luc: "LUC L1-33", responsavel: "Marcelo Ramos", telefone: "(11) 92211-0099", email: "cacau.show.mall@gmail.com", piso: "L1", ativa: true },
    { id: "store-8", nome: "Smart Fit", luc: "LUC L3-02", responsavel: "Bruno Oliveira", telefone: "(11) 91100-9988", email: "smart.mall@smartfit.com.br", piso: "L3", ativa: true },
    { id: "store-9", nome: "Cinemark", luc: "LUC L3-01", responsavel: "Fernanda Lima", telefone: "(11) 97755-3311", email: "cinemark.cinema@cinemark.com.ar", piso: "L3", ativa: true },
    { id: "store-10", nome: "Drogaria São Paulo", luc: "LUC T-10", responsavel: "Dra. Patrícia Silveira", telefone: "(11) 98833-2211", email: "dsp.shopping@drogariasaopaulo.com.br", piso: "L1", ativa: true },
    { id: "store-11", nome: "Kopenhagen", luc: "LUC L2-24", responsavel: "Renata Abreu", telefone: "(11) 95533-8822", email: "kopenhagen.shopping@chocolates.com", piso: "L2", ativa: true },
    { id: "store-12", nome: "Riachuelo", luc: "LUC L1-12", responsavel: "Gabriela Duarte", telefone: "(11) 94422-9911", email: "riachuelo.loja@riachuelo.com.br", piso: "L1", ativa: true },
    { id: "store-13", nome: "Lupo", luc: "LUC L1-44", responsavel: "Thais Neri", telefone: "(11) 98855-4422", email: "lupo.mall@lupo.com.br", piso: "L1", ativa: true },
    { id: "store-14", nome: "Samsung Store", luc: "LUC L2-52", responsavel: "Lucas Mello", telefone: "(11) 97744-1100", email: "samsung.loja@samsung.com.br", piso: "L2", ativa: true },
    { id: "store-15", nome: "Spoleto", luc: "LUC AL-12", responsavel: "Fábio Jr.", telefone: "(11) 96633-1122", email: "spoleto.shopping@fastpasta.com.br", piso: "L3", ativa: true },
    { id: "store-16", nome: "Burger King", luc: "LUC AL-05", responsavel: "Guilherme Santos", telefone: "(11) 95522-3344", email: "bk.mall@burgerking.com.br", piso: "L3", ativa: true },
    { id: "store-17", nome: "Lotérica Shopping", luc: "LUC T-18", responsavel: "Seu Antonio", telefone: "(11) 92233-4455", email: "loterica.shopping@loterias.com.br", piso: "L1", ativa: false }, // Inactive store for business rules verification
    { id: "store-18", nome: "Vivara", luc: "LUC L2-15", responsavel: "Vanessa Lóes", telefone: "(11) 91122-3344", email: "vivara.joias@vivara.com.br", piso: "L2", ativa: true },
    { id: "store-19", nome: "DryClean USA", luc: "LUC T-19", responsavel: "Pedro Vargas", telefone: "(11) 95566-7788", email: "dryclean.mall@dryclean.com.br", piso: "L1", ativa: true },
    { id: "store-20", nome: "Chilli Beans", luc: "LUC L1-50", responsavel: "Alexandre Herculano", telefone: "(11) 93344-5566", email: "chilli.shopping@chillibeans.com.br", piso: "L1", ativa: true }
  ];

  const notifications: Notification[] = [];
  let notifIdCounter = 1;

  const addNotification = (notif: Omit<Notification, 'id'>) => {
    notifications.push({
      ...notif,
      id: `notif-${notifIdCounter++}`
    });
  };

  // --- RECURRENCE STORE 1: McDonald's (store-2) ---
  // Recurrent in "Exigência Operacional" (4 times in the last 12 months)
  const mcDonaldsExigencias = [
    { daysAgo: 15, status: 'Pendente', desc: 'Descarte incorreto de óleo vegetal na caixa de gordura setorial' },
    { daysAgo: 110, status: 'Resolvida', desc: 'Atraso na entrega dos certificados de desratização e controle de vetores', dtResId: 102 },
    { daysAgo: 220, status: 'Resolvida', desc: 'Barulhos anormais no exaustor secundário fora da curva de ruído comercial', dtResId: 215 },
    { daysAgo: 310, status: 'Resolvida', desc: 'Emissões de gordura excessivas na área externa de alimentação no L3', dtResId: 300 }
  ] as const;

  mcDonaldsExigencias.forEach(m => {
    const dataEnvio = getRelativeDateISO(m.daysAgo);
    // Vencimento of 10 days
    const dataVenc = getRelativeDateISO(m.daysAgo - 10);
    const resolvedDate = m.status === 'Resolvida' ? getRelativeDateISO(m.dtResId) : null;
    
    addNotification({
      lojaId: "store-2",
      tipo: "Exigência Operacional",
      titulo: "Exigência Operacional - Controle Higiênico",
      descricao: m.desc,
      dataEnvio,
      dataVencimento: dataVenc,
      dataResolucao: resolvedDate,
      status: m.status as any,
      prioridade: "Alta",
      evidenciaEntrega: "WhatsApp Oficial " + m.daysAgo,
      observacoes: "Monitoramento de equipe operacional regular.",
      criadoPor: "Renato Silveira (Fiscal Executivo)",
      historico: [
        { data: dataEnvio, descricao: "Notificação gerada pelo sistema", autor: "Renato Silveira" },
        ...(resolvedDate ? [{ data: resolvedDate, descricao: "Entregues os documentos e vistoria técnica aprovada", autor: "Fernanda Silva (Gerente Mall)" }] : [])
      ]
    });
  });

  // --- RECURRENCE STORE 2: Zara (store-6) ---
  // Recurrent in "Advertência" (3 times in the last 12 months)
  const zaraAdvertencias = [
    { daysAgo: 45, status: 'Pendente', desc: 'Manutenção de vitrine contendo andaimes montados durante horário de pico' },
    { daysAgo: 160, status: 'Resolvida', desc: 'Excesso de resíduos de papelão bloqueando o corredor técnico comum', dtResId: 158 },
    { daysAgo: 280, status: 'Resolvida', desc: 'Som da loja acima dos limites estipulados no regimento do shopping', dtResId: 279 }
  ] as const;

  zaraAdvertencias.forEach(z => {
    const dataEnvio = getRelativeDateISO(z.daysAgo);
    const dataVenc = getRelativeDateISO(z.daysAgo - 5);
    const resolvedDate = z.status === 'Resolvida' ? getRelativeDateISO(z.dtResId) : null;

    addNotification({
      lojaId: "store-6",
      tipo: "Advertência",
      titulo: "Advertência por Infração Regimental",
      descricao: z.desc,
      dataEnvio,
      dataVencimento: dataVenc,
      dataResolucao: resolvedDate,
      status: z.status as any,
      prioridade: "Média",
      evidenciaEntrega: "E-mail com Confirmação de Leitura",
      observacoes: "Equipe de segurança acionada para registro técnico.",
      criadoPor: "Maurício Neves (Supervisor de Operações)",
      historico: [
        { data: dataEnvio, descricao: "Notificação regimental protocolada", autor: "Maurício Neves" },
        ...(resolvedDate ? [{ data: resolvedDate, descricao: "Situação resolvida e penalidade aceita", autor: "Augusto Lima (Controle de Operações)" }] : [])
      ]
    });
  });

  // --- RECURRENCE STORE 3: Drogaria São Paulo (store-10) ---
  // Recurrent in "Cobrança" (3 times)
  const dspCobrancas = [
    { daysAgo: 5, status: 'Em Andamento', desc: 'Fundo de Promoção e Propaganda - Parcela ref. 05/2026 inadimplente' },
    { daysAgo: 85, status: 'Resolvida', desc: 'Aluguel Mínimo Mensal em atraso correspondente ao mês de Competência 03/2026', dtResId: 70 },
    { daysAgo: 145, status: 'Resolvida', desc: 'Taxa condominial ordinária atrasada com juros de mora acumulado', dtResId: 130 }
  ] as const;

  dspCobrancas.forEach(c => {
    const dataEnvio = getRelativeDateISO(c.daysAgo);
    const dataVenc = getRelativeDateISO(c.daysAgo - 15);
    const resolvedDate = c.status === 'Resolvida' ? getRelativeDateISO(c.dtResId) : null;

    addNotification({
      lojaId: "store-10",
      tipo: "Cobrança",
      titulo: "Cobrança de Despesas Financeiras",
      descricao: c.desc,
      dataEnvio,
      dataVencimento: dataVenc,
      dataResolucao: resolvedDate,
      status: c.status as any,
      prioridade: "Alta",
      evidenciaEntrega: "Protocolo Físico de Cartório",
      observacoes: "Encaminhado ao setor financeiro do Shopping.",
      criadoPor: "Clara Sampaio (Setor Financeiro)",
      historico: [
        { data: dataEnvio, descricao: "Nota de débito enviada para assessoria jurídica", autor: "Clara Sampaio" },
        ...(resolvedDate ? [{ data: resolvedDate, descricao: "Pagamento identificado e compensado no ERP", autor: "Clara Sampaio" }] : [])
      ]
    });
  });

  // --- EXPIRED NOTIFICATIONS (At least 5) ---
  // Defined by status=Pendente | Em Andamento, dataVencimento in the past (absolute negative relative days)
  // Let's create specific ones:
  const expiredData = [
    { id: "store-1", tipo: "Cobrança", titulo: "Atraso no Faturamento Bruto Anual", desc: "A loja não entregou os relatórios de auditoria de vendas trimestrais regidos por contrato.", daysAgo: 25, vencDaysAgo: 15 },
    { id: "store-3", tipo: "Notificação Extrajudicial", titulo: "Sublocação de Área Comercial Não Autorizada", desc: "Identificado quiosque lateral operando sem o devido aditivo contratual assinado.", daysAgo: 40, vencDaysAgo: 30 },
    { id: "store-5", tipo: "Exigência Operacional", titulo: "Substituição Urgente de Extintores de Incêndio", desc: "Laudo técnico aponta vencimento de 4 tambores de pó químico seco na área traseira.", daysAgo: 18, vencDaysAgo: 11 },
    { id: "store-8", tipo: "Advertência", titulo: "Obstrução de Saída de Emergência Traseira", desc: "Paletes com equipamentos de ginástica depositados na rota de fulga da área comum.", daysAgo: 12, vencDaysAgo: 7 },
    { id: "store-14", tipo: "Exigência Operacional", titulo: "Ajuste na Sinalização de Fachada Externa", desc: "Letreiro luminoso apresentando curto-circuito intermitente piscando com alta intensidade.", daysAgo: 30, vencDaysAgo: 20 },
    { id: "store-17", tipo: "Cobrança", titulo: "Diferença em Rateio de Energia Elétrica", desc: "Cobrança pendente da cota extra de ar condicionado central.", daysAgo: 60, vencDaysAgo: 45 } // Inactive store historical notification
  ];

  expiredData.forEach(exp => {
    const dataEnvio = getRelativeDateISO(exp.daysAgo);
    const dataVenc = getRelativeDateISO(exp.vencDaysAgo);

    addNotification({
      lojaId: exp.id,
      tipo: exp.tipo,
      titulo: exp.titulo,
      descricao: exp.desc,
      dataEnvio,
      dataVencimento: dataVenc,
      dataResolucao: null,
      status: "Pendente",
      prioridade: "Crítica",
      evidenciaEntrega: "Notificação com AR Correios",
      observacoes: "Notificada repetidas vezes. Próxima etapa será penalidade de multa extra.",
      criadoPor: "Augusto Lima (Gerência Geral)",
      historico: [
        { data: dataEnvio, descricao: "Laudo físico de infração protocolado em Cartório", autor: "Augusto Lima" }
      ]
    });
  });

  // --- EXPIRING SOON IN THE NEXT 7 DAYS (At least 3) ---
  // Status = Pendente or Em Andamento, and dataVencimento is positive relative days (e.g. 2, 4, 6 days from now)
  const expiringSoonData = [
    { id: "store-4", tipo: "Exigência Operacional", titulo: "Reciclagem Técnica de Brigadistas", desc: "Atualizar a listagem de funcionários treinados para prevenção de acidentes e primeiros socorros.", daysAgo: 4, vencDaysFromNow: 3, prioridade: "Alta" },
    { id: "store-11", tipo: "Comunicado", titulo: "Substituição do Cartão de Identificação de Funcionários", desc: "Lote de crachás com chip de aproximação deve ser retirado no setor de RH integrado.", daysAgo: 2, vencDaysFromNow: 5, prioridade: "Baixa" },
    { id: "store-19", tipo: "Advertência", titulo: "Sanitização de Dutos de Ventilação Interna", desc: "Executar limpeza obrigatória do sistema climatizador com apresentação do certificado PMOC.", daysAgo: 8, vencDaysFromNow: 2, prioridade: "Crítica" }
  ];

  expiringSoonData.forEach(exp => {
    const dataEnvio = getRelativeDateISO(exp.daysAgo);
    
    // Future Date calculation
    const dVenc = new Date();
    dVenc.setDate(dVenc.getDate() + exp.vencDaysFromNow);
    const dataVencimento = dVenc.toISOString();

    addNotification({
      lojaId: exp.id,
      tipo: exp.tipo,
      titulo: exp.titulo,
      descricao: exp.desc,
      dataEnvio,
      dataVencimento,
      dataResolucao: null,
      status: "Em Andamento",
      prioridade: exp.prioridade as any,
      evidenciaEntrega: "WhatsApp Corporativo de Gestão",
      observacoes: "Agendamento prévio registrado com fornecedor terceirizado.",
      criadoPor: "Renato Silveira (Fiscal Executivo)",
      historico: [
        { data: dataEnvio, descricao: "Notificação encaminhada à coordenação operacional", autor: "Renato Silveira" }
      ]
    });
  });

  // --- HISTORICAL RESOLVED / STABLE NOTIFICATIONS (To aggregate 60 items total) ---
  // We currently have 4 + 3 + 3 = 10 (recurrences) + 6 (expired) + 3 (expiring soon) = 19 notifications.
  // Let's add 41 more resolved / canceled / general communications spanning the last 12 months.
  // This satisfies: "60 notificações distribuídas nos últimos 12 meses com variedade de status, tipos e prioridades"
  const extraIssues = [
    { id: "store-1", tipo: "Comunicado", title: "Novo Manual Técnico de Visual Merchandising", status: "Resolvida", age: 120, priority: "Baixa" },
    { id: "store-3", tipo: "Comunicado", title: "Participação em Campanhas Promocionais de Natal", status: "Resolvida", age: 180, priority: "Média" },
    { id: "store-4", tipo: "Advertência", title: "Uso de calçados abertos na área operacional", status: "Resolvida", age: 60, priority: "Média" },
    { id: "store-5", tipo: "Comunicado", title: "Horário Especial - Feriado Corpus Christi", status: "Resolvida", age: 32, priority: "Baixa" },
    { id: "store-6", tipo: "Cobrança", title: "Rateio Adicional - Manutenção de Fachada Frontal", status: "Resolvida", age: 90, priority: "Média" },
    { id: "store-7", tipo: "Exigência Operacional", title: "Limpeza da caixa de gordura interna", status: "Resolvida", age: 15, priority: "Alta" },
    { id: "store-8", tipo: "Comunicado", title: "Simulado de Evasão - Brigada Civil", status: "Resolvida", age: 240, priority: "Média" },
    { id: "store-9", tipo: "Exigência Operacional", title: "Laudo Elétrico Anual - SPDA Cinemark", status: "Resolvida", age: 160, priority: "Crítica" },
    { id: "store-11", tipo: "Advertência", title: "Vazamento de água sob o balcão de cafés", status: "Resolvida", age: 25, priority: "Alta" },
    { id: "store-12", tipo: "Comunicado", title: "Instalação de novas antenas antifurto", status: "Resolvida", age: 45, priority: "Baixa" },
    { id: "store-13", tipo: "Comunicado", title: "Treinamento Coletivo de Lojistas sobre SAC", status: "Resolvida", age: 290, priority: "Baixa" },
    { id: "store-15", tipo: "Exigência Operacional", title: "Laudo Técnico de Elevador de Cargas", status: "Resolvida", age: 75, priority: "Alta" },
    { id: "store-16", tipo: "Advertência", title: "Armazenamento de caixas acima do limite permitido", status: "Resolvida", age: 35, priority: "Média" },
    { id: "store-18", tipo: "Notificação Extrajudicial", title: "Atraso Envio Faturamento Auditoria", status: "Resolvida", age: 210, priority: "Alta" },
    { id: "store-19", title: "Campanha Doação de Campanha de Agasalho", tipo: "Comunicado", status: "Resolvida", age: 12, priority: "Baixa" },
    { id: "store-20", tipo: "Cobrança", title: "Rateio de Segurança Patrimonial", status: "Resolvida", age: 50, priority: "Média" },
  ];

  // We want to generate ~41 extra notifications. Let's loop a few times or auto-expand with slight perturbations
  for (let i = 0; i < 41; i++) {
    const issueTemplate = extraIssues[i % extraIssues.length];
    // Randomize store slightly (excluding inactives or specific ID changes)
    const randomStoreId = `store-${(i % 19) + 1}`; // 1 to 19 range approx
    const ageDays = Math.floor(Math.random() * 320) + 10; // 10 to 330 days ago
    const dataEnvio = getRelativeDateISO(ageDays);
    const dataVenc = getRelativeDateISO(ageDays - Math.floor(Math.random() * 10 + 5));
    
    // Status distribution
    let status: 'Resolvida' | 'Cancelada' | 'Pendente' | 'Em Andamento' = 'Resolvida';
    if (i % 8 === 0) status = 'Cancelada';
    
    const dataResolucao = status === 'Resolvida' ? getRelativeDateISO(ageDays - Math.floor(Math.random() * 5)) : null;
    const priorityOptions = ["Baixa", "Média", "Alta", "Crítica"];
    const prioridade = priorityOptions[i % priorityOptions.length] as any;
    
    addNotification({
      lojaId: randomStoreId,
      tipo: issueTemplate.tipo,
      titulo: `${issueTemplate.title} #${100 + i}`,
      descricao: `Operação correspondente de rotina do setor operacional do Shopping para controle de qualidade estrutural e regência contratual. Ref: lote ${i}-G.`,
      dataEnvio,
      dataVencimento: dataVenc,
      dataResolucao,
      status,
      prioridade,
      evidenciaEntrega: "E-mail com Confirmação Eletrônica",
      observacoes: status === 'Resolvida' ? "Comprovantes apresentados e protocolados junto à Administração." : "Ação cancelada por revisão técnica da diretoria de infraestrutura.",
      criadoPor: "Mariana Costa (Coordenação Lojistas)",
      historico: [
        { data: dataEnvio, descricao: "Solicitação gerada e despachada para o e-mail cadastrado", autor: "Mariana Costa" },
        ...(status === 'Resolvida' && dataResolucao ? [{ data: dataResolucao, descricao: "Encerramento e arquivamento eletrônico após auditoria favorável", autor: "Augusto Lima (Gerente Geral)" }] : []),
        ...(status === 'Cancelada' ? [{ data: getRelativeDateISO(ageDays - 1), descricao: "Cancelamento efetuado pela gerência do mall", autor: "Augusto Lima" }] : [])
      ]
    });
  }

  return {
    stores,
    notifications,
    pisos: DEFAULT_PISOS,
    categorias: DEFAULT_CATEGORIAS,
    tiposNotificacao: DEFAULT_TIPOS_NOTIFICACAO
  };
}

export const DB_KEY = 'shopping_notifications_db';

export function loadDatabase(): DatabaseState {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate schema minimally
      if (parsed && Array.isArray(parsed.stores) && Array.isArray(parsed.notifications)) {
        // Automatically migrate any 'cnpj' fields to 'luc' silently to support existing data
        let migrated = false;

        if (!parsed.pisos || parsed.pisos.some((p: string) => !DEFAULT_PISOS.includes(p)) || parsed.pisos.length !== DEFAULT_PISOS.length) {
          parsed.pisos = DEFAULT_PISOS;
          migrated = true;
        }

        parsed.stores = parsed.stores.map((s: any) => {
          if ('cnpj' in s) {
            const { cnpj, ...rest } = s;
            s = { ...rest, luc: cnpj || '' };
            migrated = true;
          }

          const oldPiso = s.piso || '';
          let newPiso = oldPiso;
          if (oldPiso === "Piso Térreo" || oldPiso === "Térreo") {
            newPiso = "L1";
          } else if (oldPiso === "Piso L1") {
            newPiso = "L1";
          } else if (oldPiso === "Piso L2") {
            newPiso = "L2";
          } else if (oldPiso === "Piso L3") {
            newPiso = "L3";
          } else if (oldPiso === "Piso L4") {
            newPiso = "L4";
          } else if (oldPiso === "Praça de Alimentação") {
            newPiso = "L3";
          } else if (!DEFAULT_PISOS.includes(oldPiso)) {
            newPiso = "L1";
          }

          if (newPiso !== oldPiso) {
            s.piso = newPiso;
            migrated = true;
          }
          return s;
        });
        if (migrated) {
          saveDatabase(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("Erro ao carregar banco de dados local:", err);
  }
  
  // Return generated mock data and save it
  const initial = generateMockData();
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(state: DatabaseState) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Erro ao salvar banco de dados local:", err);
  }
}

// --- BUSINESS RULE LOGIC HELPERS ---

/**
 * Calculates display status dynamically on demand:
 * Under Rule 4, if current date exceeds dataVencimento and it is not Resolvida or Cancelada,
 * it must report "Vencida" automatically.
 */
export function getNotificationDisplayStatus(n: Notification, nowStr: string): 'Pendente' | 'Em Andamento' | 'Resolvida' | 'Cancelada' | 'Vencida' {
  if (n.status === 'Resolvida') return 'Resolvida';
  if (n.status === 'Cancelada') return 'Cancelada';

  const dCurrent = new Date(nowStr);
  const dVenc = new Date(n.dataVencimento);
  if (dCurrent > dVenc) {
    return 'Vencida';
  }
  return n.status;
}

/**
 * Checks if notification is expiring soon (within 7 days of due date)
 * only if still unresolved (Pendente or Em Andamento).
 */
export function isExpiringSoon(n: Notification, nowStr: string): boolean {
  const displayStatus = getNotificationDisplayStatus(n, nowStr);
  if (displayStatus === 'Resolvida' || displayStatus === 'Cancelada' || displayStatus === 'Vencida') {
    return false;
  }

  const tCurrent = new Date(nowStr).getTime();
  const tVenc = new Date(n.dataVencimento).getTime();
  const diffDays = (tVenc - tCurrent) / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= 7;
}

/**
 * Recurrence Store check:
 * Returns true if store has 3 or more non-canceled notifications of the SAME type
 * in the last 12 months (relative to nowStr).
 */
export function isStoreRecurrent(storeId: string, notifications: Notification[], nowStr: string): boolean {
  const recurrentTypes = getStoreRecurrentTypes(storeId, notifications, nowStr);
  return recurrentTypes.length > 0;
}

/**
 * Gathers the list of notification types that are in violation of recurrence limits (3+ offenses)
 */
export function getStoreRecurrentTypes(storeId: string, notifications: Notification[], nowStr: string): string[] {
  const limitDate = new Date(nowStr);
  limitDate.setFullYear(limitDate.getFullYear() - 1); // 12 months ago

  // 1. Filter notifications
  const storeNotifs = notifications.filter(n => {
    if (n.lojaId !== storeId || n.status === 'Cancelada') return false;
    return new Date(n.dataEnvio) >= limitDate;
  });

  // 2. Count by type
  const counts: Record<string, number> = {};
  storeNotifs.forEach(n => {
    counts[n.tipo] = (counts[n.tipo] || 0) + 1;
  });

  // 3. Collect active violators
  return Object.keys(counts).filter(tipoKey => counts[tipoKey] >= 3);
}

