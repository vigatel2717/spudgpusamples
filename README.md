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
| SpudGPUBundles | `D3D12Bundles` | Ported, Vulkan/D3D12 only (see note below) |
| SpudGPUDepthBoundsTest | `D3D12DepthBoundsTest` | Ported, Vulkan/D3D12 only (see note below) |

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

`SpudGPUBundles` closed the last real gap `SPUDGPU_COMMAND_LIST_TYPE_BUNDLE`
had been sitting on since it was added to the base command-list-type enum:
the type existed and D3D12's allocator/list creation already honored it, but
nothing could actually *execute* a bundle once recorded. Now added, gated
behind the new `SPUDGPU_EXT_BUNDLES` (`spudgpu_begin_bundle_command_list`,
`spudgpu_cmd_execute_bundle`) — `1` on Vulkan/D3D12, `0` on Metal, the same
flavor of `EXT` as bindless (a structural capability gap, not a runtime
driver check): Metal's `MTLCommandBuffer`/`MTLRenderCommandEncoder` are
single-use, so there's no CPU-side reusable secondary-command mechanism to
record a bundle into at all. D3D12's implementation is the straightforward
native case (`ID3D12GraphicsCommandList::ExecuteBundle`); Vulkan's bundle is
a `VK_COMMAND_BUFFER_LEVEL_SECONDARY` buffer replayed via
`vkCmdExecuteCommands`, which — since this codebase is dynamic-rendering-only
(no `VkRenderPass`) — needed `VkCommandBufferInheritanceRenderingInfo` wired
through a new `spudgpu_begin_bundle_command_list`/`spudgpu_bundle_inheritance_
desc` (the attachment formats a secondary buffer will replay under, since
there's no framebuffer object to infer them from) plus a new
`will_execute_bundles` flag on `spudgpu_rendering_begin_desc` so the primary
list's `vkCmdBeginRendering` opens with
`VK_RENDERING_CONTENTS_SECONDARY_COMMAND_BUFFERS_BIT` only when the caller
actually intends to execute one — SpudLib never infers that on the caller's
behalf (see `spudlib/CLAUDE.md`'s zero-policy rule). The sample itself
demonstrates the mechanism the original does: a `CityRowCount x
CityColumnCount` (10x3) grid of `occcity` buildings (the same asset
`SpudGPUDynamicIndexing` uses), each with its own per-object CBV, drawn
either by replaying one bundle recorded once at startup (default) or by
re-recording the identical bind+draw sequence into the direct command list
every frame — press `C` to toggle, matching the original's own keybinding.
Two deliberate simplifications versus the original: no diffuse texture (this
sample isn't about texturing — each building instead gets a fixed
HSL-gradient color baked into its CBV, so it only exercises the bundle
mechanism itself), and single-buffered CBV storage overwritten in place every
frame, matching every other sample in this suite, rather than the original's
3 rotating `FrameResource`s — the bundle's recorded descriptor-set bindings
point at fixed buffer offsets regardless, so this doesn't touch the actual
mechanism being demonstrated.

`SpudGPUDepthBoundsTest` closed a gap that had sat unaddressed since the very
first sample: `spudgpu` had no depth bounds test at all — a mechanism, distinct
from the ordinary per-fragment depth test, that discards a fragment based on
whether the depth attachment's *existing* value at that pixel (already
written by an earlier draw) falls inside a caller-set `[min, max]` window, set
per-draw via the new `spudgpu_cmd_set_depth_bounds`. Added on Vulkan
(`VkPhysicalDeviceFeatures::depthBounds` + `vkCmdSetDepthBounds`, both core
1.0, no extension) and D3D12 (`D3D12_DEPTH_STENCIL_DESC1::
DepthBoundsTestEnable` + `ID3D12GraphicsCommandList1::OMSetDepthBounds`),
gated behind the new `SPUDGPU_EXT_DEPTH_BOUNDS_TEST` — `1` on Vulkan/D3D12,
`0` on Metal, which has no depth-bounds-test primitive on either
`MTLDepthStencilDescriptor` or `MTLRenderCommandEncoder` at all (a structural
gap, the same flavor as bindless/bundles), so this sample only builds against
Vulkan/D3D12. Adding `DepthBoundsTestEnable` to D3D12's pipeline creation also
closed a smaller, adjacent gap: that field only exists on
`D3D12_DEPTH_STENCIL_DESC1`, reachable only through `CreatePipelineState`'s
PSO-stream path — `spudgpu_create_shader_pipeline`'s classic (non-mesh)
pipeline path was still going through the older `CreateGraphicsPipelineState`/
`D3D12_GRAPHICS_PIPELINE_STATE_DESC`, so it now builds a
`CD3DX12_PIPELINE_STATE_STREAM1` from that same desc instead (a lossless,
purely additive upgrade — see `spudgpud3d12shader.cpp`) rather than
maintaining two divergent pipeline-creation paths.

The port itself deviates from the original in one deliberate, documented way:
**no colorless depth-only priming pass.** The D3D12 original's first draw
uses a PSO with no pixel shader at all (`DEPTH_ONLY_PSO_STREAM` has no `PS`
subobject) purely to write real per-vertex depth into the depth buffer without
touching the render target's color. `spudgpu_create_shader_pipeline` requires
a fragment module on every pipeline (`SPUDRESULT_GPU_VERTEX_AND_FRAGMENT_
SHADER_REQUIRED` otherwise) — lifting that would mean threading an optional
fragment stage (and, to fully match the original's *visual* result, a
color-write-mask override neither backend's `spudgpu_blend_attachment_desc`
exposes yet) through both backends for a single sample's sake. Instead, this
port's priming pass renders the triangle's real colors and real depth (an
ordinary opaque draw), and the depth-bounds-tested second pass redraws the
same triangle in a fixed highlight color instead of the original's vertex
colors — wherever the bounds window clips a fragment, the first pass's real
color already shows through underneath, so the mechanism being demonstrated
(an animated depth-bounds window carving a band out of the triangle) reads
just as clearly, just with a highlight-over-base look rather than
background-showing-through.

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
bindless descriptor indexing, `SpudGPUBundles`, which needs
`SPUDGPU_EXT_BUNDLES`, and `SpudGPUDepthBoundsTest`, which needs
`SPUDGPU_EXT_DEPTH_BOUNDS_TEST`; none of the three are buildable on Metal
(see above).
