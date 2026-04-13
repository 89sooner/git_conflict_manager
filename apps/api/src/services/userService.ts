import type { UserProfile } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import type { AuthContext } from '../plugins/auth.js';

export class UserService extends BaseService {
  currentProfile(auth: AuthContext): UserProfile {
    return {
      user: auth.user,
      permissions: auth.permissions,
    };
  }
}
