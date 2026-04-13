import { Request } from 'express';

export interface Permissions {
  can_create_dir: boolean;
  can_add_file: boolean;
  can_delete_file: boolean;
  can_edit_file: boolean;
  can_comment: boolean;
}

export interface AuthUser {
  user_id: number;
  account: string;
  anonymous_name: string;
  permissions: Permissions;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
