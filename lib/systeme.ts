interface SystemeContact {
  id: number;
  email: string;
  createdAt: string;
  tags: { name: string }[];
  fields: Record<string, string>;
}

interface SystemeOrder {
  id: number;
  contactId: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  items: { name: string }[];
}

export class SystemeClient {
  private baseUrl = "https://api.systeme.io/api";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": this.apiKey },
    });
    if (!res.ok) throw new Error(`Systeme.io API error: ${res.status}`);
    return res.json();
  }

  async getContacts(startDate: string, endDate: string): Promise<SystemeContact[]> {
    const data = await this.fetch<{ items: SystemeContact[] }>("/contacts", {
      createdAfter: startDate,
      createdBefore: endDate,
    });
    return data.items || [];
  }

  async getOrders(startDate: string, endDate: string): Promise<SystemeOrder[]> {
    const data = await this.fetch<{ items: SystemeOrder[] }>("/orders", {
      createdAfter: startDate,
      createdBefore: endDate,
    });
    return data.items || [];
  }

  async getTags(): Promise<{ name: string; count: number }[]> {
    const data = await this.fetch<{ items: { name: string; contactCount: number }[] }>("/contacts/tags");
    return (data.items || []).map((t) => ({ name: t.name, count: t.contactCount }));
  }
}
