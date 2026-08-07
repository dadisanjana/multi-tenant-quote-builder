import { Injectable } from '@nestjs/common';
import { Quote, User } from './models';
import { quotes as seededQuotes, users as seededUsers } from './seed';

const clone = <T>(value: T): T => structuredClone(value);

@Injectable()
export class StoreService {
  private readonly users: User[] = clone(seededUsers);
  private quotes: Quote[] = clone(seededQuotes);

  findUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  listQuotesByOrganization(organizationId: string): Quote[] {
    return this.quotes
      .filter((quote) => quote.organizationId === organizationId)
      .map(clone);
  }

  findQuoteByIdAndOrganization(
    quoteId: string,
    organizationId: string,
  ): Quote | undefined {
    const quote = this.quotes.find(
      (candidate) =>
        candidate.id === quoteId &&
        candidate.organizationId === organizationId,
    );
    return quote ? clone(quote) : undefined;
  }

  insertQuote(quote: Quote): Quote {
    this.quotes.push(clone(quote));
    return clone(quote);
  }

  replaceQuote(quote: Quote): Quote {
    const index = this.quotes.findIndex(
      (candidate) =>
        candidate.id === quote.id &&
        candidate.organizationId === quote.organizationId,
    );

    if (index === -1) {
      throw new Error('Quote missing during replace');
    }

    this.quotes[index] = clone(quote);
    return clone(quote);
  }
}
