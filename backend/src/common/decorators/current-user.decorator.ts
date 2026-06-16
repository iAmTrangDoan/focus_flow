import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator để lấy thông tin user hiện tại từ request.
 *
 * Sử dụng:
 *   @CurrentUser()      — trả toàn bộ user object
 *   @CurrentUser('id')  — trả field cụ thể
 */
export const CurrentUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        return data ? user?.[data] : user;
    },
);
