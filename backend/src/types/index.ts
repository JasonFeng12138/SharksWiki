import { Request } from 'express';

export interface Permissions {
  can_read: boolean;
  can_comment: boolean;
  can_add_file: boolean;
  can_edit_file: boolean;
  can_create_dir: boolean;
  can_delete_file: boolean;
  can_admin: boolean;
}

export const EMPTY_PERMISSIONS: Permissions = {
  can_read: false,
  can_comment: false,
  can_add_file: false,
  can_edit_file: false,
  can_create_dir: false,
  can_delete_file: false,
  can_admin: false,
};

export interface AuthUser {
  user_id: number;
  account: string;
  anonymous_name: string;
  permissions: Permissions;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
