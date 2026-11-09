# Collaboration camera avatar and cursor

Both GLB files are local assets. Supply the Bevy-compatible model as
`cam-avatar.bevy.glb` before building or deploying the viewer.
They are intentionally excluded from Git history.

The adapter loops the model's first animation clip using Bevy's animation player.
The current `Halo_Ripple_And_Bob` clip animates halo scale/morph weights and the
`Body_Bob` translation. The name badge follows that body. Models without an
animation clip use the legacy procedural halo loop; their body stays static.
The adapter clones materials per avatar and tints `M_UserColor` and the halos.
The adapter loads the typed `Gltf` root before taking its scene handle, because
the scan loader also handles `.glb` and a direct `#Scene0` load is ambiguous.

Older exports such as Floating_Camera_Pet_LP_v16 use `KHR_animation_pointer`
material channels that the pinned glTF parser cannot parse. For those exports,
generate a compatible copy below, preserving supported node animation tracks.
Do not overwrite a newer compatible model with this older source.

```sh
python3 - <<'PY'
import json
import struct
from pathlib import Path

source = Path('cam-avatar.glb').read_bytes()
size = struct.unpack_from('<I', source, 12)[0]
document = json.loads(source[20:20 + size])
for animation in document.get('animations', []):
    animation['channels'] = [channel for channel in animation['channels']
                             if 'node' in channel['target']]
if 'animations' in document:
    document['animations'] = [animation for animation in document['animations']
                              if animation['channels']]
for key in ('extensionsUsed', 'extensionsRequired'):
    if key in document:
        document[key] = [name for name in document[key] if name != 'KHR_animation_pointer']
        if not document[key]:
            del document[key]
payload = json.dumps(document, separators=(',', ':')).encode()
payload += b' ' * (-len(payload) % 4)
buffers = source[20 + size:]
header = struct.pack('<III', 0x46546c67, 2, 20 + len(payload) + len(buffers))
chunk = struct.pack('<II', len(payload), 0x4e4f534a)
Path('cam-avatar.bevy.glb').write_bytes(header + chunk + payload + buffers)
PY
```

This prop is authored Y-up, facing +Z. The adapter rotates its lens to Bevy
camera forward (-Z), scales it to 35%, and anchors the lens at the remote eye.
It is a viewer decoration, not canonical site/bucket spatial data.

The world pointer loads `cam-cursor.glb` as a typed `Gltf` root as well. Supply
this local asset before building/deploying; keep the binary out of Git history.
Its tip is at the origin, the forward axis is +Z, and the body extends 0.5 units
along -Z. The adapter scales it to 36% (0.18 world units long), places the tip at
the shared contact and uses the sender's camera up direction to orient its roll.
The renderer adds black outlines at 70% opacity to the two recessed rear faces in code;
the GLB remains unchanged. Each cursor rolls independently about local +Z with
randomized speed bursts, without moving its contact or pointing axis. Motion
parameters live in `src/collaboration/cursors/pointers/spin.rs`.
Each participant gets cloned `M_UserColor` accent and `M_CursorGlass` shell
materials. Despite its authored material name, the shell renders opaque and
matte in the user's color. The accent mesh is cloned and lifted onto the shell's
upper/lower planes so its glow remains visible outside the solid body. The body and accent write depth; rear outlines blend over the solid shell. The meshes do not participate in picking.
