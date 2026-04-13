import type { FastifyInstance } from 'fastify';
import type { UserProfileResponse } from '@gsp/shared-types';
import { ApiError } from '../lib/errors.js';
import { UserService } from '../services/userService.js';

export function registerMeRoutes(app: FastifyInstance) {
  app.get('/api/v1/me', async (request): Promise<UserProfileResponse> => {
    if (!request.auth) {
      throw new ApiError({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const service = new UserService({ requestId: request.id, logger: request.log });
    const profile = service.currentProfile(request.auth);

    return {
      data: profile,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });
}
