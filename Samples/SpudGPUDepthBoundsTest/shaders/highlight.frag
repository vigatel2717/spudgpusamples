#version 450

// Deliberately ignores the vertex color varying triangle.vert still emits --
// see ../../README.md's SpudGPUDepthBoundsTest section for why the
// depth-bounds-tested pass uses a fixed highlight color instead of the
// D3D12 original's colorless depth-only priming pass.
layout(location = 0) out vec4 out_color;

void main() {
    out_color = vec4(1.0, 1.0, 1.0, 1.0);
}
