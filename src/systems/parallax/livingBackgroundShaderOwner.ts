import Phaser from 'phaser';

export function hasOwnedShaderProgram(shader: Phaser.GameObjects.Shader): boolean {
  return Object.keys(shader.renderNode.programManager.programs).length > 0;
}

export function bindOwnedShaderCleanup(shader: Phaser.GameObjects.Shader): void {
  const node = shader.renderNode;
  shader.once(Phaser.GameObjects.Events.DESTROY, () => {
    // Phaser 4.2.1 clears Shader.renderNode without releasing its private buffer/VAOs. Compiled programs are shared.
    const entries: unknown[] = Object.values(node.programManager.programs);
    for (const entry of entries) {
      if (typeof entry !== 'object' || entry === null || !('vao' in entry)) continue;
      const vao = entry.vao;
      if (!(vao instanceof Phaser.Renderer.WebGL.Wrappers.WebGLVAOWrapper)) continue;
      Phaser.Utils.Array.Remove(node.renderer.glVAOWrappers, vao);
      vao.destroy();
    }
    node.renderer.deleteBuffer(node.vertexBufferLayout.buffer);
  });
}
