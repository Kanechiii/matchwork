"""Rebuild Matchwork's compact ONNX model from deterministic synthetic labels.

Pure Python 3, no packages required. This is a demonstration classifier,
not a validated real-football model. Outputs `src/ai/model.ts` on explicit run.
Usage: python scripts/train_match_state.py
"""
from pathlib import Path
import base64
import math
import random
import struct

SEED = 2026
rng = random.Random(SEED)
FEATURES = ["completion", "pressure", "turnovers", "shots", "tempo", "attacking_third", "score_tension"]
LABELS = ["CONTROL", "PRESSURE", "TRANSITION"]
TEMPLATES = [
    ([.88, .14, .08, .18, .50, .78, .35], [.10, .08, .07, .09, .15, .10, .15]),
    ([.55, .85, .22, .47, .77, .60, .67], [.14, .11, .12, .15, .11, .16, .15]),
    ([.64, .31, .82, .36, .89, .49, .73], [.16, .18, .11, .19, .09, .21, .15]),
]

def samples(n):
    result = []
    for i in range(n):
        label = i % 3
        center, spread = TEMPLATES[label]
        x = [min(1, max(0, rng.gauss(c, s))) for c, s in zip(center, spread)]
        result.append((x, label))
    rng.shuffle(result)
    return result

train = samples(1800)
validation = samples(360)
weights = [[0.0] * 3 for _ in FEATURES]
bias = [0.0] * 3

for epoch in range(420):
    lr = .19 / (1 + epoch * .014)
    for x, y in train:
        logits = [sum(x[f] * weights[f][k] for f in range(7)) + bias[k] for k in range(3)]
        e = [math.exp(value - max(logits)) for value in logits]
        z = sum(e)
        for k in range(3):
            delta = (1 if y == k else 0) - e[k] / z
            bias[k] += lr * delta
            for f in range(7):
                weights[f][k] += lr * (delta * x[f] - .0001 * weights[f][k])

def predict(x):
    return max(range(3), key=lambda k: sum(x[f]*weights[f][k] for f in range(7)) + bias[k])

accuracy = sum(predict(x) == y for x, y in validation) / len(validation)

# Minimal protobuf serializer. ONNX ModelProto IR 9, ai.onnx opset 13.
def vint(n):
    out = bytearray()
    while n > 127:
        out.append((n & 127) | 128)
        n >>= 7
    out.append(n)
    return bytes(out)

def field(n, content):
    return vint(n << 3 | 2) + vint(len(content)) + content

def num(n, v):
    return vint(n << 3) + vint(v)

def string(n, v):
    return field(n, v.encode())

def tensor(name, dims, values):
    return (b"".join(num(1, d) for d in dims) + num(2, 1) + string(8, name)
        + field(9, b"".join(struct.pack("<f", float(x)) for x in values)))

def val(name, dims):
    shape = b"".join(field(1, num(1, d)) for d in dims)
    typ = field(1, num(1, 1) + field(2, shape))
    return string(1, name) + field(2, typ)

def node(op, inputs, outputs):
    return (b"".join(string(1, s) for s in inputs)
        + b"".join(string(2, s) for s in outputs) + string(4, op))

graph = (
    field(1, node("MatMul", ["features", "W"], ["mm"]))
    + field(1, node("Add", ["mm", "B"], ["logits"]))
    + field(1, node("Softmax", ["logits"], ["probabilities"]))
    + string(2, "MatchworkStateClassifier")
    + field(5, tensor("W", [7, 3], [weights[f][k] for f in range(7) for k in range(3)]))
    + field(5, tensor("B", [3], bias))
    + field(11, val("features", [1, 7]))
    + field(12, val("probabilities", [1, 3]))
)
model = num(1, 9) + string(2, "Matchwork synthetic weak supervision v1") + field(7, graph) + field(8, num(2, 13))
encoded = base64.b64encode(model).decode("ascii")
out_path = Path(__file__).resolve().parents[1] / "src" / "ai" / "model.ts"
out_path.write_text(
    '/** Embedded 340-byte ONNX model (opset 13) with synthetic weak-supervision labels.\n'
    ' * This classifier is illustrative and is not validated on real football data.\n'
    ' */\n'
    'export const EMBEDDED_ONNX_MODEL_BASE64 = "' + encoded + '";\n',
    encoding="utf-8",
)
print(f"Rebuilt model: {len(model)} bytes; validation on synthetic prototypes: {accuracy:.1%}")
print("Caution: synthetic-prototype validation is not real football performance.")
