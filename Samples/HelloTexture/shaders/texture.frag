#version 450

layout(location = 0) in vec2 frag_uv;
layout(location = 0) out vec4 out_color;

// Separate texture + sampler (not a combined sampler2D) -- see
// ../../../README.md: SPUDGPU_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER doesn't
// cross-compile to MSL under SpudGPU's per-set-argument-buffer scheme below
// Metal 3 (SPIRV-Cross treats the synthesized sampler as an aliased overlap
// of the texture's own binding), so this port uses the same split
// SAMPLED_IMAGE + SAMPLER idiom SpudGPUDynamicIndexing's bindless design
// already established.
layout(set = 0, binding = 0) uniform texture2D tex;
layout(set = 0, binding = 1) uniform sampler samp;

void main() {
    out_color = texture(sampler2D(tex, samp), frag_uv);
}
