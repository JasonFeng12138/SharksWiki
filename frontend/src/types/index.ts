// Re-export service types for convenience
export type { User, FileNode, UserListItem, UserListResponse, PermissionGroup, Permission, WikiConfig } from '../services/api';

/** 模态框状态联合类型 */
export type ModalState =
  | { type: 'none' }
  | { type: 'createFile'; parentPath: string }
  | { type: 'createFolder'; parentPath: string }
  | { type: 'deleteFile'; path: string }
  | { type: 'deleteFolder'; path: string }
  | { type: 'settings' }
  | { type: 'wikiSettings' }
  | { type: 'login' };

export type WikiSettingsTab = 'config' | 'users' | 'addUser' | 'groups';

/** 新建用户表单数据 */
export interface NewUserForm {
  account: string;
  name: string;
  password: string;
  group_id: number | null;
}

export const EMPTY_NEW_USER_FORM: NewUserForm = {
  account: '',
  name: '',
  password: '',
  group_id: null,
};
