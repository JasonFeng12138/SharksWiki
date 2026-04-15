## 前端架构
frontend/src/
├── i18n/
│   └── translations.ts        # 所有多语言字符串配置文件
├── types/
│   └── index.ts               # ModalState、NewUserForm 等共享类型
├── utils/
│   └── fileTree.ts            # findFirstFile、findNodeByPath 工具函数
├── components/
│   ├── FileTreeNode.tsx        # 文件树节点（递归）
│   ├── Sidebar.tsx             # 侧边栏（内部管理菜单状态）
│   ├── MainContent.tsx         # 主内容区 + 目录（内部管理标题提取）
│   └── modals/
│       ├── OperationModal.tsx  # 创建/删除文件夹&文档
│       ├── SettingsModal.tsx   # 用户设置（主题、语言、退出）
│       ├── WikiSettingsModal.tsx # Wiki 管理（配置 + 用户管理）
│       └── LoginModal.tsx      # 登录
└── App.tsx                     # 仅保留状态管理和事件处理（~250 行）