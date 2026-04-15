import { cn } from '../../lib/utils';
import type { ModalState } from '../../types';
import type { TranslationKey } from '../../i18n/translations';

const OPERATION_TYPES = ['createFile', 'createFolder', 'deleteFile', 'deleteFolder'] as const;
type OperationType = (typeof OPERATION_TYPES)[number];

interface OperationModalProps {
  modalState: ModalState;
  modalInput: string;
  onSetModalInput: (val: string) => void;
  onSetModal: (state: ModalState) => void;
  onSubmit: (e: React.FormEvent) => void;
  t: (key: TranslationKey) => string;
}

export function OperationModal({
  modalState, modalInput, onSetModalInput, onSetModal, onSubmit, t,
}: OperationModalProps) {
  if (!OPERATION_TYPES.includes(modalState.type as OperationType)) return null;

  const isDelete = modalState.type === 'deleteFile' || modalState.type === 'deleteFolder';

  const title = {
    createFile: t('createDoc'),
    createFolder: t('createFolder'),
    deleteFile: t('deleteDoc'),
    deleteFolder: t('deleteFolder'),
  }[modalState.type as OperationType];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <form onSubmit={onSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">{title}</h3>

            {(modalState.type === 'createFile' || modalState.type === 'createFolder') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('name')}
                </label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => onSetModalInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    modalState.type === 'createFile'
                      ? t('docNamePlaceholder')
                      : t('folderNamePlaceholder')
                  }
                  autoFocus
                  required
                />
                {modalState.parentPath && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('willBeCreatedIn')}{' '}
                    <span className="font-mono">{modalState.parentPath}/</span>
                  </p>
                )}
              </div>
            )}

            {(modalState.type === 'deleteFile' || modalState.type === 'deleteFolder') && (
              <p className="text-gray-600 dark:text-gray-300">
                {t('areYouSureDelete')}{' '}
                <span className="font-semibold">{modalState.path}</span>?
                {modalState.type === 'deleteFolder' && ` ${t('deleteFolderWarning')}`}
                <br />
                <br />
                {t('cannotBeUndone')}
              </p>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { onSetModal({ type: 'none' }); onSetModalInput(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-md transition-colors',
                isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700',
              )}
            >
              {isDelete ? t('delete') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
