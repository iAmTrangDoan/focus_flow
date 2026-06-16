import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';


export const ROLES_KEY = 'roles';

/**
 * Decorator gắn metadata role lên route handler.
 *
 * Sử dụng: @Roles(Role.ADMIN)
 * Kết hợp với RolesGuard để phân quyền.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
