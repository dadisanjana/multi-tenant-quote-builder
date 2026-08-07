import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DiscountType, QuoteStatus } from '../../store/models';

export class DiscountDto {
  @IsIn(['percentage', 'fixed'])
  type: DiscountType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;
}

export class LineItemInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}

export class SectionInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  markupPercent?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemInputDto)
  lineItems: LineItemInputDto[];
}

export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsIn(['draft', 'sent', 'accepted'])
  status?: QuoteStatus;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  sections: SectionInputDto[];
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerName?: string;

  @IsOptional()
  @IsIn(['draft', 'sent', 'accepted'])
  status?: QuoteStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  sections?: SectionInputDto[];
}
