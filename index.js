/**
 * dsh-sql-tuner · Host 半边
 *
 * 面板的全部能力都在浏览器侧（engine.js 的分析是纯函数，内联进了 client.js），
 * Host 这一行只负责让 bundle 出现在插件的清单里，不挂路由、不碰网络、不注册工具。
 */

export const name = 'dsh-sql-tuner'

export function apply(ctx) {
  ctx.logger?.info?.('[dsh-sql-tuner] panel registered on the client side')
}
