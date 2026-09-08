# SpudGPU Samples

Ports of the [`microsoft/DirectX-Graphics-Samples`](https://github.com/microsoft/DirectX-Graphics-Samples)
(cloned alongside this repo as `../d3d12samples`) rebuilt against **SpudGPU**
(`spudlib`'s GPU HAL module) instead of raw D3D12/DXGI. Each sample under
`Samples/` mirrors one sample from `d3d12samples/Samples/Desktop/` as closely
as its feature set allows, replacing every `ID3D12*`/DXGI call with the
equivalent `spudgpu_*` call.

The point isn't a demo reel — it's a maturity test for SpudLib. Every sample
that ports cleanly validates a slice of SpudGPU's API; every sample that
*can't* port (no execute-indirect, no mesh shaders, no raytracing pipeline,
no VRS, no cross-adapter API as of this writing) is a concrete, prioritized
gap to close in `spudlib` itself — not a workaround to invent here.

## Status

| Sample | D3D12 source | Status |
|---|---|---|
| HelloTriangle | `D3D12HelloWorld/HelloTriangle` | Ported |

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

Metal is not a build target here yet — SpudGPU's Metal backend is still
scaffolded/unimplemented (see `spudlib/CLAUDE.md`), so there is nothing for
these samples to run against on Apple Silicon.
