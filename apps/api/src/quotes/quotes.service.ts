import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Quote, Section } from '../store/models';
import { StoreService } from '../store/store.service';
import {
  CreateQuoteDto,
  LineItemInputDto,
  SectionInputDto,
  UpdateQuoteDto,
} from './dto/quote.dto';
import { presentQuote, QuoteView } from './totals';

@Injectable()
export class QuotesService {
  constructor(private readonly store: StoreService) {}

  list(organizationId: string) {
    return this.store.listQuotesByOrganization(organizationId).map((quote) => {
      const view = presentQuote(quote);
      return {
        id: view.id,
        customerName: view.customerName,
        status: view.status,
        total: view.totals.total,
        updatedAt: view.updatedAt,
      };
    });
  }

  get(organizationId: string, quoteId: string): QuoteView {
    return presentQuote(this.requireTenantQuote(organizationId, quoteId));
  }

  create(organizationId: string, input: CreateQuoteDto): QuoteView {
    this.validateDiscount(input.discount ?? null);
    const now = new Date().toISOString();
    const quote: Quote = {
      id: randomUUID(),
      organizationId,
      customerName: input.customerName,
      status: input.status ?? 'draft',
      taxRate: input.taxRate,
      discount: input.discount ?? null,
      sections: input.sections.map((section) => this.newSection(section)),
      createdAt: now,
      updatedAt: now,
    };

    return presentQuote(this.store.insertQuote(quote));
  }

  update(
    organizationId: string,
    quoteId: string,
    input: UpdateQuoteDto,
  ): QuoteView {
    const existing = this.requireTenantQuote(organizationId, quoteId);
    this.validateDiscount(input.discount === undefined ? existing.discount : input.discount);

    const updated: Quote = {
      ...existing,
      customerName: input.customerName ?? existing.customerName,
      status: input.status ?? existing.status,
      taxRate: input.taxRate ?? existing.taxRate,
      discount: input.discount === undefined ? existing.discount : input.discount,
      sections:
        input.sections === undefined
          ? existing.sections
          : this.replaceNestedSections(existing.sections, input.sections),
      updatedAt: new Date().toISOString(),
    };

    return presentQuote(this.store.replaceQuote(updated));
  }

  private requireTenantQuote(organizationId: string, quoteId: string): Quote {
    const quote = this.store.findQuoteByIdAndOrganization(quoteId, organizationId);
    if (!quote) {
      // 404 intentionally avoids revealing whether another tenant owns this ID.
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  private newSection(input: SectionInputDto): Section {
    return {
      id: randomUUID(),
      name: input.name,
      markupPercent: input.markupPercent ?? null,
      lineItems: input.lineItems.map((lineItem) => this.newLineItem(lineItem)),
    };
  }

  private newLineItem(input: LineItemInputDto) {
    return {
      id: randomUUID(),
      description: input.description,
      quantity: input.quantity,
      unitPriceCents: Math.round(input.unitPrice * 100),
    };
  }

  private replaceNestedSections(
    existingSections: Section[],
    incomingSections: SectionInputDto[],
  ): Section[] {
    return incomingSections.map((incomingSection) => {
      if (!incomingSection.id) {
        return this.newSection(incomingSection);
      }

      const existingSection = existingSections.find(
        (section) => section.id === incomingSection.id,
      );
      if (!existingSection) {
        throw new BadRequestException(`Unknown section id: ${incomingSection.id}`);
      }

      return {
        id: existingSection.id,
        name: incomingSection.name,
        markupPercent: incomingSection.markupPercent ?? null,
        lineItems: incomingSection.lineItems.map((incomingLineItem) => {
          if (!incomingLineItem.id) {
            return this.newLineItem(incomingLineItem);
          }

          const existingLineItem = existingSection.lineItems.find(
            (lineItem) => lineItem.id === incomingLineItem.id,
          );
          if (!existingLineItem) {
            throw new BadRequestException(
              `Unknown line item id for section ${existingSection.id}: ${incomingLineItem.id}`,
            );
          }

          return {
            id: existingLineItem.id,
            description: incomingLineItem.description,
            quantity: incomingLineItem.quantity,
            unitPriceCents: Math.round(incomingLineItem.unitPrice * 100),
          };
        }),
      };
    });
  }

  private validateDiscount(discount: Quote['discount'] | undefined | null) {
    if (discount?.type === 'percentage' && discount.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
  }
}
