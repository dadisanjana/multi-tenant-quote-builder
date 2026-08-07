import { Request } from 'express';

export interface TenantContext {
  userId: string;
  organizationId: string;
}

export interface TenantRequest extends Request {
  tenant: TenantContext;
}
