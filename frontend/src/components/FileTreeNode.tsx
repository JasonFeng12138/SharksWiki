import { useState } from 'react';
import {
  FileText, Folder, FolderOpen, ChevronRight, ChevronDown,
  FilePlus, FolderPlus, Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { FileNode, User, ModalState } from '../types';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  selectedDoc: string | null;
  isEditing: boolean;
  currentUser: User | null;
  onSelectDoc: (path: string) => void;
  onSetModal: (state: ModalState) => void;
  onSetModalInput: (val: string) => void;
}

export function FileTreeNode({
  node, level, selectedDoc, isEditing, currentUser,
  onSelectDoc, onSetModal, onSetModalInput,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isDir = node.type === 'directory';
  const isSelected = selectedDoc === node.path;

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer transition-colors',
          isSelected
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100',
          isEditing && !isSelected && 'opacity-50 cursor-not-allowed',
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (isDir) setIsExpanded(!isExpanded);
          else if (!isEditing) onSelectDoc(node.path);
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {isDir ? (
            <span className="text-gray-400">
              {isExpanded
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </span>
          ) : (
            <span className="w-4" />
          )}
          {isDir
            ? isExpanded
              ? <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
              : <Folder className="w-4 h-4 text-blue-500 shrink-0" />
            : <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
          <span className="text-sm truncate">
            {isDir ? node.name : node.name.replace(/\.md$/, '')}
          </span>
        </div>

        {!isEditing && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isDir && (
              <>
                {currentUser?.permissions.can_add_file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetModal({ type: 'createFile', parentPath: node.path });
                      onSetModalInput('');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded"
                    title="New File"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                )}
                {currentUser?.permissions.can_create_dir && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetModal({ type: 'createFolder', parentPath: node.path });
                      onSetModalInput('');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded"
                    title="New Folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {currentUser?.permissions.can_delete_file && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetModal(
                    isDir
                      ? { type: 'deleteFolder', path: node.path }
                      : { type: 'deleteFile', path: node.path },
                  );
                }}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {isDir && isExpanded && node.children && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedDoc={selectedDoc}
              isEditing={isEditing}
              currentUser={currentUser}
              onSelectDoc={onSelectDoc}
              onSetModal={onSetModal}
              onSetModalInput={onSetModalInput}
            />
          ))}
        </div>
      )}
    </div>
  );
}
