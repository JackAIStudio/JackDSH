/**
 * 精选自研插件清单（构建期复制进 bundle-runtime/plugins，运行期注册进隔离 profile）。
 * 准入标准：纯源码可直跑、依赖能被 App 内置 hoisted node_modules 覆盖
 * （undici / @earendil-works/pi-ai / @deepseek-ai/* / react 等），
 * 不含原生编译模块（如 node-pty），保证 Electron-as-Node 运行时可直接加载。
 */
export const OWN_PLUGINS = [
  'dsh-mobile-plus',
  'dsh-gemini-oauth',
  'dsh-grok-oauth',
  'dsh-deepseek-balance',
  'dsh-today',
  'dsh-web-restart',
  'dsh-workspace-path',
  'dsh-robust-search',
  'dsh-reminder',
  'dsh-app-badge',
  'dsh-session-navigator',
  'dsh-plugin-dashboard',
  'dsh-web-search-follow',
  'dsh-workbuddy-dual',
  'dsh-paste-path',
  'dsh-autostart',
  'dsh-turn-bookmarks',
  'dsh-image-fit',
]

/**
 * 精选社区开源插件（同样内置预装进一键安装包，开箱即用）
 */
export const COMMUNITY_PLUGINS = [
  '@mlgbnb/dsh-archive-manager',
  '@wxg-prc-cpg/browser-skill-dsh-plugin',
]

export const ALL_BUILTIN_PLUGINS = [
  ...OWN_PLUGINS,
  ...COMMUNITY_PLUGINS,
]
