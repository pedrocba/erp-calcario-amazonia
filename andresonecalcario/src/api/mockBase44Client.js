const parseOrder = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') return { key: null, desc: false }
  const desc = orderBy.startsWith('-')
  const key = desc ? orderBy.slice(1) : orderBy
  return { key, desc }
}

const sortItems = (items, orderBy) => {
  const { key, desc } = parseOrder(orderBy)
  if (!key) return [...items]

  return [...items].sort((a, b) => {
    const av = a?.[key]
    const bv = b?.[key]
    if (av === bv) return 0
    if (av === undefined) return desc ? 1 : -1
    if (bv === undefined) return desc ? -1 : 1
    const result = av > bv ? 1 : -1
    return desc ? -result : result
  })
}

const matchesCriteria = (item, criteria = {}) =>
  Object.entries(criteria).every(([field, value]) => {
    if (value === undefined || value === null) return true
    if (Array.isArray(value)) return value.includes(item[field])
    if (typeof value === 'object' && value !== null) return item[field] === value
    return item[field] === value
  })

const createStore = (seed = [], { fillDefaults } = {}) => {
  let counter = seed.length
  const data = [...seed]

  const makeId = () => `${Date.now()}-${++counter}`

  const applyDefaults = (payload) => {
    const merged = {
      ...payload,
      ...(typeof fillDefaults === 'function' ? fillDefaults(payload, data) : {})
    }

    return {
      id: merged.id ?? makeId(),
      created_date: merged.created_date ?? new Date().toISOString(),
      ...merged
    }
  }

  return {
    async list(orderBy, limit) {
      const sorted = sortItems(data, orderBy)
      return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
    },
    async filter(criteria = {}, orderBy, limit) {
      const filtered = data.filter((item) => matchesCriteria(item, criteria))
      const sorted = sortItems(filtered, orderBy)
      return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
    },
    async create(payload = {}) {
      const record = applyDefaults(payload)
      data.push(record)
      return record
    },
    async bulkCreate(batch = []) {
      const created = await Promise.all(batch.map((item) => this.create(item)))
      return created
    },
    async update(id, updates = {}) {
      const index = data.findIndex((item) => item.id === id)
      if (index === -1) {
        throw new Error(`Registro com id ${id} não encontrado`)
      }
      data[index] = { ...data[index], ...updates }
      return data[index]
    }
  }
}

const defaultSeeds = {
  Company: [
    { id: 'c1', name: 'Calcário Amazônia', is_active: true },
    { id: 'c2', name: 'Base Agro', is_active: true }
  ],
  Product: [
    { id: 'p1', name: 'Calcário Filler', code: 'P-001', is_active: true, company_id: 'c1' },
    { id: 'p2', name: 'Calcário Granulado', code: 'P-002', is_active: true, company_id: 'c1' }
  ],
  Contact: [
    { id: 'ct1', name: 'Cliente Demo', type: 'cliente', is_active: true },
    { id: 'ct2', name: 'Fornecedor Demo', type: 'fornecedor', is_active: true }
  ],
  FinancialAccount: [
    { id: 'fa1', name: 'Conta Corrente', balance: 10000, is_active: true, company_id: 'c1' }
  ],
  Vehicle: [
    { id: 'v1', name: 'Caminhão 01', company_id: 'c1', type: 'truck' }
  ],
  FuelTank: [
    { id: 'ft1', name: 'Tanque Principal', company_id: 'c1' }
  ]
}

const createEntities = () => {
  const stores = {
    Company: createStore(defaultSeeds.Company),
    Product: createStore(defaultSeeds.Product),
    StockEntry: createStore([]),
    Transfer: createStore([]),
    Vehicle: createStore(defaultSeeds.Vehicle),
    Contact: createStore(defaultSeeds.Contact),
    FinancialAccount: createStore(defaultSeeds.FinancialAccount),
    Transaction: createStore([]),
    Sale: createStore([], {
      fillDefaults: ({ reference }, existing) => ({
        reference: reference ?? `S-${(existing.length + 1).toString().padStart(4, '0')}`
      })
    }),
    ActivityLog: createStore([]),
    Requisition: createStore([]),
    FuelTank: createStore(defaultSeeds.FuelTank),
    Refueling: createStore([]),
    Weighing: createStore([], {
      fillDefaults: ({ reference }, existing) => ({
        reference: reference ?? `W-${(existing.length + 1).toString().padStart(4, '0')}`
      })
    }),
    EPI: createStore([]),
    Employee: createStore([]),
    EPIDelivery: createStore([]),
    ITAsset: createStore([]),
    SalePayment: createStore([]),
    SaleInstallment: createStore([]),
    SaleWithdrawal: createStore([]),
    Quote: createStore([], {
      fillDefaults: ({ reference }, existing) => ({
        reference: reference ?? `Q-${(existing.length + 1).toString().padStart(4, '0')}`
      })
    }),
    TransactionPayment: createStore([])
  }

  return stores
}

const stubIntegration = (name) => async (input) => ({
  ok: true,
  integration: name,
  input
})

const mockAuth = {
  async me() {
    return {
      id: 'demo-user',
      name: 'Usuário Demo',
      email: 'demo@example.com'
    }
  },
  async updateMe(payload = {}) {
    return {
      id: 'demo-user',
      ...payload
    }
  },
  async logout() {
    return { ok: true }
  }
}

export const mockBase44 = {
  entities: createEntities(),
  integrations: {
    Core: {
      InvokeLLM: stubIntegration('InvokeLLM'),
      SendEmail: stubIntegration('SendEmail'),
      UploadFile: stubIntegration('UploadFile'),
      GenerateImage: stubIntegration('GenerateImage'),
      ExtractDataFromUploadedFile: stubIntegration('ExtractDataFromUploadedFile'),
      CreateFileSignedUrl: stubIntegration('CreateFileSignedUrl'),
      UploadPrivateFile: stubIntegration('UploadPrivateFile')
    }
  },
  auth: mockAuth
}
