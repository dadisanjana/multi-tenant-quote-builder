import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { TenantRequest } from './tenant-context';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly store: StoreService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const rawUserId = request.header('X-User-Id');

    if (!rawUserId) {
      throw new UnauthorizedException('X-User-Id header is required');
    }

    const user = this.store.findUserById(rawUserId);
    if (!user) {
      throw new UnauthorizedException('Unknown user');
    }

    request.tenant = {
      userId: user.id,
      organizationId: user.organizationId,
    };

    return true;
  }
}
