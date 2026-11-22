export type Month = 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago' | 'Set' | 'Out' | 'Nov' | 'Dez';

export interface BudgetEntry {
  monthlyValues: Record<Month, number>;
  total: number;
}

export interface BudgetMetadata {
  updatedDate: string;
  realBalance: number;
  spreadsheetBalance: number;
  currency: string;
}

export interface BudgetData {
  metadata: BudgetMetadata;
  income: Record<string, BudgetEntry>;
  expenses: Record<string, BudgetEntry>;
  balance: BudgetEntry;
}

export const budgetData: BudgetData = {
  "metadata": {
    "updatedDate": "",
    "realBalance": 0,
    "spreadsheetBalance": 0,
    "currency": "BRL"
  },
  "income": {
    "Receita": {
      "monthlyValues": {
        "Jan": 5000, "Fev": 5000, "Mar": 5000, "Abr": 5500, "Mai": 5000, "Jun": 5000,
        "Jul": 5000, "Ago": 5000, "Set": 5500, "Out": 5000, "Nov": 5000, "Dez": 6000
      },
      "total": 62000
    }
  },
  "expenses": {
    "Gastos Total": {
      "monthlyValues": {
        "Jan": -3500, "Fev": -3200, "Mar": -3800, "Abr": -3500, "Mai": -3200, "Jun": -3500,
        "Jul": -3800, "Ago": -3500, "Set": -3200, "Out": -3500, "Nov": -3800, "Dez": -4500
      },
      "total": -40500
    },
    "Alimentação": {
      "monthlyValues": {
        "Jan": 800, "Fev": 750, "Mar": 900, "Abr": 800, "Mai": 750, "Jun": 800,
        "Jul": 900, "Ago": 800, "Set": 750, "Out": 800, "Nov": 900, "Dez": 1000
      },
      "total": 10000
    },
    "Cartão de Crédito": {
      "monthlyValues": {
        "Jan": 500, "Fev": 450, "Mar": 600, "Abr": 500, "Mai": 450, "Jun": 500,
        "Jul": 600, "Ago": 500, "Set": 450, "Out": 500, "Nov": 600, "Dez": 800
      },
      "total": 6700
    },
    "Compras": {
      "monthlyValues": {
        "Jan": 200, "Fev": 150, "Mar": 300, "Abr": 200, "Mai": 150, "Jun": 200,
        "Jul": 300, "Ago": 200, "Set": 150, "Out": 200, "Nov": 300, "Dez": 400
      },
      "total": 2800
    },
    "Contas": {
      "monthlyValues": {
        "Jan": 600, "Fev": 600, "Mar": 600, "Abr": 600, "Mai": 600, "Jun": 600,
        "Jul": 600, "Ago": 600, "Set": 600, "Out": 600, "Nov": 600, "Dez": 700
      },
      "total": 7300
    },
    "Contas (Casa Erm.)": {
      "monthlyValues": {
        "Jan": 500, "Fev": 500, "Mar": 500, "Abr": 500, "Mai": 500, "Jun": 500,
        "Jul": 500, "Ago": 500, "Set": 500, "Out": 500, "Nov": 500, "Dez": 600
      },
      "total": 6100
    },
    "Diversão": {
      "monthlyValues": {
        "Jan": 200, "Fev": 150, "Mar": 200, "Abr": 200, "Mai": 150, "Jun": 200,
        "Jul": 200, "Ago": 200, "Set": 150, "Out": 200, "Nov": 200, "Dez": 300
      },
      "total": 2400
    },
    "Farmácia": {
      "monthlyValues": {
        "Jan": 100, "Fev": 100, "Mar": 150, "Abr": 100, "Mai": 100, "Jun": 100,
        "Jul": 150, "Ago": 100, "Set": 100, "Out": 100, "Nov": 150, "Dez": 150
      },
      "total": 1400
    },
    "Gastos Extras": {
      "monthlyValues": {
        "Jan": 200, "Fev": 150, "Mar": 250, "Abr": 200, "Mai": 150, "Jun": 200,
        "Jul": 250, "Ago": 200, "Set": 150, "Out": 200, "Nov": 250, "Dez": 300
      },
      "total": 2800
    },
    "Tarifas Bancárias": {
      "monthlyValues": {
        "Jan": 50, "Fev": 50, "Mar": 50, "Abr": 50, "Mai": 50, "Jun": 50,
        "Jul": 50, "Ago": 50, "Set": 50, "Out": 50, "Nov": 50, "Dez": 50
      },
      "total": 600
    },
    "Tom Penha": {
      "monthlyValues": {
        "Jan": 150, "Fev": 150, "Mar": 150, "Abr": 150, "Mai": 150, "Jun": 150,
        "Jul": 150, "Ago": 150, "Set": 150, "Out": 150, "Nov": 150, "Dez": 150
      },
      "total": 1800
    },
    "Investimentos": {
      "monthlyValues": {
        "Jan": 200, "Fev": 200, "Mar": 200, "Abr": 200, "Mai": 200, "Jun": 200,
        "Jul": 200, "Ago": 200, "Set": 200, "Out": 200, "Nov": 200, "Dez": 200
      },
      "total": 2400
    }
  },
  "balance": {
    "monthlyValues": {
      "Jan": 1500, "Fev": 1800, "Mar": 1200, "Abr": 2000, "Mai": 1800, "Jun": 1500,
      "Jul": 1200, "Ago": 1500, "Set": 2300, "Out": 1500, "Nov": 1200, "Dez": 1500
    },
    "total": 21500
  }
};