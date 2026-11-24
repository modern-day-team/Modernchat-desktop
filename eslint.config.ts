import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// 桌面端配置与主仓库 web 同体系（src 为 Vue 3 + TS 前端）。
export default defineConfigWithVueTs(
  {
    name: 'desktop/files-to-lint',
    files: ['src/**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/src-tauri/target/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
