# SpudGPU Samples

Ports of the [`microsoft/DirectX-Graphics-Samples`](https://github.com/microsoft/DirectX-Graphics-Samples)
(cloned alongside this repo as `../d3d12samples`) rebuilt against **SpudGPU**
(`spudlib`'s GPU HAL module) instead of raw D3D12/DXGI. Each sample under
`Samples/` mirrors one sample from `d3d12samples/Samples/Desktop/` as closely
as its feature set allows, replacing every `ID3D12*`/DXGI call with the
equivalent `spudgpu_*` call.

The point isn't a demo reel — it's a maturity test for SpudLib. Every sample
that ports cleanly validates a slice of SpudGPU's API; every sample that
*can't* port (no raytracing pipeline, no VRS, no cross-adapter API as of this
writing) is a concrete, prioritized gap to close in `spudlib` itself — not a
workaround to invent here.

## Status

| Sample | D3D12 source | Status |
|---|---|---|
| HelloTriangle | `D3D12HelloWorld/HelloTriangle` | Ported |
| HelloConstBuffers | `D3D12HelloWorld/HelloConstBuffers` | Ported |
| SpudGPUExecuteIndirect | `D3D12ExecuteIndirect` | Ported (see note below) |
| SpudGPUDynamicIndexing | `D3D12DynamicIndexing` | Ported, Vulkan/D3D12 only (see note below) |
| SpudGPUMeshShaders | `D3D12MeshShaders/MeshletRender` | Ported, all backends (see note below) |

`SpudGPUExecuteIndirect` closed a real gap: `spudgpu` had no compute-dispatch
call at all, and no buffer pipeline barriers on any backend, both now added
alongside `spudgpu_cmd_draw_indirect`/`_indexed_indirect`. The port itself
deviates from the original in two deliberate, documented ways:

- **No GPU-side compaction.** The original appends visible triangles into a
  tightly-packed buffer (an HLSL `AppendStructuredBuffer`, i.e. a UAV atomic
  counter) and issues a GPU-authored *variable* draw count
  (`ExecuteIndirect`'s count-buffer argument / `vkCmdDrawIndirectCount`).
  Metal has no equivalent primitive for that shape — a GPU-authored variable
  indirect draw count needs an `MTLIndirectCommandBuffer`, a structurally
  different object encoded via its own API. This port's compute pass instead
  writes one draw-args entry per triangle at a fixed index (zeroed
  `vertex_count` for a culled triangle), and the renderer always issues a
  single fixed-count `spudgpu_cmd_draw_indirect` — fully portable, same
  demonstrated mechanism (a compute pass decides per-triangle what gets
  drawn), just without the bandwidth-compaction optimization.
- **No per-draw root CBV update.** The original's command signature updates a
  root constant-buffer-view descriptor per draw, alongside the draw itself —
  a D3D12-specific indirect-argument shape with no Vulkan/Metal equivalent.
  This port bakes each triangle's index into its draw's `first_instance`
  instead (`instance_count = 1`), the standard portable technique — all three
  APIs surface this back to the vertex shader as the instance-ID system
  value, so it reads its own per-triangle data from a storage buffer with no
  vendor extension needed.

`SpudGPUDynamicIndexing` exercises `spudgpu`'s bindless descriptor indexing
feature for the first time (`spudgpu_bindless_register_sampled_image`,
`spudgpu_cmd_bind_bindless_resources`, ...) — a 15x8 grid of building meshes,
each dynamically indexing into one shared unbounded texture table for its own
procedurally-generated material color. That feature was already fully
implemented on Vulkan/D3D12 before this port (just never exercised by a
sample); the one real gap this port closed was **SpudGPU had no sampler
object on any backend** — now added (`spudgpu_create_sampler`). Bindless is
`0` on Metal (needs a `MTLHeap`-backed allocator SpudGPU doesn't have yet —
see `spudlib/CLAUDE.md`), so this sample only builds against Vulkan/D3D12;
`spudgpusamples/CMakeLists.txt` skips it entirely when
`GRAPHICS_BACKEND=Metal`. One deliberate simplification: the original's
diffuse texture is `BC1_UNORM` (block-compressed); this port decodes it to
plain `R8G8B8A8_UNORM` on the CPU at load time rather than exercising
`spudgpu`'s (real, but never-yet-uploaded-to) BC1 format support, to avoid
stacking an unverified compressed-texture-upload path on top of bindless
textures, a real sampler, and a real depth buffer all being exercised for
the first time in one sample.

`SpudGPUMeshShaders` closed the biggest remaining gap this suite tracked:
`spudgpu` had no mesh-shader pipeline at all (mesh shaders replace
vertex-fetch/input-assembly entirely with a shader stage that emits meshlet
geometry directly) — now added on **all three** backends (`VK_EXT_mesh_shader`
on Vulkan, a hand-rolled `D3D12_PIPELINE_STATE_STREAM_DESC` on D3D12 since the
vendored `d3dx12.h` predates Microsoft's own mesh-PSO helpers, and
`MTLMeshRenderPipelineDescriptor` on Metal), gated behind the new
`SPUDGPU_EXT_MESH_SHADING` — see `spudlib/CLAUDE.md` for why this `EXT` is a
different flavor from bindless's (the macro is `1` everywhere; it's *runtime*
driver/hardware support that varies, surfaced via
`spudgpu_get_mesh_shading_capabilities`). The sample renders the real
`Dragon_LOD0.bin` meshlet asset shipped with the original D3D12 sample,
one GLSL mesh shader (`GL_EXT_mesh_shader`) cross-compiled to all three
targets exactly like every other sample's shaders. One deliberate,
documented gap: **no `spudgpu_cmd_copy_buffer` exists yet** (buffer-to-buffer
copy, added to no backend so far), so the "textbook" pattern of staging CPU
data through a `TRANSFER_SRC` staging buffer into a `DEVICE_LOCAL` buffer
isn't available. This sample instead creates its four meshlet data buffers
as `HOST_VISIBLE | HOST_COHERENT | STORAGE` directly and memcpy's into them —
correct and fully portable on Vulkan/Metal, but **not valid on D3D12**, where
an UPLOAD-heap resource can't carry `D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS`
(which `SPUDGPU_BUFFER_USAGE_STORAGE` always adds on that backend) — this
sample is therefore Vulkan/Metal-verified only; D3D12 needs
`spudgpu_cmd_copy_buffer` before it can run there at all.

See `../spudlib/CLAUDE.md` and `../CLAUDE.md` for the architecture this
repo sits alongside.

## Building

Each sample is a standalone executable target linking `spudlib`. Windowing
and surface creation use SDL3 + `spudgpu_sdl3.h` (the same approach as
`Erethal_SDL3_ImGui`), so samples build and run identically on Windows and
Linux. Pick a graphics backend via the `GRAPHICS_BACKEND` cache variable
(`Vulkan` or `D3D12`), same as `spudlib` itself.

```
cmake --preset windows-vulkan   # or windows-d3d12
cmake --build build-windows-vulkan --target HelloTriangle
```

On Apple Silicon, samples also build and run against `GRAPHICS_BACKEND=Metal`
(see `spudlib/CLAUDE.md`) — except `SpudGPUDynamicIndexing`, which needs
bindless descriptor indexing and isn't buildable on Metal yet (see above).
