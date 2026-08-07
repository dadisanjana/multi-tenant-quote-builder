import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../common/tenant.guard';
import { TenantRequest } from '../common/tenant-context';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(TenantGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Req() request: TenantRequest, @Body() body: CreateQuoteDto) {
    return this.quotesService.create(request.tenant.organizationId, body);
  }

  @Get()
  list(@Req() request: TenantRequest) {
    return this.quotesService.list(request.tenant.organizationId);
  }

  @Get(':id')
  get(@Req() request: TenantRequest, @Param('id') quoteId: string) {
    return this.quotesService.get(request.tenant.organizationId, quoteId);
  }

  @Patch(':id')
  update(
    @Req() request: TenantRequest,
    @Param('id') quoteId: string,
    @Body() body: UpdateQuoteDto,
  ) {
    return this.quotesService.update(
      request.tenant.organizationId,
      quoteId,
      body,
    );
  }
}
