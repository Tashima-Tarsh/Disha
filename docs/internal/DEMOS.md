# Demos

Demo payloads live in `demos/`.

Run one:

```bash
python - <<'PY'
import json
from pathlib import Path
from disha.brain.graph import DishaAgenticGraph, GraphInput

payload = json.loads(Path("demos/demo_1_6_geospatial.json").read_text())
print(DishaAgenticGraph().invoke(GraphInput(**payload)).model_dump_json(indent=2))
PY
```

Available payloads:

- `demo_1_6_geospatial.json`
- `demo_2_6_sustainable_development.json`
- `demo_3_6_physical_interface.json`
- `demo_4_6_hse.json`
- `demo_5_6_national_audit.json`
- `demo_6_6_gap_closure.json`

